/* 练习：选路 → 作答 → 判题三态 → 提示留痕 → 结算。
   数据分开加载：sec（知识点/方法/错因）+ items（题目）。 */
(function () {
  'use strict';
  var MC = window.MC, C = MC.core, J = window.MCJudge;
  var BAND_CN = C.BAND_CN;
  var HINT_LADDER = ['none', 'L1_restate', 'L2_locate', 'L3_method', 'L4_first_step', 'full_solution'];
  var HINT_CN = {
    none: '没要提示', L1_restate: '提示1 · 重述题意', L2_locate: '提示2 · 去课本定位',
    L3_method: '提示3 · 方法方向', L4_first_step: '提示4 · 第一步', full_solution: '看了完整解析'
  };
  var REASONS = [
    ['concept', '概念没记清'], ['prerequisite_missing', '前面的知识缺了'],
    ['method_choice', '没想到用哪个方法'], ['step_logic', '中间某步推错了'],
    ['computation_symbol', '算错或符号弄错'], ['reading_modeling', '题意读错或不会建模'],
    ['expression', '会做但写得不规范'], ['guess_overconfidence', '蒙的，没把握']
  ];

  var S = null;
  var hostEl = null;

  /* 答案文本的清洗放在 core 里（三个页面共用），这里只留个短名字。 */
  var ansText = C.ansText;

  /* 方法边界原文是生成器拼的：「只覆盖「A、B」上的问题，不代表「C」的全部应用。」
     老师看得懂，孩子读不出该在哪停手。改成「只管这类题 / 换个问法它管不住」。 */
  function plainEdge(b) {
    var s = String(b || '').trim();
    /* 不再锚 ^：同一条句子在别处可能带 「边界：」「注意：」 这类前缀，
       锚死在开头就会漏改，原话直接印给孩子。 */
    var m = /只覆盖「(.+?)」上的问题[，,]?\s*不代表「(.+?)」的全部应用[。.]?/.exec(s);
    if (m) return '只在「' + m[1] + '」这类题上用；「' + m[2] + '」里换个问法，它就不一定管用。';
    var f = /^失效于[：:]?\s*(.+)$/.exec(s);
    if (f) return '下面这些情况它就不灵了：' + f[1];
    return s.replace(/^(边界|适用范围|注意)[：:]\s*/, '');
  }

  function fresh(vol, no, mode) {
    return {
      vol: vol, no: no, mode: mode || 'textbook',
      mixed: false, sec: null, items: {}, queue: [], idx: 0, phase: 'ask',
      hint: 'none', t0: 0, last: null, reasons: [], drawer: false,
      sessionRecs: [], draft: '', done: false, saveFailed: false
    };
  }

  function cur() { return S.items[S.queue[S.idx]] || null; }

  /* Where the back control should land. from is set when a knowledge point
     or method opened this page, so the graph panel can be restored. */
  function backTarget() {
    if (S && S.from) return S.from;
    if (S && S.mixed) return '#/today';
    return '#/sec/' + (S ? S.vol : '') + '/' + (S ? S.no : '');
  }

  function paintTitle(sub) {
    if (!S) return;
    if (S.mixed) {
      MC.shell.title('错题重练', { sub: sub || ('欠着的 ' + S.queue.length + ' 题'), back: '#/today' });
      return;
    }
    MC.shell.title((S.no || '') + ' ' + ((S.sec && S.sec.title) || ''), {
      sub: sub || (S.phase === 'look' ? '先看这一题' : '练习'),
      back: backTarget(),
      exact: !!S.from
    });
  }

  /* A single linked question is a look, not a section test.
     Scoring steps stay under the answer. They are {c, p}, not method steps
     {ordinal, action}. Reading action prints only the index, so the list
     becomes "1. 1 / 2. 2". stepBodies reads the sentence in c. */
  /* 换题/换范围这类「你要的没找到」的说明，一律印在卡片最上面一行，
     不能只在顶栏闪一下——读者滑到题目时已经不知道发生过什么。 */
  function noteBar() {
    return S && S.note ? '<p class="picknote">' + C.esc(S.note) + '</p>' : '';
  }

  function renderLook(it) {
    var steps = C.stepBodies(it.steps, it.note).map(function (s) {
      return '<li>' + C.mathHtml(s.body) + '</li>';
    }).join('');
    /* data-form 是给闸门用的：预览页要能被问一句「这题是不是选择题」，
       否则「选择题一个选项都没画」这种事故在 DOM 里看不出来（容器根本不存在）。 */
    hostEl.innerHTML = noteBar() + '<div class="card" data-form="' + C.esc(it.form || '') + '">' +
      '<div class="row between" style="margin-bottom:10px"><span class="muted">先看这一题，不做整节</span>' +
      '<span class="pill ' + C.esc(it.band || '') + '">' + C.esc(BAND_CN[it.band] || it.band || '') + '</span></div>' +
      '<div class="stem">' + C.mathHtml(it.stem || '') + '</div>' +
      /* 预览态也得把选项摊出来：数据里四个选项齐全，页面上却一个都没有，
         读者只能从解析里反推「选 B」。做题态渲染选项的那段在这里同样适用。 */
      (it.form === 'choice' && it.opts && it.opts.list && it.opts.list.length
        ? '<div class="opts is-look">' + it.opts.list.map(function (o, i) {
            /* 选项对象是 { key:'A', text:'$\\pm 4$' }——字段名是 text，不是 t。
               预览态只列出来给读者自己想，不标正确答案。 */
            return '<div class="opt"><b>' + C.esc(o.key || String.fromCharCode(65 + i)) + '</b>' +
              C.mathHtml(o.text || '') + '</div>';
          }).join('') + '</div>'
        : '') +
      '<details class="fold"><summary>看答案与思路</summary><div class="body">' +
      C.mathHtml(ansText(it.ans) || '这题答案还没入库') +
      (steps ? '<ol>' + steps + '</ol>' : '') +
      (it.note ? '<div class="muted">' + C.mathHtml(it.note) + '</div>' : '') +
      '</div></details>' +
      '<div class="toolbar">' +
      '<button class="btn btn-secondary" data-go="' + C.esc(backTarget()) + '">返回刚才的页</button>' +
      '<button class="btn btn-primary" data-act="do">做这一题</button>' +
      '</div></div>';
    paintTitle('先看这一题');
  }

  /* 能不能排进队列。两类不排：
     ① 选择题但选项没抽出来（题干里的 A–D 不在文字层，孩子看到卡片却是空的）；
     ② 必图题但既没有图也没有作图说明（没说清画什么，等于让他猜）。
     排除的数与原因要写在页面上，不能悄悄少题。 */
  function whyExcluded(it) {
    if (!it) return '';
    if (it.form === 'choice' && !(it.opts && it.opts.list && it.opts.list.length === 4)) return 'choice';
    if (it.need === 'required' && !(it.fig && String(it.fig.reason || '').trim())) return 'fig';
    return '';
  }
  function usable(it) { return !whyExcluded(it); }

  /* 错题重练是跨节的：每条题自己带 vol/sec/title（startMixed 注入 _vol/_sec/_secTitle/_ch），
     页头、四行卡、存档都不能再拿 S.vol / S.no 当「这一节」。 */
  function itVol(it) { return (it && it._vol) || S.vol; }
  function itSec(it) { return (it && it._sec) || S.no; }
  function itSecTitle(it) { return (it && it._secTitle) || (S.sec && S.sec.title) || itSec(it); }
  function itCh(it) {
    if (it && it._ch) return it._ch;
    if (S.sec && S.sec.chapter != null) return S.sec.chapter;
    var p = String(itSec(it) || '').split('.')[0];
    return /^[0-9]+$/.test(p) ? p : null;
  }

  function skillsOf() { return (S.sec && S.sec.skills) || []; }
  function mcsOf() { return (S.sec && S.sec.mcs) || []; }

  /* ---------- 选路 ---------- */
  function pick() {
    var ids = Object.keys(S.items);
    if (!ids.length) return [];
    /* 错题重练：队列就是孩子欠着的那批题，不再按难度配额挑——挑剩下就等于把错题绕过去了 */
    if (S.mixed) {
      S.excluded = { choice: 0, fig: 0 };
      var keep = [];
      ids.forEach(function (id) {
        var w = whyExcluded(S.items[id]);
        if (w) S.excluded[w]++; else keep.push(id);
      });
      return keep;
    }
    var hist = MC.store.secHistory(S.no);
    var recent = {};
    hist.slice(-6).forEach(function (r) { recent[r.item] = 1; });
    var wrong = [];
    hist.forEach(function (r) {
      if ((r.final === 'wrong' || r.final === 'blank') && ids.indexOf(r.item) >= 0) wrong.push(r.item);
    });

    var quota = S.mode === 'stretch'
      ? { advanced: 3, challenge: 2, competition: 1 }
      : { basic: 3, standard: 2, advanced: 1 };
    var seq = S.mode === 'stretch'
      ? ['advanced', 'advanced', 'challenge', 'advanced', 'challenge', 'competition']
      : ['basic', 'basic', 'standard', 'basic', 'standard', 'advanced'];

    var used = {}, out = [];
    var n = 2;
    while (n > 0 && wrong.length) {
      var id = wrong.pop();
      if (used[id] || recent[id]) continue;
      used[id] = 1; out.push(id); n--;
      var b = (S.items[id] || {}).band;
      if (quota[b] !== undefined) quota[b] = Math.max(0, quota[b] - 1);
    }
    var byBand = {};
    S.excluded = { choice: 0, fig: 0 };
    ids.forEach(function (id) {
      var it = S.items[id] || {};
      var why = whyExcluded(it);
      if (why) { S.excluded[why]++; return; }
      if (used[id] || recent[id]) return;
      if (it.need === 'required') return;      /* 必图题不进抽取，兜底时才用 */
      var bb = it.band || 'basic';
      (byBand[bb] = byBand[bb] || []).push(id);
    });
    if (!hist.length) Object.keys(byBand).forEach(function (bb) { byBand[bb].sort(); });
    seq.forEach(function (bb) {
      if (!quota[bb] || quota[bb] <= 0) return;
      var arr = byBand[bb];
      if (!arr || !arr.length) return;
      var pickId = arr.shift();
      used[pickId] = 1; quota[bb]--; out.push(pickId);
    });
    var rest = ids.filter(function (id) { return !used[id] && usable(S.items[id]); });
    rest.sort(function (a, b) {
      var ra = (S.items[a] || {}).need === 'required' ? 1 : 0;
      var rb = (S.items[b] || {}).need === 'required' ? 1 : 0;
      return ra - rb;
    });
    for (var i = 0; i < rest.length && out.length < 6; i++) { used[rest[i]] = 1; out.push(rest[i]); }
    return out.slice(0, 6);
  }

  /* ---------- 渲染 ---------- */
  function dots() {
    var s = '';
    for (var i = 0; i < S.queue.length; i++) s += '<i class="' + (i < S.idx ? 'on' : '') + '"></i>';
    return '<span class="dots">' + s + '</span>';
  }

  function renderPractice() {
    var it = cur();
    if (!it) { S.done = true; return renderSummary(); }
    if (S.phase === 'look') return renderLook(it);
    var html = noteBar() + '<div class="card">' +
      '<div class="row between" style="margin-bottom:10px"><span class="muted">第 ' + (S.idx + 1) + ' / ' + S.queue.length + ' 题' + dots() + '</span>' +
      '<span class="row" style="gap:6px">' +
        /* 来源与难度都用中文短词（「基础」「中档」），撞车时只留一个，
           否则顶栏会出现两个一模一样的徽章。 */
        (it.src && it.src !== (BAND_CN[it.band] || it.band) ? '<span class="pill">' + C.esc(it.src) + '</span>' : '') +
        '<span class="pill ' + C.esc(it.band) + '">' + (BAND_CN[it.band] || it.band) + '</span>' +
        (it.purpose ? '<span class="pill" title="' + C.esc(it.purpose.why || '') + '">' +
          C.esc(C.PURPOSE_CN[it.purpose.p] || it.purpose.p) + '</span>' : '') + '</span></div>' +
      '<div class="stem">' + C.mathHtml(it.stem) + '</div>';

    var hasOpts = !!(it.opts && it.opts.list && it.opts.list.length === 4);
    if (it.need === 'required') {
      var why = (it.fig && String(it.fig.reason || '').trim()) || '';
      html += '<div class="figbar"><input type="checkbox" id="drew"><label for="drew">' +
        C.esc(why || '原题有图，本机没存') + ' —— 我在纸上画好了</label></div>';
    }
    if (hasOpts) {
      var key = it.opts.key || '';
      /* 有四个选项却没有答案键（全库 17 道），点哪个都判不了，只能自评。
         不提前说，孩子会以为程序坏了。 */
      if (!key && S.phase !== 'judged') {
        html += '<p class="picknote">这道题的参考答案没入库，选完你自己对着看对不对。</p>';
      }
      /* 判完之后选项不再是操作对象，只是「我刚才选了什么、正确的是什么」的对照，
         所以压扁成小字行——不压就要占掉 400px，把答案和诊断全推出一屏。 */
      html += '<div class="opts' + (S.phase === 'judged' ? ' is-done' : '') + '">' + it.opts.list.map(function (o) {
        var cls = 'opt';
        if (S.phase === 'judged' && S.last) {
          if (key && o.key === key) cls += ' opt-ok';
          if (S.last.stu === o.key && o.key !== key) cls += ' opt-bad';
        } else if (S.draft === o.key) cls += ' opt-sel';
        return '<button class="' + cls + '" data-opt="' + o.key + '"' +
          (S.phase === 'judged' ? ' disabled' : '') + '>' +
          '<b>' + o.key + '</b><span>' + C.mathHtml(o.text) + '</span></button>';
      }).join('') + '</div>' +
        (S.phase === 'judged' && !key
          ? '<div class="muted" style="margin-top:6px">这道题的参考答案不是选项字母，我不替你判对错，你自己对着看。</div>'
          : '');
    } else {
      html += '<textarea class="answer" id="ans" placeholder="把过程写下来，或者只写最后答案。空着也能交（会记成「没做」）"></textarea>';
    }
    /* 判完之后这一屏的主行动是「下一题」。原来三个按钮原样摆着，判完对错后
       没有往前走的路，只能先点「看答案」再往下滚（实测一天撞 6 次）。
       「跳过」只在还没判的时候成立，判完就不再给。 */
    html += '<div class="toolbar">' +
      '<button class="btn btn-secondary" data-act="hint">提示</button>' +
      (S.phase === 'judged'
        ? ''
        : '<button class="btn btn-secondary" data-act="next">跳过</button>' +
          '<button class="btn btn-primary" data-act="submit">交卷</button>') +
      '</div>' +
      /* 排题说明得说人话：原来写「选项没认出来」「图没配全」，那是入库记录的口吻，
         孩子读不懂也不知道该不该管。改成「点不了 / 画不出来」，并说明这不是他的问题。 */
      /* 节级排题说明只在第一题说一次：它是整节的事实，6 道题各印一遍要吃掉 312px */
      (S.idx === 0 && S.excluded && (S.excluded.choice || S.excluded.fig)
        ? '<div class="muted" style="margin-top:8px">' + (S.mixed ? '这一批还有 ' : '这一节还有 ') +
          (S.excluded.choice ? S.excluded.choice + ' 道题的选项印在图上、点不了，' : '') +
          (S.excluded.fig ? S.excluded.fig + ' 道题的图没画出来，' : '') +
          '这次先不排进来 —— 不是你的问题。</div>'
        : '') + '</div>';
    /* 判完之后人只想做一件事：看一眼答案，或者往前走。这一步必须在首屏就能点到——
       实测判错一次，结果卡 965px 高，「看答案」被推到 1400px、视口只有 932px，
       首屏唯一能点的按钮是「提示」，等于把读者堵在错题上。所以动作条紧跟在选项后面、结果卡前面，
       详细诊断（卡在哪 / 先得会 / 哪一步错）留在下面慢慢看。 */
    if (S.phase === 'judged' && S.last) {
      html += '<div class="act-strip">' +
        (S.last.showAnswer ? '' : '<button class="btn btn-secondary" data-act="show-answer">看答案</button>') +
        '<button class="btn btn-primary" data-act="next">' +
        (S.idx + 1 >= S.queue.length ? '看这一组的结果' : '下一题') + '</button></div>';
    }
    if (S.phase === 'judged' && S.last) html += resultBar(it);
    if (S.drawer) html += drawer(it);
    html += '<div class="footer"><button class="btn btn-ghost" data-act="quit">今天就到这儿</button></div>';

    hostEl.innerHTML = html;
    paintTitle();
    var ta = document.getElementById('ans');
    if (ta) {
      ta.value = S.phase === 'judged' && S.last ? (S.last.stu || '') : S.draft;
      ta.readOnly = S.phase === 'judged';
      if (S.phase === 'ask') { try { ta.focus(); } catch (e) {} }
      ta.addEventListener('input', function () { if (S.phase === 'ask') S.draft = ta.value; });
    }
  }

  /* 没有点级映射时的节级兜底：从 S.sec（节切片）派生「这一节要先会」与「这一节的常见做法」。
     题→知识点的高置信映射目前只有第 12 章的 243 题，其余题若什么都不给，
     等于明知这一节有 6 个点、3 条方法却装作不知道。但必须标明「整节共通」，
     把一节的通用信息说成这题的考点，就是假精度。 */
  function secHints() {
    if (S._hints !== undefined) return S._hints;
    var sec = S.sec || {}, kps = sec.kps || [], sk = {};
    (sec.skills || []).forEach(function (s) { sk[s.uid] = s; });
    var pre = {}, pord = [], m = {}, mord = [], mc = {};
    kps.forEach(function (p) {
      (p.prereqs || []).forEach(function (r) {
        if (!r || !r.uid) return;
        if (!pre[r.uid]) { pre[r.uid] = { uid: r.uid, name: r.name, n: 0 }; pord.push(r.uid); }
        pre[r.uid].n++;
      });
      (p.methods || []).forEach(function (u) {
        if (!sk[u]) return;
        if (!m[u]) { m[u] = sk[u]; mord.push(u); mc[u] = 0; }
        mc[u]++;
      });
    });
    /* 整节里被越多点共用的先修点，越可能是这一节的入口：按出现次数降序 */
    pord.sort(function (a, b) { return pre[b].n - pre[a].n; });
    mord.sort(function (a, b) { return mc[b] - mc[a]; });
    S._hints = { pre: pord.slice(0, 3).map(function (u) { return pre[u]; }),
                 m: mord.slice(0, 2).map(function (u) { return m[u]; }) };
    return S._hints;
  }

  /* 交卷后的四行卡（spec §6.4）。只在 wrong / manual 出现，不铺七段全文：
     卡在哪 → 先得会 → 做法 → 回到图上。没有映射就老实说「只知道在这一节」，
     不链一个猜出来的点。 */
  function fourRows(it) {
    var k = (it.kps || [])[0];
    var name = k ? C.clipMath(k.name || k.uid, 26) : '';
    var h = '<div class="four">';
    /* 一屏读不完的错因等于没写：做法说明、边界、整节提示折进「看完整诊断」，
       首屏只留四行的骨架（卡在哪 / 先得会 / 做法 / 回到图上）。 */
    var more = '';
    h += '<div class="four-row"><span class="four-lbl">卡在哪</span><div>' +
      (k ? '<a href="#/kp/' + encodeURIComponent(k.uid) + '">' + C.mathHtml(name) + '</a>'
         : '这道题还没标到具体知识点，<a href="#/sec/' + itVol(it) + '/' + itSec(it) + '">' +
           '先看这一节：' + C.esc(itSecTitle(it)) + '</a>') +
      '</div></div>';
    /* 没有知识点就不写「先得会 / 做法」两行：那时我们其实不知道它考哪一步，
       写「没有更早的点」「还没挂方法」会把「不知道」说成「确定没有」，是假精度。 */
    if (k) {
    var pre = k.pre || [];
    h += '<div class="four-row"><span class="four-lbl">先得会</span><div>' +
      (pre.length ? pre.map(function (p) {
        /* 名字本身就是半句定义（「平方根定义：若x²=a(a≥0)，则x是a的平方根」），
           26 字常在公式中间断掉；给到 32 字并留 title，鼠标停上去能看全。 */
        return '<a href="#/kp/' + encodeURIComponent(p.uid) + '" title="' + C.esc(C.plain(p.name || p.uid)) + '">' +
          C.mathHtml(C.clipMath(p.name || p.uid, 32)) + '</a>';
      }).join(' · ') : '<span class="muted">没有更早的点</span>') +
      ' · <a href="#/rel/' + encodeURIComponent(k.uid) + '">它跟前后哪些点有关</a>' +
      '</div></div>';
    var m = k && k.m1;
    if (m && (m.desc || m.b)) {
      more += (m.desc ? '<div>' + C.mathHtml(m.desc) + '</div>' : '') +
        (m.b ? '<div class="muted" style="margin-top:6px">什么时候不管用：' + C.mathHtml(plainEdge(m.b)) + '</div>' : '');
    }
    h += '<div class="four-row"><span class="four-lbl">做法</span><div>' +
      (m ? '<b>' + C.mathHtml(m.name || m.uid) + '</b>' +
           (m.desc || m.b ? '<span class="muted"> · 展开看怎么用</span>' : '')
         : '<span class="muted">这个点还没挂方法</span>') +
      '</div></div>';
    } else {
      var sh = secHints();
      if (sh.pre.length) {
        more += '<div><span class="muted">这一节先得会：</span>' +
          sh.pre.map(function (p) {
            var nm = C.plain(p.name || p.uid);
            return '<a href="#/kp/' + encodeURIComponent(p.uid) + '" title="' + C.esc(nm) + '">' +
              C.mathHtml(C.clipMath(p.name || p.uid, 14)) + '</a>';
          }).join(' · ') +
          ' <span class="muted">整节共通，不是这题专考</span></div>';
      }
      if (sh.m.length) {
        more += '<div style="margin-top:6px"><span class="muted">这一节的常见做法：</span>' +
          sh.m.map(function (m) {
            return '<b>' + C.mathHtml(C.clipMath(m.name || m.uid, 22)) + '</b>' +
              (m.desc ? '<div class="muted" style="margin-top:2px">' + C.mathHtml(m.desc) + '</div>' : '');
          }).join('') + ' <span class="muted">整节共通</span></div>';
      }
    }
    if (more) {
      h += '<div class="four-row"><span class="four-lbl">怎么用</span><div>' +
        '<details class="fold"><summary>看完整诊断</summary>' +
        '<div class="body">' + more + '</div></details></div></div>';
    }
    var q = '#/map?vol=' + itVol(it) + '&sec=' + encodeURIComponent(itSec(it));
    var _ch = itCh(it);
    if (_ch != null) q += '&ch=' + _ch;
    if (k) q += '&node=' + encodeURIComponent(k.uid);
    h += '<div class="four-row"><span class="four-lbl">回到图上</span><div>' +
      '<a href="' + q + '">在图上看' + (k ? '这个点' : '这一节') + '</a></div></div>';
    h += '</div>';
    return h;
  }

  function resultBar(it) {
    var L = S.last, v = L.final;
    var selfPick = L.selfPicked;
    var head = { correct: '对了', wrong: '这题不对', manual: '这题我判不了', blank: '这道没做' }[v] || '记录好了';
    /* 自评（判不了的题自己点了对错）：标题不能只写「对了」——那和判题器判对
       长得一样，孩子会以为这题算独立做对了。改成「判不了 · 你自己定的」。 */
    if (selfPick === 'correct') head = '判不了 · 你定的是做对了';
    else if (selfPick === 'wrong') head = '判不了 · 你定的是做错了';
    var TAG = {
      exact: '自动判', bag: '自动判 · 多答案', manual: '判不了 · 等你定',
      'spec-exact': '按结构化答案判', 'spec-set': '按结构化答案判 · 多值',
      'spec-interval': '按结构化答案判 · 取值范围', 'spec-judge': '按结构化答案判 · 结论',
      'spec-manual': '判不了 · 等你定', 'spec-blank': ''
    };
    /* 自评过的题标签写「判不了 · 你自己定的」——原来写「需要你确认」，
       页面上一半说「对了」一半说「需要你确认」，用户没法知道到底算不算。 */
    var tag = selfPick ? '判不了 · 你自己定的' : (TAG[L.how] || '');
    var cls = selfPick ? 'manual' : (['correct', 'wrong', 'manual', 'blank'].indexOf(v) >= 0 ? v : 'blank');
    var html = '<div class="result ' + cls + '"><div class="head"><span>' + head + '</span><span class="tag">' + C.esc(tag) + '</span></div>';
    /* 判对了却不写进本地库，是比判错更坏的一种假象：报告、掌握度、导出全都跟着少一条 */
    if (S.saveFailed) {
      html += '<div class="savebad">这道题没存上（浏览器本地空间满了）。先到「带走与带回来」里导出一次，再清一清旧的。</div>';
    }
    if (v === 'manual') {
      html += '<div class="muted" style="margin-top:6px">参考答案和你写的不完全一样，但我不敢替你判错。你看一眼：</div>' +
        '<div class="btn-row"><button class="btn btn-secondary" data-act="self" data-v="correct">我做对了</button>' +
        '<button class="btn btn-secondary" data-act="self" data-v="wrong">我做错了</button></div>' +
        '<div class="muted" style="margin-top:4px;font-size:var(--fs-xs)">自己定的不算独立做对、不进「已掌握」——想让它算，重做一遍这题。</div>';
    }
    if (L.selfPicked) {
      html += '<div class="muted" style="margin-top:4px;font-size:var(--fs-xs)">这是你自己定的，不算独立做对，也不进「已掌握」。目录页和结算都按「判不了」单列。</div>' +
        '<div class="btn-row"><button class="btn btn-ghost" data-act="self-undo">改回「判不了」</button></div>';
    }
    /* 判不了（manual）时先不铺四行卡：一边说「我不敢替你判错」，一边把「你卡在哪、
       先得会什么、该怎么做」全摆出来，等于抢在用户之前把他判成错的。只有真的错了，
       或用户自己点了「我做错了」，才给这四行。 */
    if (v === 'wrong') html += fourRows(it);
    if (v === 'wrong' || (v === 'manual' && S.last.final === 'wrong')) {
      var mcs = mcsOf().slice(0, 3);
      if (mcs.length) {
        html += '<details class="fold"><summary>标一下错因（可多选，不选也行）</summary><div class="body">' +
        '<div class="muted">这一节常卡在：</div><div class="chips">';
        mcs.forEach(function (m) {
          var on = S.reasons.indexOf(m.uid) >= 0;
          html += '<button class="chip' + (on ? ' on' : '') + '" data-act="reason" data-k="' + C.esc(m.uid) + '">' +
            C.mathHtml(C.clipMath((m.signals || [''])[0], 30)) + '</button>';
        });
        html += '</div>';
      }
      html += '<div class="muted" style="margin-top:8px">哪儿出的问题？</div><div class="chips">';
      REASONS.forEach(function (r) {
        var on = S.reasons.indexOf(r[0]) >= 0;
        html += '<button class="chip' + (on ? ' on' : '') + '" data-act="reason" data-k="' + r[0] + '">' + r[1] + '</button>';
      });
      html += '</div></div></details>';
    }
    // 这题考哪条知识点：判完才显示，练习中提前看到等于泄题；
    // 只有高置信映射才有这条（词表法 auto 档，见 tools/questions_kp_map.py）
    if (it.kps && it.kps.length) {
      html += '<div class="kp-of">这题考：' +
        it.kps.map(function (t) {
          // 12 章的标题是「方法：要点」的长句，直接摆出来等于把解法摆给刚做错的人看，
          // 所以只取冒号前的方法名
          var nm = String(t.name || t.uid).split('：')[0];
          return '<a href="#/kp/' + encodeURIComponent(t.uid) + '">' + C.esc(C.clip(nm, 18)) + '</a>';
        }).join(' · ') + '</div>';
    }
    if (S.last.showAnswer) {
      html += '<div class="answer-block"><div class="lbl">答案</div>' + C.mathHtml(ansText(it.ans) || '（这题答案没入库）') + '</div>';
      if (it.note) html += '<div class="answer-block"><div class="lbl">说明</div>' + C.mathHtml(it.note) + '</div>';
      var scoreSteps = C.stepBodies(it.steps, it.note);
      if (scoreSteps.length) {
        html += '<div class="answer-block"><div class="lbl">分步评分点</div>' + scoreSteps.map(function (s, i) {
          return '<div class="step"><span class="i">' + (i + 1) + '</span><span>' + C.mathHtml(s.body) +
            (s.p != null && s.p !== '' ? ' <span class="muted">' + s.p + ' 分</span>' : '') + '</span></div>';
        }).join('') + '</div>';
      }
    }
    html += '<div class="muted" style="margin-top:10px">提示：' + C.esc(HINT_CN[S.last.hint] || HINT_CN.none) +
      (S.last.hint !== 'none' ? '（记下了，做对算「带提示通过」）' : '') + '</div></div>';
    return html;
  }

  function hintAvailable(lv) {
    var it = cur(); if (!it) return false;
    if (lv === 'L3_method') return !!it.note || skillsOf().length > 0;
    if (lv === 'L4_first_step') return !!it.ans;
    return true;
  }

  function drawer(it) {
    var html = '<div class="scrim" data-act="close-drawer"></div><div class="drawer"><div class="in">' +
      '<h2>要一点提示？</h2><div class="muted">从轻到重。每一级都会记下来。</div><div class="grid">';
    [['L1_restate', '重述题意'], ['L2_locate', '去课本定位'], ['L3_method', '方法方向'], ['L4_first_step', '给第一步']].forEach(function (c) {
      if (!hintAvailable(c[0])) return;
      /* 「已看」按这一级本身记，不按阶梯高低推：直接点「看完整解析」时，
         阶梯上 L1-L4 一级都没用过，原来会全部显示「已看」——那是在替用户记假账。 */
      var used = !!(S.hintSeen && S.hintSeen[c[0]]);
      html += '<button class="btn' + (used ? ' used' : '') + '" data-act="use-hint" data-lv="' + c[0] + '">' +
        c[1] + (used ? ' · 已看' : '') + '</button>';
    });
    /* 第五个按钮（看完整解析）原来摆在栅格外面，抽屉里就成了 4 格 + 1 条尾巴：
       栅格是双列，四格刚好铺满，尾巴另起一行还是只占半行。放进同一个栅格并整行铺满，
       五个按钮一套栅格（手机单列时它自然也是整行）。 */
    if (hintAvailable('full_solution') && S.hint !== 'full_solution') {
      html += '<button class="btn wide" data-act="use-hint" data-lv="full_solution">看完整解析（会记成「看了答案」）</button>';
    }
    html += '</div>';
    var box = hintText(it, S.hint);
    if (box) html += '<div class="hintbox">' + box + '</div>';
    html += '<button class="btn btn-secondary close" data-act="close-drawer">收起来，我自己想</button></div></div>';
    return html;
  }

  function hintText(it, lv) {
    if (lv === 'L1_restate') return '先合上书，把题目用自己的话说一遍：它给了什么，要你求什么。说不清就先别算。';
    if (lv === 'L2_locate') return '这题在【' + C.esc(itSec(it)) + ' ' + C.esc(itSecTitle(it)) + '】。翻到课本这一节，看定义和第一个例题，再回来。';
    if (lv === 'L3_method') {
      var sk = skillsOf();
      if (sk.length) {
        var h = '<div class="muted">这一节常用的方法——先选一个，再动手：</div>';
        sk.forEach(function (m) {
          h += '<div style="margin-top:6px"><b>' + C.mathHtml(m.name) + '</b>';
          if (m.steps && m.steps.length) {
            h += '<div class="muted" style="margin-top:2px">' + m.steps.map(function (x) { return C.mathHtml(x.action); }).join(' → ') + '</div>';
          }
          h += '</div>';
        });
        if (it.note) h += '<div class="muted" style="margin-top:8px">本题提示：' + C.mathHtml(C.firstSentence(it.note, 80)) + '</div>';
        return h;
      }
      return it.note ? C.mathHtml(C.firstSentence(it.note, 80)) : '';
    }
    if (lv === 'L4_first_step') return it.ans ? '第一步大致是：' + C.mathHtml(C.firstSentence(it.ans, 50)) : '';
    if (lv === 'full_solution') return C.mathHtml(ansText(it.ans) || '（这题答案没入库）');
    return '';
  }

  function renderSummary() {
    var recs = S.sessionRecs || [];
    var c = 0, w = 0, m = 0, b = 0, bSkip = 0, bEmpty = 0, hinted = 0, weak = [], ok = [], todo = [];
    /* 判不了的题里，孩子自己点了对错的，单独一列（selfOk / selfNo）：
       它们不进 c、不进「已掌握」，也不在「做对」那个数里 —— 与目录页
       「带提示做对的不算独立做对」同一个口径。 */
    var selfOk = [], selfNo = [];
    S.queue.forEach(function (id) {
      var r = null;
      for (var i = recs.length - 1; i >= 0; i--) if (recs[i].item === id) { r = recs[i]; break; }
      if (!r) { todo.push(id); return; }
      var sj = C.selfJudged(r);
      if (sj === 'correct') { selfOk.push(id); return; }
      if (sj === 'wrong') { selfNo.push(id); weak.push(id); w++; return; }
      if (r.final === 'correct') { c++; if (r.hint !== 'none') hinted++; ok.push(id); }
      else if (r.final === 'wrong') { w++; weak.push(id); }
      else if (r.final === 'blank') {
        b++; todo.push(id);
        /* 主动跳过（how=skip）与空着交卷（letter-blank / spec-blank）不是一件事：
           前者是没遇到，后者是遇到了不会做。下面三种说法各说各的。 */
        if (C.blankKind(r) === 'skip') bSkip++; else bEmpty++;
      }
      else { m++; }
    });
    var selfN = selfOk.length + selfNo.length;
    /* 做完一组的下一步：顺着教材走，而不是每次都回目录 */
    var nbNext = (!S.mixed && MC.neighborsOf) ? (MC.neighborsOf(S.vol, S.no).next || null) : null;
    /* 结算那句话必须和下面三个数说得一样。原来 c+w=0 时一律写「都记成了自己看」，
       可是跳过记的是 blank、判不了记的是 manual，没有一条被记成「自己看」——
       孩子明明跳过，页面却告诉他看过了。分四种情况写。 */
    var bWords = (bSkip ? '跳过 ' + bSkip + ' 道' : '') + (bSkip && bEmpty ? '、' : '') +
      (bEmpty ? '交了 ' + bEmpty + ' 道空白卷' : '');
    var lead;
    if (c + w) {
      lead = '会做的 ' + c + ' 道，没做对的 ' + w + ' 道。';
      if (selfN) lead += ' 另有 ' + selfN + ' 道判不了、你自己定的，不算独立做对。';
      if (m) lead += ' 还有 ' + m + ' 道我判不了，等你标一下。';
      if (b) lead += ' ' + bWords + '。';
    } else if (selfN && !m) {
      lead = '这一组 ' + selfN + ' 道判不了的题由你自己定了对错。判题器没结论，就不算独立做对，也不进「已掌握」。';
      if (b) lead += ' 另外' + bWords + '。';
    } else if (m) {
      lead = '这一组 ' + m + ' 道我都判不了：参考答案和你写的不一样，我看不出对不对，得你自己对一眼。';
      if (b) lead += ' 另外' + bWords + '。';
    } else if (b) {
      lead = bEmpty
        ? ('这一组交了 ' + bEmpty + ' 道空白卷' + (bSkip ? '、跳过 ' + bSkip + ' 道' : '') + '：遇上了但没做出来，不算没遇到。')
        : ('这一组 ' + bSkip + ' 道全跳过了，一道都还没遇到。');
    } else {
      /* 一道都没交卷就得说清楚是「没交卷」，不能写「还没开始做」——
         用户可能已经做了几道但中途退出，那也不该被说成什么都没发生。 */
      lead = '这一组 ' + (S.queue.length || 0) + ' 道都没交卷，还没开始算。';
    }
    var thirdK = (m && b) ? '判不了 / 没做' : (m ? '判不了' : (bEmpty && !bSkip ? '交了白卷' : (bSkip && !bEmpty ? '跳过' : '没做')));
    var html = '<h1>这一组做完了</h1>' +
      '<p class="lead">' + lead + '</p>' +
      '<div class="statgrid">' +
      '<div class="stat"><div class="n">' + c + '</div><div class="k">做对</div></div>' +
      '<div class="stat"><div class="n">' + w + '</div><div class="k">没做对</div></div>' +
      '<div class="stat"><div class="n">' + (m + b) + '</div><div class="k">' + thirdK + '</div></div></div>';
    /* 判不了、你自己定的那几道在结算小结里单列一行：不并进「做对」，也不假装没发生 */
    if (selfN) {
      html += '<div class="self-row" data-self="' + selfN + '" data-selfok="' + selfOk.length + '">' +
        '<b>判不了 · 你自己定的 ' + selfN + ' 道</b>' +
        '<span class="muted">你定为做对 ' + selfOk.length + ' 道、定为做错 ' + selfNo.length +
        ' 道。判题器没下结论，这些不算独立做对、不进「已掌握」；重做一遍做对了才算。</span></div>';
    }
    if (weak.length) {
      var selfNoSet = {};
      selfNo.forEach(function (id) { selfNoSet[id] = 1; });
      html += '<div class="card"><h2>待巩固 · ' + weak.length + ' 道</h2><p class="muted">这些下次先做。</p>' +
        weak.map(function (id) {
          var it = S.items[id] || {};
          return '<div class="kv"><span>' + C.esc(itSec(it)) + ' · ' + (BAND_CN[it.band] || '') + (selfNoSet[id] ? ' · 判不了（你定为做错）' : '') + '</span>' +
            '<button class="btn btn-ghost" data-act="review" data-id="' + C.esc(id) + '">看原题</button></div>';
        }).join('') + '</div>';
    }
    if (ok.length) {
      /* 已掌握只收判题器判对的题（含带提示的，另注明）；判不了自定的不在这里 */
      html += '<details class="fold"><summary>已掌握 · ' + ok.length + ' 道' + (hinted ? '（其中 ' + hinted + ' 道带提示）' : '') +
        '</summary><div class="body">' + ok.map(function (id) {
          var it = S.items[id] || {};
          return C.esc(itSec(it)) + ' · ' + (BAND_CN[it.band] || '') + '<br>';
        }).join('') + '</div></details>';
    }
    if (todo.length) {
      /* 折叠行原来一律写「其中跳过 b 道」，可 b 里也含空着交卷的题；
         和上面 stat 格的口径拆开写，孩子才知道那 N 道里哪几道是跳过、哪几道是交了白卷。 */
      html += '<details class="fold"><summary>没做 · ' + todo.length + ' 道' +
        (b ? '（' + (bSkip ? '跳过 ' + bSkip + ' 道' : '') + (bSkip && bEmpty ? '、' : '') +
          (bEmpty ? '交了白卷 ' + bEmpty + ' 道' : '') + '）' : '') + '</summary><div class="body">' +
        todo.map(function (id) { var it = S.items[id] || {}; return C.esc(itSec(it)) + ' · ' + (BAND_CN[it.band] || ''); }).join('<br>') +
        '</div></details>';
    }
    /* 结算页是一个决策点，不是一列等价选项：原来「接下来」四张卡长得一模一样，
       整屏一处主按钮都没有。把最该走的那一步标成主按钮——
       普通一节是「再来一组」，错题重练是「还有欠着的题」（都清完了才轮到回今日）。 */
    var hasDebt = (w + bSkip + bEmpty) > 0;
    html += '<div class="card"><h2>接下来</h2>' +
      (S.mixed
        ? (hasDebt
          ? '<button class="choice-card btn-primary" data-go="#/retry"><div class="t">还有欠着的题</div><div class="s">回去看还差哪些</div></button>' +
            '<button class="choice-card" data-go="#/today"><div class="t">回今日</div><div class="s">看这一周的进度</div></button>'
          : '<button class="choice-card btn-primary" data-go="#/today"><div class="t">回今日</div><div class="s">这一组都清完了</div></button>' +
            '<button class="choice-card" data-go="#/retry"><div class="t">看还欠着什么</div><div class="s">确认没有剩下的</div></button>')
        : (S.from ? '<button class="choice-card" data-go="' + C.esc(S.from) + '"><div class="t">返回刚才看的页</div><div class="s">知识点或方法还在</div></button>' : '') +
          '<button class="choice-card btn-primary" data-act="again"><div class="t">再来一组</div><div class="s">同一节，换个挑选</div></button>' +
          '<button class="choice-card" data-go="#/sec/' + S.vol + '/' + S.no + '"><div class="t">看这一节的知识点</div><div class="s">定义、条件、方法、错因</div></button>') +
      (nbNext ? '<button class="choice-card" data-go="#/' + (nbNext.q ? 'practice' : 'sec') + '/' + S.vol + '/' + nbNext.no + '">' +'<div class="t">下一节 · ' + C.esc(nbNext.no) + '</div><div class="s">' +C.esc(nbNext.title || '') + (nbNext.q ? ' · 接着练' : ' · 还没有题') + '</div></button>' : '') +
      '<button class="choice-card" data-go="#/toc"><div class="t">换一节</div><div class="s">回目录</div></button></div>';
    hostEl.innerHTML = '<div class="wrap">' + html + '</div>';
    MC.shell.title('这一组做完了', S.mixed
      ? { sub: '错题重练', back: '#/retry' }
      : { sub: S.no, back: backTarget(), exact: !!S.from });
  }

  /* ---------- 动作 ---------- */
  function record(extra) {
    var it = cur(); if (!it || !S.last) return;
    /* 同一道题的后续动作（看答案 / 勾错因 / 自评 / 跳过）必须覆盖同一条记录：
       每条都生成新 uid 的话，store.replaceLast 按 uid 比永远不命中，点一次
       「看答案」就多一条 —— 档案页「总作答 7」对目录页「做过 2」。 */
    var prevRec = S.sessionRecs[S.sessionRecs.length - 1];
    var sameItem = !!(prevRec && prevRec.item === it.id);
    var rec = {
      schema_version: 1,
      uid: (sameItem && prevRec.uid) ? prevRec.uid : ('EV-' + it.id + '-' + Date.now().toString(36)),
      item: it.id, sec: itSec(it), band: it.band, ts: Date.now(),
      verdict: S.last.verdict, final: S.last.final, how: S.last.how,
      hint: S.last.hint, seconds: Math.max(0, Math.round((Date.now() - S.t0) / 1000)),
      stu: S.last.stu, ref: S.last.refTokens || [], reasons: S.reasons.slice(),
      volume: itVol(it), chapter: itCh(it)
    };
    if (extra) for (var k in extra) rec[k] = extra[k];
    /* self 字段跟着 S.last.selfPicked 走：勾错因、看答案这些后续动作会重写同一条记录，
       不带上就会把「你自己定的」洗成「自动判对」，独立做对又多一道。 */
    if (rec.self === undefined) {
      rec.self = (S.last.selfPicked === 'correct' || S.last.selfPicked === 'wrong')
        ? S.last.selfPicked : 'none';
    }
    var last = S.sessionRecs[S.sessionRecs.length - 1];
    var ok;
    if (last && last.item === rec.item) {
      S.sessionRecs[S.sessionRecs.length - 1] = rec;
      ok = MC.store.replaceLast(rec);
    } else {
      S.sessionRecs.push(rec);
      ok = MC.store.push(rec);
    }
    /* 写失败（几乎都是容量满）必须说出来：这一题就这样丢了，家长导出时会少一条 */
    S.saveFailed = (ok === false);
    return ok;
  }

  function submit() {
    var it = cur(); if (!it) return;
    if (S.phase === 'judged') return;   /* 已判过就不再判一遍（连点两下的护栏） */
    var ta = document.getElementById('ans');
    var stu = ta ? ta.value : S.draft;
    var hasOpts = !!(it.opts && it.opts.list && it.opts.list.length === 4);
    var res;
    if (hasOpts) {
      /* 选择题只走字母路径：点选的字母与从答案里抽出的字母比。
         抽不出字母（答案写的是内容不是选项）就 manual —— 不拿数值判题去碰字母。 */
      var pick = (stu && /^[A-D]$/.test(stu)) ? stu : '';
      var key = it.opts.key || '';
      if (!pick) res = { verdict: 'blank', how: 'letter-blank' };
      else if (!key) res = { verdict: 'manual', how: 'letter-manual' };
      else res = { verdict: pick === key ? 'correct' : 'wrong', how: 'letter' };
    } else if (J && J.judgeWithSpec) {
      /* 有结构化答案（spec）就按 spec 判，判不了再退回答案文本抽取 */
      res = J.judgeWithSpec(it.spec || null, it.ans || '', stu);
    } else res = J ? J.judge(it.ans || '', stu) : { verdict: 'manual', how: 'manual' };
    S.draft = stu;
    S.last = { verdict: res.verdict, final: res.verdict, how: res.how || 'manual', specType: res.specType || null, stu: stu,
               hint: S.hint, refTokens: res.refTokens || [], stuTokens: res.stuTokens || [], showAnswer: false };
    S.phase = 'judged'; S.reasons = [];
    record(null); rerender();
  }

  /* 一次点击只推进一步：重渲染会让新按钮顶到同一位置，130ms 内的第二次点击
     会落在新的「下一题」上，一按就跳两题（实测 1/6 → 3/6）。 */
  var nextLockAt = 0;
  function next() {
    var now = Date.now();
    if (now - nextLockAt < 220) return;
    nextLockAt = now;
    if (S.phase === 'ask') {
      /* 跳过也要留一条记录：不写的话这题在 retry / weak / evidence 里彻底消失，
         家长以为孩子没遇到这道题。记成 blank（没做），与空着交卷同一个口径。 */
      var skipped = cur();
      if (skipped) {
        S.last = { verdict: 'blank', final: 'blank', how: 'skip', specType: null, stu: '',
                   hint: S.hint, refTokens: [], stuTokens: [], showAnswer: false };
        record(null);
      }
    }
    if (S.idx + 1 >= S.queue.length) { S.done = true; rerender(); return; }
    S.idx++; S.phase = 'ask'; S.hint = 'none'; S.last = null; S.reasons = []; S.drawer = false; S.draft = '';
    S.t0 = Date.now();
    rerender();
  }

  function rerender() {
    if (S.done) { hostEl.innerHTML = '<div class="wrap">'; renderSummaryInWrap(); return; }
    renderPractice();
  }
  function renderSummaryInWrap() { renderSummary(); }

  function bind() {
    /* 用 onclick 而不是 addEventListener：每次 render 都会调 bind，
       叠加的监听会让一次点击跑好几遍（点一次「下一题」直接跳到尾）。同 archive.js。 */
    hostEl.onclick = function (e) {
      var ob = e.target.closest('[data-opt]');
      if (ob && S.phase === 'ask') {
        S.draft = ob.getAttribute('data-opt');
        rerender();
        return;
      }
      var b = e.target.closest('[data-act]');
      if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'do') { S.phase = 'ask'; S.hint = 'none'; S.last = null; S.draft = ''; S.t0 = Date.now(); rerender(); }
      else if (act === 'submit') submit();
      else if (act === 'next') next();
      else if (act === 'hint') { S.drawer = true; rerender(); }
      else if (act === 'close-drawer') { S.drawer = false; rerender(); }
      else if (act === 'use-hint') {
        var lv = b.getAttribute('data-lv');
        S.hintSeen = S.hintSeen || {};
        S.hintSeen[lv] = 1;
        if (HINT_LADDER.indexOf(lv) > HINT_LADDER.indexOf(S.hint)) S.hint = lv;
        S.drawer = true; rerender();
      }
      else if (act === 'self') {
        if (!S.last) return;
        S.last.selfPicked = b.getAttribute('data-v');
        S.last.final = S.last.selfPicked;
        record({ self: S.last.final });
        rerender();
      }
      else if (act === 'self-undo') {
        if (!S.last) return;
        /* 自评会盖掉原来的 manual：没有撤回，点错一下就永久变成「做对了」。
           这里留一条回头路，记录也跟着改回 manual。 */
        S.last.final = 'manual';
        S.last.selfPicked = null;
        record({ self: 'manual' });
        rerender();
      }
      else if (act === 'reason') {
        var k = b.getAttribute('data-k');
        var i = S.reasons.indexOf(k);
        if (i >= 0) S.reasons.splice(i, 1); else S.reasons.push(k);
        record(null); rerender();
      }
      else if (act === 'show-answer') { S.last.showAnswer = true; record(null); rerender(); }
      else if (act === 'review') {
        var id = b.getAttribute('data-id');
        S.queue = [id]; S.idx = 0; S.phase = 'ask'; S.hint = 'none'; S.last = null; S.reasons = [];
        S.draft = ''; S.done = false; S.t0 = Date.now(); rerender();
      }
      else if (act === 'again') { if (S.mixed) { location.hash = '#/retry'; return; } start(S.vol, S.no, S.mode, null, null, S.from || null); }
      else if (act === 'quit') { S.done = true; rerender(); }
    };
  }

  /* 跨节的混合队列（错题重练）：list = [{vol, no, id, title}]。
     一个节一个节地取题，取不到的节跳过（不能因为一册缺切片就整批失败）。 */
  function startMixed(list) {
    S = fresh('', '', 'textbook');
    S.mixed = true;
    /* hostEl 原来只在 render() 里赋值，从 retry 页直接进来它是 null —— 于是
       「一次做完 N 道」点了没反应，控制台里是 TypeError。兜底成 #app。 */
    hostEl = hostEl || document.getElementById('app');
    hostEl.innerHTML = '<div class="empty">正在把这批题取回来…</div>';
    /* 事件委托挂在 hostEl.onclick 上，而 bind() 只有 render() 会调。从错题重练直接
       进来时没人调 bind()，于是这一屏的选项、提示、交卷、跳过全都「点了没反应」——
       页面看起来是好的，孩子会以为是手机卡了。这里补一次，顺带把 retry 页残留的
       host.onclick（它挂在同一个 #app 上）顶掉。 */
    bind();
    var groups = {}, order = [];
    (list || []).forEach(function (x) {
      if (!x || !x.id) return;
      var k = x.vol + '|' + x.no;
      if (!groups[k]) { groups[k] = { vol: x.vol, no: x.no, title: x.title || '', ids: [] }; order.push(k); }
      if (groups[k].ids.indexOf(x.id) < 0) groups[k].ids.push(x.id);
    });
    if (!order.length) {
      hostEl.innerHTML = '<div class="empty">没有要重练的题了。<br><br>' +
        '<a class="btn btn-secondary" href="#/today">回今日</a></div>';
      return;
    }
    Promise.all(order.map(function (k) {
      var g = groups[k];
      return MC.data.loadItems(g.vol, g.no).then(function (r) {
        return { g: g, items: (r && r.items) || [] };
      }).catch(function () { return { g: g, items: [] }; });
    })).then(function (res) {
      var map = {}, missing = 0;
      res.forEach(function (r) {
        var byId = {};
        r.items.forEach(function (it) { byId[it.id] = it; });
        r.g.ids.forEach(function (id) {
          var it = byId[id];
          if (!it) { missing++; return; }
          it._vol = r.g.vol; it._sec = r.g.no; it._secTitle = r.g.title;
          it._ch = String(r.g.no || '').split('.')[0];
          if (!map[id]) map[id] = it;
        });
      });
      S.items = map;
      S.queue = pick();
      if (!S.queue.length) {
        hostEl.innerHTML = '<div class="empty">这批题现在都排不进来（选项缺原文或缺图说明）' +
          (missing ? '，另有 ' + missing + ' 道本题库切片里已经找不到了' : '') + '。<br><br>' +
          '<a class="btn btn-secondary" href="#/retry">看看还欠哪些</a></div>';
        return;
      }
      S.t0 = Date.now();
      renderPractice();
    }).catch(function (err) {
      hostEl.innerHTML = '<div class="empty"><b>题取不到</b><br><span class="muted">' + C.esc(err.message) + '</span></div>';
    });
  }

  /* 地址打不开就得说话：册号/节号在目录里查不到时给一句人话 + 三个出口。
     起因是 '#/practice/undefined/12.1' 这种链接——点进去只有一句「题取不到」，读者不知道往哪走。 */
  function volExists(vol) {
    return ((MC.catalog && MC.catalog.volumes) || []).some(function (v) { return v.id === String(vol); });
  }
  function secExists(vol, no) {
    var ok = false;
    ((MC.catalog && MC.catalog.volumes) || []).forEach(function (v) {
      if (v.id !== String(vol)) return;
      (v.chapters || []).forEach(function (c) {
        (c.sections || []).forEach(function (x) { if (String(x.no) === String(no)) ok = true; });
      });
    });
    return ok;
  }
  function deadEnd(vol, no) {
    hostEl.innerHTML = '<div class="empty"><b>这个练习题地址打不开</b><br>' +
      '<span class="muted">第 ' + C.esc(String(vol)) + ' 册 · 第 ' + C.esc(String(no)) + ' 节不在目录里</span>' +
      '<div class="btn-row" style="margin-top:8px">' +
      '<a class="btn btn-primary" href="#/toc">去目录挑一节</a>' +
      '<a class="btn" href="#/today">回到今日</a>' +
      '<a class="btn" href="#/map">在图上找</a></div></div>';
  }

  function start(vol, no, mode, only, qs, from) {
    S = fresh(vol, no, mode);
    S.from = from || '';
    if (!volExists(vol) || !secExists(vol, no)) { deadEnd(vol, no); return; }
    hostEl.innerHTML = '<div class="empty">正在取这一节的题…</div>';
    Promise.all([MC.data.loadSec(vol, no), MC.data.loadItems(vol, no)]).then(function (r) {
      S.sec = r[0];
      var map = {};
      (r[1].items || []).forEach(function (it) { map[it.id] = it; });
      S.items = map;
      S.queue = pick();
      /* 从方法页或四行卡点进来时只做指定的那一题（?q=<id>）。
         找不到不能静默换成整节：读者点的是「这一题」，页面却从头练一节，
         他会以为自己点错了。留一句话说明换成了什么。 */
      if (only && S.items[only]) { S.queue = [only]; S.phase = 'look'; }
      else if (only) {
        S.note = '你点的那道题（' + only + '）不在这份题库里，已经换成整节练习。';
      }
      /* A question-type card asks for its own checked ids (?qs=a,b). Keep only
         items that belong to this section and can be shown. */
      if (!only && qs) {
        var allow = {};
        String(qs).split(',').forEach(function (id) { if (id) allow[id] = 1; });
        var typed = [];
        Object.keys(S.items).forEach(function (id) {
          if (!allow[id] || whyExcluded(S.items[id])) return;
          typed.push(id);
        });
        if (typed.length) S.queue = typed;
        else S.note = '这几个编号（' + String(qs) + '）在这份题库里都没找到，已经换成整节练习。';
      }
      if (!S.queue.length) {
        hostEl.innerHTML = '<div class="empty">这一节还没有可练的题。<br><br>' +
          '<a class="btn btn-secondary" href="#/sec/' + vol + '/' + no + '">去看知识点</a></div>';
        return;
      }
      S.t0 = Date.now();
      renderPractice();
    }).catch(function (err) {
      hostEl.innerHTML = '<div class="empty"><b>题取不到</b><br><span class="muted">' + C.esc(err.message) + '</span></div>';
    });
  }

  function render(host, params) {
    hostEl = host;
    bind();
    start(params.vol, params.no, params.mode || 'textbook', params.q || null, params.qs || null, params.from || null);
  }

  MC.router.view('practice', { render: render, start: start });
  /* 错题重练（#/retry）要把一批跨节的题交给同一个练习器，所以这里开口子 */
  MC.practice = { start: start, startMixed: startMixed };
})();
