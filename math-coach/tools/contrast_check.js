#!/usr/bin/env node
/**
 * 对比度自检：从 app.css 的 :root 把 token 颜色解出来，算 WCAG 对比度与 CIELAB 明度差。
 *
 * 为什么要有这道门：整站的颜色都走 var(--x)，一个 token 改错，所有用到它的地方一起变淡，
 * 而「变淡」不报错、不留日志。用户看到的「这行字看着费劲」永远没有代码层面的证据，
 * 只能等人眼发现。这道门把 --ink-faint 在 --card 上到底是 2.6:1 还是 5.1:1 变成一条命令。
 *
 * 判据（按元素类型分三组，各用各的量纲 —— 混用会得出「浅色界面永远不合格」的假结论）：
 *   ① 文字 token × 主表面      WCAG 对比度 >= 4.5
 *   ② 描边 token × 相邻表面     WCAG 对比度 >= 1.5
 *   ③ 面 token × 相邻面         CIELAB 明度差 >= 4 个 L* 单位（dL* >= 0.04）
 *
 * ③ 为什么不用对比度：WCAG 对比度公式在浅色区被 (L+0.05) 的常数项压扁 —— 纯白与
 * #dfe9f6 的对比度只有 1.23:1，但两者的 L* 差是 8.0，肉眼一眼能分出「白卡」和
 * 「卡里的浅蓝块」。拿 1.5:1 去要求浅色面，等于要求所有卡片底色都做成中灰，
 * 那不是可读性，是把界面弄脏。所以面与面只判明度差，4 个 L* 是「大面积色块
 * 一定看得见」的经验下限（人眼对大面积色块的阈值约 1 个 L*）。
 *
 * ② 为什么描边留 1.5 而不是 3（WCAG 1.4.11 对 UI 组件边界的要求）：描边在这里是
 * 「卡与卡之间的分隔提示」，不是「缺失就无法操作的控件边界」。1.5 是它能被看见
 * 的下限；卡本身的边界由 --line 与阴影共同承担。
 *
 * 第二阶段才做的事（留个路标，别以为是漏了）：
 *   18px 以上或 700 字重的文字 WCAG 放宽到 3.0；色相差异 dE 与色盲可辨性。
 *
 * 用法：node tools/contrast_check.js
 * 退出码：不达标项数（0 = 全过）。
 */
'use strict';
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CSS = path.join(ROOT, 'runtime', 'web', 'app.css');

/* 四个主表面：正文区、页面底、卡片、卡片内的次级底。
   徽标/药丸那几层 soft 底色没有列进来 —— 它们上面的字是成对指定的（--green 配 --green-soft），
   等第二阶段按配对表判，先别在这个矩阵里误伤。 */
const SURFACES = ['--paper', '--paper-2', '--card', '--card-2'];

/* 会当文字用的 token：正文/次要/弱提示 + 三档难度 + 三域 + 状态色。 */
const TEXTS = [
  '--ink', '--ink-soft', '--ink-mute', '--ink-faint',
  '--green', '--green-strong',
  '--basic', '--standard', '--advanced', '--challenge', '--competition',
  '--amber', '--red', '--ok', '--slate',
  '--dom-num', '--dom-geo', '--dom-sta',
];

/* ② 描边：必须和「压在下面的那个面」分得开，否则分隔线等于不存在。 */
const EDGES = [
  ['--line', ['--card', '--paper']],
  ['--line-strong', ['--card', '--paper']],
];

/* ③ 面：底色层级。--card-2 是卡内的次级底（节点卡、行条），--card-3 是「当前列」，
   它压在 --card-2 上也要分得开。 */
const SURFACE_PAIRS = [
  ['--card-2', ['--card', '--paper']],
  ['--card-3', ['--card', '--card-2']],
];

const MIN_TEXT = 4.5;
const MIN_EDGE = 1.5;
const MIN_SURFACE_DL = 0.04;

/**
 * Blank out CSS comments while keeping newlines, so reported lines stay honest.
 * @param {string} text css source
 * @return {string} same length, comments replaced by spaces
 */
function stripComments(text) {
  return text.replace(/\/\*[\s\S]*?\*\//g, function (m) { return m.replace(/[^\n]/g, ' '); });
}

/**
 * Read the declaration body of the first "selector { ... }" block at/after a match.
 * @param {string} text haystack
 * @param {RegExp} pattern selector pattern
 * @return {string} block body without braces, empty when absent
 */
function readBlock(text, pattern) {
  const at = text.search(pattern);
  if (at < 0) return '';
  const open = text.indexOf('{', at);
  if (open < 0) return '';
  let depth = 0;
  for (let i = open; i < text.length; i++) {
    const c = text[i];
    if (c === '{') depth++;
    else if (c === '}') { depth--; if (depth === 0) return text.slice(open + 1, i); }
  }
  return text.slice(open + 1);
}

/**
 * Parse "--name: value;" pairs out of a block body.
 * @param {string} body block body
 * @return {Map<string, string>} token table
 */
function parseDecls(body) {
  const map = new Map();
  const re = /(--[A-Za-z0-9_-]+)\s*:\s*([^;]+);/g;
  let m;
  while ((m = re.exec(body))) map.set(m[1], m[2].trim());
  return map;
}

/**
 * Turn one token value into [r, g, b], following var() chains.
 * Returns null for anything that is not a plain hex colour (color-mix, rgba, keywords).
 * @param {string} raw token value
 * @param {Map<string, string>} map token table
 * @param {number} depth recursion guard
 * @return {number[]|null} rgb triple
 */
function toRgb(raw, map, depth) {
  const d = depth || 0;
  if (d > 6) return null;
  const v = String(raw || '').trim();
  const hex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.exec(v);
  if (hex) {
    let h = hex[1];
    if (h.length === 3) h = h[0] + h[0] + h[1] + h[1] + h[2] + h[2];
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const ref = /^var\(\s*(--[A-Za-z0-9_-]+)\s*(?:,[\s\S]*)?\)$/.exec(v);
  if (ref) return map.has(ref[1]) ? toRgb(map.get(ref[1]), map, d + 1) : null;
  return null;
}

/**
 * WCAG relative luminance.
 * @param {number[]} rgb rgb triple
 * @return {number} 0..1
 */
function luminance(rgb) {
  const f = function (c) {
    const x = c / 255;
    return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(rgb[0]) + 0.7152 * f(rgb[1]) + 0.0722 * f(rgb[2]);
}

/**
 * WCAG contrast ratio between two colours.
 * @param {number[]} a rgb triple
 * @param {number[]} b rgb triple
 * @return {number} 1..21
 */
function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  return (Math.max(la, lb) + 0.05) / (Math.min(la, lb) + 0.05);
}

/**
 * CIELAB L* normalised to 0..1.
 * @param {number[]} rgb rgb triple
 * @return {number} 0..1
 */
function lstar(rgb) {
  const y = luminance(rgb);
  const raw = y > 0.008856 ? 116 * Math.cbrt(y) - 16 : 903.3 * y;
  return raw / 100;
}

/**
 * Check one mode (light or dark) over its token table.
 * @param {string} label printed mode name
 * @param {Map<string, string>} map token table
 * @param {string[]} fails accumulator of failure lines
 * @param {string[]} skips accumulator of skip notes
 * @return {void}
 */
function checkMode(label, map, fails, skips) {
  const cache = new Map();
  const color = function (name) {
    if (!cache.has(name)) cache.set(name, toRgb(map.get(name), map, 0));
    return cache.get(name);
  };
  for (const t of TEXTS) {
    const fg = color(t);
    if (!fg) { skips.push(label + ' ' + t + ' 值不是纯 hex'); continue; }
    for (const s of SURFACES) {
      const bg = color(s);
      if (!bg) continue;
      const cr = contrast(fg, bg);
      if (cr < MIN_TEXT) {
        fails.push(label + ' 文字 ' + t + ' 压在 ' + s + ' 上 ' + cr.toFixed(2) + ':1 < ' + MIN_TEXT);
      }
    }
  }
  for (const [name, against] of EDGES) {
    const fg = color(name);
    if (!fg) { skips.push(label + ' ' + name + ' 值不是纯 hex'); continue; }
    for (const s of against) {
      const bg = color(s);
      if (!bg) continue;
      const cr = contrast(fg, bg);
      if (cr < MIN_EDGE) {
        fails.push(label + ' 描边 ' + name + ' 对 ' + s + ' ' + cr.toFixed(2) + ':1 < ' + MIN_EDGE);
      }
    }
  }
  for (const [name, against] of SURFACE_PAIRS) {
    const fg = color(name);
    if (!fg) { skips.push(label + ' ' + name + ' 值不是纯 hex'); continue; }
    for (const s of against) {
      const bg = color(s);
      if (!bg) continue;
      const dl = Math.abs(lstar(fg) - lstar(bg));
      if (dl < MIN_SURFACE_DL) {
        fails.push(label + ' 面 ' + name + ' 对 ' + s + ' dL* ' + (dl * 100).toFixed(1) + ' < ' + (MIN_SURFACE_DL * 100));
      }
    }
  }
}

/**
 * Entry point: parse both modes, print failures, return the count.
 * @return {number} number of failures
 */
function main() {
  if (!fs.existsSync(CSS)) {
    console.log('对比度自检 · 找不到 ' + CSS);
    console.log('  [FAIL] 环境没就绪，等于这道门不存在');
    return 1;
  }
  const css = stripComments(fs.readFileSync(CSS, 'utf8'));
  const light = parseDecls(readBlock(css, /:root\s*\{/));
  const darkAt = css.search(/@media[^{]*prefers-color-scheme\s*:\s*dark/);
  const dark = darkAt >= 0 ? parseDecls(readBlock(css.slice(darkAt), /:root\s*\{/)) : new Map();

  console.log('对比度自检 · runtime/web/app.css');
  console.log('  浅色 token ' + light.size + ' 个 · 深色 token ' + dark.size + ' 个');
  if (!light.size) {
    console.log('  [FAIL] 没解析到 :root，等于这道门没生效');
    return 1;
  }
  if (!dark.size) console.log('  [WARN] 没解析到深色 :root（prefers-color-scheme: dark），深色档这条不查');

  const fails = [];
  const skips = [];
  checkMode('浅色', light, fails, skips);
  if (dark.size) checkMode('深色', dark, fails, skips);

  if (skips.length) {
    console.log('  [SKIP] ' + skips.length + ' 项：' + skips.slice(0, 4).join('；') + (skips.length > 4 ? ' …' : ''));
  }
  for (const line of fails) console.log('  [FAIL] ' + line);

  if (fails.length) {
    console.log('');
    console.log('不达标 ' + fails.length + ' 项。');
    console.log('修法：改 :root 里的 token 值，别在用到的地方单独加深 —— 单独加深就是把同一个问题复制 N 份。');
    return fails.length;
  }
  console.log('  [OK] 对比度');
  return 0;
}

process.exitCode = Math.min(main(), 120);
