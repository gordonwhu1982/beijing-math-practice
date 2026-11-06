# 第四轮交叉评审意见（只复核严重项）

- 负责人：第四轮独立评审员（子代理）。没有写过 06、07、08，也没有改过 `prototype/app.js`
- 版本：0.1
- 更新时间：2026-11-05 +08:00
- 关联：`11_REVIEW_ROUND3.md` §6，`07_INTERACTION.md` §3.4、§3.5、§5.1、§5.3、§8.4、§10.3，`prototype/app.js`（`index.html` 引用 `app.js?v=7`）
- 状态：第四轮只复核严重项，不是通过

## 0. 这份意见是什么、不是什么

- 本轮只看第一轮的四条严重项，重点核对第三轮 §6 点名的残留。判断依据是当前 `prototype/app.js`（973 行），不是第三轮的文字。
- 评审员没有操作浏览器，判断来自逐行阅读代码。下文写的「会出现」都是按代码推出的结果，没有手点验证。
- 这不是真实用户测试，没有孩子参与。
- 中等项和建议项不在本轮范围。第 6 节顺带记了几处范围外的观察，不算新开的严重项。

## 1. 结论

| 严重项 | 本轮判断 |
|---|---|
| 严重 1：离开一组没做完的题（草稿） | 部分改 |
| 严重 2：做过一组练习后再测试（含「看了答案」跨组） | 已改 |
| 严重 3：结果页到知识点（含记录页） | 部分改 |
| 严重 4：跳过和第二组的作答记录 | 部分改 |

第三轮列的残留大多已处理：草稿按来源分开存、回顾页有单独的接着做按钮、节和章有「接着测」、`state.setPeeked` 每组清空、知识点页整页跟着知识点换、页头有「跳过 N」。还没解决的集中在三处：测试全写完但没交卷时离开或刷新、记录页内容、交过的题还能点「跳过」。

## 2. 严重 1：部分改

### 2.1 已改

- **草稿按来源分开。** `state.drafts` 以来源为键，`saveDraft()` 只写 `state.drafts[state.source]`，`startQueue()` 只在同一来源有未做完的草稿时弹「还有一组没做完」。今天和节的草稿可以同时留着，符合 07 §3.5「每个来源只保留一组草稿」。
- **回顾页的接着做是单独按钮，点了真的接着做。** `viewReview()` 用 `resumeLabel("review")` 出 `#resume-review` 和 `#abandon-review`；`bind()` 里 `#resume-review` 调 `resumeDraft("review")`，`bindAbandon("abandon-review", "review")`。「测一次」按钮 `#test` 只在 `state.drafts.test.testScope === "review"` 时改成「接着测」，点了调 `resumeDraft("test")`。第三轮说的「按钮写接着做、点下去进测试说明页」不再复现。
- **节和章有测试草稿入口。** `viewSection()`、`viewChapter()` 在 `state.drafts.test.testScope` 为 `"section"`、`"chapter"` 时，测试按钮写 `resumeLabel("test")`（「接着测 · 还剩 m 题」），旁边出 `#abandon-test`「放弃这次测试」。`#test-section`、`#test-chapter` 遇到同范围、有剩余的草稿直接 `resumeDraft("test")`。符合 07 §5.3。
- **练习草稿还剩 0 题时不再假装开新组。** `requestLeave()` 在 `unanswered(state.queue)` 为空时直接 `finishSet()` 出结果，不存草稿。`remaining()` 为 0 的草稿：`resumeLabel()` 返回空串，`#start` 走 `startQueue()`，`startQueue()` 因 `remaining(existing)` 为 0 直接 `beginQueue()`，标签「开始练 · 6 题」和实际去向一致。载入时会删掉 `remaining()` 为 0 的草稿。
- **做完后草稿被清掉。** `clearDraft()` 删 `state.drafts[source]` 并调 `persistDrafts()` 重写 `mc-proto-drafts`。`finishSet()`（含测试的 `gradeTest()` 路径）、`advance()` 的最后一题、`beginQueue()` 都调了 `clearDraft()`，`abandonDraft()` 也重写存储。存储键本身不删，删的是里面那一来源的条目，效果相同：做完的组刷新后不会再以草稿出现。
- **恢复时带回本组已交的记录。** `resumeDraft()` 恢复 `setMarks`、`setPeeked`、`skippedIds`、`testPicks`，并把 `setMarks` 逐项写回 `state.answers`。`persistDrafts()` 同时存 `answers`，载入时读回。第三轮说的「刷新后结果页总结行少算」按代码不再出现：`viewResult()` 用 `shownMark()`，先看 `setMarks`。
- **刷新后不再停在空做题页。** `onHash()` 遇到 `#/practice` 且 `state.queue` 为空时调 `newestDraft()`，按 `savedAt` 取最新的有剩余草稿，调 `resumeDraft()`；没有草稿则回今天页。
- **两种放弃一致了。** `abandonDraft()` 只在测试草稿时按 `baseline` 撤回记录（07 §5.3「整组不记」），练习草稿保留已交的题（07 §3.5「已交的 k 题保留」）。`startQueue()` 弹框和 `bindAbandon()` 都走 `abandonDraft()`。
- **关掉标签页后能恢复（按代码，桌面浏览器）。** `persistDrafts()` 同时写 `sessionStorage` 和 `localStorage` 的 `mc-proto-drafts`，载入时先读 `localStorage`。这个键不是产品的 `mc.records.v1`，符合 07 §0.1。关掉标签页时 `beforeunload` 若触发，`isDirty()` 为真就 `saveDraft()`，重开页面能读回。

### 2.2 仍在

1. **测试题全写了但没交卷，离开时会被直接交卷。** 测试模式下 `unanswered()` 把 `testPicks` 里有选项的题算作已答。孩子把 2 题（或 6 题）都选了、没点「交卷」就点导航或「‹ 返回」，`requestLeave()` 见 `unanswered` 为空，直接 `finishSet()` → `gradeTest()` 判分并进结果页，不弹「测试还没交卷」，也不去孩子点的目的页。07 §5.1 写测试中途离开「什么都不判，整组答案存为草稿」，§5.3 写回来时出「接着测」。这条不符合。
2. **同样情形刷新或关页，测试答案会丢。** `beforeunload` 照常 `saveDraft()`，但载入时 `remaining()` 为 0 的草稿被删，`newestDraft()` 也跳过它。结果是测试没判、答案没了、节或章页面也没有「接着测」。孩子看不到任何提示。
3. **测试草稿只有一份，不分发起页。** 测试都存在 `state.drafts.test`。节里有一次没做完的测试时，去回顾页点「测一次（2 题）」→「开始测试」，`startQueue()` 弹「还有一组没做完」，主按钮「接着测」接回的是节的 6 题测试，弹框文字没说是哪一次。回顾页本身不显示这次节测试的草稿（`testScope` 不是 `"review"`）。影响比第三轮小，不再是按钮写错，但孩子在回顾页会被带去节测试。
4. **平板上关页能否恢复没有把握。** 只靠 `beforeunload`，没有 `pagehide` 或 `visibilitychange`。iPad Safari 关标签页、切走后被系统回收时 `beforeunload` 常不触发；孩子没经过「先离开」弹框就关页，这一组可能存不下来。07 §3.5 的「关掉页面或平板锁屏」在桌面浏览器上按代码能验，在平板上要实测。

## 3. 严重 2：已改

### 3.1 已改

- **「看了答案」每组单独记。** `beginQueue()` 设 `state.setPeeked = {}`。提示第 5 级「还是要看」写 `state.setPeeked[item.id]`；`#submit` 判 `if (state.setPeeked[item.id]) record(item.id, "peek")`。全局的 `state.peeked` 只剩声明，代码里不再读写。第一组看过某题的完整解析，第二组同一题自己选对交上，记「做对了」，不再继承。
- **草稿里带着本组的看答案标记。** `saveDraft()` 存 `setPeeked`，`resumeDraft()` 恢复。离开再回来，本组看过答案的题仍记「看了答案」，别的组不受影响。
- **练过一组再测试，空着交卷会确认**（第三轮已改，本轮复核仍成立）：`beginQueue()` 清 `setMarks`、`testPicks`，`requestFinish()` 按本组算剩余。
- **节和章发起的测试回到发起页，导航高亮也对了。** `homeRoute()` 按 `testScope` 返回；`viewPractice()` 只在 `testScope === "review"` 时高亮「回顾」，节和章的测试高亮「课本」。草稿入口见 §2.1。

### 3.2 说明

- §2.2 第 1、2 条（测试全写完未交卷时离开或刷新）也会发生在「练习之后再测试」这条路上，但根因在草稿和离开的判断，已记在严重 1，这里不重复降级。

## 4. 严重 3：部分改

### 4.1 已改

- **「别用成」「先用」「前后」跟着知识点换。** `viewKp()` 的 `notes` 按 `state.kpName` 给四个知识点各自的 `avoid`、`use`、`before`、`after`。「三边关系」的「学完接着」是「三角形的记法（12.1）」，不再指向自己；「三角形的记法」的「别用成」是「把 △ABC 读成角 ABC」。正文 `bodies` 也按名字换。
- **跳过不写「你上次错在这里」。** `missed` 只认 `bad`、`empty`、`peek`，`skip` 不在内，符合 07 §1 跳过算「没做」。
- **「接着做」按知识点区分。** `viewKp()` 只在 `state.drafts.kp.kpName === state.kpName` 时出 `#resume-kp`；`saveDraft()` 存 `kpName`，`resumeDraft()` 恢复，做完离开时 `homeRoute()` 回到的是发起那组的知识点。
- **记录页列出四章。** `viewRecord()` 按 `CHAPTERS` 写四行：第 12 章写「要重做 n 道」，其他三章写「还没练过」，并说明示意题都在第 12 章。

### 4.2 仍在

- **记录页还不是 07 §8.4 要的内容。** §8.4 要「总题数、正确率、各章情况（点章 → P-CHAPTER），最近的变化」，§10.3 第 7 步要「看各章变化，本章正确情况更新」。现在四行是纯文字，点不进章；没有总题数、正确率；没有前后变化，只有当前要重做的数。从回顾测完再来记录页，看不出这次测试改变了什么。第三轮的建议是补上，或在门禁里写明记录页不在本期验收范围；两者都还没做。
- **四个章名没有标「待内容核对」。** `CHAPTERS` 写的是「第10章 分式」「第11章 实数和二次根式」「第12章 三角形」「第13章 事件与可能性」。评审员无法从原型里确认这是哪一版八年级上册的目录，原型页面也没有像别处那样标「默认，待内容核对」。这条不影响交互判断，留给内容核对。
- 知识点页「来源：课本第 74 页」四个点都一样，属于内容核对，不算本项残留。

## 5. 严重 4：部分改

### 5.1 已改

- **页头显示「跳过 N」和「回来做跳过的题」。** `viewPractice()` 用 `state.skippedIds` 里还没有最终记录的题算 `openSkips`，页头写「第 x / n 题 · 跳过 N」；当前题在 `openSkips` 里时再加「 · 回来做跳过的题」。交上之后这题有了最终记录，计数随之减少。符合 07 §3.4。
- **只跳过、没交任何题也算有内容。** `isDirty()` 在 `state.skippedIds.length` 不为 0 时返回真，离开会弹确认并存草稿；`saveDraft()`、`resumeDraft()` 带上 `skippedIds`，回来后页头的跳过计数还在。
- **第二组不继承第一组的作答和看答案标记**（第三轮已改本组记录，本轮 `setPeeked` 也已分组，见 §3.1）。
- 第三轮说的 `#skip` 末尾两个相同分支已删。

### 5.2 仍在

- **交过的题还能点「跳过」，会改掉已记的结果。** `viewPractice()` 在练习模式下不论 `state.revealed` 都画「跳过」按钮。孩子交完一题、看到「对了」或「不对」后点「跳过」而不是「下一题」：
  - 本组还有别的没交的题时，`#skip` 把这题挪到末尾并清掉 `revealed`。轮到它时题面重新可选，`openSkips` 因它已有最终记录而不显示「回来做跳过的题」，孩子再交一次，`record()` 覆盖原来的记录。原来「做错了」可以变成「做对了」，这题就离开了回顾。
  - 这是本组最后一题时，`othersOpen` 为假，`record(current, "skip")` 把刚记的「做对了」或「做错了」改成「跳过了」，然后出结果。结果页和回顾都按跳过算。
  - 07 §3.4 写「交过的题：不能改答案」。这条不符合，而且直接影响跳过和作答记录，所以本项不能算已改。

## 6. 范围外的观察（不开新项）

- `mc-proto-drafts` 写在 `localStorage`，连同 `answers` 一起长期保留，原型里没有清空入口。做用户测试前要手动清掉，否则下一个孩子会看到上一个人的记录和草稿。
- 在结果页刷新时 `state.queue` 为空，`viewResult()` 退回到全部 6 题并按全局记录显示，不一定是刚做的那一组。
- `bindAbandon()` 弹框的按钮是「放弃这一组 / 再想想」，07 §3.5 写的是「放弃 / 接着做」。只是文案差异。

## 7. 对门禁的意见

- 严重 2 本轮判断为已改；严重 1、3、4 各有能从代码推出的残留。本文件不把 M4–M8 中任何一项标成通过，也不建议现在宣布 M5、M7 通过。
- 建议下一步处理：
  1. 测试模式下离开和刷新不按「已选」当「已交」：`requestLeave()` 在测试模式下不要因为都选了就 `finishSet()`，载入时不要删「都选了但没交卷」的测试草稿。
  2. 练习中一题交过后隐藏「跳过」，或让 `#skip` 对已有最终记录的题等同「下一题」。
  3. 记录页补总题数、正确率、点章进入和前后变化；或在门禁里写明记录页不在本期验收范围。

## 8. 说明

- 这不是通过。第四轮只复核严重项，不是通过。
- 这不是用户测试。没有孩子参与，评审员也没有操作浏览器，判断来自阅读 `prototype/app.js`。
- 平板上关页恢复（§2.2 第 4 条）需要在真实 iPad 上手点验证，本轮没有做。
