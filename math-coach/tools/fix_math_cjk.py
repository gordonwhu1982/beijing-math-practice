# -*- coding: utf-8 -*-
"""修「数学式里混进中文」：把 $...$ 内不在 \\text{} 里的中文串包进 \\text{}。
用法: python tools/fix_math_cjk.py [--apply]（默认只报告）
"""
import json, os, io, sys, re, collections
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
REPO = os.environ.get("MC_REPO", r"D:/个人/知识图谱/math-coach")
SRC = os.path.join(REPO, "content", "questions", "801", "ch12.jsonl")
APPLY = "--apply" in sys.argv
FIX_PROSE = "--fix-prose" in sys.argv

CJK = r"[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef\u2018-\u201d\u2014\u2460-\u24ff\u2026]"
TEXTBLOCK = re.compile(r"\\text\{[^{}]*\}")
RUN = re.compile(CJK + "+")

def fix_seg(tex):
    out, last = [], 0
    for m in TEXTBLOCK.finditer(tex):
        out.append((tex[last:m.start()], True))
        out.append((m.group(0), False))
        last = m.end()
    out.append((tex[last:], True))
    changed = False
    parts = []
    for s, scan in out:
        if not scan:
            parts.append(s); continue
        new = RUN.sub(lambda m: "\\text{" + m.group(0) + "}", s)
        if new != s:
            changed = True
        parts.append(new)
    return "".join(parts), changed

rows = [json.loads(l) for l in open(SRC, encoding="utf-8")]
hits, segs, suspects = [], 0, []
CNT = {"stripped": 0}
for q in rows:
    for field in ("stem", "answer"):
        s = q.get(field)
        if not s or "$" not in s:
            continue
        def sub(m):
            global segs
            raw = m.group(1)
            # 长段且中文占比高 → 多半是 $ 配对错（把整段中文吞进数学模式），不当成排版问题硬修
            cjk_len = len(RUN.findall(raw)) and sum(len(x) for x in RUN.findall(raw)) or 0
            if len(raw) and cjk_len / len(raw) > 0.25:
                # 数学式里塞了整段中文 → $ 配对错的受害者：去掉这对 $，让它回到正文
                suspects.append((q["id"], field, raw[:70]))
                if FIX_PROSE:
                    CNT["stripped"] += 1
                    return raw
                return m.group(0)
            tex, ch = fix_seg(raw)
            if ch:
                segs += 1
                if len(hits) < 12:
                    hits.append((q["id"], field, m.group(0)[:60], "$" + tex + "$"[:1]))
            return "$" + tex + "$"
        q[field] = re.sub(r"\$([^$]+)\$", sub, s)

print("涉及数学式 %d 段" % segs)
print("疑似 $ 配对错 %d 段（%d 道题）：%s" % (len(suspects), len({s[0] for s in suspects}), sorted({s[0] for s in suspects})))
if FIX_PROSE:
    print("已把这些段的 $ 去掉、还原成正文：%d 段" % CNT["stripped"])
for s in suspects[:5]:
    print("  ? %s %s | %s" % s)
for h in hits:
    print("  %s %s\n    旧 %s\n    新 %s" % (h[0], h[1], h[2], h[3]))
if APPLY:
    with open(SRC, "w", encoding="utf-8", newline="\n") as f:
        for q in rows:
            f.write(json.dumps(q, ensure_ascii=False) + "\n")
    print("已写入", SRC)
else:
    print("（未改动；加 --apply 落盘）")
