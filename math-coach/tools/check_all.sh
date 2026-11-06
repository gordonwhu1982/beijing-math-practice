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
  # 视觉断言先跑：它不点页面、只量像素与文本，几秒出结果，失败时离改动最近
  step "视觉断言"       node tools/ux_asserts.js
  step "无头浏览器冒烟" node tools/web_smoke.js
  # 冒烟收尾会 taskkill chrome，紧接着启动探针偶发抢不到调试端口（实测出现过一次假 FAIL）
  sleep 1
  step "详情面板探针"   node tools/web_detail_probe.js
fi
printf '\n===== 失败步骤数: %d =====\n' "$FAIL"
exit $((FAIL > 0))
