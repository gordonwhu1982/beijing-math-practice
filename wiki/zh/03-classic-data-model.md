# 03 — 经典数据模型（`data/`）

经典一代把整张知识图谱和题库存成浏览器运行时 fetch 的纯 JSON。
没有数据库、没有构建步骤——JSON 本身就是产品。

## 文件

| 文件 | 大小 | 作用 |
| --- | --- | --- |
| `topics.json` | ~3.1 MB | 各学科知识点，含 `id`、标题、学段元数据，以及兜底用的 `diagnostic_question`。 |
| `dependencies.json` | ~1.0 MB | 先修边 `{topicId, prerequisiteId, strength, reason}`。`strength` 为 `hard`（必须先掌握）或 `soft`（有帮助）；诊断引擎 hard 优先于 soft。 |
| `questions.json` | ~7.5 MB | 题库，每题一个 JSON 对象（结构见下）。 |
| `cn-curriculum-standards.json` | ~0.4 MB | 课标条目，用于可回指。 |
| `id-aliases.json` | 很小 | 别名 → 规范知识点 id 映射。 |
| `mappings/` | — | 页面消费的学科与交叉引用映射辅助。 |

## 知识点编号

id 由学科前缀 + 学段/章节定位数组成：

- `cnm_*` 数学、`cne_*` 英语、`cnp_*` 物理、`cnc_*` 语文、
  `cns_*` 科学、`cnd_*` 道法、`cnh_*` 历史、`cng_*` 地理、
  `cnb_*` 生物、`cnk_*` 化学 —— 后接数字定位号。
- `Q_ID_RE` 校验格式；`external: true` 的节点只是参考，不出题。

`classic.html` 识别 hash 里的这些前缀并跳转 `/explore/#<id>`
（英语带 `?subject=english`），所以知识点链接可分享。

## 题目结构

`scripts/validate.py` 强制严格契约——这是**入库闸门**，违反即
`VALIDATION FAILED`：

- `id` 必须匹配 `<topicId>_q<N>`（topic 必须存在）。
- 字段只能取 `Q_FIELDS` 白名单：
  `id, topicId, difficulty, type, prompt, answer, choices, accept,
  explanation, verify, figure, unordered, percent, fixed_from_source,
  hideChoiceText`。
  新增字段必须同步改 `validate.py` 的白名单。
- `difficulty` 只有三档：`basic / standard / challenge`（旧名
  `advanced` 仍接受，按 `challenge` 处理）。
- 每个知识点有最低题量（现约 4 题/点）。
- `type` 见过的取值有 `choice`、`numeric`、`short`、`self`
  （各自怎么判见 [04](04-diagnosis-engine.md)）。

`verify` 字段**不参与前端判题**，只被 `scripts/verify_questions.py`
在 AST 白名单沙箱里求值，用于独立核对答案。

## 改数据的硬约定（出自 `dev/README.md`）

1. 任何 `data/*.json` 改动后必跑 `./dev/check.sh`——引擎测试 +
   `validate.py` + `verify_questions.py`（`quick` 参数跳过最后一项）。
2. `questions.json` 有 7.5 MB：只做定点文本插入、保持现有 2 空格
   缩进；绝不整库重新序列化，否则一次改动会把上万行标成修改。
3. 页面新增外链会破坏离线能力——体检脚本断言「无外网请求」。
4. `add_figures.py` 用 `json.dump(indent=2)` 整份重写且在 Windows
   上会把行尾变 CRLF，导致整个文件显示为 diff；用完先
   `git diff --stat` 确认，必要时 `git checkout` 回滚。

## 课标数据

`cn-curriculum-standards.json` 从上游项目的公开转写 JSON 导入
（math-coach 也从同一来源导入为 `content/curriculum/standards.jsonl`），
标记 `review_status=stub`：可以用来回指「这条知识点凭什么站得住」，
但不是教育部原文的权威副本。
