# M5 严重项复评

- 负责人：独立交互评审员（子代理）。本轮只复评上一轮三条严重项，不改原型
- 版本：0.1
- 更新时间：2026-11-05 19:32 +08:00
- 关联：`18_REVIEW_M5.md` 第 1.1 节的三条；`prototype/app.js`（`prototype/index.html` 引用 `app.js?v=39`，提交 `d243548`）
- 状态：这三条通过。本文件只复评这三条，不宣布第一阶段通过，也不给其他里程碑或其他缺口下结论

判断依据是这几个函数能走出的行为：`viewBook`、`viewReview`、`persistDrafts`、`applyPlace`、`rememberScroll`、`restoreScroll`、`go`、`onHash`、`pagehide`。没有用浏览器手点。全景的两指缩放、单指平移、双击空白复位不计入。

## 1. 结论

**通过。**

上一轮不通过的三条，现在都在对应函数里做到了。

## 2. 三条对照

1. **P-BOOK 有加载状态。** `viewBook` 在 `hashParam("load") === "1"` 时直接返回，内容区写「正在打开……」，不再画出册和章列表。
2. **P-REVIEW 有加载状态。** `viewReview` 在 `load=1` 时直接返回。左栏「要重做的题」和右栏「不稳的地方」各自写「正在打开……」，不再画出两栏正文。
3. **离开后恢复滚动；重新打开后册的展开、图谱选中、回顾勾选还在。** `rememberScroll` 按当前路由记下 `#main` 的 `scrollTop`。`go` 在改路由前记下离开页，画出新页后用 `restoreScroll` 设回去，并调用 `persistDrafts`。`onHash` 在路由变化时同样先记后恢复；脚本末尾的 `onHash()` 会用已经读回的滚动位置画第一页。`pagehide` 先 `rememberScroll` 再 `persistDrafts`。`persistDrafts` 把 `bookOpen`、`mapMode`、`mapPoint`、`mapCard` 以及同页的筛选和卡片字段、`checked`、`scrolls` 写入 `mc-proto-drafts`。重新打开时读回这块记录并调用 `applyPlace`。`viewBook` 用 `bookOpen` 决定展开或收起，`viewMap` 用 `mapPoint` 和 `mapCard` 画出选中项和卡片，`viewReview` 用 `checked` 勾选对应的点。
