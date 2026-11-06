/* 知识点整页：和图谱右栏用同一份七段（map.js 的 renderDetail 经 MC.explainPage 暴露）。
   这里只负责路由与标题，不再自己拼段落——两处各写一套的后果是同一句话两个版本。 */
(function () {
  'use strict';
  var MC = window.MC, C = MC.core;

  /* 死胡同不许存在：页面说「找不到」时，必须同时给出至少一条能走的路。
     2026-10-27 的三张旧截图上，#/kp/<认不出的编号> 整屏只有一句「知识点编号看不懂」，
     左边栏还停在别的页 —— 读者除了改地址栏没有别的动作，这类页面比报错更糟。 */
  function deadEnd(host, why, uid) {
    host.innerHTML = '<div class="wrap"><div class="empty">' + why +
      (uid ? '<div class="muted" style="font-size:var(--fs-xs);margin-top:6px">编号：' + C.esc(uid) + '</div>' : '') +
      '<div class="btn-row" style="margin-top:14px">' +
      '<a class="btn" href="#/toc">去目录挑一节</a>' +
      '<a class="btn" href="#/map">在图上找</a>' +
      '<a class="btn" href="#/today">回到今日</a>' +
      '</div></div></div>';
    MC.shell.title('没找到这个知识点', { back: '#/toc' });
  }

  function render(host, params) {
    var uid = params.uid;
    if (!/^(K\d{3}|SK|MC|TH)-/.test(String(uid || ''))) {
      deadEnd(host, '这个地址里的知识点编号不像我们的格式。', uid);
      return;
    }
    if (!MC.explainPage) {
      deadEnd(host, '讲解模块没加载上，刷新一次再试。', '');
      return;
    }
    host.innerHTML = '<div class="empty">正在取…</div>';
    /* explainPage 在「图里没有这个点」时不会回调 done，切片取失败也不会 ——
       于是这一屏就永远停在「正在取…」。4 秒还没画出来就当失败处理。 */
    var settled = false, timer = setTimeout(function () {
      if (settled) return;
      settled = true;
      /* explainPage 有时自己就画了一张「图里没有」的说明、并且已经带了出口；
         那种情况不再拿同一件事覆盖它一次。 */
      if (host.querySelector('a[href^="#/"]')) return;
      deadEnd(host, '这个知识点没取到（可能是编号变了，或者数据没加载上）。', uid);
    }, 4000);
    MC.explainPage(host, uid, function (n) {
      settled = true; clearTimeout(timer);
      var back = n.vol && n.sec ? '#/sec/' + n.vol + '/' + n.sec : '#/toc';
      MC.shell.title(C.clipMath(n.title, 18), { sub: n.sec || '', back: back });
    });
  }

  MC.router.view('kp', { render: render });
})();
