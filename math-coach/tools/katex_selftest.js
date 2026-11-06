#!/usr/bin/env node
// KaTeX 内容自检：
// 1) 把题库里 $...$ 数学式全部真渲染（strict:false，只关心是否抛错）
// 2) 单独统计「数学式里混进中文/未知符号」的段（这类段在浏览器里会丢字或错位，属内容缺陷）
// 用法: node tools/katex_selftest.js [目录, 默认 content/questions]
const fs = require('fs');
const path = require('path');
const katex = require('../assets/vendor/katex/katex.min.js');

const root = process.argv[2] || path.join(__dirname, '..', 'content', 'questions');
function walk(d, out = []) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p, out);
    else if (e.name.endsWith('.jsonl')) out.push(p);
  }
  return out;
}
const CJK = /[\u4e00-\u9fa5\u3000-\u303f\uff00-\uffef\u2018-\u201d\u2014\u2460-\u24ff]/;
const files = fs.existsSync(root) ? walk(root) : [];
let rows = 0, total = 0, bad = 0, cjk = 0;
const fails = [], cjkSamples = [];
for (const f of files) {
  for (const line of fs.readFileSync(f, 'utf8').split('\n')) {
    if (!line.trim()) continue;
    const q = JSON.parse(line);
    rows++;
    for (const field of ['stem', 'answer']) {
      for (const m of (q[field] || '').match(/\$[^$]+\$/g) || []) {
        total++;
        const tex = m.slice(1, -1);
        const texNoText = tex.replace(/\\text\{[^{}]*\}/g, '');
        if (CJK.test(texNoText)) {
          cjk++;
          if (cjkSamples.length < 5) cjkSamples.push({ id: q.id, field, tex: tex.slice(0, 60) });
        }
        try {
          katex.renderToString(tex, { throwOnError: true, strict: false });
        } catch (e) {
          bad++;
          if (fails.length < 20) fails.push({ id: q.id, field, tex: tex.slice(0, 60), err: e.message.slice(0, 80) });
        }
      }
    }
  }
}
console.log('题 ' + rows + ' 道｜数学式 ' + total + ' 个｜渲染抛错 ' + bad + '｜数学式内含中文/未知符号 ' + cjk + '（KaTeX ' + katex.version + '）');
for (const x of fails) console.log('  ERR ' + x.id + ' ' + x.field + ' | ' + x.tex + ' | ' + x.err);
for (const x of cjkSamples) console.log('  CJK ' + x.id + ' ' + x.field + ' | ' + x.tex);
process.exit(bad ? 1 : 0);
