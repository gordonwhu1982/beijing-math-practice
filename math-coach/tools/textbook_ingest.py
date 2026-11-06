
# -*- coding: utf-8 -*-
"""把教材习题（out/textbook/draft.jsonl + 子代理写的答案）并入题库。

为什么直接追加进 content/questions/801/ch<章>.jsonl 而不是单独文件：
build_web / questions_check / schema_check 的扫描规则都以 ch<章>.jsonl 为口径，
单独开一个 ch12.textbook.jsonl 会让这条链上每个工具都得改一次过滤条件（踩过三次坑）。
追加时按 id 幂等，可重复运行。

用法：
    python tools/textbook_ingest.py             # 收敛并入
    python tools/textbook_ingest.py --dry-run
"""
import os, sys, json, argparse, collections, glob, re
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from textbook_map_sec import sec_of

sys.stdout.reconfigure(encoding="utf-8")

REPO = os.environ.get("MC_REPO", os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DRAFT = os.path.join(REPO, "out", "textbook", "draft.jsonl")
QDIR = os.path.join(REPO, "content", "questions", "801")
BAND_OF_BLOCK = {"巩固": "basic", "提升": "standard", "拓展": "advanced"}

# 抽取时个别块的末尾会连上下一个节的页眉/节首（「块结束判据不含节号行」的副作用，
# 见 textbook_exercise_extract.py 里那段注释）。这些标记出现即从该处截断题干。
# 只列已经人工核过的个例，不做通用正则——通用规则会误伤「1.2 倍」「0.6 元」这类正文数字。
# 答案里出现这些说法 = 真的离开图就答不了，不入库（避免把猜测当答案塞给孩子）
HARD_BLOCK = re.compile(r"无法确定|不能确定|条件不足|依赖图中|图中未给出|需要图中|必须依赖图|无法判断|不能判断")

TRIM_MARKS = [
    " 13.3 在前一节的学习中",
    " 12.1 如图12 - 1",
]


def trim_stem(s):
    cut = len(s)
    for m in TRIM_MARKS:
        i = s.find(m)
        if i > 0:
            cut = min(cut, i)
    return s[:cut].strip()
# 教材每组习题对应哪几个节：只有「组数 == 节数」的章能一一对应直接落节；
# 11 章（7 节 2 组）与 12 章（12 节 5 组）一组跨多节，必须按题内容人工映射，保持 None。
GROUP_TO_SEC = {
    "10-1": "10.1", "10-2": "10.2", "10-3": "10.3", "10-4": "10.4", "10-5": "10.5",
    "13-1": "13.1", "13-2": "13.2", "13-3": "13.3",
}

def load_jsonl(p):
    out = []
    with open(p, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                out.append(json.loads(line))
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--refresh", action="store_true",
                    help="已有 EC-* 行用新答案覆盖（答案由子代理重写过时用；不动题库原有 ch12 题）")
    args = ap.parse_args()

    draft = [r for r in load_jsonl(DRAFT) if r["text_quality"] == "ok"]
    ans = {}
    # 答案文件可以有多个（ch12.textbook / ch12.review / ch13.textbook …），按 glob 全收
    # *.textbook.answer 先读（它覆盖整组），其余（如 ch12.review.answer）后读；
    # 同一个 uid 出现两次时保留先读到的，并记冲突数——两个子代理可能对同一题各写一版。
    files = sorted(glob.glob(os.path.join(QDIR, "ch*.answer.jsonl")),
                   key=lambda x: (0 if ".review." in x else (1 if ".textbook." in x else 2), x))
    if not files:
        print("缺答案文件", QDIR)
    dup = 0
    for p in files:
        n = 0
        for r in load_jsonl(p):
            if r["uid"] in ans:
                dup += 1
                continue
            ans[r["uid"]] = r
            n += 1
        print("答案文件 %s 新增 %d 行" % (os.path.basename(p), n))
    if dup:
        print("同一 uid 被多份答案文件覆盖，保留先读到的：%d 条" % dup)

    stat = collections.Counter()
    by_ch = collections.defaultdict(list)
    for d in draft:
        ch = str(d["chapter"])
        a = ans.get(d["uid"])
        if a is None:
            stat["无答案跳过"] += 1
            continue
        if a.get("answer_status") != "present":
            # 子代理对「题干有『如图』」的题一律保守标 missing，但其中绝大多数文字条件
            # 已足以定值（它自己在 note 里写了答案）。只有答案本身承认「无法确定 / 依赖图中」
            # 才真正不入库；其余入库，靠 figure.need=required 让孩子看到「原题有图，本机没存」。
            if not a.get("answer") or HARD_BLOCK.search(a["answer"]):
                stat["答案缺失(missing)"] += 1
                continue
            stat["缺图但可答(入库)"] += 1
            a["note"] = (a.get("note") or "") + "；原题有图，本机未存，答案按文字条件推导"
        fig_need = "required" if d["has_figure"] else "helpful"
        # 一 一对应的组直接落节；12 章 5 组跨 12 节，用页范围 + 判别词定节，定不下来落章末
        sec = GROUP_TO_SEC.get(d["group"]) or sec_of(d["group"], d["stem"])
        row = {
            "schema_version": 1,
            "id": d["uid"],
            "volume_id": "801",
            "chapter_no": int(ch),
            "section_no": sec,
            "topics": ["S801-%s" % sec] if sec else ["C801-%s" % ch],
            "topics_scheme": "section" if sec else "chapter",
            "test_kind": None,
            "sec_title": ("教材习题 %s %s 第%d题" % (d["group"], d["block"], d["no"])),
            "stem": trim_stem(d["stem"]),
            "stem_plain": trim_stem(d["stem"]),
            "form": "solution",
            "qtag_source": "教材习题",
            "answer": a["answer"],
            "answer_steps_declared": len(a.get("answer_steps") or []),
            "answer_note": "；".join("%d) %s：%s" % (i + 1, s["c"], s["p"]) for i, s in enumerate(a.get("answer_steps") or [])),
            "answer_status": "present",
            "star_source": 1,
            "band": a.get("band") or BAND_OF_BLOCK.get(d["block"], "basic"),
            "group_source": "教材" + d["block"],
            "figure": {"need": fig_need, "reason": "教材原题，题干引用图形" if d["has_figure"] else "教材原题，无图也可作答",
                       "hint": d["stem"][:40], "figure_ids": []},
            "license": "B_open_with_terms",           # 教材内容：仅本机自用，不得再分发
            "redistributable": False,
            "visibility": "stem_public",
            "review_status": "ai_draft",
            "source": "%s；页码取自教材第 %d 页；答案由 AI 推导，未经教师核对" % (d["source"], d["book_page"]),
        }
        by_ch[ch].append(row)
        stat["并入"] += 1

    for ch, rows in sorted(by_ch.items()):
        p = os.path.join(QDIR, "ch%s.jsonl" % ch)
        old = load_jsonl(p) if os.path.exists(p) else []
        have = {r["id"] for r in old}
        new = [r for r in rows if r["id"] not in have]
        if args.refresh:
            fresh = {r["id"]: r for r in rows}
            upd = 0
            for i, r in enumerate(old):
                if r["id"].startswith("EC-") and r["id"] in fresh:
                    old[i] = fresh[r["id"]]
                    upd += 1
            stat["ch%s 刷新" % ch] = upd
        stat["ch%s 原题数" % ch] = len(old)
        stat["ch%s 新增" % ch] = len(new)
        if args.dry_run:
            continue
        with open(p, "w", encoding="utf-8", newline="\n") as f:
            for r in old + new:
                f.write(json.dumps(r, ensure_ascii=False) + "\n")
    for k, v in stat.items():
        print("%s: %d" % (k, v))

if __name__ == "__main__":
    main()
