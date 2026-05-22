#!/usr/bin/env python3
"""brain.py - persistent long-term memory for openclaw (or any agent).

An LLM agent forgets things because its context window is finite. This gives it
an infinite backing store: write durable facts to disk, recall the relevant ones
on demand. Zero dependencies, runs anywhere Python 3.8+ is installed.

Quick start:
    brain.py remember "The District owner is reviewing the preview link" --tags lead,district -i 4
    brain.py recall "district"
    brain.py context "what am I working on"      # paste this into the agent at session start
    brain.py help-openclaw                        # how to wire this into openclaw

Storage lives in $OPENCLAW_BRAIN_DIR, else ~/.openclaw/workspace/brain.
"""

import argparse
import hashlib
import json
import math
import os
import re
import sys
import tempfile
from datetime import datetime, timezone

BRAIN_DIR = os.environ.get(
    "OPENCLAW_BRAIN_DIR",
    os.path.expanduser("~/.openclaw/workspace/brain"),
)
MEM_FILE = os.path.join(BRAIN_DIR, "memories.jsonl")

STOPWORDS = {
    "a", "an", "and", "are", "as", "at", "be", "but", "by", "for", "from", "has",
    "have", "i", "in", "is", "it", "its", "of", "on", "or", "that", "the", "to",
    "was", "were", "what", "when", "where", "which", "who", "will", "with", "you",
    "your", "do", "does", "did", "im", "my", "me", "this", "we", "our", "about",
}

TOKEN_RE = re.compile(r"[a-z0-9]+")


def now_iso():
    return datetime.now(timezone.utc).replace(microsecond=0).isoformat()


def tokenize(text):
    return [t for t in TOKEN_RE.findall(text.lower()) if t not in STOPWORDS]


def ensure_dir():
    os.makedirs(BRAIN_DIR, exist_ok=True)


def load():
    if not os.path.exists(MEM_FILE):
        return []
    mems = []
    with open(MEM_FILE, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                mems.append(json.loads(line))
            except json.JSONDecodeError:
                continue  # skip a corrupt line rather than lose the whole brain
    return mems


def save_all(mems):
    ensure_dir()
    fd, tmp = tempfile.mkstemp(dir=BRAIN_DIR, suffix=".tmp")
    with os.fdopen(fd, "w", encoding="utf-8") as fh:
        for m in mems:
            fh.write(json.dumps(m, ensure_ascii=False) + "\n")
    os.replace(tmp, MEM_FILE)


def make_id(text):
    seed = (text + now_iso() + os.urandom(4).hex()).encode("utf-8")
    return hashlib.sha1(seed).hexdigest()[:8]


def normalize(text):
    return " ".join(tokenize(text))


def find(mems, prefix):
    """Find a memory by id (or unambiguous id prefix)."""
    hits = [m for m in mems if m["id"] == prefix]
    if hits:
        return hits[0]
    hits = [m for m in mems if m["id"].startswith(prefix)]
    if len(hits) == 1:
        return hits[0]
    if len(hits) > 1:
        raise SystemExit(f"ambiguous id '{prefix}' matches {len(hits)} memories")
    return None


def age_days(mem):
    try:
        created = datetime.fromisoformat(mem["created"])
    except (ValueError, KeyError):
        return 0.0
    delta = datetime.now(timezone.utc) - created
    return max(delta.total_seconds() / 86400.0, 0.0)


def score(query_tokens, mem):
    """Relevance of a memory to a query. 0 means irrelevant."""
    text_tokens = tokenize(mem.get("text", ""))
    tag_tokens = set()
    for tag in mem.get("tags", []):
        tag_tokens.update(tokenize(tag))
    if not text_tokens and not tag_tokens:
        return 0.0

    q = set(query_tokens)
    if not q:
        return 0.0

    text_set = set(text_tokens)
    overlap = len(q & text_set)

    # partial matches via shared prefix (e.g. "district" vs "districts")
    partial = 0
    for qt in q:
        if qt in text_set or len(qt) < 4:
            continue
        for tt in text_set:
            if len(tt) < 4:
                continue
            if tt.startswith(qt) or qt.startswith(tt):
                partial += 1
                break

    tag_hits = len(q & tag_tokens)
    if overlap == 0 and partial == 0 and tag_hits == 0:
        return 0.0

    base = (overlap * 3 + partial) / math.sqrt(len(text_tokens) + 1)
    base += tag_hits * 4  # tags are curated, weight them heavily

    importance = float(mem.get("importance", 3))
    importance_factor = 0.5 + importance / 5.0

    recency_factor = 0.6 + 0.4 / (1.0 + age_days(mem) / 30.0)

    s = base * importance_factor * recency_factor
    if mem.get("pinned"):
        s += 1000.0  # pinned always floats to the top
    return s


def fmt(mem, show_meta=True):
    pin = "*" if mem.get("pinned") else " "
    line = f"[{mem['id']}]{pin} {mem.get('text', '')}"
    if show_meta:
        bits = []
        if mem.get("tags"):
            bits.append("#" + " #".join(mem["tags"]))
        bits.append(f"imp:{mem.get('importance', 3)}")
        if mem.get("source"):
            bits.append(f"src:{mem['source']}")
        bits.append(mem.get("created", "")[:10])
        line += "\n        " + "  ".join(bits)
    return line


# ---- commands --------------------------------------------------------------


def read_text_arg(value):
    if value == "-" or value is None:
        data = sys.stdin.read().strip()
        if not data:
            raise SystemExit("no text provided on stdin")
        return data
    return value


def cmd_remember(args):
    text = read_text_arg(args.text)
    mems = load()
    norm = normalize(text)

    for m in mems:
        if normalize(m.get("text", "")) == norm:
            # already known: refresh instead of duplicating
            m["updated"] = now_iso()
            m["importance"] = max(int(m.get("importance", 3)), args.importance)
            if args.tags:
                m["tags"] = sorted(set(m.get("tags", []) + args.tags))
            if args.pin:
                m["pinned"] = True
            save_all(mems)
            print(f"already remembered, refreshed [{m['id']}]")
            return

    mem = {
        "id": make_id(text),
        "text": text,
        "tags": args.tags or [],
        "importance": args.importance,
        "pinned": bool(args.pin),
        "source": args.source,
        "created": now_iso(),
        "updated": now_iso(),
        "recalls": 0,
    }
    mems.append(mem)
    save_all(mems)
    print(f"remembered [{mem['id']}]")


def cmd_recall(args):
    mems = load()
    qt = tokenize(args.query)
    scored = [(score(qt, m), m) for m in mems]
    scored = [(s, m) for s, m in scored if s > 0]
    scored.sort(key=lambda pair: pair[0], reverse=True)
    hits = scored[: args.limit]

    if not hits:
        print(f"no memories match '{args.query}'")
        return

    if args.json:
        print(json.dumps([m for _, m in hits], ensure_ascii=False, indent=2))
        return

    # bump recall counters
    ids = {m["id"] for _, m in hits}
    for m in mems:
        if m["id"] in ids:
            m["recalls"] = m.get("recalls", 0) + 1
    save_all(mems)

    for _, m in hits:
        print(fmt(m))


def cmd_recent(args):
    mems = load()
    mems.sort(key=lambda m: m.get("created", ""), reverse=True)
    hits = mems[: args.limit]
    if args.json:
        print(json.dumps(hits, ensure_ascii=False, indent=2))
        return
    for m in hits:
        print(fmt(m))


def cmd_list(args):
    mems = load()
    if args.tag:
        mems = [m for m in mems if args.tag in m.get("tags", [])]
    mems.sort(key=lambda m: (not m.get("pinned"), m.get("created", "")))
    if not mems:
        print("brain is empty")
        return
    for m in mems:
        print(fmt(m, show_meta=not args.short))


def cmd_forget(args):
    mems = load()
    mem = find(mems, args.id)
    if not mem:
        raise SystemExit(f"no memory with id '{args.id}'")
    mems = [m for m in mems if m["id"] != mem["id"]]
    save_all(mems)
    print(f"forgot [{mem['id']}] {mem.get('text', '')[:60]}")


def _set_pin(args, value):
    mems = load()
    mem = find(mems, args.id)
    if not mem:
        raise SystemExit(f"no memory with id '{args.id}'")
    mem["pinned"] = value
    mem["updated"] = now_iso()
    save_all(mems)
    print(f"{'pinned' if value else 'unpinned'} [{mem['id']}]")


def cmd_pin(args):
    _set_pin(args, True)


def cmd_unpin(args):
    _set_pin(args, False)


def cmd_stats(args):
    mems = load()
    if not mems:
        print("brain is empty")
        return
    tags = {}
    for m in mems:
        for t in m.get("tags", []):
            tags[t] = tags.get(t, 0) + 1
    pinned = sum(1 for m in mems if m.get("pinned"))
    top_tags = sorted(tags.items(), key=lambda kv: kv[1], reverse=True)[:10]
    print(f"memories : {len(mems)}")
    print(f"pinned   : {pinned}")
    print(f"file     : {MEM_FILE}")
    size = os.path.getsize(MEM_FILE) if os.path.exists(MEM_FILE) else 0
    print(f"size     : {size / 1024:.1f} KB")
    if top_tags:
        print("top tags : " + ", ".join(f"{t}({n})" for t, n in top_tags))


def cmd_context(args):
    """Print a memory briefing to inject into the agent at session start."""
    mems = load()
    out = []
    out.append("# OpenClaw memory briefing")
    out.append(f"_{len(mems)} memories on file. Generated {now_iso()}._")
    out.append("")

    pinned = [m for m in mems if m.get("pinned")]
    if pinned:
        pinned.sort(key=lambda m: -float(m.get("importance", 3)))
        out.append("## Pinned — always remember")
        for m in pinned:
            out.append(f"- {m.get('text', '')}")
        out.append("")

    if args.query:
        qt = tokenize(args.query)
        scored = [(score(qt, m), m) for m in mems if not m.get("pinned")]
        scored = [(s, m) for s, m in scored if s > 0]
        scored.sort(key=lambda pair: pair[0], reverse=True)
        rel = [m for _, m in scored[: args.limit]]
        if rel:
            out.append(f'## Relevant to: "{args.query}"')
            for m in rel:
                out.append(f"- {m.get('text', '')}")
            out.append("")

    recent = [m for m in mems if not m.get("pinned")]
    recent.sort(key=lambda m: m.get("created", ""), reverse=True)
    recent = recent[: args.limit]
    if recent:
        out.append("## Recently learned")
        for m in recent:
            out.append(f"- {m.get('text', '')}")
        out.append("")

    if len(out) <= 3:
        out.append("_(empty — nothing remembered yet)_")

    print("\n".join(out).rstrip())


def cmd_export(args):
    mems = load()
    print(json.dumps(mems, ensure_ascii=False, indent=2))


def cmd_wipe(args):
    mems = load()
    if not args.yes:
        raise SystemExit(
            f"this deletes all {len(mems)} memories. re-run with --yes to confirm."
        )
    save_all([])
    print(f"wiped {len(mems)} memories")


HELP_OPENCLAW = """\
Wiring brain.py into openclaw so it stops forgetting
====================================================

The idea: openclaw's context window is finite, so treat brain.py as its
long-term memory. Three habits make it "infinite":

1) AT SESSION START — load the briefing into context.
   Run this and feed the output into openclaw's system/context prompt:

       python3 brain.py context "<current task or topic>"

   With no topic it just returns pinned + recent memories.

2) DURING WORK — write down anything that should outlive this session:
   decisions, names, credentials' locations, client facts, "what we tried".

       python3 brain.py remember "Boutique 816 prefers warm tones, no stock photos" \\
           --tags boutique816,design -i 4

   Use --pin for facts that must surface every single session
   (who the operator is, the revenue goal, hard constraints).

3) BEFORE ANSWERING about past work — recall first, then answer:

       python3 brain.py recall "boutique 816"

Best setup: expose brain.py to openclaw as a tool/command it can call on its
own (remember / recall / context). Then add one line to its standing
instructions: "At the start of every task, run `brain.py context <task>` and
treat the result as things you already know. Whenever you learn a durable
fact, run `brain.py remember`."

Storage is a plain JSONL file at:
    {memfile}
Point all your Macs at the same synced folder (set OPENCLAW_BRAIN_DIR) and the
brain is shared across devices.
""".format(memfile=MEM_FILE)


def cmd_help_openclaw(args):
    print(HELP_OPENCLAW)


def build_parser():
    p = argparse.ArgumentParser(
        prog="brain.py",
        description="Persistent long-term memory for openclaw.",
    )
    sub = p.add_subparsers(dest="cmd", required=True)

    r = sub.add_parser("remember", help="store a durable fact (use - to read stdin)")
    r.add_argument("text", nargs="?", help="the thing to remember, or - for stdin")
    r.add_argument("-t", "--tags", type=lambda s: [x.strip() for x in s.split(",") if x.strip()],
                   default=[], help="comma-separated tags")
    r.add_argument("-i", "--importance", type=int, choices=range(1, 6), default=3,
                   help="1-5, default 3")
    r.add_argument("--pin", action="store_true", help="always surface this memory")
    r.add_argument("--source", default="session", help="where this came from")
    r.set_defaults(func=cmd_remember)

    rc = sub.add_parser("recall", aliases=["search"], help="find relevant memories")
    rc.add_argument("query")
    rc.add_argument("-n", "--limit", type=int, default=8)
    rc.add_argument("--json", action="store_true")
    rc.set_defaults(func=cmd_recall)

    rec = sub.add_parser("recent", help="most recently added memories")
    rec.add_argument("-n", "--limit", type=int, default=10)
    rec.add_argument("--json", action="store_true")
    rec.set_defaults(func=cmd_recent)

    ls = sub.add_parser("list", help="list all memories")
    ls.add_argument("--tag", help="only this tag")
    ls.add_argument("--short", action="store_true", help="one line each")
    ls.set_defaults(func=cmd_list)

    fg = sub.add_parser("forget", help="delete a memory by id")
    fg.add_argument("id")
    fg.set_defaults(func=cmd_forget)

    pn = sub.add_parser("pin", help="pin a memory by id")
    pn.add_argument("id")
    pn.set_defaults(func=cmd_pin)

    up = sub.add_parser("unpin", help="unpin a memory by id")
    up.add_argument("id")
    up.set_defaults(func=cmd_unpin)

    ct = sub.add_parser("context", help="print a briefing to inject at session start")
    ct.add_argument("query", nargs="?", default="")
    ct.add_argument("-n", "--limit", type=int, default=8)
    ct.set_defaults(func=cmd_context)

    sub.add_parser("stats", help="brain summary").set_defaults(func=cmd_stats)
    sub.add_parser("export", help="dump all memories as JSON").set_defaults(func=cmd_export)

    wp = sub.add_parser("wipe", help="delete ALL memories")
    wp.add_argument("--yes", action="store_true")
    wp.set_defaults(func=cmd_wipe)

    sub.add_parser("help-openclaw", help="how to wire this into openclaw").set_defaults(
        func=cmd_help_openclaw
    )

    return p


def main(argv=None):
    parser = build_parser()
    args = parser.parse_args(argv)
    args.func(args)


if __name__ == "__main__":
    main()
