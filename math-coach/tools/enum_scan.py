
# tools/enum_scan.py — 从 content/ 里抽出「内部枚举值」词表，供界面断言比对。
# 为什么这么做：界面上出现 concept / step_logic 这种词，说明某个渲染点把数据字段原样摆出来了。
# 靠人工维护一张 9 个词的清单抓不全（本次就是漏了 prerequisite_missing / property 之外的一堆）。
# 词表跟着数据走：数据里作为「某个字段的值」出现的短英文串，就是内部枚举，界面不该原样显示。
import sys, os, json, io, re, collections
sys.stdout.reconfigure(encoding='utf-8')

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'tools', 'enum_values.json')
# 这些字段的值即使显示出来也读得懂（页码/年份/单位），不算泄漏
SKIP_KEYS = {'page', 'pages', 'year', 'vol', 'no', 'version', 'schema_version', 'grade', 'id', 'uid', 'code'}
PAT = re.compile(r'^[a-z][a-z0-9_]{1,23}$')

def walk(o, key, acc):
    if isinstance(o, dict):
        for k, v in o.items(): walk(v, k, acc)
    elif isinstance(o, list):
        for v in o[:200]: walk(v, key, acc)
    elif isinstance(o, str):
        if key and key not in SKIP_KEYS and PAT.fullmatch(o):
            acc[o] += 1

acc = collections.Counter()
for base in ('content', 'runtime/web/data'):
    for dp, dn, fn in os.walk(os.path.join(ROOT, base)):
        for f in sorted(fn):
            if not f.endswith('.jsonl'): continue
            p = os.path.join(dp, f)
            try: lines = io.open(p, encoding='utf-8', errors='replace').read().splitlines()
            except Exception: continue
            for ln in lines:
                ln = ln.strip()
                if not ln.startswith('{'): continue
                try: d = json.loads(ln)
                except Exception: continue
                walk(d, '', acc)

# 只留下「确实是枚举」的：出现在 >=1 条数据里，且不是数学/单位/常见英文词
vals = {k: v for k, v in acc.items() if v >= 1}
io.open(OUT, 'w', encoding='utf-8').write(json.dumps({
    'note': '由 tools/enum_scan.py 生成：content/ 数据里作为字段值出现的短英文串 = 内部枚举，界面不应原样显示',
    'count': len(vals),
    'values': dict(sorted(vals.items(), key=lambda kv: -kv[1])),
}, ensure_ascii=False, indent=1))
print('enum values:', len(vals), '->', OUT)
top = sorted(vals.items(), key=lambda kv: -kv[1])[:12]
print(', '.join(f'{k}({v})' for k, v in top))
