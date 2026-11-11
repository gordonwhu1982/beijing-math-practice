# 内容计数

- 负责人：教育内容核对
- 时间：2026-11-09
- 状态：计数完成

本次只数数据文件里的字段和挂接。没有改 runtime，没有删题目。画面有没有把这些字段画出来，记 NOT_VERIFIED。

## 口径

目录 `runtime/web/data/sec` 里共 444 个 `.js`。每个文件都是 `window.MC.put("键", JSON)`。脚本先截取 JSON，再用 `json.loads` 解析。444 个文件和 `runtime/web/data/graph.js` 都解析成功，失败 0。

| 键前缀 | 文件数 | 本次怎么用 |
|---|---:|---|
| `sec:` | 148 | 节文件，知识点从这里的 `kps` 计 |
| `items:` | 148 | 题目文件 |
| `ex:` | 148 | 顶层只有 `items`、`no`、`title`。不计入节文件，不计入知识点 |

知识点按 `kp_type` 分。核心知识点 = `kp_type` 不是 `context`、也不是 `activity`。`kp_type` 缺失 0。

字段记「有」的条件：

- `definition`：字符串去掉空白后还有字。
- `conditions`、`boundaries`、`objectives`、`thoughts`、`methods`：数组长度至少 1。空数组记「数据没有」。
- `textbook.page`：`textbook` 是对象，且带 `page`，`page` 不是 null、也不是空字符串。

选择题的节：该节至少一题 `form` 等于 `choice`，且 `opts.key` 不是 null、也不是空字符串。

`context` 15 个、`activity` 1 个的字段填得满不满，不在下面的保留率里，记 NOT_VERIFIED。

## 1. 节与知识点

| 项 | 数量 | 分母 |
|---|---:|---|
| 节文件 | 148 | 目录 `.js` 444 个，其中 `sec:` 148 个 |
| 知识点 | 687 | 这 148 个节文件的 `kps` 条目 |
| 核心知识点 | 671 | 687 减去 context 15、activity 1 |
| context | 15 | 单独计，不进核心 |
| activity | 1 | 单独计，不进核心 |

`kp_type` 分布：concept 173，skill 105，method 95，property 91，theorem 74，formula 44，fact 40，representation 27，model 22，context 15，activity 1。合计 687。

148 个节里，4 个节的 `kps` 是空数组：`801-ch-end-10.js`、`801-ch-end-11.js`、`801-ch-end-12.js`、`801-ch-end-13.js`。知识点 uid 重复 0。

## 2. 核心知识点字段

分母：核心知识点 671。

| 字段 | 有 | 数据没有 |
|---|---:|---:|
| definition | 671 | 0 |
| conditions | 671 | 0 |
| boundaries | 671 | 0 |
| objectives | 671 | 0 |
| textbook.page | 567 | 104 |
| thoughts | 671 | 0 |
| methods | 671 | 0 |

`textbook.page` 这 104 个：`textbook` 对象都在，缺的是 `page` 键。有 page 的 567 个，page 都是整数。

这里的 thoughts、methods 只表示列表非空。列表里的 uid 是否都能在图谱或方法上对上，除第 4 节打开的那一条方法外，记 NOT_VERIFIED。

## 3. 题目文件

分母：items 文件 148。148 个都有 `items` 键，且都是数组。

| 项 | 数量 | 分母 |
|---|---:|---|
| `items` 为空数组的节 | 117 | 148 个 items 文件 |
| `items` 非空的节 | 31 | 148 |
| 有合格选择题的节 | 14 | 148 |
| 合格选择题条数 | 183 | 全部题目 2642 条里的子集 |
| `form` 为 choice、但 `opts.key` 为空的题 | 34 | 2642 |
| 整节都没有合格 `opts.key` 的选择题节 | 3 | 148，这 3 节不计入上面的 14 |

148 = 117 个空数组 + 14 个有合格选择题 + 3 个只有缺 key 的选择题 + 14 个有题但没有 `form==choice`。

有合格选择题的 14 个文件：

- `801-10.1.items.js`
- `801-10.2.items.js`
- `801-10.3.items.js`
- `801-10.4.items.js`
- `801-10.5.items.js`
- `801-11.1.items.js`
- `801-11.2.items.js`
- `801-11.3.items.js`
- `801-11.4.items.js`
- `801-11.5.items.js`
- `801-11.6.items.js`
- `801-11.7.items.js`
- `801-ch-end-10.items.js`
- `801-ch-end-11.items.js`

不计入 14 的 3 个文件：`801-12.1.items.js`、`801-12.12.items.js`、`801-ch-end-12.items.js`。

题干、选项、答案对不对，记 NOT_VERIFIED。

## 4. 立方根方法 SK-801-11.2-01

打开 `runtime/web/data/sec/801-11.2.js`。方法 uid `SK-801-11.2-01`，名称是「求一个数的立方根」。

`qs` 数组长度是 8，所以前 8 条就是这条方法上挂着的全部 qs。每条 qs 只有 `id`、`vol`、`no`、`band`。这里的 `no` 是节号，8 条都是 `11.2`，`vol` 都是 `801`。字段 `qn` 的原值是 72。已逐条打开题干的数量按 `qs` 计，是 8。

8 条都按 `vol` 和 `no` 到 `801-11.2.items.js`，用 `id` 找到了题干。找不到的是 0。

| 序 | id | no | 题干文件 | 立方根 | 平方根 | 题干里有「比较」 |
|---:|---|---|---|---|---|---|
| 1 | `11.2_adv_01` | 11.2 | 找到 | 有 | 有 | 有 |
| 2 | `11.2_adv_02` | 11.2 | 找到 | 有 | 有 | 无 |
| 3 | `11.2_adv_03` | 11.2 | 找到 | 有 | 无 | 无 |
| 4 | `11.2_adv_04` | 11.2 | 找到 | 有 | 无 | 无 |
| 5 | `11.2_adv_05` | 11.2 | 找到 | 有 | 有 | 无 |
| 6 | `11.2_adv_06` | 11.2 | 找到 | 有 | 有 | 无 |
| 7 | `11.2_adv_07` | 11.2 | 找到 | 有 | 有 | 无 |
| 8 | `11.2_adv_08` | 11.2 | 找到 | 有 | 无 | 有 |

题干原文：

1. `11.2_adv_01`：比较 $\sqrt[3]{3}$、$\sqrt{2}$、$1.5$ 的大小。
2. `11.2_adv_02`：证明：$\sqrt[3]{2 + \sqrt{5}} + \sqrt[3]{2 - \sqrt{5}} = 1$。
3. `11.2_adv_03`：已知 $\sqrt[3]{x-1} + \sqrt[3]{x+1} = \sqrt[3]{2x}$，求 $x$ 的值。
4. `11.2_adv_04`：证明：$\sqrt[3]{a} \cdot \sqrt[3]{b} = \sqrt[3]{ab}$（$a, b$ 为实数）。
5. `11.2_adv_05`：化简 $\sqrt[3]{8 - 4\sqrt{5}} \cdot \sqrt[3]{8 + 4\sqrt{5}}$。
6. `11.2_adv_06`：计算：$\sqrt[3]{3-\sqrt{8}} + \sqrt[3]{3+\sqrt{8}}$ 的值。
7. `11.2_adv_07`：若 $x = \sqrt[3]{7+5\sqrt{2}} + \sqrt[3]{7-5\sqrt{2}}$，求 $x$ 的值。
8. `11.2_adv_08`：比较 $\sqrt[3]{5} + \sqrt[3]{7}$ 与 $2\sqrt[3]{6}$ 的大小。

判断：这 8 条都挂在这条立方根方法的 `qs` 上，而且 8 条题干都写了立方根 `\sqrt[3]`。只含平方根、不含立方根、题干又写「比较」的条数是 0。第 1 条同时写出 `\sqrt[3]{3}` 和 `\sqrt{2}`，原始题干里没有 `\sqrt{3}`。第 8 条的比较对象都是立方根。

另有一个口径，不是 `qs` 列表：全部 items 文件里，`kps.m1.uid` 等于 `SK-801-11.2-01` 的题有 73 道。这 73 道里，只含平方根、不含立方根的是 0。其中 4 道题干没有根号符号，题目 id 是 `11.2_bas_04`、`11.2_bas_06`、`11.2_bas_12`、`11.2_int_18`，题干分别是「下列各数中，立方根为负数的是」「若 $x^3 = 64$，则 $x =$」「下列说法正确的是」「下列等式对任意实数 $a$ 一定成立的是」。这 4 道按字面是立方或立方根，不是「比较√3」。`qn` 原值 72 和这 73 道差 1，原因记 NOT_VERIFIED。

## 5. 思想节点

`runtime/web/data/graph.js` 顶层是 `nodes` 和 `edges`。`nodes` 共 1686 个。`kind` 等于 `thought` 的节点 16 个。`edges` 以及其他列表里，`kind` 等于 `thought` 的是 0。

16 个思想节点的 id 是 TH-01 到 TH-16。节点上都有 `id`、`kind`、`title`、`level`、`parent`、`desc`、`boundaries`、`deg`、`cnt`、`sch`。

| 字段 | 有键 | 去空白后非空 | 数据没有 |
|---|---:|---:|---|
| definition | 0 | 0 | 16 个节点都没有这个键 |
| desc | 16 | 16 | 0 |

`desc` 长度 32 到 58 个字符，没有一条与 `title` 相同。`desc` 正文不抄进本文件。`desc` 能不能当作定义句，记 NOT_VERIFIED。

## 保留率

分母写在每一行后面。只使用上面数到的数。

核心知识点字段，分母 671：

- definition：671/671
- conditions：671/671
- boundaries：671/671
- objectives：671/671
- textbook.page：567/671
- thoughts：671/671
- methods：671/671

题目文件，分母 148：

- `items` 为空数组：117/148
- 有合格选择题的节：14/148

下列项目记 NOT_VERIFIED：

- 页面是否展示这些字段
- 题干、选项、答案是否正确
- `ex:` 148 个文件里的例题内容
- 核心知识点上 thoughts、methods 的 uid 能否全部对上（已打开的 `SK-801-11.2-01` 除外）
- context 15 个、activity 1 个的字段是否齐全
- 思想节点的 `desc` 是否当作定义句
- 方法字段 `qn` 为 72、与 m1 挂接 73 道相差 1 的原因
