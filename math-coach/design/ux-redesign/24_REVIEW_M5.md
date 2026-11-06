# M5 交互门禁复评

- 负责人：独立交互评审员（子代理）。本轮只读规格和原型，不改原型、规格或其他文件
- 版本：0.1
- 更新时间：2026-11-05 20:40 +08:00
- 关联：`00_PHASE1_BRIEF.md` 的 M5 门禁；`07_INTERACTION.md`；`prototype/app.js`（`prototype/index.html` 第 17 行引用 `app.js?v=42`）；对照 `18_REVIEW_M5.md` 第 1.1 节三条和 `19_REVIEW_M5.md`
- 状态：M5 这个门禁问题通过。本文件只覆盖这一问

判断依据是 `07_INTERACTION.md` 的任务表、状态表，以及 `prototype/app.js` 里对应函数能走出的行为。没有用浏览器手点。全景的两指缩放、单指平移、双击空白复位不计入。

## 1. 结论

**通过。**

只覆盖 M5 这一个门禁问题：核心任务有进入、操作、反馈、取消和结束；主要页面状态有规格；交互由可运行的原型做出，不是一张静态图。

`18_REVIEW_M5.md` 用来否决的三条，在当前 `app.js?v=42` 上仍然成立。`07_INTERACTION.md` 第 2 节十二个任务仍各有进入、操作、反馈、取消、结束。第 11 节十一个主要页面仍各有默认、空、加载、写错或判不了、离开又回来。原型函数仍能进入并结束这些任务，第 11 节要求的状态也没有整页缺失。`18_REVIEW_M5.md` 第 4 节那九条保持原先的判定，不单独否决。

## 2. 三条仍然成立

1. **P-BOOK 有加载状态。** `viewBook` 在 `hashParam("load") === "1"` 时直接返回，内容区写「正在打开……」，不画册和章。
2. **P-REVIEW 有加载状态。** `viewReview` 在 `load=1` 时直接返回。左栏「要重做的题」和右栏「不稳的地方」各自写「正在打开……」。
3. **离开后恢复滚动；重新打开后册的展开、图谱选中、回顾勾选还在。** `rememberScroll` 按当前路由记下 `#main` 的 `scrollTop`。`restoreScroll` 按当前路由设回去。`go` 在改路由前记下离开页，`render` 之后调用 `restoreScroll` 和 `persistDrafts`。`onHash` 在路由变化时先记后恢复；文件末尾的 `onHash()` 在 `applyPlace` 读回记录之后画出第一页。`pagehide` 先 `rememberScroll` 再 `persistDrafts`。`persistDrafts` 的 `place` 写入 `bookOpen`、`mapMode`、`mapPoint`、`mapCard` 及同页筛选和卡片字段、`checked`、`scrolls`。`applyPlace` 在重新打开时写回这些字段。`viewBook` 用 `bookOpen` 决定展开或收起，`viewMap` 用 `mapPoint` 和 `mapCard` 画出选中项和卡片，`viewReview` 用 `checked` 勾选对应的点。

## 3. 核心任务

`07_INTERACTION.md` 第 2 节 T-01 至 T-12 的表仍各有进入、操作、反馈、取消、结束五列。原型里进入和结束仍落在这些函数上。操作、反馈、取消里和规格原文有出入的，沿用 `18_REVIEW_M5.md` 第 4 节：对应任务的进入和结束还在，就不把整条任务记成缺进入或缺结束。

| 任务 | 进入 | 结束 |
|---|---|---|
| T-01 开始今天的练习 | `viewToday` 的 `#start`，`bind` 调用 `startQueue` | `beginQueue` 经 `go` 进入 `viewPractice` |
| T-02 做一题 | `viewPractice` | `advance` 或 `finishSet` 进入 `viewResult` |
| T-03 看结果 | `finishSet` / `advance` | `viewResult` 底部下一步；`backTarget` 经 `homeRoute` 回到这一组开始前的页 |
| T-04 从错题回到知识点 | `resultRow` 的 `data-result-kp` 进入 `viewKp` | `#redo-kp` 进入练习，或 `#back-from` 回到 `viewResult` |
| T-05 再练 | `viewResult` 的 `#redo`、`#again`，`viewKp` 的 `#redo-kp` | 同 T-02，交卷后 `viewResult` |
| T-06 按课本找一节 | `viewBook` 的 `#open-ch`，`viewChapter` 的 `data-open-sec` | `viewSection` 的 `#start` |
| T-07 图谱分层选点 | 导航进 `viewMap`；`#kp-map`；`#see-map` | `pointCard` 的 `#map-kp`、`#map-sec` |
| T-08 切到全景 | `viewMap` 的 `data-mode="panorama"` | 第 12 章 `data-chapter` 之后，`#open-chapter` 进入 `viewChapter` |
| T-09 重做欠着的题 | `viewReview` 的 `#redo-all` 和 `data-redo-one` | `viewResult`；做对后 `record` 清掉欠题 |
| T-10 测一次 | `#test`、`#test-section`、`#test-chapter` 进入 `viewBrief`，`#begin-test` 进入 `viewPractice` | `requestFinish` → `gradeTest` → `viewResult`；主按钮按 `testScope` 回到回顾、节或章 |
| T-11 看我的记录 | 导航进入 `viewRecord` | 左侧导航或 `#top-back` 离开 |
| T-12 导入导出记录 | `#export-record`、`#import-record` | `downloadRecord` 写「已导出，文件在下载里。」；`readImport` 合并后写「已导入，和这台平板上的记录合并。」 |

`18_REVIEW_M5.md` 第 4 节九条，在当前函数里仍有和规格原文对不齐的地方。逐条看过之后，没有一条让某个核心任务失去进入或结束，也没有让第 11 节的某一列整页消失，所以仍不单独否决。

1. 练习题号仍画成 `<i>`。`bind` 里 `data-jump` 仍只在 `state.mode === "test"` 时绑定。T-02 仍从 `viewPractice` 进入，并由 `advance` 或 `finishSet` 结束。
2. `bindHits` 仍直接 `go`。做题页 `hideTopBar` 不画顶部搜索。导航和 `#leave` 仍走 `requestLeave`。
3. `startQueue` 的确认仍是「还有一组没做完」。各来源页的接着做和放弃仍在：`resumeLabel`、`bindAbandon`。
4. `viewChapter` 的主干和方法仍是段落。选册、选章、选节仍通到 `viewSection` 的 `#start`。
5. `againPool` 仍从整份 `QUESTIONS` 去掉本组做对的题。再练仍能进入练习，并在 `viewResult` 结束。
6. 练习来源的 `viewResult` 底部仍是「只练错的」「再来一组」「回到今天」。`homeRoute` 在 `source === "review"` 时回到 `viewReview`，`#top-back` 能回去。T-09 仍在 `viewResult` 结束。
7. 从我的记录进章之后可以回到记录：`#open-record-ch` 把 `chapterFrom` 设为 `"record"`，`backTarget` 因此回到 `viewRecord`。T-11 的进入和结束仍在。
8. 全景分支仍只让第 12 章可点。点章之后 `#open-chapter` 仍在，T-08 仍有结束。
9. `viewPractice` 的符号条仍是 ∠、△、≌、√、π、²。这一条不改变任何任务的进入或结束。

## 4. 主要页面状态

`07_INTERACTION.md` 第 11 节的表仍在。P-TODAY、P-BOOK、P-CHAPTER、P-SECTION、P-KP、P-MAP、P-PRACTICE、P-TEST、P-RESULT、P-REVIEW、P-RECORD 各有默认、空、加载、写错或判不了、离开又回来五列。

原型里这些状态仍由对应函数画出，没有一页把某一列整页拿掉。

- 加载：`viewToday`、`viewBook`、`viewChapter`、`viewSection`、`viewKp`、`viewMap`、`viewPractice`、`viewResult`、`viewReview`、`viewRecord` 都读 `load=1` 并写「正在打开……」。测试与练习共用 `viewPractice`。
- 空和写错：`viewToday` 的无记录句子和 `down=1`；`viewBook` 的「还没练」和 `down=1`；`viewChapter`、`viewSection`、`viewKp` 的 `missing=1`；`viewSection` 的 `empty=1`；`viewMap` 的「这里没有」和 `pano=fail`，`net` 不是 `1` 时不画「网络」；`startQueue` 的「暂时没有能练的题」和「暂时没有能测的题」；`viewBrief` 在没有题时写「这几个知识点暂时没有能测的题」；`viewResult` 的全部跳过，以及队列为空时的「这一组的结果找不到了。」；`viewReview` 的两句空状态和 `down=left`、`down=right`；`viewRecord` 的空状态，以及 `readImport` 读不出文件时的「这个文件打不开，换一个试试。」
- 离开又回来：见第 2 节第 3 条。练习和测试另有 `resumeDraft`、`resumeLabel`。

`viewMap` 在 `load=1` 时整段返回同一句「正在打开……」，没有按全景、网络各写一句。加载这一列仍然有这句话，视图切换条也画了出来。这和 `18_REVIEW_M5.md` 第 3 节已经记下、并且没有单独否决的情况相同，够不上整页缺失。

P-EVIDENCE 不在第 11 节。`viewEvidence` 仍能从 `#about-data` 进入，并由 `backTarget` 回到 `viewRecord`。

## 5. 本阶段不计入

§7.4 第 4 条的两指缩放、单指拖动、双击空白处复位，本阶段明确不做，不作为否决理由。`viewMap` 全景分支里的「回到本章」仍由 `#back-chapter` 把章重新选中。

## 范围

本文件只回答 M5 这一个门禁问题。其他里程碑不在这份结论里。
