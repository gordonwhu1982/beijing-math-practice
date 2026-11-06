/* answer_spec 与判题器的一致性体检：
   1) 用 spec 自己构造「标准答案」，judgeWithSpec 必须给 correct（否则说明 spec 形态判题器读不懂）
   2) 数值题构造一个错值，必须给 wrong（否则说明 spec 没生效、落成 manual）
   3) 统计 spec 覆盖率与 manual/wrong 分布 */
const fs = require('fs');
const path = require('path');
const J = require('../runtime/shared/judge.js');
const REPO = process.env.MC_REPO || 'D:/个人/知识图谱/math-coach';
/* 扫全部册全部的 *.spec.jsonl：以前写死 ch12，其他章加了 spec 也不会被体检。 */
const QROOT = REPO + '/content/questions';
const sp = [];
for (const v of fs.readdirSync(QROOT)) {
  const dir = path.join(QROOT, v);
  if (!fs.statSync(dir).isDirectory()) continue;
  for (const f of fs.readdirSync(dir)) {
    const m = f.match(/^(ch[0-9a-z]+)\.spec\.jsonl$/);
    if (!m) continue;
    for (const l of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) {
      if (l.trim()) sp.push(JSON.parse(l));
    }
  }
}
const specOf = {};
for (const s of sp) specOf[s.id] = s;

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
    const vname = spec.var || 'x';
    const lo = spec.low, hi = spec.high, lc = spec.low_closed, hc = spec.high_closed;
    if (lo != null && hi != null) return lo + (lc ? '<=' : '<') + vname + (hc ? '<=' : '<') + hi;
    if (lo != null) return vname + (lc ? '>=' : '>') + lo;
    if (hi != null) return vname + (hc ? '<=' : '<') + hi;
    return '';
  }
  if (spec.type === 'judgement') {
    const x = v[0] || {};
    return String(x.raw || spec.raw || '');
  }
  return '';
}

function wrongVariant(spec) {
  const v = spec.values || [];
  if (spec.type === 'exact_value' && v[0] && v[0].kind !== 'text' && v[0].num != null) {
    return String(Number(v[0].num) + 7) + (spec.unit || '');
  }
  if (spec.type === 'value_set' && v.length && v.every(x => x.kind !== 'text' && x.num != null)) {
    const parts = v.map(x => String(x.num));
    parts[0] = String(Number(parts[0]) + 7);
    return parts.join(',');
  }
  if (spec.type === 'interval' && spec.low != null && spec.high != null) {
    const vname = spec.var || 'x';
    return String(spec.low - 5) + '<' + vname + '<' + (spec.high + 5);
  }
  if (spec.type === 'judgement') {
    const w = String((v[0] || {}).raw || '');
    if (/^(能|可以|是|成立|对|正确)$/.test(w)) return '不能';
    if (/^(不能|不可以|不是|不成立|不对|不正确|错)$/.test(w)) return '能';
  }
  return null;
}

let ok = 0, bad = [], wrongOk = 0, wrongMiss = [], autoTypes = { exact_value: 1, value_set: 1, interval: 1, judgement: 1 };
for (const s of sp) {
  if (!autoTypes[s.type]) continue;
  const stu = stuFromSpec(s);
  if (!stu) { bad.push([s.id, s.type, 'empty-student']); continue; }
  const r = J.judgeWithSpec(s, '', stu);
  if (r.verdict === 'correct') ok++;
  else bad.push([s.id, s.type, r.verdict, r.how, JSON.stringify(stu).slice(0, 40)]);
  const w = wrongVariant(s);
  if (w) {
    const r2 = J.judgeWithSpec(s, '', w);
    if (r2.verdict === 'wrong') wrongOk++;
    else wrongMiss.push([s.id, s.type, r2.verdict, JSON.stringify(w).slice(0, 30)]);
  }
}
const byType = {};
for (const s of sp) byType[s.type] = (byType[s.type] || 0) + 1;
console.log('spec rows', sp.length, JSON.stringify(byType));
console.log('标准答案判 correct:', ok, '/ 可判 spec 总数', sp.filter(s => autoTypes[s.type]).length);
console.log('错值判 wrong:', wrongOk, ' | 未判 wrong:', wrongMiss.length);
for (const b of bad.slice(0, 12)) console.log('  BAD', b.join(' | '));
for (const b of wrongMiss.slice(0, 8)) console.log('  MISS', b.join(' | '));
