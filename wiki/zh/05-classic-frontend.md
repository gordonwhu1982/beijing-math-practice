# 05 — 经典前端（classic 站）

`/#old` 入口之下的全部内容：`classic.html` 加 `explore/`、
`children/`、`diagnose/`、`assets/` 目录。原生 HTML/CSS/JS——
无框架、无构建。

## classic.html —— 多学科首页

`classic.html` 是经典落地页。`<meta description>` 写明覆盖范围：
数学（小学到高中）、语文（一至六年级 + 七至九年级）、科学（一至六
年级）、道德与法治（一至六年级）、历史（七至九年级）、地理（七至
八年级）、生物（七至八年级）、化学（九年级）、英语（三年级到高中）、
物理（初中、高中）。每个学科从 `data/topics.json` 取自己的图谱切片。

`<head>` 里的内联脚本检查 `location.hash`：知识点 id 模式
（`cnm_*`、`cne_*`、`cnp_*`…）会直接跳 `/explore/`，所以
`classic.html#cnm_221` 这样的分享链接能直接打开图谱并聚焦该知识点。

`?subject=` 可取：`chinese, science, morality, history, geography,
biology, chemistry, english, physics`（数学为默认）。

## explore/ —— 知识图谱可视化

`explore/index.html` + `app.js` 用 **Cytoscape.js + dagre**（均在
`assets/vendor/` 本地化，MIT）渲染知识点/先修关系图谱。这是与诊断
线性会话互补的「看全局」视图：节点是知识点，边是先修关系
（hard/soft 可区分），dagre 做分层布局。

`assets/explore.css` 是探索器样式；`assets/stem-compat.js` 是旧引擎
兼容垫片。

## children/ —— 学习档案

`children/` 实现分儿童学习档案，数据**只存浏览器本地**
（无服务端、无账号）：

- `index.html` / `page.js` —— 档案列表与详情页。
- `history.html` / `history.js` —— 作答历史视图。
- `assets/children.js` + `tests/test_children*.js` —— 数据辅助与测试。
- `assets/blindspots.js` —— 「薄弱点」检测（薄弱或未测的知识点），
  由 `test_blindspots.js` 覆盖。

记录是 append-only 事件；导出为 JSONL（一行一条）。新版教辅的记录
模式见 `math-coach/docs/records-schema.md`。

## assets/ —— 站点外壳

| 文件 | 作用 |
| --- | --- |
| `site.css` | 经典站共享样式 |
| `pwa.css` / `pwa.js` | PWA 安装提示与离线外壳 |
| `home.js` | 经典首页交互 |
| `stem-compat.js` | 引擎兼容垫片 |
| `icons/` | PWA 图标；`scripts/make_pwa_icons.py`（需 Pillow）重新生成 |
| `vendor/` | 本地化 MIT 库——Cytoscape、dagre、qrcode-generator；署名见 `VENDOR.md` |

## PWA / 离线（`sw.js`、`manifest.webmanifest`）

站点是可安装 PWA。Service Worker 用 `bmp-pwa-*` 命名空间做缓存，
避免旧缓存残留。`dev/README.md` 的硬约束：**页面新增外链会破坏离线
能力**——体检脚本会断言零外网请求。

## 与新版教辅的关系

经典站保持可用但进入维护状态：现行产品是
`math-coach/runtime/web/`（见 [06-math-coach.md](06-math-coach.md)）。
经典页面仍读 `data/*.json`，该数据仍在接收上游同步（如提交
`01c4991` 的 cn-math-taxonomy 合并）。
