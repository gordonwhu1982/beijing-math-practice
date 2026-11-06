#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""skills_auto_check.py —— 解题方法（skill）实体自检。

用法:  python tools/skills_auto_check.py --vol 802
退出码: 0 = 全部通过；1 = 有错误（含未覆盖知识点）。

检查项:
  1. 每行是合法 JSON 对象
  2. 必填字段 uid/name/steps/kp_refs 存在且非空
  3. 强建议字段 desc/boundaries/conditions/failure_signals/tier/thought_refs/grade_band/review_status 齐全
  4. uid 全局唯一，格式 SK-<vol>-<节号>-<两位序号>，节号在本册框架里存在，
     且文件 ch<章号>.jsonl 的章号与该节所属章一致
  5. kp_refs 全部存在于 <vol>.detail.jsonl 的 uid 集合
  6. thought_refs 全部在 TH-01..TH-15
  7. steps[].ordinal 从 1 连续，每步 action/basis 非空
  8. tier 在 core/extend/olympiad 内
  9. 每个知识点至少被一条 core 方法覆盖（打印未覆盖清单）
"""
import argparse
import json
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SKILLS_DIR = os.path.join(ROOT, "content", "skills")
KP_DIR = os.path.join(ROOT, "content", "framework", "knowledge_points")

TIERS = {"core", "extend", "olympiad"}
REVIEW = {"stub", "ai_draft", "human_checked", "disputed", "retired"}
# 思想/方法族的合法 uid 从 content/thoughts.jsonl 动态读——写死 1..16 会在加 TH-17 时
# 把正确引用判成非法（子代理曾因此把类比的 3 条方法改挂到 TH-12 参数法上）。
def _thought_uids():
    p = os.path.join(ROOT, "content", "thoughts.jsonl")
    if not os.path.exists(p):
        return set()
    return {json.loads(l)["uid"] for l in open(p, encoding="utf-8") if l.strip()}


THOUGHTS = _thought_uids()
REQUIRED = ["uid", "name", "steps", "kp_refs"]
ADVISED = ["desc", "boundaries", "conditions", "failure_signals", "tier",
           "thought_refs", "grade_band", "review_status"]
UID_RE = re.compile(r"^SK-(\d{3})-(\d{1,2}\.\d{1,2})-(\d{2})$")


def read_jsonl(path):
    rows = []
    with open(path, "r", encoding="utf-8") as f:
        for i, line in enumerate(f, 1):
            if not line.strip():
                continue
            rows.append((i, line))
    return rows


def load_framework(vol):
    path = os.path.join(KP_DIR, vol + ".json")
    with open(path, "r", encoding="utf-8") as f:
        data = json.load(f)
    sections = {}
    for ch in data.get("chapters", []):
        for sec in ch.get("sections", []):
            sections[str(sec["no"])] = str(ch["no"])
    return sections


def load_kp_uids(vol):
    path = os.path.join(KP_DIR, vol + ".detail.jsonl")
    uids = []
    with open(path, "r", encoding="utf-8") as f:
        for line in f:
            if not line.strip():
                continue
            uids.append(json.loads(line)["uid"])
    return uids


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--vol", required=True)
    ap.add_argument("--allow-uncovered", action="store_true",
                    help="未覆盖知识点只报警告，不置退出码非 0")
    args = ap.parse_args()
    vol = args.vol

    errors = []
    warnings = []
    sections = load_framework(vol)
    kp_uids = load_kp_uids(vol)
    kp_set = set(kp_uids)

    vol_dir = os.path.join(SKILLS_DIR, vol)
    if not os.path.isdir(vol_dir):
        print("[FAIL] 目录不存在: content/skills/%s" % vol)
        return 1
    files = sorted(f for f in os.listdir(vol_dir) if f.endswith(".jsonl"))

    seen = {}
    covered = {}
    tier_count = {"core": 0, "extend": 0, "olympiad": 0}
    total = 0
    per_file = []

    for fname in files:
        m = re.match(r"^ch(\d+)\.jsonl$", fname)
        if not m:
            warnings.append("文件名不是 ch<章号>.jsonl: %s" % fname)
            ch_no = None
        else:
            ch_no = m.group(1)
        path = os.path.join(vol_dir, fname)
        n_ok = 0
        for lineno, line in read_jsonl(path):
            where = "content/skills/%s/%s:%d" % (vol, fname, lineno)
            try:
                rec = json.loads(line)
            except Exception as e:
                errors.append("%s JSON 解析失败: %s" % (where, e))
                continue
            if not isinstance(rec, dict):
                errors.append("%s 不是 JSON 对象" % where)
                continue
            total += 1
            ok = True
            for k in REQUIRED:
                v = rec.get(k)
                if v in (None, "", [], {}):
                    errors.append("%s 缺少必填字段 %s" % (where, k))
                    ok = False
            for k in ADVISED:
                v = rec.get(k)
                if v in (None, "", [], {}):
                    errors.append("%s 缺少强建议字段 %s" % (where, k))
                    ok = False
            uid = rec.get("uid")
            if isinstance(uid, str):
                mm = UID_RE.match(uid)
                if not mm:
                    errors.append("%s uid 格式不合规: %s" % (where, uid))
                    ok = False
                else:
                    if mm.group(1) != vol:
                        errors.append("%s uid 册号不是 %s: %s" % (where, vol, uid))
                        ok = False
                    sec = mm.group(2)
                    if sec not in sections:
                        errors.append("%s uid 节号 %s 不在本册框架内" % (where, sec))
                        ok = False
                    elif ch_no and sections[sec] != ch_no:
                        errors.append("%s 文件 ch%s 与节 %s 所属章 %s 不一致"
                                      % (where, ch_no, sec, sections[sec]))
                        ok = False
                if uid in seen:
                    errors.append("%s uid 重复: %s（首次出现在 %s）" % (where, uid, seen[uid]))
                    ok = False
                else:
                    seen[uid] = where

            krefs = rec.get("kp_refs")
            if isinstance(krefs, list):
                if not krefs:
                    errors.append("%s kp_refs 为空" % where)
                    ok = False
                for r in krefs:
                    if r not in kp_set:
                        errors.append("%s kp_refs 含不存在的知识点: %s" % (where, r))
                        ok = False
            elif krefs is not None:
                errors.append("%s kp_refs 不是数组" % where)
                ok = False

            trefs = rec.get("thought_refs")
            if isinstance(trefs, list):
                for t in trefs:
                    if t not in THOUGHTS:
                        errors.append("%s thought_refs 含非法 uid: %s" % (where, t))
                        ok = False
                if len(trefs) > 2:
                    warnings.append("%s thought_refs 超过 2 个: %s" % (where, trefs))
            elif trefs is not None:
                errors.append("%s thought_refs 不是数组" % where)
                ok = False

            tier = rec.get("tier")
            if tier not in TIERS:
                errors.append("%s tier 非法: %s" % (where, tier))
                ok = False
            rs = rec.get("review_status")
            if rs is not None and rs not in REVIEW:
                errors.append("%s review_status 非法: %s" % (where, rs))
                ok = False
            gb = rec.get("grade_band")
            if gb is not None and str(gb) != vol:
                errors.append("%s grade_band 应为 %s，实为 %s" % (where, vol, gb))
                ok = False

            steps = rec.get("steps")
            if isinstance(steps, list) and steps:
                for i, st in enumerate(steps, 1):
                    if not isinstance(st, dict):
                        errors.append("%s steps[%d] 不是对象" % (where, i))
                        ok = False
                        continue
                    if st.get("ordinal") != i:
                        errors.append("%s steps 第 %d 项 ordinal=%r，应为 %d"
                                      % (where, i, st.get("ordinal"), i))
                        ok = False
                    for f in ("action", "basis"):
                        if not st.get(f):
                            errors.append("%s steps[%d] 缺 %s" % (where, i, f))
                            ok = False
            if not ok:
                continue
            n_ok += 1
            tier_count[tier] += 1
            if tier == "core":
                for r in krefs:
                    covered[r] = covered.get(r, 0) + 1
        per_file.append((fname, n_ok))

    uncovered = [u for u in kp_uids if u not in covered]

    print("== skills_auto_check vol=%s ==" % vol)
    print("文件: %s" % (", ".join("%s(%d)" % (f, n) for f, n in per_file) or "无"))
    print("方法总数: %d ; core=%d extend=%d olympiad=%d"
          % (total, tier_count["core"], tier_count["extend"], tier_count["olympiad"]))
    print("知识点总数: %d ; 已被 core 覆盖: %d ; 未覆盖: %d"
          % (len(kp_uids), len(kp_uids) - len(uncovered), len(uncovered)))
    if uncovered:
        print("未覆盖知识点清单:")
        for u in uncovered:
            print("  - " + u)
    if warnings:
        print("警告 (%d):" % len(warnings))
        for w in warnings:
            print("  ! " + w)
    if errors:
        print("错误 (%d):" % len(errors))
        for e in errors:
            print("  x " + e)
        print("RESULT: FAIL")
        return 1
    if uncovered and not args.allow_uncovered:
        print("RESULT: FAIL (存在未覆盖知识点)")
        return 1
    print("RESULT: PASS")
    return 0


if __name__ == "__main__":
    sys.exit(main())
