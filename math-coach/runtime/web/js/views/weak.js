/* 哪里不稳：把作答记录按知识点汇总。
   只算真做过的题 —— 没做过的点不列出，也不顺着先修链推断「它肯定也会」；
   那是把「没测」说成「会」，比不说更坏。 */
(function () {
  'use strict';
  var MC = window.MC, C = MC.core;

  function ts(t) {
    var d = new Date(t);
    var hm = ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2);
    var today = new Date();
    if (d.toDateString() === today.toDateString()) return '今天 ' + hm;
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + hm;
  }

  function render(host) {
    /* 冷进 #/weak（直接输地址、或刷新）时顶栏还是上一页的标题，
       这里补一次 shell.title，回退落到今日。 */
    MC.shell.title('哪里不稳', { back: '#/today' });
    host.innerHTML = '<div class="wrap"><p class="muted">正在读记录…</p></div>';
    Promise.all([MC.data.load('graph'), MC.data.load('qkp')]).then(function (r) {
      var g = r[0] || {}, qkp = r[1] || {};
      var byId = {};
      (g.nodes || []).forEach(function (n) { byId[n.id] = n; });
      var recs = MC.store.all();
      var unMapped = 0;
      var M = {};
      /* 同一道题会写下多条记录（交卷、看答案、勾错因、自评、跳过各一条），统计前
         先按题只留最后一次 —— 否则页面上会冒出「做了 2 道 · 没做 2」这种自相矛盾的数。 */
      var lastByItem = {};
      recs.forEach(function (rec) {
        var o = lastByItem[rec.item];
        if (!o || (rec.ts || 0) >= (o.ts || 0)) lastByItem[rec.item] = rec;
      });
      var recsOnce = Object.keys(lastByItem).map(function (k) { return lastByItem[k]; });
      /* 欠账要按「题」算，不能按「点」算。原来每个点只留最后一条记录的 final：
         一个点上做了 3 道（2 道错、1 道对，而对的正好是最后做的），整点就被算成
         改好了 —— 今日页说「待改 2 题」，这一页说「没有欠着的点」，同一份数据两个结论。 */
      recsOnce.forEach(function (rec) {
        var kid = qkp[rec.item];
        if (!kid || !byId[kid]) { unMapped++; return; }
        var e = M[kid] || (M[kid] = { kid: kid, items: {}, hint: 0, last: 0 });
        var f = rec.final || rec.verdict || '';
        e.items[rec.item] = { f: f, how: String(rec.how || '') };
        /* hint 存的是字符串，'none' 也是真值：不排除就会给每一行都安上「带提示」，
           等于对家长说假话（today.js 早就踩过同一个坑）。 */
        if (rec.hint && rec.hint !== 'none') e.hint++;
        if ((rec.ts || 0) > e.last) e.last = rec.ts || 0;
      });

      var all = Object.keys(M).map(function (k) {
        var e = M[k];
        e.n = 0; e.correct = 0; e.wrong = 0; e.skip = 0; e.empty = 0; e.manual = 0;
        Object.keys(e.items).forEach(function (it) {
          var x = e.items[it]; e.n++;
          /* 判不了族按 how 出身收：自评会把 final 改成 correct/wrong，
             按 final 数就会把「你自定的」混进对/错——目录页说它不算独立做对。 */
          var sj2 = C.selfJudged(lastByItem[it]);
          if (sj2 === 'wrong') e.wrong++;
          else if (sj2 === 'correct') e.manual++;
          else if (C.manualHow(lastByItem[it])) e.manual++;
          else if (x.f === 'correct') e.correct++;
          else if (x.f === 'wrong') e.wrong++;
          else if (x.f === 'blank') { if (x.how === 'skip') e.skip++; else e.empty++; }
          else e.manual++;
        });
        e.blank = e.skip + e.empty;
        return e;
      });
      /* 三类点，各有出口：错着没改（有题没改对）／判不了（等你标）／已经改过来。
         manual 原来既不进 open 也不进 fixed，判不了的题连个入口都没有。 */
      var open = [], unsure = [], fixed = [];
      all.forEach(function (e) {
        if (e.wrong || e.blank) open.push(e);
        else if (e.manual) unsure.push(e);
        else fixed.push(e);
      });
      open.sort(function (a, b) { return (b.wrong + b.blank) - (a.wrong + a.blank) || b.last - a.last; });
      unsure.sort(function (a, b) { return b.last - a.last; });
      fixed.sort(function (a, b) { return b.last - a.last; });

      var html = '<div class="wrap">' +
        '<h1>哪里不稳</h1>' +
        '<p class="lead">这里按知识点数你真做过的题：错的、没做的、判不了的都分开写。' +
        '没做过的点不列出，也不顺着先修链推断它「应该会」—— 没测就是没测。</p>';

      if (!recs.length) {
        host.innerHTML = html + '<div class="card"><h2>还没有作答记录</h2>' +
          '<p class="muted">做几道题再回来：这里只认做过的题，不靠猜。</p>' +
          '<div class="btn-row"><a class="btn btn-primary" href="#/today">回今日</a></div></div></div>';
        return;
      }

      html += '<div class="wk-stats">' +
        '<div class="st"><b' + (open.length ? ' class="warn"' : '') + '>' + open.length + '</b><span>错着没改 · 点</span></div>' +
        '<div class="st"><b' + (unsure.length ? ' class="warn"' : '') + '>' + unsure.length + '</b><span>判不了 · 点</span></div>' +
        '<div class="st"><b>' + fixed.length + '</b><span>已经改过来 · 点</span></div>' +
        '<div class="st"><b>' + all.length + '</b><span>碰过的点</span></div>' +
        '</div>';

  /* 图上的节点 id 自带册号（K801-12.1-01），n.vol 偶尔没带；拼链接前补出来，
     否则会拼出 '#/practice//11.1' 这种空册号地址。 */
  function volOf(n) {
    if (n && n.vol) return String(n.vol);
    var m = String((n && n.id) || '').match(/^K(\d{3})/);
    return m ? m[1] : ((MC.catalog && MC.catalog.practice_vol) || '801');
  }

      function row(e) {
        var n = byId[e.kid];
        var title = C.clipMath(n.title || '', 26);
        /* 「做了 2 道 · 没做 2」这种句子是在说反话：跳过的那两道根本没做。
           把「真动过笔的」和「跳过的」分成两个数，别的才是对错构成。 */
        var didN = e.correct + e.wrong + e.manual;
        var bits = [];
        if (e.correct) bits.push('对 ' + e.correct);
        if (e.wrong) bits.push('错 ' + e.wrong);
        if (e.manual) bits.push('判不了 ' + e.manual);
        /* 跳过（没遇到）与交白卷（遇到了没做出来）分开写：记录里 how 本来就分得清，
           页面上混成一个词，等于把「交过卷」说成「没遇到」。 */
        var miss = [];
        if (e.skip) miss.push('跳过 ' + e.skip + ' 道');
        if (e.empty) miss.push('交了 ' + e.empty + ' 道白卷');
        /* 跳过/交白卷自己就说明了「没交过卷」，后面再追一句「都还没交卷」是自相矛盾。 */
        var tail = bits.length ? '（' + bits.join(' · ') + '）' : (miss.length ? '' : ' · 都还没交卷');
        /* 这一行是家长真正要读的结论（做过几道、错几道、跳几道），原来是 13px 灰字
           排在知识点名下面，与标签同档；全屏 61% 的字都落在这一档时它就不像结论了。 */
        var numLine = '<b>做过 ' + didN + ' 道</b>' + (miss.length ? ' · ' + miss.join(' · ') : '') + tail;
        return '<div class="wk-row">' +
          '<div class="wk-h"><a href="#/kp/' + encodeURIComponent(e.kid) + '">' + C.mathHtml(title) + '</a>' +
          '<span class="wk-sec">' + C.esc((n.vol || '') + ' ' + (n.sec || '')) + '</span></div>' +
          '<div class="wk-num">' + numLine +
          (e.hint ? ' · 带提示 ' + e.hint : '') + ' · 最近 ' + ts(e.last) + '</div>' +
          '<div class="wk-links">' +
          '<a href="#/rel/' + encodeURIComponent(e.kid) + '">它跟前后哪些点有关</a>' +
          '<a href="#/practice/' + C.esc(volOf(n)) + '/' + C.esc(n.sec || '') + '">练这一节</a>' +
          '<a href="#/map?vol=' + C.esc(n.vol || '') + '&sec=' + C.esc(n.sec || '') + '&node=' + encodeURIComponent(e.kid) + '">回到图上</a>' +
          '</div></div>';
      }

      if (open.length) {
        html += '<div class="card"><div class="card-h"><h2>错着没改</h2>' +
          '<span class="pill stub">' + open.length + ' 个点</span></div>' +
          '<p class="muted">这个点上还有题没改对：错的、跳过没做的、交了白卷的都算。按错的多的排前面。</p>' +
          open.map(row).join('') + '</div>';
      } else {
        html += '<div class="card"><h2>没有欠着的题</h2><p class="muted">' +
          (unsure.length ? '做过的题要么改对了，要么你标了「判不了」，见下面那栏。' : '做过的题最后一次都对。要不要再来一组？') +
          '</p>' +
          '<div class="btn-row"><a class="btn btn-primary" href="#/retry">错题重练</a></div></div>';
      }

      if (unsure.length) {
        html += '<div class="card"><div class="card-h"><h2>判不了 · 等你定</h2>' +
          '<span class="pill stub">' + unsure.length + ' 个点</span></div>' +
          '<p class="muted">这些题参考答案和你写的不一样，我不替你下结论。你定了「做对了」也仍算在这里：' +
          '那不算独立做对，不进「已掌握」。要让它真的翻篇，就重做一遍。</p>' +
          unsure.map(row).join('') + '</div>';
      }

      if (fixed.length) {
        html += '<div class="card"><div class="card-h"><h2>已经改过来</h2>' +
          '<span class="pill detail">' + fixed.length + ' 个点</span></div>' +
          '<p class="muted">错过的点后来做对了。留在这里是为了「过几天还记不记得」。</p>' +
          fixed.slice(0, 12).map(row).join('') + '</div>';
      }

      html += '<p class="muted wk-foot">题到知识点是 2576 / 2708 道有映射（95.1%），其余题的作答不计入这里' +
        (unMapped ? '：本次有 ' + unMapped + ' 条记录对应的题还没有点级映射' : '') + '。</p>';
      html += '</div>';
      host.innerHTML = html;
    }).catch(function (e) {
      host.innerHTML = '<div class="wrap"><div class="card"><h2>读不出记录</h2><p class="muted">' +
        C.esc(String(e && e.message || e)) + '</p></div></div>';
    });
  }

  MC.router.view('weak', { render: render });
})();
