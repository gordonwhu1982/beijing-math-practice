# 公式怎么存、怎么渲染、怎么检查

这份文档只管一件事：**数学符号从题库到屏幕，中间不许掉东西**。
界面侧的渲染口径、JSON 里怎么落盘、提交前跑什么检查，三处必须一致。

## 1. 渲染口径（前端已经这么干）

入口是 `runtime/web/js/core.js` 的 `mathHtml()`：

| 写法 | 结果 | 用在哪 |
| --- | --- | --- |
| `$…$` | 行内公式，KaTeX 渲染 | 正文、题干、选项、解析里所有式子 |
| `$$…$$` | 显示式，独占一行居中 | 少用；题干里一般不需要 |
| 不写 `$`，纯 ASCII 式子 | `mathRun()` 会自动认：够"像公式"（含 `=<>+`、字母数字混排）就渲染 | 兜底，别依赖 |
| Unicode 写法（`√`、`×`、`≥`） | `uni2tex()` 先转 LaTeX 再渲染 | 兜底，别依赖 |

两个兜底都不可靠：`mathRun` 遇到中文就断开，Unicode 转换只覆盖常见符号。
**该写 `$…$` 的地方就写 `$…$`**，别指望自动识别。

不能放 HTML 的位置（cytoscape 节点 label、SVG `<text>`、`title`、`textContent`）用 `C.plain()` 去掉公式，
用 `C.tidy()` 折成纯文本。除此之外一律 `C.mathHtml(C.clipMath(s, n))`，**不要自己 tidy 之后当 HTML 塞**。

## 2. 存盘铁律

### 2.1 反斜杠必须写两个

题库是 JSONL，`\frac` 不写两个，JSON 解析器会把反斜杠当成转义符吃掉：

| 写错 | 解析后 | 页面表现 |
| --- | --- | --- |
| `"\frac1x"` | 换页符 + `rac1x` | KaTeX 报 Unexpected character，退化成乱码 |
| `"\triangle"` | 制表符 + `riangle` | 同上 |
| `"\beta"` | 退格 + `eta` | 同上 |

正确写法是 `"\\frac1x"`（文件里四个字符 `\\f`，解析后两个）。

2026-10-30 全库扫描抓到 25 处这类反斜杠（`ch10.kp`、`ch11.kp`、`ch12`、`edges`、`skills` 里都有），
已用 `tools/fix_math_escapes.js --apply` 修掉；``mathCheck()`` 现在会把这类问题报成 `ctrl`。

### 2.2 公式里不放裸中文

`$\frac{多项式}{一次式}$` 渲染不出来，中文必须包进 `\text{}`：`$\frac{\text{多项式}}{\text{一次式}}$`。

### 2.3 截断不许切在公式里

`$\frac{x^2-9}{x^2+9}$ 求 $a$` 截成 20 字会变成 `$\frac{x^2-9}{x^2+9}$ 求 $`，
后半截悬空，整串降级成源码。**要截断先用 `C.clipMath()`**（它按公式边界退让），
或者在数据里就别把长句硬切。

### 2.4 `$` 必须成对

当前最大的存量问题：667 条字符串里 `$` 是单数，全部集中在 `figure.hint`、`basis.evidence[]`、
`criterion`、`src` 这些**被按字符长度截断过**的字段。它们不会让页面崩，但会显示成
`$\frac{a}{b}` 这样的半截源码。

## 3. 检查命令

| 命令 | 查什么 | 什么时候跑 |
| --- | --- | --- |
| `node tools/math_text_check.js` | 全库：`dollar`/`parse`/`bare`/`empty`/`ctrl`/`lost` 报错，`cjk` 只警告 | 提交钩子（暂存带 `content/**` 或 `core.js` 时自动跑），也可手动 |
| `node tools/math_text_check.js --staged` | 只看暂存里的文件 | 钩子用这个 |
| `node tools/math_text_check.js --top 5 --json out/math-text.json` | 每类列前 5 条，写 JSON 报告 | 排查时 |
| `node tools/fix_math_escapes.js` | 找出被 JSON 吃掉的反斜杠，dry-run | 修数据前先看 |
| `node tools/fix_math_escapes.js --apply` | 真的写回（`\f`→`\\f` 这类） | 确认清单后 |
| `python tools/audit_math_text.py` | 老版统计（Unicode 写法、裸 LaTeX） | 参考 |
| `node tools/web_smoke.js` | 27 条路由 × 页面文字层：控制字符、`.katex-error`、残留 `$…$`、裸命令 | 动前端时自动跑 |

`math_text_check.js` 和页面共用**同一份判据**（`core.js` 里的 `mathCheck()`），
不各写一套：钩子说没问题、页面上却渲染坏，这种事不该发生。

### 报出的 kind 怎么读

| kind | 意思 | 严重度 |
| --- | --- | --- |
| `ctrl` | 出现换页/制表/退格：JSON 反斜杠被吃 | ERROR |
| `parse` | KaTeX 真解析不了 | ERROR |
| `dollar` | `$` 或 `$$` 没配对 | ERROR |
| `lost` | 公式里命令缺反斜杠（`$sqrt{6}$`） | ERROR |
| `bare` | 有 LaTeX 命令但没包 `$…$` | ERROR |
| `empty` | 空公式 `$$$$` / `$$ ` | ERROR |
| `cjk` | 公式里裸中文 | WARN |

一个串里 `$` 没配对时，它下游的 `bare`/`cjk`/`empty` 都是连累出来的噪音，
报告会把它们合并计数，只列根因。

## 4. 现状（2026-10-30，85 个文件 / 234522 段文本 / 18890 段含公式）

| kind | 条数 | 说明 |
| --- | --- | --- |
| `dollar` | 669 | 存量数据债：截断在公式中间，集中在 `figure.hint`(396) 与 `basis.evidence[]`(159) |
| `bare` | 30 | `ch10.spec`/`ch11.spec` 的 `s` 字段：`\sqrt A*\sqrt B` 没包 `$` |
| `lost` | 21 | `ch11.kp.jsonl` 的 `basis.why`：`$sqrt{6}$` 少一个反斜杠 |
| `cjk` | 183 | 公式里混中文，多为 `$\frac{多项式}{…}$` 这种 |

`ctrl`/`parse` 已清零（25 处反斜杠修完）。

## 5. 记录约定

- 改题库：先 `node tools/math_text_check.js --staged`，别让新错进去。
- 改前端渲染：`runtime/web/js/core.js` 一动就跑 `node tools/web_smoke.js`，
  它会顺手帮你数页面上残留的 `$`。
- 见到"根号显示不全""公式变源码""页面有奇怪的方块"：先怀疑 `$` 单数或被吃掉的反斜杠，
  不要先怀疑 KaTeX。
