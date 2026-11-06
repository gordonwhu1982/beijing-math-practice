#!/usr/bin/env node
/* fix_math_escapes.js — 修 JSON 里被转义吃掉的 LaTeX 反斜杠
 *
 * 背景：题库是 JSONL，LaTeX 命令必须以双反斜杠写入（"\\frac"）。
 * 若写成单反斜杠，JSON 解析器会把它当转义符吃掉：\f → 换页符、\t → 制表符、\b → 退格，
 * 于是 $\frac1x$ 变成 $<FF>rac1x$，渲染时报 Unexpected character，页面上就是乱码。
 *
 * 做法：只在行文本上把「单个反斜杠 + f/t/b + 字母」补成两个反斜杠。
 * 已经写成 \\frac 的位置，前一个反斜杠使 (?<!\\) 不成立，不会被重复加杠。
 *
 * 默认 dry-run，--apply 才写文件。
 */
const fs = require('fs');
const path = require('path');
const APPLY = process.argv.includes('--apply');
const ROOT = '.';

function walk(d, acc) {
  for (const n of fs.readdirSync(d)) {
    const fp = path.join(d, n);
    const st = fs.statSync(fp);
    if (st.isDirectory()) walk(fp, acc);
    else if (/\.jsonl?$/.test(n)) acc.push(fp);
  }
  return acc;
}

const LINE_RE = /(?<!\\)\\(f|t|b)(?=[a-zA-Z])/g;
const CTRL_RE = /[\u0008\u000c\u0009]/;

/* 注意：不能对 JSON.stringify 的结果测控制字符——stringify 会把真正吃进来的
   换页符重新转义成 \f 两个字符，于是永远测不到。必须递归到解析后的原始字符串。 */
function hasCtrl(obj) {
  if (typeof obj === 'string') return CTRL_RE.test(obj);
  if (Array.isArray(obj)) return obj.some(hasCtrl);
  if (obj && typeof obj === 'object') return Object.keys(obj).some(k => hasCtrl(obj[k]));
  return false;
}
const hits = [];
let filesTouched = 0;

for (const fp of walk(path.join(ROOT, 'content'), []).sort()) {
  const rel = fp.replace(/\\/g, '/');
  const text = fs.readFileSync(fp, 'utf8');
  const lines = text.split('\n');
  let touched = 0;
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;
    let parsed;
    try { parsed = JSON.parse(line); } catch (e) { continue; }
    // 只在解析结果确实带控制字符时才动手，避免误伤正文里正常出现 \t 的行
    if (!hasCtrl(parsed)) continue;
    LINE_RE.lastIndex = 0;
    if (!LINE_RE.test(line)) continue;
    LINE_RE.lastIndex = 0;
    const fixed = line.replace(LINE_RE, '\\\\$1');
    let reparsed;
    try { reparsed = JSON.parse(fixed); } catch (e) {
      hits.push({ file: rel, line: i + 1, ok: false, why: 'reparse failed: ' + e.message });
      continue;
    }
    if (hasCtrl(reparsed)) {
      hits.push({ file: rel, line: i + 1, ok: false, why: 'still has ctrl char after fix' });
      continue;
    }
    const samples = [];
    LINE_RE.lastIndex = 0;
    let m;
    while ((m = LINE_RE.exec(line))) samples.push(line.slice(Math.max(0, m.index - 14), m.index + 14));
    hits.push({ file: rel, line: i + 1, ok: true, fixable: samples.length, samples: samples.slice(0, 3) });
    lines[i] = fixed;
    touched++;
  }
  if (touched && APPLY) {
    fs.writeFileSync(fp, lines.join('\n'), 'utf8');
    filesTouched++;
  }
}

const ok = hits.filter(h => h.ok);
const bad = hits.filter(h => !h.ok);
console.log('可修的行：' + ok.length + '（' + ok.reduce((a, h) => a + h.fixable, 0) + ' 处反斜杠）');
if (bad.length) console.log('没能修的行：' + bad.length + '\n' + bad.map(b => '  ' + b.file + ':' + b.line + ' ' + b.why).join('\n'));
for (const h of ok) {
  console.log('\n' + h.file + ':' + h.line + ' (' + h.fixable + ' 处)');
  for (const s of h.samples) console.log('  ' + JSON.stringify(s));
}
console.log('\n' + (APPLY ? ('已写回 ' + filesTouched + ' 个文件') : '（dry-run，没改任何文件；加 --apply 才写）'));
process.exit(bad.length ? 1 : 0);
