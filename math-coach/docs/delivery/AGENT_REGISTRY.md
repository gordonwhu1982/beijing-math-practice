# Agent 团队与能力注册表

本文件是人工可读视图，机器可读状态在 `AGENT_REGISTRY.json`。两边的“能力状态”必须一致，`validate_agent_registry.py` 会逐行比对。`role_file` 路径以 Skill 安装目录为基准。初始模板只定义岗位，不代表平台已经创建了真实 Agent。

| Agent ID | 岗位 | 执行方式 | 平台/配置路径 | 模型策略 | 实际模型 | 额度状态 | 调用状态 | 能力状态 | 已验证工具 | 证据路径 | 最后验证 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| AGENT-PM | 项目经理 | MAIN_SESSION | 主会话 | UNKNOWN | UNKNOWN | UNKNOWN | NOT_RUN | ROLE_DEFINED | | | |
| AGENT-PA | 产品分析师 | SUBAGENT | .cursor/agents/product-analyst.md | INHERIT_PARENT | UNKNOWN | UNKNOWN | NOT_RUN | CONFIGURED_UNVERIFIED |  |  |  |
| AGENT-UX | UX 设计师 | SUBAGENT | .cursor/agents/ux-designer.md | INHERIT_PARENT | UNKNOWN | UNKNOWN | NOT_RUN | CONFIGURED_UNVERIFIED |  |  |  |
| AGENT-UI | UI 设计师 | SUBAGENT | .cursor/agents/ui-designer.md | INHERIT_PARENT | UNKNOWN | UNKNOWN | NOT_RUN | CONFIGURED_UNVERIFIED |  |  |  |
| AGENT-IXD | 交互设计师 | SUBAGENT | .cursor/agents/interaction-designer.md | INHERIT_PARENT | UNKNOWN | UNKNOWN | NOT_RUN | CONFIGURED_UNVERIFIED |  |  |  |
| AGENT-ARCH | 系统架构师 | SUBAGENT | .cursor/agents/system-architect.md | INHERIT_PARENT | UNKNOWN | UNKNOWN | NOT_RUN | CONFIGURED_UNVERIFIED |  |  |  |
| AGENT-DEV | 开发工程师 | SUBAGENT | .cursor/agents/developer.md | INHERIT_PARENT | UNKNOWN | UNKNOWN | NOT_RUN | CONFIGURED_UNVERIFIED |  |  |  |
| AGENT-QA | QA 工程师 | SUBAGENT | .cursor/agents/qa-engineer.md | INHERIT_PARENT | UNKNOWN | UNKNOWN | NOT_RUN | CONFIGURED_UNVERIFIED |  |  |  |

可选角色（安全审查 `AGENT-SEC`、无障碍 `AGENT-A11Y`、发布运维 `AGENT-REL`）在 `install_subagents.py` 安装时会自动加入 JSON 和上表。手工修改状态时，两边要一起改。

## 状态词

能力状态、执行方式、额度、调用状态的定义见 Skill 的 `references/governance/status-model.md` 第 4 节。要点：

- `ROLE_DEFINED`：只有岗位定义；`CONFIGURED_UNVERIFIED`：已装配置未验证；`VERIFIED`：本次会话真实调用成功且有证据。
- 执行方式 `ROLE_SIMULATION` 表示由主会话按角色审查，不是独立 Agent，汇报中必须写明。
- 额度未从平台获得可靠信息时一律 `UNKNOWN`，不要推测。
