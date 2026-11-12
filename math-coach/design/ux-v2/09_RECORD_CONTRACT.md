# 09 记录契约：草稿与作答怎么落盘

现状是两套：原型写 `mc-proto-drafts`（sessionStorage + localStorage），产品写 `mc.records.v1`（只 localStorage，只追加）。本轮不合并，但要**把映射定下来**，否则迁移那天数据会断。

## 1. 产品侧（权威）

`runtime/web/js/store.js`：key `mc.records.v1`，值是数组，一行一条作答事件。

| 字段 | 含义 |
|---|---|
| `schema_version` | 1 |
| `uid` | 事件唯一号（自带时间戳） |
| `item` | 题 id，如 `12.1_bas_01` |
| `sec` / `volume` / `chapter` | 节号（不带册）、册、章 |
| `band` | 难度档 |
| `ts` | 毫秒时间戳 |
| `verdict` | 判定：对/错/判不了 |
| `final` | 最终结果：correct / wrong / blank / manual |
| `how` | 怎么来的：exact / letter-* / spec-* / skip / unknown |
| `hint` | 提示使用：`none` 或级别 |
| `seconds` | 用时 |
| `ref` / `reasons` | 判定依据 |

写失败要留痕（`MC.store.lastError`），界面不许照常显示「已记录」。

## 2. 原型侧（草稿，只为一组题续做）

key `mc-proto-drafts`，值是对象：`{ [bucketKey]: draft }`，`bucketKey = bucket(source, scope, queue)`。

draft 字段（app.js:575 起）：`queue[]`（题 id 数组）、`index`、`mode`（practice/test）、`source`、`picked{}`、`revealed{}`、`hintOpen`、`hintFold{}`、`hintPanel`、`testPicks{}`、`testSkipped{}`、`testMarks{}`、`savedAt`。

## 3. 映射（迁移时必须逐条对）

| 产品字段 | 原型里从哪来 | 现在缺什么 |
|---|---|---|
| `item` | `draft.queue[draft.index]` | — |
| `sec`/`volume`/`chapter` | 由当前节推出 | 原型多处写死 12.1（FD-02/03） |
| `ts` | 交卷/交题时 `Date.now()` | 原型只有 `savedAt`，是草稿时间不是作答时间 |
| `verdict` | `picked` 与答案比对 | 原型没有独立 verdict，判对错在渲染层算 |
| `final` | 同上 | **没有 blank / manual 两个态**（空卷与「判不了」无法区分） |
| `how` | `revealed` / `hintOpen` / 跳过标记 | 语义对不齐（产品有 exact/letter/spec/skip） |
| `hint` | `hintFold` 的最高档 | 原型记「展开过」不记「看到第几级」 |
| `seconds` | — | **完全没有计时** |

## 4. 本轮要求（R3 交付，不改行为）

1. 草稿 key 带题 id（FD-06）：`bucket()` 的入参里加入 queue 的首题 id + 题数，避免两题互相覆盖。
2. 新增**作答事件缓冲**：交一题就往 `draft.events[]` 追加一条 `{item, verdict, final, how, hint, ts}`，字段名照产品侧写。不写 localStorage 的 `mc.records.v1`（原型隔离），但**字段名与产品一致**，R5 迁移时直接搬。
3. 明确三态：`correct` / `wrong` / `blank`（空卷或跳过）/ `manual`（判不了，等自己对答案）。界面上这四类**必须分列**，不许把 blank 并进 wrong。
4. 写失败（sessionStorage/localStorage 满）要在界面上说一句，不许静默。