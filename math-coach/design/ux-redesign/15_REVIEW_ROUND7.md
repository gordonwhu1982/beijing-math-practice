# 第七轮交叉评审意见（只复核第六轮留下的严重 1、严重 3，并确认严重 2、4 没有退步）

- 负责人：第七轮独立评审员（子代理）。没有写过 06、07、08，也没有改过 `prototype/app.js`
- 版本：0.1
- 更新时间：2026-11-05 +08:00
- 关联：`14_REVIEW_ROUND6.md` §2.2、§4.2，`07_INTERACTION.md` §1、§8.4、§9、§10.3，`prototype/app.js`（`index.html` 第 15 行引用 `app.js?v=10`，约 1127 行）
- 状态：第七轮只复核严重项，不是通过

## 0. 这份意见是什么、不是什么

- 本轮只看三件事：第六轮 §2.2 的测试草稿弹框退步（严重 1）、记录页与 07 §8.4、§9 的差距（严重 3）、严重 2 和严重 4 在 v=10 里有没有退步。判断依据是当前 `prototype/app.js`，不是修改方的说明。
- 评审员没有操作浏览器，判断来自逐行阅读代码。主会话手点的结果只用来对照，下文写的「会出现」「不会出现」都是按代码推出的。
- 这不是真实用户测试，没有孩子参与。
- 第六轮及以前留下的中等 11 条、建议 9 条不在本轮范围，本文件不重开。
- 本文件不改原型、`runtime/`、`content/`、`tools/`、已有页面、`PROJECT_STATE.json`、`00_DESIGN_OVERVIEW.md`、`ITERATION_LOG.md`。

## 1. 结论

| 严重项 | 第六轮 | 本轮判断 |
|---|---|---|
| 严重 1：离开一组没做完的题（草稿） | 部分改 | 已改：`startQueue()` 按 `pendingScope \|\| testScope` 算键，和 `beginQueue()`、`#begin-test` 用同一个范围；章测试还在时从回顾开测、节测试还在时从章页开测，都不会拿另一页的草稿弹框，也不会删另一页的草稿 |
| 严重 2：做过一组练习后再测试（「看了答案」跨组） | 已改 | 已改（v=10 没有退步） |
| 严重 3：结果页到知识点（含记录页） | 部分改 | 已改（按原型范围）：「最近的变化」现在是一组开始和结束时第 12 章做对数的前后对比，`advance()` 和 `finishSet()` 都写；空状态与 07 §9 逐字一致并有「导入以前的记录」；导入条数只数能合并的题。§8.4 没有要求多次成绩历史，本轮不把它当缺口。留一处导入后的小矛盾（§4.3），不改变判断 |
| 严重 4：跳过和第二组的作答记录 | 已改 | 已改（v=10 没有退步） |

## 2. 严重 1：已改

### 2.1 键怎么算

v=10 在三处用同一个表达式决定测试范围：

- `viewBrief()`：`const scope = state.pendingScope || state.testScope;`，决定说明页写 2 道还是 6 道。
- `#begin-test` 的 `onclick`：同一表达式取 `scope`，按它选题（`review` 取 `q1`、`q4`，其他取 6 题），并回写 `state.pendingScope = scope`，再调 `startQueue(ids, "test", "test")`。
- `startQueue()`：`const scope = source === "test" ? (state.pendingScope || state.testScope) : state.testScope;`，`const key = bucket(source, scope);`。

`beginQueue()` 里 `if (source === "test" && state.pendingScope) state.testScope = state.pendingScope;`，随后 `state.liveScope = state.testScope`，`clearDraft(bucket(source, state.liveScope))`。因为 `#begin-test` 已经把 `pendingScope` 写成非空的 `scope`，`startQueue()` 查的键、弹框里 `abandonDraft(key)` 删的键、`beginQueue()` 清的键、新一组 `saveDraft()` 写的键（`liveScope`）是同一个。第六轮 §2.2 的根因（`startQueue()` 读的是上一组的 `testScope`）已经去掉。

`#test`、`#test-section`、`#test-chapter` 三个入口在进说明页前，先查本页自己的键（`test:review`、`test:section`、`test:chapter`），有没交的草稿就直接 `resumeDraft()` 接回，否则把 `pendingScope` 设成本页的范围。所以走正常入口时，`startQueue()` 的弹框只可能指向本页的草稿，实际上很难出现。

### 2.2 两条路径按代码走一遍

**章测试还在，回顾点开始测试。**

1. 章测试离开后，`state.drafts["test:chapter"]` 存在，`testScope`、`liveScope` 都是 `"chapter"`。
2. 回顾页「测一次（2 题）」：`#test` 查 `test:review` 没有草稿，设 `pendingScope = "review"`，进说明页，`viewBrief()` 写 2 道。
3. 「开始测试」：`scope = "review"`，`startQueue()` 算出 `test:review`，没有草稿，不弹框，直接 `beginQueue()`。`beginQueue()` 只清 `test:review`，`test:chapter` 不动。
4. 这组回顾测试里 `saveDraft()` 用 `liveScope = "review"`，只写 `test:review`；交卷时 `finishSet()` 用 `liveScope` 只清 `test:review`；`viewResult()` 按 `testScope = "review"` 给「回到回顾」。

**节测试还在，章页点开始测试。** 同理：`#test-chapter` 设 `pendingScope = "chapter"`，`startQueue()` 查 `test:chapter`，不碰 `test:section`；这组章测试结束后只清 `test:chapter`。

第六轮提到的反向情况（初次打开时 `testScope` 默认 `"review"`，回顾测试有草稿没交，从节页开测）也一样：`#test-section` 把 `pendingScope` 设成 `"section"`，键是 `test:section`，不会再指向 `test:review`。

这和主会话手点对照一致：回顾「测一次」再「开始测试」直接进 2 题、节页「测一下这一节」再「开始测试」直接进 6 题，都没有弹框；节测试交卷后主按钮是「回到这一节」；恢复存储后章页仍是「接着测 · 还没交卷」，键仍是 `test:chapter`。

### 2.3 范围外记录（不算本项残留）

- `pendingScope` 开组后仍不清空，`resumeDraft()` 也不改它。按代码，`#begin-test` 只在说明页出现，正常进说明页前三个入口都会重设 `pendingScope`，本轮没有找到因此串键的路径。直接在地址栏打开 `#/brief` 会沿用上一次的值，但说明页显示、选题、算键用的是同一个值，不会出现说一套做一套。
- iPad 关页、锁屏：仍只有 `beforeunload` 和 `pagehide`，没有 `visibilitychange`。主会话没有实机点过，本轮也没有。

## 3. 严重 2：已改（v=10 没有退步）

- `beginQueue()` 仍设 `state.setPeeked = {}`，每组从空开始。
- 提示第 5 级「还是要看」仍写 `state.setPeeked[item.id] = true` 并 `record(item.id, "peek")`；`#submit` 仍判 `if (state.setPeeked[item.id]) record(item.id, "peek")`。
- `saveDraft()` 存 `setPeeked`，`resumeDraft()` 恢复，草稿只带本组的标记。
- 全局 `state.peeked` 仍只有声明，全文没有读写。
- v=10 的改动集中在 `startQueue()`、`beginQueue()`（多了 `chapterBefore`）、`noteChange()`、`finishSet()`、`advance()`、`viewRecord()`、`readImport()`、`downloadRecord()`，没有动上面这几处。

## 4. 严重 3：已改（按原型范围）

### 4.1 「最近的变化」

- `chapterOk()` 数 `QUESTIONS` 里 `state.answers[id] === "ok"` 的题数。原型题全在第 12 章，所以它就是第 12 章当前做对的题数。
- `beginQueue()` 在开组时设 `state.chapterBefore = chapterOk()`；`saveDraft()` 把 `chapterBefore` 存进草稿，`resumeDraft()` 取回，中途离开再接着做不会丢开组时的数。
- `noteChange()`：`chapterBefore` 是数字时写 `state.lastChange = { before: chapterBefore, after: chapterOk() }`，然后把 `chapterBefore` 置空。
- `finishSet()`（测试交卷、练习提前交卷、跳过最后一题）先 `gradeTest()` 或 `markUnansweredSkipped()`，再 `noteChange()`，所以 `after` 已包含本组补记的跳过和测试判分。
- `advance()`：练习最后一题交完点「下一题」时，先 `noteChange()` 再清键进结果页。第六轮 §4.2 第 2 处（正常做完一组练习不更新）已补上。测试的最后一题按钮是「交卷」，走 `requestFinish()` → `finishSet()`，不会经 `advance()` 漏判分。
- `persistDrafts()` 把 `lastChange` 写进 `mc-proto-drafts`，启动时读回，刷新后不丢。
- `viewRecord()` 写「最近的变化：第 12 章上一回做对 X 道，现在 Y 道。」，没有 `lastChange` 时写「还没有上一次的数可以比。」。

第六轮 §4.2 的三处问题对照：

1. 「交卷前的数已包含这一组大部分结果」：现在的 `before` 取自开组时，不再是交卷前，已解决。
2. 「`advance()` 不更新」：已解决。
3. 「只存一个全局数，不是按章」：仍只存最近一组，但它标明是第 12 章的做对数。原型只有第 12 章的题，其他三章在 `viewRecord()` 里写「还没练过 · 待内容核对」，是诚实的。

主会话对照里先出现「上一回做对 1 道，现在 0 道」，再出现「上一回做对 0 道，现在 1 道」，和上面的代码一致：节测试把之前做对的题记成 `skip`，做对数从 1 降到 0；随后知识点再练一题做对，回到 1。

**关于「仍缺各章多次成绩」。** 07 §8.4 写的是「总题数、正确率、各章情况、最近的变化」，§10.3 第 7 步写「看各章变化，本章正确情况更新」。两处都没有要求多次成绩的历史列表。v=10 能回答「最近一组做完，本章做对的题从几道变成几道」，满足「最近的变化」和「本章正确情况更新」。其他三章没有题，原型无法也不应编出成绩。所以本轮不把多次成绩历史当作严重 3 的缺口。产品实现时要按章分别存这个前后数，不能沿用写死的「第 12 章」，这是交给开发的说明，不是原型残留。

### 4.2 空状态和导入

- 空状态（`!seen`）的话是「还没有做题记录。记录只保存在这台平板的浏览器里，换设备或清理浏览器就看不到了。」，主按钮「去今天的练习」，文字链接 `#import-empty`「导入以前的记录」，和 07 §9 的 P-RECORD 一行逐字一致。空状态里没有「关于这些数据」，符合 §8.4「不出现在空状态」。
- `#import-empty` 的 `onclick` 调空状态里隐藏的 `#import-record` 的 `click()`，`#import-record` 的 `onchange` 调 `readImport()`，和非空状态的导入走同一个函数。
- `readImport()` 现在先算 `keys = Object.keys(data.answers).filter(questionById(id) && isFinal(...))`，确认框写「共 keys.length 条」，合并时也只遍历 `keys`。确认条数等于实际合并条数，第六轮的条数偏大问题已解决。确认框右边主按钮仍是「先不导入」，左边是「导入」。文件打不开仍写「这个文件打不开，换一个试试。」，记录不变。
- `downloadRecord()` 导出 `answers` 和 `lastChange`，不再导出 `priorOwed`。`persistDrafts()` 和启动读回仍带 `priorOwed`，但 `viewRecord()` 已不读它，属于无害的旧字段。

### 4.3 留一处小矛盾（不改变本项判断）

`readImport()` 确认导入后，如果文件里有 `lastChange`，会直接覆盖本机的 `state.lastChange`。文件里的 `lastChange` 描述的是导出那台设备最后一组的前后数，而合并后本机的 `chapterOk()` 可能不同。导入后记录页可能出现「交过 N 道，做对 c 道」与「最近的变化：…现在 Y 道」里的 c 和 Y 对不上（两者在原型里本应相等）。

这只在导入路径上出现，不影响正常练习和测试，且导入文件还没有走完一轮。建议在走导入那一轮时一并处理：要么导入后按合并前后的 `chapterOk()` 重写 `lastChange`，要么导入时不覆盖本机的 `lastChange`。

### 4.4 本项判断

第六轮 §4.2 列的「前后对比不成立」「`advance()` 不更新」「空状态缺导入入口」「导入条数偏大」四处，v=10 都已改。§8.4 的总题数、正确率（跳过不算）、各章情况、最近的变化、导入导出块、「关于这些数据」，§9 的 P-RECORD 空状态，都在原型里有对应。按原型范围判已改。§4.3 的小矛盾和导入未走完一轮，记为待验证事项，不是本项的残留缺口。

## 5. 严重 4：已改（v=10 没有退步）

- `viewPractice()` 仍用 `const canSkip = state.mode !== "test" && !state.revealed && !isFinal(state.setMarks[item.id]);` 决定画不画 `#skip`。交一题（含「就这样交」的 `empty`、看答案的 `peek`）都先 `record()` 再设 `state.revealed = true`，交过的题不出现「跳过」。
- `#skip` 的 `onclick` 开头仍是 `if (isFinal(state.setMarks[current])) return;`。只剩当前题时 `record(current, "skip")` 后调 `finishSet()`，`finishSet()` 里新加的 `noteChange()` 只写 `lastChange`，不改分类。
- 被跳过、还没交的题回来时 `setMarks` 里是空的，仍可再跳过，符合 07 §3.4。

## 6. 对门禁的意见

- 本轮判断：严重 1 已改；严重 2、4 没有退步，维持已改；严重 3 按原型范围已改。
- 这不等于 M4–M8 任何一项通过。本文件不宣布通过，也不建议仅凭本轮就宣布 M5、M7 通过。是否通过由门禁另行决定。
- 还没有验证、需要在门禁前补的事：
  1. 走完一轮导入：导出文件后清掉 `mc-proto-drafts`，从空状态的「导入以前的记录」选文件导入，看确认条数、合并结果，以及 §4.3 的「做对 c 道」与「现在 Y 道」是否一致。
  2. 在 iPad 上手点验证空状态的「导入以前的记录」能弹出选文件（链接触发的是隐藏的 `input`，没有在 Safari 上点过）。
  3. 在 iPad 上手点验证关页、锁屏后的草稿恢复。
  4. 手点本文件 §2.2 的两条路径时，再加一步：回顾测试交卷后回到章页，确认「接着测」能接回原来的章测试并交卷。

## 7. 说明

- 这不是通过。第七轮只复核严重项，不是通过。
- 这不是用户测试。没有孩子参与，评审员也没有操作浏览器，判断来自阅读 `prototype/app.js`，主会话手点的结果只作对照。
