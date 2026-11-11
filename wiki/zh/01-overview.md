# 01 — 项目总览

## 这是什么

**beijing-math-practice**（北京数学练习）是一个个人知识图谱 + 自适应
练习工程。名字里虽有"数学"，但经典一代实际覆盖数学加另外九科
（语文、科学、道德与法治、历史、地理、生物、化学、英语、物理）；
新版 `math-coach` 则专注初中数学。

核心思路：

- **知识点优先，题目其次。** 图谱（知识点 + 先修边）是主要产物，题目
  挂在知识点上。
- **沿先修边回溯的自适应诊断。** `diagnose/engine.js` 从错题沿先修
  关系向回找根因，而不是只给一个分数。
- **纯静态、零依赖。** 没有构建步骤、没有后端、没有账号、没有数据库。
  第三方库（Cytoscape、dagre、KaTeX、qrcode）全部本地化。`python -m
  http.server` 就能跑。
- **数据先过闸门再入库。** JSON 改动由 `scripts/validate.py`、
  `scripts/verify_questions.py`、`dev/check.sh` 把关，数据按代码对待。

## 给谁用

个人用途——作者拿给自家孩子练（初二学生，北京版 2024 新教材）。
数据是 AI 起草、**未经教师逐条审核**；商用请先看许可（上游数据为
CC BY-NC 4.0，见 [LICENSE](../../LICENSE)）。

## 快速开始

```bash
python -m http.server 8000     # 页面靠 fetch 读 data/*.json，file:// 打不开
./dev/check.sh                 # 引擎测试 + 数据校验 + 题目 verify 核验
```

然后打开 <http://localhost:8000/> 看入口切换页；`classic.html` 是经典
站，`/explore/` 是图谱，`/diagnose/` 是自适应诊断
（演示 `/diagnose/?target=cnm_221&demo=1`），`/children/` 是学习档案。

## 两个入口，一个仓库

`index.html` 是一个薄切换页，两个 tab：

- **新版练习** → `math-coach/design/ux-redesign/prototype/`（现行教辅
  UI 原型；运行时数据在 `math-coach/runtime/web/data/`，已入库所以公开
  页面无需构建即可打开）。
- **原来的站点** → `classic.html`（即 `/#old`）。

`math-coach/` 原本在独立私有仓开发，后并入本仓；它自带 `docs/`、
`tools/`、`content/` 和治理文件（`AGENTS.md`、`DELIVERY_MAP.json`、
`docs/delivery/`）。

## 诚实分级（引用数据前必读）

项目对"哪些已核、哪些是草稿"写得很明确：

- **已核**：八上（801）章节目录与 2024 版教材逐节对过；先修图无环；
  题目→知识点引用零错；评分点合计零错；数学式零渲染错误。
- **未核**：约 700 条知识点定义全部是 `ai_draft`；课标条目是公开
  转写（`review_status=stub`），未与教育部 PDF 逐页核对；2708 题里
  只有约 16% 有机器可判的结构化答案，其余**故意**落回人工自评，
  也不假装能判；题→知识点映射也是 `ai_draft`（抽检约 1/7 会指到
  相邻的错误点），只当提示用，不算掌握度。

wiki 或数据看起来像过度声明时，以 `math-coach/docs/STATE.md` 和
`math-coach/README.md`「诚实分级」一节为准。

## 许可

- 仓库自有代码与内容：见 `LICENSE`。
- 图谱/题库数据源自知识共享 **CC BY-NC 4.0** 数据集；署名细节见
  `assets/vendor/VENDOR.md`。
- 外部题源一律 cite-only：不进仓、不进发布包。
