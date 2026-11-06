# -*- coding: utf-8 -*-
"""把旧工程生成的章节 HTML（chXX_generated.html + chXX_answers.html）导进题库。

为什么要有这一步：这批题是 2025 年在另一个工程里按「基础/提高/拓展/高难/竞赛/易错」
六档生成的八上四章题，1428 道，带完整答案与步骤化解析；教材 PDF 抽取只能拿到
158 题，第 11 章整章因为根号是矢量图形抽不出来。这批 HTML 是现成的存量资产。

结构（实测四份文件一致）：
  generated: <section class="section" id="sec-10-1"><h3 class="section-title">10.1 分式</h3>
               <div class="problem-set" data-level="basic">
                 <div class="problem-set-header"><span class="level-tag basic">基础</span>基础题组</div>
                 <div class="problem"><span class="num">1.</span><span class="star">★</span>
                   <span class="qtag qtag-choice">选择</span><span class="stem">…</span>
                   <div class="choices"><p>A. …</p>…</div>
                   <div class="problem-fig">…</div></div>
  answers:   <details open><summary>10.1 分式</summary>
               <details open><summary>基础题组</summary>
                 <p><b>1.【答】</b>…</p><p class="step">…</p>

三个必须知道的对齐事实：
1. 题号在每个题组内从 1 重排，不是全章连号；
2. 节标题是 <h3 class="section-title">，外层是 <section class="section">（不是 h2）；
3. 章末卷分两批：难度六档的答案在「章末综合测试卷」块里，而「本章综合测试（30 题）」
   的四个题型组（选择/填空/计算/解答）答案在另一个独立块里 → 答案查找要按 level 跨块找。
另外 error（易错）档上游本来就没写答案，导入后 answer_status=missing 是正常的。

用法：
  python tools/legacy_html_import.py --dry-run
  python tools/legacy_html_import.py --chapter 10 11 13
"""
import argparse
import hashlib
import html
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.environ.get(
    "MC_LEGACY_HTML",
    r"C:/Users/liang.gao5/AppData/Roaming/Trae CN/ModularData/ai-agent/work-mode-projects/6a509678e9670855e3fda7f1")
OUT = os.path.join(REPO, "content", "questions", "801")

# 六档题组 + 综合测试的四个题型组 -> (band, group_source, id 缩写)
# band 为 None 表示按星级推断（综合测试卷是混排卷，分组只有题型没有难度）
LEVELS = {
    "basic": ("basic", "基础", "bas"),
    "intermediate": ("standard", "提高", "int"),
    "advanced": ("advanced", "拓展", "adv"),
    "challenge": ("challenge", "高难", "cha"),
    "competition": ("competition", "竞赛", "com"),
    "error": ("standard", "易错", "err"),
    "choice": (None, "综合测试", "tc"),
    "fill": (None, "综合测试", "tf"),
    "calc": (None, "综合测试", "tk"),
    "solve": (None, "综合测试", "ts"),
    "newtest": (None, "综合测试", "tt"),
}
# 答案文件里的组名不比 data-level：同一档在不同章叫「高难题组」或「高难度题组」
GROUP_NAME = {
    "基础题组": "basic", "提高题组": "intermediate", "拓展题组": "advanced",
    "高难题组": "challenge", "高难度题组": "challenge", "竞赛题组": "competition",
    "选择题": "choice", "填空题": "fill", "计算题": "calc", "解答题": "solve",
}
FORM = {
    "qtag-choice": ("choice", "选择"), "qtag-fill": ("fill", "填空"),
    "qtag-solve": ("solution", "解答"), "qtag-proof": ("proof", "证明"),
    "qtag-calc": ("calculation", "计算"), "qtag-construct": ("construction", "作图"),
    "qtag-error": ("solution", "易错"),
}
STAR_BAND = {1: "basic", 2: "basic", 3: "standard", 4: "advanced", 5: "challenge"}


def md5(p):
    h = hashlib.md5()
    with open(p, "rb") as f:
        for ch in iter(lambda: f.read(1 << 20), b""):
            h.update(ch)
    return h.hexdigest()


def strip_tags(s):
    s = re.sub(r"<br\s*/?>", "\n", s)
    s = re.sub(r"</p>\s*<p[^>]*>", "\n", s)
    return html.unescape(re.sub(r"<[^>]+>", "", s))


def fix_math_lt(s):
    r"""$…$ 里露出的裸 < > 会被 KaTeX 当标签，统一换回 \lt{} \gt{}（上游本来就这么写）。"""
    def one(m):
        body = m.group(1)
        body = body.replace("<", r"\lt{}").replace(">", r"\gt{}")
        return "$" + body + "$"
    return re.sub(r"\$([^$]*)\$", one, s)


def block_end(s, i, tag):
    """从 s[i]（指向 <tag）开始做标签配对，返回闭合位置；找不到返回 -1。"""
    depth = 0
    for m in re.finditer(r"<%s\b|</%s>" % (tag, tag), s[i:]):
        if m.group(0).startswith("</"):
            depth -= 1
            if depth == 0:
                return i + m.end()
        else:
            depth += 1
    return -1


def parse_generated(path):
    s = open(path, encoding="utf-8").read()
    heads = [(m.start(), m.end(), strip_tags(m.group(1)).strip())
             for m in re.finditer(
                 r'<section class="section"[^>]*>\s*<h3 class="section-title">(.*?)</h3>', s)]
    out = []
    for k, (hs, he, title) in enumerate(heads):
        seg_end = heads[k + 1][0] if k + 1 < len(heads) else len(s)
        seg = s[he:seg_end]
        sets = []
        for m in re.finditer(r'<div class="problem-set" data-level="([a-z]+)">', seg):
            e = block_end(seg, m.start(), "div")
            if e < 0:
                continue
            sets.append((m.group(1), seg[m.end():e]))
        problems = []
        for lv, body in sets:
            n = 0
            for pm in re.finditer(r'<div class="problem">', body):
                pe = block_end(body, pm.start(), "div")
                if pe < 0:
                    continue
                blk = body[pm.end():pe]
                num = re.search(r'<span class="num">\s*(\d+)\.?\s*</span>', blk)
                star = re.search(r'<span class="star">([^<]*)</span>', blk)
                qtag = re.search(r'<span class="qtag (qtag-[a-z]+)"', blk)
                stem = re.search(r'<span class="stem">(.*?)</span>', blk)
                if not stem:
                    continue
                n += 1
                choices = []
                if 'class="choices"' in blk:
                    cbody = blk.split('class="choices"', 1)[1]
                    choices = [strip_tags(x).strip() for x in
                               re.findall(r"<p>(.*?)</p>", cbody, re.S)]
                problems.append({
                    "level": lv,
                    "num": int(num.group(1)) if num else n,
                    "star": len(re.findall("★", star.group(1) if star else "")),
                    "qtag": qtag.group(1) if qtag else "",
                    "stem": fix_math_lt(strip_tags(stem.group(1)).strip()),
                    "choices": [fix_math_lt(x) for x in choices if x],
                    "has_fig": 'class="problem-fig"' in blk or "<svg" in blk,
                })
        out.append({"title": title, "problems": problems})
    return out


def parse_answers(path):
    """-> {顶层标题: {level: {组内题号: 答案文本}}}，章末综合卷等非数字标题也保留。"""
    s = open(path, encoding="utf-8").read()
    out = {}
    for m in re.finditer(r"<details[^>]*><summary>(.*?)</summary>", s):
        title = strip_tags(m.group(1)).strip()
        end = block_end(s, m.start(), "details")
        if end < 0 or not title:
            continue
        body = s[m.end():end]
        groups = {}
        for gm in re.finditer(r"<details[^>]*><summary>(.*?)</summary>", body):
            gname = strip_tags(gm.group(1)).strip()
            lv = GROUP_NAME.get(gname)
            if not lv:
                continue
            ge = block_end(body, gm.start(), "details")
            if ge < 0:
                continue
            gbody = body[gm.end():ge]
            items = {}
            marks = list(re.finditer(r"<p[^>]*><b>\s*(\d+)\.\s*【", gbody))
            for j, pm in enumerate(marks):
                stop = marks[j + 1].start() if j + 1 < len(marks) else len(gbody)
                items[int(pm.group(1))] = strip_tags(gbody[pm.start():stop]).strip()
            groups[lv] = items
        if groups:
            out[title] = groups
    return out


def sec_no(title):
    m = re.match(r"^(\d+\.\d+)", title)
    return m.group(1) if m else None


def band_of(star, level):
    b = LEVELS[level][0]
    if b:
        return b
    return STAR_BAND.get(max(1, min(star, 5)), "standard")


def build(chapters):
    for c in chapters:
        gp = os.path.join(SRC, "ch%d_generated.html" % c)
        ap = os.path.join(SRC, "ch%d_answers.html" % c)
        if not (os.path.exists(gp) and os.path.exists(ap)):
            print("ch%d 缺文件，跳过" % c)
            continue
        secs = parse_generated(gp)
        ans = parse_answers(ap)
        gen_md5, ans_md5 = md5(gp), md5(ap)
        rows, no_ans = [], 0
        for sec in secs:
            no = sec_no(sec["title"])
            # 答案候选顺序：本节 -> 本章综合卷（题型组答案在独立的「本章综合测试」块里）
            cand = []
            if no:
                cand += [k for k in ans if sec_no(k) == no]
            if sec["title"] in ans and sec["title"] not in cand:
                cand.insert(0, sec["title"])
            cand += [k for k in ans if not sec_no(k) and ("章末" in k or "综合" in k)]
            for p in sec["problems"]:
                if p["level"] not in LEVELS:
                    continue
                band, gname, abbr = LEVELS[p["level"]]
                band = band_of(p["star"], p["level"])
                stem = p["stem"]
                if p["choices"]:
                    stem = stem + "\n" + "\n".join(p["choices"])
                a = ""
                for k in cand:
                    hit = (ans.get(k, {}).get(p["level"]) or {}).get(p["num"])
                    if hit:
                        a = hit
                        break
                if not a:
                    no_ans += 1
                # 章末/综合卷没有节号，必须带章号，否则 ch10 与 ch13 的 end_adv_01 会撞号
                qid = "%s_%s_%02d" % (no, abbr, p["num"]) if no else "end%d_%s_%02d" % (c, abbr, p["num"])
                form, qtag_cn = FORM.get(p["qtag"], ("solution", "解答"))
                need = "helpful" if (p["has_fig"] or re.search(r"如图|图中|所示|右图|下图", stem)) else "none"
                rows.append({
                    "schema_version": 1, "id": qid, "volume_id": "801", "chapter_no": c,
                    "section_no": no,
                    "topics": ["S801-%s" % no] if no else ["C801-%d" % c],
                    "topics_scheme": "section" if no else "chapter",
                    "test_kind": None if no else (
                        "章末综合测试卷" if "章末" in sec["title"] else "本章综合测试"),
                    "sec_title": sec["title"],
                    "stem": stem, "stem_plain": stem, "form": form, "qtag_source": qtag_cn,
                    "answer": a, "answer_note": None,
                    "answer_steps_declared": len(re.findall(r"步骤\s*\d+", a)),
                    "answer_status": "present" if a else "missing",
                    "star_source": p["star"], "band": band, "group_source": gname,
                    "figure": {"need": need,
                               "reason": "题干含图形描述或原页面带图" if need == "helpful" else "纯计算/纯文字题",
                               "hint": stem[:60], "figure_ids": []},
                    "license": "own-ai-draft", "redistributable": False,
                    "visibility": "stem_public", "review_status": "ai_draft",
                    "source": {"of": "legacy-html:ch%d_generated.html" % c,
                               "gen_md5": gen_md5, "ans_md5": ans_md5,
                               "ingested_by": "tools/legacy_html_import.py"},
                })
        errs = sum(1 for r in rows if r["group_source"] == "易错")
        yield c, rows, "ch%d: 节 %d / 题 %d（易错 %d 上游本来无答案）/ 缺答案 %d" % (
            c, len(secs), len(rows), errs, no_ans)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--chapter", type=int, nargs="+", default=[10, 11, 13],
                    help="第 12 章已在库（1242 题与 HTML 同源），默认跳过")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    for c, rows, line in build(args.chapter):
        print(line)
        for b in ("basic", "standard", "advanced", "challenge", "competition"):
            n = sum(1 for r in rows if r["band"] == b)
            if n:
                print("    %-12s %d" % (b, n))
        if args.dry_run:
            continue
        p = os.path.join(OUT, "ch%d.jsonl" % c)
        old = []
        if os.path.exists(p):
            with open(p, encoding="utf-8") as f:
                old = [json.loads(l) for l in f if l.strip()]
        def from_legacy(r):
            s = r.get("source")
            return isinstance(s, dict) and str(s.get("of", "")).startswith("legacy-html:")
        old = [r for r in old if not from_legacy(r)]
        ids = {r["id"] for r in old}
        merged = old + [r for r in rows if r["id"] not in ids]
        merged.sort(key=lambda r: (r.get("section_no") or "zz", r["id"]))
        with open(p, "w", encoding="utf-8", newline="\n") as f:
            for r in merged:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
        dup = len(merged) - len({r["id"] for r in merged})
        print("    -> %s  %d 条（原有 %d，新增 %d）%s" % (
            os.path.relpath(p, REPO), len(merged), len(old), len(merged) - len(old),
            "" if not dup else "  ** id 重复 %d **" % dup))
    return 0


if __name__ == "__main__":
    sys.exit(main())