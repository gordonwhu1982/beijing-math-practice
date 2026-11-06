# math-coach

北京初中数学个人教辅工具（自家孩子用）。**接手先读 [docs/STATE.md](docs/STATE.md)** —— 那里有当前进度、怎么跑、闸门各挡什么、参考源与踩过的坑；本 README 讲的是「现在有什么」。设计规格见 [docs/superpowers/specs/2026-10-26-math-coach-design.md](docs/superpowers/specs/2026-10-26-math-coach-design.md)（v1，历史存档，现行架构见 [docs/plan/2026-10-27-architecture-v4.md](docs/plan/2026-10-27-architecture-v4.md)），
数据契约见 [content/registry/schema.json](content/registry/schema.json) 与 [docs/plan/2026-10-26-data-architecture-v3.md](docs/plan/2026-10-26-data-architecture-v3.md)（字段设计的历史来源）。
旧仓 beijing-math-practice 保留不动（公开 + Pages，只作素材来源与上游同步），本仓独立演进，调试期私有。

## 现在有什么

| 层 | 内容 | 状态 |
| --- | --- | --- |
| 六册骨架 | 北京版 701/702/801/802/901/902 → 26 章 143 节 | 801 已对 2024 版教材核过；其余五册版次待核（`status=stub_edition`/`content_draft`） |
| 知识点 | 143 节共 **673** 个知识点（701=147 / 702=146 / 801=151 / 802=79 / 901=105 / 902=45），每节 3–10 条 | 每条都有定义/条件/边界（见下一行），但 `review_status` 一律 `ai_draft`——按教材正文起草，未经教研复核 |
| 知识点富化 | `knowledge_points/<册>.detail.jsonl` **673** 条：kp_type / definition（30–120 字）/ conditions / boundaries / objectives / aliases / 教材页码 | 六册 673 个知识点**全部**已富化（无 title_only 空壳），`review_status=ai_draft` |
| 解题方法与错因 | `skills/<册>/ch*.jsonl` **667** 条方法（701 142 + 702 109 + 801 125 + 802 92 + 901 135 + 902 64），按 `tier` 分三层：教材内 **577** / 培优 **66** / 竞赛·拓展 **24**（steps 带依据、failure_signals，另加 `desc` 一句话说清、`boundaries` 边界声明、`thought_refs` 思想归属）+ `misconceptions/801/ch{10,11,12,13}.jsonl` **127** 条错因（8 类） | 八上 27 节全覆盖，每节 2–8 条方法、3–7 条错因；**六册 673 个知识点 100% 有 core 方法**（`tools/skills_auto_check.py` 逐册守门，未覆盖即 FAIL）；与知识点双向引用零断裂；**边界声明是防「当成万能解法」的关键字段**——801 的 125 条由 `skill_enrich.py` 生成整句模板（偏弱），802 的 92 条写成真话（不适用情形 + 最易混淆的方法），回填 801 已在待办 |
| 关系表 | `content/relations/edges.jsonl` 统一一张表 **6334** 条边，12 种关系已落 11 种：applies_to 1015 / uses_skill 1015 / prerequisite_of **1211**（按端点分：知识点→知识点 657、**方法→方法 395**（16 条按教材位置判定 + 379 条逐条起草、六册 385 条草稿，见 `docs/skill-prerequisites.md`）、节→节 159；按跨度分：同节 843 / 同章跨节 261 / 跨章同册 10 / **跨册 97（几乎都是节对节）** —— 三套口径见 `docs/plan/2026-10-28-competitor-parity.md` §5.11，复跑用 `python tools/prereq_dist.py`）/ assessed_by 981 / is_part_of 842 / belongs_to 826 / misconception_of 254 / sequence 137 / **supports 24** / contrast_with 16 / equivalent_to 13（只剩 explained_by 是 0） | 由 `tools/edges_build.py` 从五处权威源派生，`tools/relations_check.py` 守 10 条不变量（端点存在、无自环、双向一致、无环、sequence 覆盖每章相邻节…）。人工边 `manual`、规则边 `inferred`；**673/673 个知识点都挂上了方法（100%）**，541 个（80.4%）有先修边，**666 个（99.0%）挂上了课标要求**；六个核心素养经 24 条 supports 边连到思想，于是 673/673 个知识点都能推出「练到哪些素养」（**派生，不是课标对这个点的认定**，面板里就这么写） |
| 第 12 章题库 | **1242** 题落成 `content/questions/801/ch12.jsonl`（basic 350 / standard 344 / advanced 212 / challenge 171 / competition 165） | 1206 题带答案，36 题（易错组）答案缺失；`topics` 字段只到**节级**，点级映射走侧挂的 `ch12.kp.jsonl`（见「练习判题」行） |
| 第 10/11/13 章题库 | **1466** 题（10 章 482 / 11 章 614 / 13 章 370），六档齐全：基础 419 / 提高 398 / 拓展 287 / 高难 212 / 竞赛 150 | 1436 题带答案 + 步骤化解析；第 13 章「本章综合测试卷」30 题上游本来无答案。第 11 章原来是零题（教材里根号是矢量图形抽不出），这一批正好补上 |
| 评分点 | `content/rubric/801/ch12.jsonl` **3179** 个评分点 / 546 题（每题合计 100） | 全部 `ai_draft`，`basis` 字段未建；第 10/11/13 章还没做评分点 |
| KaTeX | `assets/vendor/katex/` 0.16.11 MIT（597K，含 20 个 woff2） | 38764 个数学式真渲染 **0 错**；1859 个片段里混着中文或未识别符号（`\text{ }`、`$P(红)=1/2` 这类，能渲染但书写不规范，待清） |
| 数据契约 | `content/registry/schema.json`（**17** 类实体）+ `tools/schema_check.py` | v3.1：新增 `thought` 与 `competency` 两类实体，`edge.relation` 扩到 **12** 种且 `evidence` 改成必填数组（每条边都要能说出出处）；存量缺新字段按「覆盖率缺口」报告，不计错误 |
| 前端应用 | `runtime/web/`：十屏（今日 / 目录 / 节 / 知识点 / 图谱 / 练习 / 错题重练 / 哪里不稳 / 依据总览 / 档案）+ 两个二级页（三列 `#/rel/<kid>` / 思想总表 `#/thoughts`）+ 数据切片 `runtime/web/data/`，双击 `index.html` 即用 | 图谱默认一张全景（七视角，全景为主位）：全景（册/章/思想）/ 章图 / 骨架（节）/ 知识点 / 方法 / 错因 / **思想**。章图上节与节之间画两种线：细虚线是教材顺序，带箭头的粗线是「后一节有几处要用前一节」（一条依赖一条线会横穿好几个岛，所以折成节间聚合线，线粗随处数涨；第 12 章 19 条、最多的一对 7 处）。**看得越远卡片越小**：全景档卡片原尺寸、整册档缩到 0.62、六册档缩到 0.34，卡片尺寸、间距、截断字数一起缩（只缩字会溢出、只缩卡片会糊）；六册档不画节岛（673 个点分 143 个岛，等于把画布拿去装边框），673 个知识点一屏全见（zoom 0.605 / bbox 1162x739 / 重叠 0）。工具栏第三行是**核心素养多选**（符合任一项，括号里是本屏有多少个知识点练到它，0 个的按钮直接禁用）：勾上只留练到它的知识点与方法，册 / 章 / 节 / 思想这些结构节点不动——素养分两层：**认定层**是这一点挂的课标条目（条目按内容领域与原文动词规则初判，再逐条复核过一遍——125 条被引条目里改了 17 条，每条改动都写了理由；666/673 个点有），**派生层**是「方法 → 思想 → 素养」两跳推出来的；筛选与计数用认定层优先、没有才退回派生层，两条链混算会让「勾这个素养出来 30 个点」说不清是哪来的。chip 旁边写着「按方法推断」，详情第 5 段把两层分两行写清来路，都不冒充课标认定。骨架图同时画两种边——**先修**（实线，能不能学）与**教材顺序**（虚线，书上排在哪），两者不是一回事。方法视图也画两种边——**这个方法能解这些点**（实线）与**讲这个点时要用到它**（虚线），两条线分在弧的两侧，否则完全重合；悬停一个节点就显示它有几条关联、依据来自人工判定还是推断，图上线的粗细也按依据分三档。思想视图一岛一条思想，岛里是归到它的方法；**思想详情按册聚合**（「它在几册里反复出现」+ 按册分组列方法，上位思想会递归到它下面的方法族）。**搜索跨视角**：本屏没有就翻全库，命中后自动切视角、挪册与焦点再定位（在知识点视图搜「概念抽象与符号化」会切到思想视图并打开详情）。搜索还吃别名与一句话描述：构建时给每类节点拼一条检索串（不进 UI），输入「将军饮马」能直接找到标题里没这四个字的那条知识点，结果面板一次列 8 条并标出「共 N 个」。检索串里存的是**中文类型名**，所以搜「定理」能列出定理类知识点、搜「竞赛」只出竞赛级方法（英文枚举 theorem / olympiad 搜不到，也不该是唯一入口）。**思想总表**（`#/thoughts`）把 16 条思想排成一张纸：每条有几册、几条方法、几个知识点，按册分布写在同一行；数字都是从 belongs_to / applies_to 现算的，不存派生统计。**知识点整页与图谱右栏是同一份渲染**（`MC.explainPage` 转调 `renderDetail`，不是两套段落）。讲解按**七段固定顺序**（这句话是什么 / 课标怎么要求 / 先得会学完接着 / 思想和做法 / 素养 / 课本在哪 / 题），缺数据写该段空态而不是跳过；第 4 段先列这个点的方法能到达的思想（方法族，点开进那一层），第 5 段先写「课标条目对到哪些素养」（带 CP 编号与一句免责：初判、不是教研逐条认定），再写「练到哪些素养」（由「方法 → 思想 → 素养」两跳推出来）。**依据总览**（`#/evidence`）把「哪来的」摊成一页：关系边按依据分三档（人工 1386 / 规则推断 4553 / 方法挂点推断 395，图上的线粗细就是这一档）、四类实体各自的覆盖率、四条可以自己照抄的复核命令。**页面里没有一个手写的统计数字**，全部从图与目录现算——这一页的全部意义就是不悄悄过期。**目录页写进度**：每节「做过 n/m · 独立对 k（带提示 h）」、每册一条细进度条。带过提示做对的不算独立做对，和「哪里不稳」一个口径（只看每道题最后一次作答）。**沿着教材走**：节页底部有「接着走」（上一节 / 下一节，同册跨章接续，下一节有题就提示能直接练），练习结束页也给「下一节」卡——学完一节不用退回目录找路。**今日页有一块「该抽回来看看」**：做对过的题按 3 天 / 7 天 / 21 天三档抽回来（对过的次数越多隔得越久），最多 5 道，点一下就用错题重练的混合队列一次做完，跨节也行。规则固定三档、可一句话复核，不成算法式的间隔重复——现在的作答量还撑不起那种参数。**哪里不稳**（`#/weak`）把作答记录按知识点汇总：错着没改的排前面，改过来的留一列「过几天还记不记得」，每组给「看三列 / 练这一节 / 回到图上」三个出口；只算真做过的题（题→点映射 2576 / 2708 道，95.1%），没做过的点不列出、也不顺着先修链推断它「应该会」——没测就是没测。数据与界面分离：目录 19 KB / 图谱 982 KB / 题→点映射 76 KB / 每节切片按需加载；无框架、无构建、不联网、不起服务器 |
| 练习判题 | **2642** 题进池（66 题无答案不入池），判题三态实测通过 | **自动判 427 题（16.2%）**：四章都有结构化答案（`ch10.spec.jsonl` 52 / `ch11.spec.jsonl` 68 / `ch12.spec.jsonl` 283 / `ch13.spec.jsonl` 24），都是 `tools/answer_spec_build.py` 从答案文本里抽出来的形状（单值 / 多值集合 / 取值范围 / 判断结论），`judge_spec_audit.js` 实测「标准答案判 correct 427/427、错值判 wrong 232 条零漏」。剩余 2215 题答案是人读的过程文本，判题器一律落 manual——宁可不判不假判。**选择题点选**：227 道选择题里 200 道的四个选项已从题干抽出（`ch<章>.options.jsonl`），渲染成可点卡片、不再出文本框；交卷走字母路径，答案里抽不出唯一字母就落 `manual`。剩下 27 道选项原文不在文字层，不排进队列，页脚说明原因。**判错后的四行卡**（卡在哪 / 先得会 / 做法 / 回到图上）靠题→知识点的点级映射，四章 2576 题有（ch10 427 / ch11 607 / ch12 1176 / ch13 366）；其余题改成给节级兜底——「这一节先得会」与「这一节的常见做法」，每行标明「整节共通，不是这题专考」，绝不写「没有更早的点」这种只有在知道考点时才成立的话（两条自动映射路都试过：全库别名吻合率 55.1%、节内唯一术语法 precision 68.0%/覆盖 20.6%，根因是题里的术语是「用到了」不是「考了」） |

## 目录

```
content/
  registry/schema.json        17 类实体的字段契约（必填/可选/legacy/枚举/别名/ID 规则/接口）
  registry/competencies.json  六大核心素养（CP-01..CP-06）
  thoughts.jsonl              思维层 16 条：6 条上位思想 + 10 条方法族（desc / boundaries / parent / competencies）
  relations/edges.jsonl       统一关系表 6334 条边（权威，前端与校验都读它）
  curriculum/standards.jsonl  课标条目 314 条（义务教育 4 个学段 + 高中；数学 cms-*）
  curriculum/kp_standards.json 节 → 课标条目的映射（143 节 981 条链接，2 节显式标「课标无对应」）
  framework/
    volumes/<册>.json         章 / 单元 / 节 目录（含教材页码）
    knowledge_points/<册>.json 每节的知识点（provenance 标来源与置信）
    knowledge_points/<册>.detail.jsonl 知识点富化侧车（定义/条件/边界/目标/别名）
    prerequisites.json        人工节级先修边 159 条（from=先修 → to=后继，每条带 why）
    kp_prerequisites.json     人工知识点级先修边 183 条（第 12 章为主，每条带 why）
  skills/<册>/<章>.jsonl      解题方法 667 条（六册齐：701 142 / 702 109 / 801 125 / 802 92 / 901 135 / 902 64；steps 带依据，供 L3 提示与错因诊断）
  misconceptions/<册>/<章>.jsonl 错因实例（8 类 category，带补救建议）
  questions/<册>/ch<章>.jsonl 题目权威层（一行一题）
  questions/<册>/ch<章>.answer.jsonl  教材习题的答案（8 键，由 AI 逐题推导，未经教师核对）
  questions/<册>/ch12.spec.jsonl      结构化答案侧车（判题器消费，303 题）
  questions/<册>/ch<章>.options.jsonl  选择题选项侧挂（200 parsed / 27 missing，题干原文不动）
  rubric/<册>/*.jsonl         评分点（一行一点）
assets/vendor/katex/          本地 KaTeX（不依赖 CDN）
tools/
  framework_extract/          从教材 PDF 抽目录（parse_toc.py / mkvolumes.py）
  framework_gen.py            框架 → build/framework/{nodes,edges}.jsonl + report.txt（含环检测）
  questions_ingest_ch12.py    ch12_index.json → content/questions/801/ch12.jsonl
  legacy_html_import.py       旧工程 chXX_generated/answers.html → 第 10/11/13 章 1466 题（六档 + 综合测试，选项拼进题干）
  questions_check.py          题库对框架的引用完整性校验
  questions_kp_map.py         题 → 知识点候选映射（整章候选 + 判别词遮蔽匹配，出 build/questions/kp_map.jsonl）
  kp_terms.json               第 12 章判别词表（169 条术语，覆盖 93/99 个知识点）
  questions_kp_writeback.py   只把 auto 档写成侧挂 ch<章>.kp.jsonl（标 ai_draft）
  questions_kp_check.py       映射校验：题号/编号/primary 唯一/置信字段 + 切片落盘数
  rubric_seed.py / rubric_check.py   评分点播种与合计校验
  katex_selftest.js           全部数学式真渲染体检
  ch12_math_audit.py          $$ / 混中文 / 裸 LaTeX 三项体检（可 --apply 修）
  schema_check.py             按 registry 校验字段/枚举/引用/先修 DAG，输出 gaps.csv（题库只认 ch<章>.jsonl）
answer_spec_build.py        从答案文本机械抽取结构化答案（保守，拿不准标 unknown）
answer_spec_merge.py        合并「机械 draft + 逐题精修」→ ch12.spec.jsonl，interval 边界从 note 补齐
answer_spec_prune.js        自判剪枝：判题器自己构造标准答案判不 correct 的 spec 降级 unknown
judge_spec_test.js          answer_spec 判题回归 39 条（铁律用例）
judge_spec_audit.js         spec 与判题器一致性体检（覆盖率 / 判对 / 错值判错）
  framework_status.py         → docs/framework-status.md（规模、颗粒度、先修边来源）
  textbook_exercise_extract.py 教材 PDF → 习题块（状态机：组/块标签/严格题号/页眉陷阱）
  textbook_span_rebuild.py   第 10 章分式重建：用 span 的 y 重叠判据把拆开的分子分母配回来
  textbook_map_sec.py        习题组 → 节（12 章 5 组跨 12 节，靠判别词，定不下来落章末）
  textbook_ingest.py         教材题并入 ch<章>.jsonl（按 id 幂等，--refresh 覆盖，缺图但可答照入）
  edges_build.py              八处权威源 → content/relations/edges.jsonl（6334 条，12 种关系；方法→方法前置读 content/framework/skill_prerequisites.json 的 385 条草稿，规则反推那条路已废除、原因写在脚本注释里；含思想→素养的 supports）
  analogies_doc.py            横向依赖（可以类比 / 容易混淆）渲染成 docs/analogies-table.md，供人工审
  standards_import.py         旧仓课标 JSON → content/curriculum/standards.jsonl（314 条，review_status=stub）
  question_options_extract.py 题干抽 A./B./C./D. 四段 → ch<章>.options.jsonl（--check 只比对不写，供闸门查 drift）
  question_purpose.py         题目用途五分类（只标有证据的 490 题，其余留空不猜）
  relations_check.py          关系表 10 条不变量闸门（端点/自环/双向一致/无环/sequence 覆盖…）
  skill_prereq_check.py       方法先后起草的校验闸门（uid 真实/同册/自环/重复/成环/按册覆盖率）
  prereq_dist.py              prerequisite_of 的三个口径（端点类型 / 空间位置 / 来源规则）
  skill_enrich.py             给 801 的 125 条方法补 desc / boundaries / thought_refs（边界声明偏模板，待用 802 的标准回填）
  skills_auto_check.py        方法库闸门：字段必填、uid 规则、每点是否有 core 方法覆盖
  web_detail_probe.js         详情面板探针：点开思想/方法/知识点，断言新增块真的出现
 sc_probe.js                 图谱体量探针：量每个视角的节点数/边数/画布尺寸/缩放/标签实际字号（判断看得清不清）
  check_all.sh               一次跑完上面全部闸门（加 --web 连无头浏览器冒烟一起跑）
  math_text_check.js         公式文本检查：全库扫 $ 配对/裸命令/控制字符，对 tools/math_baseline.json 做棘轮（--staged 只看暂存，--write-baseline 重冻）
  fix_math_escapes.js        修被 JSON 转义吃掉的反斜杠（$\frac → $<FF>rac），默认 dry-run，--apply 才写盘
  ux_asserts.js              视觉断言 38 个判据代号（小字占比/≤13px 整体占比/正文最小 14px/英文枚举/公式跨行/横向溢出/段标题倒挂/浮起块/下拉截断/死链/图例压画布/首屏主按钮/三列页塌列/统计合计必须相等/单选控件只有一个实心选中/不许有死胡同/预览态必须列出选项/不许印 [object Object]/链接不许带 undefined/手机画布超出视口/连线默认不亮点开才亮/局部十字图四方向齐全且名字 >=12.5px + 资源加载 KaTeX/cytoscape + 交互 FLOW：判完后主按钮唯一且在结果卡之后、错因卡 ≤520px 且带折叠），26 次路由（430 宽 18 + 1280 宽 8；archive/weak/retry 先注入 8 条记录 SEED_RICH；practice-look 专测单题预览），退出码=不达标条数；--shots <dir> 顺手出全页图；--only <route> 单测一屏
  enum_scan.py               从 content/ 抽「作为字段值出现的短英文串」→ tools/enum_values.json（169 个），供 ux_asserts 扫界面漏词；数据变了重跑
  enum_values.json           上面那份词表（生成物，入库，方便看这版扫了哪些词）
  team_roster_prune.py       清理旧 teammate 与修它们的模型路由（DSH 关掉后才生效）：默认摘 3 个 agency-* 老成员；--list 打印每个成员实际用的 provider/model/effort；--set-model provider/model/effort --all-kept 把成员改回跟主 agent 一样。先写 .bak，改前会拒绝在 DSH 运行时动手
check_commit.py            提交钩子：前端语法/导图契约/判题回归/方法先后/关系表闸门/公式文本；暂存里动了前端就自动加跑 63 条冒烟，动了样式再先跑视觉断言（--web 强制，--no-web 显式跳过）
runtime/
  shared/judge.js             判题器（唯一一份）：normalize / 有理数 / 多重集 / 宁可 manual 不假判 correct
  web/index.html              壳：只放 header/main/nav/toast 与 script 引用
  web/app.css                 纸白主题，窄屏优先（--maxw 760px）
  web/js/core.js              工具层（esc / mathHtml 走 KaTeX / mathCheck 公式体检 / mathFails 渲染失败清单 / clip / toast / BAND_CN）
  web/js/store.js             作答记录（localStorage 'mc.records.v1'，append-only）
  web/js/data.js              数据切片加载（file:// 下用 <script> 注入 window.MC.put）
  web/js/router.js            hash 路由：#/today #/toc #/sec #/kp #/map #/rel #/thoughts #/weak #/practice #/retry #/archive
  web/js/boot.js              顶栏 / 底部 tab / 全局点击委托
  web/js/views/               today toc section kp map rel thoughts weak practice retry archive（一屏一文件）
  web/data/                   构建产物（git 忽略）：catalog.js graph.js qkp.js sec/<册>-<节>[.items|.ex].js
assets/vendor/                katex（0.16.11）+ cytoscape/dagre（图谱视图）
build/                        全部是派生产物（git 忽略），重跑即恢复
```

## 怎么跑

```bash
python tools/framework_gen.py                    # 框架派生：955 节点 / 1597 边 / 先修环 0
python tools/questions_check.py                  # 题库校验：2708 题 / 0 错误
python tools/legacy_html_import.py --dry-run     # 旧工程 HTML 导入预演（不写盘）
python tools/rubric_check.py                     # 评分点：546 题 / 3179 点 / 合计 100
node   tools/katex_selftest.js                   # 数学式渲染与混中文体检
node   tools/math_text_check.js                  # 公式文本全库扫描（默认按基线只报新增；--write-baseline 重冻基线）
python tools/ch12_math_audit.py                  # LaTeX 三项体检（加 --apply 才改文件）
python tools/schema_check.py                     # 字段契约：错误 0；--strict 看 v3 缺口；gaps.csv 在 build/report/schema/
python tools/framework_status.py                 # 刷新 docs/framework-status.md（依赖 framework_gen）

node   tools/judge_prep.js                       # 预判每题可判性 → build/questions/judge_prep.json
python tools/answer_spec_build.py --write        # 机械抽结构化答案 → ch12.spec.draft.jsonl
python tools/answer_spec_merge.py                # draft + 逐题精修 → ch12.spec.jsonl
node   tools/answer_spec_prune.js --write        # 自判剪枝：判不了的降级 unknown
node   tools/judge_spec_test.js                  # 判题回归 39 条
node   tools/judge_spec_audit.js                 # spec 与判题器一致性体检
python tools/textbook_exercise_extract.py        # 教材 PDF → out/textbook/draft.jsonl（含 text_quality 分级）
python tools/textbook_ingest.py                  # 教材题并入 ch<章>.jsonl（按 id 幂等，--dry-run 先看统计）
python tools/question_options_extract.py          # 选择题选项侧挂（--check 只比对，drift 报错）
python tools/build_web.py                        # 生成前端数据切片 → runtime/web/data/（目录/图谱/每节）
node   tools/ux_asserts.js                       # 视觉断言 38 个判据代号 × 29 次路由（430 宽 19 + 1280 宽 10），退出码=不达标条数
node   tools/web_smoke.js                        # 无头 Chrome 跑 63 项（路由 + 交互断言，含选择题点选、四行卡与图谱落点、全景档与章图、窄屏上拉层、存档写满提示、三列页、方法页例题、错题重练跨节队列、同步桥幂等、搜索别名与按类型搜索、思想总表、素养筛选、按知识点看欠账、到期复习抽取、依据总览），截图到 out/shots/web-*.png
node   tools/sc_probe.js                         # 量图谱各视角的体量（节点/边/画布/字号），改布局前后对比用
W=430 node tools/ux_asserts.js --shots out/shots/x # 顺手出全页图（2x，落盘后拿 read_image 亲看）

bash   tools/check_all.sh                        # 一次跑完上面全部闸门（加 --web 连冒烟一起跑）
```

教材习题那条管线的原理、分级与「第 11 章为什么不可救」写在 [docs/textbook-extraction.md](docs/textbook-extraction.md)。

错题怎么攒、为什么一次只排 6 道、为什么不再按难度挑题，写在 [docs/retry-queue.md](docs/retry-queue.md)。

作答记录怎么存、怎么带走、怎么合并回来写在 [docs/records-schema.md](docs/records-schema.md)（M4a 同步桥：只做 JSONL 文件交换，幂等导入，不做账号与服务端）。

外部参考：一份高中数学知识图谱产品的逆向分析（五层信息架构、虚实两种边、方法节点的边界声明、五步核对闭环，含 19 张关键帧截图与可借/不可借清单）在 [docs/analysis-2026-10-teacher-kg.md](docs/analysis-2026-10-teacher-kg.md)；其 §11 是手机版迭代复盘（思想升格成第一等公民、课标要求下沉到知识点、题目按用途五分），另附 9 张截图。

图谱现在怎么画，以 [docs/STATE.md](docs/STATE.md) §11 为准。从知识点或方法点进一道题先看这一题，返回回到刚才的讲解，也写在 §11。平面几何目前有三张重画的图（等腰三角形、三线合一、将军饮马），标注在 `content/framework/figures.json`，不贴讲义页。为什么曾经「乱、看不到整体」写在 [docs/plan/2026-10-28-ux-overview-redesign.md](docs/plan/2026-10-28-ux-overview-redesign.md)；其中 A4 容器树与 A7 跨章聚合已否决。全景当首页已否决，否决记录在 [docs/plan/2026-10-28-ux-mindmap.md](docs/plan/2026-10-28-ux-mindmap.md)。[docs/plan/2026-10-28-competitor-parity.md](docs/plan/2026-10-28-competitor-parity.md) 只保留数据和边，不再当现行画面。

打开方式：在仓库根目录执行 `python -m http.server 8080`，浏览器打开 `http://127.0.0.1:8080/runtime/web/`。`file://` 下页面会拒绝加载。改了 `content/` 之后先跑 `python tools/build_web.py` 再刷新。作答记录存在浏览器 localStorage，点「档案 → 导出」拿到 JSONL，一行一条作答事件。

## 诚实分级（别把草稿当定稿）

- **已核**：801 的章节目录与教材 2024 版逐节对过；先修图无环；题库引用零错；评分点合计零错；数学式零渲染错误。
- **未核**：673 条知识点都有定义（全部 `draft`，六册 85 节已富化，title_only 归零），但定义由 AI 按教材正文/目录起草，未经教研复核；五册（701/702/802/901/902）版次仍是旧版，2024 新版到手后重核。八上四章的 125 条方法与 127 条错因同为 `ai_draft`，八下的 92 条、七上的 142 条方法也都是 `ai_draft`（按教材 objectives 起草），全库 667 条方法没有一条过教研；其中 **90 条培优 / 竞赛层方法**（截长补短、手拉手模型、半角模型、一线三等角、双重根号化简、裂项相消、角平分线分对边成比例等）教材里根本没有，是我按培优班与竞赛常见模型整理的，**最需要教研把关**；六册都有方法了，但六册的方法全部是 AI 按教材 objectives 起草，没有一条过教研。
- **自动判 427 / 2642 题（16.2%），不是 100%**：四章的 `ch<章>.spec.jsonl` 里共 427 题有判题器能消费的结构化答案（exact_value 171 / value_set 102 / judgement 145 / interval 9），审计两条硬指标都过——标准答案必须判 correct（427/427）、构造的错值必须判 wrong（232 条，零漏）。这是设计取舍的边界：解答题与证明题的答案文本里混着推导过程，抽出来的「值」会把孩子写对的判错，所以一律落 `manual`（孩子自评或家长看）。三条铁律都有回归用例（`tools/judge_spec_test.js` 54 条）：只有唯一值才敢判 wrong、多值少写多写都是 manual、区间只写半边不算错；关系式（`x=2` / `x≠3` / `x≠±1`）走独立的 L3 路径，形状不同就交回 `manual`。
- **题库覆盖八上四章、27 节全部有题，五册仍是零**：2708 题 = 第 12 章 1242 + 第 10 章 482 + 第 11 章 614 + 第 13 章 370。八上 27 个教材节（10.1–10.5 / 11.1–11.7 / 12.1–12.12 / 13.1–13.3）每节都有题，另有 4 份章末/综合卷 513 题。**剩下 116 个教材节零题**：另外五册 701/702/802/901/902 共 29+32+19+25+11 节，一题都没有。
- **题库有两个来源，质量不同**：第 12 章来自旧工程的结构化 index（1242 题，判题用得上）；第 10/11/13 章是从旧工程渲染出来的 HTML 反解析回来的（1466 题，答案是人读的文本——其中 144 题已能按结构化答案判，其余仍是人读文本、也没有评分点）。教材 PDF 直接抽取只拿到 158 题——169 页里第 11 章的根号是矢量图形、文字层里没有被开方数，第 10 章的乘除分式被拆成多行配对不上。

- **课标是公开转写，作用是「可回指」不是「有权威」**：314 条课标条目（义务教育四学段 + 高中，数学 `cms-*`）从旧仓的公开转写 JSON 导入，`review_status=stub`，**没有与教育部 PDF 逐页核对**。它的作用是让孩子一眼看到「这条知识点凭什么站得住」并能顺着条目号回查，不是宣称我们拿到了标准原文。映射按**节**做（143 节 981 条链接，六册全覆盖到 666/673 个知识点），因为课标条目本身就按内容领域概括表述，逐点硬配只会造假精度；第 13.1 节（必然/不可能/随机事件）在 2022 版第四学段里**确实没有对应条目**，已在数据里显式标 `unmapped_reason`，前端显示「这一节没有对应条目」而不是留空白；另一节是 701 的 3.11（用计算机绘图），属信息技术应用，课标没有数学内容要求。这两节的 7 个知识点因此没有 assessed_by 边。
- **题目用途只标了 490 题（18.1%），其余留空不猜**：五类 purpose（方法对照 2 / 概念辨析 9 / 教材原题 152 / 方法应用 209 / 情境应用 118）每一条都有 `why` 说明依据——要么是教材原题，要么题干明说要多解，要么能沿「题→知识点→方法」回指到具体方法。**剩下 2218 题的用途就是空的，前端不显示徽章**，比猜一个分类更值得信；覆盖要涨得先把题→知识点的高置信映射做上去，那是同一件事的上游。
- **题 → 知识点标了 2576 题（95.1%），全部 ai_draft**：2708 题里 2576 题有 KP 级映射（ch10 427 / ch11 607 / ch12 1176 / ch13 366），指向 139/151 个知识点，其中 2355 条真的进了前端切片。两条路线并存：第 12 章的 243 条来自词表法（分层抽 40 条人工判过：严格 25/29 = 86.2%、宽松 29/29）；其余 2333 条来自逐节任务包 + AI 辅助人工核——`tools/questions_kp_task_split.py` 按节拆包（每包只给本节候选点），判不准整题留空，再用 `out/kp_task_leftover.py` 把留空的题放宽到全章候选点重标一次，`out/kp_lint.py` 自检 + `out/kp_merge.py` 幂等合并，`tools/questions_kp_check.py` 在闸门里再核一遍（映射错误 0 处）。**留空的 132 题都是章内没有对应点的超纲题**：中位线、斜边上的中线、30° 角所对边、海伦/塞瓦/梅涅劳斯、角平分线定理、费马点、坐标斜率求最值、黄金分割、黄金比例面积法，以及 7 道答案本身空白的 err 题——宁可留空也不硬挂一个邻近的点。**抽检 48 题（每章 12 题、随机）：严格吻合 37/48 = 77.1%**，方向对但主挂偏的 4 题，明显错的 7 题（已按抽检结论重修，basis 里标 reviewed=spot-check-48）。两种错误模式：被表面名词带走（对称式求值挂成约分、分式最值挂成乘法、无理方程挂成平方根定义、比较大小挂成算术平方根）、同节相邻点错位（求角 BHC 挂成「三条高的位置」、抛硬币观念挂到 13.3 的概率公式）。**够当提示，不拿它算掌握度**——约 1/7 的题会指到相邻的错误点上，四行卡也只是「先得会 / 做法」的方向。做法、天花板与复现命令见 [docs/question-kp-mapping.md](docs/question-kp-mapping.md)。
- **素养分两层，两层都还不硬**：**认定层**是「这一点的课标条目对到哪些素养」——先按条目的内容领域（图形与几何→直观想象、数与代数→数学运算、统计与概率→数据分析、综合与实践→建模）与原文动词规则初判，再把 125 条被引条目逐条看一遍，改了 17 条：补漏的 16 条（命题定义与反例反证法补逻辑推理、sinA 与位似与实数概念补抽象、函数图象与数轴与频数直方图补直观想象、树状图补有序枚举）与改过宽的 1 条（综合与实践总纲原文里的性质、图形、数据分析都是内容名词，被规则当成素养了）。666/673 个知识点有，依据是条目号（可回指课标原句），每条改动都写在 `competency_note` 里、规则原值留在 `competencies_rule` 里可 diff，但**判词仍是我写的，不是教研认定**（`competency_basis = rule:domain+verb+ai_review`）；**派生层**是「方法 → 思想 → 素养」两跳推出来的，覆盖更宽、也更不准（CP-03 覆盖 350 点）。筛选与计数用认定层优先、没有才退回派生层，两条链混算会让「勾这个素养出来 30 个点」说不清是哪来的。抽检过的四条：乘法公式→逻辑推理+运算、方差→运算+数据、角→抽象+运算+直观、边角边基本事实→只直观（原文只有「探索并证明」）。要更硬只能请教研对那 125 条逐条签字。
- **方法之间的先后六册都有草稿，但只覆盖一半的方法**：667 条方法里 **395 条**有方向的先修边（16 条按教材挂点位置推断 + **379 条逐条起草**，六册共 385 条草稿，见 [docs/skill-prerequisites.md](docs/skill-prerequisites.md)），按 to 去重后有 **337/667 = 50.5%** 的方法知道「先练什么」（草稿 385 条里有 54 条指向同一个方法，说明同一条做法有两个前置），按册 801 73% / 701 38% / 702 50% / 802 48% / 901 41% / 902 61%。曾经用「点级先修一跳反推」产出 821 条，抽检 40 条只有 20 条站得住（并列或互逆被当成先后占多数：求根公式→十字相乘、画解集↔读解集、13.3 的概率公式→13.1 的事件描述方向反）；收紧到只认人工点级边后重抽只有 11/40，更差——因为点级先修回答的是「能不能学这个点」，方法级问的是「先练哪一条做法」，一个点上挂着好几条做法，点与点的先后推不出做法与做法的先后。整段规则已废除。现行 385 条草稿全是 support / inferred、review_status=ai_draft；第二批五册由子代理按 801 成例起草，我逐条读 why 删了 9 条弱边（同一做法换名字、方向反、只写「常与…配合使用」），剩下 330 条没有入边的方法多为各自主题的入口做法。界面上方法详情的「先练哪个」块里写着「按要做这一步得先会什么逐条起草，还没有教研复核，当线索用」。
- **缺**（机器可查，见 `build/report/schema/gaps.csv`）：`answer_spec` / `difficulty` 四轴 / `validation` 三轴 0 条；评分点 `basis` 0 条；resource / asset 两类实体一行都没有（curriculum_standard 已补 314 条，见下）。

## 许可

本仓自有内容为 AI 起草草稿；外部题源一律 cite-only（不进仓、不进发布包）。第 12 章题库中 4–5★ 可能含网搜真题成分（336 题），故 `visibility=stem_public`、`redistributable=false`：将来公开只放题干。