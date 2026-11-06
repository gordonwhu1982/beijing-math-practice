# 项目任务清单

下面四件是 2026-11-04 从 `docs/STATE.md` §8 登记进来的，状态停在 `PROPOSED`。它们不是已经核对过的当前欠账。ADR-009：进度以 git 提交、`docs/STATE.md` 和代码三者一起为准；v4 计划也不能单独当进度。开做之前先核对有没有被后来的提交做掉。

| 任务编号 | 标题 | 需求编号 | 负责人(A) | 执行(R) | 依赖 | 优先级 | 范围 | 可改路径 | 交付物 | 验收条件 | 状态 | 证据 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| TASK-004 | 改内容或前端之后跑现有闸门 | REQ-001 | 项目经理 | QA | 无 | 高 | 不改产品行为；只在有内容或前端改动时执行 | 无 | `bash tools/check_all.sh` 的退出码 | 退出码 0；本次 init 不执行 | PROPOSED | `docs/STATE.md` §1、§5 |
| TASK-001 | 为仍是 manual 的填空题补有出处的短答案 | REQ-002 | 项目经理 | 开发工程师 | 无 | 高 | 只增加能从答案文本或人工核对得到的短答案，不改判题三态 | `content/questions/` | 更新后的 spec 侧车与审计输出 | `judge_spec_audit.js` 对新增规格判对，错值判错；选择题 spec 不计入覆盖提升 | PROPOSED | `docs/STATE.md` §8 第 1 条 |
| TASK-002 | 补方法总表路由 | REQ-003 | 项目经理 | 开发工程师 | 无 | 中 | 思想总表已有，只补 `#/methods`，不新加图谱视角 | `runtime/web/` | 方法总表页面 | 路由可打开，数字从现有边表现算，不手写统计 | PROPOSED | `docs/STATE.md` §8 第 4 条 |
| TASK-003 | 沿 figures.json 再补平面几何图示 | REQ-003 | 项目经理 | 开发工程师 | 无 | 中 | 只用 marks 画 SVG，不入库讲义整页图 | `content/framework/figures.json`、`runtime/web/js/fig.js` | 新图示 | 定义下方能看到图；折叠、尺规、全等、费马不按关键词挂题 | PROPOSED | `docs/STATE.md` §8 第 9 条 |
| TASK-010 | 第一阶段资料与功能地图 | ADR-010 | 项目经理 | 产品分析师 | 无 | 高 | 只读仓库和仓库外已指出的视频。不改产品代码 | `design/ux-redesign/` | 资料索引、页面与功能地图 | M1：能指出产品、用户、已实现页面和资料缺口；未经评审不算通过 | IN_PROGRESS | `design/ux-redesign/02_RESEARCH_INDEX.md` |
| TASK-011 | 核心设计岗位模型确认 | ADR-011 | 项目经理 | 项目经理 | 无 | 高 | 验证仓库主人允许的 `claude-opus-5-5-medium` 能否真实调用 | 无 | 只读调用记录 | 有实际调用成功的记录后，才用该模型做设计决定 | IMPLEMENTED | `docs/delivery/agent-validation/MODEL-OPUS-2026-11-04.md` |
| TASK-012 | 现状截图与体验审计 | ADR-010 | 项目经理 | UX、UI | TASK-010 | 高 | 只运行现有页面并截图，不改产品代码 | `design/ux-redesign/screenshots/current/` | 截图索引和问题清单 | M2：主要页面有真实运行截图。没有基线不进入全量设计 | IMPLEMENTED | `design/ux-redesign/04_CURRENT_UI_AUDIT.md` |

状态进入 `READY` 之后，「范围」「可改路径」「验收条件」不能空。不改文件时「可改路径」写 `无`。两个 `IN_PROGRESS` 任务的可改路径重叠时，`check_traceability.py` 会警告。

## 状态枚举

`PROPOSED` / `READY` / `IN_PROGRESS` / `IMPLEMENTED` / `IN_REVIEW` / `TESTING` / `REJECTED` / `DONE` / `RELEASED` / `BLOCKED` / `DEFERRED` / `CANCELLED`

定义见 Skill 的 `references/governance/status-model.md`。`validate_project.py` 会检查“状态”列只用这些词。

## 迭代计划

ITER-001 先建立共用交付层。2026-11-04 起，现行工作是 ADR-010 的体验重构，不是从 TASK-001 至 TASK-003 里挑。TASK-010 在 M1 评审前保持进行中。TASK-011 已有 `claude-opus-5-5-medium` 的调用记录。TASK-012 的截图和问题清单已写入，M2 仍未经独立评审。

## 任务依赖图

TASK-001、TASK-002、TASK-003 互不阻塞。TASK-002 与 TASK-003 都服务 REQ-003，可以分开做。

## 阻塞与待决事项

子 Agent 未验证。不要按本表的顺序派开发去改 `content/` 或 `runtime/web/`。先按 ADR-009 对过提交和代码。
