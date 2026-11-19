#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把纸面卷降成「可做的卷」：去水印、去掉末页平台广告、记下每页版面指标。

为什么是图不是字：49 套里 46 套是扫描件（pypdf/pdfium 实测每页 0 字符），没有
文字层。OCR 会把根号、分式、几何图读成噪声，题面一旦文本化就不可信。所以题面
仍然是图，但图要干净：

  · 水印（「北京高考在线 微信公众号：bjgkzx」斜排半透明白字）压在题干与选项上，
    读者会以为是印刷符号；
  · 卷尾那张「平台简介」页混在卷里，翻到会以为是自己漏了页。

去水印不是调亮度：水印是**大块平坦灰**（208 上下），题目墨是 37 上下，抗锯齿
边缘在中间。所以判据是「5×5 中值仍是灰、且与自身差很小」——细笔画的 5×5 中值
会被周围纸白拉高，不会被删；水印的大块平坦区会被删干净。

产物（runtime/web/data/papers/<id>/，gitignore）：
  p%03d.webp   去水印后的卷面页（广告页不再导出）
产物（进仓）：
  content/papers/meta.json              files / pages / dropped 重算
  content/papers/ad-template.webp       末页广告的版式指纹（自举自真实页）
  out/papers_clean_stats.json           每页版面指标，给 bodyPages 判定用

用法：
  python tools/papers_clean.py --limit 2 --verbose
  python tools/papers_clean.py --only "2026北京海淀初二（上）期末数学   有答案.pdf"
  python tools/papers_clean.py                     # 全量，约 40 分钟
"""
import argparse
import io
import json
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")

import numpy as np
from PIL import Image, ImageFilter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import papers_build as pb

try:
    from scipy import ndimage
except ImportError:  # 可选：只用来补「水印压在黑图案上」的残留
    ndimage = None

REPO = pb.REPO
TPL = os.path.join(REPO, "content", "papers", "ad-template.webp")
STATS = os.path.join(REPO, "out", "papers_clean_stats.json")
AD_CORR = 0.6      # 末页与该平台页的相关度；实测同版式 1.000 / 改版 0.728 / 干扰页 0.511
AD_TAIL = 3        # 只在最后三页里认，广告永远在卷尾


def sig(im, size=40):
    a = np.asarray(im.convert("L").resize((size, size), Image.LANCZOS)).astype(np.float32)
    a -= a.mean()
    return a / (a.std() + 1e-6)


def ad_score(im, tpl):
    return float((sig(im) * tpl).mean())


def dewatermark(im, ink_fix=True):
    """返回 (去水印后的 L 图, 被删像素数, 补墨像素数)。"""
    a = np.asarray(im).astype(np.int16)
    med = np.asarray(im.filter(ImageFilter.MedianFilter(5))).astype(np.int16)
    wm = (med >= 182) & (med <= 240) & (np.abs(a - med) <= 14)
    n_wm = int(wm.sum())
    out = a.copy()
    out[wm] = 255
    # 水印边缘那一圈是灰→白的过渡，判据抓不住，用「已判水印的邻域 + 仍然偏灰」兜住
    ring = Image.fromarray((wm * 255).astype(np.uint8)).filter(ImageFilter.MaxFilter(9))
    rb = np.asarray(ring) > 0
    out[rb & (a >= 200)] = 255
    # 水印压住黑图案时会留下灰纹（剪影里的人形、图表粗线）。补墨**默认关闭**：
    # 「墨块内部」这个判据分不清「水印冲淡的墨」与「图案自己的浅色块/留白」，
    # 实跑 m2401 第 1 页把标题、选项、图形条纹理一起填黑，补了 159 万 px（占整页 23%）。
    # 灰纹只在水印压在粗黑图案时出现，看着像印刷瑕疵，不影响读题 —— 比补坏划算。
    n_ink = 0
    if ink_fix and ndimage is not None and wm.any():
        ink = a < 150
        solid = ndimage.binary_fill_holes(ndimage.binary_closing(ink, np.ones((7, 7))))
        hole = solid & ~ink & rb & (a >= 150)
        n_ink = int(hole.sum())
        if n_ink:
            out[hole] = 30
    return Image.fromarray(out.astype(np.uint8)), n_wm, n_ink


def page_metrics(arr):
    """黑像素占比与水平线数量：答案页开始那一页通常有答题表格与密集单栏文字。"""
    g = arr
    ink = g < 128
    dens = float(ink.mean())
    rows = ((ink.sum(axis=1) / max(1, g.shape[1])) > 0.55)
    # 连续为「线」的行段数
    lines = int(np.sum(rows[1:] & ~rows[:-1]))
    return dens, lines


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    ap.add_argument("--limit", type=int, default=0)
    ap.add_argument("--scale", type=float, default=2.6)
    ap.add_argument("--quality", type=int, default=82)
    ap.add_argument("--ink", action="store_true", help="补「水印压在黑图案上」的残留（默认关，见下方注释）")
    ap.add_argument("--verbose", action="store_true")
    args = ap.parse_args()

    if pb.pdfium is None:
        print("需要 pypdfium2：python -m pip install pypdfium2 pillow", file=sys.stderr)
        return 1

    tpl_img = Image.open(TPL)
    tpl = sig(tpl_img)

    rows = pb.scan(pb.DEFAULT_SRC)
    if args.only:
        want = set(x.strip() for x in args.only.split(","))
        rows = [r for r in rows if r["file"] in want]
    if args.limit:
        rows = rows[: args.limit]
    if not rows:
        print("没找到试卷 PDF")
        return 1

    old = pb.load_old()
    seen = {}
    papers = []
    all_stats = {}
    for r in rows:
        key = "%s-%s" % (r["kind"], r["year"])
        seen[key] = seen.get(key, 0) + 1
        pid = "%s%02d" % (r["short"] + str(r["year"])[2:], seen[key])
        folder = os.path.join(pb.OUT, pid)
        os.makedirs(folder, exist_ok=True)
        doc = pb.pdfium.PdfDocument(r["path"])
        n = len(doc)
        files, dropped, stats = [], [], []
        for i in range(n):
            im = doc[i].render(scale=args.scale).to_pil().convert("L")
            dens, lines = page_metrics(np.asarray(im))
            corr = ad_score(im, tpl) if i >= n - AD_TAIL else None
            rec = {"page": i + 1, "dens": round(dens, 4), "lines": lines}
            if corr is not None:
                rec["ad"] = round(corr, 3)
            if corr is not None and corr >= AD_CORR:
                dropped.append(i + 1)
                stats.append(rec)
                if args.verbose:
                    print("  第 %d 页是平台广告（相关度 %.3f），不导出" % (i + 1, corr))
                continue
            clean, n_wm, n_ink = dewatermark(im, ink_fix=args.ink)
            rec["wm"] = n_wm
            rec["ink"] = n_ink
            fp = os.path.join(folder, "p%03d.webp" % (i + 1))
            clean.save(fp, "WEBP", quality=args.quality, method=6)
            files.append(os.path.basename(fp))
            stats.append(rec)
        thumb = os.path.join(folder, "thumb.webp")
        first = doc[0].render(scale=1.0).to_pil().convert("L")
        w = 300
        first.resize((w, max(1, int(first.height * w / first.width)))).save(thumb, "WEBP", quality=70, method=4)
        rec = dict(old.get(pid, {}))
        rec.update({
            "id": pid, "kind": r["kind"], "cn": r["cn"], "year": r["year"],
            "region": re_region(r["file"]), "title": pb.clean_title(r["file"]),
            "hasAnswer": r["hasAnswer"], "pages": n, "files": files,
            "dropped": dropped, "src": r["cn"] + "/" + r["file"],
        })
        for k, dv in (("qCount", None), ("fullMarks", None), ("minutes", None), ("bodyPages", None), ("note", "")):
            rec.setdefault(k, dv)
        papers.append(rec)
        all_stats[pid] = stats
        print("%-8s %2d 页 → %2d 页  去水印 %5d 万px  补墨 %4d px  广告页 %s"
              % (pid, n, len(files), sum(s.get("wm", 0) for s in stats) // 10000,
                 sum(s.get("ink", 0) for s in stats), dropped or "-"))

    papers.sort(key=lambda x: (x["kind"], -(x["year"] or 0), x["id"]))
    with io.open(pb.META, "w", encoding="utf-8", newline="\n") as fp:
        json.dump({"papers": papers}, fp, ensure_ascii=False, indent=1)
    pb.write_index(papers)
    with io.open(STATS, "w", encoding="utf-8", newline="\n") as fp:
        json.dump(all_stats, fp, ensure_ascii=False)
    print("")
    print("清单 %s" % pb.META)
    print("指标 %s" % STATS)
    print("合计 %d 套 / %d 页" % (len(papers), sum(len(p["files"]) for p in papers)))
    return 0


def re_region(name):
    import re
    t = pb.clean_title(name)
    mm = re.search(r"北京(.+?)初二", t)
    return mm.group(1).strip() if mm else ""


if __name__ == "__main__":
    sys.exit(main())
