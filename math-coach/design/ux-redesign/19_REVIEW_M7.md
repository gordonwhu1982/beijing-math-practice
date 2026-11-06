# M7 复评：我的记录的返回

- 负责人：独立原型评审员（只复评上一轮 M7 的不通过项）
- 版本：原型 `design/ux-redesign/prototype/index.html` 引用 `app.js?v=39`、`app.css?v=39`
- 更新时间：2026-11-05
- 关联：`07_INTERACTION.md` 第 10.3 节第 7 步、T-11；`design/ux-redesign/prototype/app.js` 的 `backTarget`、`go`、`topBar`、`open-record-ch`
- 状态：不通过。只复评这一条，不表示第一阶段通过

本文只做代码走查。没有打开浏览器，没有改原型。

## 结论

**不通过。**

从记录打开的章，返回可以回到记录。记录页经过这次返回之后，返回到不了进入记录之前的那一页。

走不通的函数：`go`、`onHash`。记录页的返回目标由 `backTarget` 读出。

## 依据

上一轮不通过，是因为路由为 `record` 时 `backTarget` 给出空字符串，`topBar` 不画 `#top-back`。这一轮 `backTarget` 在记录页返回 `state.recordFrom || "review"`，`topBar` 画出「‹ 返回」。`bind` 里 `#top-back` 取 `backTarget()`，再调用 `go`。

还没打开章时，进入记录能记住来路。`go` 在目的地是 `record`、当前路由不是 `record` 时，把 `recordFrom` 写成当前路由。从回顾进记录，`recordFrom` 是 `review`。这时点返回，`backTarget` 给出 `review`，`go("review")` 回到进入前的页面。`onHash` 在地址变成 `record`、当前还不是记录时，同样写下 `recordFrom`。

打开章也能先回到记录。`bind` 里 `#open-record-ch` 先把 `chapterFrom` 写成 `"record"`，再 `go("chapter")`。这次目的地是 `chapter`，`recordFrom` 还留着。章页上 `backTarget` 看到 `chapterFrom === "record"`，返回 `"record"`。`topBar` 画出返回。点下去调用 `go("record")`，画面回到记录。

同一次 `go("record")` 把来路写掉。调用时当前路由仍是 `chapter`，`route === "record" && state.route !== "record"` 成立，`recordFrom` 变成 `"chapter"`。记录页重画后，`backTarget` 返回 `"chapter"`。再点返回进入章。章的 `chapterFrom` 仍是 `"record"`，章上的返回又回到记录。进入记录之前的那一页，用这个返回走不回去。

用浏览器从章退到 `#/record` 时，`onHash` 在改 `state.route` 之前执行 `state.recordFrom = state.route`。当时路由还是章，`recordFrom` 同样变成 `"chapter"`。

## 两条判断

| 判断 | 结果 | 函数 |
|---|---|---|
| 记录页的返回回到进入前的页面 | 走不通 | 单独进入时 `go` 记下 `recordFrom`，`backTarget` 和 `#top-back` 能回去。从章回到记录时，`go` 和 `onHash` 把 `recordFrom` 改成 `"chapter"`，`backTarget` 随后指向章 |
| 从记录打开的章，返回回到记录 | 走通 | `#open-record-ch` 设置 `chapterFrom`；`backTarget` 在章页返回 `"record"`；`topBar` 的 `#top-back` 调用 `go("record")` |

整条因此不通过。本文不判断第一阶段。
