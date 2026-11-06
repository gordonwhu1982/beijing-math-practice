# 问题与缺陷清单

下列缺口在 `docs/STATE.md` §8 已有记录。这里给编号，方便任务引用。本次没有复测。

| Issue ID | 严重度 | 优先级 | 关联需求/任务 | 环境/构建 | 复现步骤 | 预期结果 | 实际结果 | 证据 | 负责人 | 状态 | 复测结果 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| ISSUE-001 | 中 | 高 | REQ-002 / TASK-001 | 本地内容库，2026-10-29 口径 | 看 STATE §8 第 1 条 | 能自动判的题有结构化短答案，判不准仍是 manual | 2215 题保持 manual | `docs/STATE.md` §8 | 开发工程师 | OPEN | 未复测 |
| ISSUE-002 | 低 | 中 | REQ-003 / TASK-002 | `runtime/web/` | 打开思想总表后再找方法总表 | 有 `#/methods` | 方法总表没做 | `docs/STATE.md` §8 第 4 条 | 开发工程师 | OPEN | 未复测 |
| ISSUE-003 | 低 | 中 | REQ-003 / TASK-003 | 图谱几何图示 | 打开等腰三角形、三线合一、将军饮马以外的几何定义 | 图来自 figures.json | 目前只有这 3 张 | `docs/STATE.md` §8 第 9 条 | 开发工程师 | OPEN | 未复测 |
| ISSUE-004 | 高 | 高 | ADR-010 / TASK-011 | 当前 Cursor 会话，2026-11-04 | 按任务书检查子 Agent 能否使用 `claude-opus-5-5` | 核心设计岗位能真实调用该模型，并记下实际模型 | 精确标识不在名单里。仓库主人允许改用 `claude-opus-5-5-medium`。一次只读调用成功，平台原文是 Claude Opus 5.5 | `docs/delivery/agent-validation/MODEL-OPUS-2026-11-04.md` | 项目经理 | VERIFIED_FIXED | 2026-11-04 只读调用成功 |
| ISSUE-005 | 低 | 中 | TASK-012 | `http://127.0.0.1:8765/runtime/web/`，2026-11-04 | 打开 `#/today` 或 `#/map` | 根号和分数能按数学字体显示 | 页面底部提示数学字体没加载，woff2 返回 404。页面其余部分仍能打开 | `design/ux-redesign/screenshots/current/PAGE-001-today.png` | 项目经理 | OPEN | 未复测 |
| ISSUE-006 | 中 | 高 | TASK-012 | 视口 1180×820，`#/map` 分层，2026-11-04 | 在第 12 章的分层里点「全景」 | 手指或鼠标能点开全景，并留在当前章 | 一块约 865×6379 的内容层挡住按钮。脚本点击后才进入全景，右侧停在 1.1 | `design/ux-redesign/screenshots/current/SHOT-026-map-panorama.png` | 项目经理 | OPEN | 未复测 |
| ISSUE-007 | 中 | 高 | TASK-012 | 同上，字体提示已点掉 | 打开前后知识点，或看图谱里带角、带根号的条目 | 角和根号显示在句子里 | 「三个内角」后是空位和「∠…」；「在数轴上作出」后是空位；「直角三角形记作」后是空位 | `design/ux-redesign/screenshots/current/SHOT-025-rel-12.1-01.png` | 项目经理 | OPEN | 未复测 |

## 缺陷状态

`OPEN` / `TRIAGED` / `IN_PROGRESS` / `FIXED_PENDING_RETEST` / `VERIFIED_FIXED` / `REOPENED` / `ACCEPTED_RISK`
