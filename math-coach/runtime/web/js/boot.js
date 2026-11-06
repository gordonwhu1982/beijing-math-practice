/* 启动：装目录、画外壳（顶栏 + 底部导航）、分发到视图 */
(function () {
  'use strict';
  var MC = window.MC;
  var C = MC.core;

  var TABS = [
    { hash: '#/today', key: 'today', icon: '◎', label: '今日' },
    { hash: '#/toc', key: 'toc', icon: '☰', label: '目录' },
    { hash: '#/map', key: 'map', icon: '⊚', label: '图谱' },
    { hash: '#/archive', key: 'archive', icon: '▤', label: '档案' }
  ];
  var TITLE = { today: '今日', toc: '章节目录', map: '知识图谱', archive: '档案',
                sec: '一节', kp: '知识点', practice: '练习', thoughts: '思想', weak: '哪里不稳', evidence: '依据', rel: '前后知识点', retry: '错题重练' };

  var state = { title: '', sub: '', back: null, exact: false };

  function paintTop() {
    var el = document.getElementById('topbar');
    var html = '<div class="bar">';
    if (state.back) html += '<button class="back" data-back="1" title="返回">‹</button>';
    html += '<div class="t">' + C.mathHtml(state.title || '') +
      (state.sub ? ' <span class="sub">' + C.mathHtml(state.sub) + '</span>' : '') + '</div>' +
      '<button class="clock" data-go="#/archive">今天 ' + MC.store.todayCount() + ' 题</button></div>';
    el.innerHTML = html;
  }

  function paintTabs() {
    var active = (MC.router.here() && MC.router.here().route.name) || 'today';
    if (active === 'sec' || active === 'kp' || active === 'practice') active = 'toc';
    document.getElementById('tabs').innerHTML = '<div class="in">' + TABS.map(function (t) {
      return '<a href="' + t.hash + '" class="' + (t.key === active ? 'on' : '') + '">' +
        '<span class="i">' + t.icon + '</span><span>' + t.label + '</span></a>';
    }).join('') + '</div>';
  }

  /* 「你看到的是哪一版」必须能自证：样式表/脚本 URL 上的 ?v= 就是这版的身份。
     对不上时先比这串，别再互相猜。 */
  function assetVersion(re) {
    var es = (typeof performance !== 'undefined' && performance.getEntriesByType) ? performance.getEntriesByType('resource') : [];
    for (var i = 0; i < es.length; i++) {
      if (re.test(es[i].name)) { return String(es[i].name.split('?')[1] || '').replace(/^v=/, ''); }
    }
    return '';
  }
  MC.build = { css: assetVersion(/app\.css/), boot: assetVersion(/js\/boot\.js/) };

  MC.shell = {
    title: function (t, opt) {
      opt = opt || {};
      state = { title: t, sub: opt.sub || '', back: opt.back || null, exact: !!opt.exact };
      paintTop();
    },
    tabs: function () { paintTabs(); },
    clear: function () { state = { title: '', sub: '', back: null, exact: false }; paintTop(); }
  };

  /* 顶栏与导航点击 */
  document.addEventListener('click', function (e) {
    var back = e.target.closest('[data-back]');
    /* exact is set only when the page was opened from a knowledge point or
       method. Browser history from the graph drops the open panel. */
    if (back) {
      if (state.exact && state.back) MC.router.go(state.back);
      else if (history.length > 1) history.back();
      else if (state.back) MC.router.go(state.back);
      else MC.router.go('#/today');
      return;
    }
    var go = e.target.closest('[data-go]');
    if (go) { MC.router.go(go.getAttribute('data-go')); }
  });

  /* 每个视图渲染完由路由调用，这里统一刷新导航高亮 */
  /* 版本串放正文末尾：顶部/底栏是导航，塞在那里会压住别的按钮；
     需要核对时拉到页面最下面就行，console 里也打一份。 */
  function stampBuild() {
    var main = document.querySelector('main');
    var txt = '样式 ' + (MC.build.css || '?') + ' · 脚本 ' + (MC.build.boot || '?');
    if (main) {
      var old = main.querySelector('.build-stamp');
      if (old) old.parentNode.removeChild(old);
      var d = document.createElement('div');
      d.className = 'build-stamp';
      d.title = '这一页加载的样式与脚本版本（对不上时先比这串）';
      d.textContent = txt;
      main.appendChild(d);
    }
    if (window.console) console.log('[build] ' + txt);
  }

  var origRender = MC.router.render;
  MC.router.render = function () {
    if (!MC.catalog) return;
    var r = MC.router.parse(location.hash);
    var name = r.name;
    MC.shell.title(TITLE[name] || 'math-coach');
    origRender();
    paintTabs();
    stampBuild();
  };

  function start() {
    MC.data.load('catalog').then(function (cat) {
      MC.catalog = cat;
      if (!location.hash) location.hash = '#/today';
      MC.router.render();
    }).catch(function (err) {
      document.getElementById('app').innerHTML =
        '<div class="empty"><b>目录打不开</b><br><span class="muted">' + C.esc(err.message) +
        '</span><br><br><span class="muted">先跑 <span class="mono">python tools/build_web.py</span> 生成数据片。</span></div>';
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start);
  else start();
})();
