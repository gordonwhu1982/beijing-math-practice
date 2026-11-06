# -*- coding: utf-8 -*-
"""把「一步就能判」的题→知识点 任务拆成一节一包，供人（或 AI 辅助）逐节标注。

用法：
  python tools/questions_kp_task_split.py --vol 801 --chapter 10
产出：out/kp_tasks/801/ch10/<sec>.json 与 out/kp_tasks/801/ch10/_index.txt
每包含该节的题（精简字段）与该节的候选知识点（uid/title/definition/aliases）。
"""
import argparse, glob, io, json, os, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT = os.path.join(ROOT, "content")
OUT = os.path.join(ROOT, "out", "kp_tasks")


def jl(p):
    return [json.loads(l) for l in io.open(p, encoding="utf-8") if l.strip()]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--vol", default="801")
    ap.add_argument("--chapter", required=True)
    a = ap.parse_args()
    ch = a.chapter

    # 知识点：uid -> detail
    details = {}
    for p in sorted(glob.glob(os.path.join(CONTENT, "framework", "knowledge_points", "*.detail.jsonl"))):
        for d in jl(p):
            details[d["uid"]] = d
    # 题
    qs = []
    for p in sorted(glob.glob(os.path.join(CONTENT, "questions", a.vol, "ch%s.jsonl" % ch))):
        qs += jl(p)
    if not qs:
        print("没有题：ch%s" % ch)
        return 1

    # 已有映射（防止重复劳动）
    kp_path = os.path.join(CONTENT, "questions", a.vol, "ch%s.kp.jsonl" % ch)
    done = set()
    if os.path.exists(kp_path):
        done = set(r["uid"] for r in jl(kp_path))
        print("已有映射 %d 题，跳过" % len(done))

    # 候选点：按节分组（uid 形如 K801-12.10-01 → 节 12.10）
    by_sec = {}
    for uid, d in details.items():
        if not uid.startswith("K" + a.vol + "-"):
            continue
        sec = uid.split("-")[1]
        if sec.split(".")[0] != ch:
            continue
        by_sec.setdefault(sec, []).append({
            "uid": uid,
            "title": d.get("title"),
            "definition": (d.get("definition") or "")[:160],
            "aliases": (d.get("aliases") or [])[:8],
        })
    for sec in by_sec:
        by_sec[sec].sort(key=lambda x: x["uid"])

    # 题按 section_no 分组；章末综合（无 section_no）单列
    qby = {}
    for q in qs:
        if q["id"] in done:
            continue
        sec = q.get("section_no") or "_chapter"
        qby.setdefault(sec, []).append({
            "id": q["id"],
            "form": q.get("form"),
            "band": q.get("band"),
            "stem": (q.get("stem_plain") or q.get("stem") or "")[:420],
            "answer": (q.get("answer") or "")[:180],
        })

    dst = os.path.join(OUT, a.vol, "ch%s" % ch)
    if not os.path.isdir(dst):
        os.makedirs(dst)
    lines = []
    all_pts = sorted({p["uid"] for v in by_sec.values() for p in v})
    for sec in sorted(qby):
        pts = by_sec.get(sec) or ([] if sec != "_chapter" else
                                  [p for k in sorted(by_sec) for p in by_sec[k]])
        if not pts:
            print("  !! 节 %s 找不到候选点，跳过 %d 题" % (sec, len(qby[sec])))
            continue
        pack = {
            "vol": a.vol, "chapter": ch, "sec": sec,
            "sec_title": (qby[sec][0].get("band") and "") or "",
            "points": pts,
            "questions": qby[sec],
            "rules": [
                "每题的 kp_uid 必须来自下面 points 里的 uid，不许自造",
                "一题最多 2 个挂点，第一个是 primary（role=primary），第二个 role=secondary",
                "判不出这门题到底考哪个点时，整题不写——留空比猜错好",
                "weight 一律 1.0；basis.evidence 写题干里支撑这个判断的原文片段（不超过 3 条）",
            ],
        }
        name = sec if sec != "_chapter" else "chapter"
        fp = os.path.join(dst, "%s.json" % name)
        io.open(fp, "w", encoding="utf-8", newline="\n").write(
            json.dumps(pack, ensure_ascii=False, indent=1) + "\n")
        lines.append("%s\t%d 题\t%d 点\t%s" % (name, len(pack["questions"]), len(pts), fp))
    io.open(os.path.join(dst, "_index.txt"), "w", encoding="utf-8", newline="\n").write(
        "\n".join(lines) + "\n")
    print("\n".join(lines))
    print("候选点合计 %d；任务包 %d 个 → %s" % (len(all_pts), len(lines), dst))
    return 0


if __name__ == "__main__":
    sys.exit(main())
