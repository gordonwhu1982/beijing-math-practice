# 04 — 自适应诊断引擎（`diagnose/engine.js`）

经典一代的核心。`engine.js` 是**纯函数**模块——无 DOM、无依赖——
浏览器里暴露为 `window.DiagEngine`，Node 里 `require()` 即可
（`tests/test_engine.js` 就是这么测的）。

## API 一览（文件头注释）

```
buildGraph(topics, deps, questions?) -> graph
createSession(graph, targets, {limit, seed, avoid}) -> session
nextQuestion(graph, session) -> topicId | null
nextItem(graph, session) -> {topicId, question, attempt} | null
applyAnswer(graph, session, id, 'correct'|'wrong'|'skip', {text, prompt, pin, qid}) -> 新 session
summarize(graph, session) -> {根因、学习路径、掌握/不稳/薄弱/未测}
gradeTargets(graph, '一年级'|'七上'|'高一'|'选必二', subject?) -> {ids, volumes, label}
createSession(graph, ids, {mode:'screen', confirm}) -> 筛查会话
chapterSummary(graph, session) -> 按章汇总（薄弱章节在前）
layout(graph, session, summary) -> 路径图的分层布局
judgeQuestion(question, userText) -> {verdict:'correct'|'wrong'|'manual', reason}
```

会话是可 JSON 序列化的纯数据；`applyAnswer` 返回**新**会话而不改
入参，所以整个诊断过程确定性可重放。

## 回溯算法

引擎把先修图当搜索空间，从目标**向回**走：

1. 先出 `standard`（提高）难度的题；连续答对后升级 `challenge`
   （拓展）确认掌握；答错则退回 `basic` 补基础。
2. 知识点要**连续答对 `confirm` 题**才判掌握（默认 3，可选 2/3/5；
   题库更少时以题库为准）。掌握会向上推断：点掌握则祖先视为掌握。
3. 答错或「不会」时，先出**更基础的一道确认题**：
   - 确认题对 → **不稳**（shaky），不再回溯；
   - 确认题也错 → **薄弱**（weak），沿先修边回溯——**hard 边先于
     soft 边**——找根因。
4. `summarize` 把知识点分成 掌握/不稳/薄弱/未测 四类，产出学习
   路径和按章汇总供 UI 展示。

筛查模式（`mode:'screen'`）把会话限制在目标范围内——回溯不出所
筛范围——并有默认题量上限（`SCREEN_LIMIT`）。`gradeTargets` 把
`一年级`/`七上`/`高一`/`选必二` 等年级标签映射为知识点 id 集合，
默认学科为数学，可用 `subject` 过滤（`english`、`physics`、`all`）。

## 判题（`judgeQuestion`）

自动判定刻意保守：

- **`choice`**：规范化文本与标准选项比对。
- **`numeric`**：NFKC 归一化 + 精确有理数比较（`1/2`、`0.5`、`½`
  判为相等）。
- **`short` / `self`**：一律 `manual`——UI 让学生（或家长）自评，
  引擎绝不假装会判自由文本。

`scripts/engine_norm.py` 是同一套 `normalizeText` 逻辑的 Python 移植，
供离线核验工具使用，保证 Python 与 JS 规范化结果一致。

## UI 与分享

`diagnose/index.html` + `app.js` 渲染会话：题卡、判题反馈、结果页
（根因链 + 建议学习路径）。`share.js` 把结果编码成可分享链接。
演示入口：`/diagnose/?target=cnm_221&demo=1`。

## 测试位置

- `tests/test_engine.js` —— Node 单元测试。
- `scripts/demo_grade.js` —— 用真实 `data/*.json` 跑一遍整年级筛查，
  打印按章汇总（引擎冒烟）。
- `dev/check.sh` 每次改数据都会跑单元测试。
