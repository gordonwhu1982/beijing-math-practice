# M4 独立评审

- 负责人：独立评审员（只评 M4）
- 版本：1
- 更新时间：2026-11-05
- 关联：M4、`00_PHASE1_BRIEF.md`、`01_REQUIREMENT_BASELINE.md`、`03_CURRENT_PRODUCT_MAP.md`、`06_INFORMATION_ARCHITECTURE.md`、`07_INTERACTION.md` 第 10 节
- 状态：M4 门禁通过。本文件不判断第一阶段整体

依据是上述文档的对照。没有运行产品，也没有写成真实用户测试。未改已有设计稿、原型和 `app.js`。

## 门禁与严重的含义

`00_PHASE1_BRIEF.md` 的 M4：信息架构、页面结构和核心旅程已定，无明显功能遗漏和流程冲突。

本轮「严重」只算三条：已确认的业务能力被拿掉；主导航和页面对不上；三条旅程互相矛盾。有一条即不通过。

## 结论

通过。

下面三节是通过所依据的对照。其后三条是写下来的差异，不属于上述严重定义，不改变通过。

## 1. 已确认的业务能力仍在页面上

`01_REQUIREMENT_BASELINE.md` 要求覆盖完整知识图谱、知识体系、各章专题、大量相关题目，以及练习、测试、回顾、评估。`06_INFORMATION_ARCHITECTURE.md` 第 3 节的落点是：

| 基线能力 | 页面 |
|---|---|
| 知识图谱、知识体系 | P-MAP |
| 各章专题 | P-CHAPTER、P-SECTION |
| 相关题目、练习 | P-PRACTICE，并从 P-SECTION、P-KP 进入 |
| 测试 | P-TEST |
| 回顾 | P-REVIEW 的「要重做的题」「不稳的地方」 |
| 评估 | P-RECORD |

`03_CURRENT_PRODUCT_MAP.md` 里 12 个已注册页面、FEAT-001 至 FEAT-007，在 `06_INFORMATION_ARCHITECTURE.md` §6.1 都有对应处理。§6.2 写了合并或移出孩子导航的理由，能力仍有页面或页内入口：

- PAGE-006 前后知识点：进入 P-KP 的「前后」区和 P-MAP 局部图。
- PAGE-007 思想：保留 P-THOUGHT，从图谱思想层和知识点页进入。
- PAGE-009 错题重练、PAGE-010 哪里不稳：并成 P-REVIEW 的两栏。要重做的题去 P-PRACTICE；不稳的地方去 P-KP 或 P-TEST。
- PAGE-012 依据总览：保留为 P-EVIDENCE，从 P-RECORD 底部和地址进入。
- FEAT-007 的导入导出：留在 P-RECORD。

`03_CURRENT_PRODUCT_MAP.md` 写明 `#/methods` 不在路由表里，并写明这只能说明路由表里没有，不能单独证明产品还缺这个能力。方法总表不在该文件已确认的 FEAT-001 至 FEAT-007 里。`06_INFORMATION_ARCHITECTURE.md` 只定 P-METHOD 面板，总表留在 §8，由评审和仓库主人决定。

§6.3 新增的 P-CHAPTER、P-TEST、P-RESULT 对应基线里的章专题、测试，以及三条旅程都要经过的结果页。现有路由里没有独立测试页，文件自己写了题目来源留给后续确认，没有把「已有数据已经支持测试」写成事实。

## 2. 主导航五项都能落到页清单

`06_INFORMATION_ARCHITECTURE.md` §2.1 的左侧五项，与第 3 节页清单一致：

| 导航 | 页面 | 页清单中的进入方式 |
|---|---|---|
| 今天 | P-TODAY | 打开网站；导航「今天」 |
| 课本 | P-BOOK | 导航「课本」 |
| 图谱 | P-MAP | 导航「图谱」 |
| 回顾 | P-REVIEW | 导航「回顾」 |
| 我的记录 | P-RECORD | 导航「我的记录」 |

练习和测试不占导航项。页清单写明：P-PRACTICE 从 P-TODAY、P-SECTION、P-KP、P-REVIEW 进入；P-TEST 从 P-SECTION、P-CHAPTER、P-REVIEW 进入。三条旅程用的就是这些入口。P-CHAPTER、P-SECTION、P-KP、P-METHOD、P-THOUGHT、P-RESULT、P-EVIDENCE 不在主导航上，第 3 节各自写了「从哪进」。

## 3. 三条旅程的页面顺序一致

`06_INFORMATION_ARCHITECTURE.md` §4 与 `07_INTERACTION.md` §10 的主路径相同。

1. 今天练一节：P-TODAY → P-PRACTICE → P-RESULT → P-KP → P-PRACTICE → P-RESULT → P-TODAY。做错且仍未做对的题进入 P-REVIEW「要重做的题」。06 §4.1 第 5 步和 07 §10.1 第 4 步都给出两个出口：「再练这个知识点」或「只练错的」，然后都回到 P-PRACTICE。
2. 从课本或图谱进入一章：P-BOOK 或 P-MAP → P-CHAPTER → P-SECTION → P-KP → P-SECTION → P-PRACTICE → P-RESULT。错题再走旅程 1 的「回到知识点」。
3. 回来再测：P-REVIEW → P-KP → P-REVIEW → P-TEST → P-RESULT → P-REVIEW →（可选）P-RECORD。练习可以要提示，测试不看提示。06 §4.1、§4.3 与 07 §10.1、§10.3 对这一点一致。

旅程 2 指向旅程 1 的那一步，两份文件用了不同步号，指的是同一次操作：06 §4.2 写「按旅程 4.1 第 4 步」，该步页面是 P-KP，动作是点「回到知识点」；07 §10.2 写「按 10.1 步 3」，该步页面是 P-RESULT，结束是进入 P-KP。页面顺序没有因此分成两条。

## 已核对、不影响通过的差异

1. `06_INFORMATION_ARCHITECTURE.md` §2.1 写：孩子从某一节、某个知识点或某个不稳的点出发去练或测，入口放在 P-TODAY、P-SECTION、P-KP、P-REVIEW。同文件第 3 节写：P-TEST 的「从哪进」是 P-SECTION、P-CHAPTER、P-REVIEW。测试不从 P-TODAY、P-KP 进入，章测试在 P-CHAPTER。§4 和 `07_INTERACTION.md` §10 按第 3 节走。主导航五项仍然各自对应页清单中的一个页面。
2. `07_INTERACTION.md` §10.3 第 6 步写：稳了的点「移出或降序」。`06_INFORMATION_ARCHITECTURE.md` §4.3 第 6 步写：列表按这次结果更新。两份旅程都回到 P-REVIEW。列表是移出还是只降序，还留着两种说法。
3. `06_INFORMATION_ARCHITECTURE.md` §4.2 的标题用「目录」，同节第 1a 步和 §2.1 用导航名「课本」、页面 P-BOOK。步骤里的页面是 P-BOOK。

`06_INFORMATION_ARCHITECTURE.md` §8 仍记下搜索是否可用、P-TEST 的题目从哪来、P-RESULT 要对照现有交卷画面补点。这些是文件里写明的后续项。第 1 节已经把基线和现有页面上的能力留在页清单里。
