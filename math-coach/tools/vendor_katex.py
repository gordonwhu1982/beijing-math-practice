# -*- coding: utf-8 -*-
"""把 KaTeX（MIT）本地 vendor 进 assets/vendor/katex/，并自检字体引用齐全。

为什么要 vendor：题目正文 987/1128 含 $ 数学式，浏览器离线可用、不依赖 CDN。
只用 woff2（css 里 woff2 优先），并把缺失字体的 url 记入报告。
"""
import os, io, sys, re, json, urllib.request
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
VER = os.environ.get("KATEX_VER", "0.16.11")
REPO = os.environ.get("MC_REPO", r"D:/个人/知识图谱/math-coach")
DST = os.path.join(REPO, "assets", "vendor", "katex")
BASE = "https://cdn.jsdelivr.net/npm/katex@" + VER + "/dist/"
os.makedirs(os.path.join(DST, "fonts"), exist_ok=True)

def get(rel, dest=None, timeout=60):
    url = BASE + rel
    req = urllib.request.Request(url, headers={"User-Agent": "math-coach-vendor/1"})
    with urllib.request.urlopen(req, timeout=timeout) as r:
        data = r.read()
    p = dest or os.path.join(DST, rel)
    os.makedirs(os.path.dirname(p), exist_ok=True)
    open(p, "wb").write(data)
    return len(data)

size_js = get("katex.min.js")
size_css = get("katex.min.css")
css = open(os.path.join(DST, "katex.min.css"), encoding="utf-8").read()

# css 里所有 url(fonts/xxx.woff2) 引用
refs = sorted(set(re.findall(r"fonts/([A-Za-z0-9_\-]+\.woff2)", css)))
missing, total = [], 0
for name in refs:
    p = os.path.join(DST, "fonts", name)
    if os.path.exists(p):
        continue
    try:
        total += get("fonts/" + name)
    except Exception as e:
        missing.append((name, repr(e)))
# 许可与版本
try:
    url = "https://cdn.jsdelivr.net/npm/katex@" + VER + "/LICENSE"
    req = urllib.request.Request(url, headers={"User-Agent": "math-coach-vendor/1"})
    with urllib.request.urlopen(req, timeout=60) as r:
        open(os.path.join(DST, "LICENSE"), "wb").write(r.read())
except Exception as e:
    missing.append(("LICENSE", repr(e)))

readme = ["# KaTeX（本地 vendor）", "",
          "- 版本：" + VER, "- 来源：https://cdn.jsdelivr.net/npm/katex@" + VER + "/dist/",
          "- 许可：MIT（见同目录 LICENSE）", "- 只取 katex.min.js / katex.min.css / fonts/*.woff2",
          "", "字体文件 " + str(len(refs)) + " 个，本次新下载 " + str(total) + " 字节；缺失 " + str(len(missing)) + " 个。", ""]
open(os.path.join(DST, "README.md"), "w", encoding="utf-8", newline="\n").write("\n".join(readme))
print("js %d bytes, css %d bytes, 字体引用 %d 个，新下载 %d 字节，缺失 %d" % (size_js, size_css, len(refs), total, len(missing)))
for m in missing:
    print("  ! 缺", m)
