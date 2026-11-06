
import json, hashlib, os, io, sys
import fitz
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding="utf-8", errors="replace")
OUT = os.environ.get("MC_SCRATCH", r"C:/Users/liang.gao5/Documents/deepseek-harness/default-workspace/out/toc")
REPO = os.environ.get("MC_REPO", r"D:/个人/知识图谱/math-coach")
GT7 = os.environ.get("MC_GT7", r"C:/Users/liang.gao5/Documents/deepseek-harness/default-workspace/out/gt/初中/数学/北京版-北京出版社/七年级")
# bid -> (pdf path, edition note, extractor note, topic kp count, kp status)
SRC = {
 "701": (os.path.join(GT7, "义务教育教科书·数学七年级上册.pdf"), "旧版电子课本（2013 教育部审定；扫描件无文字层）",
         "manual vision read of TOC pages 4-6 (scanned PDF, no text layer)", 0, "stub"),
 "702": (os.path.join(GT7, "义务教育教科书·数学七年级下册.pdf"), "旧版电子课本（2013 教育部审定；印次待核）",
         "pymupdf 1.28 text layer (TOC pages 3-8)", 0, "stub"),
 "801": ("D:/个人/初中材料/初二上/新建文件夹 (5)/（2024版新教材）北京版•数学八年级上册.pdf", "2024版新教材（北京出版社，ISBN 978-7-200-19495-1）",
         "pymupdf 1.28 text layer (TOC pages only)", 88, "seeded"),
 "802": ("D:/个人/初中材料/【北京版】八年级下册数学电子课本.pdf", "旧版电子课本（网络流传版，印次待核）",
         "pymupdf 1.28 text layer (TOC pages only)", 0, "stub"),
 "901": ("D:/个人/初中材料/【北京版】九年级上册数学电子课本.pdf", "旧版电子课本（网络流传版，印次待核）",
         "pymupdf 1.28 text layer (TOC pages only)", 0, "stub"),
 "902": ("D:/个人/初中材料/【北京版】九年级下册数学电子课本.pdf", "旧版电子课本（网络流传版，印次待核）",
         "pymupdf 1.28 text layer (TOC pages only)", 0, "stub"),
}
books = {b["id"]: b for b in json.load(open(os.path.join(OUT, "framework.json"), encoding="utf-8"))}
os.makedirs(os.path.join(REPO, "content", "framework", "volumes"), exist_ok=True)
def clean(s):
    if not isinstance(s, str): return s
    return s.replace("\b", "").replace("\u0008", "").strip()
summary = []
for bid, (path, ednote, extractor, kpn, kpst) in SRC.items():
    h = hashlib.sha1()
    with open(path, "rb") as f:
        while True:
            chunk = f.read(1 << 20)
            if not chunk: break
            h.update(chunk)
    size = os.path.getsize(path); pages = len(fitz.open(path)); b = books[bid]
    vols = {
        "schema_version": 1, "volume_id": bid, "label": b["label"], "grade": b["grade"], "term": b["term"],
        "edition": {"publisher": "北京出版社（北京版）", "revision": b["edition"], "note": ednote,
                    "verified": b["status"] == "verified"},
        "source": {"kind": "pdf_local", "filename": os.path.basename(path), "sha1": h.hexdigest(),
                   "bytes": size, "pdf_pages": pages, "extracted_on": "2026-10-26", "extractor": extractor},
        "chapters": [
            {"no": c["no"], "title": clean(c["title"]), "page": c["page"],
             "units": [{"label": u["label"], "title": clean(u["title"]), "page": u["page"]} for u in c["units"]],
             "sections": [dict({"no": s["no"], "title": clean(s["title"]), "page": s["page"]},
                               **({"optional": True} if s.get("optional") else {})) for s in c["sections"]],
             "extras": [{"kind": e["kind"], "title": clean(e["title"]), "page": e["page"]} for e in c["extras"]]}
            for c in b["chapters"]],
        "counts": {"chapters": len(b["chapters"]), "sections": sum(len(c["sections"]) for c in b["chapters"]),
                   "units": sum(len(c["units"]) for c in b["chapters"]),
                   "extras": sum(len(c["extras"]) for c in b["chapters"])},
        "topic_coverage": {"knowledge_points": kpn, "status": kpst,
                           "note": "八上 88 个知识点来自既有 textbook_index.json" if bid == "801" else "待从教材正文抽取"},
    }
    p = os.path.join(REPO, "content", "framework", "volumes", bid + ".json")
    json.dump(vols, open(p, "w", encoding="utf-8", newline="\n"), ensure_ascii=False, indent=1)
    summary.append("%s %s ch=%d sec=%d units=%d extras=%d sha1=%s pages=%d" % (bid, b["label"], vols["counts"]["chapters"],
        vols["counts"]["sections"], vols["counts"]["units"], vols["counts"]["extras"], h.hexdigest()[:10], pages))
print("\n".join(summary))
