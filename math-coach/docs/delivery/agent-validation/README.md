# Agent 能力验证证据目录

把真实调用证据放在本目录，并在 `AGENT_REGISTRY.json` 的 `invocation_evidence` 中写相对路径。不要保存令牌、密钥或真实用户敏感数据。

`validate_agent_registry.py` 会核对摘录表里的「原文」是否出现在「文件」的那一行。它不调用模型，也判断不了这份文件是不是子 Agent 写的。

每份 Canary 记录使用下面的格式。`date` 与注册表 `last_verified` 用同一个 `YYYY-MM-DD`。`observed_model` 填任务卡上看到的模型；看不到时写 `UNKNOWN`，并且注册表也写 `UNKNOWN`。

```markdown
# Canary AGENT-QA

- date: 2026-11-04
- observed_model: UNKNOWN
- result: SUCCESS

## 摘录

| 文件 | 行号 | 原文 |
|---|---|---|
| PROJECT_BRIEF.md | 1 | # 项目简介 |
```

另外记下：用了哪些工具、是否改过文件、失败时的原始错误。验证只在当天、同一实际模型、且平台配置不比这份证据新时继续有效。
