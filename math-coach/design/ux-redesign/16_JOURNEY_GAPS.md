# 三条旅程还断在哪

- 谁写的：UX 设计师
- 日期：2026-11-05
- 说明：只根据代码判断，没有手点浏览器。不是通过

对照 `07_INTERACTION.md` 第 10 节和 `prototype/app.js` 的 `go(`、`startQueue`、`data-result-kp`、`to-review`、`see-section`。一步的结束按页面上的按钮到得了，记为走得通。

## 10.1 今天练一节，做完看结果，错的回到知识点再练

| 步骤 | 页面 | 判断 | 依据 |
|---|---|---|---|
| 1 | P-TODAY | 走得通 | 打开或导航进入 `today`。`#start` 调用 `startQueue` 进练习第 1 题；`#see-section` 执行 `go("section")`。 |
| 2 | P-PRACTICE | 走得通 | 交一题后显示对错；第 5 级提示先 `openDialog`。最后一题主按钮是「看这一组结果」，`advance` 执行 `go("result")`。中途离开走 `requestLeave` 存草稿。 |
| 3 | P-RESULT | 走得通 | 做错、空着交、看了答案有 `data-result-kp`，设 `kpFrom` 为 result 后 `go("kp")`，来源条是「从这一组的结果来 · 回到结果」。不点错题时 `#to-today` 回今天。 |
| 4 | P-KP | 走得通 | 有定义；从结果进来且对得上错题时有「你上次错在这里」。`data-kp-jump` 推进 `kpTrail`，面包屑多一级。`#redo-kp` 再练；`#back-from` 回结果后可点「只练错的」。 |
| 5 | P-PRACTICE | 走得通 | `#redo-kp` 的 `startQueue` 进入练习。交题、提示和「看这一组结果」仍是 `viewPractice`。 |
| 6 | P-RESULT | 走得通 | 结果页写出这一组对错。做对记成 ok 后，`retryIds` 不再收录。非测试来源有「回到今天」。 |
| 7 | P-TODAY | 走得通 | `sectionDone` 时出现「12.1 练过」。还有欠题时写「有 n 道要重做」，旁边 `#to-review` 执行 `go("review")`。 |

## 10.2 从课本或图谱进入一章，看懂这一节再做题

| 步骤 | 页面 | 判断 | 依据 |
|---|---|---|---|
| 1a | P-BOOK | 走得通 | `#toggle-vol` 展开或收起八年级上册。`#open-ch` 把 `chapterFrom` 设为 book 并 `go("chapter")`。 |
| 1b | P-MAP | 走不通 | 初始 `mapChapter` 为 true、`mapCard` 为 false，右边没有「打开这一章」。点章节列会取消已选中的章，卡片仍不出现。再点一次才会 `mapCard = true`。 |
| 2 | P-CHAPTER | 走得通 | `data-open-sec` 执行 `go("section")`。`backTarget` 在 `chapterFrom` 为 map 时回图谱，否则回课本。 |
| 3 | P-SECTION | 走得通 | 页上有「这一节讲什么」。`data-kp-name` 执行 `go("kp")`。「返回」按 `backTarget` 回章。 |
| 4 | P-KP | 走得通 | 定义在页上。有前置的点用 `data-kp-jump` 加一级面包屑。「返回」先退 `kpTrail`，退完回节；面包屑「12.1」直接 `go("section")`。 |
| 5 | P-SECTION | 走得通 | 节页 `#start` 调用 `startQueue`，按钮是「开始练 · 6 题」，进入练习第 1 题。 |
| 6 | P-PRACTICE | 走得通 | 与 10.1 步 2 同一套作答、提示、交卷和离开。 |
| 7 | P-RESULT | 走得通 | 错题仍是 `data-result-kp`。练习有错时主按钮是「只练错的」，「回到今天」在主按钮之外。 |

## 10.3 从回顾再测一次

| 步骤 | 页面 | 判断 | 依据 |
|---|---|---|---|
| 1 | P-REVIEW | 走得通 | 导航或今天的 `#to-review` 进入。有欠题时 `weakPoints` 写出原因，`data-weak-name` 执行 `go("kp")`。 |
| 2 | P-KP | 走得通 | 来源条是「从回顾来 · 回到回顾」。`#back-from` 和「返回」都回回顾，并有「你上次错在这里」。 |
| 3 | P-REVIEW | 走得通 | 勾选后 `#test` 执行 `go("brief")`。说明屏「开始测」调用 `startQueue` 进测试；「先不测」回回顾，勾选还在。 |
| 4 | P-TEST | 走得通 | 测试不画提示，交卷前不显示对错。「先跳过」写入 `testSkipped`，题号可 `data-jump` 回去。最后一题主按钮是「交卷」。离开走 `requestLeave`，回来是「接着测」。 |
| 5 | P-RESULT | 走得通 | `gradeTest` 写入「稳了 a 个，还不稳 b 个」，结果页显示这句。错题可回知识点。主按钮 `#to-review` 是「回到回顾」。 |
| 6 | P-REVIEW | 走得通 | 回顾用这句更新列表。做对后不再留在 `retryIds` 的点会从「不稳的地方」消失。可以留在回顾，或用导航进记录。 |
| 7 | P-RECORD | 走得通 | 导航「我的记录」进入。`noteChange` 的前后题数写在「最近的变化」。 |

## 还要补的主路径

1. 10.2 步 1b：图谱分层里第 12 章默认已选中，右边没有「打开这一章」。按旅程点一次章节列会取消选中，卡片不出现，这一支进不了章。

`v=35` 已改点击顺序：章已经选中、卡片没开时，点一次打开「打开这一章」；卡片开着再点一次才取消选中。这不是通过。
