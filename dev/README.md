# 本地开发说明（北京数学练习）

本仓库是 [xiaoyang111222/cn-math-taxonomy](https://github.com/xiaoyang111222/cn-math-taxonomy) 的个人分叉，
保留了上游完整提交历史（基线 tag `fork-base` = 上游 `f50cece`）。数据与代码许可仍为 **CC BY-NC 4.0**，禁止商用。

## 与上游的差异（本分叉刻意改的）

| 项 | 上游 | 本分叉 | 原因 |
| --- | --- | --- | --- |
| 站名 | 中小学知识图谱 | 北京数学练习 | 改名 |
| 统计上报 | 作者自建 Worker | `endpoint: ''` 关闭 | 本地使用不外发事件 |
| PWA 缓存名 | `cnm-pwa-*` | `bmp-pwa-*` | 与上游站点缓存隔离，互不清除 |
| 换行 | 未声明 | `.gitattributes` 锁 LF | 避免 Windows 整文件 diff |
| 开发脚本 | 无 | `dev/` | 体检、启动、同步上游 |

## 日常命令

```bash
./dev/check.sh            # 引擎测试 + 数据校验 + 题目 verify 核验（改数据后必跑）
./dev/check.sh quick      # 只跑前两项，快
./dev/start-server.bat    # 或 python -m http.server 8000，浏览器开 http://localhost:8000/
./dev/pull-upstream.sh    # 看上游有什么新提交与差异
```

## 改数据前必须知道的三条硬约束

1. `scripts/validate.py` 是闸门：题目 `id` 必须形如 `<topicId>_q<N>`，且字段只能取
   `Q_FIELDS` 白名单内的键（`id, topicId, difficulty, type, prompt, answer, choices, accept, verify,`
   `figure, unordered, percent, fixed_from_source, hideChoiceText`）。加新字段会被判「未知字段」而失败。
   真要扩字段，得同步改 `scripts/validate.py`。
2. 难度只有三档 `basic / standard / advanced`；每个知识点题数下限由校验器控制（现约 4 题/点）。
3. 判题器 `diagnose/engine.js` 只可靠自动判 `choice` 与 `numeric`，`short/self` 一律人工自评；
   `verify` 不参与前端判题，只被 `scripts/verify_questions.py` 在 AST 白名单沙箱里求值。

## 提交约定

- 上游合并：`git merge upstream/main`，数据冲突优先取上游，本地新增内容放独立文件（如 `data/local-*.json`），
  避免与上游同名大文件对撞。
- 每次改 `data/*.json` 后跑 `./dev/check.sh`，通过再 commit。
- 回滚基线：`git diff fork-base..HEAD` 能列出本分叉的全部改动。
