# 06 — math-coach（现行产品）

`math-coach/` 是给作者自家孩子用的初中数学教辅（北京版，当前使用
八年级上册 2024 新教材）。纯静态站点——无后端、无账号、无数据库——
**Git 里的文本是权威数据**，其余全部是派生物。

权威文档：`README.md`（现有什么 + 诚实分级）、`docs/STATE.md`
（现状、怎么跑、闸门覆盖）、`AGENTS.md` + `docs/delivery/`
（多 agent 交付治理）。

## 课标框架

北京版六册 → 26 章 → 143 节：

| 册 | 编号 | 节数（约） | 状态 |
| --- | --- | --- | --- |
| 七上 | 701 | ~29 | 内容草稿，版次待核 |
| 七下 | 702 | ~32 | 内容草稿，版次待核 |
| 八上 | 801 | 27 | **已对 2024 版教材核过** |
| 八下 | 802 | ~19 | 内容草稿，版次待核 |
| 九上 | 901 | ~25 | 内容草稿，版次待核 |
| 九下 | 902 | ~11 | 内容草稿，版次待核 |

知识点在 `content/framework/knowledge_points/<册>.json` + 每点富化
侧车 `<册>.detail.jsonl`。实测快照（2026-11-11）：六册共 **711 个**
已富化知识点，每条带定义/条件/边界/目标/别名/教材页码——全部
`review_status=ai_draft`。

## 内容分层（`content/`）

数据契约是 `content/registry/schema.json`——**17 类实体**，由
`tools/schema_check.py` 校验（错误即闸门；v3 缺口单独报到
`build/report/schema/gaps.csv`）。

| 层 | 文件 | 内容（2026-11-11 快照） |
| --- | --- | --- |
| 关系表 | `relations/edges.jsonl` | **7053 条边**，12 种关系（`applies_to`、`uses_skill`、`prerequisite_of`、`assessed_by`、`is_part_of`、`belongs_to`、`misconception_of`、`sequence`、`supports`、`contrast_with`、`equivalent_to`、`explained_by`），每条边 `evidence` 必填。由 `tools/edges_build.py` 从五处权威源派生；`tools/relations_check.py` 守 10 条不变量（端点存在、无自环、无环、sequence 覆盖相邻节…）。 |
| 课标 | `curriculum/standards.jsonl` | **314 条**课标条目（义务教育四学段 + 高中；数学 `cms-*`），`review_status=stub`。 |
| 节→课标映射 | `curriculum/kp_standards.json` | 143 节 981 条链接；2 节显式标「课标无对应」。 |
| 解题方法 | `skills/<册>/ch*.jsonl` | **674 条**，分三层：教材内 / 培优 / 竞赛·拓展。每条带 steps（含依据）、`failure_signals`、`desc`、`boundaries`（防「万能解法」的边界声明）、`thought_refs`。 |
| 错因 | `misconceptions/<册>/ch*.jsonl` | 8 类错因实例，带补救建议。 |
| 思想层 | `thoughts.jsonl` | **16 条**：6 条上位思想 + 10 条方法族，带 `desc`/`boundaries`/`parent`/`competencies`。 |
| 核心素养 | `registry/competencies.json` | 六大素养 CP-01…CP-06。素养关联分**两层**：认定层（挂的课标条目，规则 + AI 复核）与派生层（方法→思想→素养两跳推导）。UI 会标明每条结论出自哪层。 |
| 人工先修边 | `framework/prerequisites.json`（节级 159 条）+ `framework/kp_prerequisites.json`（点级 183 条） | 每条带 `why`。 |
| 题库 | `questions/801/ch*.jsonl` | 共 **2708 题**（ch10 482 / ch11 614 / ch12 1242 / ch13 370），六档难度。目前只有 801 册有题。 |
| 题目侧车 | `ch*.answer.jsonl`、`ch*.spec.jsonl`、`ch*.options.jsonl`、`ch*.kp.jsonl`、`ch*.meta.jsonl` | 教材答案、机器可读答案结构、抽取的选择题选项、题→知识点映射、逐题元数据。 |
| 评分点 | `rubric/801/*.jsonl` | **3179 个**评分点 / 546 题（每题合计 100），全部 `ai_draft`。 |

## 前端（`runtime/web/`）

hash 路由单页应用，`js/views/` 一屏一文件：
`#/today #/toc #/sec #/kp #/map #/rel #/thoughts #/weak #/practice
#/retry #/archive`，另有二级页 `#/rel/<kid>` 和 `#/thoughts`。

- **图谱视图**（`#/map`）：以全景为主位、七种视角——册/章/思想
  全景、章图、节骨架、知识点、方法、错因、思想。两种边并存：
  先修边（实线，「能不能学」）与教材顺序边（虚线，「书上顺序」）。
  卡片尺寸、间距、截断字数随缩放档位一起缩，六册全景一屏可读。
- **核心素养筛选**：多选 chip；勾选后只留练到任一所选素养的知识
  点与方法。两层来源在界面分开标注（派生层标「按方法推断」）。
- **练习判题**：只有带结构化答案（`ch*.spec.jsonl`，由
  `answer_spec_build.py` + `answer_spec_merge.py` +
  `answer_spec_prune.js` 产出）的题才自动判——快照约 427/2642
  ≈ 16%。其余**故意**落 `manual`（「宁可不判不假判」）。三条铁律
  有回归用例：只有唯一值才敢判 wrong；集合少写多写都落 manual；
  区间只写半边不算错。抽出的选择题选项渲染成可点卡片。
- **错题重练**：一次最多约 6 题；理由见 `docs/retry-queue.md`。
- **作答记录**：localStorage（`mc.records.v1`，append-only）；
  JSONL 导出/导入同步桥——无账号无服务端
  （`docs/records-schema.md`）。
- **公式渲染**：KaTeX 0.16.11 本地化；约 3.8 万个公式零渲染错误。

## 构建流水线（`tools/`）

重建顺序有讲究（边依赖内容、框架依赖边、前端依赖框架产物）：

```bash
python tools/edges_build.py        # content/** → relations/edges.jsonl
python tools/relations_check.py    # 边表闸门
python tools/skill_prereq_check.py # 方法先后草稿校验
python tools/framework_gen.py      # → build/framework/{nodes,edges}.jsonl
python tools/build_web.py          # → runtime/web/data/*.js
bash   tools/check_all.sh          # 全部闸门（约 1 分钟）；--web 加无头 Chrome 冒烟
```

其他闸门：`schema_check.py`、`questions_check.py`、`rubric_check.py`、
`katex_selftest.js`、`math_text_check.js`（对 `tools/math_baseline.json`
做棘轮）、`ch12_math_audit.py`、`judge_spec_test.js`（54 条判题回归）、
`judge_spec_audit.js`、`ux_asserts.js`（38 个视觉判据 × 约 26 条路由）、
`web_smoke.js`（63 项无头 Chrome 检查）、`sc_probe.js`（图谱体量探针）。

教材习题抽取流水线：
`textbook_exercise_extract.py`（PDF → 习题块，带 `text_quality` 分级）
→ `textbook_span_rebuild.py`（重配被拆开的分式 span）
→ `textbook_map_sec.py`（习题块 → 节，靠判别词）
→ `textbook_ingest.py`（按 id 幂等并入 `ch*.jsonl`）。详见
`docs/textbook-extraction.md`——包括第 11 章根号是矢量图形、文字层
抽不出来的原因。

## 已知缺口（诚实分级，摘录）

- 知识点定义、方法、错因、评分点、题→知识点映射全部 `ai_draft`，
  未经教研；约 90 条培优/竞赛层方法离教材最远、最需要把关。
- 只有 801 册有题（2708 题）；其余五册零题。
- 约 2218 题没有 `purpose` 分类；132 题**故意**不挂任何知识点
  （超纲拔高内容），也不硬配。
- ch12 的 4–5★ 题（336 题）可能含网搜真题：`visibility=stem_public`、
  `redistributable=false`。
