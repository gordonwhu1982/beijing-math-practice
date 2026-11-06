# framework_extract — 教材目录抽取（可重跑）

目标：从北京版六册 PDF 重新产出 `content/framework/volumes/*.json`。

## 两步

1. **抽文本**（每册一个 `.txt`，用 `===== PAGE n =====` 分隔）：

   ```python
   import fitz
   d = fitz.open("某册.pdf")
   with open("out/toc/<key>.txt", "w", encoding="utf-8") as w:
       for i in range(len(d)):
           w.write("\n===== PAGE %d =====\n" % (i + 1)); w.write(d[i].get_text())
   ```

   key：`qi_shang` / `qi_xia` / `ba_shang_2024` / `ba_xia` / `jiu_shang` / `jiu_xia`。
   **不要用 pdftotext**：这批 PDF 的字体缺 ToUnicode，pdftotext 出来是 CID 乱码，PyMuPDF 正常。

2. **解析 + 落盘**：`python parse_toc.py` → 打印六册章/节计数并写 `framework.json`；`python mkvolumes.py` → 写 `content/framework/volumes/*.json`（含 PDF sha1、页数、抽取器说明）。

## 环境变量

| 变量 | 默认 | 作用 |
|---|---|---|
| `MC_SCRATCH` | 本机 `out/toc` | 中间产物目录（`<key>.txt`、`framework.json`） |
| `MC_REPO` | 本机 math-coach 路径 | 目标仓根 |
| `MC_GT7` | ChinaTextbook 七年级 PDF 目录 | 七上/七下 PDF 位置 |

## 两个必须知道的坑

1. **目录页窗口因册而异**：`BOOKS` 里每册带 `(起页, 止页)`。七下目录在 p4–p7（不是默认 5–11），窗口写错会整章丢失。
2. **七上是扫描件**：158 页 `get_text()` 全空，无文字层。目录靠渲染目录页（150 dpi）读图人工录入，硬编码在 `parse_toc.py` 的 `QI_SHANG` 常量里；改这一册要改常量，不是改解析规则。
   正文要抽知识点必须先 OCR（本机无 tesseract）或换有文字层的 PDF。

## 已知脏数据

旧版册次（802/901/902）的 `units[].title` 抽出来带 `\b`（退格字符），`mkvolumes.py` 里已用 `clean()` 剥掉；如再新增册次，记得保留这个清理。
