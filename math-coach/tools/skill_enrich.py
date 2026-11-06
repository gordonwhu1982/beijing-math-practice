# -*- coding: utf-8 -*-
"""为 content/skills 的每条方法补 desc / boundaries / thought_refs（架构 v4 §4）。

原则：只做可复核的派生，不编造新内容。
- desc 由 steps 的首末动作压缩成一句「做什么 → 得到什么」；
- boundaries 由 kp_refs 覆盖范围 + failure_signals 生成（对应参考产品的「边界声明」）；
- thought_refs 由名称关键词映射到 content/thoughts.jsonl 的 15 个思维层级条目。
"""
import json, os, glob, collections

REPO = os.environ.get("MC_REPO", r"D:\个人\知识图谱\math-coach")
C = os.path.join(REPO, "content")


def jl(p):
    return [json.loads(l) for l in open(p, encoding="utf-8") if l.strip()]


det, kp_title = {}, {}
for v in ["701", "702", "801", "802", "901", "902"]:
    for d in jl(os.path.join(C, "framework", "knowledge_points", v + ".detail.jsonl")):
        det[d["uid"]] = d
    kd = json.load(open(os.path.join(C, "framework", "knowledge_points", v + ".json"), encoding="utf-8"))
    for ch in kd.get("chapters") or []:
        for sec in ch.get("sections") or []:
            for i, t in enumerate(sec.get("knowledge_points") or [], 1):
                kp_title["K%s-%s-%02d" % (v, sec["no"], i)] = t

# 关键词 → 思想 uid（顺序敏感，先命中先得；最多取 2 个，第一个当主）
RULES = [
    (["反证"], "TH-13"),
    (["分类讨论", "完备分类", "整数取值计数", "按角与边给", "多种情况"], "TH-03"),
    (["设 k", "含参", "参数"], "TH-12"),
    (["整体代换", "三线合一", "整体"], "TH-06"),
    (["归纳", "规律", "构造公式", "递推"], "TH-11"),
    (["频率", "概率", "可能性", "估计"], "TH-14"),
    (["建模", "应用题", "情境", "实际"], "TH-15"),
    (["数轴", "图象", "作图", "画对称轴", "网格", "弦图", "勾股树", "面积法", "图形"], "TH-02"),
    (["坐标", "向量", "建系"], "TH-10"),
    (["化简", "运算", "变形", "通分", "约分", "有理化", "求值", "裂项", "分离常数", "配方",
      "因式分解", "计算", "取近似值", "估算"], "TH-09"),
    (["方程", "函数", "最值", "值域", "求边长", "求长", "求角", "求线段比"], "TH-01"),
    (["定义", "概念", "判断", "辨析", "区分", "符号", "表示", "改写"], "TH-07"),
    (["证", "命题", "定理", "全等", "逆定理", "补条件"], "TH-08"),
]
DEFAULT = "TH-08"


def thought_of(name):
    hits = []
    for kws, tid in RULES:
        if any(k in name for k in kws):
            if tid not in hits:
                hits.append(tid)
        if len(hits) >= 2:
            break
    return hits or [DEFAULT]


def strip_period(s):
    return (s or "").strip().rstrip("。；;，, ")


def make_desc(name, steps):
    acts = [strip_period(s.get("action")) for s in steps if s.get("action")]
    if not acts:
        return None
    if len(acts) == 1:
        return acts[0] + "。"
    def with_xian(s):
        return s if s.startswith("先") else "先" + s
    if len(acts) == 2:
        return "%s，再%s。" % (with_xian(acts[0]), acts[1])
    return "%s，再%s，最后%s。" % (with_xian(acts[0]), "，".join(acts[1:-1]), acts[-1])


def make_boundaries(s, kp_names):
    out = []
    if kp_names:
        shown = "、".join(kp_names[:3])
        more = "" if len(kp_names) <= 3 else "等 %d 个知识点" % len(kp_names)
        tail = ("」" + more + "上的问题") if more else "」上的问题"
        out.append(("只覆盖「" + shown + tail + "，不代表「%s」的全部应用。")
                   % (s.get("family") or s["name"]))
    fs = [strip_period(x) for x in (s.get("failure_signals") or []) if x]
    if fs:
        out.append("失效情形：" + "；".join(fs[:2]) + "。")
    return out


changed = 0
for f in sorted(glob.glob(os.path.join(C, "skills", "*", "*.jsonl"))):
    rows = jl(f)
    for s in rows:
        kp_names = [kp_title.get(k) or det.get(k, {}).get("definition", k)[:18]
                    for k in (s.get("kp_refs") or [])]
        d = make_desc(s["name"], s.get("steps") or [])
        if d:
            s["desc"] = d
        b = make_boundaries(s, [x for x in kp_names if x])
        if b:
            s["boundaries"] = b
        s["thought_refs"] = thought_of(s["name"])
        changed += 1
    order = ["uid", "name", "desc", "tier", "grade_band", "family", "thought_refs",
             "kp_refs", "conditions", "boundaries", "steps", "failure_signals",
             "alternatives", "review_status", "ext"]
    with open(f, "w", encoding="utf-8", newline="\n") as fh:
        for s in rows:
            out = {k: s[k] for k in order if k in s}
            for k in s:
                if k not in out:
                    out[k] = s[k]
            fh.write(json.dumps(out, ensure_ascii=False) + "\n")

print("enriched", changed, "skills")
allsk = []
for f in sorted(glob.glob(os.path.join(C, "skills", "*", "*.jsonl"))):
    allsk += jl(f)
print("thought_refs dist:", collections.Counter(t for s in allsk for t in s["thought_refs"]).most_common())
print("missing desc:", sum(1 for s in allsk if not s.get("desc")))
print("missing boundaries:", sum(1 for s in allsk if not s.get("boundaries")))
print("sample:", json.dumps({k: allsk[0][k] for k in ("uid", "name", "desc", "boundaries", "thought_refs")}, ensure_ascii=False, indent=1))
