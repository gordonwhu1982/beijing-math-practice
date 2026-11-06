'use strict';
const { spawn } = require('child_process');
const fs = require('fs'); const path = require('path'); const http = require('http');
const ROOT = path.resolve(__dirname, '..');
const CHROME = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = 9342;
const INDEX = 'file:///' + path.join(ROOT, 'runtime', 'web', 'index.html').replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/').replace('file%3A%2F%2F', 'file://');
const sleep = ms => new Promise(r => setTimeout(r, ms));
function getJson(u) { return new Promise((res, rej) => { const q = http.get(u, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => { try { res(JSON.parse(b)); } catch (e) { rej(e); } }); }); q.on('error', rej); q.setTimeout(4000, () => q.destroy(new Error('t'))); }); }
class CDP {
  constructor(ws) { this.ws = ws; this.id = 0; this.waiting = new Map(); ws.addEventListener('message', e => { const m = JSON.parse(e.data); if (m.id && this.waiting.has(m.id)) { const w = this.waiting.get(m.id); this.waiting.delete(m.id); m.error ? w.reject(new Error(m.error.message)) : w.resolve(m.result); } }); }
  static async attach(u) { const ws = new WebSocket(u); await new Promise((r, j) => { ws.addEventListener('open', r); ws.addEventListener('error', j); }); return new CDP(ws); }
  send(m, p) { const id = ++this.id; return new Promise((res, rej) => { this.waiting.set(id, { resolve: res, reject: rej }); this.ws.send(JSON.stringify({ id, method: m, params: p || {} })); setTimeout(() => { if (this.waiting.has(id)) { this.waiting.delete(id); rej(new Error('timeout ' + m)); } }, 30000); }); }
  async eval(x) { const r = await this.send('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text)); return r.result && r.result.value; }
}
const MEASURE = function () {
  var v = window.MC.mapView, cy = v.cy(); if (!cy) return { err: 'no cy' };
  /* 重叠要分两档看：ovBox 只算卡片本身（布局错了），overlaps 含标签（字没截够）。
     两者分开，才知道该改布局还是该改截断。 */
  /* 前三条重叠的 kind 对：只看数字不知道该改布局还是改截断，得看是谁压着谁 */
  function OVS() {
    var ns = cy.nodes().filter(function (n) { return n.style('display') !== 'none' && n.data('kind'); });
    var out = [];
    for (var i = 0; i < ns.length && out.length < 3; i++) {
      for (var j = i + 1; j < ns.length && out.length < 3; j++) {
        var a = ns[i].renderedBoundingBox(), b = ns[j].renderedBoundingBox();
        if (a.x1 < b.x2 - 1 && b.x1 < a.x2 - 1 && a.y1 < b.y2 - 1 && b.y1 < a.y2 - 1) {
          out.push({ a: ns[i].data('id'), ak: ns[i].data('kind'), aw: Math.round(a.w), ah: Math.round(a.h),
                     b: ns[j].data('id'), bk: ns[j].data('kind'), bw: Math.round(b.w), bh: Math.round(b.h) });
        }
      }
    }
    return out;
  }
  function OV(withLabel) {
    var ns = cy.nodes().filter(function (n) { return n.style('display') !== 'none' && n.data('kind'); });
    var bad = 0;
    for (var i = 0; i < ns.length; i++) {
      for (var j = i + 1; j < ns.length; j++) {
        var a = ns[i].renderedBoundingBox({ includeLabels: withLabel }), b = ns[j].renderedBoundingBox({ includeLabels: withLabel });
        if (a.x1 < b.x2 - 1 && b.x1 < a.x2 - 1 && a.y1 < b.y2 - 1 && b.y1 < a.y2 - 1) bad++;
      }
    }
    return bad;
  }
  var bb = cy.elements().boundingBox(), c = cy.container();
  var kp = cy.nodes().filter(function (n) { return n.data('kind') === 'knowledge_point'; })[0] || cy.nodes()[0];
  return { counts: v.counts(), canvas: { w: c.clientWidth, h: c.clientHeight }, bbox: { w: Math.round(bb.w), h: Math.round(bb.h) }, zoom: +cy.zoom().toFixed(4), nodes: cy.nodes().length, edges: cy.edges().length,
    kinds: Object.keys(cy.nodes().reduce(function (m, n) { var k = n.data('kind'); m[k] = (m[k] || 0) + 1; return m; }, {})).sort().map(function (k) { return k; }).reduce(function (o, k) { o[k] = cy.nodes().filter(function (n) { return n.data('kind') === k; }).length; return o; }, {}),
    agg: cy.edges().filter(function (e) { return e.data('x') === 'agg'; }).length,
    overlaps: OV(true), overlapsBox: OV(false), ovSample: OVS(), sampleRendered: kp ? { w: Math.round(kp.renderedWidth()), h: Math.round(kp.renderedHeight()) } : null, labelFontPx: +(11 * cy.zoom()).toFixed(2) };
};
const SET = function (patch) { return 'window.MC.mapView.state.vol=' + JSON.stringify(patch.vol) + ';window.MC.mapView.state.ch=' + JSON.stringify(patch.ch) + ';window.MC.mapView.state.depth=' + JSON.stringify(patch.depth) + ';window.MC.mapView.state.view=' + JSON.stringify(patch.view) + ';window.MC.mapView.rebuild();';
};
(async () => {
  const profile = path.join(ROOT, 'out', 'chrome-profile-probe2');
  fs.rmSync(profile, { recursive: true, force: true });
  const ch = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, '--no-first-run', '--no-default-browser-check', '--disable-extensions', '--allow-file-access-from-files', '--hide-scrollbars', '--window-size=1440,900', '--force-device-scale-factor=1', 'about:blank'], { stdio: 'ignore' });
  let ws = null;
  for (let i = 0; i < 60; i++) { try { const l = await getJson('http://127.0.0.1:' + PORT + '/json/list'); const p = l.find(t => t.type === 'page'); if (p) { ws = p.webSocketDebuggerUrl; break; } } catch (e) {} await sleep(250); }
  const cdp = await CDP.attach(ws); await cdp.send('Page.enable'); await cdp.send('Runtime.enable');
  await cdp.send('Page.navigate', { url: INDEX + '#/map' }); await sleep(3400);
  const cases = [
    ['overview', { view: 'overview', vol: '801', ch: 'all', depth: 'all' }],
    ['chart-801-chapter10', { view: 'chart', vol: '801', ch: '10', depth: 'all' }],
    ['chart-all-vol801', { view: 'chart', vol: '801', ch: 'all', depth: 'all' }],
    ['kp-all-repo', { view: 'kp', vol: 'all', ch: 'all', depth: 'all' }],
    ['kp-801-all-ch', { view: 'kp', vol: '801', ch: 'all', depth: 'all' }],
    ['skill-all-repo', { view: 'skill', vol: 'all', ch: 'all', depth: 'all' }],
    ['thought-all', { view: 'thought', vol: 'all', ch: 'all', depth: 'all' }],
  ];
  for (const [name, patch] of cases) {
    await cdp.eval(SET(patch)); await sleep(1800);
    try { console.log(name, JSON.stringify(await cdp.eval('(' + MEASURE.toString() + ')()'))); } catch (e) { console.log(name, 'ERR', e.message); }
  }
  ch.kill(); process.exit(0);
})();
