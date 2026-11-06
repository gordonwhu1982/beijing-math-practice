# M6 视觉复评

- 负责人：独立视觉评审员（只复查上一轮剩下的三处版面）
- 版本：0.3
- 更新时间：2026-11-05 +08:00
- 关联：提交 `a7502e9`；`prototype/index.html` 第 7、17 行是 `app.css?v=42`、`app.js?v=42`
- 状态：通过。只复查这三处，不表示第一阶段通过

## 0. 审什么

上一轮 `20_REVIEW_M6.md` 只剩三处版面。本轮只核这三处：

1. `08_DESIGN_SYSTEM.md` §5.3 列表行是否写了 x 和 y。
2. §5.5 侧栏卡片是否只有 y 104，正文不再写卡片从 y 88 开始。视图切换条占到 y 88 不算卡片的 y。
3. `prototype/app.css` 是否有 `.chapter-body { height: 1200px }`、`.chapter-side { height: 480px }`、`.kp-page { height: 1280px }`、`.kp-rel` 三列 480px 且 `gap: 48px`、`.kp-rel section { height: 240px }`、`.stats .card { width: 616px; height: 240px }`。

`git log -1` 是 `a7502e9 fix(体验设计): 补上结果行坐标和三处区域高度`。没有改原型。字号上一轮已经对上，本轮不再打开。

## 1. 结论

**通过。**

三处都在。

## 2. 三处核对

### 2.1 结果页列表行有 x 和 y

`08_DESIGN_SYSTEM.md` §5.3 第 302 行：

「第一行 x 0，y 392，1944×120。后面每一行的 y 等于上一行的底边，尺寸仍是 1944×120。」

第一行写了 x 0、y 392。后面每一行的 y 由上一行的底边定出。

### 2.2 侧栏卡片只有 y 104

§5.5 第 335 行表格：侧栏卡片「x 1310，y 104，宽 794，高 640」。

第 337 行正文：「卡片从 y 104 开始，视图切换条占 y 0 到 y 88」。卡片的 y 是 104。视图切换条占到 y 88，不是卡片的 y。全文没有「卡片从 y 88 开始」。

### 2.3 样式里的高和三列都在

`prototype/app.css`：

| 要求 | 位置 | 写的是什么 |
|---|---|---|
| `.chapter-body { height: 1200px }` | 第 339 行 | `height: 1200px` |
| `.chapter-side { height: 480px }` | 第 341 行 | `height: 480px` |
| `.kp-page { height: 1280px }` | 第 345 行 | `height: 1280px` |
| `.kp-rel` 三列 480px，`gap: 48px` | 第 346 行 | `grid-template-columns: 480px 480px 480px`，`gap: 48px` |
| `.kp-rel section { height: 240px }` | 第 347 行 | `height: 240px` |
| `.stats .card { width: 616px; height: 240px }` | 第 355 行 | `width: 616px; height: 240px` |

## 3. 判定

M6 上一轮剩下的三处版面通过。

本文件只复查这三处。不宣布第一阶段通过，也不判定 M4、M5、M7、M8。
