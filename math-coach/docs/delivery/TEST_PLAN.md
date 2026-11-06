# 测试计划

- 版本/日期/负责人：2026-11-04 / QA 角色已配置，未验证，也未执行
- 被测构建：commit `9a32732`
- 测试环境：本机 Python 3.11+ 与 Node，按 STATE §1
- 测试范围：现有闸门；本次 init 不改业务代码，所以没有新的失败可记

## 需求与验收覆盖矩阵

| TEST ID | REQ ID | 场景 | 测试层级 | 前置条件 | 预期结果 | 执行方式 | 证据位置 | 状态 |
|---|---|---|---|---|---|---|---|---|
| TEST-001 | REQ-001 | 数据、契约、渲染、判题和构建 | 仓库闸门 | 在仓库根目录 | 脚本退出码 0 | `bash tools/check_all.sh` | 本次未运行 | NOT_VERIFIED |
| TEST-002 | REQ-002 | 结构化答案与判题器一致 | 脚本 | 已有 spec 侧车 | 标准答案判 correct，错值判 wrong | `node tools/judge_spec_audit.js` | 本次未运行；历史口径见 STATE §8 | NOT_VERIFIED |

## 设备、浏览器、系统和分辨率矩阵

STATE 提到无头 Chrome 冒烟：`bash tools/check_all.sh --web`。本次未跑，也没有记录浏览器版本。

## 主流程

HTTP 打开 `runtime/web/`（不能用 file://）。步骤见 STATE §1。本次未打开页面。

## 异常与边界

判不准必须落到 manual。这条是产品规则，不是本次测试通过记录。

## 回归范围

改 `content/` 或 `runtime/web/` 之后至少跑 TEST-001。只改交付文档不必跑。
