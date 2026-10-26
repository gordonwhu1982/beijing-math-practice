# 本地开发（dev/）

| 脚本 | 作用 |
| --- | --- |
| `check.sh` | 一条命令跑完引擎测试 + `scripts/validate.py` + `verify_questions.py`。改完 `data/*.json` 必跑。加 `quick` 只跑前两项。 |
| `start-server.bat` | Windows 起本地静态服务（默认 8000，可传端口）。 |
| `push-github.sh` | 推送 main 到 GitHub。 |

## 约定

- 换行统一 LF（`.gitattributes`），不要在 Windows 上开 `core.autocrlf`，否则整文件 diff 会掩盖真实改动。
- 每个改动一次提交，提交信息写清「改了什么数据 / 为什么」。
- `data/questions.json` 有 4.3 MB，逐条改动请用文本级定点插入（保持 JSON 缩进风格），不要整库重新序列化，否则一次改动会把上万行标成修改。
- 页面新增外链会破坏离线能力：`scripts/` 里的体检与页面「无外网请求」检查都会看这一点。

## 数据工具（scripts/ 里除闸门外的可复用件）

从上游 90 个脚本中按「能否独立运行 + 是否会覆写主数据」筛出来的，全部实测通过：

| 脚本 | 用途 | 依赖 | 是否写文件 |
| --- | --- | --- | --- |
| `fig_draw.py` | 内联 SVG 几何图元库（cuboid/cylinder/cone/sphere/angle_arc/right_mark…54 个），只用 currentColor、不引外网 | 无 | 否 |
| `add_figures.py` | 用 fig_draw 给指定题目写 `figure` 字段（覆盖 121 题 / 60 知识点，全是数学） | fig_draw | ⚠ 会写 data/questions.json |
| `primary_recheck.py` | 从题干**独立重算**数值答案，用来核对 `answer` 是否算错（纯 stdlib） | 无 | 否 |
| `second_pass.py` | 盲解复核流水线：`prepare` 导出无答案题块 → 人/模型作答写 `ans_NN.json` → `compare` 找出不一致 | validate, engine_norm | 写 data/_second_pass/（已 gitignore） |
| `engine_norm.py` | 与 `diagnose/engine.js` 的 normalizeText 同思路的最小规范化 | 无 | 否 |
| `moe2025_check.py` | 对照 2025 修订版课标全文做「条款数 / 相似度 / 漏收」三块报告，只读 | 无 | 否 |
| `demo_grade.js` | 用真实 data 跑一遍整年级筛查并打印按章汇总（引擎冒烟测试） | diagnose/engine.js | 否 |
| `make_pwa_icons.py` | 重新生成 PWA 图标 | Pillow（本机已可用） | 写 assets/icons/ |
| `hs_common.py` `hs_sel_common.py` `phy_lib.py` `en_lib.py` `primary_qgen.py` | 上游的「登记表 DSL」：topic/questions/edge/hard/soft 与出题模板函数，是给图谱加内容的现成写法参考 | 无 | 否 |

用法示例：

```bash
python scripts/second_pass.py prepare --chunk 80     # 导出盲解题块
python scripts/second_pass.py compare                 # 对比独立答案
python -c "import sys;sys.path.insert(0,'scripts');import primary_recheck as P;print(P.expected_numeric('计算：18×32＝？'))"
node scripts/demo_grade.js                            # 引擎冒烟
python scripts/add_figures.py --preview out/fig.html  # 先看效果，确认后再正式写入
```

**刻意没有恢复的（在 git 历史 `7d7748c` 里，`git show 7d7748c:scripts/xxx.py` 随时取回）**：

- `en_build.py` `enh_build.py` `enj_build.py` `hs_build.py` `hs_sel_build.py` `phy_build.py` `phy_hs_build.py` `build_primary.py`
  —— 它们把 `data/topics.json`/`questions.json` **整份覆写**，且依赖约 60 个已删的数据登记模块。现在跑会毁掉当前数据集，属于危险 + 不可用。
- `en_g3..g6` `enh_b*/s*` `enj_g*` `hs_book*` `phy_g*` `phy_hs_a*` `primary_g*` 等纯数据录入模块 —— 内容已经在 `data/*.json` 里，没有逻辑价值。
- `rewrite_en_distractors.py`、`en_distractors2/*` —— 英语干扰项的一次性批改脚本。
- `screenshot.js`、`scripts/vendor/jsQR.js`、`deploy-cf.sh` —— 上游冒烟截图与 Cloudflare 部署，属于作者侧发布链路。

⚠️ `add_figures.py` 的已知副作用：它用 `json.dump(..., indent=2)` 整份重写 `data/questions.json`，在 Windows 上会把行尾变成 CRLF，
于是 git diff 会显示整个文件变更（真实内容变化只有那 121 题）。用完先 `git diff --stat` 确认，必要时 `git checkout -- data/questions.json` 回滚。
