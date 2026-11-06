# -*- coding: utf-8 -*-
"""审计 content/ 里的数学写法：未配对的 $、裸 LaTeX、Unicode 数学符号。
默认只报告，不改文件。用法: python tools/audit_math_text.py [--top N]
"""
import json, os, io, sys, re, collections
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
REPO = os.environ.get("MC_REPO", r"D:/个人/知识图谱/math-coach")
SRC = os.path.join(REPO, "content")
TOP = 12
if "--top" in sys.argv:
    TOP = int(sys.argv[sys.argv.index("--top") + 1])

UNI = re.compile(r"[√∛±×÷≤≥≠≈∥⊥∠△°ⁿ²³⁻¹⁰⁴⁵⁶⁷⁸⁹]")
LATEX = re.compile(r"\\[a-zA-Z]{2,}")
DOLLAR = re.compile(r"\$")

def walk(o, path, out):
    if isinstance(o, str):
        out.append((path, o))
    elif isinstance(o, list):
        for i, v in enumerate(o):
            walk(v, path + "[%d]" % i, out)
    elif isinstance(o, dict):
        for k, v in o.items():
            walk(v, path + "." + str(k), out)

def load_file(fp):
    rows = []
    if fp.endswith(".jsonl"):
        for i, line in enumerate(open(fp, encoding="utf-8")):
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(("l%d" % i, json.loads(line)))
            except Exception as e:
                rows.append(("l%d" % i, {"__bad__": str(e)}))
    elif fp.endswith(".json"):
        try:
            rows.append(("root", json.load(open(fp, encoding="utf-8"))))
        except Exception as e:
            rows.append(("root", {"__bad__": str(e)}))
    return rows

files = []
for root, dirs, names in os.walk(SRC):
    for n in names:
        if n.endswith(".jsonl") or n.endswith(".json"):
            files.append(os.path.join(root, n))
files.sort()

buckets = collections.defaultdict(list)   # kind -> [(relpath, path, sample)]
counts = collections.Counter()
file_kind = collections.Counter()

for fp in files:
    rel = os.path.relpath(fp, REPO).replace("\\", "/")
    for tag, obj in load_file(fp):
        strings = []
        walk(obj, "", strings)
        for p, s in strings:
            if len(s) < 2:
                continue
            nd = len(DOLLAR.findall(s))
            rest = re.sub(r"\$[^$]*\$", "", s)
            if nd % 2 == 1:
                buckets["odd_dollar"].append((rel, tag + p, s[:150], len(s), nd))
                counts["odd_dollar"] += 1
                file_kind["odd_dollar " + rel] += 1
            if LATEX.search(rest):
                buckets["bare_latex"].append((rel, tag + p, s[:150]))
                counts["bare_latex"] += 1
                file_kind["bare_latex " + rel] += 1
            if UNI.search(s) and not DOLLAR.search(s):
                kinds = []
                if re.search(r"√\s*[(（0-9a-zA-Z]", s):
                    kinds.append("uni_sqrt")
                if re.search(r"[a-zA-Z0-9)）]\s*[²³]", s):
                    kinds.append("uni_pow")
                if re.search(r"[≥≤≠]", s):
                    kinds.append("uni_cmp")
                for k in (kinds or ["uni_other"]):
                    buckets[k].append((rel, tag + p, s[:150]))
                    counts[k] += 1
                    file_kind[k + " " + rel] += 1

print("扫描文件 %d 个" % len(files))
for k in ("odd_dollar", "bare_latex", "uni_sqrt", "uni_pow", "uni_cmp", "uni_other"):
    print("\n=== %s : %d" % (k, counts[k]))
    for row in buckets[k][:TOP]:
        rel, p, s = row[0], row[1], row[2]
        print("   %s %s :: %s" % (rel, p, s))
print("\n=== 按文件")
for k, v in file_kind.most_common(24):
    print("   %6d  %s" % (v, k))