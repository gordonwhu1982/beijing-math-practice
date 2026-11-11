# 02 — 仓库结构导览

```
beijing-math-practice/
├── index.html            入口切换页：#new → math-coach 原型，#old → classic.html
├── classic.html          经典多学科首页；hash 里的知识点 id 会跳 /explore/
├── manifest.webmanifest  PWA 清单（命名空间 bmp-pwa-*）
├── sw.js                 离线缓存 Service Worker
├── .nojekyll             让 GitHub Pages 正常服务静态文件
│
├── data/                 ★ 经典数据集（JSON，运行时 fetch）
│   ├── topics.json         各学科知识点（3.1 MB）
│   ├── dependencies.json   先修边：topicId → prerequisiteId（hard|soft）
│   ├── questions.json      题库（7.5 MB）；id 必须形如 <topicId>_q<N>
│   ├── cn-curriculum-standards.json  课标条目
│   ├── id-aliases.json     知识点 id 别名表
│   └── mappings/           学科/知识点映射辅助
│
├── diagnose/             自适应诊断
│   ├── engine.js           纯函数引擎（浏览器 + Node 通用，无 DOM）
│   ├── index.html/app.js   会话 UI；share.js 生成可分享结果链接
│   └── style.css
│
├── explore/              Cytoscape + dagre 知识图谱可视化
│   ├── index.html/app.js
│
├── children/             分儿童学习档案（本机浏览器内存储）
│   ├── index.html/history.html/page.js/children.js
│
├── assets/               经典站前端
│   ├── site.css/pwa.css/pwa.js/home.js/children.js/blindspots.js/stem-compat.js
│   ├── explore.css
│   ├── icons/             PWA 图标（scripts/make_pwa_icons.py 重新生成）
│   └── vendor/            本地化 MIT 库：cytoscape、dagre、qrcode-generator
│
├── scripts/              数据闸门与可复用数据工具（Python + Node）
│   ├── validate.py         ★ 入库闸门：题号、Q_FIELDS 白名单、难度档
│   ├── verify_questions.py ★ 在 AST 白名单沙箱里求值 verify 字段
│   ├── check_figures.py    图形字段体检
│   ├── second_pass.py      盲解复核流水线（prepare → compare）
│   ├── primary_recheck.py  从题干独立重算数值答案
│   ├── engine_norm.py      与 engine.js normalizeText 同思路的 Python 版
│   ├── fig_draw.py         内联 SVG 几何图元库（54 个）
│   ├── add_figures.py      给题目写 figure 字段（⚠ 整份重写 questions.json）
│   ├── demo_grade.js       用真实数据跑整年级筛查的引擎冒烟
│   ├── moe2025_check.py    2025 修订版课标覆盖报告（只读）
│   └── make_pwa_icons.py   PWA 图标生成（需 Pillow）
│
├── tests/                Node 单元测试（引擎 + 前端辅助函数）
│   ├── test_engine.js test_blindspots.js test_children.js test_home.js
│   ├── test_question_ids.js test_stem_compat.js test_jmor_frontend.js
│   ├── test_report_link.js test_children_browser.js
│   └── fixtures/
│
├── dev/                  本地开发脚本 —— 见 dev/README.md
│   ├── check.sh           一条命令：引擎测试 + validate.py + verify_questions.py
│   ├── start-server.bat   本地静态服务（默认 8000）
│   └── push-github.sh     推送 main → GitHub
│
├── out/                  本地产物（git 忽略）：figprev.html、verify-report.json
├── .github/ISSUE_TEMPLATE/question-fix.yml   报错题 issue 表单
└── wiki/                 本文档（zh/ + en/）

math-coach/               ★ 现行产品 —— 初中数学教辅
├── AGENTS.md             Agent 工作指引（multi-agent-software-delivery）
├── DELIVERY_MAP.json     交付文档实际位置索引
├── README.md             「现在有什么」+ 诚实分级的权威文档
├── docs/                 STATE.md（现状入口）、plan/、review/、delivery/、specs
├── content/              ★ 权威文本数据（registry、curriculum、relations、
│   │                       framework、skills、misconceptions、questions、rubric）
├── tools/                构建与闸门脚本：edges_build、framework_gen、
│   │                       build_web、schema_check、relations_check、judge_*、
│   │                       ux_asserts、web_smoke、check_all.sh …
├── runtime/web/          静态前端：index.html + app.css + js/{core,store,
│   │                       data,router,boot,fig}.js + views/（一屏一文件）
│   └── data/             构建产物，已入库（Pages 无需构建即可用）
├── assets/vendor/        KaTeX 0.16.11、cytoscape、dagre（全部 vendored）
├── design/ux-redesign/   UX 设计文档、评审记录、交互原型
└── build/                全部派生产物（git 忽略）
```

## 关键事实

- **Git 托管**：GitHub `gordonwhu1982/beijing-math-practice`，GitHub
  Pages 部署。本地另有两个 remote：`upstream`（上游原项目的本地镜像）、
  `taxonomy`（cn-math-taxonomy 内容源）。
- **换行**：`.gitattributes` 强制 LF；Windows 上不要开
  `core.autocrlf`（见 `dev/README.md`）。
- **`data/questions.json` 有 7.5 MB**：只做定点文本插入，绝不整库
  重新序列化。
- **`math-coach/content/` 是权威层**；`math-coach/runtime/web/data/` 与
  `math-coach/build/` 都是派生物，可用 `tools/build_web.py` 重建。
