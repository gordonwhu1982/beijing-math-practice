/* 思想总表：一张纸看完 16 条思想各自在哪几册反复出现。
   为什么要有这一页：思想的价值就是跨册反复出现，但它散在 673 个点的详情里，
   只有把 16 条排在一起，「哪条思想贯穿六册、哪条只在八年级出现」才看得见。
   数据全部现算（节点 + 边），不另存派生文件：改一条 belongs_to，这里跟着变。 */
(function () {
  "use strict";
  var MC = window.MC, C = MC.core;

  var G = null;

  function volLabel(v) {
    var vs = (MC.catalog && MC.catalog.volumes) || [];
    for (var i = 0; i < vs.length; i++) if (vs[i].id === String(v)) return vs[i].label || String(v);
    return String(v || '?');
  }

  /* 一条思想管到哪些方法：自己的 belongs_to，加上（上位思想）它下面各方法族的。
     上位思想自己一条 belongs_to 都没有——方法全挂在族上，漏掉这一层六个思想会全空。 */
  function collect() {
    var nodes = G.nodes, edges = G.edges;
    var skTh = {}, skKp = {}, ths = [], byId = {};
    nodes.forEach(function (n) {
      byId[n.id] = n;
      if (n.kind === 'thought') ths.push(n);
    });
    edges.forEach(function (e) {
      if (e.r === 'belongs_to') { (skTh[e.s] = skTh[e.s] || []).push(e.d); }
      else if (e.r === 'applies_to') { (skKp[e.s] = skKp[e.s] || []).push(e.d); }
    });
    var kidsOf = {};
    ths.forEach(function (t) { if (t.parent) { (kidsOf[t.parent] = kidsOf[t.parent] || []).push(t.id); } });

    function skillsOfTh(tid) {
      var want = {};
      want[tid] = 1;
      (kidsOf[tid] || []).forEach(function (k) { want[k] = 1; });
      var out = [];
      Object.keys(skTh).forEach(function (sid) {
        var n = byId[sid];
        /* belongs_to 有两种源：方法 → 思想，以及方法族 → 上位思想。
           后者也是 belongs_to，但它不是「方法」；不过滤会把 10 条思想族算成方法。 */
        if (!n || n.kind !== 'skill') return;
        var hit = skTh[sid].some(function (d) { return want[d]; });
        if (hit) out.push(n);
      });
      return out;
    }

    ths.forEach(function (t) {
      var sks = skillsOfTh(t.id);
      /* 「跨几册」只数标了册的方法：有几条方法节点没有 vol，算成一册会让
         「六册都出现」这个结论虚高，所以单列成 unknown。 */
      var vols = {}, kps = {}, unk = 0;
      sks.forEach(function (s) {
        if (s.vol) { var v = String(s.vol); vols[v] = (vols[v] || 0) + 1; } else unk++;
        (skKp[s.id] || []).forEach(function (k) { kps[k] = 1; });
      });
      t._sk = sks.length;
      t._kp = Object.keys(kps).length;
      t._vols = vols;
      t._unk = unk;
      t._vn = Object.keys(vols).length;
    });

    ths.sort(function (a, b) {
      var la = a.level === 'family' ? 1 : 0, lb = b.level === 'family' ? 1 : 0;
      if (la !== lb) return la - lb;
      return (b._sk - a._sk) || (a.id < b.id ? -1 : 1);
    });
    return ths;
  }

  function card(t) {
    var vols = Object.keys(t._vols).sort();
    var dist = vols.map(function (v) { return volLabel(v) + ' ' + t._vols[v]; }).join(' · ');
    if (t._unk) dist += (dist ? ' · ' : '') + '未标册 ' + t._unk;
    var name = String(t.title || t.id);
    var desc = t.desc ? String(t.desc) : '';
    return '<a class="th-card" href="#/map?view=thought&node=' + encodeURIComponent(t.id) + '">' +
      '<div class="th-h"><b>' + C.mathHtml(name) + '</b>' +
      '<span class="pill' + (t.level === 'family' ? '' : ' ok') + '">' +
      (t.level === 'family' ? '方法族' : '上位思想') + '</span></div>' +
      (desc ? '<div class="th-desc">' + C.mathHtml(C.clipMath(desc, 54)) + '</div>' : '') +
      '<div class="th-nums"><span>' + t._vn + ' 册</span><span>' + t._sk + ' 条方法</span>' +
      '<span>' + t._kp + ' 个知识点</span></div>' +
      '<div class="th-vols">' + C.esc(dist || '还没有方法归到它') + '</div></a>';
  }

  function draw(host) {
    var ths = collect();
    var top = ths.filter(function (t) { return t.level !== 'family'; });
    var fam = ths.filter(function (t) { return t.level === 'family'; });
    var six = ths.filter(function (t) { return t._vn >= 6; }).length;
    host.innerHTML = '<div class="wrap th-page">' +
      '<div class="th-intro">' + C.esc('思想不是第 17 个学科，是同一套想法在六册里反复出现。' +
        '下面按方法数排序：' + ths.length + ' 条里 ' + six + ' 条真的在六册里都出现过。') + '</div>' +
      '<div class="th-sec">上位思想<span class="rel-n">' + top.length + '</span></div>' +
      '<div class="th-cards">' + top.map(card).join('') + '</div>' +
      '<div class="th-sec">方法族<span class="rel-n">' + fam.length + '</span></div>' +
      '<div class="th-cards">' + fam.map(card).join('') + '</div>' +
      '<div class="muted" style="margin-top:6px">' +
      C.esc('这些数字都是从方法挂在哪个思想上、方法又用在哪些知识点上现算的；' +
        '方法没挂思想的那 576 条不计入任何一行。') + '</div>' +
      '</div>';
    MC.shell.title('思想', { sub: ths.length + ' 条', back: '#/today' });
  }

  function render(host) {
    if (G) { draw(host); return; }
    host.innerHTML = '<div class="empty">正在取…</div>';
    MC.data.load('graph').then(function (g) { G = g; draw(host); });
  }

  MC.router.view('thoughts', { render: render });
})();
