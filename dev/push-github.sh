#!/usr/bin/env bash
# 把本分叉推到 GitHub。前提：先在 https://github.com/new 建同名空仓库（不要勾选初始化 README）
# 用法： ./dev/push-github.sh [仓库名，默认 beijing-math-practice]
set -e
cd "$(dirname "$0")/.."
NAME="${1:-beijing-math-practice}"
GH=git
if [ -x "/d/Program Files/Git/cmd/git.exe" ]; then GH="/d/Program Files/Git/cmd/git.exe"; fi
URL="https://github.com/gordonwhu1982/$NAME.git"
echo "目标：$URL"
echo "用 git：$GH（系统 Git 带 Git Credential Manager，已登录你的账号）"
"$GH" remote set-url origin "$URL"
echo "=== 推送 main（上游完整历史 + 本分叉提交）==="
"$GH" push -u origin main
echo "=== 推送 fork-base 标签（上游基线标记）==="
"$GH" push origin tag fork-base
echo "完成。查看：$URL"
