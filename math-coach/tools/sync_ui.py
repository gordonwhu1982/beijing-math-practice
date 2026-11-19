#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""把 ux-v2 的界面同步到三处运行入口，一处改、三处一致。

为什么要有这个脚本：design/ux-v2/app 是设计稿的活水，runtime/web 是产品版，
design/ux-redesign/prototype 是冻结基准，beijing-math-practice 是公开仓里的镜像。
四份同一个界面，靠手工复制必然有一份是旧的（2026-11-19 就是这么发现 runtime/web
还停在 js/views 模块化架构上的）。

用法：
    python tools/sync_ui.py                 # 同步本地两处（dry-run 打印将改什么）
    python tools/sync_ui.py --write         # 真的写
    python tools/sync_ui.py --write --remote  # 连公开仓镜像一起同步
    python tools/sync_ui.py --ver 20261119sync2   # 指定缓存串（默认取 UTC 时间）

每个目标的差异只有两处，别再加：
  DATA_ROOT  设计稿读 ../../../runtime/web/data/；产品版与镜像 runtime/web 读 data/
  index.html 设计稿/基准用 ../../../ 前缀；runtime/web 用 js/ 与 data/、../../assets/
"""
import argparse
import re
import datetime
import os
import sys
try:
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
except Exception:
    pass

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(REPO, "design", "ux-v2", "app")
REMOTE = r"D:\个人\知识图谱\beijing-math-practice"

DATA_ROOT_DESIGN = 'const DATA_ROOT = "../../../runtime/web/data/";'
DATA_ROOT_SELF = 'const DATA_ROOT = "data/";'


def source_ver():
    """缓存串默认沿用设计稿 index.html 里那一个 —— 四处必须同串，否则同一个界面在
    不同目录下浏览器缓存行为不一致，改了看不见时又要查半天。改界面时改设计稿的 v=。"""
    try:
        m = re.search(r"app\.js\?v=([A-Za-z0-9]+)", read(os.path.join(SRC, "index.html")))
        return m.group(1) if m else None
    except OSError:
        return None


def read(p):
    with open(p, "rb") as f:
        return f.read().decode("utf-8")


def write(p, s):
    os.makedirs(os.path.dirname(p), exist_ok=True)
    with open(p, "wb") as f:
        f.write(s.encode("utf-8"))


def bust_index(text, ver):
    out = text
    for name in ("app.css", "app.js"):
        # 只换 v= 的值，不动别的查询串
        import re
        out = re.sub(re.escape(name) + r"\?v=[A-Za-z0-9]+", name + "?v=" + ver, out)
    return out


def variant(text, name, mode, ver):
    """mode: 'design' 原样 | 'self' 产品版（app.js 的 DATA_ROOT 改 data/，index.html 去前缀）。
    只对 app.js 换 DATA_ROOT、只对 index.html 换路径：app.css 里两者都不存在，一视同仁地替换
    会在 app.css 上报「找不到 DATA_ROOT」，那是判断错了文件，不是文件改了写法。"""
    if mode == "self":
        if name == "app.js":
            if DATA_ROOT_DESIGN not in text:
                raise SystemExit("app.js 里找不到 DATA_ROOT 那行，先看文件是不是换了写法")
            text = text.replace(DATA_ROOT_DESIGN, DATA_ROOT_SELF)
        elif name == "index.html":
            text = text.replace('"../../../runtime/web/', '"').replace('"../../../assets/', '"../../assets/')
    return bust_index(text, ver)


TARGETS = [
    # label, 目录, app.js 模式
    ("产品版 runtime/web", os.path.join(REPO, "runtime", "web"), "self"),
    ("冻结基准 prototype", os.path.join(REPO, "design", "ux-redesign", "prototype"), "design"),
]
REMOTE_TARGETS = [
    ("公开仓 prototype", os.path.join(REMOTE, "math-coach", "design", "ux-redesign", "prototype"), "design"),
    ("公开仓 runtime/web", os.path.join(REMOTE, "math-coach", "runtime", "web"), "self"),
]

# 只有这三件是界面的全部；js/core.js、js/state.js 设计稿与产品版本来就同一份
FILES = ("app.js", "app.css", "index.html")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true", help="真的写盘（默认只打印差异）")
    ap.add_argument("--remote", action="store_true", help="连 beijing-math-practice 镜像一起同步")
    ap.add_argument("--ver", default=None, help="缓存串，默认用 UTC 时间")
    args = ap.parse_args()
    ver = args.ver or source_ver() or datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%d%H%M")

    targets = TARGETS + (REMOTE_TARGETS if args.remote else [])
    changed = 0
    for label, root, mode in targets:
        if not os.path.isdir(root):
            print("[跳过] %s：目录不存在 %s" % (label, root))
            continue
        for name in FILES:
            src = read(os.path.join(SRC, name))
            dst = variant(src, name, mode, ver)
            path = os.path.join(root, name)
            old = read(path) if os.path.isfile(path) else None
            if old == dst:
                print("[同] %s / %s" % (label, name))
                continue
            changed += 1
            delta = ("新文件" if old is None else "%+d 字节" % (len(dst.encode("utf-8")) - len(old.encode("utf-8"))))
            print("[改] %s / %s  %s" % (label, name, delta))
            if args.write:
                write(path, dst)
    # 产品版与镜像还要 core.js / state.js（新架构的依赖，设计稿那份就是源头）
    for label, root, mode in targets:
        if mode != "self" or not os.path.isdir(root):
            continue
        for name in ("core.js", "state.js"):
            path = os.path.join(root, "js", name)
            srcp = os.path.join(SRC, "js", name)
            src = read(srcp)
            old = read(path) if os.path.isfile(path) else None
            if old == src:
                print("[同] %s / js/%s" % (label, name))
                continue
            changed += 1
            print("[改] %s / js/%s  %s" % (label, name, "新文件" if old is None else "%+d 字节" % (len(src.encode('utf-8')) - len(old.encode('utf-8')))))
            if args.write:
                write(path, src)
    print("\n%s：%d 个文件有差异" % ("已写入" if args.write else "dry-run", changed))
    if not args.write:
        print("加 --write 才真的写。")
    return 0


if __name__ == "__main__":
    sys.exit(main())
