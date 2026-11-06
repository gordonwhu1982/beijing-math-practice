# M5 交互独立评审

- 负责人：独立交互评审员（子代理）。本轮只读 `07_INTERACTION.md` 和 `prototype/app.js`，不改原型
- 版本：0.1
- 更新时间：2026-11-05 18:08 +08:00
- 关联：M5、`00_PHASE1_BRIEF.md` 门禁、`07_INTERACTION.md`、`prototype/app.js`（`prototype/index.html` 引用 `app.js?v=38`）
- 状态：M5 不通过。本文件只评 M5，不给 M1–M4、M6–M8 下结论

判断依据是规格全文和页面函数能走出的行为。没有用浏览器手点。

## 1. 结论

**不通过。**

`07_INTERACTION.md` 第 2 节为 T-01 至 T-12 都写了进入、操作、反馈、取消、结束。第 11 节为 11 个主要页面写了默认、空、加载、写错或判不了、离开又回来。规格这一层是齐的。

不通过是因为原型没有做出第 11 节里已经写明的主要页面状态。全景的两指缩放、单指平移、双击空白复位按本阶段范围不计入，不作为不通过理由。

### 1.1 导致不通过的缺口

1. **P-BOOK 没有加载状态。** 规格 §11「加载」列要求册列表占位。`viewBook` 只处理 `down=1` 的打不开，没有 `load=1` 分支。地址带 `load=1` 时仍画出正常册列表。
2. **P-REVIEW 没有加载状态。** 规格 §11「加载」列要求两栏各自占位。`viewReview` 不读 `load`。地址带 `load=1` 时仍画出两栏正文。
3. **离开又回来没有恢复滚动，重新打开也留不住册、图谱和勾选。** 规格 §0.3 第 2 条要求返回时恢复进入前的滚动位置和选中项。§11「离开又回来」列对 P-BOOK、P-CHAPTER、P-SECTION、P-KP、P-MAP、P-REVIEW、P-RECORD 写了恢复滚动，P-MAP 还要恢复视图、选中项和卡片，P-REVIEW 还要停在上次的栏并保留勾选。`render` 每次重写 `#main`，没有任何函数保存或恢复滚动。`persistDrafts` 只写入 `drafts`、`answers`、`priorOwed`、`lastChange`。重新打开后，`viewBook` 的 `bookOpen`、`viewMap` 的 `mapMode` / 选中项 / 卡片、`viewReview` 的勾选和所在栏都回到初始值。同一次打开里，导航离开再回来时，册的展开、图谱选中和回顾勾选还在内存里，滚动仍然不恢复。

## 2. 核心任务的进入和结束

第 2 节十二个任务都能进入，也都能结束。下表只记进入和结束落在哪个函数。操作、反馈、取消里对不齐的，放在第 4 节，不把整条任务记成没有进入或没有结束。

| 任务 | 规格 | 进入 | 结束 |
|---|---|---|---|
| T-01 开始今天的练习 | §2 | `viewToday` 主按钮，`bind` 里 `#start` 调用 `startQueue` | 进入 `viewPractice` |
| T-02 做一题 | §2、§3 | `viewPractice` | `advance` 或 `finishSet` 进入 `viewResult` |
| T-03 看结果 | §2、§4 | `finishSet` / `advance` 进入 `viewResult` | `viewResult` 底部下一步；`backTarget` 回到这一组开始前的页 |
| T-04 从错题回到知识点 | §2、§4.3、§6.4 | `resultRow` 的「回到知识点」进入 `viewKp`，来源条由 `kpFrom === "result"` 画出 | `#redo-kp` 进入练习，或 `#back-from` 回到 `viewResult` |
| T-05 再练 | §2、§4.4 | `viewResult` 的 `#redo`、`#again`，`viewKp` 的 `#redo-kp` | 同 T-02，交卷后 `viewResult` |
| T-06 按课本找一节 | §2、§6.1–§6.3 | `viewBook` 展开册并 `#open-ch`，`viewChapter` 的 `data-open-sec` 进入 `viewSection` | `viewSection` 的 `#start` |
| T-07 图谱分层选点 | §2、§7.2、§7.3 | 导航进 `viewMap`；`viewKp` 的 `#kp-map`；`viewChapter` 的 `#see-map` | `pointCard` 的 `#map-kp`、`#map-sec` |
| T-08 切到全景 | §2、§7.4 | `viewMap` 的 `data-mode="panorama"` | 点第 12 章后侧栏 `#open-chapter` 进入 `viewChapter`。全景里新点知识点见第 4 节 |
| T-09 重做欠着的题 | §2、§8.2 | `viewReview` 的 `#redo-all` 和 `data-redo-one` | `viewResult`；做对后 `record` 清掉欠题，`retryIds` 不再列出 |
| T-10 测一次 | §2、§5 | `viewReview` 的 `#test`、`viewSection` 的 `#test-section`、`viewChapter` 的 `#test-chapter` 进入 `viewBrief`，`#begin-test` 进入 `viewPractice` | `requestFinish` → `gradeTest` → `viewResult`；主按钮按 `testScope` 回到回顾、节或章 |
| T-11 看我的记录 | §2、§8.4 | 导航进入 `viewRecord` | 规格写「离开即可」，左侧导航可以离开。从章返回的落点见第 4 节 |
| T-12 导入导出记录 | §2、§8.4 | `viewRecord` 的 `#export-record`、`#import-record`；空状态另有 `#import-empty` | `downloadRecord` 写「已导出，文件在下载里。」；`readImport` 合并后写「已导入，和这台平板上的记录合并。」 |

第 10 节三条旅程的前进路径也能从这些函数走到：今天练习到结果再回知识点，课本或图谱到章、节再做题，回顾勾选后经 `viewBrief` 测试再回回顾。

## 3. 第 11 节状态表

「有」表示对应函数里能画出该状态。「缺」表示函数里没有这一支。「部分」表示有句子或有内存里的恢复，规格写的那一项没有做完。

| 页面 | 函数 | 默认 | 空 | 加载 | 写错或判不了 | 离开又回来 |
|---|---|---|---|---|---|---|
| P-TODAY | `viewToday` | 有 | 有，无记录时用 §9 那句 | 有，`load=1` | 有，`down=1` | 有未交草稿时 `resumeLabel` 把主按钮改成接着做。滚动不恢复 |
| P-BOOK | `viewBook` | 有 | 有，进度写「还没练」 | **缺** | 有，`down=1` 写出打不开。原型只有一册，整页换成这一句 | 同一次打开里 `bookOpen` 还在。滚动不恢复。重新打开后收起状态丢失 |
| P-CHAPTER | `viewChapter` | 有，顺序是节、主干、方法、不稳、侧栏动作 | 有，「还没练过这一章」或「还看不出哪里不稳」 | 有，`load=1` | 有，`missing=1` | 滚动不恢复 |
| P-SECTION | `viewSection` | 有 | 有，`empty=1` 停用主按钮并给「看下一节」 | 有，`load=1` 且主按钮停用 | 有，`missing=1` | 有草稿时主按钮变成接着做。滚动不恢复 |
| P-KP | `viewKp` | 有 | 有，「这是起点」或「暂时没有接着学的」 | 有，`load=1` | 有，`missing=1` 主按钮「搜一搜」 | 来源条随 `kpFrom` 保留。滚动不恢复 |
| P-MAP | `viewMap` | 有，默认分层 | 有，空列写「这里没有」 | 部分：`load=1` 有一句「正在打开……」。规格要求全景、网络各自显示，函数在加载时提前返回，没有按视图分开 | 有：`pano=fail` 走 §7.4 第 7 条；`net` 不是 `1` 时不出现「网络」 | 同一次打开里视图、选中和卡片还在内存。滚动不恢复。重新打开回到默认分层 |
| P-PRACTICE | `viewPractice`、`startQueue`、`bind` | 有 | 有：没有题时 `startQueue` 不进入本页，`flash` 写「暂时没有能练的题」 | 有，`load=1` | 有：空着交、格式不对、开放题自评都在 `bind` 的 `#submit` | 有：`resumeDraft` 回到离开时的题，答案、过程和已开提示在草稿里 |
| P-TEST | `viewBrief`、`viewPractice` | 有说明屏，之后一次一题，题号可跳 | 有：`viewBrief` 在没有题时写「暂时没有能测的题」，主按钮「去看这个知识点」 | 有，与练习共用 `viewPractice` 的 `load=1` | 有：测试中格式不对不进入下一题；开放题在 `gradeTest` 里记成「判不了」，`resultRow` 可再判 | 有：`resumeLabel` 写接着测，`resumeDraft` 带回已写答案 |
| P-RESULT | `viewResult` | 有总结和分组 | 有，全部跳过时写「这一组都跳过了」 | 有，`load=1` | 有，队列为空时写「这一组的结果找不到了。」 | 离开到知识点以外时 `go` 清掉展开。从知识点回来保留 `explainId`。规格对这一页不要求保留展开 |
| P-REVIEW | `viewReview` | 有两栏 | 有，两句与 §9 一致；没有记录时右栏只是文字链接 | **缺** | 有，`down=left` 或 `down=right` 时该栏写打不开 | 同一次打开里勾选还在。离开回顾时 `go` 清掉「刚测完」。没有「上次的栏」。滚动不恢复。重新打开后勾选丢失 |
| P-RECORD | `viewRecord`、`readImport` | 有总数、各章、变化、导入导出 | 有，句子与 §9 一致，并有「导入以前的记录」 | 有，`load=1` | 有，文件读不出时写「这个文件打不开，换一个试试。」 | 滚动不恢复 |

P-EVIDENCE 不在第 11 节。`viewEvidence` 有默认一屏，`#about-data` 能进入，`backTarget` 回到 `viewRecord`。不因为这一页没有五行状态而判不通过。

## 4. 其他缺口

这些规格在 07 里有，原型没有按原文做出。对应任务的进入和结束仍然有，所以不单独写成「缺进入」或「缺结束」。

1. **练习里不能点题号回看。** §3.4：交过的题可以点页头题号，只读。`viewPractice` 在练习模式把题号画成 `<i>`。`bind` 里 `data-jump` 只在 `state.mode === "test"` 时绑定。测试可以回改，练习不能回看。
2. **做题中点搜索结果不会确认。** §0.3 第 3 条、§3.5：点搜索结果按中途离开处理。`bindHits` 直接 `go`。练习和测试时 `hideTopBar` 不画顶部搜索，这条路径在做题页上走不到。导航和页内「返回」仍走 `requestLeave`。
3. **同一来源还有草稿时，入口文案和确认步数与规格不同。** §3.1：先显示「上次这一组还剩 N 题没做」，主按钮「接着做」，次按钮「重新开始一组」；再确认「上次没做的 N 题不会记下」。`startQueue` 弹的是「还有一组没做完」，按钮是「放弃那一组」和「接着做那一组」，点放弃就丢掉草稿，没有第二步确认。各来源页上的接着做和放弃按钮仍然有：`viewToday`、`viewSection`、`viewKp`、`viewReview` 用 `resumeLabel`，放弃走 `bindAbandon`。
4. **章页上的知识主干和方法点不了。** §6.2：点知识点进 P-KP，点方法打开方法面板。`viewChapter` 把主干、方法和思想写成段落。节、`#see-map`、`#test-chapter` 可以点。T-06 要求的选册、选章、选节仍然通。
5. **「再来一组」不是同一来源。** §4.4：同一来源再出题，排除这一组已做对的。`againPool` 从整份 `QUESTIONS` 里去掉本组做对的题。从知识点或单题重做再点「再来一组」时，题目会扩成这一节的题。
6. **从回顾重做后，结果页底部没有「回到回顾」。** §8.2。`viewResult` 在练习来源下的底部是「只练错的」「再来一组」或「回到今天」。`backTarget` 在 `source === "review"` 时回到 `viewReview`，所以返回能回去，底部没有这个按钮。
7. **从我的记录打开章之后，返回不到记录。** §2 T-11 的取消是「返回」。§0.3 第 2 条要求回到进入前的页面。§8.4 点章进入 P-CHAPTER。`viewRecord` 的 `#open-record-ch` 只调用 `go("chapter")`，不改 `chapterFrom`。`backTarget` 因此回到课本，若之前从图谱进过章，则回到图谱。
8. **全景里不能新点一个知识点。** §2 T-08 的结束、§7.4 第 5 条：点知识点出知识点卡片。`viewMap` 的全景分支只画章名；第 12 章是 `data-chapter`，其余章不可点。分层里已经打开的知识点卡片会留在侧栏。点章能出「打开这一章」。因为点章这条结束还在，T-08 不记成没有结束。
9. **填空符号条没有分数。** §3.2。`viewPractice` 的符号是 ∠、△、≌、√、π、²。

## 5. 已经对上的规格

下面这些按当前函数可以走通，不列入缺口。

- T-01：第 1 题还没写时，`requestLeave` 因 `isDirty` 为假直接离开，不留草稿。
- T-02：空着交、格式不对、先跳过、五级提示、看完整解析前的确认，都在 `viewPractice` 和 `bind`。提前交卷的确认在 `requestFinish`。关掉页面时 `beforeunload` 和 `pagehide` 会 `saveDraft`。
- T-03、T-04：`viewResult` 按做错、看了答案、跳过、等你判、做对了分组。来源条和「你上次错在这里」在 `viewKp`。
- T-07：六列、册和章的下拉、`layerSets` 在「数据分析」下把右边写成「这里没有」、知识点侧栏和关闭，都在 `viewMap`、`mapFilters`、`pointCard`。
- T-10：未勾选时「测一次」停用；超过 5 个停用其余勾选；说明屏有「开始测」和「先不测」；测试没有提示，交卷前不显示对错；`gradeTest` 写「刚测完：稳了 a 个，还不稳 b 个」，离开回顾后清除。
- T-12：导出、读不出文件、导入确认里安全按钮是「先不导入」，都在 `downloadRecord`、`readImport`、`openDialog`。
- §9 三处空状态句子在 `viewToday`、`viewReview`、`viewRecord`。空的记录页不放「关于这些数据」。
- §7.5：孩子第一层不出现「网络」，只有地址参数 `net=1` 时 `viewMap` 才画知识点节点。
- §0.1、§13 第 10 条：`persistDrafts` 只写 `mc-proto-drafts`，不写 `mc.records.v1` 和 `mc.settings.v1`。

## 6. 本阶段不计入的项

§7.4 第 4 条的两指缩放、单指拖动、双击空白处复位，本阶段明确不做。`viewMap` 的全景分支没有这些手势。这一条不作为不通过理由。同条里给不会两指的孩子用的「回到本章」已经有，`#back-chapter` 把章重新选中。
