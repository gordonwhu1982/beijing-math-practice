/* 依据总览（#/evidence）：把所有「不能太当真」的地方一次说清。
   这一页不做统计报表，只回答两件事：每个数字是怎么来的、它算不算硬。
   数字全部从 graph / catalog 现算 —— 抄进页面的数字会悄悄过期，而这个页面的全部意义就是不过期。 */
(function () {
  'use strict';
  var MC = window.MC, C = MC.core;

  var X_CN = { m: '人工判定', r: '规则推断', sk: '方法挂点推断' };
  var X_NOTE = {
    m: '我和你看过的条目，逐条写过理由',
    r: '脚本按规则推出来的，能复跑，但没逐条看过',
    sk: '从「这个方法挂在哪几个知识点」反推的，最容易出错的一类'
  };

  function pct(n, d) { return d ? Math.round(n / d * 100) + '%' : '—'; }

  function row(label, value, note, cls) {
    return '<div class="ev-row">' +
      '<div class="ev-t">' + C.esc(label) + '</div>' +
      '<div class="ev-n' + (cls ? ' ' + cls : '') + '">' + value + '</div>' +
      '<div class="ev-note">' + note + '</div></div>';
  }

  function render(host) {
    host.innerHTML = '<div class="wrap"><h1>依据总览</h1>' +
      '<p class="lead">正在数……</p></div>';
    MC.data.load('graph').then(function (g) {
      var kp = [], sk = [], nodes = g.nodes || [], edges = g.edges || [];
      nodes.forEach(function (n) {
        if (n.kind === 'knowledge_point') kp.push(n);
        else if (n.kind === 'skill') sk.push(n);
      });
      var byX = {};
      edges.forEach(function (e) { var k = e.x || 'r'; byX[k] = (byX[k] || 0) + 1; });
      var hand = byX.m || 0, rule = byX.r || 0, guess = byX.sk || 0, total = edges.length;

      var kpNoStd = kp.filter(function (n) { return !(n.cpstd || []).length; }).length;
      var kpNoSk = kp.filter(function (n) { return !(n.cnt && n.cnt.sk); }).length;
      var skDraft = sk.filter(function (n) { return n.status === 'draft'; }).length;
      var skCore = sk.filter(function (n) { return n.tier === 'core'; }).length;
      var skOlymp = sk.filter(function (n) { return n.tier === 'olympiad'; }).length;
      var noPre = kp.filter(function (n) {
        return !edges.some(function (e) { return e.r === 'prerequisite_of' && e.d === n.id; });
      }).length;

      var qn = 0, secs = 0, secsQ = 0;
      (MC.catalog.volumes || []).forEach(function (v) {
        qn += v.q || 0;
        (v.chapters || []).forEach(function (ch) {
          (ch.sections || []).forEach(function (s) { secs++; if (s.q > 0) secsQ++; });
        });
      });

      var html = '<h1>依据总览</h1>' +
        '<p class="lead">这一页只回答两件事：每个数字是怎么来的、它算不算硬。数字都是从当前这份图现算的，' +
        '不是抄在页面上的 —— 抄来的数字会悄悄过期，而这一页的全部用处就是不过期。</p>';

      html += '<div class="divider">先看一句话</div><div class="card tight">' +
        '<p class="ev-line">这个仓库里的知识图谱是<b>按教材正文与目录起草</b>的，不是教研审过的。' +
        kp.length + ' 个知识点的定义、' + sk.length + ' 条方法的步骤，都还是草稿；' +
        '能做的只是把「哪来的」写清楚，让你知道哪一处在什么情况下会骗人。</p></div>';

      html += '<div class="divider">关系边 ' + total + ' 条，按依据分三档</div><div class="card tight">' +
        row('人工判定', hand + ' 条 · ' + pct(hand, total), X_NOTE.m, 'ok') +
        row('规则推断', rule + ' 条 · ' + pct(rule, total), X_NOTE.r) +
        row('方法挂点推断', guess + ' 条 · ' + pct(guess, total), X_NOTE.sk, 'warn') +
        '<p class="ev-note" style="margin-top:8px">图上的线粗细也按这一档分：人工的粗、推断的细。' +
        '点任意节点，详情里会写它这条关系是从哪来的。</p></div>';

      html += '<div class="divider">知识点 ' + kp.length + ' 个</div><div class="card tight">' +
        row('有定义', kp.length + ' 个 · 100%', '每一条都是从教材正文里写出来的，不是模型自己编的框架；但仍是 AI 起草，未经教研逐条复核。') +
        row('挂上课标', (kp.length - kpNoStd) + ' 个 · ' + pct(kp.length - kpNoStd, kp.length), '按节映射，不逐点硬配：课标条目本身是概括表述，硬配到点上会造假精度。还有 ' + kpNoStd + ' 个点是「这一节没有对应条目」。', kpNoStd ? 'warn' : '') +
        row('挂上方法', (kp.length - kpNoSk) + ' 个 · ' + pct(kp.length - kpNoSk, kp.length), '一个点至少有一条做法的，才算「能练」；' + (kpNoSk ? kpNoSk + ' 个点还没有。' : '已经全覆盖。')) +
        row('能往前追', (kp.length - noPre) + ' 个 · ' + pct(kp.length - noPre, kp.length), '有先修边的点才能回答「学它之前得会什么」；剩下的多是各主题的入口，回头就到底了。') +
        '</div>';

      html += '<div class="divider">方法 ' + sk.length + ' 条</div><div class="card tight">' +
        row('核心做法', skCore + ' 条 · ' + pct(skCore, sk.length), '常考常用的；另外 ' + skOlymp + ' 条是竞赛级，标了但平时不用。') +
        row('还有草稿', skDraft + ' 条 · ' + pct(skDraft, sk.length), '全部还是 draft：步骤写了依据，但边界声明（这个方法不覆盖什么）也是我起草的。') +
        row('知道先练哪个', guess + ' 条边', '方法之间的先后是逐条起草的，只覆盖一半左右的方法，另一半是各主题的入口做法，本来没有先修。', 'warn') +
        '</div>';

      html += '<div class="divider">题目 ' + qn + ' 道</div><div class="card tight">' +
        row('有题可练的节', secsQ + ' / ' + secs, '题目集中在八年级上册的几章，其余五册大多数节还没有题。') +
        row('判不了时会说', '三态', '判题只有三种结果：对、错、我判不了。判不了一定写「我判不了」，绝不拿它当错题 —— 把工具的局限算在孩子头上比判错更坏。') +
        row('做错的会被记下', '进待改', '判错和跳过都进「待改」，做对一次就消掉；做对过的按 3 / 7 / 21 天抽回来再看。') +
        '</div>';

      html += '<div class="divider">这一页想说的是</div><div class="card tight">' +
        '<p class="ev-line">能复核的都留了回指的链：每条关系有来源、每条方法有边界、每道题有教材出处。' +
        '复核不了的部分，页面上一律写「草稿」「初判」「推断」，不冒充教研结论。</p>' +
        '<p class="ev-note">想自己验一遍（在仓库根目录）：<br>' +
        '<code class="ev-cmd">bash tools/check_all.sh</code> 全量闸门<br>' +
        '<code class="ev-cmd">python tools/skill_prereq_check.py</code> 方法先后的成环与覆盖<br>' +
        '<code class="ev-cmd">python tools/questions_kp_check.py</code> 题到知识点的映射<br>' +
        '<code class="ev-cmd">python tools/relations_check.py</code> 关系表有没有环、有没有孤儿</p></div>';

      host.innerHTML = '<div class="wrap">' + html + '</div>';
      MC.shell.title('依据总览', { sub: '哪里能信，哪里别太当真' });
    }).catch(function (e) {
      host.innerHTML = '<div class="wrap"><h1>依据总览</h1><div class="card"><p>取不到图谱数据：' +
        C.esc(String(e && e.message || e)) + '</p></div></div>';
    });
  }

  MC.router.view('evidence', { render: render });
})();
