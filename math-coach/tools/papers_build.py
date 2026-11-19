#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把「期中 / 期末」数学试卷 PDF 渲染成可翻阅的卷面，并生成清单。

为什么是渲染不是 OCR：这些卷全是扫描件（pypdf 实测每页 0 字符、1 张图），
题干里的根号、分式、几何图 OCR 出来是噪声。先把「整张卷」按页接进练法，
一张卷能像真考试那样从头做到尾；逐题可判的那一层再按卷增量录入。

产物：
  content/papers/meta.json           清单（进仓，题量/满分/时长在这里补）
  runtime/web/data/papers/index.js   window.MC.put("papers", ...)（生成物，gitignore）
  content/papers/<id>/pNNN.webp + thumb.webp     卷面页图（源数据，进仓）

用法：
  python tools/papers_build.py                 # 全量
  python tools/papers_build.py --limit 3       # 先跑三套看效果
  python tools/papers_build.py --only "文件名.pdf"
"""
import argparse
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")

try:
    import pypdfium2 as pdfium
except ImportError:  # --index 只重建清单，不需要渲染依赖
    pdfium = None

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DEFAULT_SRC = r"D:\个人\初中材料\初二上"
META = os.path.join(REPO, "content", "papers", "meta.json")
# 页图是源数据，落 content/papers/<id>/；runtime/web/data/papers 只放派生的 index.js
SRC = os.path.join(REPO, "content", "papers")
OUT = os.path.join(REPO, "runtime", "web", "data", "papers")
KINDS = (("期中", "mid", "m"), ("期末", "final", "f"))


def clean_title(name):
    t = re.sub(r"\.pdf$", "", name, flags=re.I)
    t = re.sub(r"\s+", " ", t).strip()
    return re.sub(r"\s*(试题及答案|有答案|无答案|试题)\s*$", "", t).strip()


def has_answer(name):
    if re.search(r"有答案|试题及答案", name):
        return True
    if "无答案" in name:
        return False
    return None


def scan(src):
    rows = []
    for cn, key, short in KINDS:
        d = os.path.join(src, cn)
        if not os.path.isdir(d):
            continue
        for name in sorted(os.listdir(d)):
            if not name.lower().endswith(".pdf") or "数学" not in name:
                continue
            m = re.match(r"(20\d\d)", name)
            rows.append({
                "kind": key, "cn": cn, "short": short,
                "year": int(m.group(1)) if m else None,
                "file": name, "path": os.path.join(d, name),
                "hasAnswer": has_answer(name),
            })
    return rows


def load_old():
    if not os.path.exists(META):
        return {}
    try:
        with open(META, "r", encoding="utf-8") as fp:
            return {p["id"]: p for p in json.load(fp).get("papers", [])}
    except Exception:
        return {}


def write_index(papers):
    os.makedirs(OUT, exist_ok=True)
    payload = json.dumps({"papers": papers}, ensure_ascii=False, separators=(",", ":"))
    with open(os.path.join(OUT, "index.js"), "w", encoding="utf-8") as fp:
        fp.write("window.MC.put(\"papers\", " + payload + ");\n")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default=DEFAULT_SRC)
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--only", default="")
    ap.add_argument("--scale", type=float, default=2.6)
    ap.add_argument("--quality", type=int, default=80)
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--index", action="store_true", help="只按 content/papers/meta.json 重建 index.js，不重新渲染")
    args = ap.parse_args()

    if args.index:
        papers = sorted(load_old().values(), key=lambda p: (p.get("kind", ""), -(p.get("year") or 0), p["id"]))
        if not papers:
            print("content/papers/meta.json 里没有试卷，先跑一次渲染")
            return 1
        write_index(papers)
        print("按 meta.json 重建清单：%d 套" % len(papers))
        return 0

    if pdfium is None:
        print("需要 pypdfium2：python -m pip install pypdfium2 pillow", file=sys.stderr)
        return 1

    rows = scan(args.src)
    if args.only:
        want = set(x.strip() for x in args.only.split(","))
        rows = [r for r in rows if r["file"] in want]
    if args.limit:
        rows = rows[: args.limit]
    if not rows:
        print("没找到试卷 PDF，检查 --src（当前 %s）" % args.src)
        return 1

    old = load_old()
    seen = {}
    papers = []
    total_bytes = 0
    for r in rows:
        key = "%s-%s" % (r["kind"], r["year"])
        seen[key] = seen.get(key, 0) + 1
        pid = "%s%02d" % (r["short"] + str(r["year"])[2:], seen[key])
        title = clean_title(r["file"])
        region = ""
        mm = re.search(r"北京(.+?)初二", title)
        if mm:
            region = mm.group(1).strip()
        doc = pdfium.PdfDocument(r["path"])
        pages = len(doc)
        folder = os.path.join(SRC, pid)
        os.makedirs(folder, exist_ok=True)
        files = []
        for i in range(pages):
            fp = os.path.join(folder, "p%03d.webp" % (i + 1))
            if args.force or not os.path.exists(fp):
                img = doc[i].render(scale=args.scale).to_pil().convert("L")
                img.save(fp, "WEBP", quality=args.quality, method=4)
            files.append(os.path.basename(fp))
            total_bytes += os.path.getsize(fp)
        # 缩略图不在这里生成：这一步是原始渲染，图上还带着水印，「缩出来就是一张带水印的小图」
        # （用户 2026-11-19 报的就是这个）。thumb.webp 只由 tools/papers_clean.py 从去水印后的
        # 第一页生成 —— 谁要缩略图，跑完 clean 就有了。
        rec = dict(old.get(pid, {}))
        rec.update({
            "id": pid, "kind": r["kind"], "cn": r["cn"], "year": r["year"],
            "region": region, "title": title, "hasAnswer": r["hasAnswer"],
            "pages": pages, "files": files,
            "src": r["cn"] + "/" + r["file"],
        })
        for k, dv in (("qCount", None), ("fullMarks", None), ("minutes", None), ("bodyPages", None), ("note", "")):
            rec.setdefault(k, dv)
        papers.append(rec)
        print("%-8s %2d 页  %-44s 题量 %s" % (pid, pages, title[:44], rec["qCount"] or "?"))

    papers.sort(key=lambda x: (x["kind"], -(x["year"] or 0), x["id"]))
    os.makedirs(os.path.dirname(META), exist_ok=True)
    with open(META, "w", encoding="utf-8") as fp:
        json.dump({"papers": papers}, fp, ensure_ascii=False, indent=1)
    write_index(papers)
    print("")
    print("合计 %d 套 / %d 页 / %.1f MB" % (len(papers), sum(p["pages"] for p in papers), total_bytes / 1048576.0))
    print("清单 " + META)
    print("卷面 " + SRC)
    return 0


if __name__ == "__main__":
    sys.exit(main())
