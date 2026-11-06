# 风险登记表

| 风险编号 | 描述 | 触发条件 | 可能性 | 影响 | 等级 | 缓解措施 | 监测信号 | 应急/回滚方案 | 负责人 | 状态 |
|---|---|---|---|---|---|---|---|---|---|---|
| RISK-001 | 把 ai_draft 知识当成教研已复核 | 学生或后续 Agent 直接引用定义 | 高 | 学错 | 高 | 界面和文档保持 ai_draft；任务不得把草稿改成已复核，除非有人核对 | `review_status` 字段 | 改回草稿并记 ISSUE | 项目经理 | OPEN |
| RISK-002 | 私有仓库被推到远端 | 有人给仓库加 remote 并 push | 中 | 孩子的学习数据或未公开内容外泄 | 高 | STATE §0 已定不推；交付层不新增 remote | `git remote -v` 为空 | 立刻取消授权并检查是否已发出 | 仓库主人 | OPEN |
| RISK-003 | 未验证的子 Agent 被当成已验收 | 注册表仍是 CONFIGURED_UNVERIFIED 却派它改内容 | 中 | 改错内容或伪造验收 | 中 | 先做 Canary；QA 只读 | `AGENT_REGISTRY.json` 的 capability_state | 丢弃该次改动，用 Git 恢复 | 项目经理 | OPEN |

状态 `OPEN` 表示风险仍在，不是缺陷状态机里的另一种写法。本表不进 `validate_project.py` 的缺陷状态检查。
