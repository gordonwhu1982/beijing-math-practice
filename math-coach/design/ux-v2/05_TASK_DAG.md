# 05 任务与依赖（R3 起步）

写清三件事：谁做、能改哪些文件、什么算完。**写入范围是硬边界**，两个人不许同时改同一个文件。

## 就绪任务

| ID | 任务 | 依赖 | 可改路径 | 验收 |
|---|---|---|---|---|
| T3-1 | 建 `app/` 副本并跑通 | R1 | `design/ux-v2/app/**` | 起服务后 `#/today` 等 12 路由可渲染，控制台 0 报错 |
| T3-3 | 缓存串自动化 | T3-1 | `design/ux-v2/tools/**` | 改任一 js 后重跑脚本，`?v=` 变化 |
| T3-5 | 数据契约文档 | — | `design/ux-v2/08_DATA_CONTRACT.md` | 字段表覆盖 items/ex/figures/graph 四类 |
| T3-6 | 记录契约 | — | `design/ux-v2/09_RECORD_CONTRACT.md` | 草稿与产品记录逐字段映射，无「待定」 |
| T3-2 | 拆 app.js 五层 | T3-1 | `design/ux-v2/app/js/**` | 拆分前后同路由截图 sha256 相同 |
| T3-4 | 验收脚本 v0 | T3-1 | `design/ux-v2/tools/qa/**` | 12 路由报告全绿；故意改坏一处能红 |
| T3-7 | 修 FD-12 交卷被裁 | T3-4 | `design/ux-v2/app/app.css`、`app/js/views/practice.js` | 1180×820 与 1024×768 下「交卷」按钮 `getBoundingClientRect().right <= innerWidth` |

## 待规划（R4 起）

T4-1…T4-8 见 `04_ROADMAP.md`，本轮不派发；等 R3 判据脚本能跑之后再拆细。

## RACI

| 角色 | 位置 |
|---|---|
| A（拍板） | 用户 |
| R（执行） | 主会话（项目经理）+ 开发 |
| C（评审） | 产品、UX、QA 各一份报告 |
| I（知会） | 通过 `reviews/ROUND_LOG.md` 记录 |

## 并行规则

- 多人同时动手时必须分文件；同一文件只允许一个执行者。
- 评审角色**只读**：只能在 `reviews/` 里写，不改 `app/`、不改 `tools/`。
- 冲突处理：以主会话为准，合并后统一跑判据。
### 本轮新增（v0.2 之后）

| ID | 任务 | 依赖 | 可改路径 | 验收 | 状态 |
|---|---|---|---|---|---|
| T3-8 | 地址写错不许白屏（FD-44） | T3-4 | `design/ux-v2/app/app.js`、`app/app.css` | `#/nosuchroute` 两视口都有 ≥1 个 `#/` 出口且正文 ≥30 字 | **DONE** |
| T4-9 | 章末综合 4 节可达（FD-43） | T4-1 | `design/ux-v2/app/**` | 课本与章页都出现「章末综合」行；点进去能开始做题，题数 106/103/182/122 与 `catalog.js` 对得上 | **已回退（2026-11-12）**：用户判定「课本里多出一个空的章末综合章节很多余」；`catalogSecs` / `themeSec` / `themeList` 与两处名单行、两条闸门路由全部撤回，题目归类另议 |
| T4-1 | 今天页接真题（FD-49，REQ-1） | — | `design/ux-v2/app/app.js` | 今天页「开始练 · N 题」N>60 且首题是真题，不再是 6 道示意 | **DONE**（`probe-today.mjs`：81 题 / 第 1 / 81 题） |
| T3-9 | 重绘合并 + 焦点保留（FD-45） | T3-4 | `design/ux-v2/app/app.js` | `#/book` 重绘 ≤3 次；搜索框打字后重绘，`value/focus/caret` 不变（`tools/qa/probe-render.mjs --focus`） | **DONE** |
| T3-10 | 提示记账跟着题走 + 判过之后的提示栏（FD-47/FD-48） | T3-4 | `design/ux-v2/app/app.js` | `probe-hint.mjs --sec 11.2`：73 题里只有亲手开过提示的那题带「用了提示」；`--judge --demo`：`saysNoHintAfterPeek=false` | **DONE** |
| T3-4 | 闸门 v0.5：旅程路由干净起步 + 步骤等到能点（FD-50） | T3-4 | `design/ux-v2/tools/qa/**` | 全量 52 次 0 失败；负例仍能抓坏（`--only map` 等）；`practice-today` 能独立复现，不依赖前一条路由 | **DONE**（`smoke-v0.4.json` 52 次 0 失败） |
| T3-3 | 缓存串自动化（`?v=` 不再手写） | T3-4 | `design/ux-v2/tools/qa/**`、`app/index.html` | `bust.mjs --check` rc=0；把串改错后 smoke 报 `cache-string` | **DONE**（`smoke-v0.5.json` 52 次 0 失败，负例 rc=1） |

| T4-10 | 一组 8 道（今天页 / 节页 / 结果页「再做一组」） | R=开发 | DONE | 见 FD-51 / FD-54；`group-size` `group-skip` 两条路由 + 负例 |
| T4-11 | 选择题选项回填（217 道，`opts` 全为 null） | R=内容/数据 | BACKLOG | 从原 PDF 抽选项写回 `opts:{list:[{key,text}],key}`；回填前界面按「自己对答案」处理，不许假装会自动判 |

| T3-11 | 验收线接进闸门（14px / 40px / ghost / --json 路径 / 越界免检） | R=开发 | DONE | `--strict` 52 次 0 失败，默认档 52 次 0 失败；负例白字白底能红 |
| T4-12 | review/record 的 `?load=1` 死骨架 | R=开发 | DONE | 删骨架，两路由直接渲染；`#/result?load=1` 仍是死分支，未清 |
