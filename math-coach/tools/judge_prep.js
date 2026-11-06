#!/usr/bin/env node
/* 预先算好每题的可判性：从 answer 抽结论候选 -> 数值 token 列表。
   输出 build/questions/judge_prep.json：{ id: {auto: bool, refs: [string...], how: 'single'|'bag'|'none' } } */
const fs = require('fs');
const path = require('path');
const J = require('../runtime/page/judge.js');

const repo = path.resolve(__dirname, '..');
const src = path.join(repo, 'content/questions/801/ch12.jsonl');
const outDir = path.join(repo, 'build/questions');
const out = path.join(outDir, 'judge_prep.json');

const rows = fs.readFileSync(src, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
const prep = {};
let auto = 0, bag = 0, none = 0;

for (const r of rows) {
  const cand = J.answerCandidates(r.answer || '');
  const toks = J.tokensOf(cand).filter((x) => /[0-9零一二三四五六七八九十百两千]/.test(x));
  const rats = toks.map(J.toRational);
  const okAll = toks.length > 0 && rats.every(Boolean);
  let how = 'none';
  if (okAll && toks.length === 1) { how = 'single'; auto++; }
  else if (okAll) { how = 'bag'; bag++; }
  else { none++; }
  prep[r.id] = { auto: how !== 'none', how, refs: okAll ? toks : [], cand: cand.slice(0, 160) };
}

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(out, JSON.stringify(prep), 'utf8');
console.log('rows=' + rows.length + ' single=' + auto + ' bag=' + bag + ' none=' + none + ' auto_pct=' + (((auto + bag) / rows.length) * 100).toFixed(1) + '%');
