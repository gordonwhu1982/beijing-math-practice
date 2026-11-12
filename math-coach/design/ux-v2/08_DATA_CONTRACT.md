# 08 数据契约：界面只认这几样东西

结论先行：界面**不直连 content/**，只通过 `runtime/web/data/*` 的切片读取；切片里有四类文件，每类一个 `window.MC` key。以下字段都是 2026-11-12 从真实文件里读出来的，不是设计稿。

## 1. 四类切片

| 切片 | 文件 | MC key | 载入方式 |
|---|---|---|---|
| 图谱 | `runtime/web/data/graph.js` | `graph` | 启动即载（index.html 直接挂） |
| 配图 | `runtime/web/data/figures.js` | `figures` | 启动即载 |
| 节 | `data/sec/<vol>-<no>.js` | `sec:<vol>-<no>` | `ensureSec(vol, sec)`，按需注入 script |
| 题 | `data/sec/<vol>-<no>.items.js` | `items:<vol>-<no>` | `ensureItems(vol, no)` |
| 例题 | `data/sec/<vol>-<no>.ex.js` | `ex:<vol>-<no>` | `ensureEx(vol, no)` |

路径前缀在原型里是 `../../../runtime/web/data/`（app.js:2174–2182），带宽高串 `?v=131`。

## 2. 字段（实测样本 801-12.1）

### 2.1 `sec:<vol>-<no>`（节，12,314 字节）

```
{ vol:"801", no:"12.1", title:"三角形", chapter:12,
  kps:[ { uid:"K801-12.1-01", name:"三角形的定义：…", kp_type:"concept",
          definition:"…", conditions:[…], boundaries:[…], objectives:[{ability,text}], aliases:[…] } ],
  skills:[ { uid, … } ] }
```

- `kp_type` 取值：concept / theorem / property / skill / method / formula / representation / fact / model / context / activity（界面必须经 `kpTypeName()` 映射成中文，不许直接印英文）。

### 2.2 `items:<vol>-<no>`（题，134,894 字节 / 一节的量）

```
{ items:[ { id:"12.1_bas_01", band:"basic", star:1, need:"helpful", form:"solution",
            stem:"…$10$…", opts:null, fig:{need,reason,hint}, ans:"1.【解】…步骤1…" } ] }
```

- `band`：basic / standard / advanced / challenge / competition（界面经 `bandLabel()`，五档中文「基础/中档/提高/挑战/竞赛」）。
- `opts` 为 `null` 表示主观题；客观题是数组。**选项键与解析可能不一致**（FD-05），判分前必须比对，不一致就不自动判。
- `ans` 带前缀「1.【解】」，展示前要清洗（产品侧已有 `C.ansText`，原型侧没有 → 见 03_FINDINGS FD-02 一类「说假话」）。

### 2.3 `ex:<vol>-<no>`（例题，与 items 同构，但只有少量）

```
{ no:"12.1", title:"三角形", items:[ { id, band, star, need, form, stem, fig, ans } ] }
```

### 2.4 `graph`（全局图谱，1686 节点量级）

```
{ nodes:[ { id:"V701", kind:"volume", title:"七年级上册", vol:"701", sec:null, ch:null, status:"stub_edition", deg:3 },
           { id:"C701-01", kind:"chapter", title:"第1章 有理数", vol:"701", ch:1, … } ],
  edges:[ … ] }
```

- `kind`：volume / chapter / section / knowledge_point / skill / thought / misconception。
- 边的关系名（`r`）：prerequisite_of / sequence / is_part_of / applies_to / uses_skill / belongs_to / assessed_by / supports / misconception_of / equivalent_to / contrast_with。
- **界面里凡是要判断「这个点属于哪一节/哪一章」，一律从 graph 里查，不许按名字猜**。

## 3. 载入语义（照抄现状，别自己发明）

- `ensureSlice`（app.js:2155）用注入 `<script>` 的方式载切片；同一个 key 正在载时返回 `null`（防止重复请求），载完自行 `render()`。
- 载失败时写 `window.MC[key] = { missing: 1 }` —— **界面必须能把 missing 说出来**，不能当成空数据渲染成「这一节没有题」。
- 因此所有视图的第一职责是：三种状态都要有界面——载入中 / 载入失败 / 有数据。

## 4. 不允许做的事

- 不许在 `app/` 里 fetch `content/`（那是构建期数据，量大且未经切片）。
- 不许把数据写字面量进 JS（除了 R3 之前的示意数据，R4 必须清）。
- 不许改 `?v=131` 这一类切片串（切片由 `tools/build_web.py` 生成，改串等于绕过缓存策略；R3 只处理 `app.js`/`app.css` 的串）。