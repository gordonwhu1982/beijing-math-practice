# 历史资料索引

- 负责人：主会话（项目经理，资料整理，不是设计决定）
- 版本：0.1
- 更新时间：2026-11-04 22:18 +08:00
- 关联：TASK-010、ADR-009、ADR-010
- 状态：草稿。M1 未评审。M3 的来源笔记在 `05_COMPETITOR_SOURCE_NOTE.md`，它转引本索引里的材料，不代替这些原文

时效性只表示这份索引怎么用，不表示文件自己的结论仍然有效。2026-10-29 以前的界面方案，要和 11 月 2 日以后的提交、`docs/STATE.md`、代码一起看。

| ID | 资料名称 | 资料位置 | 资料类型 | 涉及功能 | 时效性 | 使用方式 |
|---|---|---|---|---|---|---|
| SRC-R01 | 现状入口 | `docs/STATE.md` | 现状 | 全产品 | 文首日期 2026-10-29，正文有更晚记录，仍可能落后于 11 月提交 | 和 git、代码一起看。数字冲突时先复测，不直接抄 §8 |
| SRC-R02 | 读图规格 | `docs/superpowers/specs/2026-10-27-chapter-map-design.md` | 历史设计 | 图谱、讲解 | 规格。STATE 写「大部分已落地」，未在本轮逐条复测 | 不能直接当现行界面 |
| SRC-R03 | 早期设计规格 | `docs/superpowers/specs/2026-10-26-math-coach-design.md` | 历史设计 | 全产品 | 更早 | 只作背景 |
| SRC-R04 | 架构 v4 | `docs/plan/2026-10-27-architecture-v4.md` | 计划 | 数据与分层 | 仓库主人指出执行时常没按这份走 | 不能单独当进度 |
| SRC-R05 | 数据架构 v3、系统设计 v2 | `docs/plan/2026-10-26-data-architecture-v3.md`、`docs/plan/2026-10-26-system-design-v2.md` | 已被后文取代的计划 | 数据 | 历史 | 不作为现行设计 |
| SRC-R06 | 导图否决记录 | `docs/plan/2026-10-28-ux-mindmap.md` | 历史 UX | 图谱画面 | STATE 写明 §5 已过时，现行画面看 STATE §11 | 只看否决了什么 |
| SRC-R07 | 总览改版计划 | `docs/plan/2026-10-28-ux-overview-redesign.md` | 历史 UX | 首页与总览 | 其后图谱又改过多轮 | 参考，不执行 |
| SRC-R08 | 竞品对齐 | `docs/plan/2026-10-28-competitor-parity.md` | 竞品与能力差距 | 图谱、方法、课标 | 文内自述部分数字是 10 月 28 日快照 | 可作 M3 输入。其中「最终界面尽量照竞品」是当时决策，本阶段要重审 |
| SRC-R09 | 教师图谱分析 | `docs/analysis-2026-10-teacher-kg.md` | 竞品逆向 | 参考产品 | 竞品材料的依据之一 | M3 要重读，本索引未摘结论 |
| SRC-R10 | 参考视频截图 | `docs/ref/2026-10-kg-teacher-video/` 下 t01–t08、h01–h11 | 视频截图 | 参考产品 | 2026-10 | 截图，不是本产品现状 |
| SRC-R11 | 手机参考截图 | `docs/ref/2026-10-27-kg-mobile/` 下 m01–m09 | 视频截图 | 参考产品手机端 | 2026-10-27 | 同上 |
| SRC-R12 | 参考视频原片 | `D:\个人\知识图谱\传神20261027-172455.mp4`、`传神20261028-095019.mp4` | 参考视频 | 竞品操作 | 在仓库外 | 本轮未分段、未记时间戳 |
| SRC-R13 | 10 月 27 日评审 | `docs/review/2026-10-27-pm.md`、`ux.md`、`ux-supplement.md`、`arch.md` | 历史评审 | 全产品 | 早于后续实现 | 历史意见 |
| SRC-R14 | UX 检验记录 | `docs/review/2026-11-02-ux-inspector4b.md`、`docs/ux-asserts.md`、`docs/visual-baseline.md` | 现状检验 | 页面断言 | 11 月 2 日前后 | 可作 M2 线索，本轮未复跑 |
| SRC-R15 | 交付层空模板 | `docs/delivery/UX_AUDIT.md`、`UI_DESIGN_SPEC.md`、`INTERACTION_SPEC.md`、`REQUIREMENTS.md`、`RESEARCH_INDEX.md` | 未填写的交付模板 | 无 | 2026-11-04 初始化 | 不是研究结论。本阶段正式稿在 `design/ux-redesign/` |
| SRC-R16 | 界面路线图 | `docs/ui-ux-roadmap.md` | 历史计划 | 界面 | 未在本轮对照代码 | 待核对 |

未找到、因此不能写成已读：仓库外的其他素材目录、开源项目仓库、竞品线上页面。Figma 文件未发现。
