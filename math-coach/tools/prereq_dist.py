# -*- coding: utf-8 -*-
"""把 prerequisite_of 按三种口径拆开打印：端点类型 / 空间位置 / 来源规则。
文档里写「同节多少条、跨册多少条」必须带口径，否则两句话都真却互相矛盾。
用法: PYTHONIOENCODING=utf-8 python tools/prereq_dist.py
"""
import json, os, sys, collections

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
EDGES = os.path.join(REPO, "content", "relations", "edges.jsonl")
NODES = os.path.join(REPO, "build", "framework", "nodes.jsonl")


def main():
    if not os.path.exists(NODES):
        print("先跑 python tools/framework_gen.py 生成 build/framework/nodes.jsonl")
        return 2
    N = {}
    for line in open(NODES, encoding="utf-8"):
        if line.strip():
            d = json.loads(line)
            N[d["id"]] = d
    pre = []
    for line in open(EDGES, encoding="utf-8"):
        if not line.strip():
            continue
        e = json.loads(line)
        if e["relation"] == "prerequisite_of":
            pre.append(e)

    def g(n, *keys):
        for k in keys:
            if n.get(k) is not None:
                return n.get(k)
        return None

    def where(e):
        a, b = N.get(e["src"], {}), N.get(e["dst"], {})
        if g(a, "volume_id", "vol") != g(b, "volume_id", "vol"):
            return "跨册"
        if g(a, "chapter_no", "ch") != g(b, "chapter_no", "ch"):
            return "跨章同册"
        if g(a, "section_no", "sec") != g(b, "section_no", "sec"):
            return "同章跨节"
        return "同节"

    print("prerequisite_of 共 %d 条" % len(pre))
    kk = collections.Counter((N.get(e["src"], {}).get("kind"), N.get(e["dst"], {}).get("kind"))
                             for e in pre)
    print("\n口径一 端点类型")
    for (a, b), n in kk.most_common():
        print("  %s -> %s : %d" % (a, b, n))

    print("\n口径二 空间位置")
    print("  全部 %d 条:" % len(pre), dict(collections.Counter(where(e) for e in pre).most_common()))
    for pair in ((("knowledge_point", "knowledge_point")), (("skill", "skill")), (("section", "section"))):
        sub = [e for e in pre
               if (N.get(e["src"], {}).get("kind"), N.get(e["dst"], {}).get("kind")) == pair]
        if sub:
            print("  只看 %s -> %s 的 %d 条:" % (pair[0], pair[1], len(sub)),
                  dict(collections.Counter(where(e) for e in sub).most_common()))

    print("\n口径三 来源")
    def rule(e):
        r = ((e.get("ext") or {}).get("x-rule") or e.get("basis") or "manual")
        return r
    for r, n in collections.Counter(rule(e) for e in pre).most_common():
        print("  %-28s %d" % (r, n))
    return 0


if __name__ == "__main__":
    sys.exit(main())
