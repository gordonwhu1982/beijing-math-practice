#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""给第 12 章题库的答案做形态分类：为什么自动判只有 9.2%，要提升该改哪一类。

输出：build/questions/answer_shapes.md 与 answer_shapes.json
"""
import json
import os
import re
import sys
from collections import Counter

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

REPO = os.environ.get("MC_REPO", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(REPO, "content", "questions", "801", "ch12.jsonl")
PREP = os.path.join(REPO, "build", "questions", "judge_prep.json")
OUTDIR = os.path.join(REPO, "build", "questions")

TEX_NUM = re.compile(r"\d+(?:\.\d+)?")


def strip_tex(s):
    s = re.sub(r"\\text\{[^}]*\}", "", s or "")
    s = re.sub(r"\\(frac|dfrac|tfrac)\{([^{}]*)\}\{([^{}]*)\}", r"\2/\3", s)
    s = re.sub(r"\\[a-zA-Z]+", "", s)
    return s


def conclusion(ans):
    """取结论段：优先最后一句含「答案/所以/故/因此/即/综上」的句子，否则最后一句。"""
    a = (ans or "").replace("\n", " ")
    parts = [x.strip() for x in re.split(r"(?<=[。！？；])", a) if x.strip()]
    if not parts:
        return a.strip()
    for seg in reversed(parts):
        if re.search(r"(答案|所以|故|因此|即|综上|从而|可得)", seg) and len(seg) <= 120:
            return seg
    tail = parts[-1]
    return tail if len(tail) <= 160 else a[-160:]


def shape(ans):
    a = (ans or "").strip()
    if not a:
        return "empty", set()
    t = strip_tex(conclusion(a))
    tags = set()
    if "$" in a:
        tags.add("has_tex")
    if re.search(r"\\frac", a):
        tags.add("frac")
    if re.search(r"\d+\s*°|\^\\circ|度", a):
        tags.add("degree")
    if re.search(r"(cm|厘米|米|平方米|平方厘米)", a):
        tags.add("unit")
    if re.search(r"(证明|证毕|略|作图|画出|保留作图痕迹)", a):
        return "proof_or_drawing", tags | {"proof"}
    nums_all = TEX_NUM.findall(t)
    if re.search(r"(全等|相似|平行|垂直|等腰|等边|直角|能|不能|成立|不成立)", a) and len(nums_all) <= 1:
        return "yes_no_concept", tags | {"concept"}
    eqs = re.findall(r"[a-zA-Z]\s*(?:=|约等于)\s*[-+]?\d+(?:\.\d+)?", t)
    if len(eqs) >= 2:
        return "multi_equation", tags | {"equation"}
    if len(eqs) == 1:
        return "single_equation", tags | {"equation"}
    if len(nums_all) == 0:
        return "no_number", tags
    if len(nums_all) == 1:
        return "single_number", tags
    if len(nums_all) <= 6:
        return "few_numbers", tags
    return "many_numbers", tags


NOTES = {
    "single_number": "结论就是一个数，已能判",
    "few_numbers": "结论是几个数（多答案），靠多重集判，需要 order_policy",
    "many_numbers": "结论里数字多，多半是过程或列表，判不准",
    "single_equation": "结论是 x=某数，可扩展到方程解判定",
    "multi_equation": "结论是多个 x=…, y=…，需按变量名配对",
    "no_number": "结论里没有数字：文字结论或纯符号",
    "yes_no_concept": "能/不能、全等/不全等这类概念判断，需另立枚举判",
    "proof_or_drawing": "证明或作图，永远 manual",
    "empty": "答案缺失",
}


def main():
    rows = [json.loads(l) for l in open(SRC, encoding="utf-8") if l.strip()]
    prep = json.load(open(PREP, encoding="utf-8")) if os.path.exists(PREP) else {}
    counts = Counter()
    samples = {}
    out_rows = []
    for r in rows:
        sh, tags = shape(r.get("answer"))
        p = prep.get(r["id"]) or {}
        counts[sh] += 1
        samples.setdefault(sh, [])
        if len(samples[sh]) < 3:
            samples[sh].append((r["id"], (r.get("answer") or "")[:80].replace("\n", " ")))
        out_rows.append({"id": r["id"], "band": r.get("band"), "shape": sh,
                         "tags": sorted(tags), "auto": bool(p.get("auto")),
                         "ans_len": len(r.get("answer") or "")})

    total = len(rows)
    auto_total = sum(1 for x in out_rows if x["auto"])
    L = ["# 第 12 章答案形态分布（自动生成，勿手改）", "",
         "总题数 **%d**；当前自动判 **%d** 题（%.1f%%）。" % (total, auto_total, 100.0 * auto_total / total), "",
         "| 形态 | 题数 | 占比 | 其中自动判 | 自动判率 | 说明 |",
         "| --- | --- | --- | --- | --- | --- |"]
    for sh, n in counts.most_common():
        a = sum(1 for x in out_rows if x["shape"] == sh and x["auto"])
        L.append("| %s | %d | %.1f%% | %d | %.1f%% | %s |" % (
            sh, n, 100.0 * n / total, a, 100.0 * a / n, NOTES.get(sh, "")))
    L += ["", "## 各形态样例", ""]
    for sh, n in counts.most_common():
        L.append("### %s（%d 题）" % (sh, n))
        for i, a in samples[sh]:
            L.append("- " + i + " " + a)
        L.append("")
    L += ["## 要把自动判提上去，改哪里", "",
          "1. few_numbers / multi_equation：判题能力已有，缺的是 answer_spec.order_policy 与按变量名配对两条元数据，"
          "把 manual 变可判。",
          "2. yes_no_concept：需要 answer_type=concept_choice 加一份章节内合法取值表（能/不能、全等/不全等），"
          "否则永远 manual。",
          "3. no_number：多半是结论被过程淹没，需要人工或半自动切出结论句，调参救不了。",
          "4. proof_or_drawing / empty：保持 manual，走自评通道。", ""]

    os.makedirs(OUTDIR, exist_ok=True)
    open(os.path.join(OUTDIR, "answer_shapes.md"), "w", encoding="utf-8", newline="\n").write("\n".join(L))
    json.dump(out_rows, open(os.path.join(OUTDIR, "answer_shapes.json"), "w", encoding="utf-8", newline="\n"),
              ensure_ascii=False, indent=1)

    print("total=%d auto=%d (%.1f%%)" % (total, auto_total, 100.0 * auto_total / total))
    for sh, n in counts.most_common():
        a = sum(1 for x in out_rows if x["shape"] == sh and x["auto"])
        print("  %-18s %4d  auto=%4d (%.1f%%)" % (sh, n, a, 100.0 * a / n))


if __name__ == "__main__":
    main()
