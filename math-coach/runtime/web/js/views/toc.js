/* 章节目录：六册 → 章 → 节，节上标知识点数、题量与做题进度 */
(function () {
  'use strict';
  var MC = window.MC, C = MC.core;

  /* 一节的进度：做过几道、其中独立做对几道。
     口径与「哪里不稳」一致——只看每道题最后一次作答；
     带过提示做对的不算「独立」，单独计数，否则进度会虚高。
     「判不了 · 你自己定的」同样不算独立做对（判题器没下过结论），也单独计数。 */
  function statOf(h) {
    var done = 0, ok = 0, hinted = 0, selfOk = 0, k;
    if (!h || !h.items) return { done: 0, ok: 0, hinted: 0, selfOk: 0 };
    var L = h.last || {}, HH = h.h || {}, SF = h.self || {};
    for (k in h.items) {
      if (!Object.prototype.hasOwnProperty.call(h.items, k)) continue;
      done++;
      if (SF[k] === 'correct') { selfOk++; continue; }
      if (L[k] !== 'correct') continue;
      if (HH[k]) hinted++; else ok++;
    }
    return { done: done, ok: ok, hinted: hinted, selfOk: selfOk };
  }

  function secRow(vol, s, hist) {
    var st = statOf(hist[s.no]);
    var cls = s.q > 0 ? (st.done >= s.q ? 'have' : st.done > 0 ? 'part' : 'have') : '';
    var meta = [];
    if (s.kp) meta.push('知识点 ' + s.kp);
    if (s.q) meta.push('题 ' + s.q);
    if (s.sk) meta.push('方法 ' + s.sk);
    var prog = '';
    if (st.done) {
      prog = ' · 做过 ' + st.done + (s.q ? '/' + s.q : '') + ' · 独立对 ' + st.ok +
        (st.hinted ? '（带提示 ' + st.hinted + '）' : '') +
        (st.selfOk ? ' · 判不了自定 ' + st.selfOk : '') + '';
    }
    return '<li><a class="sec-row' + (s.q ? '' : ' na') + '" href="#/sec/' + vol + '/' + s.no + '">' +
      '<span class="dot ' + cls + '"></span>' +
      '<span class="no">' + C.esc(s.no) + '</span>' +
      '<span class="nm">' + C.esc(s.title) + '</span>' +
      '<span class="meta">' + (meta.join(' · ') || '待补') + prog + '</span>' +
      '</a></li>';
  }

  /* 细进度条：只用百分比，宽度固定；数字另写在文字里，不让人靠眼睛量长度 */
  function bar(done, tot) {
    var pct = tot ? Math.round(done * 100 / tot) : 0;
    if (pct > 100) pct = 100;
    return '<span class="pbar" title="做过 ' + done + ' / 共 ' + tot + ' 题"><i style="width:' + pct + '%"></i></span>';
  }

  function volStat(v, hist) {
    var secN = 0, qN = 0, kpN = 0, detailN = 0, doneN = 0, okN = 0, selfN = 0;
    v.chapters.forEach(function (ch) {
      ch.sections.forEach(function (s) {
        secN++; qN += s.q; kpN += s.kp;
        if (s.detail) detailN++;
        var st = statOf(hist[s.no]);
        doneN += st.done; okN += st.ok; selfN += st.selfOk;
      });
    });
    return { secN: secN, qN: qN, kpN: kpN, detailN: detailN, doneN: doneN, okN: okN, selfN: selfN };
  }

  function volBlock(v, expanded, hist) {
    var vs = volStat(v, hist);
    var pct = vs.qN ? Math.round(vs.doneN * 100 / vs.qN) : 0;
    var html = '<section class="vol">' +
      '<div class="vol-h"><span class="lb">' + C.esc(v.label) + '</span>' +
      '<span class="tag">' + C.esc((v.edition && v.edition.label) || '') + '</span>' +
      '<span class="no">' + vs.secN + ' 节 · 知识点 ' + vs.kpN + ' · 题 ' + vs.qN +
      (vs.detailN ? ' · 已细写 ' + vs.detailN : '') + '</span></div>';
    /* 这一册做到哪了：只在有题时才有意义（其余五册暂无题） */
    html += '<div class="vol-prog">' + bar(vs.doneN, vs.qN) +
      '<span class="muted">' + (vs.qN
        ? '做过 ' + vs.doneN + ' / ' + vs.qN + ' 题（' + pct + '%）· 独立做对 ' + vs.okN +
          (vs.selfN ? ' · 判不了自定 ' + vs.selfN + '（不算独立做对）' : '')
        : '这一册还没有题') + '</span></div>';
    if (!expanded) {
      return html + '<div class="more-line"><a href="#/toc/' + v.id + '">展开这一册</a></div></section>';
    }
    v.chapters.forEach(function (ch) {
      var cq = 0, cdone = 0;
      ch.sections.forEach(function (s) { cq += s.q; cdone += statOf(hist[s.no]).done; });
      html += '<div class="ch"><div class="ch-h"><span class="cn">第 ' + ch.no + ' 章 ' + C.esc(ch.title) + '</span>' +
        (cq ? '<span class="cq">' + cq + ' 题' + (cdone ? ' · 做过 ' + cdone : '') + '</span>'
            : '<span class="cq muted">暂无题</span>') + '</div>' +
        '<ul class="secs">' + ch.sections.map(function (s) { return secRow(v.id, s, hist); }).join('') + '</ul></div>';
    });
    return html + '</section>';
  }

  function render(host, params) {
    var cat = MC.catalog;
    var hist = MC.store.bySec();
    var focus = params.vol;
    var html = '<div class="wrap"><h1>章节目录</h1>' +
      '<p class="lead">六册按教材章序排。点一节进去看知识点、方法、例题和练习。做过多少写在节名右边，带提示做对的、判不了由你自己定的，都不算独立做对。</p>' +
      '<div class="secs" style="border:1px solid var(--line);border-radius:12px;background:#fff">' +
      '<li><a class="sec-row" href="#/toc"><span class="no">全部</span><span class="nm">六册概览</span>' +
      '<span class="meta">' + cat.volumes.length + ' 册</span></a></li>' +
      cat.volumes.map(function (v) {
        return '<li><a class="sec-row" href="#/toc/' + v.id + '"><span class="no">' + v.id + '</span>' +
          '<span class="nm">' + C.esc(v.label) + '</span><span class="meta">' +
          (focus === v.id ? '当前' : '') + '</span></a></li>';
      }).join('') + '</div>';
    cat.volumes.forEach(function (v) {
      html += volBlock(v, focus === v.id || (!focus && v.id === cat.practice_vol), hist);
    });
    html += '</div>';
    host.innerHTML = html;
    MC.shell.title('章节目录', { sub: focus ? '只看一册' : '六册' });
  }

  MC.router.view('toc', { render: render });
})();
