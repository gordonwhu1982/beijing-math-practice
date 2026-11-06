# math-coach 设计规格（v1，待你审查）

> **状态（2026-10-28 复核）**：v1 规格，已被 `docs/plan/2026-10-27-architecture-v4.md` 与 `docs/superpowers/specs/2026-10-27-chapter-map-design.md` 取代。保留作为「最初要做什么」的记录。


日期 2026-10-26 ｜ 状态：**历史存档**（v1 规格，已被 v4 与读图规格取代；当时未写任何实现代码）
定位：北京初中数学的个人教辅工具。旧仓 beijing-math-practice（公开+Pages）保留不动、只作素材来源与上游同步；本仓独立演进。

## 0. 已确认的前提
- 孩子 = 初二，北京版八年级上册。MVP 主线 = **北京版八上 第十二章 三角形 12.1–12.12**。
- 主料 = `ch12_index.json` 1128 题（实测：五档 bas261/int265/adv200/cha171/com165；主观 846 / 客观 282；含 `$` 1051 条；813 条答案含可切分步骤标记、349 条有显式「步骤N」）。
- 图谱素材 = 本仓 data/（数学 828 点、先修边 hard1763/soft1154）；三学科零跨边。
- 许可：CC BY-NC 4.0（禁商用）。外部 4924 题全 cite-only、配图 3547 张为源 PDF 整页栅格（682MB）→ 禁止进仓、禁止进发布包；ChinaTextbook 无 LICENSE → 不引入。
- 【定案 10-26】math-coach 仓先私有（调试期用）。将来若公开，4–5★ 中含网搜真题成分的 336 题只公开题干：schema 落为 question.visibility ∈ {stem_public, full_private}，构建输出两份投影（public 投影实测 0.39MB / 引用投影 0.33MB gzip，只放题干即后者）。
- 【定案 10-26·修正上轮说法】旧站并不满足「孩子做题、家长看到」：实测旧站前端只有读数据的 fetch（diagnose/app.js:183,189、children/history.js:225），无任何作答提交端点；作答全存孩子设备 localStorage，换设备/清缓存即丢。孩子端「做题+自动判题+看解析」静态站可满足（判题引擎是纯 JS，浏览器本地判），缺的只有「结果回传到家长」这一段。


## 1. 架构（三层，依赖单向）
```
content/*.jsonl   权威文本（节点/边/题/资源/讲解/映射/别名/许可）  ← Git 里可 diff 可人工改
build/            一次性闸门构建：schema+DAG(深度≤6)+许可 allowlist+引用完整性+别名覆盖率
  ├─ web/<册>.json     浏览器分片（八上实测 0.03MB gzip）
  └─ local/index.sqlite  本机检索与分析（FTS5；可丢弃，重跑即恢复）
runtime/          浏览器只读加载分片 + 追加写 outbox/*.jsonl（一键导出回 Git）
private/          gitignore：cite-only 题源、整页截图、课本 PDF、孩子作答原始日志
```
判据：同一次改一条记录，JSON 的 numstat 是 `2 2`，`.db` 是 `Bin 5242880 -> 5242880`；两者 .git 体积实测打平 → **性能不是约束，可评审性才是**。不上图数据库。

## 2. schema 关键点
- `node`：`kind`(topic|external_kp|method|technique|curriculum_standard|resource_set) + `title,grade,term,unit,chapter,section,domain,summary,license_tier`。**外部 kp 与本仓点同表不同 kind，靠 bridge 连边，不改 id、不 fork 知识点。**
- `edge`：`src,dst,kind(prerequisite|applies|uses_math|aligns_standard|confusable|variants_of),strength,evidence,confidence(exact|inferred|unreviewed),review_status(ai_draft|human_checked|rejected)`。evidence+review_status 必备——否则无法在数据里表达「AI 初稿未经审核」。
- `question`：`id,stem,answer,form,topics[](**必须多值**),methods[],band,score,difficulty_status(rule_based|measured),source_key,license,redistributable,review_status,figure_ids[],rubric_ids[],variants_of,new_type_tag`。
- `rubric`：`qid,step_id,ordinal,criterion,points,common_mistake,prereq_topic` —— 错因能被结构化、错题能定位前置洞的**唯一入口**。
- `attempt`（append-only，带幂等 id）：`learner,qid,at,verdict,answer_text,latency_ms,hint_used,hint_ordinal,rubric_scores[],self_report,src`。**hint_used 必须有**，否则「看提示做对」会污染难度与掌握度。
- `mastery`：主键 `(learner,topic,src)`，src ∈ direct|inferred|self_report，**三态在数据层永久分开**。
- `edition_map`：`(topic_id,edition,chapter)` → `{grade,term,unit,chapter,section,source(哪版PDF哪一页),verified_on,confidence}`，对齐上游 mappings 做法。
- 迁移：`schema_version` 写入 meta 与 jsonl 首行；加字段向后兼容，破坏性变更走新版本目录 + migrate 脚本。

## 3. 判题引擎（L0–L4，纯 stdlib，不引 CAS）
| 层 | 覆盖 | 实现 |
|---|---|---|
| L0 归一 | 全半角、²³、°、空白、分数写法、单位 | NFKC + 字符串；**必须补「分之」与中文数词**（现引擎缺） |
| L1 数值精确 | 整数/小数/分数/带分数/百分数/负号 | Fraction 精确比较 |
| L2 多值无序 | 方程组解、坐标、多根 | **默认无序**，`ordered:true` 才按序（现引擎 114 道误判 wrong 即此洞） |
| L3 表达式等价 | 展开/因式分解/移项 | 数值采样 + 差分判次；判对写 `equivalence=sampled` 并回人工队列 |
| L3.5 中文答案 | 「四分之三」「平行」 | 中文数词 + 同义集（复用别名表） |
| L4 解答题 | 证明/计算过程 | **不自动判**：按 rubric 逐点自评/家长判 |
铁律：**宁可判 manual，不可假判 correct**——假判会伪造掌握度。验收：114 道误判转 correct 或 manual（不许转 correct 的必须是 manual）；151 道「b分之a」转 correct；20 题人工复判 0 假阳性。

## 4. 难度与复习
题级 IRT **永久放弃**（一学期 800 次作答 / 12355 题 = 0.0648 观测/题，数学上不可识别）。改：知识点级 FSRS，先验取规则档（外部 band↔score 实测零跨档，是干净先验），学生数据只微调。粒度只在**当前在学册**（八上 57 点 = 14.0 次/点，可用下限）。难度 UI 一律写「规则估计·未实测」。复习对象是知识点不是题 → 与错因/前置洞共用 topic 层。

## 5. 七屏与两条通道（继承上轮设计，此处只记不可省项）
今日 / 学(节页) / 练 / 测 / 补 / 复习 / 档案。**练与测必须两条通道**：advanced 实测 0/277 可达 → 培优走「练」的独立入口，诊断只出 basic/standard。做错逐帧：三态判定 → 错因登记（不先给答案）→ 提示阶梯 L1重述/L2知识点/L3方法族/L4第一步（逐级、留痕）→ 分步折叠 → 同节同层再试。掌握五态：独立通过/带提示通过/推断/不稳/薄弱 + 时效与证据量两个修饰位，**「我不认这个推断」一键降级**。

## 6. 交付里程碑
- **M0**（前置插队）：vendor KaTeX（MIT）本地化 + MathML 双写 → 否则 MVP 主料不可读。然后定 jsonl 结构 + 一条 build 命令出「八上」分片 + 许可 allowlist 生效。
- **M1**：新判题 L0–L3.5 + 多值 topics + 别名检索（30–50 条刁钻单测）。
- **M2**：edition_map（北京版 26 章名已实测可抽）+ 北京版为默认 + 按册浏览。
- **M3**：错题→前置洞→一步出口；rubric 播种源 = ch12_index 的 349 条显式步骤（**非外部 bank**）。
- **M4a（零外部依赖，当天可跑）**：attempt outbox + 浏览器"导出作答文件"（一个 .jsonl，每行一条作答记录）→ 微信/QQ 传给你 → 放进 `events/` → git 提交即完成同步；导入端做幂等（记录自带唯一 id，重复导入不重复计）。家长看孩子进度 = 看自己仓库里的文件。缺点：跨设备搬运靠人。
- **M4b（自动上传，需一个免费端点，待你拍板是否要）**：孩子浏览器 POST outbox → Cloudflare Worker + KV/D1 免费档 → 你这边定时/手动拉回 git。上游作者正是这条路的先例（deploy-cf.sh 用 wrangler；其统计端点就是 workers.dev Worker）。代价：需注册 Cloudflare 并给一次部署用的 API Token（不碰 GitHub 账号）；本机 npx 取 wrangler 当前不通，需在有网环境或换镜像跑。
- 不选：GitHub 私有仓当接收端（token 要放孩子设备，面更大）；第三方表单服务（未成年人数据外流）。
- 远程更新代码→孩子自动看到：已具备。你在任意设备 push → GitHub Pages 构建 → 孩子刷新即新内容；**新仓因 build/ 产物不入库，需要一条 GitHub Actions 在 push 后跑 `build.py` 再发布**（旧仓纯静态无此需求）。
- **M4c**：FSRS 复习队列（对象=知识点，先验=规则档）——与 M4a 解耦，日志攒够 200 行再开。
外部 4924 题内容入库排在 M4 之后（撞 C0 人工核对，不撞架构）；先建容器与 34 条人工桥。
不做：班级/教师端/账号/排行榜/自动出题/题级 IRT/整页截图配图/自动 OCR 全册。

## 7. 决策记录与剩余问题
- 已定：MVP=北京版八上第12章；仓先私有；KaTeX 本地 vendor（M0）；rubric 播种源=ch12_index 349 条显式步骤；真题成分题将来只公开题干；同步桥先走 M4a 人肉导出导入（架构定案见上）。
- 已答 ①：版次 = **《2024版新教材》北京版八上**（169页·文字层完整，textbook_index.json 即由它生成）→ edition_map 权威源锁定该 PDF。
- 已答 ②：M4b **先不立项**，跑 M4a 两周后凭真实使用决定（outbox 格式两案共用，后加不改数据）。
- 已答 ③（10-26 补充定案）：**题量内容集中第12章**（10/11/13 只有 ch11/ch13 的 generated+answers HTML，无结构化索引，抽取管道排在 M2 后）；但**知识图谱框架必须整初中完整**：北京版 701–702–801–802–901–902 六册 26 章的章-节-知识点骨架都要有，缺内容处显式标 status=stub/未归属，不许硬塞。框架素材实测盘点：① 本仓人教七9年级 315 点可作知识点底料经 edition_map 挂到北京版章下；② 八上 27 节 88 点已有 textbook_index.json；③ 七下有人北京初一（下）期中 35 份 + 期末 25 份数学卷（2023–2025，含答案）可作七下节级进度与考点权重证据；④ 七上/八下/九上/九下 2024 新版目录本地无 —— 需用户提供或官方渠道，未拿到前该四册只建到章级、节级标「未核对教材」。
- 新增子系统 S-FRAME（框架完整性）：随 M2 一同交付六册 26 章章级骨架 + 八上节级完整 + 其余节级渐进；不阻塞第12章主链。
