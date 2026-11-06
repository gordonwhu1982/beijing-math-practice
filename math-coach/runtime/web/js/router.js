/* 路由：hash 路由，file:// 下也能用（不依赖 history API 的 pushState）。
   #/today | #/toc | #/toc/<vol> | #/sec/<vol>/<no> | #/kp/<kid>
   #/map | #/map?vol=801 | #/rel/<kid>  #/weak | #/evidence | #/practice/<vol>/<no>?mode=textbook | #/retry | #/archive */
(function () {
  'use strict';
  var MC = window.MC = window.MC || {};
  var views = {};
  var current = null;

  function parse(hash) {
    var h = String(hash || '').replace(/^#\/?/, '');
    var q = '', qi = h.indexOf('?');
    if (qi >= 0) { q = h.slice(qi + 1); h = h.slice(0, qi); }
    var parts = h.split('/').filter(Boolean);
    var params = {};
    q.split('&').filter(Boolean).forEach(function (kv) {
      var p = kv.split('=');
      params[decodeURIComponent(p[0])] = decodeURIComponent((p[1] || '').replace(/\+/g, ' '));
    });
    var name = parts[0] || 'today';
    if (name === 'sec') { params.vol = parts[1]; params.no = parts[2]; }
    if (name === 'kp') { params.uid = parts[1]; }
    if (name === 'rel') { params.uid = parts[1]; }
    if (name === 'toc') { params.vol = parts[1] || null; }
    if (name === 'practice') { params.vol = parts[1]; params.no = parts[2]; }
    return { name: name, params: params };
  }

  function view(name, def) { views[name] = def; }
  function go(hash) {
    if (location.hash === hash) render();
    else location.hash = hash;
  }

  function render() {
    var route = parse(location.hash);
    var def = views[route.name] || views.today;
    current = { route: route, def: def };
    var host = document.getElementById('app');
    host.innerHTML = '';
    /* 换屏复位到顶部：从两千像素高的节页滚到底再点「开始练」，视口会停在中下部，
       进来先看到半张卡和一片空白。fade 用一次性 class 重放，不用改 CSS 动画名。 */
    try { window.scrollTo(0, 0); } catch (e) {}
    host.classList.remove('view-in');
    void host.offsetWidth;
    host.classList.add('view-in');
    document.body.setAttribute('data-view', route.name);
    try {
      def.render(host, route.params, { route: route });
    } catch (e) {
      host.innerHTML = '<div class="empty"><b>这一页没打开</b><br><span class="muted">' +
        MC.core.esc(e && e.message || e) + '</span></div>';
      if (window.console) console.error(e);
    }
  }

  MC.router = { view: view, go: go, render: render, parse: parse, here: function () { return current; } };
  window.addEventListener('hashchange', render);
})();
