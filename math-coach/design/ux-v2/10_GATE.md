# 10 验收闸门 v0（design/ux-v2/tools/qa/smoke.mjs）

这一份只讲一件事：**这条闸门凭什么可信**。它不是「跑完全绿」的自证，而是四条故意把页面弄坏的负例——每一条都真的红了，才算有牙。

## 1 它怎么跑

```bash
cd D:/个人/知识图谱/math-coach
node design/ux-v2/tools/qa/smoke.mjs                 # 全量，退出码=失败条数
node design/ux-v2/tools/qa/smoke.mjs --only today,map  # 只看两条路由
node design/ux-v2/tools/qa/smoke.mjs --json out.json   # 落报告
```

零依赖：Node 自带 `http` 起静态服务（默认 8791），自起 headless Chrome（CDP 9491），逐路由 `Page.navigate` + `Runtime.evaluate`。19 条路由 × 2 视口（P1 1180×820 / P2 1024×768）＝ 38 次。

为什么必须**从仓根**起服务：原型里的 `../../../assets/vendor/katex/`、`../../../runtime/web/js/fig.js`、`../../../runtime/web/data/*.js` 都是仓根相对路径，从 `app/` 起会 404（09 之前踩过）。

## 2 十二条判据里，这一版真量了哪几条

| 代号 | 量什么 | 怎么写才算红 |
|---|---|---|
| A1 有出口 | `a[href^="#/"]` 数 + 可用 `button` 数 | 两者都 0 |
| A2 无横向溢出 | `documentElement.scrollWidth - clientWidth` | > 1px |
| A2′ 元素不出视口 | 每个可见元素的 `rect.right > innerWidth+1` 或 `rect.left < -1` | > 0 处 |
| A3 文字不被裁 | 只对 `overflow-x/y: hidden|clip` 或 `nowrap/ellipsis` 的容器比 `scrollWidth/scrollHeight` | 有内容超出且被隐藏 |
| A4 字号 | 元素自身文本节点、`font-size < 13px` | > 0 处 |
| A5 可点区域 | 非画布内的 `button/a/[role=button]` 宽或高 < 32px | > 0 处 |
| A9 公式不劈行 | `.katex` 多个 clientRect 的 `top` 极差 ≥ 6px | > 0 处 |
| A11 控制台 | `Runtime.consoleAPICalled` + `Log.entryAdded` 的 error | > 0 条（favicon 除外） |
| A0 真渲染 | `document.body.innerText` 去空白后长度 > 30 | 未达成（15s 内） |

A6/A7/A8/A10/A12 这一版**没有量**：它们要喂数据状态和走交互，属于 R4 的活。别把「38 次全绿」读成「产品达标」。

## 3 四条负例（证明闸门有牙，2026-11-12 实测）

做法：往 `design/ux-v2/app/app.css` 末尾追加一条破坏性规则 → 只跑相关路由 → **还原**（每次跑完都比对文件长度确认还原）。

| # | 追加的规则 | 结果 |
|---|---|---|
| N1 | `.stage{width:2400px}` | `rc=2`，`横向溢出 1220px`、`元素超出视口 49 处：DIV.stage [0..2400] / DIV.app / MAIN.main [168..2400]` |
| N2 | `.card{height:26px;overflow:hidden}` | `rc=2`，`内容被容器裁掉 3 处：SECTION.card task box[482x26 vs 482x206] / points / qs` |
| N3 | `.main p{font-size:12px}` | `rc=2`，`字号小于 13px 3 处` |
| N4 | `.btn{min-height:20px;padding:0 2px}` | `rc=2`，`可点区域小于 32px 1 处：BUTTON.btn 120x20` |

正例对照：还原后同日全量跑 **38 次 / 失败 0 条 / rc=0**，报告 `shots/smoke-v0.json`。

## 4 过程中修掉的两条判据错误（都很容易写成永久假绿）

1. **负例选错了选择器**（前两次尝试全绿，差点得出「闸门没用」的错误结论）：先试 `.wrap{width:3000px}`——页面上根本没有 `.wrap`；再试 `main{width:2400px}`——`.main{flex:1}` 的 `flex-basis:0%` 直接盖掉 `width`，规则生效但尺寸不变。改用 `.main{width:2400px}`（同类同名，特异性更高）仍然不变，最后用 `.stage{width:2400px}` 才真的撑开。教训：**负例必须先自证 CSS 生效**（这次靠截图与 `rect` 数字），否则测的是「注入没生效」。
2. **把可滚动容器当成被裁**：第一版 A3 用 `overflow != visible` 判，于是 `MAIN.main`（`overflow:auto`，本来就该滚）和 `.kp-rows`（`overflow-y:scroll`）被判红 7 条。这是**判据缺陷**不是界面缺陷：能滚到的内容不算被裁。改成只认 `hidden/clip` 与 `nowrap/ellipsis` 后，7 条假红归零。

## 5 一条真缺陷，被闸门当场抓住

`#/map` 在 P2（1024×768）报 `可点区域小于 32px 25 处：BUTTON.seed 22x22`。

- 事实：知识图谱里的节点是 `.seed`，基础尺寸 `width:22px;height:22px`（`app/app.css:833`），焦点网络里放大到 22（`:949`），book 档 22（`:1052`）。
- 判断：它不是普通按钮，是**画布上的点**——73 个节点同屏，统一放大到 40px 会互相压住。所以 A5 对画布内的点不按 32px 判，改为**画布内不判、记入待办**；正解是视觉点保持 22px、用透明外扩或伪元素把**命中区**做到 40px（R4 的活，不是 R3 的地基）。
- 已经落地：A5 判据排除 `.field-world` / `.book-net` 内的元素，注释写明理由。

## 6 这一版还骗人的地方（下一版必须补）

1. **只量了「打开这一屏」，没量「用它」**：点完一轮、交卷、返回、再进来，这些状态变化一个都没量。A6/A7/A12 全靠它。
2. **没有数据状态**：D0 空 / D1 一题 / D2 十题含错 / D3 有跳过 / D4 长内容，只在代码里读过，没有注入。
3. **没有像素基线**：现在只量数字，样式「变丑但没越界」抓不到。
4. **`?v=` 手工串**：`index.html` 里 `app.css?v=181` / `app.js?v=215` 是手写的，改了 CSS 忘改串，浏览器就拿旧文件——闸门会用旧样式判绿。R3 的 T3-3 要把它自动化。
5. **console error 只抓 error 级**：`console.warn` 里 `MC[...] missing` 这类「数据没到」的告警看不见。

## 7 与 06_ACCEPTANCE.md 的关系

06 是**要验什么**（A1–A12 的语义与验收方式），这一份是**现在验到了哪一步**（量了 A0/A1/A2/A2′/A3/A4/A5/A9/A11）。两份对不上时以 06 为准，本文件记录差距。
## 8 v0.2（2026-11-12）：从「打开 12 页」升级到「真的走一段」

路由从 `[名字, hash]` 改成对象，四个新字段：

| 字段 | 作用 | 例子 |
|---|---|---|
| `preload` | 用 `Page.addScriptToEvaluateOnNewDocument` 在页面脚本之前写 `localStorage['mc-proto-drafts']`，这是**唯一**能由 URL 之外指定「当前是哪一节」的办法（`applyPlace` 在启动时读 `place.secId`） | `place('12.6')` → 99 题那一节 |
| `steps` | 点一个选择器，返回 `ok / missing / disabled`；非 ok 直接判红「点不动」 | `['#start']` 进练习 |
| `expect` | 断言点完之后地址还在这一页，报「地址漂移到 …（本该停在 …）」 | `'#/practice'` |
| `minChars` | 正文去空白字数下限，报「正文只有 N 字，少于这条路由该有的 M 字」 | 空白页 0 字立刻红 |

现状：**46 次（23 路由 × 2 视口）全绿，退出码 0**，报告 `shots/smoke-v0.2.json`。

### 这一版抓住并修掉的

- **FD-44 白屏**：新增 `viewNotFound()`（`app/app.js`，一句人话 + 写错的地址 + 三个出口「回到今天 / 去课本 / 去图谱」），并把 `notfound` 同时登记进 `render()` 的 views 表与 `viewsHas()`，`onHash` 的静默 `return` 改成落 `state.route='notfound'` 再渲染。修前 `nosuch` 两视口都 `chars=0 exit=0`；修后 `chars=85 exit=8`。
- 顺手补 `a.btn` 样式（`app/app.css`）：`.btn` 原本只按 `<button>` 调过，`<a>` 当按钮用要 `display:inline-flex` 居中并去下划线。

### 这一版据实降级的

- `practice-182` 基线撤掉：`801-ch-end-12` 有 182 道题，但 graph 里没有这个节（见 03_FINDINGS FD-43），跑出来是「找不到这一节」，把它当基线等于把缺陷写成预期。
- `practice-73` 的 `minChars` 从 150 降到 100：该节第一题题干短，正文 127 字是正常的，判据不能比内容还严。

### 还没量的（照旧骗人）

像素基线、数据状态 D0–D4 注入、`?v=` 自动串、`console.warn` 级告警、图表两处随视口收缩的命中区（FD 记 R4）。
## 9 v0.2b（2026-11-12）：重绘合并 + 步骤等元素 + 探针进仓

- **FD-45 重绘风暴**：`ensureSlice` 每落一片就 `render()`。改法两层：① `sliceReady()` 只在**这一批切片全落地**后 40ms 画一次；② `sliceWatchdog()` 兜底 800ms，防止某片永远不落地把页面冻在旧屏。实测 `#/book` 重绘 **30 → 2**，`#/section`、`#/today`、`#/map` 各 2–3 次。
- **焦点不再被重绘吃掉**：`render()` 前后加 `focusedInMain()` / `restoreFocus()`（记 id 与 `selectionStart`，画完放回去）。实测搜索框里打「三角形」、光标停在 1，连触两次重绘后 `value / focus / caret` 全部保留。
- **steps 改成等到再点**：单个选择器最多轮询 8 秒（40×200ms），期间按 `missing/disabled/ok` 报。改前 `practice-73` / `practice-99` 因「开始练」按钮比正文晚到而假红。
- **探针进仓**：`tools/qa/cdp.mjs`（起服务 / 起无头 Chrome / 连 ws，零依赖，smoke 与探针共用）、`tools/qa/probe-render.mjs`（数重绘次数、测焦点与文字是否被重绘吃掉，`--hash/--preload/--btns/--focus/--wait`）。
- 复跑：`node design/ux-v2/tools/qa/smoke.mjs` → 46 次 0 失败。
## 10 v0.3（2026-11-12）：提示记账与「判过之后说什么」

- 两个新探针进仓（都基于 `tools/qa/cdp.mjs`，零依赖）：
  - `tools/qa/probe-hint.mjs`：默认走「开一组 → 第 2 题点 1 级 → 交卷」数结果页有几道题被盖提示章；`--judge --demo` 走「一路点到第 5 级 → 确认 → 读提示栏」。
  - `tools/qa/probe-map.mjs`：`--w/--h/--hash` 量 `#main`、`.col.slim`、`.col.main-col` 的可滚高度，对指定节名做 `elementFromPoint` 命中测试，并打印祖先链（谁在裁）。
- 抓到并修掉：FD-47（提示记账串题）、FD-48（判过之后说「这一页不给提示。」）。
- 判据坑（写进本节备查）：**「滚不动」要量对容器**。ux-review 的 P0① 量的是 `.col.main-col`（知识栏，本来就没内容），真正装节名单的是 `.col.slim`（`scrollHeight 862 / clientHeight 303`，可滚）。复现方式：设 `scrollTop` 后再 `elementFromPoint`，命中即可达。
- 复跑：`node design/ux-v2/tools/qa/smoke.mjs` → 46 次 0 失败。

## §11 v0.4：章末综合与真题（2026-11-12）

- 路由表加两条：`theme-end`（`#/book` → 点 `[data-book-sec="ch-end-12"]` → 期望停在 `#/section`）与 `theme-start`（再点 `#start` → 期望停在 `#/practice`）。现在 **25 条路由 × 2 视口 = 50 次**。
- 两条路由的意义：FD-43 的 4 个章末综合（513 道）原先在界面上完全没有入口，光看「课本页能打开」是绿的；只有真的点进去、真的开练，才证明这 513 道能被孩子做到。
- 今天页接真题（FD-49）没有加路由：`today` 那条一直在，只是过去内容是 6 道示意题，判据抓不到「是不是真题」。改用探针 `tools/qa/probe-today.mjs` 读 `开始练 · N 题` 与 `第 1 / N 题`，N=81 才算接通。**判断内容真假的判据，长度和截图都不够，得去比具体数字。**
- 建 `catalogSecs` 时的错：`ch == null` 分支只遍历到第一章就 return，导致跨章查找永远失败。这类「少一层循环」的错不报错，只让页面安静地退回「找不到这一节」。

## §12 v0.5：旅程路由要干净起步，步骤要等「能点」（2026-11-12）

新增 practice-today（进入 #/today，点 #start，期望停在 #/practice），现在 **26 条路由 × 2 视口 = 52 次**。加它之后暴露了两个**判据自身的问题**，都不是产品缺陷：

1. **闸门有顺序依赖**。前一条路由 practice 会留下一份草稿（key 是 today），于是 practice-today 点「开始练」时 startQueue()（app/app.js:719）发现有没做完的一组，弹出「还有一组没做完 / 放弃那一组 / 接着做那一组」确认框 —— 量到的是对话框，页面当然停在 #/today。修法：路由加 fresh: true，进页前用 Page.addScriptToEvaluateOnNewDocument 先执行 localStorage.clear(); sessionStorage.clear()（与 preload 一起在量完移除）。**每条旅程路由都应当能独立复现，靠上一条路由的残留才能过的是假绿。**
2. **「出现」不等于「能点」**。加 fresh 之后同一路由又红了：#start=disabled。探针 tools/qa/probe-start.mjs 逐 150ms 采样证明这是**首帧占位** —— 第 514ms 时按钮是「这一节还不能练」+ disabled（切片没到），第 681ms 换成「开始练 · 81 题」且可点。原步骤轮询一见 disabled 就 break 并把 disabled 记成最终结论，等于把「再等 160 毫秒就好」判成「点不动」。修法：只有点下去（ok）才算过，missing / disabled 都继续轮询到 8 秒上限，超时才报最后一次状态。

复跑：node design/ux-v2/tools/qa/smoke.mjs --json design/ux-v2/shots/smoke-v0.4.json → **52 次 0 失败，退出码 0**。

两条教训合起来是一句话：**判据要能独立复现、要等到动作真的发生**。前者防「靠上一条路由的脏存储过关」，后者防「把正常的加载间隙判成缺陷」。

## §13 v0.6：缓存串不再是手写数（2026-11-12）

`index.html` 里原来是 `app.css?v=181`、`app.js?v=215` 这种手写串。改完脚本忘了改串，浏览器继续跑旧脚本 —— 于是「改好了看不见」和「没改好看得见」都会发生，人据此下的判断全是错的。

- 新增 `tools/qa/bust.mjs`：用文件内容的 sha256 前 8 位替换 `?v=`（`--check` 只检查）。只负责本工程的 `app.css` / `app.js`；`runtime/web` 下的数据切片由 `build_web` 管，这里不碰。
- `smoke.mjs` 增加一条**静态判据** `cache-string`：进浏览器之前先比「页面上的串」与「文件内容的哈希」，不一致直接算一条失败。
- 实测：改前两条都过期（页面 181/215，文件 0251c7d4/2a55f404）；`bust.mjs` 修好后再 `--check` 两条都 `[ok]`。负例：把 `app.js?v=` 现改成 `deadbeef` → `--only today` 仍 `rc=1`，报告里只有 `[FAIL] - cache-string :: 缓存串过期：app.js 页面 deadbeef / 文件 2a55f404`。
- 复跑全量：**52 次 0 失败**，报告 `shots/smoke-v0.5.json`。

这类判据的意义：它把「纪律」变成「闸门」。以前只能靠记得，现在忘了就红。

## §14 v0.7：判「一组几道」，判「题号跟不跟题」

`smoke.mjs` 的路由对象多了 `seen` 字段：

```js
{ name: 'group-skip', hash: '#/today', steps: ['#start', '#skip'], expect: '#/practice', fresh: true,
  seen: [{ expr: "…", re: '^2$', why: '跳过之后题号停在原处' }] }
```

以前只能判「地址对不对、正文够不够长、有没有溢出」，判不了「这一屏说的数字对不对」。`seen` 补的是这一层：在页面里取一个值，跟正则比，不符就把 `why` 原样报给读者。

新增两条路由：`group-size`（一组 8 道，题号点 8 个、分母 8）与 `group-skip`（跳过一次后题号是 2）。两条都带负例：

- 把 `GROUP` 从 8 改成 800 → group-size 两视口全红，报「看到「81」，一组不该把整节的题一次铺开」。
- 把题号读数从 `state.ord[id]` 改回 `state.index + 1` → group-skip 两视口全红，报「看到「1」」。

教训：**给新判据配负例，比给新判据写文档重要**。这两条判据在实现前都先跑过负例，才知道正则有没有落空。

## §15 v0.8：验收线接进闸门（14px / 40px / 看不见的字）

三处改动：

1. **阈值两档**。默认档 13px / 32px 是回归线（现状能过），`--strict` 是 06_ACCEPTANCE 的验收线 14px / 40px。默认档保绿不等于达标；达标要看 `--strict`。
2. **越界不再免检**。以前元素一出视口就 `continue`，它自己的字号、命中区、可见性全不查。现在先量，越界只免「裁切」。
3. **新判据 `ghost`**：`opacity<0.05`，或前景/背景相对亮度比 <1.6 的文本，都算「有字看不见」。负例 `.main .muted{color:#fff}` 能红。

另外修了一条闸门自身的崩溃：`--json smoke.json`（裸文件名）曾让 `mkdir('')` 抛错、退出码 99。改成 `resolve + dirname`。

跑法：

```bash
node design/ux-v2/tools/qa/smoke.mjs            # 回归线，应 0 失败
node design/ux-v2/tools/qa/smoke.mjs --strict   # 验收线，也应 0 失败
```

两条都要绿才算「改完」。只跑默认档会把 13px 文字和 36px 按钮放过去。

## §16 v0.9：撤掉章末综合（回退 FD-43）

- 用户看过课本页后判定：章末综合作为独立章节插在课本里，等于**多出一章空的**，题目该归到哪里另议。于是把 FD-43 的接通整套撤回（`catalogSecs` / `themeSec` / `themeList`、`sectionHeading` 的 mix 分支、`viewBook` / `viewChapter` / `viewSection` 三处名单与侧栏文案），闸门同时撤掉 `theme-end` / `theme-start` 两条路由 —— **被否决的修法不能留判据**，否则闸门会逼着下一轮把它改回来。
- 现在 **26 条路由 × 2 视口 = 52 次**：`node design/ux-v2/tools/qa/smoke.mjs` 与 `--strict` 各跑一遍，**都是 0 失败、rc=0**（报告 `shots/smoke-revert.json` / `shots/smoke-revert-strict.json`）。
- 回退过程本身踩了两个坑，记在这里：① 按行区间删除把 `currentSection()` 的收尾 `}` 一起吞了（`SyntaxError: Unexpected end of input`）；② 删 `viewChapter` 的专题块时吞掉紧邻的 `const testHere = …` / `const testLabel = …` 前置两行，chapter 路由两视口都报 `ReferenceError: testHere is not defined`。两次都是闸门抓到的，不是眼睛抓到的 —— 这就是「删代码也要跑一遍」的理由。
- 实测课本页（`screenshots/book-801.png`）：801 展开后仍 4 章、28 个节行、`[data-book-sec^="ch-end-"]` 计数 **0**；第 12 章页（`screenshots/chapter-12.png`）13 行 = 12.1–12.12 + 专题 12.M，与回退前基线一致。

## §17 v0.10：今天页右栏改成「题目账本」

- 改动只在前端（app/app.js 的 viewToday、app/app.css 的 .today-qs / .qbar / .qledger / .qband / .grow / .qband-list、bust.mjs 换的缓存串），**一条路由都没增删**，闸门仍是 **26 条 × 2 视口 = 52 次**，--strict 与默认档都 0 失败（shots/ledger.json / shots/ledger-strict.json）。
- 新写的两处样式踩到既有判据，记下来免得下轮再犯：① 预览行不能用 text-overflow:ellipsis / white-space:nowrap 截断 —— clipN 判据把「有裁切且内容溢出」判红，所以截断只能在 JS 里做（briefStem）；② 展开的题列表用 overflow:auto 自己滚，clipN 对 overflow:auto 豁免，这样 P3 展开不会把整列拉到三千像素。
- 量出来的三档（探针 probe_ledger.mjs）：P1 1180×820 右列 380 宽、高 818；P2 1024×768 右列 340 宽；900 以下 @media (max-width:900px) 落回单列、.today-qs 取消 sticky。
- 出图：screenshots/today-p1.png、today-p2.png、today-p3.png、today-narrow.png。

## §18 v0.11：课本页色阶 + 知识点 / 方法按类型分组

- 改动只在 `design/ux-v2/app/`（app.js 的 `kpGroupHtml` / `secDots` / `skillGroupHtml` / `viewBook` / `viewChapter` / `viewSection` / `viewToday` 标记，app.css 末尾的册色与分组样式，bust.mjs 换缓存串），**一条路由都没增删**，闸门仍是 **26 条 × 2 视口 = 52 次**。
- 两档实测：`node design/ux-v2/tools/qa/smoke.mjs` 与 `--strict` 各 **52 次 0 失败、rc=0**；四类被改动的路由单跑也都是 ovf=0 off=0 clip=0 tiny=0 tap=0 ghost=0 kx=0（today chars=642 / book 2045 / chapter 1008 / section 554）。
- 新增的样式都带兜底值：`var(--vh, var(--c-line))`、`var(--vh-soft, #f7f9fc)`、`var(--kpt, var(--c-line))`，所以缺 `--vh` 的节点（册名以外的元素）不会掉进「无色」或「继承上一级」的坑。
- 这轮判定「分类清楚」的标准写死了三条，下轮照此验收：① 同一册的三层（册条 / 章条 / 节底）必须是同一个色相；② 每一类知识点只印一次类名（组头一次），行里不再重复；③ 方法的分组名与 chips 上的档名不许同时出现两次。

## §19 v0.12：分式与题目字号、章页底色、三档按钮档色

- 改动仍在 `design/ux-v2/app/`（app.css 的 `--fs-stem / --math-* / .choice / .opt-k / .chapter-page .kp-row / .tier-switch`，app.js 的选项标记与 `soloMath()`，bust.mjs 换缓存串）。**路由 26 → 28 条**（新增 `choice-10-2`、`tier-colors`），两视口 = **56 次**。
- 两档实测：`node design/ux-v2/tools/qa/smoke.mjs` 与 `--strict` 各 **56 次 0 失败、rc=0**（报告 `screenshots/smoke.json` / `screenshots/smoke-strict.json`）。
- 新增的两条判据都做过负例，证明会红：
  - `choice-10-2`：把 `--math-opt` 临时改回 `1em` → 报「看到「16」，选项里的公式字号不到 20px…」「看到「18」，分数盒不到 26px 高…」，双视口红（rc=2）；改回后全绿。
  - `tier-colors`：临时追加 `.tier-switch .link{color:#333!important;background:#fff!important}` → `same:rgb(51,51,51)|…`，双视口红；删掉补丁后全绿。
- 判据本身也修了一处假红：`clip` 不再把 `white-space:nowrap` 当裁切条件（`.math-keep` 是 nowrap，KaTeX 盒子天生高出几像素，屏幕上没少一个像素）。修之前 `choice-10-2` 报 4–5 处「被容器裁掉」全是假的。
- 出图：`screenshots/practice-choice-10-2.png`（分式与 A/B/C/D）、`screenshots/chapter-color.png`（13 行紫底节行）、`screenshots/today-group.png`、`screenshots/book-color.png`、`screenshots/section-10-2.png`。
- 工具新增：`shot-choice.mjs`（节页 → 开始 → 跳过自判题 → 首个选择题出现即截图）、`probe_frac.mjs`（量选项公式字号/分数盒高）、`probe_ovf.mjs`（列出越过视口右边界的 `.math-keep` 及祖先链）、`probe-live.mjs` 加 `--click '<选择器>'`。

## §20 v0.13：右栏题干预览的公式字号

- **路由 28 → 29 条**（新增 `ledger-10-2`），两视口 = **58 次**：`smoke.mjs` 与 `--strict` 各 58 次 **0 失败 rc=0**（`screenshots/smoke.json` / `smoke-strict.json`）。
- 新增 `picks` 机制：`picks: [['pick-vol','801'],['pick-ch','10'],['pick-sec','10.2']]`。下拉框改 value 后派 `change`，日志记 `pick-sec=ok`；不这么做，`#/today` 永远停在默认那一节。
- `ledger-10-2` 两条断言：预览公式字号 ≥ 20px；`.glist .gt` 折行 0。负例（`1.6em` → `1em`）双视口红：`看到「15」，右栏题干预览里的公式不到 20px`。
- 溢出报告现在带文字：`SPAN.math-keep [822..1191] »x+y+z=1,xy+yz+«`。
- 修 `fitTightMath()` 之后 1180 / 1024 / 430 三档 ovf=0，`.glist` 最宽公式 75px（行宽 303/263/317）。
- 出图：`screenshots/today-ledger-big.png`（10.2，8 道预览公式 24px）、`screenshots/today-ledger-peiyou.png`。

## §21 v0.14：基线回合与远端

- 新增 `tools/qa/sync_baseline.mjs`（`--write` / `--check`）：把 `design/ux-v2/app/` 的 5 个文件覆盖到冻结基线 `design/ux-redesign/prototype/`，`capture.ps1` 保留。它同时检查 `index.html` 引到的本地文件是否都在——少复制一个 `js/` 目录会被当场抓住，而不是等到打开页面白屏。
- 基线不再是只读原件：`01_BASELINE_FREEZE.md` §6 的口径改为「日常只改 app，收口时同步 + 自证 + 打 tag」。
- 基线自证：`UXV2_PRE=/design/ux-redesign/prototype/ UXV2_PORT=8792 UXV2_CDP=9492 node design/ux-v2/tools/qa/smoke.mjs` → **58 次 0 失败**（`screenshots/smoke-baseline.json`）。`cdp.mjs` 的 `PRE` 因此改成 `process.env.UXV2_PRE || '/design/ux-v2/app/'`。
- `sync_baseline.mjs --check` → 「结果: 基线 == ux-v2/app」，rc=0（`screenshots/baseline-sync.json`）；`UXV2_APP=…/prototype node tools/qa/bust.mjs --check` → 四条 `[ok]`。
- 负例天然存在：同步前 `--check` 报 5 处不一致（3 个内容不同 + `js/core.js`、`js/state.js` 基线缺），rc=1。

## §22 v0.15：预览里只有带分数的公式才放大

- **路由 29 → 30 条**（新增 `ledger-plain-12-1`），两视口 = **60 次**：`smoke.mjs` 与 `--strict` 各 60 次 **0 失败 rc=0**（`screenshots/smoke.json` / `smoke-strict.json`）。
- 代码：`app.js` 新增 `markFrac()`（`fitTightMath()` 第一行调用，给含 `.mfrac` 的 `.katex` 打 `is-frac`）；`app.css` 两档字号——`.grow .gt .katex{1.06em}` / `.katex.is-frac{1.6em}`，`.qband-list .qcell .stem .katex{1.1em}` / `.is-frac{1.3em}`。
- 实测（1180 与 1024 两档一致）：12.1 中文 15px、纯数字 **15.9px**（改前 24）、折行 0、ovf 0；10.2 分式 24px、分数盒 29px（与上一轮一致，用户认可的那一版没被拉小）。
- 负例：`markFrac` 关掉 → `看到「nofrac」…` 双视口红；`.grow .gt .katex` 改回 `1.6em` → `看到「big:24,24,24,24,24,24,24,24」…` 双视口红。
- 缓存串（`bust.mjs`）：`app.css 6cc1b8d8 → a0c02ef1`、`app.js c59ed670 → 5182e4a5`；`bust.mjs --check` 四条 [ok]。
- 出图：`screenshots/today-12-1-fix.png`（1180）、`screenshots/today-12-1-fix-1024.png`（1024）。
- 探针：`C:/Users/liang.gao5/AppData/Local/Temp/probe_flat.mjs`（`W/H/CH/SEC/SHOT` 环境变量，走 `picks` 同款改 value 派 change），打印 `.gt` 字号、纯数字与分式两组字号、分数盒高、折行数、越界数。
