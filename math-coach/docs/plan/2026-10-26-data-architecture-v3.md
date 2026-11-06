# math-coach 数据架构与字段设计 v3

> **状态（2026-10-28 复核）**：字段设计已并入 `content/registry/schema.json`（3.1）；实体分层与统一边表以 architecture-v4 为准。本文只作字段来源与取舍理由的存档。


日期：2026-10-26　状态：历史存档（字段设计已并入 schema 3.1）　机器可读契约：`content/registry/schema.json`
校验器：`tools/schema_check.py`　报告：`build/report/schema/{report.txt,gaps.csv}`

参考：《中国K12开源知识图谱与智能教辅平台建设方案》（13 章 / 22 张表）七层图谱、8 类关系词表、
8 类错因、权利五级、三轴难度、掌握度三件套、三张覆盖率矩阵。本文只保留**在本机单人环境下真正能执行**的部分，
并逐条说明取舍理由；放弃的部分写在 §12。

---

## 0. 一句话结论

权威层只放 Git 里的文本 JSONL，用**一张登记表（registry）定义 14 类实体的字段契约**，
用**一枚校验器**把契约变成闸门，用**一条 outbox/inbox 接口**把学习证据隔在私有层；
图数据库、向量库、IRT/FSRS 全部作为**下游消费者**预留出口，不做成前置依赖。

现状（本节数字均为 `tools/schema_check.py` 实测，2026-10-26）：
14 类实体里 **7 类一行都没有**（skill / misconception / resource / asset / curriculum_standard / alias / learner_evidence），
7 类存量实体中 v3 新字段填充率 **0%** 的有 question.answer_spec、question.kp_tags、question.difficulty、
question.validation、question.uid、rubric_point.basis、edge.uid、edge.review、knowledge_point.kp_type。
也就是：**骨架齐、主料够，但「可诊断 / 可解释 / 可追溯」的字段还基本是空的**——这正是 v3 要补的东西。

---

## 1. 约束与取舍（结合实际，不是照抄方案）

| 约束（本机实测） | 对架构的强制影响 |
| --- | --- |
| 使用者只有 1 个孩子 + 1 个家长；无服务器、无账号体系 | 不做多用户权限、不做 RBAC、不做教师工作台；学习者只有假名 ID 一个 |
| 权威数据全在 Git 文本里，改动要能 diff、能回滚 | 内容层禁用二进制库；SQLite 只出现在 `build/` 且可整目录删除重建 |
| 已有存量：673 知识点 / 143 节 / 1493 条边 / 1128 题 / 3179 评分点 | 迁移必须**只增字段不改旧字段含义**；旧字段进 `legacy_fields` 白名单，不算错 |
| 题是 AI 生成（own-ai-draft），许可待定；人教 KG 是 CC BY-NC-SA | 许可五级必须落到字段上，public 切片用白名单生成，private 内容永不入库 |
| 只有第 12 章有题（12/143 节），其余 131 节是空壳 | 缺口必须**在数据里显式可见**（status=title_only / 矩阵 cell 缺态），不能靠人记 |
| 判题是纯 stdlib 原型（proto/judge.js 已损坏，spec 已定 L0–L4） | 判题契约先冻结成接口（verdict/how/needsReview），实现可换 |
| 家长要「两周内能用」 | 分层必须允许**半成品运行**：缺 answer_spec 就退 manual，缺 rubric 就不显示分步分 |

**贯穿原则（来自方案文档，且与本仓历史踩坑一致）**：目录层级只是组织关系，不能自动当认知先修；
关系边必须带证据/置信/审核/版本；supports 与 prerequisite 不得混统计；判不准宁可 manual，不可假判 correct。

---

## 2. 分层架构

~~~text
                    ┌──────────────── 下游消费者（可替换，不是权威）────────────────┐
                    │ 静态站前端  ·  导出图(graph.json/cypher)  ·  向量语料  ·  离线分析 │
                    └───────────────▲───────────────────────────────▲────────────────┘
                                    │ 只读切片                        │ 导出
┌───────────────┐   ┌───────────────┴──────────┐   ┌────────────────┴─────────────┐
│ L0 权威内容层  │──▶│ L2 构建层  build/         │   │ 侧车 A  export/               │
│ content/      │   │ index.sqlite + slices/    │   │ graph.json / graph.cypher /   │
│ Git 文本 JSONL│   │ <vol>.<public|private>    │   │ corpus.jsonl                  │
└───────┬───────┘   └───────────────▲──────────┘   └──────────────────────────────┘
        │ 契约                       │ 读契约
┌───────▼───────┐            ┌───────┴────────┐
│ L1 注册表层    │            │ L3 运行层      │  manifest.json{capabilities, schema_version, hash}
│ content/      │            │ runtime/ 静态站 │  前端按 capability 降级，不猜字段
│  registry/    │            └────────────────┘
│ schema.json   │
└───────┬───────┘            ┌────────────────────────────────┐
        │                    │ L4 私有证据层  private/         │  append-only JSONL
        └── 校验 ────────────▶│ records/<child>/evidence.jsonl │  + outbox/inbox 同步接口
                             └────────────────────────────────┘
侧车 B：tools/adapters/<source>.py —— 外部源统一入口，产出 provenance{url, sha256, license, fetched_at}
~~~

四层职责与「不许越界」的规矩：

| 层 | 位置 | 允许 | 禁止 |
| --- | --- | --- | --- |
| L0 权威内容 | `content/` | 人改、脚本改、git diff 可评审 | 二进制、答案泄漏进 public、原地改历史（用 version/supersedes） |
| L1 注册表 | `content/registry/` | 声明实体、字段、枚举、兼容策略、别名 | 存业务数据 |
| L2 构建 | `build/`（gitignore） | SQLite 索引、切片、报告、覆盖率矩阵 | 成为第二权威（删除后可 100% 重建） |
| L3 运行 | `runtime/`（gitignore） | 静态站 + vendor KaTeX + manifest | 直连 `content/` 原文（必须吃切片） |
| L4 私有证据 | `private/`（gitignore） | 逐题作答事件、导出/导入包 | 进 public 切片、进 git、含真实身份信息 |

---

## 3. 权威层文件布局（现状 → v3）

~~~text
content/
  registry/  schema.json            ← 新增：实体与字段契约（本次交付）
             aliases.jsonl          ← 新增：术语/符号/旧ID/外部ID 别名表（待建）
  framework/ volumes/<vol>.json     ← 保留：教材对齐层，权威
             knowledge_points/<vol>.json   ← 改造：字符串数组 → 对象数组（见 §10 P3）
             prerequisites.json / kp_prerequisites.json  ← 合并进 relations/（P2）
  questions/<vol>/*.jsonl           ← 保留：题目主数据
  rubric/<vol>/*.jsonl              ← 保留：评分点
  skills/<area>.jsonl               ← 新增：解题方法实体（待建）
  misconceptions/<area>.jsonl       ← 新增：错因实例（待建）
  resources/<area>.jsonl            ← 新增：讲解/例题/反例/图（待建）
  assets/index.jsonl + files/       ← 新增：媒体索引 + 文件（按 license 分 public/private）
  curriculum/standards.jsonl        ← 新增：2022 课标条目（待建，当前 0 条）
  relations/edges.jsonl             ← 新增：统一关系表（P2 由三源合并）
  sources/registry.jsonl            ← 新增：外部源台账（URL/sha256/许可/取用时间）
~~~

建库期由 `tools/framework_gen.py` 从上述权威文件派生出 `build/framework/{nodes,edges}.jsonl`——
**派生文件不是权威**，任何时候删掉都能重建（这是现有工程已经验证过的性质，v3 只把它写死成规矩）。

---

## 4. 实体清单、ID 规范与版本化

### 4.1 14 类实体

| # | 实体 | 作用（对应方案文档） | 现状规模 |
| --- | --- | --- | --- |
| 1 | volume / chapter / section | 教材对齐层（版本/册/章/节/页） | 6 / 26 / 143 |
| 2 | knowledge_point | 学科知识本体主数据 | 673 |
| 3 | skill | 技能与解题方法（方法轴） | **0** |
| 4 | misconception | 错因实例（8 类） | **0** |
| 5 | resource | 讲解/例题/反例/图（知识页素材） | **0** |
| 6 | asset | 图片/SVG 媒体索引 | **0** |
| 7 | question | 题目主数据 | 1128 |
| 8 | rubric_point | 评分点 | 3179 |
| 9 | curriculum_standard | 2022 课标条目 | **0** |
| 10 | edge | 统一关系边（权威） | 1493（派生+两处手工） |
| 11 | alias | 别名与跨库 ID 映射 | **0** |
| 12 | learner_evidence | 学习证据（私有层） | **0** |
| 13 | source | 外部来源台账 | **0** |
| 14 | （保留位）goal / review_plan | 学习目标与复习计划 | 未建模 |

### 4.2 ID 规范（关键决策：不改写存量 ID）

- **ID 一旦发布不可改写**。改名、换册次、换版次都靠 alias / `equivalent_to` / `supersedes` 表达，不靠改字符串。
- 现有家族已固定：`V801`（册）、`C801-12`（章）、`S801-12.1`（节）、`K801-12.1-01`（知识点）。
  新实体沿用「前缀字母 = 实体类型」：`SK-` 方法、`MC-` 错因、`RS-` 资源、`AS-` 媒体、`RB-` 评分点、
  `ED-` 边、`AL-` 别名、`CS-` 课标、`EV-` 证据。
- **题目 ID 存在全局唯一性隐患**：现有 `12.1_bas_01` 只在 801 册内唯一，将来 802 册同号会撞。
  解法：老 id 不动，新增 `uid` = `<vol>-<原id>`（如 `801-12.1_bas_01`），**跨记录引用一律用 uid**。
  校验器现在允许 uid 缺失（legacy 模式 0 错误），--strict 模式会把它列为缺口——这是有意为之的迁移压力。
- 正则集中在 `registry.id_rules.pattern_by_kind`，改规则只改一处。

### 4.3 版本化三件套

- **当前版 + 版本历史**：question/rubric/resource/edge 都带 `version`（实质修改才递增）；旧版本不删，进 `history/` 或 `version` 链。
- **有效区间**：`valid_from / valid_to`（册次与版次用；2024 新版替换旧版时旧记录标 valid_to，不物理删除）。
- **取代链**：`supersedes`（新边/新题取代旧边/旧题），配合 §9 的「改答案触发回归」。

---

## 5. 字段设计（逐实体，含与现状的差距）

字段总表在 `content/registry/schema.json`，这里只写**设计意图 + 为什么需要它 + 现状填充率**。
必填 = 进 --strict 闸门；可选 = 有则更好；`ext` = 预留位（键名以 `x-` 开头，不参与校验、不进 public 切片）。

### 5.1 knowledge_point（最关键，现有 673 条只有一句标题）

| 字段 | 必填 | 说明（为什么要有） | 实测填充率 |
| --- | --- | --- | --- |
| `uid` / `canonical_name` / `volume_id` / `section_no` | ✔ | 稳定主键 + 节锚定（单屏 ≤10 卡的依据） | 100% |
| `kp_type` | ✔ | 概念/事实/性质/定理/公式/技能/方法/模型/表示法/活动/情境——决定「怎么讲」和「怎么判」 | **0%** |
| `status` | ✔ | `title_only / draft / reviewed / verified`；574 条只有标题的必须显式标 title_only，不许默认当已建模 | 100%（但值只有 ai_draft） |
| `definition` | ○ | 富文本 + LaTeX；为 null 时 status 必须 title_only（校验器强制） | 0% |
| `conditions` / `boundaries` | ○ | 「分母 B≠0」「0^0 无意义」这类前提与失效情形；补学要能指出「你漏的条件」 | 0% |
| `objectives` | ○ | `[{ability, text}]`，ability 取 explain/judge/compute/prove/model/apply/represent | 0% |
| `curriculum_refs` | ○ | 课标条款 uid 数组；**当前无课标数据，必须写 `[]`，不许编造** | 0% |
| `textbook` | ○ | `[{edition_id, volume_id, chapter_no, section_no, page, quote}]`，多版次并存 | 0% |
| `aliases` | ○ | 术语与符号别名——直接治「搜方差命中平方差、搜对数命中频数分布表」的检索错配 | 0% |
| `skill_refs` / `misconception_refs` / `resource_refs` | ○ | 与第 3/4/5 类实体的连接件 | 0% |

**存储形状必须先改**：现在 `knowledge_points/801.json` 里知识点是**裸字符串数组**（`["分式定义：A/B…"]`），
想加任何字段都得换形状。P3 改成 `[{id, title, kp_type, status, definition?, …}]`，id 沿用 framework_gen 现在生成的 K 号，
**保证 143 节与 673 点的引用不断**。

### 5.2 question（对齐方案文档附录 A2，按现实降级）

| 字段 | 必填 | 说明 | 实测 |
| --- | --- | --- | --- |
| `uid` / `version` | ✔ | 全局唯一 + 版本递增 | **0%** |
| `answer_spec` | ✔ | `{canonical, equivalent[], tolerance, unit, unordered, answer_type}`。**unordered 治的是 152 道多答案题**（实测：未标 unordered 的 120 道里，把「2，3」写成「3,2」有 98 道被判错） | **0%** |
| `kp_tags` | ✔ | `[{kp_uid, role: primary|secondary, weight}]`，是 `assessed_by` 边的来源；没有它就只能按「节」开练习 | **0%** |
| `difficulty` | ✔ | 四轴 `{course_level, cognitive 0–5, prereq_depth 0–5, computation 0–5, calibrated{}}` | **0%** |
| `validation` | ✔ | `{machine, human, dispute}` 三轴；现在是单一 review_status，无法表达「机器过、人未审」 | **0%** |
| `solution_steps` | ○ | `[{ordinal, statement, basis, kp_refs[], rubric_refs[]}]`；现 `answer` 是纯文本带「步骤N」，**562 题可解析** | 解析待做 |
| `assets` | ○ | 图/SVG 引用 + alt 文本；466 道题 figure.need=required 但 `figure_ids` 全空 | 0% |
| `skill_tags` / `misconception_tags` | ○ | 方法轴与错因轴标签 | 0% |
| `source` / `license` / `visibility` | ✔ | 已具备；license 是 `own-ai-draft`，`redistributable=false` | 100% |
| `stats` | ○ | 曝光/正确率/提示率/中位用时/区分度；**样本不足必须留空，不许填 0 冒充** | 0% |
| `band` / `star_source` / `figure` / `answer` / `answer_status` | 旧字段 | 保留兼容，不进新逻辑 | 100% |

难度四轴与旧五档的映射（P1 用脚本生成，作为**起点值**而非实测值）：

| 旧 band | star_source | course_level | cognitive | 备注 |
| --- | --- | --- | --- | --- |
| basic | 1 | in_chapter | 1–2 | 单步直接套用 |
| standard | 2 | in_chapter | 2–3 | 两步或需一次转化 |
| advanced | 3 | in_chapter | 3 | 多步，含一个非显然转化 |
| challenge | 4 | small_gap | 4 | 跨节综合或需要构造 |
| competition | 5 | small_gap ~ beyond | 4–5 | 竞赛/新定义；@calibrated` 留空 |

`calibrated` 永远留空直到有 ≥30 次真实作答——这是方案文档「样本足才上 IRT」的硬约束，也对应本仓 0.0648 观测/题的现实。

### 5.3 edge（统一关系表，8 类词表）

| 字段 | 必填 | 说明 |
| --- | --- | --- |
| `uid` / `src` / `dst` / `relation` | ✔ | relation 取 8 类：is_part_of / prerequisite_of / supports / equivalent_to / contrast_with / applies_to / assessed_by / explained_by |
| `strength` | ✔ | hard（必要）/ support（有帮助）/ optional。存量 `soft` 用 `enum_aliases` 映射到 support |
| `evidence` | ✔ | `[{type: textbook_page|item|curriculum_ref|external_kg|teacher_note, ref, quote?}]` |
| `confidence` | ✔ | exact（教材原文）/ manual（人工）/ inferred（规则推断）/ weak |
| `review` | ✔ | `{status, reviewer, at}`——**现在是 0%**，所有边都没有责任人字段 |
| `scope` | ○ | `{curriculum_version, edition_id}`：换 2024 新版不推翻历史 |
| `supersedes` | ○ | 取代旧边 |

**三源合并策略（P2）**：派生规则边（842 contains + 137 prerequisite，confidence=inferred）
+ 节级手工 159 + 知识点级手工 98，全部并进 `content/relations/edges.jsonl`，按 `(src,dst,relation)` 去重，
冲突时保留 confidence 高者并把另一条标 `conflict`。外部旁证（人教 KG 853 条 `prerequisites_for`）
用 `relation=prerequisite_of, confidence=weak, evidence.type=external_kg` 并入，并额外标记 `corroborated / 待审 / conflict`——
**只作第二意见，不参与补缺路径计算**。

### 5.4 skill / misconception / resource / asset / curriculum_standard / alias

这 6 类现在**一行都没有**，但它们是「诊断得出来、补得回去」的前提：

- **skill**：`{uid, name, steps[{ordinal, action, basis}], conditions, strategies, alternatives, failure_signals, kp_refs}`。
  为什么必须有：错因第 3 类「方法选择错误」和补学 L3 提示都指向它；没有方法实体，提示只能退化成「再讲一遍知识点」。
- **misconception**：`{uid, category(8 类枚举), signal[], kp_refs, remedy{resource_refs, short_items}, contrast_pairs}`。
  8 类 = 概念误解 / 前置缺失 / 方法选择 / 步骤逻辑 / 计算符号 / 阅读建模 / 表达不规范 / 猜测过度自信。
  注意方案文档的硬规矩：**计算/符号失误不直接降知识掌握度**，所以 `category=computation_symbol` 的证据不参与 mastery 计算。
- **resource**：`{uid, type(explain|example|counterexample|figure|video|worksheet|method_note), kp_refs, body, assets, license}`。
- **asset**：`{uid, path, asset_type, sha256, license, alt_text}`；缺 alt_text 不允许进 public 切片（无障碍与 466 道配图题共用一条规矩）。
- **curriculum_standard**：`{uid, doc, subject, stage, code, text, domain, kp_refs}`；当前 0 条 → 覆盖率矩阵 1 全空，这是已声明的洞。
- **alias**：`{uid, target_uid, surface, alias_type(term|symbol|legacy_id|external_id|edition_name|pinyin), source, confidence}`。
  一张表同时解决三件事：中文术语检索、旧 ID 迁移、外部库（人教 885 题 / K12-KGraph concept）对接。

### 5.5 learner_evidence（私有层，只追加）

`{uid, learner(假名), item_uid, item_version, ts, response{raw, normalized}, verdict, how, hint_level, seconds, self_confidence, session_id, device, app_version}`

- `verdict ∈ {correct, wrong, manual, blank}`；**manual 在界面上永远不显示为错**（假判错会污染掌握度，这是实测过的坑）。
- `hint_level` 取 none / L1_restate / L2_locate / L3_method / L4_first_step / full_solution；
  L3/L4 做对记「带提示通过」，**不计实测掌握**。
- 只追加、不改写；掌握度是**从证据算出来的视图**，不是存在证据里的字段——这样换算法不用改历史。

---

## 6. 三道防泄漏与许可闸门

1. **白名单生成**：public 切片只按 registry 里登记的 `public_fields` 逐字段拷，不在白名单的字段根本不会被序列化。
2. **指纹反查**：`tools/check_no_leak.py` 取每题答案前 12 字哈希，在 public 切片里反查，命中即失败（已设计，待实现）。
3. **发布脚本只读 public 切片**：部署脚本的输入目录固定为 `build/slices/*.public.*`。

许可五级落到字段上（`license.class`）：

| 级 | 本仓对应 | 允许用途 |
| --- | --- | --- |
| A 可商用 | own-ai-draft、CC BY-SA、ODbL | 显示 + 练习 + 分发 + 训练 |
| B 有条件 | CC BY 4.0（需署名） | 显示 + 练习 + 分发（带 attribution） |
| C 非商业 | K12-KGraph（CC BY-NC-SA） | **仅自用**：可练习、可作旁证，不进 public 切片、不训练 |
| D 待核实 | 课本扫描件、真卷 OCR、平台下载题 | 仅内部候选审查，不显示、不分发 |
| E 禁止 | 来源不明无法追溯 | 拒收并记录原因 |

---

## 7. 扩展与预留接口（本仓最缺、也最容易做错的部分）

| 接口 | 契约 | 为什么这样设计 |
| --- | --- | --- |
| **字段扩展** | `ext{}` 自由对象，键名 `x-` 开头 | 试验性字段不用改 registry、不用改校验器；也不污染 public 切片 |
| **实体扩展** | registry 加一条 `entities.<new>` + 一个 loader | 加「学习目标 / 复习计划 / 试卷」只是改 registry，不动代码 |
| **兼容策略** | `compat.policy`：只增不改义；改义必须新字段名 + 旧字段 deprecated ≥1 个大版本 | 孩子两年的作答证据不能因为改字段名而失效 |
| **能力声明** | 切片 manifest 里 `capabilities[]`（knowledge_page / practice / hint_ladder / rubric / review_queue / figure / method_hint / misconception_diagnosis / export_outbox） | 前端按能力降级：没有 rubric 就不显示分步分，有就显示。前端不猜字段 |
| **适配器** | `tools/adapters/<source>.py: fetch() -> [{record, provenance{url, sha256, license, fetched_at}}]` | 三个已有源（ch12_index、人教 885 题、49 份真卷 OCR）走同一签名；换源不改下游 |
| **判题** | `judge(ref, student) -> {verdict, how, needsReview}`，how ∈ exact/numeric/bag/sampled/manual | 实现可换（stdlib → SymPy → 外部服务），契约不变；manual 优先于 wrong |
| **切片** | `build/slices/<vol>.<scope>.json.gz` + manifest`{capabilities, schema_version, hash}` | 运行层与权威层解耦；离线可用 |
| **导出** | `tools/export_graph.py -> build/export/{graph.json, graph.cypher, corpus.jsonl}` | Neo4j / 向量库 / 图算法都是**下游**；永不成为唯一真源 |
| **证据同步** | `private/records/<child>/outbox.jsonl`（只追加）+ `inbox.jsonl`（回执） | M4a 先跑两周：文件导出/导入即可；将来换服务端接口不变 |
| **许可闸门** | `license.class -> allowlist(capability)` | 「能不能显示/练习/分发/训练」由数据说话，不靠人工记忆 |

---

## 8. 三张覆盖率矩阵与 5 态缺口（把「缺什么」变成可查询数据）

方案文档要求用三个矩阵证明完备性。本仓落地为 `build/report/coverage/*.csv`，cell 状态五态：
`missing_model / modeled_unreviewed / reviewed_no_item / item_without_solution / edition_unmapped / covered`。

| 矩阵 | 行 × 列 | 现状实测 | 结论 |
| --- | --- | --- | --- |
| M1 课标目标 × 知识点 | 课标条款 × KP | curriculum_standard **0 条** → 全空 | 洞，需外部权威数据；未拿到前不得声称「对齐课标」 |
| M2 教材章节 × 知识点 | 143 节 × 673 点 | 143/143 节有 KP；673/673 点有教材页码 | 骨架完整；但 574 点只有标题（title_only） |
| M3 学习目标 × 题目/评价 | KP × 题 | **12/143 节有题**；kp_tags **0 条** → 只能按节开练习 | 内容集中在第 12 章（1021 节级题 + 107 章级题），其余 131 节空壳 |

M3 的三个子指标（都能直接算，不进任何模型）：
节覆盖率 12/143 = 8.4%；KP 覆盖率 = 第 12 章的 99 点里被题覆盖的点（需 kp_tags 才能精确，现只能按节估）；
分步分覆盖率 = 546/1128 = 48.4%（有 rubric 的题），其中 `basis` 字段 0%——评分点还没有「依据」。

---

## 9. 质量闸门（现有 5 条 + v3 新增 6 条）

已有并全绿：`framework_gen.py`（节点/边/环）、`questions_check.py`（引用完整性）、`rubric_check.py`（合计 100）、
`katex_selftest.js`（23990 个数学式真渲染 0 错）、`ch12_math_audit.py`（$$ / 混中文 / 裸 LaTeX 三项 0）。

v3 新增：

1. `schema_check.py`（已交付）：registry 驱动的字段/枚举/引用/DAG 校验，输出 gaps.csv。
2. `check_no_leak.py`：答案指纹反查 public 切片。
3. `check_license.py`：license.class 与 redistributable/visibility 一致性（NC 资源不得进 public）。
4. `check_edge_evidence.py`：任何 prerequisite_of 边必须有 evidence 或显式标 inferred（已有 rule 边自动带 rule 证据）。
5. `check_answer_spec.py`：answer_spec.unordered 必须与「答案含多值分隔符」一致（治 98/120 误判）。
6. `regress_on_change.py`：改了 answer / answer_spec / kp_tags / 边，自动重跑受影响题的判题回归集。

---

## 10. 迁移路线（每步都可独立验收，不阻塞使用）

| 阶段 | 内容 | 验收锚点（必须实测） |
| --- | --- | --- |
| **P0（本次）** | registry v3 + schema_check + 本文件 | `python tools/schema_check.py` rc=0、错误 0；gaps.csv 生成；旧数据 0 改动 |
| P1 | question 补 `uid/version/answer_spec/difficulty/validation/kp_tags`；从 `answer` 解析 `solution_steps`（562 题） | 1128 题 uid 100%；answer_spec 100%（含 unordered 152）；difficulty 四轴 100%；kp_tags ≥ 700（questions_kp_map 的 auto_top3 552 + auto_single 363） |
| P2 | 三源边合并进 `relations/edges.jsonl` + `uid` + `review` 回填 + 外部旁证标 corroborated | 1493 → 单文件；uid 100%；环 0；review 100%（ai_draft 也算已声明） |
| P3 | knowledge_points 改对象数组；第 12 章 99 点补 definition/conditions/objectives/kp_type；其余 574 点显式 title_only | 第 12 章 99 点六字段 100%；574 点 status=title_only；引用不断（questions/kp_tags 全部可解析） |
| P4 | 建 skill / misconception / resource / asset 首批；evidence + outbox；M4a 上线 | 12.1–12.12 每节 ≥1 skill、≥2 misconception；evidence 落盘可回放；导出/导入一轮通过 |

---

## 11. 与既有里程碑对齐

- **M0 已完成**（KaTeX vendor + 题库入库 + rubric 播种 + 知识点细化 + 先修边）。
- **M1 资源闸门与多源题库** ← 依赖 P1（answer_spec/difficulty 就位后，人教 885 题才能按同一契约入库）。
- **M2 框架完整性** ← 依赖 P2（边统一后 KP 级边才可统计）与 P3（KP 富字段）。
- **M3 作答闭环 + M4a** ← 依赖 P4 的 evidence/outbox；判题契约在 spec 已冻结。
- **M4 掌握度与补学** ← 依赖 misconception + skill 两份实体（没有它们，「错因为什么、补什么」无法落库）。

---

## 12. 明确不做（与方案文档「不建议做的事」对齐，并结合本仓现实）

1. 不引图数据库 / PostgreSQL / 向量库作为前置依赖：关系表 + SQLite + 内存图算法够用；瓶颈出现再升级，且只做成下游。
2. 不做题级 IRT/FSRS 参数估计：0.0648 观测/题，样本根本不够；`calibrated` 留空比造假值诚实。
3. 不让 AI 自动发布标准答案、先修边、题目：一律 ai_draft + 责任人字段。
4. 不把课本 OCR / 真卷 OCR 当已审核知识：`status` 必须停在 draft，证据类型标 textbook_page 才算硬的。
5. 不做多用户 / 排行榜 / 账号 / 教师端 / 自动出题（已定：孩子一个、家长一个）。
6. 不做「多数据集同名知识点合并后宣布全覆盖」：M1 空着就写空着。
7. 不把二进制度和库当权威（.db 进了 git 就没法评审、没法回滚）。

---

## 13. 待决问题

1. 七上/八下/九上/九下 2024 新版目录未到手 → `textbook.edition_id` 只能先写 `bj-legacy`，等新版后走 equivalent_to 迁移。
2. 课标条目（M1 矩阵的行）来源未定：教育部 PDF 可下载但需人工拆条，工作量估计 1–2 天；是否值得做取决于是否要「对齐课标」的说法。
3. skill 实体（方法轴）的粒度：是按「方法族」（如：作辅助线-倍长中线）还是按「技法」？建议先 12 章 12 节 × 2–4 族，别一次铺满六册。
4. 配图 466 题是否自绘 SVG（可版权安全）还是检索开放图库（需 license 台账）——影响 asset 实体首批规模。
5. `answer_spec.equivalent` 的自动生成边界：现有多答案 152 题可机械拆，但「等价表达式」需要判题器支持（L3 多项式等价已原型，未进仓）。

## 14. 自审：六个最容易漏的接口缺口

设计交付前逐条自查这六处，答案即可落地的决定（不是待决项）：

| # | 缺口问法 | 决定 | 落地位置 |
| --- | --- | --- | --- |
| 1 | 版本历史与 `supersedes` 存在哪 | 不建历史表。权威层每次改字段值就在 `content/history/<entity>/<uid>.jsonl` 追加一行（`{ts, field, before, after, reason}`，一行一字段）；`supersedes` 只用于「同义合并」指向被合并的 uid。历史文件进 git，可 diff，重建索引时忽略 | §3 目录 + `compat.policy` |
| 2 | 掌握度视图的计算入口 | 只有一个函数 `tools/mastery_view.py:compute(evidence_rows, mastery_spec)`，输入纯 evidence 行 + registry 里的 `mastery_spec`（每档阈值、时效窗口、最少证据量），输出 `{state, confidence, evidence_count, last_seen}`。运行层不自己算，只展示；换算法只改 `mastery_spec.json` 一个文件 | §7 `evidence_sync` + 新 `mastery_spec.json` |
| 3 | `capabilities` 与字段白名单是不是两套机制 | 是两套但共源：`capabilities` 只声明「能力存在与否」（9 项枚举），字段白名单由 registry 的 `visibility_rule` 生成；`tools/check_slice.py` 强制二者一致——能力开但字段缺失 → 构建失败 | §2 切片 + §9 闸门 |
| 4 | `calibrated` 与 `stats` 谁写、何时写 | 只有 `tools/fit_difficulty.py` 写，且门槛硬编码 `min_attempts>=30` 且 `distinct_learners>=5`；不满足时 `calibrated=null`，`required_difficulty` 由 `estimated` 四轴决定。运行层永不写回 content | §5 难度四轴 |
| 5 | `alias` 表与 `edge.equivalent_to` 是否重复 | 不重复：`alias` 只做**检索词**映射（学生输入「分式方程增根」→ 知识点 uid），不参与图计算；`equivalent_to` 是**图谱等价**（跨册同一知识点），参与覆盖度统计。校验器禁止同一条关系两边都写 | §4 + registry |
| 6 | 试卷（整卷）与 `goal`/`review_plan` 保留位够不够 | 不够，补两个实体：`test_paper`（`{uid, title, source, item_refs[], total_points, time_limit}`，题目只引用不内嵌）与 `study_goal`（`{uid, kind, target_refs[], due, status}`）；`review_plan` 不单独建实体，由 `evidence` + `mastery_spec` 现算，避免第二份真相 | §4 实体清单 |

> 本节为设计者自审，独立同行评审**覆盖度 0/1**（派出的架构专家后台失败、无收尾消息，未自动补派）。上面 6 条结论按现有数据实测得出，但未经第二人复核。

---

## 附录 A　registry 结构速查

~~~json
{
  "registry_version": "3.0",
  "compat": { "policy": "只增不改义…", "unknown_field_policy": "…", "ext_policy": "…" },
  "enums": { "relation": ["is_part_of", "prerequisite_of", "..."], "verdict": ["correct","wrong","manual","blank"], "...": [] },
  "enum_aliases": { "edge_strength": { "soft": "support" } },
  "id_rules": { "pattern_by_kind": { "knowledge_point": "^K[0-9]{3}-…" } },
  "entities": { "question": { "required": [], "optional": [], "legacy_fields": [], "fields": {} } },
  "capabilities": { "list": ["knowledge_page", "practice", "..."] },
  "interfaces": { "adapter": "...", "judge": "...", "slice": "...", "export_graph": "...", "evidence_sync": "..." }
}
~~~

## 附录 B　本次交付物与验证

~~~text
content/registry/schema.json     14 类实体契约（必填/可选/legacy/枚举/别名/ID 规则/接口）
tools/schema_check.py            registry 驱动校验器（legacy / --strict 双模式）
build/report/schema/report.txt   实测报告：错误 0，未登记字段 0
build/report/schema/gaps.csv     实体 × 字段 填充率（本节所有「0%」数字的来源）
docs/plan/2026-10-26-data-architecture-v3.md   本文件
~~~
