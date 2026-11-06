# -*- coding: utf-8 -*-
"""按课标条目的内容领域与原文动词，给标准条目初判核心素养标签，再叠加逐条复核。

两层做法，都写进数据里：
1. rule:domain+verb —— 内容领域给底（图形与几何→直观想象、数与代数→数学运算、统计与概率→数据分析、综合与实践→数学建模），再用原文动词加；
2. ai_review —— 逐条看过 125 条被引条目，只改明确漏标与明确过宽（内容名词误命中），每条改动写 competency_note 说明为什么。

这不是教研认定。规则层可复现，复核层可 diff（competencies_rule 保留规则原值）。
写回 content/curriculum/standards.jsonl 的 competencies / competencies_rule / competency_basis / competency_note。
用法：python tools/competency_tag.py [--write]
"""
import io, json, os, sys, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
C = os.path.join(ROOT, "content")
RE = {
    "CP-01": ("抽象/符号化（概念、符号、表示）", ["抽象", "符号", "表示", "概念"]),
    "CP-02": ("逻辑推理（推理、证明、判定、性质的推导）", ["推理", "证明", "判定", "论证", "说明理由", "性质"]),
    "CP-03": ("数学运算（计算、化简、求值、解方程、换算）", ["计算", "运算", "化简", "求值", "解方程", "解不等式", "换算", "近似计算", "估算"]),
    "CP-04": ("直观想象（图形、作图、变换、坐标、图形关系）", ["图形", "作图", "变换", "坐标", "直观", "空间", "平移", "旋转", "对称", "视图"]),
    "CP-05": ("数学建模（实际问题、模型、应用）", ["实际问题", "建模", "模型", "应用", "解决实际"]),
    "CP-06": ("数据分析（数据、统计、抽样、频率、概率）", ["数据", "统计", "抽样", "频率", "概率", "随机"]),
}
BASE = {
    "图形与几何": ["CP-04"],
    "数与代数": ["CP-03"],
    "统计与概率": ["CP-06"],
    "综合与实践": ["CP-05"],
}

# 逐条复核：只写需要改的条目。add 增、del 删，why 是给后来人看的理由。
# 判据：看学生完成这条要求时主要动哪种思维活动，不看条目里出现了什么名词。
REVIEW = {
    "4.GG.55": {"add": [], "del": [], "why": "定义、命题、定理、推论的意义属命题结构，是逻辑推理的语言基础"},
    "4.GG.56": {"add": ["CP-02"], "del": [], "why": "逆命题真假需要判断，不只是认概念"},
    "4.GG.58": {"add": ["CP-02"], "del": [], "why": "反例是判断命题为假的手段，属推理"},
    "4.GG.59": {"add": ["CP-02"], "del": [], "why": "反证法是证明方法"},
    "4.GG.72": {"add": ["CP-01"], "del": [], "why": "认识图形的相似、了解相似比，是建立概念与符号"},
    "4.GG.76": {"add": ["CP-01"], "del": [], "why": "了解图形的位似，先要建立位似的概念"},
    "4.GG.78": {"add": ["CP-01"], "del": [], "why": "sinA / cosA / tanA 是符号表示，锐角三角函数首先是一次符号化"},
    "4.NA.06": {"add": ["CP-01"], "del": [], "why": "无理数与实数是概念，规则层被领域默认盖成只有运算"},
    "4.NA.32": {"add": ["CP-04"], "del": [], "why": "在数轴上表示解集、用数轴定不等式组解集，靠的是数轴直观"},
    "4.NA.35": {"add": ["CP-04"], "del": [], "why": "结合图象分析函数关系，读图是直观想象"},
    "4.NA.40": {"add": ["CP-04"], "del": [], "why": "能画一次函数图象并据图象看变化，属直观表达"},
    "4.NA.41": {"add": ["CP-01"], "del": [], "why": "体会一次函数与二元一次方程的关系，是建立两类对象的联系"},
    "4.NA.46": {"add": ["CP-04"], "del": [], "why": "用二次函数图象求一元二次方程的近似解，靠读图"},
    "4.NA.48": {"add": ["CP-04"], "del": [], "why": "能画反比例函数图象并据图象看变化"},
    "4.SP.07": {"add": ["CP-04"], "del": [], "why": "画频数直方图是用图形描述数据分布"},
    "4.SP.12": {"add": ["CP-02"], "del": [], "why": "列表与树状图要先做到有序枚举，否则会重会漏"},
    "4.IP.01": {"add": ["CP-01"], "del": ["CP-02","CP-04","CP-06"], "why": "这条原文里的性质、图形、数据分析都是内容名词，被规则误当成素养；它讲的是用数学眼光观察现实，即数学抽象加建模"},
}

def jl(p):
    return [json.loads(l) for l in io.open(p, encoding="utf-8") if l.strip()]

def tag(rec):
    out = list(BASE.get(rec.get("domain") or "", []))
    txt = rec.get("text") or ""
    for cp, (_, kws) in RE.items():
        if cp in out:
            continue
        if any(k in txt for k in kws):
            out.append(cp)
    return sorted(set(out))

def main():
    std_path = os.path.join(C, "curriculum", "standards.jsonl")
    rows = jl(std_path)
    ed = jl(os.path.join(C, "relations", "edges.jsonl"))
    used = {e["dst"] for e in ed if e["relation"] == "assessed_by"}
    cnt = collections.Counter()
    hit = 0
    changed = 0
    for r in rows:
        if r["uid"] in used and r.get("subject") == "数学":
            rule = tag(r)
            cps = list(rule)
            rv = REVIEW.get(r["code"])
            if rv:
                cps = sorted((set(cps) - set(rv["del"])) | set(rv["add"]))
                r["competency_note"] = rv["why"]
                changed += 1
            else:
                r["competency_note"] = None
            r["competencies"] = cps
            r["competencies_rule"] = rule
            r["competency_basis"] = "rule:domain+verb+ai_review"
            hit += 1
            for c in cps:
                cnt[c] += 1
        else:
            r.setdefault("competencies", [])
            r.setdefault("competency_basis", None)
    print("赋标签条目", hit, "其中复核改动", changed)
    for k in sorted(cnt):
        print(" ", k, cnt[k])
    if "--write" in sys.argv:
        blob = "".join(json.dumps(r, ensure_ascii=False, sort_keys=True) + "\n" for r in rows)
        assert len(blob) > 100000, len(blob)
        with io.open(std_path, "w", encoding="utf-8", newline="\n") as f:
            f.write(blob)
        print("已写", std_path)

main();
