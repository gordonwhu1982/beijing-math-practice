# 图谱界面交付单（R1–R6）

> 这份是**公用交付文档**：谁接手都先读这里，再读 `docs/STATE.md` §7（不可推翻的决策）与 §12（变更记录）。
> 每条都写死「怎么判」，不接受「看着还行」。

## 用户原始验收（2026-11-03，m20000 / m20543）

1. **R1** 总图默认全区域显示（画布吃满内容区，不被右栏挤压）。
2. **R2** 点开一个点，右侧详情卡**浮在画布上**（overlay），不挤压版面。
3. **R3** 总图连线更弱化（更淡更细，不抢视觉）。
4. **R4** 节点文字不许显示不全。
5. **R5** 从题目返回图谱后绘制混乱要修。
6. **R6** 多 agent 共同审核与交付，中间文档/公用文档可被其他 agent 复用。

设计要求还有一条总纲：**基于最新代码架构改造，不推翻架构**（用户 m20000：「不要回退所有修改」）。

## 现状：每条怎么判、判到什么数

| 项 | 判据（机器可判） | 实测 | 证据 |
|---|---|---|---|
| R1 | `#/map` 下 `#cy` 宽 ≥ 内容区宽 × 0.95，且与 `.mapstage` 同宽 | cyW 1138 / stageW 1140 | `out/probe_r125.js` TOTAL |
| R2 | 详情卡 `position` 为 absolute，且开卡前后 `#cy` 宽度不变 | detailPos=absolute，cyW 恒 1138 | 同上；`out/team/map-qa-v4.md` |
| R3 | 边样式：`prerequisite_of` opacity ≤0.5、width ≤1.2 | 0.45 / 1.2px | `out/probe_r125.js` |
| R4 | 章级档：26 章卡片 + 6 册标签 = 32 节点，label 全非空、卡片不重叠、字宽算得进卡宽；章内档：`#map-names` 点开后条目 ≥60、分节 ≥8 | 32 节点 / bad 0 / overlap 0；99 条 / 12 节 | `map-overview`、`map-names` 两条冒烟断言 |
| R5 | 从 `#/kp` 或练习页回到 `#/map` 后：`svg` 无 NaN 属性、画布尺寸恢复、图例在 | nanAttr 0、cyW 1138、legend true | `out/probe_r125.js` BACK / BACKTOTAL |
| R6 | 三份独立复核报告 + 本文件 + 断言进闸门 | 见下 | `out/team/*.md` |

## 分档行为（改之前先认清是哪一档）

| 档位 | 触发条件 | 画的是什么 |
|---|---|---|
| 六册全景 | `#/map`（无 vol/ch/node） | 26 张章卡片 + 6 个册名，章间先修实线 + 同册教材顺序虚线（`buildChapterMap()`） |
| 单章 | `#/map?vol=801&ch=12` | 这一章的章 / 节 / 知识点 / 方法（cytoscape 云图），右侧可开「点名」浮层 |
| 十字方位 | `#/map?node=<id>` | 纯 DOM 卡片：上=前置 / 中=当前 / 下=后续 / 右=方法 / 同章 |
| 方法 / 思想 / 骨架 | `view=skill|thought|skeleton` | 云图 + 右栏讲解 |

## 团队分工与产物（R6）

| 角色 | 成员 | 产物 | 结论要点 |
|---|---|---|---|
| 视觉设计复核 | agency-design-ux-researcher | `out/team/cmap-design.md` | 待补 |
| UX 检验 | ux-v2 | `out/team/cmap-ux.md`（110 行） | 十字档可用；P0 章内「回到总图」白屏、去练习丢焦点；P1 章内提示文案错档 |
| 测试验证 | arch-v2 | `out/team/cmap-qa.md`（128 行）+ `cmap-qa.json` / `cmap-recount.json` | P0 章间先修线只画 29/83；P1 窄屏只冷启动切列表；P2 章级档仍显示思想 chips |

三条 P0/P1/P2 已全部修完并进断言（`docs/STATE.md` 决策 50/51/52）。

## 判据坑（别重复踩）

1. **CDP 同 URL `Page.navigate` 是 no-op**：测 430 宽必须加 `?cb=` 强制重载，否则误报「列表没生效」。
2. **`nd.style('width')` 返回 `'auto'`**：cytoscape 卡片宽要读 `data('w')`。
3. **点画布坐标要加 `#cy` 的 `getBoundingClientRect()` 偏移**，否则点了没反应还以为是 bug。
4. **全页截图里 fixed 元素只落在首屏**：`#tabs` 左侧栏截到一半不等于布局坏了。
5. **绝对定位的子元素，`bottom` 是相对父盒算的**：`.map-side` 用 `bottom:10` 想象中的是视口，实际父盒 `.mapwrap` 高 987，浮层底部就冲出去 77px；浮层高度必须按视口算（`paintSide()` 里 `window.innerHeight - rc.top - 16`），并有一条 `fit` 断言钉住。
6. **「有元素、有字、没 `hidden`」不等于看得见**：`#map-cross` 高 0 时内容全被裁掉，屏幕空白而三条特征全满足。判据 `GHOST` 直接量 rect（高或宽 < 8 即红），负例可验（把测量里的 hidden 判断去掉就红）。
7. **判据要先分清「界面缺陷」与「判据缺陷」**：本轮 `search-alias` / `search-type` 两条红是判据过时（要求 hash 恰为 `#/map`，而焦点态现在写 `node=`），不是界面坏了。

## 下一步（未做，勿当成已完成）

- 章级档的章卡片宽度上限 268：两章原始宽度 290 / 277 撞上限，`measureText` 实测 260 未截断，余 8px，属临界。
- 1280 十字档内容高 827 > 900 视口时需滚 56px。
- 430 返回图谱时 `scrollY` 被重置（700 → 0）。
