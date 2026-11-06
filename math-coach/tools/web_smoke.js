#!/usr/bin/env node
/**
 * 新前端全路由冒烟：无头 Chrome 逐个打开 hash 路由，检查渲染结果与控制台错误，并截图。
 * 用法：node tools/web_smoke.js [route ...]
 * 产物：out/shots/web-<name>.png、out/shots/web-report.json
 */
'use strict';
const { spawn, execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const OUT = path.join(ROOT, 'out', 'shots');
const CHROME = process.env.MC_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const PORT = Number(process.env.MC_CDP_PORT || 9333);
const INDEX = 'file:///' + path.join(ROOT, 'runtime', 'web', 'index.html').replace(/\\/g, '/').split('/').map(encodeURIComponent).join('/').replace('file%3A%2F%2F', 'file://');

const ROUTES = [
  ['today', '#/today', [/今日|开始练|今天/]],
  ['toc', '#/toc', [/目录|第 1 章|有理数|三角形/]],
  ['toc-vol', '#/toc/801', [/三角形|分式/]],
  ['sec', '#/sec/801/12.1', [/三角形|知识点/]],
  ['kp', '#/kp/K801-12.1-01', [/这句话是什么|成立条件|这一节|只有标题/]],
  ['kp-10', '#/kp/K801-10.1-01', [/分式|只有标题|定义|这一节/]],
  /* 方法分三档（教材 / 培优 / 竞赛拓展）时，知识点页要把三档都写出来。
     原来钉的是 10.4-01，但那个点实际只挂了教材方法（4 条方法全 core），
     所以 /培优方法|竞赛/ 永远是 0/1 —— 断的词表没错，钉的点选错了。
     换成三档齐全的 10.2-01：约分·通分（教材）/ 设 k 法（培优）/ 取特殊值（竞赛拓展）。 */
  ['kp-tier', '#/kp/K801-10.2-01', [/教材方法/, /培优方法/, /竞赛拓展/]],
  ['sec-702', '#/sec/702/4.1', [/不等式|知识点|这一节/]],
  /* 六册 detail 必须都并进切片。build_web 曾经只读 --vol 那一册，
     其他册的知识点页面就只剩空态；这里拿七年级的定义原文钉住它。 */
  /* 第二条原来断 /定义/，但 1.1 这一点的 kind 是「概念」，页面上印的是
     「概念」与「这句话是什么」，通篇没有「定义」二字 —— 是断的词表没对齐，不是页面坏了。 */
  ['kp-701', '#/kp/K701-1.1-01', [/在正数前面加上符号/, /这句话是什么/]],
  ['sec-ch-end', '#/sec/801/ch-end-12', [/章末综合|题|知识点/]],
  ['sec-10', '#/sec/801/10.1', [/分式|知识点|这一节/]],
  ['practice-10', '#/practice/801/10.1', [/第 1 题|交卷|题/]],
  /* spec 4.1 之后默认档已经换成「一张网」（mind）：读图提示讲的是每种圈各是什么，
     而旧断言读的是章图（chart）那句「上下是这一节里的点」。默认档换了、断言没跟着换，
     于是这条一直报 exp=0/1 却仍然是 PASS（判据不看 expectHit）。现在断默认档真画出来的那段话。 */
  /* 2026-11-03：六册全景改成章级卡片图（26 张章卡片 + 6 个册名），提示与图例都换了话。
     断的必须是这一档真画出来的东西：卡片、先修、教材顺序。 */
  /* 430 宽走 DOM 列表（没有连线，图例也收起），1280 宽走画布章卡片图；
     两边都真的有的东西是：这是章级全景、卡片上写着「这一章 N 个知识点」。 */
  ['map', '#/map', [/六册全景/, /知识点/, /章/]],
  // 架构 v4：思想层是新增的第五个视角，标题里必须有「思想 / 方法族」才算渲染出来
  ['map-thought', '#/map?view=thought', [/思想|方法族/]],
  // 骨架图现在同时画「先修」与「教材顺序」两种边，图例要点明这一点
  ['map-skeleton', '#/map?view=skeleton', [/教材顺序|先修/]],
  ['practice', '#/practice/801/12.1', [/第 1 题|交卷|题/]],
  ['archive', '#/archive', [/档案|记录/]],
  ['evidence', '#/evidence', [/依据总览|人工判定|规则推断/]],
  /* 下面四条是 11 个视图里一直没进冒烟的那一批：它们不在导航栏上，只在
     「今日 / 错题 / 思想」几个入口深处出现，坏了两天没人发现。文案按空态实测。 */
  ['weak', '#/weak', [/哪里不稳/, /做过的题/]],
  ['retry', '#/retry', [/错题重练/, /攒到这里|欠着/]],
  ['thoughts', '#/thoughts', [/思想不是第 17 个学科/, /上位思想/, /条方法/]],
  ['rel', '#/rel/K802-16.2-03', [/先得会/, /就是这里/, /求根公式|配方法/]],
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

/* 等到页面自己把东西画出来，而不是猜一个 sleep。
   2026-10-31：retry-mixed 用固定 sleep(1800) 等 #/retry 的列表，在机器忙的时候
   读到的是「正在打开…」——同一份代码在 check_all 里 PASS、在提交钩子里 FAIL，
   一条随机红的闸门比没有闸门更坏（会让人习惯性重跑）。改成轮询到条件成立，
   超时就把最后的表达式结果交给调用方，让断言照常判真伪。 */
async function waitFor(cdp, expr, timeoutMs) {
  const until = Date.now() + (timeoutMs || 8000);
  for (;;) {
    const v = await cdp.eval(expr);
    if (v) return { ok: true, value: v };
    if (Date.now() > until) return { ok: false, value: v };
    await sleep(150);
  }
}

function getJson(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, res => {
      let b = '';
      res.on('data', d => (b += d));
      res.on('end', () => { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.setTimeout(4000, () => { req.destroy(new Error('cdp timeout')); });
  });
}

class CDP {
  constructor(ws) {
    this.ws = ws; this.id = 0; this.waiting = new Map(); this.events = [];
    ws.addEventListener('message', ev => {
      const msg = JSON.parse(ev.data);
      if (msg.id && this.waiting.has(msg.id)) {
        const w = this.waiting.get(msg.id);
        this.waiting.delete(msg.id);
        msg.error ? w.reject(new Error(msg.error.message)) : w.resolve(msg.result);
      } else if (msg.method) { this.events.push(msg); }
    });
  }
  static async attach(wsUrl) {
    const ws = new WebSocket(wsUrl);
    await new Promise((res, rej) => { ws.addEventListener('open', res); ws.addEventListener('error', rej); });
    return new CDP(ws);
  }
  send(method, params) {
    const id = ++this.id;
    return new Promise((resolve, reject) => {
      this.waiting.set(id, { resolve, reject });
      this.ws.send(JSON.stringify({ id, method, params: params || {} }));
      setTimeout(() => { if (this.waiting.has(id)) { this.waiting.delete(id); reject(new Error('timeout ' + method)); } }, 20000);
    });
  }
  async eval(expr) {
    const r = await this.send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true });
    if (r.exceptionDetails) throw new Error('eval: ' + ((r.exceptionDetails.exception && r.exceptionDetails.exception.description) || r.exceptionDetails.text));
    return r.result && r.result.value;
  }
  drainErrors() {
    const out = [];
    for (const e of this.events) {
      if (e.method === 'Runtime.exceptionThrown') {
        const d = e.params.exceptionDetails;
        out.push('exception: ' + ((d.exception && d.exception.description) || d.text));
      } else if (e.method === 'Log.entryAdded' && e.params.entry.level === 'error') {
        out.push('log: ' + e.params.entry.text + (e.params.entry.url ? ' @' + e.params.entry.url : ''));
      } else if (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') {
        out.push('console: ' + e.params.args.map(a => a.value || a.description || '').join(' '));
      }
    }
    this.events = [];
    return out;
  }
}

function startChrome() {
  const profile = path.join(ROOT, 'out', 'chrome-profile-smoke');
  fs.rmSync(profile, { recursive: true, force: true });
  return spawn(CHROME, [
    '--headless=new', '--remote-debugging-port=' + PORT, '--user-data-dir=' + profile,
    '--no-first-run', '--no-default-browser-check', '--disable-extensions',
    '--allow-file-access-from-files', '--hide-scrollbars',
    '--window-size=430,932', '--force-device-scale-factor=2', 'about:blank',
  ], { stdio: 'ignore' });
}

async function waitDevtools() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await getJson('http://127.0.0.1:' + PORT + '/json/list');
      const page = list.find(t => t.type === 'page');
      if (page && page.webSocketDebuggerUrl) return page.webSocketDebuggerUrl;
    } catch (e) {}
    await sleep(250);
  }
  throw new Error('devtools 没起来：' + CHROME);
}

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const only = process.argv.slice(2).filter(a => !a.startsWith('--'));
  const routes = only.length ? ROUTES.filter(r => only.includes(r[0])) : ROUTES;
  let chrome = null;
  const results = [];
  try {
    chrome = startChrome();
    const cdp = await CDP.attach(await waitDevtools());
    await cdp.send('Page.enable'); await cdp.send('Runtime.enable'); await cdp.send('Log.enable');
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 2, mobile: true });

    for (const [name, hash, expect] of routes) {
      cdp.drainErrors();
      await cdp.send('Page.navigate', { url: INDEX + hash });
      await sleep(300);
      let rendered = false;
      for (let i = 0; i < 40; i++) {
        await sleep(250);
        const len = await cdp.eval('(function(){var a=document.getElementById("app");return a?(a.innerText||"").trim().length:0;})()');
        if (len > 30) { rendered = true; break; }
      }
      await sleep(450);
      /* 这里曾经把 innerText 截到 600 字再匹配。知识点页 1509 字、方法分层从第 831 字才开始，
         于是 /教材方法/ 这种断言永远打不中后半页，报 0/3 却没人知道是截断的锅。
         文案匹配就该看全文；真正要短的是写进报告的 text（另在 results 里 slice 240）。 */
      const info = await cdp.eval('(function(){var app=document.getElementById("app");var txt=app?(app.innerText||""):"";return {title:document.title,topbar:(document.getElementById("topbar")||{}).textContent||"",len:txt.length,text:txt.replace(/\s+/g," "),overflowX:document.documentElement.scrollWidth-document.documentElement.clientWidth,overflowTop:(function(){var cw=document.documentElement.clientWidth,out=[];document.querySelectorAll("body *").forEach(function(el){var r=el.getBoundingClientRect();if(r.width>0&&r.right>cw+1){out.push({d:Math.round(r.right-cw),k:el.children.length,t:el.tagName+(el.id?"#"+el.id:"")+(typeof el.className==="string"&&el.className.trim()?"."+el.className.trim().split(/\s+/).slice(0,2).join("."):""),x:(el.innerText||"").replace(/\s+/g," ").slice(0,20)});}});out.sort(function(a,b){return a.k-b.k||b.d-a.d;});return out.slice(0,3);})(),canvas:!!document.querySelector("#cy canvas, #cy svg")};})()');
      const errs = cdp.drainErrors();
      /* 公式落地检查：页面文字层里不该再看到 $…$、不该有裸 LaTeX 命令、
         更不该出现被 JSON 转义吃出来的控制字符（换页/制表/退格）。
         这三样只要出现，就说明有一处公式没渲染成，用户看到的是源码或乱码。 */
      const mathRaw = await cdp.eval('(function(){var app=document.getElementById("app");var txt=app?(app.innerText||""):"";var ctrl=(txt.match(/[\\u0008\\u000c\\u0009]/g)||[]).length;var dm=(txt.match(/\\$\\$[^$]{0,40}/g)||[]);var sm=(txt.match(/\\$[^$\\s]{0,40}\\$/g)||[]);var cmd=(txt.match(/\\\\(frac|sqrt|triangle|angle|cdot|times|div|leq|geq|neq|pm)(?![a-zA-Z])/g)||[]);var ke=document.querySelectorAll(".katex-error").length;var mf=(window.MC&&MC.core&&MC.core.mathFails)?MC.core.mathFails:[];return JSON.stringify({ctrl:ctrl,ke:ke,dollar:dm.length+sm.length,cmd:cmd.length,fail:mf.length,fails:mf.slice(0,3),samples:sm.slice(0,3).concat(cmd.slice(0,3))});})()');
      let math = {};
      try { math = JSON.parse(mathRaw || '{}'); } catch (e) { math = { ctrl: 0, ke: 0, dollar: 0, cmd: 0, samples: [] }; }
      const shot = await cdp.send('Page.captureScreenshot', { format: 'png' });
      fs.writeFileSync(path.join(OUT, 'web-' + name + '.png'), Buffer.from(shot.data, 'base64'));
      const hit = expect.filter(re => re.test(info.text)).length;
      /* 控制字符、katex-error、katexFail 判失败：这三样一定是渲染坏了。
         katexFail 是路由渲染过程中 MC.core.mathFails 记下的次数（失败后退回原文，
         页面上不留 .katex-error，只看 DOM 会漏）。填空占位「______」不算，
         core.js 的 fillerTex 已把它挡在记数之外。
         残留的 $ 与裸命令先只报不判——题库里还有截断在公式中间的旧串（figure.hint 一带），
         把它们当硬红会让整个闸门常红，反而没人看。等数据清完再收紧。 */
      const hardMath = (math.ctrl || 0) + (math.ke || 0) + (math.fail || 0);
      /* 量了就要判。expectHit 和 overflowX 这两条一直只打印、不进 pass，
         于是 map 报 exp=0/1 是 PASS、kp-tier 报 0/1 是 PASS、sec 报 overflowX=65 也是 PASS ——
         断言坏了整整两天没人发现，最后是用户先看出来的。
         现在两条都进判据：文案一条不落地命中才算对，横向溢出必须为 0。 */
      const expOk = hit === expect.length;
      const ovfOk = info.overflowX === 0;
      const pass = rendered && errs.length === 0 && hardMath === 0 && expOk && ovfOk;
      results.push({ name, hash, pass, rendered, expectHit: hit + '/' + expect.length, consoleErrors: errs, math, overflowX: info.overflowX, overflowTop: info.overflowTop, canvas: info.canvas, len: info.len, topbar: info.topbar.slice(0, 60), text: info.text.slice(0, 240) });
      console.log((pass ? 'PASS ' : 'FAIL ') + name.padEnd(9) + ' len=' + String(info.len).padStart(5) + ' overflowX=' + info.overflowX + (info.overflowX ? ' ovf=' + JSON.stringify(info.overflowTop) : '') + ' exp=' + hit + '/' + expect.length
        + (expOk ? '' : ' EXP!')
        + (ovfOk ? '' : ' OVF!')
        + (errs.length ? ' ERR=' + errs.slice(0, 2).join(' | ') : '')
        + (hardMath ? ' MATH! ctrl=' + math.ctrl + ' katex-error=' + math.ke + ' katexFail=' + math.fail : '')
        + ((math.fails && math.fails.length) ? ' first=' + String(JSON.stringify(math.fails[0])).slice(0, 90) : '')
        + ((math.dollar || math.cmd) ? ' mathWarn($=' + math.dollar + ',cmd=' + math.cmd + ')' : ''));
    }

    /* ---- 桌面档：430 只保护手机，1280 才是家里那块屏 ----
       窄屏能过、宽屏溢出（左栏 236px 只在 1280 才出现），是这轮最容易漏的一类。
       主路由在 1280 下再跑一遍，判据与手机档完全一致：文案满分 + 横向溢出为 0。 */
    async function probeRoute(tag, hash, expect) {
      cdp.drainErrors();
      await cdp.send('Page.navigate', { url: INDEX + hash });
      await sleep(300);
      let rendered = false;
      for (let i = 0; i < 40; i++) {
        await sleep(250);
        const len = await cdp.eval('(function(){var a=document.getElementById("app");return a?(a.innerText||"").trim().length:0;})()');
        if (len > 30) { rendered = true; break; }
      }
      await sleep(450);
      const info = await cdp.eval('(function(){var app=document.getElementById("app");var txt=app?(app.innerText||""):"";return {len:txt.length,text:txt.replace(/\s+/g," "),overflowX:document.documentElement.scrollWidth-document.documentElement.clientWidth,overflowTop:(function(){var cw=document.documentElement.clientWidth,out=[];document.querySelectorAll("body *").forEach(function(el){var r=el.getBoundingClientRect();if(r.width>0&&r.right>cw+1){out.push({d:Math.round(r.right-cw),k:el.children.length,t:el.tagName+(el.id?"#"+el.id:"")+(typeof el.className==="string"&&el.className.trim()?"."+el.className.trim().split(/\s+/).slice(0,2).join("."):""),x:(el.innerText||"").replace(/\s+/g," ").slice(0,20)});}});out.sort(function(a,b){return a.k-b.k||b.d-a.d;});return out.slice(0,3);})()};})()');
      const errs = cdp.drainErrors();
      const hit = expect.filter(re => re.test(info.text)).length;
      const expOk = hit === expect.length;
      const ovfOk = info.overflowX === 0;
      const pass = rendered && errs.length === 0 && expOk && ovfOk;
      results.push({ name: tag, hash, pass, rendered, expectHit: hit + '/' + expect.length, consoleErrors: errs, overflowX: info.overflowX, overflowTop: info.overflowTop, len: info.len, text: info.text.slice(0, 240) });
      console.log((pass ? 'PASS ' : 'FAIL ') + tag.padEnd(13) + ' len=' + String(info.len).padStart(5) + ' overflowX=' + info.overflowX + (info.overflowX ? ' ovf=' + JSON.stringify(info.overflowTop) : '') + ' exp=' + hit + '/' + expect.length
        + (expOk ? '' : ' EXP!') + (ovfOk ? '' : ' OVF!')
        + (errs.length ? ' ERR=' + errs.slice(0, 2).join(' | ') : ''));
      return info;
    }

    /* kp/K801-11.1-02 不在 ROUTES 里（路由表钉的是 12.1 那一节），宽屏这遍补上。 */
    const WIDE_EXTRA = ['kp-11', '#/kp/K801-11.1-02', [/这句话是什么/, /成立条件/, /算术平方根|非负的平方根/]];
    const wideList = ['today', 'toc-vol', 'sec', 'map', 'practice']
      .map(n => ROUTES.find(r => r[0] === n)).concat([WIDE_EXTRA]);
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false });
    await sleep(400);
    for (const [name, hash, expect] of wideList) {
      await probeRoute('w1280-' + name, hash, expect);
    }
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 430, height: 932, deviceScaleFactor: 2, mobile: true });
    await sleep(300);

    /* ---- 可点性一致 ----
       同一个「计数」控件，四个里三个能点、一个是纯文字，孩子点「例题」没反应也没处说理。
       这条同时钉两件事：.dd-count 必须同一个标签名；带 [data-jump] 的就必须真能点。 */
    await probeRoute('kp-counts', '#/kp/K801-10.2-01', [/这句话是什么|前置|后续/]);
    const countsRaw = await cdp.eval('(function(){var d=[].slice.call(document.querySelectorAll(".dd-count"));var dj=[].slice.call(document.querySelectorAll("[data-jump]"));return JSON.stringify({tags:d.map(function(x){return x.tagName;}),labels:d.map(function(x){return (x.textContent||"").replace(/\s+/g,"").slice(0,8);}),dj:dj.map(function(x){return x.tagName+"|"+(x.getAttribute("role")||"-");})});})()');
    let counts = { tags: [], labels: [], dj: [] };
    try { counts = JSON.parse(countsRaw || '{}'); } catch (e) { counts = { tags: [], labels: [], dj: [] }; }
    const uniqTags = Array.from(new Set(counts.tags));
    const countPass = counts.tags.length >= 2 && uniqTags.length === 1;
    results.push({ name: 'count-tags', hash: '#/kp/K801-10.2-01', pass: countPass, tags: counts.tags, labels: counts.labels });
    console.log((countPass ? 'PASS ' : 'FAIL ') + 'count-tags'.padEnd(13) + ' n=' + counts.tags.length + ' tags=' + JSON.stringify(counts.tags) + ' labels=' + JSON.stringify(counts.labels));
    const badJump = counts.dj.filter(s => { const p = String(s).split('|'); return !(p[0] === 'BUTTON' || p[1] === 'button'); });
    const jumpPass = badJump.length === 0;
    results.push({ name: 'jump-clickable', pass: jumpPass, dj: counts.dj });
    console.log((jumpPass ? 'PASS ' : 'FAIL ') + 'jump-clickable'.padEnd(13) + ' n=' + counts.dj.length + (badJump.length ? ' bad=' + JSON.stringify(badJump) : ''));

    /* ---- 图例完整性（WARN，暂不判红）----
       图里画了几种线，图例就该有几条说明；少一条，孩子就看不懂那根线是什么意思。
       暂时只告警的原因：图例文案是自然语言（「实线 = 必须先会」），与 edges 上的
       x / r 键没有稳定映射，机械比较只能退化成「条目数 ≥ 线种数」这个下限，
       硬判红一定误报。等图例结构化成 [{x:'seq', label:'细虚线 = 书上的先后'}] 再升级成硬断言。 */
    const LEGEND_CASES = [
      ['mind', '#/map', 3200],
      ['skill', '#/map?view=skill&sec=801/12.1', 3000],
      ['chart', '#/map?view=chart&vol=801&ch=12', 3000],
    ];
    for (const [view, hash, wait] of LEGEND_CASES) {
      await cdp.send('Page.navigate', { url: INDEX + '#/today' });
      await sleep(350);
      await cdp.send('Page.navigate', { url: INDEX + hash });
      await sleep(wait);
      const lgRaw = await cdp.eval('(function(){var l=document.getElementById("map-legend");var out={items:l?l.children.length:0,xs:{},err:""};try{var cy=null;if(window.MC&&MC.mapView&&typeof MC.mapView.cy==="function")cy=MC.mapView.cy();if(cy&&cy.edges){cy.edges().forEach(function(e){var dd=e.data?e.data():{};var x=dd.x||"r";out.xs[x]=(out.xs[x]||0)+1;});}else{out.err="no-cy";}}catch(e){out.err=String(e);}return JSON.stringify(out);})()');
      let lg = { items: 0, xs: {}, err: '' };
      try { lg = JSON.parse(lgRaw || '{}'); } catch (e) { lg = { items: 0, xs: {}, err: '' }; }
      const kinds = Object.keys(lg.xs || {}).length;
      /* 取不到画出来的线种（MC.mapView.cy 不在）就退化成下限：图例至少 2 条。 */
      const ok = kinds ? (lg.items || 0) >= kinds : (lg.items || 0) >= 2;
      results.push({ name: 'legend-' + view, pass: true, warn: !ok, items: lg.items, kinds: kinds, xs: lg.xs });
      console.log((ok ? 'WARN-OK ' : 'WARN    ') + ('legend-' + view).padEnd(13) + ' 条目=' + lg.items + ' 线种=' + kinds + (lg.err ? ' (' + lg.err + ')' : '') + ' ' + JSON.stringify(lg.xs) + (ok ? '' : '  <- 图例少于线种，先只告警'));
    }

    cdp.drainErrors();
    await cdp.send('Page.navigate', { url: INDEX + '#/practice/801/12.1' });
    await sleep(1600);
    await cdp.eval('(function(){var ta=document.querySelector("textarea.answer");if(ta){ta.value="0";ta.dispatchEvent(new Event("input",{bubbles:true}));}var b=document.querySelector(".toolbar .btn-primary");if(b)b.click();return 1;})()');
    await sleep(900);
    const res = await cdp.eval('(function(){var r=document.querySelector(".result");return r?r.textContent.replace(/\s+/g," ").slice(0,160):"(no .result)";})()');
    const errs2 = cdp.drainErrors();
    const shot2 = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, 'web-practice-submit.png'), Buffer.from(shot2.data, 'base64'));
    results.push({ name: 'practice-submit', pass: errs2.length === 0, result: res, consoleErrors: errs2 });
    console.log((errs2.length ? 'FAIL ' : 'PASS ') + 'practice-submit result="' + res + '"');

    /* 选择题：题干里的选项在文字层，就该点选卡片，不该让人往文本框里打字母。
       10.1 的队列里一定排到选择题。交卷后正确项必须被标出来（.opt-ok 恰好 1 个），
       四行卡按产品规则落地：题有点级映射时四行（卡在哪 / 先得会 / 做法 / 回到图上），
       没有映射时两行兜底。这里不钉「点哪个字母会判对」——那取决于这道题的正确项，
       是题库的事实而不是产品的规则，写死它只会让断言随题库变动假红。 */
    cdp.drainErrors();
    await cdp.send('Page.navigate', { url: INDEX + '#/practice/801/10.1' });
    await sleep(1600);
    const optInfo = await cdp.eval('(function(){var n=document.querySelectorAll(".opt").length;var ta=document.querySelector("textarea.answer");return JSON.stringify({opts:n,ta:!!ta});})()');
    const oi = JSON.parse(optInfo || '{}');
    let choiceRes = '', choiceRows = 0, choiceLabels = [];
    if (oi.opts === 4) {
      await cdp.eval('(function(){var b=document.querySelector(".opt[data-opt=A]");if(b)b.click();return 1;})()');
      await sleep(300);
      await cdp.eval('(function(){var b=document.querySelector(".toolbar .btn-primary");if(b)b.click();return 1;})()');
      await sleep(700);
      const cjRaw = await cdp.eval('(function(){var r=document.querySelector(".result");var ok=document.querySelectorAll(".opt-ok").length;var lab=[].map.call(document.querySelectorAll(".four-row .four-lbl"),function(x){return x.textContent.replace(/\\s+/g,"");});return JSON.stringify({res:r?r.textContent.replace(/\\s+/g," ").slice(0,80):"(no .result)",ok:ok,rows:document.querySelectorAll(".four-row").length,labels:lab});})()');
      const cj = JSON.parse(cjRaw || '{}');
      choiceRows = cj.rows || 0;
      choiceLabels = cj.labels || [];
      choiceRes = (cj.res || '') + ' | ok=' + cj.ok + ' | rows=' + choiceRows + ' | labels=' + choiceLabels.join('/');
    }
    const errsChoice = cdp.drainErrors();
    const shotChoice = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, 'web-practice-choice.png'), Buffer.from(shotChoice.data, 'base64'));
    /* 钉两件产品规则：点选卡片必须在（四个选项、没有文本框）；判错/判不了时四行卡
       必须给出「卡在哪」与「回到图上」（题已有点级映射时四行，没有映射时两行兜底）。
       「整节共通」只在无映射时出现，故不再要求它也不禁止它。 */
    /* 行数不再是 4 或 2：2026-10-31 起「怎么用（看完整诊断）」是可选的第 5 行，
       没有长解释的题就是 3 行。钉行数的绝对值等于把排版细节焊死，改钉骨架。 */
    const choicePass = oi.opts === 4 && oi.ta === false && /ok=1/.test(choiceRes) &&
      choiceRows >= 2 &&
      choiceLabels.indexOf('卡在哪') >= 0 && choiceLabels.indexOf('回到图上') >= 0 &&
      errsChoice.length === 0;
    results.push({ name: 'practice-choice', pass: choicePass, result: choiceRes, labels: choiceLabels, consoleErrors: errsChoice });
    console.log((choicePass ? 'PASS ' : 'FAIL ') + 'practice-choice opts=' + oi.opts + ' textarea=' + oi.ta + ' result="' + choiceRes + '"');

    /* 三列：卡住时先补哪几个。左列必须来自 prerequisite_of 的直接入边，
       中列是当前点，右列是直接出边；没有先修时左列写死一句「图里没有更早的点」。 */
    cdp.drainErrors();
    await cdp.send('Page.navigate', { url: INDEX + '#/map' });
    await sleep(2600);
    const idsRaw = await cdp.eval('(function(){var g=MC.mapGraph();if(!g)return "{}";var pre={},nx={};g.edges.forEach(function(e){if(e.r!=="prerequisite_of")return;pre[e.d]=(pre[e.d]||0)+1;nx[e.s]=(nx[e.s]||0)+1;});var kps=g.nodes.filter(function(n){return n.kind==="knowledge_point"});var a=kps.filter(function(n){return (pre[n.id]||0)>=2})[0];var b=kps.filter(function(n){return !pre[n.id]})[0];return JSON.stringify({a:a?a.id:"",b:b?b.id:"",cnt:kps.length});})()');
    const ids = JSON.parse(idsRaw || '{}');
    let relRes = '', relNoPre = '';
    if (ids.a) {
      await cdp.send('Page.navigate', { url: INDEX + '#/rel/' + ids.a });
      await sleep(1400);
      relRes = await cdp.eval('(function(){var cs=document.querySelectorAll(".rel-col");var now=document.querySelector(".rel-col.rel-now");var left=cs[0]?cs[0].querySelectorAll("li").length:0;var right=cs[2]?cs[2].querySelectorAll("li").length:0;return JSON.stringify({cols:cs.length,left:left,right:right,mid:now?now.textContent.replace(/\s+/g," ").slice(0,24):"",body:(document.body.innerText||"").replace(/\s+/g," ").slice(0,110)});})()');
    }
    if (ids.b) {
      await cdp.send('Page.navigate', { url: INDEX + '#/rel/' + ids.b });
      await sleep(1200);
      relNoPre = await cdp.eval('(function(){var cs=document.querySelectorAll(".rel-col");return cs[0]?cs[0].textContent.replace(/\\s+/g," ").slice(0,40):"";})()');
    }
    const rr = JSON.parse(relRes || '{}');
    const errsRel = cdp.drainErrors();
    const relPass = rr.cols === 3 && rr.left >= 2 && /就是这里/.test(String(rr.mid)) && ids.b ? relNoPre.indexOf('图里没有更早的点') >= 0 : false;
    const shotRel = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, 'web-rel.png'), Buffer.from(shotRel.data, 'base64'));
    results.push({ name: 'rel-cols', pass: relPass, info: rr, noPre: relNoPre, ids: ids, consoleErrors: errsRel });
    console.log((relPass ? 'PASS ' : 'FAIL ') + 'rel-cols ' + JSON.stringify(rr) + ' noPre="' + relNoPre + '"');

    /* 方法页要能给出「用它做过的题」：这些题是真做过点级映射的。
       点进去先进「先看这一题」（STATE §11，提交 a128978）：题干 + 答案与思路 + 「返回刚才的页」/「做这一题」，
       没有交卷、也不排整节；点「做这一题」才变成只做这一题的做题页。
       ch12 之外还没有映射，所以这一栏在别的册暂时是空的——那是「还没标」，不是「没用过」。 */
    cdp.drainErrors();
    await cdp.send('Page.navigate', { url: INDEX + '#/map?view=skill&node=SK-801-12.1-01' });
    await sleep(3000);
    const qs = await cdp.eval(`(function(){
      var d = document.querySelector('#map-detail'); var stt = window.MC.mapView ? MC.mapView.state : {};
      var as = [].slice.call(document.querySelectorAll('#map-detail .dd-q'));
      return { txt: d ? d.textContent.replace(/\s+/g,' ').slice(0,80) : '', n: as.length,
               href: as.length ? as[0].getAttribute('href') : '',
               st: { view: stt.view, focus: stt.focus, vol: stt.vol, ch: stt.ch, nodes: (MC.mapView.counts()||{}).nodes },
               len: d ? d.innerHTML.length : -1,
               hasQ: !!(document.querySelector('#map-detail .dd-q')) };
    })()`);
    const errsQs = cdp.drainErrors();
    await cdp.eval(`(function(){var a=document.querySelector('#map-detail .dd-q');if(a)a.click();return 1;})()`);
    await sleep(1800);
    /* 先落在「先看这一题」：题干、折叠的答案与思路、两个按钮，没有交卷 */
    const look = await cdp.eval(`(function(){
      var d = document.querySelector('.card');
      var h = d ? d.querySelector('.muted') : null;
      var fold = d ? d.querySelector('details.fold') : null;
      return { hash: location.hash.slice(0,70), head: h ? h.textContent.replace(/\s+/g,' ') : '',
               hasAns: !!document.querySelector('textarea.answer'),
               hasSubmit: !!document.querySelector('[data-act=submit]'),
               foldTxt: fold ? (fold.textContent||'').replace(/\s+/g,' ').slice(0,40) : '',
               hasDo: !!document.querySelector('[data-act=do]'),
               hasBack: !!document.querySelector('.card [data-go]') };
    })()`);
    /* 点「做这一题」才真要他做：只剩这一题，文本框和交卷都在 */
    await cdp.eval(`(function(){var b=document.querySelector('[data-act=do]');if(b)b.click();return 1;})()`);
    await sleep(1500);
    const one = await cdp.eval(`(function(){
      var h = document.querySelector('.card .muted');
      return { hash: location.hash.slice(0,70), head: h ? h.textContent.replace(/\s+/g,' ') : '',
               hasAns: !!document.querySelector('textarea.answer'),
               hasSubmit: !!document.querySelector('[data-act=submit]') };
    })()`);
    const errsOne = cdp.drainErrors();
    /* 只钉做题页会漏掉「先看」那一段，只钉「先看」会漏掉真能做题；两段一起钉 */
    const qsPass = qs.n >= 3 && qs.hasQ && /#\/practice\/801\/12\.1\?q=/.test(qs.href) &&
      /先看这一题/.test(look.head) && /看答案与思路/.test(look.foldTxt) &&
      !look.hasAns && !look.hasSubmit && look.hasDo && look.hasBack &&
      /第 1 \/ 1 题/.test(one.head) && one.hasAns && one.hasSubmit &&
      errsQs.length === 0 && errsOne.length === 0;
    results.push({ name: 'skill-qs', pass: qsPass, detail: qs, look: look, one: one, consoleErrors: errsQs.concat(errsOne) });
    console.log((qsPass ? 'PASS ' : 'FAIL ') + 'skill-qs n=' + qs.n + ' href="' + qs.href + '" look=' + JSON.stringify(look) + ' one=' + JSON.stringify(one));

    /* 写满了要说出来：localStorage 抛错时界面若照常报「记好了」，报告与导出都会静默少一条。
       这里临时把 setItem 换成抛 QuotaExceededError，交一卷，验完再换回来。 */
    cdp.drainErrors();
    await cdp.send('Page.navigate', { url: INDEX + '#/practice/801/10.1' });
    await sleep(1500);
    const savedKey = await cdp.eval('(function(){window.__mcSetItem = Storage.prototype.setItem;Storage.prototype.setItem = function(){var e=new Error("quota");e.name="QuotaExceededError";throw e;};var o=document.querySelector(".opt[data-opt=A]");if(o)o.click();var b=document.querySelector(".toolbar .btn-primary");if(b)b.click();return document.cookie?"x":"y";})()');
    await sleep(700);
    const saveBad = await cdp.eval('(function(){var e=document.querySelector(".savebad");var r=document.querySelector(".result");return JSON.stringify({bad:!!e,txt:e?e.textContent.replace(/\s+/g," ").slice(0,40):"",res:r?r.className:""});})()');
    await cdp.eval('(function(){if(window.__mcSetItem)Storage.prototype.setItem = window.__mcSetItem;delete window.__mcSetItem;return 1;})()');
    const sb = JSON.parse(saveBad || '{}');
    const errsSB = cdp.drainErrors();
    const sbPass = sb.bad === true && /没存上/.test(String(sb.txt)) && errsSB.length === 0;
    results.push({ name: 'save-full', pass: sbPass, info: sb, consoleErrors: errsSB });
    console.log((sbPass ? 'PASS ' : 'FAIL ') + 'save-full ' + JSON.stringify(sb));


    /* 判完要能看见「这题考」：12.10 节有高置信映射，队列里往后点几题必能撞上。
       映射是派生数据（ch12.kp.jsonl），前端拿不到就等于没做，所以要真在浏览器里验一次。 */
    cdp.drainErrors();
    await cdp.send('Page.navigate', { url: INDEX + '#/practice/801/12.10' });
    await sleep(1600);
    let kpTxt = '', four = { n: 0, lbl: [], href: '' };
    /* 一题一题往后走：12.10 的队列里前几题没有点级映射，碰上就只能出两行卡。
       所以不能拿「第 1 题」当断言对象，要找到那道真有映射的题。 */
    const ASK = '(function(){var out={};var d=document.querySelector("#drew");if(d&&!d.checked){d.checked=true;d.dispatchEvent(new Event("change",{bubbles:true}));}var o=document.querySelector(".opt[data-opt=A]");var ta=document.querySelector("textarea.answer");if(o){o.click();out.input="opt";}else if(ta){ta.value="0";ta.dispatchEvent(new Event("input",{bubbles:true}));out.input="text";}var b=document.querySelector("[data-act=submit]");if(b){b.click();out.act="submit";}else{var ag=document.querySelector("[data-act=again]");if(ag){ag.click();out.act="again";}}return JSON.stringify(out);})()';
    const SNAP = '(function(){var e=document.querySelector(".kp-of");var rows=[].slice.call(document.querySelectorAll(".four-row"));var last=rows.length?rows[rows.length-1].querySelector("a"):null;var sp=/[\\s\\u00a0]+/g;return JSON.stringify({kp:e?e.textContent.replace(sp," "):"",four:rows.length,lbl:rows.map(function(r){var l=r.querySelector(".four-lbl");return l?l.textContent:"";}),href:last?(last.getAttribute("href")||""):"",body:(document.body.innerText||"").replace(sp," ").slice(0,40)});})()';
    const ADV = '(function(){var n=document.querySelector("[data-act=next]");if(n){n.click();return 1;}var ag=document.querySelector("[data-act=again]");if(ag){ag.click();return 1;}return 0;})()';
    for (let i = 0; i < 16; i++) {
      const st = await cdp.eval(ASK) || '{}';
      await sleep(500);
      const snap = JSON.parse(await cdp.eval(SNAP) || '{}');
      if (snap.kp) kpTxt = snap.kp;
      if (snap.four >= 4 && /#\/map\?/.test(snap.href || '')) four = { n: snap.four, lbl: snap.lbl, href: snap.href };
      if (kpTxt && four.href) break;
      await cdp.eval(ADV);
      await sleep(420);
    }
    const errsKp = cdp.drainErrors();
    const shotKp = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, 'web-practice-kp.png'), Buffer.from(shotKp.data, 'base64'));
    const kpPass = !!kpTxt && /这题考：/.test(kpTxt) && errsKp.length === 0;
    results.push({ name: 'practice-kp', pass: kpPass, kpTxt, consoleErrors: errsKp });
    console.log((kpPass ? 'PASS ' : 'FAIL ') + 'practice-kp "' + kpTxt + '"');
    const fourLbl = ['卡在哪','先得会','做法','回到图上'];
    const fourPass = four.n >= 4 &&
      fourLbl.every(function (x) { return (four.lbl || []).indexOf(x) >= 0; }) &&
      /#\/map\?/.test(four.href || '');
    results.push({ name: 'four-rows', pass: fourPass, detail: four });
    console.log((fourPass ? 'PASS ' : 'FAIL ') + 'four-rows n=' + four.n + ' href="' + four.href + '"');

    /* 「回到图上」那条链接要真能落到点上并打开讲解，不然四行卡第 4 行就是假的。 */
    cdp.drainErrors();
    const backHref = four.href || '#/map?vol=801&sec=12.10';
    await cdp.send('Page.navigate', { url: INDEX + backHref });
    await sleep(3200);
    const back = JSON.parse(await cdp.eval(`(function(){
      /* 只认「画法」那一排按钮：#map-seg 里还有 lens 的 网络/分层 两个 seg-sub.on，
         取第一个 .on 会读到「网络」（2026-11-03 就因此误判过）。 */
      var on = document.querySelector('#map-seg button[data-view].on');
      var d = document.querySelector('#map-detail');
      var st = window.MC.mapView ? MC.mapView.state : {};
      return JSON.stringify({view: on ? on.textContent : '', txt: d ? d.textContent.replace(/\s+/g,' ').slice(0,60) : '',
                             hasNode: /node=/.test(location.hash), hash: location.hash.slice(0,80),
                             focus: st.focus, sv: st.view, vol: st.vol, ch: st.ch,
                             nodes: (window.MC.mapView ? (MC.mapView.counts().nodes || 0) : 0),
                             chips: document.querySelectorAll('#map-callouts .call-chip').length,
                             /* 2026-11-03 起「点开一个点」换成十字方位版式（#map-cross）：
                                上前置 / 中当前 / 下后续 / 右方法 / 同章。判据跟着量这份 DOM。 */
                             cross: (function(){ var c = document.querySelector('#map-cross');
                               return !!(c && !c.hidden && c.offsetHeight > 200); })(),
                             cards: document.querySelectorAll('#map-cross .mc-card').length,
                             self: (function(){ var h = document.querySelector('#map-cross .mc-self h3');
                               return h ? (h.innerText || '').replace(/\s+/g, ' ') : ''; })(),
                             has: !!(MC.mapView && document.querySelector('#map-detail'))});
    })()`) || '{}');
    /* 邻居标签是点开之后异步画的（scheduleCallouts + 首帧尺寸重试），3.2s 之后仍可能读到 0，
       补量一次再判，免得把「还没画完」当成「没画」。 */
    if (!back.chips) {
      await sleep(1200);
      const chips2 = await cdp.eval("document.querySelectorAll('#map-callouts .call-chip').length");
      if (typeof chips2 === 'number') back.chips = chips2;
    }
    const backErrs = cdp.drainErrors();
    /* 三件事都要真：图上真有节点（不是被邻域裁空）、详情不再是空态、落点就是那个知识点。
       空态开头是「点图上一个点」，读到它就说明 showDetail 根本没走。 */
    /* 2026-11-03：默认视图从 kp（邻域）改成 mind（导图 + 浮层卡），seg 上的高亮从
       「知识点」变成「导图」。同一件事的界面不该因为 URL 写没写 view= 而分两套，
       所以期望跟着改；同时要求图上真有邻居标签（chips>0），否则「回到了那一团」是空话。 */
    /* 十字档（2026-11-03 起）：焦点落在那个知识点上、中间那块写的就是它的名字、四周真排出了卡片。
       chips（画布上的邻居标签）在这一档是 0 —— 版式换掉了，不是没画。 */
    const backPass = back.view.indexOf('导图') >= 0 && back.nodes > 0 && back.cross === true &&
      back.cards >= 3 && String(back.self || '').length > 1 &&
      String(back.focus || '').indexOf('K801-12.10') === 0 && backErrs.length === 0;
    results.push({ name: 'map-node', pass: backPass, detail: back, consoleErrors: backErrs });
    console.log((backPass ? 'PASS ' : 'FAIL ') + 'map-node view=' + back.view + ' focus=' + back.focus +
      ' ch=' + back.ch + ' cross=' + back.cross + ' cards=' + back.cards + ' self="' + back.self + '"');

    /* 从十字档退回总图：画布必须真的回来（不是只把 hash 改回去）。
       实测过一次「点回到总图，屏上还是上一个点的卡片、画布 0 高」——releaseFocus
       改了状态却没重排版面。这条判据就是为它立的。 */
    await cdp.eval("(function(){var b=document.querySelector('#map-seg button[data-zoomout]');if(b)b.click();return 1;})()");
    await sleep(1600);
    const backTot = JSON.parse(await cdp.eval(`(function(){
      var cy = document.getElementById('cy'), c = document.getElementById('map-cross');
      return JSON.stringify({ hash: location.hash, cyW: cy ? cy.clientWidth : 0, cyH: cy ? cy.clientHeight : 0,
        cross: !!(c && !c.hidden), legend: !!(document.querySelector('.maplegend') && document.querySelector('.maplegend').offsetHeight) });
    })()`) || '{}');
    const totErrs = cdp.drainErrors();
    const totPass = backTot.cyW > 400 && backTot.cyH > 300 && backTot.cross === false &&
      backTot.legend === true && totErrs.length === 0;
    results.push({ name: 'map-back-total', pass: totPass, detail: backTot, consoleErrors: totErrs });
    console.log((totPass ? 'PASS ' : 'FAIL ') + 'map-back-total ' + JSON.stringify(backTot));

    /* 结构化答案（spec）在浏览器里也要判得动：取一道有 spec 的题，按 spec 构造学生答案 → 必须 correct */
    const probe = await cdp.eval(`(function(){
      return MC.data.loadItems('801','12.10').then(function(d){
        var list = (d.items||[]).filter(function(x){ return x.spec && x.spec.type==='exact_value'; });
        if (!list.length) return { ok:false, why:'no-spec-item' };
        var it = list[0], v = it.spec.values[0];
        var stu = String(v.num != null ? v.num : v.raw);
        var r = window.MCJudge.judgeWithSpec(it.spec, it.ans||'', stu);
        var rw = window.MCJudge.judgeWithSpec(it.spec, it.ans||'', stu + '7');
        return { ok: r.verdict==='correct', id: it.id, stu: stu, verdict: r.verdict, how: r.how,
                 wrongVerdict: rw.verdict };
      });
    })()`);
    const probePass = !!(probe && probe.ok);
    results.push({ name: 'spec-judge', pass: probePass, detail: probe });
    console.log((probePass ? 'PASS ' : 'FAIL ') + 'spec-judge ' + JSON.stringify(probe));

    /* 教材题要能进练习池并带来源标记：数据侧数一遍 src=教材，视图侧看 practice.js 是否渲染它 */
    const tb = await cdp.eval(`(function(){
      var secs = ['12.1','12.2','12.3','12.4','12.5','12.6','12.7','12.8','12.9','12.10','12.11','12.12','ch-end-12'];
      return Promise.all(secs.map(function(s){ return MC.data.loadItems('801', s); })).then(function(arr){
        var n = 0, fig = 0;
        arr.forEach(function(d){ (d.items||[]).forEach(function(x){ if (x.src) n++; if (x.src && x.need==='required') fig++; }); });
        var pill = document.querySelector('.pill');
        return { ok: n >= 100, srcTotal: n, requiredWithSrc: fig, pillText: pill ? pill.textContent : '' };
      });
    })()`);
    const tbPass = !!(tb && tb.ok);
    results.push({ name: 'textbook-src', pass: tbPass, detail: tb });
    console.log((tbPass ? 'PASS ' : 'FAIL ') + 'textbook-src ' + JSON.stringify(tb));

    /* 方法视角要按层区分：图例得有「培优方法」「竞赛 / 拓展」两档，画布上要真有方法节点。
       分层只做在数据里（skill.tier）不显示出来，等于没做，所以真在浏览器里点一次。 */
    cdp.drainErrors();
    await cdp.send('Page.navigate', { url: INDEX + '#/map' });
    await sleep(1800);
    await cdp.eval("(function(){var b=document.querySelector('[data-view=skill]');if(b)b.click();return 1;})()");
    await sleep(2200);
    const mapTier = await cdp.eval("(function(){var lg=document.querySelector('#map-legend');var note=document.querySelector('#map-note');var cv=document.querySelector('canvas');return {legend: lg?lg.textContent.replace(/\s+/g,' '):'', note: note?note.textContent.replace(/\s+/g,' '):'', canvas: !!cv};})()");
    const errsMap = cdp.drainErrors();
    const shotMap = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, 'web-map-skill.png'), Buffer.from(shotMap.data, 'base64'));
    const mapPass = !!mapTier && /培优方法/.test(mapTier.legend) && /竞赛/.test(mapTier.legend) &&
      mapTier.canvas && /\d+ 个点/.test(mapTier.note) && errsMap.length === 0;
    results.push({ name: 'map-skill-tier', pass: mapPass, detail: mapTier, consoleErrors: errsMap });
    console.log((mapPass ? 'PASS ' : 'FAIL ') + 'map-skill-tier ' + JSON.stringify(mapTier));

    /* 章图（spec 4.1）：节点只有这一章的知识点，一岛一节，节间那条细虚线是教材顺序。
       这几条一起断言，是因为少了任何一条，读起来都会回到「全册一张图」或「看不出书上先后」。 */
    cdp.drainErrors();
    /* 现行默认图（STATE §11，提交 e1db2ac）：一进来就是「按章按节展开」的那张网，
       不再只画结构层的全景。要钉住的是：四类点都在（章 / 节 / 知识点 / 方法）、
       画出来的点数正好是这四类之和（岛标题与白框不进图）、名字框没把点叠成一堆、
       图例说清「点开才向右长出知识点」。
       旧断言（view=overview / 40–70 节点 / overlap=0）属于已被取代的全景档，别退回去。 */
    await cdp.send('Page.navigate', { url: INDEX + '#/today' });
    await sleep(700);
    await cdp.send('Page.navigate', { url: INDEX + '#/map' });
    await sleep(2800);
    const ovw = await cdp.eval('(function(){var st=MC.mapView.state,c=MC.mapView.counts();var hint=document.getElementById("map-hint");var kinds={},nAgg=0;MC.mapView.cy().nodes().forEach(function(n){if(n.hasClass("island")||n.hasClass("island-label"))return;var k=n.data("kind");kinds[k]=(kinds[k]||0)+1;});MC.mapView.cy().edges().forEach(function(e){if(e.data("x")==="agg")nAgg++;});var ov=0,ns=MC.mapView.cy().nodes().filter(function(n){return !n.hasClass("island")&&!n.hasClass("island-label");});for(var i=0;i<ns.length;i++){var a=ns[i],pa=a.position(),wa=a.data("w")/2,ha=a.data("h")/2;for(var j=i+1;j<ns.length;j++){var b=ns[j],pb=b.position(),wb=b.data("w")/2,hb=b.data("h")/2;if(Math.abs(pa.x-pb.x)<wa+wb-2&&Math.abs(pa.y-pb.y)<ha+hb-2)ov++;}}var pre=0,ws={};MC.mapView.cy().edges().forEach(function(e){if(e.data("r")==="prerequisite_of"){pre++;ws[String(e.style("width"))]=1;}});var lab=0,bad=0;ns.forEach(function(n){var s=String(n.data("label")||"");if(s)lab++;if(n.data("kind")==="chapter"&&s&&s.length*12.5>Number(n.data("w")||0)-6)bad++;});return {pre:pre,wset:Object.keys(ws).length,lab:lab,bad:bad,view:c.view,ch:String(st.ch),hint:hint?(hint.textContent||"").replace(/\s+/g,""):"",kinds:kinds,nodes:c.nodes,agg:nAgg,overlap:ov,legend:(document.getElementById("map-legend")||{}).textContent||""};})()');
    const errsOvw = cdp.drainErrors();
    /* 章级档的可数事实：26 个章 + 6 个册名 = 32 个节点，卡片互不重叠，
       提示说的是「六册全景只到章」，图例讲的是先修与教材顺序。 */
    const ovwSum = ovw ? (ovw.kinds.chapter || 0) + (ovw.kinds.volume || 0) : -1;
    const ovwPass = ovw && ovw.view === 'mind' &&
      /六册全景/.test(ovw.hint) && /章/.test(ovw.hint) &&
      (ovw.kinds.chapter || 0) >= 24 && (ovw.kinds.volume || 0) >= 5 &&
      ovw.nodes === ovwSum && ovw.nodes <= 60 &&
      /* 每张卡片都得有字（label 非空），而且字宽度算得进卡片宽度 ——
         「文字显示不全」就是 label 被画布按卡片宽裁成省略号。 */
      /* 章间先修线必须真的画出来：「C701-01」这种补零的 id 一旦退回 'C701-1'，
         七年级两册的边会整片丢掉，图上看不出七上要先于八上。实测 63 条。 */
      ovw.pre >= 60 &&
      /* 线宽必须真的分层：写死 width 会让图例那句「线越粗 = 被后面用得越多」变成假话 */
      ovw.wset >= 3 &&
      ovw.lab === ovw.nodes && ovw.bad === 0 &&
      ovw.overlap === 0 &&
      /先修/.test(ovw.legend) && /教材顺序/.test(ovw.legend) &&
      errsOvw.length === 0;
    const shotOvw = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, 'web-map-overview.png'), Buffer.from(shotOvw.data, 'base64'));
    results.push({ name: 'map-overview', pass: ovwPass, detail: ovw, consoleErrors: errsOvw });
    console.log((ovwPass ? 'PASS ' : 'FAIL ') + 'map-overview ' + JSON.stringify(ovw));

    cdp.drainErrors();
    /* 章内档「点名」：画布上的知识点是蓝菱形、没有名字（176 个点挤在 517x409 里）。
       名字必须在浮层里按节列出来、能点，否则用户只能靠猜 —— 这就是「文字显示不全」。 */
    await cdp.send('Page.navigate', { url: INDEX + '#/today' });
    await sleep(700);
    await cdp.send('Page.navigate', { url: INDEX + '#/map?vol=801&ch=12' });
    await sleep(2600);
    await cdp.eval("(function(){var b=document.getElementById('map-names');if(b)b.click();return 1;})()");
    await sleep(900);
    const nm = await cdp.eval("(function(){var s=document.getElementById('map-side');var b=document.getElementById('map-names');var o={bt:!!(b&&!b.hidden),hidden:s?s.hidden:null,n:document.querySelectorAll('#map-side li a').length,h4:document.querySelectorAll('#map-side h4').length,first:(document.querySelector('#map-side li a')||{}).textContent||'',heads:[].slice.call(document.querySelectorAll('#map-side h4')).slice(0,3).map(function(x){return x.textContent;}),ovf:document.documentElement.scrollWidth-document.documentElement.clientWidth};if(s&&!s.hidden){var r=s.getBoundingClientRect();o.r=[Math.round(r.left),Math.round(r.top),Math.round(r.width),Math.round(r.height)];o.fit=(Math.round(r.top)+Math.round(r.height))<=window.innerHeight+1;}return o;})()");
    const errsNm = cdp.drainErrors();
    const nmPass = nm && nm.bt && nm.hidden === false && nm.n >= 60 && nm.h4 >= 8 && nm.fit === true &&
      /\S/.test(nm.first) && nm.ovf <= 0 && errsNm.length === 0;
    results.push({ name: 'map-names', pass: nmPass, detail: nm, consoleErrors: errsNm });
    console.log((nmPass ? 'PASS ' : 'FAIL ') + 'map-names ' + JSON.stringify(nm));

    cdp.drainErrors();
    /* 章图不是默认了，得显式指明视角；先离开图谱再进来，否则同一个 hash 不触发重渲染 */
    await cdp.send('Page.navigate', { url: INDEX + '#/today' });
    await sleep(700);
    /* 章图不是默认了，得显式指明视角；还要指明是哪一章——
       整册（ch=all）本来就不画节与节之间的先后，seq/dep 为 0 是设计，不是没画出来。 */
    await cdp.send('Page.navigate', { url: INDEX + '#/map?view=chart&vol=801&ch=12' });
    await sleep(2800);
    const chart = await cdp.eval(`(function(){
      var st = MC.mapView.state, c = MC.mapView.counts();
      var hint = document.getElementById('map-hint');
      var kinds = {}, nSeq = 0, secs = {};
      MC.mapView.cy().nodes().forEach(function(n){
        if (n.hasClass('island') || n.hasClass('island-label')) return;
        var k = n.data('kind'); kinds[k] = (kinds[k]||0)+1;
        if (n.data('sec')) secs[n.data('sec')] = 1;
      });
      MC.mapView.cy().edges().forEach(function(e){ if (e.data('r')==='sequence') nSeq++; });
      /* 章图的跨节依赖聚合线：x=dep，data.n 是这一对节之间有几处依赖 */
      var nDep = 0, depMax = 0, depPairs = [];
      MC.mapView.cy().edges().forEach(function(e){
        if (e.data('x') !== 'dep') return;
        nDep++; depMax = Math.max(depMax, e.data('n') || 0);
        var w = Math.round(parseFloat(e.style('width')) * 100) / 100;
        depPairs.push([e.data('n'), w]);
      });
      var ov = 0, ns = MC.mapView.cy().nodes().filter(function(n){
        return !n.hasClass('island') && !n.hasClass('island-label');
      });
      for (var i = 0; i < ns.length; i++) {
        var a = ns[i], pa = a.position(), wa = a.data('w') / 2, ha = a.data('h') / 2;
        for (var j = i + 1; j < ns.length; j++) {
          var b = ns[j], pb = b.position(), wb = b.data('w') / 2, hb = b.data('h') / 2;
          if (Math.abs(pa.x - pb.x) < wa + wb - 2 && Math.abs(pa.y - pb.y) < ha + hb - 2) ov++;
        }
      }
      var tier = {};
      MC.mapView.cy().edges().forEach(function(e){
        var x = e.data('x') || 'r';
        var w = Math.round(parseFloat(e.style('width')) * 100) / 100;
        (tier[x] = tier[x] || {})[w] = (tier[x][w] || 0) + 1;
      });
      var wid = function(o){ var ks = Object.keys(o || {}).map(Number); return ks.length ? Math.max.apply(null, ks) : 0; };
      return { view: c.view, vol: st.vol, ch: String(st.ch), overlap: ov,
               tier: tier, wm: wid(tier.m), wr: wid(tier.r), wsk: wid(tier.sk),
               hint: hint ? (hint.textContent||'').replace(/\s+/g,'') : '',
               kinds: kinds, isl: Object.keys(secs).length, seq: nSeq, dep: nDep, depMax: depMax,
               depPairs: depPairs.slice(0, 4),
               legend: (document.getElementById('map-legend')||{}).textContent || '' };
    })()`);
    const errsChart = cdp.drainErrors();
    const chartPass = chart && chart.view === 'chart' && chart.ch !== 'all' &&
      chart.hint === '上下是这一节里的点，左右是先学后学。' &&
      !chart.kinds.skill && !chart.kinds.misconception && !chart.kinds.thought &&
      chart.kinds.knowledge_point > 3 && chart.isl > 1 && chart.seq >= 1 && chart.overlap === 0 &&
      /* 章图上必须有跨节依赖的聚合线：第 12 章 12 节之间有先修，一对都没有就是没画出来 */
      chart.dep >= 1 && chart.depMax >= 1 &&
      /必须先会/.test(chart.legend) && /书上的先后/.test(chart.legend) &&
      /后一节有几处要用它/.test(chart.legend) &&
      chart.wm > 0 && chart.wr > 0 && chart.wm > chart.wr && (chart.wsk === 0 || chart.wr >= chart.wsk) &&
      errsChart.length === 0;
    const shotChart = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, 'web-map-chart.png'), Buffer.from(shotChart.data, 'base64'));
    results.push({ name: 'map-chart', pass: chartPass, detail: chart, consoleErrors: errsChart });
    console.log((chartPass ? 'PASS ' : 'FAIL ') + 'map-chart ' + JSON.stringify(chart));
    console.log('  依据分级实测线宽 m=' + chart.wm + ' r=' + chart.wr + ' sk=' + chart.wsk + ' 分布 ' + JSON.stringify(chart.tier));

    /* 阶段 C：方法视图要给两个方向（这个方法能解这些点 / 讲这个点要用到它），
       悬停还要说清一根线凭什么连——依据是竞品里的第一等信息，不是装饰。 */
    cdp.drainErrors();
    await cdp.send('Page.navigate', { url: INDEX + '#/today' });
    await sleep(400);
    await cdp.send('Page.navigate', { url: INDEX + '#/map?view=skill&vol=801&sec=12.1' });
    await sleep(2600);
    const twoWay = await cdp.eval(`(function(){
      var cy = MC.mapView.cy(), nA = 0, nU = 0, sk = null;
      cy.edges().forEach(function(e){ if (e.data('r')==='applies_to') nA++; if (e.data('r')==='uses_skill') nU++; });
      cy.nodes().forEach(function(n){ if (!sk && n.data('kind')==='skill') sk = n; });
      var tip = document.getElementById('map-tip');
      var before = tip ? tip.hidden : null;
      if (sk) sk.emit('mouseover');
      return { a: nA, u: nU, sk: sk ? sk.id() : '', before: before,
               shown: tip ? !tip.hidden : false,
               txt: tip ? (tip.innerText||'').replace(/\s+/g,' ').trim() : '',
               legend: (document.getElementById('map-legend')||{}).textContent || '' };
    })()`);
    const errs2w = cdp.drainErrors();
    const twoWayPass = twoWay && twoWay.a > 0 && twoWay.u > 0 && twoWay.sk &&
      twoWay.before === true && twoWay.shown && /条关联|还没有连线/.test(twoWay.txt) &&
      /实线：这个方法能解这些点/.test(twoWay.legend) && /虚线：讲这个点时要用到它/.test(twoWay.legend) &&
      errs2w.length === 0;
    results.push({ name: 'method-two-way', pass: twoWayPass, detail: twoWay, consoleErrors: errs2w });
    console.log((twoWayPass ? 'PASS ' : 'FAIL ') + 'method-two-way ' + JSON.stringify({ a: twoWay && twoWay.a, u: twoWay && twoWay.u, tip: twoWay && twoWay.txt.slice(0, 60) }));

    /* spec 4.2：宽屏右栏粘顶、窄屏从底部升起且不超过 55%，关掉回图。
       这两条只能在真实视口下量 rect，读 DOM 文本量不出来。 */
    cdp.drainErrors();
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 1200, height: 900, deviceScaleFactor: 1, mobile: false });
    await sleep(400);
    await cdp.send('Page.navigate', { url: INDEX + '#/today' });
    await sleep(500);
    await cdp.send('Page.navigate', { url: INDEX + '#/map' });
    await sleep(2600);
    /* 宽屏先确认「没开讲解时右栏不占地方」：全景档一进来图要能吃满整行，
       否则 54 个节点被挤到 760px 宽、缩成 0.36 倍（实测过）。
       然后点开一个节点，右栏必须回到右侧、不与图重叠。 */
    const wideEmpty = await cdp.eval(`(function(){
      var st = document.querySelector('.mapstage').getBoundingClientRect();
      var seg = document.querySelectorAll('#map-seg > button[data-view]');
      return { w: innerWidth, stageRight: Math.round(st.right), stageW: Math.round(st.width),
               detailW: Math.round(document.querySelector('#map-detail').getBoundingClientRect().width),
               segBtns: seg.length, more: !!document.querySelector('.seg-more') };
    })()`);
    /* 章级全景里点一张卡片 = 进那一章，点知识点 = 十字方位卡片，两档都不开讲解卡。
       「点开一个点、卡浮在画布上」这条只剩一种落点：单章云图里点一个「节」。 */
    await cdp.send('Page.navigate', { url: INDEX + '#/today' });
    await sleep(400);
    await cdp.send('Page.navigate', { url: INDEX + '#/map?vol=801&ch=12' });
    await sleep(2400);
    const wideOpen = await cdp.eval(`(function(){
      var cy = MC.mapView.cy();
      var n = cy.nodes().filter(function(x){
        return !x.hasClass('island') && !x.hasClass('island-label') && x.data('kind') === 'section';
      })[0];
      if (n) n.emit('tap');
      var st = document.querySelector('.mapstage').getBoundingClientRect();
      var dd = document.querySelector('#map-detail').getBoundingClientRect();
      var cyEl = document.querySelector('#cy').getBoundingClientRect();
      var ow = Math.min(cyEl.right, dd.right) - Math.max(cyEl.left, dd.left);
      var oh = Math.min(cyEl.bottom, dd.bottom) - Math.max(cyEl.top, dd.top);
      /* 2026-11-03：讲解卡按「浮在画布上」交付（用户 m20000：右边的详情卡片类似悬浮在上面）。
         浮层与画布重叠是设计本身，重叠面积不再是缺陷；要防的是两件事——
         ① 卡把画布挤窄（stageW 变小）；② 卡正好盖住刚点开的那个点（读者看不到自己点的是什么）。 */
      var rp = n ? n.renderedPosition() : null;
      var inCard = !!(rp && rp.x + cyEl.left >= dd.left && rp.x + cyEl.left <= dd.right &&
                      rp.y + cyEl.top >= dd.top && rp.y + cyEl.top <= dd.bottom);
      return { tapped: n ? n.id() : '', stageRight: Math.round(st.right), stageW: Math.round(st.width),
               detailLeft: Math.round(dd.left), detailRight: Math.round(dd.right), detailW: Math.round(dd.width),
               pos: getComputedStyle(document.querySelector('#map-detail')).position,
               nodeInCard: inCard,
               ovl: (ow > 0 && oh > 0) ? Math.round(ow * oh) : 0,
               wide: document.querySelector('.mapwrap').classList.contains('is-nodetail') };
    })()`);
    await sleep(400);
    const wide = { empty: wideEmpty, open: wideOpen, w: wideEmpty.w, segBtns: wideEmpty.segBtns, more: wideEmpty.more,
                   stageRight: wideOpen.stageRight, detailLeft: wideOpen.detailLeft };
    await cdp.send('Emulation.setDeviceMetricsOverride', { width: 900, height: 800, deviceScaleFactor: 1, mobile: false });
    await sleep(400);
    await cdp.send('Page.navigate', { url: INDEX + '#/today' });
    await sleep(500);
    await cdp.send('Page.navigate', { url: INDEX + '#/map?view=chart' });
    await sleep(2600);
    const narrow1 = await cdp.eval(`(function(){
      var cy = MC.mapView.cy();
      var n = cy.nodes().filter(function(x){
        return !x.hasClass('island') && !x.hasClass('island-label') && x.data('kind') === 'knowledge_point';
      })[0];
      if (n) n.emit('tap');
      return n ? n.id() : '';
    })()`);
    await sleep(1200);
    const narrow = await cdp.eval(`(function(){
      var dd = document.querySelector('#map-detail');
      var r = dd.getBoundingClientRect();
      var cl = document.querySelector('#map-close');
      var cycl = document.querySelector('#cy').getBoundingClientRect();
      return { vh: innerHeight, top: Math.round(r.top), bottom: Math.round(r.bottom),
               hPct: Math.round(r.height / innerHeight * 100), fixed: getComputedStyle(dd).position,
               closeShown: !!(cl && !cl.hidden), cyVisibleTop: Math.round(cycl.top),
               txt: (dd.innerText || '').slice(0, 20) };
    })()`);
    await cdp.eval("(function(){var b=document.querySelector('#map-close');if(b)b.click();return 1;})()");
    await sleep(500);
    const closed = await cdp.eval("(function(){var dd=document.querySelector('#map-detail');var r=dd.getBoundingClientRect();return {cls:dd.className, h:Math.round(r.height), closeHidden: !!document.querySelector('#map-close').hidden};})()");
    const errs42 = cdp.drainErrors();
    await cdp.send('Emulation.clearDeviceMetricsOverride');
    await sleep(300);
    /* 宽屏点开一章：介绍是贴在画布右侧的浮层，画布本身全宽（STATE §11「画布全宽、介绍是浮层」，
       e1db2ac 之后的长相）。断言卡片右缘贴画布右边、卡片不窄于 300、左半边留给图，
       不再要求 detailLeft ≥ stageRight−12——那等于要求恢复 480px 右栏分栏。 */
    /* 右缘容差 8 → 40：2026-10-31 给 .mapwrap 加了 padding-inline:32px，
       让图谱区和正文列一样离视口右缘 32px（原来文字贴死屏幕，见 ux_asserts 的 EDGE）。
       于是「吃满整行」改成「画布本身够宽 + 右缘不超出正文列的留白」。 */
    const r42Pass = wide && wide.w >= 1080 &&
      wide.empty.stageRight >= wide.w - 40 && wide.empty.stageW >= 860 && wide.empty.detailW === 0 &&
      /* 2026-11-02 改约定：宽屏 mind 档点开一个点 = 图左、卡右两栏并列（原来卡是浮在画布上的
        绝对定位块，1200 宽实测盖住画布右半，连点中的那个点都看不见）。所以不再要求
        卡右缘贴画布右缘（那是分栏时代的坐标），改成：卡在图右边、两者零重叠、图仍够宽。 */
      wide.open.detailW > 300 && !wide.open.wide &&
      /* 2026-11-03（用户 m20000：右边的详情卡片类似悬浮在上面）：卡回到 absolute 浮层，
         不再要求与画布零重叠——浮层必然重叠，253260px² 是正常值。改成量三件真事：
         点开前后画布一样宽（R2 的本意是别挤窄）、卡贴着画布右缘且不出视口、卡没盖住刚点开的点。 */
      wide.open.stageW >= 420 && wide.open.pos === 'absolute' &&
      wide.open.stageW === wide.empty.stageW &&
      wide.open.detailRight <= wide.w && Math.abs(wide.open.detailRight - wide.open.stageRight) <= 40 &&
      wide.open.nodeInCard === false &&
      wide.segBtns === 1 && wide.more &&
      narrow1 && narrow.fixed === 'fixed' && narrow.hPct <= 56 && narrow.hPct >= 10 &&
      narrow.bottom === narrow.vh && narrow.closeShown && narrow.cyVisibleTop < narrow.vh / 2 &&
      closed && closed.h === 0 && closed.cls.indexOf('is-hidden') >= 0 && closed.closeHidden && errs42.length === 0;
    results.push({ name: 'map-narrow-sheet', pass: r42Pass, wide, narrow, point: narrow1, consoleErrors: errs42 });
    /* 失败时把 closed 与控制台错误一起打出来：这两项以前不打印，
       红了只能靠猜是哪条子句没满足（2026-11-02 就为此白跑了一遍全量）。 */
    console.log((r42Pass ? 'PASS ' : 'FAIL ') + 'map-narrow-sheet ' + JSON.stringify({ wide, narrow, point: narrow1, closed, errs: errs42 }));

    /* 素养多选（竞品侧栏那块）：勾一个素养，图上只剩练到它的知识点，清空后回到原样。
       计数是两跳派生出来的、不是课标认定，所以连「按方法推断」这句文案一起钉——
       界面把推断说成结论，比没有这块更糟。 */
    cdp.drainErrors();
    await cdp.send('Page.navigate', { url: INDEX + '#/today' });
    await sleep(600);
    await cdp.send('Page.navigate', { url: INDEX + '#/map?view=kp&vol=801&ch=12' });
    await sleep(2400);
    const cp0 = await cdp.eval(`(function(){
      var st = MC.mapView.state, c = MC.mapView.counts();
      var btns = [].slice.call(document.querySelectorAll('#map-cps button[data-cp]'));
      return { view: c.view, nodes: c.nodes, chips: btns.length,
               dis: btns.filter(function(b){ return b.disabled; }).length,
               lbl: (document.getElementById('map-cps')||{}).innerText || '',
               sel: Object.keys(st.cps || {}).length };
    })()`);
    await cdp.eval(`(function(){var b=document.querySelector('#map-cps button[data-cp]:not([disabled])'); if (b) b.click();})()`);
    await sleep(1400);
    const cp1 = await cdp.eval(`(function(){
      var st = MC.mapView.state, c = MC.mapView.counts();
      return { nodes: c.nodes, sel: Object.keys(st.cps || {}).length,
               on: document.querySelectorAll('#map-cps button[data-cp].on').length,
               reset: !!document.querySelector('#map-cps .cp-reset') };
    })()`);
    await cdp.eval(`(function(){var r=document.querySelector('#map-cps .cp-reset'); if (r) r.click();})()`);
    await sleep(1400);
    const cp2 = await cdp.eval(`(function(){var c=MC.mapView.counts(), st=MC.mapView.state;return {nodes:c.nodes, sel:Object.keys(st.cps||{}).length};})()`);
    const errsCp = cdp.drainErrors();
    const cpPass = cp0 && cp0.view === 'kp' && cp0.chips === 6 && cp0.dis <= 6 &&
      /核心素养/.test(cp0.lbl) && /按方法推断/.test(cp0.lbl) &&
      cp1.sel === 1 && cp1.on === 1 && cp1.reset && cp1.nodes > 0 && cp1.nodes < cp0.nodes &&
      cp2.sel === 0 && cp2.nodes === cp0.nodes && errsCp.length === 0;
    results.push({ name: 'map-cp', pass: cpPass, detail: { cp0, cp1, cp2 }, consoleErrors: errsCp });
    console.log((cpPass ? 'PASS ' : 'FAIL ') + 'map-cp ' + JSON.stringify({ cp0, cp1, cp2 }));

    /* 搜索要能跨视角：方法、思想、错因根本不在 kp 那一屏，只搜当前图等于「想不到就搜不到」。
       这里在 kp 视图搜一个思想名，必须自动切到思想视图、并把详情打开。 */
    cdp.drainErrors();
    await cdp.send('Page.navigate', { url: INDEX + '#/map?view=kp' });
    await sleep(1800);
    const beforeView = await cdp.eval('MC.mapView.counts().view');
    await cdp.eval("MC.mapView.search('概念抽象与符号化')");
    await sleep(1500);
    const afterView = await cdp.eval('MC.mapView.counts().view');
    const dTxt = await cdp.eval('(function(){var d=document.getElementById("map-detail");return d?(d.innerText||"").replace(/\\s+/g," ").trim():"";})()');
    const errsSrch = cdp.drainErrors();
    const srchPass = beforeView === 'kp' && afterView === 'thought' &&
      /概念抽象与符号化/.test(dTxt) && /它在几册里反复出现/.test(dTxt) && errsSrch.length === 0;
    results.push({ name: 'search-cross', pass: srchPass, beforeView, afterView, dTxt: dTxt.slice(0, 120), consoleErrors: errsSrch });
    console.log((srchPass ? 'PASS ' : 'FAIL ') + 'search-cross ' + JSON.stringify({ beforeView, afterView, hasDetail: /概念抽象与符号化/.test(dTxt) }));

    /* 搜索要进别名、要出清单、输入时不能乱跳图：
       「轴对称求最值」只写在 detail 的 aliases 里，title 上没有 —— 老实现搜不到它。 */
    cdp.drainErrors();
    await cdp.send('Page.navigate', { url: INDEX + '#/today' });
    await sleep(400);
    await cdp.send('Page.navigate', { url: INDEX + '#/map' });
    await sleep(2400);
    const beforeAlias = await cdp.eval('JSON.stringify({v:MC.mapView.counts().view,f:MC.mapView.state.focus})');
    await cdp.eval(`(function(){
      var q = document.getElementById('map-q');
      q.value = '轴对称求最值';
      q.dispatchEvent(new Event('input', { bubbles: true }));
      return 1;
    })()`);
    await sleep(700);
    const aliasPanel = await cdp.eval(`(function(){
      var box = document.getElementById('map-q-res');
      var hits = Array.prototype.slice.call(document.querySelectorAll('#map-q-res .q-hit'));
      return { shown: box ? !box.hidden : false, n: hits.length,
               first: hits.length ? hits[0].getAttribute('data-nid') : '',
               firstTxt: hits.length ? (hits[0].innerText||'').replace(/\s+/g,' ') : '',
               sum: (document.querySelector('#map-q-res .q-sum')||{}).innerText || '',
               view: MC.mapView.counts().view, focus: MC.mapView.state.focus };
    })()`);
    await cdp.eval(`(function(){
      var h = document.querySelector('#map-q-res .q-hit');
      if (h) h.click();
      return 1;
    })()`);
    await sleep(2000);
    /* 落点改看十字档的中间那块：右栏详情在十字档是收起来的（同一份内容不画两遍）。 */
    const aliasRaw = await cdp.eval('(function(){try{var d=document.getElementById("map-detail");var qr=document.getElementById("map-q-res");var c=document.getElementById("map-cross");var h=c?c.querySelector(".mc-self h3"):null;return JSON.stringify({view:MC.mapView.counts().view,focus:MC.mapView.state.focus,vol:String(MC.mapView.state.vol),txt:(d?d.innerText:"").replace(/\s+/g," ").slice(0,70),cross:!!(c&&!c.hidden&&c.offsetHeight>200),self:h?(h.innerText||"").replace(/\s+/g," "):"",hidden:qr?qr.hidden:null,hash:location.hash});}catch(e){return "ERR "+e;}})()');
    const aliasAfter = (function(){ try { return JSON.parse(aliasRaw); } catch (e) { return { raw: aliasRaw }; } })();
    const ping = await cdp.eval('typeof MC + "|" + (window.MC && MC.mapView ? "ok" : "no") + "|" + location.hash');
    console.log('  alias ping ' + JSON.stringify(ping) + ' panelKeys ' + JSON.stringify(Object.keys(aliasPanel || {})));
    const errsAlias = cdp.drainErrors();
    /* 点开一条搜索结果要真的「落到那个点上」：册换到 902、视图切到知识点、焦点落在它所在节或那个知识点本身、
       详情面板写出它的名字，hash 必须仍在 #/map（裸 id 曾被 boot 的 [data-go] 委托写进 hash，
       于是路由解析失败退回「今日」——图没动，还看着像没反应）。 */
    /* 现行落点（STATE §11）：在总图里点一条搜索结果，视图仍然是总图，
       换掉的是焦点、侧栏和详解——不跳走、不换册、地址还是 #/map。
       旧断言要求 view 变 kp、册变 902，那是切视图时代的写法。 */
    const aliasWhy = {
      shown: !!(aliasPanel && aliasPanel.shown), n: aliasPanel && aliasPanel.n,
      first: aliasPanel && aliasPanel.first,
      txtOk: !!(aliasPanel && /2023|23\.3|将军饮马|轴对称/.test(aliasPanel.firstTxt)),
      cross: aliasAfter && aliasAfter.cross, self: aliasAfter && aliasAfter.self,
      panelView: aliasPanel && aliasPanel.view, beforeView: JSON.parse(beforeAlias).v,
      focus: aliasAfter && aliasAfter.focus, vol: aliasAfter && aliasAfter.vol,
      view: aliasAfter && aliasAfter.view, hidden: aliasAfter && aliasAfter.hidden,
      hash: aliasAfter && aliasAfter.hash, txt: aliasAfter && String(aliasAfter.txt || '').slice(0, 40)
    };
    const aliasPass = aliasWhy.shown && aliasWhy.n >= 1 && aliasWhy.first === 'K902-23.3-04' &&
      aliasWhy.txtOk && aliasWhy.panelView === aliasWhy.beforeView &&
      /* 落到知识点（K…）比落到节更细，是搜索改进后的行为；两种都算落地 */
      /^(S|K)902-23\.3/.test(String(aliasWhy.focus || '')) &&
      /* 焦点态现在会把 node= 写进地址（刷新、从练习页返回都不丢焦点），
         所以这里只要求「还在图谱页」，且地址里带的就是这个点。 */
      aliasWhy.view === 'mind' && aliasWhy.hidden === true &&
      /^#\/map(\?|$)/.test(String(aliasWhy.hash || '')) &&
      String(aliasWhy.hash || '').indexOf('node=' + aliasWhy.focus) > 0 &&
      aliasWhy.cross === true && /轴对称|将军饮马|23\.3/.test(String(aliasWhy.self || '')) &&
      errsAlias.length === 0;
    results.push({ name: 'search-alias', pass: aliasPass, why: aliasWhy, consoleErrors: errsAlias });
    console.log((aliasPass ? 'PASS ' : 'FAIL ') + 'search-alias ' + JSON.stringify(aliasWhy));

    /* 按类型搜：sch 里存的是中文类型名，孩子搜「定理」「竞赛」才命中；
       英文枚举 theorem / olympiad 不该是唯一入口（那就是「想不到就搜不到」）。 */
    cdp.drainErrors();
    async function typeSearch(word) {
      await cdp.eval('(function(){var q=document.getElementById("map-q");q.value=' + JSON.stringify(word) + ';q.dispatchEvent(new Event("input",{bubbles:true}));return 1;})()');
      await sleep(650);
      return await cdp.eval('(function(){var box=document.getElementById("map-q-res");var hits=Array.prototype.slice.call(document.querySelectorAll("#map-q-res .q-hit"));return {shown:box?!box.hidden:false,n:hits.length,first:hits.length?hits[0].getAttribute("data-nid"):"",firstTxt:hits.length?(hits[0].innerText||"").replace(/\s+/g," "):"",sum:((document.querySelector("#map-q-res .q-sum")||{}).innerText||""),none:!!document.querySelector("#map-q-res .q-none"),hash:location.hash};})()');
    }
    const tThm = await typeSearch('定理');
    const tOly = await typeSearch('竞赛');
    const tEn = await typeSearch('olympiad');
    const errsType = cdp.drainErrors();
    const thmN = (function () { var m = /共 (\d+) 个/.exec(tThm.sum || ''); return m ? parseInt(m[1], 10) : 0; })();
    const typePass = tThm.shown && tThm.n >= 1 && thmN >= 20 &&
      tOly.shown && tOly.n >= 1 && /^SK-/.test(String(tOly.first || '')) &&
      tEn && (tEn.n === 0 || tEn.none === true) &&
      /^#\/map(\?|$)/.test(String(tThm.hash || '')) && /^#\/map(\?|$)/.test(String(tOly.hash || '')) &&
      errsType.length === 0;
    results.push({ name: 'search-type', pass: typePass,
      thm: { n: tThm.n, total: thmN, sum: tThm.sum },
      oly: { n: tOly.n, first: tOly.first }, en: { n: tEn && tEn.n }, consoleErrors: errsType });
    console.log((typePass ? 'PASS ' : 'FAIL ') + 'search-type ' + JSON.stringify({ thmN, thm: tThm.n, olyN: tOly.n, olyFirst: tOly.first, enN: tEn && tEn.n }));

    /* 思想总表（#/thoughts）：16 条思想排在一起才看得出哪条真的贯穿六册。
       断言三件事：卡片数量、首卡有册数/方法数/知识点数、点进去落在图谱的思想视图。 */
    cdp.drainErrors();
    await cdp.send('Page.navigate', { url: INDEX + '#/thoughts' });
    await sleep(1600);
    const ths = await cdp.eval(`(function(){
      var cards = Array.prototype.slice.call(document.querySelectorAll('.th-card'));
      var first = cards[0];
      return { n: cards.length, secs: document.querySelectorAll('.th-sec').length,
               firstTxt: first ? (first.innerText || '').replace(/\s+/g, ' ') : '',
               firstHref: first ? first.getAttribute('href') : '',
               intro: ((document.querySelector('.th-intro') || {}).innerText || '').replace(/\s+/g, ' ') };
    })()`);
    const errsTh = cdp.drainErrors();
    const thPass = ths.n >= 14 && ths.secs === 2 && /册/.test(ths.firstTxt) && /条方法/.test(ths.firstTxt) &&
      /^#\/map\?view=thought&node=TH-/.test(ths.firstHref) && errsTh.length === 0;
    results.push({ name: 'thoughts-list', pass: thPass, ths, consoleErrors: errsTh });
    console.log((thPass ? 'PASS ' : 'FAIL ') + 'thoughts-list ' + JSON.stringify(ths));

    /* 同步桥 M4a：导出/导入必须幂等（同一份导两次不翻倍），坏行只计数不炸。
       这里在浏览器里造两条探针记录、带一行坏 JSON 导两次，断言完再把探针记录摘掉。 */
    cdp.drainErrors();
    await cdp.send('Page.navigate', { url: INDEX + '#/archive' });
    await sleep(1400);
    const bridge = await cdp.eval("(function(){" +
      "var before = MC.store.all().length, now = Date.now();" +
      "var made = [" +
        "{schema_version:1,uid:'EV-probe-a-'+now,item:'probe-a',sec:'12.1',band:'basic',ts:now,final:'correct',how:'exact'}," +
        "{schema_version:1,uid:'EV-probe-b-'+now,item:'probe-b',sec:'12.1',band:'basic',ts:now+1,final:'wrong',how:'exact'}" +
      "];" +
      "var text = MC.store.jsonl(made) + '{\"broken\": tru';" +
      "var p = MC.store.parseJsonl(text);" +
      "var r1 = MC.store.merge(p.rows);" +
      "var r2 = MC.store.merge(p.rows);" +
      "var after = MC.store.all().length;" +
      "var rest = MC.store.all().filter(function(x){ return String(x.uid||'').indexOf('EV-probe-') !== 0; });" +
      "try { localStorage.setItem(MC.store.KEY, JSON.stringify(rest)); } catch(e) {}" +
      "return { before:before, after:after, badLines:p.bad, added1:r1.added, dup2:r2.dup, added2:r2.added, clean:rest.length };" +
    "})()");
    const errsBridge = cdp.drainErrors();
    const bridgePass = bridge.added1 === 2 && bridge.added2 === 0 && bridge.dup2 === 2 &&
      bridge.after === bridge.before + 2 && bridge.clean === bridge.before && errsBridge.length === 0;
    results.push({ name: 'store-merge', pass: bridgePass, bridge, consoleErrors: errsBridge });
    console.log((bridgePass ? 'PASS ' : 'FAIL ') + 'store-merge ' + JSON.stringify(bridge));

    /* 错题重练（#/retry）：欠着的题要能跨节一次做完。先造两条真错的记录（跨两册两节），
       断言「欠着几条」真按记录算出来，再点「一次做完」看它是否真的开了一批混合队列。 */
    cdp.drainErrors();
    /* 先量一遍现状：同一份 profile 里前面几个用例会留下真错记录（章末巩固题答错就写进去，
       而章末巩固题正好就是这个用例挑的第二节），错题重练本来就该把这些也列出来。
       所以断言量的是「并集」，不是「一共几条」也不是「多了几条」——种子题可能与已有欠账是同一道，
       那时页面只多出一行。另外必须先绕到别的路由再进 retry：导航到当前同一个 URL
       不会重载页面，只会留一屏旧 DOM，看起来像「种了却没进列表」。 */
    await cdp.send('Page.navigate', { url: INDEX + '#/today' });
    await sleep(1200);
    await cdp.send('Page.navigate', { url: INDEX + '#/retry' });
    await sleep(1400);
    const retryBaseItems = await cdp.eval("(function(){return [].slice.call(document.querySelectorAll('[data-one]')).map(function(r){return r.getAttribute('data-one');});})()") || [];
    cdp.drainErrors();
    const made = await cdp.eval("(function(){" +
      "var now = Date.now();" +
      "/* 挑相距最远的两节各两题：写死节号会在无题节上静默变成 0 条（题库只有 801 有题） */" +
      "var all = [];" +
      "(MC.catalog.volumes||[]).forEach(function(v){" +
        "v.chapters.forEach(function(ch){ ch.sections.forEach(function(s){ if((s.q||0) > 0) all.push({vol:v.id, no:s.no}); }); });" +
      "});" +
      "var cands = all.length > 1 ? [all[0], all[all.length-1]] : all.slice(0,1);" +
      "return Promise.all(cands.map(function(c){ return MC.data.loadItems(c.vol, c.no).catch(function(){ return {items:[]}; }); })).then(function(arr){" +
        "var picks = [], used = {};" +
        "arr.forEach(function(d, gi){ ((d&&d.items)||[]).slice(0,2).forEach(function(x){ if(!used[x.id]){ used[x.id]=1; picks.push({id:x.id, vol:cands[gi].vol, sec:cands[gi].no}); } }); });" +
        "picks.forEach(function(p, i){ MC.store.push({schema_version:1, uid:'EV-probe-r'+i+'-'+now, item:p.id, sec:p.sec, band:'basic', ts:now+i, final:'wrong', how:'exact', volume:p.vol}); });" +
        "return {made:picks.length, ids:picks.map(function(p){return p.id;}), secs:picks.map(function(p){return p.vol+'/'+p.sec;})};" +
      "});" +
    "})()");
    await cdp.send('Page.reload', {});
    /* 等到列表真的画出来（有行、有开始按钮），最多 10 秒 */
    await waitFor(cdp, "(function(){var b=document.querySelector('[data-act=start]');" +
      "var n=document.querySelectorAll('[data-one]').length;" +
      "return (b && n > 0) ? n : 0;})()", 10000);
    const retryList = JSON.parse(await cdp.eval("(function(){" +
      "var b = (document.body.innerText||'').replace(/\s+/g,' ');" +
      "var btn = document.querySelector('[data-act=start]');" +
      "var ones=[].slice.call(document.querySelectorAll('[data-one]'));" +
      "return JSON.stringify({ txt:b.slice(0,140), rows:ones.length," +
        " items:ones.map(function(r){return (r.getAttribute('data-one')||'')+' «'+(r.innerText||'').replace(/\s+/g,' ').slice(0,26)+'»';})," +
        " hasStart:!!btn, startTxt:btn?btn.textContent.replace(/\s+/g,' '):'' });" +
    "})()") || '{}');
    await cdp.eval("(function(){var b=document.querySelector('[data-act=start]');if(b)b.click();return 1;})()");
    await sleep(2000);
    const retryGo = JSON.parse(await cdp.eval("(function(){" +
      "var h = document.querySelector('.card .muted');" +
      "var ans = document.querySelector('textarea.answer') || document.querySelector('.opt');" +
      "return JSON.stringify({ head:h?h.textContent.replace(/\s+/g,' '):'', ask:!!ans," +
        " hash:location.hash.slice(0,20), body:(document.body.innerText||'').replace(/\s+/g,' ').slice(0,90) });" +
    "})()") || '{}');
    const retryClean = await cdp.eval("(function(){var rest=MC.store.all().filter(function(x){return String(x.uid||'').indexOf('EV-probe-r')!==0;});try{localStorage.setItem(MC.store.KEY,JSON.stringify(rest));}catch(e){}return rest.length;})()");
    const errsRetry = cdp.drainErrors();
    const shotRetry = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, 'web-retry.png'), Buffer.from(shotRetry.data, 'base64'));
    /* 页面按题去重，所以期望行数 = 已有欠账 ∪ 这次种进去的题 */
    const retrySeen = {};
    retryBaseItems.forEach(function (x) { retrySeen[x] = 1; });
    (made.ids || []).forEach(function (x) { retrySeen[x] = 1; });
    const retryWant = Object.keys(retrySeen).length;
    const retryMiss = (made.ids || []).filter(function (x) {
      return (retryList.items || []).every(function (it) { return it.indexOf(x + ' ') !== 0; });
    });
    /* 一轮最多排 6 道是页面有意的设计（「一次只排 6 道」），不是漏排：
       欠 9 道时列表照样列 9 行，但开始键和标题只认这一轮的 6 道。
       2026-10-31 这里断言的是 want 道，欠账一多就假红（实测欠 9 道 → 按钮「一次做完 6 道」）。 */
    const retryCap = Math.min(retryWant, 6);
    const retryPass = made.made === 4 && retryMiss.length === 0 && retryList.rows === retryWant && retryList.hasStart &&
      /错题重练/.test(retryList.txt) && retryList.txt.indexOf('欠着 ' + retryWant + ' 题') >= 0 &&
      retryList.startTxt.indexOf(retryCap + ' 道') >= 0 &&
      retryGo.ask === true && retryGo.head.indexOf('第 1 / ' + retryCap + ' 题') >= 0 &&
      errsRetry.length === 0;
    results.push({ name: 'retry-mixed', pass: retryPass, made, list: retryList, go: retryGo, clean: retryClean, consoleErrors: errsRetry });
    console.log((retryPass ? 'PASS ' : 'FAIL ') + 'retry-mixed ' + JSON.stringify({ base: retryBaseItems.length, made: made.made, want: retryWant, miss: retryMiss, rows: retryList.rows, items: retryList.items, startTxt: retryList.startTxt, head: retryGo.head, ask: retryGo.ask, clean: retryClean }));

    /* 哪里不稳（#/weak）：把作答记录按知识点汇总，只认做过的题。
       造两条同一个点上的错记录，断言页里读得出来、给得出三列入口、脚注写明映射覆盖率。 */
    cdp.drainErrors();
    await cdp.send('Page.navigate', { url: INDEX + '#/weak' });
    await sleep(1700);
    const wkSeed = await cdp.eval("(function(){" +
      "var qkp = MC.peek('qkp') || {};" +
      "var ids = Object.keys(qkp).filter(function(k){ return /^K801-/.test(String(qkp[k])); });" +
      "if (!ids.length) return {err:'NO_QKP'};" +
      /* 页面现在按题去重（同一道题的交卷/看答案/勾错因/自评/跳过会写成多条记录，
         统计「做了几道」时必须算一道）。所以这里要造两道**不同题、同一个知识点**的记录，
         否则「做了 2 道」这个断言根本没可能成立 —— 那是断言的前提错了，不是页面坏了。 */
      "var byKid = {};" +
      "ids.forEach(function(k){ var kk = qkp[k]; (byKid[kk] = byKid[kk] || []).push(k); });" +
      "var pairKid = Object.keys(byKid).filter(function(x){ return byKid[x].length > 1; })[0];" +
      "var kid = pairKid || qkp[ids[0]];" +
      "var l = byKid[kid] || [ids[0]];" +
      "var q1 = l[0], q2 = l[1] || l[0], now = Date.now();" +
      "var base = {schema_version:1,item:q1,sec:'12.1',band:'basic',verdict:'wrong',final:'wrong',how:'letter',hint:'',seconds:20,stu:'A',ref:'',reasons:[],volume:'801',chapter:12};" +
      "var a = Object.assign({}, base, {uid:'EV-weak-a-'+now, ts:now});" +
      "var b = Object.assign({}, base, {uid:'EV-weak-b-'+now, item:q2, ts:now-60000});" +
      "MC.store.push(a); MC.store.push(b);" +
      "return {qid:q1, qid2:q2, kid:kid, pair:!!pairKid, n:MC.store.all().length};" +
    "})()");
    await cdp.send('Page.navigate', { url: INDEX + '#/today' });
    await sleep(400);
    await cdp.send('Page.navigate', { url: INDEX + '#/weak' });
    await sleep(1700);
    const wk = await cdp.eval("(function(){" +
      "var txt = function(sel){ var e=document.querySelector(sel); return e?((e.innerText||'').replace(/\s+/g,' ')):''; };" +
      "var rows = Array.prototype.slice.call(document.querySelectorAll('.wk-row'));" +
      "var rel = rows.length ? ((rows[0].querySelector('.wk-links a')||{}).getAttribute ? rows[0].querySelector('.wk-links a').getAttribute('href') : '') : '';" +
      /* 页面文案是「做过 2 道」（D2 修掉了「做了 2 道 · 没做 2」这种自相矛盾的写法），
         断言跟着实际措辞走，别把文案改动当成页面坏了。 */
      "var hit = rows.filter(function(r){ return /做[过了] 2 道/.test(r.innerText||''); });" +
      "var clean0 = MC.store.all().length;" +
      "var rest = MC.store.all().filter(function(x){ return String(x.uid||'').indexOf('EV-weak-') !== 0; });" +
      "try { localStorage.setItem(MC.store.KEY, JSON.stringify(rest)); } catch(e) {}" +
      "return {openN:txt('.wk-stats .st b'), rows:rows.length, rel:rel, foot:txt('.wk-foot')," +
      "        two:hit.length, txt:txt('.wk-row'), clean:rest.length, was:clean0};" +
    "})()");
    const errsWeak = cdp.drainErrors();
    /* 同一知识点下有两道不同题时，页面必须写「做了 2 道」；
       若这份数据里那个点只有一道题（pair=false），只要求这行存在。 */
    const wkPass = !!wkSeed.kid && wk.rows >= 1 && (wkSeed.pair ? wk.two >= 1 : true) && Number(wk.openN) >= 1 &&
      /^#\/rel\//.test(String(wk.rel)) && /2576/.test(wk.foot) && wk.clean < wk.was && errsWeak.length === 0;
    results.push({ name: 'weak-points', pass: wkPass, seed: wkSeed, wk, consoleErrors: errsWeak });
    console.log((wkPass ? 'PASS ' : 'FAIL ') + 'weak-points ' + JSON.stringify({ kid: wkSeed.kid, pair: wkSeed.pair, q1: wkSeed.qid, q2: wkSeed.qid2, openN: wk.openN, rows: wk.rows, two: wk.two, txt: wk.txt, rel: wk.rel, clean: wk.clean }));

    /* 该抽回来看看（今日页）：做对过的不等于记住了。
       造一条 5 天前做对的记录，断言今日页抽出复习块、点进去只排这一道。 */
    cdp.drainErrors();
    await cdp.send('Page.navigate', { url: INDEX + '#/today' });
    await sleep(1500);
    const rvSeed = await cdp.eval("(function(){" +
      "var qkp = MC.peek('qkp') || {};" +
      "var ids = Object.keys(qkp).filter(function(k){ return /^K801-/.test(String(qkp[k])) && /^\\d+\\.\\d+_/.test(k); });" +
      "if (!ids.length) return {err:'NO_QKP'};" +
      "var m = ids[0].match(/^(\\d+\\.\\d+)_/), sec = m ? m[1] : '12.1';" +
      "var now = Date.now();" +
      "var r = {schema_version:1,uid:'EV-rv-'+now,item:ids[0],sec:sec,band:'basic',verdict:'correct',final:'correct'," +
      "  how:'exact',hint:'',seconds:20,stu:'',ref:'',reasons:[],volume:'801',chapter:Number(String(sec).split('.')[0])," +
      "  ts: now - 5*86400000};" +
      "MC.store.push(r); return {item:ids[0], sec:sec};" +
    "})()");
    await cdp.send('Page.navigate', { url: INDEX + '#/weak' });
    await sleep(300);
    await cdp.send('Page.navigate', { url: INDEX + '#/today' });
    await sleep(1500);
    const rv = await cdp.eval("(function(){" +
      "var txt = (document.body.innerText||'').replace(/\\s+/g,' ');" +
      "var btn = document.querySelector('[data-act=review]');" +
      "return {has:txt.indexOf('该抽回来看看') >= 0, btn:btn?btn.textContent.replace(/\\s+/g,' '):'', days:/5 天前做对过/.test(txt)};" +
    "})()");
    await cdp.eval("(function(){var b=document.querySelector('[data-act=review]');if(b)b.click();return 1;})()");
    await sleep(2200);
    const rvGo = await cdp.eval("(function(){" +
      "var h=document.querySelector('.card .muted');" +
      "var ans=document.querySelector('textarea.answer')||document.querySelector('.opt');" +
      "return {head:h?h.textContent.replace(/\\s+/g,' '):'', ask:!!ans};" +
    "})()");
    const rvClean = await cdp.eval("(function(){var rest=MC.store.all().filter(function(x){return String(x.uid||'').indexOf('EV-rv')!==0;});try{localStorage.setItem(MC.store.KEY,JSON.stringify(rest));}catch(e){}return rest.length;})()");
    const errsRv = cdp.drainErrors();
    const rvPass = !!rvSeed.item && rv.has && /抽 1 道/.test(rv.btn) && rv.days &&
      (rvGo.head||'').indexOf('第 1 / 1 题') >= 0 && errsRv.length === 0;
    results.push({ name: 'review-due', pass: rvPass, seed: rvSeed, rv, go: rvGo, clean: rvClean, consoleErrors: errsRv });
    console.log((rvPass ? 'PASS ' : 'FAIL ') + 'review-due ' + JSON.stringify({ sec: rvSeed.sec, has: rv.has, btn: rv.btn, head: rvGo.head, ask: rvGo.ask, clean: rvClean }));

    /* 依据总览（#/evidence）：三档依据与可复核命令都得真在页面上。
       这页的价值全在数字不过期，所以断言读数字本身，不读标题。 */
    cdp.drainErrors();
    await cdp.send('Page.navigate', { url: INDEX + '#/evidence' });
    await sleep(2400);
    const ev = JSON.parse(await cdp.eval("(function(){" +
      "var rows = Array.prototype.slice.call(document.querySelectorAll('.ev-row'));" +
      "var num = function(t){ var m=(t||'').match(/([0-9,]+)/); return m?Number(m[1].replace(/,/g,'')):0; };" +
      "var pick = function(lbl){ var r = rows.filter(function(x){ return ((x.querySelector('.ev-t')||{}).textContent||'') === lbl; })[0]; return r?num((r.querySelector('.ev-n')||{}).textContent):-1; };" +
      "var txt = (document.body.innerText||'').replace(/\\s+/g,' ');" +
      "return JSON.stringify({rows:rows.length, hand:pick('人工判定'), rule:pick('规则推断')," +
        " guess:pick('方法挂点推断'), cmds:document.querySelectorAll('.ev-cmd').length," +
        " hasLead:txt.indexOf('依据总览')>=0 && txt.indexOf('草稿')>=0});" +
    "})()") || '{}');
    const errsEv = cdp.drainErrors();
    const shotEv = await cdp.send('Page.captureScreenshot', { format: 'png' });
    fs.writeFileSync(path.join(OUT, 'web-evidence.png'), Buffer.from(shotEv.data, 'base64'));
    const evSum = ev.hand + ev.rule + ev.guess;
    const evPass = ev.rows >= 10 && ev.hand > 0 && ev.rule > ev.hand && ev.guess > 0 &&
      evSum > 5000 && ev.cmds === 4 && ev.hasLead && errsEv.length === 0;
    results.push({ name: 'evidence-facts', pass: evPass, ev, consoleErrors: errsEv });
    console.log((evPass ? 'PASS ' : 'FAIL ') + 'evidence-facts ' + JSON.stringify(ev));

    /* 节页「接着走」：学完一节要能顺着教材走，不用每次退回目录 */
    cdp.drainErrors();
    await cdp.send('Page.navigate', { url: INDEX + '#/sec/801/12.1' });
    await sleep(1500);
    const nx = JSON.parse(await cdp.eval("(function(){" +
      "var ds = Array.prototype.slice.call(document.querySelectorAll('.divider'));" +
      "var lab = ds.filter(function(x){ return (x.textContent||'').indexOf('接着走') >= 0; })[0];" +
      "var card = lab && lab.nextElementSibling;" +
      "var links = card ? Array.prototype.slice.call(card.querySelectorAll('a')).map(function(a){" +
        "return { t:(a.textContent||'').replace(/\\s+/g,' ').trim(), h:a.getAttribute('href') }; }) : [];" +
      "return JSON.stringify({ has:!!lab, n:links.length, links:links, now:location.hash });" +
    "})()") || '{}');
    const errsNx = cdp.drainErrors();
    const nextLink = (nx.links || []).filter(function (x) { return /›/.test(x.t); })[0] || {};
    const nxPass = nx.has && nx.n === 2 && /^#\/sec\/801\/12\./.test(nextLink.h || '') &&
      nextLink.h !== nx.now && errsNx.length === 0;
    results.push({ name: 'section-next', pass: nxPass, nx, consoleErrors: errsNx });
    console.log((nxPass ? 'PASS ' : 'FAIL ') + 'section-next ' + JSON.stringify({ n: nx.n, next: nextLink.t, href: nextLink.h }));

    /* 目录页进度：做过几道、其中独立对几道（带提示的不算） */
    cdp.drainErrors();
    await cdp.eval("(function(){" +
      "var a = [];" +
      "var t = Date.now();" +
      "a.push({schema_version:1,uid:'EV-toc-a',item:'12.1_bas_01',sec:'12.1',ts:t-3000,final:'correct',verdict:'correct',hint:'none',volume:'801',chapter:'12'});" +
      "a.push({schema_version:1,uid:'EV-toc-b',item:'12.1_bas_02',sec:'12.1',ts:t-2000,final:'wrong',verdict:'wrong',hint:'none',volume:'801',chapter:'12'});" +
      "localStorage.setItem(MC.store.KEY, JSON.stringify(a)); return 'ok'; })()");
    await cdp.send('Page.navigate', { url: INDEX + '#/toc/801' });
    await sleep(1500);
    const tp = JSON.parse(await cdp.eval("(function(){" +
      "var rows = Array.prototype.slice.call(document.querySelectorAll('a.sec-row'));" +
      "var one = rows.filter(function(a){ return (a.querySelector('.no')||{}).textContent === '12.1'; })[0];" +
      "var progs = Array.prototype.slice.call(document.querySelectorAll('.vol-prog'));" +
      "var hit = progs.filter(function(p){ return (p.textContent||'').indexOf('做过 2 ') >= 0; })[0];" +
      "return JSON.stringify({ meta: one ? (one.querySelector('.meta')||{}).textContent : ''," +
        " prog: hit ? hit.textContent.replace(/\\s+/g,' ').trim() : ''," +
        " w: hit ? ((hit.querySelector('.pbar i')||{}).style||{}).width : '' });" +
    "})()") || '{}');
    const errsTp = cdp.drainErrors();
    const tpPass = /做过 2\//.test(tp.meta || '') && /独立对 1/.test(tp.meta || '') &&
      /做过 2 \/ /.test(tp.prog || '') && /独立做对 1/.test(tp.prog || '') && !!tp.w && errsTp.length === 0;
    results.push({ name: 'toc-progress', pass: tpPass, tp, consoleErrors: errsTp });
    console.log((tpPass ? 'PASS ' : 'FAIL ') + 'toc-progress ' + JSON.stringify(tp));
    await cdp.eval("(function(){localStorage.setItem(MC.store.KEY, '[]'); return 0; })()");

    fs.writeFileSync(path.join(OUT, 'web-report.json'), JSON.stringify(results, null, 2));
    const bad = results.filter(r => !r.pass);
    console.log('\n' + (results.length - bad.length) + '/' + results.length + ' PASS');
    process.exitCode = bad.length ? 1 : 0;
  } finally {
    if (chrome) { try { chrome.kill(); } catch (e) {} }
    if (!process.argv.includes('--keep')) { await sleep(300); try { execSync('taskkill /F /IM chrome.exe /T', { stdio: 'ignore' }); } catch (e) {} }
  }
})();
