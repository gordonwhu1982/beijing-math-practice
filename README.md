# 北京数学练习

个人用的数学知识图谱与自适应诊断工程：知识点先修图 + 题库 + 出题诊断引擎 + 数据校验闸门，纯静态、零依赖、本地即可调试。

线上地址：https://gordonwhu1982.github.io/beijing-math-practice/

## 快速开始

```bash
python -m http.server 8000        # 或 dev/start-server.bat（页面靠 fetch 读 data/*.json，不能用 file:// 打开）
./dev/check.sh                     # 引擎测试 + 数据校验 + 题目 verify 核验
```

| 入口 | 地址 |
| --- | --- |
| 首页（数学） | `/` |
| 英语 / 物理 | `/?subject=english` · `/?subject=physics` |
| 知识图谱 | `/explore/` |
| 自适应诊断 | `/diagnose/`（演示 `/diagnose/?target=cnm_221&demo=1`） |
| 学习档案 | `/children/` |

## 结构

```
data/          图谱与题库（topics / dependencies / questions / cn-curriculum-standards / id-aliases）
diagnose/      自适应回溯算法 engine.js（纯函数，浏览器与 Node 通用）+ 页面与判题 UI
explore/       Cytoscape + dagre 图谱可视化
children/      本机学习档案
assets/        站点脚本、样式、已本地化的第三方库（Cytoscape / dagre / qrcode-generator，均 MIT）
scripts/       数据闸门：validate.py + check_figures.py + verify_questions.py
tests/         engine 单元测试（node tests/test_engine.js）
dev/           体检 / 启动 / 推送脚本，见 dev/README.md
sw.js          PWA 离线缓存（命名空间 bmp-pwa-*）
```

## 改数据前必须知道的硬约束

1. **`scripts/validate.py` 是入库闸门**：题目 `id` 必须形如 `<topicId>_q<N>`；字段只能取 `Q_FIELDS` 白名单内的键
   （`id, topicId, difficulty, type, prompt, answer, choices, accept, verify, figure, unordered, percent, fixed_from_source, hideChoiceText`）。
   新增字段会直接判 `VALIDATION FAILED`，需同步改白名单。
2. **难度只有三档** `basic / standard / advanced`；每个知识点有题数下限要求（现约 4 题/点）。
3. **判题可靠性**：`diagnose/engine.js` 只能自动判 `choice` 与 `numeric`（数值走 NFKC 归一 + 精确有理数比较），
   `short / self` 一律人工自评；`verify` 不参与前端判题，只被 `verify_questions.py` 在 AST 白名单沙箱内求值。
4. **知识点编号规则** `cnm_/cne_/cnp_` + 位数固定，`Q_ID_RE` 会校验；`external: true` 的节点不出题。

## 数据说明

图谱与题库源自知识共享 **CC BY-NC 4.0** 数据集（详见 `LICENSE` 与 `assets/vendor/VENDOR.md`），
且为 AI 生成的初稿、未经教师逐条审核：先修关系、题目答案、解析文本都可能有错，
用于教学结论前请人工复核。本工程仅作个人学习与调试使用，不得商用。
