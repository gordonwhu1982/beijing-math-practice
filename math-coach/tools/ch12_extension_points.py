# -*- coding: utf-8 -*-
"""第 12 章扩展知识点：追加到节末，不改已有编号。题目只加 secondary。"""
import json
import os
import re

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
KP_JSON = os.path.join(REPO, "content", "framework", "knowledge_points", "801.json")
DETAIL = os.path.join(REPO, "content", "framework", "knowledge_points", "801.detail.jsonl")
PRE = os.path.join(REPO, "content", "framework", "kp_prerequisites.json")
SKILL = os.path.join(REPO, "content", "skills", "801", "ch12.jsonl")
QKP = os.path.join(REPO, "content", "questions", "801", "ch12.kp.jsonl")
QFILE = os.path.join(REPO, "content", "questions", "801", "ch12.jsonl")
REVIEW = os.path.join(REPO, "design", "ux-redesign", "ch12-extension-unmatched.txt")

TITLES = {
    "12.3": [
        "延长中线一倍：把中线延长到等长，得到平行四边形，从而把另一边搬过来",
        "重心分中线：重心到顶点的距离是它到对边中点距离的 2 倍",
        "垂心处的角：两条高的夹角等于 180° 减去第三个内角",
        "高与角平分线的夹角：同一顶点处，高和角平分线的夹角等于另外两角差的一半",
        "中线长公式：一条中线的长可由三边算出",
    ],
    "12.8": [
        "角平分线定理：角平分线分对边所得的两条线段之比，等于这个角的两条邻边之比",
        "内角平分线的夹角：两条内角平分线的夹角等于 90° 加上第三个内角的一半",
        "外角平分线：外角平分线分对边成外分比，两条外角平分线的夹角与第三个内角互补于 90°",
    ],
    "12.10": [
        "两次对称：把折线作两次轴对称拉直，用来处理造桥和同侧最短",
        "费马点：到三角形三个顶点的距离之和最小的点",
    ],
    "12.11": [
        "含 30° 的直角三角形：30° 所对的直角边等于斜边的一半，三边比为 1 比 √3 比 2",
        "等边三角形内一点到三边的距离：这三条距离之和等于这个等边三角形的高",
    ],
    "12.12": [
        "塞瓦与梅涅劳斯：共点线或一条截线把边分成的比，直角三角形里还有射影定理",
    ],
}

DETAILS = [
    ("K801-12.3-09", "theorem", "extend",
     "把三角形的一条中线延长到与它等长，新端点与另外两个顶点连线后，得到的四边形是平行四边形，被搬走的那一边等于原三角形的另一边。",
     ["已知一条中线，或需要把一条边转移到另一处"],
     ["只延长、不与另外两个顶点连接，得不到平行四边形", "延长的长度不等于原中线时，对边不再相等"],
     [("证明", "说明倍长之后哪两条线段相等")]),
    ("K801-12.3-10", "property", "extend",
     "重心到顶点的距离，是它到这条中线对边中点距离的 2 倍。三条中线都被重心分成同样的 2:1。",
     ["已经作出重心，或题目给出一条中线被分成的两段"],
     ["2 倍是顶点到重心的那一段，不是重心到中点的那一段", "重心不是中点，不能把两段当成相等"],
     [("计算", "由一段中线长求出另一段")]),
    ("K801-12.3-11", "theorem", "extend",
     "三角形两条高相交于垂心。从另两个顶点看，垂心处的夹角等于 180° 减去第三个内角。",
     ["两条高已经作出，或题目要讨论高的交点处的角"],
     ["钝角三角形的垂心在形外，夹角关系仍在，但交点不在形内", "一条高与另一边的夹角不是这个角"],
     [("计算", "由一个内角求出垂心处的夹角")]),
    ("K801-12.3-12", "theorem", "extend",
     "从同一个顶点作高和角平分线，它们的夹角等于另外两个内角之差的一半。",
     ["同一个顶点同时有高和角平分线"],
     ["高和角平分线不从同一个顶点出发时，不能用这个差", "三角形是等腰且这条线是顶角平分线时，夹角为 0"],
     [("计算", "由两个底角求出高与角平分线的夹角")]),
    ("K801-12.3-13", "formula", "extend",
     "设 a 边对应的中线长为 m，另外两边为 b、c，则 4m² = 2b² + 2c² − a²。它由中线延长一倍后的平行四边形得到。",
     ["已知三边，或已知中线与其中两边，求剩下的长度"],
     ["公式里减的是中线所对的那条边，不是另外两边", "中线不是中位线，长度不是第三边的一半"],
     [("计算", "由三边求出一条中线的长")]),
    ("K801-12.8-11", "theorem", "extend",
     "角平分线分对边成两段，这两段的比等于这个角两条邻边的比。它说的是对边上的长度，不是点到两边的距离。",
     ["一条内角平分线与对边相交，并且知道两条邻边或两段对边中的一组"],
     ["写成邻边比的倒数就会把两段对调", "外角平分线用的是外分，不是这条内分比"],
     [("计算", "由两邻边求出角平分线分对边的两段")]),
    ("K801-12.8-12", "theorem", "extend",
     "三角形两条内角平分线相交所成的角，等于 90° 加上第三个内角的一半。三条内角平分线交于同一点。",
     ["题目给出两条内角平分线，或要求它们夹角"],
     ["公式里的一半是没画平分线的那个角，不是已平分的角", "外角平分线的夹角不是这个公式"],
     [("计算", "由一个内角求出两条内角平分线的夹角")]),
    ("K801-12.8-13", "theorem", "olympiad",
     "外角平分线与对边延长线相交时，分成的两段成外分比，比仍等于两邻边的比。两条外角平分线的夹角等于 90° 减去第三个内角的一半。",
     ["题目作出的是外角的平分线"],
     ["把外角平分线当成内角平分线，两段会落在边的内部", "夹角公式里的角是剩下的那个内角"],
     [("证明", "区分内分与外分后再写比例")]),
    ("K801-12.10-09", "model", "extend",
     "折线要经过两条不同的直线时，连续作两次轴对称，把折线拉成一条直线。造桥选址是把桥的两端先对齐，再做一次对称。",
     ["最短路径要碰到两条直线，或桥有固定方向"],
     ["只作一次对称时，第二条直线上的点还没有被拉直", "桥不与河岸垂直时，不能直接把两端看成同一个点"],
     [("建模", "把两次反射之后的直线交点投回原来的直线")]),
    ("K801-12.10-10", "model", "olympiad",
     "到三角形三个顶点距离之和最小的点叫费马点。每个内角都小于 120° 时，它与各边所对的连线夹角都是 120°。等边三角形的费马点就是它的中心。",
     ["题目求到三个顶点的距离和的最小值"],
     ["有一个内角大于或等于 120° 时，最小点就是这个角的顶点", "它不是外心，也不是重心"],
     [("计算", "用旋转 60° 把三条距离收成一条线段")]),
    ("K801-12.11-10", "formula", "extend",
     "直角三角形中，30° 所对的直角边等于斜边的一半。三条边的比是 1:√3:2。45° 的等腰直角三角形三边比是 1:1:√2。",
     ["图形里出现 30°、45° 或 60°，并且已经有一个直角"],
     ["30° 对着的是较短的直角边，不是斜边", "没有直角时不能直接用这组比"],
     [("计算", "由一条边写出另外两条边")]),
    ("K801-12.11-11", "theorem", "extend",
     "等边三角形内部或边上任意一点，到三边的距离之和等于这个三角形的高。点在内部时是三条距离相加。",
     ["三角形三条边相等，并且点在它的内部或边上"],
     ["一般三角形没有这个不变的和", "点在三角形外时，应是有的距离相加、有的相减"],
     [("证明", "把原三角形分成三个以点到边的距离为高的小三角形")]),
    ("K801-12.12-08", "theorem", "olympiad",
     "塞瓦定理用三条共点线把对边分成的比相乘为 1。梅涅劳斯定理用一条直线截三边的比相乘为 1。射影定理写的是直角三角形里斜边上的射影与直角边的平方关系。",
     ["竞赛题出现共点线、一条截线，或直角三角形斜边上的射影"],
     ["三条线不共点时不能用塞瓦", "截线没有与三边所在直线都相交时不能用梅涅劳斯", "射影定理要求那个角是直角"],
     [("证明", "先判断用的是共点、截线还是直角射影，再写对应的比例")]),
]

EDGES = [
    ("K801-12.3-01", "K801-12.3-09", "先有中线，才能把这条中线延长一倍"),
    ("K801-12.3-09", "K801-12.3-13", "中线长公式由中线延长一倍后的平行四边形推出"),
    ("K801-12.3-02", "K801-12.3-10", "先知道重心是三条中线的交点，才谈它把中线分成 2:1"),
    ("K801-12.3-04", "K801-12.3-11", "垂心是高的交点，先要有高"),
    ("K801-12.3-05", "K801-12.3-11", "三条高的位置决定垂心在形内还是形外"),
    ("K801-12.3-03", "K801-12.3-12", "先有角平分线和高，才比较它们的夹角"),
    ("K801-12.3-04", "K801-12.3-12", "夹角的一边是这个顶点的高"),
    ("K801-12.3-03", "K801-12.8-11", "角平分线定理用的是 12.3 里那条到对边的线段"),
    ("K801-12.2-07", "K801-12.8-12", "内角平分线的夹角由内角和推出"),
    ("K801-12.8-11", "K801-12.8-13", "外角平分线是内分定理的外分情形"),
    ("K801-12.10-06", "K801-12.10-09", "两次对称是一次对称求最短路径的下一步"),
    ("K801-12.6-06", "K801-12.10-10", "等边三角形的费马点就是它的中心"),
    ("K801-12.11-01", "K801-12.11-10", "30° 直角三角形的三边比由勾股定理算出"),
    ("K801-12.6-06", "K801-12.11-11", "距离之和等于高，只在等边三角形里成立"),
    ("K801-12.3-03", "K801-12.12-08", "塞瓦和梅涅劳斯都在处理边被分成的线段"),
]

SKILL_REFS = {
    "SK-801-12.3-02": "K801-12.3-09",
    "SK-801-12.3-08": "K801-12.8-11",
    "SK-801-12.7-03": "K802-15.4-05",
    "SK-801-12.6-08": "K801-12.11-11",
    "SK-801-12.10-05": "K801-12.10-09",
    "SK-801-12.11-05": "K801-12.11-10",
}

def both(patterns):
    regs = [re.compile(p) for p in patterns]

    def test(text):
        return all(r.search(text) for r in regs)

    return test


RULES = [
    (re.compile(r"角平分线定理|分对边成比例").search, "K801-12.8-11"),
    (re.compile(r"倍长中线").search, "K801-12.3-09"),
    (re.compile(r"中线定理|中线长公式").search, "K801-12.3-13"),
    (re.compile(r"重心.{0,16}(2\s*[:：]\s*1|2\s*倍|二比一)|顶点到重心").search, "K801-12.3-10"),
    (re.compile(r"垂心").search, "K801-12.3-11"),
    (re.compile(r"斜边中线|斜边上的中线|斜边的中线").search, "K802-15.4-05"),
    (re.compile(r"30\s*(?:°|\^\\circ|\\degree)\s*所对|30\s*(?:°|\^\\circ|\\degree).{0,16}一半").search, "K801-12.11-10"),
    (re.compile(r"到三边的距离|距离之和等于高|距离和恒等于").search, "K801-12.11-11"),
    (re.compile(r"造桥|两次对称|双对称").search, "K801-12.10-09"),
    (re.compile(r"外角平分线").search, "K801-12.8-13"),
    (re.compile(r"费马").search, "K801-12.10-10"),
    (both([r"角平分线", r"90\s*(?:°|\^\\circ|\\degree)\s*\+"]), "K801-12.8-12"),
    (re.compile(r"高与角平分线|角平分线的夹角").search, "K801-12.3-12"),
    (re.compile(r"中位线").search, "K802-15.5-02"),
    (re.compile(r"塞瓦|梅涅劳斯|质量点|射影定理").search, "K801-12.12-08"),
]


def load_jsonl(path):
    rows = []
    with open(path, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def append_titles(text):
    lines = text.splitlines()
    added = 0
    for sec_no, titles in TITLES.items():
        start = next(i for i, line in enumerate(lines) if '"no": "%s"' % sec_no in line)
        kp_at = next(i for i in range(start, len(lines)) if '"knowledge_points"' in lines[i])
        end = next(i for i in range(kp_at + 1, len(lines)) if lines[i].strip() == "],")
        have = "\n".join(lines[kp_at:end])
        fresh = [title for title in titles if title not in have]
        if not fresh:
            continue
        last = end - 1
        if not lines[last].rstrip().endswith(","):
            lines[last] = lines[last] + ","
        block = []
        for index, title in enumerate(fresh):
            comma = "," if index < len(fresh) - 1 else ""
            block.append("      " + json.dumps(title, ensure_ascii=False) + comma)
        lines[end:end] = block
        added += len(fresh)
    return "\n".join(lines) + "\n", added


def main():
    text, added_titles = append_titles(open(KP_JSON, encoding="utf-8").read())
    with open(KP_JSON, "w", encoding="utf-8", newline="\n") as f:
        f.write(text)

    have_uid = {row["uid"] for row in load_jsonl(DETAIL)}
    added_detail = 0
    with open(DETAIL, "a", encoding="utf-8", newline="\n") as f:
        for uid, kp_type, tier, definition, conditions, boundaries, objectives in DETAILS:
            if uid in have_uid:
                continue
            row = {
                "uid": uid,
                "kp_type": kp_type,
                "tier": tier,
                "definition": definition,
                "conditions": conditions,
                "boundaries": boundaries,
                "objectives": [{"ability": ability, "text": text} for ability, text in objectives],
                "aliases": [],
                "skill_refs": [sid for sid, kid in SKILL_REFS.items() if kid == uid],
                "misconception_refs": [],
                "review_status": "ai_draft",
                "ext": {"tier": tier, "optional": True, "source": "第12章题目解析说明里反复出现、课本知识点未单列的结论"},
            }
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
            added_detail += 1

    pre_text = open(PRE, encoding="utf-8").read()
    pre = json.loads(pre_text)
    seen = {(e["from"], e["to"]) for e in pre["edges"]}
    fresh_edges = [item for item in EDGES if (item[0], item[1]) not in seen]
    if fresh_edges:
        pre_text = pre_text.replace('"count": %d' % pre["count"], '"count": %d' % (pre["count"] + len(fresh_edges)), 1)
        block = []
        for src, dst, why in fresh_edges:
            block.append('  {\n   "from": %s,\n   "to": %s,\n   "why": %s\n  }' % (
                json.dumps(src, ensure_ascii=False),
                json.dumps(dst, ensure_ascii=False),
                json.dumps(why, ensure_ascii=False),
            ))
        pre_text = pre_text.rstrip()
        if pre_text.endswith("}"):
            pre_text = pre_text[:-1].rstrip()
        if pre_text.endswith("]"):
            pre_text = pre_text[:-1].rstrip()
        if not pre_text.endswith(","):
            pre_text += ","
        pre_text += "\n" + ",\n".join(block) + "\n ]\n}\n"
        with open(PRE, "w", encoding="utf-8", newline="\n") as f:
            f.write(pre_text)

    skill_lines = open(SKILL, encoding="utf-8").read().splitlines()
    changed_skills = 0
    out_lines = []
    for line in skill_lines:
        if not line.strip():
            continue
        row = json.loads(line)
        extra = SKILL_REFS.get(row.get("uid"))
        refs = row.get("kp_refs") or []
        if extra and extra not in refs:
            old = json.dumps(refs, ensure_ascii=False)
            new = json.dumps(refs + [extra], ensure_ascii=False)
            if old not in line:
                raise SystemExit("kp_refs 对不上：" + row.get("uid"))
            line = line.replace(old, new, 1)
            changed_skills += 1
        out_lines.append(line)
    with open(SKILL, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(out_lines) + "\n")

    notes = {}
    for row in load_jsonl(QFILE):
        notes[row["id"]] = row.get("answer_note") or ""
    added_links = 0
    linked_ids = set()
    out_tags = []
    for line in open(QKP, encoding="utf-8").read().splitlines():
        if not line.strip():
            continue
        row = json.loads(line)
        text = notes.get(row["uid"]) or ""
        old_tags = row.get("kp_tags") or []
        have = {t.get("kp_uid") for t in old_tags}
        new_tags = list(old_tags)
        if text:
            for pred, kid in RULES:
                if kid in have or not pred(text):
                    continue
                new_tags.append({"kp_uid": kid, "role": "secondary", "weight": 1})
                have.add(kid)
                added_links += 1
                linked_ids.add(row["uid"])
        if len(new_tags) != len(old_tags):
            old = json.dumps(old_tags, ensure_ascii=False)
            new = json.dumps(new_tags, ensure_ascii=False)
            if old not in line:
                raise SystemExit("kp_tags 对不上：" + row.get("uid"))
            line = line.replace(old, new, 1)
        out_tags.append(line)
    with open(QKP, "w", encoding="utf-8", newline="\n") as f:
        f.write("\n".join(out_tags) + "\n")

    unmatched = []
    for qid, text in notes.items():
        if not text or qid in linked_ids:
            continue
        if "定理" in text or "方法" in text or "模型" in text:
            unmatched.append(qid + "\t" + text.replace("\n", " ")[:120])
    with open(REVIEW, "w", encoding="utf-8", newline="\n") as f:
        f.write("有解析说明、但没有对上固定说法的题。主挂点未改。\n")
        f.write("\n".join(unmatched) + "\n")

    print("titles", added_titles, "details", added_detail, "edges", len(fresh_edges),
          "skills", changed_skills, "links", added_links, "questions", len(linked_ids),
          "unmatched", len(unmatched))


if __name__ == "__main__":
    main()
