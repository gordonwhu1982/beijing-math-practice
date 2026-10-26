#!/usr/bin/env bash
# 本地体检：一条命令跑完 引擎测试 + 数据校验 (+ 题目自动核验)
# 用法： ./dev/check.sh        全部
#        ./dev/check.sh quick  只跑测试与结构校验
set -uo pipefail
cd "$(dirname "$0")/.."
fail=0
echo "== 1/3 引擎测试 =="
if node tests/test_engine.js >/tmp/bmp_test.log 2>&1; then tail -1 /tmp/bmp_test.log
else echo "引擎测试失败，见 /tmp/bmp_test.log"; fail=1; fi
echo
echo "== 2/3 结构与数据校验 =="
if python scripts/validate.py >/tmp/bmp_val.log 2>&1; then grep -E "题库：共|VALIDATION" /tmp/bmp_val.log | tail -3
else echo "数据校验失败："; grep -E "^错误|VALIDATION FAILED" /tmp/bmp_val.log | head -20; fail=1; fi
if [ "${1:-all}" != "quick" ]; then
  echo
  echo "== 3/3 题目 verify 自动核验（较慢）=="
  mkdir -p out
  if python scripts/verify_questions.py --report out/verify-report.json >/tmp/bmp_verify.log 2>&1; then tail -5 /tmp/bmp_verify.log
  else echo "核验返回非 0（不等于题目有错，先看报告）"; tail -8 /tmp/bmp_verify.log; fail=1; fi
fi
echo
if [ $fail -eq 0 ]; then echo "体检通过"; else echo "体检有问题，先修再入库"; fi
exit $fail
