# 补充：单文件 HTML 最小可用版线框规格（S0/S2/S3/S4/S5）

> **状态（2026-10-28 复核）**：历史评审报告（2026-10-27），结论已并入 `docs/plan/*` 与 `docs/STATE.md`。


日期 2026-10-27 ｜ 承接 `docs/review/2026-10-27-ux.md`（不重写，只补实现层）｜ 目标：file:// 双击打开、无切片、无 manifest、无网络请求
本文所有体积/条数均为对 `content/questions/801/ch12.jsonl`（1128 题）、`assets/vendor/katex/`、`content/rubric/801/ch12.jsonl` 的实测。

---

## 0. 先钉 4 个实现硬结论（先看这节再写代码）

| # | 结论 | 实测依据 | 直接影响 |
|---|---|---|---|
| 1 | **KaTeX 渲染必须用 `output:'mathml'`**，不要用默认 `html` | `assets/vendor/katex/` 只有 `katex.min.js`(275,414B) + `katex.min.css`(23,335B) + 22 个 `.woff2`；file:// 下 Chrome 把 woff2 当跨源字体请求（opaque origin），@font-face 会失败 | html 输出会退化成系统字体、上下标错位；mathml 不依赖字体文件，Chrome 原生 MathML Core 可直接出 |
| 2 | **题池全量内嵌**（1128 题，精简字段 **673,811B**，gzip 259,489B），不按节懒加载 | ch12.jsonl 原始 1,661,267B；精简到 `{id,s,b,f,st,an,no,sd,n}` 后 673KB | 单文件总重 ≈ 674K(题池) + 275K(KaTeX) + ~45K(自研 HTML/CSS/JS) ≈ **1.0MB**，file:// 冷开 50–200ms，仍远低于 1s 门槛；懒加载反而要写一套假的异步态 |
| 3 | **内嵌赋值必须 `JSON.stringify` 后把 `<` 转成 `\u003c`** | 1128 题里含 `<` 的 **1 题**，含 `</script` 的 **0 题**，含反引号 0 题 | 只有 1 题踩，但踩到就是白屏；一次性转义，别在运行时补救 |
| 4 | **localStorage 完全够，不做清理逻辑** | 一条 evidence ≈ **356B**；14 天 × 6 题 = 84 条 ≈ **29,904B = 5MB 的 0.60%** | 直接存全量历史，永远不删；不必写「存储满了」的降级路径 |

补充：KaTeX 字体若将来要真·自包含，只有两条路——base64 内嵌（+~500KB 且仍可能被 CORS 挡）或换 MathML。**现在选 MathML，字体目录不用带**。

---

## 1. 全局版式（先定 token，五屏共用）

```css
--fs-stem: 17px;  --lh-stem: 1.75;   /* 题干；宽屏 18px */
--fs-input: 17px; --lh-input: 1.6;   /* 输入框 */
--fs-body: 15px;  --lh-body: 1.8;    /* 解析；宽屏 16px */
--fs-btn: 16px;                      /* 按钮，weight 600 */
--fs-meta: 13px;  --lh-meta: 1.5;    /* 题号/计时/辅助 */
--fs-result: 18px;                   /* 结果条，weight 600 */
--page-max: 680px;                   /* 内容最大宽 */
--bar-h: 56px;                       /* 窄屏底部工具条 */
--card-pad: 16px;                    /* 窄屏 16 / 宽屏 24 */
```

| 维度 | 窄屏（<900px，手机/平板竖） | 宽屏（≥900px） |
|---|---|---|
| 内容宽 | `width:100%`，左右各 16px | `max-width:680px` 居中，左右无 padding（`--card-pad:24px`） |
| 字号 | 题干 17/1.75、解析 15/1.8 | 题干 18/1.75、解析 16/1.8 |
| 底部工具条 | `position:sticky;bottom:0;height:56px`，三按钮等分全宽，`padding-bottom:env(safe-area-inset-bottom)` | 同样吸底但高度 48px、背景透明、按钮**右对齐**（不撑满），左侧放「还剩 9:12」 |
| 结果条 | 通栏，紧贴题干卡片下沿 | 卡片内通栏（与卡片同宽） |
| 提示抽屉 | 从底部整宽滑出，最大高 70vh | 从右侧滑出，宽 420px，圆角 12 |
| 点击热区 | ≥44px | ≥36px |

**全局禁项**：无 loading 圈、无骨架屏、无遮罩弹窗（确认一律用底部 44px 滑条）。

---

## 2. 五屏线框（纵向区块顺序，可直接按序写 DOM）

### S0 今日

```
<div class="screen" data-screen="s0">
  <header class="s0-head">          24px   一行字：12.4 · 6 题 · 约 15 分钟
  <div class="s0-main">             auto   主按钮「开始练 · 6 题」  (btn-primary, 通栏窄屏/240px 宽屏)
  <div class="s0-sub">              44px   次按钮「换一节」（btn-ghost）
  <div class="s0-debt">             32px   灰字「昨天 12.3 有 1 题没做完」→ 点它直接进那题
  <footer class="s0-foot">          28px   「记录都在本机」(--fs-meta)
</div>
```
- 无异步：四处文案内联在 HTML 里，首屏不需要任何 JS 才能看见。
- 兜底：当前节可派题数 <6 → 主按钮改「这一节剩 4 题」并照常可点；=0 → 主按钮变「换一节」（禁用「开始」）。

### S2 练中·题面

```
<div class="screen" data-screen="s2">
  <header class="s2-topbar">        44px  左：12.4 · 第 3/6 题（--fs-meta）；右：胶囊「还剩 9:12」
  <article class="s2-card">
    <div class="s2-stem">          auto  题干，KaTeX mathml，17/1.75
    <div class="s2-nofig">         44px  无图降级条：见 §3.4（仅 need==='required' 的 466 题出现）
    <textarea class="s2-input">    min 88px  单行起、自动长到 5 行（max-height:200px 后内部滚）
    <div class="s2-hintdots">      20px  题号右侧 4 个 4px 圆点（本节未用则整块不渲染）
  </article>
  <div class="s2-bar">             56px  吸底：[提示] [跳过] [交卷(primary)]
</div>
```
- 题干卡片 `max-width:680px`；题干 p90 仅 140 字符，一屏放得下，**不给题干加折叠**。
- 输入区高度随内容长，但工具条始终吸底，不盖住最后一行（`s2-card` 加 `padding-bottom:var(--bar-h)`）。

### S3 练中·判题（S2 的替换态，不新建屏容器）

```
<div class="s2-card">
  <div class="s3-result" data-verdict="correct|wrong|manual|blank">  48px  结果条
  <div class="s3-chips">       36px×2行   8 个错因 chip（仅 wrong）
  <div class="s3-selfjudge">   44px       两个自评按钮（仅 manual）
  <div class="s3-answer">      auto       解析区：结论行 3 行 + 「展开全过程」
</div>
<div class="s2-bar">            56px       吸底：[下一题(primary)] [看提示] [记到错题]
```
- 顺序铁律：结果条 →（wrong）错因 chip →（manual）自评 → **解析区最后**。错因没登记完，`s3-answer` 保持 `display:none`；点「跳过登记」才展开。

### S4 提示抽屉（覆盖层，S2/S3 共用）

```
<div class="s4-sheet">
  <div class="s4-handle">       16px  拖动条（触屏可下拉关闭）
  <div class="s4-grid">         4 × 44px  L1 重述 / L2 定位 / L3 方法 / L4 第一步
  <div class="s4-full">         44px  「直接看全过程」(btn-ghost, 最贵记录)
  <div class="s4-done">         40px  「收起来」
</div>
```
- 每格已用 → 实心 + 右侧「已用」；L3 在 `answer_note` 为空的 602 道上**不渲染该格**（不留灰格）。

### S5 结算

```
<div class="screen" data-screen="s5">
  <div class="s5-stat">        32px   6 题：独立 4 · 带提示 1 · 我判不了 1
  <div class="s5-fold" ×3>     44px   待巩固 1 / 下次再试 1 / 今天没做的 1  —— 每条 <details> 默认收起
  <div class="s5-actions">     56px   [今天就到这儿(primary)] [再做 2 题(ghost)]
  <div class="s5-export">      36px   「导出今天的记录」(btn-ghost，见 §6)
</div>
```
- 折叠块用原生 `<details><summary>`（不写 JS），`summary` 高 44px 满足触屏。
- 兜底：本次 `seconds` 合计 <60s → 不渲染 S5，直接回 S0（不写 evidence）。

---

## 3. 组件清单与状态

### 3.1 按钮

| 组件 | 类 | 出现 | 隐藏 | 点击后 | disabled |
|---|---|---|---|---|---|
| 主按钮 | `.btn-primary` | 每屏最多 1 个 | 被下一步替代时 | 触发该屏唯一主流程 | 可派题数=0（S0）；输入为空且未用提示（S3 交卷前不 disable，见下） |
| 次按钮 | `.btn-secondary` | 与主按钮同区 | — | 走次要分支（换一节/再做 2 题） | 无 |
| 幽灵按钮 | `.btn-ghost` | 工具类 | — | 打开抽屉/折叠/导出 | 见各条 |

注：**「交卷」永不禁用**——空输入提交要能落 `blank/manual`，禁用会让孩子以为卡住。反例：若禁用了，空着交卷就没出口。

### 3.2 结果条 4 态（`.s3-result`，高 48px，左侧 3px 边）

| verdict | 底色/边色 | 文案（≤10 字） | 同屏出现的其他块 |
|---|---|---|---|
| `correct` | 浅绿 / 深绿 | 「对」 | 只出解析区；800ms 后 `下一题` 加 `.pulse` |
| `wrong` | 浅琥珀 / 琥珀 | 「这步不对」 | 出 8 chip；解析区藏在 chip 后 |
| `manual` | 浅灰蓝 / 灰蓝 | 「这题我判不了」 | 出 2 个自评按钮；**不出现任何红叉** |
| `blank` | 无底色 | 「先跳过」 | 什么都不出，直接 `下一题` |

`manual` 红线（写成测试用例）：DOM 里不得出现 `错题+1`、不得把 manual 计入分母、`data-verdict="manual"` 的元素 `border-left-color` 不得是 `--danger`。

### 3.3 提示抽屉 4 格 + full_solution

| 格 | 出现条件 | 点击后 | 记账 |
|---|---|---|---|
| L1 重述 | 恒有 | 抽屉内展开一行文本 | `hint_level=L1_restate`，`ext["x-hint-path"].push("L1")` |
| L2 定位 | 恒有 | 显示「回看 12.4 · 教材第 78 页」 | L2_locate |
| L3 方法 | **仅 `answer_note` 非空（526 题）** | 显示 answer_note 首句 | L3_method |
| L4 第一步 | 恒有（取 `answer` 首句） | 显示第一句 | L4_first_step |
| full_solution | 恒有 | 抽屉展开整段解析并把 S3 解析区置为已展开 | `full_solution`，该题不产出掌握证据 |

只升不降：记最高级；同一题重复点同级不重复记账（用 Set 去重）。

### 3.4 无图降级条（`.s2-nofig`，44px）

- 出现：`figure.need === 'required'` 且 `figure_ids.length === 0`（**466 题**）。
- 内容：左「原题有图，本机没存」+ 右 checkbox「我在纸上画好了」。
- 点击：勾上后条变为 32px 灰行（保留文字，收起 checkbox），写 `ext["x-drew"] = true`（不进 verdict）。
- `need === 'helpful'`（581 题）：**完全不出条**，避免每天 581 次噪声。
- 全站无 `<img>` 占位框。

### 3.5 错因 chip（8 类，来自 `enums.misconception_category`）

显示名固定为：`概念没分清` `前置知识缺` `方法选错` `步骤断了` `算错/符号` `题没读懂` `写得不成句` `我猜的`

- 出现：`verdict === 'wrong'` 时，2 行 × 4 个，高 36px。
- 点击：单选，选中后 `s3-answer` 展开；再点取消选中（允许不选）。
- 「跳过登记」ghost 按钮 → 直接展开解析，`misconception_category` 留空。
- 注：`我猜的` 就是 `猜测过度自信`，**仅它**会额外触发「该节标不稳」（对应五态规则）。

### 3.6 自评两按钮（`.s3-selfjudge`，44px）

- 只在 `manual` 出现，两个平级（都不 primary）：「我做对了」「我做错了」。
- 点击：写第二条 evidence，`verdict` 转 correct/wrong，`how` 保留 `manual`；结果条就地换色但**保留「自己判的」小字**（诚实标注）。
- 家长在旁边：第三个 ghost「家长来看」→ 展开同两按钮但文案「家长判：对 / 不对」。

### 3.7 结算三折叠块

| 块 | 内容 | 折叠默认 | 空时 |
|---|---|---|---|
| 待巩固 | 带提示通过的题 + 它的 hint_level | 收起 | 整块不渲染 |
| 下次再试 | wrong 与 blank 的题（含该题错因 chip 名） | 收起 | 整块不渲染 |
| 今天没做的 | blank 题 | 收起 | 整块不渲染 |

三块全空（6 题全独立通过）→ 只留一行「今天全对」，不显示三个空 `<details>`。

---

## 4. 6 题选路算法（可直接落成 `pick6()`）

输入：`pool`（当前节全部题，实测每节 81–91 题，如 12.4 = basic23/standard20/advanced15/challenge14/competition11）、`history`（该节最近 12 条 attempt，第一天为 `[]`）、`mode`（`textbook` | `stretch`）。

```text
pick6(pool, history, mode):
  quota = mode=="textbook" ? {basic:3, standard:2, advanced:1}
                           : {advanced:3, challenge:2, competition:1}
  picked = []

  # ① 复现位：上次 blank/wrong 的同节题，最多 2 题，按 ts 倒序
  retry = history.filter(a => a.verdict in ("blank","wrong")
                          && pool.has(a.item_uid))
                 .sort(ts desc).slice(0, 2)
  picked += retry
  # 扣名额：retry 里每题扣掉它所属 band 的 1 个名额；
  #         该 band 不在 quota 里（如 retry 是 challenge）→ 从 advanced 扣，advanced 最低保留 1
  #         扣不满时允许总数 <6，不硬凑

  # ② 排除位：最近 6 条 item_uid 不进池（避免与上次重复）
  #   仅当 (池剩余 >= 还需题数 + 6) 时启用；否则退化到只排最近 2 条
  excluded = history.slice(0, 6).map(item_uid)   # 退化时 slice(0,2)

  # ③ 每档内排序键（无历史时给出确定性结果，第一天可复现）
  sortBy(band):
    if history.is_empty:      id 里的数字序号升序           # 12.4_bas_01 → _03
    else:                     做过的次数 升序
                            → 上次 verdict=="correct" 的排最后（先给没做对的）
                            → 做过的时间 升序（久的先来）
                            → id 序号 升序

  # ④ 按 quota 逐档取，跳过 excluded；某档池不足时用邻档补
  fill order = textbook: basic → standard → advanced → challenge
               stretch : advanced → challenge → competition → standard
  池彻底不足 → picked 可能只有 4 题，界面写「这一节剩 4 题」，不补别的节（跨节由 S0 承担）

  # ⑤ 出场顺序：由易到难交错，不排成"先全基础后全难题"
  #    textbook 3:2:1 → [basic, basic, standard, basic, standard, advanced]
  #    stretch  3:2:1 → [advanced, advanced, challenge, advanced, challenge, competition]
  return picked   # 去重后 ≤6，长度即本次"第 N/len"
```

- **第一天（history 为空）**：retry=[]，excluded=[]，排序=纯 id 升序 → 结果完全确定（12.4 的 bas_01/02/03、sta_01/02、adv_01）。理由：可复现，家长能对上「今天做了哪几题」。
- **不做**：不做难度自适应、不按正确率调档、不跨节补题、不随机打散（随机会让两次打开顺序不同，孩子会以为换了题）。
- **验收**：同一节连开两次、中间不答任何题 → 两次 6 题完全相同；第二次打开时若上组有 1 道 wrong → 该题出现在第 1 位。

---

## 5. 键盘与触屏

| 操作 | 行为 |
|---|---|
| `Enter` | 交卷（`textarea` 内 `Enter` 也是交卷，**换行用 `Shift+Enter`**；初二孩子不会用多行） |
| `Shift+Enter` | 输入框内换行 |
| `^` | 输入框内输入 `^` → 立即转成 `^{}` 并把光标放花括号内（上标） |
| `/` | 空输入框或光标前是空白时按 `/` → 插入 `\frac{}{}`，光标在分子；否则按普通除号处理 |
| `Tab` | 切到「下一题」按钮（**不切屏、不跳题**）；若结果条已出，`Tab` 直接聚焦「下一题」 |
| `Esc` | 关提示抽屉（打开时）；否则无动作（不退出做题） |
| 触屏 · 软键盘顶起 | 底部工具条跟随 `visualViewport` 重算：`bar.style.bottom = (window.innerHeight - visualViewport.height - visualViewport.offsetTop) + 'px'`，工具条始终贴在键盘上沿；`s2-card` 的 `padding-bottom` 同步加 `var(--bar-h)`，**不隐藏工具条** |
| 触屏 · 输入框 | 聚焦时 `scrollIntoView({block:'center'})`，避免被键盘盖住；禁止 `zoom`（`<meta viewport maximum-scale=1`）但 `font-size` ≥16px 防 iOS 自动放大 |
| 触屏 · 抽屉 | 下拉 handle 超过 30px 关闭；按钮区不随滚动 |

---

## 6. 导出按钮（M4a 最小形态）

- **位置**：S5 结算屏最底部，`.s5-export`（36px 高，`btn-ghost`），文案「导出今天的记录」。
- **点击**：`new Blob([lines.join('\n')], {type:'application/x-ndjson'})` → `<a download>` 触发下载，无需任何权限或网络。
- **文件名**：`math-coach-801-<section>-<YYYYMMDD>-<HHmm>.jsonl`，例 `math-coach-801-12.4-20261026-1930.jsonl`。
- **内容**：本机全部 evidence（不只今天），一行一条，字段即 `entities.learner_evidence.required` + `hint_level/how/seconds/ext`；导出后 `ext["x-exported"]=ts` 回写（幂等标记，不删数据）。
- **空记录**：`disabled` + 文字变「今天没有记录」，`opacity:.45`，不弹任何提示（触屏没 hover）。
- **不做**：不做导入按钮（M4a 导入端在家长电脑上跑脚本）、不做清空按钮（清理入口一出现就会误点）。

---

## 7. 跳转图（文字流程）+ 可回退标记

```text
S0 今日
 ├─[开始练]──────────────▶ S2 第1题 ─────────────────────────┐
 ├─[换一节]──▶ S0' 换节（列表覆盖层）──[选好]──▶ S0        │
 └─[昨天有1题没做完]─────▶ S2 该题（session 续作）           │
                                                            ▼
S2 ─[提示]──▶ S4 提示抽屉 ─[收起/Esc/下拉]──▶ 回 S2（原滚动位置）
S2 ─[跳过]──▶ 写 verdict=blank ──▶ S2 下一题
S2 ─[交卷]──▶ S3 判题（结果条）  ← 一次性，判完不可回到"未作答"
S3 ─[错因登记/跳过]──▶ 解析展开（仍属 S3）
S3 ─[看提示]──▶ S4 ─[收起]──▶ 回 S3
S3 ─[下一题]──▶ S2 下一题 ──(第6题判完 或 15:00 到点)──▶ S5 结算
S5 ─[再做 2 题]──▶ S2（新 session_id，题池排除本组 6 题）
S5 ─[今天就到这儿]──▶ S0
```

| 跳转 | 可回退？ | 说明 |
|---|---|---|
| S0 → S2 | 可（S2 顶栏返回 S0） | 回 S0 时当前题写 `blank`，不丢记录 |
| S2 → S4 → S2 | 可 | 抽屉只是覆盖层 |
| S2 → S3（交卷） | **不可** | 判题只发生一次；`verdict` 写入后不可改（自评只追加第二条） |
| S3 → S2（下一题） | **不可回上一题** | 上一题只能从 S5「下次再试」进，防止反复刷同一题 |
| S4 打开 → 收起 | **记账不可撤** | `hint_level` 已写；抽屉关了提示痕迹仍留在圆点上 |
| S5 → S2 | 可（新 session） | 不续旧 session |
| S5 → S0 | 可 | 结算已封存 |

---

## 8. 实现清单（26 条，逐条勾）

1. 内嵌题池：`JSON.stringify` 后把 `<` 转 `\u003c`，赋值给 `const POOL=[...]`。
2. 内嵌 KaTeX `katex.min.js`，统一用 `renderToString(tex,{output:'mathml',throwOnError:false})`。
3. 渲染兜底：`throwOnError:false` 仍抛异常时，把该公式降级为等宽纯文本并加 `.tex` 类。
4. 定 CSS 变量：`--fs-stem/--lh-stem/--fs-body/--page-max/--bar-h`，两套 media query 只改字号与 padding。
5. 写 S0 四处内联文案（不依赖 JS 才能看见）。
6. 实现「开始练」：调 `pick6()` 得数组，写 `session_id`，进 S2。
7. 实现 `pick6()`：quota 表 + 复现位最多 2 + 排除最近 6（不足则退 2）。
8. 实现 `pick6()` 的确定性排序键（无历史按 id 序号、有历史按次数→上次对错→时间）。
9. 实现交错出场顺序（3:2:1 两种模式各一条固定序列）。
10. 写 S2 顶栏：`第 3/6 题` 与倒计时胶囊（15:00 递减，localStorage 不持久计时）。
11. 写 S2 题干卡片与 `<textarea>`（自动长到 200px 后内部滚）。
12. 加 `padding-bottom:var(--bar-h)` 到题干卡片，防止工具条盖最后一行。
13. 写无图降级条：只在 `need==='required' && figure_ids.length===0` 渲染，勾选写 `ext["x-drew"]`。
14. 写底部工具条三按钮（提示/跳过/交卷），**「交卷」永不禁用**。
15. 实现 `judge()`：命中 `answer_spec` 走 exact/numeric/bag，否则返回 `manual`；异常一律 `manual`。
16. 写结果条 4 态（correct/wrong/manual/blank），`data-verdict` 驱动配色。
17. 加 manual 红线断言：`manual` 元素边色不得取 danger 变量，DOM 不含「错题+1」。
18. 写 8 个错因 chip（2 行 × 4），单选可取消，选中后才展开解析。
19. 写「跳过登记」：直接展开解析，错因留空。
20. 写自评两按钮 + 「家长判」三分支，落第二条 evidence 且保留 `how=manual`。
21. 写解析区：结论行 3 行 + 「展开全过程」（`answer_steps_declared>0` 才给分步；basic 274/297 不分步）。
22. 写提示抽屉：4 格按 `answer_note` 是否存在决定 L3 渲染，`full_solution` 记账为最贵级。
23. 实现 `hint_level` 只升不降 + `ext["x-hint-path"]` 去重追加。
24. 写 S5 结算：分子 `correct`、分母 `correct+wrong`（manual/blank 不计），三折叠块空则整块不渲染。
25. 接键盘：`Enter` 交卷、`Shift+Enter` 换行、`^`→`^{}`、`/`→`\frac{}{}`、`Tab` 聚焦下一题、`Esc` 关抽屉。
26. 接软键盘：`visualViewport` 重算工具条 bottom，聚焦时 `scrollIntoView({block:'center'})`。
27. 写导出按钮：`Blob`+ndjson，文件名 `math-coach-801-12.4-20261026-1930.jsonl`，空记录 disabled 且改文案「今天没有记录」。
28. 串 15 分钟收尾：`seconds` 合计 <60s 不写 S5、回 S0；到 15:00 只提示不中断，做完当前题进 S5。
