# M2 评审

- 评审员：独立评审（只评 M2）
- 日期：2026-11-05
- 范围：现状主要页面是否有可打开的真实运行截图
- 结论：**不通过**

本结论只覆盖 M2 的截图门禁。

## 门禁

主要现状页面要有可打开的真实运行截图，作为改版前的现状基线。`design/ux-redesign/screenshots/density/` 和 proposed 没有计入。

依据只取 `04_CURRENT_UI_AUDIT.md` 的开头、走查路径、主导航说明，以及 `screenshots/current/INDEX.md`。页面是否真有画面，以 `screenshots/current/` 目录里的文件能否打开为准。

## 目录里实际有的文件

`design/ux-redesign/screenshots/current/` 共 22 个文件：

- `INDEX.md`
- `PAGE-001-today.png`
- `PAGE-002-toc.png`
- `PAGE-005-map.png`
- `PAGE-007-thoughts.png`
- `SHOT-010-today-pad.png`
- `SHOT-011-today-12.1.png`
- `SHOT-012-practice-12.1.png`
- `SHOT-013-practice-hint.png`
- `SHOT-014-sec-12.1.png`
- `SHOT-015-sec-12.1-answer.png`
- `SHOT-016-kp-12.1-01.png`
- `SHOT-017-map-network.png`
- `SHOT-018-map-layers.png`
- `SHOT-019-map-ch12.png`
- `SHOT-020-map-kp-methods.png`
- `SHOT-021-weak-empty.png`
- `SHOT-022-archive-empty.png`
- `SHOT-023-evidence.png`
- `SHOT-024-retry-empty.png`
- `SHOT-025-rel-12.1-01.png`
- `SHOT-026-map-panorama.png`

没有 `PAGE-003`、`PAGE-004`、`PAGE-006`、`PAGE-008` 至 `PAGE-012` 这些文件名。索引把这些页面记在 `SHOT-012` 至 `SHOT-025` 上。

## 文件能否打开

`SHOT-010` 至 `SHOT-026` 是合法 PNG，尺寸都是 1180×820。抽看后，画面是正在运行的「北京数学练习」：今日、选定 12.1、练习、提示、节页、知识点、图谱的网络 / 分层 / 第 12 章 / 知识点卡片 / 全景、哪里不稳、档案、依据总览、错题重练、前后知识点。

`PAGE-001-today.png`、`PAGE-002-toc.png`、`PAGE-005-map.png`、`PAGE-007-thoughts.png` 的文件头不是合法 PNG 签名（`0D` 被拿掉），按原文件打不开。

- 今日、图谱另有上面的 SHOT，这两页仍有可打开的运行截图。
- 目录只有 `PAGE-002-toc.png`。在仓库外的临时副本里补回签名中的那一个字节后，能解出 1440×900 的章节目录。仓库里的原文件仍然打不开，不能当作可用基线。
- 思想只有 `PAGE-007-thoughts.png`。补回同一个字节后，PNG 块仍然损坏，解不出画面。

## 主要页面

主要页面取审计写明的主导航，加上索引里单独列出、并且审计开头走查路径会打开的页面。

审计写明本轮没点的界面，不算缺主要页面：目录某一册的展开、章图、骨架、知识点档、方法档、错因档、思想档、交卷之后的对错和回顾、薄弱页有记录时的样子、手机宽度。

| 页面 | 可打开的运行截图 | 结果 |
|---|---|---|
| 今日 | `SHOT-010-today-pad.png`、`SHOT-011-today-12.1.png` | 有 |
| 目录 | 无。仅有的 `PAGE-002-toc.png` 打不开 | 缺 |
| 图谱 | `SHOT-017` 至 `SHOT-020`、`SHOT-026` | 有 |
| 档案 | `SHOT-022-archive-empty.png` | 有 |
| 练习 | `SHOT-012-practice-12.1.png`、`SHOT-013-practice-hint.png` | 有 |
| 节页 | `SHOT-014-sec-12.1.png`、`SHOT-015-sec-12.1-answer.png` | 有 |
| 知识点 | `SHOT-016-kp-12.1-01.png` | 有 |
| 前后知识点 | `SHOT-025-rel-12.1-01.png` | 有 |
| 哪里不稳 | `SHOT-021-weak-empty.png` | 有 |
| 依据总览 | `SHOT-023-evidence.png` | 有 |
| 错题重练 | `SHOT-024-retry-empty.png` | 有 |
| 思想 | 无。仅有的 `PAGE-007-thoughts.png` 打不开，也解不出画面 | 缺 |

## 缺的页面

- 目录
- 思想

## 结论

**不通过。** 缺目录、思想的真实运行截图。
