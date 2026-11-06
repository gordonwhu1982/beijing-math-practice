# -*- coding: utf-8 -*-
"""从题干里抽出以 A./A．/A、 开头的连续选项，写入侧挂 options 文件。

不改题干原文：选项只是另一份侧挂数据，前端据此渲染点选卡片。
验收口径是「重新数一遍并报告 parsed 与 missing」，不写死预期条数。
"""
import io, json, os, re, sys, glob

sys.stdout.reconfigure(encoding="utf-8")
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
QD = os.path.join(REPO, "content", "questions")

MARK = re.compile(r"(?<![A-Za-z0-9\\^_{}])[ABCD][.．、]")
KEYS = "ABCD"

# 答案里的正确选项字母：先按「【答】选 B」这类明确说法找，实在找不到才退回
# 「整条只有一种孤立大写字母」。两条都不成立就留 None —— 前端把这道题记成
# manual（点选能点，但不替你判对错），绝不猜一个字母当标准答案。
PATS = [
    r"【答】\s*选?\s*([A-D])(?![A-Za-z])",
    r"(?:答案|应选|故选|应填|选)\s*(?:是|为)?\s*[：:]?\s*([A-D])(?![A-Za-z])",
    r"^\s*([A-D])(?![A-Za-z])\s*$",
    r"^\s*([A-D])(?![A-Za-z])[。.，,、\s]",
]


def answer_key(answer):
    a = (answer or "").strip()
    for p in PATS:
        m = re.search(p, a, re.M)
        if m:
            return m.group(1)
    seen = set(re.findall(r"(?<![A-Za-z])([A-D])(?![A-Za-z])", a))
    return seen.pop() if len(seen) == 1 else None


def grab(stem):
    """返回 (options, stem_core)。抽不出四项就返回 (None, stem)。"""
    hits = []
    for m in MARK.finditer(stem):
        hits.append((m.group(0)[0], m.start(), m.end()))
    # 按 A B C D 顺序找连续四段；允许前面有别的内容
    best = None
    for i in range(len(hits)):
        if hits[i][0] != "A":
            continue
        seq = [hits[i]]
        want = iter("BCD")
        nxt = next(want, None)
        for h in hits[i + 1:]:
            if nxt is None:
                break
            if h[0] == nxt:
                seq.append(h)
                nxt = next(want, None)
        if len(seq) == 4:
            best = seq
            break
    if not best:
        return None, stem
    opts = []
    for j, (k, s, e) in enumerate(best):
        end = best[j + 1][1] if j + 1 < len(best) else len(stem)
        text = stem[e:end].strip()
        opts.append({"key": k, "text": text})
    if any(not o["text"] for o in opts):
        return None, stem
    core = stem[:best[0][1]].rstrip()
    if len(core) < 4:          # 选项前面什么都没剩下，说明这是别的结构，不当作题干+选项
        return None, stem
    return opts, core


def main():
    # --check：只比对磁盘上的侧挂文件与「按当前源题库重新抽取」的结果是否一致。
    # 侧挂文件是 build_web 的输入，它一旦 drift，前端显示的就是旧题干切分。
    check = "--check" in sys.argv[1:]
    drift = []
    vols = sorted(os.path.basename(d) for d in glob.glob(os.path.join(QD, "*")) if os.path.isdir(d))
    grand = {"total": 0, "choice": 0, "parsed": 0, "missing": 0}
    for vol in vols:
        for path in sorted(glob.glob(os.path.join(QD, vol, "ch*.jsonl"))):
            name = os.path.basename(path)
            if name.endswith(".answer.jsonl") or name.endswith(".options.jsonl") \
               or name.endswith(".meta.jsonl") or name.endswith(".kp.jsonl") or name.endswith(".spec.jsonl"):
                continue
            rows = [json.loads(l) for l in io.open(path, encoding="utf-8") if l.strip()]
            out = []
            for q in rows:
                grand["total"] += 1
                if (q.get("form") or "") != "choice":
                    continue
                grand["choice"] += 1
                opts, core = grab(q.get("stem") or "")
                if opts:
                    grand["parsed"] += 1
                    out.append({"id": q["id"], "status": "parsed", "options": opts,
                                "stem_core": core, "answer_key": answer_key(q.get("answer"))})
                else:
                    grand["missing"] += 1
                    out.append({"id": q["id"], "status": "missing", "options": [],
                                "answer_key": answer_key(q.get("answer"))})
            if out:
                dst = path[:-6] + ".options.jsonl"
                text = "".join(json.dumps(r, ensure_ascii=False) + chr(10) for r in out)
                old = io.open(dst, encoding="utf-8").read() if os.path.exists(dst) else None
                if check:
                    if old != text:
                        drift.append(name)
                else:
                    with io.open(dst, "w", encoding="utf-8", newline=chr(10)) as f:
                        f.write(text)
                print("%-24s choice=%-4d parsed=%-4d missing=%-4d" % (
                    name, len(out),
                    sum(1 for r in out if r["status"] == "parsed"),
                    sum(1 for r in out if r["status"] == "missing")))
    print("总计 题 %d ；choice %d ；parsed %d ；missing %d" % (
        grand["total"], grand["choice"], grand["parsed"], grand["missing"]))
    if check:
        if drift:
            print("DRIFT %d 个文件与题库不一致：%s" % (len(drift), "、".join(drift)))
            print("修法：python tools/question_options_extract.py  （重写侧挂文件）")
            raise SystemExit(1)
        print("选择题侧挂文件与题库一致")


if __name__ == "__main__":
    main()