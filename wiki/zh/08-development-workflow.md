# 08 — 开发工作流

## 本地运行

一切都需要普通 HTTP 服务——`file://` 下 `fetch` 和 ES module 都会
被浏览器拒绝：

```bash
# 经典站 + diagnose + explore（仓库根）
python -m http.server 8000          # 或 dev/start-server.bat

# math-coach 前端
cd math-coach && python -m http.server 8080
# → http://127.0.0.1:8080/runtime/web/
```

改完 `math-coach/content/` 后刷新前先重建前端切片：
`python tools/build_web.py`（完整重建顺序见
[06](06-math-coach.md)）。生成的 `runtime/web/data/` **已入库**，
所以 GitHub Pages 无需构建即可用。

## 一键闸门

```bash
./dev/check.sh          # 经典：node 测试 + validate.py + verify_questions.py
./dev/check.sh quick    # 跳过题目 verify
cd math-coach && bash tools/check_all.sh          # math-coach 全部闸门（约 1 分钟）
bash tools/check_all.sh --web                     # + 无头 Chrome 冒烟（约 4–6 分钟）
node tools/ux_asserts.js --shots out/shots/x      # 视觉断言 + 截图
```

`dev/README.md` 的经验法则：**任何 `data/*.json` 改动，提交前必须过
`dev/check.sh`。**

## 测试（`tests/`）

Node 单元测试，无框架：

| 测试 | 覆盖 |
| --- | --- |
| `test_engine.js` | 诊断引擎（建图、会话、判题、汇总） |
| `test_question_ids.js` | 题号 ↔ 知识点 id 契约 |
| `test_blindspots.js` / `test_children.js` / `test_children_browser.js` | 档案与薄弱点逻辑 |
| `test_home.js` / `test_jmor_frontend.js` / `test_stem_compat.js` / `test_report_link.js` | 经典前端辅助函数 |

`tests/fixtures/` 放测试数据。math-coach 在 `tools/` 下另有 JS 回归
套件（判题 spec、公式文本、视觉断言、冒烟）。

## Git 约定（`dev/README.md`）

- 全仓 LF 换行（`.gitattributes`）；Windows 上**不要**开
  `core.autocrlf`——会产生整文件幻影 diff。
- 一个逻辑改动一次提交；提交信息写清「改了什么数据 / 为什么」
  （看 `git log`——提交信息是中文，如「同步上游诊断和多学科题库」）。
- `data/questions.json` 只做定点文本插入（见
  [03](03-classic-data-model.md)）。
- `out/` 与 `math-coach/build/` 被 gitignore；`runtime/web/data/`
  有意入库。
- Remote：`origin` = GitHub（部署目标）、`upstream` = 上游原项目的
  本地镜像、`taxonomy` = cn-math-taxonomy 内容源。
  `dev/push-github.sh` 推 main → origin。

## 部署

GitHub Pages 服务仓库根目录（有 `.nojekyll`）。线上地址
<https://gordonwhu1982.github.io/beijing-math-practice/>。
`index.html` 在新版教辅（`#new`）与经典站（`#old`）之间切换。
PWA 资源（`manifest.webmanifest`、`sw.js`、`assets/icons/`）让两代
产品都可安装、可离线。

## math-coach 治理

`math-coach/` 遵循 `multi-agent-software-delivery` skill 工作流：
实质性工作前先加载 skill，读 `docs/delivery/PROJECT_GOVERNANCE.md`、
`PROJECT_BRIEF.md`、`AGENT_REGISTRY.md`、`docs/STATE.md` 和
`PROJECT_STATE.json` 的 `next_actions`。重要工作必须写回项目文档并
关联需求/任务编号；没有真实证据不得声称测试或验收通过。见
`AGENTS.md` 与 `DELIVERY_MAP.json`。

## 反馈错题

`.github/ISSUE_TEMPLATE/question-fix.yml` 提供结构化 issue 表单用于
报告错题——数据是 AI 起草的，这是既定的反馈渠道。
