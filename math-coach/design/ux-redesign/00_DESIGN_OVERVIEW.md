# 全产品体验重构 · 执行状态

- 负责人：主会话（项目经理）
- 版本：0.2
- 更新时间：2026-11-05 21:40 +08:00
- 关联：ADR-010、ADR-011、ADR-009
- 状态：设计交付包在本目录。M1 至 M8 都有独立通过结论，分别见 `22_REVIEW_M1.md`、`23_REVIEW_M2.md`、`23_REVIEW_M3.md`、`18_REVIEW_M4.md`、`24_REVIEW_M5.md`、`24_REVIEW_M6.md`、`24_REVIEW_M7.md`、`22_REVIEW_M8.md`。这是设计包，不是产品改版，也不是真实用户测试。浏览器里打开的原型按窗口显示，字号回到可读的那一版（`app.css?v=44`）。不要把 2360 物理像素写成 CSS 像素。全景双指缩放不做。M7 是函数走查。产品代码仍冻结。

任务书在 `00_PHASE1_BRIEF.md`。仓库主人 2026-11-05 确定：`claude-opus-5-5` 这个账号不能用，其余交付用当前会话默认模型做完。

## 给后续开发的入口

按这个顺序读，就能知道产品该变成什么样、每页怎么展示、怎么操作、怎么验收。

| 要看的事 | 文件 |
|---|---|
| 产品是什么、用户是谁、做什么、不做什么 | `01_REQUIREMENT_BASELINE.md` |
| 历史资料索引 | `02_RESEARCH_INDEX.md` |
| 功能、页面和已实现能力 | `03_CURRENT_PRODUCT_MAP.md` |
| 现状问题和真实页面 | `04_CURRENT_UI_AUDIT.md`，截图在 `screenshots/current/` |
| 竞品依据。视频原片和开源仓库本阶段没有打开 | `05_COMPETITOR_SOURCE_NOTE.md` |
| 信息架构和页面结构 | `06_INFORMATION_ARCHITECTURE.md` |
| 进入、操作、反馈、取消、结束、页面状态 | `07_INTERACTION.md` |
| 视觉令牌和页面版面。画布是 iPad Air 11 英寸 2360×1640 | `08_DESIGN_SYSTEM.md` |
| 可操作原型 | `prototype/index.html`，静态服务在仓库根 `python -m http.server 8765` |
| 原型截图 | `screenshots/density/` |
| 评审。第七轮严重项已改，这不是通过 | `09_REVIEW_ROUND1.md` 至 `15_REVIEW_ROUND7.md` |
| 对照缺口。写的时候代码还在改，以原型 v=37 为准 | `16_ACCEPTANCE_GAPS.md`、`16_FLOW_GAPS.md`、`16_JOURNEY_GAPS.md` |

原型模拟的是第 12 章 12.1 的六道示意题，不是全册题库。记录只写浏览器键 `mc-proto-drafts`，不写产品的 `mc.records.v1` 和 `mc.settings.v1`。原型没有接进 `runtime/`。

## 代码冻结

本阶段不改 `runtime/`、`content/`、`tools/` 和已有业务页面。设计稿和原型只放在 `design/ux-redesign/`。发现要改代码的问题只记到 `docs/delivery/ISSUES.md`，不改。

## 模型

当前这个账号不能用 `claude-opus-5-5`。仓库主人要求其余工作用会话默认模型做完。已安装的 7 个角色配置仍是 `model: inherit`，没有改成已验证，也没有重建。

2026-11-04 的只读调用记录仍在 `docs/delivery/agent-validation/MODEL-OPUS-2026-11-04.md`。

## 团队

不重建已有的 7 个角色配置。它们仍是 `CONFIGURED_UNVERIFIED`。本轮已派产品分析、交互、体验去对照验收和流程写缺口，角色配置没有重建。

任务书里的「竞品研究员」和「独立评审员」目前没有对应的已安装角色。独立评审不能由做设计的同一会话宣布通过。

2026-11-05 20:00 项目经理按未结门禁再派四路只读评审，不改原型：M1、M2、M3 各写一份结论，M8 只列当前仍然严重、还没处理的问题。结论写进 `22_REVIEW_M1.md`、`22_REVIEW_M2.md`、`22_REVIEW_M3.md`、`22_REVIEW_M8.md`。

2026-11-05 20:20 M2 初评不通过：`PAGE-002-toc.png` 的 PNG 头被拿掉一个回车，已补回，1440×900 的章节目录可以打开；`PAGE-007-thoughts.png` 补回字节后图块仍坏，已用现有产品 `#/thoughts` 重拍，1180×820，同时写入 `SHOT-027-thoughts.png`。平板宽度的目录另有 `SHOT-028-toc.png`。没有改 `runtime/`。M2 复查通过，见 `23_REVIEW_M2.md`，只覆盖这两页。M3 复查通过，见 `23_REVIEW_M3.md`，只覆盖上一轮点名的七处。M5 整条门禁通过，见 `24_REVIEW_M5.md`。M6 整条门禁通过，见 `24_REVIEW_M6.md`。M7 整条门禁通过，见 `24_REVIEW_M7.md`，只做函数走查。八道门禁的独立结论都已通过。交付的是这份设计包：原型不接进 `runtime/`，没有真实用户测试，全景双指缩放不做。

## 门禁

| 里程碑 | 目标 | 现在 |
|---|---|---|
| M1 | 资料索引、功能与页面地图 | 独立评审通过，见 `22_REVIEW_M1.md`。测试、回顾、评估仍是已写明的缺口，没有补成事实。只覆盖 M1 |
| M2 | 真实页面截图和现状审计 | 初评不通过，见 `22_REVIEW_M2.md`。复查通过，见 `23_REVIEW_M2.md`。只覆盖目录和思想现在能打开。不表示第一阶段通过 |
| M3 | 竞品、视频、开源研究 | 初评不通过，见 `22_REVIEW_M3.md`。复查通过，见 `23_REVIEW_M3.md`。只覆盖点名的七处。视频和开源仓库仍不打开。不表示第一阶段通过 |
| M4 | 信息架构和用户任务 | `06_INFORMATION_ARCHITECTURE.md`。独立评审通过，见 `18_REVIEW_M4.md`。只覆盖信息架构，不表示第一阶段通过 |
| M5 | 交互规格 | 整条门禁通过，见 `24_REVIEW_M5.md`。对着原型 v=42。核心任务有进入和结束，主要页面状态有规格。第 4 节九条没有升成严重。不表示第一阶段通过 |
| M6 | 视觉系统和全量页面 | 整条门禁通过，见 `24_REVIEW_M6.md`。对着 `08_DESIGN_SYSTEM.md` 和原型 `app.css?v=42`。设计系统和主要页面都有 2360×1640 上的视觉规格。字号不小于 44px |
| M7 | 可操作原型 | 整条门禁通过，见 `24_REVIEW_M7.md`。对着原型 v=42，只做函数走查。三条旅程接得上，记录来路仍回到回顾。不表示第一阶段通过 |
| M8 | 独立评审 | 通过，见 `22_REVIEW_M8.md`。七轮交叉评审都由没画这些页面的人写。已标严重项后来都写明处理过。没有写成真实用户测试。只覆盖 M8 |

进度仍要同时看 git、`docs/STATE.md` 和代码。`BACKLOG.md` 里的 TASK-001 至 TASK-003 以及 v4 计划不是本阶段的范围。
