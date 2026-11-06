# 架构 v4：六层图谱 + 统一边表

> 2026-10-27。取代 v3 里「边只是 prerequisites.json 两份 legacy 文件」的做法。
> 输入：① 对 `docs/analysis-2026-10-teacher-kg.md` 里那套高中知识图谱的桌面版 + 手机版两轮逆向；
> ② 本仓 2026-10-27 实测的字段填充率与缺口。

## 0. 一句话

**把「知识点 + 一份先修边」升级成「六层实体 + 一张统一边表」，边带语义、带证据、带审核状态。**
方法（skill）与依赖（edge）是这次的两条主线，教材顺序、思想、素养是它们的三根新轴。

## 1. 为什么现在改：实测缺口

| 维度 | 现状（实测） | 病灶 |
| --- | --- | --- |
| 方法数量 | skill 125 条，**全在 801 四章**（12 章 64 / 11 章 27 / 10 章 23 / 13 章 11） | 五册（701/702/802/901/902）**零方法**，547 个知识点没有任何方法 |
| 方法↔知识 | `kp.skill_refs` 只有 **99/673 = 14.7%** 的点有 | 574 个点无法回答「这个点用什么方法」 |
| 方法自身字段 | `conditions`/`failure_signals`/`steps` 100%，但 **`family` 缺 83/125、`alternatives` 缺 112/125，无 desc、无 boundaries** | 方法页只能列步骤，写不出「这个方法不覆盖什么」 |
| 依赖边 | `prerequisites.json` 159 条 + `kp_prerequisites.json` 183 条，字段只有 `{from,to,why}` | **无 relation、无 strength、无 evidence、无 confidence、无 review** |
| 依赖覆盖 | kp 级 183 条覆盖 **176/673 = 26.2%**；802/901/902 三册 **0** | 五册里四册的知识点之间没有任何依赖 |
| 教材顺序 | 章/节有序号，但**没有边** | 「先讲后学」与「实际依赖」混为一谈（视频作者明确要求分开） |
| 思想 / 素养 | **实体不存在**（0 条） | 无法回答「这章用了哪些思想」「这道题考哪个素养」 |
| 题↔知识/方法 | question 表**无 `kp_refs`、无 `skill_refs` 字段**；243 题的 KP 映射在旁路产物里 | 图谱无法下钻到题，题无法上卷到方法 |
| 统一边表 | `content/relations/` **目录不存在**（schema v3 已定义但从未落地） | 校验工具无对象可查 |

知识点本身的富化是好的：673 个点的 `definition`/`conditions`/**`boundaries`**/`objectives`/`aliases` 全部 100% 有值，`textbook` 位置 568/673。**缺的是点与点之间的语义，不是点本身。**

## 2. 从参考源抄什么（三条，其余不抄）

1. **三类边各司其职**：「方法→知识（解题可用）」与「知识→方法（用到）」是两个方向，**教材顺序是第三条独立的边**，不能拿先修边冒充顺序边。
2. **思想是一等实体，不是方法的标签**：作者原话「有些知识点我们以为很孤立，实际上学会了其中的思想就可以类比迁移」；点方法 → 看到它服务的知识点；点思想 → 看到运用该思想的知识点。他要的迁移能力靠这一层，不靠方法层。
3. **方法节点必须带「边界声明」**（「该……只覆盖求轨迹方程，不代表坐标法的所有应用」）。我们的知识点已有 `boundaries`，**方法没有**，这是最直接的一个洞。

不抄：教材原页阅读器（用户已判为次要）、版次多值 `scope` 复杂化、以及他那套两万多候选的人工漏斗（我们没有一个月的人力）。

## 3. 目标架构

```
L1 课标层    curriculum_standard ──┐
L2 素养层    competency (6)        │  belongs_to / realizes
L3 教材层    volume → chapter → section  (26 / 143, 带 sequence 边)
L4 知识层    knowledge_point (673)
L5 方法层    skill (125 → 目标: 六册全覆盖)
L6 思想层    thought (14 类方法族 → 上卷 6 大思想)
────────────────────────────────────────
证据层  question (2708) / misconception (127) / rubric_point / alias / learner_evidence
```

**为什么思想在方法之上而不是之下**：14 类里「数形结合」「化归与转化」「分类讨论」「特殊与一般」「函数与方程」本身就是上位思想，而「作差比较法」「坐标法」是具体方法。用 `thought` 实体 + 两级字段（`level: 思想 | 方法族`）表达，方法 `belongs_to` 思想。

## 4. 实体契约变更（schema v3.1）

### 4.1 新增实体

**`thought`（数学思想/方法族）** → `content/thoughts.jsonl`
```json
{"uid":"TH-01","name":"数形结合","level":"thought","desc":"把数量关系与图形位置互相翻译…",
 "boundaries":["只适用于能作图的对象"],"review_status":"human_checked","evidence":[{"type":"teacher_note","ref":"video:2026-10"}]}
```
落地 **15** 条（初值 14 条 + 补充 1 条）：函数与方程、数形结合、分类讨论、化归与转化、特殊与一般、整体与局部（这 6 条 `level=thought` 上位思想）；概念抽象与符号化、逻辑推理与证明、代数运算与等价变形、坐标法与向量法、归纳与递推、参数法、反证法、统计推断方法、模型法（这 9 条 `level=family` 方法族，`parent` 指向上位思想）。

**`competency`（核心素养）** → 固定 6 条，写在 `content/registry/competencies.json`（不建独立文件，量太小）。

### 4.2 `skill` 增字段（三处，全部必填或强烈建议）

| 字段 | 必填 | 含义 | 例 |
| --- | --- | --- | --- |
| `desc` | 是 | 一句定义式描述（方法页首段） | 「把两个数作差，用差的符号判断大小关系」 |
| `boundaries` | 是 | **不覆盖什么**（方法与知识点的 boundaries 同构） | 「只判断大小，不给大小本身；分式作差后必须通分再判号」 |
| `thought_refs` | 是 | 归属思想/方法族 uid 数组 | `["TH-09"]`（特殊与一般） |

`family` 从自由字符串改为 `thought_refs` 引用（现有 42 条的字符串值迁移进 thought 表，缺的按 `tier` 补）。

### 4.3 `edge` 落地为 `content/relations/edges.jsonl`

必填 8 键：`uid src dst relation strength evidence confidence review`。

`relation` 在已有 9 值上加 2 个：**`sequence`**（教材顺序，`scope: {volume, chapter}`）、**`belongs_to`**（方法/知识 → 思想/素养）。完整 11 值：

`is_part_of` `sequence` `prerequisite_of` `supports` `equivalent_to` `contrast_with` `applies_to` `uses_skill` `belongs_to` `assessed_by` `misconception_of`

> `uses_skill` 是新增：参考源「知识→方法·用到什么方法」的方向。`applies_to` = 方法→知识（我服务你），`uses_skill` = 知识→方法（我用你）。两者由 `kp.skill_refs` 一次派生、双向校验。

`strength` ∈ `hard | support | optional`；`evidence` ∈ `textbook_page | item | curriculum_ref | external_kg | teacher_note`；`confidence` 0–1；`review` = `{status, reviewer, at}`。

## 5. 边的生成规则（`tools/edges_build.py`）

| relation | 来源 | strength | evidence | confidence |
| --- | --- | --- | --- | --- |
| `is_part_of` | 章的 `sections` / kp 的 `section_no` | hard | teacher_note `rule:structure` | 1.0 |
| `sequence` | 同章内节序号相邻、跨章按册内章序 | hard | textbook_page（有 textbook 位置时带页码） | 1.0 |
| `prerequisite_of`（知识→知识） | `prerequisites.json`（节级 159）+ `kp_prerequisites.json`（kp 级 183）→ 均 `strength=hard`、`confidence=0.9`、`evidence=teacher_note ref=<原文件>`；`framework_gen` 规则推断的 137 条 → `strength=support`、`confidence=0.5` | 混合 | teacher_note | 0.5–0.9 |
| `prerequisite_of`（方法→方法，**规则推断**） | 规则 `skill_dep_by_kp`：方法 A 的 `kp_refs` 里挂着节位置**严格早于本节**的点 P；P 上还挂着方法 B → `B prerequisite_of A`。跳过挂超过 2 个方法的点、每方法最多 3 条入边、同节互指不收。实收 **16 条**，边带 `ext.x-rule=skill_dep_by_kp`，前端画虚线 | support | teacher_note `rule:skill_dep_by_kp`（quote 写明「由方法挂点推断的前置，待教研确认」） | 0.5 |
| `prerequisite_of`（方法→方法，**逐条起草**） | 读 `content/framework/skill_prerequisites.json`（83 条，review_status=ai_draft，每条写 why）。原来这里是「点级先修一跳反推」规则 `skill_dep_by_kp2`（产出 821 条），2026-10-28 抽检 40 条只有 20 条站得住、收紧后重抽 11/40，整段废除。净入 **80 条**（3 条与上面 16 条重合去重） | support | file `content/framework/skill_prerequisites.json`（quote = 该条 why） | 0.5 |
| `applies_to` | `kp.skill_refs` 反查（667 条方法 / 1015 条边；673 个知识点 100% 至少挂一条） | hard | teacher_note `rule:skill_refs` | 0.9 |
| `uses_skill` | 同上镜像（dst/src 互换） | hard | 同 | 0.9 |
| `belongs_to` | `skill.thought_refs` + `kp` 的素养标注（`objectives[].ability` 暂不映射素养，留空） | hard | teacher_note | 0.8 |
| `equivalent_to` / `contrast_with` | 人工表 `content/framework/analogies.json`：**29 条**（13 条可以类比 + 16 条容易混淆），每条写 `a`/`b`/`why`/`basis` | support | teacher_note `ref=analogies.json#AN-0xx` + 原 why 作 quote | 0.7 |
| `assessed_by` | 题表 `kp_refs`（段二补字段后才有） | support | item | 0.6 |
| `misconception_of` | `kp.misconception_refs` + 错因的 `kp_ref` | hard | teacher_note | 0.9 |

**所有边单向存储，查询期按 `direction` 视作双向**（`prerequisite_of` / `applies_to` / `uses_skill` / `belongs_to` 有方向，`equivalent_to` / `contrast_with` 对称）。

对称边只存**一条**：`edges_build.py` 写入后把该边标 `direction=symmetric`，`relations_check.py` 用 `frozenset(src,dst)+relation` 去重，存成两条即报错。这条约束是有代价的——它挡住了「A 像 B」与「B 像 A」分别写不同理由的情况，所以 `why` 一律写成对称句式（「两者都靠…」），不写「前者…而后者…」。

## 6. 三阶段与验收闸门

### 段一（已完成）：把边立起来 + 801 方法补全

1. ✅ `content/thoughts.jsonl` **15** 条（6 条上位思想 + 9 条方法族）；`content/registry/competencies.json` **6** 条（CP-01..CP-06）。
2. ✅ schema 升 v3.1：skill 加 `desc`/`boundaries`/`thought_refs`；relation 扩到 **12** 种（加 `sequence`/`belongs_to`/`uses_skill`）；新增 `thought`/`competency` 两类实体（实体总数 **17**）；`edge.evidence` 改必填数组。
3. ✅ `tools/edges_build.py` → `content/relations/edges.jsonl` **2912 条**（原估 1.4–1.6k，低估：`is_part_of` 842 + `prerequisite_of` 816 + `applies_to` 356 + `uses_skill` 356 + `misconception_of` 254 + `belongs_to` 151 + `sequence` 137）。
4. ⚠️ 原计划「801 的 52 个无方法知识点补 52 条 → skill 125→177」**前提不成立**：801 的 151 个知识点在开工前就已被 125 条方法全覆盖，52 这个数字是误读。实际做的是给全部 **125** 条方法补 `desc`/`boundaries`/`thought_refs`（`tools/skill_enrich.py`），skill 总数仍 125。段二的真实缺口在其余五册 522 个知识点。
5. ✅ `tools/relations_check.py` 并入 `check_all.sh`（10 条不变量：端点存在、relation 合法、`kp.skill_refs` 与 `applies_to` 双向一致、`prerequisite_of` 无环、`sequence` 覆盖每章相邻节、evidence 非空…）。

**验收结果**：`bash tools/check_all.sh` **失败步骤数 0**；`bash tools/check_all.sh --web` **21/21 PASS**；`relations_check` 报「边 2912 条、无环、双向一致」；629/673 个知识点有先修边（93.5%），151 个挂上方法（22.4%，即 801 全覆盖）；前端图谱五视角（骨架/知识点/方法/错因/思想）与详情面板全部落成，`tools/web_detail_probe.js` 断言思想/方法/知识点三类面板内容。

**与原计划的两处偏离，都记在这里**：一是思想层没有等到段三——它在段一就随边一起立起来（`belongs_to` 与思想视图），因为边一旦分开建两轮，第二次要回头改全部数据的 `thought_refs`；二是方法页的`边界声明`没有停在「给 125 条方法加字段」，而是进到了详情面板的可见位置，理由见 §2 第 2 条。

### 复盘三条动作（已完成，2026-10-27）

参考产品的手机版迭代里有三件我们缺的事，按优先级做完，都进了闸门：

| 动作 | 落成什么 | 验收 |
| --- | --- | --- |
| 课标要求进知识点 | 导入 314 条课标条目（数学 `cms-*`，`review_status=stub`），按节建 `assessed_by` 边 291 条，详情页「课标要求」段引原句 + 条目号；第 13.1 节显式标「课标条目层无对应」并给原因 | `relations_check` 报「课标条目 314 条；有课标要求边的知识点 148」；探针断言 `kp 课标要求` |
| 题目用途五分类 | `tools/question_purpose.py` 只标有证据的 490 题（教材原题 152 / 方法应用 209 / 情境应用 118 / 概念辨析 9 / 方法对照 2），其余 2218 题留空不猜；侧挂 `ch<章>.meta.jsonl` | `questions_check` 报「已标 490 / 未标 2218」，值域与 uid 校验 0 错 |
| 思想跨册聚合 + 搜索跨视角 | 思想详情加「它在几册里反复出现」（一册一行的分布串）与「按册看这些方法」；上位思想递归到子族（否则六个上位思想的跨册视图全是空的）。搜索从「只搜当前图」改成「本屏没有就翻全库，命中后切视角、挪册与焦点再定位」 | 冒烟 `search-cross`（kp 视图搜「概念抽象与符号化」→ 切到思想视图并打开详情）；探针 `thought TH-02 跨册` / `TH-07 方法族` |

方法覆盖同步推进：701（七上）142 条、802（八下）92 条接入后，边数 2912 → 4021，挂上方法的知识点 151 → 377（22.4% → 56.0%）。702（七下）109 条接入后边数 4021 → **4366**，横向 29 条再推到 **4551**，挂上方法 **523（77.7%）**；901 / 902 接入后边数推到 **5241**，673 个知识点 **100% 挂上方法**。

### 段二（进行中）：方法扩到六册 + 横向依赖 + 题上卷

1. **方法扩册**（已完成）：701 142 / 702 109 / 801 125 / 802 92 / 901 135 / 902 64 = **667 条**，**六册 673 个知识点 100% 有 core 方法**（`skills_auto_check.py --vol` 逐册守门，未覆盖即 FAIL）。902 的 ch25/ch26 由我起草 core + 子代理追加 extend/olympiad 合并而成，其中 25.1-06、25.1-07 因与 25.1-02/03 语义重叠从 core 降到 extend。
2. **横向依赖**（✅ 2026-10-27）：`content/framework/analogies.json` **29 条**（13 `equivalent_to` + 16 `contrast_with`），此前这两种关系一条边都没有。配套 `tools/analogies_doc.py` 把 29 条渲染成 [docs/analogies-table.md](../analogies-table.md) 供人工审，`--check` 进 `check_all.sh`；知识点详情面板新增「可以类比 / 容易混淆」两块，每条带 why 与尾注（类比出的是猜想、混淆的要对着记）。3. **思想层补一格**：`thoughts.jsonl` 15 → **16** 条，新增 TH-16「类比与推广」（族，父 TH-04 化归与转化）。起因是 702 册的 3 条类比方法引用了不存在的 TH-16，被子代理为绕白名单改挂到 TH-12（参数法，语义不成立）；顺手把 `skills_auto_check.py` 的思想白名单从写死 1..15 改成读 `thoughts.jsonl` 动态生成。
4. question 增 `kp_refs`/`skill_refs`（801 已有 243 条映射），`assessed_by`/`explained_by` 边落地：`assessed_by` 已落 291 条，`explained_by` 仍 0 条。
5. **M4a 同步桥**（✅ 2026-10-27）：作答记录 JSONL 的导出与**幂等导入**打通，字段契约见 [docs/records-schema.md](../records-schema.md)。`store.js` 增 `parseJsonl`/`merge`/`rowKey`（去重键 uid，缺失时退回 item@sec@ts；坏行计数不中断；合并后按 ts 升序）；档案页「带走与带回来」双向，导入后重绘并把 `host.onclick` 从 addEventListener 改回来（否则重绘会叠加监听）；`web_smoke.js` 增 `store-merge` 断言（造 2 条探针记录 + 1 行坏 JSON 导两次 → added1=2 / added2=0 / dup2=2，跑完摘掉探针）。顺带修一个静默缺陷：localStorage 写满时 `setItem` 抛异常被吞，表现是「记录不再增长」，现在留痕 `MC.store.lastError` 并在档案页顶部提示先导出。**M4b（云同步）按用户决定推迟两周再评估。**

### 段三（进行中）：素养层外显（思想层已在段一随边一起立起来）

**已完成（2026-10-27 夜）：素养进知识点详情。** 六个素养（CP-01..CP-06）此前只有实体、**零条边**，讲解里的第 5 段是空洞。做法是补一层 `supports`（思想 → 素养），再让知识点沿「方法 → 思想 → 素养」两跳推出结论：

- `content/thoughts.jsonl` 16 条各加 `competencies`（CP uid 数组），共 **24 条**归属；`tools/edges_build.py` 新增第 6.5 段规则把它落成 `supports` 边（`manual` / `thought_competency` / 证据指向 thoughts.jsonl 里那句归属）。边表 **5241 → 5265**。
- `tools/build_web.py` 把 6 个 competency 节点并进 graph（nodes **1664**，此前 1658），`map.js` 新增 `compsOf(kid)` 做两跳聚合，详情第 5 段渲染「练到哪些素养 · N 条方法 · 经 思想名」，末尾固定一句 `按「它的方法归到哪条思想」推出来的，不是课标对这个点的认定。`
- 覆盖率实测：**673/673 个知识点都有素养**（0 个空），每点项数 `1→258 / 2→233 / 3→135 / 4→43 / 5→4`；各素养覆盖点数 数学抽象 367 / 逻辑推理 406 / 数学运算 138 / 直观想象 165 / 数学建模 191 / 数据分析 54。
- **100% 覆盖不是好消息**：它是「方法 100% 挂点 + 每方法都有 `thought_refs`」的必然结果，说明这一层目前完全由派生决定，没有任何独立证据。真要可信，得走到「课标条目里点名了哪个素养」那条路（现在只做了 `assessed_by` 291 条课标边，没有素养维度）。
- 闸门：`relations_check` PASSED；详情探针新增 `kp 练到哪些素养`，**11 项全过**。

**待做**：思想页/素养页（目前素养只能从知识点反查，没有以素养为主体的页）、章内「本章用到哪些思想」聚合、跨章类比视图。

## 7. 与现有模块的接口（不改判题与复习）

- 判题（`runtime/shared/judge.js`）不读边；`applies_to` 只用于「这题该用什么方法」提示，接 `hint_level=L3_method`。
- 复习队列按 `learner_evidence`，边只决定「前置未掌握 → 推迟」。
- 前端 `build_web.py` 在现有 graph 切片里增 `edges[]`（只输出 `relation`/`strength`/`dst`），体积可控（预计 +120KB raw / +18KB gzip）。

### 段二剩下的六处空白（2026-10-27 实测，写在这里免得被遗忘）

| 空白 | 实测 | 为什么难 |
| --- | --- | --- |
| **方法之间的先后只有一半是起草的** | 667 条方法之间有方向的边 **96 条**：16 条规则推断（`skill_dep_by_kp`，有挂点位置作依据）、80 条逐条起草（`skill_prerequisites.json`，review_status=ai_draft，覆盖 801 四章，其余五册未起草）。曾经用「点级先修一跳反推」产出 821 条，抽检 40 条只有 20 条站得住（并列/互逆被当先后占多数），已整段废除 | 参考产品里方法有前置/后置，且方法页写明「这个方法不等于它全部应用」。我们这两件事都有字段（boundaries / prerequisite_of），但方法级的先后没有教研签字，其余五册还是空白 |
| **`family` 只有 91/667** | 其余 576 条没有方法族归属 | 它与 `thought_refs` 的 `level=family` 层语义重叠（TH-07..TH-16 已经是方法族），继续填会造出第三套并行分类。倾向**废除 `family` 自由字符串**，统一挂 TH 族 |
| **`examples` / `strategies` 全空** | 0/667 | 「方法配一道例题」要题→方法的边，而 2951 道题里 `skill_refs` 仍 0 条（题只标到知识点层面） |
| **题→知识点只有 243 条** | 第 12 章 243 条高置信映射（占 2708 题的 9.0%），ch10/11/13 共 1466 题一条都没有。两条自动路都试过：全库别名子串吻合率 55.1%；节内候选池 + 节内唯一术语 precision 68.0%、覆盖 20.6% | 根因不是算法而是语义：**题目文本里出现的术语代表「用到了」而不是「考了」**（一道最短路径题里写着「轴对称性质」，考点是最短路径）。参考产品用「实线：解题可用 / 虚线：使用知识」两种边区分这件事，我们的题只有一张文本。要补只能逐题人工判，1466 题是内容工作量 |
| **素养只有派生、没有认定** | `supports` 24 条（思想→素养）、知识点 673/673 都能推出「练到哪些素养」，但每一条的来源都是「方法 → 思想 → 素养」两跳推断，**没有一条来自课标条文或教研判断** | 课标第四学段的总目标里写六大素养，但条目层不逐条标素养；要人工做就得 673 点 × 6 素养逐条判，与「方法前后置」同属教研判断类工作 |
| **801 的 `kp_refs` 过度挂点** | 801 的 125 条方法里 46 条挂了 ≥3 个知识点（最多的挂 8 个，如「用等边对等角求角」把整节 12.6 全挂上），而 701/702/802 的分布是 1–2 个点为主 | 直接把「一节的方法」当成「一节所有点的方法」，让 `applies_to` 356 条里约一半是松边。试过按「方法名 vs 点 title 的 2-gram 匹配」自动收窄：边 356→164、覆盖点 151→102，但选中项并不可信（「用勾股定理求边长」被匹配到 12.11-03/08 而不是勾股定理本身）。**结论：自动收窄不可靠，这批要逐条人工定主挂点** |

## 8. 不做的事

- 不做教材原页阅读器（用户判定次要）。
- 不把 SQLite/图数据库当权威源（v3 已定：Git 文本 JSONL 是权威）。
- 不追求「两万候选 → 几百人工」的漏斗；我们的方法由 `tier` 分层，core 先满覆盖。
- 不用先修边冒充教材顺序边，也不用教材顺序边推导依赖——两套边并存、互不派生。
