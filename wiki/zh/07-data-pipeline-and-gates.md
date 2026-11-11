# 07 — 数据流水线与质量闸门（`scripts/`、`math-coach/tools/`）

两套工具链并存：经典 `scripts/`（Python + Node，操作 `data/*.json`）
和 `math-coach/tools/`（操作 `math-coach/content/` →
`runtime/web/data/`）。

## 经典 `scripts/` —— 闸门优先

| 脚本 | 作用 |
| --- | --- |
| `validate.py` | **入库闸门。** 校验题号形如 `<topicId>_q<N>`、`Q_FIELDS` 白名单、三档难度、每点最低题量。违反即 `VALIDATION FAILED`。 |
| `verify_questions.py` | 在 **AST 白名单沙箱**（禁 import、禁白名单外调用）里求值每题的 `verify` 表达式，独立核对答案。产物 `out/verify-report.json`。 |
| `check_figures.py` | 内联 SVG `figure` 字段体检。 |

## 经典 `scripts/` —— 可复用数据工具

从上游约 90 个脚本里按「能否独立运行 + 是否会覆写主数据」筛出
（全部实测通过）：

| 脚本 | 用途 | 写文件？ |
| --- | --- | --- |
| `fig_draw.py` | 内联 SVG 几何图元库（长方体/圆柱/圆锥/球/角弧/直角标记…54 个），只用 currentColor、无外链 | 否 |
| `add_figures.py` | 用 fig_draw 给题目写 `figure`（121 题 / 60 知识点） | ⚠ 整份重写 `data/questions.json` |
| `primary_recheck.py` | 从题干**独立重算**数值答案，揪出算错的 `answer`（纯 stdlib） | 否 |
| `second_pass.py` | 盲解复核流水线：`prepare` 导出无答案题块 → 人/模型作答写 `ans_NN.json` → `compare` 找不一致 | `data/_second_pass/`（gitignore） |
| `engine_norm.py` | 与 `diagnose/engine.js` `normalizeText` 同思路的 Python 移植 | 否 |
| `moe2025_check.py` | 对照 2025 修订版课标做「条款数/相似度/漏收」报告（只读） | 否 |
| `demo_grade.js` | 用真实数据跑整年级筛查，打印按章汇总（引擎冒烟） | 否 |
| `make_pwa_icons.py` | 重新生成 PWA 图标 | `assets/icons/` |
| `hs_common.py`、`hs_sel_common.py`、`phy_lib.py`、`en_lib.py`、`primary_qgen.py` | 上游「登记表 DSL」：知识点/题目/边/难度标注与出题模板函数，加内容的现成写法参考 | 否 |

**刻意没恢复的**（在 git 历史 `7d7748c` 里，
`git show 7d7748c:scripts/xxx.py` 随时取回）：会把
`data/topics.json`/`questions.json` 整份覆写、且依赖约 60 个已删
数据模块的 `*_build.py`（跑了会毁数据）；内容已在 `data/*.json` 里的
纯数据录入模块；英语干扰项批改脚本；上游截图与部署脚本。

## math-coach `tools/` —— 构建与闸门

完整闸门用 `bash tools/check_all.sh`（`--web` 加无头 Chrome）。
除 [06](06-math-coach.md) 流水线外的重点：

- `answer_spec_build.py` → `answer_spec_merge.py` →
  `answer_spec_prune.js`：机械抽结构化答案 → 与逐题精修合并 →
  自判剪枝（判题器拿自己的参考答案都判不对的 spec 降级 `unknown`）。
- `judge_spec_test.js`（54 条回归）+ `judge_spec_audit.js`
  （覆盖率 / 参考答案判对 / 构造错值判错）。
- `question_options_extract.py`：从题干抽 `A./B./C./D.` 选项到侧车
  （`--check` 模式只比对不写盘，供闸门查 drift）。
- `questions_kp_*.py` 一族 + `out/kp_*.py`：题→知识点映射流水线
  （按节拆任务包 → 别名/判别词匹配 → 侧车 `ch*.kp.jsonl`，全
  `ai_draft`）。
- `ux_asserts.js`：38 个视觉断言代号 × 约 26 条路由（最小字号、
  横向溢出、`[object Object]`、单选只有一个实心选中、移动端视口、
  KaTeX/cytoscape 加载、流程断言…）。`--shots <dir>` 顺手出全页图。
- `web_smoke.js`：63 项无头 Chrome 交互检查。
- `math_text_check.js`：公式文本棘轮——扫 `$` 配对、裸命令、控制
  字符，对 `tools/math_baseline.json` 只报新增；`--staged` 只看暂存，
  `--write-baseline` 重冻基线。
- `check_commit.py`：提交钩子——前端语法、导图契约、判题回归、方法
  先后、关系表、公式文本；暂存动了前端自动加跑冒烟，动了样式先跑
  视觉断言。

## 数据来源说明

- 经典 `data/` 源自 CC BY-NC 4.0 知识共享数据集（见 `LICENSE`、
  `assets/vendor/VENDOR.md`）；AI 起草、未经教师审核。
- `math-coach` 题库：ch10/11/13 从经典项目渲染 HTML 反解析
  （`legacy_html_import.py`）；ch12 来自结构化 index
  （`questions_ingest_ch12.py`）；教材习题走上面的抽取流水线并入。
