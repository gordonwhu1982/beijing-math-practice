# 01 基准冻结：现在这一版到底是什么

冻结时间 2026-11-12。tag `ux-baseline-20261112` → 提交 `6c12ec3`。
**2026-11-12 晚更新**：基线已吸收 ux-v2 第 7、8 轮，新 tag `ux-baseline-20261112.2`（见 §6、§7）。

## 1. 三个目录各自是什么

| 目录 | 体量 | 性质 | 本轮怎么用 |
|---|---|---|---|
| `design/ux-redesign/` | 9.6M（40+ md + prototype 404K + screenshots 8.7M） | **设计包 + 可点原型**，M1–M8 已验 | 需求与判据来源；原型是界面基准 |
| `design/ux-round2/` | 3.2M（24 md + prototype + screenshots） | 更早一轮：页面盘点、UI 审计、组件规格、评审 | 只取问题清单与历史结论 |
| `design/ux-round3/` | 144K（11 md） | 最近一轮的计划与中间文件：页面清单、交互、iPad 界面、教学、四份 NEXT_PLAN | **未结项主要来源** |

## 2. 原型基准（唯一界面事实）

位置 `design/ux-redesign/prototype/`：

| 文件 | 规模 | 说明 |
|---|---|---|
| `index.html` | 38 行 | 只挂样式与脚本，页面全由 app.js 渲染 |
| `app.css` | 1926 行，`?v=6cc1b8d8`（内容哈希） | 单文件样式表 |
| `app.js` | **7469 行**，`?v=c59ed670` | 视图函数 + 路由 + 判分 + 草稿，无构建步骤 |
| `js/core.js` | 211 行 | 公式渲染与文本工具（`mathHtml` / `clipMath` / `ansText`），从 app.js 拆出来两处共用 |
| `js/state.js` | 106 行 | 路由与草稿状态 |

外部依赖（都是相对路径，靠 `design/` 与 `runtime/` 同仓才能跑）：

- `../../../assets/vendor/katex/`（公式渲染）
- `../../../runtime/web/js/fig.js`（几何配图）
- `../../../runtime/web/data/graph.js`、`figures.js`
- 按需 fetch `../../../runtime/web/data/sec/<vol>-<no>.js | .items.js | .ex.js?v=131`（`ensureSlice`，app.js:2174–2182）

存储：草稿写 localStorage `mc-proto-drafts`（app.js:568、7416），**不碰**产品 key `mc.records.v1`。

## 3. 17 个视图（app.js 行号）

| 视图 | 行 | 视图 | 行 |
|---|---|---|---|
| viewToday | 1020 | viewMap | 5135 |
| viewBook | 1221 | viewBrief | 5251 |
| viewChapter | 1253 | viewPractice | 5286 |
| viewSection | 1308 | viewResult | 5422 |
| viewDrill | 1562 | viewReview | 5564 |
| viewGraphKp | 1636 | viewRecord | 5629 |
| viewMethod | 1752 | viewEvidence | 5679 |
| viewQ | 1861 | viewKp | 1893 |

路由：`onHash()` 在 app.js:7317，`hashchange` 监听 7406。

## 4. 还是示意数据的地方（必须清零）

- `QUESTIONS` 6 道（12.1 三角形），`HINTS` 5 句（全是三角形），`CHAPTERS` 4 个，`COURSE_NODES` 18 个坐标点。
- 结果页标题写死「12.1 三角形」、底栏主按钮写死「回到今天」、回顾每行写死「· 12.1 ·」、回顾题数写死 2。
- 判分：`11.2_bas_01` 立方根选项键是 ±2，解析写 ∛8=2，两者不一致 → 这题不能自动判。

## 5. 怎么跑起来看

原型要挂在仓根目录起服务，才能顺着 `../../` 取到 assets 与 data：

```
cd D:/个人/知识图谱/math-coach
python -m http.server 8780
# 打开 http://127.0.0.1:8780/design/ux-redesign/prototype/#/today
```

（用户此前就是 8780 这条路径访问；当前 8780 未启动，8080 在跑的是产品 `runtime/web/`。）

本工程副本 `app/` 起服务方式相同，路径换成 `design/ux-v2/app/`。

## 6. 基线怎么更新（2026-11-12 晚改口径）

原来写的是「`../ux-redesign/prototype/` 一个字都不许改」。这条改掉了，原因很直接：用户要看的是
「现在最好的一版」，而最好的东西一直在 `app/` 里长；基线永远停在 `6c12ec3`，用户拿到的就是旧样子。
「冻结」不等于「不许同步」，等于「同步进来的那一份必须是验过的」。现在的规则：

1. 日常只在 `app/` 改，基线不动。
2. 一轮收口、要给别人看 / 要比对 / 要发布时，用同步工具覆盖：
   `node design/ux-v2/tools/qa/sync_baseline.mjs --write`
   ——只覆盖 `app.css`、`app.js`、`index.html`、`js/**`；基线自己的 `capture.ps1` 保留。
3. 覆盖完必须自证两件事，缺一条就不算合并：
   - `node design/ux-v2/tools/qa/sync_baseline.mjs --check` 报「基线 == ux-v2/app」（退出码 0）；
   - `UXV2_PRE=/design/ux-redesign/prototype/ node design/ux-v2/tools/qa/smoke.mjs` 58 次 0 失败。
4. 自证通过再打 tag。基线是「一份能跑、被判据验过的快照」，不是不可碰的原件；两边一旦漂移，
   `--check` 退出码就是 1，不许带病提交。

## 7. 2026-11-12 晚：基线吸收 ux-v2 第 7、8 轮（tag `ux-baseline-20261112.2`）

旧基线停在 `6c12ec3`（app.js v193）。此后的两轮都只在 `app/` 里：第 7 轮（分式与题干放大、
选项补 ABCD、章页节行底色、「只看课本 / 培优 / 竞赛」三档收成一个统一控件）、第 8 轮
（右栏题干预览的公式放大到 24px，长公式缩到刚好进格子）。这次把 `app/` 整份覆盖进基线。

| 文件 | 行数 | 内容哈希（`?v=`） |
|---|---|---|
| `app.css` | 1926 | `6cc1b8d8` |
| `app.js` | 7469 | `c59ed670` |
| `index.html` | 38 | — |
| `js/core.js` | 211 | `7336c196` |
| `js/state.js` | 106 | `f468b234` |

`index.html` 相对旧基线多引两个脚本（`js/state.js`、`js/core.js`）和一份数据切片
`runtime/web/data/catalog.js?v=1`。`?v=` 全是文件内容哈希（`bust.mjs` 负责），复制过去不用手改。

自证（本轮实跑，报告都入库）：

- `node design/ux-v2/tools/qa/sync_baseline.mjs --check` → 「结果: 基线 == ux-v2/app」，退出码 0
  （`design/ux-v2/screenshots/baseline-sync.json`）。
- `UXV2_PRE=/design/ux-redesign/prototype/ node design/ux-v2/tools/qa/smoke.mjs` → **58 次，失败 0 条**
  （`design/ux-v2/screenshots/smoke-baseline.json`）。这条是关键：只把文件复制过去不算合并，
  基线自己跑一遍判据全绿才算。
- `UXV2_APP=…/prototype node design/ux-v2/tools/qa/bust.mjs --check` → 四条 `[ok]`，缓存串与文件内容一致。
