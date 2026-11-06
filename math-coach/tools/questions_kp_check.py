# -*- coding: utf-8 -*-
"""校验题→知识点映射侧挂文件（content/questions/<册>/ch<章>.kp.jsonl）。

四类错必须拦住：
  1. uid 在题库里找不到（题被删了，映射成了孤儿）；
  2. kp_uid 在框架里找不到（写成旧编号或笔误）；
  3. 一道题不是恰有一个 primary（前端「这题考」只认 primary）；
  4. weight / review_status 缺失（写回必须带可追溯的置信度与审核状态）。

跑之前需要 build/framework/nodes.jsonl 与题库本体已在位，check_all.sh 里排在
「框架派生」「题库校验」之后。
"""
import glob
import json
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def read_jsonl(p):
    out = []
    with open(p, encoding="utf-8") as f:
        for ln in f:
            ln = ln.strip()
            if ln:
                out.append(json.loads(ln))
    return out


def main():
    root = os.path.join(REPO, "content", "questions")
    qids = set()
    for p in glob.glob(os.path.join(root, "**", "*.jsonl"), recursive=True):
        if not re.match(r"^ch[0-9]+\.jsonl$", os.path.basename(p)):
            continue
        qids |= {q.get("id") for q in read_jsonl(p)}

    kp_ids = set()
    nodes_p = os.path.join(REPO, "build", "framework", "nodes.jsonl")
    if os.path.exists(nodes_p):
        kp_ids = {n["id"] for n in read_jsonl(nodes_p) if n.get("kind") == "knowledge_point"}
    else:
        sys.exit("缺 build/framework/nodes.jsonl，先跑 python tools/framework_gen.py")

    errs = []
    files = sorted(glob.glob(os.path.join(root, "**", "*.kp.jsonl"), recursive=True))
    seen = {}
    n_row = 0
    for p in files:
        short = os.path.relpath(p, REPO)
        for i, r in enumerate(read_jsonl(p), 1):
            n_row += 1
            tag = "%s:%d" % (short, i)
            uid = r.get("uid")
            if uid not in qids:
                errs.append("%s 题号 %r 不在题库" % (tag, uid))
            if uid in seen:
                errs.append("%s 题号 %s 重复（另见 %s）" % (tag, uid, seen[uid]))
            seen[uid] = tag
            tags = r.get("kp_tags") or []
            if not tags:
                errs.append("%s kp_tags 为空" % tag)
            pri = [t for t in tags if t.get("role") == "primary"]
            if len(pri) != 1:
                errs.append("%s primary 有 %d 个（必须恰好 1 个）" % (tag, len(pri)))
            for t in tags:
                if t.get("kp_uid") not in kp_ids:
                    errs.append("%s kp_uid %r 不在框架知识点里" % (tag, t.get("kp_uid")))
                if t.get("role") not in ("primary", "secondary"):
                    errs.append("%s role %r 非法" % (tag, t.get("role")))
                if not isinstance(t.get("weight"), (int, float)) or t.get("weight") <= 0:
                    errs.append("%s weight %r 非法" % (tag, t.get("weight")))
            if not r.get("review_status"):
                errs.append("%s 缺 review_status" % tag)

    if not files:
        print("题→知识点映射侧挂：无文件（当前没有写回，属正常）")
        return 0

    # 切片落盘校验：映射写回了，前端却拿不到，等于没做。只数有答案、会进 items 的题。
    sec_dir = os.path.join(REPO, "runtime", "web", "data", "sec")
    if os.path.isdir(sec_dir):
        want = {r["uid"] for r in (x for p in files for x in read_jsonl(p))}
        got = 0
        for p in glob.glob(os.path.join(sec_dir, "*.items.js")):
            with open(p, encoding="utf-8") as f:
                got += f.read().count('"kps":[{"')
        print("切片里带知识点的题 %d 条（侧挂 %d 条，差额来自缺答案不进 items 的题）" % (got, len(want)))
    all_tags = [t for p in files for r in read_jsonl(p) for t in (r.get("kp_tags") or [])]
    print("题→知识点映射 %d 条（%d 个文件），指向 %d 个知识点"
          % (n_row, len(files), len({t["kp_uid"] for t in all_tags})))
    if errs:
        sys.stderr.write("映射错误 %d 处：\n%s\n" % (len(errs), "\n".join(errs[:20])))
        return 1
    print("映射错误 0 处")
    return 0


if __name__ == "__main__":
    sys.exit(main())
