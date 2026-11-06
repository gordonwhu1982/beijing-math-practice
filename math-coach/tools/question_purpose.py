# -*- coding: utf-8 -*-
"""题目用途（purpose）标注：只写有证据的，没证据就不写。

参考产品在教材页把例题/情境分成五类（定义 / 情境 / 例题 / 方法应用 / 方法对照），
它的底气来自教案里的人工标注。我们没有教案标注，只有题目自带的来源、题型和
「题→知识点→方法」这条派生链。所以这里的原则是：**能指出来源的才标，标不出的
留空**，前端显示「用途未标」而不是猜一个。

五类的判据（按优先级，命中即停）：
  method_contrast  题干明确要求两种解法或比较解法 —— 正则
  definition       概念辨析型（「下列说法…」+ 选择/填空）
  example          教材原题（qtag_source=教材习题 或 source.of 指向教材）
  method_apply     有题→知识点标签，且该知识点挂了方法（可沿链回指）
  context          现实情境（购物/速度/工程/浓度…）且题干够长

用法：
  python tools/question_purpose.py --dry-run
  python tools/question_purpose.py
"""
import argparse
import json
import os
import re
import sys
from collections import Counter, defaultdict

sys.stdout.reconfigure(encoding="utf-8")
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QROOT = os.path.join(REPO, "content", "questions")
EDGES = os.path.join(REPO, "content", "relations", "edges.jsonl")
GEN = "tools/question_purpose.py"

CONTRAST = re.compile(r"两种方法|两种解法|两种思路|不同的方法|哪种方法|比较两种|方法更")
DEFINITION = re.compile(r"下列说法|下列各式|下列判断|下列结论|下列各式中|概念|叫做|是不是|正确的有|错误的")
CONTEXT = re.compile(r"购物|买|售价|原价|打折|商店|速度|路程|工程|效率|浓度|利率|面积|周长|体积|"
                     r"每天|每小时|分钟|千克|箱|班|同学|测得|测量|运费|水位|气温")

PURPOSES = ("method_contrast", "definition", "example", "method_apply", "context")


def srcs(q):
    """来源串：source 可能是 dict（含 of 字段）也可能是字符串，两种都要看。"""
    s = q.get("source")
    return s if isinstance(s, str) else json.dumps(s or {}, ensure_ascii=False)


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

    # 方法边与知识点名：用于「这题训练哪个方法」的回指证据
    kp_skill = defaultdict(list)
    for e in read_jsonl(EDGES):
        if e["relation"] == "applies_to":
            kp_skill[e["dst"]].append(e["src"])

    skills, kps = {}, {}
    for vol in sorted(os.listdir(os.path.join(REPO, "content", "skills"))):
        d = os.path.join(REPO, "content", "skills", vol)
        if not os.path.isdir(d):
            continue
        for fn in sorted(os.listdir(d)):
            if fn.endswith(".jsonl"):
                for s in read_jsonl(os.path.join(d, fn)):
                    skills[s["uid"]] = s.get("name") or ""
    for vol in sorted(os.listdir(os.path.join(REPO, "content", "framework"))):
        d = os.path.join(REPO, "content", "framework", vol)
        if not os.path.isdir(d):
            continue
        for fn in sorted(os.listdir(d)):
            if fn.endswith(".jsonl"):
                for k in read_jsonl(os.path.join(d, fn)):
                    kps[k.get("uid") or k.get("id")] = k.get("name") or k.get("title") or ""

    rows = defaultdict(list)
    stat = Counter()
    by_purpose = Counter()

    for vol in sorted(os.listdir(QROOT)):
        vdir = os.path.join(QROOT, vol)
        if not os.path.isdir(vdir):
            continue
        files = [f for f in sorted(os.listdir(vdir))
                 if f.endswith(".jsonl") and f.count(".") == 1]
        for fn in files:
            ch = fn[:-6]
            qs = read_jsonl(os.path.join(vdir, fn))
            tags = {}
            tp = os.path.join(vdir, "ch%s.kp.jsonl" % ch.replace("ch", ""))
            if os.path.exists(tp):
                for r in read_jsonl(tp):
                    tags[r["uid"]] = r
            for q in qs:
                qid = q.get("id")
                stem = q.get("stem") or ""
                pur = why = rule = None

                if CONTRAST.search(stem):
                    pur, rule = "method_contrast", "题干明说要多解/比较解法"
                    why = "题干要求两种以上做法，用途是比较解法而不是练一种"
                elif DEFINITION.search(stem) and q.get("form") in ("choice", "fill"):
                    pur, rule = "definition", "概念辨析正则 + 选择/填空"
                    why = "题干在辨析概念的正误，训练的是定义边界"
                elif q.get("qtag_source") == "教材习题" or "教材" in srcs(q):
                    pur, rule = "example", "教材原题"
                    why = "教材原题，用来对照课本要求与本校练习的落点"
                else:
                    tag = tags.get(qid)
                    hits = []
                    if tag:
                        for t in tag.get("kp_tags") or []:
                            for sid in kp_skill.get(t.get("kp_uid"), []):
                                hits.append((t.get("kp_uid"), sid))
                    if hits:
                        kid, sid = hits[0]
                        pur, rule = "method_apply", "题→知识点→方法 派生链"
                        kn = kps.get(kid) or ""
                        why = "训练方法「%s」" % skills.get(sid, sid) + ("；本节知识点是「%s」" % kn if kn else "")
                    elif CONTEXT.search(stem) and len(stem) >= 40:
                        pur, rule = "context", "情境词 + 题干长度"
                        why = "把知识放进现实情境，训练的是建模与读懂条件"

                if not pur:
                    stat["未标（无证据）"] += 1
                    continue
                stat[pur] += 1
                by_purpose[pur] += 1
                rows[(vol, ch)].append({
                    "uid": qid,
                    "purpose": pur,
                    "why": why,
                    "rule": rule,
                    "review_status": "ai_draft",
                    "generated_by": GEN,
                })

    total = 0
    for (vol, ch), rs in sorted(rows.items()):
        rs.sort(key=lambda r: r["uid"])
        out = os.path.join(QROOT, vol, "ch%s.meta.jsonl" % ch.replace("ch", ""))
        total += len(rs)
        print("%-34s %4d 条" % (os.path.relpath(out, REPO), len(rs)))
        if args.dry_run:
            continue
        with open(out, "w", encoding="utf-8", newline="\n") as f:
            for r in rs:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
    print("五类分布：" + ", ".join("%s=%d" % (k, by_purpose[k]) for k in PURPOSES if by_purpose[k]))
    print("已标 %d 条 / 未标 %d 条（%s）" % (total, stat["未标（无证据）"], "dry-run" if args.dry_run else "已落盘"))


if __name__ == "__main__":
    main()
