
import re, json, io, sys, os, bisect
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
OUT = os.environ.get("MC_SCRATCH", r"C:/Users/liang.gao5/Documents/deepseek-harness/default-workspace/out/toc")
BOOKS = [
 ("701", "七年级上册", 7, 1, "qi_shang", "旧版", "draft", (1, 20)),
 ("702", "七年级下册", 7, 2, "qi_xia", "旧版", "draft", (2, 14)),
 ("801", "八年级上册", 8, 1, "ba_shang_2024", "2024版新教材", "verified", (5, 11)),
 ("802", "八年级下册", 8, 2, "ba_xia", "旧版", "draft", (5, 11)),
 ("901", "九年级上册", 9, 1, "jiu_shang", "旧版", "draft", (5, 11)),
 ("902", "九年级下册", 9, 2, "jiu_xia", "旧版", "draft", (5, 11)),
]
CN = "零一二三四五六七八九十"
def cn2int(s):
    if s.isdigit(): return int(s)
    if s == "十": return 10
    if s.startswith("十"): return 10 + CN.index(s[1])
    if s.endswith("十"): return CN.index(s[0]) * 10
    if "十" in s:
        a, b = s.split("十"); return CN.index(a) * 10 + CN.index(b)
    return CN.index(s)
def norm(s):
    s = s.replace("\u3000", " ").replace("\t", " ")
    s = re.sub(r"(\d)\s*\.\s*(\d)", r"\1.\2", s)
    s = re.sub(r"[\u2026]+", " … ", s)
    return re.sub(r"\s+", " ", s).strip()
def pages(path):
    txt = open(path, encoding="utf-8").read()
    parts = re.split(r"\n===== PAGE (\d+) =====\n", txt)
    return {int(parts[i]): parts[i+1] for i in range(1, len(parts), 2)}
RE_CH   = re.compile(r"^第([零一二三四五六七八九十\d]{1,3})\s*章\s*(\S.*?)\s*(?:…\s*)?(\d{1,3})?\s*$")
RE_SEC  = re.compile(r"^\*?\s*(\d{1,2})\.(\d{1,2})\s*(.*?)\s*(?:…\s*)?(\d{1,3})\s*$")
RE_SECONLY = re.compile(r"^(\d{1,2}\.\d{1,2})$")
RE_UNIT = re.compile(r"^([一二三四五六七八九十]{1,2})\s*[、 ]\s*(\S.*?)\s*(?:…\s*)?(\d{1,3})\s*$")
RE_XT   = re.compile(r"^习题\s*(\d{1,2})\s*[-–]\s*(\d{1,2})")
RE_EXTRA= re.compile(r"^(阅读理解|探究学习|综合与实践|回顾与整理|复习题|附录)\s*(.*?)\s*(?:…\s*)?(\d{1,3})?\s*$")

def parse(bk):
    bid, label, grade, term, fkey, edition, status, win = bk
    path = os.path.join(OUT, fkey + ".txt")
    if not os.path.exists(path): return None
    pg = pages(path)
    lines = []
    for n in sorted(pg):
        if n < win[0] or n > win[1]: continue
        for raw in pg[n].split("\n"):
            s = norm(raw)
            if not s: continue
            if s in ("目录", "目 录"): continue
            if "本电子教材来源网络" in s or "仅供学习" in s or "禁止以任何形式" in s: continue
            if re.match(r"^[A-Za-z\u22a5\u25b3\u2299\u2033\u2032\u2070-\u209f\s]+$", s): continue
            lines.append(s)
    chs, secs, units, extras = [], [], [], []
    pending = None
    for s in lines:
        m = RE_SECONLY.match(s)
        if m: pending = m.group(1); continue
        m = RE_CH.match(s)
        if m and not re.match(r"^\d", s):
            n = cn2int(m.group(1))
            if all(c["no"] != n for c in chs):
                chs.append({"no": n, "title": m.group(2).strip(), "page": int(m.group(3)) if m.group(3) else None})
            pending = None; continue
        m = RE_SEC.match(s)
        if m:
            no = "%s.%s" % (m.group(1), m.group(2)); t = m.group(3).strip(); p = int(m.group(4))
            if pending == no: pending = None
            if t and p >= 1 and not re.match(r"^[\d.]+$", t) and not re.search(r"图\s*\d", t):
                if all(x["no"] != no for x in secs):
                    secs.append({"no": no, "title": t.rstrip(" .…-–"), "page": p})
            continue
        if pending:
            m2 = re.match(r"^(.+?)\s*(?:…\s*)?(\d{1,3})\s*$", s)
            if m2 and not RE_UNIT.match(s):
                no = pending; t = m2.group(1).strip(); p = int(m2.group(2)); pending = None
                if t and p >= 1 and not re.match(r"^[\d.]+$", t):
                    if all(x["no"] != no for x in secs):
                        secs.append({"no": no, "title": t.rstrip(" .…-–"), "page": p})
                continue
        m = RE_UNIT.match(s)
        if m and m.group(2) and not m.group(2).startswith("章"):
            units.append({"label": m.group(1), "title": m.group(2).strip().rstrip(" .…-–"), "page": int(m.group(3))}); continue
        m = RE_XT.match(s)
        if m: extras.append({"kind": "习题", "title": "习题%s-%s" % (m.group(1), m.group(2)), "page": None}); continue
        m = RE_EXTRA.match(s)
        if m and (m.group(2) or m.group(1) in ("回顾与整理", "复习题", "附录")):
            extras.append({"kind": m.group(1), "title": m.group(2).strip().rstrip(" .…-–") or m.group(1),
                           "page": int(m.group(3)) if m.group(3) else None}); continue
    # sections -> chapter by numeric prefix (reliable)
    byno = {c["no"]: c for c in chs}
    for c in chs: c["units"], c["sections"], c["extras"] = [], [], []
    orphan = []
    for s in secs:
        cn = int(s["no"].split(".")[0])
        if cn in byno: byno[cn]["sections"].append(s)
        else: orphan.append(s)
    for c in chs:
        c["sections"].sort(key=lambda s: int(s["no"].split(".")[1]))
        if not c["page"] and c["sections"]: c["page"] = max(1, c["sections"][0]["page"] - 1)
    # units/extras -> chapter by nearest section page
    anchor = sorted([(s["page"], int(s["no"].split(".")[0])) for s in secs if s["no"]])
    apages = [a[0] for a in anchor]
    def chap_by_page(p):
        if not apages: return None
        i = bisect.bisect_left(apages, p)
        cands = []
        if i < len(anchor): cands.append(anchor[i])
        if i > 0: cands.append(anchor[i-1])
        return min(cands, key=lambda a: abs(a[0] - p))[1]
    for u in units:
        cn = chap_by_page(u["page"])
        if cn in byno: byno[cn]["units"].append(u)
    for e in extras:
        if e["page"] is None: continue
        cn = chap_by_page(e["page"])
        if cn in byno: byno[cn]["extras"].append(e)
    for c in chs:
        c["units"].sort(key=lambda u: u["page"])
        c["extras"].sort(key=lambda e: e["page"])
    chs.sort(key=lambda c: c["no"])
    return {"id": bid, "label": label, "grade": grade, "term": term, "edition": edition,
            "status": status, "chapters": chs, "orphan_sections": orphan}


# 七上（701）为扫描件：158 页 get_text() 全为空，无文字层，无法自动解析。
# 以下目录为人工读取 PDF 第 4–6 页「目录」实页录入（2026-10-26），页面页码=目录标注页码。
QI_SHANG = {
 "id": "701", "label": "七年级上册", "grade": 7, "term": 1,
 "edition": "旧版（2013 教育部审定，印次待核）", "status": "verified_skeleton",
 "orphan_sections": [],
 "chapters": [
  {"no": 1, "title": "有理数", "page": 1,
   "units": [{"label": "一", "title": "对有理数的认识", "page": 2},
             {"label": "二", "title": "有理数的四则运算", "page": 17}],
   "sections": [
    {"no": "1.1", "title": "负数的引入", "page": 2},
    {"no": "1.2", "title": "用数轴上的点表示有理数", "page": 5},
    {"no": "1.3", "title": "相反数和绝对值", "page": 8},
    {"no": "1.4", "title": "有理数的加法", "page": 17},
    {"no": "1.5", "title": "有理数的减法", "page": 23},
    {"no": "1.6", "title": "有理数加减法的混合运算", "page": 26},
    {"no": "1.7", "title": "有理数的乘法", "page": 36},
    {"no": "1.8", "title": "有理数的除法", "page": 41},
    {"no": "1.9", "title": "有理数的乘方", "page": 45},
    {"no": "1.10", "title": "有理数的混合运算", "page": 50},
    {"no": "1.11", "title": "数的近似和科学记数法", "page": 54},
    {"no": "1.12", "title": "用计算器做有理数的混合运算", "page": 57}],
   "extras": [
    {"kind": "习题", "title": "习题1-1", "page": 14},
    {"kind": "习题", "title": "习题1-2", "page": 34},
    {"kind": "习题", "title": "习题1-3", "page": 52},
    {"kind": "习题", "title": "习题1-4", "page": 59},
    {"kind": "阅读理解", "title": "我国古代数学家对负数的研究", "page": 61},
    {"kind": "回顾与整理", "title": "回顾与整理", "page": 62},
    {"kind": "复习题", "title": "复习题", "page": 65}]},
  {"no": 2, "title": "一元一次方程", "page": 69,
   "units": [{"label": "一", "title": "等式和方程", "page": 70},
             {"label": "二", "title": "一元一次方程和它的解法", "page": 88},
             {"label": "三", "title": "一元一次方程的应用", "page": 101}],
   "sections": [
    {"no": "2.1", "title": "字母表示数", "page": 70},
    {"no": "2.2", "title": "同类项与合并同类项", "page": 76},
    {"no": "2.3", "title": "等式与方程", "page": 80},
    {"no": "2.4", "title": "等式的基本性质", "page": 83},
    {"no": "2.5", "title": "一元一次方程", "page": 88},
    {"no": "2.6", "title": "列方程解应用问题", "page": 101}],
   "extras": [
    {"kind": "习题", "title": "习题2-1", "page": 85},
    {"kind": "探究学习", "title": "绝对值方程", "page": 99},
    {"kind": "习题", "title": "习题2-2", "page": 100},
    {"kind": "习题", "title": "习题2-3", "page": 110},
    {"kind": "阅读理解", "title": "“方程”名称的来源", "page": 113},
    {"kind": "回顾与整理", "title": "回顾与整理", "page": 115},
    {"kind": "复习题", "title": "复习题", "page": 117}]},
  {"no": 3, "title": "简单的几何图形", "page": 119,
   "units": [{"label": "一", "title": "对图形的认识", "page": 120},
             {"label": "二", "title": "直线、射线、线段", "page": 125},
             {"label": "三", "title": "角", "page": 135},
             {"label": "四", "title": "两条直线的位置关系", "page": 143}],
   "sections": [
    {"no": "3.1", "title": "平面图形与立体图形", "page": 120},
    {"no": "3.2", "title": "某些立体图形的展开图", "page": 121},
    {"no": "3.3", "title": "从不同方向观察立体图形", "page": 122},
    {"no": "3.4", "title": "点、线、面、体", "page": 125},
    {"no": "3.5", "title": "直线、射线、线段", "page": 127},
    {"no": "3.6", "title": "角及其分类", "page": 135},
    {"no": "3.7", "title": "角的度量与角的换算", "page": 138},
    {"no": "3.8", "title": "角平分线", "page": 140},
    {"no": "3.9", "title": "两条直线的位置关系", "page": 143},
    {"no": "3.10", "title": "相交线与平行线", "page": 144},
    {"no": "3.11", "title": "用计算机绘图", "page": 148, "optional": True}],
   "extras": [
    {"kind": "习题", "title": "习题3-1", "page": 124},
    {"kind": "习题", "title": "习题3-2", "page": 133},
    {"kind": "习题", "title": "习题3-3", "page": 141},
    {"kind": "习题", "title": "习题3-4", "page": 149},
    {"kind": "回顾与整理", "title": "回顾与整理", "page": 150},
    {"kind": "复习题", "title": "复习题", "page": 151},
    {"kind": "附录", "title": "附录", "page": 152}]},
 ],
}

books = [(QI_SHANG if x[0] == "701" else parse(x)) for x in BOOKS]
books = [b for b in books if b]

rep, total_ch, total_sec = [], 0, 0
for b in books:
    ns = sum(len(c["sections"]) for c in b["chapters"]); total_ch += len(b["chapters"]); total_sec += ns
    rep.append("== %s %s ch=%d sec=%d edition=%s status=%s" % (b["id"], b["label"], len(b["chapters"]), ns, b["edition"], b["status"]))
    if b["orphan_sections"]: rep.append("  !! orphan=%s" % b["orphan_sections"])
    for c in b["chapters"]:
        rep.append(" 第%d章 %s (p%s) units=%d sec=%d extra=%d  %s" % (c["no"], c["title"], c["page"], len(c["units"]), len(c["sections"]), len(c["extras"]),
            " ".join(s["no"] for s in c["sections"])))
rep.append("TOTAL chapters=%d sections=%d books=%d" % (total_ch, total_sec, len(books)))
json.dump(books, open(os.path.join(OUT, "framework.json"), "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print("\n".join(rep))
