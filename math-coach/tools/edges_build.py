# -*- coding: utf-8 -*-
"""从六册教材目录 + 知识点 + 方法 + 误区 + 思想派生统一关系表 content/relations/edges.jsonl。

事实校正（2026-10-27 实测）：knowledge_points/<vol>.json 里 sections[].knowledge_points
存的是**知识点标题字符串**，不是 uid；真正的 uid 只存在于 <vol>.detail.jsonl。
因此知识点端点一律取自 detail.uid，并按 uid 的 "K<vol>-<节>-<序号>" 结构解析归属节。
"""
import json, os, glob, collections

REPO = os.environ.get("MC_REPO", r"D:\个人\知识图谱\math-coach")
C = os.path.join(REPO, "content")
OUT = os.path.join(C, "relations", "edges.jsonl")
VOLS = ["701", "702", "801", "802", "901", "902"]


def jl(p):
    if not os.path.exists(p):
        return []
    return [json.loads(l) for l in open(p, encoding="utf-8") if l.strip()]


def jd(p):
    return json.load(open(p, encoding="utf-8"))


def page_ev(vol, no, title, page):
    return {"type": "textbook_page", "ref": "content/framework/volumes/%s.json" % vol,
            "quote": "%s %s 第%s页" % (no, title, page)}


def rule_ev(rule_id, why):
    return {"type": "teacher_note", "ref": "rule:" + rule_id, "quote": why}


def file_ev(path, why):
    return {"type": "teacher_note", "ref": path, "quote": why or ""}


edges = []
seen = {}


def add(src, dst, relation, strength, confidence, evidence, rule_note=None):
    key = (src, dst, relation)
    if isinstance(evidence, dict):
        evidence = [evidence]
    if key in seen:
        old = seen[key]
        rank = {"hard": 3, "support": 2, "optional": 1}
        cconf = {"exact": 4, "manual": 3, "inferred": 2, "weak": 1}
        if (rank[strength], cconf[confidence]) > (rank[old["strength"]], cconf[old["confidence"]]):
            old.update(strength=strength, confidence=confidence, evidence=evidence)
        return False
    e = {"uid": None, "src": src, "dst": dst, "relation": relation,
         "strength": strength, "evidence": evidence, "confidence": confidence,
         "review": {"status": "ai_draft", "reviewer": None, "at": None}}
    if rule_note:
        e["ext"] = {"x-rule": rule_note}
    edges.append(e)
    seen[key] = e
    return True


def kp_grade_sec_ch(uid):
    grade = uid[1:4]
    sec = uid.split("-")[1]
    return grade, sec, sec.split(".")[0]


# ---------- 载入目录（页码） ----------
sec_meta, chap_meta, vol_order = {}, {}, []
for v in VOLS:
    vd = jd(os.path.join(C, "framework", "volumes", v + ".json"))
    chs = []
    for ch in vd["chapters"]:
        cno = ch["no"]
        chs.append(cno)
        chap_meta[(v, cno)] = {"title": ch["title"], "page": ch.get("page"),
                               "sections": [s["no"] for s in ch.get("sections") or []]}
        for s in ch.get("sections") or []:
            sec_meta[(v, s["no"])] = {"title": s["title"], "page": s.get("page"), "chapter": cno}
    vol_order.append((v, chs))

# ---------- 载入知识点（uid 从 detail 取） ----------
details, kp_section, kp_order_in_sec = {}, {}, collections.defaultdict(list)
toc_titles = collections.defaultdict(list)
for v in VOLS:
    kd = jd(os.path.join(C, "framework", "knowledge_points", v + ".json"))
    for ch in kd.get("chapters") or []:
        for sec in ch.get("sections") or []:
            toc_titles[(v, sec["no"])] = list(sec.get("knowledge_points") or [])
    for d in jl(os.path.join(C, "framework", "knowledge_points", v + ".detail.jsonl")):
        details[d["uid"]] = d
        grade, sec, ch = kp_grade_sec_ch(d["uid"])
        kp_section[d["uid"]] = (grade, sec)
        kp_order_in_sec[(grade, sec)].append(d["uid"])

mismatch = []
for key, titles in toc_titles.items():
    got = kp_order_in_sec.get(key, [])
    if len(got) != len(titles):
        mismatch.append((key, len(titles), len(got)))
for key in kp_order_in_sec:
    for i, uid in enumerate(sorted(kp_order_in_sec[key])):
        kp_order_in_sec[key][i] = uid
    kp_order_in_sec[key] = sorted(kp_order_in_sec[key])

skills = []
for f in sorted(glob.glob(os.path.join(C, "skills", "*", "*.jsonl"))):
    skills += jl(f)
mcs = []
for f in sorted(glob.glob(os.path.join(C, "misconceptions", "*", "*.jsonl"))):
    mcs += jl(f)
thoughts = jl(os.path.join(C, "thoughts.jsonl"))

print("vols=%d kp=%d detail=%d skill=%d mc=%d thought=%d toc_mismatch=%d"
      % (len(sec_meta), len(details), len(details), len(skills), len(mcs), len(thoughts), len(mismatch)))
for m in mismatch[:5]:
    print("  TOC_MISMATCH", m)

# ---------- 1. is_part_of ----------
n = 0
for uid, (v, sec) in kp_section.items():
    sm = sec_meta.get((v, sec))
    if not sm:
        print("  !! 节不存在", uid, v, sec)
        continue
    n += add(uid, "S%s-%s" % (v, sec), "is_part_of", "hard", "exact",
             page_ev(v, sec, sm["title"], sm["page"]), "kp_in_section_from_detail_uid")
for (v, sec), sm in sec_meta.items():
    n += add("S%s-%s" % (v, sec), "C%s-%02d" % (v, sm["chapter"]), "is_part_of", "hard", "exact",
             page_ev(v, sec, sm["title"], sm["page"]), "section_in_chapter_from_textbook_toc")
for (v, cno), cm in chap_meta.items():
    n += add("C%s-%02d" % (v, cno), "V%s" % v, "is_part_of", "hard", "exact",
             page_ev(v, str(cno), cm["title"], cm["page"]), "chapter_in_volume_from_textbook_toc")
print("is_part_of:", n)

# ---------- 2. sequence ----------
n = 0
for v, chs in vol_order:
    for cno in chs:
        secs = chap_meta[(v, cno)]["sections"]
        for a, b in zip(secs, secs[1:]):
            n += add("S%s-%s" % (v, a), "S%s-%s" % (v, b), "sequence", "hard", "exact",
                     {"type": "textbook_page", "ref": "content/framework/volumes/%s.json" % v,
                      "quote": "%s 第%s页 → %s 第%s页" % (a, sec_meta[(v, a)]["page"], b, sec_meta[(v, b)]["page"])},
                     "consecutive_sections_in_chapter")
    for a, b in zip(chs, chs[1:]):
        n += add("C%s-%02d" % (v, a), "C%s-%02d" % (v, b), "sequence", "hard", "exact",
                 page_ev(v, str(b), chap_meta[(v, b)]["title"], chap_meta[(v, b)]["page"]),
                 "consecutive_chapters_in_volume")
print("sequence:", n)

# ---------- 3. prerequisite_of ----------
# kp_pre 收集所有点级先修（人工 + 同节顺序），供 3b 使用。
# kp_pre_manual 只收人工判定的点级先修（节级 + 知识点级），3c 段反推方法先后时**只准用它**。
# 理由（2026-10-28 抽检）：用 skill_dep_by_kp2 反推了 821 条方法前置，随机抽 40 条只有 20 条站得住（50.0%），
# 错的 13 条里 10 条是「同册内并列方法被当成先后」（求根公式→因式分解、画解集↔读解集、判别式→因式分解），
# 病根就是拿「同节教材顺序」当依赖再往上推一次：教材顺序不等于实际依赖。
kp_pre = set()
kp_pre_manual = set()
n_manual = 0
for e in jd(os.path.join(C, "framework", "prerequisites.json")).get("edges") or []:
    n_manual += add(e["from"], e["to"], "prerequisite_of", "hard", "manual",
                    file_ev("content/framework/prerequisites.json", e.get("why")), "manual_section_prerequisite")
    kp_pre.add((e["from"], e["to"]))
    kp_pre_manual.add((e["from"], e["to"]))
for e in jd(os.path.join(C, "framework", "kp_prerequisites.json")).get("edges") or []:
    n_manual += add(e["from"], e["to"], "prerequisite_of", "hard", "manual",
                    file_ev("content/framework/kp_prerequisites.json", e.get("why")), "manual_kp_prerequisite")
    kp_pre.add((e["from"], e["to"]))
    kp_pre_manual.add((e["from"], e["to"]))
n_rule = 0
for key, ks in kp_order_in_sec.items():
    for a, b in zip(ks, ks[1:]):
        n_rule += add(a, b, "prerequisite_of", "support", "inferred",
                      rule_ev("kp_in_section_order",
                              "同一节内按教材叙述顺序，前一个知识点是后一个的直接前提（规则边，待教研复核）"),
                      "kp_in_section_order")
        kp_pre.add((a, b))
print("prerequisite_of: manual=%d rule=%d" % (n_manual, n_rule))

# ---------- 3b. prerequisite_of（方法之间，推断） ----------
# 依据（2026-10-27 实测）：801 的方法 kp_refs 把「应用点」与「依赖点」混在一张表里——125 条方法里
# 44 条带跨节挂点，且语义多为真依赖（分式的乘法依赖约分、异分母加减依赖通分）。因此把「节位置
# 严格早于本节」的挂点视作依赖点，依赖点上已挂着的其它方法即为前置方法。这是**推断不是教研判定**：
# strength=support、confidence=inferred、ext.x-rule=skill_dep_by_kp，待人工复核后转 manual。
# 不自造教材顺序：方法的前后置在教材里没有原文，只能这样从挂点反推，故不能标 hard。
skill_name = {s["uid"]: s["name"] for s in skills}


def _sec_pos(v, sec):
    c = int(str(sec).split(".")[0])
    secs = chap_meta.get((v, c), {}).get("sections") or []
    sec = str(sec)
    try:
        idx = secs.index(sec)
    except ValueError:
        idx = 0
    return (int(v), int(c), idx)


skill_pos = {}
for s in skills:
    b = s["uid"].split("-")            # SK-801-12.1-01
    if len(b) >= 4:
        skill_pos[s["uid"]] = _sec_pos(b[1], b[2])

kp_skills = collections.defaultdict(list)
for s in skills:
    for k in s.get("kp_refs") or []:
        if k in details:
            kp_skills[k].append(s["uid"])

n_skdep = 0
for s in skills:
    a = s["uid"]
    if a not in skill_pos:
        continue
    here = skill_pos[a]
    deps = {}
    for k in s.get("kp_refs") or []:
        if k not in kp_section:
            continue
        kv, ksec = kp_section[k]
        if _sec_pos(kv, ksec) >= here:
            continue
        cand = kp_skills.get(k, [])
        # 依赖点上挂着太多方法说明这个点太泛（如「三角形的定义」挂了 6 个方法），
        # 无法从它定位具体前置，跳过；只保留「专属点」——上面挂 1~2 个方法。
        if len(cand) > 2:
            continue
        for b in cand:
            if b == a or b not in skill_pos or skill_pos[b] >= here:
                continue
            deps.setdefault(b, []).append(k)
    if not deps:
        continue
    ranked = sorted(deps.items(), key=lambda kv2: (-len(kv2[1]), skill_pos[kv2[0]]))
    for b, ks in ranked[:3]:
        n_skdep += add(b, a, "prerequisite_of", "support", "inferred",
                       rule_ev("skill_dep_by_kp",
                               "%s 的挂点 %s 早于本节，这些点上已挂着 %s（由方法挂点推断的前置，待教研确认）"
                               % (skill_name[a], "、".join(ks), skill_name[b])),
                       "skill_dep_by_kp")
print("prerequisite_of(skill):", n_skdep)

# ---------- 3c. prerequisite_of（方法之间，逐条起草） ----------
# 历史：这里曾经是「点级先修一跳反推」（规则 skill_dep_by_kp2），产出 821 条。2026-10-28 抽检 40 条
# 只有 20 条站得住（50.0%）；收紧成只认人工点级边后重抽 40 条只剩 11 条（27.5%），更差。
# 病根：点级先修说的是「能不能学这个点」，方法级问的是「先练哪条做法」；一个点上常挂着好几条做法，
# 反推出来的多半是同册内并列方法被写成先后（求根公式→因式分解、画解集↔读解集）。整段规则删掉，
# 改成读人工起草的 content/framework/skill_prerequisites.json（review_status=ai_draft，抽检需另做）。
sk_adj = collections.defaultdict(set)
for e0 in edges:
    if e0["relation"] == "prerequisite_of" and e0["src"].startswith("SK-") and e0["dst"].startswith("SK-"):
        sk_adj[e0["src"]].add(e0["dst"])


def sk_reach(s0, t0):
    st, seen2 = [s0], set()
    while st:
        u = st.pop()
        if u == t0:
            return True
        if u in seen2:
            continue
        seen2.add(u)
        st.extend(sk_adj[u])
    return False


n_skdep3 = 0
n_cycle3 = 0
sp_path = os.path.join(C, "framework", "skill_prerequisites.json")
sp_edges = (jd(sp_path).get("edges") or []) if os.path.isfile(sp_path) else []
for e in sp_edges:
    if sk_reach(e["to"], e["from"]):
        n_cycle3 += 1
        continue
    if add(e["from"], e["to"], "prerequisite_of", "support", "inferred",
           file_ev("content/framework/skill_prerequisites.json", e.get("why")), "skill_prerequisite_draft"):
        sk_adj[e["from"]].add(e["to"])
        n_skdep3 += 1
print("prerequisite_of(skill, drafted %d):" % len(sp_edges), n_skdep3, "(skip cycle:", n_cycle3, ")")


# ---------- 4/5. applies_to + uses_skill ----------
n = 0
skill_file = {}
for f in sorted(glob.glob(os.path.join(C, "skills", "*", "*.jsonl"))):
    for r in jl(f):
        skill_file[r["uid"]] = f.replace(REPO + os.sep, "").replace(REPO + "/", "").replace("\\", "/")
for s in skills:
    for k in s.get("kp_refs") or []:
        if k not in details:
            print("  !! skill %s 的 kp_ref 不存在 %s" % (s["uid"], k))
            continue
        n += add(s["uid"], k, "applies_to", "hard", "inferred",
                 file_ev(skill_file[s["uid"]], s["name"]), "skill_kp_refs")
        n += add(k, s["uid"], "uses_skill", "hard", "inferred",
                 file_ev(skill_file[s["uid"]], s["name"]), "skill_kp_refs_mirror")
print("applies_to+uses_skill:", n)

# ---------- 6. belongs_to ----------
n = 0
tmap = {t["uid"]: t for t in thoughts}
for t in thoughts:
    if t["level"] == "family" and t.get("parent"):
        n += add(t["uid"], t["parent"], "belongs_to", "hard", "manual",
                 file_ev("content/thoughts.jsonl", t["name"] + " 属 " + tmap[t["parent"]]["name"]),
                 "thought_family_parent")
# 方法 → 思想（thought_refs）：这是「点思想 → 它运用该思想学了哪些知识点」那条链的上游
for s in skills:
    for t in s.get("thought_refs") or []:
        if t not in tmap:
            print("  !! skill %s 的 thought_ref 不存在 %s" % (s["uid"], t))
            continue
        n += add(s["uid"], t, "belongs_to", "support", "inferred",
                 file_ev(skill_file[s["uid"]], s["name"] + " 用到 " + tmap[t]["name"]),
                 "skill_thought_refs")
print("belongs_to:", n)

# ---------- 6.5 supports（思想 → 核心素养） ----------
# 素养层目前只有实体、没有边：六个核心素养挂在哪里，之前一处都没有。
# 这里只承认一条有依据的链——「思想训练支撑素养发展」（2022 版课标的素养表述就是这个方向），
# confidence=manual 表示这是人写死的映射表（content/thoughts.jsonl 的 competencies 字段），不是推的。
n = 0
cps = {r["uid"]: r for r in (jd(os.path.join(C, "registry", "competencies.json")).get("items") or [])}
for t in thoughts:
    for cp in t.get("competencies") or []:
        if cp not in cps:
            print("  !! thought %s 的 competency 不存在 %s" % (t["uid"], cp))
            continue
        n += add(t["uid"], cp, "supports", "support", "manual",
                 file_ev("content/thoughts.jsonl", t["name"] + " 的练习支撑 " + cps[cp]["name"]),
                 "thought_competency")
print("supports:", n)

# ---------- 7. misconception_of ----------
n = 0
mc_file = {}
for f in sorted(glob.glob(os.path.join(C, "misconceptions", "*", "*.jsonl"))):
    for r in jl(f):
        mc_file[r["uid"]] = f.replace(REPO + os.sep, "").replace("\\", "/")
for m in mcs:
    for k in m.get("kp_refs") or []:
        if k not in details:
            continue
        n += add(m["uid"], k, "misconception_of", "hard", "inferred",
                 file_ev(mc_file[m["uid"]], (m.get("signal") or [""])[0]), "misconception_kp_refs")
print("misconception_of:", n)

# ---------- 8. assessed_by（知识点 → 课标条目） ----------
# 依据 content/curriculum/kp_standards.json 的节级人工映射：一个知识点继承它所在节的课标要求，
# strength=support（课标说「要求学到什么」，不等于「必须先会什么」），confidence=manual（人读条目标注）。
n = 0
std_path = os.path.join(C, "curriculum", "standards.jsonl")
ksp_path = os.path.join(C, "curriculum", "kp_standards.json")
if os.path.exists(std_path) and os.path.exists(ksp_path):
    stds = {r["uid"]: r for r in jl(std_path)}
    ksp = jd(ksp_path)
    sec_map = ksp.get("sections") or {}
    kp_map = ksp.get("kp") or {}

    def std_ev(sid, why):
        s = stds[sid]
        return {"type": "curriculum_ref", "ref": "content/curriculum/standards.jsonl#" + sid,
                "quote": (s["code"] + " " + s["text"])[:120] + ("（" + why + "）" if why else "")}

    done = set()
    for kpuid, (v, sec) in kp_section.items():
        sid_list = []
        rec = kp_map.get(kpuid)
        if rec is not None:
            sid_list = rec.get("standards") or []
        else:
            srec = sec_map.get("S%s-%s" % (v, sec))
            if srec:
                sid_list = srec.get("standards") or []
        for sid in sid_list:
            if sid not in stds:
                print("  !! kp_standards 里的课标 uid 不存在", kpuid, sid)
                continue
            why = ""
            for line in (sec_map.get("S%s-%s" % (v, sec)) or {}).get("why") or []:
                if line.startswith(sid.replace("CS-", "")):
                    why = line.split("：", 1)[-1]
            n += add(kpuid, sid, "assessed_by", "support", "manual", std_ev(sid, why), "kp_standards_section_map")
            done.add(sid)
    print("assessed_by:", n, "；被引用的课标条目 %d 条" % len(done))
    unmapped_sec = [k for k, v2 in sec_map.items() if not (v2.get("standards") or [])]
    if unmapped_sec:
        print("  课标未覆盖的节 %d 个：%s" % (len(unmapped_sec), ", ".join(sorted(unmapped_sec))))
else:
    print("assessed_by: 0（缺少 standards.jsonl 或 kp_standards.json）")

# ---------- 9. equivalent_to / contrast_with（知识点横向关联） ----------
# 依据 content/framework/analogies.json 的人工清单。先修边回答「能不能学」，这两条回答
# 「学的时候能挂到谁身上」：equivalent_to 是同一结构换对象（可迁移），contrast_with 是
# 长得像但不是一回事（错误高发处）。两者语义对称，direction=symmetric，前端按双向查。
n_eq = n_ct = 0
an_path = os.path.join(C, "framework", "analogies.json")
if os.path.exists(an_path):
    an = jd(an_path)
    for it in an.get("items") or []:
        aid = it.get("uid") or ""
        a, b = it.get("a"), it.get("b")
        rel = {"equivalent": "equivalent_to", "contrast": "contrast_with"}.get(it.get("kind"))
        if not rel:
            print("  !! analogies kind 非法", aid, it.get("kind"))
            continue
        bad = [x for x in (a, b) if x not in details]
        if bad:
            print("  !! analogies 端点不存在", aid, bad)
            continue
        ev = {"type": "teacher_note",
              "ref": "content/framework/analogies.json#" + aid,
              "quote": it.get("why") or ""}
        if add(a, b, rel, "support", "manual", ev, "analogies_" + it.get("kind")):
            edges[-1]["direction"] = "symmetric"
            if rel == "equivalent_to":
                n_eq += 1
            else:
                n_ct += 1
    print("equivalent_to:", n_eq, "；contrast_with:", n_ct, "（analogies %d 条）" % len(an.get("items") or []))
else:
    print("equivalent_to / contrast_with: 0（缺少 analogies.json）")

# ---------- 写盘 ----------
os.makedirs(os.path.dirname(OUT), exist_ok=True)
abbr = {"is_part_of": "PART", "sequence": "SEQ", "prerequisite_of": "PRE", "applies_to": "APP",
        "uses_skill": "USE", "belongs_to": "BEL", "misconception_of": "MIS", "assessed_by": "ASD",
        "equivalent_to": "EQV", "contrast_with": "CON", "supports": "SUP"}
cnt = collections.Counter()
for e in sorted(edges, key=lambda x: (x["relation"], x["src"], x["dst"])):
    cnt[e["relation"]] += 1
    e["uid"] = "ED-%s-%04d" % (abbr[e["relation"]], cnt[e["relation"]])
with open(OUT, "w", encoding="utf-8", newline="\n") as f:
    for e in edges:
        f.write(json.dumps(e, ensure_ascii=False, sort_keys=True) + "\n")

print("--- total:", len(edges), "bytes:", os.path.getsize(OUT))
for r, c in cnt.most_common():
    print("   ", r, c)
