# 当前产品功能与页面地图

- 负责人：主会话（项目经理，从代码读出，不是设计方案）
- 版本：0.2
- 更新时间：2026-11-04 23:05 +08:00
- 关联：TASK-010、TASK-012、ADR-011
- 状态：12 个路由都打开过。观察写在 `04_CURRENT_UI_AUDIT.md`

产品是给一个初二学生用的本地数学教辅。权威数据在 Git 文本里，页面是 `runtime/web/` 的静态前端，没有账号和后端。使用者、教材范围和数字以 `docs/STATE.md` 为准，本文件不另抄一套会过期的计数。

## 页面

路由定义在 `runtime/web/js/router.js`。没有对应视图时会落到今日页。下面的「已实现」只表示代码里注册了视图，不表示本轮已经打开并截图。

| 页面 ID | 路由 | 代码 | 用户在这里做什么 | 本轮运行 |
|---|---|---|---|---|
| PAGE-001 | `#/today` | `js/views/today.js` | 看今天的练习记录 | 空记录，并选定 12.1。见 SHOT-001、SHOT-010、SHOT-011 |
| PAGE-002 | `#/toc`、`#/toc/<册>` | `js/views/toc.js` | 按教材目录进入 | 已打开六册列表。见 SHOT-002。没有点进某一册 |
| PAGE-003 | `#/sec/<册>/<节>` | `js/views/section.js` | 看一节并进入练习 | 打开 `#/sec/801/12.1`。见 SHOT-014、SHOT-015 |
| PAGE-004 | `#/kp/<知识点>` | `js/views/kp.js` | 看知识点讲解 | 打开 `#/kp/K801-12.1-01` 的上半屏。见 SHOT-016 |
| PAGE-005 | `#/map` 及 `vol`、`ch`、`view`、`node`、`read` | `js/views/map.js` | 看图谱、收焦点、展开讲解 | 导图章卡片、分层、第 12 章、知识点卡片、全景。见 SHOT-003、SHOT-017 至 SHOT-020、SHOT-026 |
| PAGE-006 | `#/rel/<知识点>` | `js/views/rel.js` | 看前后知识点 | 打开 `#/rel/K801-12.1-01`。见 SHOT-025 |
| PAGE-007 | `#/thoughts` | `js/views/thoughts.js` | 看思想 | 已打开，看到 16 条里的上半部分。见 SHOT-004 |
| PAGE-008 | `#/practice/<册>/<节>` | `js/views/practice.js` | 做题 | 打开 12.1 第 1 题和提示，没有交卷。见 SHOT-012、SHOT-013 |
| PAGE-009 | `#/retry` | `js/views/retry.js` | 重做未过的题 | 空状态。见 SHOT-024 |
| PAGE-010 | `#/weak` | `js/views/weak.js` | 看不稳的点 | 空状态。见 SHOT-021 |
| PAGE-011 | `#/archive` | `js/views/archive.js` | 看作答归档 | 0 条。见 SHOT-022 |
| PAGE-012 | `#/evidence` | `js/views/evidence.js` | 看关系依据 | 已打开上半屏。见 SHOT-023 |

`router.js` 文件头注释没有写 `#/thoughts`。视图文件里注册了这个名字。注释和代码不一致，以注册为准。

STATE §8 第 4 条写「方法总表 `#/methods` 没做」。本轮在 `router.js` 和 `MC.router.view` 里没有看到 `methods` 视图。这只说明路由表里没有，不能单独证明产品还缺这个能力，也不能证明后来用别的入口做了同等的事。

## 功能

| 功能 ID | 功能 | 对应页面 | 依据 | 不确定的地方 |
|---|---|---|---|---|
| FEAT-001 | 六册知识点图谱 | PAGE-005 | `map.js` 注册了 `map` | 11 月 2–3 日提交改过画面。现行交互以打开页面为准，不以 10 月计划为准 |
| FEAT-002 | 知识点讲解 | PAGE-004、PAGE-005 | `kp.js`，图谱里也能展开阅读 | 七段结构是否仍与规格一致，未复测 |
| FEAT-003 | 按教材目录进入 | PAGE-002、PAGE-003 | `toc.js`、`section.js` | 节页已打开。目录没有点进某一册 |
| FEAT-004 | 做题、重做、薄弱、归档 | PAGE-008 至 PAGE-011 | 四个视图文件 | 做题看到第 1 题，没有交卷。重做、薄弱、归档是空状态 |
| FEAT-005 | 关系依据 | PAGE-006、PAGE-012 | `rel.js`、`evidence.js` | 两个路由都打开过 |
| FEAT-006 | 数学思想 | PAGE-007 | `thoughts.js` | 只看了上半部分 |
| FEAT-007 | 本地作答记录 | PAGE-001、PAGE-009 至 PAGE-011 | STATE 写明 localStorage，可导入导出 | 本轮未读存储代码 |

## 需求编号

交付层 `docs/delivery/REQUIREMENTS.md` 仍是空模板。已有的 REQ-001、REQ-002、REQ-003 出现在 `BACKLOG.md`，分别挂着闸门、填空短答案和方法/图示，不能当成完整需求基线。本轮不新编 REQ 编号去填满历史规划。

## 本轮没有写成事实的事

- 哪个页面好用或难用。
- 竞品有哪些应该照做。
- 11 月提交之后，STATE §8 的九条还剩哪几条。
