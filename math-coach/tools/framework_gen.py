
import json, os, io, sys, glob, csv
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
REPO = r"D:/个人/知识图谱/math-coach"
VOL_DIR = os.path.join(REPO, "content", "framework", "volumes")
KP_DIR = os.path.join(REPO, "content", "framework", "knowledge_points")
OUT = os.path.join(REPO, "build", "framework")
os.makedirs(OUT, exist_ok=True)
os.makedirs(KP_DIR, exist_ok=True)

# 1) seed 801 knowledge points from legacy textbook_index.json (ai_draft, needs review)
LEGACY = r"D:/个人/初中材料/24-25初一下/初一下暑假学习锻炼任务包（八科）2026.7/数学/scripts/textbook_index.json"
kp801_path = os.path.join(KP_DIR, "801.json")
if not os.path.exists(kp801_path) and os.path.exists(LEGACY):
    tbi = json.load(open(LEGACY, encoding="utf-8"))
    out = {"schema_version": 1, "volume_id": "801",
           "provenance": {"kind": "derived", "from": "textbook_index.json (AI 生成初稿)",
                          "review_status": "ai_draft", "verified_on": None,
                          "note": "知识点文字未经教材原文逐条核对，先作 seed；核对后改 review_status=human_checked"},
           "chapters": []}
    for ch in tbi["chapters"]:
        out["chapters"].append({
            "no": ch["chapter"], "title": ch["title"],
            "sections": [{"no": s["section"], "title": s["title"],
                          "knowledge_points": s.get("knowledge_points", []),
                          "text_offset": s.get("text_offset")} for s in ch["sections"]],
        })
    json.dump(out, open(kp801_path, "w", encoding="utf-8"), ensure_ascii=False, indent=1)

# 2) load volumes + kp
vols = []
for p in sorted(glob.glob(os.path.join(VOL_DIR, "*.json"))):
    vols.append(json.load(open(p, encoding="utf-8")))
kp = {}
for p in sorted(glob.glob(os.path.join(KP_DIR, "*.json"))):
    d = json.load(open(p, encoding="utf-8"))
    for ch in d["chapters"]:
        for s in ch["sections"]:
            kp.setdefault(s["no"], []).extend(s.get("knowledge_points", []))

nodes, edges = [], []
def add(n): nodes.append(n)

for v in vols:
    vid = v["volume_id"]
    add({"id": "V" + vid, "kind": "volume", "title": v["label"], "grade": v["grade"], "term": v["term"],
         "volume_id": vid, "status": "verified" if v["edition"]["verified"] else "stub_edition",
         "source": {"file": v["source"]["filename"], "page": 1}})
    prev_ch = None
    for c in v["chapters"]:
        cid = "C%s-%02d" % (vid, c["no"])
        add({"id": cid, "kind": "chapter", "title": "第%d章 %s" % (c["no"], c["title"]),
             "volume_id": vid, "chapter_no": c["no"], "page": c["page"],
             "status": "verified" if v["edition"]["verified"] else "stub_edition",
             "source": {"file": v["source"]["filename"], "page": c["page"]}})
        edges.append({"src": "V" + vid, "dst": cid, "kind": "contains", "strength": "hard",
                      "evidence": "%s 目录" % v["source"]["filename"], "confidence": "exact",
                      "review_status": "human_checked"})
        if prev_ch:
            edges.append({"src": prev_ch, "dst": cid, "kind": "prerequisite", "strength": "soft",
                          "evidence": "同册章序（规则生成，待人工核）", "confidence": "inferred",
                          "review_status": "ai_draft"})
        prev_ch = cid
        prev_sec = None
        for s in c["sections"]:
            sid = "S%s-%s" % (vid, s["no"])
            pts = kp.get(s["no"], [])
            add({"id": sid, "kind": "section", "title": s["no"] + " " + s["title"],
                 "volume_id": vid, "chapter_no": c["no"], "section_no": s["no"], "page": s["page"],
                 "knowledge_point_count": len(pts),
                 "status": ("verified_content" if v["edition"]["verified"] else "content_draft") if pts
                           else ("verified_skeleton" if v["edition"]["verified"] else "stub_edition"),
                 "source": {"file": v["source"]["filename"], "page": s["page"]}})
            edges.append({"src": cid, "dst": sid, "kind": "contains", "strength": "hard",
                          "evidence": "%s 目录 %s" % (v["source"]["filename"], s["no"]),
                          "confidence": "exact", "review_status": "human_checked"})
            if prev_sec:
                edges.append({"src": prev_sec, "dst": sid, "kind": "prerequisite", "strength": "soft",
                              "evidence": "同章节序（规则生成，待人工核）", "confidence": "inferred",
                              "review_status": "ai_draft"})
            prev_sec = sid
            for i, t in enumerate(pts, 1):
                kid = "K%s-%s-%02d" % (vid, s["no"], i)
                add({"id": kid, "kind": "knowledge_point", "title": t,
                     "volume_id": vid, "chapter_no": c["no"], "section_no": s["no"],
                     # registry：definition 为空时 status 必须是 title_only；detail 侧车富化后改 draft
                     "status": "title_only", "source": {"file": "knowledge_points/%s.json" % vid, "page": s["page"]}})
                edges.append({"src": sid, "dst": kid, "kind": "contains", "strength": "hard",
                              "evidence": "知识点挂节", "confidence": "exact", "review_status": "ai_draft"})

# 3) 人工整理的先修边（content/framework/prerequisites.json，from=先修 → to=后继）
ids = {n["id"] for n in nodes}
PRE = os.path.join(REPO, "content", "framework", "prerequisites.json")
pre_ok, pre_bad = 0, []
if os.path.exists(PRE):
    predoc = json.load(open(PRE, encoding="utf-8"))
    for e in predoc.get("edges", []):
        a, b, why = e["from"], e["to"], e.get("why", "")
        if a == b:
            pre_bad.append((a, b, "自环")); continue
        if a not in ids or b not in ids:
            pre_bad.append((a, b, "端点不存在")); continue
        if not why:
            pre_bad.append((a, b, "缺 why")); continue
        edges.append({"src": a, "dst": b, "kind": "prerequisite", "strength": "hard",
                      "evidence": why, "confidence": "manual", "review_status": "ai_draft"})
        pre_ok += 1
# 3b) 知识点级先修边（content/framework/kp_prerequisites.json）
KPPRE = os.path.join(REPO, "content", "framework", "kp_prerequisites.json")
kp_ids = {n["id"] for n in nodes if n["kind"] == "knowledge_point"}
kpre_ok, kpre_bad = 0, []
if os.path.exists(KPPRE):
    kpdoc = json.load(open(KPPRE, encoding="utf-8"))
    seen = set()
    for e in kpdoc.get("edges", []):
        a, b, why = e["from"], e["to"], e.get("why", "")
        if a == b:
            kpre_bad.append((a, b, "自环")); continue
        if a not in kp_ids or b not in kp_ids:
            kpre_bad.append((a, b, "端点不是知识点")); continue
        if not why:
            kpre_bad.append((a, b, "缺 why")); continue
        if (a, b) in seen:
            kpre_bad.append((a, b, "重复")); continue
        seen.add((a, b))
        edges.append({"src": a, "dst": b, "kind": "prerequisite", "strength": "hard",
                      "evidence": why, "confidence": "manual", "review_status": "ai_draft",
                      "level": "knowledge_point"})
        kpre_ok += 1
if kpre_bad:
    sys.stderr.write("知识点级先修边被拒 %d 条：%s\n" % (len(kpre_bad), kpre_bad[:10]))
if pre_bad:
    sys.stderr.write("先修边被拒 %d 条：%s\n" % (len(pre_bad), pre_bad[:10]))

# 3c) 知识点富化侧车（content/framework/knowledge_points/<vol>.detail.jsonl）
node_by_id = {n["id"]: n for n in nodes}
det_ok, det_bad = 0, []
for p in sorted(glob.glob(os.path.join(KP_DIR, "*.detail.jsonl"))):
    for ln in open(p, encoding="utf-8"):
        ln = ln.strip()
        if not ln:
            continue
        d = json.loads(ln)
        n = node_by_id.get(d.get("uid"))
        if not n or n.get("kind") != "knowledge_point":
            det_bad.append(d.get("uid"))
            continue
        n["kp_type"] = d.get("kp_type")
        n["definition"] = d.get("definition")
        n["conditions"] = d.get("conditions") or []
        n["boundaries"] = d.get("boundaries") or []
        n["objectives"] = d.get("objectives") or []
        n["aliases"] = d.get("aliases") or []
        n["textbook"] = d.get("textbook")
        n["skill_refs"] = d.get("skill_refs") or []
        n["misconception_refs"] = d.get("misconception_refs") or []
        if d.get("tier"):
            n["tier"] = d["tier"]
        n["status"] = "draft"
        n["detail"] = True
        det_ok += 1

# 3d) 解题方法（content/skills/<vol>/<chapter>.jsonl）：skill --applies_to--> 知识点
sk_ok, sk_edge, sk_bad = 0, 0, []
ref_pairs = set()
for p in sorted(glob.glob(os.path.join(REPO, "content", "skills", "*", "*.jsonl"))):
    vol = os.path.basename(os.path.dirname(p))
    for ln in open(p, encoding="utf-8"):
        ln = ln.strip()
        if not ln:
            continue
        s = json.loads(ln)
        krefs = [k for k in (s.get("kp_refs") or []) if k in node_by_id]
        if not krefs:
            sk_bad.append(s.get("uid"))
            continue
        sec = (s.get("uid") or "").split("-")[2] if len((s.get("uid") or "").split("-")) > 2 else None
        add({"id": s["uid"], "kind": "skill", "title": s.get("name"),
             "volume_id": vol, "section_no": sec,
             "desc": s.get("desc"), "boundaries": s.get("boundaries") or [],
             "thought_refs": s.get("thought_refs") or [],
             "steps": s.get("steps") or [], "conditions": s.get("conditions") or [],
             "failure_signals": s.get("failure_signals") or [],
             "alternatives": s.get("alternatives") or [],
             "grade_band": s.get("grade_band"),
             "tier": s.get("tier") or "core", "family": s.get("family"),
             "status": "draft",
             "source": {"file": "skills/%s/%s" % (vol, os.path.basename(p))}})
        sk_ok += 1
        for k in krefs:
            edges.append({"src": s["uid"], "dst": k, "kind": "applies_to", "strength": "hard",
                          "evidence": "方法适用于该知识点（人工整理）", "confidence": "manual",
                          "review_status": s.get("review_status") or "ai_draft"})
            sk_edge += 1
            ref_pairs.add((k, s["uid"]))

# 3e) 错因（content/misconceptions/<vol>/<chapter>.jsonl）：misconception --misconception_of--> 知识点
mc_ok, mc_edge, mc_bad = 0, 0, []
for p in sorted(glob.glob(os.path.join(REPO, "content", "misconceptions", "*", "*.jsonl"))):
    vol = os.path.basename(os.path.dirname(p))
    for ln in open(p, encoding="utf-8"):
        ln = ln.strip()
        if not ln:
            continue
        m = json.loads(ln)
        krefs = [k for k in (m.get("kp_refs") or []) if k in node_by_id]
        if not krefs:
            mc_bad.append(m.get("uid"))
            continue
        sec = (m.get("uid") or "").split("-")[2] if len((m.get("uid") or "").split("-")) > 2 else None
        add({"id": m["uid"], "kind": "misconception",
             "title": (m.get("signal") or [m.get("uid")])[0],
             "volume_id": vol, "section_no": sec,
             "category": m.get("category"), "signal": m.get("signal") or [],
             "remedy": m.get("remedy") or {}, "status": "draft",
             "source": {"file": "misconceptions/%s/%s" % (vol, os.path.basename(p))}})
        mc_ok += 1
        for k in krefs:
            edges.append({"src": m["uid"], "dst": k, "kind": "misconception_of", "strength": "hard",
                          "evidence": "错因指向该知识点（人工整理）", "confidence": "manual",
                          "review_status": m.get("review_status") or "ai_draft"})
            mc_edge += 1
            ref_pairs.add((k, m["uid"]))

# 3f) 双向一致性：detail 的 skill_refs / misconception_refs 与 3d/3e 的边互为镜像。
#     反向引用不必手写：缺的一律按边自动补齐（少写不报错），写了却对不上边才报错。
mirror_bad, mirror_fill = [], 0
for k, uid in sorted(ref_pairs):
    n = node_by_id.get(k)
    if n is None:
        continue
    fld = "skill_refs" if uid.startswith("SK-") else "misconception_refs"
    lst = n.get(fld) or []
    if uid in lst:
        continue
    n[fld] = lst + [uid]
    mirror_fill += 1
edge_pairs = set(ref_pairs)
for n in nodes:
    if n.get("kind") != "knowledge_point":
        continue
    for fld in ("skill_refs", "misconception_refs"):
        for uid in (n.get(fld) or []):
            if (n["id"], uid) not in edge_pairs:
                mirror_bad.append("%s 多写 %s" % (n["id"], uid))
if det_bad:
    sys.stderr.write("detail 富化被拒 %d 条：%s\n" % (len(det_bad), det_bad[:10]))
if sk_bad:
    sys.stderr.write("skill 被拒 %d 条：%s\n" % (len(sk_bad), sk_bad[:10]))
if mc_bad:
    sys.stderr.write("misconception 被拒 %d 条：%s\n" % (len(mc_bad), mc_bad[:10]))
if mirror_bad:
    sys.stderr.write("双向引用不一致 %d 处：%s\n" % (len(mirror_bad), mirror_bad[:10]))

# 4) 环检测：prerequisite 边不许成环（成环说明依赖写反或重复）
adj = {}
for e in edges:
    if e["kind"] == "prerequisite":
        adj.setdefault(e["src"], []).append(e["dst"])
color = {n["id"]: 0 for n in nodes}
cycles = []
def dfs(u, stack):
    color[u] = 1
    stack.append(u)
    for w in adj.get(u, []):
        st = color.get(w, 0)
        if st == 1:
            i = stack.index(w)
            cycles.append(stack[i:] + [w])
        elif st == 0:
            dfs(w, stack)
    stack.pop()
    color[u] = 2
for n in nodes:
    if color[n["id"]] == 0:
        dfs(n["id"], [])

with open(os.path.join(OUT, "nodes.jsonl"), "w", encoding="utf-8") as f:
    for n in nodes: f.write(json.dumps(n, ensure_ascii=False) + "\n")
# 边不再落 build/framework/edges.jsonl：统一关系表 content/relations/edges.jsonl 是唯一权威
# （由 tools/edges_build.py 生成、tools/relations_check.py 校验）。这里的 edges 只做本步自检。
with open(os.path.join(OUT, "legacy_edges_for_selfcheck.jsonl"), "w", encoding="utf-8") as f:
    for e in edges: f.write(json.dumps(e, ensure_ascii=False) + "\n")

from collections import Counter
kc = Counter(n["kind"] for n in nodes)
sc = Counter(n.get("status") for n in nodes)
ec = Counter(e["kind"] for e in edges)
st = Counter(e.get("review_status") for e in edges)
rep = ["nodes=%d edges=%d" % (len(nodes), len(edges)),
       "node kinds: " + ", ".join("%s=%d" % x for x in sorted(kc.items())),
       "node status: " + ", ".join("%s=%d" % x for x in sorted(sc.items())),
       "edge kinds: " + ", ".join("%s=%d" % x for x in sorted(ec.items())),
       "edge review: " + ", ".join("%s=%d" % x for x in sorted(st.items())),
       "volumes=%d chapters=%d sections=%d kp=%d" % (len(vols), kc["chapter"], kc["section"], kc["knowledge_point"]),
       "prerequisite: 人工 %d 条（拒 %d），规则 %d 条" % (pre_ok, len(pre_bad),
            sum(1 for e in edges if e["kind"] == "prerequisite" and e["review_status"] == "ai_draft"
                and e["confidence"] == "inferred")),
       "prerequisite 知识点级: %d 条（拒 %d）" % (kpre_ok, len(kpre_bad)),
       "prerequisite 环: %d %s" % (len(cycles), cycles[0] if cycles else ""),
       "detail 富化: %d 条（拒 %d）" % (det_ok, len(det_bad)),
       "skill: %d 条 / applies_to 边 %d 条（拒 %d）" % (sk_ok, sk_edge, len(sk_bad)),
       "关系表: 本步只做自检，权威见 content/relations/edges.jsonl（tools/edges_build.py）",
       "misconception: %d 条 / misconception_of 边 %d 条（拒 %d），双向不一致 %d 处"
       % (mc_ok, mc_edge, len(mc_bad), len(mirror_bad))]
open(os.path.join(OUT, "report.txt"), "w", encoding="utf-8").write("\n".join(rep))
print("\n".join(rep))