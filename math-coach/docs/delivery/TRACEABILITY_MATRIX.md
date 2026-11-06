# 需求追踪矩阵

每项进入开发的需求，至少要能从左走到右。缺上游来源或下游验收的行，不应进入开发。下面三行都还没进入开发，验收结论全部是 `NOT_VERIFIED`。

| 需求编号 | 来源编号 | 设计/规格 | 架构决策 | 任务编号 | 代码变更/提交 | 测试编号 | 测试证据 | 验收结论 | 发布版本 |
|---|---|---|---|---|---|---|---|---|---|
| REQ-001 | SRC-001 | `docs/STATE.md` | ADR-001 | TASK-004 | 基线 `9a32732`（init 之前的产品提交，不是本任务的改动） | TEST-001 | 本次未运行 | NOT_VERIFIED | 无 |
| REQ-002 | SRC-001 | `docs/STATE.md` §8 | ADR-003 | TASK-001 | 无 | TEST-002 | 本次未运行 | NOT_VERIFIED | 无 |
| REQ-003 | SRC-001 | `docs/STATE.md` §8 | 无 | TASK-002, TASK-003 | 无 | 无 | 无 | NOT_VERIFIED | 无 |

- 编号要与各自的主文档一致：`REQ` 在需求清单，`SRC` 在项目简介或研究索引，`ADR` 在决策记录，`TASK` 在任务清单，`TEST` 在测试计划。
- 验收结论只用 `ACCEPT` / `ACCEPT_WITH_APPROVED_EXCEPTIONS` / `REJECT` / `NOT_VERIFIED`。
- `check_traceability.py` 会检查这里引用的编号是否都在主文档中定义过。
