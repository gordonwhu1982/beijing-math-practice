# 03 问题盘点（事实，带出处）

口径：每条只写「现象 / 出处 / 影响 / 归属轮次」。**没有出处的猜测不写在这份文件里**，写进 `reviews/` 由评审提。

## A. 说假话（数据与文案对不上）

| ID | 现象 | 出处 | 影响 | 轮次 |
|---|---|---|---|---|
| FD-01 | 练习用的还是 6 道示意题 `QUESTIONS`（全是 12.1 三角形），没走真切片 | app.js 头部；01_BASELINE_FREEZE §4 | 换一节练，题目不变 | R4 |
| FD-02 | 结果页标题写死「12.1 三角形」，底栏主按钮写死「回到今天」 | round3 05_OPTIMIZATION_PLAN ③ | 练第 11 章也显示 12.1 | R4 |
| FD-03 | 回顾只过滤 `retryIds`（示意题）；每行写死「· 12.1 ·」；题数写死 2；记录页各章写「还没练过」 | round3 06_NEXT_PLAN ①、16_ACCEPTANCE_GAPS 旅程 10.3-3 | 题库作答不进回顾/记录 | R4 |
| FD-04 | 提示 5 句全是三角形 | round3 05 ② | 做 11.2 也给三角形提示 | R4 |
| FD-05 | `11.2_bas_01` 选项键 ±2，解析写 ∛8=2 | round3 05 ①（原文未改） | 该题不能自动判 | R4 |
| FD-06 | 草稿 key 共用（`today:one` / `drill`），不带题目 id | round3 05 ⑦ | 两题草稿互相覆盖 | R4 |
| FD-07 | 记录页只有「12.1 练过」这类，题库作答不参与 | round3 06 ① | 记录页长期空 | R4 |

## B. 死胡同与口径错

| ID | 现象 | 出处 | 影响 | 轮次 |
|---|---|---|---|---|
| FD-10 | 从图谱进节，`backTarget` 只回课本，回不到图谱原选中 | 16_ACCEPTANCE_GAPS 10.2-2 | 图谱进来回不去 | R4 |
| FD-11 | 测试模式没有「先跳过」 | 16_ACCEPTANCE_GAPS 验收点 6 | 卡住只能交卷 | R4 |
| FD-12 | 平板 73 个题号点不换行，宽 1456，「交卷」被 `main` 的 overflow:hidden 裁掉（横屏 1617–1737、竖屏 1533–1653） | round3 05 ⑥ | 交不了卷 | **R3（最先修）** |
| FD-13 | 节行看不出这节讲什么 | round3 05 ⑤ | 只能靠节号猜 | R4 |
| FD-14 | 搜索搜不到方法名 | round3 06 ⑤ | 找不到方法页 | R4 |
| FD-15 | 从知识点再练，页头写成「只练错的」 | 16_ACCEPTANCE_GAPS 验收点 1 | 口误，实际是整组 | R4 |
| FD-16 | 结果总结把「空着交」并进「错」，不单列 | 16_ACCEPTANCE_GAPS 验收点 5 | 家长看不出是没写还是写错 | R4 |
| FD-17 | 提前交卷确认文案不写已交几题、没做几题 | 16_ACCEPTANCE_GAPS 验收点 3 | 不敢确认 | R4 |
| FD-18 | 全景侧栏知识点超 8 个不提示（12.3/12.8 各 13、12.M 11）；知识点页后置超 8 被截（勾股定理 12 个）；节页方法只画 8 个（12.6 有 13） | round3 09 ②③④ | 以为只有 8 个 | R4 |
| FD-19 | 外节方法写成这一节的（12.6 等边对等角页的「用 SAS 证全等」应写 12.5） | round3 11 | 归属错 | R4 |
| FD-20 | 例题 `pickWalk` 偏爱长证明（80–1800 字加分） | round3 05 ④ | 例题又长又难 | R4 |
| FD-21 | 提示第 2/3 级不按节取定义首句与方法名 | round3 06 ⑧ | 提示泛泛 | R4 |
| FD-22 | 「去这一节」开的是全景而不是节页 | round3 06 ③ | 多一跳 | R4 |
| FD-23 | 全景节名单/方法/档位与课本不同源（12.M 缺、只画前 3 个方法） | round3 06 ④ | 两处对不上 | R4 |

## C. 工程（这一轮新增，之前没人管）

| ID | 现象 | 出处 | 影响 | 轮次 |
|---|---|---|---|---|
| FD-30 | `app.js` 7491 行单文件：17 个视图 + 路由 + 判分 + 草稿 + 写死数据全在一处 | 实测行数 | 改一处要全文搜，冲突率高 | **R3** |
| FD-31 | 靠相对路径跨目录借 `runtime/web/data` 与 `assets/` | index.html + app.js:2174 | 只能挂在仓根起服务；搬到别处即废 | R3 |
| FD-32 | 原型阶段**零自动化验收**：所有结论来自「1180×820 上点过」 | round3 07_DELIVERY | 回归靠肉眼 | **R3** |
| FD-33 | 缓存串手工维护（`?v=215`、`?v=181`） | index.html | 改完看不到效果，误判成 bug | R3 |
| FD-34 | 草稿与产品记录两套存储（`mc-proto-drafts` vs `mc.records.v1`），无映射表 | app.js:568 / runtime/web/js/store.js | 迁移时数据会断 | R3 |

## D. 要一并确认的边界

| ID | 现象 | 出处 | 影响 |
|---|---|---|---|
| FD-40 | 产品 `runtime/web` 已有 63 条冒烟 + 37 判据代号 × 29 路由，但测的是**旧界面**；新界面不能直接复用 | 仓内 tools/ | 新工程要自己一套判据，别照抄旧断言 |
| FD-41 | `docs/STATE.md` 记 687 知识点 / 674 方法 / 16 思想 / 2708 题；原型只用到 12 章与 11 章部分 | 实测 | 覆盖度按数据真值算，不按界面写过什么 |
| FD-42 | 用户给的远端 `https://gordonwhu1982.github.io/beijing-math-practice/`（含 `#old`）是可访问的上游参考 | m23000 原话 | 只做视觉对照，不做实现依赖 |
## E. 闸门 v0.2 实测新增（2026-11-12）

| ID | 现象 | 出处 | 影响 | 轮次 |
|---|---|---|---|---|
| FD-43 | **章末综合 4 个专题在界面上完全不可达**：`catalog.js` 里有 `ch-end-10/11/12/13`（106 / 103 / 182 / 92 题，合计 **483 题**，占八上 2708 题的 **17.8%**，`"mix":true`），但 `graph.js` 里 `ch-end` 出现 **0 次**（145 个 section 全是 `S801-10.1 … S801-12.12 / 12.M / 13.3`）；原型目录只从 graph 取节（`app/app.js:1134` `nodes.filter(kind === 'section')`），所以这 4 个专题既不在课本列表里，也没有任何入口，483 道题谁也做不了 | `runtime/web/data/catalog.js` 的 `"no":"ch-end-10"…"mix":true`；`runtime/web/data/graph.js`（`ch-end` 0 次）；`design/ux-v2/app/app.js:1134` | 复习题与跨节题整块消失，孩子练不到章末综合 | **R4** |
| FD-44 | 地址写错整屏白：`#/nosuchroute` 实测 `bodyChars=0`、`#main` 子节点 0、无任何出口、控制台也不报错（`onHash` 第一行 `if (!viewsHas(name)) return;` 静默返回） | `design/ux-v2/app/app.js:7320`（旧行号）；实测 `design/ux-v2/shots/smoke-v0.2.json` 的 `nosuch` 两条 FAIL | 分享错的链接、手改地址、旧书签都落到空白页 | **R3（已修）** |

### 对评审结论的复核（不照抄）

- **FD-12 不可复现**：`practice-73`（11.2，73 题）与 `practice-99`（12.6，99 题）在 1180×820 与 1024×768 下 `fitW` 分别是 1060 / 904，`ovf=0 off=0 clip=0`，正文里「第 1 / 73 题 … 交卷 … 交这一题 先跳过」齐全。qa-review 报的「1180 下 practice-fit 2382px、交卷在视口外 1202px」在当前 v215 原型上复现不出来 → FD-12 从「R3 最先修」降为「待定，需带截图与进入路径才认」。
- **A12 交卷可达**改成用「`fitW` 与 `innerWidth` 比」量，而不是只看 `rect.right`（1024 下 rect 恰好在屏内但按钮被压成 38px 的坑要单独量宽度）。
| FD-45 | **切片一到就整页重绘**：`ensureSlice` 的 `onload` 直接 `render()`，进 `#/book` 6 秒内 `#main` 被整块换掉 **30 次**（每次 1315 个节点），正在输入的输入框被换走、焦点掉到 `body` | `app/app.js:2163`（旧行号）；探针 `tools/qa/probe-render.mjs` 实测 `repaints: 30 → 2` | 打着字跳走；每次重绘都重算 6.4 万字版面 | **R3（已修）** |
| FD-46 | 断言「有出口」会放行死按钮：`a[href^="#/"]` / `button` 只数个数，不真点，`#start` 这类按钮晚到或禁用时判据照样绿；实测 v0.2 首版就因为切片还没到而点到 `missing` | `tools/qa/smoke.mjs` steps；ux-review 判据坑 | 假的通过 | **R3（已修：steps 轮询 8 秒）** |
| FD-47 | **提示记账串题**：只在第 2 题点开 1 级提示，交卷后结果页给 73 道题里**每一道**都盖「用了提示：到第 1 级」。根因 `record()` 记的是「此刻全局开着的提示级数」（`app/app.js:438` 旧行）而不是这一题自己开过几级；「整组交卷」时 `unanswered(state.queue).forEach(id => record(id,'skip'))`（`app.js:5733`）一次给所有没做的题盖章 | `app/app.js`：新增 `markHintUse()`（写在 `record()` 之前），点提示时记 `state.hintUsed[id]`；`record()` 里那句全局覆盖删掉；`state.hintUsed` 本来就在换组时按 id 清（`app.js:700-704`） | 结果页对家长说假话：没看过提示的题被说成看过 | **R3（已修）**：探针 `tools/qa/probe-hint.mjs --sec 11.2` 实测 73 题里只有第 2 题带「用了提示」，其余 72 题是「跳过了」 |
| FD-48 | 判过之后提示栏说「这一页不给提示。」（否定句当空态用）。真相是已经判过、提示收起来了 | `app/app.js:5405` 的 `hints \|\| '<p class="muted">这一页不给提示。</p>'` | 学生以为自己被拒绝 | **R3（已修）**：`state.revealed` 单独一支，文案「这道已经判过，提示收起来了；解析在题目下面。」；探针 `probe-hint.mjs --judge --demo` 实测 `saysNoHintAfterPeek=false` |

### 对照：ux-review 的 P0①「12.5–12.13 永久不可达」不成立（判据坑）

实测（`tools/qa/probe-map.mjs --w 1024 --h 768`，v0.3 之前）：节名单在 `DIV.col.slim` 里，`overflowY=scroll`、`scrollHeight 862 > clientHeight 303`；把 `col.scrollTop` 设到 559 后，`12.12 勾股定理的逆定理` 的 rect 落在视口内、`elementFromPoint` 命中它自己的 `<b>`。**它是可滚的列表窗，不是死内容**。

那份报告量的应该是 `DIV.col.main-col`（知识栏，`scrollHeight == clientHeight`，`scrollTopMax=0`）——量错了容器，于是「滚不动」被当成「没得滚」。

顺带修的一处（真的难看，但不是不可达）：没选节时方法/思想两栏只有一句「先选一节。」却各占半屏，节名单被压成 329px 小窗。改法：`layer-board` 在 `!sets.sec` 时加 `is-nosec`，`app.css` 让第 1 列 `grid-row: 1 / span 2`（实测该列高度 303 → 616），首屏多露 3 节。

| FD-49 | **今天页挂的还是 6 道手写示意题**：`runtime/web/data/sec/801-12.1.items.js` 里 12.1 有 **81 道真题**（basic 21 / standard 20 / advanced 15 / challenge 13 / competition 12），界面却一直显示 `12.1 三角形 · 练习` 那 6 道写死的 `QUESTIONS`。product-review 的 REQ-1 判为「不成立」，根因是 `app.js` 里四处 `demo` 判定 | 新增顶层常量 `const DEMO12_1 = false;`，四处 demo 判定全部前置 `DEMO12_1 &&`（`todayPick()` / `practicePack()` / `viewChapter()` / `viewSection()`），保留开关以便回退 | 孩子天天练的是示意题，不是真题：题数、难度分布、解析全对不上课本 | **R4（已修）**：`tools/qa/probe-today.mjs` 实测 `开始练 · 81 题`、点进去 `第 1 / 81 题`、首题是真题（木棒截三段） |
| FD-43 | **章末综合 4 个专题在界面上完全不可达**：`runtime/web/data/catalog.js` 里有 `no: ch-end-10/11/12/13`（`mix:true`、`detail:false`），实测题量 **106 / 103 / 182 / 122 = 513 道**；但 `graph.js` 里 `ch-end` 出现 **0 次**，而原型的目录只从 graph 建（`nodes.filter(kind === 'section')`）→ 这 4 个专题没有任何入口 | ① `index.html` 加载 `runtime/web/data/catalog.js`；② `app.js` 新增 `catalogSecs(vol, ch)` / `themeSec(vol, no)` / `themeList(vol, ch)`；③ `currentSection()` 在图谱里找不到时回落到 `themeSec`，于是专题和普通节走同一条页面与同一条开练路径；④ `sectionHeading()` 认 `mix`（写「第 12 章 · 章末综合（复习题与跨节题）」）；⑤ `viewBook` 与 `viewChapter` 的名单末尾各补 `ch-end-*` 行（「182 道 · 跨节综合」）；⑥ `viewSection` 对 mix 不印「知识点 0 个」的空卡，改说「章末综合是跨节凑出来的一组」，并收掉「在图里看这一节」这个走不通的按钮 | 513 道真题谁也做不了（占八上 2708 题的 18.9%） | **已回退（2026-11-12，用户判定多余）**：按上一列那六步确实接通了（`probe-theme.mjs` 实测 182 道 → `第 1 / 182 题`，闸门加过 `theme-end` / `theme-start` 两条路由），但用户看课本页后认为「章节中增加了一个空的章节很多余」，题目该归到哪里另议；于是 `app.js` 删掉 `catalogSecs` / `themeSec` / `themeList` 与 `sectionHeading` 的 mix 分支，`viewBook` / `viewChapter` / `viewSection` 三处恢复原样，闸门那两条路由一并撤掉（26 条 × 2 视口 = 52 次，默认档与 `--strict` 都 0 失败）。**这条记的是「缺陷真实存在、修法被否」**，不是判据失效 |

判据侧补记：`catalogSecs` 第一版在 `ch == null` 时只返回第一章的 sections，`themeSec('801','ch-end-12')` 于是永远返回 null —— 探针直接打出一个「找不到这一节」。**跨章查找必须遍历完所有章再返回**，这个错和 R2 那次「章号不补零」是同一种：拼 key 的地方少一层循环，错得静默。

回退补记（2026-11-12）：同一类「少一层循环」的错在回退时又踩了一次 —— 用脚本按行删除 `themeList` 时把 `currentSection()` 自己的 `}` 一起吞了（`SyntaxError: Unexpected end of input`），删 `viewChapter` 的专题块时又吞掉紧邻的 `const testHere = demo && stillOpen(state.drafts["test:chapter"])` 两行（页面报 `ReferenceError: testHere is not defined`， chapter 路由两视口全红）。**按行号做区间删除必须先打印被删区间，再 `node --check`；删完立刻跑闸门，不靠肉眼看。**


| FD-50 | **闸门自己会骗人（两处，都不算产品缺陷）**：① 旅程路由吃上一条路由的残渣 —— `practice-today` 点「开始练」时撞上 `practice` 留下的草稿，弹出「还有一组没做完」，量到的是确认框，页面停在 `#/today`；② 步骤轮询一见 `disabled` 就收工 —— 而今天页的 `#start` 首帧本来就是 disabled 占位（514ms 还是「这一节还不能练」，681ms 才换成「开始练 · 81 题」），等于把 160ms 的加载间隙判成「点不动」 | `tools/qa/smoke.mjs` 的步骤轮询与路由表 | 判据把正常加载判成缺陷、或靠脏存储过关，两种都会让闸门变成装饰 | **R3（已修）**：路由加 `fresh: true` 进页前清 `localStorage`/`sessionStorage`；轮询只有 `ok` 才算过，`missing`/`disabled` 继续等到 8 秒上限。修后 52 次 0 失败 |
## F. 第四轮：一组几道、题号跟不跟题、选择题有没有选项（2026-11-12）

| 编号 | 事实（带出处） | 修法 | 验收 |
|---|---|---|---|
| FD-51 | 今天页「开始练」把整节题一次铺开：12.1 是 81 道，于是一屏 81 个题号点、交卷要问「还有 80 题没交」。REQ-1 要的是「一组」，界面上任何位置都没有「这一组几道」。根因 `practicePack()` 直接把 `gradableFrom()` 的整份结果当队列。 | 新增 `GROUP = 8` 与 `groupPack(ids)`：先滤掉已经判过的，再取前 8 道；今天页与节页都写「开始练 · 这一组 8 题」，并说清整节有多少道、其中几道能自动判。 | `smoke --only group-size`：题号点 8 个、进度分母 8。负例把 GROUP 改 800 → 两条都红（看到「81」）。 |
| FD-52 | 库里的选择题**一道选项都没有**：149 个切片 2642 道里 form=choice 217 道，`opts` 全为 null（100%）。答案键只写在 `ans` 的散文里（如「【答】C（3+3=6 不大于 6）」）。界面此前把这些题按「自己对答案」渲染，但今天页却写「标着「选择」和「填空」的会自动对」——说假话。 | 数据不许编：`rememberRow()` 记 `noOpts` 标记，练习页明说「这道原题是选择题，选项没有录进题库 —— 按「自己对答案」处理」；今天页/节页的文案改成「其中 N 道填得进答案、能自动判」并单列缺选项条数。回填选项是数据侧的活（T4-11，未开工）。 | 今天页实测：「这一节 81 道，其中 7 道填得进答案、能自动判；这次先做 8 道。另有 5 道选择题的原题选项没有录进题库，这几道按「自己对答案」处理。」 |
| FD-53 | 题号不跟题走：`state.index + 1` 配 `state.queue.push(splice(index,1))`——跳过把当前题挪到队尾但下标不动，于是屏上换了一道题、编号还停在「第 1 / 81」。 | `beginQueue()` 记 `state.ord`（id → 开场位次），练习页与结果页都读它；队列怎么轮转都不影响题号。 | `smoke --only group-skip`：跳过一次后题号是 2。负例把读数改回 `state.index + 1` → 红（看到「1」）。 |
| FD-54 | 一组做完是死路：结果页只给「回到今天」，8 道做完想接着做要自己再点一遍开始练。 | 结果页新增「再做一组（还有 N 道）」= `packBySec()` 取该节下一组；N 是还没判过的题数。 | `probe-group.mjs` 实测结果页按钮「把跳过的做完（8 道） / 再做一组（还有 65 道） / 回到今天」。 |

判据侧同时加了一个字段：`smoke.mjs` 的路由现在能写 `seen: [{expr, re, why}]`——点完步骤后在页面里取一个值，与正则不符就红，并且**负例必须先红**（本轮两条都验过）。

## G. 把验收线接进闸门（第五轮，2026-11-12）

qa-review2 报了三条 P0。第一条是闸门自己会崩：`smoke.mjs` 用 `jsonOut.replace(/[^/]+$/,'') ` 取目录，传裸文件名 `--json smoke.json` 时得到空串，`mkdir('')` 抛错 → `smoke crashed` → 退出码 99。改成 `resolve + dirname` 后，裸文件名与绝对路径都能落盘（实测 `--only today` rc=0）。

它还用 12 条拿真界面做的负例证明有 6 条判据会假绿（`#main{opacity:0}`、白字白底、正文 13px、按钮 33px、`transform:scaleX(.3)` 压到 36px、写死文案的数字）。这一轮把假绿补上：

| 编号 | 事实 | 修法 | 验收 |
|---|---|---|---|
| FD-55 | 闸门默认阈值 13px / 32px 比 06_ACCEPTANCE 的 14px / 40px 松，且越界元素被 `continue` 之后字号与命中区一并免检。 | 度量顺序改成「先量字/触点/可见性，越界只免裁切」；阈值分两档：默认 13/32（回归线，保绿），`--strict` 走验收线 14/40。 | `--strict` 首次 56/56 全红，红点只有两类：13px 文本、36px 文字按钮。 |
| FD-56 | 看不见的字不判：`opacity:0` 与白字白底都能过。 | 加 `ghost` 判据：`opacity<0.05` 记一条；自己算前景/背景相对亮度，对比度 <1.6 记一条。 | 负例 `.main .muted{color:#fff}` → 报「有字看不见…对比度 1.06 «第1/8题»」。 |
| FD-57 | 真实的两处 UI 不达标：`--fs-small:13px`（全站小字）、`.link` 文字按钮 36px 高（`.tier-switch .link` 另把 min-height 写回 36px）。 | `--fs-small` 13→14；`.link` 改 `inline-flex + align-items:center + min-height:var(--btn-h)`；补命中区底线 `.tier-switch/.kp-back/.method-links/.pano-strip/.field-zoom/.float-modes`。 | `--strict` 从 56 条红降到 0 条；默认档仍 0 失败。 |
| FD-58 | `#/review?load=1`、`#/record?load=1` 永远停在「正在打开……」——装载器（`app.js:7223`）只认 practice/test，这两个骨架没有落地路径。 | 删掉这两处 `load=1` 骨架（它们本来就不需要异步装载态）。 | 两路由正常渲染；`#/result?load=1` 的死分支留着但记在这里。 |
| FD-59 | 今天页右栏「这一节的 N 道」只是五行无色文字（每行 19px、字色全同），下方留 350px 空白；与左列的知识点卡不是一个档次，用户原话「右边的题目分类没有颜色区分…显得有很大的空间但是没有利用上」。 | 改成**题目账本**：顶部一条按题量比例的档位色带，五行 details 各带档位色左条 + 比例尺 + 题数；颜色全部复用 --mark/--mark-bg 家族（与知识点页题目跳转 chip 同源）。右列改成固定宽 sticky 侧栏（.today-qs），下面补第二张卡「今天先做这 N 道」——真实来自 groupPack()，一行一道。展开某档时列表自己滚（.qband-list max-height:min(46vh,420px)），否则 24 道会把账本拉成 3356px 高。题干预览用 briefStem() 按公式整段切（切在 $…$ 中间会把 KaTeX 拆坏、把 	riangle 露到界面上），截断点收在标点处，避免只剩一个「则…」。 | smoke 两档各 52 次 0 失败；探针实测 P1(1180×820) 右列 380×818 与左列 1005 基本齐平、P2(1024×768) 单列在 900 以下、P3(1366，展开基础档) 账本 753px 不再爆高。图：screenshots/today-p1.png / today-p2.png / today-p3.png / today-narrow.png。 |

## H. 课本页没有色阶、知识点与方法不分类型（第六轮，2026-11-12）

用户原话（m24611）：「这个下面的方法是否可以再按照不同的类型归一下类，显示会更清晰，课本的这个界面现在颜色太单调了，请分析优化让界面更清晰，分类更明确，现在就一个黑白色，颜色单调，不够美观」。

| 编号 | 事实（实测） | 修法 | 验收 |
|---|---|---|---|
| FD-60 | 课本页三层（册 / 章 / 节）用的是同一张白卡、同一档字号：册与章都是 `min-height:48` 的抬起卡片、左边一条 4px 竖条，节行只有一行灰字，整屏只有顶部「只看课本 / 连培优 / 再加竞赛」三个按钮带颜色。知识点列表是一条不分组的流水（12.1 五条、今天页五条），类型只靠行内一个 11px 小标签；方法 chips 平铺一排，课本 / 培优 / 竞赛混在一起。 | ① 六册各一个 `--vh` 色相（七上青、七下蓝、八上紫、八下玫、九上琥珀、九下墨绿），册按钮左边 4px、章行左边 3px、节行底色 `--vh-soft` 都取同一个值，于是同一册从上到下一个颜色，翻册即换色；② 三层形态分开：册是抬起的卡（52px、`--fs-h2`），章是不带阴影的透明抬头（40px、`--fs-h3`），节才是浅色块；③ 节行末尾加类型圆点（`secDots()`，按这一节 kp_type 构成，最多 5 个），一眼看出这节是概念堆还是方法堆；④ 知识点按 `kp_type` 分组（`kpGroupHtml()` + `KPT_ORDER`），组头「概念 3 ——」用类型色，行里不再重复印类型名；⑤ 方法按 `tier` 分成课本方法 / 培优方法 / 竞赛方法三组（`skillGroupHtml()`），组头用档色，chips 上不再重复印档名。 | `smoke.mjs` 默认档与 `--strict` 各 26 路由 × 2 视口 = **52 次，都是 0 失败（rc=0）**；12.1 实测 5 个知识点分三组（概念 3 / 性质 1 / 表示法 1）、方法 3 个全归「课本方法」；12.2 十个知识点跨 5 类，节行印 5 个圆点；801 册展开仍是 4 章 28 节。图：screenshots/book-color.png（1180）、book-narrow.png（1024）、chapter-color.png、section-group.png、today-group.png。 |

顺带修的两处：

- **分组被切一半**：`.kp-rows.scroll` 的 `max-height:52vh` 会把「表示法 1」的组头留在卡内、行切在卡外（截图里只看得到一个小标题）。桌面（≥1000px）改成 `max-height:none; overflow:visible`，让整张卡自己长——切一半比长一点更难读；窄屏保留滚动。
- **两套颜色打架**：类型分组用 `--kpt`、方法分组用 `--mark`，两边是不同的色系（概念蓝 / 定理绿 / 性质紫 vs 课本蓝 / 培优琥珀 / 竞赛紫）。所以 `.skt-group` 必须自己声明 `--kpt`（从档色转写），否则组头会拿到行的 `--mark` 之外的第三套颜色。

判据坑（这轮踩到）：`--line-2` 这类变量在 app.css 里根本不存在，写进新规则会被 `css_token_check` 拦下（`[FAIL] --line-2 未定义 · 用在 app.css:1478`），要用 `var(--line)`。

## I. 分式看不见、章页没底色、三档按钮没有色差（第七轮，2026-11-12）

用户原话（m24790）：「分式显示的太小看不清楚，应该适当的放大分式的数字的显示，题目的字体也可以适当的放大，让题目能看的更清楚，第三张图，没有和上面修改的增加卡片背景颜色，整体界面显得颜色单调，还有个问题，现在很多界面中 只看课本，培优，竞赛 的按钮，我记得之前是有颜色区分，现在颜色都是一样的，按钮的颜色和背景色没有区分了，这几个按钮 在整个工程中应该是统一的控件，在任何地方显示都应该一致」。

| 编号 | 事实（实测，不是观感） | 修法 | 验收 |
|---|---|---|---|
| FD-61a | 选项里的分式实测 16px 字、分数盒只有 18px 高（`#/practice` 第 1 题「6/8 约分后为」四个选项），题干 inline 公式同样 16px。 | 字号改 token 并按位置分档：`--fs-stem:18px`（题干正文）、`--math-stem:1.35em`、`--math-scale:1.15em`（知识点行）、`--math-opt:1.6em`（普通选项）、`.choice.is-solo .katex{font-size:2.15em}`（整条只有一个公式的选项）。 | 实测 `.choice .katex` 16px → 25.6px、`.mfrac` 18px 高 → 30px；纯公式选项 2.15em（分数盒 44px）。 |
| FD-61b | 选项没有 A/B/C/D，孩子只能指着屏说「这个」。 | 选项按钮里补 `<b class="opt-k">A</b>`（`String.fromCharCode(65+index)`），未选灰、选中主题色；`.choice{display:flex;align-items:center}` 让字母与公式一行对齐。 | 图 `screenshots/practice-choice-10-2.png`；判据 `choice-10-2` 断言首选项字母必须是 A。 |
| FD-61c | 章页（`#/chapter`）的节行还是白卡：`.chapter-page .kp-row` 没吃到 `--vh-soft`。 | `.chapter-page .kp-row{background:var(--vh-soft,#f7f9fc);border-left:3px solid var(--vh,var(--c-line))}`，hover 回白。 | 图 `screenshots/chapter-color.png`：第 12 章 13 行全紫底 + 3px 左条。 |
| FD-61d | 三档按钮（只看课本 / 连培优 / 再加竞赛）三颗长得一样：`--mark` 只在 `.is-tier-book/.is-extend/.is-olymp` 上定义，`.tier-switch .link` 从没读过它。 | 三档按钮是全站唯一控件（`kpBandSwitch()`，today/book/chapter/section/map 五处共用）：未选 = 白底 + 档色字 + 档色 40% 边；选中 = 档色底 + 档色边 + 700 字重。 | 探针 `probe_band.mjs` 三档实测 rgb(47,98,230) / rgb(138,78,18) / 选中 rgb(243,232,255)+rgb(91,33,182)+700；判据 `tier-colors` 要求三颗 computed 组合互不相同。 |

### 本轮最值得记住的三个坑

1. **CSS 变量写成裸数字会让整条声明失效**。第一版写 `--math-opt:1.2`，`font-size:var(--math-opt)` 是非法值 → 整条声明被丢掉 → 公式仍按 16px 渲染，而 CSS 文件里看着「明明设了」。所有倍率 token 现在都是带单位的 `em`。
2. **给公式写死 line-height 会把盒子压矮**：`.choice .katex{line-height:1.9}` 让 KaTeX 的 inline-block 框 49px、内容 57px，分数上下被记成「被裁」。行高交回 `normal`，纵向空间由按钮 `min-height:52px` 给。
3. **账本里的题干预览不能跟着正题放大**：`.qband-list .qcell .stem` 放 18px + 1.35em 后，一道纯公式题的 `.math-keep` 宽 332px，1024 宽下越过视口 14px（today 路由 ovf）。预览回 `--fs-small` + 1.15em 后 ovf=0。

### 判据侧：一条假红被拆掉

`clip` 判据原来的条件是 `textOverflow==='ellipsis' || whiteSpace==='nowrap'`——把 `.math-keep`（nowrap，天生比行盒高几像素）当成「内容被裁」，屏幕上一个像素都没少，44 条路由却全假红。改成只有真隐藏（overflow hidden/clip）或省略号才算裁切。

## J. 右栏题干预览的分式还是太小（第八轮，2026-11-12）

用户贴回 10.2 的今天页截图（m25100）：「这个界面右边的分式还是显示太小了」。上一轮只放大了**正题**（选项 1.6em / 纯公式 2.15em），右栏「今天先做这 8 道」的预览仍是 14px × 1.21 = **16.94px**，分子分母只剩 12px。

| 事实（实测） | 数字 |
|---|---|
| 预览行 `.grow .gt` | 14px，公式 16.94px（KaTeX 自带 1.21em） |
| 放大后 | `.gt` 15px（`--fs-body`），公式 **24px**（1.6em），分数盒 29px |
| 账本格子 `.qband-list .qcell .stem` | 1.15em → **1.3em**（18.2px） |
| 行宽 / 最宽公式（1180 宽，10.2） | 303px / 75px，ovf 0、折行 0 |
| 430 宽 | 317px / 75px，ovf 0 |

### 放大立刻暴露的真缺陷：长公式撑破格子

「今天先做这 8 道」里有一条培优题，题干就是一个长公式 `$x+y+z=1, xy+yz+zx=?$`：`briefStem()` 为了保护公式不被拆坏（见它的注释），把整个 `$...$` 原样保留，`.math-keep` 又是 `white-space:nowrap`，于是 24px 下宽 **369px**，界面 1180 / 1024 两档都溢出（闸门原话 `SPAN.math-keep [822..1191] »x+y+z=1,xy+yz+«`）。

修法：新 `fitTightMath()`（`design/ux-v2/app/app.js`，`render()` 末尾调用）—— **只把放不下的那一个公式缩到刚好进格子**，公式本身不切、行高不变，下限 11px 外层（≈公式 17px，仍比原来的 16.94px 大）。理由：预览是缩略图，长式子在小图里本来就该小一点；切在 `$..$` 中间会把 KaTeX 拆坏；缩到读不出数等于没画。

### 判据：预览公式字号进闸门

新增路由 `ledger-10-2`（`design/ux-v2/tools/qa/smoke.mjs`）：进 `#/today` 后用新加的 `picks` 机制把三个下拉框切到 801 / 10 / 10.2（下拉框不能靠 click，必须改 value 再派 change，否则页面不重排），然后断言两条 ——
1. `.glist .grow .gt .katex` 的字号 ≥ 20px（负例：把 `1.6em` 临时改回 `1em` → 报「看到「15」，右栏题干预览里的公式不到 20px…」，双视口 rc=2）；
2. `.glist .gt` 里没有一条被折成两行（`getClientRects()` 的 top 差 ≥ 6 计为折行，要求 0 条）。

溢出判据这次也顺手加了证据：`offscreen` 字符串尾部带上元素文字（`»x+y+z=1,xy+yz+«`），否则只看到 `[822..1191]` 根本不知道是哪条。
