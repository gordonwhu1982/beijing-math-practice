# -*- coding: utf-8 -*-
"""rubric 一致性闸门：qid 必存在、ordinal 从 1 连续、points 合计 100（±0.05）。"""
import json, os, io, sys, collections
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
REPO = os.environ.get("MC_REPO", r"D:/个人/知识图谱/math-coach")
qs = {json.loads(l)["id"] for l in open(os.path.join(REPO, "content/questions/801/ch12.jsonl"), encoding="utf-8")}
rows = [json.loads(l) for l in open(os.path.join(REPO, "content/rubric/801/ch12.jsonl"), encoding="utf-8")]
per = collections.defaultdict(list)
for r in rows:
    per[r["qid"]].append(r)
bad = []
for qid, rs in per.items():
    if qid not in qs:
        bad.append((qid, "题不存在")); continue
    rs.sort(key=lambda r: r["ordinal"])
    if [r["ordinal"] for r in rs] != list(range(1, len(rs) + 1)):
        bad.append((qid, "ordinal 不连续"))
    s = sum(r["points"] for r in rs)
    if abs(s - 100) > 0.05:
        bad.append((qid, "总分 %.2f" % s))
print("题 %d 道、评分点 %d 个、错误 %d 处" % (len(per), len(rows), len(bad)))
for b in bad[:10]:
    print("  !", b)
sys.exit(1 if bad else 0)
