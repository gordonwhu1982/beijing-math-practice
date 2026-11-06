#!/usr/bin/env node
'use strict';
/**
 * 视觉断言探针：把「界面看着不对」里可以量出来的那几条，变成一条命令 + 退出码。
 *
 * 为什么单独有这个脚本（web_smoke 已经在管交互与几何）：
 * web_smoke 判的是「该出现的文案在不在、有没有横向溢出、公式渲染没渲染」。
 * 它不看字号分布、不看裸英文枚举、不看行内公式有没有被折行劈成两半、不看主按钮在不在首屏。
 * 这四类都不报错，只会让页面「看着糊」—— 而这正是反复出现的那句「改了显示还是有问题」。
 * 所以单独一道门，阈值写死在这里，改一次量一次。
 *
 * 判据（不达标即失败，退出码 = 不达标条数）：
 *   1. 小字：可见字符里小于 13px 的占比 <= 5%（字号下限已在 app.css 抬到 13px，这条防回归）
 *   2. 裸英文枚举：0 处（concept/property/expression… 这些内部字段名不许漏到界面）
 *   3. 行内公式跨行：0 处（.katex 元素被折成多行 = 公式被劈开）
 *   4. 横向溢出：documentElement 溢出 <= 2px，且自身溢出的元素 0 个
 *   5. 主按钮：today 与 practice 首屏各有一个可见的 .btn-primary
 *   6. 窄屏列数：430 宽下 .rel-grid 必须 1 列
 *
 * 用法：
 *   node tools/ux_asserts.js                  # 430 全量 + 1280 溢出复查
 *   W=860 node tools/ux_asserts.js            # 单档
 *   node tools/ux_asserts.js --json out/x.json
 */
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const CHROME = process.env.MC_CHROME || 'C:/Program Files/Google/Chrome/Application/chrome.exe';
/* 端口必须能让位：check_all 里这条断言和别的手工探针同时跑过，
   一次 EADDRINUSE 就把整道闸门判成 [FAIL]（跑不起来 ≠ 界面不合格）。
   端口被占就顺延，最多试 12 个，真占满了才算失败。 */
let HTTP_PORT = Number(process.env.MC_PROBE_HTTP || 8133);
const CDP_PORT = Number(process.env.MC_PROBE_CDP || 9373);
const MIME = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.woff2': 'font/woff2', '.woff': 'font/woff',
  '.ttf': 'font/ttf', '.json': 'application/json', '.png': 'image/png', '.svg': 'image/svg+xml'
};

/* 阈值：改这里就是改验收标准，改完在 docs/STATE.md 写为什么 */
const MAX_SMALL_SHARE = 0.05;
const MAX_OVERFLOW_PX = 2;
const SMALL_PX = 13;
/* 13px 是合法的最小档（--fs-xs），所以「<13px」抓不到它。见 MEASURE 里的 xsChars 注释。 */
const MAX_XS_SHARE = 0.30;
/* 比例只在「有足够正文」的屏上算：376 个字的弱项页（两行记录）里，
   册号/节号胶囊/计数 pill/顶栏时钟这些**标签**天然占三成以上，
   算比例只会把「这页内容少」误读成「正文被压小了」。
   400 字约三行正文，与 FS_TIER 的门槛同一个理由、同一个数。 */
const XS_MIN_CHARS = 400;
/* 设计标准（out/team/design-ux-researcher.md §1）落成的三条硬阈值：
   R-2 一屏内占比 >20% 的字号档 ≤2 且两档差 ≥2px；
   R-4 圆角与行高比各 ≤4 档；R-5 可点元素高度 ≥40px（热区，不是字号）。 */
/* 一屏出现 3 档字号（16.5 正文 / 14.5 次级 / 13 标签）本身是设计，不是缺陷：
   知识页就是「正文 + 关系列表 + 题号胶囊」三层。4 档以上各占 >20% 才是匀质、没主次。 */
const FS_TIER_MAX = 3;
const FS_TIER_GAP = 2;
const SHAPE_MAX = 4;
const TAP_MIN = 40;
const TAP_MIN_INLINE = 24;
/* 首屏主按钮离顶的上限（430 宽）。一条：430x800 的手机，一屏内必须看得见「开始练」；
   改前实测 545px（h1+两行导语+2x2 四格+一行下拉挡在前面），R3 重排后 ≈220px。 */
const MAX_CTA_TOP = 260;
/* 首次态那张「你在学哪一节」的卡：它本身就是首屏唯一该做的事，必须露出顶部 */
const MAX_ASK_TOP = 200;

function serve() {
  return new Promise(function (res, rej) {
    let tries = 0;
    function handler(req, rsp) {
      let p = decodeURIComponent(req.url.split('?')[0].split('#')[0]);
      if (p === '/') p = '/runtime/web/index.html';
      const f = path.join(ROOT, p);
      if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { rsp.writeHead(404); rsp.end('404'); return; }
      rsp.writeHead(200, { 'Content-Type': MIME[path.extname(f).toLowerCase()] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(rsp);
    }
    function attempt() {
      const s = http.createServer(handler);
      s.once('error', function (e) {
        if (e && e.code === 'EADDRINUSE' && tries < 12) { tries++; HTTP_PORT += 1; attempt(); return; }
        rej(e);
      });
      s.listen(HTTP_PORT, '127.0.0.1', function () {
        if (tries) console.log('[port] 127.0.0.1:8133 被占，改用 ' + HTTP_PORT);
        res(s);
      });
    }
    attempt();
  });
}
function getJson(url) {
  return new Promise(function (resolve, reject) {
    const req = http.get(url, function (r) {
      let b = '';
      r.on('data', function (d) { b += d; });
      r.on('end', function () { try { resolve(JSON.parse(b)); } catch (e) { reject(e); } });
    });
    req.on('error', reject);
    req.setTimeout(3000, function () { req.destroy(new Error('timeout')); });
  });
}
const sleep = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
let idc = 0;
function rpc(ws, method, params, ms) {
  return new Promise(function (res, rej) {
    const id = ++idc;
    const to = setTimeout(function () { ws.removeEventListener('message', on); rej(new Error('rpc_timeout ' + method)); }, ms || 20000);
    const on = function (ev) {
      const m = JSON.parse(ev.data);
      if (m.id === id) { clearTimeout(to); ws.removeEventListener('message', on); m.error ? rej(new Error(method + ': ' + JSON.stringify(m.error))) : res(m.result); }
    };
    ws.addEventListener('message', on);
    ws.send(JSON.stringify({ id: id, method: method, params: params || {} }));
  });
}

const ROUTES = [
  ['today', '#/today'], ['toc', '#/toc'], ['toc-801', '#/toc/801'],
  ['sec-801-11.1', '#/sec/801/11.1'], ['sec-801-12.1', '#/sec/801/12.1'],
  ['kp-801-11.1-02', '#/kp/K801-11.1-02'],
  /* 故意给一个格式对、数据里没有的编号：这一屏必须能走掉，不许停在错误句上 */
  ['kp-bad', '#/kp/K999-99.9-99'],
  ['map', '#/map'], ['map-801', '#/map?vol=801'],
  /* 地址里带 node 就是焦点态：这时只能看见中心那圈线（EDGES 判据量这里）。
     2026-11-02 实测 733 根线仍在：样式层 edge.dim 0.22 与 edge.mind-dim 0.12
     都定义在 edge.e-x 之后，同特异性后者胜，写在中间的规则等于没写。 */
  ['map-node', '#/map?node=K801-11.1-01'],
  /* 图上点题会带 read=1 打开整幅阅读壳：这条路必须只有一个壳，且回跳地址逐字符还原 */
  ['map-read', '#/map?node=K801-11.1-01&read=1'],
  /* 聚焦态才有标签（paintCallouts 只在 view=mind 且缩放到点时画），
     标签必须贴着自己的点：CHIP 判据量这里。 */
  ['map-local', '#/map'],
  ['practice-801-11.1', '#/practice/801/11.1'],
  /* 单题入口落进去是预览态（先看这一题）：它必须把选择题的四个选项列出来，
     2026-11-02 这一屏一个选项都没有，读者只能从解析里反推「选 B」。 */
  ['practice-look', '#/practice/801/11.1?q=11.1_bas_02'], ['rel-802-16.2-03', '#/rel/K802-16.2-03'],
  ['weak', '#/weak'], ['evidence', '#/evidence'], ['thoughts', '#/thoughts'], ['archive', '#/archive']
];

/* 1280 只复跑少数路由：宽屏主要看溢出与留白 */
const WIDE_ROUTES = ['today', 'toc-801', 'sec-801-11.1', 'kp-801-11.1-02', 'practice-801-11.1', 'rel-802-16.2-03', 'map', 'map-node', 'map-read', 'map-local'];

/* 内部枚举词表：由 tools/enum_scan.py 从 content/ 生成（169 个值）。
   原来的清单是手写 9 个词，漏一个就漏一类问题；改成跟数据走。 */
const ENUM_KEYS = (function () {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, 'tools', 'enum_values.json'), 'utf8'));
    return Object.keys(j.values || {});
  } catch (e) { return []; }
})();

const MEASURE = String.raw`JSON.stringify((function(){
  var KEYS = __ENUM_KEYS__;
  /* OPTION/OPTGROUP 只是 <select> 的候选项，屏幕上一次只显示一项、也不受页面字号支配，
     把它算进字号分布会把「下拉框里塞了 148 个节名」误读成「这屏是一片 14.5px」。 */
  var SKIP = {SCRIPT:1,STYLE:1,HEAD:1,META:1,LINK:1,SVG:1,PATH:1,OPTION:1,OPTGROUP:1};
  var all = Array.prototype.slice.call(document.body.querySelectorAll('*'));
  var chars = 0, small = 0, smallDetail = {}, worst = [], fsChars = {}, fsWho = {};
  /* 13px 是这套 token 里最小的一档（--fs-xs），所以「<13px」这条老判据永远抓不到它：
     fs2 < 13 是严格小于，13px 本身不计。设计评审就是从这里发现「门恒绿而屏上一片 13px」的
     （kp 屏 65%、map 屏 61% 的可见字是 13px，小字占比却报 0.0%）。
     现在补一条「整体字号档」：<=13px 的字符占比不得超过 MAX_XS_SHARE。
     留 30% 的余量是给标签的（题号胶囊、pill、折叠摘要、顶栏副标题本来就是标签档），
     过 30% 说明正文也被压到标签档了。 */
  var xsChars = 0, xsWho = {};
  all.forEach(function(el){
    if (SKIP[el.tagName]) return;
    /* 公式内部不参与小字统计：KaTeX 的上标/下标是 0.7em 的 scriptstyle，
       属于数学排版规范（不是「界面字太小」），拿 13px 去要求它只能把公式改坏。 */
    if (el.closest && el.closest('.katex')) return;
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    var own = Array.prototype.slice.call(el.childNodes).filter(function(n){ return n.nodeType === 3 && n.textContent.trim().length > 0; });
    if (!own.length) return;
    var fs2 = parseFloat(cs.fontSize);
    /* 小于 2px 的是零宽字符承载元素（​ / 占位符），量它没有意义 */
    if (fs2 < 2) return;
    var len = own.reduce(function(a, n){ return a + n.textContent.trim().length; }, 0);
    chars += len;
    /* 固定导航与控件标签（顶栏、左侧栏、按钮、折叠摘要）每屏都一样：它们的 13px 是标签档，
       不该参与「这一屏主角是几号字」的判断 —— 否则整页正文只有 14.5 与 16.5 两档，
       也会被几个导航按钮判成 13/14.5 撞档。 */
    if (el.closest && el.closest('#topbar, #tabs, button, summary, select, .btn, .tb-lbl')) {
      if (fs2 < 13) small += len;
      return;
    }
    /* 分字号累计字符量：小字占比只能挡「太小」，挡不住「所有字都挤在最小那一档」——
       后者才是「一片匀质、看不出重点」的真原因（13px 占 67% 时小字占比是绿的）。 */
    var fsk = String(Math.round(fs2 * 10) / 10);
    fsChars[fsk] = (fsChars[fsk] || 0) + len;
    var who = fsk + '|' + el.tagName.toLowerCase() + '.' + String(el.className || '').split(' ')[0].slice(0, 16);
    fsWho[who] = (fsWho[who] || 0) + len;
    if (fs2 <= 13) {
      xsChars += len;
      xsWho[who] = xsWho[who] || 0;
    }
    if (fs2 < 13) {
      small += len;
      var k = String(Math.round(fs2 * 10) / 10);
      smallDetail[k] = (smallDetail[k] || 0) + len;
      if (worst.length < 3) worst.push((own[0].textContent || '').replace(/\s+/g, ' ').trim().slice(0, 24) + ' @' + k + 'px');
    }
  });
  /* 裸英文枚举按「文本节点」找，不按整页 innerText 找 —— 后者拿不到「是哪个元素在漏」，
     修的时候只能猜。这里留下元素 class 与前后文，失败信息本身就是定位现场。 */
  var EN = new RegExp('\\b(' + KEYS.join('|') + ')\\b', 'g');
  var em = [];
  var enumCount = {};
  var tw = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null);
  var node;
  while ((node = tw.nextNode())) {
    var t = node.textContent;
    if (!t || !t.trim()) continue;
    var pe = node.parentElement;
    if (!pe || (pe.closest && pe.closest('.katex,script,style,code,pre'))) continue;
    EN.lastIndex = 0;
    var mm = t.match(EN);
    if (!mm) continue;
    mm.forEach(function (w) { enumCount[w] = (enumCount[w] || 0) + 1; });
    var chain = [], p = pe;
    for (var ci = 0; ci < 4 && p; ci++) { chain.push(p.tagName.toLowerCase() + (p.className ? '.' + String(p.className).split(' ')[0].slice(0, 20) : '')); p = p.parentElement; }
    em.push({ w: mm.slice(0, 2).join(','), cls: (pe.className || '').toString().slice(0, 28), chain: chain.join('<'), ctx: t.replace(/\s+/g, ' ').trim().slice(0, 36) });
  }
  em = em.slice(0, 8);
  /* 行内公式被折行：.katex 是 inline-block，正常情况下只有一个矩形；
     一旦被容器挤断，它自己会被拆成两个矩形，两段的 top 相差一行。
     只判 top 真的不同（同一行内的多段矩形不算），避免把 vlist 的多矩形当折行。 */
  var kx = Array.prototype.slice.call(document.querySelectorAll('.katex'));
  var split = [];
  kx.forEach(function(e){
    var rs = e.getClientRects();
    if (rs.length < 2) return;
    var tops = [];
    for (var i = 0; i < rs.length; i++) tops.push(Math.round(rs[i].top));
    var min = Math.min.apply(null, tops), max = Math.max.apply(null, tops);
    if (max - min < 6) return;
    var p = e.closest('p,li,div,span') || e;
    split.push((p.innerText || '').replace(/\s+/g, ' ').slice(0, 50) + ' [dy=' + (max - min) + ']');
  });
  function cols(sel){ var e = document.querySelector(sel); if (!e) return null; var g = getComputedStyle(e).gridTemplateColumns; return g ? g.split(' ').filter(Boolean).length : null; }
  var over = [];
  all.forEach(function(el){
    if (el.scrollWidth - el.clientWidth > 2 && el.clientWidth > 0) {
      var cs3 = getComputedStyle(el);
      if (cs3.overflowX === 'visible' && cs3.display !== 'inline') {
        over.push((el.tagName + '.' + (el.className || '')).slice(0, 40) + ' +' + (el.scrollWidth - el.clientWidth) + 'px');
      }
    }
  });
  /* 主按钮按类名找，不按颜色找 —— 颜色一改（--green 从 #0a7d5a 到 #097756）写死的 rgb 串就失配，
     那条断言会恒判达标，等于不存在。 */
  var vh = window.innerHeight;
  var prim = Array.prototype.slice.call(document.querySelectorAll('.btn-primary')).filter(function(e){
    var r = e.getBoundingClientRect();
    return r.width > 40 && r.height > 20 && r.top < vh && r.bottom > 0;
  }).map(function(e){
    var r = e.getBoundingClientRect();
    return { t: (e.innerText || '').replace(/\s+/g, ' ').slice(0, 18), y: Math.round(r.top), w: Math.round(r.width) };
  });
  /* ---- 形状收敛（设计标准 R-4）与浮层互撞、点击热区：这三类以前完全没有判据 ---- */
  var radSet = {}, lhSet = {}, boxN = 0;
  all.forEach(function(el){
    if (SKIP[el.tagName]) return;
    var cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return;
    var rr = el.getBoundingClientRect();
    if (rr.width < 24 || rr.height < 16) return;
    var bgc = cs.backgroundColor;
    var bw = parseFloat(cs.borderTopWidth);
    var painted = (bgc && bgc !== 'rgba(0, 0, 0, 0)' && bgc !== 'transparent') || (isFinite(bw) && bw > 0);
    if (!painted) return;
    boxN++;
    /* 直角（0）不是「一种形状」，是「没有形状」——把它算一档会让所有页面永远多一档。
       百分比与大值都归到同一类胶囊（头像圆点 50%、--r-pill 999px 视觉上是同一件事）。 */
    var radRaw = cs.borderTopLeftRadius;
    var rad = parseFloat(radRaw);
    if (isFinite(rad) && rad > 0) radSet[(/%/.test(radRaw) || rad >= 100) ? 'pill' : String(Math.round(rad))] = 1;
  });
  /* 行高比只量「自己排了字」的元素。上面那轮量的是 painted（有底色/边框）的块，
     而块本身几乎都不声明 line-height —— 量到的是继承值，13 个档位被掩盖成 1 个
     （2026-10-31 实测 kp 页 lhN=1，改前 CSS 里明明有 18 个不同的行高比）。 */
  Array.prototype.forEach.call(document.querySelectorAll('#app *'), function(el){
    if (SKIP[el.tagName]) return;
    var hasText = false;
    for (var i2 = 0; i2 < el.childNodes.length; i2++) {
      var nd = el.childNodes[i2];
      if (nd.nodeType === 3 && /\S/.test(nd.nodeValue)) { hasText = true; break; }
    }
    if (!hasText) return;
    /* KaTeX 自己带 line-height:normal（≈1.2），那是排版规范的内部量，不是我们的行高档位 */
    if (el.closest && el.closest('.katex')) return;
    var cs3 = getComputedStyle(el);
    if (cs3.display === 'none' || cs3.visibility === 'hidden') return;
    /* display:none 只挂在祖先上时，子元素自己的 computed display 仍是 inline —— 图例被
       .is-cross 收起来之后，它的 .k / .sw 还会被量进来，凭空多出 1.15 与 1.55 两个档。
       有没有布局盒子才是「看不看得见」的真判据。 */
    if (!el.getClientRects().length) return;
    var lhv = parseFloat(cs3.lineHeight), fsv = parseFloat(cs3.fontSize);
    if (isFinite(lhv) && fsv > 0 && lhv > 0) lhSet[String(Math.round(lhv / fsv * 100) / 100)] = 1;
  });
  /* A5：段标题不许比它管辖的正文还小。这条被踩过两次（11.5px 灰字 → 14.5px 仍小于 16.5 正文），
     都是「认真看了一眼觉得乱，但说不出哪不对」。层级该靠字重与色条，不靠把标题压小。 */
  var headLt = [];
  Array.prototype.forEach.call(document.querySelectorAll('.dd-block'), function(b){
    var h = b.querySelector('h3');
    if (!h) return;
    var hf = parseFloat(getComputedStyle(h).fontSize) || 0;
    var body = 0, who = '';
    /* 正文块不一定直接挂在 .dd-block 下（<details> 折叠块里还套一层 .in），用后代查询。
       排除标题自己的子树，否则 h3 里的 <em> 角标会被当成正文。 */
    Array.prototype.forEach.call(b.querySelectorAll('.dd-def, ul, ol, p'), function(c){
      if (h.contains(c)) return;
      var f2 = parseFloat(getComputedStyle(c).fontSize) || 0;
      if (f2 > body) { body = f2; who = tagOf(c); }
    });
    if (body > hf + 0.5) headLt.push((h.textContent || '').trim().slice(0, 10) + ' 标题' + hf.toFixed(1) + 'px < 正文' + body.toFixed(1) + 'px');
  });
  /* A7：海拔只给一个块。阴影是「浮起来」的信号，一块屏上浮三个，等于告诉读者三件同等重要。 */
  var elevList = [];
  Array.prototype.forEach.call(document.querySelectorAll('#app .card, #app .today-stats .st'), function(el){
    var cs2 = getComputedStyle(el);
    if (!cs2.boxShadow || cs2.boxShadow === 'none') return;
    if (cs2.boxShadow.indexOf('inset') === 0) return;
    if (!visible(el)) return;
    var rr2 = el.getBoundingClientRect();
    if (rr2.width < 80 || rr2.height < 40) return;
    elevList.push(tagOf(el));
  });
  function tagOf(e){ return e.tagName.toLowerCase() + (e.className ? '.' + String(e.className).split(' ')[0].slice(0, 18) : '') + (e.id ? '#' + e.id : ''); }
  /* 浮层互撞：两个 position:absolute 的块叠在一起，谁盖住谁都没人负责。
     map 页的读图提示被搜索框压掉 215px 就是这么漏了 61 条冒烟 + 8 类断言。 */
  /* 只判「真的看得见」的浮层：折叠在 <details> 里、祖先 display:none、opacity:0 的都不算。
     上一版只看元素自身样式，把没展开的「其他画法」下拉列表也算成压在画布上（21 处假重叠）。 */
  function visible(el){
    if (el.checkVisibility) return el.checkVisibility({ opacityProperty: true, visibilityProperty: true, contentVisibilityAuto: true });
    var cs0 = getComputedStyle(el);
    if (cs0.display === 'none' || cs0.visibility === 'hidden' || parseFloat(cs0.opacity) === 0) return false;
    return el.getClientRects().length > 0;
  }
  var absEls = Array.prototype.slice.call(document.querySelectorAll('#app *')).filter(function(el){
    var cs = getComputedStyle(el);
    if (cs.position !== 'absolute' && cs.position !== 'fixed') return false;
    if (!visible(el)) return false;
    var rr = el.getBoundingClientRect();
    return rr.width > 40 && rr.height > 20 && rr.top < window.innerHeight;
  });
  var ovl = [];
  for (var oi = 0; oi < absEls.length; oi++) {
    for (var oj = oi + 1; oj < absEls.length; oj++) {
      var EA = absEls[oi], EB = absEls[oj];
      if (EA.contains(EB) || EB.contains(EA)) continue;
      /* 浮层浮在画布上本来就是设计（图例、提示、搜索框都在画布上方）。
         要判的是「两个浮层互相压住」——那才会互相挡字。 */
      if (EA.tagName === 'CANVAS' || EB.tagName === 'CANVAS') continue;
      if (EA.querySelector('canvas') || EB.querySelector('canvas')) continue;
      /* .map-callouts 是一层透明的定位容器（pointer-events:none，标签是它里面的按钮）：
         它盖住整块画布是它的职责，真正的标签另有 CHIP 判据在量，这里不该重复记账。 */
      function isLayer(e){ return e.classList && (e.classList.contains('map-callouts') || e.classList.contains('call-lines')); }
      if (isLayer(EA) || isLayer(EB)) continue;
      /* 抽屉/弹层（fixed 且几乎占满一屏宽）是模态层，它本来就该盖住底下的东西，
         而且底下那层此刻点不到——把它算成「互相挡字」只会逼人去改一个正确的东西。 */
      function isModal(e){
        var s2 = getComputedStyle(e);
        return s2.position === 'fixed' && e.getBoundingClientRect().width > window.innerWidth * 0.8;
      }
      if (isModal(EA) || isModal(EB)) continue;
      var ra = EA.getBoundingClientRect(), rb = EB.getBoundingClientRect();
      var iw = Math.min(ra.right, rb.right) - Math.max(ra.left, rb.left);
      var ih = Math.min(ra.bottom, rb.bottom) - Math.max(ra.top, rb.top);
      if (iw <= 0 || ih <= 0) continue;
      var smallA = Math.min(ra.width * ra.height, rb.width * rb.height);
      if (!smallA) continue;
      var cover = (iw * ih) / smallA;
      if (cover > 0.05) ovl.push(tagOf(EA) + ' × ' + tagOf(EB) + ' 重叠 ' + Math.round(cover * 100) + '%');
    }
  }
  /* 点击热区：手机上 <40px 高的按钮等于「点了没反应」，而它长得完全正常。 */
  var TAPSEL = 'button, a, summary, select, input, [role="button"], .chip, .dd-count button';
  var tapSmall = [];
  var tapTiny = [];
  var tapN = 0;
  Array.prototype.slice.call(document.querySelectorAll(TAPSEL)).forEach(function(el){
    if (!visible(el)) return;
    var rr = el.getBoundingClientRect();
    if (rr.width < 4 || rr.height < 4) return;
    if (rr.top > window.innerHeight * 40) return;
    tapN++;
    /* 两把尺子，因为这是两件不同的事：
       ① 按钮/下拉/输入框/折叠标题 —— 手指按下去的目标，用 40px（WCAG 2.5.5 AAA 与各家移动端规范的一致值）；
       ② 正文里的纯文字链接（背景透明、无边框）—— 它跟句子排在一起，做成 40px 高的方块会把整段文字拆散，
          用 24px（WCAG 2.2 AA 2.5.8 Target Size Minimum）。
       一刀切 40px 会把「正文里给一个链接」判成缺陷，然后逼着把正文改烂。 */
    var isInlineLink = el.tagName === 'A' && (function(){
      var s2 = getComputedStyle(el);
      return s2.backgroundColor === 'rgba(0, 0, 0, 0)' && s2.borderTopWidth === '0px' && s2.backgroundImage === 'none';
    })();
    var minH = isInlineLink ? __TAP_MIN_INLINE__ : __TAP_MIN__;
    if (rr.height < minH - 0.5 || (!isInlineLink && rr.width < 24)) {
      tapSmall.push(tagOf(el) + ' ' + Math.round(rr.width) + '×' + Math.round(rr.height) + ' «' + (el.innerText || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 12) + '»' + (isInlineLink ? '[链]' : ''));
    }
    /* 桌面用鼠标，40px 触控热区不适用；但小于 24×16 的东西鼠标也难点中，留一条底线。 */
    if (rr.height < 23.5 || rr.width < 16) {
      tapTiny.push(tagOf(el) + ' ' + Math.round(rr.width) + '×' + Math.round(rr.height) + ' «' + (el.innerText || el.value || '').replace(/\s+/g, ' ').trim().slice(0, 12) + '»');
    }
  });
  var fsTiers = Object.keys(fsChars).map(function(k){ return { px: parseFloat(k), n: fsChars[k] }; })
    .sort(function(a, b){ return b.n - a.n; });
  var fsMain = fsTiers.filter(function(t){ return chars && t.n / chars > 0.20; })
    .map(function(t){ return t.px; }).sort(function(a, b){ return a - b; });
  var de = document.documentElement;
  var xsTop = Object.keys(xsWho).sort(function(x, y){ return xsWho[y] - xsWho[x]; }).slice(0, 4);
  return {
    chars: chars, small: small, smallShare: chars ? small / chars : 0, smallDetail: smallDetail, worst: worst,
    xsChars: xsChars, xsShare: chars ? xsChars / chars : 0, xsTop: xsTop,
    enumN: em.length, enumCount: enumCount, enumSample: em.slice(0, 4),
    katexN: kx.length, katexSplitN: split.length, katexSplit: split.slice(0, 4),
    /* 起服务的目录不对时 ../../assets 会 404：页面停在「正在打开…」，公式退成裸 TeX，
       而页面本身不报错 —— 只看「有没有抛异常」是查不出来的。这两个数是加载情况本身。 */
    katexCss: (function(){ var n = 0; Array.prototype.forEach.call(document.styleSheets, function (s) { try { if (s.href && s.href.indexOf('katex') >= 0) n = s.cssRules.length; } catch (e) {} }); return n; })(),
    cyLib: typeof window.cytoscape !== 'undefined',
    primary: prim, askN: document.querySelectorAll('.ask-which').length,
    askTop: (function(){ var a = document.querySelector('.ask-which'); return a ? Math.round(a.getBoundingClientRect().top) : null; })(),
    askSelH: (function(){ var a = document.querySelector('.ask-which select'); return a ? Math.round(a.getBoundingClientRect().height) : 0; })(),
    relCols: cols('.rel-grid'),
    /* 「待改 / 该抽回来」的每一行写着什么：只有节名说明看不出是哪道题，题干回填没生效 */
    rowTexts: (function(){
      var a = document.querySelectorAll('.wrong-row .t');
      return Array.prototype.map.call(a, function(x){ return (x.innerText || '').replace(/\s+/g, ' ').trim(); }).slice(0, 8);
    })(),
    fsTiers: fsTiers.slice(0, 5).map(function(t){ return t.px + 'px:' + (chars ? Math.round(t.n / chars * 100) : 0) + '%'; }),
    fsMain: fsMain,
    fsWho: (function(){
      var by = {};
      Object.keys(fsWho).forEach(function(k){
        var p = k.split('|');
        (by[p[0]] = by[p[0]] || []).push([p[1], fsWho[k]]);
      });
      var o = {};
      Object.keys(by).forEach(function(k){
        o[k] = by[k].sort(function(a, b){ return b[1] - a[1]; }).slice(0, 3).map(function(x){ return x[0] + ':' + x[1]; }).join(' ');
      });
      return o;
    })(),
    headLt: headLt.slice(0, 4), elevN: elevList.length, elevList: elevList.slice(0, 4),
    radN: Object.keys(radSet).length, radSet: Object.keys(radSet).sort(),
    lhN: Object.keys(lhSet).length, lhSet: Object.keys(lhSet).sort(), boxN: boxN,
    /* 图例不许压在画布上：它曾长期 position:absolute 浮在图谱底部 —— 1280 下直接盖住
       「17 章 方根与频数分布」那一片节点，430 下吃掉画布底部 154px。OVL 判据有意排除了
       画布容器（浮层浮在画布上是常见设计），所以图例这一条单独立账。 */
    legendOvl: (function(){
      var cyEl = document.getElementById('cy'), lgEl = document.querySelector('.maplegend');
      if (!cyEl || !lgEl) return 0;
      var rcy = cyEl.getBoundingClientRect(), rlg = lgEl.getBoundingClientRect();
      var cw2 = Math.min(rcy.right, rlg.right) - Math.max(rcy.left, rlg.left);
      var ch2 = Math.min(rcy.bottom, rlg.bottom) - Math.max(rcy.top, rlg.top);
      return (cw2 > 0 && ch2 > 0) ? Math.round(cw2 * ch2) : 0;
    })(),
    /* 画布要整块落在视口里：430×932 上 #cy 底边到过 1027（比视口多 94px），
       最底下一排节点被切在屏幕外，页面上没有任何「往下还有」的提示。 */
    mapFit: (function(){
      var cyEl = document.getElementById('cy');
      if (!cyEl) return null;
      var r = cyEl.getBoundingClientRect();
      /* 拿 932 当上限而不是 innerHeight：这套断言跑在 1400 高的窗口里，
         用 1400 当分母等于给出 468px 的免费额度，真手机上那条底边照样被切。 */
      var cap = Math.min(window.innerHeight, 932);
      return { vh: window.innerHeight, cap: cap, top: Math.round(r.top), bottom: Math.round(r.bottom),
               h: Math.round(r.height), over: Math.round(r.bottom - cap) };
    })(),
    /* 图谱的默认态：点要看得到，线要退到背景里，点开一个点才亮起几条。
       量的是 cytoscape 真实的 style opacity，不是 class 名 —— 类名对了但后面某条
       规则把 opacity 盖掉时，只有量数值才看得见（本轮真实踩过）。 */
    edges: (function(){
      /* 没有 #cy 就返回 null：cytoscape 实例在离开图谱页之后还活着，
         不判在场的话，后面每一条路由都会把上一页那一张图的边数报一遍（本轮真的漏了）。 */
      var host3 = document.getElementById('cy');
      if (!host3 || !host3.getClientRects().length) return null;
      var cy2 = (window.MC && MC.mapCy) ? MC.mapCy() : null;
      if (!cy2) return null;
      var lit = 0, dim = 0, total = 0, colors = {};
      cy2.edges().forEach(function(e){
        total++;
        var op = e.style('opacity');
        if (op > 0.25) { lit++; var c = e.style('line-color'); colors[c] = (colors[c] || 0) + 1; }
        else dim++;
      });
      return { total: total, lit: lit, dim: dim, colors: Object.keys(colors).length,
               focused: cy2.nodes('.sel').length > 0 };
    })(),

    /* 标签必须贴着自己的点：曾经 reserve 算错把 maxRight 压到 80，11 个标签
       全被 clamp 到 left:4px，右边拉出 400–560px 的长线；也曾经整片叠在一起。
       量的两件事就是用户眼睛看的两件事：标签之间叠不叠、引线有多长。 */
    chips: (function(){
      var box = document.querySelector('.map-callouts');
      if (!box || box.hidden) return null;
      var cs = Array.prototype.slice.call(box.querySelectorAll('.call-chip'));
      if (!cs.length) return null;
      var rs = cs.map(function(c){ return c.getBoundingClientRect(); });
      var ovl = 0;
      for (var i = 0; i < rs.length; i++) {
        for (var j = i + 1; j < rs.length; j++) {
          var a2 = rs[i], b2 = rs[j];
          var w2 = Math.min(a2.right, b2.right) - Math.max(a2.left, b2.left);
          var h2 = Math.min(a2.bottom, b2.bottom) - Math.max(a2.top, b2.top);
          if (w2 > 1 && h2 > 1) ovl++;
        }
      }
      var maxLine = 0;
      Array.prototype.slice.call(box.querySelectorAll('.call-lines line')).forEach(function(L){
        var x1 = +L.getAttribute('x1'), y1 = +L.getAttribute('y1');
        var x2 = +L.getAttribute('x2'), y2 = +L.getAttribute('y2');
        if (!isFinite(x1) || !isFinite(y1) || !isFinite(x2) || !isFinite(y2)) return;
        maxLine = Math.max(maxLine, Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1)));
      });
      return { n: cs.length, ovl: ovl, maxLine: Math.round(maxLine) };
    })(),
    /* 下拉不许截断最长选项：窄屏把两个下拉并排时各约 200px，「第 12 章 二次根式」
       会被截成「第 1…」，读不出来选的是哪一章。判据拿容器宽比「最长选项」的估算宽度，
       比人眼看截图可靠。 */
    selClip: (function(){
      var cv = document.createElement('canvas').getContext('2d');
      return [].slice.call(document.querySelectorAll('.mselect')).map(function(s){
        var cs = getComputedStyle(s); cv.font = cs.fontSize + ' ' + cs.fontFamily;
        var w = Math.round(s.getBoundingClientRect().width), worst = 0, wt = '';
        [].forEach.call(s.options, function(o){ var need = Math.ceil(cv.measureText(o.text).width) + 38; if (need > worst) { worst = need; wt = o.text; } });
        return { id: s.id, w: w, need: worst, text: wt, bad: worst > w };
      }).filter(function(x){ return x.bad; });
    })(),
    /* 正文不许掉到 13px：全屏 smallShare 那条判「<13px」，而最小合法档正好是 13px，
       于是 .dd-def 正文被内联 style 压成 13px 也判不出来（map.js 有 4 处这样干过）。
       正文容器单独立一条「≥14px」的硬线。 */
    bodySmall: (function(){
      var SEL = '.dd-def, .dd-body, .dd-basis, .stem, .qstem, .lead, .kp-def, .rel-cur, .ans-body';
      var out = [];
      [].slice.call(document.querySelectorAll(SEL)).forEach(function(el){
        var fs2 = parseFloat(getComputedStyle(el).fontSize);
        var t = (el.innerText || '').replace(/\s+/g, ' ').trim();
        if (t.length < 10 || fs2 >= 14) return;
        out.push(fs2 + 'px ' + (el.className || el.tagName).split(' ')[0] + ' «' + t.slice(0, 18) + '»');
      });
      return out.slice(0, 5);
    })(),
    /* 窄屏的下拉必须各自占满一行：并排时各约 200px，「第 12 章 二次根式」会被
       截成「第 1…」。这一条量的是「有没有被挤成两列」，比量选项文字稳
       （章节下拉的选项要等选了册才填，量文字会漏）。 */
    selNarrow: (function(){
      if (window.innerWidth > 640) return [];
      var bar = document.querySelector('.mapbar-2') || document.querySelector('.mapbar');
      if (!bar) return [];
      var pw = bar.getBoundingClientRect().width;
      return [].slice.call(document.querySelectorAll('.mselect')).map(function(s){
        return { id: s.id, w: Math.round(s.getBoundingClientRect().width), pw: Math.round(pw) };
      }).filter(function(x){ return x.w < x.pw * 0.85; });
    })(),
    /* 带热区的文字链必须看得出是链接：为了 40px 热区把「展开这一册」染成正文灰，
       看起来就像一行说明文字，没人会点。判据是「和 --ink-soft 的实际颜色太接近」，
       不靠肉眼判灰——--ink-soft 本身是蓝灰 (67,85,106)，按 RGB 差判灰会漏。 */
    deadLinks: (function(){
      var probe = document.createElement('span');
      probe.style.color = 'var(--ink-soft)';
      probe.style.display = 'none';
      document.body.appendChild(probe);
      var soft = (getComputedStyle(probe).color.match(/\d+/g) || []).map(Number);
      probe.remove();
      var out = [];
      [].slice.call(document.querySelectorAll('.more-line a, .wk-links a')).forEach(function(a){
        var m = (getComputedStyle(a).color.match(/\d+/g) || []).map(Number);
        if (m.length < 3 || soft.length < 3) return;
        var d2 = Math.abs(m[0] - soft[0]) + Math.abs(m[1] - soft[1]) + Math.abs(m[2] - soft[2]);
        if (d2 < 40) out.push(a.textContent.trim() + ' ' + getComputedStyle(a).color);
      });
      return out.slice(0, 4);
    })(),
    ovlN: ovl.length, ovl: ovl.slice(0, 4), tapN: tapN, tapSmallN: tapSmall.length, tapSmall: tapSmall.slice(0, 6),
    tapTinyN: tapTiny.length, tapTiny: tapTiny.slice(0, 6),
    stemLeft: document.querySelectorAll('[data-stem]').length,
    hintClaim: (document.body.innerText.indexOf('\u5e26\u63d0\u793a') >= 0),
    /* 右侧留白：宽屏下所有页面的正文列都是居中收口的，只有图谱页那块区域
       原来直接顶到视口右边缘（1280 下最右文字距边只剩 18px，而别的页是 110+），
       看上去整块内容被推到了屏幕右侧。这一条量「最右可见文字离右边还有多少」。 */
    /* 单选控件不能出现两个实心选中态：图谱页「导图」与「网络」并排，
       两个都加了 .on 绿底，孩子会以为同时选了两个。这里量「同一个 .seg 里实心选中几个」。 */
    segMulti: (function(){
      var worst = 0, who = '';
      Array.prototype.forEach.call(document.querySelectorAll('.seg'), function(seg){
        var n = 0, names = [];
        Array.prototype.forEach.call(seg.querySelectorAll('button.on'), function(b){
          var bg = getComputedStyle(b).backgroundColor || '';
          if (!bg || bg === 'transparent' || bg === 'rgba(0, 0, 0, 0)') return;
          n++; names.push((b.textContent || '').trim().slice(0, 8));
        });
        if (n > worst) { worst = n; who = names.join(' / '); }
      });
      return worst > 1 ? { n: worst, who: who } : null;
    })(),
    edgeR: (function(){
      var maxRight = 0, wk = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, null), n;
      while ((n = wk.nextNode())) {
        if (!n.nodeValue || !n.nodeValue.trim()) continue;
        var pe = n.parentElement;
        if (!pe || /^(SCRIPT|STYLE|NOSCRIPT)$/.test(pe.tagName)) continue;
        var rng = document.createRange(); rng.selectNodeContents(n);
        var rs = rng.getClientRects();
        for (var i = 0; i < rs.length; i++) if (rs[i].width > 0 && rs[i].right > maxRight) maxRight = rs[i].right;
      }
      return Math.round(window.innerWidth - maxRight);
    })(),
    /* 「元素在、有字、没 hidden」不等于它看得见：高 0 的容器会把内容全裁掉。
       2026-11-03 找「点名」列表时被这个假象绕过一次（#map-cross 里只有一行标题、高 0）。 */
    ghost: (function(){
      var ids = ['map-cross', 'map-side'], out = [];
      ids.forEach(function(id){
        var el = document.getElementById(id);
        if (!el || el.hidden) return;
        var r = el.getBoundingClientRect();
        if (r.height < 8 || r.width < 8) out.push(id + '(' + Math.round(r.width) + 'x' + Math.round(r.height) + ')');
      });
      return out.length ? out.join(',') : null;
    })(),
    /* 档案页那块统计：自动判 / 判不了 / 空着交 三档必须加起来等于总作答。
       2026-10-31 实测漏过一档 —— 「自动判 6 + 判不了 1 + 另有 2 道空着交」
       比总作答 8 还多，因为 letter-blank（空着交的选择题）被 /^letter/ 当成了自动判。 */
    statSum: (function(){
      var sg = document.querySelector('.statgrid');
      if (!sg || !sg.dataset || sg.dataset.total == null) return null;
      /* today 页脚那行也是同一类账：全部记录 / 做对 / 没做对 / 白卷 / 判不了 */
      return { total: +sg.dataset.total, auto: +sg.dataset.auto,
        manual: +sg.dataset.manual, blank: +sg.dataset.blank };
    })(),
    statRow: (function(){
      var el = document.querySelector('[data-stat]');
      if (!el || !el.dataset) return null;
      return { total: +el.dataset.total, c: +el.dataset.c, w: +el.dataset.w,
        b: +el.dataset.b, m: +el.dataset.m };
    })(),
    /* 同一份讲解不许同时开两个壳。图谱页有两条渲染路径：右栏短卡（#map-detail）
       和整幅阅读壳（#read-sheet）。2026-11-02 的 ?node=…&read=1 两个一起开，
       同一道题在屏幕上出现两块版式不同的讲解，窄屏还互相压住。 */
    shell: (function(){
      var seen = [];
      ['map-detail', 'read-sheet'].forEach(function (id) {
        var el = document.getElementById(id);
        if (!el || el.hidden) return;
        var cs = window.getComputedStyle(el);
        if (cs.display === 'none' || cs.visibility === 'hidden') return;
        if (!el.querySelector('.map-detail-card') && !el.querySelector('.read-body')) return;
        seen.push(id);
      });
      return seen.length > 1 ? seen : null;
    })(),
    /* 焦点态还剩几根线：用户原话「就一个中心到外边的线，其他点的连接线不用显示」。
       量的是渲染后的 opacity，不是类名 —— 类挂对了也可能被后定义的样式盖掉。 */
    edgeVis: (function(){
      try {
        if (!window.MC || !MC.mapCy) return null;
        /* 没有焦点时线本来就该退成底纹（这是设计的一部分），不算缺陷；
           只有「点开了一个点」才要求别的线不画。 */
        var st = (MC.mapView && MC.mapView.state) || {};
        if (!st.focus) return null;
        var cy = MC.mapCy();
        if (!cy || !cy.edges().length) return null;
        var tot = 0, vis = 0, el = cy.getElementById(st.focus);
        cy.edges().forEach(function (e) {
          tot++;
          if (+e.style('opacity') > 0.05) vis++;
        });
        /* 该画的只有「焦点自己连出去的那几根」，根数就是它的度。拿度当上限，
           比写死一个数字稳：骨架档整图 13 根边、整册档 3698 根边都适用。 */
        var deg = (el && el.length) ? el.connectedEdges().length : 0;
        return { tot: tot, vis: vis, deg: deg };
      } catch (e) { return null; }
    })(),
    /* 「返回刚才的页」必须逐字符回到出发那一屏。早先按 state 重拼地址，
       read=1 丢了、view=kp 凭空多出，回去落到另一屏。 */
    fromOk: (function(){
      var a = document.querySelector('#read-sheet .dd-q, #map-detail .dd-q');
      if (!a) return null;
      var href = a.getAttribute('href') || '';
      var m = /[?&]from=([^&]*)/.exec(href);
      if (!m) return { ok: false, why: '链接里没有 from' };
      var from = decodeURIComponent(m[1]);
      return { ok: from === window.location.hash, from: from, cur: window.location.hash };
    })(),
    /* 死胡同：页面在说「找不到/看不懂/没加载上」时，必须同时给一条能走的路。
       2026-10-27 的 #/kp/<认不出的编号> 整屏只有一句错误，读者除了改地址栏没别的动作。 */
    /* 判「这一屏是不是一句空话」不看措辞（措辞会改），看结构：主区里有 .empty 且整屏没多少字。
       改前先按「没找到/看不懂」这类词判，结果 kp-bad 的文案是「不像我们的格式」，
       一条都没命中 —— 判据自己没跑，还以为过了。 */
    emptyish: (function(){ var m = document.querySelector('main') || document.body;
      var t = (m.innerText || '').replace(/\s+/g, '');
      return !!m.querySelector('.empty') && t.length < 240; })(),
    escapes: (document.querySelector('main') || document.body).querySelectorAll('a[href^="#/"]').length,
    /* 渲染事故的两条通用抓手：
       ① 对象拼进字符串会在屏幕上印成 [object Object]（2026-11-02 选项就这么印出来的）；
       ② 拼 href 时变量为空会印成 #/practice/undefined/…，点下去是一片空白。 */
    objLit: (function(){
      var t = ((document.querySelector('main') || document.body).innerText || '');
      var m = t.match(/\[object [A-Za-z]+\]/g);
      return m ? { n: m.length, what: m[0] } : null;
    })(),
    hrefBad: (function(){
      var bad = [];
      Array.prototype.forEach.call(document.querySelectorAll('main a[href]'), function (a) {
        var h = a.getAttribute('href') || '';
        if (/undefined|null|NaN/.test(h)) bad.push(h.slice(0, 60));
      });
      return bad;
    })(),
    /* 预览态的选项要真的画出来：容器在、里面 0 个选项，等于没有 */
    look: (function(){
      /* 只看容器存不存在会被「整块没画」骗过：容器没了，opt 计数就是 0 个，
         而 0 与「不是选择题」分不开。所以让预览页自己报 data-form。 */
      var card = document.querySelector('.card[data-form]');
      if (!card) return null;
      return { is: card.getAttribute('data-form') === 'choice', n: card.querySelectorAll('.opt').length };
    })(),
    /* 数字卡不是内容，是索引：它占掉首屏一半，孩子第一眼看到的全是数字。
       2026-10-31 ux4 实测 weak 页 .wk-stats top 226 h 337，第一条真实内容到 577px。 */
    /* 视口高度：判『首屏被吃掉多少』必须有个屏幕当分母（flow 里那套 vh 只在交互段落里有） */
    vh: vh,
    wkStatH: (function(){ var e = document.querySelector('.wk-stats'); return e ? Math.round(e.getBoundingClientRect().height) : 0; })(),
    /* 一屏全是「没做过」等于没有信息：数一数按节列表里空行的占比 */
    kvRows: (function(){
      var a = document.querySelectorAll('.kv'); if (!a.length) return null;
      var none = 0;
      Array.prototype.forEach.call(a, function(x){ if ((x.innerText || '').indexOf('没做过') >= 0) none++; });
      return { n: a.length, none: none };
    })(),
    docW: de.scrollWidth, clientW: de.clientWidth, overflowPx: de.scrollWidth - de.clientWidth, over: over.slice(0, 4)
  };
})())`;

/* 造一份「真的做过题」的记录：题号从 items 片现取，hint 一律 'none'（故意的——
   只要界面出现「带提示」就说明渲染在说谎）。 */
const SEED_EXPR = "(async function(){\n  var got = await MC.data.loadItems(\"801\",\"11.1\");\n  var list = ((got && got.items) || []).slice(0, 12);\n  if (!list.length) return \"no-items\";\n  var D = 86400000, now = Date.now(), recs = [];\n  list.forEach(function(it, i){\n    var dayAgo = i < 4 ? 0 : (i < 8 ? 4 : 6);\n    var fin = (i % 5 === 3) ? \"wrong\" : \"correct\";\n    var how = \"exact\";\n    if (i === 9) { fin = \"blank\"; how = \"skip\"; }\n    if (i === 10) { fin = \"blank\"; how = \"letter-blank\"; }\n    if (i === 11) { fin = \"manual\"; how = \"unknown\"; }\n    recs.push({ schema_version: 1, uid: \"ux-\" + it.id + \"-\" + i, item: it.id, sec: \"11.1\",\n      band: it.band, ts: now - dayAgo * D - i * 60000, verdict: fin, final: fin,\n      how: how, hint: \"none\", seconds: 30, volume: \"801\", chapter: \"11\" });\n  });\n  localStorage.setItem(\"mc.settings.v1\", JSON.stringify({ current: \"11.1\", picked: true }));\n  localStorage.setItem(\"mc.records.v1\", JSON.stringify(recs));\n  return \"seeded:\" + recs.length;\n})()";

/* 有记录态的最小数据集：错的、对的、跳过的、交白卷的、判不了的各来一点。
   档案页的「自动判 / 判不了 / 空着交」三档只有在这种数据下才会同时出现 ——
   2026-10-31 那条 STAT 判据第一版写成「拿 .statgrid 比和」，可是 archive 路由
   默认是空库、.statgrid 根本不渲染，判据永远不会触发。判据必须真的被执行过。 */
const SEED_RICH = "(function(){var D=86400000,now=Date.now();function r(it,d,f,h){return {schema_version:1,uid:'ux-'+it+'-'+d,item:it,sec:'11.1',band:'basic',ts:now-d*D,verdict:(f==='correct'?'correct':(f==='manual'?'manual':'wrong')),final:f,how:h||'exact',hint:'none',seconds:30,volume:'801',chapter:'11'};}" +
  "var recs=[r('11.1_bas_01',3,'wrong'),r('11.1_bas_02',2,'wrong'),r('11.1_bas_03',1,'correct')," +
  "r('11.1_bas_04',2,'blank','skip'),r('11.1_int_02',2,'blank','letter-blank')," +
  "r('11.1_int_03',1,'manual','manual'),r('11.1_int_04',1,'correct'),r('11.1_int_05',3,'wrong')];" +
  "localStorage.setItem('mc.settings.v1',JSON.stringify({current:'11.1',picked:true}));" +
  "localStorage.setItem('mc.records.v1',JSON.stringify(recs));return 'seeded:'+recs.length;})()";
/* 统计口径要靠真数据才量得到，所以这三屏先造记录 */
const SEED_ROUTES = { archive: 1, weak: 1, retry: 1 };

function judge(name, d, wide) {
  const f = [];
  if (!d || d.err) return ['NAV  ' + name + ' 取不到度量：' + (d && d.err)];
  /* 资源没到就别比像素了：先保证「页面是完整的」。katex.min.css 有 400+ 条规则，
     一条都没读到说明样式表根本没加载（多半是从 runtime/web 起的服务）。 */
  if (!(d.katexCss >= 100)) f.push('ASSET ' + name + ' KaTeX 样式表没加载（cssRules=' + d.katexCss + '）：assets 路径 404，公式会退成裸 TeX');
  if (name.indexOf('map') === 0 && !d.cyLib) f.push('ASSET ' + name + ' cytoscape 没加载（window.cytoscape 不存在）：图谱页只会显示「加载失败」');
  if (d.overflowPx > MAX_OVERFLOW_PX) f.push('OVF  ' + name + ' 横向溢出 ' + d.overflowPx + 'px（doc ' + d.docW + ' > client ' + d.clientW + '）' + (d.over.length ? ' 最内层：' + d.over.join(' | ') : ''));
  if (d.over.length) f.push('OVF  ' + name + ' 有 ' + d.over.length + ' 个元素自身溢出：' + d.over.join(' | '));
  if (d.selClip && d.selClip.length) f.push('SEL  ' + name + ' 下拉选中项被截断：' + d.selClip.map(function(x){ return '#' + x.id + ' 宽' + x.w + 'px < 需' + x.need + 'px «' + x.text + '»'; }).join(' | '));
  /* 图谱屏豁免整屏字号档：一屏字几乎全是图例键与画布旁的名字，本来就是 --fs-xs 标签档，
     分母只有三四百字，随便加一行说明就把占比推到三成以上 —— 量出来的不是「正文被压小」。
     正文另由 FS（<13px）与 SMALL 两条守着。 */
  if (d.xsShare > MAX_XS_SHARE && d.chars >= XS_MIN_CHARS && name.indexOf('map') !== 0) f.push('FSXS ' + name + ' 全屏有 ' + (d.xsShare * 100).toFixed(1) + '% 的字是 13px 及以下（' + d.xsChars + '/' + d.chars + '），上限 ' + (MAX_XS_SHARE * 100) + '%：正文被压成了标签档 例：' + d.xsTop.join(' | '));
  if (d.bodySmall && d.bodySmall.length) f.push('FS   ' + name + ' 正文被压到 13px 以下：' + d.bodySmall.join(' | ') + '（正文最小 14px，13px 只留给标签）');
  if (d.selNarrow && d.selNarrow.length) f.push('SEL  ' + name + ' 窄屏下拉被挤成并排：' + d.selNarrow.map(function(x){ return '#' + x.id + ' 宽' + x.w + 'px / 行宽' + x.pw + 'px'; }).join(' | ') + '——选中项会被截断，看不出选的是哪一章');
  if (d.deadLinks && d.deadLinks.length) f.push('LINK ' + name + ' 带热区的链接看起来像普通文字：' + d.deadLinks.join(' | '));
  if (d.statRow) {
    const r0 = d.statRow, s2 = r0.c + r0.w + r0.b + r0.m;
    if (s2 !== r0.total) f.push('STAT ' + name + ' 今日页脚加不起来：做对 ' + r0.c + ' + 没做对 ' + r0.w +
      ' + 白卷 ' + r0.b + ' + 判不了 ' + r0.m + ' = ' + s2 + '，但一共 ' + r0.total + ' 条记录');
  }
  if (d.statSum) {
    const s = d.statSum, sum = s.auto + s.manual + s.blank;
    if (sum !== s.total) f.push('STAT ' + name + ' 统计对不上：自动判 ' + s.auto + ' + 判不了 ' + s.manual +
      ' + 空着交 ' + s.blank + ' = ' + sum + '，但总作答是 ' + s.total + '——读者会以为记录丢了');
  }
  if (d.shell) f.push('SHELL ' + name + ' 同一份讲解开了两个壳（' + d.shell.join(' + ') +
    '）：屏幕上同时出现两块版式不同的讲解，窄屏还会互相压住，读者不知道看哪块');
  if (d.fromOk && !d.fromOk.ok) f.push('FROM ' + name + ' 「返回刚才的页」回不到出发那一屏：from=' +
    d.fromOk.from + '，现在是 ' + d.fromOk.cur + (d.fromOk.why ? '（' + d.fromOk.why + '）' : '') +
    '——走一圈回来落在别的屏，读者以为图坏了');
  if (d.objLit) f.push('OBJ  ' + name + ' 屏幕上印着 ' + d.objLit.what + '（' + d.objLit.n + ' 处）：对象没取字段就拼进了字符串');
  if (d.hrefBad && d.hrefBad.length) f.push('HREF ' + name + ' 链接地址里带 undefined/null：' + d.hrefBad.join(' | ') + '——点进去是一片空白，还没有报错');
  if (d.look && d.look.is && d.look.n < 3) f.push('LOOK ' + name + ' 这是选择题，预览态却只画出 ' + d.look.n + ' 个选项：读者只能从解析里反推答案，没法自己先想');
  if (d.segMulti) f.push('SEG  ' + name + ' 同一排控件里有 ' + d.segMulti.n + ' 个实心选中（' +
    d.segMulti.who + '）：单选控件同时亮两个，读者会以为两个都选上了');
  if (d.ghost) f.push('GHOST ' + name + ' 「' + d.ghost + '」没隐藏但高度是 0：里面的内容一条也看不见，读者会以为没做出来');
  if (wide) {
    if (d.emptyish && !d.escapes) f.push('DEADEND ' + name + ' 这一屏在说「找不到」，却一条能走的路都没有：读者只能改地址栏');
    if (d.edgeR != null && d.edgeR < 32) f.push('EDGE ' + name + ' 内容贴到视口右边缘（只剩 ' + d.edgeR + 'px）：左栏 236px 拿掉之后正文列是居中的，这里却一路顶到屏幕右边');

    /* 桌面这一遍只判「点得着」的底线：40px 是手指的尺子，桌面用鼠标。
       但小于 24px 高的按钮鼠标也难点中，所以留一条 24×16 的底线，不再用 40px 逼桌面。 */
    if (d.tapTinyN) f.push('TAP  ' + name + ' 桌面可点元素小于 24×16：' + (d.tapTiny || []).join(' | '));
    return f;
  }
  if (d.smallShare > MAX_SMALL_SHARE) f.push('SMALL ' + name + ' 小于 ' + SMALL_PX + 'px 的字符占 ' + (d.smallShare * 100).toFixed(1) + '%（' + d.small + '/' + d.chars + '）' + (d.worst.length ? ' 例：' + d.worst.join(' | ') : ''));
  /* 字符量太小的一屏（空态页只有几十个字）算比例没有意义：43 个字里 14 个字是 13px 就成了「三档」。
     400 字大约是三行正文，低于它的屏只报其他判据。 */
  if (d.fsMain && d.chars >= 400 && d.fsMain.length > FS_TIER_MAX) f.push('FS   ' + name + ' 一屏里有 ' + d.fsMain.length + ' 个字号档各占超 20%：' + d.fsMain.join('/') + 'px（' + (d.fsTiers || []).join(' ') + '）——没有主次');
  if (d.fsMain && d.chars >= 400 && d.fsMain.length === 2 && (d.fsMain[1] - d.fsMain[0]) < FS_TIER_GAP) f.push('FS   ' + name + ' 两个主力字号只差 ' + (d.fsMain[1] - d.fsMain[0]) + 'px（' + d.fsMain.join('/') + '），在屏幕上是一档');
  if (d.radN > SHAPE_MAX) f.push('SHAPE ' + name + ' 圆角有 ' + d.radN + ' 档：' + (d.radSet || []).join('/') + '（应 ≤' + SHAPE_MAX + '）');
  if (d.headLt && d.headLt.length) f.push('HEAD ' + name + ' 段标题比它管辖的正文还小：' + d.headLt.join(' | ') + '（层级靠字重与色条，不靠把标题压小）');
  if (name === 'today' && d.elevN > 1) f.push('ELEV ' + name + ' 有 ' + d.elevN + ' 个块同时浮起来：' + (d.elevList || []).join(' | ') + '——阴影是海拔，浮起来超过一个就看不出哪个是主角');
  if (d.lhN > SHAPE_MAX) f.push('SHAPE ' + name + ' 行高比有 ' + d.lhN + ' 档：' + (d.lhSet || []).join('/') + '（应 ≤' + SHAPE_MAX + '）');
  if (d.ovlN) f.push('OVL  ' + name + ' 浮层互相压住 ' + d.ovlN + ' 处：' + (d.ovl || []).join(' | '));
  /* 代号故意与上面那条 EDGES 分开：EDGES 用 0.25 当门槛判「底纹有没有亮成毛絮」，
     而焦点态要判的是 0.12 这种「淡但还看得见」的线，门槛必须放到 0.05。 */
  if (d.edgeVis && d.edgeVis.vis > Math.max(d.edgeVis.deg + 1, 6)) f.push('FOCUS ' + name +
    ' 焦点态画着 ' + d.edgeVis.vis + ' 根线，而中心那一圈只有 ' + d.edgeVis.deg +
    ' 根（整图 ' + d.edgeVis.tot + '）：点开一个点要能一眼看出它连到谁，别的线留着就是一张网');
  if (d.chips && d.chips.n >= 4) {
    if (d.chips.ovl) f.push('CHIP ' + name + ' 图谱标签有 ' + d.chips.ovl + ' 对叠在一起：读者看不清哪个标签属于哪个点');
    if (d.chips.maxLine > 220) f.push('CHIP ' + name + ' 图谱标签离自己的点最远 ' + d.chips.maxLine + 'px（引线像长尾巴）：标签应当贴着点，不能甩到画布另一边');
  }
  if (d.legendOvl) f.push('LEGEND ' + name + ' 图例压在画布上 ' + d.legendOvl + 'px²——底部那一圈节点被挡住，读者看不到');
  /* 画布不许超出视口：超出的那几十像素里就是最底下一排节点，而页面上没有任何提示。 */
  if (d.mapFit && d.mapFit.over > 8) f.push('FIT  ' + name + ' 图谱画布超出手机视口 ' + d.mapFit.over + 'px（画布 ' +
    d.mapFit.h + 'px，顶边 ' + d.mapFit.top + '，上限 ' + d.mapFit.cap + '）：最底下一排节点被切在屏幕外');
  /* 图的默认态只能有点：线要么关掉要么退到背景里（opacity ≤ 0.25）；点开一个点之后
     才该亮起几条、并且至少两种颜色（关系类型不同）。两头都量，因为「全亮」和
     「全灭」是两种相反的错，只量一边会放过另一边。 */
  /* total > 40 只用来挡「图里本来就没几条线」的情形，不能拿它当整段的门：
     map?node=… 的焦点态只有 13 条边，第一版写成 `total > 40` 就把整段跳过了，
     于是「点开了点亮 0 条」这条分支怎么改都不会红（本轮踩到）。 */
  if (d.edges) {
    if (!d.edges.focused && d.edges.total > 40 && d.edges.lit > 0) {
      f.push('EDGES ' + name + ' 默认态就有 ' + d.edges.lit + '/' + d.edges.total + ' 条线亮着（opacity > 0.25）：' +
        '没点开任何点时线应该退到背景里，否则整屏是毛絮');
    }
    if (d.edges.focused && d.edges.lit === 0) {
      f.push('EDGES ' + name + ' 点开了一个点，' + d.edges.total + ' 条线一条都没亮：应该只亮与它相关的几条');
    }
    if (d.edges.focused && d.edges.lit > 60) {
      f.push('EDGES ' + name + ' 点开一个点亮了 ' + d.edges.lit + ' 条线：先修/方法/归属全亮，等于没突出');
    }
  }
  if (d.tapSmallN) f.push('TAP  ' + name + ' 有 ' + d.tapSmallN + '/' + d.tapN + ' 个可点元素太小（按钮类 <' + TAP_MIN + 'px、文字链 <' + TAP_MIN_INLINE + 'px）：' + (d.tapSmall || []).join(' | '));
  /* 「首屏」按一部真手机算（932px），不按 innerHeight：跑这套断言时窗口常被拉到 1400px，
     拿 1400 当分母等于给数字卡更大的额度。weak 页 337px 在手机上吃掉 36% 的首屏。 */
  if (name === 'weak' && d.wkStatH && d.wkStatH > Math.min(d.vh || 932, 932) * 0.3) {
    var sh = Math.min(d.vh || 932, 932);
    f.push('WSTAT ' + name + ' 顶上那排数字卡占了 ' + Math.round(d.wkStatH / sh * 100) + '% 的首屏（' + d.wkStatH + 'px / 手机 ' +
      sh + 'px）：数字是索引，不是内容，首屏该留给第一个要做的事');
  }
  if (d.kvRows && d.kvRows.n >= 8 && d.kvRows.none / d.kvRows.n > 0.5) f.push('KVROWS ' + name + ' 按节列表 ' + d.kvRows.n +
    ' 行里有 ' + d.kvRows.none + ' 行写着「没做过」：一屏全是没有的信息，真做过的几行被埋掉');
  if (d.enumN) f.push('ENUM ' + name + ' 裸英文枚举 ' + d.enumN + ' 处：' + JSON.stringify(d.enumCount) +
    (d.enumSample && d.enumSample.length ? '\n         现场：' + d.enumSample.map(function (x) { return '[' + x.w + '] ' + x.chain + ' «' + x.ctx + '»'; }).join('\n               ') : ''));
  if (d.katexSplitN) f.push('KXSPLIT ' + name + ' 行内公式被折行 ' + d.katexSplitN + ' 处：' + d.katexSplit.join(' | '));
  /* today 的首屏交给 runPass 里的两态判据（ASK 提问卡 / CTA 开始练）：
     首次态有意不给主按钮（先回答问题），用同一条 PRIM 判它只会自相矛盾。 */
  if (name === 'practice-801-11.1') {
    if (!d.primary.length) f.push('PRIM ' + name + ' 首屏没有可见的主按钮');
  }
  if (name === 'rel-802-16.2-03' && d.relCols !== null && d.relCols > 1) f.push('COLS ' + name + ' 窄屏下 .rel-grid 是 ' + d.relCols + ' 列');
  return f;
}

/* 词表注入光标：MEASURE 是 String.raw 常量，'${}' 不会被求值，所以用占位符替换。 */
const measureSrc = MEASURE.replace('__ENUM_KEYS__', JSON.stringify(ENUM_KEYS)).replace('__TAP_MIN__', String(TAP_MIN)).replace('__TAP_MIN_INLINE__', String(TAP_MIN_INLINE));

/* ---------- 第 9 类：交互路径（不是量像素，是走一遍真操作） ----------
   2026-10-30 撞出来的四条都不是「不好看」，而是「点了没用 / 说了假话」：
   判完题没有下一题、跳过双击跳两题且不留痕、同一题越点记录越多、错题重练按钮是死的。
   它们只在真正点下去的时候才现形，测像素永远测不到。 ---------- */
async function checkFlow(ws, W, H) {
  const fails = [];
  const ev = async (expr, t) => {
    const r = await rpc(ws, 'Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true }, t || 20000);
    if (r && r.exceptionDetails) return { __err: String(r.exceptionDetails.text || '') };
    return r && r.result ? r.result.value : null;
  };
  const nav = async (hash) => {
    await rpc(ws, 'Page.navigate', { url: 'http://127.0.0.1:' + HTTP_PORT + '/runtime/web/index.html' }, 30000);
    await sleep(900);
    await ev("location.hash='" + hash + "'");
    await sleep(1600);
  };
  await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: true });
  try {
    await nav('#/today');
    await ev('localStorage.clear(); 1');
    await nav('#/practice/801/11.1');
    /* ① 跳过：双击只前进一步，而且必须留一条记录（不写记录 = 这题在 retry/weak 里彻底消失） */
    const dbl = await ev('(async function(){' +
      'var b=document.querySelector(\'[data-act="next"]\'); if(!b) return {err:"no-skip"};' +
      'b.click(); await new Promise(function(r){setTimeout(r,120)});' +
      'var b2=document.querySelector(\'[data-act="next"]\'); if(b2) b2.click();' +
      'await new Promise(function(r){setTimeout(r,500)});' +
      'var h=document.body.innerText.match(/第\\s*(\\d+)\\s*\\/\\s*(\\d+)\\s*题/);' +
      'return {step:h?Number(h[1]):null, recs:JSON.parse(localStorage["mc.records.v1"]||"[]").length};' +
      '})()');
    if (!dbl || dbl.err) fails.push('FLOW 练习页找不到「跳过」按钮（' + (dbl && dbl.err) + '）');
    else {
      if (dbl.step !== 2) fails.push('FLOW 连点两下「跳过」从第 1 题走到第 ' + dbl.step + ' 题（应该只走一步到第 2 题）');
      if (!dbl.recs) fails.push('FLOW 跳过没有留下任何记录：这题在错题重练/哪里不稳/档案里彻底消失');
    }
    /* ② 判完题：主行动必须是「下一题」，而不是还摆着「交卷」 */
    const judged = await ev('(async function(){' +
      'var o=document.querySelector(\'[data-opt]\'); if(o) o.click();' +
      'await new Promise(function(r){setTimeout(r,180)});' +
      'var s=document.querySelector(\'[data-act="submit"]\'); if(s) s.click();' +
      'await new Promise(function(r){setTimeout(r,450)});' +
      /* 2026-10-31 起「下一题」从工具栏挪到结果卡之后（原来在卡上方，错因永远读不到）；
         一屏仍然只能有一个主按钮。这里连位置一起判，别让布局回退。 */
      'var pr=document.querySelector(".btn-primary");' +
      'var res=document.querySelector(".result"), four=document.querySelector(".four");' +
      'return {act:pr?pr.getAttribute("data-act"):null, txt:pr?pr.innerText.trim():"",' +
      '        primN:document.querySelectorAll(".btn-primary").length,' +
      '        below:(pr&&res)?Math.round(pr.getBoundingClientRect().top-res.getBoundingClientRect().top):null,' +
      '        fourH:four?Math.round(four.getBoundingClientRect().height):0,' +
      '        details:document.querySelectorAll(".four details").length,' +
      '        primTop:pr?Math.round(pr.getBoundingClientRect().top):null,' +
      '        saTop:(function(){var b=document.querySelector(\'[data-act="show-answer"]\');return b?Math.round(b.getBoundingClientRect().top):null;})(),' +
      '        vh:window.innerHeight,' +
      '        hasSubmit:!!document.querySelector(\'[data-act="submit"]\'),' +
      '        recs:JSON.parse(localStorage["mc.records.v1"]||"[]").length};' +
      '})()');
    if (!judged || judged.__err) fails.push('FLOW 交卷这一步测不了：' + (judged && judged.__err));
    else {
      if (judged.act !== 'next') fails.push('FLOW 判完之后主按钮是「' + (judged.txt || '无') + '」（data-act=' + judged.act + '），找不到往前走的路');
      if (judged.hasSubmit) fails.push('FLOW 判完之后页面上还摆着「交卷」');
      if (judged.primN !== 1) fails.push('FLOW 判完之后屏上有 ' + judged.primN + ' 个主按钮（只该有一个）');
      /* 2026-10-31 改判：主行动在结果卡上方不再是错，错在「够不着」。
         结果卡本身 588px 高，把「下一题」摆在卡尾就是把它推到 1515px（视口 932），
         首屏唯一能点的按钮变成「提示」——那才是真正的断流。现在动作条紧跟选项、卡在前面，
         所以改判「主按钮必须落在第一屏内」，并额外要求「看答案」也在第一屏。 */
      if (judged.primTop != null && judged.primTop >= judged.vh) fails.push('FLOW 判完之后主按钮在 ' + judged.primTop +
        'px，视口只有 ' + judged.vh + 'px：首屏点不到往前走的路');
      if (judged.saTop != null && judged.saTop >= judged.vh) fails.push('FLOW 判完之后「看答案」在 ' + judged.saTop +
        'px，视口只有 ' + judged.vh + 'px：想对答案得先滚一屏');
      if (judged.fourH > 520) fails.push('FLOW 判完之后错因卡高 ' + judged.fourH + 'px（>520）：长解释没折起来，一屏读不完等于没写');
      if (judged.details < 1) fails.push('FLOW 错因卡里没有「看完整诊断」的折叠块');
    }
    /* ③ 同一道题不许越点记录越多（点「看答案」原来会多写一条） */
    const infl = await ev('(async function(){' +
      'var n1=JSON.parse(localStorage["mc.records.v1"]||"[]").length;' +
      'var sa=document.querySelector(\'[data-act="show-answer"]\'); if(!sa) return {err:"no-show-answer",n1:n1};' +
      'sa.click(); await new Promise(function(r){setTimeout(r,450)});' +
      'var n2=JSON.parse(localStorage["mc.records.v1"]||"[]").length;' +
      'return {n1:n1,n2:n2};' +
      '})()');
    if (infl && !infl.err && infl.n2 > infl.n1) fails.push('FLOW 点一次「看答案」记录从 ' + infl.n1 + ' 条涨到 ' + infl.n2 + ' 条（同一道题被写成多条）');
    /* ④ 错题重练按钮必须真的能开始 */
    const retry = await ev('(async function(){' +
      'var R=JSON.parse(localStorage["mc.records.v1"]||"[]"); if(!R.length) return {err:"no-recs"};' +
      'R.forEach(function(r){r.final="wrong"; r.verdict="wrong";});' +
      'localStorage["mc.records.v1"]=JSON.stringify(R);' +
      'location.hash="#/retry"; await new Promise(function(r){setTimeout(r,1500)});' +
      'var b=document.querySelector(\'[data-act="start"]\'); if(!b) return {err:"no-start"};' +
      'b.click(); await new Promise(function(r){setTimeout(r,2400)});' +
      'var h=document.body.innerText.match(/第\\s*\\d+\\s*\\/\\s*\\d+\\s*题/);' +
      'return {head:h?h[0]:"", hasOpt:!!document.querySelector(\'[data-opt],[data-act="submit"]\')};' +
      '})()');
    if (!retry || retry.err) fails.push('FLOW 错题重练点了没有反应（' + (retry && retry.err) + '）');
    else if (!retry.head) fails.push('FLOW 错题重练点了「一次做完」之后没有进入题目（页面还是原样）');

    /* ⑤ 进了题还得能点：错题重练这条路上事件委托曾经没挂上（bind() 只被 render 调），
       选项点了不变色、交卷没反应，孩子以为手机卡了。只测「进得去」不够。 */
    if (retry && !retry.err && retry.head) {
      const dead = await ev('(async function(){' +
        'var o=document.querySelector(\'[data-opt]\'); if(!o) return {err:"no-opt"};' +
        'o.click(); await new Promise(function(r){setTimeout(r,200)});' +
        'var sel=!!document.querySelector(\'[data-opt].opt-sel, [data-opt].on, [data-opt][aria-selected=true]\');' +
        'var n1=JSON.parse(localStorage["mc.records.v1"]||"[]").length;' +
        'var s2=document.querySelector(\'[data-act="submit"]\'); if(s2) s2.click();' +
        'await new Promise(function(r){setTimeout(r,700)});' +
        'var n2=JSON.parse(localStorage["mc.records.v1"]||"[]").length;' +
        'return {sel:sel, n1:n1, n2:n2, judged:!!document.querySelector(\'[data-act="next"]\')};' +
        '})()');
      if (!dead || dead.err) fails.push('FLOW 错题重练进题后找不到选项（' + (dead && dead.err) + '）');
      else {
        if (!dead.sel) fails.push('FLOW 错题重练的题面点了选项没有反应（没有 .opt-sel）—— 这条路上事件委托没挂上');
        if (dead.n2 <= dead.n1) fails.push('FLOW 错题重练交卷后记录没涨（' + dead.n1 + '→' + dead.n2 + '）');
        if (!dead.judged) fails.push('FLOW 错题重练交卷后没有「下一题」：判完就停在这一屏');
      }
    }
  } catch (e) {
    fails.push('FLOW 交互路径测不了：' + String(e && e.message || e).slice(0, 80));
  }
  try { await ev('localStorage.clear(); 1'); } catch (e) {}
  return fails;
}
/* 度量脚本自己抛错时必须说出来：以前 evaluate 抛异常只是让 d 变成 null，
   一路飘到 `d.askTop` 才崩，看起来像「界面坏了」，实际是判据坏了（这一轮踩过一次）。 */
async function measure(ws) {
  const res = await rpc(ws, 'Runtime.evaluate', { expression: measureSrc, returnByValue: true, awaitPromise: true }, 20000);
  if (res && res.exceptionDetails) {
    const ex = res.exceptionDetails;
    const msg = String((ex.exception && (ex.exception.description || ex.exception.value)) || ex.text || '');
    return { err: '度量表达式抛错：' + msg.split('\n')[0].slice(0, 200) };
  }
  if (!res || !res.result || res.result.value === undefined || res.result.value === null) return { err: '度量表达式没有返回值' };
  try { return JSON.parse(res.result.value); } catch (e) { return { err: '度量结果不是 JSON：' + String(e.message).slice(0, 80) }; }
}
async function runPass(ws, label, W, H, only, shotsDir) {
  await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 600 });
  /* 改了前端却不改缓存串，Chrome 会继续跑缓存里的旧脚本：度量数字一模一样，
     看起来像「改了没用」，其实是根本没跑到（本轮踩了七八轮）。判据读的是本机静态文件，关缓存没有副作用。 */
  try {
    await rpc(ws, 'Network.enable', {}, 8000);
    await rpc(ws, 'Network.setCacheDisabled', { cacheDisabled: true }, 8000);
  } catch (e) {}
  const rows = [];
  const fails = [];
  const wide = W >= 1000;
  for (const pair of ROUTES) {
    const name = pair[0]; const hash = pair[1];
    if (only && only.indexOf(name) < 0) continue;
    const url = 'http://127.0.0.1:' + HTTP_PORT + '/runtime/web/index.html' + hash;
    /* 先落地一次、造好记录、再导航到目标：localStorage 是同源的，顺序反过来就白造了 */
    if (SEED_ROUTES[name]) {
      try {
        await rpc(ws, 'Page.navigate', { url: 'http://127.0.0.1:' + HTTP_PORT + '/runtime/web/index.html#/today' }, 30000);
        await sleep(600);
        await rpc(ws, 'Runtime.evaluate', { expression: SEED_RICH, returnByValue: true }, 15000);
      } catch (e) {}
    }
    let navErr = null;
    try { await rpc(ws, 'Page.navigate', { url: url }, 30000); } catch (e) { navErr = String(e.message || e).slice(0, 80); }
    await sleep(Number(process.env.WAIT || 1200));
    /* 深链接只把视角带到那个点：标签要 pick 之后才画（paintCallouts 认 state.zoomed）。
       不点这一下，CHIP 判据永远拿到 null，等于没写。 */
    if (name === 'map-local') {
      try {
        /* 打开页面后图谱初始化是异步的：pick 早一步就静默返回 false，
           标签一个都不画，CHIP 判据拿到 null 还显示 [ok]（本轮真踩过）。
           所以重试到「标签真的画出来」为止，拿不到就在度量里留 navErr。 */
        let pk = null, tries = 0;
        for (; tries < 8; tries++) {
          const r1 = await rpc(ws, 'Runtime.evaluate', { expression: "(function(){try{return MC.mapView.pick('K801-11.1-02')}catch(e){return 'ERR'}})()", returnByValue: true }, 8000);
          pk = r1 && r1.result && r1.result.value;
          await sleep(700);
          const r2 = await rpc(ws, 'Runtime.evaluate', { expression: "document.querySelectorAll('.call-chip').length", returnByValue: true }, 8000);
          if ((r2 && r2.result && r2.result.value) >= 4) break;
        }
        if (tries >= 8) navErr = 'map-local 标签没画出来（pick 重试 8 次）';
        await sleep(600);
        if (process.env.DBG) {
          const dbg = await rpc(ws, 'Runtime.evaluate', { expression: "JSON.stringify({pick:" + JSON.stringify(pk && pk.result && pk.result.value) + ",view:(MC.mapView.state||{}).view,zoomed:!!(MC.mapView.state||{}).zoomed,chips:document.querySelectorAll('.call-chip').length,hid:(document.querySelector('#map-callouts')||{}).hidden})", returnByValue: true }, 8000);
          console.log('  [map-local] ' + (dbg && dbg.result && dbg.result.value));
        }
      } catch (e) { if (process.env.DBG) console.log('  [map-local] pick 抛错 ' + e.message); }
    }
    /* 标签是异步画的：量之前确认「真的画在屏幕上了」，
       否则 CHIP 判据拿到 null 却显示 [ok]（假绿比红更糟）。 */
    if (name === 'map-local') {
      let ok = false;
      for (let g2 = 0; g2 < 12; g2++) {
        const rg = await rpc(ws, 'Runtime.evaluate', { expression: "document.querySelectorAll('.call-chip').length", returnByValue: true }, 8000);
        const rg2 = await rpc(ws, 'Runtime.evaluate', { expression: "(document.querySelector('#map-callouts')||{}).hidden === false", returnByValue: true }, 8000);
        if ((rg && rg.result && rg.result.value) >= 4 && rg2 && rg2.result && rg2.result.value === true) { ok = true; break; }
        await sleep(300);
      }
      if (!ok) navErr = 'map-local 标签没画出来，CHIP 判据这次没量到';
    }
    let d = null;
    try {
      d = await measure(ws);
    } catch (e) { d = { err: String(e).slice(0, 100) }; }
    /* --shots：同一套路由与等待时间出图，省得另写一套会和断言脱节的截图脚本。
       全页截图要把视口撑到 scrollHeight，并把 clip 换成文档坐标（踩过的坑）。 */
    if (shotsDir) {
      try {
        const dim = await rpc(ws, 'Runtime.evaluate', { expression: 'Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)', returnByValue: true }, 8000);
        const fullH = Math.min(Number(dim.result && dim.result.value) || H, 9000);
        await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: W, height: fullH, deviceScaleFactor: 2, mobile: W < 600 });
        await sleep(350);
        const cap = await rpc(ws, 'Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }, 20000);
        if (cap && cap.data) fs.writeFileSync(path.join(shotsDir, label + '-' + name + '.png'), Buffer.from(cap.data, 'base64'));
        await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 600 });
        await sleep(120);
      } catch (e) { console.log('  [shot] ' + name + ' 截图失败：' + String(e && e.message || e).slice(0, 80)); }
    }
    const row = Object.assign({ pass: label, name: name, hash: hash, navErr: navErr }, d || {});
    rows.push(row);
    /* 造出来的记录只在那一屏有效：后面还有 today 之类的空态路由，留着会改变它们的样子 */
    if (SEED_ROUTES[name]) {
      try { await rpc(ws, 'Runtime.evaluate', { expression: "localStorage.removeItem('mc.records.v1');localStorage.removeItem('mc.settings.v1');" }, 8000); } catch (e) {}
    }
    const ff = judge(name, d, wide);

    /* today 要测两种状态，且必须都测：
       ① 首次态（localStorage 空）：得先问「你在学哪一节」，那张卡也得在首屏；
       ② 用户态（有 current）：主按钮离顶 <= MAX_CTA_TOP，且不再出现提问卡。
       只测一种都会漏 —— 首次态挡住老用户，或反过来老用户被提问卡拦路。 */
    if (name === 'today' && !wide) {
      if (!d || d.err) ff.push('ASK  today 首次态取不到度量');
      else {
        if (!d.askN) ff.push('ASK  today 首次进来没有问「你在学哪一节」（.ask-which 缺失）：没有这个答案，推荐永远从字符串最小的节开始');
        else {
          if (d.askTop === null || d.askTop > MAX_ASK_TOP) ff.push('ASK  today 提问卡离顶 ' + d.askTop + 'px（上限 ' + MAX_ASK_TOP + 'px）：首屏第一件事应该是回答它');
          if (!d.askSelH || d.askSelH < 28) ff.push('ASK  today 提问卡里的选择器量不到（高 ' + d.askSelH + 'px）');
        }
        row.askTop = d.askTop;
      }
      try {
        await rpc(ws, 'Runtime.evaluate', { expression: "localStorage.setItem('mc.settings.v1', JSON.stringify({current:'11.1',picked:true}))" }, 8000);
        await rpc(ws, 'Page.reload', {}, 20000);
        await sleep(Number(process.env.WAIT || 1200));
        const d2 = await measure(ws);
        row.userCtaTop = d2 && d2.primary && d2.primary.length ? d2.primary[0].y : null;
        row.userAskN = d2 ? d2.askN : null;
        if (!d2 || d2.err) ff.push('CTA  today 用户态取不到度量');
        else {
          if (d2.askN) ff.push('CTA  today 已经选过节，提问卡还挡在首屏（.ask-which ' + d2.askN + ' 个）');
          if (row.userCtaTop === null) ff.push('CTA  today 用户态首屏没有可见的主按钮');
          else if (row.userCtaTop > MAX_CTA_TOP) ff.push('CTA  today 主按钮离顶 ' + row.userCtaTop + 'px（上限 ' + MAX_CTA_TOP + 'px）：一屏里看不见「开始练」');
        }
        const j2 = judge(name, d2, wide);
        j2.forEach(function (x) { ff.push(x); });
        /* 用户态也出一张图：两种状态的排版都得亲眼看过，不能只信数字 */
        if (shotsDir) {
          try {
            const dim = await rpc(ws, 'Runtime.evaluate', { expression: 'Math.max(document.documentElement.scrollHeight, document.body.scrollHeight)', returnByValue: true }, 8000);
            const fullH = Math.min(Number(dim.result && dim.result.value) || H, 9000);
            await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: W, height: fullH, deviceScaleFactor: 2, mobile: W < 600 });
            await sleep(300);
            const cap = await rpc(ws, 'Page.captureScreenshot', { format: 'png', captureBeyondViewport: true }, 20000);
            if (cap && cap.data) fs.writeFileSync(path.join(shotsDir, label + '-' + name + '-user.png'), Buffer.from(cap.data, 'base64'));
            await rpc(ws, 'Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 600 });
          } catch (e) {}
        }
      } catch (e) { ff.push('CTA  today 用户态测不了：' + String(e && e.message || e).slice(0, 80)); }
        /* ③ 有记录态：这才是绝大多数时候的样子（真的做过题），前两态都测不到它。
           2026-10-30 靠这一态抓出两个真缺陷：hint 在记录里存的是字符串 'none'，
           而渲染写 `x.rec.hint ? '（带提示）' : ''` —— 非空即真，于是每一行都声称「带提示」，
           等于对家长说假话；待改/复习列表只印节名，孩子对不上号是哪道题。
           记录由页面自己从 items 片里取真实题号造，不硬编码题 id，数据换了也不会失效。 */
        try {
          const sd = await rpc(ws, 'Runtime.evaluate', { expression: SEED_EXPR, returnByValue: true, awaitPromise: true }, 20000);
          const sdv = sd && sd.result ? String(sd.result.value) : 'null';
          if (sdv === 'no-items') ff.push('SEED today 有记录态造不出记录（items 片取不到题）');
          else {
            await rpc(ws, 'Page.reload', {}, 20000);
            await sleep(Number(process.env.WAIT || 1200));
            /* 题干是懒加载回填的，等它落地（最多 4 秒），否则会把「还没填」当缺陷 */
            for (let k = 0; k < 20; k++) {
              const q = await rpc(ws, 'Runtime.evaluate', { expression: 'document.querySelectorAll("[data-stem]").length', returnByValue: true }, 8000);
              if (!Number(q.result && q.result.value)) break;
              await sleep(200);
            }
            const d3 = await measure(ws);
            row.seedCtaTop = d3 && d3.primary && d3.primary.length ? d3.primary[0].y : null;
            row.seedRows = d3 ? (d3.rowTexts || []).length : null;
            /* 有记录态的字号/形状分布也要落盘：判据报的是「today」，但写字的是这一态，
               不落下来就只能凭猜去改 .rec-card 的字号。 */
            row.seedTiers = d3 && d3.fsTiers; row.seedMain = d3 && d3.fsMain; row.seedWho = d3 && d3.fsWho;
            row.seedRad = d3 && d3.radSet; row.seedTap = d3 && d3.tapSmall;
            if (!d3 || d3.err) ff.push('SEED today 有记录态取不到度量');
            else {
              if (d3.askN) ff.push('SEED today 已选过节还有提问卡（' + d3.askN + ' 个）');
              if (row.seedCtaTop === null) ff.push('SEED today 有记录态首屏没有主按钮');
              else if (row.seedCtaTop > MAX_CTA_TOP) ff.push('SEED today 有记录态主按钮离顶 ' + row.seedCtaTop + 'px（上限 ' + MAX_CTA_TOP + 'px）');
              if (d3.stemLeft) ff.push('STEM today 有 ' + d3.stemLeft + ' 行没回填出题干（只有节名，看不出是哪道题）');
              (d3.rowTexts || []).forEach(function (t) {
                if (!t || t.length < 6 || /[·\s]$/.test(t)) ff.push('STEM today 待改/复习行写着「' + t + '」—— 认不出是哪道题');
              });
              /* 造出来的记录 hint 全是 'none'，所以页面上任何「带提示」都是假话 */
              if (d3.hintClaim) ff.push('HINT today 记录里没有一道带过提示，界面却说「带提示」');
              const j3 = judge(name, d3, wide);
              j3.forEach(function (x) { ff.push(x); });
            }
          }
        } catch (e) { ff.push('SEED today 有记录态测不了：' + String(e && e.message || e).slice(0, 80)); }
      /* 还原成首次态，后面的路由不受这条设置影响 */
      try {
        await rpc(ws, 'Runtime.evaluate', { expression: "localStorage.removeItem('mc.settings.v1'); localStorage.removeItem('mc.records.v1');" }, 8000);
      } catch (e) {}
    }

    ff.forEach(function (x) { fails.push(x); });
    console.log((ff.length ? '[FAIL] ' : '[ok]   ') + label + ' ' + name +
      ' small=' + (d && d.smallShare !== undefined ? (d.smallShare * 100).toFixed(1) + '%' : '-') +
      ' xs13=' + (d && d.xsShare !== undefined ? (d.xsShare * 100).toFixed(1) + '%' : '-') +
      ' enum=' + (d && d.enumN) + ' kxSplit=' + (d && d.katexSplitN) +
      ' ovf=' + (d && d.overflowPx) + ' prim=' + (d && d.primary && d.primary.length) +
      ' cols=' + (d && d.relCols) + ' tap=' + (d && d.tapSmallN) +
      (d && d.err ? ' ERR=' + d.err : '') +
      (name === 'today' && !wide && d ? ' cta=' + row.userCtaTop + 'px askTop=' + d.askTop + ' ask=' + d.askN + '/' + row.userAskN : ''));
  }
  return { rows: rows, fails: fails };
}

(async function () {
  const args = process.argv.slice(2);
  let jsonOut = null;
  const ji = args.indexOf('--json');
  if (ji >= 0) jsonOut = args[ji + 1];
  let only = null;
  const oi = args.indexOf('--only');
  if (oi >= 0) only = String(args[oi + 1] || '').split(',').filter(Boolean);
  let shotsDir = null;
  const si = args.indexOf('--shots');
  if (si >= 0) {
    shotsDir = path.resolve(args[si + 1] || path.join(ROOT, 'out', 'shots'));
    fs.mkdirSync(shotsDir, { recursive: true });
  }
  if (!fs.existsSync(CHROME)) {
    console.log('视觉断言 · 找不到 Chrome：' + CHROME);
    console.log('[FAIL] 环境没就绪，等于这道门不存在');
    process.exit(1);
  }
  const server = await serve();
  const profile = path.join(ROOT, 'out', 'cdp-ux-' + Date.now());
  const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-allow-origins=*', '--remote-debugging-port=' + CDP_PORT, '--user-data-dir=' + profile, 'about:blank'], { stdio: 'ignore' });
  let ver = null;
  for (let i = 0; i < 60 && !ver; i++) { try { ver = await getJson('http://127.0.0.1:' + CDP_PORT + '/json/version'); } catch (e) { await sleep(300); } }
  if (!ver) { console.log('CHROME_FAIL'); chrome.kill(); server.close(); process.exit(1); }
  const list = await getJson('http://127.0.0.1:' + CDP_PORT + '/json/list');
  const page = list.find(function (t) { return t.type === 'page'; });
  const ws = new WebSocket(page.webSocketDebuggerUrl);
  await new Promise(function (res, rej) { ws.addEventListener('open', res); ws.addEventListener('error', function () { rej(new Error('ws fail')); }); });
  await rpc(ws, 'Page.enable', {});
  await rpc(ws, 'Runtime.enable', {});

  const mobileW = Number(process.env.W || 430);
  const mobileH = Number(process.env.H || 1400);
  const a = await runPass(ws, 'M' + mobileW, mobileW, mobileH, only, shotsDir);
  let b = { rows: [], fails: [] };
  if (!process.env.W) b = await runPass(ws, 'D1280', 1280, 1000, only || WIDE_ROUTES, shotsDir);

  /* 交互路径只在跑全量（或明确点名 practice）时走一遍，--only 别的屏时不拖时间 */
  let flowFails = [];
  /* 交互路径固定用一部真手机的视口（430×932）量，不跟 mobileH 走：
     mobileH 默认 1400 是给「一屏多长」用的长截图口径，拿它判「首屏点得到」等于放水——
     932px 的 iPhone 上看得见的东西，1400px 的窗口里当然也看得见。2026-10-31 实测撞出：
     把「下一题」挪回结果卡后面（它会在 1035px），判据仍然全绿，因为 vh 是 1400。 */
  const FLOW_W = 430, FLOW_H = 932;
  if (!only || only.indexOf('practice-801-11.1') >= 0) flowFails = await checkFlow(ws, FLOW_W, FLOW_H);
  const rows = a.rows.concat(b.rows);
  const fails = a.fails.concat(b.fails).concat(flowFails);
  if (jsonOut) fs.writeFileSync(path.resolve(ROOT, jsonOut), JSON.stringify(rows, null, 1));

  console.log('');
  if (fails.length) {
    fails.forEach(function (x) { console.log('[FAIL] ' + x); });
    console.log('不达标 ' + fails.length + ' 条。');
  } else {
    console.log('[OK] 视觉断言：小字占比 / 裸英文枚举 / 行内公式跨行 / 横向溢出 / 主按钮 / 窄屏列数 / 交互路径');
  }
  ws.close(); chrome.kill(); server.close();
  setTimeout(function () { process.exit(Math.min(fails.length, 120)); }, 300);
})();