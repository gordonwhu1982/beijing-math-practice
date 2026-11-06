# 第六轮交叉评审意见（只复核严重 1、严重 3，并确认严重 2、4 没有退步）

- 负责人：第六轮独立评审员（子代理）。没有写过 06、07、08，也没有改过 `prototype/app.js`
- 版本：0.1
- 更新时间：2026-11-05 +08:00
- 关联：`13_REVIEW_ROUND5.md` §2.2、§4.2，`07_INTERACTION.md` §1、§3.4、§3.5、§5.1、§8.4、§9、§10.3，`prototype/app.js`（`index.html` 引用 `app.js?v=9`，约 1094 行）
- 状态：第六轮只复核严重项，不是通过

## 0. 这份意见是什么、不是什么

- 本轮只看三件事：第五轮 §2.2 的串草稿路径（严重 1）、记录页与 07 §8.4 的差距（严重 3）、严重 2 和严重 4 在 v=9 里有没有退步。判断依据是当前 `prototype/app.js`，不是修改方的说明。
- 评审员没有操作浏览器，判断来自逐行阅读代码。主会话手点的结果只用来对照，下文写的「会出现」都是按代码推出的，没有手点验证。
- 这不是真实用户测试，没有孩子参与。
- 第五轮及以前留下的中等 11 条、建议 9 条不在本轮范围，本文件不重开。
- 本文件不改原型、`runtime/`、`content/`、`tools/`、已有页面、`PROJECT_STATE.json`、`00_DESIGN_OVERVIEW.md`、`ITERATION_LOG.md`。

## 1. 结论

| 严重项 | 第五轮 | 本轮判断 |
|---|---|---|
| 严重 1：离开一组没做完的题（草稿） | 部分改 | 部分改：第五轮 §2.2 的浏览器返回路径已堵上；但 v=9 引入一处退步，从别的页开测试时会拿上一次测试的草稿弹框 |
| 严重 2：做过一组练习后再测试（「看了答案」跨组） | 已改 | 已改（v=9 没有退步） |
| 严重 3：结果页到知识点（含记录页） | 部分改 | 部分改：补了导出、导入、关于这些数据，正确率排除跳过；「最近的变化」仍不是前后对比，空状态仍缺「导入以前的记录」 |
| 严重 4：跳过和第二组的作答记录 | 已改 | 已改（v=9 没有退步） |

## 2. 严重 1：部分改

### 2.1 第五轮 §2.2 的路径：已改

v=9 把「说明页上要测哪里」和「正在做的那组测试属于哪里」分成两个字段：

- `#test`、`#test-section`、`#test-chapter` 现在只写 `state.pendingScope`，不再改 `state.testScope`。全文给 `state.testScope` 赋值的只剩 `resumeDraft()`（取草稿里的 `testScope`）和 `beginQueue()`（`if (source === "test" && state.pendingScope) state.testScope = state.pendingScope;`）。
- `beginQueue()` 和 `resumeDraft()` 同时设 `state.liveScope`，开组或接回时把这组测试的范围定下。
- `saveDraft()` 对测试用 `state.liveScope` 算键：`const scope = state.source === "test" && state.liveScope ? state.liveScope : state.testScope;`，并把 `scope` 写进草稿的 `testScope` 和 `key`。`finishSet()` 也优先用 `state.liveScope` 算要清的键。
- `viewBrief()` 用 `state.pendingScope || state.testScope` 决定写 2 道还是 6 道，所以说明页显示的是孩子刚点的范围，不影响内存里那组测试。

按代码走第五轮那条路径：离开章测试后，`state.queue` 仍是章的 6 题，`testScope` 和 `liveScope` 都是 `"chapter"`；回顾页点「测一次（2 题）」只把 `pendingScope` 改成 `"review"`；浏览器返回到 `#/practice` 时 `onHash()` 见 `state.queue` 非空直接 `render()`，`viewPractice()` 按 `testScope === "chapter"` 高亮「课本」，页头仍是 6 题、主按钮「交卷」；再离开或选题时 `saveDraft()` 用 `liveScope` 写回 `test:chapter`，不会写出 `test:review`。

从节测试走同一条路，`liveScope` 是 `"section"`，键是 `test:section`，结论相同。`homeRoute()`、`viewResult()` 读的 `testScope` 只在开组或接回时改，和 `liveScope` 一致，返回页和结果页主按钮也不会串。

这和主会话手点看到的 `mc-proto-drafts` 里只有 `review`、`test:chapter`、`today`，没有 `test:review` 一致。

### 2.2 v=9 引入的退步：从别的页开测试，会拿上一次测试的草稿弹框

`#begin-test` 调 `startQueue(ids, "test", "test")`，而 `startQueue()` 仍按全局字段算键：

```
const key = bucket(source, state.testScope);
```

v=8 里点「测一次」会先把 `testScope` 改成 `"review"`，所以这里算出的是 `test:review`（第五轮 §2.1 第 4 条据此判已改）。v=9 改成只写 `pendingScope`，`testScope` 要到 `beginQueue()` 才更新，于是 `startQueue()` 查的是上一次那组测试的键。按代码推出的路径（不需要浏览器返回）：

1. 章页「测一下这一章」→「开始测试」，选了第 1 题，点导航「回顾」→「先离开」。`test:chapter` 存下草稿，`testScope` 是 `"chapter"`。
2. 回顾页点「测一次（2 题）」。`#test` 查 `test:review` 没有草稿，设 `pendingScope = "review"`，进说明页，写 2 道。
3. 点「开始测试」。`startQueue()` 算出 `test:chapter`，`stillOpen()` 为真，弹「还有一组没做完 / 先做完或放弃这一来源的那一组，再开新的。」
4. 选右边主按钮「接着测」：`resumeDraft("test:chapter")`，孩子从回顾进去，做的是章的 6 题测试。选「放弃这次测试」：`abandonDraft("test:chapter")` 删掉章测试的草稿，再开回顾的 2 题。

节和章互相也一样：离开节测试后去章页点「测一下这一章」→「开始测试」，弹框指向 `test:section`。反过来，第一次打开页面时 `testScope` 默认 `"review"`，如果回顾测试有草稿没交，从节页开测试会拿回顾的草稿弹框。

这条路径不会把一组题写进错误的键，`resumeDraft()` 接回后 `liveScope` 也正确，所以不算第五轮那种「写串」。但它违反第五轮已判改好的「从回顾开始测试，不会接回节或章的测试」，并且弹框文字只说「这一来源」，孩子看不出要放弃的是章的测试，选错一次就丢掉另一页的草稿。主会话手点停在说明页没有点「开始测试」，所以没有碰到。

建议：`startQueue()` 对测试用 `bucket(source, state.pendingScope || state.testScope)` 算键，或在 `#begin-test` 里直接把键算好传进去。改完要再手点一次上面第 1 至 4 步，以及「节测试离开 → 章页开测试」。

### 2.3 范围外记录（不算本项残留）

- iPad 关页、锁屏：仍只有 `beforeunload` 和 `pagehide`，没有 `visibilitychange`。主会话没有实机点过，本轮也没有。
- `pendingScope` 开组后不清空。按代码它只在说明页和 `beginQueue()` 被读，进说明页前总会被重设，本轮没有找到因此出错的路径；但如果直接打开 `#/brief`，说明页会沿用上一次的值。

## 3. 严重 2：已改（v=9 没有退步）

- `beginQueue()` 仍设 `state.setPeeked = {}`，每组从空开始。
- 提示第 5 级「还是要看」写 `state.setPeeked[item.id] = true` 并 `record(item.id, "peek")`；`#submit` 判 `if (state.setPeeked[item.id]) record(item.id, "peek")`。
- `saveDraft()` 存 `setPeeked`，`resumeDraft()` 恢复，草稿只带本组的标记。
- 全局 `state.peeked` 仍只有声明，全文没有读写。
- v=9 的改动集中在 `saveDraft()`、`beginQueue()`、`resumeDraft()`、`finishSet()` 的键和记录页，没有动上面这几处。§2.2 的弹框问题根因在测试草稿的键，记在严重 1，不在这里降级。

## 4. 严重 3：部分改

### 4.1 已改

`viewRecord()`、`downloadRecord()`、`readImport()`：

- **正确率口径。** `graded` 排除 `skip`，`total`、`correct`、`rate` 都按 `graded` 算，文案「交过 N 道，做对 c 道，正确率 r%。跳过的不算进正确率。」，和 07 §1「跳过 = 没做」一致。`gradeTest()` 把测试里没写的题记成 `skip`，也被排除。
- **各章情况。** 四章按 `CHAPTERS` 列出，第 12 章是按钮 `#open-record-ch`，进 P-CHAPTER；其他三章写「还没练过 · 待内容核对」。
- **导出。** `downloadRecord()` 生成 `mc-proto-record.json`（只含 `answers` 和 `priorOwed`），完成后写「已导出，文件在下载里。」，和 §8.4 一致。
- **导入。** `readImport()` 解析失败或没有 `answers` 时写「这个文件打不开，换一个试试。」，不改记录。读出后弹「导入这些记录？ / 导入后会和这台平板上的记录合并，共 x 条。」，`openDialog()` 的右边主按钮是「先不导入」，左边次按钮是「导入」，和 §8.4、§0.3 第 9 条一致。合并时跳过 `questionById()` 找不到的题号和不是最终分类的值，然后 `persistDrafts()`，只写 `mc-proto-drafts`。全文没有 `mc.records`，不写产品键。
- **关于这些数据。** 页底是文字链接 `#about-data`，空状态里没有。点开写「这是原型里的示意记录，不是产品的依据页，也不会写进仓库。」，原型没有 P-EVIDENCE，这样写是诚实的。

### 4.2 仍不满足 07 §8.4

- **「最近的变化」不是前后对比，而且这个数在常见路径上不更新。** `state.priorOwed` 只在 `finishSet()` 里设，值是交卷前 `retryIds().length`。问题有三处：
  1. 练习每交一题，`record()` 就把分类写进 `state.answers`，所以练习走 `finishSet()` 时，「交卷前」的数已经包含这一组大部分结果，「上一回」和「现在」只差提前交卷补记的跳过。
  2. 练习最后一题交完点「下一题」走的是 `advance()`，不经 `finishSet()`，`priorOwed` 根本不更新。也就是孩子正常做完一组练习，记录页的「上一回」还是更早某次测试或提前交卷时的数。
  3. 只存一个全局数，没有按章，也不是正确率。07 §10.3 第 7 步要「看各章变化，本章正确情况更新」，这里只能看到全局「要重做」从几道到几道，并且只对测试和提前交卷算得准。

  所以 `priorOwed` 不是多次成绩历史，也不能稳定地回答「这次做完变了什么」。`priorOwed` 为 `null` 时写「还没有上一次的数可以比」是诚实的，但数一旦有了，可能是过期的。
- **空状态缺「导入以前的记录」。** 07 §9 的 P-RECORD 空状态要求文字链接「导入以前的记录」，并写「换设备或清理浏览器就看不到了」。`viewRecord()` 在 `!seen` 时只返回一句和「去今天的练习」，没有导入入口，也没有后半句。换平板后第一次打开记录页正是最需要导入的时候。
- **导入确认里的条数可能偏大。** `count = Object.keys(data.answers).length` 数的是文件里的全部键，合并时会跳过未知题号和无效分类，所以「共 x 条」可能多于实际合并的条数。属于小问题，记在这里供修改时一并处理。
- 「交过 N 道」是题数，不是作答次数（`state.answers` 每题只存最近一次）。07 §8.4 写「总题数」，这个口径可以接受，但和「多次历史」无关，不能拿来补上面第一条。

### 4.3 本项判断

导出、导入、关于这些数据、正确率口径都已写进原型，比第五轮前进了一大步；但 §8.4 的「最近的变化」没有做到，`priorOwed` 在正常做完练习时不更新，空状态缺导入入口。按 §8.4 仍是部分改。

要么补每次交卷的简单历史（至少按章记交卷前后的正确数，`advance()` 和 `finishSet()` 都写），要么在门禁里明确写「记录页的前后变化不在本期原型验收范围」，并把文案改成不会显示过期数的说法。两者都还没做。

## 5. 严重 4：已改（v=9 没有退步）

- `viewPractice()` 仍用 `const canSkip = state.mode !== "test" && !state.revealed && !isFinal(state.setMarks[item.id]);` 决定画不画 `#skip`。交一题（含「就这样交」的 `empty`、看答案的 `peek`）都先 `record()` 再设 `state.revealed = true`，交过的题不出现「跳过」。
- `#skip` 的 `onclick` 开头仍是 `if (isFinal(state.setMarks[current])) return;`。只剩当前题时 `record(current, "skip")` 后调 `finishSet()`，练习的键不看 `scope`，v=9 对 `finishSet()` 的改动不影响这里。
- 被跳过、还没交的题回来时 `setMarks` 里是空的，仍可再跳过，符合 07 §3.4。

## 6. 对门禁的意见

- 本轮判断：严重 2、4 已改；严重 1 第五轮的路径已改，但 v=9 在 `startQueue()` 引入 §2.2 的退步，所以仍是部分改；严重 3 补了导入导出，但「最近的变化」和空状态导入入口仍不满足 07 §8.4 和 §9，仍是部分改。
- 本文件不把 M4–M8 中任何一项标成通过，也不建议现在宣布 M5、M7 通过。
- 建议下一步：
  1. 修 §2.2：`startQueue()` 对测试按 `pendingScope` 算键，改完手点「章测试离开 → 回顾测一次 → 开始测试」和「节测试离开 → 章页开测试」。
  2. 记录页：让 `advance()` 结束一组时也记下变化，或改成按章存每次交卷前后的数；空状态加「导入以前的记录」；导入确认的条数按实际能合并的算。或者在门禁里写明记录页的前后变化不在本期验收范围。
  3. 走完一轮导入：导出文件后清掉 `mc-proto-drafts`，再导入，看合并结果和条数。
  4. 在 iPad 上手点验证关页、锁屏后的草稿恢复。

## 7. 说明

- 这不是通过。第六轮只复核严重项，不是通过。
- 这不是用户测试。没有孩子参与，评审员也没有操作浏览器，判断来自阅读 `prototype/app.js`，主会话手点的结果只作对照。
