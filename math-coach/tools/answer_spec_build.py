
# -*- coding: utf-8 -*-
"""从答案文本里抽结构化 answer_spec —— 只标「有把握」的，其余 unknown（判题时退回文本抽取）。
用法：python tools/answer_spec_build.py [--vol 801] [--write] [--show TYPE]
输出：content/questions/<vol>/ch12.spec.jsonl（--write 时）+ 统计到 stdout
"""
import argparse, json, os, re, sys, collections

sys.stdout.reconfigure(encoding="utf-8")
REPO = os.environ.get("MC_REPO", r"D:\个人\知识图谱\math-coach")

CJK = re.compile(r"[\u4e00-\u9fff]")
UNIT = (r"(?:平方厘米|平方毫米|平方米|平方分米|厘米|毫米|分米|千米|米|度|°|个|条|支|根|"
        r"元|次|分钟|小时|页|人|件|只|cm|mm|dm|km|m)")
NUM = r"[+-]?\d+(?:\.\d+)?"
POS_WORDS = ["能", "可以", "是", "成立", "正确", "全等", "相似", "等腰", "等边", "直角", "钝角",
             "锐角", "稳定", "存在", "有"]
NEG_WORDS = ["不能", "不可以", "不是", "不成立", "不正确", "不全等", "不相似", "不存在", "没有"]

def strip_tex(s):
    s = s.replace("\\lt{}", "<").replace("\\gt{}", ">")
    s = re.sub(r"\\(?:lt|le|leq)\b", "<=", s)
    s = re.sub(r"\\(?:gt|ge|geq)\b", ">=", s)
    s = re.sub(r"\\(?:ne|neq)\b", "!=", s)
    s = re.sub(r"\^\s*\{?\s*\\circ\s*\}?", "°", s)
    s = s.replace("\\degree", "°").replace("\\circ", "°")
    s = re.sub(r"\\(?:text|mathrm|mathbf)\s*\{([^{}]*)\}", r"\1", s)
    s = re.sub(r"\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}", r"(\1)/(\2)", s)
    s = re.sub(r"\\(?:times|cdot)", "*", s).replace("\\div", "/")
    s = re.sub(r"\\(?:in|notin)\b", " in ", s)
    s = re.sub(r"\\(?:pm|mp)\b", "±", s)
    s = re.sub(r"\\(?:because|therefore|blacksquare|blackquare|square)", " ", s)
    s = re.sub(r"\\(?:left|right|,|;|!|quad|qquad)", "", s)
    s = re.sub(r"\\\s", " ", s)          # \, 与 \  这类仅作间隔的反斜杠
    s = s.replace("$", "").replace("\\\\", "\\")
    s = s.replace("{", "").replace("}", "")
    return s

def conclusion(ans):
    a = re.sub(r"[\s\u3000]+", " ", ans or "").strip()
    if not a:
        return ""
    m = list(re.finditer(r"[【\[]\s*答\s*[】\]]", a))
    if m:
        tail = a[m[-1].end():]
        return re.split(r"[。]", tail)[0].strip()
    sents = [s for s in re.split(r"(?<=[。；！？])", a) if s.strip()]
    cand = None
    for s in sents:
        if len(s) <= 160 and re.search(r"答案|所以|故|因此|即|综上|从而|可得|解得", s):
            cand = s
    return (cand or (sents[-1] if sents else a)).strip()

def last_clause(t):
    """把「…，故 c<5，即 4」这类取最后一个小句"""
    parts = re.split(r"[，,]\s*(?=(?:所以|故|因此|即|从而|于是|可得|解得|得)\s*)", t)
    return parts[-1] if parts else t

def drop_marker(t):
    return re.sub(r"^(?:步骤\s*\d+\s*)?(?:又|因为|由于|由|而)?\s*"
                  r"(?:所以|故|因此|即|从而|于是|可得|解得|得|答案[是为:：]?|综上[，,]?)*\s*", "", t).strip()

def drop_expl(t):
    t = t.strip()
    for _ in range(3):
        m = re.search(r"[（(]([^（）()]*)[）)]\s*$", t)
        if not m:
            break
        inner = m.group(1)
        if len(inner) >= 6 and re.search(r"由|因为|所以|故|根据|设|即|得|满足|不成立|舍去|定理", inner):
            t = t[: m.start()].strip()
        else:
            break
    return t

def split_values(t):
    parts = re.split(r"\s*(?:[,，、；;]|或|和|与|及)\s*", t)
    return [p for p in parts if p]

def num_of(s):
    """把单个值文本转成可比数值或 None"""
    s = s.strip().strip("。").replace(" ", "")
    s = re.sub(UNIT + "$", "", s)
    if re.match(r"^" + NUM + "$", s):
        return float(s), s
    m = re.match(r"^\(?(-?\d+)\)?\s*/\s*\(?(\d+)\)?$", s)
    if m:
        d = float(m.group(2))
        return (float(m.group(1)) / d if d else None), s
    m = re.match(r"^(\d+)\s*又\s*(\d+)\s*/\s*(\d+)$", s)
    if m:
        return float(m.group(1)) + float(m.group(2)) / float(m.group(3)), s
    return None, s

def classify(raw_ans, form, t):
    """返回 (type, payload)。保守：拿不准一律 unknown。"""
    t = strip_tex(t)
    # 填空题的答案通常就是最终值；解答题/证明题的答案文本里混着过程，只在有显式「【答】」时才敢抽
    if form not in ("fill", "calculation", "choice") and not re.search(r"[【\[]\s*答", raw_ans or ""):
        if form == "proof":
            return "proof", {"reason": "form=proof"}
        return "unknown", {"reason": "form=%s-no-explicit-answer" % form}
    s = drop_marker(drop_expl(t)).strip().strip("。，,")
    if not s:
        return "unknown", {"reason": "empty-after-clean"}
    if form == "proof" and not re.search(r"[【\[]\s*答", raw_ans):
        return "proof", {"reason": "form=proof"}
    if re.search(r"证明|求证|作图|画图|保留作图痕迹", s) and not re.search(r"=", s):
        return "proof", {"reason": "keyword"}
    # 集合 {4} / {3,4} / c in {4}
    m = re.search(r"(?:([A-Za-z]{1,3})\s*)?(?:\bin\b)?\s*\{([^{}]*)\}\s*$", s)
    if m and re.search(r"\d", m.group(2)):
        vals = split_values(m.group(2))
        nums = [num_of(v) for v in vals]
        if all(n[0] is not None for n in nums) and len(nums) >= 1:
            return "value_set", {"var": m.group(1) or None,
                                 "values": [{"raw": n[1], "num": n[0], "kind": "number"} for n in nums],
                                 "order_policy": "any"}
    # 变量 = 值 （可多个，用顿号连）
    m = re.match(r"^(?:([A-Za-z]{1,3}|∠[A-Z]{1,3})\s*=\s*)?(.+)$", s)
    m = re.match(r"^([A-Za-z]{1,3})\s*=\s*(.+)$", s)
    if m and "=" not in m.group(2):
        vals = split_values(m.group(2))
        nums = [num_of(v) for v in vals]
        if len(nums) >= 2 and all(n[0] is not None for n in nums):
            return "value_set", {"var": m.group(1),
                                 "values": [{"raw": n[1], "num": n[0], "kind": "number"} for n in nums],
                                 "order_policy": "any"}
    if "=" in s:
        # 「c = 3, 4, 5」这种等号后面跟一串值：用变量 + 多值
        m2 = re.search(r"([A-Za-z]{1,3})\s*=\s*([-\d][^=]*)$", s)
        if m2 and re.search(r"[,，、]", m2.group(2)):
            vals = [num_of(v) for v in split_values(m2.group(2))]
            if len(vals) >= 2 and all(v[0] is not None for v in vals):
                return "value_set", {"var": m2.group(1), "order_policy": "any",
                                     "values": [{"raw": v[1], "num": v[0], "kind": "number"} for v in vals]}
        eqs = re.findall(r"([A-Za-z]{1,3}|∠[A-Z]{1,3})\s*=\s*(" + NUM + r"(?:\s*°)?)", s)
        if eqs and len(re.findall(r"=", s)) == len(eqs) and not re.search(r"[,，、]", s):
            vals = [num_of(v) for _, v in eqs]
            if all(v[0] is not None for v in vals):
                names = []
                for e in eqs:
                    if e[0] not in names:
                        names.append(e[0])
                return "value_set", {"var": names if len(names) > 1 else names[0],
                                     "values": [{"raw": v[1], "num": v[0], "kind": "number"} for v in vals],
                                     "order_policy": "ordered"}
    # 区间
    m = re.match(r"^(?:([A-Za-z]{1,3})\s*)?(" + NUM + r")\s*(<|<=)\s*([A-Za-z]{1,3})\s*(<|<=)\s*(" + NUM + r")$", s)
    if m:
        lop, var, hop = m.group(3), m.group(4), m.group(5)
        return "interval", {"var": var, "low": float(m.group(2)), "high": float(m.group(6)),
                            "low_closed": lop == "<=", "high_closed": hop == "<="}
    m = re.match(r"^([A-Za-z]{1,3})\s*(>=|>)\s*(" + NUM + r")$", s)
    if m:
        return "interval", {"var": m.group(1), "low": float(m.group(3)), "high": None,
                            "low_closed": m.group(2) == ">=", "high_closed": False}
    m = re.match(r"^([A-Za-z]{1,3})\s*(<=|<)\s*(" + NUM + r")$", s)
    if m:
        return "interval", {"var": m.group(1), "low": None, "high": float(m.group(3)),
                            "low_closed": False, "high_closed": m.group(2) == "<="}
    # ± 值
    m = re.match(r"^(?:([A-Za-z]{1,3})\s*=\s*)?±\s*(" + NUM + r")$", s)
    if m:
        v = float(m.group(2))
        return "value_set", {"var": m.group(1) or None,
                             "values": [{"raw": str(v), "num": v, "kind": "number"},
                                        {"raw": str(-v), "num": -v, "kind": "number"}],
                             "order_policy": "any"}
    # 元组
    m = re.match(r"^\(([^()]*)\)$", s)
    if m and re.search(r"\d", m.group(1)):
        vals = split_values(m.group(1))
        nums = [num_of(v) for v in vals]
        if nums and all(n[0] is not None for n in nums):
            return "value_set", {"var": None, "tuple": True,
                                 "values": [{"raw": n[1], "num": n[0], "kind": "number"} for n in nums],
                                 "order_policy": "any"}
    # 多值 / 单值
    parts = split_values(s)
    if len(parts) >= 2:
        nums = [num_of(p) for p in parts]
        if all(n[0] is not None for n in nums):
            return "value_set", {"var": None,
                                 "values": [{"raw": n[1], "num": n[0], "kind": "number"} for n in nums],
                                 "order_policy": "any"}
    one = num_of(s)
    if one[0] is not None:
        # 单位只认真正的中文单位词。以前用正则从 s 里剥数值，遇到 $\frac{3}{2}$ 这种会把
        # "(3)/(2)" 整个当成单位写进 spec，审计拼出来的「标准答案」就成了 "1.5(3)/(2)"。
        rest = re.sub(r"^\(?-?\d+\)?\s*/\s*\(?\d+\)?", "", s)
        rest = re.sub(r"^-?\d+(?:\.\d+)?", "", rest).strip()
        unit = rest if rest and re.match(r"^[\u4e00-\u9fff%\u2030\u00b0]{1,4}$", rest) else None
        return "exact_value", {"values": [{"raw": one[1], "num": one[0], "kind": "number"}], "unit": unit}
    # 判断题。values 一定要写：judgeWithSpec 与 judge_spec_audit 都从 values[0].raw 取标准答案，
    # 只给顶层 raw 的话审计会拼不出「标准答案」，145 条判断题全部报 empty-student。
    def _judge(s, polarity):
        return "judgement", {"raw": s, "polarity": polarity,
                             "values": [{"raw": s, "kind": "text"}]}
    if CJK.search(s) and len(s) <= 20 and not re.search(r"[=\d]", s) and not re.search(r"[;；、]", s):
        if any(w in s for w in NEG_WORDS):
            return _judge(s, "no")
        if any(w in s for w in POS_WORDS):
            return _judge(s, "yes")
        if re.match(r"^[\u4e00-\u9fff]{2,8}$", s):
            return _judge(s, "term")
    return "unknown", {"reason": "unclassified", "s": s[:60]}

def build(vol, chapter):
    src = os.path.join(REPO, "content", "questions", vol, "%s.jsonl" % chapter)
    rows = [json.loads(l) for l in open(src, encoding="utf-8") if l.strip()]
    out, stat = [], collections.Counter()
    for r in rows:
        ans = r.get("answer") or ""
        spec = {"id": r["id"], "form": r.get("form"), "answer_status": r.get("answer_status")}
        if not ans:
            spec.update({"type": "none"})
            stat["none"] += 1
            out.append(spec)
            continue
        t = conclusion(ans)
        typ, payload = classify(ans, r.get("form") or "", t)
        spec["type"] = typ
        spec.update(payload)
        spec["src"] = t[:120]
        stat[typ] += 1
        out.append(spec)
    return out, stat

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--vol", default="801")
    ap.add_argument("--chapter", default="ch12")
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--show", default=None)
    ap.add_argument("--n", type=int, default=8)
    a = ap.parse_args()
    out, stat = build(a.vol, a.chapter)
    total = len(out)
    print("total", total)
    for k, v in stat.most_common():
        print("  %-12s %4d  %5.1f%%" % (k, v, 100.0 * v / total))
    auto = stat["exact_value"] + stat["value_set"] + stat["interval"] + stat["judgement"]
    print("auto-judgeable = %d  %.1f%%" % (auto, 100.0 * auto / total))
    if a.write:
        dst = os.path.join(REPO, "content", "questions", a.vol, a.chapter + ".spec.jsonl")
        with open(dst, "w", encoding="utf-8", newline="\n") as f:
            for s in out:
                f.write(json.dumps(s, ensure_ascii=False) + "\n")
        print("wrote", dst)
    shows = [a.show] if a.show else ["exact_value", "value_set", "interval", "judgement", "unknown", "relation", "proof"]
    for typ in shows:
        ex = [s for s in out if s["type"] == typ][: a.n]
        if ex:
            print("---", typ, len([s for s in out if s["type"] == typ]))
            for e in ex:
                print("   ", e["id"], "|", "form=%s" % e.get("form"), "|",
                      json.dumps({k: v for k, v in e.items() if k not in ("id", "form", "answer_status")}, ensure_ascii=False)[:150])

if __name__ == "__main__":
    main()
