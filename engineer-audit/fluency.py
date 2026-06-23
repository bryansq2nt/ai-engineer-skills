#!/usr/bin/env python3
"""
fluency.py — self-contained AI-fluency analyzer (pure Python stdlib; no deps, no API).

Reads local Claude Code transcripts (~/.claude/projects/**/*.jsonl) and measures how
skillfully the user drives the agent across five dimensions, then writes evidence.json
in the shape the feedback dashboard reads. The qualitative skill-map (analysis.json) is
written separately by the agent running the skill, grounded in this evidence.

Usage:
  python3 fluency.py -o evidence.json [--project DIR ...] [--transcripts ~/.claude/projects]

If one or more --project paths are given, only the transcripts whose Claude Code session
folder matches those project working-directories are analyzed; otherwise all are used.
It measures SKILL, not activity: every input is a per-prompt or per-opportunity RATE, so
using the agent more never raises the score — only using it better does.
"""
import argparse
import glob
import json
import math
import os
import re
import statistics
from collections import Counter
from datetime import datetime

GAP_CAP = 300            # idle gaps longer than this don't count as active time
MAX_PROMPT = 6000        # longer "user" text is treated as a paste, not a typed prompt
EDIT_TOOLS = {"edit", "write", "multiedit", "notebookedit"}
READ_TOOLS = {"read", "grep", "glob"}
DELEGATION_TOOLS = {"agent", "task", "workflow", "exitplanmode", "enterplanmode"}

INJECT = ("<task-notification>", "<command-name>", "<command-message>", "<command-args>",
          "<local-command", "<system-reminder>", "<bash-input>", "<bash-stdout>",
          "caveat:", "[request interrupted", "base directory for this skill",
          "<user-prompt-submit-hook>", "this session is being continued")
INJ_HEAD = re.compile(r"^\s*(you are\b|<[a-z][\w-]*>)", re.I)

ARTIFACT = re.compile(
    r"([\w./\-]+\.(py|js|ts|tsx|jsx|html|css|md|json|sh|ya?ml|toml|rs|go|java|cpp|c|rb|sql))"
    r"|((?:/[\w.\-]+){2,})|(`[^`]+`)|(\b\w+\(\))", re.I)
CONSTRAINT = re.compile(
    r"\b(only|must|should|shouldn't|don't|do not|never|always|keep|ensure|instead of|"
    r"at most|at least|exactly|without|except|make sure|no more than)\b", re.I)
INTENT = re.compile(
    r"\b(so that|because|the goal is|in order to|for the|so i can|so we can|i need|i want)\b", re.I)
ACTION = re.compile(
    r"\b(add|create|build|make|implement|write|fix|change|update|refactor|remove|delete|run|"
    r"generate|set up|setup|install|deploy|edit|rename|move|clean|merge|split)\b", re.I)
CORRECTION = re.compile(
    r"\b(no|nope|wrong|not quite|that's not|actually|instead|revert|undo|redo|try again|"
    r"too (much|many|slow|fast|big|small)|still (broken|failing|wrong|not)|doesn't work|not working)\b", re.I)
PRAISE = re.compile(r"\b(great|perfect|love it|nice|awesome|excellent|beautiful|exactly)\b", re.I)
VERIFY = re.compile(
    r"\b(pytest|unittest|jest|vitest|mocha|go test|cargo (test|build)|npm (run )?(test|build|lint)|"
    r"yarn (test|build|lint)|pnpm (test|build|lint)|ruff|eslint|tsc|mypy|make (test|lint|build)|"
    r"playwright|curl .*(localhost|127\.0\.0\.1)|docker compose|docker-compose)\b", re.I)

WEIGHTS = {"Direction": 0.24, "Verification": 0.22, "Context": 0.22, "Iteration": 0.18, "Toolcraft": 0.14}
DISPLAY = {"Direction": "Briefing", "Verification": "Verification", "Context": "Context-setting",
           "Iteration": "Iteration", "Toolcraft": "Toolcraft"}
BANDS = [("Operator", 0, 39), ("Developing", 40, 54), ("Proficient", 55, 69),
         ("Advanced", 70, 84), ("Expert", 85, 100)]

ARCHETYPE_AXES = ["Direction", "Verification", "Context", "Iteration", "Toolcraft", "Delegation"]
AGENCY = {"Direction": 1.0, "Verification": 0.35, "Context": 0.15, "Iteration": 1.0, "Toolcraft": 0.8, "Delegation": 1.0}
PROTOTYPES = {
    "Autonomous Agent": [58, 65, 62, 62, 85, 96],
    "Architect": [80, 66, 88, 65, 60, 48],
    "Debugger": [62, 88, 82, 85, 60, 28],
    "Collaborator": [66, 62, 66, 80, 55, 38],
    "Sprinter": [45, 38, 52, 46, 62, 30],
}


def squash(x, target):
    return 0.0 if target <= 0 else max(0.0, min(1.0, x / target))


def clamp(x, lo, hi):
    return max(lo, min(hi, x))


def ts_of(s):
    try:
        return datetime.fromisoformat(str(s).replace("Z", "+00:00"))
    except (ValueError, AttributeError, TypeError):
        return None


def text_of(content):
    if isinstance(content, str):
        return content
    if isinstance(content, list):
        return " ".join(b.get("text", "") for b in content
                         if isinstance(b, dict) and b.get("type") == "text")
    return ""


def looks_injected(t):
    if len(t) > MAX_PROMPT:
        return True
    if INJ_HEAD.match(t[:200].lstrip()):
        return True
    low = t.lower()
    return any(m in low for m in INJECT)


def slug_for(path):
    return re.sub(r"[^a-zA-Z0-9]", "-", os.path.abspath(os.path.expanduser(path)))


def discover(transcripts_root, projects):
    root = os.path.expanduser(transcripts_root)
    files = glob.glob(os.path.join(root, "**", "*.jsonl"), recursive=True)
    files = [f for f in files if "subagents" not in f.replace("\\", "/").split("/")]
    if projects:
        wanted = {slug_for(p) for p in projects}
        scoped = [f for f in files if os.path.basename(os.path.dirname(f)) in wanted]
        if scoped:
            return sorted(set(scoped))
    return sorted(set(files))


def parse(files):
    prompts, sessions = [], {}
    tool_usage, total_tools, deleg = Counter(), 0, 0
    first_ts = last_ts = None
    active = 0.0
    for path in files:
        sid = os.path.splitext(os.path.basename(path))[0]
        timeline, tss, idx = [], [], 0
        try:
            fh = open(path, encoding="utf-8")
        except OSError:
            continue
        with fh:
            for line in fh:
                line = line.strip()
                if not line:
                    continue
                try:
                    e = json.loads(line)
                except json.JSONDecodeError:
                    continue
                t = ts_of(e.get("timestamp"))
                if t:
                    tss.append(t)
                    first_ts = t if first_ts is None or t < first_ts else first_ts
                    last_ts = t if last_ts is None or t > last_ts else last_ts
                msg = e.get("message") if isinstance(e.get("message"), dict) else {}
                role = e.get("role") or msg.get("role") or e.get("type")
                content = msg.get("content", e.get("content"))
                if role == "assistant" and isinstance(content, list):
                    for b in content:
                        if isinstance(b, dict) and b.get("type") == "tool_use":
                            name = b.get("name", "unknown")
                            if name.startswith("mcp__"):
                                name = name.split("__")[-1]
                            low = name.lower()
                            tool_usage[name] += 1
                            total_tools += 1
                            inp = b.get("input", {}) if isinstance(b.get("input"), dict) else {}
                            if low in DELEGATION_TOOLS:
                                deleg += 1
                            if low == "bash" and inp.get("run_in_background"):
                                deleg += 1
                            timeline.append({"kind": "tool", "name": low,
                                             "file": inp.get("file_path") or inp.get("path"),
                                             "cmd": inp.get("command") if low == "bash" else None})
                    continue
                if role != "user":
                    continue
                if isinstance(content, list) and any(
                        isinstance(b, dict) and b.get("type") == "tool_result" for b in content):
                    continue
                if e.get("isSidechain") or e.get("isMeta"):
                    continue
                txt = text_of(content).strip()
                if not txt or looks_injected(txt):
                    continue
                idx += 1
                rec = {"text": txt, "session": sid, "idx": idx}
                prompts.append(rec)
                timeline.append({"kind": "prompt", "text": txt})
        if len(tss) >= 2:
            tss.sort()
            active += sum(min((tss[i + 1] - tss[i]).total_seconds(), GAP_CAP) for i in range(len(tss) - 1))
        if timeline:
            sessions[sid] = timeline
    return {"prompts": prompts, "sessions": sessions, "tool_usage": tool_usage,
            "total_tools": total_tools, "delegation": deleg, "active": active,
            "first_ts": first_ts, "last_ts": last_ts, "files": len(files)}


def find_corrections(sessions):
    out = []
    for timeline in sessions.values():
        saw_tool = False
        for ev in timeline:
            if ev["kind"] == "tool":
                saw_tool = True
                continue
            head = ev["text"][:160]
            if saw_tool and CORRECTION.search(head) and not PRAISE.search(head):
                hi = bool(re.search(r"\d", ev["text"]) or ARTIFACT.search(ev["text"])
                          or len(ev["text"].split()) >= 8 or INTENT.search(ev["text"]))
                out.append(hi)
            saw_tool = False
    return out


def score(c):
    prompts = c["prompts"]
    n = max(1, len(prompts))
    # Direction
    con = sum(1 for p in prompts if CONSTRAINT.search(p["text"]) and ACTION.search(p["text"]))
    art = sum(1 for p in prompts if ARTIFACT.search(p["text"]))
    intent = sum(1 for p in prompts if INTENT.search(p["text"]))
    direction = 100 * (0.40 * squash(con / n, 0.45) + 0.30 * squash(art / n, 0.45) + 0.30 * squash(intent / n, 0.30))
    # Context & Verification (per session, over edit episodes)
    total_edits = grounded = episodes = verified = 0
    for timeline in c["sessions"].values():
        reads, written = set(), set()
        open_ep, ep_files = False, []
        for ev in timeline:
            if ev["kind"] == "prompt":
                if open_ep and re.search(r"\b(run it|does it work|confirm|check (it|that)|verify|did it work)\b", ev["text"], re.I):
                    verified += 1
                    open_ep = False
                continue
            name, f = ev["name"], ev.get("file")
            if name in READ_TOOLS and f:
                reads.add(f)
                if open_ep and os.path.basename(f) in ep_files:
                    verified += 1
                    open_ep = False
            elif name in EDIT_TOOLS:
                total_edits += 1
                if not f or f in reads or f in written or name == "write":
                    grounded += 1
                if name == "write":
                    written.add(f)
                if not open_ep:
                    open_ep, ep_files = True, []
                    episodes += 1
                if f:
                    ep_files.append(os.path.basename(f))
            elif name == "bash" and open_ep and VERIFY.search(ev.get("cmd") or ""):
                verified += 1
                open_ep = False
    context = 100 * squash(grounded / total_edits, 0.85) if total_edits else 50.0
    verification = 100 * squash(verified / episodes, 0.60) if episodes else 50.0
    # Iteration
    corr = find_corrections(c["sessions"])
    k = len(corr)
    rate = k / n
    spec = (sum(corr) / k) if k else 1.0
    iteration = 100 * (0.6 * (1 - clamp(rate / 0.35, 0, 1)) + 0.4 * spec)
    # Toolcraft
    total = c["total_tools"]
    if total:
        merged = Counter()
        for nm, ct in c["tool_usage"].items():
            merged[nm.lower()] += ct
        distinct = len(merged)
        breadth = squash(distinct / 20, 1.0)
        H = -sum((x / total) * math.log(x / total) for x in merged.values() if x > 0)
        evenness = (H / math.log(distinct)) if distinct > 1 else 0.0
        hours = max(c["active"] / 3600, 0.5)
        deleg = squash(c["delegation"] / hours, 2.0)
        toolcraft = 100 * (0.45 * breadth + 0.30 * evenness + 0.25 * deleg)
    else:
        toolcraft = 0.0
    dims = {"Direction": direction, "Verification": verification, "Context": context,
            "Iteration": iteration, "Toolcraft": toolcraft}
    # confidence shrink toward 50 on thin data
    targets = {"Direction": 60, "Verification": 15, "Context": 25, "Iteration": 12, "Toolcraft": 40}
    counts = {"Direction": len(prompts), "Verification": episodes, "Context": total_edits,
              "Iteration": len(prompts), "Toolcraft": total}
    adj = {d: 50 + (v - 50) * min(1.0, counts[d] / targets[d]) for d, v in dims.items()}
    overall = round(sum(WEIGHTS[d] * adj[d] for d in WEIGHTS))
    band = next((b for b, lo, hi in BANDS if lo <= overall <= hi), "Operator")
    hours = max(c["active"] / 3600, 0.5)
    delegation_score = 100 * squash(c["delegation"] / hours, 2.0)
    return dims, adj, overall, band, delegation_score


def cosine(a, b):
    na = math.sqrt(sum(x * x for x in a))
    nb = math.sqrt(sum(y * y for y in b))
    return sum(x * y for x, y in zip(a, b)) / (na * nb) if na and nb else 0.0


def classify(adj, delegation):
    scores = dict(adj)
    scores["Delegation"] = delegation
    V = [scores[a] for a in ARCHETYPE_AXES]
    names = list(PROTOTYPES)
    mat = [PROTOTYPES[n] for n in names]
    cols = list(zip(*(mat + [V])))
    means = [statistics.mean(col) for col in cols]
    stds = [statistics.pstdev(col) or 1.0 for col in cols]
    w = [AGENCY[a] for a in ARCHETYPE_AXES]
    zw = lambda vec: [w[i] * (v - means[i]) / stds[i] for i, v in enumerate(vec)]
    vz = zw(V)
    sims = sorted(((cosine(vz, zw(PROTOTYPES[n])), n) for n in names), reverse=True)
    return sims[0][1], sims[1][1]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("-o", "--out", default="evidence.json")
    ap.add_argument("--project", action="append", default=[])
    ap.add_argument("--transcripts", default="~/.claude/projects")
    args = ap.parse_args()

    files = discover(args.transcripts, args.project)
    if not files:
        print("No transcripts found.")
        with open(args.out, "w") as fh:
            json.dump({"schema": "claude-insight-evidence/1", "meta": {"real_prompts": 0}, "scores": {}}, fh)
        return
    c = parse(files)
    dims, adj, overall, band, delegation = score(c)
    primary, secondary = classify(adj, delegation)

    lens = [len(p["text"]) for p in c["prompts"]] or [0]
    words = [len(p["text"].split()) for p in c["prompts"]] or [0]
    span = (c["last_ts"] - c["first_ts"]).days if c["first_ts"] and c["last_ts"] else 0
    # a de-contaminated sample for the agent to quote (terse + rich + spread)
    by_len = sorted(c["prompts"], key=lambda p: len(p["text"]))
    sample, seen = [], set()
    def add(p):
        if (p["session"], p["idx"]) in seen:
            return
        seen.add((p["session"], p["idx"]))
        sample.append({"text": p["text"][:600], "chars": len(p["text"])})
    for p in by_len[:6] + by_len[-14:]:
        add(p)
    for p in c["prompts"][::max(1, len(c["prompts"]) // 20)]:
        if len(sample) >= 50:
            break
        add(p)

    evidence = {
        "schema": "claude-insight-evidence/1",
        "meta": {
            "sessions": c["files"], "real_prompts": len(c["prompts"]),
            "span_days": span, "active_hours": round(c["active"] / 3600, 1),
            "prompt_distribution": {
                "median_chars": int(statistics.median(lens)), "mean_chars": int(statistics.mean(lens)),
                "median_words": int(statistics.median(words)),
                "under_80_pct": round(100 * sum(1 for L in lens if L < 80) / len(lens)),
            },
        },
        "scores": {
            "overall": overall, "band": band, "weights": WEIGHTS,
            "dimensions_raw": {k: round(v) for k, v in dims.items()},
            "dimensions_adjusted": {k: round(v) for k, v in adj.items()},
            "dimension_names": DISPLAY,
        },
        "archetype": {"primary": primary, "secondary": secondary},
        "behavior": {
            "sample_prompts": sample, "tool_usage": dict(c["tool_usage"]),
            "delegation_events": c["delegation"],
        },
    }
    with open(args.out, "w", encoding="utf-8") as fh:
        json.dump(evidence, fh, ensure_ascii=False, indent=2)
    print(f"fluency: {len(c['prompts'])} prompts across {c['files']} sessions -> {overall}/100 ({band}), {primary}")


if __name__ == "__main__":
    main()
