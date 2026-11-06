/* spec 自判剪枝：用判题器自己构造「标准答案」，判不 correct 的 spec 一律降级为 unknown。
   目的：spec 只保留判题器真正消费得了的行，避免「结构化覆盖率」虚高。
   用法：node tools/answer_spec_prune.js [--write] */
const fs = require('fs');
const J = require('../runtime/shared/judge.js');
const REPO = process.env.MC_REPO || 'D:/个人/知识图谱/math-coach';
const P = REPO + '/content/questions/801/ch12.spec.jsonl';
const rows = fs.readFileSync(P, 'utf8').trim().split('\n').map(JSON.parse);
const AUTO = { exact_value: 1, value_set: 1, interval: 1, judgement: 1 };

function stuFromSpec(spec) {
  const v = spec.values || [];
  if (spec.type === 'exact_value') {
    const x = v[0] || {};
    return String(x.kind === 'text' ? x.raw : (x.num != null ? x.num : x.raw)) + (spec.unit || '');
  }
  if (spec.type === 'value_set') {
    const parts = v.map(x => String(x.kind === 'text' ? x.raw : (x.num != null ? x.num : x.raw)));
    return (spec.order_policy === 'ordered' ? parts : parts.slice().reverse()).join(',') + (spec.unit || '');
  }
  if (spec.type === 'interval') {
    const n = spec.var || 'x';
    if (spec.low != null && spec.high != null) return spec.low + (spec.low_closed ? '<=' : '<') + n + (spec.high_closed ? '<=' : '<') + spec.high;
    if (spec.low != null) return n + (spec.low_closed ? '>=' : '>') + spec.low;
    if (spec.high != null) return n + (spec.high_closed ? '<=' : '<') + spec.high;
    return '';
  }
  if (spec.type === 'judgement') return String((v[0] || {}).raw || '');
  return '';
}

let down = [], keep = 0;
for (const s of rows) {
  if (!AUTO[s.type]) continue;
  const stu = stuFromSpec(s);
  const r = stu ? J.judgeWithSpec(s, '', stu) : { verdict: 'blank' };
  if (r.verdict === 'correct') { keep++; continue; }
  down.push([s.id, s.type, r.verdict]);
  s.type = 'unknown';
  s.note = (s.note ? s.note + ' ' : '') + '[自判剪枝: ' + r.verdict + ']';
}
console.log('spec rows', rows.length, '| 可自判保留', keep, '| 降级 unknown', down.length);
for (const d of down) console.log('  DOWN', d.join(' | '));
if (process.argv.includes('--write')) {
  fs.writeFileSync(P, rows.map(r => JSON.stringify(r)).join('\n') + '\n');
  console.log('wrote', P);
}
