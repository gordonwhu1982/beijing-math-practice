/* 节详情：这一节有哪些知识点、常用方法、常见错因，题怎么分布 */
(function () {
  'use strict';
  var MC = window.MC, C = MC.core;

  function findCat(vol, no) {
    var v = (MC.catalog.volumes || []).filter(function (x) { return x.id === vol; })[0];
    if (!v) return null;
    for (var i = 0; i < v.chapters.length; i++) {
      var ch = v.chapters[i];
      for (var j = 0; j < ch.sections.length; j++) {
        if (ch.sections[j].no === no) return { vol: v, ch: ch, sec: ch.sections[j] };
      }
    }
    return null;
  }

  /* 同册按教材顺序摊平，用来接「上一节 / 下一节」。孩子学完一节要能顺着走，
     而不是每次退回目录再找；跨章也接续。 */
  function neighbors(vol, no) {
    var v = (MC.catalog.volumes || []).filter(function (x) { return x.id === vol; })[0];
    if (!v) return { prev: null, next: null };
    var flat = [];
    v.chapters.forEach(function (ch) {
      ch.sections.forEach(function (s) {
        flat.push({ no: s.no, title: s.title, q: s.q || 0, ch: ch.no, chTitle: ch.title });
      });
    });
    var nos = flat.map(function (x) { return x.no; });
    var i = nos.indexOf(no);
    return {
      prev: i > 0 ? flat[i - 1] : null,
      next: (i >= 0 && i < flat.length - 1) ? flat[i + 1] : null
    };
  }
  MC.neighborsOf = neighbors;

  /* List question types whose checked items sit in this section. */
  function questionTypeBlock(pack, vol, no) {
    var types = ((pack && pack.types) || []).filter(function (t) {
      return (t.questions || []).some(function (q) { return q.vol === vol && q.sec === no; });
    });
    if (!types.length) return '';
    var html = '<div class="divider">常见题型</div>';
    types.forEach(function (t) {
      var here = (t.questions || []).filter(function (q) { return q.vol === vol && q.sec === no; });
      var ids = here.map(function (q) { return q.id; }).join(',');
      html += '<div class="card tight"><div class="h"><span class="nm">' + C.esc(t.name) + '</span>' +
        '<span class="pill">' + here.length + ' 题</span></div>' +
        '<div class="def">' + C.esc(t.recognition || '') + '</div>' +
        (window.MC.fig ? MC.fig.matching(t.uid, 'qtype_refs').map(function (f) { return MC.fig.render(f); }).join('') : '') +
        (t.why ? '<div class="muted" style="margin-top:6px">' + C.esc(t.why) + '</div>' : '') +
        '<div class="btn-row" style="margin-top:8px"><button class="btn btn-secondary" data-go="#/practice/' +
        vol + '/' + no + '?qs=' + encodeURIComponent(ids) + '">练这一题型 · ' + here.length + ' 题</button></div></div>';
    });
    return html;
  }

  function kpCard(k) {
    var t = C.kpText(k);
    var html = '<div class="kp-card"><div class="h"><span class="nm">' + C.mathHtml(t.name) + '</span>' +
      (k.kp_type ? '<span class="pill">' + C.esc(C.KPT_CN[k.kp_type] || k.kp_type) + '</span>' : '') +
      '<a class="tag" href="#/kp/' + encodeURIComponent(k.uid) + '">详情 ›</a></div>';
    if (t.def) {
      html += '<div class="def">' + C.mathHtml(t.def) + '</div>';
    } else if (k.name.length < 12) {
      /* 标题就是个名词（「三角形的中线」），得说明还没细写；
         标题本身已经是一句完整表述时不再补灰字，免得像缺东西 */
      html += '<div class="def muted">这一点只有标题（还没细写）。</div>';
    }
    if (k.conditions && k.conditions.length) {
      html += '<ul>' + k.conditions.slice(0, 4).map(function (x) { return '<li>' + C.mathHtml(x) + '</li>'; }).join('') + '</ul>';
    }
    return html + '</div>';
  }

  function render(host, params) {
    var vol = params.vol, no = params.no;
    var found = findCat(vol, no);
    if (!found) { host.innerHTML = '<div class="empty">找不到这一节</div>'; return; }
    var sec = found.sec;
    var hist = MC.store.bySec()[no] || { n: 0, c: 0, items: {} };
    var doneN = Object.keys(hist.items || {}).length;

    host.innerHTML = '<div class="empty">正在取这一节…</div>';
    // 只有有题的节才去取例题片，避免对不存在的文件发请求（file:// 下会留 404 控制台噪声）
    var exP = sec.q ? MC.data.loadExamples(vol, no) : Promise.resolve({ items: [] });
    Promise.all([MC.data.loadSec(vol, no), exP, MC.data.load('qtypes').catch(function () { return null; }),
      MC.data.load('figures').catch(function () { return null; })]).then(function (r) {
      var s = r[0], ex = r[1], qtypes = r[2];
      var bands = s.counts || {};
      var totalQ = Object.keys(bands).reduce(function (a, b) { return a + (bands[b] || 0); }, 0);
      var html = '<div class="wrap">' +
        '<div class="muted" style="font-size:var(--fs-xs)">' + C.esc(found.vol.label) + ' · 第 ' + found.ch.no + ' 章 ' + C.esc(found.ch.title) + '</div>' +
        '<h1>' + C.esc(s.no) + ' ' + C.esc(s.title) + '</h1>' +
        '<p class="lead">' + (sec.page ? '课本第 ' + sec.page + ' 页 · ' : '') +
        (s.kps.length ? s.kps.length + ' 个知识点' : '知识点待补') +
        (s.skills.length ? ' · ' + s.skills.length + ' 个方法' : '') +
        (s.mcs.length ? ' · ' + s.mcs.length + ' 个常见错因' : '') + '</p>' +
        '<div class="btn-row">' +
        (totalQ ? '<button class="btn btn-primary" data-go="#/practice/' + vol + '/' + no + '">开始练 · ' + Math.min(6, totalQ) + ' 题</button>' : '') +
        (totalQ ? '<button class="btn btn-secondary" data-go="#/practice/' + vol + '/' + no + '?mode=stretch">做提高</button>' : '') +
        '<button class="btn btn-secondary" data-go="#/map?vol=' + vol + '&sec=' + no + '">在图谱里看</button></div>';

      if (totalQ) {
        html += '<div class="card tight"><div class="row between"><span class="muted">这一节 ' + totalQ + ' 题</span>' +
          '<span class="muted">已做 ' + doneN + ' 题</span></div>' +
          ['basic', 'standard', 'advanced', 'challenge', 'competition'].filter(function (b) { return bands[b]; }).map(function (b) {
            var n = bands[b], w = Math.round(n / totalQ * 100);
            return '<div class="row" style="margin-top:8px"><span class="pill ' + b + '" style="min-width:52px;text-align:center">' +
              C.BAND_CN[b] + '</span><span class="bar" style="flex:1;margin-top:0"><i style="width:' + w + '%"></i></span>' +
              '<span class="muted" style="min-width:34px;text-align:right">' + n + '</span></div>';
          }).join('') + '</div>';
      }

      html += '<div class="divider">知识点</div>';
      if (s.kps.length) {
        html += s.kps.map(kpCard).join('');
      } else {
        html += '<div class="card"><div class="muted">这一节的知识点还没写。框架位置已经留好。</div></div>';
      }

      if (s.skills.length) {
        html += '<div class="divider">常用方法</div>';
        s.skills.forEach(function (m) {
          html += '<details class="fold"><summary>' + C.mathHtml(m.name) + '</summary><div class="body">';
          if (m.conditions && m.conditions.length) {
            html += '<div class="muted">什么时候用：' + m.conditions.map(C.mathHtml).join('；') + '</div>';
          }
          (m.steps || []).forEach(function (st, i) {
            html += '<div class="step"><span class="i">' + (st.ordinal || i + 1) + '</span><span>' + C.mathHtml(st.action) +
              (st.basis ? ' <span class="muted">（' + C.mathHtml(st.basis) + '）</span>' : '') + '</span></div>';
          });
          if (m.signals && m.signals.length) {
            html += '<div class="muted" style="margin-top:8px">做错时常见的信号：' + m.signals.map(C.mathHtml).join('；') + '</div>';
          }
          html += '</div></details>';
        });
      }

      html += questionTypeBlock(qtypes, vol, no);

      if (s.mcs.length) {
        html += '<div class="divider">常见错因</div><div class="card">';
        s.mcs.forEach(function (m) {
          html += '<div class="kv"><span>' + m.signals.map(function (x) { return C.mathHtml(C.clip(x, 60)); }).join(' / ') + '</span>' +
            '<span class="g">' + C.esc(C.MCAT_CN[m.category] || m.category) + '</span></div>';
        });
        html += '</div>';
      }

      if (ex.items && ex.items.length) {
        html += '<div class="divider">这一节的例题</div>';
        html += '<p class="muted" style="margin:-4px 0 8px">按难度挑的代表题，带完整解析和评分点。</p>';
        ex.items.forEach(function (it, i) {
          html += '<div class="ex"><div class="ex-h">例题 ' + (i + 1) + ' · ' +
            (C.BAND_CN[it.band] || it.band) + (it.star ? ' · ' + it.star + '★' : '') + '</div>' +
            '<div class="stem">' + C.mathHtml(it.stem) + '</div>' +
            (it.note ? '<div class="answer-block"><div class="lbl">思路</div>' + C.mathHtml(it.note) + '</div>' : '') +
            '<details class="fold" style="margin-top:10px"><summary>看解答</summary><div class="body">' +
            C.mathHtml(C.ansText(it.ans) || '') + '</div></details></div>';
        });
      }
      var nb = neighbors(vol, no);
      if (nb.prev || nb.next) {
        /* 「（还没有题）」在手机上会被按钮截成半个括号，改成短的「· 无题」 */
        var lbl = function (x) { return C.esc(x.no + ' ' + x.title + (x.q ? '' : ' · 无题')); };
        html += '<div class="divider">接着走</div><div class="card tight"><div class="row between">' +
          (nb.prev ? '<a class="btn btn-secondary" href="#/sec/' + vol + '/' + nb.prev.no + '">‹ ' + lbl(nb.prev) + '</a>' : '<span></span>') +
          (nb.next ? '<a class="btn ' + (nb.next.q ? 'btn-primary' : 'btn-secondary') + '" href="#/sec/' + vol + '/' + nb.next.no + '">' + lbl(nb.next) + ' ›</a>' : '<span></span>') +
          '</div>' +
          (nb.next && nb.next.q ? '<p class="muted" style="margin:8px 0 0;font-size:var(--fs-xs)">下一节有 ' + nb.next.q + ' 道题，进去就能练。</p>' : '') +
          '</div>';
      }
      html += '</div>';
      host.innerHTML = html;
      MC.shell.title(no + ' ' + s.title, { sub: found.vol.label, back: '#/toc/' + vol });
    }).catch(function (err) {
      host.innerHTML = '<div class="empty"><b>这一节打不开</b><br><span class="muted">' + C.esc(err.message) + '</span></div>';
    });
  }

  MC.router.view('sec', { render: render });
})();
