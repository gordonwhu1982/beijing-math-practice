# -*- coding: utf-8 -*-
"""关系表闸门：端点存在、relation 合法、双向一致、无环、sequence 覆盖、证据齐备。

用法: python tools/relations_check.py [--quiet]
退出码 0 = 全过。
"""
import json, os, sys, glob, collections

REPO = os.environ.get("MC_REPO", r"D:\个人\知识图谱\math-coach")
C = os.path.join(REPO, "content")
VOLS = ["701", "702", "801", "802", "901", "902"]
RELATIONS = {"is_part_of", "prerequisite_of", "supports", "equivalent_to", "contrast_with",
             "applies_to", "assessed_by", "explained_by", "misconception_of", "sequence",
             "belongs_to", "uses_skill"}
STRENGTH = {"hard", "support", "optional"}
CONF = {"exact", "manual", "inferred", "weak"}
EVTYPE = {"textbook_page", "item", "curriculum_ref", "external_kg", "teacher_note"}
SYMMETRIC = {"equivalent_to", "contrast_with"}
errs, warns = [], []


def jl(p):
    return [json.loads(l) for l in open(p, encoding="utf-8") if l.strip()] if os.path.exists(p) else []


def jd(p):
    return json.load(open(p, encoding="utf-8"))


# ---------- 实体全集 ----------
ent = set()
sec_meta, chap_of = {}, {}
vol_chap = collections.defaultdict(list)
for v in VOLS:
    ent.add("V" + v)
    vd = jd(os.path.join(C, "framework", "volumes", v + ".json"))
    for ch in vd["chapters"]:
        cid = "C%s-%02d" % (v, ch["no"])
        ent.add(cid)
        vol_chap[v].append(ch["no"])
        secs = [s["no"] for s in ch.get("sections") or []]
        for s in ch.get("sections") or []:
            sid = "S%s-%s" % (v, s["no"])
            ent.add(sid)
            sec_meta[sid] = {"vol": v, "chapter": cid, "sections": secs, "no": s["no"]}
    # knowledge_points/<vol>.json 的 knowledge_points 是标题字符串；实体 uid 只存在于 detail
    for d in jl(os.path.join(C, "framework", "knowledge_points", v + ".detail.jsonl")):
        ent.add(d["uid"])
for f in glob.glob(os.path.join(C, "skills", "*", "*.jsonl")):
    for r in jl(f):
        ent.add(r["uid"])
for f in glob.glob(os.path.join(C, "misconceptions", "*", "*.jsonl")):
    for r in jl(f):
        ent.add(r["uid"])
for r in jl(os.path.join(C, "thoughts.jsonl")):
    ent.add(r["uid"])
for r in (jd(os.path.join(C, "registry", "competencies.json")).get("items") or []):
    ent.add(r["uid"])
for r in jl(os.path.join(C, "curriculum", "standards.jsonl")):
    ent.add(r["uid"])

# ---------- 读边 ----------
edges = jl(os.path.join(C, "relations", "edges.jsonl"))
if not edges:
    print("FAIL edges.jsonl 为空或不存在")
    sys.exit(1)

uids = collections.Counter()
for i, e in enumerate(edges, 1):
    tag = "edges.jsonl:%d" % i
    for f in ("uid", "src", "dst", "relation", "strength", "evidence", "confidence", "review"):
        if f not in e:
            errs.append("%s 缺字段 %s" % (tag, f))
    uids[e.get("uid")] += 1
    if e.get("uid") and not str(e["uid"]).startswith("ED-"):
        errs.append("%s uid 不合 ^ED- : %s" % (tag, e["uid"]))
    if e.get("relation") not in RELATIONS:
        errs.append("%s 非法 relation %s" % (tag, e.get("relation")))
    if e.get("strength") not in STRENGTH:
        errs.append("%s 非法 strength %s" % (tag, e.get("strength")))
    if e.get("confidence") not in CONF:
        errs.append("%s 非法 confidence %s" % (tag, e.get("confidence")))
    for side in ("src", "dst"):
        if e.get(side) not in ent:
            errs.append("%s 端点不存在 %s=%s" % (tag, side, e.get(side)))
    ev = e.get("evidence")
    if not isinstance(ev, list) or not ev:
        errs.append("%s evidence 必须是非空数组" % tag)
    else:
        for x in ev:
            if x.get("type") not in EVTYPE:
                errs.append("%s evidence.type 非法 %s" % (tag, x.get("type")))
            if not x.get("ref"):
                errs.append("%s evidence 缺 ref" % tag)
    if e.get("src") == e.get("dst"):
        errs.append("%s 自环 %s" % (tag, e.get("src")))
for u, c in uids.items():
    if c > 1:
        errs.append("uid 重复 %s x%d" % (u, c))

# ---------- 双向一致：kp.skill_refs ↔ applies_to/uses_skill ----------
det = {}
for v in VOLS:
    for d in jl(os.path.join(C, "framework", "knowledge_points", v + ".detail.jsonl")):
        det[d["uid"]] = d
app = {(e["src"], e["dst"]) for e in edges if e["relation"] == "applies_to"}
use = {(e["src"], e["dst"]) for e in edges if e["relation"] == "uses_skill"}
for s, k in app:
    if (k, s) not in use:
        errs.append("applies_to %s→%s 缺反向 uses_skill" % (s, k))
for k, s in use:
    if (s, k) not in app:
        errs.append("uses_skill %s→%s 缺反向 applies_to" % (k, s))
for kid, d in det.items():
    for s in d.get("skill_refs") or []:
        if (s, kid) not in app:
            errs.append("kp %s 的 skill_refs 含 %s 但缺 applies_to 边" % (kid, s))

# ---------- 无环：prerequisite_of ----------
pre = collections.defaultdict(list)
for e in edges:
    if e["relation"] == "prerequisite_of":
        pre[e["src"]].append(e["dst"])
WHITE, GRAY, BLACK = 0, 1, 2
color = collections.defaultdict(int)
stack = []


def dfs(u):
    color[u] = GRAY
    stack.append(u)
    for w in pre[u]:
        if color[w] == GRAY:
            cyc = stack[stack.index(w):] + [w]
            errs.append("prerequisite_of 有环: %s" % " → ".join(cyc))
            return True
        if color[w] == WHITE and dfs(w):
            return True
    stack.pop()
    color[u] = BLACK
    return False


for u in list(pre):
    if color[u] == WHITE:
        if dfs(u):
            break

# ---------- sequence 覆盖每章 ----------
seq_pairs = {(e["src"], e["dst"]) for e in edges if e["relation"] == "sequence"}
for sid, m in sec_meta.items():
    secs = m["sections"]
    if len(secs) < 2:
        continue
    for a, b in zip(secs, secs[1:]):
        if ("S%s-%s" % (m["vol"], a), "S%s-%s" % (m["vol"], b)) not in seq_pairs:
            errs.append("sequence 缺章内相邻节 %s-%s → %s-%s" % (m["vol"], a, m["vol"], b))
for v, chs in vol_chap.items():
    for a, b in zip(chs, chs[1:]):
        if ("C%s-%02d" % (v, a), "C%s-%02d" % (v, b)) not in seq_pairs:
            errs.append("sequence 缺册内相邻章 %s-%02d → %02d" % (v, a, b))

# ---------- 每个知识点必须 is_part_of 某节 ----------
part = {(e["src"], e["dst"]) for e in edges if e["relation"] == "is_part_of"}
for k in ent:
    if k.startswith("K") and len(k.split("-")) == 3 and not any(s == k for s, d in part):
        errs.append("知识点 %s 缺 is_part_of" % k)

# ---------- assessed_by 方向与端点类型 ----------
for i, e in enumerate(edges, 1):
    if e.get("relation") != "assessed_by":
        continue
    if not str(e.get("src", "")).startswith("K"):
        errs.append("edges.jsonl:%d assessed_by 的 src 必须是知识点(K 开头)：%s" % (i, e.get("src")))
    if not str(e.get("dst", "")).startswith("CS-"):
        errs.append("edges.jsonl:%d assessed_by 的 dst 必须是课标条目(CS- 开头)：%s" % (i, e.get("dst")))

# ---------- 横向边：端点类型、对称去重 ----------
pair_seen = {}
for i, e in enumerate(edges, 1):
    if e["relation"] not in SYMMETRIC:
        continue
    if not str(e.get("src", "")).startswith("K"):
        errs.append("edges.jsonl:%d %s 的 src 必须是知识点(K 开头)：%s" % (i, e["relation"], e.get("src")))
    if not str(e.get("dst", "")).startswith("K"):
        errs.append("edges.jsonl:%d %s 的 dst 必须是知识点(K 开头)：%s" % (i, e["relation"], e.get("dst")))
    kk = (frozenset((e["src"], e["dst"])), e["relation"])
    if kk in pair_seen:
        errs.append("edges.jsonl:%d %s 对称边重复存了两条：%s ↔ %s" % (i, e["relation"], e["src"], e["dst"]))
    pair_seen[kk] = i
for r in sorted(SYMMETRIC):
    n_r = sum(1 for e in edges if e["relation"] == r)
    if n_r == 0:
        warns.append("关系 %s 一条边都没有" % r)

# ---------- 报告 ----------
cnt = collections.Counter(e["relation"] for e in edges)
cov_pre = len({e["src"] for e in edges if e["relation"] == "prerequisite_of" and str(e["src"]).startswith("K")})
cov_skill = len({k for s, k in app})
print("边 %d 条：%s" % (len(edges), ", ".join("%s=%d" % kv for kv in cnt.most_common())))
print("知识点 %d；有过先修边的 %d (%.1f%%)；挂上方法的 %d (%.1f%%)"
      % (len([x for x in ent if x.startswith("K")]), cov_pre,
         100.0 * cov_pre / max(1, len([x for x in ent if x.startswith("K")])),
         cov_skill, 100.0 * cov_skill / max(1, len([x for x in ent if x.startswith("K")]))))
for w in warns[:20]:
    print("WARN", w)
if errs:
    print("RELATIONS CHECK FAILED: %d 个错误" % len(errs))
    for x in errs[:40]:
        print(" -", x)
    sys.exit(1)
cov_std = len({e["src"] for e in edges if e["relation"] == "assessed_by"})
n_std = len([x for x in ent if x.startswith("CS-")])
print("课标条目 %d 条；有课标要求边的知识点 %d" % (n_std, cov_std))
for r in sorted(SYMMETRIC):
    print("横向关系 %s：%d 条（对称，只存一条）" % (r, sum(1 for e in edges if e["relation"] == r)))
print("RELATIONS CHECK PASSED")
