/* 档案：作答记录、按节覆盖、导出 JSONL */
(function () {
  'use strict';
  var MC = window.MC, C = MC.core;

  function download(name, text) {
    var blob = new Blob([text], { type: 'application/jsonl;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  /* 导入：挑文件 → 逐行解析 → 幂等合并 → 交回调用方报数与重绘。
     坏行只计数不中断：家长手工整理过的文件常常末尾多一行。 */
  function pickImport(after) {
    var inp = document.getElementById('mc-import');
    if (!inp) {
      inp = document.createElement('input');
      inp.type = 'file';
      inp.id = 'mc-import';
      inp.accept = '.jsonl,.json,.txt';
      inp.multiple = true;
      inp.style.display = 'none';
      document.body.appendChild(inp);
    }
    inp.onchange = function () {
      var files = Array.prototype.slice.call(inp.files || []);
      inp.value = '';
      if (!files.length) return;
      var left = files.length, rows = [], badLines = 0, readErr = 0;
      function done() {
        if (!rows.length) { C.toast('没有可用记录' + (readErr ? '，有文件读不出来' : '')); return; }
        var res = MC.store.merge(rows);
        res.bad += badLines;
        if (after) after(res);
      }
      files.forEach(function (f) {
        var fr = new FileReader();
        fr.onload = function () {
          var got = MC.store.parseJsonl(fr.result);
          rows = rows.concat(got.rows);
          badLines += got.bad;
          if (--left === 0) done();
        };
        fr.onerror = function () { readErr++; if (--left === 0) done(); };
        fr.readAsText(f, 'utf-8');
      });
    };
    inp.click();
  }

  /* 「3 次 · 对 0 · 错 2」这种写法少了一条：剩下那次可能是跳过、交了空白卷或判不了。
     次数必须等于各项之和，家长对不上就会以为记录丢了。 */
  function secLine(b) {
    var bits = ['对 ' + b.c, '错 ' + b.w];
    if (b.b) bits.push('没做 ' + b.b);
    if (b.m) bits.push('判不了 ' + b.m + (b.self && Object.keys(b.self).length ? '（含你自定 ' + Object.keys(b.self).length + '）' : ''));
    return b.n + ' 次 · ' + bits.join(' · ');
  }

  function render(host) {
    var recs = MC.store.all();
    var bySec = MC.store.bySec();
    var html = '<div class="wrap"><h1>档案</h1>' +
      '<p class="lead">共 ' + recs.length + ' 条作答记录（' + MC.store.lastEach().length +
        ' 道题），都存在这台电脑的浏览器里。</p>';

    if (!recs.length) {
      html += '<div class="card"><div class="muted">还没有记录。去练一组就有了。</div>' +
        '<div class="btn-row"><button class="btn btn-primary" data-go="#/today">去练</button></div></div></div>';
      host.innerHTML = html;
      MC.shell.title('档案');
      return;
    }

    /* 会做率按题算：同一道题重练几遍都只算一次（取最后一次）。
       按记录条数算的话，4 道题各改对一次就是「8 条记录 · 50%」，而孩子已经全对了。 */
    var last = MC.store.lastEach();
    /* 会做率只认判题器的结论：判不了、后来你自己定对/定错的题，
       分子分母都不进（原来自评「做对」会混进 c，目录页说不算独立做对，这里却算了）。 */
    var c = last.filter(function (r) { return r.final === 'correct' && !C.selfJudged(r); }).length;
    var w = last.filter(function (r) { return r.final === 'wrong' && !C.selfJudged(r); }).length;
    /* 判不了族按出身（how）数，不按 final：自评会把 final 改成 correct/wrong，
       只按 final 数就会漏掉「定了的」，档案页三档加和对不上总作答。 */
    var m = recs.filter(function (r) { return C.manualHow(r); }).length;
    /* 自动判 = 判题器自己给出的结论；manual 里有的是它判不了、有的是孩子自评 */
    /* 判题器自己给的结论是 exact / bag / spec-* / letter；「判不了」的那几档
       （letter-manual、spec-manual）不算自动判。原来漏了 letter 与 skip，
       于是「自动判 1 + 判不了 0」对不上「总作答 7」。 */
    /* 「空着交」的那批 how 是 skip / letter-blank，而 /^letter/ 会把 letter-blank 认成
       自动判过一遍 —— 于是「自动判 6 + 判不了 1 + 另有 2 道空着交」比总作答 8 还多。
       空卷与跳过本来就没有结论，一律先排掉。 */
    var auto = recs.filter(function (r) {
      var h = String(r.how || '');
      if (/-manual$/.test(h)) return false;
      if ((r.final || r.verdict) === 'blank') return false;
      return /^(exact|bag|spec-|letter)/.test(h);
    }).length;
    var blanks = recs.filter(function (r) { return (r.final || r.verdict) === 'blank'; }).length;
    /* 跳过与交了白卷是两件事：一个是主动放过，一个是没写。weak / retry 早就分开说了，
       档案页原来一句「空着交的」把两者混着说，同一批记录三种说法。 */
    var nSkip = recs.filter(function (r) { return (r.final || r.verdict) === 'blank' && C.blankKind(r) === 'skip'; }).length;
    var nEmpty = blanks - nSkip;
    html += '<div class="statgrid" data-total="' + recs.length + '" data-auto="' + auto +
      '" data-manual="' + m + '" data-blank="' + blanks + '">' +
      '<div class="stat"><div class="n">' + recs.length + '</div><div class="k">总作答</div></div>' +
      '<div class="stat"><div class="n">' + (c + w ? Math.round(c / (c + w) * 100) + '%' : '—') + '</div><div class="k">会做率</div></div>' +
      '<div class="stat"><div class="n">' + auto + '</div><div class="k">自动判</div></div>' +
      '<div class="stat"><div class="n">' + m + '</div><div class="k">判不了</div></div></div>' +
      '<p class="muted" style="font-size:var(--fs-xs)">「自动判」是判题器按结构化答案给出的结论；判不了的那些不走进错题，也不会拉低会做率——包括后来你自己定了「做对了」的：那也不算独立做对、不进「已掌握」。' +
      /* 会做率的分母是「做过的题」（按题去重），不是记录条数：同一道题重练几遍只算一次 */
      (blanks ? '另有 ' + blanks + ' 次没做（' + (nSkip ? '跳过 ' + nSkip + ' 次' : '') +
        (nSkip && nEmpty ? '、' : '') + (nEmpty ? '交了白卷 ' + nEmpty + ' 次' : '') +
        '），不计入会做率。' : '') + '</p>';

    /* 写失败基本只发生在 localStorage 写满，静默吞掉会表现为「记录不再增长」，必须显式提示 */
    if (MC.store.lastError) {
      html += '<div class="card" style="border-color:#e0b34a"><h2>这台浏览器的存储写不进去了</h2>' +
        '<p class="muted">最近的作答可能没有存下来（' + C.esc(MC.store.lastError) + '）。先点下面的「导出全部」保住已有记录，再清理浏览器存储。</p></div>';
    }

    /* 只列真做过的节。原来把六册所有节都摊出来，33 行里 30 行写着「没做过」——
       一屏全是没有的信息，家长要在里面找那 3 行。没开始的节收成一句话。 */
    var started = [], restN = 0;
    (MC.catalog.volumes || []).forEach(function (v) {
      v.chapters.forEach(function (ch) {
        ch.sections.forEach(function (s) {
          var b = bySec[s.no];
          if (!b) { if (s.q) restN++; return; }
          started.push({ s: s, b: b });
        });
      });
    });
    /* 节号有两种：11.1 这种孩子找得到的，和 ch-end-11 这种入库编号。
       页面上露出 ch-end-11 等于把内部 id 摊给孩子看，翻成「第 11 章 · 章末综合」。 */
    function secLabel(s) {
      var m = String(s.no || '').match(/ch-end-(\d+)/);
      if (m) return '第 ' + m[1] + ' 章 · 章末综合';
      return s.no + ' ' + s.title;
    }
    html += '<div class="divider">按节</div><div class="card">';
    if (!started.length) {
      html += '<p class="muted">还一节都没开始。挑一节做几道题，这里才会长出行来。</p>';
    } else {
      started.forEach(function (x) {
        var s = x.s, b = x.b;
        var done = Object.keys(b.items).length;
        var p = s.q ? Math.min(100, Math.round(done / s.q * 100)) : 0;
        html += '<div class="kv"><span>' + C.esc(secLabel(s)) + '</span>' +
          '<span class="bar" style="width:90px;margin-top:0"><i class="' + (p >= 100 ? '' : 'amber') + '" style="width:' + p + '%"></i></span>' +
          '<span class="g">' + secLine(b) + '</span></div>';
      });
      html += '<p class="muted" style="font-size:var(--fs-xs)">做过 ' + started.length + ' 节' +
        (restN ? '，其余 ' + restN + ' 节还没开始' : '') + '。</p>';
    }
    html += '<div class="btn-row"><a class="btn btn-secondary" href="#/toc">去目录挑一节</a></div></div>';

    html += '<div class="card"><h2>带走与带回来</h2>' +
      '<p class="muted">导出的是一行一条的 JSONL。换设备或换浏览器时把文件导入回来即可，同一份导两次不会重复计数。</p>' +
      '<div class="btn-row"><button class="btn btn-secondary" data-act="export" data-scope="all">导出全部</button>' +
      '<button class="btn btn-secondary" data-act="export" data-scope="today">导出今天</button>' +
      '<button class="btn btn-primary" data-act="import">导入 JSONL</button></div></div>' +
      '<div class="card"><h2>清空</h2><p class="muted">只清这台浏览器里的记录，不可恢复。</p>' +
      '<div class="btn-row"><button class="btn btn-ghost" data-act="wipe">清空记录</button></div></div></div>';

    host.innerHTML = html;
    MC.shell.title('档案');
    /* 用 onclick 赋值而不是 addEventListener：导入后要重绘，多次绑定会让一次点击跑多遍 */
    host.onclick = function (e) {
      var b = e.target.closest('[data-act]');
      if (!b) return;
      var act = b.getAttribute('data-act');
      if (act === 'import') {
        pickImport(function (res) {
          C.toast('并入 ' + res.added + ' 条，现在共 ' + res.total + ' 条');
          render(host);
        });
        return;
      }
      if (act === 'export') {
        var scope = b.getAttribute('data-scope');
        var rows = scope === 'today'
          ? recs.filter(function (r) { return new Date(r.ts).toDateString() === new Date().toDateString(); })
          : recs;
        if (!rows.length) { C.toast('今天没有记录'); return; }
        download('math-coach-801-' + (scope === 'today' ? 'today' : 'all') + '-' + C.stamp() + '.jsonl', MC.store.jsonl(rows));
        C.toast('导出 ' + rows.length + ' 条');
      } else if (act === 'wipe') {
        if (confirm('清空这台电脑上的全部作答记录？')) {
          MC.store.clear();
          C.toast('已清空');
          MC.router.render();
        }
      }
    };
  }

  MC.router.view('archive', { render: render });
})();
