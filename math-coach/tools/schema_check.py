# -*- coding: utf-8 -*-
"""校验 math-coach 权威内容层是否符合 content/registry/schema.json 的实体契约。

用法:
    python tools/schema_check.py            # legacy 兼容模式（默认）：只校验存量数据必须有的字段
    python tools/schema_check.py --strict    # v3 目标模式：校验完整 required 字段，缺口记 error

输出:
    build/report/schema/report.txt   人读报告
    build/report/schema/gaps.csv     实体 x 字段 填充率
    build/report/schema/errors.txt   全量错误与未登记字段

设计要点:
1. 校验规则全部来自 registry，脚本里不写死字段名，所以加字段 = 改 registry。
2. 存量缺 v3 新字段属于「覆盖率缺口」，不是错误；只有 legacy_required 缺失、枚举非法、引用断裂、先修图有环才是错误。
3. 未登记字段按 实体.字段 归类后只报一次；registry 的 legacy_fields 用来登记「存量有、v3 已迁移」的键。
"""
import json, os, re, sys, csv, collections

try:
    sys.stdout.reconfigure(encoding="utf-8")
except Exception:
    pass

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(REPO, "build", "report", "schema")
REG = json.load(open(os.path.join(REPO, "content", "registry", "schema.json"), encoding="utf-8"))
ENUMS = REG["enums"]
ALIASES = REG.get("enum_aliases", {})
KIND2REL = {"contains": "is_part_of", "prerequisite": "prerequisite_of",
             "applies_to": "applies_to", "misconception_of": "misconception_of"}
EMPTY_ENTITIES = ("resource", "asset", "alias", "learner_evidence")


def rel(*parts):
    return os.path.join(REPO, *parts)


def jload(p):
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def jlines(p):
    with open(p, encoding="utf-8") as f:
        return [json.loads(l) for l in f if l.strip()]


def walk_files(d, suffix):
    out = []
    if not os.path.isdir(d):
        return out
    for root, _, files in os.walk(d):
        for fn in sorted(files):
            if fn.endswith(suffix):
                out.append(os.path.join(root, fn))
    return out


def load_curriculum():
    recs = {"volume": [], "chapter": [], "section": []}
    for p in walk_files(rel("content", "framework", "volumes"), ".json"):
        d = jload(p)
        vid = d.get("volume_id")
        prov = d.get("provenance") or {}
        recs["volume"].append({"uid": "V%s" % vid, "volume_id": vid,
                               "title": d.get("title") or vid, "grade": str(d.get("grade") or ""),
                               "term": d.get("term") or "", "edition_id": prov.get("edition_id") or "",
                               "provenance": prov or None, "chapters": d.get("chapters")})
        for ch in d.get("chapters", []):
            recs["chapter"].append({"uid": "C%s-%02d" % (vid, ch.get("no") or 0), "volume_id": vid,
                                    "no": ch.get("no"), "title": ch.get("title"),
                                    "units": ch.get("units"), "extras": ch.get("extras")})
            for s in ch.get("sections", []):
                recs["section"].append({"uid": "S%s-%s" % (vid, s.get("no")), "volume_id": vid,
                                        "chapter_no": ch.get("no"), "no": s.get("no"),
                                        "title": s.get("title"), "page": s.get("page"),
                                        "units": s.get("units"), "text_offset": s.get("text_offset")})
    return recs


def load_nodes():
    p = rel("build", "framework", "nodes.jsonl")
    return jlines(p) if os.path.exists(p) else []


def load_kp(nodes):
    out = []
    for n in nodes:
        if n.get("kind") != "knowledge_point":
            continue
        out.append({"uid": n["id"], "id": n["id"], "title": n.get("title"),
                    "canonical_name": n.get("title"), "volume_id": n.get("volume_id"),
                    "chapter_no": n.get("chapter_no"), "section_no": n.get("section_no"),
                    "status": n.get("status"), "kp_type": n.get("kp_type"),
                    "definition": n.get("definition"),
                    "source": n.get("source"), "provenance": n.get("source")})
    return out


def load_kp_detail():
    out = []
    for p in walk_files(rel("content", "framework", "knowledge_points"), ".detail.jsonl"):
        out.extend(jlines(p))
    return out


def load_skills():
    out = []
    for p in walk_files(rel("content", "skills"), ".jsonl"):
        out.extend(jlines(p))
    return out


def load_standards():
    p = rel("content", "curriculum", "standards.jsonl")
    return jlines(p) if os.path.exists(p) else []


def load_misconceptions():
    out = []
    for p in walk_files(rel("content", "misconceptions"), ".jsonl"):
        out.extend(jlines(p))
    return out


def load_questions():
    """只把 ch<章>.jsonl 当题库；ch12.spec*.jsonl 是答案结构化侧车，不是题目记录。"""
    out = []
    for p in walk_files(rel("content", "questions"), ".jsonl"):
        name = os.path.basename(p)
        if ".spec" in name or not re.match(r"^ch[0-9]+[.]jsonl$", name):
            continue
        out.extend(jlines(p))
    return out


def load_rubric():
    out = []
    for p in walk_files(rel("content", "rubric"), ".jsonl"):
        out.extend(jlines(p))
    return out


def load_edges():
    out = []
    p = rel("build", "framework", "edges.jsonl")
    if os.path.exists(p):
        for e in jlines(p):
            conf = e.get("confidence")
            out.append({"src": e["src"], "dst": e["dst"], "kind": e.get("kind"),
                        "relation": KIND2REL.get(e.get("kind"), e.get("kind")),
                        "strength": e.get("strength"), "confidence": conf,
                        "review_status": e.get("review_status"),
                        "evidence": [{"type": "textbook_page" if conf == "exact" else "teacher_note",
                                      "ref": e.get("evidence")}]})
    seen = {(e["src"], e["dst"]) for e in out}
    for fn, lvl in (("prerequisites.json", "section"), ("kp_prerequisites.json", "knowledge_point")):
        fp = rel("content", "framework", fn)
        if not os.path.exists(fp):
            continue
        d = jload(fp)
        for e in d.get("edges", []):
            if (e["from"], e["to"]) in seen:
                continue  # 派生 edges.jsonl 已包含这条，去重后再计
            seen.add((e["from"], e["to"]))
            out.append({"src": e["from"], "dst": e["to"], "kind": "prerequisite",
                        "relation": "prerequisite_of", "strength": "hard", "confidence": "manual",
                        "review_status": d.get("review_status"),
                        "evidence": [{"type": "teacher_note", "ref": e.get("why")}],
                        "_origin": "content/framework/" + fn, "_level": lvl})
    return out


def load_all():
    nodes = load_nodes()
    recs = load_curriculum()
    recs["knowledge_point"] = load_kp(nodes)
    recs["question"] = load_questions()
    recs["rubric_point"] = load_rubric()
    recs["edge"] = load_edges()
    recs["knowledge_point_detail"] = load_kp_detail()
    recs["skill"] = load_skills()
    recs["misconception"] = load_misconceptions()
    recs["curriculum_standard"] = load_standards()
    for k in EMPTY_ENTITIES:
        recs.setdefault(k, [])
    return recs, nodes


def validate(recs, nodes, strict):
    errors, gaps = [], {}
    warn_count, warn_samples = collections.Counter(), collections.defaultdict(list)
    node_ids = {n["id"] for n in nodes}
    qids = {q.get("id") for q in recs["question"]} | {q.get("uid") for q in recs["question"]}

    for ent, spec in REG["entities"].items():
        rows = recs.get(ent, [])
        must = spec["required"] if strict else spec.get("legacy_required", [])
        allowed = (set(spec.get("required", [])) | set(spec.get("optional", []))
                   | set(spec.get("legacy_required", [])) | set(spec.get("legacy_fields", []))
                   | {"ext", "id", "qid", "uid"})
        cov = {f: sum(1 for r in rows if r.get(f) not in (None, "", [], {})) for f in spec.get("required", [])}
        gaps[ent] = {"total": len(rows), "fields": cov}
        for i, r in enumerate(rows):
            tag = r.get("uid") or r.get("id") or r.get("qid") or "#%d" % i
            for f in must:
                if r.get(f) in (None, "", [], {}):
                    errors.append("%s/%s 缺必填字段 %s" % (ent, tag, f))
            for k in r:
                if k.startswith("_") or k in allowed:
                    continue
                warn_count[(ent, k)] += 1
                if len(warn_samples[(ent, k)]) < 3:
                    warn_samples[(ent, k)].append(tag)

    def chk_enum(ent, rows, field, enum_name):
        allowed = set(ENUMS[enum_name])
        amap = ALIASES.get(enum_name, {})
        for r in rows:
            v = r.get(field)
            if v is None:
                continue
            for x in (v if isinstance(v, list) else [v]):
                if x in allowed or x in amap:
                    continue
                errors.append("%s/%s 字段 %s 值 %r 不在枚举 %s"
                              % (ent, r.get("uid") or r.get("id"), field, x, enum_name))

    chk_enum("question", recs["question"], "band", "band")
    chk_enum("question", recs["question"], "visibility", "visibility")
    chk_enum("question", recs["question"], "review_status", "review_status")
    chk_enum("knowledge_point", recs["knowledge_point"], "status", "kp_status")
    chk_enum("edge", recs["edge"], "relation", "relation")
    chk_enum("knowledge_point_detail", recs["knowledge_point_detail"], "kp_type", "kp_type")
    chk_enum("knowledge_point_detail", recs["knowledge_point_detail"], "review_status", "review_status")
    chk_enum("skill", recs["skill"], "review_status", "review_status")
    chk_enum("misconception", recs["misconception"], "category", "misconception_category")
    chk_enum("misconception", recs["misconception"], "review_status", "review_status")
    chk_enum("edge", recs["edge"], "strength", "edge_strength")
    chk_enum("edge", recs["edge"], "confidence", "edge_confidence")

    for q in recs["question"]:
        for t in q.get("topics") or []:
            if t not in node_ids:
                errors.append("question/%s 的 topics 引用不存在节点 %s" % (q.get("id"), t))
        if q.get("answer_status") == "present" and not (q.get("answer") or "").strip():
            errors.append("question/%s answer_status=present 但 answer 为空" % q.get("id"))
    for r in recs["rubric_point"]:
        if r.get("qid") not in qids:
            errors.append("rubric/%s 的 qid 引用不存在题目 %s" % (r.get("qid"), r.get("qid")))
    for e in recs["edge"]:
        for end in (e.get("src"), e.get("dst")):
            if end not in node_ids:
                errors.append("edge/%s→%s 端点不存在节点 %s（来源 %s）"
                              % (e.get("src"), e.get("dst"), end, e.get("_origin")))
        if not e.get("evidence"):
            errors.append("edge/%s→%s 缺证据" % (e.get("src"), e.get("dst")))

    adj = collections.defaultdict(list)
    for e in recs["edge"]:
        if e.get("relation") == "prerequisite_of":
            adj[e["src"]].append(e["dst"])
    color, cycles = {}, []

    def dfs(u, path):
        color[u] = 1
        for v in adj.get(u, []):
            if color.get(v) == 1:
                cycles.append(path + [u, v])
            elif color.get(v, 0) == 0:
                dfs(v, path + [u])
        color[u] = 2

    for u in list(adj):
        if color.get(u, 0) == 0:
            dfs(u, [])
    for c in cycles[:10]:
        errors.append("prerequisite_of 出现环: %s" % " → ".join(c))
    if len(cycles) > 10:
        errors.append("prerequisite_of 另有 %d 个环未列出" % (len(cycles) - 10))

    warns = ["%s.%s ×%d（样例 %s）" % (e, k, n, ", ".join(warn_samples[(e, k)]))
             for (e, k), n in sorted(warn_count.items())]
    return errors, warns, gaps


def main():
    strict = "--strict" in set(sys.argv[1:])
    recs, nodes = load_all()
    errors, warns, gaps = validate(recs, nodes, strict)
    mode = "strict(v3 目标)" if strict else "legacy(存量兼容)"
    os.makedirs(OUT, exist_ok=True)

    lines = ["math-coach schema check — 模式: %s — registry: %s" % (mode, REG["registry_version"]), ""]
    lines.append("实体规模与 v3 required 字段填充率（0% 而 rows>0 = 待补；rows=0 = 该层尚未建）")
    lines.append("%-20s %6s  %s" % ("entity", "rows", "fill rate"))
    for ent, g in gaps.items():
        cov = ("  ".join(("%s=%d%%" % (f, round(100.0 * c / g["total"]))) if g["total"] else ("%s=n/a" % f)
                         for f, c in g["fields"].items())) or "（registry 未定义 required）"
        lines.append("%-20s %6d  %s" % (ent, g["total"], cov))
    lines += ["", "错误 %d 条；未登记字段 %d 类" % (len(errors), len(warns))]
    if errors:
        lines += ["", "— 错误（前 120 条）—"] + ["  " + e for e in errors[:120]]
        if len(errors) > 120:
            lines.append("  ...（另有 %d 条，见 errors.txt）" % (len(errors) - 120))
    if warns:
        lines += ["", "— 未登记字段 —"] + ["  " + w for w in warns]
    report = "\n".join(lines) + "\n"
    open(os.path.join(OUT, "report.txt"), "w", encoding="utf-8", newline="\n").write(report)
    with open(os.path.join(OUT, "gaps.csv"), "w", encoding="utf-8", newline="\n") as f:
        w = csv.writer(f)
        w.writerow(["entity", "rows", "field", "filled", "total", "pct", "status"])
        for ent, g in gaps.items():
            for f, c in g["fields"].items():
                pct = round(100.0 * c / g["total"], 1) if g["total"] else 0.0
                w.writerow([ent, g["total"], f, c, g["total"], pct,
                            "ok" if pct >= 99.9 else ("empty" if not g["total"] else "gap")])
    open(os.path.join(OUT, "errors.txt"), "w", encoding="utf-8", newline="\n").write(
        "\n".join(errors + [""] + warns) + "\n")
    print(report)
    print("报告: build/report/schema/{report.txt,gaps.csv,errors.txt}")
    return 1 if errors else 0


if __name__ == "__main__":
    sys.exit(main())
