# Wiki — 中文

**beijing-math-practice**（北京数学练习）的项目文档。纯静态、零依赖的
K-12 知识图谱与自适应练习工程，本地起一个 HTTP 服务即可运行。

线上地址：<https://gordonwhu1982.github.io/beijing-math-practice/>

仓库里有**两代产品**：

| 代际 | 位置 | 是什么 |
| --- | --- | --- |
| 经典站 | `classic.html`、`data/`、`diagnose/`、`explore/`、`children/`、`assets/` | 多学科（数学 + 另外 9 科）知识图谱：先修边 + 题库 + 自适应回溯诊断引擎 + Cytoscape 图谱可视化 + 分儿童学习档案。仍在 `/#old` 入口下完整可用。 |
| 新版教辅 | `index.html` → `math-coach/runtime/web/` | 围绕北京版课标重做的初中数学教辅：六册、约 700 个知识点、约 670 条解题方法、统一关系图、2708 题题库、十屏 hash 路由的单页应用。 |

## 目录

| 页面 | 内容 |
| --- | --- |
| [01-overview.md](01-overview.md) | 项目是什么、给谁用、快速开始、许可与诚实分级 |
| [02-repository-layout.md](02-repository-layout.md) | 仓库逐目录导览 |
| [03-classic-data-model.md](03-classic-data-model.md) | `data/*.json` 的结构、编号规则、难度模型、校验白名单 |
| [04-diagnosis-engine.md](04-diagnosis-engine.md) | `diagnose/engine.js` —— 纯函数自适应回溯算法 |
| [05-classic-frontend.md](05-classic-frontend.md) | classic.html、explore 图谱视图、children 档案、PWA 离线 |
| [06-math-coach.md](06-math-coach.md) | 新版教辅：课标框架、内容分层、图谱视图、判题 |
| [07-data-pipeline-and-gates.md](07-data-pipeline-and-gates.md) | scripts/ 工具链、校验闸门、教材抽取流水线 |
| [08-development-workflow.md](08-development-workflow.md) | dev/ 脚本、测试、Git 约定、部署 |

## 推荐阅读顺序

第一次接触：01 → 02 → 03 → 04，然后看 06（现行产品）。
要改数据或代码：03 → 07 → 08。

English version: [../en/README.md](../en/README.md)
