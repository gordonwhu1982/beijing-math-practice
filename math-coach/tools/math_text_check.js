#!/usr/bin/env node
'use strict';
/* 题库里的数学写法检查：判据直接取前端 core.js 的 mathCheck，
   好处是「检查用的规则」和「页面渲染的规则」是同一份代码，不会各写一套后漂移。
   用法: node tools/math_text_check.js [--staged] [--top N] [--json out/math-text.json]
   退出码: 有 error 级问题（parse / dollar / bare / empty）→ 1，只有 warn（cjk）→ 0。 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.resolve(__dirname, '..');

global.window = global;
global.katex = require(path.join(ROOT, 'assets', 'vendor', 'katex', 'katex.min.js'));
new Function(fs.readFileSync(path.join(ROOT, 'runtime', 'web', 'js', 'core.js'), 'utf8'))();
const C = global.MC.core;
if (!C || typeof C.mathCheck !== 'function') {
  console.log('读不到 core.js 的 mathCheck，检查没法跑');
  process.exit(2);
}

const argv = process.argv.slice(2);
const opt = {
  staged: argv.indexOf('--staged') >= 0,
  top: 8,
  json: '',
  /* 存量债基线：老数据里已经躺着的问题冻结在这里，钩子只对「基线外的新问题」报错。
     否则一提交含 ch11.jsonl 的内容改动就会被 669 条老账挡住，门最后只能被关掉。 */
  baseline: path.join(ROOT, 'tools', 'math_baseline.json'),
  writeBaseline: argv.indexOf('--write-baseline') >= 0,
  noBaseline: argv.indexOf('--no-baseline') >= 0
};
if (argv.indexOf('--top') >= 0) opt.top = Number(argv[argv.indexOf('--top') + 1]) || 8;
if (argv.indexOf('--json') >= 0) opt.json = argv[argv.indexOf('--json') + 1] || '';

const SRC = path.join(ROOT, 'content');
const ERROR_KINDS = { parse: 1, dollar: 1, bare: 1, empty: 1, ctrl: 1, lost: 1 };
const KIND_CN = {
  parse: 'KaTeX 解析失败', dollar: '美元符号没配对', bare: 'LaTeX 命令漏写 $',
  empty: '空公式', cjk: '公式里混了中文',
  ctrl: 'JSON 反斜杠被吃成了控制字符', lost: '公式里的命令缺反斜杠'
};

/* 一条问题在基线里的身份：位置（行号、字段下标）会因为增删行漂移，所以不带行号，
   带「文件 + 类型 + 问题片段 + 原文前 24 字」。同一文件里两条不同的悬空 $ 也分得开。 */
function fingerprint(p) {
  return [p.file, p.kind, p.frag, String(p.sample || '').slice(0, 24)].join('|');
}

function stagedFiles() {
  try {
    const out = execFileSync('git', ['-c', 'core.quotepath=false', 'diff', '--cached', '--name-only', '--diff-filter=ACMR'], { cwd: ROOT, encoding: 'utf8' });
    return out.split(/\r?\n/).filter(Boolean);
  } catch (e) { return null; }
}

function listFiles() {
  if (opt.staged) {
    const st = stagedFiles();
    if (st === null) return { files: [], note: '读不到暂存区，按全量查' };
    const hit = st.filter(p => p.indexOf('content/') === 0 && /\.jsonl?$/.test(p));
    return { files: hit.map(p => path.join(ROOT, p)), note: '暂存 ' + hit.length + ' 个数据文件' };
  }
  const out = [];
  (function walk(dir) {
    for (const name of fs.readdirSync(dir)) {
      const fp = path.join(dir, name);
      const st = fs.statSync(fp);
      if (st.isDirectory()) walk(fp);
      else if (/\.jsonl?$/.test(name)) out.push(fp);
    }
  })(SRC);
  out.sort();
  return { files: out, note: '全量' };
}

function strings(obj, at, acc) {
  if (typeof obj === 'string') { if (obj.length > 1) acc.push([at, obj]); return; }
  if (Array.isArray(obj)) { obj.forEach((v, i) => strings(v, at + '[' + i + ']', acc)); return; }
  if (obj && typeof obj === 'object') { for (const k of Object.keys(obj)) strings(obj[k], at + '.' + k, acc); }
}

const got = listFiles();
const problems = [];
let nStr = 0, nFormula = 0;
for (const fp of got.files) {
  const rel = path.relative(ROOT, fp).replace(/\\/g, '/');
  let rows = [];
  const text = fs.readFileSync(fp, 'utf8');
  if (/\.jsonl$/.test(fp)) {
    text.split(/\r?\n/).forEach((line, i) => {
      if (!line.trim()) return;
      try { rows.push(['l' + i, JSON.parse(line)]); } catch (e) { rows.push(['l' + i, { __bad_json__: String(e.message) }]); }
    });
  } else {
    try { rows.push(['root', JSON.parse(text)]); } catch (e) { rows.push(['root', { __bad_json__: String(e.message) }]); }
  }
  for (const [tag, obj] of rows) {
    const acc = [];
    strings(obj, '', acc);
    for (const [at, s] of acc) {
      nStr++;
      if (s.indexOf('$') >= 0 || /\\[a-zA-Z]{2,}/.test(s)) nFormula++;
      for (const p of C.mathCheck(s)) {
        problems.push({ file: rel, at: tag + at, kind: p.kind, frag: p.frag, msg: p.msg, sample: s.slice(0, 120) });
      }
    }
  }
}

/* 一个字符串里 $ 没配对时，下游的 bare / cjk / empty 全是它连累出来的噪音：
   切分错位之后剩下的半段当然「含 LaTeX 没包 $」「公式里混中文」。
   先把美元符号这一条根因挑出来，同串的连带项收进 suppressed，报告只数根因。 */
const badKeys = new Set(problems.filter(p => p.kind === 'dollar' || p.kind === 'ctrl').map(p => p.file + '|' + p.at));
const kept = [];
let suppressed = 0;
for (const p of problems) {
  if ((p.kind === 'bare' || p.kind === 'cjk' || p.kind === 'empty') && badKeys.has(p.file + '|' + p.at)) { suppressed++; continue; }
  kept.push(p);
}
problems.length = 0;
problems.push.apply(problems, kept);

const byKind = {};
for (const p of problems) byKind[p.kind] = (byKind[p.kind] || 0) + 1;
const errN = problems.filter(p => ERROR_KINDS[p.kind]).length;
const warnN = problems.length - errN;

/* 基线：整份问题清单写盘，之后每次只对「基线外的新问题」报错。 */
if (opt.writeBaseline) {
  const list = Array.from(new Set(problems.filter(p => ERROR_KINDS[p.kind]).map(fingerprint))).sort();
  fs.mkdirSync(path.dirname(opt.baseline), { recursive: true });
  fs.writeFileSync(opt.baseline, JSON.stringify({
    note: '存量公式问题基线。这张表只准变短：修掉一条就 node tools/math_text_check.js --write-baseline 重写一次。',
    written: new Date().toISOString().slice(0, 10),
    count: list.length,
    items: list
  }, null, 1), 'utf8');
  console.log('基线写入 ' + path.relative(ROOT, opt.baseline).replace(/\\/g, '/') + '：' + list.length + ' 条存量 ERROR');
  process.exit(0);
}

let known = new Set();
let hasBaseline = false;
if (!opt.noBaseline && fs.existsSync(opt.baseline)) {
  try {
    known = new Set(JSON.parse(fs.readFileSync(opt.baseline, 'utf8')).items || []);
    hasBaseline = true;
  } catch (e) { known = new Set(); }
}
const fresh = hasBaseline ? problems.filter(p => ERROR_KINDS[p.kind] && !known.has(fingerprint(p))) : problems.filter(p => ERROR_KINDS[p.kind]);
const frozen = errN - fresh.length;
const shown = fresh.length ? fresh : problems;

console.log('扫描 ' + got.files.length + ' 个文件（' + got.note + '），' + nStr + ' 段文本，其中 ' + nFormula + ' 段含公式');
for (const k of Object.keys(KIND_CN)) {
  const list = shown.filter(p => p.kind === k);
  if (!list.length) continue;
  const mark = ERROR_KINDS[k] ? 'ERROR' : 'WARN ';
  const tag = fresh.length ? '（新问题）' : (hasBaseline && ERROR_KINDS[k] ? '（存量，已冻结）' : '');
  console.log('');
  console.log('=== ' + mark + ' ' + k + '（' + KIND_CN[k] + '）: ' + list.length + tag);
  list.slice(0, opt.top).forEach(p => {
    console.log('   ' + p.file + ' ' + p.at + ' :: ' + p.frag);
    console.log('      原因: ' + p.msg);
    console.log('      原文: ' + p.sample);
  });
  if (list.length > opt.top) console.log('   ...还有 ' + (list.length - opt.top) + ' 条');
}
console.log('');
if (hasBaseline) {
  console.log('新问题（基线外）ERROR ' + fresh.length + ' 处；存量已冻结 ' + frozen + ' 处；WARN ' + warnN + ' 处');
  if (fresh.length) console.log('基线文件：' + path.relative(ROOT, opt.baseline).replace(/\\/g, '/') + '（修完再 --write-baseline 重写，这张表只准变短）');
} else {
  console.log(errN ? ('ERROR ' + errN + ' 处，WARN ' + warnN + ' 处（没有基线文件，全量都算新问题）') : ('没有 ERROR，WARN ' + warnN + ' 处'));
}
if (suppressed) console.log('（另有 ' + suppressed + ' 条 bare/cjk/empty 是同串 $ 没配对带出来的，已合并到 dollar 里，不重复计数）');
if (opt.json) {
  fs.mkdirSync(path.dirname(path.join(ROOT, opt.json)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, opt.json), JSON.stringify({ scanned: got.files.length, strings: nStr, formula: nFormula, byKind, fresh: fresh.length, frozen, problems }, null, 1), 'utf8');
  console.log('报告写到 ' + opt.json);
}
process.exit(fresh.length ? 1 : 0);
