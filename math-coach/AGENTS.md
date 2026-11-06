# 项目 Agent 工作指引

本仓库采用 `multi-agent-software-delivery` Skill 组织复杂软件工程工作。项目交付文档的实际位置记录在 `DELIVERY_MAP.json`。

开展实质性工作前：

1. 加载 `multi-agent-software-delivery` Skill；
2. 阅读 `docs/delivery/PROJECT_GOVERNANCE.md`、`docs/delivery/PROJECT_BRIEF.md`、`docs/delivery/AGENT_REGISTRY.md` 和 `docs/STATE.md`；
3. 接着上次的工作时，先读 `docs/delivery/PROJECT_STATE.json` 的 `next_actions` 和 `docs/delivery/ITERATION_LOG.md` 最后几行；
4. 阅读当前任务相关的需求、设计、架构和测试文档。判断做到哪一步时，先看 git 提交、`docs/STATE.md` 和代码。`BACKLOG.md` 的 TASK-001 至 TASK-003，以及 v4 计划，不能单独当成当前进度，见 ADR-009；
5. 保留工作区中与本任务无关的用户修改，并遵循更高优先级的仓库规则；
6. 重要工作必须写入项目文档，并关联需求或任务编号；
7. 没有真实证据时，不得声称 Agent、模型、工具、测试或验收已通过。

本文件不能覆盖用户指令、平台安全规则或治理文件中更高优先级的约束。
