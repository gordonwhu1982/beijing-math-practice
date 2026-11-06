# -*- coding: utf-8 -*-
"""把「答案里混进的定理注」拆出去：answer = 源 ans_txt，answer_note = 源 note（去 HTML 标签）。
用法: python tools/fix_answer_note.py [--apply]
"""
import json, os, io, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
REPO = os.environ.get("MC_REPO", r"D:/个人/知识图谱/math-coach")
SRC = os.environ.get("CH12_SRC", r"C:/Users/liang.gao5/AppData/Roaming/Trae CN/ModularData/ai-agent/work-mode-projects/6a509678e9670855e3fda7f1/ch12_index.json")
DST = os.path.join(REPO, "content", "questions", "801", "ch12.jsonl")
APPLY = "--apply" in sys.argv

src = {i["id"]: i for i in json.load(open(SRC, encoding="utf-8"))["items"]}
rows = [json.loads(l) for l in open(DST, encoding="utf-8")]
TAG = re.compile(r"<[^>]+>")

same = diff = 0
samples = []
changed = 0
for q in rows:
    s = src[q["id"]]["ans"] or {}
    ans_txt = s.get("ans_txt") or ""
    note = TAG.sub("", s.get("note") or "").strip()
    cur = q.get("answer") or ""
    if cur == ans_txt:
        same += 1
    else:
        diff += 1
        if len(samples) < 5:
            samples.append((q["id"], len(cur), len(ans_txt)))
    if cur != ans_txt or (q.get("answer_note") or "").strip() != note:
        changed += 1
    q["answer"] = ans_txt
    q["answer_note"] = note
    # $ 必须成对，否则就是内容缺陷，先标记出来
    if ans_txt and ans_txt.count("$") % 2:
        q["answer_status"] = "broken_math"

print("题 %d 道｜answer 与源 ans_txt 一致 %d、不一致 %d｜本次改动 %d 道" % (len(rows), same, diff, changed))
for s in samples:
    print("  差异样例 %s 现有 %d 字 / 源 %d 字" % s)
odd = [q["id"] for q in rows if (q["answer"] or "").count("$") % 2]
bare = [q["id"] for q in rows if re.search(r"\\[a-zA-Z]+", re.sub(r"\$[^$]*\$", "", (q["answer"] or "")))]
print("答案 $ 数为奇数 %d 道；去掉 $...$ 后仍有 LaTeX 命令（裸公式）%d 道" % (len(odd), len(bare)))
print("  奇数例：", odd[:6])
print("  裸公式例：", bare[:6])
if APPLY:
    with open(DST, "w", encoding="utf-8", newline="\n") as f:
        for q in rows:
            f.write(json.dumps(q, ensure_ascii=False) + "\n")
    print("已写入", DST)
else:
    print("（未改动；加 --apply 落盘）")
