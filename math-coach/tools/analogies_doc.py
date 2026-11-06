# -*- coding: utf-8 -*-
"""把 content/framework/analogies.json 渲染成一份可人工审的对照表。

为什么要有这一步：横向边是「人读出来的关系」，最容易自说自话。落到一张两列表上，
教研一眼就能看出「这两处真的能类比吗」「这一对真的会混吗」，比读 jsonl 便宜得多。
改判结果回写 analogies.json，然后重跑 tools/edges_build.py 与 tools/build_web.py。

用法: PYTHONIOENCODING=utf-8 python tools/analogies_doc.py [--check]
  --check 只比对文档是否与数据一致（进闸门用），不写文件
"""
import io, json, os, sys

REPO = os.environ.get("MC_REPO", r"D:\个人\知识图谱\math-coach")
C = os.path.join(REPO, "content")
OUT = os.path.join(REPO, "docs", "analogies-table.md")


def jl(p):
    return [json.loads(l) for l in io.open(p, encoding='utf-8') if l.strip()]


def jd(p):
    return json.load(io.open(p, encoding='utf-8'))


an = jd(os.path.join(C, "framework", "analogies.json"))
kp = {}
for v in ["701", "702", "801", "802", "901", "902"]:
    for d in jl(os.path.join(C, "framework", "knowledge_points", v + ".detail.jsonl")):
        kp[d["uid"]] = d

# 知识点标题只存在于派生的 nodes.jsonl（701.json 里知识点还是裸字符串，uid 由 framework_gen 生成）。
# nodes.jsonl 是 build/ 下的生成物，所以先跑 tools/framework_gen.py 再跑本脚本；缺文件时退回定义首句。
TITLE = {}
_nodes = os.path.join(REPO, "build", "framework", "nodes.jsonl")
if os.path.exists(_nodes):
    for n in jl(_nodes):
        if n.get("kind") == "knowledge_point":
            TITLE[n["id"]] = n.get("title") or ""


def name(uid):
    t = TITLE.get(uid)
    if t:
        return t
    d = kp.get(uid) or {}
    t = d.get("definition") or ""
    return (t[:26] + "…") if len(t) > 26 else (t or uid)


def cell(s):
    return (s or "").replace("|", "\uff5c").replace("\n", " ")


EQ = [it for it in an["items"] if it["kind"] == "equivalent"]
CT = [it for it in an["items"] if it["kind"] == "contrast"]
L = []
L.append("# 横向依赖对照表：可以类比 / 容易混淆")
L.append("")
L.append("生成命令 `PYTHONIOENCODING=utf-8 python tools/analogies_doc.py`；源数据 `content/framework/analogies.json`，"
         "`review_status = ai_draft`，未经教研复核。")
L.append("")
L.append("先修边回答「能不能学」，这两类边回答「学的时候能挂到谁身上」："
         "可以类比的对象用来迁移结论，容易混淆的那一对用来防错。")
L.append("")
L.append("## 可以类比（equivalent_to，%d 条）" % len(EQ))
L.append("")
L.append("| # | 这一处 | 那一处 | 为什么可以搬过去 | 依据 |")
L.append("| --- | --- | --- | --- | --- |")
for i, it in enumerate(EQ, 1):
    L.append("| %d | %s `%s` | %s `%s` | %s | %s |" % (
        i, cell(name(it["a"])), it["a"], cell(name(it["b"])), it["b"], cell(it["why"]), cell(it["basis"])))
L.append("")
L.append("## 容易混淆（contrast_with，%d 条）" % len(CT))
L.append("")
L.append("| # | 这一处 | 那一处 | 为什么会混 | 依据 |")
L.append("| --- | --- | --- | --- | --- |")
for i, it in enumerate(CT, 1):
    L.append("| %d | %s `%s` | %s `%s` | %s | %s |" % (
        i, cell(name(it["a"])), it["a"], cell(name(it["b"])), it["b"], cell(it["why"]), cell(it["basis"])))
L.append("")
body = "\n".join(L) + "\n"

if "--check" in sys.argv:
    old = io.open(OUT, encoding="utf-8").read() if os.path.exists(OUT) else ""
    if old != body:
        print("ANALOGIES DOC 与数据不一致，请重跑 tools/analogies_doc.py")
        sys.exit(1)
    print("analogies 文档与数据一致（%d 条）" % len(an["items"]))
    sys.exit(0)

os.makedirs(os.path.dirname(OUT), exist_ok=True)
io.open(OUT, "w", encoding="utf-8", newline="\n").write(body)
print("写入", OUT, len(an["items"]), "条；equivalent", len(EQ), "contrast", len(CT))
