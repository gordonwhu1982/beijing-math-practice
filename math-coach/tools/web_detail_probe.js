#!/usr/bin/env node
/* 详情面板探针：点开思想 / 方法 / 知识点，断言新增的块真的出现在 DOM 里。
   冒烟只检查「页面渲染出来了」，这里检查「面板内容对不对」——
   架构 v4 加的思想层、方法边界声明、四计数都靠它守。
   用法：node tools/web_detail_probe.js */
'use strict';
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const CHROME = process.env.MC_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = Number(process.env.MC_CDP_PORT || 9344);
const INDEX = 'file:///' + path.join(ROOT, 'runtime', 'web', 'index.html').replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/').replace('file%3A%2F%2F', 'file://');

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }
function getJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, res => { let b = ''; res.on('data', d => (b += d)); res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } }); });
    req.on('error', reject);
    req.setTimeout(4000, () => req.destroy(new Error('cdp timeout')));
  });
}
class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.waiting = new Map();
    ws.addEventListener('message', ev => {
      const m = JSON.parse(ev.data);
      if (m.id && this.waiting.has(m.id)) { const w = this.waiting.get(m.id); this.waiting.delete(m.id); m.error ? w.reject(new Error(m.error.message)) : w.resolve(m.result); }
    });
  }
  static async attach(u) { const ws = new WebSocket(u); await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); }); return new CDP(ws); }
  send(method, params) { const id = ++this.id; return new Promise((resolve, reject) => { this.waiting.set(id, { resolve, reject }); this.ws.send(JSON.stringify({ id, method, params: params || {} })); setTimeout(() => { if (this.waiting.has(id)) { this.waiting.delete(id); reject(new Error('timeout ' + method)); } }, 20000); }); }
  async eval(e) { const r = await this.send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true }); if (r.exceptionDetails) throw new Error('eval: ' + ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text)); return r.result && r.result.value; }
}
async function waitDevtools() {
  for (let i = 0; i < 60; i++) {
    try { const l = await getJson('http://127.0.0.1:' + PORT + '/json/list'); const p = l.find(t => t.type === 'page'); if (p && p.webSocketDebuggerUrl) return p.webSocketDebuggerUrl; } catch (e) {}
    await sleep(250);
  }
  throw new Error('devtools 没起来');
}
function text(expr) { return '(function(){var d=document.getElementById("map-detail");return d?(d.innerText||"").replace(/\\s+/g," ").trim():"";})()'; }

(async () => {
  const profile = path.join(ROOT, 'out', 'chrome-profile-probe');
  fs.rmSync(profile, { recursive: true, force: true });
  const chrome = spawn(CHROME, ['--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile, '--no-first-run', '--allow-file-access-from-files', '--window-size=430,932', 'about:blank'], { stdio: 'ignore' });
  let bad = 0;
  try {
    const cdp = await CDP.attach(await waitDevtools());
    await cdp.send('Page.enable'); await cdp.send('Runtime.enable');

    async function open(hash) {
      await cdp.send('Page.navigate', { url: INDEX + hash });
      for (let i = 0; i < 40; i++) { await sleep(250); const n = await cdp.eval('(!!window.MC&&!!MC.mapView)?MC.mapView.counts().nodes:0'); if (n > 0) return n; }
      throw new Error('图没渲染出来：' + hash);
    }
    async function detailOf(id) {
      await cdp.eval('MC.mapView.pick(' + JSON.stringify(id) + ')');
      await sleep(1200);
      return cdp.eval(text());
    }
    function need(name, got, words) {
      const miss = words.filter(w => got.indexOf(w) < 0);
      if (miss.length) { bad++; console.log('FAIL ' + name + ' 缺：' + miss.join(' / ') + '\n     ' + got.slice(0, 160)); }
      else console.log('PASS ' + name + ' len=' + got.length + ' ok=' + words.length);
    }

    let n = await open('#/map?view=thought');
    console.log('thought 图：' + n + ' 点');
    /* 上位思想自己没挂方法，方法在下面的族里：跨册聚合必须递归到子族，否则这一块是空的 */
    need('thought TH-02 跨册', await detailOf('TH-02'), ['思想', '这个思想说的是什么', '它不管什么', '它在几册里反复出现', '按册看这些方法', '册 ·']);
    need('thought TH-07 方法族', await detailOf('TH-07'), ['方法族', '它在几册里反复出现', '按册看这些方法', '七年级上册']);

    n = await open('#/map?view=kp');
    /* kp 视图默认只画邻域，目标点不在图上就 pick 不到：先铺全图 */
    await cdp.eval('MC.mapView.state.depth="all";MC.mapView.rebuild()');
    await sleep(1500);
    n = await cdp.eval('MC.mapView.counts().nodes');
    console.log('kp 图：' + n + ' 点');
    const kpTxt = await detailOf('K801-12.1-01');
    need('kp 四计数', kpTxt, ['前置', '后续', '方法', '例题', '先得会，学完接着']);
    /* 课标要求：原句 + 条目号必须同时出现；有原句没有条目号，读者没法回指 */
    need('kp 课标要求', kpTxt, ['课标怎么要求', '原句引用', '4.GG.', '内容要求']);
    /* 素养这一段是两跳派生的（方法 → 思想 → 素养）：只断言出现不够，
       必须同时出现「条方法」「经…」与那句免责，否则读者会当成课标认定。 */
    need('kp 练到哪些素养', kpTxt, ['练到哪些素养', '条方法', '经', '不是课标对这个点的认定']);
    /* 认定层：素养来自这一点的课标条目（条目按内容领域与原文动词初判）。
       它与上一段那行派生结论必须同时在，且各自写清来路；只出现一个名字等于把两层混成一层。 */
    need('kp 课标条目对到哪些素养', kpTxt, ['课标条目对到哪些素养', '数学抽象', '初判', '不是教研逐条认定']);

    /* 横向关联：可以类比（equivalent_to）与容易混淆（contrast_with）。
       why 必须跟着出来——只有对方名字、没有理由，读者不知道能迁移什么、要防什么。 */
    const latTxt = await detailOf('K801-12.11-01');
    need('kp 可以类比', latTxt, ['可以类比', '锐角三角', '直角三角形', '类比出的是猜想']);
    need('kp 容易混淆', latTxt, ['容易混淆', '逆定理', '条件和结论', '放在一起对着记']);
    n = await open('#/map?view=skill');
    const sid = await cdp.eval('(function(){var c=MC.mapView.cy();var x=c.nodes().filter(function(n){return n.data("kind")==="skill";});return x.length?x[0].id():null;})()');
    console.log('skill 图：' + n + ' 点，取 ' + sid);
    need('skill 边界与思想', await detailOf(sid), ['一句话说清', '它管不到的地方', '边界声明', '它体现的思想']);
    /* 方法之间的先后：pick() 只对当前图里画着的节点有效，所以先按落点打开，
       别指望 pick 一个不在邻域里的方法 id（上一次就是因此读到上一个方法的详情）。 */
    await open('#/map?view=skill&node=SK-801-10.4-02');
    await sleep(1200);
    need('skill 先练哪个', await cdp.eval(text()), ['先练哪个', '先练：', '通分', '逐条起草', '还没有教研复核']);

    /* 方法→方法的前置边（x=sk）是推断出来的，画虚线。断言它真的进了图：
       只断言图例有字不够，图例有字而边没画，孩子看到的还是一盘散沙。 */
    await cdp.eval('MC.mapView.state.vol="801";MC.mapView.state.ch="all";MC.mapView.state.depth="all";MC.mapView.rebuild()');
    await sleep(1800);
    const skDep = await cdp.eval('(function(){var c=MC.mapView.cy();var e=c.edges().filter(function(x){return x.data("r")==="prerequisite_of"&&x.data("x")==="sk";});return {n:e.length,one:e.length?e[0].data("source")+"→"+e[0].data("target"):""};})()');
    if (skDep && skDep.n > 0) console.log('PASS skill 方法前置虚线 ' + skDep.n + ' 条 ' + skDep.one);
    else { bad++; console.log('FAIL skill 方法前置虚线 0 条（边没进图或 x 没透传）'); }

    /* 知识点整页（#/kp/<uid>）必须与右栏同一份（spec 5.1）：两处各写一套，同一句话就会有两个版本。
       这里直接打开整页读文本，词表按七段固定项取。 */
    await cdp.send('Page.navigate', { url: INDEX + '#/kp/K801-12.1-01' });
    let pageTxt = '';
    for (let i = 0; i < 48; i++) {
      await sleep(250);
      pageTxt = await cdp.eval('(function(){var w=document.querySelector(".detail-page");return w?(w.innerText||"").replace(/\\s+/g," ").trim():"";})()');
      if (pageTxt.length > 200) break;
    }
    console.log('  整页 len=' + pageTxt.length + ' 前 160 字：' + pageTxt.slice(0, 160));
    need('kp 整页与右栏同一份', pageTxt, ['这句话是什么', '不能把它用成什么', '课标怎么要求', '先得会，学完接着', '思想和做法', '课本在哪']);

    /* 思想也走同一条整页路由（kp 路由放宽到 TH-）：点第 4 段的思想按钮要真能打开那一层 */
    await cdp.send('Page.navigate', { url: INDEX + '#/kp/TH-03' });
    let thTxt = '';
    for (let i2 = 0; i2 < 48; i2++) {
      await sleep(250);
      thTxt = await cdp.eval('(function(){var w=document.querySelector(".detail-page");return w?(w.innerText||"").replace(/\\s+/g," ").trim():"";})()');
      if (thTxt.length > 120) break;
    }
    need('思想整页', thTxt, ['分类讨论', '思想']);
  } finally {
    try { chrome.kill(); } catch (e) {}
  }
  console.log(bad ? ('\n' + bad + ' 项失败') : '\n详情面板全过');
  process.exit(bad ? 1 : 0);
})();
