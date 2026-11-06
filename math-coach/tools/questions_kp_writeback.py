# -*- coding: utf-8 -*-
"""把 build/questions/kp_map.jsonl 里高置信（auto）的题→知识点映射写成侧挂文件。

为什么不直接改 ch12.jsonl：题目本体是教材抽取 + 人工补答案的产物，改动一行就要重跑
全套闸门；映射是「派生结论」，用侧挂文件（与 ch12.answer.jsonl 同构）承载，
既能逐条 diff 评审，也能整体丢弃重算。

只写 auto 档：词表法在「题干数字密集、方法靠答案算」的题上有天花板，
金标准抽检 29 条严格正确 25 条（86.2%），其余档一律留人工确认，不进权威层。

用法：
  python tools/questions_kp_writeback.py            # 写侧挂文件
  python tools/questions_kp_writeback.py --dry-run  # 只看统计
"""
import argparse
import json
import os
import sys
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding="utf-8")
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MAP = os.path.join(REPO, "build", "questions", "kp_map.jsonl")
QROOT = os.path.join(REPO, "content", "questions")
GEN = "tools/questions_kp_writeback.py"


def read_jsonl(p):
    out = []
    with open(p, encoding="utf-8") as f:
        for ln in f:
            ln = ln.strip()
            if ln:
                out.append(json.loads(ln))
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if not os.path.exists(MAP):
        sys.exit("缺 %s，先跑 python tools/questions_kp_map.py" % MAP)

    # 题号 -> (册, 章)，章从 id 前缀或 chapter_no 取；侧挂文件按册章分文件
    where = {}
    for vol in sorted(os.listdir(QROOT)):
        vdir = os.path.join(QROOT, vol)
        if not os.path.isdir(vdir):
            continue
        for fn in sorted(os.listdir(vdir)):
            if not fn.endswith(".jsonl") or fn.count(".") > 1:  # 跳过 *.answer.jsonl / *.spec.jsonl
                continue
            for q in read_jsonl(os.path.join(vdir, fn)):
                ch = q.get("chapter_no")
                if ch is None:
                    head = (q.get("id") or "").split("_")[0]
                    ch = head.split(".")[0] if head else None
                where[q.get("id")] = (vol, str(ch) if ch is not None else "00")

    rows = defaultdict(list)
    stat = Counter()
    miss = []
    for m in read_jsonl(MAP):
        if m.get("status") != "auto":
            stat[m.get("status")] += 1
            continue
        qid = m["qid"]
        top = (m.get("kp") or [None])[0]
        if not top or top.get("id") is None:
            stat["auto_no_top"] += 1
            continue
        loc = where.get(qid)
        if not loc:
            miss.append(qid)
            continue
        vol, ch = loc
        rows[(vol, ch)].append({
            "uid": qid,
            "kp_tags": [{"kp_uid": top["id"], "role": "primary", "weight": round(float(top["score"]), 2)}],
            "basis": {
                "method": "term-dict-2gram",
                "evidence": m.get("evidence") or [],
                "score": round(float(top["score"]), 2),
                "lead": round(float(m.get("lead") or 0), 2),
            },
            "review_status": "ai_draft",
            "generated_by": GEN,
        })
        stat["auto"] += 1

    if miss:
        sys.stderr.write("映射里的题在题库找不到 %d 条：%s\n" % (len(miss), miss[:8]))

    total = 0
    for (vol, ch), rs in sorted(rows.items()):
        rs.sort(key=lambda r: r["uid"])
        out = os.path.join(QROOT, vol, "ch%s.kp.jsonl" % ch)
        total += len(rs)
        print("%-14s %4d 条" % (os.path.relpath(out, REPO), len(rs)))
        if args.dry_run:
            continue
        with open(out, "w", encoding="utf-8", newline="\n") as f:
            for r in rs:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print("写出 %d 条 auto 映射（%s）" % (total, "dry-run" if args.dry_run else "已落盘"))
    print("未写回的档：" + ", ".join("%s=%d" % (k, v) for k, v in sorted(stat.items()) if k != "auto"))


if __name__ == "__main__":
    main()
