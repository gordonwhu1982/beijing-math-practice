#!/usr/bin/env node
'use strict';
/* 有作答记录时的 today 出图：注入 mc.records.v1 后截全页。
   用途：ux_asserts 量的是数字，这里出的是那一态的样子 —— 首次态、零记录态之外，
   第三种「真的做了题」的状态必须亲眼看一次（2026-10-30 就是靠它看出
   「每一行都写着带提示」与「只印节名认不出哪道题」）。
   用法：node tools/preview_seeded_today.js        → out/shots/M430-today-seeded.png
         W=1280 SHOT=out/shots/x.png node tools/preview_seeded_today.js */
const { spawn } = require('child_process');
const fs = require('fs'); const path = require('path'); const http = require('http');
const ROOT = path.resolve(__dirname, '..');
const CHROME = process.env.MC_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const HTTP_PORT = Number(process.env.MC_PROBE_HTTP || 8124);
const CDP_PORT = Number(process.env.MC_PROBE_CDP || 9368);
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.json': 'application/json', '.png': 'image/png' };
function serve() { return new Promise(res => { const s = http.createServer((req, rsp) => { let p = decodeURIComponent(req.url.split('?')[0].split('#')[0]); if (p === '/') p = '/runtime/web/index.html'; const f = path.join(ROOT, p); if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end('404'); return; } rsp.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' }); fs.createReadStream(f).pipe(rsp); }); s.listen(HTTP_PORT, '127.0.0.1', () => res(s)); }); }
function getJson(url) { return new Promise((resolve, reject) => { const req = http.get(url, r => { let b = ''; r.on('data', d => b += d); r.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } }); }); req.on('error', reject); req.setTimeout(3000, () => req.destroy(new Error('timeout'))); }); }
const sleep = ms => new Promise(r => setTimeout(r, ms));
let idc = 0;
function rpc(ws, method, params) { return new Promise((res, rej) => { const id = ++idc; const on = ev => { const m = JSON.parse(ev.data); if (m.id === id) { ws.removeEventListener('message', on); m.error ? rej(new Error(method + ': ' + JSON.stringify(m.error))) : res(m.result); } }; ws.addEventListener('message', on); ws.send(JSON.stringify({ id, method, params: params || {} })); }); }

/* 记录的真实形状照 practice.js:511 抄：sec 是节号不带册（如 '11.1'），band 必有，volume 必有 */
function rec(item, sec, daysAgo, hour, final) {
  const d = new Date(); d.setDate(d.getDate() - daysAgo); d.setHours(hour || 19, 12, 0, 0);
  const band = /adv/.test(item) ? 'advanced' : (/int|_0[5-9]/.test(item) ? 'standard' : 'basic');
  return { schema_version: 1, uid: 'EV-' + item + '-' + daysAgo + '-' + hour, item: item, sec: sec, band: band, ts: d.getTime(), verdict: final === 'correct' ? 'correct' : 'wrong', final: final, how: 'exact', hint: 'none', seconds: 42, volume: '801', chapter: sec.split('.')[0] };
}
/* 真实形状：中间断过几天、有错没改、有做对过该抽回来看看的 */
const RECS = [
  rec('11.1_bas_01', '11.1', 6, 19, 'correct'), rec('11.1_bas_02', '11.1', 6, 19, 'correct'),
  rec('11.1_bas_03', '11.1', 6, 19, 'wrong'), rec('11.1_int_01', '11.1', 6, 19, 'correct'),
  rec('11.1_bas_04', '11.1', 4, 18, 'correct'), rec('11.1_bas_05', '11.1', 4, 18, 'correct'),
  rec('11.1_int_02', '11.1', 4, 18, 'correct'), rec('11.1_int_03', '11.1', 4, 18, 'correct'),
  rec('11.1_bas_03', '11.1', 4, 18, 'correct'),
  rec('11.1_bas_06', '11.1', 2, 20, 'correct'), rec('11.1_bas_07', '11.1', 2, 20, 'correct'),
  rec('11.1_int_04', '11.1', 2, 20, 'wrong'), rec('11.1_int_04', '11.1', 1, 20, 'correct'),
  rec('11.1_bas_08', '11.1', 1, 20, 'correct'), rec('11.1_bas_09', '11.1', 1, 20, 'correct'),
  rec('11.1_bas_10', '11.1', 1, 20, 'correct'), rec('11.1_bas_11', '11.1', 1, 20, 'correct'),
  rec('11.1_bas_12', '11.1', 0, 17, 'correct'), rec('11.1_bas_13', '11.1', 0, 17, 'correct'),
  rec('11.1_bas_14', '11.1', 0, 17, 'wrong'), rec('11.1_bas_15', '11.1', 0, 17, 'correct'),
  rec('11.1_int_05', '11.1', 0, 17, 'correct'), rec('11.1_int_06', '11.1', 0, 17, 'wrong'),
  rec('11.1_int_07', '11.1', 0, 17, 'correct'), rec('11.1_adv_01', '11.1', 0, 17, 'correct'),
  rec('11.2_bas_01', '11.2', 0, 18, 'correct'), rec('11.2_bas_02', '11.2', 0, 18, 'correct'),
  rec('11.2_bas_03', '11.2', 0, 18, 'blank'), rec('11.2_bas_04', '11.2', 0, 18, 'correct')
];

const INFO_EXPR = [
  '(function(){',
  '  var t = document.body.innerText;',
  '  var pri = document.querySelector(".btn-primary");',
  '  return JSON.stringify({',
  '    todayN: (window.MC && MC.store) ? MC.store.todayCount() : -1,',
  '    priTop: pri ? Math.round(pri.getBoundingClientRect().top + window.scrollY) : -1,',
  '    priTxt: pri ? pri.innerText.trim() : "",',
  '    hasWeek: t.indexOf("\u8fd9\u4e00\u5468") >= 0,',
  '    hasDue: t.indexOf("\u62bd\u56de\u6765") >= 0 || t.indexOf("\u8be5\u62bd") >= 0,',
  '    bodyH: Math.round(Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)),',
  '    head: t.slice(0, 300).replace(/\\n/g, " | ")',
  '  });',
  '})()'
].join('\n');

(async () => {
  const server = await serve();
  const profile = path.join(ROOT, 'out', 'cdp-seed-profile');
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check', '--remote-allow-origins=*', '--remote-debugging-port=' + CDP_PORT, '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
  let ver = null;
  for (let i = 0; i < 60 && !ver; i++) { try { ver = await getJson('http://127.0.0.1:' + CDP_PORT + '/json/version'); } catch (e) { await sleep(300); } }
  if (!ver) { console.log('CHROME_FAIL'); chrome.kill(); server.close(); process.exit(1); }
  const list = await getJson('http://127.0.0.1:' + CDP_PORT + '/json/list');
  const page = list.find(t => t.type === 'page');
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', () => rej(new Error('ws fail'))); });
  await rpc(ws, 'Page.enable', {}); await rpc(ws, 'Runtime.enable', {});
  const W = Number(process.env.W || 430), H = 900;
  await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 2, mobile: W < 600 });
  const base = 'http://127.0.0.1:' + HTTP_PORT + '/runtime/web/index.html#/today';
  await rpc(ws, 'Page.navigate', { url: base });
  await sleep(1800);
  const seed = 'localStorage.setItem("mc.records.v1", ' + JSON.stringify(JSON.stringify(RECS)) + ');' +
    'localStorage.setItem("mc.settings.v1", JSON.stringify({current:"11.1",picked:true})); "seeded"';
  await rpc(ws, 'Runtime.evaluate', { expression: seed, returnByValue: true });
  await rpc(ws, 'Page.navigate', { url: base });
  await sleep(700);
  await rpc(ws, 'Runtime.evaluate', { expression: 'location.reload()' });
  await sleep(2800);
  const info = await rpc(ws, 'Runtime.evaluate', { expression: INFO_EXPR, returnByValue: true });
  console.log('INFO ' + info.result.value);
  const dim = await rpc(ws, 'Runtime.evaluate', { expression: 'Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)', returnByValue: true });
  const fullH = Math.min(Number(dim.result.value) || 900, 9000);
  await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: W, height: fullH, deviceScaleFactor: 2, mobile: W < 600 });
  await sleep(400);
  const cap = await rpc(ws, 'Page.captureScreenshot', { format: 'png', captureBeyondViewport: true });
  const out = process.env.SHOT || ('out/shots/M' + W + '-today-seeded.png');
  fs.writeFileSync(path.join(ROOT, out), Buffer.from(cap.data, 'base64'));
  console.log('SHOT ' + out + ' ' + Math.round(cap.data.length * 0.75) + 'B');
  ws.close(); chrome.kill(); server.close(); setTimeout(() => process.exit(0), 300);
})();