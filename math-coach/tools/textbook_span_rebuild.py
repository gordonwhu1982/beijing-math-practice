# -*- coding: utf-8 -*-
"""span 级文本重建：把教材 PDF 里被拆开的排版还原成可读文本。

解决的问题：第 10 章（分式）的分子与分母在 PDF 里是两行独立的文本 run，
直接 get_text() 会得到 "1 x" 这样的残片；第 11 章（根式）的根号是矢量图形，
文字层里根本不存在。

本模块只处理**能用行几何还原**的部分：
  1) 分式：上下两行 y 区间重叠 >= 6pt + x 区间重叠 + 两行都近乎纯数学
     （正文行距 19.2 > 行高 16.2，天然不重叠，这条判据在本册 PDF 上零误判）；
  2) 上标：行内字号明显偏小的 span（x 2 -> x^{2}）；
  3) 视觉归属：小题号 (2) 与分隔标点 ； 常是独立的一行、垂直对着分母，
     按位置认领回分式的左右两侧，否则会在输出里漂到别的题后面。

根号（第 11 章）不在文字层，需要 drawings 级推断，本模块明确不处理——调用方应
把这类页的 text_quality 标成 root_lost，不要拿半截题去生成答案。

用法：
    python tools/textbook_span_rebuild.py 14 49        # 打印重建结果
    python tools/textbook_span_rebuild.py --lines 14   # 打印原始行几何（调试）
"""
import os, re, sys, argparse

if __name__ == "__main__":
    sys.stdout.reconfigure(encoding="utf-8")
import fitz

REPO = os.environ.get("MC_REPO", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PDF = os.environ.get("MC_801_PDF", r"D:\个人\初中材料\初二上\（2024版新教材）北京版•数学八年级上册.pdf")

CJK = re.compile(r"[\u4e00-\u9fff]")
NUMTAG = re.compile(r"^[\s]*[（(][\s]*\d+[\s]*[）)][\s]*$")     # (1) ( 2 ) （3）
PUNCT_ONLY = re.compile(r"^[；。，、.,\s]+$")
MATH_OK = re.compile(r"^[0-9a-zA-Z+\-*/=<>.,:;()\[\]{}'|!^~ ×÷°∠△⊥∥√²³；，、 ]+$")
TAIL_PUNCT = "；。，、,;."
WATERMARK = ("仅供学习", "电子教材来源", "禁止以任何形式商用")
SPACE_ODD = dict.fromkeys(map(ord, "\u200a\u2002\u2003\u2009\u00a0"), " ")
HEADER_Y = 690
BAND_PT = 4          # 页眉页脚在这个 y 之下/之上


def pure_math(t):
    t = t.translate(SPACE_ODD).strip()
    return bool(t) and not CJK.search(t) and bool(MATH_OK.match(t))


def load_lines(page):
    out = []
    for blk in page.get_text("dict")["blocks"]:
        if blk.get("type") != 0:
            continue
        for ln in blk["lines"]:
            spans = []
            for sp in ln["spans"]:
                t = sp["text"]
                if not t.strip():
                    continue
                spans.append({"x0": sp["bbox"][0], "x1": sp["bbox"][2],
                              "y0": sp["bbox"][1], "y1": sp["bbox"][3],
                              "size": sp["size"], "t": t.translate(SPACE_ODD)})
            if not spans:
                continue
            txt = "".join(s["t"] for s in spans)
            if any(w in txt for w in WATERMARK):
                continue
            out.append({"x0": min(s["x0"] for s in spans), "x1": max(s["x1"] for s in spans),
                        "y0": min(s["y0"] for s in spans), "y1": max(s["y1"] for s in spans),
                        "spans": spans, "used": False})
    return [l for l in out if l["y1"] < HEADER_Y]


def base_size(spans):
    """主体字号取行内最大字号：上标字号小，当主体会把正常字误判成上标。"""
    return max((sp["size"] for sp in spans), default=12)


SUP_OK = re.compile(r"^[0-9a-zA-Z+\-]{1,3}$")


def render(spans):
    """拼一段文本。字号偏小的 span 只有内容是「纯数字/短字母」时才当上标——
    含括号、运算符或较长内容的多半是小题号、括号或换行残片，当上标会把整个式子弄错。"""
    bs = base_size(spans)
    out = []
    for sp in spans:
        t = sp["t"]
        if sp["size"] < bs * 0.85 and SUP_OK.match(t.strip()):
            out.append("^{%s}" % t.strip())
        else:
            out.append(t)
    return "".join(out)


def expand(spans, anchor):
    """从 anchor（交集区间）出发，在同一行内向左右吸收连续的数学 span，跳过 (1) 这种小题号。"""
    xs = [i for i, sp in enumerate(spans)
          if min(sp["x1"], anchor[1]) - max(sp["x0"], anchor[0]) > 0]
    if not xs:
        return []
    lo, hi = xs[0], xs[-1]
    while lo - 1 >= 0:
        sp, prev = spans[lo - 1], spans[lo]
        if NUMTAG.match(sp["t"]) or not pure_math(sp["t"]) or prev["x0"] - sp["x1"] > 3:
            break
        lo -= 1
    while hi + 1 < len(spans):
        sp, prev = spans[hi + 1], spans[hi]
        if NUMTAG.match(sp["t"]) or not pure_math(sp["t"]) or sp["x0"] - prev["x1"] > 3:
            break
        hi += 1
    return spans[lo:hi + 1]


def peel_tail(spans):
    """把分母末尾的标点（；。）剥出来，留到分式外面。"""
    peeled = ""
    spans = [dict(s) for s in spans]
    while spans:
        t = spans[-1]["t"].rstrip()
        if t and t[-1] in TAIL_PUNCT:
            peeled = t[-1] + peeled
            spans[-1]["t"] = t[:-1]
            if not spans[-1]["t"].strip():
                spans.pop()
            else:
                break
        else:
            break
    return spans, peeled


def band_of(line):
    """视觉行分桶：同一横排的几段文字在 PDF 里可能是几条 line、y0 差 1–3pt，
    直接按 y0 排会把右边的 (2) 排到左边的 (1) 前面。按 4pt 分桶、桶内按 x 排即可。"""
    return int(round((line["y0"] + line["y1"]) / 2.0 / BAND_PT))


def absorb_side(lines, A, B, mol_x0, mol_x1):
    """认领分式两侧的独立行：左边是小题号，右边是分隔标点。"""
    y_lo, y_hi = A["y0"] - 5, B["y1"] + 5
    left = right = None
    for L in lines:
        if L["used"] or L is A or L is B:
            continue
        if L["y0"] < y_lo or L["y1"] > y_hi:
            continue
        txt = "".join(s["t"] for s in L["spans"])
        if NUMTAG.match(txt) and L["x1"] <= mol_x0 + 4 and mol_x0 - L["x1"] < 40:
            if left is None or L["x1"] > left["x1"]:
                left = L
        elif PUNCT_ONLY.match(txt) and L["x0"] >= mol_x1 - 4 and L["x0"] - mol_x1 < 40:
            if right is None or L["x0"] < right["x0"]:
                right = L
    return left, right


def rebuild_lines(page):
    """返回该页重建后的文本行（分式已还原成 \frac{...}{...}）。"""
    lines = load_lines(page)
    lines.sort(key=lambda l: (round(l["y0"], 1), l["x0"]))
    out = []
    for i, A in enumerate(lines):
        if A["used"]:
            continue
        B = None
        for cand in lines[i + 1:]:
            if cand["used"] or cand["y0"] <= A["y0"] + 1:
                continue
            if min(A["y1"], cand["y1"]) - max(A["y0"], cand["y0"]) < 6:
                continue
            if min(A["x1"], cand["x1"]) - max(A["x0"], cand["x0"]) <= 1:
                continue
            if not (pure_math("".join(s["t"] for s in A["spans"])) and
                    pure_math("".join(s["t"] for s in cand["spans"]))):
                continue
            B = cand
            break
        if B is None:
            out.append(render(A["spans"]))
            A["used"] = True
            continue
        anchor = (max(A["x0"], B["x0"]), min(A["x1"], B["x1"]))
        mol_sp = expand(A["spans"], anchor)
        den_sp, peeled = peel_tail(expand(B["spans"], anchor))
        mol, den = render(mol_sp).strip(), render(den_sp).strip()
        mx0 = min(s["x0"] for s in mol_sp)
        mx1 = max(s["x1"] for s in mol_sp)
        ia, ib = A["spans"].index(mol_sp[0]), A["spans"].index(mol_sp[-1])
        pre, post = A["spans"][:ia], A["spans"][ib + 1:]
        piece = "\\frac{%s}{%s}" % (mol, den) if mol and den else mol + den
        left, right = absorb_side(lines, A, B, mx0, mx1)
        head = render(left["spans"]) if left else ""
        tailp = render(right["spans"]) if right else ""
        if left:
            left["used"] = True
        if right:
            right["used"] = True
        out.append(head + render(pre) + piece + render(post) + tailp + peeled)
        A["used"] = B["used"] = True
    return [t for t in out if t.strip()]


def _read_group(s, k):
    """s[k] 应是 '{'，返回与之配对的 '}' 之后的下标；不配对返回 -1。"""
    dep = 0
    while k < len(s):
        if s[k] == "{":
            dep += 1
        elif s[k] == "}":
            dep -= 1
            if not dep:
                return k + 1
        k += 1
    return -1


SEC_LEAK = re.compile(r"分式的基本性质|思考与交流|阅读与理解|回顾与整理|习题\s*10")
# 图内标注（顶点字母 D、A 之类）混进式子里：分子写成 "1 D A 4"（其实是 1/4）
FIG_BLEED = re.compile(r"[0-9]\s*[A-D]\s+[A-D]\s*[0-9]")


def frac_quality(s):
    """重建后的题干质量判定，返回 (code, 说明)。code == 'ok' 才算可入库。"""
    d = 0
    for c in s:
        if c == "{":
            d += 1
        elif c == "}":
            d -= 1
            if d < 0:
                return "brace_unbalanced", "花括号不配平"
    if d:
        return "brace_unbalanced", "花括号不配平"
    i = 0
    while True:
        i = s.find("\\frac{", i)
        if i < 0:
            break
        a = _read_group(s, i + 5)
        if a < 0 or a >= len(s) or s[a] != "{":
            return "frac_shape", "分式结构异常"
        b = _read_group(s, a)
        if b < 0:
            return "frac_unclosed", "分式未闭合"
        mol, den = s[i + 6:a - 1], s[a + 1:b - 1]
        if not mol.strip() or not den.strip():
            return "frac_empty", "空分子分母"
        if "\\frac" in mol or "\\frac" in den:
            return "frac_nested", "分式内嵌分式"
        i = b
    for m in re.finditer(r"\^\{([^}]*)\}", s):
        if re.search(r"[(){}\[\]]", m.group(1)):
            return "sup_odd", "上标含括号"
    par = 0
    for c in s:
        if c == "(":
            par += 1
        elif c == ")":
            par -= 1
            if par < 0:
                return "paren_unbalanced", "括号不配平"
    if par:
        return "paren_unbalanced", "括号不配平"
    if SEC_LEAK.search(s):
        return "section_leak", "混入下一节正文"
    if FIG_BLEED.search(s):
        return "figure_bleed", "图内标注混入式子"
    if re.search(r"\frac\{[^{}]*[（(]\s*\d+\s*[）)]", s):
        return "frac_swallowed_tag", "分式把小题号吞进分子"
    # 已还原的分式剥掉后，剩下的裸文本里若还有「数字紧跟字母」的残片
    # （如通分题的 "1 2x"、"3 2bc"），说明还有分式没配上，题干会误导。
    plain = re.sub(r"\$[^$]*\$", " ", s)
    if re.search(r"[0-9]\s*[a-z]\b|[a-z]\s+[0-9]", plain):
        return "frac_leftover", "仍有未还原的分式残片"
    # $ 之外还留着 ^ 或成串运算式（如 "a + b +"、"x - 2 ."、"÷ a 4 a+ 2"），
    # 说明这一段式子被切碎了、只还原了其中一部分。纯中文题干几乎不会出现这种形态，
    # 误伤只在 "1.2 倍" 这类（数字与量词之间没有运算符），所以判据要运算符相邻。
    if "^" in plain or re.search(r"[A-Za-z0-9]\s*[+\-×÷=≈<>]\s*[A-Za-z0-9]", plain) \
            or re.search(r"[+\-×÷=]\s*(?:[，。；]|$)", plain):
        return "bare_math", "$ 外还留着被切碎的式子"
    # 分子里含等号/乘除号 = 把整个等式当成了分式的分子（如把 "2×3=9/2" 读成 2 分之 ×3=9）
    for mol in re.findall(r"\\frac\{([^{}]*)\}", s):
        if re.search(r"[=×÷]", mol):
            return "frac_bad_num", "分式分子里混进了等式或乘除号"
    return "ok", ""


TAG_SPLIT = re.compile(r"(?=[（(]\s*\d+\s*[）)])")


def reorder_subtags(stem):
    """小题横排时 PDF 内容流顺序常常是 (2)(1)(4)(3)，按小题号重排一遍。
    题干里不足两个小题号时原样返回。"""
    parts = TAG_SPLIT.split(stem)
    if len(parts) < 3:
        return stem
    keyed = []
    for b in parts[1:]:
        m = re.match(r"[（(]\s*(\d+)\s*[）)]", b)
        keyed.append((int(m.group(1)) if m else 999, b))
    keyed.sort(key=lambda kv: kv[0])
    return parts[0] + "".join(b for _, b in keyed)


def wrap_frac(t):
    """把行内的 \frac{..}{..} 包成 $...$，好让前端 KaTeX 渲染。"""
    out, i = [], 0
    while True:
        j = t.find("\\frac{", i)
        if j < 0:
            out.append(t[i:])
            break
        out.append(t[i:j])
        p = j + len("\\frac{")
        depth = 1
        while p < len(t) and depth:
            if t[p] == "{":
                depth += 1
            elif t[p] == "}":
                depth -= 1
            p += 1
        if p < len(t) and t[p] == "{":
            depth, p = 1, p + 1
            while p < len(t) and depth:
                if t[p] == "{":
                    depth += 1
                elif t[p] == "}":
                    depth -= 1
                p += 1
        out.append("$" + t[j:p] + "$")
        i = p
    return "".join(out)


if __name__ == "__main__":
    ap = argparse.ArgumentParser()
    ap.add_argument("pages", nargs="*", type=int)
    ap.add_argument("--lines", action="store_true", help="打印原始行几何，不重建")
    a = ap.parse_args()
    doc = fitz.open(PDF)
    for p in a.pages:
        print("=== PDF p%d（教材 p%d）" % (p, p - 9))
        if a.lines:
            for l in sorted(load_lines(doc[p - 1]), key=lambda l: (round(l["y0"], 1), l["x0"])):
                print("y=%.1f-%.1f x=%.1f-%.1f pure=%d %r" % (
                    l["y0"], l["y1"], l["x0"], l["x1"],
                    pure_math("".join(s["t"] for s in l["spans"])),
                    "".join(s["t"] for s in l["spans"])[:70]))
        else:
            for t in rebuild_lines(doc[p - 1]):
                print("   ", t)
