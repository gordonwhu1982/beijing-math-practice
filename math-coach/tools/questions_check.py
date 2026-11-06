# -*- coding: utf-8 -*-
"""校验 content/questions/**.jsonl 与框架图的对齐：
- topics 必须能解析到 build/framework/nodes.jsonl 里的节点
- 节级题挂 S801-12.x（不能挂不存在的节号）
- id 唯一、star/band 合法、visibility/redistributable 字段齐全
- 输出每题簇统计，写 build/questions/report.txt
"""
import json, os, io, sys, glob, collections, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
REPO = os.environ.get("MC_REPO", r"D:/个人/知识图谱/math-coach")
FR = os.path.join(REPO, "build", "framework")
QP = os.path.join(REPO, "content", "questions")
OUT = os.path.join(REPO, "build", "questions")
os.makedirs(OUT, exist_ok=True)

nodes = {}
for l in open(os.path.join(FR, "nodes.jsonl"), encoding="utf-8"):
    n = json.loads(l); nodes[n["id"]] = n

BANDS = {"basic", "standard", "advanced", "challenge", "competition"}
rows, errs = [], []
for p in sorted(glob.glob(os.path.join(QP, "**", "*.jsonl"), recursive=True)):
    # 题库只认 ch<章>.jsonl；ch12.spec.jsonl（答案结构化侧车）、ch13.textbook.answer.jsonl
    # （教材题答案草稿）都不是题目记录，必须跳过，否则 q["id"] 直接 KeyError
    if not re.match(r"^ch[0-9]+\.jsonl$", os.path.basename(p)):
        continue
    for i, l in enumerate(open(p, encoding="utf-8"), 1):
        if not l.strip():
            continue
        q = json.loads(l); q["_file"] = os.path.relpath(p, REPO); q["_line"] = i
        rows.append(q)
        if q.get("band") not in BANDS:
            errs.append((q["id"], "band 非法", q.get("band")))
        if not q.get("topics"):
            errs.append((q["id"], "topics 空", None))
        for t in q.get("topics", []):
            if t not in nodes:
                errs.append((q["id"], "topic 不存在", t))
        if q.get("section_no") and ("S%s-%s" % (q["volume_id"], q["section_no"])) not in nodes:
            errs.append((q["id"], "section 节点不存在", q["section_no"]))
        for f in ("visibility", "redistributable", "review_status", "license"):
            if f not in q:
                errs.append((q["id"], "缺字段 " + f, None))
ids = collections.Counter(q["id"] for q in rows)
dups = [k for k, v in ids.items() if v > 1]
assert not dups, "id 重复 %s" % dups[:5]

lines = []
def W(s=""):
    lines.append(s); print(s)
W("题量 %d 条，来自 %d 个文件" % (len(rows), len({q["_file"] for q in rows})))
W("校验错误 %d 条" % len(errs))
for e in errs[:20]:
    W("  ! %s | %s | %s" % e)
W()
W("按 topic 分布:")
by_t = collections.Counter(q["topics"][0] for q in rows)
for t, n in sorted(by_t.items()):
    title = nodes[t]["title"] if t in nodes else "（未解析）"
    W("  %-10s %4d  %s" % (t, n, title))
W()
W("答案状态: 有答案 %d / 缺答案 %d" % (sum(1 for q in rows if q["answer"]), sum(1 for q in rows if not q["answer"])))
W("band: %s" % dict(collections.Counter(q["band"] for q in rows)))
W("form: %s" % dict(collections.Counter(q["form"] for q in rows)))
W("配图: 必须 %d / 建议 %d / 无需 %d" % (
    sum(1 for q in rows if q["figure"]["need"] == "required"),
    sum(1 for q in rows if q["figure"]["need"] == "helpful"),
    sum(1 for q in rows if q["figure"]["need"] == "none")))
W("含 $ 数学式: %d 条" % sum(1 for q in rows if "$" in q["stem"]))
W("答案含显式步骤: %d 条（可直接播种 rubric）" % sum(1 for q in rows if q.get("answer_steps_declared", 0) > 0))
W("redistributable=false: %d / visibility=stem_public: %d" % (
    sum(1 for q in rows if q["redistributable"] is False),
    sum(1 for q in rows if q["visibility"] == "stem_public")))
# 题目用途侧挂（ch<章>.meta.jsonl）：值域、回指、why 三者必须成立。
# 前端会把 purpose 直接显示成「教材原题 / 方法应用」这类徽章，一旦 uid 不在题库
# 或值域拼错，界面上就会出现一个指向不存在的题的标签，所以在这里挡住。
PURPOSES = {"method_contrast", "definition", "example", "method_apply", "context"}
qids = set(q["id"] for q in rows)
meta = {}
for p in sorted(glob.glob(os.path.join(QP, "**", "*.meta.jsonl"), recursive=True)):
    rel = os.path.relpath(p, REPO)
    for i, l in enumerate(open(p, encoding="utf-8"), 1):
        if not l.strip():
            continue
        m = json.loads(l)
        uid = m.get("uid")
        if uid in meta:
            errs.append("%s:%d 用途重复：%s" % (rel, i, uid))
        if m.get("purpose") not in PURPOSES:
            errs.append("%s:%d 用途值非法：%r" % (rel, i, m.get("purpose")))
        if not (m.get("why") or "").strip():
            errs.append("%s:%d 用途缺 why（说不清为什么收这道题就别标）：%s" % (rel, i, uid))
        if uid not in qids:
            errs.append("%s:%d 用途指向不存在的题：%s" % (rel, i, uid))
        meta[uid] = m
W("题目用途: 已标 %d / 未标 %d（%s）" % (
    len(meta), len(rows) - len(meta),
    dict(collections.Counter(m.get("purpose") for m in meta.values()))))
W()
open(os.path.join(OUT, "report.txt"), "w", encoding="utf-8", newline="\n").write("\n".join(lines) + "\n")
sys.exit(1 if errs else 0)
