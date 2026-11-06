# M7 复查：我的记录的来路

- 负责人：独立原型评审员（只复查上一轮这一条）
- 版本：原型 `design/ux-redesign/prototype/index.html` 引用 `app.js?v=40`、`app.css?v=40`
- 提交：`34b8278`（`fix(体验原型): 从章回到记录时保留原来的来路`）。当前工作区里这两个原型文件与该提交一致
- 更新时间：2026-11-05
- 关联：`design/ux-redesign/prototype/app.js` 的 `noteRecordFrom`、`go`、`onHash`、`backTarget`
- 状态：通过。只复查这一条，不表示第一阶段通过

本文只做代码走查。没有打开浏览器，没有改原型。

## 结论

**通过。**

从回顾进记录，再进章，再回记录，再点返回，来路仍是回顾。

## 依据

`noteRecordFrom` 先看从哪进来。来路是 `chapter` 且 `chapterFrom` 为 `"record"` 时，函数直接返回，不改 `recordFrom`。其他非空、且不是记录自己的来路，才写入 `recordFrom`。

`go` 在目的地是 `record`、当前路由还不是 `record` 时调用 `noteRecordFrom(state.route)`，然后再把 `state.route` 改成目的地。`onHash` 在地址变成 `record`、当前路由还不是 `record` 时同样调用 `noteRecordFrom(state.route)`，然后再把 `state.route` 写成地址里的路由。两条路都在改路由之前记下或保留来路。

按这条顺序走：

1. 从回顾进记录。当前路由是 `review`，`go("record")` 调用 `noteRecordFrom("review")`。来路不是章，`recordFrom` 写成 `"review"`。
2. 再进章。`#open-record-ch` 先把 `chapterFrom` 写成 `"record"`，再 `go("chapter")`。这次目的地不是记录，`noteRecordFrom` 不跑，`recordFrom` 仍是 `"review"`。
3. 再回记录。章页 `backTarget` 看到 `chapterFrom === "record"`，返回 `"record"`。`#top-back` 调用 `go("record")`。此时当前路由仍是 `chapter`，`noteRecordFrom("chapter")` 因 `chapterFrom` 为 `"record"` 直接返回，`recordFrom` 保持 `"review"`。浏览器从章退回 `#/record` 时，`onHash` 在路由还是章的时候调用同一个函数，来路同样保持 `"review"`。
4. 再点返回。记录页 `backTarget` 返回 `state.recordFrom`，也就是 `"review"`。`#top-back` 调用 `go("review")`，回到回顾。
