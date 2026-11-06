/* 错题重练（#/retry）：把「最后一次作答是错或跳过、后来也没做对」的题凑成一组，
   跨节也能一次做完。先摊开讲清楚欠了多少、欠在哪几节，再给一个开始键。
   判定口径与今日页的「待改」完全一致：最后一次是 wrong/blank，且此后没做对过。 */
(function () {
  'use strict';
  var MC = window.MC, C = MC.core;

  function allSections() {
    var out = [];
    (MC.catalog.volumes || []).forEach(function (v) {
      v.chapters.forEach(function (ch) {
        ch.sections.forEach(function (s) {
          out.push({ vol: v.id, volLabel: v.label, ch: ch.no, chTitle: ch.title, sec: s });
        });
      });
    });
    return out;
  }

  function pending() {
    /* 判不了（manual）的题也要收：「哪里不稳」说它们会一直挂着，可错题重练以前只认
       wrong/blank，于是这道题在三个页面之间凭空消失，孩子没地方把它定下来。 */
    var st = {};
    MC.store.all().forEach(function (r) {
      var e = st[r.item] = st[r.item] || { state: 'fixed', rec: null };
      if (r.final === 'correct') { e.state = 'fixed'; e.rec = null; }
      else if (r.final === 'wrong' || r.final === 'blank') { e.state = 'debt'; e.rec = r; }
      else if (r.final === 'manual' && e.state !== 'debt') { e.state = 'unsure'; e.rec = r; }
    });
    var out = [];
    Object.keys(st).forEach(function (k) {
      if (st[k].state !== 'fixed' && st[k].rec) out.push(st[k].rec);
    });
    out.sort(function (a, b) { return b.ts - a.ts; });
    return out;
  }

  /* 把这些记录补上「在哪一册哪一节叫什么」，取不到就只报节号——不猜册 */
  function enrich(rows) {
    var idx = {};
    allSections().forEach(function (x) { if (!idx[x.sec.no]) idx[x.sec.no] = x; });
    return rows.map(function (r) {
      var hit = idx[r.sec] || null;
      return {
        rec: r,
        vol: r.volume || (hit ? hit.vol : '801'),
        no: r.sec,
        title: hit ? hit.sec.title : '',
        volLabel: hit ? hit.volLabel : ''
      };
    }).filter(function (x) { return !!x.no; });
  }

  function render(host) {
    var rows = enrich(pending());
    var unsureN = rows.filter(function (x) { return x.rec.final === 'manual'; }).length;
    var html = '<h1>错题重练</h1>';
    if (!rows.length) {
      host.innerHTML = '<div class="wrap">' + html +
        '<div class="card"><h2>现在没有欠着的题</h2>' +
        '<p class="muted">做错的、跳过的、判不了的题会攒到这里，做对一次就自动消掉。</p>' +
        '<div class="btn-row"><a class="btn btn-primary" href="#/today">回今日</a>' +
        '<a class="btn btn-secondary" href="#/toc">去目录挑一节</a></div></div></div>';
      MC.shell.title('错题重练', { sub: '没有欠着的题', back: '#/today' });
      return;
    }
    var byVol = {};
    rows.forEach(function (x) { (byVol[x.vol] = byVol[x.vol] || []).push(x); });

    html += '<p class="lead">最后一次做错、跳过或判不了的题，一共 <b>' + rows.length + '</b> 道' +
      (unsureN ? '（其中 ' + unsureN + ' 道判不了，交卷时自己认一下对错）' : '') +
      '。做对一次就从这里消失；一次只排 6 道（按时间从近到远）。</p>' +
      '<div class="card"><div class="btn-row">' +
      '<button class="btn btn-primary" data-act="start">一次做完 ' + Math.min(rows.length, 6) + ' 道</button>' +
      '<a class="btn btn-secondary" href="#/today">回今日</a></div>' +
      '<p class="muted" style="margin:8px 0 0;font-size:var(--fs-xs)">判不了的题（解答题为主）会标出来，交卷后对着答案点一下「我做对了 / 我做错了」，它就不再挂着。</p></div>';

    Object.keys(byVol).sort().forEach(function (v) {
      html += '<div class="divider">' + C.esc(byVol[v][0].volLabel || ('第 ' + v + ' 册')) + '</div>' +
        '<div class="card tight">';
      byVol[v].forEach(function (x) {
        html += '<div class="wrong-row"><div><div class="t">' + C.esc(x.no) + ' ' + C.esc(x.title) + '</div>' +
          '<div class="s">' + C.esc(C.BAND_CN[x.rec.band] || '') +
          ' · ' + (x.rec.final === 'blank'
            ? (C.blankKind(x.rec) === 'skip' ? '跳过了' : '交了空白卷')
            : (C.selfJudged(x.rec) === 'correct'
                ? '判不了 · 你定为做对了（不算独立做对）'
                : (x.rec.final === 'manual' ? '判不了 · 等你认对错' : '做错了'))) +
          ' · ' + C.stamp(new Date(x.rec.ts)) + '</div></div>' +
          '<button class="btn btn-secondary" data-one="' + C.esc(x.rec.item) + '">只做这道</button></div>';
      });
      html += '</div>';
    });

    host.innerHTML = '<div class="wrap">' + html + '</div>';
    MC.shell.title('错题重练', { sub: '欠着 ' + rows.length + ' 题', back: '#/today' });

    var list = rows.map(function (x) { return { vol: x.vol, no: x.no, id: x.rec.item, title: x.title }; });
    host.onclick = function (e) {
      var one = e.target.closest ? e.target.closest('[data-one]') : null;
      if (one) {
        var id = one.getAttribute('data-one');
        var hit = list.filter(function (x) { return x.id === id; })[0];
        if (hit) MC.practice.startMixed([hit]);
        return;
      }
      var btn = e.target.closest ? e.target.closest('[data-act="start"]') : null;
      if (btn) MC.practice.startMixed(list.slice(0, 6));
    };
  }

  MC.router.view('retry', { render: render });
})();
