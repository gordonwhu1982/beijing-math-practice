# -*- coding: utf-8 -*-
"""从答案正文播种 rubric（评分点）。源 = ch12.jsonl 里含显式「步骤N」的答案（561 条）。

产出 content/rubric/801/ch12.jsonl：一行一个评分点
{ schema_version, qid, ordinal, criterion, points, source:"answer_steps", review_status:"ai_draft" }
铁律：只播种、不改答案；步骤文本原样截取，人工核对后才算定稿。
"""
import json, os, io, sys, re, collections
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
REPO = os.environ.get("MC_REPO", r"D:/个人/知识图谱/math-coach")
SRC = os.path.join(REPO, "content", "questions", "801", "ch12.jsonl")
DST_DIR = os.path.join(REPO, "content", "rubric", "801")
os.makedirs(DST_DIR, exist_ok=True)

STEP = re.compile(r"步骤\s*(\d{1,2})\s*")
rows, stat = [], collections.Counter()
for q in (json.loads(l) for l in open(SRC, encoding="utf-8")):
    ans = q.get("answer") or ""
    if not ans:
        stat["无答案"] += 1; continue
    marks = list(STEP.finditer(ans))
    if not marks:
        stat["无显式步骤"] += 1; continue
    # 先取「【解】/【证】/【答】」之后的内容，避免把题号抬头算成一步
    head = re.search(r"【[解证答]】", ans)
    body_start = head.end() if head else 0
    steps = []
    for i, m in enumerate(marks):
        s = m.end()
        e = marks[i + 1].start() if i + 1 < len(marks) else len(ans)
        t = ans[s:e].strip(" 。；;\n")
        t = re.sub(r"^[：:、]\s*", "", t)
        if len(t) >= 6:
            steps.append((int(m.group(1)), t))
    if len(steps) < 2:
        stat["步骤不足2"] += 1; continue
    stat["已播种"] += 1
    n = len(steps)
    base = round(100 / n, 2)
    for i, (ordinal, t) in enumerate(steps):
        pts = base if i < n - 1 else round(100 - base * (n - 1), 2)
        rows.append({"schema_version": 1, "qid": q["id"], "ordinal": i + 1,
                     "step_label": ordinal,
                     "criterion": t if len(t) <= 300 else t[:300] + "…",
                     "points": pts,
                     "source": "answer_steps", "review_status": "ai_draft"})

p = os.path.join(DST_DIR, "ch12.jsonl")
with open(p, "w", encoding="utf-8", newline="\n") as f:
    for r in rows:
        f.write(json.dumps(r, ensure_ascii=False) + "\n")
print("评分点", len(rows), "落在", len({r['qid'] for r in rows}), "道题上 →", p)
print(dict(stat))
per = collections.Counter(r["qid"] for r in rows)
print("每题评分点数分布", dict(sorted(collections.Counter(per.values()).items())))
print("样例:")
for r in rows[:3]:
    print(" ", json.dumps(r, ensure_ascii=False)[:220])
