#!/usr/bin/env bash
# 一次跑完全部闸门。任何一步失败就停下并标出是哪一步。
# 用法： bash tools/check_all.sh          （跳过无头浏览器冒烟）
#        bash tools/check_all.sh --web    （连冒烟一起跑，需要本机 Chrome）
set -u
cd "$(dirname "$0")/.." || exit 1
FAIL=0
step() {
  local name="$1"; shift
  printf '\n=== %s ===\n' "$name"
  if "$@"; then printf '  [OK] %s\n' "$name"
  else printf '  [FAIL] %s\n' "$name"; FAIL=$((FAIL + 1))
  fi
}
step "关系表派生" python tools/edges_build.py
step "关系表闸门" python tools/relations_check.py
step "方法先后起草" python tools/skill_prereq_check.py
step "框架派生"   python tools/framework_gen.py
step "横向对照表" python tools/analogies_doc.py --check
step "选择题选项" python tools/question_options_extract.py --check
step "字段契约"   python tools/schema_check.py
step "题库校验"   python tools/questions_check.py
step "评分点"     python tools/rubric_check.py
step "数学式"     node tools/katex_selftest.js
step "判题回归"   node tools/judge_spec_test.js
step "判题一致性" node tools/judge_spec_audit.js
step "框架报告"   python tools/framework_status.py
step "前端切片"   python tools/build_web.py
step "题→知识点"   python tools/questions_kp_check.py
if [ "${1:-}" = "--web" ]; then
  # 2026-11-19：runtime/web 换成 ux-v2 那一版单文件 app.js（与 design/ux-v2/app 同源，
  # 由 tools/sync_ui.py 保证三处一致）。旧三道 web 闸门（ux_asserts / web_smoke /
  # web_detail_probe）判的是 js/views 架构的 hash 路由与 DOM 类名，换架构后一条都不成立 ——
  # 留着跑只会满屏假红，把真问题埋掉。界面闸门改由 ux-v2 的 smoke 承担：
  # 38 路由 × 3 视口，逐路由量 ovf / off / clip / tiny / tap / ghost / kx，退出码 = 失败条数。
  step "界面闸门(38 路由 × 3 视口)" env UXV2_PRE=/runtime/web/ UXV2_PORT=8786 UXV2_CDP=9536 node design/ux-v2/tools/qa/smoke.mjs
fi
printf '\n===== 失败步骤数: %d =====\n' "$FAIL"
exit $((FAIL > 0))
