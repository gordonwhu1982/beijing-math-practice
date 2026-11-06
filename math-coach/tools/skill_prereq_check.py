# -*- coding: utf-8 -*-
"""校验 content/framework/skill_prerequisites.json：
uid 有效、无自环、无重复、无环，并给出覆盖率。用法：
  python tools/skill_prereq_check.py            # 校验 + 统计
  python tools/skill_prereq_check.py --vol 701  # 只看某一册的覆盖率
"""
import json, os, sys, glob, collections

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
P = os.path.join(REPO, "content", "framework", "skill_prerequisites.json")


def load_skills():
    out = {}
    for f in sorted(glob.glob(os.path.join(REPO, "content", "skills", "*", "ch*.jsonl"))):
        vol = os.path.basename(os.path.dirname(f))
        for line in open(f, encoding="utf-8"):
            line = line.strip()
            if not line:
                continue
            d = json.loads(line)
            d["_vol"] = vol
            out[d["uid"]] = d
    return out


def main():
    vol_filter = None
    if "--vol" in sys.argv:
        vol_filter = sys.argv[sys.argv.index("--vol") + 1]
    skills = load_skills()
    doc = json.load(open(P, encoding="utf-8"))
    rows = doc.get("edges") or []
    bad = []
    seen = set()
    adj = collections.defaultdict(list)
    # Hand-drafted edges may cross volumes when a later method's own steps
    # name an earlier method. The rejected kp-to-skill inference stays out.
    n_cross = 0
    for i, e in enumerate(rows):
        a, b = e.get("from"), e.get("to")
        if a not in skills:
            bad.append("第 %d 条 from 不存在: %s" % (i + 1, a))
            continue
        if b not in skills:
            bad.append("第 %d 条 to 不存在: %s" % (i + 1, b))
            continue
        if a == b:
            bad.append("第 %d 条自环: %s" % (i + 1, a))
        if (a, b) in seen:
            bad.append("第 %d 条重复: %s -> %s" % (i + 1, a, b))
        seen.add((a, b))
        if skills[a]["_vol"] != skills[b]["_vol"]:
            n_cross += 1
        adj[a].append(b)

    # 环检测
    color = {}

    def dfs(u, stack):
        color[u] = 1
        for v in adj.get(u, []):
            if color.get(v) == 1:
                bad.append("有环: %s" % " -> ".join(stack + [u, v]))
            elif color.get(v, 0) == 0:
                dfs(v, stack + [u])
        color[u] = 2

    for u in list(adj):
        if color.get(u, 0) == 0:
            dfs(u, [])

    for b in bad:
        print("ERR", b)
    print("skill_prerequisites: %d 条，错 %d 处，跨册 %d 条" % (len(rows), len(bad), n_cross))

    by_vol = collections.Counter()
    for e in rows:
        by_vol[e["from"][3:6]] += 1
    print("按册起笔条数:", dict(sorted(by_vol.items())))

    tot = collections.Counter()
    for uid, d in skills.items():
        tot[d["_vol"]] += 1
    # 口径：一条边只让 to 这一个方法「知道先练什么」，所以按 to 去重数，不是行数
    draft = collections.defaultdict(set)
    for e in rows:
        draft[e["to"][3:6]].add(e["to"])
    print("草稿文件：")
    for v in sorted(tot):
        if vol_filter and v != vol_filter:
            continue
        n, c = tot[v], len(draft[v])
        print("  %s: 方法 %3d，有前置的 %3d（%.0f%%）" % (v, n, c, 100.0 * c / n if n else 0))
    # 入表口径：含 16 条规则边（skill_dep_by_kp），且扣掉与草稿重合被去重的那几条
    ep = os.path.join(REPO, "content", "relations", "edges.jsonl")
    if os.path.exists(ep):
        live = collections.defaultdict(set)
        for line in open(ep, encoding="utf-8"):
            if not line.strip():
                continue
            e = json.loads(line)
            if (e.get("relation") == "prerequisite_of"
                    and str(e.get("src", "")).startswith("SK-") and str(e.get("dst", "")).startswith("SK-")):
                live[e["dst"][3:6]].add(e["dst"])
        print("入表后（含 16 条规则边、去重）：")
        s1 = s2 = 0
        for v in sorted(tot):
            if vol_filter and v != vol_filter:
                continue
            n, c = tot[v], len(live[v])
            s1 += c; s2 += n
            print("  %s: 方法 %3d，有前置的 %3d（%.0f%%）" % (v, n, c, 100.0 * c / n if n else 0))
        if s2:
            print("  合计 %d/%d（%.1f%%）" % (s1, s2, 100.0 * s1 / s2))
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
