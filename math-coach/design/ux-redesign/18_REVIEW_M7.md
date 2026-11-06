# M7 原型评审

- 负责人：独立原型评审员（只评 M7）
- 版本：1
- 更新时间：2026-11-05
- 关联：`07_INTERACTION.md` 第 10 节、第 13 节；`design/ux-redesign/prototype/index.html`；`design/ux-redesign/prototype/app.js`
- 状态：不通过。只判定 M7，不表示第一阶段通过

本文只做代码走查：看路由和页面函数能不能把规格里的一步接上下一步。没有打开浏览器，没有点击页面。下面写的「走通」只表示函数接得上，不表示已经有人用手点过。

没有改原型，也没有改 `runtime/`、`content/`、`tools/`。

## 结论

**不通过。**

`07_INTERACTION.md` 第 10.3 节第 7 步走不通：进入「我的记录」之后，规格上的取消是「返回」，`backTarget` 在这条路由上没有返回目标，`viewRecord` 也没有返回按钮。

10.1、10.2 的每一步，以及 10.3 的第 1 步到第 6 步，都能从下面列出的函数接上。原型目录没有改 `runtime/`、`content/`、`tools/`。全景双指缩放本阶段不做，不因此判不通过。

## 门禁

| 项 | 结果 | 依据 |
|---|---|---|
| 原型位置 | 满足 | 页面是 `design/ux-redesign/prototype/index.html`，脚本是同目录 `app.js`，样式是同目录 `app.css` |
| 不替换现有产品页 | 满足 | 产品页仍是 `runtime/web/index.html`。它的标题是「math-coach · 北京版初中数学」，脚本不是原型的 `app.js` |
| 原型能画出首页 | 满足（函数层面） | 文件末尾调用 `onHash`。地址没有哈希时，`onHash` 把路由名当成 `today`，`render` 调用 `viewToday` |
| 核心按钮有处理函数 | 满足（函数层面） | `render` 末尾调用 `bind`。旅程里用到的按钮都在 `bind` 里有 `onclick` |
| 未改 `runtime/`、`content/`、`tools/` | 满足 | 工作区里这三个目录没有未提交改动。提交说明里带「体验原型」的提交，没有改这三个目录。这三个目录里更早的产品提交，不算这次原型改动 |

## 1. 旅程 10.1 今天练一节

| 步 | 结果 | 依据 |
|---|---|---|
| 1 | 走通 | 打开：`onHash` → `render` → `viewToday`。导航「今天」：`drawNav` 把链接交给 `requestLeave`。主按钮：`bind` 里 `#start` 调用 `startQueue` → `beginQueue` → `go("practice")`，`beginQueue` 把 `index` 设为 0，`viewPractice` 取 `state.queue[0]`。取消「先看这一节」：`#see-section` 调用 `go("section")` |
| 2 | 走通 | 作答和交题在 `viewPractice` 与 `#submit`。选择题、填空在 `record` 之后把 `revealed` 设为真，页面写出「对了」或「不对」。提示第 5 级：`[data-hint]` 在级别为 4 时调用 `openDialog`；「再想想」是空函数，「还是要看」调用 `record(id, "peek")`。最后一题主按钮文案是「看这一组结果」，`advance` 调用 `go("result")`。中途离开：`#leave` 和导航都进 `requestLeave`，选「先离开」时调用 `saveDraft` |
| 3 | 走通 | `viewResult` 调用 `resultRow`。错、空着交、看了答案这三档带「回到知识点」。`bind` 里 `[data-result-kp]` 把 `kpFrom` 设为 `"result"` 并 `go("kp")`。`viewKp` 画出来源条。取消：`#to-today` 调用 `go("today")` |
| 4 | 走通 | `viewKp` 写定义；`kpFrom` 为 result 或 review 时写「你上次错在这里」。前置：`[data-kp-jump]` 把当前名推进 `kpTrail` 再 `render`，`crumbBar` 多画一级。取消：`#back-from` 在来源是结果时 `go("result")`；`#top-back` 有轨迹时弹出一级，没有轨迹时 `backTarget` 回到 `result`。结束：`#redo-kp` 调用 `startQueue(idsForKp(...), "wrong", "kp")`。回到结果后再点 `#redo`，进入「只练错的」 |
| 5 | 走通 | 仍是 `viewPractice`、`#submit`、`advance`，和步 2 同一套函数 |
| 6 | 走通 | `viewResult` 按 `shownMark` 分组。做对时 `record` 删掉 `owedOn`，`retryIds` 不再收录该题，`clearedFromReview` 给出移出回顾的句。结束：`#to-today` |
| 7 | 走通 | `sectionDone` 为真时，`viewToday` 写出「12.1 练过」。`retryIds().length` 大于 0 时写出「有 n 道要重做」。点进回顾的是旁边的 `#to-review`，`bind` 里调用 `go("review")`。句子节点本身不是按钮，同一行有进入 `viewReview` 的按钮 |

## 2. 旅程 10.2 从课本或图谱进入

| 步 | 结果 | 依据 |
|---|---|---|
| 1a | 走通 | `viewBook`。`#toggle-vol` 切换 `bookOpen`，收起时不画章行。`#open-ch` 把 `chapterFrom` 设为 `"book"` 并 `go("chapter")` |
| 1b | 走通 | 初始 `mapMode` 是 `"layer"`，`mapBook` 是「八年级上册」。`viewMap` → `layerSets` 画出章节列。`[data-chapter]` 在章已选、卡片未开时把 `mapCard` 设为真，侧栏出现「打开这一章」。`#open-chapter` 把 `chapterFrom` 设为 `"map"` 并 `go("chapter")`。取消：`#map-close` 把 `mapCard` 设为假 |
| 2 | 走通 | `viewChapter` 的 `[data-open-sec]` 调用 `go("section")`。返回：`#top-back` → `backTarget`。`chapterFrom` 为 `"map"` 时回 `map`，否则回 `book`。`go` 不改 `mapMode`、`mapCard`、`mapChapter`，图谱上一次的视图和卡片还在 |
| 3 | 走通 | `viewSection` 写「这一节讲什么」。`[data-kp-name]` 调用 `go("kp")`，来源记成 section。返回：`backTarget` 从 section 回到 chapter |
| 4 | 走通 | `viewKp` 写定义。点前置走 `[data-kp-jump]`，`crumbBar` 加一级。`#top-back` 按 `kpTrail` 逐级退回。面包屑上的节调用 `go("section")` |
| 5 | 走通 | `viewSection` 的 `#start`。当前路由是 section 时，`bind` 用 `startQueue` 打开练习，来源是 `"section"` |
| 6 | 走通 | 同 10.1 步 2：`viewPractice`、`#submit`、`requestLeave`、`advance` |
| 7 | 走通 | 错题仍走 `[data-result-kp]`。来源不是测试且有错时，`viewResult` 的主按钮是 `#redo`「只练错的（N 道）」，N 来自 bad、empty、peek 的个数；`#to-today`「回到今天」是另一个按钮 |

## 3. 旅程 10.3 从回顾再测一次

| 步 | 结果 | 依据 |
|---|---|---|
| 1 | 走通 | 导航「回顾」在 `drawNav`；今天页的入口是 `#to-review`。`viewReview` 用 `weakPoints` 写出原因。`[data-weak-name]` 调用 `go("kp")`。还没有任何 bad、empty、peek、skip 时，`weakPoints` 为空，这个按钮不会画出来。这一步要先有这类记录 |
| 2 | 走通 | `kpFrom` 为 `"review"` 时，`viewKp` 写来源条「从回顾来 · 回到回顾」，并写「你上次错在这里」。`#back-from` 调用 `go("review")`。没有前置轨迹时，`#top-back` 经 `backTarget` 也回 review |
| 3 | 走通 | `[data-weak]` 写入 `state.checked`；已经选了 5 个时不再增加，并可以写出「一次最多测 5 个」。`#test` 调用 `go("brief")`，`viewBrief` 是测试说明屏。`#skip-test` 只 `go("review")`，不改 `state.checked`。`#begin-test` 调用 `startQueue(reviewTestIds(), "test", "test")` |
| 4 | 走通 | `setRoute("test")` 的地址是 `#/test`，画面仍是 `viewPractice`。`mode` 为 test 时不画提示按钮；对错反馈要求 `mode !== "test"`。`[data-jump]` 可以换题，`[data-choice]` 改的是 `testPicks`，所以可以回改。最后一题的 `#submit` 文案是「交卷」，进入 `requestFinish`。离开：`#leave` → `requestLeave(homeRoute())`，测试来源且范围是 review 时回到回顾；「先离开」调用 `saveDraft`，键是 `test:review`。再回到回顾时，`#test` 的文案来自 `resumeLabel`，点击后 `resumeDraft("test:review")` |
| 5 | 走通 | `finishSet` 在测试模式调用 `gradeTest`。`gradeTest` 把 `testBack` 写成「刚测完：稳了 a 个，还不稳 b 个」。`viewResult` 用 `testLine` 把这句画在总结卡里。错题仍可走 `[data-result-kp]`。`source` 为 test 且范围不是节、也不是章时，主按钮是 `#to-review`「回到回顾」 |
| 6 | 走通 | 从结果 `go("review")` 时，`go` 只在离开 review 时清空 `testBack`，所以这句还在。`viewReview` 把它放在「不稳的地方」这一栏正文的最前。已经变成 ok 的题离开 `retryIds`，对应的点离开 `weakPoints` |
| 7 | 走不通 | 进入和章的数字接得上：`drawNav` 的「我的记录」进入 `viewRecord`。`finishSet` 调用 `noteChange`，写下 `lastChange`；`viewRecord` 写出「第 12 章上一回做对 … 现在 …」。取消「返回」接不上：`backTarget` 在路由为 `record` 时返回空字符串，`topBar` 因此不画 `#top-back`，`viewRecord` 里也没有「返回」按钮。浏览器若退回上一地址，会由 `onHash` 跟着走；页面上没有规格写的「返回」 |

## 4. 第 13 节验收点（函数对照）

第 13 节原文要求手点。这里仍只写函数能不能接上。M7 的不通过来自第 10.3 节第 7 步。全景双指缩放不参与判定。

| 条 | 结果 | 依据 |
|---|---|---|
| 1 | 函数链走通 | 即第 10.1 节：`viewToday` → `#start` → `viewPractice` → `advance` → `viewResult` → `[data-result-kp]` → `viewKp` → `#redo-kp` → `viewPractice` → `viewResult` → `#to-today`。没有做 1180×820 的手点 |
| 2 | 走通 | 空着交：`#submit` 调用 `openDialog`，「回去写」不调用 `record`，「就这样交」调用 `record(id, "empty")`。格式不对：填空在写入前 return，只设置 `formatNote`。先跳过：`#skip` 把当前题 `splice` 后再 `push` 到队尾。提示里的「完整解析」：`[data-hint]` 级别为 4 时 `openDialog`，「再想想」不记，「还是要看」记成 `peek`，结果分组里有「看了答案」。交完后的 `#after-peek` 只把 `afterExplain` 设为真，不走这个确认框 |
| 3 | 走通 | 导航进 `requestLeave`。已有最终标记时 `isDirty` 为真，出现确认框。「先离开」调用 `saveDraft` 再 `go`。`viewToday` 用 `resumeLabel("today")` 显示「接着做 · 还剩 m 题」。再点 `#start` 时 `resumeDraft` 恢复 `index`、`blank`、`picked`、`openText`。索引在 `advance` 里加一，不在 `record` 里加一；人已经点到第 3 题再离开时，回来仍是第 3 题 |
| 4 | 走通 | 提前交卷走 `#finish` → `requestFinish` → `finishSet` → `markUnansweredSkipped`，未交的题 `record(id, "skip")`。`viewResult` 把 `skip` 放进「跳过了」 |
| 5 | 走通 | 有 bad、empty 或 peek 时，`viewResult` 的主按钮是 `#redo`，文案「只练错的（N 道）」。N 是这三档的个数，不含跳过 |
| 6 | 走通 | 同第 10.3 节第 3 步到第 6 步：`#test` → `viewBrief` → `#begin-test` → `viewPractice`（测试模式无提示、交卷前无对错）→ `gradeTest` → `viewResult` 的 `#to-review` → `viewReview` 栏前的 `testBack` |
| 7 | 切换走通；字是否重叠不能从函数判断 | `[data-chapter]`、`[data-point]` 打开卡片。`[data-mode]` 只改 `mapMode`，不改 `mapChapter` 和 `mapPoint`。切到全景后，第 12 章芯片在 `mapChapter` 为真时带 `here`。再点「分层」仍读原来的选中项。`viewMap` 和 `bind` 里没有双指缩放函数。字是否重叠要看版面，本次不因此判不通过；双指缩放按本阶段约定不因此判不通过 |
| 8 | 走通 | `viewMap` 只有 `hashParam("net") === "1"` 时才调用 `modeButton("network", "网络")`。默认地址不带这个参数，第一屏没有「网络」按钮 |
| 9 | 空状态函数在；句子未与第 9 节逐字核对 | 没有任何作答时，`viewToday`、`viewReview`、`viewRecord` 各有自己的空文案，主按钮都是一个 `class="btn"`。有记录时，`viewRecord` 底部只有 `#about-data`「关于这些数据」，`bind` 把它送到 `viewEvidence`。本次按任务没有读第 9 节，不把句子写成已经与第 9 节核对过 |
| 10 | 不能从函数证明运行前后键没有变化 | `persistDrafts` 会 `localStorage.setItem("mc-proto-drafts", ...)`，也会写入 `sessionStorage`。`app.js` 里没有对其他键调用 `setItem`。这是原型自己的新键。本次没有在浏览器里对比运行前后的 localStorage。这一条不改变上面的否决理由；否决理由仍是第 10.3 节第 7 步 |

## 5. 不在本次否决里的一项

全景双指缩放：`app.js` 的 `viewMap`、`bind` 和手势相关检索里没有缩放函数。第 10 节三条旅程没有把双指缩放写成一步。不因此判 M7 不通过。
