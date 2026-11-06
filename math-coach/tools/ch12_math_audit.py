# -*- coding: utf-8 -*-
"""ch12 题库「数学式」体检与修复。

检查项：
  A. 显示式 $$...$$（浏览器里也能渲染，但与内联混用会让后续正则错配对）
  B. $...$ 内、\\text{} 外出现中文（KaTeX 告警 unicodeTextInMathMode，可能丢字）
  C. 去掉 $...$ 后正文里还残留 LaTeX 命令（裸公式，显示成源码）
修复：
  --fix-display  把 $$x$$ 收成 $x$
  --fix-cjk      把 B 类的中文串包进 \\text{}
  --fix-bare     把 C 类里成串的 LaTeX 命令重新包回 $...$
用法: python tools/ch12_math_audit.py [--fix-display --fix-cjk --fix-bare --apply]
"""
import json, os, io, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
REPO = os.environ.get("MC_REPO", r"D:/个人/知识图谱/math-coach")
PATH = os.path.join(REPO, "content", "questions", "801", "ch12.jsonl")
APPLY = "--apply" in sys.argv

CJK = r"[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef\u2018-\u201d\u2014\u2460-\u24ff]"
RUN = re.compile(CJK + "+")
TEXTBLOCK = re.compile(r"\\text\{[^{}]*\}")
INLINE = re.compile(r"(?<!\$)\$([^$]+)\$(?!\$)")
DISPLAY = re.compile(r"\$\$([^$]+)\$\$")
CMD = re.compile(r"\\[a-zA-Z]+(\{[^{}]*\})*(\s*[\^_]\{[^{}]*\})?")

def wrap_cjk(tex):
    out, last = [], 0
    for m in TEXTBLOCK.finditer(tex):
        out.append((tex[last:m.start()], True)); out.append((m.group(0), False)); last = m.end()
    out.append((tex[last:], True))
    ch = False; parts = []
    for s, scan in out:
        if scan:
            new = RUN.sub(lambda m: "\\text{" + m.group(0) + "}", s)
            ch = ch or new != s
        else:
            new = s
        parts.append(new)
    return "".join(parts), ch

rows = [json.loads(l) for l in open(PATH, encoding="utf-8")]
stat = {"display": [], "cjk": [], "bare": []}
for q in rows:
    for field in ("stem", "answer"):
        s = q.get(field)
        if not s:
            continue
        if "$$" in s:
            stat["display"].append((q["id"], field))
        for m in INLINE.finditer(DISPLAY.sub("", s)):
            if RUN.search(TEXTBLOCK.sub("", m.group(1))):
                stat["cjk"].append((q["id"], field, m.group(1)[:50]))
        if re.search(r"\\[a-zA-Z]{2,}", INLINE.sub("", DISPLAY.sub("", s))):
            stat["bare"].append((q["id"], field))

print("A 含显示式 %s: %d 处（%d 题）" % ("$$", len(stat["display"]), len({x[0] for x in stat["display"]})))
print("B 数学式内混中文：%d 段（%d 题）" % (len(stat["cjk"]), len({x[0] for x in stat["cjk"]})))
for x in stat["cjk"][:6]:
    print("   ", x[0], x[1], x[2])
print("C 裸公式：%d 处（%d 题）%s" % (len(stat["bare"]), len({x[0] for x in stat["bare"]}), sorted({x[0] for x in stat["bare"]})))

if not APPLY:
    print("（未改动；加 --apply 落盘）")
    sys.exit(0)

changed = 0
for q in rows:
    touched = False
    for field in ("stem", "answer"):
        s = q.get(field)
        if not s:
            continue
        orig = s
        if "--fix-display" in sys.argv:
            s = DISPLAY.sub(lambda m: "$" + m.group(1) + "$", s)
        if "--fix-cjk" in sys.argv:
            def rep(m):
                t, ch = wrap_cjk(m.group(1))
                return "$" + t + "$"
            s = INLINE.sub(rep, s)
        if "--fix-bare" in sys.argv:
            def rep_bare(m):
                seg = m.group(0)
                def wrap_cmds(mm):
                    cmd = mm.group(0)
                    # 只在明显是数学片段时才包：含反斜杠命令即可
                    return "$" + cmd + "$" if cmd.startswith("\\") else cmd
                return CMD.sub(wrap_cmds, seg)
            # 只处理「不在 $...$ 内」的正文
            pieces = []
            last = 0
            for m in re.finditer(r"\$[^$]+\$", s):
                pieces.append(rep_bare(type("M", (), {"group": lambda self, i=0, t=s[last:m.start()]: t})()))
                pieces.append(m.group(0))
                last = m.end()
            pieces.append(rep_bare(type("M", (), {"group": lambda self, i=0, t=s[last:]: t})()))
            s = "".join(pieces)
        if s != orig:
            q[field] = s
            touched = True
    if touched:
        changed += 1
with open(PATH, "w", encoding="utf-8", newline="\n") as f:
    for q in rows:
        f.write(json.dumps(q, ensure_ascii=False) + "\n")
print("已写入 %s（改动 %d 道）" % (PATH, changed))
