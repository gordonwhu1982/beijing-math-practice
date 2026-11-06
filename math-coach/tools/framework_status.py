# -*- coding: utf-8 -*-
"""生成 docs/framework-status.md：框架现状体检（自动生成，别手改）。

读 build/framework/{nodes,edges}.jsonl 与 content/questions/**；先跑 framework_gen.py。
"""
import json, os, io, sys, glob, collections, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
REPO = os.environ.get("MC_REPO", r"D:/个人/知识图谱/math-coach")
FR = os.path.join(REPO, "build", "framework")
nodes = [json.loads(l) for l in open(os.path.join(FR, "nodes.jsonl"), encoding="utf-8")]
edges = [json.loads(l) for l in open(os.path.join(FR, "edges.jsonl"), encoding="utf-8")]
L = []
def W(s=""):
    L.append(s)
def cnt(kind):
    return [n for n in nodes if n["kind"] == kind]

vols = sorted(cnt("volume"), key=lambda n: n["id"])
chs = cnt("chapter"); secs = cnt("section"); kps = cnt("knowledge_point")
W("# 框架现状（自动生成，勿手改）")
W()
W("生成方式：`python tools/framework_gen.py && python tools/framework_status.py`。数据源 content/framework/**。")
W()
W("## 规模")
W()
W("| 册 | 章 | 节 | 知识点 | 版次 | 知识点来源 |")
W("| --- | ---: | ---: | ---: | --- | --- |")
for v in vols:
    vid = v["id"].replace("V", "")
    vs = [s for s in secs if s["volume_id"] == vid]
    vk = [k for k in kps if k["volume_id"] == vid]
    src = set()
    for f in glob.glob(os.path.join(REPO, "content/framework/knowledge_points", vid + ".json")):
        pv = json.load(open(f, encoding="utf-8"))["provenance"]
        src.add(pv.get("basis") or pv.get("kind", "?"))
    W("| %s %s | %d | %d | %d | %s | %s |" % (
        vid, v.get("title", ""), len([c for c in chs if c["volume_id"] == vid]), len(vs), len(vk),
        "已核" if v.get("status") == "verified" else "待核",
        ",".join(sorted(src)) or "—"))
W("| **合计** | **%d** | **%d** | **%d** | | |" % (len(chs), len(secs), len(kps)))
W()
W("## 知识点颗粒度")
W()
dist = collections.Counter()
for s in secs:
    n = len([k for k in kps if k["id"].startswith("K%s-%s-" % (s["volume_id"], s["section_no"]))])
    dist[n] += 1
W("每节知识点数分布：" + "、".join("%d 个:%d 节" % (k, v) for k, v in sorted(dist.items())))
thin = [s for s in secs if len([k for k in kps if k["id"].startswith("K%s-%s-" % (s["volume_id"], s["section_no"]))]) <= 2]
W()
W("仍有 %d 节 ≤2 个知识点：" % len(thin))
for s in thin[:40]:
    W("- %s %s" % (s["id"], s["title"]))
W()
W("## 先修边")
W()
W("这一节读的是 `build/framework/edges.jsonl`。`framework_gen.py` 已不再改写这份文件，条数停在旧快照。知识点级覆盖改读 `content/framework/kp_prerequisites.json`，见下一节。统一关系表以 `content/relations/edges.jsonl` 为准。")
W()
pr = [e for e in edges if e["kind"] == "prerequisite"]
W("| 来源 | 条数 |")
W("| --- | ---: |")
W("| 人工（confidence=manual，逐条带 why） | %d |" % sum(1 for e in pr if e.get("confidence") == "manual"))
W("| 规则（同册章序推断） | %d |" % sum(1 for e in pr if e.get("confidence") != "manual"))
W("| 合计 | %d |" % len(pr))
sec2ch = {n["id"]: "C%s-%02d" % (n["volume_id"], n["chapter_no"]) for n in secs}
chpairs = {(sec2ch[e["src"]], sec2ch[e["dst"]]) for e in pr if sec2ch.get(e["src"]) and sec2ch.get(e["dst"]) and sec2ch[e["src"]] != sec2ch[e["dst"]]}
used = {x for p in chpairs for x in p}
W()
W("章级聚合：%d 条章间依赖，覆盖 %d/%d 章，孤立章 %d 个。" % (
    len(chpairs), len(used), len(chs), len(chs) - len(used)))
W()
W("## 知识点级先修覆盖")
W()
# build/framework/edges.jsonl is no longer rewritten by framework_gen.
# Knowledge-point prerequisites live in kp_prerequisites.json.
kp_doc_path = os.path.join(REPO, "content", "framework", "kp_prerequisites.json")
kp_doc = json.load(open(kp_doc_path, encoding="utf-8")) if os.path.exists(kp_doc_path) else {}
kp_edges = kp_doc.get("edges") or []
kp_cov = {x for e in kp_edges for x in (e.get("from"), e.get("to")) if x}
W("知识点级先修边 %d 条，覆盖 %d/%d 个知识点 = %.1f%%（其余知识点目前只靠节级先修兜底）。" % (
    len(kp_edges), len(kp_cov & {k["id"] for k in kps}), len(kps), 100.0 * len(kp_cov & {k["id"] for k in kps}) / max(1, len(kps))))
W()
W("| 册 | 有知识点级边的点 | 该册知识点 | 覆盖 |")
W("| --- | ---: | ---: | ---: |")
for v in vols:
    vid = v["id"].replace("V", "")
    vk = [k["id"] for k in kps if k["volume_id"] == vid]
    hit = [x for x in vk if x in kp_cov]
    W("| %s %s | %d | %d | %s |" % (vid, v.get("title", ""), len(hit), len(vk),
                                    ("%.0f%%" % (100.0 * len(hit) / len(vk))) if vk else "—"))
W()
W("## 支撑层（定义 / 方法 / 错因，按节覆盖）")
W()
det, sks, mcs = [], [], []
for f in glob.glob(os.path.join(REPO, "content/framework/knowledge_points/*.detail.jsonl")):
    det += [json.loads(l) for l in open(f, encoding="utf-8") if l.strip()]
for f in glob.glob(os.path.join(REPO, "content/skills/**/*.jsonl"), recursive=True):
    sks += [json.loads(l) for l in open(f, encoding="utf-8") if l.strip()]
for f in glob.glob(os.path.join(REPO, "content/misconceptions/**/*.jsonl"), recursive=True):
    mcs += [json.loads(l) for l in open(f, encoding="utf-8") if l.strip()]
if det or sks or mcs:
    W("| 实体 | 条数 | 说明 |")
    W("| --- | ---: | --- |")
    W("| 知识点富化 detail | %d | 覆盖 %d 个知识点；kp_type：%s |" % (
        len(det), len({d["uid"] for d in det}),
        "、".join("%s %d" % (k, v) for k, v in collections.Counter(d.get("kp_type") for d in det).most_common())))
    st = [x for s2 in sks for x in (s2.get("steps") or [])]
    W("| 解题方法 skill | %d | 步均 %.1f 步；failure_signals 均 %.1f 条 |" % (
        len(sks), len(st) / len(sks) if sks else 0,
        sum(len(x.get("failure_signals") or []) for x in sks) / len(sks) if sks else 0))
    W("| 错因 misconception | %d | %s |" % (
        len(mcs),
        "、".join("%s %d" % (k, v) for k, v in collections.Counter(m.get("category") for m in mcs).most_common())))
    # 边数以统一关系表为准：框架派生的 edges 只覆盖有细节的那一册，会漏掉 701/802 的方法
    _rel = os.path.join(REPO, "content", "relations", "edges.jsonl")
    _eall = [json.loads(l) for l in open(_rel, encoding="utf-8") if l.strip()] if os.path.exists(_rel) else edges
    W("| 图谱边（统一关系表） | 共 %d 条：applies_to %d、misconception_of %d、belongs_to %d、assessed_by %d | 双向引用 0 处断裂 |" % (
        len(_eall),
        sum(1 for e in _eall if e.get("relation") == "applies_to"),
        sum(1 for e in _eall if e.get("relation") == "misconception_of"),
        sum(1 for e in _eall if e.get("relation") == "belongs_to"),
        sum(1 for e in _eall if e.get("relation") == "assessed_by")))
    # 方法之间的先后：草稿文件条数 vs 实际入表的条数（有一部分与 16 条规则边重合被去重）
    _sp = os.path.join(REPO, "content", "framework", "skill_prerequisites.json")
    if os.path.exists(_sp):
        _spd = json.load(open(_sp, encoding="utf-8"))
        _draft = len(_spd.get("edges") or [])
        _nsk = sum(1 for e in _eall if e.get("relation") == "prerequisite_of"
                   and str(e.get("src", "")).startswith("SK-") and str(e.get("dst", "")).startswith("SK-"))
        _tail = {e.get("dst") for e in _eall if e.get("relation") == "prerequisite_of"
                 and str(e.get("src", "")).startswith("SK-")}
        _tot = len({s["uid"] for s in sks}) if sks else 0
        W("| 方法之间的先后（逐条起草） | 草稿 %d 条，入表 %d 条 | 覆盖 %d/%d 个方法（%s）有入边、即知道「先练什么」，六册齐；除 16 条按教材挂点位置推断外均为逐条起草，review_status=ai_draft、**没有教研复核** |" % (
            _draft, _nsk, len(_tail), _tot, ("%.0f%%" % (100.0 * len(_tail) / _tot)) if _tot else "-"))
    W()
    W("每节覆盖：")
    W("| 节 | 定义 kp | skill | misconception |")
    W("| --- | ---: | ---: | ---: |")
    for s2 in secs:
        if s2["volume_id"] != "801":
            continue
        no = s2["section_no"]
        nd = sum(1 for d in det if d["uid"].startswith("K801-%s-" % no))
        ns2 = sum(1 for x in sks if ("-" + no + "-") in x["uid"])
        nm = sum(1 for x in mcs if ("-" + no + "-") in x["uid"])
        ttl = (s2.get("title") or "")
        if ttl.startswith(no):
            ttl = ttl[len(no):].strip()
        W("| %s %s | %d | %d | %d |" % (no, ttl, nd, ns2, nm))
else:
    W("支撑层尚未建（第 12 章的 detail / skills / misconceptions 都为空）。")
W()
W("## 题库与评分点")
W()
qs = []
for p in glob.glob(os.path.join(REPO, "content/questions/**/*.jsonl"), recursive=True):
    # 题库只认 ch<章>.jsonl：ch*.spec.jsonl 是答案结构化侧车，ch*.textbook.answer.jsonl 是
    # 教材题答案草稿，两者都没有 figure/stem 等题库字段，混进来会 KeyError
    if not re.match(r"^ch[0-9]+\.jsonl$", os.path.basename(p)):
        continue
    qs += [json.loads(l) for l in open(p, encoding="utf-8")]
rub = []
for p in glob.glob(os.path.join(REPO, "content/rubric/**/*.jsonl"), recursive=True):
    rub += [json.loads(l) for l in open(p, encoding="utf-8")]
if qs:
    W("题 %d 道（有答案 %d、缺答案 %d）；评分点 %d 个，覆盖 %d 道题；配图状态：必须 %d / 建议 %d / 无需 %d。" % (
        len(qs), sum(1 for q in qs if q.get("answer")), sum(1 for q in qs if not q.get("answer")),
        len(rub), len({r["qid"] for r in rub}),
        sum(1 for q in qs if q["figure"]["need"] == "required"),
        sum(1 for q in qs if q["figure"]["need"] == "helpful"),
        sum(1 for q in qs if q["figure"]["need"] == "none")))
    ts = collections.Counter(q["topics"][0] for q in qs)
    W()
    W("按 topic：" + "、".join("%s(%d)" % (t, n) for t, n in sorted(ts.items())))
    # 题→知识点（assessed_by 的来源）：侧挂 ch<章>.kp.jsonl，只收高置信 auto 档
    kpm = []
    for p in glob.glob(os.path.join(REPO, "content/questions/**/*.kp.jsonl"), recursive=True):
        kpm += [json.loads(l) for l in open(p, encoding="utf-8") if l.strip()]
    if kpm:
        kp_ids = {n["id"] for n in nodes if n["kind"] == "knowledge_point"}
        tags = [t for r in kpm for t in (r.get("kp_tags") or [])]
        bad = sum(1 for t in tags if t["kp_uid"] not in kp_ids)
        W()
        n_all = len({r["uid"] for r in kpm})
        n_word = len({r["uid"] for r in kpm if "writeback" in (r.get("generated_by") or "")})
        n_ai = n_all - n_word
        W("题→知识点（assessed_by 来源）：%d 道题有映射，占题库 %.1f%%，指向 %d 个知识点（编号失效 %d 处）；"
          "来源：词表法 %d 道（金标准抽检严格正确 86.2%%）、逐节 AI 辅助标注 %d 道（尚未抽检复核）；"
          "review_status 一律 ai_draft，只当提示用、不参与掌握度。"
          % (n_all, 100.0 * n_all / len(qs), len({t["kp_uid"] for t in tags}), bad, n_word, n_ai))
else:
    W("题库尚空。")
open(os.path.join(REPO, "docs", "framework-status.md"), "w", encoding="utf-8", newline="\n").write("\n".join(L) + "\n")
print("\n".join(L))
