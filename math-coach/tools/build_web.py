#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""把权威层（content/ + build/）切成前端可用的数据片。

设计约束（决定了整个前端形态）：
- file:// 直接双击打开也要能用，所以**不能用 ES module、不能用 fetch**：
  Chrome 会把 file:// 下的 fetch/import 当作跨域拒绝。
- 因此数据片的形态是普通脚本：window.MC.put("<key>", <json>)，
  视图按需往 <head> 里插 <script src="data/..."> 等 onload 后取数据。
- 界面代码（runtime/web/js/**）与数据（runtime/web/data/**）完全分离：
  改一道题的答案只重建数据片，js 一个字节都不动。

产物：
  runtime/web/data/catalog.js          六册目录 + 计数 + 覆盖度（首屏唯一必需）
  runtime/web/data/graph.js            图谱节点/边
  runtime/web/data/qkp.js              题 → 主挂点（按知识点汇总作答记录用）
  runtime/web/data/sec/<vol>-<no>.js        节元数据 + 知识点 + 方法 + 错因
  runtime/web/data/sec/<vol>-<no>.items.js  该节全部题目（练习时才加载）
  runtime/web/data/sec/<vol>-<no>.ex.js     例题精选（带完整解析）
"""
import argparse
import glob
import json
import os
import re
import shutil

REPO = os.environ.get("MC_REPO", "D:/个人/知识图谱/math-coach")
CONTENT = os.path.join(REPO, "content")
BUILD = os.path.join(REPO, "build")
WEB = os.path.join(REPO, "runtime", "web")
DATA = os.path.join(WEB, "data")
SEC_DIR = os.path.join(DATA, "sec")

BAND_ORDER = ["basic", "standard", "advanced", "challenge", "competition"]
GEN = "tools/build_web.py"


def read_json(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def read_jsonl(p):
    out = []
    if not os.path.exists(p):
        return out
    with open(p, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out


def emit_question_types():
    """Publish the question-type catalog for the section page and knowledge page.

    The file is ai_draft reference data. Missing input is skipped so an older
    tree can still build the rest of the slices.
    """
    src = os.path.join(CONTENT, "framework", "question_types.json")
    if not os.path.isfile(src):
        print("qtypes.js       skipped (no question_types.json)")
        return 0
    with open(src, encoding="utf-8") as f:
        doc = json.load(f)
    return dump_js(os.path.join(DATA, "qtypes.js"), "qtypes", doc)


def emit_figures():
    """Publish redrawn geometry figures. Each item is a mark list, not a page scan."""
    src = os.path.join(CONTENT, "framework", "figures.json")
    if not os.path.isfile(src):
        print("figures.js      skipped (no figures.json)")
        return 0
    with open(src, encoding="utf-8") as f:
        doc = json.load(f)
    return dump_js(os.path.join(DATA, "figures.js"), "figures", doc)


def dump_js(path, key, obj):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    payload = json.dumps(obj, ensure_ascii=False, separators=(",", ":"))
    # </script 出现在字符串里会提前闭合宿主标签
    payload = payload.replace("</", "<\\/")
    with open(path, "w", encoding="utf-8", newline="\n") as f:
        f.write("/* 自动生成，勿手改 —— %s */\n" % GEN)
        f.write('window.MC.put(%s,%s);\n' % (json.dumps(key), payload))
    return len(payload)


def load_specs(vol):
    """结构化答案（answer_spec）：content/questions/<册>/*.spec.jsonl，一个 id 一行。
    只留判题要用的键，note/confidence 不进切片（省体积）。"""
    out = {}
    for p in sorted(glob.glob(os.path.join(REPO, "content", "questions", vol, "*.spec.jsonl"))):
        for ln in read_jsonl(p):
            if not isinstance(ln, dict) or not ln.get("id"):
                continue
            keep = {k: ln.get(k) for k in ("type", "values", "order_policy", "var", "unit",
                                           "low", "high", "low_closed", "high_closed")}
            if any(v is not None for v in keep.values()):
                out[ln["id"]] = keep
    return out


def load_volumes():
    vols = []
    vdir = os.path.join(CONTENT, "framework", "volumes")
    for name in sorted(os.listdir(vdir)):
        if not name.endswith(".json"):
            continue
        vols.append(read_json(os.path.join(vdir, name)))
    return vols


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--vol", default="801", help="题目切片取哪一册（默认 801）")
    ap.add_argument("--chapter", default="12", help="题目切片取哪一章（默认 12）")
    args = ap.parse_args()

    nodes = read_jsonl(os.path.join(BUILD, "framework", "nodes.jsonl"))
    # 边的唯一权威是统一关系表（tools/edges_build.py 产出，tools/relations_check.py 校验）
    edges = read_jsonl(os.path.join(CONTENT, "relations", "edges.jsonl"))
    thoughts = read_jsonl(os.path.join(CONTENT, "thoughts.jsonl"))
    # 六个核心素养（L2）。它们不进任何视角，图上是孤立节点，只靠 supports 边给详情用
    competencies = (json.load(open(os.path.join(CONTENT, "registry", "competencies.json"), encoding="utf-8"))
                    .get("items") or [])
    kps = {n["id"]: n for n in nodes if n["kind"] == "knowledge_point"}
    skills = {n["id"]: n for n in nodes if n["kind"] == "skill"}
    mcs = {n["id"]: n for n in nodes if n["kind"] == "misconception"}
    # 六册的 detail 全并进来。原来只读 --vol 那一册，结果其他册的知识点在界面上
    # 没有定义、没有边界、没有页码（spec §5 第 1/6 段的空态本来是给「真没写」用的，
    # 不该用来掩盖「读漏了另一册」）。
    details = {}
    for dp in sorted(glob.glob(os.path.join(CONTENT, "framework", "knowledge_points", "*.detail.jsonl"))):
        for d in read_jsonl(dp):
            details[d["uid"]] = d
    # 课标条目（2022 版第四学段为主）与「知识点 → 课标要求」边，来自 tools/standards_import.py 与 edges_build.py
    standards = {r["uid"]: r for r in read_jsonl(
        os.path.join(CONTENT, "curriculum", "standards.jsonl"))}
    kp_std = {}
    for e in edges:
        if e["relation"] == "assessed_by" and e["dst"] in standards:
            kp_std.setdefault(e["src"], []).append(e["dst"])
    # 素养「认定层」：知识点 → 课标条目 → 条目按领域与动词初判出的素养。
    # 它比「方法 → 思想 → 素养」那条两跳链短一条，依据是课标原文（条目 code 可回指），
    # 但仍是初判（tools/competency_tag.py，rule:domain+verb），不是教研逐条认定。
    kp_cpstd = {}
    for kid, sids in kp_std.items():
        seen = []
        for sid in sids:
            for cp in standards[sid].get("competencies") or []:
                if cp not in seen:
                    seen.append(cp)
        if seen:
            kp_cpstd[kid] = sorted(seen)
    # 横向关联：equivalent_to（可以类比）/ contrast_with（容易混淆）。这两类边语义对称，
    # edges.jsonl 里只存一条，这里双向展开，两端详情都能看到对方。
    kp_lat = {}
    for e in edges:
        if e["relation"] not in ("equivalent_to", "contrast_with"):
            continue
        _why = ""
        for _x in e.get("evidence") or []:
            if _x.get("quote"):
                _why = _x["quote"]
                break
        kp_lat.setdefault(e["src"], []).append({"uid": e["dst"], "kind": e["relation"], "why": _why})
        kp_lat.setdefault(e["dst"], []).append({"uid": e["src"], "kind": e["relation"], "why": _why})
    # 直接先修 / 直接后续 / 挂到这个点的做法。练习的四行卡要用这三样，
    # 预先算进切片，前端就不必为了一道题再去取整张图。
    kp_pre, kp_next, kp_skill = {}, {}, {}
    for e in edges:
        if e["relation"] == "prerequisite_of" and e["src"] in kps and e["dst"] in kps:
            kp_pre.setdefault(e["dst"], []).append(e["src"])
            kp_next.setdefault(e["src"], []).append(e["dst"])
        elif e["relation"] == "applies_to" and e["dst"] in kps and e["src"] in skills:
            kp_skill.setdefault(e["dst"], []).append(e["src"])

    def _m1(kid):
        """该点的第一条方法（按 uid 排序），带一句描述与一条边界。没有就 None。"""
        us = sorted(set(kp_skill.get(kid, [])))
        if not us:
            return None
        u = us[0]
        sk = skills[u]
        bd = sk.get("boundaries") or []
        return {"uid": u, "name": sk.get("title"), "desc": sk.get("desc"),
                "b": bd[0] if bd else None}
    # 明确「教材有、课标条目无」的节：把原因带到切片里，前端原样标注，不留空白让人以为是漏配
    _ksp_path = os.path.join(CONTENT, "curriculum", "kp_standards.json")
    _ksp = read_json(_ksp_path) if os.path.exists(_ksp_path) else {}
    _gap_secs = []
    for _sid, _rec in (_ksp.get("sections") or {}).items():
        if _rec.get("standards"):
            continue
        _gap_secs.append((_sid[1:].split("-", 1) + [_rec.get("unmapped_reason") or "课标条目层无对应"]))

    # 题库：扫 content/questions/<册>/*.jsonl（目前只有 801 第 12 章，将来加册加章不用改代码）
    questions = []
    qroot = os.path.join(CONTENT, "questions")
    for vol_name in sorted(os.listdir(qroot)):
        vdir = os.path.join(qroot, vol_name)
        if not os.path.isdir(vdir):
            continue
        for fn in sorted(os.listdir(vdir)):
            # 只认题本体：*.answer.jsonl / *.spec.jsonl / *.kp.jsonl 是同一题的侧挂文件，
            # 混进来会多算题量，也会让 q["id"] 取不到
            if not fn.endswith(".jsonl") or fn.count(".") > 1:
                continue
            for q in read_jsonl(os.path.join(vdir, fn)):
                q["_vol"] = q.get("volume_id") or vol_name
                questions.append(q)
    rubric = {}
    rroot = os.path.join(CONTENT, "rubric")
    for vol_name in sorted(os.listdir(rroot)) if os.path.isdir(rroot) else []:
        vdir = os.path.join(rroot, vol_name)
        if not os.path.isdir(vdir):
            continue
        for fn in sorted(os.listdir(vdir)):
            if fn.endswith(".jsonl"):
                for r in read_jsonl(os.path.join(vdir, fn)):
                    rubric.setdefault(r["qid"], []).append(r)
    jp = read_json(os.path.join(BUILD, "questions", "judge_prep.json"))
    specs = {}
    for vol_name in sorted(os.listdir(qroot)):
        if os.path.isdir(os.path.join(qroot, vol_name)):
            specs.update(load_specs(vol_name))
    # 题→知识点映射：content/questions/<册>/*.kp.jsonl（只收高置信 auto 档，见 questions_kp_map.py）
    q_kp = {}
    for p in sorted(glob.glob(os.path.join(CONTENT, "questions", "*", "*.kp.jsonl"))):
        for r in read_jsonl(p):
            q_kp[r["uid"]] = r
    q_by_id = {q.get("id"): q for q in questions if q.get("id")}
    q_for_kp = {}
    for qid, row in q_kp.items():
        for tag in row.get("kp_tags") or []:
            uid = tag.get("kp_uid")
            if uid and qid in q_by_id:
                q_for_kp.setdefault(uid, []).append(qid)

    # ---- 题目按节归组；sec_title 一律取教材目录，不用题库自带的旧标题 ----
    vols = load_volumes()
    auth_sec = {}
    for v in vols:
        for ch in v["chapters"]:
            for s in ch["sections"]:
                auth_sec[(v["volume_id"], s["no"])] = s["title"]

    by_sec = {}
    for q in questions:
        sec = q.get("section_no")
        if not sec:
            # 跨节题挂到「章末综合」，key 带章号，避免多章互相覆盖
            sec = "ch-end-%s" % (q.get("chapter_no") or "00")
        by_sec.setdefault((q["_vol"], sec), []).append(q)

    # ---- catalog：六册 -> 章 -> 节，附带该节的知识点数与题量 ----
    kp_by_sec, sk_by_sec, mc_by_sec = {}, {}, {}
    for k in kps.values():
        kp_by_sec.setdefault((k["volume_id"], k["section_no"]), []).append(k["id"])
    for s in skills.values():
        sk_by_sec.setdefault((s["volume_id"], s["section_no"]), []).append(s["id"])
    for m in mcs.values():
        mc_by_sec.setdefault((m["volume_id"], m["section_no"]), []).append(m["id"])

    # 题目用途：content/questions/<vol>/ch<章>.meta.jsonl，按 uid 索引
    # 题 → 方法：有 kp 映射的题（content/questions/<vol>/ch*.kp.jsonl）经它挂的点找到方法。
    # 没有映射的题不猜：宁可这一栏空着，也不把「可能用到」写成「用过」。
    q_meta = {}
    for (_v, _no), _qs in by_sec.items():
        for _q in _qs:
            q_meta[_q["id"]] = {"id": _q["id"], "vol": _v, "no": _no,
                                "band": _q.get("band") or "basic"}
    skill_q = {}
    for _p in sorted(glob.glob(os.path.join(CONTENT, "questions", "*", "ch*.kp.jsonl"))):
        for _row in read_jsonl(_p):
            _m = q_meta.get(_row.get("uid"))
            if not _m:
                continue
            for _t in _row.get("kp_tags") or []:
                if _t.get("role") and _t.get("role") != "primary":
                    continue
                for _su in sorted(set(kp_skill.get(_t.get("kp_uid"), []))):
                    skill_q.setdefault(_su, []).append(_m)
    for _su in list(skill_q):
        _seen, _uniq = set(), []
        for _m in sorted(skill_q[_su], key=lambda x: (x["no"], x["id"])):
            if _m["id"] in _seen:
                continue
            _seen.add(_m["id"])
            _uniq.append(_m)
        skill_q[_su] = _uniq


    q_purpose = {}
    for _vol in sorted(os.listdir(os.path.join(CONTENT, "questions"))):
        _d = os.path.join(CONTENT, "questions", _vol)
        if not os.path.isdir(_d):
            continue
        for _fn in sorted(os.listdir(_d)):
            if _fn.endswith(".meta.jsonl"):
                for _r in read_jsonl(os.path.join(_d, _fn)):
                    q_purpose[_r["uid"]] = {"p": _r["purpose"], "why": _r.get("why") or ""}

    # 选择题选项：content/questions/<vol>/ch<章>.options.jsonl（tools/question_options_extract.py 抽的侧挂）
    # parsed = 题干里真抽到了 A–D 四项，练习页渲染点选卡片；missing = 抽不出，继续用文本框
    q_opt = {}
    for _vol in sorted(os.listdir(os.path.join(CONTENT, "questions"))):
        _d = os.path.join(CONTENT, "questions", _vol)
        if not os.path.isdir(_d):
            continue
        for _fn in sorted(os.listdir(_d)):
            if _fn.endswith(".options.jsonl"):
                for _r in read_jsonl(os.path.join(_d, _fn)):
                    if _r.get("status") == "parsed":
                        q_opt[_r["id"]] = _r

    # 明确「教材有、课标条目无」的节：原因透到切片，前端原样标注，不留空白让人以为是漏配
    kp_std_gap = {}
    for _vid, _sno, _why in _gap_secs:
        for _k in (kp_by_sec.get((_vid, _sno)) or []):
            kp_std_gap[_k] = _why

    catalog = {"schema_version": 1, "generated_by": GEN, "practice_vol": args.vol,
               "practice_chapter": args.chapter, "volumes": []}
    for v in vols:
        vid = v["volume_id"]
        vol_out = {"id": vid, "label": v["label"], "grade": v.get("grade"),
                   "term": v.get("term"), "edition": v.get("edition") or {}, "chapters": []}
        for ch in v["chapters"]:
            ch_out = {"no": ch["no"], "title": ch["title"], "sections": []}
            for s in ch["sections"]:
                no = s["no"]
                qs = by_sec.get((vid, no), [])
                bands = {}
                for q in qs:
                    bands[q.get("band") or "basic"] = bands.get(q.get("band") or "basic", 0) + 1
                detail_ids = kp_by_sec.get((vid, no), [])
                has_detail = any(k in details for k in detail_ids)
                ch_out["sections"].append({
                    "no": no,
                    "title": auth_sec.get((vid, no)) or s["title"],
                    "page": s.get("page"),
                    "kp": len(detail_ids),
                    "sk": len(sk_by_sec.get((vid, no), [])),
                    "mc": len(mc_by_sec.get((vid, no), [])),
                    "q": len(qs),
                    "bands": {b: bands[b] for b in BAND_ORDER if b in bands},
                    "detail": has_detail,
                })
            # 跨节题（section_no 为空）落成章末虚拟节，界面上能进得去
            tail = by_sec.get((vid, "ch-end-%s" % ch["no"]), [])
            if tail:
                tb = {}
                for q in tail:
                    tb[q.get("band") or "basic"] = tb.get(q.get("band") or "basic", 0) + 1
                ch_out["sections"].append({
                    "no": "ch-end-%s" % ch["no"], "title": "章末综合（复习题与跨节题）", "page": None,
                    "kp": 0, "sk": 0, "mc": 0, "q": len(tail),
                    "bands": {b: tb[b] for b in BAND_ORDER if b in tb},
                    "detail": False, "mix": True,
                })
            # 章级汇总：竞品左栏「必修一 113 个知识点」那种数字要能一路下钻到章，
            # 不然左栏只能给人看节，看不见「这一章分量多少」。mix 节是章末综合，不算节数。
            ch_out["kp"] = sum((s.get("kp") or 0) for s in ch_out["sections"])
            ch_out["sk"] = sum((s.get("sk") or 0) for s in ch_out["sections"])
            ch_out["mc"] = sum((s.get("mc") or 0) for s in ch_out["sections"])
            ch_out["q"] = sum((s.get("q") or 0) for s in ch_out["sections"])
            ch_out["sec"] = len([s for s in ch_out["sections"] if not s.get("mix")])
            vol_out["chapters"].append(ch_out)
        # 册级汇总：左栏「选一本教材」每册后面那个数
        vol_out["ch"] = len(vol_out["chapters"])
        vol_out["kp"] = sum((c.get("kp") or 0) for c in vol_out["chapters"])
        vol_out["sk"] = sum((c.get("sk") or 0) for c in vol_out["chapters"])
        vol_out["mc"] = sum((c.get("mc") or 0) for c in vol_out["chapters"])
        vol_out["q"] = sum((c.get("q") or 0) for c in vol_out["chapters"])
        catalog["volumes"].append(vol_out)
    # 跨节题（section_no 为空）不进目录，单独记在练习切片里
    size_catalog = dump_js(os.path.join(DATA, "catalog.js"), "catalog", catalog)

    # 每个知识点被多少道题映射到（只数高置信 auto 档）：图上用来区分「有题 / 没题」
    kp_qn = {}
    for r in q_kp.values():
        for t in r.get("kp_tags") or []:
            kp_qn[t["kp_uid"]] = kp_qn.get(t["kp_uid"], 0) + 1

    # ---- graph：只带渲染必需字段 ----
    g_nodes = []
    for n in nodes:
        item = {"id": n["id"], "kind": n["kind"], "title": n.get("title") or "",
                "vol": n.get("volume_id"), "sec": n.get("section_no"),
                "ch": n.get("chapter_no"), "status": n.get("status")}
        if n["kind"] == "knowledge_point":
            d = details.get(n["id"])
            if d:
                item["kp_type"] = d.get("kp_type")
                item["deeper"] = True
                if d.get("tier") and d.get("tier") != "core":
                    item["tier"] = d["tier"]
            if kp_qn.get(n["id"]):
                item["qn"] = kp_qn[n["id"]]
            if kp_cpstd.get(n["id"]):
                item["cpstd"] = kp_cpstd[n["id"]]
        if n["kind"] == "skill":
            item["tier"] = n.get("tier") or "core"
        g_nodes.append(item)
    # 思想层节点（L6）：与知识/方法同图，靠 belongs_to / thought_refs 边连出去
    for t in thoughts:
        g_nodes.append({"id": t["uid"], "kind": "thought", "title": t["name"],
                        "level": t.get("level"), "parent": t.get("parent"),
                        # 思想节点跨册、没有节切片，详情只能靠这里带下去
                        "desc": t.get("desc"), "boundaries": t.get("boundaries") or []})
    # 素养节点：不参与布局（没有视角选它），只为让详情里的 supports 边能解析到名字
    for cp in competencies:
        g_nodes.append({"id": cp["uid"], "kind": "competency", "title": cp["name"],
                        "code": cp.get("code")})
    # ---- 计数：每个节点连了几条边、连着什么东西 ----
    # 竞品「方法节点旁标 2 个知识点联系」「这个点有 7 条关联」就是这一项。
    # 放 build 层一次算完，前端只读数：为了一个徽标去遍历 5000 条边，
    # 每切一次档都付一次代价，而且没法在布局里用（尺寸要按度数定）。
    def _cnt(rel, side):
        c = {}
        for e in edges:
            if e["relation"] != rel:
                continue
            k = e["src"] if side == "src" else e["dst"]
            c[k] = c.get(k, 0) + 1
        return c

    _deg = {}
    for e in edges:
        _deg[e["src"]] = _deg.get(e["src"], 0) + 1
        _deg[e["dst"]] = _deg.get(e["dst"], 0) + 1
    c_kp_sk = _cnt("applies_to", "dst")
    c_kp_mc = _cnt("misconception_of", "dst")
    c_kp_std = _cnt("assessed_by", "src")
    c_sk_kp = _cnt("applies_to", "src")
    c_sk_th = _cnt("belongs_to", "src")
    c_th_sk = _cnt("belongs_to", "dst")
    c_th_cp = _cnt("supports", "src")
    c_cp_th = _cnt("supports", "dst")
    for _it in g_nodes:
        _i, _k = _it["id"], _it["kind"]
        _it["deg"] = _deg.get(_i, 0)
        if _k == "knowledge_point":
            _it["cnt"] = {"sk": c_kp_sk.get(_i, 0), "mc": c_kp_mc.get(_i, 0), "std": c_kp_std.get(_i, 0)}
        elif _k == "skill":
            _it["cnt"] = {"kp": c_sk_kp.get(_i, 0), "th": c_sk_th.get(_i, 0)}
        elif _k == "thought":
            _it["cnt"] = {"sk": c_th_sk.get(_i, 0), "cp": c_th_cp.get(_i, 0)}
        elif _k == "competency":
            _it["cnt"] = {"th": c_cp_th.get(_i, 0)}

    # 检索串：孩子记的是「将军饮马」「轴对称」，不是我们写在 title 里那句完整描述。
    # 别名一直只躺在 detail.jsonl 里，图上搜不到 —— 这是「想不到就搜不到」的根。
    # sch 只进 graph，不进详情，也不参与布局。
    _sec_name = {}
    _ch_name = {}
    for _n in nodes:
        if _n["kind"] == "section":
            _sec_name["S%s-%s" % (_n.get("volume_id"), _n.get("section_no"))] = _n.get("title") or ""
        elif _n["kind"] == "chapter":
            _ch_name[(str(_n.get("volume_id")), str(_n.get("chapter_no")))] = _n.get("title") or ""

    # 中文类型名也要进检索串：孩子搜「定理」「竞赛」，不会搜 theorem / olympiad。
    # 英文枚举留在详情里当数据，进检索串只会让 80 字的额度被搜不到的词占满。
    _KPT_CN = {"concept": "概念", "theorem": "定理", "property": "性质", "skill": "技能",
               "method": "方法", "formula": "公式", "representation": "表示法", "fact": "事实",
               "model": "模型", "context": "情境", "activity": "活动"}
    _TIER_CN = {"core": "核心", "extend": "拓展", "olympiad": "竞赛"}

    def _sch(it):
        i, k = it["id"], it["kind"]
        parts = [it.get("title") or ""]
        vol, ch, sec = it.get("vol"), it.get("ch"), it.get("sec")
        if k == "knowledge_point":
            d = details.get(i) or {}
            parts += [a for a in (d.get("aliases") or []) if a]
            parts.append(_KPT_CN.get(d.get("kp_type") or "", ""))
        elif k == "skill":
            d2 = skills.get(i) or {}
            parts.append(_TIER_CN.get(d2.get("tier") or "", ""))
            parts.append((d2.get("desc") or "")[:30])
        elif k == "thought":
            parts.append((it.get("desc") or "")[:40])
        if sec:
            parts.append(_sec_name.get("S%s-%s" % (vol, sec), ""))
        if vol and ch is not None:
            parts.append(_ch_name.get((str(vol), str(ch)), ""))
        out, seen = [], set()
        for p in parts:
            p = (p or "").strip()
            if p and p not in seen:
                seen.add(p)
                out.append(p)
        return " ".join(out)[:80]

    for _it in g_nodes:
        if _it["kind"] in ("knowledge_point", "skill", "thought", "section", "misconception"):
            _it["sch"] = _sch(_it)

    # x 是边的「来源种类」，前端据此分辨同一种关系的不同来路：
    #   m = 教研人工判定；r = 规则推断；sk = 方法前置（3b 由挂点推断 + 3c 逐条起草，都画虚线，别当硬先修）
    def _edge_kind(e):
        rule = ((e.get("ext") or {}).get("x-rule") or "")
        if rule in ("skill_dep_by_kp", "skill_prerequisite_draft"):
            return "sk"
        return "m" if e.get("confidence") == "manual" else "r"

    g_edges = [{"s": e["src"], "d": e["dst"], "r": e["relation"], "st": e["strength"],
                "c": "m" if (e.get("confidence") == "manual") else "r",
                "x": _edge_kind(e)} for e in edges]
    size_graph = dump_js(os.path.join(DATA, "graph.js"), "graph", {"nodes": g_nodes, "edges": g_edges})

    # 题 → 主挂点（只取 role=primary）。前端「哪里不稳」要按知识点汇总作答记录：
    # 记录里只有题 id，没有题 id→点的表就得为每道题去加载整节切片，几十节一起等。
    qkp = {}
    for _uid, _r in q_kp.items():
        _pr = [t2.get("kp_uid") for t2 in (_r.get("kp_tags") or []) if t2.get("role") == "primary"]
        if _pr:
            qkp[_uid] = _pr[0]
    size_qkp = dump_js(os.path.join(DATA, "qkp.js"), "qkp", qkp)

    # ---- 每个有内容的节一份切片 ----
    # 知识点→思想：沿「点→方法→方法的 thought_refs」aggregate。方法挂在方法族（level=family）下，
    # 所以这里给出来的是族，不是上位思想；上位思想由前端按 parent 递归（与 thoughtSkills 一致）。
    th_name = {t["uid"]: t["name"] for t in thoughts}
    th_ord = {t["uid"]: i for i, t in enumerate(thoughts)}

    def kp_thoughts(kid):
        got = set()
        for su in kp_skill.get(kid, []):
            for tu in (skills.get(su, {}).get("thought_refs") or []):
                got.add(tu)
        return sorted(got, key=lambda u: th_ord.get(u, 999))

    def kp_payload(kid):
        n = kps[kid]
        d = details.get(kid) or {}
        payload = {
            "uid": kid, "name": n["title"], "kp_type": d.get("kp_type"),
            "definition": d.get("definition"), "conditions": d.get("conditions"),
            "boundaries": d.get("boundaries"), "objectives": d.get("objectives"),
            "aliases": d.get("aliases"), "textbook": d.get("textbook"),
            "prereqs": [{"uid": u, "name": kps[u]["title"]} for u in sorted(set(kp_pre.get(kid, [])))],
            "nexts": [{"uid": u, "name": kps[u]["title"]} for u in sorted(set(kp_next.get(kid, [])))],
            "methods": sorted(set(kp_skill.get(kid, []))),
            # 思想与做法（spec 5 第 4 段）：先把思想名给出，前端不必再查图
            "thoughts": [{"uid": u, "name": th_name.get(u, u)} for u in kp_thoughts(kid)],
            "status": n.get("status"),
            # 课标要求：这个知识点对应 2022 版课标的哪一条（reference 原句，供详情页原样引用）
            "standards": [{"uid": sid, "code": standards[sid]["code"],
                           "text": standards[sid]["text"],
                           "stage": standards[sid].get("stage")}
                          for sid in sorted(kp_std.get(kid, []))],
            "std_gap": kp_std_gap.get(kid),
            "cpstd": kp_cpstd.get(kid, []),
            # 可以类比 / 容易混淆：名字带过去，前端不必再查图
            "analogs": [{"uid": _a["uid"],
                         "name": (kps[_a["uid"]]["title"] if _a["uid"] in kps else _a["uid"]),
                         "kind": _a["kind"], "why": _a["why"]}
                        for _a in kp_lat.get(kid, [])],
        }
        if d.get("tier") and d.get("tier") != "core":
            payload["tier"] = d["tier"]
        practice = []
        for qid in q_for_kp.get(kid, [])[:4]:
            q = q_by_id.get(qid) or {}
            stem = (q.get("stem_plain") or q.get("stem") or "").replace("\n", " ").strip()
            if len(stem) > 80:
                stem = stem[:80] + "…"
            if stem.count("$") % 2:
                cut = stem.rfind("$")
                stem = (stem[:cut].rstrip() + "…") if cut > 0 else stem.replace("$", "")
            practice.append({
                "id": qid,
                "stem": stem,
                "vol": q.get("volume_id") or q.get("_vol"),
                "sec": q.get("section_no"),
                "ch": q.get("chapter_no"),
            })
        if practice:
            payload["practice"] = practice
        return payload

    def skill_payload(sid):
        s = skills[sid]
        return {"uid": sid, "name": s.get("title"), "steps": s.get("steps") or [],
                "conditions": s.get("conditions"), "signals": s.get("failure_signals") or [],
                "alternatives": s.get("alternatives"), "band": s.get("grade_band"),
                # tier 区分教材方法 / 培优 / 竞赛，前端按层分组显示；family 是方法族名（仅扩展层有）
                "tier": s.get("tier") or "core", "family": s.get("family"),
                # 架构 v4：方法自己的定义式描述、边界声明、所属思维层级
                "desc": s.get("desc"), "boundaries": s.get("boundaries") or [],
                "thoughts": s.get("thought_refs") or [],
                # 用到这个方法的题（只有做过点级映射的题才能进来，见上面 skill_q）
                "qs": (skill_q.get(sid) or [])[:8], "qn": len(skill_q.get(sid) or [])}

    def mc_payload(mid):
        m = mcs[mid]
        return {"uid": mid, "category": m.get("category"), "signals": m.get("signal") or [],
                "remedy": m.get("remedy")}

    secs_done = 0
    secs_empty = 0
    total_item_bytes = 0

    # 六册全部节都出切片（知识点、方法、错因都在这里）；items/ex 一律落文件，无题就是空表
    plan = []
    for v in vols:
        for ch in v["chapters"]:
            for s in ch["sections"]:
                plan.append((v["volume_id"], ch["no"], s["no"], s["title"]))
            tail_no = "ch-end-%s" % ch["no"]
            if (v["volume_id"], tail_no) in by_sec:
                plan.append((v["volume_id"], ch["no"], tail_no, "章末综合（复习题与跨节题）"))

    for vid, chno, no, sec_title in plan:
        qs = by_sec.get((vid, no), [])
        kp_ids = kp_by_sec.get((vid, no), [])
        payload = {
            "vol": vid, "no": no,
            "title": auth_sec.get((vid, no)) or sec_title,
            "chapter": chno,
            "kps": [kp_payload(k) for k in kp_ids],
            "skills": [skill_payload(s) for s in sk_by_sec.get((vid, no), [])],
            "mcs": [mc_payload(m) for m in mc_by_sec.get((vid, no), [])],
            "counts": {b: sum(1 for q in qs if (q.get("band") or "basic") == b) for b in BAND_ORDER},
        }
        base = "%s-%s" % (vid, no)
        dump_js(os.path.join(SEC_DIR, base + ".js"), "sec:" + base, payload)
        if not qs:
            secs_empty += 1
            # 空的也要落文件：前端对 items/ex 是「取不到就当没有」，但缺文件会在
            # 控制台留一条 404，讲解页一打开就报错，冒烟也会判失败。
            dump_js(os.path.join(SEC_DIR, base + ".items.js"), "items:" + base, {"items": []})
            dump_js(os.path.join(SEC_DIR, base + ".ex.js"), "ex:" + base,
                    {"no": no, "title": payload["title"], "items": []})
            continue

        items = []
        for q in sorted(qs, key=lambda x: (BAND_ORDER.index(x.get("band") or "basic"), x["id"])):
            if q.get("answer_status") != "present":
                continue
            rp = rubric.get(q["id"]) or []
            items.append({
                "id": q["id"], "band": q.get("band") or "basic",
                "star": q.get("star_source") if isinstance(q.get("star_source"), int) else (q.get("star_source") or {}).get("stars"),
                "need": (q.get("figure") or {}).get("need"),
                "form": q.get("form"),
                # 有选项就把题干里的选项行切掉（stem 只留问句），选项本身走 opts
                "stem": (q_opt[q["id"]].get("stem_core") or q.get("stem")) if q["id"] in q_opt else q.get("stem"),
                # 选择题：opts 非空 = 点选卡片；key 是从答案里抽出的正确字母，抽不出就是 null（判 manual）
                "opts": ({"list": q_opt[q["id"]].get("options") or [],
                          "key": q_opt[q["id"]].get("answer_key")} if q["id"] in q_opt else None),
                # 必图题：缺图时把「为什么需要图」带给前端，hint 与题干重复就不显示
                "fig": ({"need": (q.get("figure") or {}).get("need"),
                         "reason": (q.get("figure") or {}).get("reason") or "",
                         "hint": (q.get("figure") or {}).get("hint") or ""}
                        if q.get("figure") else None),
                "ans": q.get("answer"),
                "note": q.get("answer_note"),
                "steps": rp and [{"c": r["criterion"], "p": r["points"]} for r in sorted(rp, key=lambda r: r["ordinal"])] or [],
                "auto": (jp.get(q["id"]) or {}).get("auto"),
                "how": (jp.get(q["id"]) or {}).get("how"),
                # 来源：教材习题要让孩子知道「这是课本上的题」，不和题库自编题混在一起
                "src": q.get("group_source") or ("教材" if q.get("qtag_source") == "教材习题" else ""),
                "spec": specs.get(q["id"]),
                # 本题考哪个知识点（可能为空：只有高置信映射才写回）
                "kps": [{"uid": t["kp_uid"],
                         "name": (kps.get(t["kp_uid"]) or {}).get("title"),
                         "role": t.get("role"),
                         # 四行卡第 2/3 行：直接先修（最多 3 个）与一条做法
                         "pre": [{"uid": u, "name": kps[u]["title"]}
                                 for u in sorted(set(kp_pre.get(t["kp_uid"], [])))[:3]],
                         "m1": _m1(t["kp_uid"])}
                        for t in (q_kp.get(q["id"]) or {}).get("kp_tags") or []],
                # 用途：只放有证据的（tools/question_purpose.py 写的侧挂文件）；
                # 没证据就是 null，前端显示「用途未标」，不猜
                "purpose": q_purpose.get(q["id"]),
            })
        items.sort(key=lambda x: (BAND_ORDER.index(x["band"]), x["id"]))
        total_item_bytes += dump_js(os.path.join(SEC_DIR, base + ".items.js"), "items:" + base, {"items": items})

        # 例题：每个难度取最靠前的 1–2 道，优先带解题步骤与说明的
        def score(it):
            return (-(1 if it["steps"] else 0), -(1 if it["note"] else 0), it["id"])
        picked = []
        for b in ("basic", "standard", "advanced"):
            cand = [it for it in items if it["band"] == b]
            cand.sort(key=score)
            picked.extend(cand[:2])
        dump_js(os.path.join(SEC_DIR, base + ".ex.js"), "ex:" + base,
                {"no": no, "title": payload["title"], "items": picked})
        secs_done += 1

    size_qt = emit_question_types()
    size_fig = emit_figures()
    print("qtypes.js       %7d B" % size_qt)
    print("figures.js      %7d B" % size_fig)
    print("catalog.js      %7d B" % size_catalog)
    print("graph.js        %7d B  nodes=%d edges=%d" % (size_graph, len(g_nodes), len(g_edges)))
    print("qkp.js          %7d B  题→主挂点 %d 道" % (size_qkp, len(qkp)))
    print("sec 切片        %3d 节（其中 %d 节暂无题，只有知识点）  items 合计 %d B"
          % (secs_done + secs_empty, secs_empty, total_item_bytes))
    print("输出目录        %s" % DATA)


if __name__ == "__main__":
    main()