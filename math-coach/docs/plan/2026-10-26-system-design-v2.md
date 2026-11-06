# math-coach 系统设计 v2 + 资源整合计划

> **状态（2026-10-28 复核）**：已被 `docs/plan/2026-10-27-architecture-v4.md` 取代。D1–D6 六条决策仍然有效（三层架构、许可隔离、判题三态、不上图数据库等）；分层、边表与前端形态以 v4 与 `docs/STATE.md` 为准。


日期：2026-10-26　　仓库：D:\个人\知识图谱\math-coach　　编写：lead（原定由产品方案评审团出具，三名成员本轮全部失败，见 §7）

---

## 0. 结论摘要

| # | 决策 | 依据 |
| --- | --- | --- |
| D1 | **权威层只存 Git 文本**（JSON/JSONL），SQLite 只做构建索引、不解释为源 | 可评审性：改一条记录 numstat 是 2 2，改 .db 是 Bin 二进制（上轮已量化） |
| D2 | **题库 schema 必须带 source_type + license + redistributable + provenance**，构建时分「公开切片 / 私有切片」两份产物 | 4–5★ 题公开只放题干（用户已定）；外部源许可各不相同 |
| D3 | **知识点层以「节」为锚，知识点按需展开**：六册 143 节 / 673 点全部可导航，但默认每屏最多 10 点 | 旧引擎 1821 点铺满的教训 |
| D4 | **外部源按许可分三档**：可入库可分发（CC BY-SA/ODbL）、仅内部引用（NC/校内卷/教材）、不入库（NOASSERTION） | 实测：K12-KGraph=CC BY-NC-SA 4.0；haojing8312=ODbL+CC BY-SA（K12 派生部分 NC-SA）；上游 cn-math-taxonomy=**NOASSERTION** |
| D5 | **判题先做 L0–L3.5 纯 stdlib，宁判 manual 不假判 correct**；判题与掌握度属运行层能力，不落成数据字段 | 旧引擎实测：多答案乱序 98/120 判错、中文分数 168/168 判 manual |

---

## 1. 现状与缺口

### 1.1 已建成（实测，均有脚本可复跑）

| 项 | 数字 | 复跑命令 |
| --- | --- | --- |
| 六册骨架 | 26 章 / 143 节 / 6 册 | python tools/framework_gen.py |
| 知识点 | 673 条（701=147 / 702=146 / 801=151 / 802=79 / 901=105 / 902=45），每节 3–10 条，≤2 条的节 0 个 | 同上 + tools/framework_status.py |
| 先修边 | 394 条（人工节级 159 + 规则 137 + 知识点级 98），环 0，章间 45 条覆盖 26/26 章 | 同上 |
| 第 12 章题库 | 1128 题（1092 有答案 / 36 缺），band 五档，figure.need 必须 466 / 建议 581 / 无需 81 | python tools/questions_check.py |
| 评分点 | 3179 点，覆盖 546 题（有显式步骤的 561 题） | python tools/rubric_check.py |
| 数学式 | 23990 个，KaTeX 0.16.11 本地 vendor，渲染抛错 0、数学式内混中文 0 | node tools/katex_selftest.js |

### 1.2 缺口（逐条对齐用户点出的「不完善」）

| 缺口 | 现状证据 | 影响 |
| --- | --- | --- |
| 知识点偏「标题级提炼」 | 701 无文字层（按通用体系补写）、702/802/901/902 只做节标题+抽样正文；只有第 12 章逐节正文取样 | 缺定义与例题，无法支撑「学」屏 |
| 课本习题全空 | 801 的 27 节 textbook_exercises 巩固/提升/拓展三档全空 | 缺「跟课本走」的练习主料 |
| 真题未结构化 | 49 个 OCR txt（988KB），噪声大（如「连 接 对 角 线 4D,BE」） | 真题改编无法批量做 |
| 外部资源没用上 | 人教 K12-KGraph 885 题 + 2711 节点 KG 已实测可下，但未入库 | 跨版本练习为零 |
| 先修边只到第 12 章知识点级 | kp_prerequisites.json 仅 98 条，其余 5 册停在节级 | 六册连通性不完整 |
| 531 题无评分点 | 无显式步骤的题无法切 rubric | 判题后无分步反馈 |
| 466 题「必须配图」无图 | 3547 张 page-raster（682MB）在旧工程，未接入 | 几何题无法做 |

---

## 2. 架构 v2

### 2.1 四层与目录（在既有 spec 上细化）

    math-coach/
      content/                     # 权威层：Git 文本，唯一可信源
        framework/
          volumes/{701,702,801,802,901,902}.json   # 章/节/单元名 + 教材页码
          knowledge_points/{vol}.json              # 知识点（含 statement/aliases/anchors）
          prerequisites.json                       # 节级先修
          kp_prerequisites.json                    # 知识点级先修
        questions/<vol>/*.jsonl                    # 题库
        rubric/<vol>/*.jsonl                       # 评分点
        mappings/<edition>.json                    # 跨版本知识点对照（人教↔北京版 等）
        sources/registry.json                      # 外部资源登记（§4.4）
        sources/snapshots/<source_id>.json         # 抓取快照的最小必要子集
      build/                       # 构建层：全部 gitignore
        index.sqlite               # node:sqlite 派生索引（FTS5），可随时重建
        slices/<vol>.public.json.gz / <vol>.private.json.gz
        report/                    # 各闸门报告
      runtime/                     # 运行层：静态站，无后端
        index.html / app.js / screens/ / assets/vendor/katex/
      private/                     # 个人数据：gitignore
        records/<child>/answers.jsonl   # 作答事件（真相）
        outbox/, inbox/                 # M4a 同步桥
      tools/                       # 生成与闸门脚本（已有 14 个）

**为什么 SQLite 不是源**：派生层可删除重建；权威层要能逐条 review。同一处内容改动，git numstat 是 2 2（文本）vs Bin 5242880->5242880（库文件）。

### 2.2 题库 schema（v2 扩展字段）

现有 15 字段保留，新增 6 个必填字段，把「来源 / 许可 / 能否再分发 / 可见性 / 出处」变成数据而不是口头约定：

    {
      "id": "cnm_p050_q2",
      "source_type": "main_authored",   // main_authored | textbook_exercise | exam_adapted | external_cited
      "license": "own-ai-draft",        // own-ai-draft | cc-by-sa-4.0 | odbl-1.0 | cc-by-nc-sa-4.0 | textbook-proprietary | noassertion
      "redistributable": false,
      "visibility": "stem_public",      // stem_public | full_private | blocked
      "provenance": [
        {"source_id": "k12kg_math_8a_rjb",
         "path": "K12-KGraph/afterclass_exercises/math_8a_rjb.json",
         "sha256": "…", "retrieved_at": "2026-10-26",
         "item": "math_8a_rjb_ch11_s1_t2"}
      ],
      "mapping": {"edition": "renjiao", "concept": "三角形不等式", "confidence": 0.9}
    }

闸门（扩展 tools/questions_check.py）：
- redistributable=true 时 license 必须在 allowlist（own-ai-draft / cc-by-sa-4.0 / odbl-1.0）；
- license ∈ {cc-by-nc-sa-4.0, textbook-proprietary, noassertion} → redistributable 强制 false；
- source_type ≠ main_authored 必须至少一条 provenance，且 sha256 与 sources/registry.json 一致；
- visibility=stem_public 的题，公开切片只允许出现 stem（用字段白名单生成，不靠黑名单过滤）。

### 2.3 双产物与泄漏防线

| 产物 | 内容 | 消费者 |
| --- | --- | --- |
| <vol>.public.json.gz | stem + topics + band + figure 元数据（无 answer/analysis/rubric） | 将来公开的 Pages 版 |
| <vol>.private.json.gz | 全字段 | 孩子自用（本机 / 私有 Pages） |

三道防线：① 构建时字段白名单；② tools/check_no_leak.py 用答案前 12 字哈希在 public 里反查，命中即失败；③ 发布脚本只读 build/slices/*.public.*，不读 content。

### 2.4 知识点 schema（v2）

    {
      "id": "K801-12.5-03",
      "section": "801-12.5",
      "title": "边边边（SSS）判定",
      "statement": "三边分别相等的两个三角形全等。",
      "aliases": ["SSS", "边边边"],
      "band": "core",                      // core | extended
      "anchors": [{"page": 96, "pdf_page": 105, "text_offset": 4211}],
      "source_refs": [{"kind": "textbook", "note": "教材 p96 定理"}],
      "external_refs": [{"source_id": "k12kg_kg_math", "node": "math_8a_rjb_cpt…",
                         "relation": "same_as|broader|narrower"}]
    }

external_refs 是「课本 + 网上开源资源」结合点：每条外部概念能指回我们的知识点，但不复制对方全文（避免许可传染）。

### 2.5 切片与索引

- 切片粒度 = 册；gzip。参考：旧仓初中数学切片 315 点 / 1407 题 = 653KB raw / 140KB gzip；本仓第 12 章 1128 题私有切片 gzip 约 0.6–0.8MB，仍是「一次加载即可」量级。
- build/index.sqlite：kp(id, section, title, statement)、kp_fts(title, statement, aliases)、q(id, topic, band, source_type)、edge(src, dst, level)。只给离线工具（覆盖率、查重、跨版本对照）用。
- 运行时不带 SQLite：检索靠切片内倒排表（§3.3）。

### 2.6 判题与掌握度的位置

| 能力 | 层 | 说明 |
| --- | --- | --- |
| 判题 L0–L3.5 | 运行层（前端 JS，纯 stdlib） | L0 精确 / L1 数值 / L2 多重集 / L3 多项式等价 / L3.5 中文数词与分数 / L4 交人工 |
| 评分点 rubric | 权威层数据 | 已播种 3179 点，用于分步折叠与第一步提示 |
| 掌握度 | 运行层计算 + 权威层记录 | 事件写 private/records/*/answers.jsonl，掌握度由事件推导，不落成字段 |
| 复习队列 | 运行层计算 | 由事件 + 五态推导，无独立状态文件 |

铁律：判题三态 correct | wrong | manual，manual 永不显示为错；掌握度必须区分「直接测出」与「推断」，并提供「我不认这个推断」降级入口。

---

## 3. UX v2

### 3.1 导航模型：节是锚，点是叶

    册（6）→ 章（26）→ 节（143）→ 知识点（3–10 / 节）

- 默认屏只显示当前节的 3–10 张知识点卡片：标题 + band + 三态进度（未测 / 通过 / 薄弱）。
- 章节列表每节一行摘要：12.5 三角形全等的判定 · 3 个知识点 · 86 题 · 未测 12 / 薄弱 3。
- 全册视图只给热力图 + 待办，不铺 673 条。

### 3.2 七屏的「屏幕—状态—动作—失败态」

| 屏 | 核心状态 | 主动作 | 失败态与兜底 |
| --- | --- | --- | --- |
| S1 导航 | 当前节、每点三态 | 选点 / 选节 | 无题的点 → 「本节暂无题，去补练习」+ 相邻节入口 |
| S2 学（知识卡） | 定义 + 例题 + 方法族 | 标记「会 / 不会」 | 无 statement → 显示 stub 标记，不伪装完整卡 |
| S3 练（作答） | 题面 + 输入 + KaTeX | 提交 | 判 manual → 三态卡「机器判不准」，不显示对错 |
| S4 提示 | L1 重述 / L2 定位 / L3 方法族 / L4 第一步 | 逐级取提示 | 取到 L3/L4 后做对 → 记「带提示通过」，不计实测掌握 |
| S5 反馈与错因 | rubric 分步折叠 + 错因（概念不清/计算失误/审题/不会下手） | 选错因 | 无 rubric → 只给答案 + 「补评分点」入口 |
| S6 补学出口 | 同节同层再练 / 前置点回补 / 方法族例题 | 出发 | 前置点也没题 → 链到最近有题的前一节 |
| S7 复习 | 待纠错队列 + 时效衰减 | 开始复习 | 队列空 → 给「下一节建议」 |

### 3.3 防淹没规则（673 点怎么不压垮孩子）

1. 单屏上限 10 张卡；超出按 band 折叠成「核心 / 拓展」两段。
2. 四个筛选器固定可见：未测 / 薄弱 / 待复习 / 易错；默认「本节 + 未测」。
3. 检索必须语义化：切片内倒排索引（标题 + aliases + 术语表）+ 拼音首字母；不做子串匹配（旧引擎搜「圆」命中一年级、搜「方差」命中平方差公式）。
4. 每个知识点只有两个出口：学（知识卡）/ 练（该点题组），不出现第三个让人犹豫的选择。
5. 进度用「节覆盖率」（本节已独立通过 / 总点数），不用总分或等级。

### 3.4 判题与掌握度的界面契约

- correct 绿；wrong 红（先不给答案，先记错因）；manual 灰，文案「这题机器判不准，按你写的算，先看思路」。
- 掌握五态：独立通过 / 带提示通过 / 推断 / 不稳 / 薄弱；后两态带证据量（n 题）与时效（几天前）。
- 「推断」态必须有说明「这是从相邻知识点推出来的」，并给一键「我不认」。

---

## 4. 资源整合计划

### 4.1 数据源清单（本轮全部实测，2026-10-26）

| 源 | 许可 | 可获取性与体量 | 我们的用法 | 判定 |
| --- | --- | --- | --- | --- |
| 本机北京版教材 PDF（八上 2024 版 169 页有文字层；七上扫描件；其余旧版） | 版权归出版社，个人持有 | 已在本机；textbook_index.json 已有 801 的 4 章 27 节 88 点 + 页码锚 | 抽正文做 statement 与例题；习题入库标 textbook-proprietary + redistributable=false | 可用（仅自用） |
| 49 份北京初二真卷 + 49 个 OCR txt（988KB） | 校内试卷，无公开授权 | 已在本机；OCR 噪声大，未结构化 | 真题改编（exam_adapted），公开只放题干 | 可用（仅自用） |
| **K12-KGraph 人教课后习题**（HF lhpku20010120/K12-KGraph） | **CC BY-NC-SA 4.0**（HF license tag 实测）；2921 下载 / 19 likes / 2026-07-28 更新 | 六册实测：7上 226、7下 179、8上 151、8下 139、9上 123、9下 67 = **885 题，全部有 answer+analysis**；curl 直下 147–265KB/册 | 跨版本练习第二来源，经 mappings/renjiao.json 对到北京版知识点；license=cc-by-nc-sa-4.0、redistributable=false | 可用（仅自用，禁商用/禁公开再分发） |
| **K12-KGraph math KG**（subject_specific_KG/math.json，2.27MB） | 同上 CC BY-NC-SA 4.0 | 实测 **2711 节点**（Concept 1470 / Exercise 474 / Skill 428 / Section 166 / Chapter 150 / Book 23）、**5273 边**（appears_in 2621、prerequisites_for 853、tests_concept 406、relates_to 405、is_part_of 316、is_a 287…）；Concept 平均定义 31 字，带 importance/pages/examples | ① 交叉校验 673 条知识点（漏点/错层级）；② 先修边第二意见（853 条）；③ 例题来源 | 可用（仅自用） |
| haojing8312/cn-k12-math-knowledge-graph（55★，2.5MB） | code Apache-2.0；数据 ODbL 1.0 + 自撰 CC BY-SA 4.0；**K12 派生部分 CC BY-NC-SA 4.0** | data/graph.json 969KB + layout.json 282KB；ATTRIBUTION.md 记录上游 sha256 | 只作已审校的先修边第二来源比对，不复制正文 | 可用（对照） |
| wwlwgo/cn-primary-math-knowledge-graph（7★） | code MIT；数据 ODbL + CC BY-SA | 948KB，仅小学 | 暂不用（学段不匹配） | Deferred |
| 上游 xiaoyang111222/cn-math-taxonomy（3929★） | **NOASSERTION**（实测，不是 MIT） | 37.6MB，2026-10-26 仍在推送 | 仅作对照参考，内容不入库不分发 | 不入库 |
| LibreMath | 站点取不到，同名 GitHub 项目无关 | — | 不可依赖 | 不可用 |
| ChinaTextbook（TapXWorld） | **无 LICENSE 文件**（/license 404） | 43.5GB；北京版六册为旧版（最后提交 2023-03-19） | 仅用于缺册补页（七上/七下已拉到） | 仅取缺册，不入库 |
| 旧线上仓 beijing-math-practice | 自有（含上游内容） | 1821 点 / 7431 题 / 6.6MB raw | 仅对照，不迁移 | 冻结 |

### 4.2 三条接入流水线（产物与闸门）

**P1 课本习题（补 textbook_exercises）**
1. tools/section_text.py 已能按节切正文（801 27 节全部有文字，页码偏移 +9）；新增 tools/textbook_exercise_extract.py 切「练习/习题」区段，抽题干+题号+页码锚；
2. 入库 source_type=textbook_exercise、license=textbook-proprietary、redistributable=false、visibility=stem_public；
3. 闸门：题号必须能回到 PDF 页（断言该页文本含题干前 8 字）；
4. 产物：content/questions/801/*.jsonl 追加 + COVERAGE.md 更新。

**P2 真卷 OCR 结构化**
1. tools/exam_ocr_normalize.py：按 49 个 txt 首行 SOURCE: 建元数据（学校/考试/年份），按 ^\s*\d+[.、] 切题；
2. 噪声处理：合并单字被拆行（「连 接 对 角 线」→ 去空格）、识别（1）（2）子问、丢弃 <8 字或无解标记的残片；
3. 快照写入 content/sources/snapshots/exam_2024_2026.json，题入库 source_type=exam_adapted、license=textbook-proprietary、redistributable=false；
4. 闸门：每题必挂 provenance.item = <文件名>#<题号>；先做 20 题人工校准。

**P3 人教 K12-KGraph（跨版本练习）**
1. tools/ingest_k12kg.py：下载六册 + KG，校验 sha256 后写 content/sources/snapshots/k12kg_*.json；
2. tools/mapping_renjiao.py：用 KG 的 Concept.name 与我们的 title/aliases 做实体对齐（精确 → 别名 → 字符相似度），产出 content/mappings/renjiao.json（含 confidence 与 basis）；
3. 只有 confidence ≥ 0.8 允许「自动练习」；<0.8 放「拓展练习」并标注「跨版本，可能不同步」；
4. 闸门：每条映射必须指到两端 ID，不可达即抛错，不静默丢弃。

### 4.3 先修边第二意见（把 853 条 prerequisites_for 用起来）

- 现有 394 条人工/规则边为主；人教 KG 的 853 条为旁证：命中的边标 corroborated；人教有而我们没有 → 进「待审清单」，人工裁决后入 kp_prerequisites.json；两者冲突 → 标 conflict 并在 framework-status.md 汇总。
- 价值：从「按目录推」升级为「两个独立体系互证」。

### 4.4 许可与出处闸门（allowlist）

| 档 | 许可 | 允许动作 |
| --- | --- | --- |
| A 可入库可分发 | own-ai-draft、CC BY-SA 4.0、ODbL 1.0 | 全字段进 public 切片（保留署名与出处） |
| B 仅内部使用 | CC BY-NC-SA 4.0、校内试卷、教材原文 | 只有题干可进 public，答案/解析仅 private；不商用；导出不携带 |
| C 不入库 | NOASSERTION、无 LICENSE | 只允许写进分析文档，禁止进 content/ |

机器可查：content/sources/registry.json 每条含 source_id/license/url/retrieved_at/sha256/allow_tier；questions_check.py 强制 license → tier 映射一致（不一致即 rc=1）。

---

## 5. 里程碑

| 里程碑 | 交付物 | 验收检查点 | 可回退点 | 优先级 |
| --- | --- | --- | --- | --- |
| M0 已完成 | 六册骨架 + 673 知识点 + 394 先修边 + ch12 题库/rubric + KaTeX vendor + 6 个闸门脚本 | 6 条闸门全绿 | 各 commit | Essential |
| M1 资源闸门与多源题库 | sources/registry.json + schema v2 六字段 + P1/P2/P3 三条流水线 + public/private 双产物 + check_no_leak.py | ① 885 道人教题入库且每题有 provenance+sha256；② 1 本教材习题端到端跑通（≥30 题可回原页）；③ public 切片 grep 不到答案指纹；④ 题量 ≥ 1128+885+30 | 新字段可空默认，兼容旧题库 | Essential |
| M2 框架完整性 | 802/901/701/702 知识点级先修边 + 教材页锚全覆盖 + 人教 KG 交叉校验报告 | ① 六册 KP 级边 ≥ 400 条且环 0；② 每条 KP 有 ≥1 anchor 或显式 no_anchor 原因；③ conflict 清单为 0 或每条有裁决记录 | 保留节级边可用 | Essential |
| M3 作答闭环 + M4a | 判题 L0–L3.5（重写）+ 三态 UI + 作答事件 JSONL + 导出/导入 | ① 回归集：多答案无序 152/152、中文分数 ≥90% 判 correct、混合表达式不过度判 wrong；② 20 题手测三态正确；③ 导出→清空→导入后进度一致 | 判题退化为「只判 exact + manual」 | Essential |
| M4 掌握度与补学 | 五态掌握 + 推断降级 + 提示 L1–L4 留痕 + 错因 + 复习队列 | ① 57 点 15 题场景不再报「57 掌握」；② 带提示通过不计实测掌握；③ 队列空/满均有出口 | 隐藏复习屏 | Essential（减配版） |
| M5 配图与真题广度 | 466 道必配图题落地（SVG 图元 + page-raster 切片）+ 真题改编 ≥100 题 + ch10/11/13 入库 | ① 每题 figure 离线可渲染；② 真题抽样 20 题人工核对一致 | 配图题先隐藏 | Recommended |

Deferred：题级 IRT / FSRS（观测密度不足，8上 57 点需 14 次/点才勉强可启）、排行榜/连胜/账号/教师端、自动出题、整页截图配图。

---

## 6. 风险与未决

| 项 | 现状 | 处理 |
| --- | --- | --- |
| 七上/七下/八下/九上/九下版次未核 | 手上是旧版 PDF | 2024 新版到手后重跑 parse_toc.py + section_text.py；此前相关 KP 标「版次待核」 |
| 七上无文字层 | 158 页 get_text() 全空，本机无 tesseract | 目录已人工读图录入；正文知识点靠「目录 + 通用体系」并标 source=section_title_only |
| 人教 KG 许可 NC | CC BY-NC-SA 4.0 | 只进 private 切片；公开版改用自有改编或 CC BY-SA 源 |
| 人教与北京版编排差异 | 分式在人教八上第 15 章、北京版第 10 章；二次根式人教八下、北京版八上 | 靠 mappings 按知识点对齐，不按章节对齐 |
| 判题覆盖上限 | 主观题（证明/作图）本质不可自动判 | 以 manual + rubric 折叠替代，不造「AI 判证明」的幻觉 |

---

## 7. 本轮方法与覆盖说明

- 原计划由「产品方案评审团」（Product Manager / UX Researcher / Software Architect）并行出具，本轮**三名成员全部失败**（后台任务失败、无收尾消息，wait_agent 返回 no-active-peer），本文件由 lead 直接完成，覆盖度 **0/3 成员**。
- 所有数字来自本仓脚本实测或本轮亲自抓取（HuggingFace / GitHub API），未使用未核实二手描述；无法核实项已标「不可用 / 未核实」（如 LibreMath）。
