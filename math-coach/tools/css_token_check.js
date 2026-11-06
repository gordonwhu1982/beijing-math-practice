#!/usr/bin/env node
/**
 * CSS 变量自检：var(--x) 用到的名字，必须在同一份文件里真的被定义过。
 *
 * 为什么要有这道门：app.css 里有一批 var() 指向根本不存在的变量
 * （--chip / --accent / --r-md / --bg2 / --ink2 / --sta / --bg）。
 * 浏览器遇到未定义的自定义属性，会把整条声明判为无效并回落到初始值 ——
 * 不抛错、不进控制台，「计数小药丸没有底色」「四行卡没有圆角」全都不吭声，
 * 只有人眼看出来才有人管。这道门把它变成一条命令。
 *
 * 用法：node tools/css_token_check.js
 *   默认扫 app.css（硬判）与 runtime/web/js/*.js、index.html 里的内联 var()（只提示）。
 *   内联那些不进退出码：视图 JS 里的 var() 可能是拼出来的字符串，误报率高，
 *   先当线索看，别当门。
 * 退出码：app.css 里未定义变量的个数（0 = 全都有定义）。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CSS = path.join(ROOT, 'runtime', 'web', 'app.css');
const JS_DIR = path.join(ROOT, 'runtime', 'web', 'js');
const HTML = path.join(ROOT, 'runtime', 'web', 'index.html');

/**
 * Blank out CSS comments while keeping every newline and column in place.
 *
 * 注释里也会写 var(--paper) 这种说明文字，直接扫会把它当成引用。
 * 抹成等长空白，行号才不会漂。
 * @param {string} text file content
 * @return {string} content with comment bodies replaced by spaces
 */
function stripCssComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, function (m) {
    return m.replace(/[^\n]/g, ' ');
  });
}

/**
 * Collect every custom-property definition and every var() reference.
 *
 * @param {string} text source text with comments already blanked
 * @return {{defs: Map<string, number[]>, uses: Map<string, number[]>}}
 */
function scan(text) {
  const defs = new Map();
  const uses = new Map();
  const lines = text.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const no = i + 1;
    let m;
    const reDef = /(--[A-Za-z0-9_-]+)\s*:/g;
    while ((m = reDef.exec(lines[i]))) {
      if (!defs.has(m[1])) defs.set(m[1], []);
      defs.get(m[1]).push(no);
    }
    const reUse = /var\(\s*(--[A-Za-z0-9_-]+)/g;
    while ((m = reUse.exec(lines[i]))) {
      if (!uses.has(m[1])) uses.set(m[1], []);
      uses.get(m[1]).push(no);
    }
  }
  return { defs: defs, uses: uses };
}

/**
 * Format a line list as "file:1,2,3" with a cap.
 *
 * @param {string} label file name as printed
 * @param {number[]} nos 1-based line numbers
 * @return {string}
 */
function where(label, nos) {
  const head = nos.slice(0, 6).join(',');
  return label + ':' + head + (nos.length > 6 ? ' 等 ' + nos.length + ' 处' : '');
}

/**
 * Scan runtime/web/js/*.js and index.html for inline var() references.
 *
 * 只提示，不判红：这些字符串可能是拼出来的。
 * @return {Array<{name: string, where: string}>}
 */
function inlineRefs() {
  const out = [];
  const files = [];
  if (fs.existsSync(JS_DIR)) {
    for (const name of fs.readdirSync(JS_DIR)) {
      if (name.endsWith('.js')) files.push(path.join(JS_DIR, name));
    }
  }
  if (fs.existsSync(HTML)) files.push(HTML);
  for (const file of files) {
    const text = fs.readFileSync(file, 'utf8');
    const { uses } = scan(text);
    for (const [name, nos] of uses) {
      out.push({ name: name, where: where(path.basename(file), nos) });
    }
  }
  return out;
}

/**
 * Run the check and print one line per undefined variable.
 *
 * @return {number} exit code
 */
function main() {
  if (!fs.existsSync(CSS)) {
    console.log('CSS 变量自检 · 找不到 ' + CSS);
    console.log('  [FAIL] 环境没就绪，等于这道门不存在');
    return 1;
  }
  const css = stripCssComments(fs.readFileSync(CSS, 'utf8'));
  const { defs, uses } = scan(css);
  console.log('CSS 变量自检 · runtime/web/app.css');
  console.log('  定义 ' + defs.size + ' 个 · 引用 ' + uses.size + ' 种');

  const missing = [];
  for (const name of uses.keys()) {
    if (!defs.has(name)) missing.push(name);
  }
  missing.sort();

  for (const name of missing) {
    console.log('  [FAIL] ' + name + ' 未定义 · 用在 ' + where('app.css', uses.get(name)));
  }

  const unused = [];
  for (const name of defs.keys()) {
    if (!uses.has(name)) unused.push(name + '(' + defs.get(name)[0] + ')');
  }
  if (unused.length) {
    console.log('  [INFO] 定义了没人用 ' + unused.length + ' 个：' + unused.slice(0, 12).join(' '));
  }

  const inline = inlineRefs();
  if (inline.length) {
    const bad = inline.filter(function (x) { return !defs.has(x.name); });
    console.log('  [INFO] 内联 style 里引用 ' + inline.length + ' 处，其中 --x 未定义 ' + bad.length + ' 处（只提示，不计入退出码）');
    for (const x of bad.slice(0, 12)) {
      console.log('    [WARN] ' + x.name + ' 内联未定义 · ' + x.where);
    }
  }

  if (missing.length) {
    console.log('\n未定义 ' + missing.length + ' 个：' + missing.join(' '));
    console.log('修法：在 :root 里补定义，或把 var(--x) 改成已有的同名 token。');
    return missing.length;
  }
  console.log('  [OK] CSS 变量');
  return 0;
}

process.exitCode = Math.min(main(), 120);
