# 教材习题抽取：从 PDF 到可练习题

八上教材（\`（2024版新教材）北京版•数学八年级上册.pdf\`，169 页，教材页 + 9 = PDF 页）里的
习题是现成的真题源——比 AI 硬编的题可信得多。这份文档记录抽取管线怎么工作、哪些题能用、
哪些题为什么不能用。

## 三步管线

\`\`\`
PDF ──① 抽块──► out/textbook/draft.jsonl ──② 重建──► 题干带 LaTeX ──③ 分级──► 只入 ok 的
\`\`\`

### ① 抽块：textbook_exercise_extract.py

教材每章有若干习题组（\`习 题 10 - 1\`），每组分\`巩 固\` / \`提 升\` / \`拓 展\` 三个块，
块内题号 1、2、3… 连续。三条状态机规则（全部是踩坑后加的）：

1. **同名块二次出现 = 新的一组**。否则 13-1 的题会被塞进 review-12。
2. **题号必须严格连续**（\`no == 已收题数 + 1\`），跳号视为块结束。
3. **页眉不是终止符**。教材页眉就是 \`10.3 分式的乘法与除法\` 这种与节号同形的行，
   把它当块终止符会在块中间截断、同块后续题全丢（实测全量 244 → 198 题）。

### ② 重建：textbook_span_rebuild.py（第 10 章）

教材 PDF 里分式是被拆开的：分子一行、分母一行、分数线是矢量图形。所以
\`\`\`( 1 ) 3x + 1
      ────────
         6      \`\`\`
在文字层里就是两行 \`( 1 ) 3x + 1\` 和 \`6\`。按行抽出来只会得到
\`( 1 ) 3x + 1 6\` 这种废文本——这就是 103 道题被标 \`fraction_broken\` 的原因。

重建靠 span 的几何关系：**分子与分母是两条独立 line，y 差 6–15pt、x 区间重叠；
而正文行距 19.2 > 行高 16.2，正文相邻行的 y 区间从不重叠**。用这条判据配对，再按
span 字号（7pt vs 12pt）区分上标，就还原出 \`$\\frac{3x + 1}{6}$\`。

### ③ 分级：frac_quality() 十档

重建会失败，而且失败得很难看。所以每道题都要过质检，只有 \`ok\` 才进题库：

| 分级 | 含义 | 本轮计数 |
|---|---|---|
| \`ok\` | 结构可信 | 158 |
| \`root_lost\` | 第 11 章根号是矢量图形，文字层里整段缺失 | 56 |
| \`frac_leftover\` | 剥掉已还原的 \`$...$\` 后还有 \`1 2x\` 这类残片 | 24 |
| \`bare_math\` | \`$\` 外还留着 \`a + b +\`、\`x - 2 .\` 这种被切碎的式子 | 19 |
| \`paren_unbalanced\` | 圆括号不配平 | 2 |
| \`section_leak\` | 混入下一节正文 | 1 |
| \`figure_bleed\` | 图内顶点字母混进式子（\`白色部分为1 D A 4的圆\` 其实是 1/4） | 1 |

两个判据是反向实验换来的：

- **「连续花括号 \`}{\`」不能当判据**。每个 \`\\frac{分子}{分母}\` 天然含 \`}{\`，
  按它判会把 35/65 全判成可疑。判据必须理解 LaTeX 结构。
- **视觉行分桶反而更糟**。按 4pt 分桶再排序会让 \`( 3 )\` 排到 \`( 1 )\` 前面；
  改成按 y 排序 + 文本层 \`reorder_subtags()\` 重排小题号才对。

### 第 11 章为什么不可救

p49 的 span 字符集里没有任何 >U+2000 的数学符号，\`x=\` 后面直接就是 \`；\`，被开方数
整段缺失；该页 drawings 有 71 个（p14 只有 39 个），类型 \`c/l/qu/re\`——根号是矢量图形。
要救只能走 drawings 级横线（vinculum）推断，属独立任务。本轮 56 道全部标 \`root_lost\` 不入库。

## 入库：textbook_ingest.py

- 追加进 \`content/questions/801/ch<章>.jsonl\`（不另开文件：build_web / questions_check /
  schema_check 的扫描口径都是 \`ch<数字>.jsonl\`，另开会让链上每个工具都改一次过滤条件）。
- 按 id 幂等，\`--refresh\` 用新答案覆盖已有 \`EC-*\` 行。
- 缺图但文字条件够的题照常入库，\`figure.need=required\` 触发页面兜底「原题有图，本机没存」；
  只有答案里出现「无法确定 / 依赖图中 / 必须依赖图」才不入库。
- 教材内容 \`license=B_open_with_terms\`、\`redistributable=false\`：仅本机自用，不再分发。

## 复现

\`\`\`bash
python tools/textbook_exercise_extract.py          # → out/textbook/draft.jsonl（269 题 + 分级）
python tools/textbook_map_sec.py                   # 组 → 节映射自检
python tools/textbook_ingest.py --dry-run          # 看并入/缺图/缺失统计
python tools/textbook_ingest.py                    # 真正写进 ch<章>.jsonl
\`\`\`

答案由子代理逐题推导，写在各章的 \`ch<章>.answer.jsonl\`（8 键：uid/answer/answer_steps/
answer_spec/band/answer_status/note）。答案未经教师核对，\`review_status=ai_draft\`。
