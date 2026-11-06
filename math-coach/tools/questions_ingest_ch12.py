# -*- coding: utf-8 -*-
"""把 ch12_index.json（旧仓第12章 1128 题）导入 math-coach 权威层 content/questions/801/ch12.jsonl.

设计：只做「搬运 + 结构对齐 + 诚实标注」，不做任何内容改写。
- id 保留原样（如 12.1_bas_01），便于与旧仓 HTML 对照追溯。
- topics 先只到节级（S801-12.x），题目→知识点（KP 级）映射另立脚本，此处不猜。
- 未配答案的 36 条（err 组）保留题干、answer=null、answer_status=missing。
- 4–5★ 将来可能含真题成分：redistributable=false、visibility=stem_public（合规闸门前置）。
"""
import json, os, io, sys, collections

sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
SRC = os.environ.get("MC_CH12", r"C:/Users/liang.gao5/AppData/Roaming/Trae CN/ModularData/ai-agent/work-mode-projects/6a509678e9670855e3fda7f1/ch12_index.json")
OUT = os.environ.get("MC_OUT", r"D:/个人/知识图谱/math-coach/content/questions/801/ch12.jsonl")

BAND = {"bas": "basic", "int": "standard", "adv": "advanced", "cha": "challenge", "com": "competition",
        "err": "basic", "sel": "standard", "fill": "standard", "calc": "standard", "solu": "standard"}
FORM = {"解答": "solution", "证明": "proof", "填空": "fill", "作图": "construction",
        "易错": "solution", "计算": "calculation", "选择": "choice"}
FIG = {"必须": "required", "建议": "helpful", "无需": "none"}

src = json.load(open(SRC, encoding="utf-8"))
meta, items = src["meta"], src["items"]

secs = sorted({it["sec_key"] for it in items})
rows, warns = [], []
for it in items:
    ans = it.get("ans") or {}
    ans_txt = (ans.get("ans_txt") or "").strip()
    sk = it["sec_key"]
    sec_level = sk.startswith("12.")
    row = {
        "schema_version": 1,
        "id": it["id"],
        "volume_id": "801",
        "chapter_no": 12,
        "section_no": sk if sec_level else None,
        # zm=章末综合测试卷(77) / bt=本章综合测试30题(30)：跨节，挂章节点，不硬塞进某一节
        "topics": ["S801-%s" % sk] if sec_level else ["C801-12"],
        "topics_scheme": "section" if sec_level else "chapter",
        "test_kind": None if sec_level else it["sec"],
        "sec_title": it["sec"],
        "stem": it["stem_html"],
        "stem_plain": it["stem_txt"],
        "form": FORM.get(it["qtag"], "other"),
        "qtag_source": it["qtag"],
        "answer": ans_txt or None,
        "answer_steps_declared": int(ans.get("steps") or 0),
        "answer_note": (ans.get("note") or "").strip() or None,
        "answer_status": "present" if ans_txt else "missing",
        "star_source": int(it["star"]),
        "band": BAND.get(it["group_key"], "standard"),
        "group_source": it["group"],
        "figure": {"need": FIG.get(it["img_need"], "helpful"),
                   "reason": it.get("img_reason") or "",
                   "hint": it.get("img_hint") or "",
                   "figure_ids": []},
        "license": "own-ai-draft",
        "redistributable": False,
        "visibility": "stem_public",
        "review_status": "ai_draft",
        "source": {"of": "ch12_index.json",
                   "gen_md5": meta.get("gen_md5"),
                   "ans_md5": meta.get("ans_md5"),
                   "origin": "旧仓 beijing-math-practice 第12章生成稿（AI 出题）"},
    }
    if row["answer_status"] == "missing":
        warns.append(row["id"])
    if row["band"] in ("challenge", "competition"):
        row["trace_possible"] = True  # 可能含网搜真题成分，公开时只放题干
    rows.append(row)

# 闸门
ids = [r["id"] for r in rows]
dup = [k for k, v in collections.Counter(ids).items() if v > 1]
assert not dup, "id 重复: %s" % dup[:5]
for r in rows:
    assert r["topics"], r["id"]
    assert 1 <= r["star_source"] <= 5, r["id"]
    assert r["stem"].strip(), r["id"]
    assert r["section_no"] is None or r["section_no"].startswith("12."), r["id"]
    assert r["topics_scheme"] in ("section", "chapter"), r["id"]

os.makedirs(os.path.dirname(OUT), exist_ok=True)
with open(OUT, "w", encoding="utf-8", newline="\n") as f:
    for r in rows:
        f.write(json.dumps(r, ensure_ascii=False) + "\n")

print("写入", OUT, "共", len(rows), "行")
print("节数", len(secs), "→", secs)
print("无答案", len(warns))
print("band", dict(collections.Counter(r["band"] for r in rows)))
print("form", dict(collections.Counter(r["form"] for r in rows)))
print("星", dict(sorted(collections.Counter(r["star_source"] for r in rows).items())))
print("需配图必须/建议", sum(1 for r in rows if r["figure"]["need"] == "required"),
      sum(1 for r in rows if r["figure"]["need"] == "helpful"))
per = collections.Counter(r["topics"][0] for r in rows)
for s in sorted(per):
    print("  %-10s %3d" % (s, per[s]))
print("体积", os.path.getsize(OUT), "bytes")
