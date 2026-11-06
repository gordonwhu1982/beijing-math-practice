/* 今日：今天练哪一节 + 本周节奏 + 待改的题 + 入口
   R3（2026-10-30）：首屏只回答一件事 ——「今天点哪里开始」。
   改前量到主按钮离顶 545px（430 宽），一屏(≈800)里要先翻过 h1、两行导语、四格统计和一行下拉才看得见它。
   现在顺序是 h1 → 一行状态 → 主行动卡（按钮离顶 ≈ 220px）→ 待改/复习 → 统计与七天（回顾信息靠后）。
   首次进来先问「你在学哪一节」：以前这个开关默认「（还没定，按推荐来）」，推荐永远从字符串最小的节开始，
   孩子改不了，也就等于没有这个开关。问过之后（set.picked）不再拦路，主卡右上角留「换一节」。 */
(function () {
  'use strict';
  var MC = window.MC, C = MC.core;
  var SET_KEY = 'mc.settings.v1';

  function settings() {
    try { return JSON.parse(localStorage.getItem(SET_KEY) || '{}') || {}; } catch (e) { return {}; }
  }
  function saveSettings(o) {
    try { localStorage.setItem(SET_KEY, JSON.stringify(o)); } catch (e) {}
  }

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

  function volOfSec(secNo) {
    var list = allSections(), hit = null;
    list.forEach(function (x) { if (x.sec.no === secNo && !hit) hit = x; });
    return hit;
  }

  /* 记录里只有 item id（'11.1_bas_14'），光看节名孩子对不上号是哪道题。
     题干按节懒加载后回填：首屏不等它，取不到就保持「节 · 标题」。
     loadItems 走的是 build_web 切出来的 items 片，和练习页同一份。 */
  function fillStems(recs) {
    var want = {}, keys;
    (recs || []).forEach(function (r) {
      if (!r || !r.sec) return;
      var v = volOfSec(r.sec);
      want[(v ? v.vol : (r.volume || '801')) + '|' + r.sec] = 1;
    });
    keys = Object.keys(want);
    if (!keys.length) return;
    keys.forEach(function (k) {
      var p = k.split('|');
      MC.data.loadItems(p[0], p[1]).then(function (got) {
        var byId = {}, nodes, i, it, box;
        ((got && got.items) || []).forEach(function (x) { byId[x.id] = x; });
        nodes = document.querySelectorAll('[data-stem]');
        for (i = 0; i < nodes.length; i++) {
          it = byId[nodes[i].getAttribute('data-stem')];
          if (!it || !it.stem) continue;
          box = nodes[i].parentNode;
          if (box) box.innerHTML = C.mathHtml(C.clipMath(it.stem, 40));
        }
      }).catch(function () {});
    });
  }

  /* 连续几天有作答（含今天才算「连着」） */
  function streak() {
    var days = {};
    MC.store.all().forEach(function (r) { days[new Date(r.ts).toDateString()] = 1; });
    var n = 0, d = new Date();
    if (!days[d.toDateString()]) return 0;
    while (days[d.toDateString()]) { n++; d.setDate(d.getDate() - 1); }
    return n;
  }

  /* 近 7 天每天题数，返回 [{label, n}] 旧→新 */
  function weekBars() {
    var days = {}, out = [];
    MC.store.all().forEach(function (r) {
      var k = new Date(r.ts).toDateString();
      days[k] = (days[k] || 0) + 1;
    });
    for (var i = 6; i >= 0; i--) {
      var d = new Date(); d.setDate(d.getDate() - i);
      out.push({ label: i === 0 ? '今天' : (d.getMonth() + 1) + '/' + d.getDate(), n: days[d.toDateString()] || 0 });
    }
    return out;
  }
  function weekCount() {
    return weekBars().reduce(function (a, b) { return a + b.n; }, 0);
  }

  /* 待改：最后一次作答是错/没做，且后来没有做对过 */
  function pending() {
    var st = {};
    MC.store.all().forEach(function (r) {
      var e = st[r.item] = st[r.item] || { fixed: true, rec: null };
      if (r.final === 'correct') { e.fixed = true; e.rec = null; }
      else if (r.final === 'wrong' || r.final === 'blank') { e.fixed = false; e.rec = r; }
    });
    var out = [];
    Object.keys(st).forEach(function (k) { if (!st[k].fixed && st[k].rec) out.push(st[k].rec); });
    out.sort(function (a, b) { return b.ts - a.ts; });
    return out;
  }

  /* 该抽回来看看：当时做对了的题，按 3 天 / 7 天 / 21 天的节奏再抽一遍。
     规则故意简单可解释 —— 现在的作答量撑不起算法式的间隔重复（八上 57 个点要 14 次/点才勉强够），
     这里只回答一个问题：对过的东西过几天还在不在。答错了自然回到「待改」。 */
  var GAP_DAYS = [3, 7, 21];
  function dueReview(limit) {
    var st = {};
    MC.store.all().forEach(function (r) {
      var e = st[r.item] = st[r.item] || { ok: 0, last: null };
      /* 你自己定的「做对了」不进抽回队列：判题器没验过，先重做一遍才算会 */
      if (r.final === 'correct' && !C.selfJudged(r)) { e.ok++; e.last = r; }
      else if (r.final === 'wrong' || r.final === 'blank') { e.last = null; }
    });
    var now = Date.now(), out = [];
    Object.keys(st).forEach(function (k) {
      var e = st[k];
      if (!e.ok || !e.last) return;
      var gap = (GAP_DAYS[Math.min(e.ok, GAP_DAYS.length) - 1] || 21) * 86400000;
      if (now - e.last.ts < gap) return;
      out.push({ rec: e.last, gap: gap, ratio: (now - e.last.ts) / gap });
    });
    /* 超期最多的先抽：同样是到期，已经拖了两轮的比刚过期一天的更该回来 */
    out.sort(function (a, b) { return b.ratio - a.ratio; });
    return out.slice(0, limit || 5);
  }

  /* 推荐：设置了「我在学哪一节」就用它；否则挑「做过的最少的、有题的」 */
  function recommend(cur) {
    if (cur) {
      var hit = volOfSec(cur);
      if (hit && hit.sec.q > 0) return hit;
    }
    var hist = MC.store.bySec();
    var cands = allSections().filter(function (x) { return x.sec.q > 0; });
    if (!cands.length) return null;
    cands.sort(function (a, b) {
      var ha = hist[a.sec.no] ? Object.keys(hist[a.sec.no].items).length : 0;
      var hb = hist[b.sec.no] ? Object.keys(hist[b.sec.no].items).length : 0;
      var ca = ha / a.sec.q, cb = hb / b.sec.q;
      if (ca !== cb) return ca - cb;
      return a.sec.no < b.sec.no ? -1 : 1;
    });
    return cands[0];
  }

  /* 「我在学哪一节」的选择器。首次态直接摆在首屏，之后收进主卡右上角的「换一节」。 */
  function sectionPicker(cur, id) {
    var opts = '';
    /* 32 节平铺在一个下拉里，孩子找「今天老师讲的那一节」要滚一长串。
       最近做过的最多三节提到最前面，其余照旧按册/章分组。 */
    var seen = {}, recent = [];
    MC.store.all().slice().reverse().forEach(function (r) {
      if (recent.length >= 3) return;
      if (!r.sec || seen[r.sec]) return;
      var hit = volOfSec(r.sec);
      if (!hit || !(hit.sec.q > 0)) return;
      seen[r.sec] = 1;
      recent.push(hit.sec);
    });
    if (recent.length) {
      opts += '<optgroup label="最近做过">' + recent.map(function (s) {
        return '<option value="' + C.esc(s.no) + '"' + (cur === s.no ? ' selected' : '') + '>' +
          C.esc(s.no + ' ' + (s.title || '')) + '</option>';
      }).join('') + '</optgroup>';
    }
    (MC.catalog.volumes || []).forEach(function (v) {
      v.chapters.forEach(function (ch) {
        var inner = '';
        ch.sections.forEach(function (s) {
          if (!(s.q > 0) || seen[s.no]) return;
          inner += '<option value="' + C.esc(s.no) + '"' + (cur === s.no ? ' selected' : '') + '>' +
            C.esc(s.no + ' ' + (s.title || '')) + '</option>';
        });
        if (inner) opts += '<optgroup label="' + C.esc(v.label + ' · 第 ' + ch.no + ' 章 ' + (ch.title || '')) + '">' + inner + '</optgroup>';
      });
    });
    return '<select class="pick-sel" id="' + (id || 'cur-sel') + '"><option value=""' + (cur ? '' : ' selected') + '>选一节…</option>' + opts + '</select>';
  }

  function render(host) {
    var set = settings();
    var cur = set.current || null;
    var picked = !!set.picked;
    var recs = MC.store.all();
    var todayN = MC.store.todayCount();
    var pend = pending();
    var rec = recommend(cur);
    var bars = weekBars();
    var maxBar = Math.max.apply(null, bars.map(function (b) { return b.n; }).concat([1]));

    var list = allSections(), haveQ = 0, haveDetail = 0;
    list.forEach(function (x) { if (x.sec.q > 0) haveQ++; if (x.sec.detail) haveDetail++; });

    /* 一行状态：把原来四格（今天/近七天/连续/待改）压成一句话。
       四格在窄屏是 2×2、占 190px，而它回答的是「回顾」，不该挡在「今天点哪里」前面。 */
    var bits = [];
    bits.push(todayN ? '今天已做 ' + todayN + ' 题' : '今天还没开始');
    if (streak() > 1) bits.push('连着第 ' + streak() + ' 天');
    if (pend.length) bits.push('待改 ' + pend.length + ' 题');
    /* 判不了的题以前只活到「哪里不稳」为止：今日页一字不提，错题重练也不收，
       孩子以为它消失了，其实一直挂着。给个能点进去的入口，别只报数。 */
    var unsureN = MC.store.lastEach().filter(function (r) { return r.final === 'manual'; }).length;
    if (unsureN) bits.push('等你定 ' + unsureN + ' 题');

    var html = '<div class="wrap">' +
      '<h1>今天练什么</h1>' +
      '<p class="today-lead">' + C.esc(bits.join(' · ')) + '</p>';

    /* ---------- 首次态：先问在学哪一节 ---------- */
    if (!picked) {
      /* 只留一个动作：选完就生效。
         原来这里除了下拉还有一个 disabled 的「就学这一节」—— selection 变了属性不会跟着变，
         选了也点不动，等于把用户堵在首屏。这种「点了没反应」比多一次点击更伤。 */
      html += '<div class="card ask-which">' +
        '<h2>你在学哪一节？</h2>' +
        '<p class="muted">选完就按这一节安排，之后随时能换。</p>' +
        sectionPicker(cur, 'ask-sel') +
        '<div class="btn-row" style="margin-top:10px">' +
        '<button class="btn btn-secondary" data-ask="skip">先不定，按推荐来</button>' +
        '</div>' +
        '<p class="muted" style="margin:10px 0 0">六册一共 ' + list.length + ' 节，其中 ' + haveQ + ' 节有题可练。</p>' +
        '</div>';
    }

    /* picked 之后才给主行动卡：先回答问题，再谈今天练什么 */
    if (picked && rec) {
      var hist = MC.store.bySec()[rec.sec.no];
      var doneN = hist ? Object.keys(hist.items).length : 0;
      var cnt = Math.min(6, Math.max(1, rec.sec.q - doneN));
      html += '<div class="card rec-card">' +
        '<div class="card-h"><h2>' + C.mathHtml(C.clipMath(rec.sec.no + ' ' + (rec.sec.title || ''), 30)) + '</h2>' +
        '<button class="btn btn-secondary btn-xs" data-act="pick">换一节</button>' +
        '</div>' +
        /* 「做过几道」并进同一行：单独一行会把主按钮再往下推 30px（实测 249→279），
           而这行信息量不值得占一整行。不画进度条的理由同前 —— 一节的题量动辄七十道，
           拿它当分母永远是空的。 */
        '<p class="muted">' + rec.sec.q + ' 题 · 基础 ' + (rec.sec.bands.basic || 0) +
        ' / 中档 ' + (rec.sec.bands.standard || 0) + ' / 提高 ' + (rec.sec.bands.advanced || 0) +
        (doneN ? ' · <span class="done-n">已做 ' + doneN + '</span>' : '') + '</p>' +
        '<div class="btn-row"><button class="btn btn-primary" data-go="#/practice/' + rec.vol + '/' + rec.sec.no + '">开始练 · ' + cnt + ' 题</button>' +
        '<button class="btn btn-secondary" data-go="#/sec/' + rec.vol + '/' + rec.sec.no + '">先看这一节</button></div>' +
        '<div class="pick-wrap" id="pick-wrap" hidden>' + sectionPicker(cur) +
        '<button class="btn btn-secondary btn-sm" data-ask="ok">就用这一节</button></div>' +
        '</div>';
    } else if (picked) {
      html += '<div class="card"><h2>还没有可练的题</h2><p class="muted">先去看看目录和图谱。</p></div>';
    }

    /* 待改的题：错过的题只有回到「同一节再练一次」这一条路，这里给它一个入口 */
    if (pend.length) {
      html += '<div class="divider">还欠着的题</div><div class="card tight">';
      pend.slice(0, 3).forEach(function (r) {
        var sec = volOfSec(r.sec);
        html += '<div class="wrong-row"><div><div class="t">' +
          '<span data-stem="' + C.esc(r.item) + '">' + C.esc(r.sec) + ' · ' +
          C.mathHtml((sec && sec.sec.title) || '') + '</span></div>' +
          '<div class="s">' + C.esc(r.sec) + ' · ' + C.esc(C.BAND_CN[r.band] || '') +
          ' · ' + (r.final === 'blank' ? (C.blankKind(r) === 'skip' ? '跳过了' : '交了空白卷') : '做错了') + ' · ' + C.stamp(new Date(r.ts)) + '</div></div>' +
          '<button class="btn btn-secondary" data-go="#/practice/' + (sec ? sec.vol : '801') + '/' + C.esc(r.sec) + '">回去改</button></div>';
      });
      if (pend.length > 3) html += '<div class="muted" style="margin-top:8px">还有 ' + (pend.length - 3) + ' 题。</div>';
      /* 逐题「回去改」要一题一题跳；这里给一条一次清完的路（跨节也成立） */
      html += '<div class="btn-row" style="margin-top:10px">' +
        '<a class="btn btn-secondary" href="#/retry">一次做完 ' + pend.length + ' 道（错题重练）</a></div>';
      html += '</div>';
    }

    /* 该抽回来看看：做对过的不等于记住了，隔几天抽一次 */
    var due = dueReview(5);
    if (due.length) {
      html += '<div class="divider">该抽回来看看</div><div class="card tight">' +
        '<p class="muted" style="margin:0 0 8px">这几道当时做对了，按 3 天 / 7 天 / 21 天的节奏抽回来。' +
        '做对一次就往后推一档，做错了自然回到「待改」。</p>';
      due.forEach(function (x) {
        var sec = volOfSec(x.rec.sec);
        var days = Math.floor((Date.now() - x.rec.ts) / 86400000);
        html += '<div class="wrong-row"><div><div class="t">' +
          '<span data-stem="' + C.esc(x.rec.item) + '">' + C.esc(x.rec.sec) + ' · ' +
          C.mathHtml((sec && sec.sec.title) || '') + '</span></div>' +
          /* hint 存的是字符串（'none' / 'h1' …），非空即真 —— 不排除 'none' 会恒显示「带提示」，
             等于对家长说了一句假话 */
          '<div class="s">' + days + ' 天前做对过' +
          (x.rec.hint && x.rec.hint !== 'none' ? '（带提示）' : '') + ' · ' +
          C.esc(C.BAND_CN[x.rec.band] || '') + '</div></div>' +
          '<button class="btn btn-secondary" data-one="' + C.esc(x.rec.item) + '">就这道</button></div>';
      });
      html += '<div class="btn-row" style="margin-top:10px">' +
        '<button class="btn btn-secondary" data-act="review">抽 ' + due.length + ' 道看看还在不在</button></div>' +
        '</div>';
    }

    /* ---------- 回顾区：四格统计 + 七天柱。零数据不占地。 ---------- */
    if (recs.length || todayN) {
      html += '<div class="divider">这一周</div>' +
        '<div class="today-stats">' +
        '<div class="st"><b>' + todayN + '</b><span>今天 · 题</span></div>' +
        '<div class="st"><b>' + weekCount() + '</b><span>近 7 天 · 题</span></div>' +
        '<div class="st"><b>' + streak() + '</b><span>连续 · 天</span></div>' +
        '<div class="st"><b' + (pend.length ? ' class="warn"' : '') + '>' + pend.length + '</b><span>待改 · 题</span></div>' +
        '</div>';
      /* 七天柱：全是 0 的时候（新用户）它只是七根灰条，占 100px 什么也没说 */
      if (bars.some(function (b) { return b.n > 0; })) {
        html += '<div class="card tight">' +
          '<div class="spark">' + bars.map(function (b) {
            var h = Math.max(4, Math.round(b.n / maxBar * 56));
            return '<i class="' + (b.n ? 'on' : '') + '" style="height:' + h + 'px" title="' + C.esc(b.label + ' · ' + b.n + ' 题') + '">' +
              (b.n ? '<b>' + b.n + '</b>' : '') + '</i>';
          }).join('') + '</div>' +
          '<div class="spark-x">' + bars.map(function (b) { return '<span' + (b.label === '今天' ? ' class="on"' : '') + '>' + C.esc(b.label) + '</span>'; }).join('') + '</div>' +
          '</div>';
      }
    }

    html += '<div class="divider">这一章的图</div>' +
      '<div class="grid c2">' +
      '<button class="choice-card" data-go="#/map"><div class="t">打开导图</div><div class="s">一章一张，点一节才展开</div></button>' +
      '<button class="choice-card" data-go="#/toc"><div class="t">章节目录</div><div class="s">' +
      list.length + ' 节 · ' + haveDetail + ' 节知识点已细写</div></button>' +
      '</div>' +
      '<p class="quick-links">' +
      /* 判不了的题在这里给一个能点的入口：数字在第一行的「等你定 N 题」里，
         但首屏那一行的预算只够放主按钮，多一个 28px 的按钮就把主按钮推过 260px。 */
      (MC.store.lastEach().filter(function (r) { return r.final === 'manual'; }).length
        ? '<a href="#/retry">判不了的那几道</a><span>·</span>' : '') +
      '<a href="#/archive">档案</a><span>·</span><a href="#/thoughts">思想</a><span>·</span>' +
      '<a href="#/weak">哪里不稳</a><span>·</span><a href="#/evidence">依据总览</a></p>';

    if (recs.length) {
      /* 四个桶都必须露面：原来只印「做对 / 没做对」，12 条记录里 3 条判不了或空着交的
         既不出现也不说明，加不起来（4+5=9≠12）。这一行是读者核对总数的唯一地方。 */
      /* 分母按题算（每道题只看最后一次），和顶部「今天已做 N 题」同一把尺子。
         原来这行数记录条数：4 道题重练一遍变成 8 条，「做对 4 · 没做对 4 · 会做率 50%」，
         同一屏顶部却说「今天已做 4 题」—— 两个数打架，家长只会以为记录坏了。 */
      var last = MC.store.lastEach();
      var c = 0, w = 0, mn = 0, bl = 0;
      last.forEach(function (r) {
        /* 「判不了 · 你自己定的做对」不进做对桶：和目录页「独立做对」同一口径，
           否则今日页脚说做对 3、目录页说独立对 2，同一份数据两个数。 */
        if (C.selfJudged(r) === 'correct') { mn++; return; }
        if (r.final === 'correct') c++;
        else if (r.final === 'wrong') w++;
        else if (r.final === 'blank') bl++;
        else mn++;
      });
      var bits = ['做对 ' + c, '没做对 ' + w];
      if (bl) bits.push('交白卷或跳过 ' + bl);
      if (mn) bits.push('判不了 ' + mn);
      html += '<div class="card tight" style="margin-top:14px">' +
        '<div class="row between" data-stat="1" data-total="' + last.length + '" data-recs="' + recs.length +
        '" data-c="' + c + '" data-w="' + w + '" data-b="' + bl + '" data-m="' + mn + '">' +
        '<span class="muted">做过 ' + last.length + ' 道题 · 共 ' + recs.length + ' 条记录</span>' +
        '<span class="muted">' + bits.join(' · ') + ' · 会做率 ' +
        (c + w ? Math.round(c / (c + w) * 100) + '%' : '—') + '</span></div></div>';
    }
    html += '</div>';
    host.innerHTML = html;
    MC.shell.title('今日', { sub: '北京版初中数学' });

    /* startMixed 是函数调用不是链接，得在这里接管；用 onclick 不用 addEventListener，
       否则每次重渲染都叠一层监听，点一次跑好几遍。 */
    var dueList = due.map(function (x) {
      var sec = volOfSec(x.rec.sec);
      return { vol: x.rec.volume || (sec ? sec.vol : '801'), no: x.rec.sec, id: x.rec.item,
        title: (sec && sec.sec.title) || '' };
    });
    function selValue() {
      var s = document.getElementById('cur-sel');
      return s ? s.value : '';
    }
    host.onclick = function (e) {
      var one = e.target.closest ? e.target.closest('[data-one]') : null;
      if (one) {
        var id = one.getAttribute('data-one');
        var hit = dueList.filter(function (x) { return x.id === id; })[0];
        if (hit) { MC.practice.startMixed([hit]); return; }
      }
      var btn = e.target.closest ? e.target.closest('[data-act="review"]') : null;
      if (btn && dueList.length) { MC.practice.startMixed(dueList); return; }

      /* 换一节：只把选择器摊开，不重排整页 */
      var pick = e.target.closest ? e.target.closest('[data-act="pick"]') : null;
      if (pick) {
        var wrap = document.getElementById('pick-wrap');
        if (wrap) { wrap.hidden = !wrap.hidden; if (!wrap.hidden) { var s2 = document.getElementById('cur-sel'); if (s2) s2.focus(); } }
        return;
      }
      var ask = e.target.closest ? e.target.closest('[data-ask]') : null;
      if (!ask) return;
      var how = ask.getAttribute('data-ask');
      var st = settings();
      if (how === 'skip') { st.picked = true; saveSettings(st); render(host); return; }
      var v = selValue();
      if (!v) { C.toast && C.toast('先选一节'); return; }
      st.current = v; st.picked = true; saveSettings(st); render(host);
    };

    /* 题干回填：只对「还欠着的题」与「该抽回来看看」里出现过的节发一次请求 */
    fillStems(pend.concat(due.map(function (x) { return x.rec; })));

    /* 首次态的选择器：选完立刻生效，不用再点确认 */
    var askSel = document.getElementById('ask-sel');
    if (askSel) {
      askSel.addEventListener('change', function () {
        if (!askSel.value) return;
        var st = settings();
        st.current = askSel.value; st.picked = true; saveSettings(st); render(host);
      });
    }
  }

  MC.router.view('today', { render: render });
})();
