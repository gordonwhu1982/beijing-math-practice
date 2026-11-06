# -*- coding: utf-8 -*-
"""题目 → 知识点（KP）候选映射 v2（派生，不入权威层）。

v1 的两个致命问题与对应改造：
1) v1 只在「本题 section 对应的节」里找候选。实测题库的 section_no 是分章批量编号，
   与真实内容常错位（12.1_bas_02「第三边取值范围」是 12.2 的内容），限定本节必然漏。
   → v2 候选集放大到整章知识点，section 只作 +1.5 的弱先验。
2) v1 用 2-gram idf，被「三角形 / 角 / 边」这类通用词主导。
   → v2 引入判别词表 tools/kp_terms.json，并对术语做**最长优先 + 位置遮蔽**匹配
     （「逆命题」吃掉「命题」、「等腰三角形」吃掉「三角形」），避免短词重复计分。

分级（宁可标不可判，也不假判）：score>=8 → auto；4~8 → review（只作建议）；<4 → weak。
产物写 build/questions/kp_map.jsonl，每题带 evidence（命中的术语），便于人工抽检。
"""
import json, os, io, sys, math, collections, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
REPO = os.environ.get("MC_REPO", r"D:/个人/知识图谱/math-coach")
FR = os.path.join(REPO, "build", "framework")
QDIR = os.path.join(REPO, "content", "questions", "801")
OUT = os.path.join(REPO, "build", "questions")
os.makedirs(OUT, exist_ok=True)

TERMS = json.load(open(os.path.join(REPO, "tools", "kp_terms.json"), encoding="utf-8"))
ANS_W = TERMS.get("answer_weight", 0.6)
NGRAM_W = TERMS.get("ngram_weight", 0.30)
MIN_TERM = TERMS.get("min_term_score", 8.0)
REVIEW = TERMS.get("review_score", 5.0)
LEAD_RATIO = TERMS.get("lead_ratio", 1.6)
SKIP = TERMS.get("skip_patterns", [])
SECTION_PRIOR = 1.5
TLS = TERMS["terms"]
TLS.sort(key=lambda x: -len(x["t"]))       # 最长优先匹配
for i, t in enumerate(TLS):
    t["_i"] = i                            # 序号必须在排序之后赋，否则 out[_i] 与 TLS[_i] 错位

nodes = [json.loads(l) for l in open(os.path.join(FR, "nodes.jsonl"), encoding="utf-8")]
edges = [json.loads(l) for l in open(os.path.join(FR, "edges.jsonl"), encoding="utf-8")]
kp_of = collections.defaultdict(list)
for e in edges:
    if e["kind"] == "contains" and e["dst"].startswith("K"):
        kp_of[e["src"]].append(e["dst"])
kptext = {n["id"]: n["title"] for n in nodes if n["kind"] == "knowledge_point"}
# 章号（字符串）→ 该章全部知识点
chap_kp = collections.defaultdict(list)
for n in nodes:
    if n["kind"] == "knowledge_point":
        chap_kp[n["id"].split("-")[1].split(".")[0]].append(n["id"])
kp_sec = {}
for sid, ks in kp_of.items():
    for k in ks:
        kp_sec[k] = sid

STOP = set("的 了 和 与 是 在 有 为 把 被 就 都 也 这 那 个 一 二 三 若 则 求 已知 求证 如图 中 上 下 时 之 其 或".split())

def grams(s):
    s = re.sub(r"\$[^$]*\$", " ", s)
    s = re.sub(r"[^\u4e00-\u9fa5A-Za-z0-9]+", " ", s)
    out = set()
    for tok in s.split():
        if tok in STOP or len(tok) == 1:
            continue
        if re.fullmatch(r"[A-Za-z0-9]+", tok) or len(tok) == 2:
            out.add(tok); continue
        for i in range(len(tok) - 1):
            g = tok[i:i+2]
            if g not in STOP:
                out.add(g)
    return out

def norm(s):
    s = s.replace("^{\\circ}", "°").replace("^\\circ", "°").replace("\\circ", "°")
    s = s.replace("^{2}", "²").replace("^2", "²").replace("^{3}", "³")
    s = s.replace("\\triangle", "△").replace("\\angle", "∠")
    s = s.replace("\\cong", "≌").replace("\\perp", "⊥")
    return s

kpg = {k: grams(v) for k, v in kptext.items()}
N = max(1, len(kpg))
df = collections.Counter()
for g in kpg.values():
    for t in g:
        df[t] += 1
def idf(t):
    return math.log(1 + N / (1 + df[t]))

def term_counts(text):
    """最长优先 + 位置遮蔽；返回 {term_index: 次数}。"""
    if not text:
        return {}
    used = bytearray(len(text))
    out = collections.Counter()
    for t in TLS:
        s = t["t"]
        i = 0
        while True:
            j = text.find(s, i)
            if j < 0:
                break
            if not any(used[j:j + len(s)]):
                for k in range(j, j + len(s)):
                    used[k] = 1
                out[t["_i"]] += 1
            i = j + 1
    return out

def score_terms(stem, ans):
    cs, ca = term_counts(norm(stem)), term_counts(norm(ans or ""))
    per_kp = collections.defaultdict(float)
    prov = collections.defaultdict(list)
    for idx in set(cs) | set(ca):
        t = TLS[idx]
        eff = min(cs.get(idx, 0), 2) + ANS_W * min(ca.get(idx, 0), 2)
        ks = t["kp"]
        decay = 1.0 / (1 + 0.30 * (len(ks) - 1))
        for k in ks:
            add = k["w"] * eff * decay
            per_kp[k["id"]] += add
            prov[k["id"]].append((t["t"], round(add, 2)))
    return per_kp, prov

def score_ngram(text, cands):
    qg = grams(text)
    raw = {}
    for k in cands:
        inter = qg & kpg[k]
        if inter:
            raw[k] = sum(idf(t) for t in inter)
    if not raw:
        return {}
    mx = max(raw.values())
    return {k: 5.0 * v / mx * NGRAM_W for k, v in raw.items()}

def chapter_of(q):
    sid = q.get("section_no")
    if sid:
        return str(sid).split(".")[0]
    if q.get("chapter_no"):
        return str(q["chapter_no"])
    m = re.match(r"(\d+)\.", q.get("id") or "")
    return m.group(1) if m else ""

def run():
    rows, stat = [], collections.Counter()
    for c in (10, 12, 13):
        p = os.path.join(QDIR, "ch%d.jsonl" % c)
        if not os.path.exists(p):
            continue
        for q in (json.loads(l) for l in open(p, encoding="utf-8")):
            sid = q.get("section_no")
            cands = chap_kp.get(chapter_of(q), [])
            if not cands:
                stat["no_candidate"] += 1
                rows.append({"qid": q["id"], "section": sid, "kp": [], "status": "no_candidate"})
                continue
            stem = q.get("stem_plain") or q.get("stem") or ""
            ts, prov = score_terms(stem, q.get("answer"))
            ng = score_ngram(stem + " " + (q.get("answer") or ""), cands)
            sec_uid = "S%s-%s" % (q.get("volume_id") or "801", sid) if sid else None
            tot = {}
            for k in cands:
                v = ts.get(k, 0.0) + ng.get(k, 0.0)
                if sec_uid and kp_sec.get(k) == sec_uid:
                    v += SECTION_PRIOR
                tot[k] = v
            ranked = sorted(((v, k) for k, v in tot.items() if v >= REVIEW), reverse=True)
            if not ranked or ranked[0][0] < REVIEW:
                stat["weak"] += 1
                rows.append({"qid": q["id"], "section": sid, "kp": [], "status": "weak"})
                continue
            top_v = ranked[0][0]
            keep = [{"id": k, "score": round(v, 2)} for v, k in ranked[:3] if v >= 0.60 * top_v]
            ev = prov.get(ranked[0][1], [])
            ev.sort(key=lambda x: -x[1])
            second = ranked[1][0] if len(ranked) > 1 else 0.0
            lead = top_v / second if second > 0 else 99.0
            # 只有「分数够高 + 明显领先第二名」才算高置信，才允许写回权威层
            if any(pat in (q.get("id") or "") for pat in SKIP):
                status = "competition"        # 竞赛题常超出本章范围，一律不写回
                stat["competition"] += 1
            elif top_v >= MIN_TERM and lead >= LEAD_RATIO:
                status = "auto"
                stat["auto"] += 1
            elif top_v >= MIN_TERM:
                status = "review_lead"       # 分够高但咬得紧，交人工二选一
                stat["review_lead"] += 1
            else:
                status = "review"
                stat["review"] += 1
            rows.append({"qid": q["id"], "section": sid, "band": q.get("band"),
                         "kp": keep, "evidence": [t for t, _ in ev[:5]],
                         "top": round(top_v, 2), "lead": round(lead, 2),
                         "status": status})

    p = os.path.join(OUT, "kp_map.jsonl")
    with open(p, "w", encoding="utf-8", newline="\n") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    ok = [r for r in rows if r["status"].startswith("auto")]
    print("题", len(rows), "→", p)
    print("状态 auto", len(ok), "review", stat["review"], "weak", stat["weak"], "no_candidate", stat["no_candidate"])
    cnt = collections.Counter(r["kp"][0]["id"] for r in ok)
    allkp = {k for c, ks in chap_kp.items() if c == "12" for k in ks}
    print("auto 覆盖 12 章知识点", len([k for k in cnt if k in allkp]), "/", len(allkp))
    print("术语 evidence 命中率 %.1f%%" % (100.0 * sum(1 for r in ok if r.get("evidence")) / max(1, len(ok))))
    print("top1 频次前 6")
    for k, n in cnt.most_common(6):
        print("  %-12s %4d  %s" % (k, n, kptext[k][:38]))
    print("从没当过 top1 的 12 章点", len([k for k in allkp if k not in cnt]))


def explain(qid):
    """--explain <题干 id>：打印该题命中的全部术语与候选分数，供人工抽检。"""
    for c in (10, 12, 13):
        fp = os.path.join(QDIR, "ch%d.jsonl" % c)
        if not os.path.exists(fp):
            continue
        for q in (json.loads(l) for l in open(fp, encoding="utf-8")):
            if q["id"] != qid:
                continue
            stem = q.get("stem_plain") or q.get("stem") or ""
            ts, prov = score_terms(stem, q.get("answer"))
            print("题", qid, "| section", q.get("section_no"), "| band", q.get("band"))
            print("题干:", stem[:160].replace("\n", " "))
            print("答案:", (q.get("answer") or "")[:160].replace("\n", " "))
            for k, v in sorted(ts.items(), key=lambda x: -x[1])[:6]:
                print("  %-13s %6.2f  %-46s %s" % (k, v, kptext.get(k, "")[:46],
                                                  [f"{t}({s})" for t, s in prov[k][:4]]))
            return
    print("找不到该题:", qid)


if __name__ == "__main__":
    if len(sys.argv) > 2 and sys.argv[1] == "--explain":
        explain(sys.argv[2])
    else:
        run()
