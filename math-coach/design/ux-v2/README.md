# ux-v2 优化工程（第二轮重启）

这是 math-coach 界面优化的**新工程目录**，2026-11-12 起用。

- 上一阶段的界面基准：`../ux-redesign/prototype/`（app.js v215、app.css v181），已打 tag `ux-baseline-20261112`，原件**只读不改**。
- 本工程自己的可改副本：`app/`（从基准原样复制，从 R4 起只在这里改）。
- 规划与交付文档：本目录根下的 00–06 号文件；专家与角色报告落 `reviews/`。
- 产品实现仍在 `../../runtime/web/`，本轮**不改**它；只有等本工程验收通过、用户点头，才按迁移任务表搬到产品。

## 先读哪份

| 想知道 | 读 |
|---|---|
| 这个工程为什么开、边界在哪 | `00_CHARTER.md` |
| 现在的基准到底是什么、怎么跑起来看 | `01_BASELINE_FREEZE.md` |
| 需求口径（谁在用、要达成什么、不做什么） | `02_REQUIREMENTS.md` |
| 已知问题盘点（三轮攒下的未结项 + 本轮新发现） | `03_FINDINGS.md` |
| 分几轮做、每轮交什么 | `04_ROADMAP.md` |
| 任务、依赖、可改路径 | `05_TASK_DAG.md` |
| 每个任务怎么算过 | `06_ACCEPTANCE.md` |
| 谁在做、是真实子 Agent 还是主会话模拟 | `07_TEAM.md` |

## 一句话现状

基准原型能跑、三条核心旅程都能走通，但它在 `design/` 下靠相对路径借 `runtime/web/data`，自带 6 道示意题与写死的 12.1 文案；round3 还留下 20 条「已改未提交、只在一个视口点过」的改动。
本工程要做的不是再造一个原型，而是把它变成**能交给孩子天天用、并且能被机器验收**的一版界面。
## 验收与工具（都在 `tools/qa/`，零依赖）

| 脚本 | 作用 |
|---|---|
| `smoke.mjs` | 验收闸门：29 条路由 × 2 视口 = 58 次，退出码 = 失败条数。`--json` 存报告，`--only name` 只跑几条；`UXV2_PRE=/design/ux-redesign/prototype/` 可把同一套判据打向冻结基线 |
| `bust.mjs` | 把 `index.html` 里的 `?v=` 换成文件内容哈希；`--check` 只检查（不一致退出码 1）；`UXV2_APP=…` 可指向别的目录 |
| `sync_baseline.mjs` | 把 `app/` 同步进冻结基线 `design/ux-redesign/prototype/`：`--write` 覆盖（缓存串是内容哈希，不用手改）、`--check` 只比对（有差异退出码 1）。基线的 `capture.ps1` 保留 |
| `cdp.mjs` | 起静态服务 / 起无头 Chrome / 连 CDP，smoke 与探针共用 |
| `serve.mjs` | 常驻预览服务（不给闸门用，给人用）：`node design/ux-v2/tools/qa/serve.mjs 8780` 起新界面；`... 8781 --landing` 起导航页，列出新界面 / 冻结基准 / 正式产品三套 |
| `probe-live.mjs` | 不开自己的服务，直接连在跑的端口：`--hash '#/today' --shot 路径`，判据 HTTP 200 + 正文 >80 字 + console error 0 |
| `probe-start.mjs` | 逐 150ms 采样「开始练」按钮：disabled 是占位还是会一直灰 |
| `probe-today.mjs` / `probe-book.mjs` | 今天页题数、课本层级与每章每节各多少（`probe-theme.mjs` 随 FD-43 回退一并删除） |
| `probe-hint.mjs` / `probe-map.mjs` / `probe-render.mjs` | 提示记账、图谱可滚容器、重绘次数与焦点 |

跑法：`node design/ux-v2/tools/qa/smoke.mjs`（在仓根）。判据与负例见 `10_GATE.md`。
人看用：`node design/ux-v2/tools/qa/serve.mjs 8780` → http://127.0.0.1:8780/design/ux-v2/app/ ；`serve.mjs 8781 --landing` → http://127.0.0.1:8781/ 三套界面对比。**两个端口要一直在跑**（会话结束也别 kill），并且必须用 WMI 拉起进程，用 `run_in_background` 或 detached spawn 起的会被宿主收走。
