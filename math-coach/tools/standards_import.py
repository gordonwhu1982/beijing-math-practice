# -*- coding: utf-8 -*-
"""导入课标条目：把旧仓的 cn-curriculum-standards.json 转成本仓的 curriculum_standard 实体。

来源：D:/个人/知识图谱/beijing-math-practice/data/cn-curriculum-standards.json（全科 627 条，其中数学 314 条）
  - cms-2022:* 义务教育数学课程标准（2022 年版 2025 年修订），含第一至第四学段
  - cms-2017:* 普通高中数学课程标准（2017 年版 2020 年修订）
只导入数学（cms-*）；物理/科学（ces-*、cps-*）不进本仓。

输出：content/curriculum/standards.jsonl，一行一条，uid 规则 CS-<code>（schema id_rules.curriculum_standard = ^CS-.+$）。
课标条文本身是公开转写、未与教育部 PDF 逐页核对，因此 review_status 一律 stub，原文的 text_status 保留在 ext 里。

用法: python tools/standards_import.py [--dry]
"""
import json, os, sys

REPO = os.environ.get("MC_REPO", r"D:\个人\知识图谱\math-coach")
SRC = os.environ.get("MC_STD_SRC", r"D:\个人\知识图谱\beijing-math-practice\data\cn-curriculum-standards.json")
OUT = os.path.join(REPO, "content", "curriculum", "standards.jsonl")

DOC = {"cms-2022": "义务教育数学课程标准（2022年版2025年修订）",
       "cms-2017": "普通高中数学课程标准（2017年版2020年修订）"}
STAGE = {"1": "义务教育第一学段（1-2年级）", "2": "义务教育第二学段（3-4年级）",
         "3": "义务教育第三学段（5-6年级）", "4": "义务教育第四学段（7-9年级）",
         "H": "普通高中"}
GRADES = {"1": "1-2", "2": "3-4", "3": "5-6", "4": "7-9", "H": "10-12"}


def main():
    with open(SRC, encoding='utf-8') as f:
        src = json.load(f)
    items = [x for x in src['items'] if str(x.get('id', '')).startswith('cms-')]
    out, seen = [], set()
    for x in items:
        doc_key, _, code = x['id'].partition(':')
        if not code:
            print("SKIP bad id", x.get("id"))
            continue
        uid = "CS-" + code
        if uid in seen:
            print("SKIP dup", uid)
            continue
        seen.add(uid)
        seg = code.split('.')[0]
        rec = {
            "uid": uid,
            "doc": DOC[doc_key],
            "subject": "数学",
            "stage": STAGE.get(seg, "未定"),
            "code": code,
            "text": x["text"].strip(),
            "review_status": "stub",
            "ext": {
                "source_doc_key": doc_key,
                "domain": x.get("domain"),
                "section": x.get("section"),
                "theme": x.get("theme"),
                "clause": x.get("clause"),
                "page_or_ref": x.get("page_or_ref"),
                "verbatim": x.get("verbatim"),
                "text_status": x.get("text_status"),
                "grades": GRADES.get(seg),
                "source_url": (src.get("source") or {}).get("url"),
            },
        }
        if x.get('domain'):
            rec["domain"] = x["domain"]
        out.append(rec)

    if "--dry" in sys.argv:
        print("dry: %d 条（不写盘）" % len(out))
        seg = {}
        for r in out:
            seg[r['stage']] = seg.get(r['stage'], 0) + 1
        for k, v in seg.items():
            print("  ", k, v)
        return 0

    os.makedirs(os.path.dirname(OUT), exist_ok=True)
    with open(OUT, 'w', encoding='utf-8', newline='\n') as f:
        for r in out:
            f.write(json.dumps(r, ensure_ascii=False, sort_keys=True) + '\n')
    print("写入 %s：%d 条，%d 字节" % (OUT, len(out), os.path.getsize(OUT)))
    seg = {}
    for r in out:
        seg[r['stage']] = seg.get(r['stage'], 0) + 1
    for k, v in sorted(seg.items()):
        print("  ", k, v)
    return 0


if __name__ == '__main__':
    sys.exit(main())