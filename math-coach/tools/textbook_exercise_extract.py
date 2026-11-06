
# -*- coding: utf-8 -*-
"""从北京版八上教材 PDF 抽取习题（巩固/提升/拓展 + 章末复习题）。

为什么不用 pdftotext：本机 pdftotext 对这本 PDF 出 CID 乱码，必须用 PyMuPDF。
为什么必须断言题号严格递增：教材每个块（巩固/提升/拓展）都从 1 编号，
801 的排版是「巩 固」这一行出现在「习 题 12-1」之上，块标题可能先于组标题出现（pending），
而块与块之间没有显式结束标记——只能靠「题号回到 1 或不再递增」判定块结束，
否则会把后面的正文按 "N." 切成假题（v1 就这么错成 365 题、巩固 0 题）。

用法：
    python tools/textbook_exercise_extract.py             # 抽到 out/textbook/draft.jsonl
    python tools/textbook_exercise_extract.py --report    # 只打印统计
"""
import os, re, sys, json, argparse

sys.stdout.reconfigure(encoding="utf-8")
import fitz
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from textbook_span_rebuild import (rebuild_lines, wrap_frac, reorder_subtags,
                                    frac_quality)

REPO = os.environ.get("MC_REPO", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PDF = os.environ.get("MC_801_PDF", r"D:\个人\初中材料\初二上\（2024版新教材）北京版•数学八年级上册.pdf")
VOL = os.path.join(REPO, "content", "framework", "volumes", "801.json")
OUTD = os.path.join(REPO, "out", "textbook")

OFFSET = 9          # 教材页 -> PDF 页序（section_text.py 实测 801 = +9）
MAX_PER_BLOCK = 30  # 单块题数硬上限，超了说明切题失效

NOISE = [
    re.compile(r"^数\s*学\s*八\s*年\s*级\s*上\s*册$"),
    re.compile(r"^第[一二三四五六七八九十]+章"),
    re.compile(r"^本电子教材来源网络"),
    re.compile(r"^源网络，仅供学习"),
    re.compile(r"^。?$"),
    re.compile(r"^[0-9]{1,3}$"),
    re.compile(r"^\(?\s*第\s*[0-9]{1,2}\s*题\s*\)?$"),
]
BLOCK_HEAD = [("巩固", re.compile(r"^巩\s*固$")), ("提升", re.compile(r"^提\s*升$")), ("拓展", re.compile(r"^拓\s*展$"))]
GROUP_HEAD = re.compile(r"^习\s*题\s*([0-9]{1,2})\s*[-－–]\s*([0-9]{1,2})$")
REVIEW_HEAD = re.compile(r"^复\s*习\s*题$")
BODY_STOP = re.compile(
    r"^(例\s*[0-9]|解\s*[:：]|分\s*析|回顾与整理|本章小结|阅读\s*与\s*思考|探究\s*与\s*发现"
    r"|数\s*学\s*活\s*动|考\s*与\s*交\s*流|综\s*合\s*与\s*实\s*践|项\s*目\s*背\s*景|项\s*目\s*实\s*施"
    r"|项\s*目\s*总\s*结|拓\s*展\s*性\s*作\s*业)"
    # 节内小节标题（如「二、 可能性」）：短、以「一、」起头，才当终止；长句不算
    r"|^[一二三四五六七八九十]{1,2}\s*、[^，。；？]{0,12}$")
# 注意：不要用「节号行」当块终止符。教材页眉就是「10.3 分式的乘法与除法」这种
# 与节号同形的行，会在块中间触发终止、把同块后续题全砍掉（实测全量 244→198 题，
# 13-3 只剩 2 题、10-3 每块只剩 1 题）。页眉按页重复，只能靠与目录节标题全等来识别并跳过。
# 题号后不能紧跟数字：教材里 "0.333…" "3.141 59" 这类小数在行首会被误当题号
ITEM_HEAD = re.compile(r"^[ \t]*([0-9]{1,2})\s*[.、．](?![0-9])\s*(.*)$")

CTRL = re.compile(r"[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]")

def clean_lines(text):
    out = []
    for raw in text.split("\n"):
        s = CTRL.sub("", raw).rstrip()
        if not s.strip():
            continue
        if any(p.search(s.strip()) for p in NOISE):
            continue
        out.append(s)
    return out

def page_lines(doc, pi, sec):
    """取一页的文本行。

    第 10 章（分式）的分母在文本层是独立一行，直接 get_text() 会得到 "1 x" 这种残片，
    这一类能用行几何还原，走 span 重建；第 11 章（根式）的根号是矢量图形，文字层里
    根本不存在，重建也救不回来，仍走原始文本并标 root_lost。
    """
    if str(sec["ch"] if sec else "") == "10":
        rows = [CTRL.sub("", x).rstrip() for x in rebuild_lines(doc[pi])]
    else:
        rows = clean_lines(doc[pi].get_text())
    out = []
    for s in rows:
        if not s.strip():
            continue
        if any(pn.search(s.strip()) for pn in NOISE):
            continue
        out.append(s)
    return out


def load_sections():
    vol = json.load(open(VOL, encoding="utf-8"))
    secs = []
    for ch in vol["chapters"]:
        for s in ch["sections"]:
            secs.append({"ch": ch["no"], "no": s["no"], "page": s["page"]})
    return secs

def sec_of_page(secs, pdfpage):
    bookpage = pdfpage - OFFSET
    cur = None
    for s in secs:
        if s["page"] <= bookpage:
            cur = s
        else:
            break
    return cur

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", action="store_true")
    args = ap.parse_args()
    secs = load_sections()
    doc = fitz.open(PDF)

    groups, problems = [], []
    cur_group = None
    cur_block = None
    cur_item = None
    pending = None       # (name, pdfpage)
    exercise = False     # 是否处在习题区（组标题之后）

    def close_item():
        nonlocal cur_item
        if cur_item is not None and cur_block is not None:
            cur_block["items"].append(cur_item)
        cur_item = None

    def open_block(name, pdfpage):
        nonlocal cur_block
        close_item()
        cur_block = {"name": name, "items": [], "start_page": pdfpage - OFFSET}
        cur_group["blocks"].append(cur_block)

    for p in range(doc.page_count):
        pdfpage = p + 1
        sec = sec_of_page(secs, pdfpage)
        for line in page_lines(doc, p, sec):
            st = line.strip()
            mg = GROUP_HEAD.match(st) or (REVIEW_HEAD.match(st) and "REVIEW")
            if mg:
                close_item(); cur_block = None; exercise = True
                if st and GROUP_HEAD.match(st):
                    m = GROUP_HEAD.match(st)
                    cur_group = {"group": "%s-%s" % (m.group(1), m.group(2)), "chapter": m.group(1),
                                 "book_page": pdfpage - OFFSET, "blocks": []}
                else:
                    cur_group = {"group": "review-%s" % (sec["ch"] if sec else "?"),
                                 "chapter": sec["ch"] if sec else None, "book_page": pdfpage - OFFSET, "blocks": []}
                groups.append(cur_group)
                if pending and pending[1] >= pdfpage - 2:      # 块标题在组标题之前（801 的排版）
                    open_block(pending[0], pending[1])
                pending = None
                continue
            hit = None
            for name, pat in BLOCK_HEAD:
                if pat.match(st):
                    hit = name
                    break
            if hit:
                close_item()
                dup = cur_group is not None and any(b["name"] == hit for b in cur_group["blocks"])
                if dup:
                    # 同名块二次出现 = 新一组开始（教材每组只出现一次「巩 固/提 升/拓 展」）。
                    # 801 的排版是块标签在「习 题 X-Y」之上，所以这里必须先把上一组关掉，
                    # 否则 13-1 的题会被塞进 review-12（曾发生：review-12 吃到 27 题、13-1 消失）。
                    cur_group = None; cur_block = None; exercise = False
                    pending = (hit, pdfpage)
                elif exercise and cur_group is not None:
                    open_block(hit, pdfpage)
                else:
                    pending = (hit, pdfpage)
                continue
            if BODY_STOP.match(st):
                close_item(); cur_block = None; exercise = False
                continue
            if not exercise or cur_block is None:
                continue
            mi = ITEM_HEAD.match(line)
            if mi and len(re.findall(r"[\u4e00-\u9fa5]", mi.group(2))) < 1:
                mi = None       # 「2 .」「12 写成…」这类是分数/式子碎片，不是题号
            if mi:
                no = int(mi.group(1))
                want = len(cur_block["items"]) + (1 if cur_item is None else 2)
                if no == want:
                    close_item()
                    cur_item = {"no": no, "text": mi.group(2).strip(), "pages": [pdfpage],
                                "sec_guess": sec["no"] if sec else None}
                else:
                    # 题号不连续：块结束。教材每块严格 1..N 连续，跳号几乎必然是把后一页
                    # 正文里的编号（如 "20." "7."）误当题号，接受它就会造出假题。
                    problems.append("%s/%s 在期望第%d题处遇到题号 %d → 视为块结束" %
                                    (cur_group["group"] if cur_group else "?", cur_block["name"], want, no))
                    close_item(); cur_block = None
                continue
            if cur_item is None and cur_block is not None and not cur_block["items"]:
                # 无题号的块（13-1 的提升/拓展只有一个大题，没有 1. 2. 编号）也收，按整块一题
                cur_item = {"no": 1, "text": st, "pages": [pdfpage],
                            "sec_guess": sec["no"] if sec else None}
                continue
            if cur_item is not None:
                if pdfpage not in cur_item["pages"]:
                    cur_item["pages"].append(pdfpage)
                cur_item["text"] += " " + st
    close_item()

    rows = []
    for g in groups:
        for b in g["blocks"]:
            if len(b["items"]) > MAX_PER_BLOCK:
                problems.append("%s/%s 题数 %d 超上限 %d" % (g["group"], b["name"], len(b["items"]), MAX_PER_BLOCK))
            for it in b["items"]:
                txt = re.sub(r"\s+", " ", it["text"]).strip()
                need_review = False
                if len(txt) > 800:      # 单题超过 800 字几乎必然是吞了正文，截断并送人工核
                    txt = txt[:800]
                    need_review = True
                # 文本层质量：
                #  - 第 10 章（分式）已用 span 坐标重建（textbook_span_rebuild），重建后
                #    逐题做结构体检；通过的按 ok 入库，不通过的留 frac_* 供人工核。
                #  - 第 11 章（根式）的根号是矢量图形，文字层里根本没有这个符号，重建救不回来，
                #    一律 root_lost，只能靠页面图片。
                chap = str(g["chapter"])
                if chap == "10":
                    txt = wrap_frac(reorder_subtags(txt))
                    tq, why = frac_quality(txt)
                    if tq != "ok":
                        need_review = True
                elif chap == "11":
                    tq = "root_lost"
                else:
                    tq = "ok"
                rows.append({
                    "text_quality": tq,
                    "uid": "EC-801-%s-%s-%02d" % (g["group"], b["name"], it["no"]),
                    "group": g["group"], "block": b["name"], "no": it["no"],
                    "chapter": g["chapter"], "section_no": it["sec_guess"],
                    "book_page": g["book_page"], "pdf_pages": it["pages"],
                    "stem": txt,
                    "has_figure": bool(re.search(r"如图|图中|下图|左图|右图", txt)),
                    "need_review": need_review,
                    "source": "北京版八上教材（2024版新教材）%s %s 第%d题" % (g["group"], b["name"], it["no"]),
                })

    by_block, by_group = {}, {}
    for r in rows:
        by_block[r["block"]] = by_block.get(r["block"], 0) + 1
        by_group[r["group"]] = by_group.get(r["group"], 0) + 1
    print("groups %d  题 %d" % (len(groups), len(rows)))
    print("按块:", json.dumps(by_block, ensure_ascii=False))
    print("按组:", json.dumps(by_group, ensure_ascii=False))
    print("切题告警 %d 处:" % len(problems))
    for x in problems[:25]:
        print("  ", x)
    short = [r["uid"] for r in rows if len(r["stem"]) < 6]
    print("空/极短题干 %d: %s" % (len(short), short[:5]))
    if args.report:
        return
    os.makedirs(OUTD, exist_ok=True)
    fp = os.path.join(OUTD, "draft.jsonl")
    with open(fp, "w", encoding="utf-8", newline="\n") as f:
        for r in rows:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print("写出", fp)

if __name__ == "__main__":
    main()
