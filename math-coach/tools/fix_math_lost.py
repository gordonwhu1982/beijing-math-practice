# -*- coding: utf-8 -*-
r"""修 $…$ 体内被吃掉的命令反斜杠：$sqrt{6}$ -> $\sqrt{6}$。

只在 $…$ 片段里动手，且只补这三个命令名（数据里不会把 sqrt 当变量）。
JSON 文本里一个字面反斜杠要写成两个字符，故替换目标是 r'\\\\sqrt'。
默认 dry-run，--apply 才写盘。
"""
import re
import sys
import json

TARGET = sys.argv[1] if len(sys.argv) > 1 else 'content/questions/801/ch11.kp.jsonl'
APPLY = '--apply' in sys.argv
CMDS = ('frac', 'cdot', 'sqrt')   # frac/cdot 先补，避免 cdotsqrt 连写时 sqrt 被前一个命令挡住

SEG = re.compile(r'\$[^$\n]*\$')


def fix_seg(seg):
    out = seg
    for c in CMDS:
        out = re.sub(r'(?<!\\)' + c, '\\\\\\\\' + c, out)
    return out


def main():
    raw = open(TARGET, encoding='utf-8').read()
    lines = raw.split('\n')
    changed = 0
    touched = []
    for i, line in enumerate(lines):
        if '$' not in line:
            continue
        new = SEG.sub(lambda m: fix_seg(m.group(0)), line)
        if new == line:
            continue
        lines[i] = new
        changed += 1
        for a, b in zip(line.split('$')[1::2], new.split('$')[1::2]):
            if a != b:
                touched.append({'l': i + 1, 'before': a[:70], 'after': b[:70]})
    print('lines=%d' % changed)
    for t in touched:
        print('  l%-4d %s' % (t['l'], t['before']))
        print('        ->      %s' % t['after'])
    if APPLY and changed:
        open(TARGET, 'w', encoding='utf-8', newline='').write('\n'.join(lines))
        print('APPLIED')
    else:
        print('dry-run（加 --apply 才写盘）')


main()
