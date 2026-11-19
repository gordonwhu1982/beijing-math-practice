# -*- coding: utf-8 -*-
"""定试卷的「卷面页 / 答案页」边界（bodyPages）。

为什么需要它：31 套卷子的页脚「共 M 页」与真实卷面页数不是一回事（实测 m2403
的 p7 就是「参考答案」，页脚却写共 22 页），缩略图目测也会漏（答案首页常是
「答案表 + 评分标准」的表格页，看着像卷面）。所以只能逐页 OCR 找答案首页。

判据（两道）：
  1. 页面上出现答案标记词（【答案】/【分析】/【详解】/【解答】/参考答案/参考案/
     答案及评标/答案与评分/答案与解析）；
  2. 该标记出现在页面顶部 45% 以内 —— 答案页的标题/首答总在上半页，卷面页里
     「参考答案见第 X 页」这类小字在下半页或页脚，光看词会误判（实测 m2504）。

用法：
  python tools/papers_ocr.py              # 全量扫描 + 写回 meta 与 index，打印改动
  python tools/papers_ocr.py --dry        # 只打印，不写
第一次全量约 60 分钟（640 宽每页 ~2s，命中即停）；--recheck 只复验已定的边界页，约 2 分钟。
"""
import io
import json
import os
import sys

import numpy as np
from PIL import Image
from rapidocr_onnxruntime import RapidOCR

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
META = os.path.join(ROOT, "content", "papers", "meta.json")
INDEX = os.path.join(ROOT, "runtime", "web", "data", "papers", "index.js")
KEYS = ["【答案】", "【分析】", "【详解】", "【解答】", "参考答案", "参考案",
        "答案及评标", "答案与评分", "答案与解析"]
TOP_SHARE = 0.45

_ocr = RapidOCR()


def page_hits(pid, files, pg):
    """返回这一页命中的标记词与相对位置（0=页顶，1=页底）。"""
    path = os.path.join(ROOT, "runtime", "web", "data", "papers", pid, files[pg - 1])
    im = Image.open(path).convert("RGB")
    w = 640
    im = im.resize((w, int(im.height * w / im.width)))
    res, _ = _ocr(np.array(im))
    hits = []
    for box, txt, _score in (res or []):
        for k in KEYS:
            if k in txt:
                top = min(pt[1] for pt in box) / im.height
                hits.append({"k": k, "y": round(top, 2), "t": txt[:30]})
                break
    return hits


def scan(paper):
    """逐页往后扫，第一个「标记在页顶」的页就是答案首页。"""
    files = paper["files"]
    for pg in range(2, len(files) + 1):
        hits = page_hits(paper["id"], files, pg)
        if any(h["y"] <= TOP_SHARE for h in hits):
            return pg
    return None


def main():
    dry = "--dry" in sys.argv
    recheck = "--recheck" in sys.argv
    meta = json.load(io.open(META, encoding="utf-8"))
    rows = meta["papers"]
    changed, missing = [], []
    for p in rows:
        if not p.get("hasAnswer"):
            continue
        if recheck:
            bp = p.get("bodyPages")
            if not bp or bp + 1 > len(p["files"]):
                continue
            hits = page_hits(p["id"], p["files"], bp + 1)
            if any(h["y"] <= TOP_SHARE for h in hits):
                continue
        fa = scan(p)
        if not fa:
            missing.append(p["id"])
            continue
        bp = fa - 1
        if p.get("bodyPages") != bp or p.get("bodyFrom") != "ocr":
            changed.append((p["id"], p.get("bodyPages"), bp))
        p["bodyPages"] = bp
        p["bodyFrom"] = "ocr"
        print(p["id"], "first_ans", fa, "bodyPages", bp, flush=True)
    print("changed", len(changed), "missing", missing)
    if dry:
        return
    io.open(META, "w", encoding="utf-8", newline="\n").write(
        json.dumps(meta, ensure_ascii=False, indent=1))
    js = "window.MC.put(\"papers\", " + json.dumps(
        {"papers": rows}, ensure_ascii=False, separators=(",", ":")) + ")\n"
    io.open(INDEX, "w", encoding="utf-8", newline="\n").write(js)
    print("wrote meta + index")


if __name__ == "__main__":
    main()
