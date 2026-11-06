# -*- coding: utf-8 -*-
"""第12章题目 × 知识点覆盖度：按节统计知识点数、题量、星级分布。输出 content/questions/801/COVERAGE.md。"""
import json, os, io, sys, collections
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
REPO = os.environ.get("MC_REPO", r"D:/个人/知识图谱/math-coach")
FR = os.path.join(REPO, "build", "framework")
nodes = [json.loads(l) for l in open(os.path.join(FR, "nodes.jsonl"), encoding="utf-8")]
edges = [json.loads(l) for l in open(os.path.join(FR, "edges.jsonl"), encoding="utf-8")]
kp_of = collections.defaultdict(list)
for e in edges:
    if e["kind"] == "contains":
        kp_of[e["src"]].append(e["dst"])
kptitle = {n["id"]: n["title"] for n in nodes if n["kind"] == "knowledge_point"}
sec_title = {n["id"]: n["title"] for n in nodes if n["kind"] == "section" and n["volume_id"] == "801"}
qs = [json.loads(l) for l in open(os.path.join(REPO, "content/questions/801/ch12.jsonl"), encoding="utf-8")]
by_sec = collections.defaultdict(list)
for q in qs:
    by_sec[q["topics"][0]].append(q)
rows = []
for sid in sorted([s for s in sec_title if s.startswith("S801-12.")], key=lambda s: int(s.split(".")[-1])):
    qq = by_sec.get(sid, [])
    st = collections.Counter(q["star_source"] for q in qq)
    rows.append((sid, sec_title[sid], len(kp_of.get(sid, [])), len(qq), st))
lines = ["# 第 12 章题库覆盖度（自动生成）", "",
         "来源 content/questions/801/ch12.jsonl（" + str(len(qs)) + " 题，节级挂载）与框架图 build/framework。", "",
         "| 节 | 知识点 | 题量 | 题/知识点 | 1星 | 2星 | 3星 | 4星 | 5星 |",
         "| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |"]
for sid, title, nk, nq, st in rows:
    lines.append("| %s | %d | %d | %.1f | %d | %d | %d | %d | %d |" % (
        title, nk, nq, (nq / nk if nk else 0), st[1], st[2], st[3], st[4], st[5]))
lines += ["",
          "合计：12 个节 " + str(sum(r[2] for r in rows)) + " 个知识点、" + str(sum(r[3] for r in rows)) +
          " 道节级题；另有章级题 " + str(len(qs) - sum(r[3] for r in rows)) + " 道（挂 C801-12）。", "",
          "## 知识点清单（按节）"]
for sid, title, nk, nq, st in rows:
    lines += ["", "### " + title + "（" + str(nk) + " 个知识点 / " + str(nq) + " 题）"]
    for k in kp_of.get(sid, []):
        lines.append("- " + kptitle.get(k, k))
p = os.path.join(REPO, "content/questions/801/COVERAGE.md")
open(p, "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")
print("\n".join(lines[:22]))
print("\n写入", p)
