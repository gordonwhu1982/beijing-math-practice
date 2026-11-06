/* 记录层：作答事件只追加，存 localStorage。导出 JSONL 供家长合并。 */
(function () {
  'use strict';
  var MC = window.MC;
  var KEY = 'mc.records.v1';

  function all() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { return []; }
  }
  /* 写失败（几乎都是容量满）必须留痕：静默吞掉的表现是「记录不再增长」，最难察觉 */
  function save(a) {
    try { localStorage.setItem(KEY, JSON.stringify(a)); MC.store.lastError = null; return true; }
    catch (e) { MC.store.lastError = (e && e.name) || 'write-failed'; return false; }
  }
  /* 返回是否真的写进 localStorage：界面要能把「没存上」说出来，而不是照常报「已记录」 */
  function push(r) {
    var a = all(); a.push(r); return save(a);
  }
  function replaceLast(r) {
    var a = all();
    if (a.length && a[a.length - 1].uid === r.uid) a[a.length - 1] = r; else a.push(r);
    return save(a);
  }
  function clear() { localStorage.removeItem(KEY); MC.store.lastError = null; }
  /* 去重键：uid 自带时间戳；手工整理过的文件可能丢掉 uid，就用 题+节+时间 兜住 */
  function rowKey(r) {
    return String(r.uid || ((r.item || '?') + '@' + (r.sec || '?') + '@' + (r.ts || 0)));
  }
  /* 合并外部导入的记录（幂等：同一批导两次不会翻倍）。
     坏行不阻塞整体，计数后交回界面报数。 */
  function merge(rows) {
    var a = all(), seen = {}, i, r, k;
    for (i = 0; i < a.length; i++) seen[rowKey(a[i])] = 1;
    var added = 0, dup = 0, bad = 0;
    for (i = 0; i < rows.length; i++) {
      r = rows[i];
      if (!r || typeof r !== 'object' || !r.item || !r.ts) { bad++; continue; }
      k = rowKey(r);
      if (seen[k]) { dup++; continue; }
      seen[k] = 1; a.push(r); added++;
    }
    a.sort(function (x, y) { return (Number(x.ts) || 0) - (Number(y.ts) || 0); });
    save(a);
    return { added: added, dup: dup, bad: bad, total: a.length };
  }
  /* 解析一份 JSONL 文本：逐行 parse，坏行计数，不抛。 */
  function parseJsonl(text) {
    var out = [], bad = 0, lines = String(text || '').split(/\r?\n/);
    for (var i = 0; i < lines.length; i++) {
      var s = lines[i].trim();
      if (!s) continue;
      try { out.push(JSON.parse(s)); } catch (e) { bad++; }
    }
    return { rows: out, bad: bad };
  }
  function todayKey() { return new Date().toDateString(); }
  /* 今天做了几「题」。同一道题会写下多条记录（交卷、看答案、自评、跳过各一条），
     数记录条数会和目录页的「做过 N 题」（按题去重）对不上：同一份数据，两个数。
     按 item 去重，和 toc.js 的口径一致。 */
  function todayCount() {
    var k = todayKey(), seen = {}, n = 0;
    all().forEach(function (r) {
      if (new Date(r.ts).toDateString() !== k) return;
      var key = r.item || ('_' + (r.ts || '') + (r.sec || ''));
      if (seen[key]) return;
      seen[key] = 1; n++;
    });
    return n;
  }
  /* 每节统计：次数、对、错、做到过哪些题 */
  function bySec() {
    var out = {};
    var sjOf = (MC.core && MC.core.selfJudged) ? MC.core.selfJudged : function () { return ''; };
    all().forEach(function (r) {
      var b = out[r.sec] = out[r.sec] || { n: 0, c: 0, w: 0, b: 0, m: 0, items: {}, last: {}, h: {}, self: {} };
      b.n++;
      /* 「判不了 · 你自己定的」不算判题器判对：不进 c，最后一次按 manual 记，
         目录页就不会把它数进「独立做对」（口径同带提示）。 */
      var sj = sjOf(r);
      if (sj === 'correct') { b.m++; }
      else if (r.final === 'correct') b.c++;
      if (r.final === 'wrong') b.w++;
      /* 没做（跳过/空白卷）与判不了也是记录，不单独数就会「N 次 = 对 + 错」对不上 */
      if (r.final === 'blank') b.b++;
      if (r.final === 'manual') b.m++;
      b.items[r.item] = 1;
      /* 最后一次的结果与是否用过提示：目录页要算「独立做对几道」。
         记录按追加顺序（导入时已按 ts 排序），后写的覆盖前面的即可 */
      b.last[r.item] = (sj === 'correct') ? 'manual' : (r.final || '');
      /* 是否带提示同样只看最后一次：原来只置 1 不清零，孩子后来自己独立做对，
         「独立做对几道」仍永久少一。 */
      if (r.hint && r.hint !== 'none') b.h[r.item] = 1; else delete b.h[r.item];
      /* 「你自己定的」也只看最后一次：改回「判不了」就清零。界面用它单列。 */
      if (sj) b.self[r.item] = sj; else delete b.self[r.item];
    });
    return out;
  }
  /* 每道题的最后一条记录（一条题一条）。
     会做率、做对/没做对的分母是「做过几道题」，不是「写过几条记录」：
     重练、看答案、勾错因、自评各会 +1 条，按条数算就会把
     「4 道题、后来全改对了」显示成「8 条记录 · 会做率 50%」——孩子明明全会了。 */
  function lastEach() {
    var seen = {}, out = [];
    all().forEach(function (r) {
      var k = String(r.item || ('_' + (r.ts || '') + (r.sec || '')));
      if (seen[k]) { out[seen[k] - 1] = r; return; }
      seen[k] = out.length + 1; out.push(r);
    });
    return out;
  }
  function secHistory(sec) {
    return all().filter(function (r) { return r.sec === sec; });
  }
  function jsonl(rows) {
    return rows.map(function (r) { return JSON.stringify(r); }).join('\n') + '\n';
  }

  MC.store = {
    KEY: KEY, all: all, push: push, replaceLast: replaceLast, clear: clear,
    todayCount: todayCount, bySec: bySec, lastEach: lastEach, secHistory: secHistory, jsonl: jsonl,
    merge: merge, parseJsonl: parseJsonl, rowKey: rowKey
  };
})();
