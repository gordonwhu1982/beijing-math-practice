# M7 复查：三条旅程与记录来路

- 负责人：独立原型评审员（只评 M7）
- 版本：原型 `design/ux-redesign/prototype/index.html` 引用 `app.js?v=42`、`app.css?v=42`
- 更新时间：2026-11-05
- 关联：`07_INTERACTION.md` 第 10 节；`design/ux-redesign/prototype/app.js` 的 `noteRecordFrom`、`go`、`onHash`、`backTarget`
- 状态：通过。只覆盖 M7 这一个门禁问题

本文只做函数走查：看路由和页面函数能不能把规格里的一步接上下一步。没有打开浏览器，没有手点页面，没有改原型，也没有改 `runtime/`、`content/`、`tools/`。下面写的「走通」只表示函数接得上。

## 结论

**通过。**

`07_INTERACTION.md` 第 10 节三条旅程的每一步，都能从当前 `app.js` 的函数接上。从回顾进记录，再进章，再回记录，再点返回，来路仍是回顾。

只覆盖 M7 这一个门禁问题：原型能打开，核心路径能点；原型在 `design/ux-redesign/prototype/`，不替换现有页面。这是函数走查，不是手点。

## 门禁

| 项 | 结果 | 依据 |
|---|---|---|
| 原型位置 | 满足 | 页面是 `design/ux-redesign/prototype/index.html`，标题是「math-coach 原型 · 平板练习」。脚本是同目录 `app.js?v=42`，样式是同目录 `app.css?v=42` |
| 不替换现有产品页 | 满足 | `runtime/web/index.html` 标题仍是「math-coach · 北京版初中数学」。它加载的是 `js/core.js`、`js/router.js` 和 `js/views/` 下的产品脚本，没有引用原型的 `app.js` |
| 原型能画出首页 | 满足（函数层面） | `app.js` 末尾调用 `onHash`。地址没有哈希时，`onHash` 把路由名当成 `today`，`render` 调用 `viewToday` |
| 核心按钮有处理函数 | 满足（函数层面） | `render` 末尾调用 `bind`。下面三条旅程里用到的按钮都在 `bind` 里有 `onclick` |

全景双指缩放本阶段不做。`viewMap` 和 `bind` 里没有缩放函数。第 10 节没有把双指缩放写成一步，不因此判不通过。

## 来路

`noteRecordFrom` 先看从哪进来。来路是 `chapter` 且 `chapterFrom` 为 `"record"` 时，函数直接返回，不改 `recordFrom`。其他非空、且不是记录自己的来路，才写入 `recordFrom`。

`go` 在目的地是 `record`、当前路由还不是 `record` 时调用 `noteRecordFrom(state.route)`，然后再把 `state.route` 改成目的地。`onHash` 在地址变成 `record`、当前路由还不是 `record` 时同样调用 `noteRecordFrom(state.route)`，然后再把 `state.route` 写成地址里的路由。

按这条顺序走：

1. 从回顾进记录。导航「我的记录」走 `requestLeave("record")`。当前不在做题页，`isDirty` 为假，于是 `go("record")`。当前路由是 `review`，`noteRecordFrom("review")` 把 `recordFrom` 写成 `"review"`。
2. 再进章。`#open-record-ch` 先把 `chapterFrom` 写成 `"record"`，再 `go("chapter")`。这次目的地不是记录，`noteRecordFrom` 不跑，`recordFrom` 仍是 `"review"`。
3. 再回记录。章页 `backTarget` 看到 `chapterFrom === "record"`，返回 `"record"`。`#top-back` 调用 `go("record")`。此时当前路由仍是 `chapter`，`noteRecordFrom("chapter")` 因 `chapterFrom` 为 `"record"` 直接返回，`recordFrom` 保持 `"review"`。浏览器从章退回 `#/record` 时，`onHash` 在路由还是章的时候调用同一个函数，来路同样保持 `"review"`。
4. 再点返回。记录页 `backTarget` 返回 `state.recordFrom`，也就是 `"review"`。`#top-back` 调用 `go("review")`，回到回顾。

## 1. 旅程 10.1 今天练一节

| 步 | 结果 | 依据 |
|---|---|---|
| 1 | 走通 | 打开：`onHash` → `render` → `viewToday`。导航「今天」：`drawNav` 把链接交给 `requestLeave`。主按钮：`bind` 里 `#start` 调用 `startQueue` → `beginQueue` → `go("practice")`，`beginQueue` 把 `index` 设为 0，`viewPractice` 取 `state.queue[0]`。取消「先看这一节」：`#see-section` 调用 `go("section")` |
| 2 | 走通 | 作答和交题在 `viewPractice` 与 `#submit`。选择题、填空在 `record` 之后把 `revealed` 设为真，页面写出「对了」或「不对」。提示第 5 级：`[data-hint]` 在级别为 4 时调用 `openDialog`；「再想想」是空函数，「还是要看」调用 `record(id, "peek")`。最后一题主按钮文案是「看这一组结果」，`advance` 调用 `go("result")`。中途离开：`#leave` 和导航都进 `requestLeave`，选「先离开」时调用 `saveDraft` |
| 3 | 走通 | `viewResult` 调用 `resultRow`。错、空着交、看了答案这三档带「回到知识点」。`bind` 里 `[data-result-kp]` 把 `kpFrom` 设为 `"result"` 并 `go("kp")`。`viewKp` 画出来源条。取消：`#to-today` 调用 `go("today")` |
| 4 | 走通 | `viewKp` 写定义；`kpFrom` 为 result 或 review 时写「你上次错在这里」。前置：`[data-kp-jump]` 把当前名推进 `kpTrail` 再 `render`，`crumbBar` 多画一级。取消：`#back-from` 在来源是结果时 `go("result")`；`#top-back` 有轨迹时弹出一级，没有轨迹时 `backTarget` 回到 `result`。结束：`#redo-kp` 调用 `startQueue(idsForKp(...), "wrong", "kp")`。回到结果后再点 `#redo`，进入「只练错的」 |
| 5 | 走通 | 仍是 `viewPractice`、`#submit`、`advance`，和步 2 同一套函数 |
| 6 | 走通 | `viewResult` 按 `shownMark` 分组。做对时 `record` 删掉 `owedOn`，`retryIds` 不再收录该题，`clearedFromReview` 给出移出回顾的句。结束：`#to-today` |
| 7 | 走通 | `sectionDone` 为真时，`viewToday` 写出「12.1 练过」。`retryIds().length` 大于 0 时写出「有 n 道要重做」。同一行的 `#to-review` 调用 `go("review")`，进入 `viewReview` |

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
| 3 | 走通 | `[data-weak]` 写入 `state.checked`；已经选了 5 个时不再增加，并可以写出「一次最多测 5 个」。`#test` 把 `pendingScope` 写成 `"review"` 并 `go("brief")`，`viewBrief` 是测试说明屏。`#skip-test` 调用 `go`，参数取 `backTarget()`，没有目标时用 `"review"`。说明屏的 `backTarget` 回到 review，不改 `state.checked`。`#begin-test` 调用 `startQueue(reviewTestIds(), "test", "test")` |
| 4 | 走通 | `setRoute("test")` 的地址是 `#/test`，画面仍是 `viewPractice`。`mode` 为 test 时不画提示按钮；对错反馈要求 `mode !== "test"`。`[data-jump]` 可以换题，`[data-choice]` 改的是 `testPicks`，所以可以回改。最后一题的 `#submit` 文案是「交卷」，进入 `requestFinish`。离开：`#leave` → `requestLeave(homeRoute())`，测试来源且范围是 review 时回到回顾；「先离开」调用 `saveDraft`，键是 `test:review`。再回到回顾时，`#test` 的文案来自 `resumeLabel`，点击后 `resumeDraft("test:review")` |
| 5 | 走通 | `finishSet` 在测试模式调用 `gradeTest`。`gradeTest` 把 `testBack` 写成「刚测完：稳了 a 个，还不稳 b 个」。`viewResult` 用 `testLine` 把这句画在总结卡里。错题仍可走 `[data-result-kp]`。`source` 为 test 且范围不是节、也不是章时，主按钮是 `#to-review`「回到回顾」 |
| 6 | 走通 | 从结果 `go("review")` 时，`go` 只在离开 review 时清空 `testBack`，所以这句还在。`viewReview` 把它放在「不稳的地方」这一栏正文的最前。已经变成 ok 的题离开 `retryIds`，对应的点离开 `weakPoints` |
| 7 | 走通 | 进入：`drawNav` 的「我的记录」经 `requestLeave` 进入 `viewRecord`。`finishSet` 调用 `noteChange`，写下 `lastChange`；`viewRecord` 写出「第 12 章上一回做对 … 现在 …」。有作答记录时，`#open-record-ch` 可以进章。取消「返回」：`backTarget` 在记录页返回 `recordFrom`，`topBar` 画出 `#top-back`。上面「来路」一节的四步走完后，这次返回的目标是 `review` |
