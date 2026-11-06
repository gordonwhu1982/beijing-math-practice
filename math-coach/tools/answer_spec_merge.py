
# -*- coding: utf-8 -*-
"""合并 answer_spec：机器 draft + 逐题精修（spec.a / spec.b）→ ch12.spec.jsonl。
优先级：精修 > draft。interval 缺 low/high/low_closed/high_closed 时从 note 里解析补上。
用法：python tools/answer_spec_merge.py [--vol 801] [--chapter ch12]
"""
import argparse, glob, json, os, re, sys

sys.stdout.reconfigure(encoding="utf-8")
REPO = os.environ.get("MC_REPO", r"D:\个人\知识图谱\math-coach")
KEYS = ["id", "type", "answer_type", "var", "values", "order_policy", "unit",
        "low", "high", "low_closed", "high_closed", "note", "confidence"]

def read_jsonl(p):
    out = []
    if not os.path.exists(p):
        return out
    for ln in open(p, encoding="utf-8"):
        ln = ln.strip()
        if ln:
            out.append(json.loads(ln))
    return out

def parse_interval_note(rec):
    """从 note 里抠出 low=3 high=13 low_closed=false high_closed=false 这类边界"""
    note = rec.get("note") or ""
    m = {}
    for k in ("low", "high"):
        mm = re.search(k + r"\s*=\s*(-?\d+(?:\.\d+)?)", note)
        if mm:
            m[k] = float(mm.group(1))
        elif re.search(k + r"\s*=\s*(无|none|null|None)", note):
            m[k] = None
    for k in ("low_closed", "high_closed"):
        mm = re.search(k + r"\s*=\s*(true|false|True|False)", note)
        if mm:
            m[k] = mm.group(1).lower() == "true"
    if "low" not in m or "high" not in m:
        # 退一步：从 values[0].raw 里的 3<x<13 解析
        raw = ""
        if rec.get("values"):
            raw = str(rec["values"][0].get("raw") or "")
        mm = re.match(r"^(-?\d+(?:\.\d+)?)?(<=|<)?([A-Za-z]+)(<=|<)?(-?\d+(?:\.\d+)?)?$", raw.replace(" ", ""))
        if mm and raw:
            if mm.group(1) is not None:
                m["low"] = float(mm.group(1)); m["low_closed"] = mm.group(2) == "<="
            if mm.group(5) is not None:
                m["high"] = float(mm.group(5)); m["high_closed"] = mm.group(4) == "<="
    return m

def norm(rec, src):
    out = {"id": rec["id"], "type": rec.get("type"), "answer_type": rec.get("answer_type"),
           "var": rec.get("var"), "values": rec.get("values") or [],
           "order_policy": rec.get("order_policy") or "any", "unit": rec.get("unit")}
    if out["type"] == "interval":
        extra = parse_interval_note(rec)
        for k in ("low", "high", "low_closed", "high_closed"):
            if rec.get(k) is not None or k in ("low_closed", "high_closed"):
                out[k] = rec.get(k)
        for k, v in extra.items():
            if out.get(k) is None and k in ("low", "high"):
                out[k] = v
            elif k in ("low_closed", "high_closed") and out.get(k) in (None, False):
                out[k] = v
    out["note"] = rec.get("note")
    out["confidence"] = rec.get("confidence") or "draft"
    out["source"] = src
    return out

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--vol", default="801")
    ap.add_argument("--chapter", default="ch12")
    a = ap.parse_args()
    d = os.path.join(REPO, "content", "questions", a.vol)
    merged, order = {}, []

    draft = read_jsonl(os.path.join(d, a.chapter + ".spec.draft.jsonl"))
    for r in draft:
        merged[r["id"]] = norm(r, "draft")
        order.append(r["id"])

    refined = 0
    for p in sorted(glob.glob(os.path.join(d, a.chapter + ".spec.?*.jsonl"))):
        base = os.path.basename(p)
        if base in (a.chapter + ".spec.jsonl", a.chapter + ".spec.draft.jsonl"):
            continue
        for r in read_jsonl(p):
            merged[r["id"]] = norm(r, "refined")
            refined += 1
            if r["id"] not in order:
                order.append(r["id"])

    dst = os.path.join(d, a.chapter + ".spec.jsonl")
    with open(dst, "w", encoding="utf-8", newline="\n") as f:
        for i in order:
            rec = merged[i]
            f.write(json.dumps({k: rec.get(k) for k in KEYS + ["source"]}, ensure_ascii=False) + "\n")
    import collections
    cnt = collections.Counter(r["type"] for r in merged.values() if r.get("source") != "draft")
    auto = sum(v for k, v in cnt.items() if k in ("exact_value", "value_set", "interval", "judgement"))
    print("rows", len(order), "refined", refined, "draft-only", len(order) - len(set(order[:len(draft)]) & {r["id"] for r in merged.values() if r["source"] == "refined"}))
    print("refined type:", dict(cnt))
    print("refined auto-judgeable:", auto)
    print("wrote", dst)

if __name__ == "__main__":
    main()
