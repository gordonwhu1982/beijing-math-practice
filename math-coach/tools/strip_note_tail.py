# -*- coding: utf-8 -*-
"""把答案尾部重复的「定理注/易错提醒」正文切掉（note 已单独存 answer_note）。

判定：answer_note 非空、且 answer 里能定位到 note 的前 15 个字符；
从该处切到结尾，仅当切完 $ 仍成对且剩余长度 ≥ 原长 40% 才执行。
用法: python tools/strip_note_tail.py [--apply]
"""
import json, os, io, sys, re
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
REPO = os.environ.get("MC_REPO", r"D:/个人/知识图谱/math-coach")
PATH = os.path.join(REPO, "content", "questions", "801", "ch12.jsonl")
APPLY = "--apply" in sys.argv

rows = [json.loads(l) for l in open(PATH, encoding="utf-8")]
done, skipped = [], []
for q in rows:
    ans = q.get("answer") or ""
    note = (q.get("answer_note") or "").strip()
    if not ans or not note:
        continue
    key = note[:15]
    i = ans.find(key)
    if i < 0:
        continue
    cut = ans[:i].rstrip()
    tail = ans[i:]
    # note 只应是尾部（允许尾部残留少量标点/空白差异）
    if len(tail) < len(note) * 0.6:
        skipped.append((q["id"], "尾部不足")); continue
    if len(cut) < len(ans) * 0.4:
        skipped.append((q["id"], "切太多")); continue
    if cut.count("$") % 2:
        skipped.append((q["id"], "$ 不成对")); continue
    if not cut:
        skipped.append((q["id"], "切空")); continue
    q["answer"] = cut
    done.append((q["id"], len(ans), len(cut)))

print("切掉尾部定理注正文 %d 道；跳过 %d 道" % (len(done), len(skipped)))
for d in done[:8]:
    print("   %s %d → %d 字" % d)
for s in skipped[:8]:
    print("   跳过 %s（%s）" % s)
if APPLY:
    with open(PATH, "w", encoding="utf-8", newline="\n") as f:
        for q in rows:
            f.write(json.dumps(q, ensure_ascii=False) + "\n")
    print("已写入", PATH)
else:
    print("（未改动；加 --apply 落盘）")
