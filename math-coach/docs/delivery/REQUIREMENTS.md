# 需求规格清单

现状来自 `docs/STATE.md`。下面三条只把已经在用的产品和 STATE §8 里排在前面的缺口登记进来，方便任务引用。状态是 `DRAFT`：还没有按本 Skill 的 G5 重新评审。

| 需求编号 | 来源编号 | 需求名称 | 当前问题 | 用户价值/目标 | 优先级 | 范围 | 依赖 | 验收条件 | 状态 |
|---|---|---|---|---|---|---|---|---|---|
| REQ-001 | SRC-001 | 个人初中数学教辅可本地使用 | 需要一份不联网、可核对来源的练习与图谱 | 学生按教材学、做、看哪里不稳 | 高 | `runtime/web/`、`content/`、`tools/check_all.sh` | 无 | 按 STATE §1 用 HTTP 打开站点；`bash tools/check_all.sh` 通过。本次 init 未重跑该命令 | DRAFT |
| REQ-002 | SRC-001 | 判题不把判不准显示成错 | 2642 题里只有 427 题自动判，2215 题是 manual | 孩子不会被错判打击；能判的题有结构化答案 | 高 | `content/questions/`、`runtime/shared/judge.js` | REQ-001 | 判题三态仍是 correct / wrong / manual；新增自动判必须经 `judge_spec_audit.js`，且不把选择题 spec 算成覆盖提升 | DRAFT |
| REQ-003 | SRC-001 | 图谱能讲清方法并给出几何图示 | 没有 `#/methods`；平面几何图示只有 3 张 | 学生能从思想总表走到方法总表，几何定义下面看得到图 | 中 | `runtime/web/`、`content/framework/figures.json` | REQ-001 | 方法总表有路由；新图来自 figures.json 的 marks，不把讲义 PNG 贴进页面 | DRAFT |

## 需求详情模板

### REQ-001：个人初中数学教辅可本地使用

- 来源：SRC-001
- 用户/场景：一名初二学生，北京版八年级上册。
- 当前表现：STATE §2 记录十屏加两个二级页已经能用。
- 目标结果：继续以 Git 文本为权威层，构建产物可重跑。
- 本期范围：维持现有静态站点与闸门。
- 非范围：账号、后端、公开发布。
- 业务规则：权威层是 `content/**`；`build/` 与 `runtime/web/data/` 不进仓。
- 评审结论：`NOT_VERIFIED`（本次只登记，没有重新验收）。

### REQ-002：判题不把判不准显示成错

- 来源：SRC-001，STATE §2 与 §8 第 1 条。
- 已否决：给选择题补 spec 冒充自动判提升；纯文本抽关系式（四章只有 2 条）。
- 评审结论：`NOT_VERIFIED`。

### REQ-003：图谱能讲清方法并给出几何图示

- 来源：SRC-001，STATE §8 第 4、9 条。
- 非范围：按关键词把折叠、尺规、全等、费马题型挂到图上。
- 评审结论：`NOT_VERIFIED`。
