#!/usr/bin/env bash
# 拉上游 cn-math-taxonomy 更新：先看差异，再决定是否合并
set -e
cd "$(dirname "$0")/.."
git fetch upstream || {
  echo "本地镜像不可用，改走 GitHub 直连："
  git remote set-url upstream https://github.com/xiaoyang111222/cn-math-taxonomy.git
  git fetch upstream
}
echo "=== 上游新提交 ==="
git --no-pager log --oneline HEAD..upstream/main | head -30 || true
echo
echo "=== 差异统计 ==="
git --no-pager diff --stat HEAD...upstream/main | tail -20 || true
echo
echo "确认后：git merge upstream/main"
