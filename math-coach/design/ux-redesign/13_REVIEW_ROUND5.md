# 第五轮交叉评审意见（只复核严重项）

- 负责人：第五轮独立评审员（子代理）。没有写过 06、07、08，也没有改过 `prototype/app.js`
- 版本：0.1
- 更新时间：2026-11-05 +08:00
- 关联：`12_REVIEW_ROUND4.md` §2.2、§4.2、§5.2、§7，`07_INTERACTION.md` §3.4、§3.5、§5.1、§5.3、§8.4、§10.3，`prototype/app.js`（`index.html` 引用 `app.js?v=8`，1023 行）
- 状态：第五轮只复核严重项，不是通过

## 0. 这份意见是什么、不是什么

- 本轮只看第四轮留下的残留：严重 1、3、4 的「仍在」各条，以及确认严重 2 的 `setPeeked` 仍按组记。判断依据是当前 `prototype/app.js`，不是修改方的说明。
- 评审员没有操作浏览器，判断来自逐行阅读代码。下文写的「会出现」都是按代码推出的结果，没有手点验证。
- 这不是真实用户测试，没有孩子参与。
- 中等项、建议项不在本轮范围。本文件不改产品代码，不改原型，不改 `PROJECT_STATE.json` 和总览。

## 1. 结论

| 严重项 | 第四轮 | 本轮判断 |
|---|---|---|
| 严重 1：离开一组没做完的题（草稿） | 部分改 | 部分改：第四轮点名的残留都已改，本轮新发现一条串草稿的路径 |
| 严重 2：做过一组练习后再测试（「看了答案」跨组） | 已改 | 已改（复核仍成立） |
| 严重 3：结果页到知识点（含记录页） | 部分改 | 部分改：记录页补了数和入口，但仍不满足 07 §8.4 |
| 严重 4：跳过和第二组的作答记录 | 部分改 | 已改 |

## 2. 严重 1：部分改

### 2.1 第四轮的残留：已改

1. **测试全选了但没交卷，离开不再交卷。** `requestLeave()` 现在写的是 `if (state.mode !== "test" && !unanswered(state.queue).length) { finishSet(); return; }`，测试模式不进这条分支。测试里 `isDirty()` 因 `state.testPicks` 非空为真，弹「测试还没交卷 / 已写的答案会留着，交卷前不会判对错。」，「先离开」调 `saveDraft()` 后 `go(dest)`，去孩子点的目的页，不调 `gradeTest()`。`onHash()` 的浏览器返回路径也走 `requestLeave()`，同样不判分。全文调用 `finishSet()` 的只有 `requestLeave()`（仅练习）、`requestFinish()`（孩子点「交卷」）和 `#skip`（仅练习）。符合 07 §5.1「中途离开：什么都不判，整组答案存为草稿」。
2. **全选未交卷的测试草稿刷新后还在。** 新增 `stillOpen()`：测试草稿只要队列里还有题在 `setMarks` 里没有最终记录就算开着，不再看 `remaining() === 0`。载入时删草稿、`newestDraft()` 选草稿、`resumeLabel()`、`viewSection()`、`viewChapter()`、`viewReview()`、`startQueue()` 以及 `#start`、`#test`、`#test-section`、`#test-chapter` 都改用 `stillOpen()`。测试交卷前 `setMarks` 为空，所以全选的草稿会留下。`resumeLabel()` 对剩余 0 题的测试写「接着测 · 还没交卷」。刷新时 `beforeunload` 和新增的 `pagehide` 都在 `isDirty()` 为真时 `saveDraft()`。
3. **测试草稿按发起页分开存。** `bucket()` 对测试返回 `"test:" + scope`，即 `test:section`、`test:chapter`、`test:review`；`saveDraft()`、`beginQueue()`、`startQueue()`、`finishSet()`、`advance()` 都用 `bucket(state.source, state.testScope)` 算键。`bindAbandon()` 按当前页选对应的键。载入时把旧的 `state.drafts.test` 迁到 `test:<scope>`。
4. **从回顾开始测试，不会接回节或章的测试。** `#test` 只查 `state.drafts["test:review"]`，没有才设 `state.testScope = "review"` 进说明页；`#begin-test` → `startQueue(ids, "test", "test")` 的键是 `test:review`，弹框只针对回顾自己的测试草稿。节和章同理，各查各的键。`viewReview()` 的「接着测」也只看 `test:review`。

### 2.2 本轮新发现：浏览器返回能把节或章的测试写进回顾的草稿

`state.testScope` 是全局的，测试草稿的键在每次 `saveDraft()` 时按它现算。孩子离开测试后，`state.queue` 仍是那组测试；`#test`、`#test-section`、`#test-chapter` 会先改 `state.testScope` 再进说明页。如果此时用浏览器返回（平板上就是左滑返回）回到 `#/practice`，`onHash()` 见 `state.queue` 非空，直接 `render()` 内存里的旧测试，不经 `resumeDraft()`，`testScope` 也不会恢复。按代码推出的一条路径：

1. 节页点「测一下这一节」→「开始测试」，选了第 1 题，点导航「回顾」→「先离开」。`test:section` 存下草稿。
2. 回顾页点「测一次（2 题）」，`state.testScope` 变成 `"review"`，进说明页。
3. 浏览器返回两次，经 `#/review` 回到 `#/practice`。页面显示的是节的 6 题测试，导航高亮「回顾」（`viewPractice()` 按 `testScope === "review"` 判断）。
4. 选任一题或再次离开，`saveDraft()` 把这组 6 题写进 `test:review`。

之后回顾页的「接着测 · 还剩 m 题」接回的是节的 6 题测试，交卷后结果页主按钮是「回到回顾」；`finishSet()` 只清 `test:review`，`test:section` 里那份旧草稿还在，节页继续显示「接着测」，再交一次会重新判分覆盖记录。这和本项要求的「开始回顾测试不能接回节或章的测试」相抵触，只是触发要靠浏览器返回。

建议：测试草稿在开组时把键定下来（例如存在 `state` 上，`saveDraft()` 用它，不按当前 `testScope` 现算）；或 `onHash()` 回到 `#/practice` 时总是按草稿 `resumeDraft()`；或改 `testScope` 前先清空内存里的旧队列。

### 2.3 范围外记录（不算本项残留）

- 第四轮 §2.2 第 4 条（平板关页）：本轮已加 `pagehide`，没有加 `visibilitychange`。iPad 上关页或锁屏后能否恢复仍要真机验证，本轮没有做。
- 测试离开弹框的主按钮写「接着做」，07 测试里用的是「接着测」。只是文案差异。

## 3. 严重 2：已改（复核仍成立）

- `beginQueue()` 仍设 `state.setPeeked = {}`，每组从空开始。
- 提示第 5 级「还是要看」写 `state.setPeeked[item.id] = true` 并 `record(item.id, "peek")`；`#submit` 判 `if (state.setPeeked[item.id]) record(item.id, "peek")`。
- `saveDraft()` 存 `setPeeked`，`resumeDraft()` 恢复，草稿只带本组的标记。
- 全局 `state.peeked` 只剩第 35 行的声明，全文没有读写。第一组看过答案的题，第二组自己选对交上，按代码记「做对了」。
- 本轮在严重 2 范围内没有发现退步。§2.2 的串草稿路径也会出现在「练习之后再测试」上，根因在草稿键，记在严重 1，不在这里降级。

## 4. 严重 3：部分改

### 4.1 已改

`viewRecord()`：

- 写「做了 N 道，做对 c 道，正确率 r%」，`total` 取 `state.answers` 里有最终记录的题，`rate` 四舍五入。
- 四章按 `CHAPTERS` 列出，每行都带「待内容核对」。第 12 章是按钮 `#open-record-ch`，`bind()` 里调 `go("chapter")`，打开第 12 章页；其他三章写「还没练过 · 待内容核对」。
- 写「最近的变化：第 12 章现在要重做 n 道。没有上一次的数可以比。」，没有编造前后对比。
- 没有记录时的空状态写「还没有做题记录。记录只保存在这台平板的浏览器里。」，主按钮「去今天的练习」。

### 4.2 仍不满足 07 §8.4

- **没有真实的前后变化。** §8.4 要「最近的变化」，§10.3 第 7 步要「看各章变化，本章正确情况更新」。页面明说「没有上一次的数可以比」，这是诚实的，但等于这一条没有做：原型没有保存每次的历史，测完回顾再来记录页，只能看到当前数字，看不出这次测试改变了什么。
- **没有导入导出。** §8.4 的「导出」「导入」块、读不出文件时的提示、合并确认都没有；空状态里 §9 要的文字链接「导入以前的记录」也没有。页底的「关于这些数据」链接同样没有。
- **数的口径与 07 §1 不一致。** `state.answers` 每题只存最近一次的分类，所以「做了 N 道」是题数，不是作答次数；`total` 把 `skip` 也算进去，07 §1 把跳过算「没做」，跳过会拉低正确率。
- 所以本项按 §8.4 仍不通过。要么补历史记录和导入导出，要么在门禁里明确写「记录页的变化和导入导出不在本期原型验收范围」。两者都还没做。

## 5. 严重 4：已改

- **交过的题不再显示「跳过」。** `viewPractice()` 用 `const canSkip = state.mode !== "test" && !state.revealed && !isFinal(state.setMarks[item.id]);` 决定画不画 `#skip`。交一题（含「就这样交」的 `empty`、看答案的 `peek`）都先 `record()` 再设 `state.revealed = true`，所以交过的题按钮不出现。从草稿恢复时 `revealed` 和 `setMarks` 一起恢复，结论相同。
- **处理函数也拦住了。** `#skip` 的 `onclick` 开头 `if (isFinal(state.setMarks[current])) return;`，对已有最终记录的题直接返回，不调 `record()`，不挪位置，不调 `finishSet()`。第四轮说的「最后一题交完点跳过，把做对改成跳过」和「挪到末尾再交一次覆盖记录」按代码都不会再发生。
- 被跳过、还没交的题回来时 `setMarks` 里是空的，仍可再跳过，符合 07 §3.4。
- 第四轮 §5.1 已改的部分（页头「跳过 N」「回来做跳过的题」、只跳过也算有内容）本轮复核仍成立。

## 6. 对门禁的意见

- 本轮判断：严重 2、4 已改；严重 1 第四轮的残留已改，但新发现 §2.2 的串草稿路径，所以仍是部分改；严重 3 记录页仍不满足 07 §8.4。
- 本文件不把 M4–M8 中任何一项标成通过，也不建议现在宣布 M5、M7 通过。
- 建议下一步：
  1. 修 §2.2：测试草稿的键在开组时定下，不随全局 `testScope` 变化；或回到 `#/practice` 时一律按草稿恢复。
  2. 记录页：补历史和导入导出，或在门禁里写明不在本期验收范围；顺带统一「做了 N 道」和正确率的口径。
  3. 在 iPad 上手点验证关页、锁屏后的草稿恢复。

## 7. 说明

- 这不是通过。第五轮只复核严重项，不是通过。
- 这不是用户测试。没有孩子参与，评审员也没有操作浏览器，判断来自阅读 `prototype/app.js`。
