/* 知识图谱：分簇群岛。四档视角：骨架（节）/ 知识点 / 方法 / 错因。
   —— 为什么不用 dagre：DAG 的层序要稳定，孩子第二次打开必须看到同一张图；
      力导向每次布局都不一样，dagre 在这个规模上又会把图摊成又长又薄的一条。
      所以坐标全部手算（preset）：按「章」或「节」成岛，岛内网格排列，岛间网格打包。
   颜色一律从 CSS 变量读（tok），深色模式自动跟着走，这里不写死任何一个 hex。
   vendor/cytoscape 仍按需注入：index.html 不引它，别的页面不背这个包。 */
(function () {
  'use strict';
  var MC = window.MC, C = MC.core;

  var SRC = { cy: '../../assets/vendor/cytoscape/cytoscape.min.js' };

  var VIEWS = [
    ['mind', '导图'],
    ['overview', '全景'],
    ['chart', '章图'],
    ['skeleton', '骨架（节）'],
    ['kp', '知识点'],
    ['skill', '方法'],
    ['misconception', '错因'],
    ['thought', '思想']
  ];
  var VIEW_CN = { mind: '导图', overview: '全景', chart: '章图', skeleton: '骨架（节）', kp: '知识点', skill: '方法', misconception: '错因', thought: '思想' };
  var KIND_CN = { volume: '册', chapter: '章', section: '节', knowledge_point: '知识点', skill: '方法', misconception: '错因', thought: '思想' };

  /* ---------- 取色：全部来自 app.css 的 token ---------- */

  function tok(name, fb) {
    try {
      var v = getComputedStyle(document.documentElement).getPropertyValue(name);
      v = String(v || '').trim();
      return v || fb;
    } catch (e) { return fb; }
  }
  var PAL = null;
  function pal() {
    if (PAL) return PAL;
    PAL = {
      paper: tok('--paper', '#f1f6fb'), card: tok('--card', '#ffffff'),
      ink: tok('--ink', '#0c1a24'), inkSoft: tok('--ink-soft', '#43556a'),
      inkFaint: tok('--ink-faint', '#95a6b8'),
      line: tok('--line', '#d9e4ef'), lineStrong: tok('--line-strong', '#b9cadb'),
      green: tok('--green', '#0a7d5a'), greenStrong: tok('--green-strong', '#05603f'),
      geo: tok('--dom-geo', '#1c6b4b'), geoS: tok('--dom-geo-soft', '#e6f1eb'),
      num: tok('--dom-num', '#2b6cb0'), numS: tok('--dom-num-soft', '#e7f0fb'),
      sta: tok('--dom-sta', '#8a52a8'), staS: tok('--dom-sta-soft', '#f4ecf9'),
      slate: tok('--slate', '#4c6178'), slateS: tok('--slate-soft', '#eaf0f7'),
      amber: tok('--amber', '#b0761c'), amberS: tok('--amber-soft', '#fbf0dc'),
      red: tok('--red', '#b4452c'), redS: tok('--red-soft', '#fbeae5')
    };
    return PAL;
  }

  /* 依据档：一条边只用一个轴表达「这条关系有多硬」。
     d=m 教研判定 / r 规则推断 / sk 挂点推断 / syn 结构性合成（归属、思想挂点、节间汇总）。
     注意 mind 档造边时 x 是 part/web/net/app/th，不能直接拿来判档，统一在这里折算一次。
     样式表只认 d，不再认 x —— 以前那一套按 x 写死 hex 的规则就是这么漂成一片灰的。 */
  function depTag(e) {
    if (e.x === 'dep') return 'dep';
    if (e.x === 'sk' || e.x === 'skw') return 'sk';
    if (e.c === 'm' || e.x === 'm') return 'm';
    if (e.x === 'part' || e.x === 'th' || e.x === 'net' || e.x === 'seq' || e.x === 'agg') return 'syn';
    return 'r';
  }
  function tagDep(set) {
    (set.edges || []).forEach(function (e) { if (e.data) e.data.d = depTag(e.data); });
    return set;
  }

  /* 节点盒子：卡片化，比文字宽一圈；岛内网格按这个尺寸算间距 */
  var SIZE = {
    volume: { w: 132, h: 38 },
    chapter: { w: 168, h: 34 },
    section: { w: 178, h: 34 },
    knowledge_point: { w: 140, h: 32 },
    skill: { w: 140, h: 30 },
    misconception: { w: 140, h: 30 },
    thought: { w: 148, h: 32 }
  };
  /* 分辨率：同一批知识，看得越远，卡片越小、字越短。
     竞品能把 940 个节点摊在一屏，靠的不是更小的字，是「远看就是点阵，近看才是卡片」。
     SC 同时进尺寸、间距与截断字数——三者必须一起缩：只缩字卡片会溢出，只缩卡片间距会糊。 */
  var SCOPE_K = { overview: 1, chapter: 1, book: 0.62, repo: 0.34 };
  var SC = 1;
  var BASE_GAP = { x: 18, y: 18, pad: 20, igap: 44, title: 24 };

  var GAPX = 14, GAPY = 14;         // 岛内网格间距
  var IPAD = 20;                    // 岛内边距
  var IGAP = 44;                    // 岛与岛之间
  var TITLE_H = 24;                 // 岛标题占高

  function scopeOf() {
    if (state.view === 'overview') return 'overview';
    if (state.vol === 'all' && state.ch === 'all') return 'repo';
    if (state.ch === 'all') return 'book';
    return 'chapter';
  }
  /* 卡片宽要装得下自己的名字（含省略号那一个字符）——C.clip 会在截断处补一个「…」，
     3 个字的名字实际占 4 个字宽。不预留这一格，缩到六册档时每张卡片都会压到邻居。 */
  var WIDE_KINDS = { knowledge_point: 1, skill: 1, misconception: 1, thought: 1 };
  function sizeOf(kind) {
    var s = SIZE[kind] || SIZE.knowledge_point;
    var w = Math.max(12, Math.round(s.w * SC));
    if (WIDE_KINDS[kind]) w = Math.max(w, Math.round((clipN() + 1) * 11.5 + 10));
    return { w: w, h: Math.max(9, Math.round(s.h * SC)) };
  }
  function applyScope() {
    SC = SCOPE_K[scopeOf()] || 1;
    /* 下界 8：渲染 bbox 除了卡片本身还带边框（1.4）与「有题」那层 underlay（各 2），
       间距压到 5 时这三样加起来比间距还宽，行与行就糊成一片。 */
    GAPX = Math.max(8, Math.round(BASE_GAP.x * SC));
    GAPY = Math.max(8, Math.round(BASE_GAP.y * SC));
    IPAD = Math.round(BASE_GAP.pad * SC);
    IGAP = Math.round(BASE_GAP.igap * SC);
    TITLE_H = Math.round(BASE_GAP.title * SC);
  }
  function clipN() { return SC <= 0.4 ? 3 : (SC <= 0.7 ? 6 : 8); }

  /* 岛底色的轮转：三域色 soft 极淡，给相邻岛一点色彩区分，不抢内容 */
  var ISL_TONE = ['geoS', 'numS', 'staS'];

  /* 关系的中文名：只在这里写一次。颜色与线型由 styleSheet() 反推，
     以后改样式不用回头改图例（以前就是这么漂的：图例写死 'geo'，样式早改成 num 了） */
  var REL_CN = {
    prerequisite_of: '先修（得先会）',
    applies_to: '这套方法能解这个点',
    uses_skill: '讲这个点要用这套动作',
    belongs_to: '属于哪个思想',
    misconception_of: '错因绊住这个点',
    sequence: '书上排在前一节的后面',
    is_part_of: '归属（章→节→点）',
    supports: '支撑',
    contrast_with: '容易混，要对着看',
    equivalent_to: '其实是同一个东西'
  };
  /* 每一档列哪几根线：mind 档能出现 4 种，别把 10 种全列出来占三行 */
  var EDGE_LEG = {
    mind: ['prerequisite_of', 'applies_to', 'belongs_to', 'is_part_of'],
    overview: ['is_part_of', 'belongs_to'],
    chart: ['prerequisite_of', 'sequence'],
    skeleton: ['prerequisite_of', 'sequence'],
    kp: ['prerequisite_of'],
    skill: ['applies_to', 'uses_skill', 'prerequisite_of'],
    misconception: ['misconception_of'],
    thought: ['belongs_to']
  };

  var LEGEND = {
    mind: [['chapter', '这一章'],
           ['section', '节，点开才向右长出知识点'],
           ['knowledge_point', '只画出当前这一节']],
    /* 竞品的首屏是「所有知识一图展示」：一屏只放得下结构，放不下 673 个点。
       所以全景档的图例讲的是「这一层是什么意思」，不是节点类型清单。 */
    overview: [['volume', '册（一本书一块）'],
               ['chapter', '章（点它进这一册的章图）'],
               ['thought', '思想：跨六册反复出现的那套想法'],
               ['chapter', '紫虚线 = 这条思想在这一章有方法（按方法数聚合）', { edge: 'sta', dash: true }]],
    chart: [['knowledge_point', '粗线 = 人工判定，细线 = 推断', { edge: 'geo', thick: true }],
            ['knowledge_point', '知识点'],
            ['knowledge_point', '有题映射到它', { underlay: true }],
            ['section', '岛标题 = 节，点它去这一节'],
            ['knowledge_point', '实线 = 必须先会', { edge: 'geo' }],
            ['knowledge_point', '细虚线 = 书上的先后', { edge: 'inkFaint', dash: true }],
            ['knowledge_point', '节到节的粗箭头 = 后一节有几处要用它', { edge: 'geo' }]],
    skeleton: [['section', '节（按章分岛）'], ['section', '本节有题', { underlay: true }],
               ['chapter', '岛标题 = 章，点它看这一章'],
               ['section', '实线 = 先修（人工确认）', { edge: 'geo' }],
               ['section', '灰细线 = 先修（按节内顺序推断）', { edge: 'inkFaint' }],
               ['section', '虚线 = 教材顺序（章内相邻节）', { edge: 'inkFaint', dash: true }]],
    kp: [['knowledge_point', '知识点'], ['knowledge_point', '有题映射到它', { underlay: true }], ['section', '岛标题 = 节，点它去这一节']],
    skill: [['skill', '粗线 = 人工判定，细线 = 推断', { edge: 'geo', thick: true }],
            ['skill', '实线：这个方法能解这些点', { edge: 'geo' }],
            ['skill', '虚线：讲这个点时要用到它', { edge: 'num', dash: true }],
            ['skill', '教材方法'],
            ['skill', '培优方法', { bg: 'amberS', line: 'amber', dash: true }],
            ['skill', '竞赛 / 拓展', { bg: 'amberS', line: 'amber', double: true }],
            ['knowledge_point', '被压住的知识点'],
            ['skill', '虚线箭头 = 先练哪个（逐条起草）', { edge: 'geo', dash: true }]],
    misconception: [['misconception', '错因'], ['knowledge_point', '被绊住的知识点']],
    thought: [['thought', '上位思想（跨章节，虚线 = 方法族）'],
              ['thought', '方法族', { dash: true }],
              ['skill', '归属它的方法']]
  };

  var LEAD = {
    mind: '',
    overview: '六册书、二十六个章、十六条思想，全在一屏里。上下是归属（章属于册），左右是先后（册与册的顺序）。紫线是思想穿过哪些章——线粗的地方，说明这套想法在那几章反复用。点章进入这一册的章图，点册看整册。',
    chart: '一张章图：每一块是一节，块里的点从左到右是先学后学，同一步的先上下排。块与块之间两种线：细虚线只是书上的先后，不等于「必须先学完」；带箭头的粗线是「后一节有几处要用前一节」，越粗咬得越紧。能不能学看块内的实线。',
    skeleton: '一张地图册：一章一个岛，岛里的每一块是一节。实线箭头 = 先学什么再学什么（人工确认），灰细线 = 按节内知识点顺序推断的先修，灰色虚线 = 教材上的前后节——后两者不是一回事。点岛标题看整章，点节看这一节。',
    kp: '一节课一个岛。岛里是先学后学的知识点，箭头指到的得先学会；有题的节点底下有一层淡绿。',
    skill: '每种方法压在哪几个知识点上。白底是教材方法，虚线是培优，双线是竞赛 / 拓展；方法之间那条虚线箭头是「得先会它」——教材里没有这句原话，是按方法挂的知识点早于本节推出来的，别当硬规矩。',
    misconception: '每种错因绊住的是哪个知识点。',
    thought: '六条上位思想 + 九条方法族：一个岛一条，岛里归到它下面的方法。这一层是跨章节的，用来看「同一套想法在哪些地方反复出现」。'
  };

  var G = null;                     // graph 数据
  var byId = {}, secCh = {}, secQ = {};  // secQ: 'vol-sec' -> 题数
  var cy = null;                    // 当前 cytoscape 实例
  var set = { nodes: [], edges: [] };
  var boxes = [];                   // 岛：{key,label,nav,w,h,cx,cy,n}
  var depPairCache = null;          // 章图跨节依赖的计数缓存（换数据要清）
  var state = { view: 'mind', lens: 'web', kind: 'all', local: null, zoomed: false, vol: null, ch: 'all', focus: null, depth: 'all', cps: {}, layerVol: '801', layerCh: null, layerKp: null };
  var lib = { p: null, dagre: false };
  var token = 0;
  /* 相机归属：用户自己拖过/缩过之后，容器尺寸变化不再自动重新取景，否则会跟人抢镜头。 */
  var roObs = null, userCam = false;

  var hostEl = null, cyEl = null, crossEl = null, sideEl = null, namesBtn = null, legendEl = null, detailEl = null, hintEl = null, closeBtn = null,
      noteEl = null, leadEl = null, wrapEl = null, segEl = null, volSel = null, chSel = null,
      fitBtn = null, depthEl = null, qEl = null, qTipEl = null, cpEl = null;

  /* ---------- 小工具 ---------- */

  var sizedH = 0;
  /* 观察画布上方那几条的尺寸变化：导语/提示换行时画布高度要跟着让，
     光靠定时器补算会在快机器上抢跑（--shots 那条就是这样漏掉的）。 */
  var canvasRO = null;
  function sizeCanvas() {
    if (!cyEl) return;
    var vh = window.innerHeight || 800;
    var vw = cyEl.clientWidth || window.innerWidth || 900;
    /* 宽屏时右边还有讲解栏，图只剩三分之二宽：这时高度要给足，否则 fit 出来的倍率
       会把 12px 的字压到 8px（1440×900 上量到 zoom 0.786，字实际只有 9.4px）。 */
    /* 手机上还要再让一步：画布顶在 375px 左右，700 高就会把底边推到 1027 —— 视口 932，
       最后 94px 的节点被切在屏幕外，而页面没有「下面还有」的任何提示。这里按「顶边到视口底」
       算剩余高度，宁可矮一点也不切内容；320 是下限（再矮 fit 出来的字就看不清了）。 */
    var h;
    if (vw >= 1000) {
      h = Math.round(Math.min(Math.max(460, vh - 208), 860));
    } else {
      /* 手机上还要再让一步：画布顶在 375px 左右，700 高会把底边推到 1027 —— 视口只有 932，
         最后 94px 的节点被切在屏幕外，而页面没有任何「下面还有」的提示。这里按「顶边到手机视口底」
         算剩余高度，宁可矮一点也不切内容；320 是下限（再矮 fit 出来的字就看不清了）。 */
      var top = cyEl.getBoundingClientRect().top;
      var room = Math.min(vh, 932) - (top > 0 ? Math.round(top) : 300) - 24;
      h = Math.round(Math.min(Math.max(320, Math.min(vh * 0.70, room)), 700));
    }
    /* 挂载那一刻上方的导语/分段控件还没有最终高度，量到的 top 偏小、算出来的画布就偏高。
       所以 sizeCanvas 会被「挂载后补算」再叫一次，这里只在实际变化时才写，免得抖动。 */
    if (Math.abs(h - sizedH) < 6) return;
    sizedH = h;
    cyEl.style.height = h + 'px';
    if (cy) { try { cy.resize(); } catch (e) {} }
  }

  /* 挂载后连跑十次（约 0.9s）：每次重算画布高度，直到它不再变化为止。
     sizeCanvas 里高度变化 <6px 就直接返回，所以这不抖动、也不自激。 */
  function settleCanvas(n) {
    if (!cyEl || !document.body.contains(cyEl)) return;
    sizeCanvas();
    if (n >= 10) return;
    setTimeout(function () { settleCanvas(n + 1); }, 90);
  }

  function loadScript(src) {
    loadScript.cache = loadScript.cache || {};
    if (loadScript.cache[src]) return loadScript.cache[src];
    loadScript.cache[src] = new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.async = true;
      s.onload = function () { res(); };
      s.onerror = function () { rej(new Error('加载失败：' + src)); };
      document.head.appendChild(s);
    });
    return loadScript.cache[src];
  }

  function ensureLib() {
    if (lib.p) return lib.p;
    if (window.cytoscape) { lib.p = Promise.resolve(); lib.dagre = false; return lib.p; }
    lib.p = loadScript(SRC.cy).then(function () { lib.dagre = false; });
    return lib.p;
  }

  function volObj(id) {
    var vs = (MC.catalog && MC.catalog.volumes) || [];
    for (var i = 0; i < vs.length; i++) if (vs[i].id === id) return vs[i];
    return null;
  }
  function volLabel(id) { var v = volObj(id); return v ? v.label : id; }
  function defVol() { return (MC.catalog && MC.catalog.practice_vol) || '801'; }

  /* Chapter the mind map opens on: the section the child marked, else ch.12 of book 801. */
  function defChapter() {
    try {
      var s = JSON.parse(localStorage.getItem('mc.settings.v1') || '{}');
      var m = String(s.current || '').match(/^(\d+)\./);
      if (m) return m[1];
    } catch (e) {}
    var v = volObj(state.vol || defVol());
    var chs = (v && v.chapters) || [];
    if ((state.vol || defVol()) === '801' && chs.some(function (c) { return String(c.no) === '12'; })) return '12';
    return chs.length ? String(chs[0].no) : 'all';
  }

  function index(g) {
    byId = {}; secCh = {}; secQ = {}; depPairCache = null;
    g.nodes.forEach(function (n) { byId[n.id] = n; });
    g.nodes.forEach(function (n) { if (n.kind === 'section') secCh[n.vol + '-' + n.sec] = n.ch; });
    ((MC.catalog && MC.catalog.volumes) || []).forEach(function (v) {
      (v.chapters || []).forEach(function (c) {
        (c.sections || []).forEach(function (s) { secQ[v.id + '-' + s.no] = s.q || 0; });
      });
    });
  }

  function chOf(n) {
    if (n.ch != null) return String(n.ch);
    if (n.sec) { var c = secCh[n.vol + '-' + n.sec]; return c == null ? null : String(c); }
    return null;
  }
  function secIdOf(n) { return n && n.sec ? ('S' + n.vol + '-' + n.sec) : null; }

  function secNum(s) {
    var m = String(s || '').match(/(\d+)\.(\d+)/);
    if (m) return parseInt(m[1], 10) * 1000 + parseInt(m[2], 10);
    var e = String(s || '').match(/ch-end-(\d+)/);
    if (e) return parseInt(e[1], 10) * 1000 + 900;
    return 99000;
  }

  /* 短名：知识点的 title 常写成「名称：一长串定义」，图上只放冒号前那一截 */
  /* 短名长度必须跟着卡片宽度走：字不随 SC 缩（缩两次等于双重惩罚），
     所以卡片缩到 48 宽时，10 个汉字的名字（115px）会横穿两三个格子。
     48 宽装 4 个汉字、87 装 6 个、140 装 8 个——正好是 clipN() 的三档。 */
  function shortOf(n, max) {
    var t = C.tidy(n.title);
    var i = t.search(/[：:]/);
    if (i > 1) t = t.slice(0, i);
    if (n.kind === 'knowledge_point') return C.clip(t, max || clipN());
    /* 节保留「10.1 」序号：孩子找的是「10.1」，去掉反而不好定位。
       盒子 178 宽、11.5px 字，去内边距后能放 14 个汉字，「10.1 二次根式的乘除法」正好放得下。 */
    if (n.kind === 'section') return C.clip(t, max || (clipN() + 6));
    /* 方法名 / 思想名 / 错因名同样按卡片宽截：六册档卡片只有 50 宽，写 7 个字等于糊成一片 */
    return C.clip(t, max || clipN());
  }

  /* ---------- 范围：册 / 章 / 焦点 / 层数 ---------- */

  function inScope(n) {
    if (state.vol !== 'all' && n.vol !== state.vol) return false;
    if (state.ch !== 'all' && chOf(n) !== String(state.ch)) return false;
    return true;
  }

  /* prerequisite 邻域：从焦点节出发 hops 跳（只用节级先修边） */
  function secHood(seedId, hops) {
    var keep = {};
    if (!seedId) return keep;
    keep[seedId] = 1;
    var frontier = [seedId];
    for (var h = 0; h < hops; h++) {
      var next = [];
      G.edges.forEach(function (e) {
        if (e.r !== 'prerequisite_of') return;
        var a = frontier.indexOf(e.s) >= 0, b = frontier.indexOf(e.d) >= 0;
        if (a && !keep[e.d]) { keep[e.d] = 1; next.push(e.d); }
        if (b && !keep[e.s]) { keep[e.s] = 1; next.push(e.s); }
      });
      frontier = next;
      if (!frontier.length) break;
    }
    return keep;
  }

  function pickNodes() {
    var keep = {};
    /* 邻域是按「节」算的（secHood 只用节级先修边走），但焦点可能是知识点——
       从练习页「回到图上」带过来的就是 kp id。这里先把它归到所在节，
       否则 hood 里存的是 kp id、okSec 拿节 id 去查，一个都命不中，整张图会是空的。 */
    var seed = state.focus;
    var fn = seed ? byId[seed] : null;
    if (fn && secIdOf(fn)) seed = secIdOf(fn);
    var hood = (state.depth !== 'all' && seed) ? secHood(seed, state.depth === 'sec' ? 0 : 1) : null;
    function okSec(n) {
      if (!inScope(n)) return false;
      if (!hood) return true;
      return !!hood[secIdOf(n)];
    }
    /* 素养筛选：只有知识点和方法有素养归属（都是两跳派生的）。
       册/章/节/思想这些结构节点不参与筛选——勾了一个素养就把目录也一起藏掉，
       人会以为「这一章没了」。符合任一项即可（竞品也是这个口径）。 */
    var cpSel = Object.keys(state.cps || {}).filter(function (k) { return state.cps[k]; });
    var CPX = cpSel.length ? cpIndex() : null;
    function cpOk(n) {
      if (!CPX) return true;
      if (n.kind !== 'knowledge_point' && n.kind !== 'skill') return true;
      var m = (n.kind === 'skill' ? CPX.cpsOfSk[n.id] : cpsOfPoint(n.id)) || {};
      for (var i = 0; i < cpSel.length; i++) { if (m[cpSel[i]]) return true; }
      return false;
    }
    /* 全景档：只放结构（册 / 章 / 思想 / 素养），不按册章过滤——
       总览的价值就是「一眼看到六册」，被当前册裁掉就只剩一本书。 */
    if (state.view === 'overview') {
      G.nodes.forEach(function (n) {
        if (n.kind === 'volume' || n.kind === 'chapter' || n.kind === 'thought' || n.kind === 'competency') keep[n.id] = 1;
      });
      return keep;
    }
    if (state.view === 'skeleton' || state.view === 'kp' || state.view === 'chart') {
      var k = state.view === 'skeleton' ? 'section' : 'knowledge_point';
      G.nodes.forEach(function (n) { if (n.kind === k && okSec(n) && cpOk(n)) keep[n.id] = 1; });
      return keep;
    }
    /* 思想层是跨册的，没有 vol/sec，不能按册过滤；它的成员是「方法」，
       方法是挂在节下的，所以册/章筛选作用在方法上，思想本身始终留着 */
    if (state.view === 'thought') {
      G.nodes.forEach(function (n) {
        if (n.kind === 'thought') keep[n.id] = 1;
        /* 思想视图要看全六册：它的价值就在「跨册」，被邻域裁掉就什么都不剩 */
        else if (n.kind === 'skill' && inScope(n) && cpOk(n)) keep[n.id] = 1;
      });
      return keep;
    }
    var kind = state.view;
    G.nodes.forEach(function (n) { if (n.kind === kind && okSec(n) && cpOk(n)) keep[n.id] = 1; });
    var rel = kind === 'skill' ? 'applies_to' : 'misconception_of';
    G.edges.forEach(function (e) { if (e.r === rel && keep[e.s]) keep[e.d] = 1; });
    return keep;
  }

  /* ---------- 元素 ---------- */

  /* relsFor 只回答「这一档允许哪些关系」；「默认关掉哪几种」统一在 buildSet 的 off 表里，
     两处分工别混（overview 要 is_part_of，chart/skeleton/kp 都不要）。 */
  function relsFor(view) {
    /* 方法视图两种边：方法→知识点（它挂在哪个点上）与方法→方法（它得先会哪几步）。
       方法之间的前后置教材里没有原文，是从「挂点早于本节」反推的，所以画虚线。 */
    /* 全景档只画结构性归属；思想→章那条线是聚合出来的，在 buildSet 里另加 */
    if (view === 'overview') return ['is_part_of'];
    /* 方法视图给两个方向：方法 → 知识（applies_to，解题可用）与 知识 → 方法（uses_skill，这个点会用到它）。
       竞品的图例就是这么分的（实线解题可用 / 虚线使用知识），两者不是同一件事：
       一条说「这个方法能解这类题」，另一条说「讲这个点时得先会那套动作」。
       只在单章 / 整册档给两向——六册档 1340 个节点，边数翻倍会把图糊掉。 */
    if (view === 'skill') {
      var both = scopeOf() === 'chapter' || scopeOf() === 'book';
      return both ? ['applies_to', 'uses_skill', 'prerequisite_of'] : ['applies_to', 'prerequisite_of'];
    }
    if (view === 'misconception') return ['misconception_of'];
    if (view === 'thought') return ['belongs_to'];
    /* 骨架图两种边都给：先修是「能不能学」，教材顺序是「书上排在哪」，
       两者不是一回事，所以要能同时看见、也要能分辨（实线 / 虚线） */
    if (view === 'skeleton') return ['prerequisite_of', 'sequence'];
    /* 章图只画点与点的先修；节与节的两种关系由 addSecLinks 折算成线（教材顺序与跨节依赖） */
    return ['prerequisite_of'];
  }

  function mkNode(n) {
    var sz = sizeOf(n.kind);
    var qn = 0;
    if (n.kind === 'section') qn = secQ[n.vol + '-' + n.sec] || 0;
    if (n.kind === 'knowledge_point') qn = n.qn || 0;
    return {
      group: 'nodes',
      data: {
        id: n.id, label: shortOf(n), kind: n.kind, vol: n.vol, sec: n.sec,
        /* lod2 档（0.45-0.85 倍）用更短的一截，让整册视图也读得出差别 */
        short: C.clip(C.tidy(n.title || ''), clipN()),
        ch: chOf(n), title: n.title, w: sz.w, h: sz.h,
        tier: n.tier || 'core', qn: qn, deeper: n.deeper ? 1 : 0,
        level: n.level || ''
      },
      classes: n.kind + (qn ? ' hasq' : '')
    };
  }

  /* Whole-course field: thoughts as triangles, chapters as labels,
     knowledge points as colored dots. Cross-chapter links stay visible.
     Clicking a dot draws where it grows from; the writeup floats on the canvas. */
  /* Textbook methods stay green. Enrichment is amber. Contest is violet. */
  function skillDot(node) {
    var tier = node && node.tier;
    if (tier === 'extend') return '#e08a2e';
    if (tier === 'olympiad') return '#7c3aed';
    return '#17a34a';
  }

  function buildMind() {
    var DOTS = ['#d9a20a', '#6d5bd0', '#3b82f6', '#129a62', '#e08a2e', '#d4547a'];
    var nodes = [], edges = [], at = {};
    function put(n, role, extra) {
      /* 有题的节点要能一眼看出来：mind 档的点是菱形/圆点，用 underlay 画一圈琥珀外环，
         方形 underlay 套在菱形上会像顶了个框，所以另立 mind-q 类（见 styleSheet） */
      var qn = role === 'sk' ? 0 : (n.qn || (n.sec ? (secQ[n.vol + '-' + n.sec] || 0) : 0));
      var el = {
        group: 'nodes',
        data: {
          id: n.id, label: extra.label || '', short: extra.short || extra.label || '',
          kind: n.kind, vol: n.vol || '', sec: n.sec || '',
          ch: n.ch != null && n.ch !== '' ? String(n.ch) : '', title: n.title,
          tier: n.tier || '',
          w: extra.w || 8, h: extra.h || 8, role: role, dot: extra.dot || '#3b82f6', qn: qn
        },
        classes: 'mind mind-' + role + ' ' + n.kind + (qn ? ' mind-q' : ''),
        position: extra.pos
      };
      nodes.push(el);
      at[n.id] = el;
      return el;
    }
    function topThought(sid) {
      var id = thMain(sid), guard = 0;
      while (id && byId[id] && byId[id].level !== 'thought' && byId[id].parent && guard++ < 6) id = byId[id].parent;
      return (byId[id] && byId[id].level === 'thought') ? id : null;
    }
    var vols = [];
    ((MC.catalog && MC.catalog.volumes) || []).forEach(function (v) { vols.push(v.id); });
    if (!vols.length) vols = ['701', '702', '801', '802', '901', '902'];
    var thoughts = [];
    G.nodes.forEach(function (n) { if (n.kind === 'thought' && n.level === 'thought') thoughts.push(n); });
    thoughts.sort(function (a, b) { return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0); });
    /* Thought mode is its own map: six ideas on top, families underneath. */
    if (state.kind === 'thought') {
      var families = [];
      G.nodes.forEach(function (n) { if (n.kind === 'thought' && n.level === 'family') families.push(n); });
      thoughts.forEach(function (t, i) {
        var name = C.tidy(t.title);
        put(t, 'th', { label: name, short: name, w: 22, h: 18, pos: { x: 180 + (i % 3) * 420, y: 80 + Math.floor(i / 3) * 280 } });
      });
      var under = {};
      families.forEach(function (f) {
        var p = f.parent && at[f.parent];
        var slot = under[f.parent] || 0;
        under[f.parent] = slot + 1;
        var name = C.tidy(f.title);
        put(f, 'fam', {
          label: name, short: name, w: Math.max(80, name.length * 13), h: 22,
          pos: { x: (p ? p.position.x : 180) + ((slot % 2) - 0.5) * 160, y: (p ? p.position.y : 80) + 56 + Math.floor(slot / 2) * 36 }
        });
        if (p) edges.push({ group: 'edges', data: { id: 'tf|' + f.parent + '|' + f.id, source: f.parent, target: f.id, r: 'belongs_to', x: 'th' } });
      });
      return { nodes: nodes, edges: edges };
    }
    /* One cloud for the whole course. Related dots start near each other,
       then a fixed force pass pulls real edges tight and keeps the field compact.
       No randomness, so the picture is the same on every open. */
    /* 六册全景只画到「章」这一层。
       1531 个知识点铺在一屏里的实测结果是一张没有一句能读的网（0.51 倍、1505 个点没字），
       而 26 个章名 + 章与章的依赖已经能回答「这本书怎么长、先学哪块」。点开一个章再看节与点。 */
    /* 章节点的 id 是 C701-01（补零两位），拿 'C'+vol+'-'+ch 去拼会拼出 C701-1，
       at[] 里查不到，于是七年级两册的章间先修线整片丢掉（实测只画出 29/83 条）。 */
    function chKey(vol, ch) {
      var c = String(ch);
      if (c.length < 2) c = '0' + c;
      return 'C' + vol + '-' + c;
    }

    function buildChapterMap() {
      var MAXW = 1080, GAPX = 14, GAPY = 30;
      var chs = [];
      vols.forEach(function (vid) {
        G.nodes.forEach(function (n) { if (n.kind === 'chapter' && n.vol === vid) chs.push(n); });
      });
      chs.sort(function (a, b) { return String(a.vol).localeCompare(String(b.vol)) || Number(a.ch) - Number(b.ch); });
      var x = 0, y = 0, rowH = 0, indent = 0, first = true, curVol = null, pos = {};
      /* 一组（一册）的卡片永远从册名右边起排，换行也缩进到同一列 ——
         不然第 9 章被挤到第二行时看起来像一个独立的组。 */
      function place(n, w, h, role, label) {
        if (!first && x + w > MAXW) { x = indent; y += rowH + GAPY; rowH = 0; }
        pos[n.id] = { x: x + w / 2, y: y + h / 2 };
        put(n, role, { label: label, short: label, w: w, h: h, pos: pos[n.id] });
        x += w + GAPX;
        first = false;
        if (h > rowH) rowH = h;
      }
      chs.forEach(function (ch) {
        if (String(ch.vol) !== String(curVol)) {
          if (curVol !== null) { x = 0; y += rowH + GAPY + 6; rowH = 0; first = true; }
          curVol = ch.vol;
          var vobj = volObj(curVol);
          var vlabel = vobj ? C.tidy(vobj.label) : curVol;
          var vw = Math.max(72, vlabel.length * 13);
          var vnode = null;
          G.nodes.forEach(function (n) { if (n.kind === 'volume' && n.vol === curVol) vnode = n; });
          if (vnode) place(vnode, vw, 24, 'vol', vlabel);
          indent = vw + GAPX + 4;
        }
        /* 章名整句写上卡片，不截断：这里没有画布缩放的余地，卡片宽度是按字数算的 */
        var t = C.tidy(ch.title || '') || ('第' + ch.ch + '章');
        place(ch, Math.max(96, Math.min(268, Math.round(t.length * 13.5) + 20)), 40, 'cch', t);
      });
      /* 章与章之间的依赖：把知识点级先修折算成「哪一章要先学哪一章」，只留一条汇总线。 */
      var pair = {};
      G.edges.forEach(function (e) {
        if (e.r !== 'prerequisite_of') return;
        var a = byId[e.s], b = byId[e.d];
        if (!a || !b || a.kind !== 'knowledge_point' || b.kind !== 'knowledge_point') return;
        var ka = chKey(a.vol, a.ch), kb = chKey(b.vol, b.ch);
        if (ka === kb || !at[ka] || !at[kb]) return;
        pair[ka + '>' + kb] = (pair[ka + '>' + kb] || 0) + 1;
      });
      Object.keys(pair).forEach(function (k) {
        var p = k.split('>');
        edges.push({ group: 'edges', classes: 'ch', data: {
          id: 'chdep|' + k, source: p[0], target: p[1], r: 'prerequisite_of', x: 'seq',
          w: Math.round(Math.max(1, Math.min(3.2, 0.8 + 0.3 * pair[k])) * 10) / 10
        } });
      });
      /* 同一册里相邻两章加一条教材顺序的虚线：它回答「书上排在哪」，与「要先学」不是一回事 */
      chs.forEach(function (ch, i) {
        var nx = chs[i + 1];
        if (!nx || String(nx.vol) !== String(ch.vol)) return;
        edges.push({ group: 'edges', classes: 'ch ch-seq', data: {
          id: 'chseq|' + ch.id + '|' + nx.id, source: ch.id, target: nx.id, r: 'sequence', x: 'seq'
        } });
      });
      return { nodes: nodes, edges: edges };
    }

    if (state.kind === 'all' && (!state.vol || state.vol === 'all')) return buildChapterMap();

    if (state.kind === 'all') {
      /* 「全部章」是章的口径，不是册的口径：册下拉选了八年级上册，
         就不能还把六册的点一起铺出来 —— 那既对不上顶栏写的册，也把图挤成一片点。
         选了册就只画这一册（zoom 从 0.46 抬到 1 以上，字才读得出来）。 */
      if (state.vol && state.vol !== 'all') vols = [String(state.vol)];
      var seq = [];
      function clipDot(node) {
        var s = C.tidy(node.title || ''), c = s.search(/[：:]/);
        if (c > 1) s = s.slice(0, c);
        return s;
      }
      /* Overview label for a chapter. Titles are already "第N章 章名". */
      function chLabel(node) {
        var s = clipDot(node);
        if (!s) s = '第' + node.ch + '章';
        return s;
      }
      vols.forEach(function (vid) {
        var chs = [];
        G.nodes.forEach(function (n) { if (n.kind === 'chapter' && n.vol === vid) chs.push(n); });
        /* 从章级总图点进来的地址带 &ch=N：只画这一章，不再把整册铺开
           （整册 300 个点缩放 0.87，点上的字全被 LOD 收掉，等于没进来）。 */
        if (state.ch && state.ch !== 'all') {
          chs = chs.filter(function (c) { return String(c.ch) === String(state.ch); });
        }
        chs.sort(function (a, b) { return Number(a.ch) - Number(b.ch); });
        chs.forEach(function (ch) {
          seq.push({ n: ch, role: 'ch' });
          var items = [];
          G.nodes.forEach(function (n) {
            if (n.kind === 'knowledge_point' && n.vol === vid && String(n.ch) === String(ch.ch)) items.push(n);
            else if (n.kind === 'skill' && n.vol === vid && String(chOf(n)) === String(ch.ch)) items.push(n);
          });
          var bySec = {};
          items.forEach(function (k) {
            var key = k.sec || '';
            if (!bySec[key]) bySec[key] = [];
            bySec[key].push(k);
          });
          var secNodes = [];
          G.nodes.forEach(function (n) {
            if (n.kind === 'section' && n.vol === vid && String(n.ch) === String(ch.ch)) secNodes.push(n);
          });
          secNodes.sort(function (a, b) { return secNum(a.sec) - secNum(b.sec); });
          secNodes.forEach(function (sn) {
            seq.push({ n: sn, role: 'sn' });
            (bySec[sn.sec] || []).sort(function (a, b) {
              return String(a.id).localeCompare(String(b.id));
            }).forEach(function (k) {
              seq.push({ n: k, role: k.kind === 'skill' ? 'sk' : 'kp' });
            });
            delete bySec[sn.sec];
          });
          Object.keys(bySec).forEach(function (key) {
            bySec[key].forEach(function (k) {
              seq.push({ n: k, role: k.kind === 'skill' ? 'sk' : 'kp' });
            });
          });
        });
      });
      /* Degree sets the dot size: a chapter that owns many points is visibly larger. */
      var links = {}, chLinks = {};
      function addLink(id) { if (id) links[id] = (links[id] || 0) + 1; }
      G.edges.forEach(function (e) {
        if (e.r === 'prerequisite_of' || e.r === 'applies_to') { addLink(e.s); addLink(e.d); }
      });
      G.nodes.forEach(function (n) {
        if (n.kind === 'knowledge_point') {
          var key = n.vol + ':' + n.ch;
          chLinks[key] = (chLinks[key] || 0) + 1;
        }
      });
      thoughts.forEach(function (t) { links[t.id] = thoughtMethods(t.id).length; });
      var hue = { ch: '#f0b429', sn: '#e7c56a', kp: '#2f7cf6', sk: '#17a34a', th: '#e23d4a' };
      function markSize(role, node) {
        var c = role === 'ch' ? (chLinks[node.vol + ':' + node.ch] || 1) : (links[node.id] || 1);
        var px;
        if (role === 'ch') px = Math.min(16, Math.round(12 + Math.sqrt(c) * 0.28));
        else if (role === 'sn') px = 11;
        else if (role === 'th') px = Math.min(14, Math.round(11 + Math.sqrt(c) * 0.2));
        else if (role === 'kp') px = Math.min(10, Math.round(6 + Math.min(c, 8) * 0.4));
        else px = Math.min(9, Math.round(5 + Math.min(c, 8) * 0.35));
        return px;
      }
      /* Seed chapter neighborhoods so they nearly touch, then relax on the real edges.
         Applies-to keeps a method on its point, prerequisites weave the chain,
         and a chapter only gently holds its own points so the cloud stays one piece. */
      function placeCloud(list) {
        var items = list.map(function (it) {
          return { id: it.n.id, role: it.role, n: it.n, px: markSize(it.role, it.n) };
        });
        var n = items.length;
        var x = new Array(n), y = new Array(n);
        var vx = new Array(n), vy = new Array(n);
        var rad = new Array(n), mass = new Array(n);
        var idx = {};
        var phi = 2.399963229728653;
        items.forEach(function (it, i) {
          idx[it.id] = i;
          vx[i] = 0;
          vy[i] = 0;
          rad[i] = it.role === 'ch' ? 16 : (it.role === 'sn' ? 13 : 14);
          mass[i] = it.role === 'ch' ? 3 : (it.role === 'sn' ? 2.2 : (it.role === 'th' ? 2.2 : 1));
        });
        var groups = [], cur = null;
        items.forEach(function (it, i) {
          if (it.role === 'ch') {
            cur = { head: i, members: [i], R: 0, cx: 0, cy: 0 };
            groups.push(cur);
          } else if (it.role !== 'th' && cur) cur.members.push(i);
        });
        groups.forEach(function (g) { g.R = 36 + 9.2 * Math.sqrt(g.members.length); });
        groups.forEach(function (g, gi) {
          if (!gi) return;
          var ang = gi * phi, dist = groups[0].R + g.R, guard = 0, ok = false;
          while (!ok && guard++ < 240) {
            var cx = Math.cos(ang) * dist, cy = Math.sin(ang) * dist, hit = false;
            for (var p = 0; p < gi; p++) {
              var dx = cx - groups[p].cx, dy = cy - groups[p].cy;
              var need = g.R + groups[p].R + 8;
              if (dx * dx + dy * dy < need * need) { hit = true; break; }
            }
            if (!hit) { g.cx = cx; g.cy = cy; ok = true; }
            else dist += 4;
          }
          if (!ok) { g.cx = Math.cos(ang) * dist; g.cy = Math.sin(ang) * dist; }
        });
        groups.forEach(function (g) {
          x[g.head] = g.cx;
          y[g.head] = g.cy;
          var subs = [];
          var cur = null;
          for (var k = 1; k < g.members.length; k++) {
            var i = g.members[k];
            if (items[i].role === 'sn') {
              cur = { head: i, members: [] };
              subs.push(cur);
            } else if (cur) cur.members.push(i);
            else {
              cur = { head: null, members: [] };
              subs.push(cur);
              cur.members.push(i);
            }
          }
          subs.forEach(function (s, si) {
            var ang = si * phi;
            var rr = subs.length < 2 ? 0 : (24 + 18 * Math.sqrt(si));
            var scx = g.cx + Math.cos(ang) * rr;
            var scy = g.cy + Math.sin(ang) * rr;
            if (s.head != null) { x[s.head] = scx; y[s.head] = scy; }
            s.members.forEach(function (mi, mk) {
              var a2 = mk * phi;
              var r2 = 12 + 6.2 * Math.sqrt(mk + 1);
              x[mi] = scx + Math.cos(a2) * r2;
              y[mi] = scy + Math.sin(a2) * r2;
            });
          });
        });
        items.forEach(function (it, i) {
          if (it.role !== 'th') return;
          var sx = 0, sy = 0, c = 0;
          thoughtMethods(it.id).forEach(function (s) {
            var j = idx[s.id];
            if (j == null) return;
            sx += x[j]; sy += y[j]; c++;
          });
          x[i] = c ? sx / c : 0;
          y[i] = c ? sy / c : 0;
        });
        /* Existing prerequisites pull whole chapters together.
           Section edges stay the contract; knowledge-point edges add weight
           so a chapter pair with more real links sits closer.
           Rest does not grow with chapter radius: a large chapter used to
           land farther away than a chapter with no link at all.
           Pairs share one accumulated step so a later link cannot drag
           an earlier pair apart. Same-chapter links stay out. */
        var chapterPairs = (function pullChaptersBySection() {
          var members = {};
          var chNode = {};
          items.forEach(function (it, i) {
            if (!it.n || it.role === 'th') return;
            var key = null;
            if (it.n.ch != null) key = it.n.vol + ':' + it.n.ch;
            else if (it.n.vol && it.n.sec) {
              var secNo = String(it.n.sec);
              var dot = secNo.indexOf('.');
              key = it.n.vol + ':' + (dot > 0 ? secNo.slice(0, dot) : secNo);
            }
            if (!key) return;
            (members[key] || (members[key] = [])).push(i);
            if (it.role === 'ch') chNode[key] = it.id;
          });
          var weight = {};
          G.edges.forEach(function (e) {
            if (e.r !== 'prerequisite_of') return;
            var ia = idx[e.s], ib = idx[e.d];
            if (ia == null || ib == null) return;
            var a = items[ia], b = items[ib];
            if (!a || !b || a.role !== 'sn' || b.role !== 'sn') return;
            if (a.n.vol === b.n.vol && String(a.n.ch) === String(b.n.ch)) return;
            var ka = a.n.vol + ':' + a.n.ch, kb = b.n.vol + ':' + b.n.ch;
            var pk = ka < kb ? (ka + '|' + kb) : (kb + '|' + ka);
            weight[pk] = (weight[pk] || 0) + 1;
          });
          G.edges.forEach(function (e) {
            if (e.r !== 'prerequisite_of') return;
            var ia = idx[e.s], ib = idx[e.d];
            if (ia == null || ib == null) return;
            var a = items[ia], b = items[ib];
            if (!a || !b || a.role !== 'kp' || b.role !== 'kp') return;
            if (a.n.vol === b.n.vol && String(a.n.ch) === String(b.n.ch)) return;
            var ka = a.n.vol + ':' + a.n.ch, kb = b.n.vol + ':' + b.n.ch;
            if (!ka || !kb || ka === kb) return;
            var pk = ka < kb ? (ka + '|' + kb) : (kb + '|' + ka);
            weight[pk] = (weight[pk] || 0) + 1;
          });
          /* Stronger cross-chapter links settle nearer. The floor keeps
             short chapter titles from landing on the same point. */
          function restFor(count) {
            return Math.max(200, 340 - 46 * Math.min(Math.sqrt(count), 3));
          }
          var pairs = Object.keys(weight).map(function (pk) {
            var parts = pk.split('|');
            return {
              a: parts[0], b: parts[1],
              ida: chNode[parts[0]], idb: chNode[parts[1]],
              rest: restFor(weight[pk]),
              w: Math.min(2.2, Math.sqrt(weight[pk]))
            };
          });
          function center(key) {
            var arr = members[key];
            if (!arr || !arr.length) return null;
            var sx = 0, sy = 0;
            arr.forEach(function (i) { sx += x[i]; sy += y[i]; });
            return { x: sx / arr.length, y: sy / arr.length };
          }
          function shiftChapter(key, dx, dy) {
            (members[key] || []).forEach(function (i) { x[i] += dx; y[i] += dy; });
          }
          function accumulate(moves, key, dx, dy) {
            var m = moves[key] || (moves[key] = { x: 0, y: 0 });
            m.x += dx;
            m.y += dy;
          }
          /* Apply one pass of stored moves, capped so a busy chapter cannot jump. */
          function applyMoves(moves, cap) {
            Object.keys(moves).forEach(function (key) {
              var m = moves[key];
              var len = Math.sqrt(m.x * m.x + m.y * m.y) || 0.01;
              var scale = len > cap ? cap / len : 1;
              shiftChapter(key, m.x * scale, m.y * scale);
            });
          }
          /* Pull linked chapters toward rest and push them apart when closer. */
          function linkPass(pullCap, pushCap) {
            var moves = {};
            pairs.forEach(function (p) {
              var ca = center(p.a), cb = center(p.b);
              if (!ca || !cb) return;
              var dx = cb.x - ca.x, dy = cb.y - ca.y;
              var dist = Math.sqrt(dx * dx + dy * dy) || 0.01;
              var ux = dx / dist, uy = dy / dist;
              var mag;
              if (dist < p.rest) mag = -Math.min(pushCap, (p.rest - dist) * 0.45);
              else mag = Math.min(pullCap, (dist - p.rest) * 0.22 * p.w);
              if (Math.abs(mag) < 0.4) return;
              accumulate(moves, p.a, ux * mag * 0.5, uy * mag * 0.5);
              accumulate(moves, p.b, -ux * mag * 0.5, -uy * mag * 0.5);
            });
            applyMoves(moves, 18);
          }
          /* Keep chapters with no shared prerequisite from sitting on each other. */
          function sepPass(limit) {
            var moves = {};
            var keys = Object.keys(members);
            for (var i = 0; i < keys.length; i++) {
              for (var j = i + 1; j < keys.length; j++) {
                var pk = keys[i] < keys[j] ? (keys[i] + '|' + keys[j]) : (keys[j] + '|' + keys[i]);
                if (weight[pk]) continue;
                var ca2 = center(keys[i]), cb2 = center(keys[j]);
                if (!ca2 || !cb2) continue;
                var dx2 = cb2.x - ca2.x, dy2 = cb2.y - ca2.y;
                var dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2) || 0.01;
                if (dist2 >= limit) continue;
                var push = Math.min(14, (limit - dist2) * 0.35);
                var ux2 = dx2 / dist2, uy2 = dy2 / dist2;
                accumulate(moves, keys[i], -ux2 * push * 0.5, -uy2 * push * 0.5);
                accumulate(moves, keys[j], ux2 * push * 0.5, uy2 * push * 0.5);
              }
            }
            applyMoves(moves, 16);
          }
          /* Nudge any pair that would draw two chapter titles on one spot. */
          function openNames() {
            var keys = Object.keys(members);
            for (var i = 0; i < keys.length; i++) {
              for (var j = i + 1; j < keys.length; j++) {
                var ca3 = center(keys[i]), cb3 = center(keys[j]);
                if (!ca3 || !cb3) continue;
                var dx3 = cb3.x - ca3.x, dy3 = cb3.y - ca3.y;
                var dist3 = Math.sqrt(dx3 * dx3 + dy3 * dy3) || 0.01;
                if (dist3 >= 150) continue;
                var push3 = Math.min(8, (150 - dist3) * 0.5);
                var ux3 = dx3 / dist3, uy3 = dy3 / dist3;
                shiftChapter(keys[i], -ux3 * push3 * 0.5, -uy3 * push3 * 0.5);
                shiftChapter(keys[j], ux3 * push3 * 0.5, uy3 * push3 * 0.5);
              }
            }
          }
          function settle() {
            for (var pass = 0; pass < 160; pass++) {
              linkPass(14, 16);
              sepPass(280);
            }
            for (var t = 0; t < 8; t++) openNames();
          }
          var saved = {};
          function saveCenters() {
            Object.keys(members).forEach(function (key) {
              var c = center(key);
              if (c) saved[key] = { x: c.x, y: c.y };
            });
          }
          function restoreCenters() {
            Object.keys(saved).forEach(function (key) {
              var c = center(key);
              if (!c) return;
              shiftChapter(key, saved[key].x - c.x, saved[key].y - c.y);
            });
            Object.keys(members).forEach(function (key) {
              var sx = 0, sy = 0, c = 0, head = null;
              members[key].forEach(function (i) {
                if (items[i].role === 'ch') head = i;
                if (items[i].role !== 'sn') return;
                sx += x[i]; sy += y[i]; c++;
              });
              if (head != null && c) { x[head] = sx / c; y[head] = sy / c; }
            });
          }
          settle();
          saveCenters();
          return { pairs: pairs, settle: settle, restoreCenters: restoreCenters };
        })();
        var springs = [];
        function spring(aId, bId, rest, k) {
          var a = idx[aId], b = idx[bId];
          if (a == null || b == null || a === b) return;
          springs.push({ a: a, b: b, rest: rest, k: k });
        }
        chapterPairs.pairs.forEach(function (p) {
          if (p.ida && p.idb) spring(p.ida, p.idb, p.rest, 0.05);
        });
        var chId = {};
        G.nodes.forEach(function (c) {
          if (c.kind === 'chapter') chId[c.vol + ':' + c.ch] = c.id;
        });
        items.forEach(function (it) {
          if (it.role === 'sn') {
            var cid = chId[it.n.vol + ':' + it.n.ch];
            if (cid) spring(cid, it.id, 56, 0.04);
          } else if (it.role === 'kp' || it.role === 'sk') {
            var sid = secIdOf(it.n);
            if (sid) spring(sid, it.id, 24, 0.08);
          }
        });
        G.edges.forEach(function (e) {
          if (idx[e.s] == null || idx[e.d] == null) return;
          if (e.r === 'prerequisite_of' && items[idx[e.s]].role === 'kp' && items[idx[e.d]].role === 'kp') {
            spring(e.s, e.d, 40, 0.04);
          } else if (e.r === 'applies_to') spring(e.s, e.d, 30, 0.055);
        });
        var cell = 72, iters = 130;
        for (var t = 0; t < iters; t++) {
          var cool = 1 - t / iters;
          var fx = new Array(n), fy = new Array(n);
          for (var i = 0; i < n; i++) { fx[i] = 0; fy[i] = 0; }
          var bucket = {};
          for (var i = 0; i < n; i++) {
            var bk = Math.floor(x[i] / cell) + ',' + Math.floor(y[i] / cell);
            (bucket[bk] || (bucket[bk] = [])).push(i);
          }
          for (var i = 0; i < n; i++) {
            var kx = Math.floor(x[i] / cell), ky = Math.floor(y[i] / cell);
            for (var ox = -1; ox <= 1; ox++) {
              for (var oy = -1; oy <= 1; oy++) {
                var arr = bucket[(kx + ox) + ',' + (ky + oy)];
                if (!arr) continue;
                for (var p = 0; p < arr.length; p++) {
                  var j = arr[p];
                  if (j <= i) continue;
                  var ddx = x[i] - x[j], ddy = y[i] - y[j];
                  var dist = Math.sqrt(ddx * ddx + ddy * ddy) || 0.01;
                  var minD = rad[i] + rad[j];
                  var push = 380 / (dist * dist);
                  if (dist < minD) push += (minD - dist) * 2.1;
                  var ux = ddx / dist, uy = ddy / dist;
                  fx[i] += ux * push; fy[i] += uy * push;
                  fx[j] -= ux * push; fy[j] -= uy * push;
                }
              }
            }
          }
          for (var s = 0; s < springs.length; s++) {
            var e = springs[s];
            var ddx = x[e.b] - x[e.a], ddy = y[e.b] - y[e.a];
            var dist = Math.sqrt(ddx * ddx + ddy * ddy) || 0.01;
            var pull = (dist - e.rest) * e.k;
            var ux = ddx / dist, uy = ddy / dist;
            fx[e.a] += ux * pull; fy[e.a] += uy * pull;
            fx[e.b] -= ux * pull; fy[e.b] -= uy * pull;
          }
          var speed = 14 * cool + 2;
          for (var i = 0; i < n; i++) {
            fx[i] -= x[i] * 0.004;
            fy[i] -= y[i] * 0.004;
            vx[i] = (vx[i] + fx[i]) * 0.5;
            vy[i] = (vy[i] + fy[i]) * 0.5;
            var sp = Math.sqrt(vx[i] * vx[i] + vy[i] * vy[i]) || 0.01;
            if (sp > speed) { vx[i] = vx[i] / sp * speed; vy[i] = vy[i] / sp * speed; }
            x[i] += vx[i] * 0.16 / mass[i];
            y[i] += vy[i] * 0.16 / mass[i];
          }
        }
        chapterPairs.restoreCenters();
        var ths = [];
        items.forEach(function (it, i) { if (it.role === 'th') ths.push(i); });
        for (var pass = 0; pass < 36; pass++) {
          for (var a = 0; a < ths.length; a++) {
            for (var b = a + 1; b < ths.length; b++) {
              var i = ths[a], j = ths[b];
              var ddx = x[i] - x[j], ddy = y[i] - y[j];
              var dist = Math.sqrt(ddx * ddx + ddy * ddy) || 0.01;
              var minD = 86;
              if (dist >= minD) continue;
              var push = (minD - dist) * 0.45;
              var ux = ddx / dist, uy = ddy / dist;
              x[i] += ux * push; y[i] += uy * push;
              x[j] -= ux * push; y[j] -= uy * push;
            }
          }
        }
        /* Last pass: push any pair that still sits closer than its gap. */
        for (var sep = 0; sep < 28; sep++) {
          var bucket2 = {};
          for (var i = 0; i < n; i++) {
            var bk2 = Math.floor(x[i] / cell) + ',' + Math.floor(y[i] / cell);
            (bucket2[bk2] || (bucket2[bk2] = [])).push(i);
          }
          for (var i = 0; i < n; i++) {
            var kx2 = Math.floor(x[i] / cell), ky2 = Math.floor(y[i] / cell);
            for (var ox2 = -1; ox2 <= 1; ox2++) {
              for (var oy2 = -1; oy2 <= 1; oy2++) {
                var arr2 = bucket2[(kx2 + ox2) + ',' + (ky2 + oy2)];
                if (!arr2) continue;
                for (var p2 = 0; p2 < arr2.length; p2++) {
                  var j2 = arr2[p2];
                  if (j2 <= i) continue;
                  var sdx = x[i] - x[j2], sdy = y[i] - y[j2];
                  var sd = Math.sqrt(sdx * sdx + sdy * sdy) || 0.01;
                  var gap = rad[i] + rad[j2];
                  if (sd >= gap) continue;
                  var spush = (gap - sd) * 0.5;
                  var sux = sdx / sd, suy = sdy / sd;
                  x[i] += sux * spush; y[i] += suy * spush;
                  x[j2] -= sux * spush; y[j2] -= suy * spush;
                }
              }
            }
          }
        }
        /* Seat each section in the middle of its own points and methods,
           then seat the chapter in the middle of its sections. */
        items.forEach(function (it, h) {
          if (it.role !== 'sn') return;
          var sx = 0, sy = 0, c = 0;
          items.forEach(function (m, i) {
            if (i === h || (m.role !== 'kp' && m.role !== 'sk')) return;
            if (secIdOf(m.n) !== it.id) return;
            sx += x[i]; sy += y[i]; c++;
          });
          if (!c) return;
          var hx = sx / c, hy = sy / c;
          x[h] = hx; y[h] = hy;
          items.forEach(function (m, i) {
            if (i === h || (m.role !== 'kp' && m.role !== 'sk')) return;
            if (secIdOf(m.n) !== it.id) return;
            var ddx = x[i] - hx, ddy = y[i] - hy;
            var dist = Math.sqrt(ddx * ddx + ddy * ddy) || 0.01;
            if (dist >= 16) return;
            x[i] += (ddx / dist) * (16 - dist);
            y[i] += (ddy / dist) * (16 - dist);
          });
        });
        /* Move a section together with its points so the name stays in the middle. */
        function shiftSection(h, dx, dy) {
          x[h] += dx;
          y[h] += dy;
          var sid = items[h].id;
          items.forEach(function (m, i) {
            if (i === h || (m.role !== 'kp' && m.role !== 'sk')) return;
            if (secIdOf(m.n) !== sid) return;
            x[i] += dx;
            y[i] += dy;
          });
        }
        var secHeads = [];
        items.forEach(function (it, i) { if (it.role === 'sn') secHeads.push(i); });
        for (var sp = 0; sp < 16; sp++) {
          for (var a = 0; a < secHeads.length; a++) {
            for (var b = a + 1; b < secHeads.length; b++) {
              var ia = secHeads[a], ib = secHeads[b];
              if (items[ia].n.vol !== items[ib].n.vol || String(items[ia].n.ch) !== String(items[ib].n.ch)) continue;
              var sdx = x[ia] - x[ib], sdy = y[ia] - y[ib];
              var sd = Math.sqrt(sdx * sdx + sdy * sdy) || 0.01;
              if (sd >= 84) continue;
              var spush = (84 - sd) * 0.5;
              var sux = sdx / sd, suy = sdy / sd;
              shiftSection(ia, sux * spush, suy * spush);
              shiftSection(ib, -sux * spush, -suy * spush);
            }
          }
        }
        groups.forEach(function (g) {
          var sx = 0, sy = 0, c = 0;
          for (var k = 1; k < g.members.length; k++) {
            if (items[g.members[k]].role !== 'sn') continue;
            sx += x[g.members[k]]; sy += y[g.members[k]]; c++;
          }
          if (!c) return;
          var hx = sx / c, hy = sy / c;
          x[g.head] = hx; y[g.head] = hy;
          for (var m = 1; m < g.members.length; m++) {
            if (items[g.members[m]].role !== 'sn') continue;
            var i = g.members[m];
            var ddx = x[i] - hx, ddy = y[i] - hy;
            var dist = Math.sqrt(ddx * ddx + ddy * ddy) || 0.01;
            if (dist >= 36) continue;
            shiftSection(i, (ddx / dist) * (36 - dist), (ddy / dist) * (36 - dist));
          }
        });
        chapterPairs.restoreCenters();
        return { items: items, x: x, y: y };
      }
      var cloud = placeCloud(seq);
      var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
      cloud.x.forEach(function (v, i) {
        if (v < minX) minX = v;
        if (v > maxX) maxX = v;
        if (cloud.y[i] < minY) minY = cloud.y[i];
        if (cloud.y[i] > maxY) maxY = cloud.y[i];
      });
      /* 画布是横的、这团点是圆的：一比一摆进去，宽度只能用到一半（实测 48%）。
         所以按画布的宽高比把这团横向摊开一点，最多 1.3 倍；再大就失真，读者会觉得图被拉扁了。 */
      var aspK = 1;
      try {
        var canvasAsp = (cy && cy.height() ? cy.width() / cy.height() : 1.6);
        var cloudAsp = (maxX - minX) / Math.max(1, maxY - minY);
        if (cloudAsp > 0.2 && canvasAsp > cloudAsp) aspK = Math.min(1.3, canvasAsp / cloudAsp);
      } catch (eAsp) {}
      cloud.items.forEach(function (it, i) {
        var name = clipDot(it.n);
        put(it.n, it.role, {
          label: it.role === 'ch' ? chLabel(it.n) : (it.role === 'th' ? name : ''),
          short: it.role === 'sn' ? secPlain(it.n.vol, it.n.sec) : name,
          dot: it.role === 'sk' ? skillDot(it.n) : (hue[it.role] || hue.kp),
          w: it.px,
          h: it.role === 'th' ? Math.round(it.px * 0.86) : it.px,
          pos: { x: (cloud.x[i] - minX) * aspK + 36, y: cloud.y[i] - minY + 36 }
        });
      });
      G.nodes.forEach(function (k) {
        if (!at[k.id]) return;
        if (k.kind === 'section') {
          var cid = null;
          G.nodes.forEach(function (c) {
            if (!cid && c.kind === 'chapter' && c.vol === k.vol && String(c.ch) === String(k.ch)) cid = c.id;
          });
          if (cid && at[cid]) {
            edges.push({ group: 'edges', data: {
              id: 'part|' + cid + '|' + k.id, source: cid, target: k.id, r: 'is_part_of', x: 'part'
            } });
          }
        } else if (k.kind === 'knowledge_point' || k.kind === 'skill') {
          var sid = secIdOf(k);
          if (sid && at[sid]) {
            edges.push({ group: 'edges', data: {
              id: 'part|' + sid + '|' + k.id, source: sid, target: k.id, r: 'is_part_of', x: 'part'
            } });
          }
        }
      });
      G.edges.forEach(function (e) {
        var a = at[e.s], b = at[e.d];
        if (!a || !b) return;
        if (e.r === 'prerequisite_of' && a.data.role === 'kp' && b.data.role === 'kp') {
          edges.push({ group: 'edges', data: {
            id: 'web|' + e.s + '|' + e.d, source: e.s, target: e.d, r: 'prerequisite_of', x: 'web'
          } });
        } else if (e.r === 'applies_to' && a.data.role === 'sk' && b.data.role === 'kp') {
          edges.push({ group: 'edges', data: {
            id: 'app|' + e.s + '|' + e.d, source: e.s, target: e.d, r: 'applies_to', x: 'app'
          } });
        }
      });
      return { nodes: nodes, edges: edges };
    }
    /* t01: a hairline web of small marks, chapter names floating on clusters.
       Positions stay fixed across visits (preset), not a force layout. */
    var TINT = ['#2f6fad', '#3d7eb8', '#4e8cc4', '#2a6299', '#5a96cc', '#3474b0'];
    /* Wide cells so a chapter is a field of separate dots, not a solid disk. */
    var cellW = state.kind === 'all' ? 980 : 520;
    var blocks = [];
    vols.forEach(function (vid, vi) {
      var vobj = volObj(vid);
      var vlabel = vobj ? C.tidy(vobj.label) : vid;
      var chs = [];
      G.nodes.forEach(function (n) { if (n.kind === 'chapter' && n.vol === vid) chs.push(n); });
      chs.sort(function (a, b) { return Number(a.ch) - Number(b.ch); });
      var local = [], y = 36;
      var vnode = null;
      G.nodes.forEach(function (n) { if (n.kind === 'volume' && n.vol === vid) vnode = n; });
      if (vnode) local.push({ n: vnode, role: 'vol', label: vlabel, x: cellW / 2, y: 8, w: Math.max(48, vlabel.length * 12), h: 14 });
      chs.forEach(function (ch) {
        var kps = [];
        var allMode = state.kind === 'all';
        G.nodes.forEach(function (n) {
          if (n.kind === 'knowledge_point' && (allMode || (state.kind !== 'chapter' && state.kind !== 'skill'))) {
            if (n.vol === vid && String(n.ch) === String(ch.ch)) kps.push(n);
          } else if (n.kind === 'skill' && (allMode || state.kind === 'skill')) {
            if (n.vol === vid && String(chOf(n)) === String(ch.ch)) kps.push(n);
          }
        });
        kps.sort(function (a, b) {
          return String(a.sec).localeCompare(String(b.sec)) || String(a.id).localeCompare(String(b.id));
        });
        var skillMode = state.kind === 'skill';
        var spread = state.kind === 'all' ? 26 : (skillMode ? 18 : 13);
        var R = state.kind === 'chapter' ? 36 : (36 + spread * Math.sqrt(Math.max(1, kps.length)));
        var cx = cellW / 2, cy = y + R + 14;
        var title = C.tidy(ch.title);
        local.push({ n: ch, role: 'ch', label: title, x: cx, y: cy - R - 10, w: Math.max(64, title.length * 12), h: 16 });
        var tintN = 0, secTint = {};
        kps.forEach(function (k, i) {
          if (secTint[k.sec] == null) secTint[k.sec] = TINT[tintN++ % TINT.length];
          var ang = i * 2.399963;
          var rad = 22 + spread * Math.sqrt(i);
          var name = C.tidy(k.title), cut = name.search(/[：:]/);
          if (cut > 1) name = name.slice(0, cut);
          var isSk = k.kind === 'skill';
          local.push({
            n: k, role: (skillMode || isSk) ? 'sk' : 'kp', label: '', short: name,
            dot: (skillMode || isSk) ? skillDot(k) : secTint[k.sec],
            x: cx + Math.cos(ang) * rad, y: cy + Math.sin(ang) * rad,
            w: (skillMode || isSk) ? 8 : 9, h: (skillMode || isSk) ? 8 : 9
          });
        });
        y = cy + R + 28;
      });
      blocks.push({ vi: vi, h: y + 12, items: local });
    });
    var rowH = [80, 80];
    blocks.forEach(function (b) {
      var row = Math.floor(b.vi / 3);
      rowH[row] = Math.max(rowH[row] || 0, b.h);
    });
    var fieldW = cellW * 3;
    if (state.kind !== 'chapter' && state.kind !== 'all') thoughts.forEach(function (t, i) {
      var name = C.tidy(t.title);
      put(t, 'th', {
        label: name, short: name, w: 16, h: 14,
        pos: { x: 80 + (i + 0.5) * ((fieldW - 80) / Math.max(1, thoughts.length)), y: 18 }
      });
    });
    blocks.forEach(function (b) {
      var col = b.vi % 3, row = Math.floor(b.vi / 3);
      var ox = col * cellW + 30;
      var oy = 48 + (row ? rowH[0] + 24 : 0);
      b.items.forEach(function (it) {
        put(it.n, it.role, {
          label: it.label || '', short: it.short || it.label || '',
          w: it.w, h: it.h, dot: it.dot,
          pos: { x: ox + it.x, y: oy + it.y }
        });
      });
    });
    /* One web: knowledge lines, method lines, and thought lines on the same field. */
    if (state.kind === 'all') {
      thoughts.forEach(function (t) {
        var linked = thoughtMethods(t.id).filter(function (s) { return at[s.id]; });
        if (!linked.length) return;
        var sx = 0, sy = 0;
        linked.forEach(function (s) { sx += at[s.id].position.x; sy += at[s.id].position.y; });
        var name = C.tidy(t.title);
        put(t, 'th', {
          label: name, short: name, w: 16, h: 14,
          pos: { x: sx / linked.length, y: sy / linked.length - 36 }
        });
        linked.forEach(function (s) {
          edges.push({ group: 'edges', data: {
            id: 'th|' + s.id + '|' + t.id, source: s.id, target: t.id, r: 'belongs_to', x: 'th'
          } });
        });
      });
      G.edges.forEach(function (e) {
        var a = at[e.s], b = at[e.d];
        if (!a || !b) return;
        if (e.r === 'prerequisite_of' && a.data.role === 'kp' && b.data.role === 'kp') {
          edges.push({ group: 'edges', data: {
            id: 'web|' + e.s + '|' + e.d, source: e.s, target: e.d, r: 'prerequisite_of', x: 'web'
          } });
        } else if (e.r === 'applies_to' && a.data.role === 'sk' && b.data.role === 'kp') {
          edges.push({ group: 'edges', data: {
            id: 'app|' + e.s + '|' + e.d, source: e.s, target: e.d, r: 'applies_to', x: 'app'
          } });
        }
      });
    } else if (state.kind === 'chapter') {
      var chNodes = {}, seqPrev = {};
      Object.keys(at).forEach(function (id) {
        if (at[id].data.role !== 'ch') return;
        chNodes[at[id].data.vol + '-' + at[id].data.ch] = id;
      });
      var pair = {};
      G.edges.forEach(function (e) {
        if (e.r !== 'prerequisite_of') return;
        var a = byId[e.s], b = byId[e.d];
        if (!a || !b || a.kind !== 'knowledge_point' || b.kind !== 'knowledge_point') return;
        var sa = chNodes[a.vol + '-' + a.ch], sb = chNodes[b.vol + '-' + b.ch];
        if (!sa || !sb || sa === sb) return;
        pair[sa + '>' + sb] = 1;
      });
      Object.keys(pair).forEach(function (k) {
        var p = k.split('>');
        edges.push({ group: 'edges', data: { id: 'net|' + k, source: p[0], target: p[1], r: 'prerequisite_of', x: 'net' } });
      });
    } else {
      var want = state.kind === 'skill' ? 'sk' : 'kp';
      var ex = state.kind === 'skill' ? 'skw' : 'web';
      G.edges.forEach(function (e) {
        if (e.r !== 'prerequisite_of') return;
        var a = at[e.s], b = at[e.d];
        if (!a || !b || a.data.role !== want || b.data.role !== want) return;
        edges.push({ group: 'edges', data: {
          id: 'web|' + e.s + '|' + e.d, source: e.s, target: e.d, r: 'prerequisite_of', x: ex
        } });
      });
    }
    return { nodes: nodes, edges: edges };
  }

  /* Zoom of the same mesh: left is earlier, right is later, the rows below are this chapter. */
  function buildLocal(id) {
    var n = byId[id];
    var nodes = [], edges = [];
    function clip(node) {
      var s = C.tidy(node.title || ''), c = s.search(/[：:]/);
      if (c > 1) s = s.slice(0, c);
      return s.length > 14 ? s.slice(0, 14) + '…' : s;
    }
    function put(node, role, extra) {
      nodes.push({
        group: 'nodes',
        data: {
          id: node.id, label: extra.label || '', short: extra.short || extra.label || '',
          kind: node.kind, vol: node.vol || '', sec: node.sec || '',
          ch: node.ch != null ? node.ch : '', title: node.title,
          w: extra.w || 14, h: extra.h || 14, role: role, dot: extra.dot || '#2f6fad'
        },
        classes: 'mind mind-' + role + ' ' + node.kind,
        position: extra.pos
      });
    }
    function tag(tid, text, x, y) {
      nodes.push({
        group: 'nodes',
        data: { id: tid, label: text, short: text, kind: 'tag', vol: '', sec: '', ch: '', title: text, w: 48, h: 16, role: 'tag', dot: '#5c6b80' },
        classes: 'mind mind-tag',
        position: { x: x, y: y }
      });
    }
    if (!n || (n.kind !== 'knowledge_point' && n.kind !== 'skill')) {
      state.local = null;
      return buildMind();
    }
    if (n.kind === 'skill') {
      var linked = kpsUnder(n.id).slice(0, 18);
      tag('loc-h', '这条方法联系的知识点', 480, 28);
      put(n, 'sknow', { label: clip(n), short: clip(n), dot: skillDot(n), w: 18, h: 18, pos: { x: 480, y: 110 } });
      linked.forEach(function (k, i) {
        var col = i % 6, row = Math.floor(i / 6);
        put(k, 'pre', { label: clip(k), short: clip(k), dot: '#2f6fad', pos: { x: 120 + col * 150, y: 240 + row * 78 } });
        edges.push({ group: 'edges', data: { id: 'loc|' + n.id + '|' + k.id, source: n.id, target: k.id, r: 'applies_to', x: 'loc' } });
      });
      return { nodes: nodes, edges: edges };
    }
    var prev = prevOf(n.id).filter(function (x) { return x.kind === 'knowledge_point'; }).slice(0, 6);
    var nxt = nextOf(n.id).filter(function (x) { return x.kind === 'knowledge_point'; }).slice(0, 6);
    var seen = {};
    seen[n.id] = 1;
    prev.forEach(function (x) { seen[x.id] = 1; });
    nxt.forEach(function (x) { seen[x.id] = 1; });
    var sib = [];
    G.nodes.forEach(function (x) {
      if (x.kind === 'knowledge_point' && x.vol === n.vol && String(x.ch) === String(n.ch) && !seen[x.id]) sib.push(x);
    });
    sib.sort(function (a, b) {
      return String(a.sec).localeCompare(String(b.sec)) || String(a.id).localeCompare(String(b.id));
    });
    tag('loc-pre', '前置', 220, 36);
    tag('loc-now', '当前', 520, 36);
    tag('loc-post', '后续', 820, 36);
    var chNode = null;
    G.nodes.forEach(function (x) {
      if (!chNode && x.kind === 'chapter' && x.vol === n.vol && String(x.ch) === String(n.ch)) chNode = x;
    });
    if (chNode) put(chNode, 'ch', { label: C.tidy(chNode.title), w: Math.max(80, C.tidy(chNode.title).length * 12), h: 22, pos: { x: 520, y: 70 } });
    prev.forEach(function (p, i) {
      put(p, 'pre', { label: clip(p), short: clip(p), dot: '#2a6299', pos: { x: 220, y: 140 + i * 70 } });
      edges.push({ group: 'edges', data: { id: 'loc|' + p.id + '|' + n.id, source: p.id, target: n.id, r: 'prerequisite_of', x: 'loc' } });
    });
    put(n, 'now', { label: clip(n), short: clip(n), dot: '#14324f', w: 22, h: 22, pos: { x: 520, y: 150 } });
    nxt.forEach(function (p, i) {
      put(p, 'post', { label: clip(p), short: clip(p), dot: '#5a96cc', pos: { x: 820, y: 140 + i * 70 } });
      edges.push({ group: 'edges', data: { id: 'loc|' + n.id + '|' + p.id, source: n.id, target: p.id, r: 'prerequisite_of', x: 'loc' } });
    });
    var methods = skillsOf(n.id).slice(0, 5);
    methods.forEach(function (s, i) {
        put(s, 'sklab', { label: clip(s), short: clip(s), dot: skillDot(s), w: 14, h: 14, pos: { x: 360 + i * 80, y: 250 } });
    });
    var bySec = {}, order = [];
    sib.forEach(function (x) {
      var key = String(x.sec);
      if (!bySec[key]) { bySec[key] = []; order.push(key); }
      bySec[key].push(x);
    });
    var y = 420;
    order.forEach(function (sec) {
      var sid = secIdOf({ vol: n.vol, sec: sec });
      var sn = sid && byId[sid];
      if (sn) put(sn, 'sec', { label: C.tidy(sn.title), w: 120, h: 16, pos: { x: 70, y: y } });
      bySec[sec].forEach(function (p, i) {
        var col = i % 16, row = Math.floor(i / 16);
        put(p, 'sib', { label: '', short: clip(p), dot: '#3d7eb8', w: 8, h: 8, pos: { x: 200 + col * 42, y: y + row * 26 } });
      });
      y += 36 + Math.floor((bySec[sec].length - 1) / 16) * 26;
    });
    return { nodes: nodes, edges: edges };
  }

  /* Highlight the chain a knowledge point grows from. Does not move the field. */
  function clearGrow() {
    if (!cy) return;
    cy.batch(function () {
      cy.edges('[x = "grow"]').remove();
      cy.elements().removeClass('mind-hot mind-dim mind-on');
    });
  }
  var homePos = null;
  var motionGen = 0;
  /* Cancel an in-flight pull. Do not call the graph engine's stop():
     stopping every node at once freezes later position writes. */
  function haltMotion() {
    motionGen++;
  }
  /* Drop the focus drawing: lines and dots go back to the cloud. */
  function releaseFocus() {
    if (!cy) return;
    haltMotion();
    cy.batch(function () {
      cy.edges('[x = "grow"]').remove();
      cy.elements().removeClass('mind-hot mind-dim mind-on mind-tight mind-secpick mind-secwait mind-secview mind-up mind-upedge dim sel nb');
      cy.nodes().forEach(function (node) { node.removeData('out'); });
    });
    /* 焦点态把非邻域的线设成 e-x（不画）。退出焦点必须把底纹还回来，
       否则点空白回到总图时只剩一堆没有线的点（ux 复验实测可见边 3698→7）。 */
    restEdges();
    state.local = null;
    state.zoomed = false;
    state.focus = null;
    state.openSec = '';
    clearCallouts();
    detailEmpty();
    /* 十字档是「焦点是谁」的产物：收起焦点却不重排版面，画布就一直是 hidden，
       屏上留着上一个点的卡片——点「回到总图」看起来像卡住了（实测 cyW=0 且 cards=17）。 */
    syncCross();
    if (hintEl && state.view === 'mind') hintEl.textContent = hintText();
    fillControls();
    restoreHome(true);
    if (state.view === 'mind') frameHome();
  }
  /* A click beside a focused dot is a miss on that dot, not a request to leave. */
  function nearLive(pos) {
    if (!cy || !pos) return false;
    var hit = false;
    cy.nodes('.mind-hot, .mind-on').forEach(function (n) {
      if (hit) return;
      var dx = n.position('x') - pos.x;
      var dy = n.position('y') - pos.y;
      if (dx * dx + dy * dy < 64 * 64) hit = true;
    });
    return hit;
  }
  /* Camera back to the whole cloud, using the saved layout rather than the pulled ring. */
  function frameHome() {
    if (!cy || !homePos) { fitView(56); return; }
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity, any = false;
    Object.keys(homePos).forEach(function (id) {
      var p = homePos[id];
      any = true;
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    });
    if (!any) { fitView(56); return; }
    var w = Math.max(1, maxX - minX), h = Math.max(1, maxY - minY);
    var z = Math.min(1.2, (cy.width() - 56) / w, (cy.height() - 40) / h);
    try {
      cy.animate({
        zoom: z,
        pan: {
          x: (cy.width() - w * z) / 2 - minX * z,
          y: (cy.height() - h * z) / 2 - minY * z
        }
      }, { duration: 560, easing: 'ease-in-out-cubic' });
    } catch (eH) {}
  }
  /* Layout positions, so a focus can pull related dots in and put them back. */
  function rememberHome() {
    if (!cy || homePos) return;
    homePos = {};
    cy.nodes().forEach(function (n) {
      homePos[n.id()] = { x: n.position('x'), y: n.position('y') };
    });
  }
  function restoreHome(animated) {
    if (!cy || !homePos) return;
    cy.nodes().forEach(function (n) {
      var p = homePos[n.id()];
      if (!p) return;
      n.removeData('out');
      if (animated) glide(n, p);
      else n.position(p);
    });
  }
  /* Slide a dot by writing its position each frame. The graph engine's own
     animation stalls when hundreds of nodes are stopped in one turn. */
  function glide(node, pos) {
    if (!node || !node.length) return;
    var c = node.position();
    var x0 = c.x, y0 = c.y;
    var dx = pos.x - x0, dy = pos.y - y0;
    if (dx * dx + dy * dy < 2) return;
    var gen = motionGen;
    var t0 = (window.performance && performance.now) ? performance.now() : Date.now();
    function step(now) {
      if (gen !== motionGen || !node.length) return;
      var t = Math.min(1, (((now || Date.now()) - t0) / 420));
      var e = 1 - Math.pow(1 - t, 3);
      node.position({ x: x0 + dx * e, y: y0 + dy * e });
      scheduleCallouts();
      if (t < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }
  /* Spread neighbors around the focus, in the same circular order they came from. */
  function pullAround(origin, others) {
    var placed = others.map(function (node) {
      var h = homePos[node.id()] || node.position();
      return { node: node, ang: Math.atan2(h.y - origin.y, h.x - origin.x) };
    });
    placed.sort(function (a, b) { return a.ang - b.ang; });
    var count = placed.length;
    var per = count > 24 ? 14 : Math.max(1, count);
    var base = count > 16 ? 72 : (count > 8 ? 100 : 118);
    var gap = count > 16 ? 40 : 0;
    placed.forEach(function (p, i) {
      var ring = Math.floor(i / per);
      var onRing = Math.min(per, count - ring * per);
      var start = placed[ring * per].ang;
      var ang = start + (i % per) * ((Math.PI * 2) / onRing);
      var r = base + ring * gap;
      p.ang = ang;
      p.pos = { x: origin.x + Math.cos(ang) * r, y: origin.y + Math.sin(ang) * r };
    });
    return placed;
  }
  /* A chapter is a field of sections, not one ring of unnamed dots. */
  function focusChapter(id) {
    if (!cy) return;
    var n = byId[id];
    var el = cy.getElementById(id);
    if (!n || !el || !el.length) return;
    if (!homePos) rememberHome();
    var wasZoomed = !!state.zoomed;
    haltMotion();
    cy.edges('[x = "grow"]').remove();
    state.openSec = '';
    var ids = {};
    ids[id] = 1;
    G.nodes.forEach(function (x) {
      if (x.vol !== n.vol || String(chOf(x)) !== String(n.ch)) return;
      if (x.kind === 'knowledge_point' || x.kind === 'skill' || x.kind === 'section') ids[x.id] = 1;
    });
    cy.batch(function () {
      cy.elements().removeClass('mind-hot mind-dim mind-on mind-tight mind-secpick mind-secwait mind-secview mind-up mind-upedge');
      cy.nodes().forEach(function (node) {
        if (!ids[node.id()]) { node.addClass('mind-dim'); return; }
        node.addClass(node.id() === id ? 'mind-hot' : 'mind-on');
        var d = byId[node.id()];
        if (node.id() !== id && (!d || d.kind !== 'section')) node.addClass('mind-tight');
      });
      cy.edges().forEach(function (e) {
        if (!ids[e.source().id()] || !ids[e.target().id()]) e.addClass('mind-dim');
      });
      var origin = homePos[id] || { x: el.position('x'), y: el.position('y') };
      cy.nodes('.mind-sn').forEach(function (node) {
        if (!ids[node.id()]) return;
        var p = homePos[node.id()] || node.position();
        var ang = Math.atan2(p.y - origin.y, p.x - origin.x);
        var out = (ang > -0.8 && ang < 0.8) ? 'right'
          : (ang >= 0.8 && ang < 2.4) ? 'bottom'
          : (ang >= -2.4 && ang <= -0.8) ? 'top' : 'left';
        node.data('out', out);
      });
    });
    state.zoomed = true;
    var minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    Object.keys(ids).forEach(function (nid) {
      var p = homePos[nid];
      if (!p) return;
      if (p.x < minX) minX = p.x;
      if (p.y < minY) minY = p.y;
      if (p.x > maxX) maxX = p.x;
      if (p.y > maxY) maxY = p.y;
    });
    try {
      var reserve = 460;
      var bw = Math.max(120, maxX - minX + 70);
      var bh = Math.max(120, maxY - minY + 70);
      var z = Math.min((cy.width() - reserve - 24) / bw, (cy.height() - 28) / bh);
      if (z > 1.2) z = 1.2;
      if (z < 0.7) z = 0.7;
      var viewCx = Math.max(180, (cy.width() - reserve) / 2);
      cy.viewport({
        zoom: z,
        pan: {
          x: viewCx - ((minX + maxX) / 2) * z,
          y: cy.height() / 2 - ((minY + maxY) / 2) * z
        }
      });
    } catch (eC) {}
    var gen = motionGen;
    cy.nodes().forEach(function (node) {
      var home = homePos[node.id()];
      if (!home) return;
      if (ids[node.id()] || wasZoomed) glide(node, home);
    });
    setTimeout(function () {
      if (gen !== motionGen) return;
      cy.nodes().forEach(function (node) {
        var home = homePos[node.id()];
        if (home && (ids[node.id()] || wasZoomed)) node.position(home);
      });
      scheduleCallouts();
    }, 460);
    scheduleCallouts();
    if (hintEl) hintEl.textContent = '浅黄点是节。名字在点旁边的框里，线指回那个节。';
    fillControls();
  }
  /* Magnify one section: its point stays in the middle, each neighbor gets a name box. */
  function focusSection(id) {
    if (!cy) return;
    var n = byId[id];
    var el = cy.getElementById(id);
    if (!n || !el || !el.length) return;
    if (!homePos) rememberHome();
    var wasZoomed = !!state.zoomed;
    haltMotion();
    cy.edges('[x = "grow"]').remove();
    state.openSec = n.sec || '';
    var ids = {};
    ids[id] = 1;
    var others = [];
    G.nodes.forEach(function (x) {
      if (x.vol !== n.vol || String(x.sec) !== String(n.sec)) return;
      if (x.kind !== 'knowledge_point' && x.kind !== 'skill') return;
      ids[x.id] = 1;
      var node = cy.getElementById(x.id);
      if (node && node.length) others.push(node);
    });
    var origin = homePos[id] || { x: el.position('x'), y: el.position('y') };
    var count = others.length;
    var base = count > 14 ? 128 : 148;
    var up = parentChapter(n);
    var chNode = up ? cy.getElementById(up.id) : null;
    if (!chNode || !chNode.length || chNode.id() === id) { chNode = null; up = null; }
    if (chNode) ids[chNode.id()] = 1;
    var placed = others.map(function (node) {
      var h = homePos[node.id()] || node.position();
      return { node: node, ang: Math.atan2(h.y - origin.y, h.x - origin.x) };
    });
    placed.sort(function (a, b) { return a.ang - b.ang; });
    /* Leave the top of the ring open so the chapter node can sit there. */
    var sky = 1.2;
    var arc0 = -Math.PI / 2 + sky / 2;
    var sweep = Math.PI * 2 - sky;
    placed.forEach(function (p, i) {
      var ang = count > 1 ? (arc0 + i * sweep / (count - 1)) : (Math.PI / 2);
      p.ang = ang;
      p.pos = { x: origin.x + Math.cos(ang) * base, y: origin.y + Math.sin(ang) * base };
    });
    cy.batch(function () {
      cy.elements().removeClass('mind-hot mind-dim mind-on mind-tight mind-secpick mind-secwait mind-secview mind-up mind-upedge');
      cy.nodes().forEach(function (node) {
        if (!ids[node.id()]) { node.addClass('mind-dim'); return; }
        node.addClass(node.id() === id ? 'mind-hot' : 'mind-on');
        if (chNode && node.id() === chNode.id()) node.addClass('mind-up');
        else if (node.id() !== id) node.addClass('mind-secview');
      });
      cy.edges().forEach(function (e) {
        var a = e.source().id(), b = e.target().id();
        if (!ids[a] || !ids[b]) { e.addClass('mind-dim'); return; }
        if (chNode && ((a === id && b === chNode.id()) || (b === id && a === chNode.id()))) e.addClass('mind-upedge');
      });
      placed.forEach(function (p) {
        var ang = p.ang;
        var out = (ang > -0.85 && ang < 0.85) ? 'right'
          : (ang >= 0.85 && ang < 2.35) ? 'bottom'
          : (ang >= -2.35 && ang <= -0.85) ? 'top' : 'left';
        p.node.data('out', out);
      });
      el.data('out', 'top');
      if (chNode) chNode.data('out', 'right');
    });
    state.zoomed = true;
    var chPos = null;
    try {
      var reserve = 460;
      var viewW = Math.max(480, cy.width() - reserve);
      var zH = (cy.height() * 0.46) / Math.max(90, base + 36);
      var zW = (viewW * 0.5) / Math.max(90, base + 36);
      var z = Math.min(zH, zW);
      if (z < 1.2) z = 1.2;
      if (z > 1.4) z = 1.4;
      var viewCx = Math.max(180, (cy.width() - reserve) / 2);
      if (chNode) {
        var room = Math.max(96, cy.height() / 2 - 78);
        var dist = Math.min(base + 68, room / z);
        if (dist < 96) dist = 96;
        chPos = { x: origin.x, y: origin.y - dist };
      }
      cy.viewport({
        zoom: z,
        pan: {
          x: viewCx - origin.x * z,
          y: cy.height() / 2 - origin.y * z
        }
      });
    } catch (eS) {}
    var gen = motionGen;
    var moves = [[el, origin]];
    placed.forEach(function (p) { moves.push([p.node, p.pos]); });
    if (chNode && chPos) moves.push([chNode, chPos]);
    if (wasZoomed) {
      cy.nodes().forEach(function (node) {
        if (ids[node.id()]) return;
        var home = homePos[node.id()];
        if (home) moves.push([node, home]);
      });
    }
    moves.forEach(function (pair) { glide(pair[0], pair[1]); });
    setTimeout(function () {
      if (gen !== motionGen) return;
      moves.forEach(function (pair) {
        if (pair[0] && pair[0].length) pair[0].position(pair[1]);
      });
      scheduleCallouts();
    }, 460);
    scheduleCallouts();
    if (hintEl) hintEl.textContent = chNode
      ? '这一节已放大。上方金色的点是这一章，点它回到章。'
      : '这一节已放大。每个框对应一个点，线指回那个点。';
    fillControls();
  }
  /* Pull linked dots onto a ring around this one. The rest glide home and fade. */
  function focusAround(id) {
    if (!cy) return;
    var n = byId[id];
    var el = cy.getElementById(id);
    if (!n || !el || !el.length) return;
    if (n.kind === 'chapter') { focusChapter(id); return; }
    if (n.kind === 'section') { focusSection(id); return; }
    if (!homePos) rememberHome();
    var wasZoomed = !!state.zoomed;
    haltMotion();
    cy.edges('[x = "grow"]').remove();
    var hood = el.closedNeighborhood();
    var origin = homePos[id] || { x: el.position('x'), y: el.position('y') };
    var others = [];
    hood.nodes().forEach(function (node) { if (node.id() !== id) others.push(node); });
    var many = others.length > 16;
    var placed = pullAround(origin, others);
    var moving = {};
    var maxR = 80;
    placed.forEach(function (p) {
      moving[p.node.id()] = p;
      var d = Math.hypot(p.pos.x - origin.x, p.pos.y - origin.y);
      if (d > maxR) maxR = d;
    });
    cy.batch(function () {
      cy.elements().removeClass('mind-hot mind-dim mind-on mind-tight mind-secpick mind-secwait mind-secview mind-up mind-upedge');
      cy.elements().not(hood).addClass('mind-dim');
      el.addClass('mind-hot');
      hood.nodes().not(el).addClass('mind-on');
      if (many) hood.nodes().not(el).addClass('mind-tight');
    });
    state.zoomed = true;
    try {
      var viewH = cy.height();
      var reserve = 460;
      var viewW = Math.max(480, cy.width() - reserve);
      var zH = (viewH * 0.28) / Math.max(80, maxR);
      var zW = (viewW * 0.30) / Math.max(80, maxR);
      var z = Math.min(zH, zW);
      if (z < 1.35) z = 1.35;
      if (z > 1.65) z = 1.65;
      if (many) z = Math.min(z, 1.4);
      /* Keep the ring in the open part of the full canvas. The note floats on top. */
      var cx = Math.max(180, (cy.width() - reserve) / 2);
      cy.viewport({
        zoom: z,
        pan: {
          x: cx - origin.x * z,
          y: cy.height() / 2 - origin.y * z
        }
      });
    } catch (eF) {}
    var moves = [];
    cy.nodes().forEach(function (node) {
      var nid = node.id();
      if (nid === id) {
        node.removeData('out');
        moves.push([node, origin]);
        return;
      }
      var hit = moving[nid];
      if (hit) {
        var ang = hit.ang;
        var out = (ang > -0.85 && ang < 0.85) ? 'right'
          : (ang >= 0.85 && ang < 2.35) ? 'bottom'
          : (ang >= -2.35 && ang <= -0.85) ? 'top' : 'left';
        node.data('out', out);
        moves.push([node, hit.pos]);
      } else if (wasZoomed) {
        node.removeData('out');
        var home = homePos[nid];
        if (home) moves.push([node, home]);
      } else node.removeData('out');
    });
    var gen = motionGen;
    moves.forEach(function (pair) { glide(pair[0], pair[1]); });
    setTimeout(function () {
      if (gen !== motionGen) return;
      moves.forEach(function (pair) {
        if (pair[0] && pair[0].length) pair[0].position(pair[1]);
      });
      scheduleCallouts();
    }, 460);
    scheduleCallouts();
    if (hintEl) hintEl.textContent = '连着的点被拉到周围，换一个焦点，其余的滑回原处。';
    fillControls();
  }
  /* 焦点只有一个口径：中心点 + 它直接连着的这一圈。
     从题目返回（带 node= 进来）和在图里点一下，必须标出同一批点——
     否则后者有 8 个名字框、前者只剩中心一个，看着就像「图坏了」。
     方向偏好给 left：讲解卡浮在右边，名字框往左挂才不会压在卡上。 */
  function markFocus(id) {
    var el = cy.getElementById(id);
    if (!el || !el.length) return null;
    var keep = el.closedNeighborhood();
    cy.batch(function () {
      cy.nodes().removeClass('mind-hot mind-on');
      cy.nodes().addClass('mind-dim');
      el.removeClass('mind-dim').addClass('mind-hot').data('out', 'left');
      keep.nodes().forEach(function (n) {
        if (n.id() === id) return;
        n.removeClass('mind-dim').addClass('mind-on');
        if (!n.data('out')) n.data('out', 'left');
      });
    });
    return keep;
  }

  function showGrow(id) {
    if (!cy || state.view !== 'mind') return;
    var n = byId[id];
    cy.batch(function () {
      cy.edges('[x = "grow"]').remove();
      markFocus(id);
      if (!n) return;
      if (n.kind !== 'knowledge_point' && n.kind !== 'skill') return;
      var seen = {}, frontier = [id], hops = 0, links = [];
      seen[id] = 1;
      while (frontier.length && hops < 3) {
        var nxt = [];
        frontier.forEach(function (fid) {
          prevOf(fid).forEach(function (p) {
            if (!p || seen[p.id] || !cy.getElementById(p.id).length) return;
            seen[p.id] = 1;
            nxt.push(p.id);
            links.push([p.id, fid]);
          });
        });
        frontier = nxt;
        hops++;
      }
      /* 这里原来把全部知识点重新压暗，等于抹掉 markFocus 刚标好的邻域；
         现在只补「先修链」上多出来的点，不再整片压暗。 */
      Object.keys(seen).forEach(function (kid) {
        var el = cy.getElementById(kid);
        el.removeClass('mind-dim').addClass(kid === id ? 'mind-hot' : 'mind-on');
      });
      links.forEach(function (pair) {
        cy.add({ group: 'edges', data: {
          id: 'grow|' + pair[0] + '|' + pair[1], source: pair[0], target: pair[1],
          r: 'prerequisite_of', x: 'grow'
        } });
      });
    });
  }

  /* 连线分两级：不点任何点时全部淡色（只当底纹，看得见但不抢点）；点开一个点后，
     只有这个点自己的线转满色，其余线仍然淡色留在后面。
     曾经试过「只看一圈」把其余线整条不画——试出来的结果是画面反而看不懂：
     读者失去「这里还有别的路」的线索，等于把图剪碎。线要留，只是要淡。 */
  function buildSet() {
    if (state.view === 'mind' && state.local && byId[state.local]) return buildLocal(state.local);
    if (state.view === 'mind') return buildMind();
    /* 结构性归属默认不画：分岛布局（clusterKey 只读节点自带的 vol/ch/sec）已经把
       「章→节→点」讲完了，再画 857 条只会盖住先修骨架。
       overview 档例外——那一档 is_part_of 就是主角。 */
    var off = state.view === 'overview' ? {} : { is_part_of: 1, assessed_by: 1 };
    var keep = pickNodes();
    var nodes = [];
    G.nodes.forEach(function (n) { if (keep[n.id]) nodes.push(mkNode(n)); });
    var rels = relsFor(state.view);
    var edges = [];
    G.edges.forEach(function (e) {
      if (rels.indexOf(e.r) < 0) return;
      if (off[e.r]) return;
      if (!keep[e.s] || !keep[e.d]) return;
      /* x 是边的来路（m=教研人工判定，r=规则推断，sk=方法前置：3b 由挂点推断、3c 逐条起草），
         样式表要靠它把「方法前置」画成虚线，视觉上不能和教研确认过的实线先修混在一起 */
      edges.push({ group: 'edges', data: { id: e.r + '|' + e.s + '|' + e.d, source: e.s, target: e.d, r: e.r, c: e.c || 'r', x: e.x || '' } });
    });
    if (state.view === 'overview') {
      /* 思想 → 章：思想本身没有章，靠「方法 → 它挂在的知识点 → 章」两跳聚合。
         竞品那张图上「一种思想，贯穿各册」就是这个；直接画到点是 826 条线，等于没画。 */
      var thCh = {};
      G.edges.forEach(function (e) {
        if (e.r !== 'applies_to') return;
        var sk = byId[e.s], kp = byId[e.d];
        if (!sk || !kp || !kp.vol || kp.ch == null) return;
        var tk = thMain(e.s);
        if (!tk) return;
        var key = tk + '>' + kp.vol + '-' + kp.ch;
        thCh[key] = (thCh[key] || 0) + 1;
      });
      var chId = chIdMap();
      Object.keys(thCh).forEach(function (k) {
        var p = k.split('>');
        var dst = chId[p[1]];
        if (!dst || !keep[p[0]] || !keep[dst]) return;
        edges.push({ group: 'edges', data: {
          id: 'thch|' + k, source: p[0], target: dst, r: 'belongs_to', c: 'r', x: 'agg', n: thCh[k]
        } });
      });
    }
    return { nodes: nodes, edges: edges };
  }

  /* Chapter that owns a section, knowledge point, or skill. */
  function parentChapter(n) {
    if (!n || n.kind === 'chapter' || n.vol == null || n.ch == null) return null;
    var id = chIdMap()[n.vol + '-' + n.ch];
    return id ? (byId[id] || null) : null;
  }

  /* 章 id 反查表：章节点 id 是 C801-12 这种，靠 vol+ch 才能反查（思想聚合要用） */
  var CH_ID = null;
  function chIdMap() {
    if (!CH_ID) {
      CH_ID = {};
      G.nodes.forEach(function (n) { if (n.kind === 'chapter') CH_ID[n.vol + '-' + n.ch] = n.id; });
    }
    return CH_ID;
  }

  /* ---------- 坐标：岛内网格 + 岛间网格打包 ---------- */

  /* 一条方法可能同时归两个思想；图上只能放在一个岛里，取边里第一条（主思想） */
  var TH_MAIN = null;
  function thMain(sid) {
    if (!TH_MAIN) {
      TH_MAIN = {};
      G.edges.forEach(function (e) {
        if (e.r !== 'belongs_to') return;
        if (!TH_MAIN[e.s]) TH_MAIN[e.s] = e.d;
      });
    }
    return TH_MAIN[sid] || null;
  }

  function clusterKey(n) {
    /* 全景档：一章一岛 = 一册（岛标题就是册名），思想与素养单独立一个跨册的岛 */
    if (state.view === 'overview') {
      if (n.kind === 'thought' || n.kind === 'competency') return 'TH';
      return 'V' + n.vol;
    }
    if (state.view === 'skeleton') return 'C' + n.vol + '-' + (n.ch == null ? '?' : n.ch);
    if (state.view === 'thought') {
      if (n.kind === 'thought') return 'T' + n.id;
      var t = thMain(n.id);
      return t ? ('T' + t) : 'TX';
    }
    /* 六册档不画岛：673 个点分 143 个岛，每个岛还要标题 + 内边距，
       等于把画布拿去装边框。整册档保留节岛（27 个还看得过来）。 */
    if (scopeOf() === 'repo') return 'ALL';
    return secIdOf(n) || 'X';
  }

  function clusterLabel(key) {
    if (key === 'ALL') return '';
    if (key === 'TH') return '思想与素养（跨六册）';
    if (key.charAt(0) === 'V') {
      var vid = key.slice(1);
      var vv = volObj(vid);
      return (vv ? C.tidy(vv.label) : vid) + '（' + (vv ? (vv.chapters || []).length : '?') + ' 章）';
    }
    if (key.charAt(0) === 'T') {
      if (key === 'TX') return '还没归到思想的方法';
      var t = byId[key.slice(1)];
      return t ? C.tidy(t.title) : key.slice(1);
    }
    if (key.charAt(0) === 'C') {
      var parts = key.slice(1).split('-');
      var vid = parts[0], no = parts[1];
      var v = volObj(vid);
      var c = v ? (v.chapters || []).filter(function (x) { return String(x.no) === no; })[0] : null;
      var head = (state.vol === 'all' ? volLabel(vid) + ' · ' : '') + '第 ' + no + ' 章';
      return c ? head + ' ' + C.tidy(c.title) : head;
    }
    if (key === 'X') return '未落在具体节';
    var n = byId[key];
    return n ? C.tidy(n.title) : key;
  }

  function clusterNav(key) {
    if (key === 'ALL') return null;
    if (key === 'TH') return '#/map?view=thought';
    if (key.charAt(0) === 'V') return '#/map?view=chart&vol=' + key.slice(1) + '&ch=all';
    if (key.charAt(0) === 'T') return null;
    if (key.charAt(0) === 'C') {
      var parts = key.slice(1).split('-');
      return '#/map?view=' + state.view + '&vol=' + parts[0] + '&ch=' + parts[1];
    }
    if (key === 'X') return null;
    var n = byId[key];
    return n ? ('#/sec/' + n.vol + '/' + n.sec) : null;
  }

  function sortIn(items) {
    var order = { volume: -1, chapter: 0, section: 1, skill: 2, misconception: 2, knowledge_point: 3, thought: 0, competency: 1 };
    return items.slice().sort(function (a, b) {
      var ka = order[a.kind] == null ? 3 : order[a.kind];
      var kb = order[b.kind] == null ? 3 : order[b.kind];
      if (ka !== kb) return ka - kb;
      if (a.kind === 'section') return secNum(a.sec) - secNum(b.sec);
      return String(a.id) < String(b.id) ? -1 : 1;
    });
  }

  /* 岛内：cols 列网格，逐行排，行高取该行最高 */
  function packIsland(items, cols) {
    var rows = [], i;
    for (i = 0; i < items.length; i += cols) rows.push(items.slice(i, i + cols));
    var rowH = rows.map(function (r) {
      var h = 0;
      r.forEach(function (it) { h = Math.max(h, sizeOf(it.kind).h); });
      return h;
    });
    var w = 0, y = 0, out = [];
    rows.forEach(function (r, ri) {
      var rw = 0;
      r.forEach(function (it) { rw += sizeOf(it.kind).w + GAPX; });
      rw -= GAPX;
      w = Math.max(w, rw);
      var x = 0;
      r.forEach(function (it) {
        var sz = sizeOf(it.kind);
        out.push({ node: it, x: x + sz.w / 2, y: y + rowH[ri] / 2 });
        x += sz.w + GAPX;
      });
      y += rowH[ri] + GAPY;
    });
    return { items: out, w: w, h: y - GAPY };
  }

  /* 章图（spec 4.1）：一岛一节，组内从左到右按先修拓扑，同层纵向排。
     只认「同一节内」的先修边——跨节先修会把整章拉平成一列，看不出这一节自己的结构。 */
  function layersOf(items) {
    var inn = {}, ids = {};
    items.forEach(function (it) { ids[it.id] = 1; });
    G.edges.forEach(function (e) {
      if (e.r !== 'prerequisite_of') return;
      if (!ids[e.s] || !ids[e.d]) return;
      (inn[e.d] = inn[e.d] || []).push(e.s);
    });
    var lv = {}, guard = 0;
    function depth(id) {
      if (lv[id] != null) return lv[id];
      lv[id] = 0;
      if (guard++ > 4000) return 0;                   // 数据若成环，别把页面挂死
      var ps = inn[id] || [], d = 0;
      ps.forEach(function (p) { d = Math.max(d, depth(p) + 1); });
      lv[id] = d;
      return d;
    }
    items.forEach(function (it) { depth(it.id); });
    return lv;
  }

  function packLayers(items) {
    var lv = layersOf(items), cols = {}, maxL = 0;
    items.forEach(function (it) {
      var l = lv[it.id] || 0;
      maxL = Math.max(maxL, l);
      (cols[l] = cols[l] || []).push(it);
    });
    var colW = [], out = [], i, l, x, y, sz;
    for (l = 0; l <= maxL; l++) {
      colW[l] = 0;
      (cols[l] || []).forEach(function (it) { colW[l] = Math.max(colW[l], sizeOf(it.kind).w); });
    }
    var totalH = 0, tw = 0;
    for (l = 0; l <= maxL; l++) {
      var arr = cols[l] || [];
      x = 0;
      for (i = 0; i < l; i++) x += colW[i] + GAPX;
      y = 0;
      arr.forEach(function (it) {
        sz = sizeOf(it.kind);
        out.push({ node: it, x: x + colW[l] / 2, y: y + sz.h / 2 });
        y += sz.h + GAPY;
      });
      totalH = Math.max(totalH, y - GAPY);
      tw += colW[l] + GAPX;
    }
    return { items: out, w: Math.max(0, tw - GAPX), h: Math.max(0, totalH) };
  }

  /* 岛间：先定列数，再用「每列最宽 / 每行最高」打包，保证列对齐 */
  function layoutIslands(groups, order) {
    var availW = (cyEl && cyEl.clientWidth) || 880;
    var cellW = sizeOf('knowledge_point').w + GAPX;
    var packs = order.map(function (k) {
      var g = groups[k];
      var n = g.items.length;
      var cols = 1;
      if (state.view === 'overview') {
        /* 全景档的岛里没有「节」，只有册与章（5-6 个）或思想与素养（22 个）。
           册岛两列刚好「1 册 + 4-5 章」排成 3 行；思想岛 5 列排 5 行——
           否则 22 个思想竖成 8 行，整图被拉高，字就被压到 5px。 */
        cols = n <= 6 ? 2 : (n <= 12 ? 3 : 5);
      } else if (state.view !== 'skeleton') {
        /* 岛内列数按画布宽算，再按「别排成一条竖线」收一档：
           写死 4 个点就一列，整册 27 个岛会排出几千像素的高度。 */
        cols = Math.max(1, Math.floor((availW - IPAD * 2) / cellW));
        cols = Math.min(cols, Math.max(1, Math.ceil(Math.sqrt(n * 1.6))));
      }
      var p = state.view === 'chart' ? packLayers(sortIn(g.items)) : packIsland(sortIn(g.items), cols);
      return { key: k, label: clusterLabel(k), nav: clusterNav(k), n: n, w: p.w, h: p.h, items: p.items };
    });
    var m = packs.length;
    var nCol;
    if (state.view === 'chart') {
      /* 单章：一列，上下一节一节排下去，读完一节再读下一节。
         整册（ch=all）：27 节竖成一列有 2299 高，缩到 2px 一个字，所以按宽度并 2-3 列，
         代价是阅读顺序变成「先读并排这几节、再读下一行」——概览档可以接受。 */
      nCol = 1;
      if (scopeOf() === 'book') {
        var avgW3 = 0;
        packs.forEach(function (p) { avgW3 += p.w; });
        avgW3 = avgW3 / Math.max(1, m);
        nCol = Math.max(1, Math.min(3, Math.floor((availW + IGAP) / (Math.max(120, avgW3) + IGAP))));
      }
    } else if (state.view === 'skeleton') {
      /* 骨架是「地图册」：一章一列。桌面四章并排（整图变宽变矮，一屏放得下）；
         手机只有一列的位置，并排会把字压到 6px，所以窄屏一列、靠拖动翻章。 */
      nCol = availW >= 720 ? Math.min(m, 4) : 1;
    } else {
      /* 岛数多的时候（整册 27 个、六册 143 个）列数必须按宽度算：
         原来写死 4 列，六册 143 个岛排成 36 行，画布高度直接上万像素。 */
      var avgW = 0;
      packs.forEach(function (p) { avgW += p.w; });
      avgW = avgW / Math.max(1, m);
      var fits = Math.floor((availW + IGAP) / (Math.max(60, avgW) + IGAP));
      nCol = Math.max(1, Math.min(m, Math.min(fits, 8)));
      if (m <= 3) nCol = m;
    }
    var rows = [], i;
    for (i = 0; i < m; i += nCol) rows.push(packs.slice(i, i + nCol));
    var colW = [], rowH = rows.map(function () { return 0; });
    rows.forEach(function (r, ri) {
      r.forEach(function (p, ci) {
        colW[ci] = Math.max(colW[ci] || 0, p.w);
        rowH[ri] = Math.max(rowH[ri], p.h);
      });
    });
    /* 岛按自身高度「顶部对齐」，不是行内拉平：一章 5 节和一章 12 节并排时，
       把矮岛垂直居中会看着像悬在半空，也不利于按列读下来。 */
    var y = 0;
    rows.forEach(function (r, ri) {
      var x = 0;
      r.forEach(function (p, ci) {
        p.cx = x + colW[ci] / 2;
        p.cy = y + TITLE_H + IPAD + p.h / 2;   // 岛内容中心（不是行中心）
        p.ty = y + TITLE_H / 2;                // 岛标题中心
        p.iw = colW[ci] + IPAD * 2;
        p.ih = p.h + IPAD * 2;
        p.ix = x;
        p.iy = y;
        x += colW[ci] + IGAP;
      });
      y += TITLE_H + rowH[ri] + IPAD * 2 + IGAP;
    });
    return packs;
  }

  /* 节与节的教材顺序：数据里是 section→section 的 sequence 边，章图上没有节节点，
     把它折算成「前一节最右的点 → 后一节最左的点」一条细虚线，形状上与先修明显不同。 */
  /* 章图上的两种「节与节之间的线」：
     1) 教材顺序（sequence）：书上前一节排在后一节前面 —— 灰蓝细虚线、无箭头；
     2) 跨节依赖：后一节有多少处要用前一节的东西（同章 prerequisite_of 聚合）——
        带箭头，线粗随「处数」涨，n 写进 data 由样式读。
     逐条点级边画在章图上会横穿好几个岛、把整张图糊掉，所以折成「一节一对一条线」，
     保留「哪几节彼此咬着、咬得多紧」这层信息，具体是哪两个点，进节里看。 */
  function secDepPairs() {
    if (depPairCache) return depPairCache;
    var m = {};
    G.edges.forEach(function (e) {
      if (e.r !== "prerequisite_of") return;
      var a = byId[e.s], b = byId[e.d];
      if (!a || !b || a.kind !== "knowledge_point" || b.kind !== "knowledge_point") return;
      /* key 必须和 island 的 key 同构（secIdOf = S+册-节），否则 addSecLinks 一对都配不上 */
      var ka = secIdOf(a), kb = secIdOf(b);
      if (!ka || !kb || ka === kb) return;
      if (a.sec.split(".")[0] !== b.sec.split(".")[0]) return;
      var k = ka + "|" + kb;
      m[k] = (m[k] || 0) + 1;
    });
    depPairCache = m;
    return m;
  }

  function addSecLinks(packs) {
    var dep = secDepPairs();
    var ro = {}, lo = {};
    packs.forEach(function (p) {
      p.items.forEach(function (it) {
        if (!ro[p.key] || it.x > ro[p.key].x) ro[p.key] = it;
        if (!lo[p.key] || it.x < lo[p.key].x) lo[p.key] = it;
      });
    });
    packs.forEach(function (A) {
      packs.forEach(function (B) {
        var n = dep[A.key + "|" + B.key] || 0;
        if (!n) return;
        var ra = ro[A.key], lb = lo[B.key];
        if (!ra || !lb) return;
        set.edges.push({ group: "edges", data: {
          id: "depsec|" + A.key + "|" + B.key, source: ra.node.id, target: lb.node.id,
          r: "prerequisite_of", c: "r", x: "dep", n: n,
          w: Math.max(0.9, Math.min(2.6, 0.7 + 0.22 * n))
        } });
      });
    });
    var has = {};
    G.edges.forEach(function (e) { if (e.r === "sequence") has[e.s + "|" + e.d] = 1; });
    for (var i = 0; i + 1 < packs.length; i++) {
      var A = packs[i], B = packs[i + 1];
      if (!(has[A.key + "|" + B.key] || has[B.key + "|" + A.key])) continue;
      var ra = null, lb = null;
      A.items.forEach(function (it) { if (!ra || it.x > ra.x) ra = it; });
      B.items.forEach(function (it) { if (!lb || it.x < lb.x) lb = it; });
      if (!ra || !lb) continue;
      set.edges.push({ group: "edges", data: {
        id: "seqsec|" + A.key + "|" + B.key, source: ra.node.id, target: lb.node.id,
        r: "sequence", c: "r", x: "seq"
      } });
    }
  }

  function placeElements(packs) {
    var pos = {};
    packs.forEach(function (p) {
      p.items.forEach(function (it) {
        pos[it.node.id] = { x: p.cx + it.x - p.w / 2, y: p.cy + it.y - p.h / 2 };
      });
    });
    return pos;
  }

  function islandElements(packs, tone) {
    var out = [];
    packs.forEach(function (p, i) {
      var t = ISL_TONE[(tone + i) % ISL_TONE.length];
      out.push({
        group: 'nodes',
        data: { id: 'ISL|' + p.key, label: '', tone: t, w: p.iw, h: p.ih },
        position: { x: p.cx, y: p.cy },
        classes: 'island',
        selectable: false, grabbable: false, pannable: false
      });
      out.push({
        group: 'nodes',
        data: { id: 'ISLT|' + p.key, label: p.label, nav: p.nav || '', w: p.iw, h: TITLE_H, tone: t },
        position: { x: p.cx, y: p.ty },
        classes: 'island-label',
        selectable: false, grabbable: false
      });
    });
    return out;
  }

  /* ---------- 样式表 ---------- */

  function look(kind, o) {
    var P = pal();
    var sz = sizeOf(kind);
    var r = { bg: P.card, line: P.lineStrong, ink: P.ink, w: sz.w, h: sz.h };
    /* 册是「一本书」，底色给一点实感（num 蓝极淡）；章是结构，白底绿边，
       与「节」区分开：节已经是绿边，章要更粗更沉，缩远了也数得清几个 */
    if (kind === 'volume') { r.bg = P.numS; r.line = P.num; }
    if (kind === 'chapter') { r.line = P.geo; }
    if (kind === 'competency') { r.bg = P.staS; r.line = P.sta; }
    if (kind === 'section') { r.line = P.geo; }
    if (kind === 'skill') {
      r.line = P.amber;
      if (o && o.tier === 'extend') { r.bg = P.amberS; r.dash = true; }
      if (o && o.tier === 'olympiad') { r.bg = P.amberS; r.double = true; }
    }
    if (kind === 'misconception') { r.bg = P.redS; r.line = P.red; }
    /* 思想层用 sta 紫：整张图里只有它是「跨章节的」，颜色也必须独一份，
       否则孩子会把「一条方法」和「一条思想」看成一类东西。族一级虚线，思想一级实线 */
    if (kind === 'thought') {
      r.bg = P.staS; r.line = P.sta;
      if (o && o.level === 'family') { r.dash = true; }
    }
    return r;
  }

  function styleSheet() {
    var P = pal();
    return [
      { selector: 'node', style: {
        /* label 必须显式声明：只传自定义 style 时，部分 cytoscape 版本不再套用
           默认的 label:'data(label)'，结果是框都画出来、字一个也没有。 */
        'label': 'data(label)',
        'shape': 'round-rectangle',
        'width': 'data(w)', 'height': 'data(h)',
        'background-color': P.card,
        'border-width': 1.5, 'border-color': P.lineStrong,
        'color': P.ink,
        /* 12px / 600 是「白底上看得清」的下限：11.5px + 500 在 0.8 倍缩放下就糊成一团灰 */
        'font-size': 12, 'font-weight': 600,
        'text-valign': 'center', 'text-halign': 'center',
        /* 不用 wrap：text-max-width 走 data mapper 在部分 cytoscape 版本上会让整段文字
           算不出宽度、直接不画（表现为「框都在、字全空」）。短名已经在 shortOf 里截过。 */
        'text-wrap': 'none',
        'transition-property': 'background-color, border-color, opacity',
        'transition-duration': '120ms'
      } },
      /* 节是这张图的骨架：绿边两档，字最深，一眼能数出「这一章有几节」 */
      { selector: 'node.section', style: {
        'background-color': P.card, 'border-color': P.geo, 'border-width': 2,
        'color': P.greenStrong, 'font-weight': 700, 'font-size': 12.5
      } },
      { selector: 'node.knowledge_point', style: {
        'background-color': P.card, 'border-color': P.lineStrong, 'border-width': 1.4,
        'font-size': 11.5, 'font-weight': 550
      } },
      { selector: 'node.knowledge_point[deeper = 1]', style: { 'border-width': 1.6 } },
      { selector: 'node.knowledge_point[deeper = 0]', style: { 'border-style': 'dashed', 'opacity': 0.8 } },
      { selector: 'node.skill', style: {
        'background-color': P.card, 'border-color': P.amber, 'border-width': 1.6, 'font-size': 11.5
      } },
      { selector: 'node.skill[tier = "extend"]', style: {
        'background-color': P.amberS, 'border-style': 'dashed', 'border-width': 1.8
      } },
      { selector: 'node.skill[tier = "olympiad"]', style: {
        'background-color': P.amberS, 'border-style': 'double', 'border-width': 3.4, 'color': P.amber, 'font-weight': 700
      } },
      { selector: 'node.misconception', style: {
        'background-color': P.redS, 'border-color': P.red, 'border-width': 1.6, 'font-size': 11.5
      } },
      /* 思想 = 紫。上位思想实线双边，方法族虚线：一眼分得清「这是大思路」还是「这是某种具体做法」 */
      { selector: 'node.thought', style: {
        'background-color': P.staS, 'border-color': P.sta, 'border-width': 2.2,
        'color': P.sta, 'font-weight': 700, 'font-size': 12.5
      } },
      { selector: 'node.thought[level = "family"]', style: {
        'border-style': 'dashed', 'border-width': 1.8, 'font-weight': 600, 'font-size': 12
      } },
      /* 「有题」不再只靠一层几乎看不见的底：边也变绿加粗，扫一眼就知道哪些点有题可练 */
      { selector: 'node.hasq', style: {
        'underlay-color': P.amber, 'underlay-opacity': 0.24, 'underlay-padding': Math.max(1, Math.round(5 * SC)),
        'underlay-shape': 'round-rectangle'
      } },
      /* mind 档「有题」的环：菱形 / 圆点都用椭圆 underlay，别套方框。
         用琥珀不用绿：绿外环与「先修绿边」撞色，孩子分不清「这圈是题」还是「这个点被选中」。 */
      { selector: 'node.mind-q', style: {
        'underlay-color': P.amber, 'underlay-opacity': 0.3,
        'underlay-padding': 4, 'underlay-shape': 'ellipse'
      } },
      { selector: 'node.knowledge_point.hasq', style: { 'border-color': P.geo } },
      { selector: 'node.section.hasq', style: { 'border-color': P.greenStrong, 'border-width': 2.4 } },
      /* 岛底色用「域色 6% + 实线边」：原来整块铺 soft 色，四章并排时是大片淡色，看着发灰。
         现在底色几乎透出白纸，靠边框和岛标题的彩字分章。 */
      { selector: 'node.island', style: {
        'label': '',
        'shape': 'round-rectangle',
        'width': 'data(w)', 'height': 'data(h)',
        'background-color': P.green, 'background-opacity': 0.05,
        'border-width': 1.5, 'border-color': P.green, 'border-opacity': 0.3, 'border-style': 'solid',
        'events': 'no'
      } },
      { selector: 'node.island[tone = "geoS"]', style: {
        'background-color': P.geo, 'border-color': P.geo
      } },
      { selector: 'node.island[tone = "numS"]', style: {
        'background-color': P.num, 'border-color': P.num
      } },
      { selector: 'node.island[tone = "staS"]', style: {
        'background-color': P.sta, 'border-color': P.sta
      } },
      { selector: 'node.island-label', style: {
        'label': 'data(label)',
        'shape': 'round-rectangle',
        'width': 'data(w)', 'height': 'data(h)',
        'background-opacity': 0, 'border-width': 0,
        'color': P.greenStrong, 'font-size': 12.5, 'font-weight': 750,
        'text-valign': 'center', 'text-halign': 'center',
        'text-wrap': 'none'
      } },
      { selector: 'node.island-label[tone = "geoS"]', style: { 'color': P.geo } },
      { selector: 'node.island-label[tone = "numS"]', style: { 'color': P.num } },
      { selector: 'node.island-label[tone = "staS"]', style: { 'color': P.sta } },
      /* ---------- 边：颜色 = 关系类型，透明度/线宽 = 依据强度 ----------
         颜色只由 r 决定（先修绿 / 方法↔知识蓝 / 思想紫 / 错因红 / 归属与支撑石板灰 / 易混琥珀）
         线型只由 r 决定（实线=照着能做，虚线=推断或方向弱，点线=弱关联）
         箭头有无由 r 决定（对称与归属类无箭头）
         粗细与透明只由 d 决定（m 教研判定 > r 规则推断 > sk 挂点推断 > syn 结构性合成）
         边的颜色一律取 pal() 的 token，不再写死 hex —— 主题一改自动跟着走 */
      { selector: 'edge', style: {
        'width': 1.3, 'line-color': P.inkFaint, 'target-arrow-color': P.inkFaint,
        'target-arrow-shape': 'triangle', 'arrow-scale': 0.75,
        'curve-style': 'bezier', 'opacity': 0.55
      } },
      /* 先修：整张图的骨架，绿。人工判定那条由 d=m 加粗到 2.2 */
      { selector: 'edge[r = "prerequisite_of"]', style: {
        'width': 1.4, 'line-color': P.geo, 'target-arrow-color': P.geo, 'opacity': 0.6
      } },
      /* 方法 ↔ 知识点：同一件事的两个方向，同色不同线型
         （实线 = 这个方法能解它，虚线 = 讲它得先会这套动作）。
         原来一个绿一个蓝，看图的人会以为这是两种关系。 */
      { selector: 'edge[r = "applies_to"]', style: {
        'curve-style': 'unbundled-bezier', 'control-point-distances': Math.max(10, Math.round(18 * SC)), 'control-point-weights': 0.5,
        'width': 1.6, 'line-color': P.num, 'target-arrow-color': P.num, 'opacity': 0.62
      } },
      { selector: 'edge[r = "uses_skill"]', style: {
        'curve-style': 'unbundled-bezier', 'control-point-distances': -Math.max(10, Math.round(18 * SC)), 'control-point-weights': 0.5,
        'width': 1.4, 'line-style': 'dashed', 'line-color': P.num, 'target-arrow-color': P.num, 'opacity': 0.55
      } },
      /* 方法 → 思想：紫虚线，方向是「这条方法体现哪个思想」 */
      { selector: 'edge[r = "belongs_to"]', style: {
        'width': 1.3, 'line-style': 'dashed', 'line-color': P.sta, 'target-arrow-color': P.sta, 'opacity': 0.55
      } },
      /* 错因 → 知识点：红虚线 */
      { selector: 'edge[r = "misconception_of"]', style: {
        'width': 1.5, 'line-style': 'dashed', 'line-color': P.red, 'target-arrow-color': P.red, 'opacity': 0.62
      } },
      /* 教材顺序 ≠ 先修：灰蓝虚线、无箭头、不参与依据分级 */
      { selector: 'edge[r = "sequence"]', style: {
        'width': 1.1, 'line-style': 'dashed', 'line-color': P.inkFaint, 'opacity': 0.5,
        'target-arrow-shape': 'none', 'curve-style': 'straight'
      } },
      /* 归属（章→节→点）：石板灰细线、无箭头。它表达的是「在第几层」，
         不是「先学哪个」，所以不给箭头、也不进依据分级 */
      { selector: 'edge[r = "is_part_of"]', style: {
        'width': 1, 'line-color': P.slate, 'target-arrow-shape': 'none',
        'curve-style': 'straight', 'opacity': 0.42
      } },
      /* 弱关联三兄弟：支撑（有点方向）/ 易混（对称）/ 等价（对称） */
      { selector: 'edge[r = "supports"]', style: {
        'width': 1.2, 'line-style': 'dotted', 'line-color': P.slate, 'target-arrow-color': P.slate, 'opacity': 0.5
      } },
      { selector: 'edge[r = "contrast_with"]', style: {
        'width': 1.3, 'line-style': 'dotted', 'line-color': P.amber, 'target-arrow-shape': 'none', 'opacity': 0.6
      } },
      { selector: 'edge[r = "equivalent_to"]', style: {
        'width': 2, 'line-color': P.slate, 'target-arrow-shape': 'none', 'opacity': 0.6
      } },
      /* ---------- 依据分级：只动粗细与透明度，不动颜色 ---------- */
      { selector: 'edge[d = "m"]', style: { 'width': 2.2, 'opacity': 0.88 } },
      { selector: 'edge[d = "r"]', style: { 'width': 1.5, 'opacity': 0.6 } },
      { selector: 'edge[d = "sk"]', style: { 'width': 1.2, 'line-style': 'dashed', 'opacity': 0.45 } },
      { selector: 'edge[d = "syn"]', style: { 'width': 1, 'opacity': 0.38 } },
      /* 章图的跨节依赖是一条汇总线：处数越多越粗（w 在 addSecLinks 里算好），
         颜色沿用先修的绿但更淡 —— 它汇总了若干条关系，不是一条具体关系 */
      { selector: 'edge[d = "dep"]', style: {
        'width': 'data(w)', 'line-color': P.geo, 'target-arrow-color': P.geo, 'opacity': 0.5
      } },
      /* 四种「不分级」豁免写在最后：它们回答的是「书上的位置」「是不是同一件事」，
         粗细不该暗示「更要先学」，所以把 d 档的粗细改写回来 */
      { selector: 'edge[r = "sequence"]', style: { 'width': 1.1, 'opacity': 0.5 } },
      { selector: 'edge[r = "is_part_of"]', style: { 'width': 1, 'opacity': 0.42 } },
      { selector: 'edge[r = "equivalent_to"]', style: { 'width': 2, 'opacity': 0.6 } },
      /* ---------- 距离分级：画面里只留「焦点旁边」的线 ----------
         原来的做法是「所有线都画出来、靠粗细分强弱」，实测下来 800+ 条边一起出现，
         整张图变成一张网，读者分不清哪条线跟他正看的东西有关。
         现在分两级：e-f 焦点自己的线（满色）／e-n 其余线（淡，只当底纹）／
         e-x 与焦点无关的线（与底纹同档，留在后面不抢眼）。点开一个点，只有它自己的线颜色回来。
         默认不点任何点时全部按 e-n 画：屏幕上先看到点，线只是底纹。 */
      { selector: 'edge.e-f', style: { 'opacity': 0.95 } },
      { selector: 'edge.e-n', style: { 'opacity': 0.09 } },
      /* 与焦点无关的线彻底不画：用户原话「就一个中心到外边的线，其他点的连接线不用显示」。
    0.15 的底纹在 39 点 40 边时仍然是一张网，看不出「这一个点连到谁」。 */
 { selector: 'edge.e-x', style: { 'opacity': 0 } },
      { selector: 'edge[r = "contrast_with"]', style: { 'width': 1.3, 'opacity': 0.6 } },
       /* 章级总图上这些线就是全部信息（26 张卡片靠它们连成「这本书怎么长」），
          不能按 e-n 的 0.09 底纹画，那等于没画。仍比正文浅，只是看得见。 */
       /* 章间先修线走贝塞尔：八下 → 九上那一带是 20 多条直线交汇，
           直线交叉成一团时读者数不出「这一章到底要先学哪几章」；弯线把同一出发点的线束分开。 */
        /* 宽度必须读 data(w)：写死 1.2 会让「线越粗 = 这一章被后面用得越多」变成假话（图例说了却不成立） */
    { selector: 'edge.ch.e-n', style: { 'opacity': 0.45, 'width': 'data(w)', 'curve-style': 'bezier' } },
       { selector: 'edge.ch-seq', style: { 'opacity': 0.2, 'width': 1, 'line-style': 'dashed' } },
      /* 用户对参考视频的原话：「浅色是很淡，几乎看不到的」「选中一个点以后就只显示相关的内容」。
         0.58 是他抱怨的那一版：点开以后满屏还是淡点，焦点不突出。
         现在压到 0.12 且不留字——它们只是背景质感，不是可读内容。 */
      { selector: 'node.dim', style: { 'opacity': 0.12, 'text-opacity': 0 } },
      { selector: 'edge.dim', style: { 'opacity': 0.05 } },
      /* 焦点态的背景：整张网留着，但压到几乎只剩质感。
         曾经这里写的是 display:none —— 病灶是「看不见自己在哪」；更糟的是 focusNode 会给
         邻居同时挂 nb 与 mind-dim，display:none 把邻居一起藏掉：实测
         #/map?view=mind&node=K701-1.1-01&read=1 只剩 3 个可见点（out/dbg_view.json），
         这就是用户说的「从题目返回后绘制混乱」。现在改成淡出：不参与 fit，但仍在画面上当地图。 */
      { selector: 'node.mind.dim, node.mind.mind-dim', style: { 'opacity': 0.13, 'text-opacity': 0 } },
      { selector: 'edge.mind.dim, edge.mind.mind-dim', style: { 'opacity': 0.05 } },
      { selector: 'node.sel', style: {
        'border-width': 3, 'border-color': P.greenStrong,
        'underlay-color': P.green, 'underlay-opacity': 0.2, 'underlay-padding': Math.max(1, Math.round(6 * SC)), 'underlay-shape': 'round-rectangle'
      } },
      { selector: 'node.nb', style: { 'border-width': 2.2, 'border-color': P.geo } },

      /* ---------- LOD：缩远了就别再画字 ----------
         实测的病根不是节点多，是「缩到 0.1 倍还在画 12px 的字」，渲染出来是 1.1px 的一团灰。
         四档（applyLOD 按 zoom 切 class，样式只在这里声明一次）：
           lod0 < 0.18      只留色点，连形状都不讲究，用来看「这一片是什么色」
           lod1 0.18-0.45   小方块，丢字，用来看疏密
           lod2 0.45-0.85   卡片 + 截断 8 字，用来找位置
           lod3 > 0.85      现状，读得到全名 */
      /* 尺寸一律走 data(w)/data(h)，四档都一样 —— 这是硬约束，不是风格：
         布局是按 sizeOf 算的坐标，样式若写死更大的宽高，渲染就比布局大一圈，
         缩远以后每张卡片都压到邻居身上（实测 skill 视图 1321 处重叠就是这么来的）。
         LOD 只决定「画不画字、画成什么形状」，不决定大小。
         字号也不在这里压 —— 字本来就跟着 zoom 走，再压一次等于双重惩罚。 */
      { selector: 'node.mind', style: {
        'width': 'data(w)', 'height': 'data(h)', 'label': 'data(label)',
        'font-size': 13, 'font-weight': 650, 'color': P.ink,
        'text-valign': 'center', 'text-halign': 'center', 'text-wrap': 'none',
        'background-opacity': 0, 'border-width': 0,
        'shadow-blur': 0, 'shadow-opacity': 0, 'padding': 0
      } },
      { selector: 'node.mind-th', style: {
        'shape': 'triangle', 'width': 'data(w)', 'height': 'data(h)',
        'background-opacity': 1, 'background-color': '#e23d4a',
        'border-width': 1.5, 'border-color': '#ffffff',
        'font-size': 14, 'font-weight': 700, 'color': '#243044',
        'text-valign': 'bottom', 'text-margin-y': 8,
        'text-outline-width': 3, 'text-outline-color': '#ffffff'
      } },
      { selector: 'node.mind-vol', style: {
        'font-size': 12, 'font-weight': 650, 'color': '#5c6b80',
        'text-outline-width': 2, 'text-outline-color': '#ffffff'
      } },
      { selector: 'node.mind-ch', style: {
        'shape': 'diamond', 'width': 'data(w)', 'height': 'data(h)',
        'background-opacity': 1, 'background-color': '#f0b429',
        'border-width': 1.5, 'border-color': '#ffffff',
        'label': 'data(label)', 'font-size': 18, 'font-weight': 750, 'color': '#1a365d',
        'text-valign': 'bottom', 'text-halign': 'center', 'text-margin-y': 6,
        'text-wrap': 'none',
        'text-outline-width': 4, 'text-outline-color': '#f5f8fc', 'z-index': 12
      } },
      { selector: 'node.mind-ch.mind-hot, node.mind-ch.mind-on', style: {
        'label': 'data(label)', 'font-size': 13, 'z-index': 20,
        'border-width': 3, 'border-color': '#8a5a00',
        'text-valign': 'bottom', 'text-margin-y': 4
      } },
      { selector: 'node.mind-ch.mind-up', style: {
        'label': '', 'width': 16, 'height': 16, 'z-index': 24,
        'border-width': 3, 'border-color': '#8a5a00'
      } },
      /* 总图上的「章」是一张卡片，不是一个点：六册全景只到这一层，
         卡片里直接写整句章名，1 倍缩放下就是 13px 正文字号，不再靠截断。
         宽度由章名长度算（place() 里给），所以长章名也放得下。 */
      { selector: 'node.mind-cch', style: {
        'shape': 'round-rectangle', 'width': 'data(w)', 'height': 'data(h)',
        'background-color': P.card, 'background-opacity': 1,
        'border-width': 1.4, 'border-color': P.lineStrong,
        'label': 'data(short)', 'font-size': 13, 'font-weight': 650, 'color': P.ink,
        'text-valign': 'center', 'text-halign': 'center', 'text-wrap': 'none',
        'padding': 0, 'z-index': 6
      } },
      { selector: 'node.mind-cch.mind-on, node.mind-cch.sel', style: {
        'border-width': 2.4, 'border-color': P.green, 'background-color': P.card2
      } },
      { selector: 'edge.mind-upedge', style: {
        'width': 1.6, 'line-color': P.amber, 'opacity': 0.95, 'z-index': 5
      } },
      /* 节名在总图档不画：117 个节点名在 1140×692 的画布上会撞出 122 对重叠（实测），
         1.1 与 11.5 的名字叠在一起读不成句。节名从 0.62 倍起随知识点一起出来。 */
      { selector: 'node.mind-sn', style: {
        'shape': 'diamond', 'width': 'data(w)', 'height': 'data(h)', 'label': '',
        'background-opacity': 1, 'background-color': '#f6e2a4',
        'border-width': 1.5, 'border-color': '#8a5a00', 'z-index': 8
      } },
      { selector: 'node.mind-sn.mind-on, node.mind-sn.mind-hot', style: {
        'label': '', 'z-index': 18,
        'width': 'data(w)', 'height': 'data(h)',
        'border-width': 2, 'border-color': '#8a5a00'
      } },
      { selector: 'node.mind-sn.mind-hot', style: { 'width': 12, 'height': 12, 'z-index': 22 } },
      { selector: 'node.mind-fam', style: {
        'shape': 'round-rectangle', 'width': 'data(w)', 'height': 24,
        'background-opacity': 1, 'background-color': '#f4f0fb',
        'border-width': 1, 'border-color': '#d9d0ea',
        'font-size': 12, 'font-weight': 650, 'color': '#3a3158', 'z-index': 8
      } },
      { selector: 'node.mind-th', style: {
        'z-index': 9
      } },
      { selector: 'node.mind-kp', style: {
        'shape': 'diamond', 'width': 'data(w)', 'height': 'data(h)', 'label': '',
        'background-opacity': 1, 'background-color': 'data(dot)',
        'border-width': 1.5, 'border-color': '#ffffff', 'z-index': 4
      } },
      { selector: 'node.mind-sklab', style: {
        'shape': 'ellipse', 'width': 14, 'height': 14,
        'label': 'data(label)', 'font-size': 11, 'font-weight': 650, 'color': '#145c3c',
        'text-valign': 'bottom', 'text-margin-y': 4,
        'text-outline-width': 3, 'text-outline-color': '#ffffff',
        'background-opacity': 1, 'background-color': 'data(dot)',
        'border-width': 2, 'border-color': '#ffffff', 'z-index': 7
      } },
      { selector: 'node.mind-sk', style: {
        'shape': 'ellipse', 'width': 'data(w)', 'height': 'data(h)', 'label': '',
        'background-opacity': 1, 'background-color': 'data(dot)',
        'border-width': 1.5, 'border-color': '#ffffff', 'z-index': 6
      } },
      { selector: 'node.mind-sknow', style: {
        'shape': 'ellipse', 'width': 20, 'height': 20,
        'label': 'data(label)', 'font-size': 13, 'font-weight': 700, 'color': '#102033',
        'text-valign': 'bottom', 'text-margin-y': 8,
        'text-outline-width': 3, 'text-outline-color': '#ffffff',
        'background-opacity': 1, 'background-color': 'data(dot)',
        'border-width': 2, 'border-color': '#ffffff', 'z-index': 8
      } },
      { selector: 'node.mind-pre, node.mind-post, node.mind-now', style: {
        'shape': 'diamond', 'label': 'data(label)', 'font-size': 12, 'font-weight': 650,
        'color': '#102033', 'text-valign': 'bottom', 'text-margin-y': 6,
        'text-outline-width': 3, 'text-outline-color': '#ffffff',
        'background-opacity': 1, 'background-color': 'data(dot)',
        'border-width': 2, 'border-color': '#ffffff', 'z-index': 6
      } },
      { selector: 'node.mind-now', style: { 'width': 22, 'height': 22, 'z-index': 10, 'border-color': '#14324f' } },
      { selector: 'node.mind-sib', style: {
        'shape': 'diamond', 'width': 8, 'height': 8, 'label': '',
        'background-opacity': 1, 'background-color': 'data(dot)',
        'border-width': 1, 'border-color': '#ffffff', 'z-index': 3
      } },
      { selector: 'node.mind-sec', style: {
        'background-opacity': 0, 'font-size': 12, 'font-weight': 650, 'color': '#5c6b80',
        'text-halign': 'right', 'text-outline-width': 2, 'text-outline-color': '#ffffff'
      } },
      { selector: 'node.mind-tag', style: {
        'background-opacity': 0, 'font-size': 12, 'font-weight': 700, 'color': '#5c6b80',
        'text-outline-width': 2, 'text-outline-color': '#ffffff'
      } },
      { selector: 'node.mind-kp.mind-hot', style: {
        'label': 'data(short)', 'font-size': 12, 'font-weight': 700,
        'color': '#102033', 'text-valign': 'bottom', 'text-margin-y': 10,
        'text-wrap': 'wrap', 'text-max-width': 88,
        'text-events': 'yes',
        'text-outline-width': 2, 'text-outline-color': '#f5f8fc',
        'border-width': 2, 'border-color': '#14324f', 'z-index': 20,
        'width': 18, 'height': 18
      } },
      { selector: 'node.mind-kp.mind-on, node.mind-sk.mind-on, node.mind-th.mind-on', style: {
        'opacity': 1, 'z-index': 16,
        'label': 'data(short)', 'font-size': 12, 'font-weight': 650, 'color': '#102033',
        'text-wrap': 'wrap', 'text-max-width': 76,
        'text-events': 'yes',
        'text-outline-width': 2, 'text-outline-color': '#f5f8fc',
        'width': 18, 'height': 18
      } },
      /* A chapter view keeps the small glyphs. Only a chosen point grows. */
      { selector: 'node.mind-kp.mind-on.mind-tight, node.mind-sk.mind-on.mind-tight', style: {
        'width': 'data(w)', 'height': 'data(h)', 'label': ''
      } },
      { selector: 'node.mind-kp.mind-on.mind-secview, node.mind-sk.mind-on.mind-secview', style: {
        'width': 10, 'height': 10
      } },
      { selector: 'node.mind-ch.mind-on', style: {
        'label': 'data(label)', 'font-size': 13, 'text-events': 'yes'
      } },
      { selector: 'node.mind-on[out = "right"]', style: {
        'text-halign': 'right', 'text-valign': 'center', 'text-margin-x': 16
      } },
      { selector: 'node.mind-on[out = "left"]', style: {
        'text-halign': 'left', 'text-valign': 'center', 'text-margin-x': 16
      } },
      { selector: 'node.mind-on[out = "top"]', style: {
        'text-halign': 'center', 'text-valign': 'top', 'text-margin-y': 12
      } },
      { selector: 'node.mind-on[out = "bottom"]', style: {
        'text-halign': 'center', 'text-valign': 'bottom', 'text-margin-y': 12
      } },
      { selector: 'node.mind-tight', style: { 'label': '' } },
      { selector: 'node.mind-on.mind-secwait', style: { 'opacity': 0.22 } },
      { selector: 'node.mind-on.mind-secpick', style: {
        'opacity': 1, 'z-index': 18, 'border-width': 2.5, 'border-color': '#14324f'
      } },
      { selector: 'node.mind-dim', style: { 'opacity': 0.07, 'label': '', 'text-opacity': 0, 'z-index': 0 } },
      { selector: 'edge.mind-dim', style: { 'opacity': 0.06 } },
      { selector: 'node.mind-sk.mind-hot, node.mind-th.mind-hot', style: {
        'label': 'data(short)', 'font-size': 12, 'font-weight': 700,
        'color': '#102033', 'text-valign': 'top', 'text-margin-y': -2,
        'text-outline-width': 3, 'text-outline-color': '#ffffff',
        'border-width': 2, 'border-color': '#ffffff', 'z-index': 20
      } },
      /* Names of a focused dot are drawn as HTML chips, so the glyph stays visible. */
      { selector: 'node.mind-kp.mind-hot, node.mind-sk.mind-hot, node.mind-th.mind-hot, node.mind-kp.mind-on, node.mind-sk.mind-on, node.mind-th.mind-on', style: {
        'label': ''
      } },
      { selector: 'edge.mind-dim', style: { 'opacity': 0.06 } },
      { selector: 'edge[x = "grow"]', style: {
        'width': 2.2, 'line-color': P.geo, 'target-arrow-color': P.geo,
        'target-arrow-shape': 'triangle', 'curve-style': 'bezier', 'opacity': 0.95,
        'arrow-scale': 0.7, 'z-index': 15
      } },
      { selector: 'node.lod0', style: {
        'label': '', 'width': 'data(w)', 'height': 'data(h)', 'shape': 'ellipse',
        'border-width': 1.5, 'text-opacity': 0
      } },
      { selector: 'node.lod1', style: {
        'label': '', 'width': 'data(w)', 'height': 'data(h)', 'border-width': 1.5, 'text-opacity': 0
      } },
      /* lod2 只掉字长（label 已按 clipN 截过，同 base），尺寸一律走 data(w)/data(h)：
         写死 92x26 会盖掉 sizeOf，渲染比布局大一圈，缩远以后每个点都压到邻居身上。 */
      { selector: 'node.lod2', style: {
        'width': 'data(w)', 'height': 'data(h)'
      } },
      /* 岛与岛标题是结构，缩远了也要认得出来：岛保持原尺寸，标题只小幅缩字 */
      { selector: 'node.island.lod0, node.island.lod1, node.island.lod2', style: {
        'label': '', 'width': 'data(w)', 'height': 'data(h)', 'shape': 'round-rectangle'
      } },
      { selector: 'node.island-label.lod0, node.island-label.lod1, node.island-label.lod2', style: {
        'font-size': 11, 'width': 'data(w)', 'height': 'data(h)'
      } },
      /* 收掉字的点（applyLOD 在 mind 档按倍率挂这个类；章、思想不在此列）：只剩点，
         章/节/思想的字还在 —— 「先看到点，再看到结构」就靠这一条。 */
      { selector: 'node.lodh', style: { 'label': '', 'text-opacity': 0 } },
      /* 单章视图才给小节开字：六册总图上 117 个节名会撞出 122 对重叠，
         而一章七八节彼此离得开，名字读得出来。 */
      { selector: 'node.mind-sn.mind-seclab', style: {
        'label': 'data(short)', 'font-size': 12.5, 'font-weight': 600, 'color': '#3a4a5e',
        'text-valign': 'bottom', 'text-margin-y': 5,
        'text-outline-width': 3, 'text-outline-color': '#f5f8fc'
      } },
      /* 焦点态的「别的线不画」必须写在最后一条：cytoscape 对同特异性按定义先后取后者，
         而这条之前还有 edge.dim 0.22 与 edge.mind-dim 0.12（各一条类，与 edge.e-x 同档），
         写在中间就等于被它们盖掉 —— 实测焦点状态下 733 根线仍然可见。 */
      { selector: 'edge.e-x', style: { 'opacity': 0 } }
    ];
  }

  /* ---------- LOD ---------- */

  /* 档位只在跨档时才动 DOM：zoom 事件每帧都触发，逐帧改 1600 个节点的 class 会卡 */
  var lastLod = -1;
  var lastMindHide = null;
  function applyLOD() {
    if (!cy) return;
    /* 单章视图（六册全景 → 点一张章卡片进来）给小节开字：一章七八节彼此离得开，
       名字读得出来；六册总图那档 117 个节名会撞出 122 对重叠，所以只在单章开。 */
    var oneCh = state.view === 'mind' && state.kind === 'all' && state.vol && state.vol !== 'all'
      && state.ch && state.ch !== 'all';
    cy.nodes('.mind-sn').toggleClass('mind-seclab', !!oneCh);
    /* mind 档没有卡片，只有点 + 字。整册视图 1531 个点里 536 个知识点、674 个方法，
       每个都挂 8 字标签，0.46 倍下叠成一整片糊字 —— 那才是「很乱」的真凶。
       所以这里按倍率只收知识点/方法的字，章、节、思想的字留着当骨架。 */
    if (state.view === 'mind') {
      cy.elements('node').removeClass('lod0 lod1 lod2 lod3');
      /* 0.85 是照着「整册 1531 个点」定的，结果总图 z=.46 时 1505 个点全没字（只剩 26 个章名）。
         收到 0.62：能看清的距离就让名字出来，糊成一片的档位才收。 */
      var hideKp = cy.zoom() < 0.62;
      if (hideKp !== lastMindHide) {
        lastMindHide = hideKp;
        cy.batch(function () {
          cy.elements('node.mind-kp, node.mind-sk, node.mind-sn').forEach(function (nd) {
            var keep = nd.hasClass('mind-hot') || nd.hasClass('mind-on') || nd.hasClass('mind-up') || nd.hasClass('mind-secpick');
            nd.toggleClass('lodh', hideKp && !keep);
          });
        });
      }
      lastLod = 3;
      return;
    }
    var z = cy.zoom();
    var lod = z < 0.18 ? 0 : (z < 0.45 ? 1 : (z < 0.85 ? 2 : 3));
    if (lod === lastLod) return;
    lastLod = lod;
    cy.batch(function () {
      cy.elements('node').removeClass('lod0 lod1 lod2 lod3');
      if (lod < 3) cy.elements('node').addClass('lod' + lod);
    });
  }

  /* ---------- 相机 ---------- */

  /* 相机：默认「看得清」优先，不是「看得全」优先。
     窄屏的骨架是一册四章纵向排列，fit 全图会把 11.5px 的字压到 4px —— 那等于没字。
     所以窄屏骨架先按宽度定倍率、停到第一个岛；想看全图点「看全」。 */
  /* 取景算得早、画布定型得晚：rebuild 里第一次 fitView(56) 的时候，
     图例/说明/说明行还没排完，#cy 的高度比最终小一圈（实测取景时 628，定型后 692）。
     按小高度算出来的平移把整团点往上顶，顶部被切掉 173px，右边却空出 590px
     —— 用户看到的就是「图挤在左上角」（R1 总图没吃满区域）。
     所以首帧之后再补两次取景；用户一旦自己拖过图（userCam）就再不插手。 */
  var refitSeq = 0;
  function refitSoon() {
    var tk = ++refitSeq;
    [140, 460, 980].forEach(function (ms) {
      setTimeout(function () {
        if (refitSeq !== tk || userCam || !cy) return;
        if (!document.body.contains(cyEl)) return;
        try { cy.resize(); } catch (eR) {}
        fitView(56);
      }, ms);
    });
  }

  /* 按「画出来以后量到的位置」把这一团摆正。
     按 world bbox 算 pan 会差上百像素：取景发生在版面定型之前，applyLOD 又会改点的大小，
     算出来的世界坐标和最终渲染不是同一回事（实测顶部被切掉 173px、右边空出 564px，
     用户看到的就是图挤在左上角）。所以先定倍率，再量三遍 renderedBoundingBox，把中心差补回去。 */
  function centerRendered(eles) {
    for (var pass = 0; pass < 3; pass++) {
      var x1 = Infinity, y1 = Infinity, x2 = -Infinity, y2 = -Infinity;
      eles.forEach(function (nd) {
        var b = nd.renderedBoundingBox({ includeLabels: false });
        if (!b || !isFinite(b.x1) || !isFinite(b.y1) || !isFinite(b.x2) || !isFinite(b.y2)) return;
        if (b.x1 < x1) x1 = b.x1;
        if (b.y1 < y1) y1 = b.y1;
        if (b.x2 > x2) x2 = b.x2;
        if (b.y2 > y2) y2 = b.y2;
      });
      if (!isFinite(x1)) return;
      var dx = (x1 + x2) / 2 - cy.width() / 2;
      var dy = (y1 + y2) / 2 - cy.height() / 2;
      if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) return;
      var cur = cy.pan();
      try { cy.pan({ x: cur.x - dx, y: cur.y - dy }); } catch (e2) { return; }
    }
  }

  function fitView(pad, opts) {
    if (!cy) return;
    /* Open on the child's book so hairlines stay visible. 看全 fits all six. */
    if (state.view === 'mind') {
      try { cy.resize(); } catch (e0) {}
      var frame = cy.nodes();
      /* 点开了某个点，取景就该只量这一团。原来固定按「这一册」定倍率，
         而导图档一册有 1500 多个点，于是焦点那一团缩成巴掌大一块贴在左上角，
         下面全是空白（实测 zoom 0.42，按这一团本该是 1.45）。 */
      if (!(opts && opts.all) && state.focus && byId[state.focus]) {
        var fnode = cy.getElementById(state.focus);
        if (fnode && fnode.nonempty()) frame = fnode.closedNeighborhood().nodes();
      }
      if (!(opts && opts.all) && !(state.focus && byId[state.focus]) && state.kind !== 'all' && state.kind !== 'thought' && !state.local) {
        var book = cy.nodes('[vol = "801"]');
        if (book.length) frame = book;
      }
      /* 取景只量「点」的范围，不量标签：岛标签是横向长条（「第 6 章 因式分解」），
         算进 bbox 会把整张图往一边挤 —— 实测标签在右，点云就被压到画布左边 1/5，
         右边空 583px，顶上还被切掉 181px。标签宁可画到边缘外，也先让点居中。 */
      /* 定倍率和定平移必须用同一批点。原来 z 按 frame（可能只是一册）算、pan 按 vis（可见点）算，
         两批点不是一回事：实测点云只占画布宽 43.8%，底部还溢出 78px（map-qa-v4）。
         先算可见点，再拿它定 z；没有可见点才退回 frame。 */
      var vis0 = cy.nodes().filter(function (nd) {
        return nd.visible() && nd.style('display') !== 'none' && !nd.hasClass('dim') && !nd.hasClass('mind-dim');
      });
      var bb = (vis0.length ? vis0 : frame).boundingBox({ includeLabels: false });
      var zCap = 1.45;
      var z = Math.min((cy.width() - 40) / Math.max(1, bb.w), (cy.height() - 32) / Math.max(1, bb.h), zCap);
      /* 平移以「所有可见的点」为基准居中：frame 只用来定倍率（可能只是这一册）。 */
      /* visible() 认不出 display:none（焦点态藏起来的 1500 个点仍算可见），
         要用样式里的 display 判，否则平移基准还是按整册算。 */
      var vis = vis0;
      var pb = (vis.length ? vis : frame).boundingBox({ includeLabels: false });
      try { cy.zoom(z); } catch (e1) {}
      centerRendered(vis.length ? vis : frame);
      /* 深链进来时 lastMindHide 还是上一页的缓存值，zoom 事件不触发就一直是空字
         （同一 URL 两次加载实测 lodh 0 / 1505 两种结果）。取景完无条件重算一次。 */
      applyLOD();
      return;
    }
    var all = opts && opts.all;
    var eles = cy.elements().filter(function (e) { return e.visible(); });
    if (!eles.length) return;
    var availW = (cyEl && cyEl.clientWidth) || 880;
    if (!all && state.view === 'skeleton' && availW < 720) {
      var bb = eles.boundingBox({ includeLabels: false });
      var z = Math.min(1.05, (availW - 28) / Math.max(1, bb.w));
      try { cy.zoom(z); } catch (e) {}
      var f = cy.nodes('node.island').first();
      try {
        if (f && f.length) {
          cy.pan({ x: cy.width() / 2 - f.position('x') * z, y: cy.height() / 2 - f.position('y') * z });
        } else { cy.center(); }
      } catch (e) {}
      return;
    }
    /* 只按节点取景：边是连出来的，曲线会飞到内容外，把它算进 bbox 会把图缩得更小 */
    var ns = eles.nodes();
    try { cy.fit(ns.length ? ns : eles, pad == null ? 56 : pad); } catch (e) {}
    if (cy.zoom() > 1.1) { try { cy.zoom(1.1); cy.center(); } catch (e) {} }
  }

  function centerOn(id, z) {
    if (!cy) return;
    var el = cy.getElementById(id);
    if (!el || !el.length) return;
    try { cy.animate({ center: { eles: el }, zoom: z || 1.1 }, { duration: 220 }); }
    catch (e) { cy.center(el); }
  }

  /* ---------- 交互 ---------- */

  /* 不点任何点时画面该长什么样：点还在，线退成底纹（e-n）。 */
  function restEdges() {
    if (!cy) return;
    cy.edges().removeClass('e-f e-n e-x').addClass('e-n');
  }

  /* 只管「画面上哪些点亮着」，不动 state.focus —— 焦点是页面状态（深链接 #/map?node=X
     直接把它写进去），清标记时顺手清焦点等于把地址栏的意思也抹了。 */
  function clearMarks() {
    syncCross();
    if (!cy) return;
    cy.elements().removeClass('dim sel nb');
    restEdges();
  }

  /* 只框「自己 + 邻居」，bbox 不含节点文字（含文字会被长名字撑成 519 单位宽、
     倍率掉到 0.66，点团只占画布三分之一），倍率上限 1.45。 */
  function fitFocusCluster(el) {
    if (!cy || !el || !el.length) return;
    var nodes = el.closedNeighborhood().nodes();
    if (!nodes.length) nodes = el;
    try {
      var nb = nodes.boundingBox({ includeLabels: false });
      var pad2 = 44;
      var z2 = Math.min((cy.width() - pad2 * 2) / Math.max(1, nb.w),
                        (cy.height() - pad2 * 2) / Math.max(1, nb.h), 1.45);
      cy.viewport({
        zoom: z2,
        pan: { x: (cy.width() - nb.w * z2) / 2 - nb.x1 * z2,
               y: (cy.height() - nb.h * z2) / 2 - nb.y1 * z2 }
      });
    } catch (e0) {}
  }

  function focusNode(id) {
    if (!cy) return;
    clearMarks();
    var el = cy.getElementById(id);
    if (!el || !el.length) return;
    el.addClass('sel');
    var keep = el.closedNeighborhood();
    keep.nodes().forEach(function (n) { if (n.id() !== id) n.addClass('nb'); });
    cy.elements().forEach(function (x) { if (!keep.contains(x)) x.addClass('dim'); });
    /* 标签（paintCallouts）只认 mind-hot / mind-on 这两种类，而这条路径原来只挂 nb/dim，
       于是「带 node= 进来」的页面一个标签都画不出来（实测 chips=1，只剩上一级那个）。
       点选路径走的是 focusAround，两处口径必须一致：焦点 = mind-hot，邻域 = mind-on。 */
    el.addClass('mind-hot');
    keep.nodes().not(el).addClass('mind-on');
    if (el.hasClass('mind-ch')) el.removeClass('mind-up');
    /* 线的三级：焦点自己连出去的那圈最亮（不同关系不同颜色，所以还能分辨是哪种关系），
       邻域里两点之间的线只留一点痕迹，再远的线基本看不见。 */
    var hot = {};
    el.connectedEdges().forEach(function (e) {
      e.removeClass('e-n e-x').addClass('e-f');
      hot[e.id()] = 1;
    });
    /* 只留「中心 → 邻居」这一圈线；邻居彼此之间、以及整张网里剩下的线全部不画。
       之前按 near[a] && near[b] 留成 e-n 底纹，屏幕上仍是一片网，焦点那圈反而不突出。 */
    cy.edges().forEach(function (e) {
      if (hot[e.id()]) return;
      e.removeClass('e-f e-n e-x').addClass('e-x');
    });
    /* 聚焦后把视野收到这一圈：不重设取景的话，点开的这一小团会缩在画布角落，
       节点名被压到 5px，等于没写。fit 只框住「自己 + 邻居」，别的点本来就淡到看不见。 */
    var fit = keep.union(el);
    state.chipFitTries = 0;
    state.chipStable = 0;
    /* 直接 fit，不做 200ms 取景动画：实测 animate({fit}) 在这版 cytoscape 上
       会把 zoom 停在上一次的 0.62（焦点那一团缩成巴掌大一块贴在左上角），
       而 chips 的「点都在画布外」重试又拿不到新倍率。用户要的是「点开就看清」，不是动画。 */
    /* 取景分两次：现在一次、版面重排后再一次。
       ① cy.fit 的 bbox 把节点文字算进去，邻居名字一长就把倍率压到 0.65；
       ② 点开讲解后右侧栏会让出宽度，此刻 cy.width() 还没换过来（实测按旧宽度
          算出来 0.66），等版面落定再框一次才是对的。
       都不动画：用户要的是「点开就看清」。 */
    fitFocusCluster(el);
    setTimeout(function () { fitFocusCluster(el); }, 60);
    setTimeout(function () { fitFocusCluster(el); }, 320);
    /* 第三次：右栏是点开后才铺开的，铺开会让 #cy 变窄并 cy.resize()，
       而 resize 只保留 pan/zoom，不重新居中——实测点团被顶到画布上三分之一。 */
    setTimeout(function () { fitFocusCluster(el); }, 900);
    state.chipFitTries = 0;
    syncCross();
  }

  /* 窄屏（<1080px）讲解是固定的上拉层，滚页面没有意义，还会把图滚出视口；
     那里只让图自己不动，关掉这一层就回到图。宽屏右栏才需要把它滚进视口。 */
  function narrowLayout() {
    return (window.innerWidth || 1200) < 1080;
  }

  function scrollDetailIntoView() {
    if (!detailEl) return;
    /* 窄屏的讲解排在画布下面（不浮层），点开就得把人带过去，否则他只会看到图没变。 */
    if (narrowLayout()) {
      try {
        var rr = detailEl.getBoundingClientRect();
        var vh2 = window.innerHeight || 800;
        if (rr.top > vh2 - 80) detailEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      } catch (e9) {}
      return;
    }
    try {
      var r = detailEl.getBoundingClientRect();
      var vh = window.innerHeight || 800;
      if (r.top > vh - 90 || r.top < 0) detailEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    } catch (e) {}
  }

  /* ---------- 详情：一次讲完「它是什么 / 从哪来 / 到哪去 / 配哪些方法 / 踩哪些坑 / 有哪些题」 ----------
     旧仓 explore 的详情抽屉之所以看着清楚，就是因为它把这六件事都摊开了；只写「落在哪一节 + 连到几个点」
     等于把这张图最有用的部分藏起来了。知识点正文（定义/条件/边界/目标/方法步骤/错因表现）都在节的
     数据片里，所以选中一个点就去取它那一节，一次取到就缓存。 */

  var secCache = {}, itemsCache = {}, exCache = {}, detToken = 0;
  var TIER_CN = { core: '教材方法', extend: '培优方法', olympiad: '竞赛拓展' };
  /* 错因映射统一走 C.MCAT_CN（core.js），这里不再留一份 4 类的残缺表 */
  /* 知识点类型：数据里存的是英文枚举，直接摆给孩子看不懂 */
  /* 知识点类型：数据里存英文枚举（kp_type），直接摆给孩子看不懂。
     映射表在 core.js（C.KPT_CN），section 页也用同一份，免得一边改了一边漏。 */
  var KPT_CN = C.KPT_CN;

  function getSec(vol, sec) {
    var k = vol + '-' + sec;
    if (!secCache[k]) secCache[k] = MC.data.loadSec(vol, sec).catch(function () { return null; });
    return secCache[k];
  }
  function getItems(vol, sec) {
    var k = vol + '-' + sec;
    if (!itemsCache[k]) itemsCache[k] = MC.data.loadItems(vol, sec).catch(function () { return null; });
    return itemsCache[k];
  }
  /* 教材例题（ex 片）：讲解题最好用它们——题干与解析都是教材原话，不是生成的 */
  function getEx(vol, sec) {
    var k = vol + '-' + sec;
    if (!exCache[k]) exCache[k] = MC.data.loadExamples(vol, sec).catch(function () { return null; });
    return exCache[k];
  }

  /* 沿 prerequisite 数全量上游 / 下游：直接 N 个，全部 M 个（旧仓 countReach 的同一件事） */
  function reach(id, back) {
    var seen = {}, q = [id], cnt = 0;
    while (q.length) {
      var cur = q.shift();
      for (var i = 0; i < G.edges.length; i++) {
        var e = G.edges[i];
        if (e.r !== 'prerequisite_of') continue;
        var from = back ? e.d : e.s, to = back ? e.s : e.d;
        if (from !== cur || to === id || seen[to]) continue;
        seen[to] = 1; cnt++; q.push(to);
      }
    }
    return cnt;
  }
  /* 沿 prerequisite 取全量上游/下游节点，按跳数从近到远排（「展开看全部」用） */
  function reachList(id, back) {
    var seen = {}, out = [], q = [[id, 0]], guard = 0;
    seen[id] = 1;
    while (q.length && guard++ < 4000) {
      var cur = q.shift(), d = cur[1];
      for (var i = 0; i < G.edges.length; i++) {
        var e = G.edges[i];
        if (e.r !== 'prerequisite_of') continue;
        var from = back ? e.d : e.s, to = back ? e.s : e.d;
        if (from !== cur[0] || seen[to]) continue;
        seen[to] = 1;
        if (byId[to]) out.push({ n: byId[to], d: d + 1 });
        q.push([to, d + 1]);
      }
    }
    out.sort(function (a, b) { return a.d - b.d; });
    return out;
  }

  /* 素养是两跳派生的：知识点 → 用到的方法（applies_to）→ 方法归到的思想（belongs_to）
     → 思想支撑的素养（supports）。它回答「这一点常练到哪几种能力」，
     不是「课标认定这个点属于哪种素养」——后者要教研逐条定，我们没有依据。
     索引一次建好：673 个点每次重建都 filter 6086 条边是四百万次比较，翻一章就卡。 */
  var CP_IDX = null;
  function cpIndex() {
    if (CP_IDX && CP_IDX.G === G) return CP_IDX;
    var skOfKp = {}, thOfSk = {}, cpOfTh = {};
    G.edges.forEach(function (e) {
      if (e.r === 'applies_to') { (skOfKp[e.d] = skOfKp[e.d] || []).push(e.s); }
      else if (e.r === 'belongs_to') { (thOfSk[e.s] = thOfSk[e.s] || []).push(e.d); }
      else if (e.r === 'supports') { (cpOfTh[e.s] = cpOfTh[e.s] || []).push(e.d); }
    });
    function roll(ids, table) {
      var out = {};
      ids.forEach(function (id) {
        var cnt = {};
        table[id].forEach(function (mid) {
          (thOfSk[mid] || []).forEach(function (th) {
            (cpOfTh[th] || []).forEach(function (cp) {
              var r = cnt[cp] = cnt[cp] || { n: 0, ths: {} };
              r.n++; r.ths[th] = 1;
            });
          });
        });
        out[id] = cnt;
      });
      return out;
    }
    CP_IDX = { G: G, cpsOfKp: roll(Object.keys(skOfKp), skOfKp), cpsOfSk: roll(Object.keys(thOfSk), thOfSk) };
    return CP_IDX;
  }
  /* 认定层：知识点的素养来自它挂的课标条目（条目按内容领域与原文动词初判，见
     tools/competency_tag.py）。这条链比「方法 → 思想 → 素养」短一跳，依据可回指到条目 code。
     但它仍是初判，不是教研认定——详情里两行分开写，不合并成一个数字。 */
  function cpstdOf(id) {
    var n = byId[id];
    return (n && n.cpstd) || [];
  }
  /* 筛选与计数用一个统一口径：有认定层的用认定层，没有的退回派生层。
     两条链混着算会让「勾这个素养出来 30 个点」无法解释是哪来的。 */
  function cpsOfPoint(id) {
    var s = cpstdOf(id);
    if (s.length) {
      var m = {};
      s.forEach(function (cp) { m[cp] = 1; });
      return m;
    }
    return cpIndex().cpsOfKp[id] || {};
  }
  function cpList() {
    return G.nodes.filter(function (n) { return n.kind === 'competency'; })
      .sort(function (a, b) { return a.id < b.id ? -1 : 1; });
  }
  /* 当前册/章范围内，每个素养各被多少个知识点练到。计数跟着图走，不另算一份。 */
  function cpCounts() {
    var c = {};
    G.nodes.forEach(function (n) {
      if (n.kind !== 'knowledge_point' || !inScope(n)) return;
      var m = cpsOfPoint(n.id);
      Object.keys(m).forEach(function (k) { c[k] = (c[k] || 0) + 1; });
    });
    return c;
  }

  function prevOf(id) { return G.edges.filter(function (e) { return e.r === 'prerequisite_of' && e.d === id; }).map(function (e) { return byId[e.s]; }).filter(Boolean); }
  function nextOf(id) { return G.edges.filter(function (e) { return e.r === 'prerequisite_of' && e.s === id; }).map(function (e) { return byId[e.d]; }).filter(Boolean); }
  function skillsOf(kid) { return G.edges.filter(function (e) { return e.r === 'applies_to' && e.d === kid; }).map(function (e) { return byId[e.s]; }).filter(Boolean); }
  function mcsOf(kid) { return G.edges.filter(function (e) { return e.r === 'misconception_of' && e.d === kid; }).map(function (e) { return byId[e.s]; }).filter(Boolean); }
  /* 素养是两跳派生的：这个点的方法 → 方法归到的思想 → 思想支撑的素养（supports 边）。
     它回答的是「这一点常练到哪几种能力」，不是「课标认定这个点属于哪种素养」——
     后者要教研逐条定，我们没有依据，所以文案里必须写明来路。 */
  function compsOf(kid) {
    var m = cpIndex().cpsOfKp[kid] || {};
    return Object.keys(m).map(function (k) {
      var ths = {};
      Object.keys(m[k].ths).forEach(function (th) { if (byId[th]) ths[byId[th].title] = 1; });
      return { cp: byId[k], n: m[k].n, ths: ths };
    }).filter(function (x) { return x.cp; })
      .sort(function (a, b) { return b.n - a.n || (a.cp.title < b.cp.title ? -1 : 1); });
  }
  function thoughtSkills(tid) { return G.edges.filter(function (e) { return e.r === 'belongs_to' && e.d === tid; }).map(function (e) { return byId[e.s]; }).filter(Boolean); }
  /* 上位思想自己通常不直接挂方法——方法挂在它下面的方法族上（TH-07…TH-15）。
     「这个思想在几册里反复出现」必须把子族的方法算进来，否则六个上位思想的跨册视图全是空的 */
  function thoughtMethods(tid) {
    var out = thoughtSkills(tid), seen = {};
    out.forEach(function (x) { seen[x.id] = 1; });
    G.nodes.forEach(function (f) {
      if (f.kind !== 'thought' || f.parent !== tid) return;
      thoughtSkills(f.id).forEach(function (x) { if (!seen[x.id]) { seen[x.id] = 1; out.push(x); } });
    });
    return out;
  }
  function kpsUnder(sid) { return G.edges.filter(function (e) { return e.r === 'applies_to' && e.s === sid; }).map(function (e) { return byId[e.d]; }).filter(Boolean); }
  function kpsHurt(mid) { return G.edges.filter(function (e) { return e.r === 'misconception_of' && e.s === mid; }).map(function (e) { return byId[e.d]; }).filter(Boolean); }

  /* 画布上的字才需要砍短（shortOf 负责），详情栏里的名字要写全：
     切到 24 字会变成「单项式÷单项式：系数相除、同底数幂相除；多项式÷…」，等于没说 */
  function nodeName(n) {
    if (!n) return '';
    var t = String(n.title == null ? '' : n.title);
    if (n.kind === 'section') return (n.sec ? n.sec + ' ' : '') + t;
    return t;
  }

  /* 四格计数：前置 / 后续 / 方法 / 练习题。
     四格一律 button + data-jump，样式由 app.css 的 [data-jump] 分色；
     第四格列的是练习题链接（.dd-q），不是节点，所以渲染分支不同。
     以前第四格是调用方拼的 <span>，点了没反应 —— 四格长得一样却只有一个语义，孩子会挨个点。 */
  /* 题号胶囊原来直接印内部 id（11.1_bas_02），孩子看不出那是第几题；
     顺序号从 id 尾部的 _NN 取，完整 id 留在 title 里给出题与教研用。 */
  function qLabel(q) {
    var m = String(q.id || '').match(/_([0-9]+)$/);
    var no = m ? String(parseInt(m[1], 10)) : '';
    var band = C.esc(C.BAND_CN[q.band] || q.band);
    return '<span title="' + C.esc(q.id) + '">' + band + (no ? ' · 第 ' + no + ' 题' : ' · ' + C.esc(q.id)) + '</span>';
  }
  /* 知识点页把练习题直接摊开（openQ）；但 81 道全铺出来整页就变成一片胶囊，
     所以先给 10 道，剩下的走「还有 N 道 · 去练这一节」。 */
  var QCAP = 10;
  /* 摊开的 10 道要能看出这一节的难度分布。原来直接 slice(0, QCAP) 按数据顺序取，
     实测 K801-11.1-02 拿到的 10 道全是基础档，提高/挑战一条都看不到——
     读者会以为「这一节只有基础题」。改成分档轮转取样：每档先各拿一道，再往下补。
     档内按题号排，输出保持轮转顺序，所以「基础·中档·提高」会交替出现。 */
  var BAND_ORDER = ['basic', 'standard', 'advanced', 'challenge', 'competition'];
  function pickByBand(qs, cap) {
    if (!qs || qs.length <= cap) return (qs || []).slice();
    var bins = {}, order = [];
    qs.forEach(function (q) {
      var b = String((q && q.band) || 'basic');
      if (!bins[b]) { bins[b] = []; order.push(b); }
      bins[b].push(q);
    });
    order.sort(function (a, b) {
      var ia = BAND_ORDER.indexOf(a), ib = BAND_ORDER.indexOf(b);
      return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    });
    order.forEach(function (k) {
      bins[k].sort(function (a, b) { return String(a.id) < String(b.id) ? -1 : 1; });
    });
    var out = [], left = cap, i = 0;
    while (left > 0) {
      var took = false;
      for (var j = 0; j < order.length && left > 0; j++) {
        var bin = bins[order[j]];
        if (i < bin.length) { out.push(bin[i]); left--; took = true; }
      }
      if (!took) break;
      i++;
    }
    return out;
  }
  function countJumps(n, qs, openQ) {
    if (!n || n.kind !== 'knowledge_point') return '';
    qs = qs || [];
    var groups = [
      ['pre', '前置', prevOf(n.id)],
      ['post', '后续', nextOf(n.id)],
      ['skill', '方法', skillsOf(n.id)],
      ['q', '练习题', qs]
    ];
    var boxes = groups.map(function (g) {
      return '<button type="button" class="dd-count"' + (g[2].length ? '' : ' disabled') +
        ' data-jump="' + g[0] + '"><b>' + g[2].length + '</b>' + g[1] + '</button>';
    }).join('');
    /* 空组要说清楚为什么是 0：687 个知识点里 536 个所在节本来就没有题
       （题目只做到八上第 10–13 章），只印一个 0 会让人以为页面坏了。 */
    var WHY = {
      pre: '这是这一册的第一节，前面还没有要先会的点。',
      post: '这是这一册的最后一节，后面还没有接上来的点。',
      skill: '这一节还没有方法挂上来。',
      q: '这一节还没有练习题（题目目前只做到八年级上册第 10–13 章）。'
    };
    var emptyNote = groups.filter(function (g) { return !g[2].length; }).map(function (g) {
      return '<p class="dd-why">' + C.esc(WHY[g[0]] || '这里还没有内容。') + '</p>';
    }).join('');
    var lists = groups.map(function (g) {
      if (!g[2].length) return '';
      var openHere = !!openQ && g[0] === 'q';
      var show = openHere ? pickByBand(g[2], QCAP) : g[2];
      var inner = g[0] === 'q'
        ? show.map(function (q) {
            return '<a class="dd-q" href="' + practiceHref(volOfQ(q, n), secOfQ(q, n), { q: q.id, from: returnTo(n.id) }) + '">' +
              qLabel(q) + '</a>';
          }).join('')
        : g[2].map(function (x) { return relBtn(x); }).join('');
      var rest = (openHere && g[2].length > QCAP)
        ? '<a class="dd-q-more" href="' + practiceHref(n.vol, n.sec, { from: returnTo(n.id) }) + '">还有 ' +
          (g[2].length - QCAP) + ' 道 · 去练这一节</a>'
        : '';
      return '<div class="mind-picks dd-jump' + (openHere ? ' is-open' : '') + '" data-jump-list="' + g[0] + '"' +
        (openHere ? '' : ' hidden') + '>' + inner + rest + '</div>';
    }).join('');
    return '<div class="dd-jump-set"><div class="dd-counts">' + boxes + '</div>' + emptyNote + lists + '</div>';
  }

  function relBtn(n, badge) {
    if (!n) return '';
    return '<button type="button" class="rel-btn" data-pick="' + C.esc(n.id) + '">' +
      '<span>' + C.mathHtml(nodeName(n)) + '</span>' +
      (badge ? '<i>' + C.esc(badge) + '</i>' : '') + '</button>';
  }

  function secOf(n) {
    if (!n || !n.sec) return '';
    var s = byId[secIdOf(n)];
    var t = s ? C.tidy(s.title) : '';
    if (!t) return C.esc(n.sec);
    /* 节的 title 本来就带「10.1 分式」，再拼一次序号会变成「10.1 10.1 分式」 */
    return C.esc(t.indexOf(n.sec) === 0 ? t : (n.sec + ' ' + t));
  }

  /* Catalog chapter, used to group a chapter cloud into textbook sections. */
  function chapterMeta(n) {
    if (!n) return null;
    var vols = (MC.catalog && MC.catalog.volumes) || [];
    var vol = null;
    vols.forEach(function (v) { if (v.id === n.vol) vol = v; });
    if (!vol) return null;
    var ch = null;
    (vol.chapters || []).forEach(function (c) { if (String(c.no) === String(n.ch)) ch = c; });
    return ch;
  }

  /* Plain section title, keeping the textbook number. */
  function secPlain(vol, sec) {
    var s = byId['S' + vol + '-' + sec];
    var t = s ? C.tidy(s.title || '') : '';
    if (!t) return String(sec);
    return t.indexOf(sec) === 0 ? t : (sec + ' ' + t);
  }

  /* 宽屏是「左图 + 右栏 404px」。右栏空着时它只占地方：全景档一进来图只有
     760px 宽，54 个节点被迫缩到 0.36 倍。所以详情为空时把右栏收掉，图吃满整行；
     点开讲解再让回来（窗口不变，只是栏位重排）。 */
  function setWide(on) {
    if (!wrapEl) return;
    if (wrapEl.classList.contains('is-nodetail') === on) return;
    wrapEl.classList.toggle('is-nodetail', on);
    if (cy) { try { cy.resize(); } catch (e) {} }
    /* 画布从「吃满整行」变成「让出右栏」时宽度会掉一半，可视野还是照着旧宽度取的，
       点就落到画布外面去了——标签要么牵一条跨屏的线，要么根本没画。
       这里按新宽度重新框一次「自己 + 邻居」。 */
    if (cy && state.view === 'mind' && state.focus && byId[state.focus]) {
      try {
        var el = cy.getElementById(state.focus);
        if (el && el.length) {
          var near = el.closedNeighborhood().filter('node');
          cy.fit((near.length ? near : el), 40);
        }
      } catch (e3) {}
    }
  }

  function detailEmpty() {
    if (!detailEl) return;
    if (closeBtn) closeBtn.hidden = true;
    setWide(true);
    /* 窄屏那一层要真的收起来：只换成空态文案的话，屏幕底部仍留一块板 */
    detailEl.classList.add('is-hidden');
    detailEl.innerHTML = '<div class="map-detail-card"><div class="dd-empty">' +
      '点图上一个点：这里会讲清它<b>是什么</b>、<b>先学什么</b>、<b>接着学什么</b>、' +
      '<b>配哪些方法</b>、<b>常踩哪些坑</b>、<b>有哪些题</b>。</div></div>';
    closeRead();
  }

  /* Full writeup in a wide sheet. The side column stays the short version. */
  var readToken = 0;
  function closeRead(restore) {
    var el = document.getElementById('read-sheet');
    if (!el) return;
    readToken++;
    el.hidden = true;
    el.innerHTML = '';
    if (wrapEl) wrapEl.classList.remove('is-reading');
    /* 收阅读壳要把右侧栏还回来，否则从「展开阅读」退出来只剩一张空图。
       detailEmpty() 里也调 closeRead()，那条路不许回填，所以 restore 必须显式传。 */
    if (restore && state.focus && byId[state.focus]) showDetail(state.focus);
  }
  function openRead(id) {
    var n = byId[id];
    var el = document.getElementById('read-sheet');
    if (!n || !el) return;
    var my = ++readToken;
    el.hidden = false;
    /* 阅读壳（右侧整幅）与右侧栏详情讲的是同一份东西；两壳同时开，
       读者会看到两块「同一题两样版式」的讲解，窄屏下还会互相压住。
       所以阅读壳一开，右栏就让位：整个版面收成单栏。 */
    if (wrapEl) wrapEl.classList.add('is-reading');
    el.innerHTML = '<div class="read-bar"><span>知识详解</span>' +
      '<button type="button" class="btn btn-secondary" data-read-close="1">收起阅读</button></div>' +
      '<div class="read-body"><p class="dd-empty">正在取讲解…</p></div>';
    function paint(secData, itemsData, exData) {
      if (my !== readToken || el.hidden) return;
      var body = '';
      try { body = renderDetail(n, secData, itemsData, exData); } catch (eR) { body = ''; }
      el.innerHTML = '<div class="read-bar"><span>知识详解</span>' +
        '<button type="button" class="btn btn-secondary" data-read-close="1">收起阅读</button></div>' +
        '<div class="read-body"><p class="read-loc">' + (secOf(n) || '') + '</p>' + body + '</div>';
    }
    if (!n.vol || !n.sec) { paint(null, { items: [] }, { items: [] }); return; }
    Promise.all([getSec(n.vol, n.sec), getItems(n.vol, n.sec), getEx(n.vol, n.sec),
      MC.data.load('figures').catch(function () { return null; }),
      MC.data.load('qtypes').catch(function () { return null; })]).then(function (res) {
      paint(res[0], res[1], res[2]);
    }).catch(function () { paint(null, { items: [] }, { items: [] }); });
  }

  /* Four lines on the mind map; the seven-part writeup stays behind the fold. */
  function showMindBrief(n, my, head) {
    function paint(secData) {
      var kp = secData ? (secData.kps || []).filter(function (x) { return x.uid === n.id; })[0] : null;
      var t = C.kpText ? C.kpText(kp || n) : { def: '' };
      var nkp = 0;
      if (n.kind === 'section') {
        G.nodes.forEach(function (x) {
          if (x.kind === 'knowledge_point' && x.vol === n.vol && String(x.sec) === String(n.sec)) nkp++;
        });
      }
      function clipName(x) {
        var s = String(x.title || x.name || ''), c = s.search(/[：:]/);
        return c > 1 ? s.slice(0, c) : s;
      }
      function btnOf(x) {
        return '<button type="button" class="rel-btn" data-pick="' + C.esc(x.id) + '">' +
          '<span>' + C.mathHtml(C.clipMath(clipName(x), 40)) + '</span></button>';
      }
      var more = '';
      var what = t.def || n.title;
      var bds = (kp && kp.boundaries) || (n.boundaries || []);
      var avoid = bds.length ? String(bds[0]) : '';
      var sk = n.kind === 'knowledge_point' ? skillsOf(n.id)[0] : null;
      var how = sk ? sk.title : '';
      if (n.kind === 'chapter') {
        var buckets = {};
        G.nodes.forEach(function (x) {
          if (x.vol !== n.vol || String(chOf(x)) !== String(n.ch)) return;
          if (x.kind !== 'knowledge_point' && x.kind !== 'skill') return;
          var key = x.sec || 'other';
          if (!buckets[key]) buckets[key] = [];
          buckets[key].push(x);
        });
        var meta = chapterMeta(n);
        var order = [];
        if (meta && meta.sections) meta.sections.forEach(function (s) { if (buckets[s.no]) order.push(s.no); });
        Object.keys(buckets).forEach(function (k) { if (order.indexOf(k) < 0) order.push(k); });
        var nSec = order.length;
        what = '这一章有 ' + nSec + ' 节。图上只标节名；点开一节，再看里面的知识和方法。';
        avoid = '';
        how = '';
        var folds = '';
        var lastUnit = '';
        order.forEach(function (sec) {
          var items = buckets[sec].slice().sort(function (a, b) {
            if (a.kind !== b.kind) return a.kind === 'knowledge_point' ? -1 : 1;
            return String(a.id).localeCompare(String(b.id));
          });
          var nk = 0, ns = 0;
          items.forEach(function (x) { if (x.kind === 'skill') ns++; else nk++; });
          var unitName = '';
          if (meta && meta.units && meta.sections) {
            var page = 0;
            meta.sections.forEach(function (s) { if (s.no === sec) page = s.page || 0; });
            var unit = null;
            meta.units.forEach(function (u) { if (page >= (u.page || 0)) unit = u; });
            if (unit) unitName = (unit.label ? unit.label + ' · ' : '') + C.tidy(unit.title || '');
          }
          if (unitName && unitName !== lastUnit) {
            folds += '<div class="unit-h">' + C.esc(unitName) + '</div>';
            lastUnit = unitName;
          }
          var open = state.openSec === sec;
          folds += '<button type="button" class="sec-head' + (open ? ' on' : '') + '" data-sec="' + C.esc(sec) +
            '" data-call="' + C.esc('S' + n.vol + '-' + sec) + '">' +
            '<span>' + C.esc(secPlain(n.vol, sec)) + '</span>' +
            '<i>' + nk + ' 知识' + (ns ? ' · ' + ns + ' 方法' : '') + '</i></button>' +
            '<div class="sec-body mind-picks"' + (open ? '' : ' hidden') + '>' +
            items.map(function (x) { return relBtn(x, x.kind === 'skill' ? '方法' : ''); }).join('') +
            '</div>';
        });
        more = folds;
      } else if (n.kind === 'thought') {
        var methods = thoughtSkills(n.id).slice();
        if (n.level === 'thought') {
          G.nodes.forEach(function (f) {
            if (f.kind === 'thought' && f.parent === n.id) {
              thoughtSkills(f.id).forEach(function (m) { methods.push(m); });
            }
          });
        }
        var seenM = {}, uniq = [];
        methods.forEach(function (m) { if (m && !seenM[m.id]) { seenM[m.id] = 1; uniq.push(m); } });
        var kpN = {};
        uniq.forEach(function (m) { kpsUnder(m.id).forEach(function (k) { if (k) kpN[k.id] = 1; }); });
        what = n.desc || n.title;
        avoid = (n.boundaries && n.boundaries[0]) ? String(n.boundaries[0]) : '';
        how = '';
        more = '<p class="mind-chain">用到的知识点 ' + Object.keys(kpN).length + ' · 方法 ' + uniq.length + '</p>' +
          '<div class="mind-picks">' + uniq.slice(0, 8).map(btnOf).join('') + '</div>';
      } else if (n.kind === 'skill') {
        var ks = kpsUnder(n.id);
        var skRec = secData && (secData.skills || []).filter(function (s) { return (s.uid || s.id) === n.id; })[0];
        what = (skRec && (skRec.desc || skRec.summary)) || n.title;
        if (skRec && skRec.boundaries && skRec.boundaries.length) avoid = String(skRec.boundaries[0]);
        else if (skRec && skRec.boundary) avoid = String(skRec.boundary);
        how = '';
        more = '<p class="mind-chain">联系 ' + ks.length + ' 个知识点</p><div class="mind-picks">' +
          ks.slice(0, 8).map(btnOf).join('') + '</div>';
      } else if (n.kind === 'volume') {
        what = '点一章，右边列出这一章的知识点。';
        avoid = '';
        how = '';
      } else if (n.kind === 'section') {
        var secItems = [];
        G.nodes.forEach(function (x) {
          if (x.vol !== n.vol || String(x.sec) !== String(n.sec)) return;
          if (x.kind === 'knowledge_point' || x.kind === 'skill') secItems.push(x);
        });
        var nk = 0, ns = 0;
        secItems.forEach(function (x) { if (x.kind === 'skill') ns++; else nk++; });
        what = '这一节有 ' + nk + ' 个知识点' + (ns ? '、' + ns + ' 个方法' : '') + '。它们连在这一节的点上。';
        var upCh = parentChapter(n);
        var upRow = upCh
          ? '<button type="button" class="sec-head" data-call="' + C.esc(upCh.id) + '"><span>' +
            C.mathHtml(upCh.title) + '</span><i>回到这一章</i></button>'
          : '';
        more = upRow + '<div class="mind-picks">' + secItems.map(function (x) {
          return relBtn(x, x.kind === 'skill' ? '方法' : '');
        }).join('') + '</div>';
      }
      var go = (n.vol && n.sec)
        ? '<a class="btn btn-primary" href="' + practiceHref(n.vol, n.sec, { from: returnTo(n.id) }) + '">去练这一节</a>'
        : '';
      var readBtn = n.kind === 'chapter' ? '' :
        '<button type="button" class="btn btn-secondary" data-read="' + C.esc(n.id) + '">展开阅读</button>';
      /* 四计数只在知识点页（explainPage）画一次。这里以前也画一份，
         同一屏出现两套「1 前置 / 5 后续 / 3 方法 / 50 练习题」，
         而且这一份没有题目清单，练习题永远显示 0。 */
      detailEl.innerHTML = '<div class="map-detail-card mind-brief">' + head +
        '<div class="dd-def mind-def">' + C.mathHtml(what) + '</div>' +
        (avoid ? '<p class="mind-line"><b>别用成</b> ' + C.mathHtml(avoid) + '</p>' : '') +
        (how ? '<p class="mind-line"><b>先用</b> ' + C.mathHtml(how) + '</p>' : '') +
        more +
        ((go || readBtn) ? '<div class="btn-row">' + go + readBtn + '</div>' : '') +
        '</div>';
      scrollDetailIntoView();
    }
    if (!n.vol || !n.sec) { paint(null); return; }
    getSec(n.vol, n.sec).then(function (secData) {
      if (my === detToken) paint(secData);
    }).catch(function () { if (my === detToken) paint(null); });
  }

  function showDetail(id) {
    var n = byId[id];
    if (!n || !detailEl) return;
    /* 十字方位档已经把这个点该给人看的东西全摊在版面上（名字、定义、前置、后续、
       方法、同章）。右栏再画一份是同一份内容的第二份，还会把版面重新挤窄。 */
    if (crossOn()) {
      detailEl.classList.add('is-hidden');
      if (closeBtn) closeBtn.hidden = true;
      return;
    }
    detailEl.classList.remove('is-hidden');
    setWide(false);
    var my = ++detToken;
    var head = '<div class="dd-h"><span class="dd-kind' +
      (n.kind === 'skill' ? ' k-skill' : (n.kind === 'misconception' ? ' k-mis' : (n.kind === 'thought' ? ' k-th' : ''))) + '">' +
      C.esc(KIND_CN[n.kind] || '节点') + '</span><h2>' + C.mathHtml(n.title) + '</h2></div>';
    detailEl.innerHTML = '<div class="map-detail-card">' + head +
      (secOf(n) ? '<div class="dd-pills"><span class="pill">' + secOf(n) + '</span></div>' : '') +
      '<div class="dd-block"><span class="dd-empty">正在取讲解…</span></div></div>';
    if (closeBtn) closeBtn.hidden = false;
    scrollDetailIntoView();

    if (state.view === 'mind') { showMindBrief(n, my, head); return; }

    var vol = n.vol, sec = n.sec;
    /* 思想节点是跨册的，没有 vol/sec：仍然要出详情，只是不取节切片 */
    if (!vol || !sec) {
      detailEl.innerHTML = renderDetail(n, null, null, null);
      scrollDetailIntoView();
      return;
    }
    Promise.all([getSec(vol, sec), getItems(vol, sec), getEx(vol, sec),
      MC.data.load('qtypes').catch(function () { return null; }),
      MC.data.load('figures').catch(function () { return null; })]).then(function (res) {
      if (my !== detToken) return;
      detailEl.innerHTML = renderDetail(n, res[0], res[1], res[2]);
      scrollDetailIntoView();
    });
  }

  /* 一块：标题 + 角标 + 内容 */
  function block(title, badge, inner) {
    if (!inner) return '';
    return '<div class="dd-block"><h3>' + C.esc(title) + (badge ? '<em>' + C.esc(badge) + '</em>' : '') +
      '</h3>' + inner + '</div>';
  }
  function ulOf(list) {
    var arr = (list || []).filter(function (x) { return x; });
    if (!arr.length) return '';
    return '<ul>' + arr.map(function (x) { return '<li>' + C.mathHtml(x) + '</li>'; }).join('') + '</ul>';
  }

  /* 方法卡：步骤 + 条件 + 失败信号，折叠起来，不折叠的话一屏全是字 */
  function skillFold(s) {
    var steps = (s.steps || []).slice().sort(function (a, b) { return (a.ordinal || 0) - (b.ordinal || 0); });
    var inner = '';
    if (steps.length) {
      inner += steps.map(function (st) {
        return '<div class="dd-step"><b>' + (st.ordinal || '·') + '</b><div>' + C.mathHtml(st.action || '') +
          (st.basis ? '<span class="why">' + C.mathHtml(st.basis) + '</span>' : '') + '</div></div>';
      }).join('');
    }
    if (s.conditions && s.conditions.length) {
      inner += '<div class="dd-block"><h3>什么时候用</h3><ul>' + s.conditions.map(function (x) {
        return '<li>' + C.mathHtml(x) + '</li>';
      }).join('') + '</ul></div>';
    }
    if (s.signals && s.signals.length) {
      inner += '<div class="dd-block"><h3>做错的样子</h3><ul>' + s.signals.map(function (x) {
        return '<li>' + C.mathHtml(x) + '</li>';
      }).join('') + '</ul></div>';
    }
    if (s.alternatives) {
      inner += '<div class="dd-block"><h3>换个做法</h3><div class="dd-def" style="font-size:13.5px">' +
        C.mathHtml(s.alternatives) + '</div></div>';
    }
    var tier = s.tier || 'core';
    return '<details class="dd-fold"><summary><span class="sum-n">' + C.mathHtml(C.clipMath(s.name || '', 34)) +
      '</span><em>' + C.esc(TIER_CN[tier] || tier) + (s.family ? ' · ' + C.esc(s.family) : '') + '</em></summary>' +
      '<div class="in">' + (inner || '<div class="dd-empty">这条方法还没写步骤。</div>') + '</div></details>';
  }

  /* 错因卡：表现 + 怎么改 */
  function mcFold(m) {
    var sig = (m.signals || []).filter(Boolean);
    var remedy = m.remedy || {};
    var shorts = (remedy.short_items || []).filter(Boolean);
    var inner = '';
    if (sig.length) {
      inner += '<div class="dd-block"><h3>会这么想</h3><ul>' + sig.map(function (x) {
        return '<li>' + C.mathHtml(x) + '</li>';
      }).join('') + '</ul></div>';
    }
    if (shorts.length) {
      inner += '<div class="dd-block"><h3>怎么改</h3><ul>' + shorts.map(function (x) {
        return '<li>' + C.mathHtml(x) + '</li>';
      }).join('') + '</ul></div>';
    }
    var cat = m.category ? (C.MCAT_CN[m.category] || m.category) : '';
    /* summary 里也带公式（如「把 $\frac{x}{2}$ 当成分式」），先 plain 会抹成「把 x 2」，
       所以走 mathHtml；名字本来就长，放宽到 30 字再说 */
    return '<details class="dd-fold"><summary><span class="sum-n">' + C.mathHtml(C.clipMath(sig[0] || '这类错法', 30)) +
      '</span>' + (cat ? '<em>' + C.esc(cat) + '</em>' : '') + '</summary>' +
      '<div class="in">' + (inner || '<div class="dd-empty">这条错因还没写怎么改。</div>') + '</div></details>';
  }

  /* 例题：以这一节里「这次考的就是它」为优先，难度低的先给 */
  /* 取「属于这个点的题」：教材题基本没标考点（items[].kps 是空数组），
     硬按考点过滤会一道都取不到。先按考点匹配，取不到就退回本节全部题，
     并在小标题里说明是「本节」不是「这个点」，不假装精确关联。 */
  function itemsFor(itemsData, kid) {
    var all = (itemsData && itemsData.items) || [];
    var hit = all.filter(function (it) {
      return (it.kps || []).some(function (k) { return k.uid === kid; });
    });
    return hit.length ? { list: hit, exact: true } : { list: all, exact: false };
  }

  /* Hash that reopens this knowledge point or method after a question.
     The graph keeps one hash while the side panel changes, so a plain
     history.back() lands on an empty map. Pass the open node back. */
  function returnTo(nodeId) {
    var here = MC.router.here && MC.router.here();
    var name = here && here.route && here.route.name;
    if (name === 'kp') return '#/kp/' + encodeURIComponent(nodeId);
    /* 正在图上、地址里就是这个点时，把当前地址原样带回去。
       早先按 state 重新拼：?view=kp 的地址回跳时 view 丢了、read=1 也没了，
       「返回刚才的页」落到另一屏 —— 用户说的「跳转也有问题」就是这一条。 */
    var cur = String((window.location && window.location.hash) || '');
    var key = encodeURIComponent(nodeId);
    if (/^#\/map\b/.test(cur) && (cur.indexOf('node=' + key) > -1)) return cur;
    var view = (state && state.view) || 'mind';
    var hash = '#/map?view=' + encodeURIComponent(view) + '&node=' + key;
    /* 阅读壳开着时也必须带 read=1，否则回去只看到短卡，看不到刚才那篇。 */
    var sheet = document.getElementById('read-sheet');
    if (view === 'mind' || (sheet && !sheet.hidden)) hash += '&read=1';
    return hash;
  }

  /* Practice link that remembers the page it was opened from. */
  function practiceHref(vol, sec, opt) {
    opt = opt || {};
    var href = '#/practice/' + encodeURIComponent(vol) + '/' + encodeURIComponent(sec);
    var bits = [];
    if (opt.q) bits.push('q=' + encodeURIComponent(opt.q));
    if (opt.qs) bits.push('qs=' + encodeURIComponent(opt.qs));
    if (opt.mode) bits.push('mode=' + encodeURIComponent(opt.mode));
    if (opt.from) bits.push('from=' + encodeURIComponent(opt.from));
    return bits.length ? href + '?' + bits.join('&') : href;
  }

  /* ---------- 十字方位：把「这个点周围有什么」摆成方向 ----------
     用户要的版式（m20543）：上=前置 4，中=当前，下=后续 4，右=能解它的方法 3，再下面=同章 10，
     每一张都要有一句话介绍。这些点以前散在画布四周、靠引线连过去，缩到 0.5 倍时名字只剩 5px，
     而且没有方向含义——读者分不清哪个在上、哪个在下。所以局部档不再用画布排位：
     改成 DOM 十字方位，字号是真的 13–14px，位置由版式决定，不会再挤成一团。 */
  function splitTitle(t) {
    var s = String(t == null ? '' : t);
    var i = s.search(/[：:]/);
    if (i <= 0) return { name: s, desc: '' };
    return { name: s.slice(0, i), desc: s.slice(i + 1) };
  }
  function briefOf(n, max) {
    if (!n) return '';
    var sp = splitTitle(n.title);
    var d = sp.desc || n.def || n.why || '';
    return C.clip(String(d).replace(/\s+/g, ' '), max || 44);
  }
  /* 节号的先后必须按数值比：字符串比较里 '12.10' 排在 '12.2' 前面，
     于是「同章一起学」会先冒出第 10 节的点，读者以为第 12 章只有两节。 */
  function secNumOf(n) {
    var m = String((n && n.sec) || '').match(/^(\d+)(?:\.(\d+))?/);
    return m ? (Number(m[1]) * 1000 + Number(m[2] || 0)) : 9999999;
  }
  function byBook(a, b) {
    var s = secNumOf(a) - secNumOf(b);
    return s || String(a.id).localeCompare(String(b.id));
  }
  /* 卡上可以带一个小标签：补位的来源（更早的节 / 我用到的方法）必须写出来，
     否则读者会把「课程顺序」当成「先修依赖」——这两件事在数据里是不同关系。 */
  function wrap(n, tag) { return { n: n, tag: tag || '' }; }
  function crossNeighbors(id) {
    var me = byId[id] || {};
    var pre = [], post = [], sk = [], use = [];
    (G && G.edges ? G.edges : []).forEach(function (e) {
      var a = byId[e.s], b = byId[e.d];
      if (!a || !b) return;
      if (e.r === 'prerequisite_of') {
        if (e.d === id) pre.push(a);
        else if (e.s === id) post.push(b);
      } else if (e.r === 'applies_to') { if (e.d === id) sk.push(a); }
      else if (e.r === 'uses_skill') { if (e.s === id) use.push(b); }
    });
    pre.sort(byBook); post.sort(byBook); sk.sort(byBook); use.sort(byBook);
    var seen = {};
    seen[id] = 1;
    pre.concat(post, sk, use).forEach(function (x) { seen[x.id] = 1; });

    /* 数据事实：一个点常常只有 1 条直接前置（K801-12.1-01 只有「平面图形」一条）。
       但用户要的是「上=前置 4」这块信息量。补位只用**前置链的上一跳**（前置的前置），
       因为它仍然是「要先会」；拿「同册更早的节」垫过，实测垫进来的是第 11 章的二次根式，
       跟三角形定义毫无关系——那种补位是伪造依赖。 */
    var preOut = pre.map(function (x) { return wrap(x, ''); });
    var q2 = pre.slice(), hops = 0;
    while (preOut.length < 4 && q2.length && hops < 3) {
      var nextQ = [];
      for (var iq = 0; iq < q2.length && preOut.length < 4; iq++) {
        var cur = q2[iq];
        ((G && G.edges) || []).forEach(function (e) {
          if (e.r !== 'prerequisite_of' || e.d !== cur.id) return;
          var p2 = byId[e.s];
          if (!p2 || seen[p2.id] || preOut.length >= 4) return;
          seen[p2.id] = 1;
          preOut.push(wrap(p2, '再往前一步'));
          nextQ.push(p2);
        });
      }
      q2 = nextQ;
      hops++;
    }
    /* 方法同理：applies_to 不够 3 条时，用「这个点会用到的方法」（uses_skill）补。 */
    var skOut = sk.map(function (x) { return wrap(x, ''); });
    for (var i3 = 0; i3 < use.length && skOut.length < 3; i3++) {
      if (sk.indexOf(use[i3]) < 0) skOut.push(wrap(use[i3], '这一节要用'));
    }

    var same = [];
    if (me.vol != null && me.ch != null) {
      Object.keys(byId).forEach(function (k) {
        var x = byId[k];
        if (!x || x.kind !== 'knowledge_point' || seen[x.id]) return;
        if (String(x.vol) !== String(me.vol) || String(x.ch) !== String(me.ch)) return;
        same.push(x);
      });
    }
    /* 同节排最前（secNumOf 相同就是同一节），再按节号往后长：同章 10 个里不会混进第 10 节抢位。 */
    same.sort(function (a, b) {
      var sa = secNumOf(a) === secNumOf(me) ? 0 : 1, sb = secNumOf(b) === secNumOf(me) ? 0 : 1;
      return (sa - sb) || byBook(a, b);
    });
    return {
      pre: preOut.slice(0, 4),
      post: post.map(function (x) { return wrap(x, ''); }).slice(0, 4),
      sk: skOut.slice(0, 3),
      same: same.map(function (x) { return wrap(x, ''); }).slice(0, 10)
    };
  }
  function crossCard(it, kind, max) {
    var n = it && it.n ? it.n : it;
    if (!n) return '';
    var sp = splitTitle(n.title);
    var nm = sp.name || n.id;
    var d = briefOf(n, max);
    var tag = (it && it.tag) ? '<i class="mc-tag">' + C.esc(it.tag) + '</i>' : '';
    /* 方法节点的 title 里没有「：定义」这一段，briefOf 取不到介绍；
       但「这套方法能解几个点」是它自己的硬信息，比留空强。 */
    if (!d && kind === 'sk') {
      var kn = kpsUnder(n.id).length;
      d = kn ? ('能解 ' + kn + ' 个点') : '这个方法还没挂到点上';
    }
    return '<a class="mc-card mc-' + kind + '" href="#/kp/' + C.esc(encodeURIComponent(n.id)) + '">' +
      '<b>' + tag + C.mathHtml(C.clipMath(nm, kind === 'self' ? 42 : 18)) + '</b>' +
      (d ? '<span>' + C.mathHtml(C.clipMath(d, max || 44)) + '</span>' : '') +
      '</a>';
  }
  function crossRow(label, list, kind, emptyText, max) {
    var body = list.length ? list.map(function (n) { return crossCard(n, kind, max); }).join('')
      : '<p class="mc-empty">' + C.esc(emptyText) + '</p>';
    return '<div class="mc-sec mc-' + kind + '-sec">' +
      '<div class="mc-h">' + label + '</div>' +
      '<div class="mc-row">' + body + '</div></div>';
  }
  /* 一处渲染，两个地方用：点开一个点、深链进来自动聚焦。 */
  function crossHtml(id) {
    var n = byId[id];
    if (!n) return '';
    var nb = crossNeighbors(id);
    var sp = splitTitle(n.title);
    var self = '<div class="mc-self">' +
      '<div class="mc-h">当前知识点</div>' +
      '<h3>' + C.mathHtml(sp.name || n.id) + '</h3>' +
      (sp.desc ? '<p class="mc-desc">' + C.mathHtml(sp.desc) + '</p>' : '') +
      '<div class="mc-meta">' + C.esc(volLabel(n.vol) + ' · ' + (n.sec ? (n.sec + ' 节') : '') +
        ((n.qn || secQ[n.vol + '-' + n.sec]) ? (' · 本节 ' + (n.qn || secQ[n.vol + '-' + n.sec]) + ' 道练习') : '')) + '</div>' +
      '<div class="mc-acts">' +
        '<a class="btn btn-primary" href="#/kp/' + C.esc(encodeURIComponent(id)) + '">看讲解</a>' +
        (n.sec ? '<a class="btn" href="' + C.esc(practiceHref(n.vol, n.sec, { from: crossUrl(id) })) + '">去练习</a>' : '') +
      '</div></div>';
    return '<div class="mc-grid">' +
      crossRow('↑ 前置 · 要先会', nb.pre, 'pre', '这是这一章的起点，前面没有要先会的点。', 40) +
      self +
      crossRow('→ 能解它的方法', nb.sk, 'sk', '这套方法还没有挂到这个点上。', 40) +
      crossRow('↓ 后续 · 接着学', nb.post, 'post', '这是后来的事：暂时没有点把它当前置。', 40) +
      crossRow('同章 · 一起学', nb.same, 'same', '这一章只有这一个点。', 26) +
    '</div>';
  }
  /* 局部档：画布让位给十字方位。总图仍然用画布（那才看得出全貌）。
     顺带把「从题目返回来图形乱掉」这条路掐死：DOM 重排是确定的，没有画布要重绘。 */
  /* 六册全景走的是章级卡片图（buildChapterMap），不是点云：图例、提示、判据都要认这一档，
     否则会对着「26 张卡片」说「黄圈是方法」。 */
  /* 每档画面该说的一句话：只说这一档真有的东西（决策 35：说明文字必须描述图上真实的东西）。 */
  function hintText() {
    if (state.zoomed) return '放大的是这个点和它连着的线。';
    if (isChapterMap()) return '六册全景只到「章」：点一张卡片，进去看这一章的节和知识点。';
    /* 章内档和点云档长得不一样：黄菱形是小节、蓝菱形是知识点、绿圆是方法。
       原来它借用了点云那句「绿圈是章节…」，屏幕上根本没有绿圈 —— 说明文字必须按档换（决策 35）。 */
    if (isChapterView()) return '这一章：黄菱形是小节，蓝菱形是知识点，绿圆是方法。点一个知识点，看它的前置、后续和方法；要按节看全部点名，点右上「点名」。';
    if (state.view === 'mind') return '一张网：绿圈是章节，浅灰圈是知识点，黄圈是方法，紫是思想。点越大，连的线越多。思想在最上面一排。';
    if (state.view === 'chart') return '上下是这一节里的点，左右是先学后学。';
    if (state.view === 'overview') return '上下是归属，左右是先后；紫线是思想穿过哪些章。';
    return '';
  }
  function isChapterMap() {
    /* 带 node= 的深链接（从练习题「回到图上」回来的那条路）虽然也是 mind + 全书，
       但它已经是焦点态、画的是十字方位卡片：两档不能同时成立，
       否则章卡片图会被藏起来、图例却还在讲「章 / 先修 / 教材顺序」。 */
    if (state.focus) return false;
    return !!(state.view === 'mind' && state.kind === 'all' && (!state.vol || state.vol === 'all'));
  }
  /* 章内档：mind + 全书 + 选了某一册某一章、且没有焦点。它画的是这一章的节/点云，
     和六册全景（章卡片）、十字方位（焦点）都不一样，提示语与「点名」入口都按这一档走。 */
  function isChapterView() {
    return !!(state.view === 'mind' && state.kind === 'all' && state.vol && state.vol !== 'all'
      && state.ch && state.ch !== 'all' && !state.focus);
  }
  function crossOn() {
    var f = state.focus ? byId[state.focus] : null;
    return !!(state.view === 'mind' && f && f.kind === 'knowledge_point');
  }
  /* 手机上的六册全景不走画布：430 宽时 26 张卡片只能缩到 0.37 倍，
     13px 的字变成 4.8px —— 那正是用户说的「文字显示不全」。
     这一档改用 DOM 列表（和十字方位档同一套容器），字是真字号，纵向滚动。 */
  function chapterListOn() {
    return isChapterMap() && window.innerWidth < 720;
  }
  function chapterListHtml() {
    var out = [], curVol = null;
    chsSorted().forEach(function (ch) {
      if (String(ch.vol) !== String(curVol)) {
        if (curVol !== null) out.push('</div>');
        curVol = ch.vol;
        var vobj = volObj(curVol);
        out.push('<h3 class="cl-vol">' + C.esc(C.tidy((vobj && vobj.label) || curVol)) + '</h3><div class="cl-group">');
      }
      var t = C.tidy(ch.title || '') || ('第' + ch.ch + '章');
      var n = chsCount(ch);
      out.push('<a class="mc-card cl-ch" href="#/map?vol=' + encodeURIComponent(ch.vol) + '&ch=' + encodeURIComponent(ch.ch) + '">' +
        '<b>' + C.mathHtml(t) + '</b><span>' + C.esc(n ? ('这一章 ' + n + ' 个知识点') : '这一章') + '</span></a>');
    });
    if (curVol !== null) out.push('</div>');
    /* 列表档自己的引导句：画布那档靠 .map-hint，这一档它在 CSS 里被收掉了。 */
    return '<p class="cl-lead">六册全景只到「章」：点一章进去看这一章的节和知识点。</p>' +
      '<div class="cl-wrap">' + out.join('') + '</div>';
  }
  function chsSorted() {
    var list = [];
    var vlist = (MC.catalog && MC.catalog.volumes) || [];
    vlist.forEach(function (v) {
      G.nodes.forEach(function (n) { if (n.kind === 'chapter' && n.vol === v.id) list.push(n); });
    });
    list.sort(function (a, b) { return String(a.vol).localeCompare(String(b.vol)) || Number(a.ch) - Number(b.ch); });
    return list;
  }
  function chsCount(ch) {
    var n = 0;
    G.nodes.forEach(function (x) {
      if (x.kind === 'knowledge_point' && String(x.vol) === String(ch.vol) && String(x.ch) === String(ch.ch)) n++;
    });
    return n;
  }

  /* 层级地址：只描述「在看哪一章」，不带焦点。 */
  function layerUrl() {
    var q = [];
    if (state.vol && state.vol !== 'all') q.push('vol=' + encodeURIComponent(state.vol));
    if (state.ch && state.ch !== 'all') q.push('ch=' + encodeURIComponent(state.ch));
    return '#/map' + (q.length ? '?' + q.join('&') : '');
  }
  /* 焦点地址：层级 + node=。练习页的 from 参数用同一个串，‹ 回来才回得到这张卡。 */
  function crossUrl(id) {
    var base = layerUrl();
    return base + (base.indexOf('?') < 0 ? '?' : '&') + 'node=' + encodeURIComponent(id);
  }
  function syncCross() {
    if (!crossEl) return;
    var f = state.focus ? byId[state.focus] : null;
    var listed = chapterListOn();
    var on = crossOn() || listed;
    var stage = crossEl.parentNode;
    if (stage && stage.classList) stage.classList.toggle('is-cross', on);
    /* 顶部工具条（思想筛选、看全）在 .mapstage 之外，光给画布加类管不到它们，
       所以整块 .mapwrap 也挂一个同名类，由 CSS 一起收。 */
    if (wrapEl) wrapEl.classList.toggle('is-cross', on);
    crossEl.hidden = !on;
    if (cyEl) cyEl.hidden = on;
    /* 焦点必须写进地址栏：刷新页面、从练习页 ‹ 回来，靠的就是这个 node=。
       收焦点则退回层级地址（章内档要回到 #/map?vol=…&ch=…，不能一路退回六册）。 */
    if (history.replaceState) {
      if (on && !listed) {
        var cu = crossUrl(state.focus);
        if (location.hash !== cu) history.replaceState(null, '', cu);
      } else if (!on && /[?&]node=/.test(location.hash)) {
        history.replaceState(null, '', layerUrl());
      }
    }
    if (listed) {
      crossEl.innerHTML = chapterListHtml();
      crossEl.classList.add('is-list');
      if (calloutEl) { calloutEl.hidden = true; calloutEl.innerHTML = ''; }
      /* 引导句写在列表自己身上（下面 chapterListHtml 的 .cl-lead）：
         .mapstage.is-cross 那组 CSS 会把 .map-hint 一起收掉，列表档没有画布提示条可用。 */
      if (hintEl) hintEl.hidden = true;
      if (detailEl) detailEl.classList.add('is-hidden');
      return;
    }
    if (crossEl.classList) crossEl.classList.remove('is-list');
    /* 章内档的「点名」浮层：进出这一档要跟着收放，否则切走以后它挂在画布上。 */
    paintSide();
    if (on) {
      crossEl.innerHTML = crossHtml(state.focus);
      if (calloutEl) { calloutEl.hidden = true; calloutEl.innerHTML = ''; }
      if (hintEl) hintEl.hidden = true;
      if (detailEl) detailEl.classList.add('is-hidden');
    }
  }

  /* 题引用（explain 的 sk.qs、节点四格里的练习题）只带 id 和节号，不带册号；
     直接拼链接会拼出 '#/practice/undefined/12.1'——点进去当然打不开。
     册号按三级回退：题引用自己 → 所属知识点 → 按节号去目录里查 → 默认册。 */
  function secOfQ(q, n) {
    if (q && q.sec) return String(q.sec);
    if (q && q.no) return String(q.no);
    var m = String((q && q.id) || '').match(/^(\d+\.\d+)/);
    return m ? m[1] : (n && n.sec ? String(n.sec) : '');
  }
  function volOfQ(q, n) {
    if (q && q.vol) return String(q.vol);
    if (n && n.vol) return String(n.vol);
    var sec = secOfQ(q, n), hit = '';
    ((MC.catalog && MC.catalog.volumes) || []).forEach(function (v) {
      (v.chapters || []).forEach(function (c) {
        (c.sections || []).forEach(function (x) { if (!hit && String(x.no) === sec) hit = v.id; });
      });
    });
    return hit || defVol();
  }

  /* 一张题卡：题干 + 档位/来源 + 折叠起来的答案与解析 */
  function qCardOne(it, vol, sec, actText, from) {
    /* 题干里有 $\frac{1}{x}$ 这类公式，先 plain 再 mathHtml 会把 1/x 抹成「1x」，
       所以直接把原文交给 mathHtml（它自己转义非公式部分）。
       答案下面仍列出评分步骤。句子在 c 上；读 action 时每一行只剩序号。 */
    var steps = C.stepBodies(it.steps, it.note).map(function (s) {
      return '<li>' + C.mathHtml(s.body) + '</li>';
    }).join('');
    return '<div class="dd-qc"><div class="qstem">' + C.mathHtml(it.stem || '') + '</div>' +
      '<div class="meta"><span class="pill">' + C.esc(C.BAND_CN[it.band] || it.band) + '</span>' +
      (it.purpose ? '<span class="pill" title="' + C.esc(it.purpose.why || '') + '">' +
        C.esc(C.PURPOSE_CN[it.purpose.p] || it.purpose.p) + '</span>' : '') +
      (it.src ? '<span>' + C.esc(it.src) + '</span>' : '') +
      (vol && sec ? '<button type="button" class="rel-btn" style="width:auto;margin:0 0 0 auto" data-go="' +
        C.esc(practiceHref(vol, sec, actText ? { from: from } : { q: it.id, from: from })) + '">' +
        C.esc(actText || '看这道题') + '</button>' : '') +
      '</div><details class="dd-fold dd-ans"><summary>看答案与思路</summary><div class="dd-ansbody">' +
      C.mathHtml(C.ansText(it.ans) || '（这题答案还没入库）') +
      (steps ? '<ol class="dd-step">' + steps + '</ol>' : '') +
      (it.note ? '<div class="dd-qnote">' + C.mathHtml(it.note) + '</div>' : '') +
      '</div></details></div>';
  }

  /* 教材例题：优先讲教材原题（题干与解析都是教材/教参原话），比生成的题更适合当「例题」 */
  function exCards(exData, kid, vol, sec, from) {
    var all = (exData && exData.items) || [];
    if (!all.length) return { html: '', hint: '' };
    var hit = all.filter(function (it) {
      return (it.kps || []).some(function (k) { return k.uid === kid; });
    });
    var list = (hit.length ? hit : all).slice(0, 2);
    return {
      html: list.map(function (it) { return qCardOne(it, vol, sec, '', from); }).join(''),
      hint: hit.length ? list.length + ' 道，答案折叠着' : '教材里这一节的例题（还没逐题标考点）'
    };
  }

  function qCards(itemsData, kid, vol, sec, from) {
    var got = itemsFor(itemsData, kid);
    var list = got.list.slice();
    if (!list.length) return { html: '', title: '', hint: '' };
    var order = { basic: 0, standard: 1, advanced: 2, challenge: 3, competition: 4 };
    list.sort(function (a, b) { return (order[a.band] || 9) - (order[b.band] || 9); });
    /* 两行计数（spec 6 第 7 段）：有 purpose 的按用途分列，没标的只报「还有 N 道没标用途」，
       绝不替它猜一个类别——猜出来的分类比留空更误导。 */
    var cnt = {}, marked = 0;
    list.forEach(function (it) {
      var p = it.purpose && it.purpose.p;
      if (p) { cnt[p] = (cnt[p] || 0) + 1; marked++; }
    });
    var parts = Object.keys(cnt).sort(function (a, b) { return cnt[b] - cnt[a]; })
      .map(function (k) { return (C.PURPOSE_CN[k] || k) + ' ' + cnt[k]; });
    var line = (got.exact ? '这一点 ' : '这一节 ') + list.length + ' 道' +
      (parts.length ? '：' + parts.join(' · ') : '') +
      (list.length > marked ? '；还有 ' + (list.length - marked) + ' 道没标用途' : '');
    var html = list.slice(0, 3).map(function (it) { return qCardOne(it, vol, sec, '', from); }).join('');
    return {
      html: html,
      title: '题',
      hint: line + '（先列 ' + Math.min(3, list.length) + ' 道）'
    };
  }

  /* Figures whose mark list names this node. The picture is the explanation. */
  function figureHtml(list) {
    if (!list.length || !MC.fig) return '';
    var seen = {};
    return list.filter(function (f) {
      if (!f || seen[f.uid]) return false;
      seen[f.uid] = 1;
      return true;
    }).map(function (f) { return MC.fig.render(f); }).join('');
  }

  function figureBlock(id) {
    if (!MC.fig) return '';
    return figureHtml(MC.fig.matching(id, 'kp_refs').concat(MC.fig.matching(id, 'skill_refs')));
  }

  /* Checked question types that name this knowledge point. */
  function qtypeCards(uid) {
    var pack = MC.peek('qtypes');
    if (!pack || !uid) return '';
    var types = (pack.types || []).filter(function (t) {
      return (t.kp_refs || []).indexOf(uid) >= 0 && (t.questions || []).length;
    });
    if (!types.length) return '';
    return types.map(function (t) {
      var bySec = {};
      (t.questions || []).forEach(function (q) {
        var key = q.vol + '/' + q.sec;
        (bySec[key] || (bySec[key] = [])).push(q.id);
      });
      var links = Object.keys(bySec).map(function (key) {
        var parts = key.split('/');
        return '<button type="button" class="btn btn-secondary" data-go="' +
          C.esc(practiceHref(parts[0], parts[1], { qs: bySec[key].join(','), from: returnTo(uid) })) + '">' +
          '练这一题型 · ' + C.esc(parts[1]) + ' · ' + bySec[key].length + ' 题</button>';
      }).join('');
      var drawn = MC.fig ? MC.fig.matching(t.uid, 'qtype_refs').filter(function (f) {
        return (f.kp_refs || []).indexOf(uid) < 0 && (f.skill_refs || []).indexOf(uid) < 0;
      }) : [];
      return '<div class="dd-def" style="margin:0 0 10px"><b>' + C.mathHtml(t.name) + '</b>' +
        '<div>' + C.mathHtml(t.recognition || '') + '</div>' +
        figureHtml(drawn) +
        '<div class="btn-row" style="margin-top:6px">' + links + '</div></div>';
    }).join('');
  }

  function renderDetail(n, secData, itemsData, exData) {
    /* 直接邻居一列（先得会 / 学完接着共用）：明面列直接邻居，更远的多跳收进折叠 */
    function col(title, direct, all, emptyText, dirWord, mark) {
      var more = all.length > direct.length
        ? '<details class="dd-fold dd-more"><summary>' + dirWord + ' ' + (all.length - direct.length) + ' 个' +
          mark + '</summary>' + all.filter(function (x) {
            return direct.every(function (d) { return d.id !== x.n.id; });
          }).map(function (x) {
            return '<button type="button" class="rel-btn" data-pick="' + C.esc(x.n.id) + '">' +
              '<span>' + C.mathHtml(nodeName(x.n)) + '</span><i>' + x.d + ' 步</i></button>';
          }).join('') + '</details>'
        : '';
      return '<div class="dd-col"><h4>' + title + '<em>直接 ' + direct.length + ' · 全部 ' + all.length + '</em></h4>' +
        (direct.length ? direct.map(function (x) { return relBtn(x); }).join('') : '<div class="none">' + emptyText + '</div>') +
        more + '</div>';
    }

    var out = [];
    var head = '<div class="dd-h"><span class="dd-kind' +
      (n.kind === 'skill' ? ' k-skill' : (n.kind === 'misconception' ? ' k-mis' : (n.kind === 'thought' ? ' k-th' : ''))) + '">' +
      C.esc(KIND_CN[n.kind] || '节点') + '</span><h2>' + C.mathHtml(n.title) + '</h2></div>';

    var pills = [];
    if (secOf(n)) pills.push('<span class="pill">' + secOf(n) + '</span>');
    if (n.kind === 'skill') {
      pills.push('<span class="pill warn">' + C.esc(TIER_CN[n.tier || 'core'] || n.tier) + '</span>');
      if (nodes_of_skill_count(n.id)) pills.push('<span class="pill">用在 ' + nodes_of_skill_count(n.id) + ' 个知识点</span>');
    }
    if (n.kind === 'thought') {
      pills.push('<span class="pill">' + C.esc(n.level === 'family' ? '方法族' : '上位思想') + '</span>');
      var tk = thoughtSkills(n.id);
      if (tk.length) pills.push('<span class="pill">归了 ' + tk.length + ' 条方法</span>');
    }
    var gotQ = n.kind === 'knowledge_point' ? itemsFor(itemsData, n.id) : null;
    if (gotQ && gotQ.list.length) {
      pills.push('<span class="pill ok">' + (gotQ.exact ? '这一点 ' : '本节 ') + gotQ.list.length + ' 道题</span>');
    }

    // 知识点正文：从节数据片里取出这一条
    var kp = null, sks = [], mcs = [];
    if (secData) {
      kp = (secData.kps || []).filter(function (x) { return x.uid === n.id; })[0] || null;
      sks = secData.skills || [];
      mcs = secData.mcs || [];
    }
    if (n.kind === 'knowledge_point' && kp) {
      if (kp.kp_type) pills.push('<span class="pill">' + C.esc(KPT_CN[kp.kp_type] || kp.kp_type) + '</span>');
      if (kp.textbook && kp.textbook.page) pills.push('<span class="pill">课本第 ' + C.esc(kp.textbook.page) + ' 页</span>');
      if (kp.aliases && kp.aliases.length) pills.push('<span class="pill">也叫 ' + C.esc(kp.aliases.join('、')) + '</span>');
    }
    out.push('<div class="dd-pills">' + pills.join('') + '</div>');

    /* 四计数：前置 / 后续 / 方法 / 练习题。第四格与下面「课本例题」不是一回事：
       那是课本上的例题，这里是映射到本节的练习题，所以统一叫「练习题」。 */
    if (n.kind === 'knowledge_point') {
      out.push(countJumps(n, (gotQ && gotQ.list) || [], true));
    }

    if (n.kind === 'knowledge_point') {
      /* spec 5 的七段，顺序固定：这句话是什么 / 课标怎么要求 / 先得会学完接着 /
         思想和做法 / 素养（有才渲染）/ 课本在哪 / 题。缺数据写该段空态，不把下一段提上来冒充。 */
      var t = kp ? C.kpText(kp) : C.kpText(n);
      if (t.def) {
        out.push(block(t.fromTitle ? '这句话是什么（定义取自标题里的释义）' : '这句话是什么', '',
          '<div class="dd-def">' + C.mathHtml(t.def) + '</div>'));
      } else {
        out.push(block('这句话是什么', '', '<div class="dd-empty">还没有定义。</div>'));
      }
      var figKp = figureBlock(n.id);
      if (figKp) out.push(block('图示', '按关系重画', figKp));
      var bds = (kp && kp.boundaries) || [];
      out.push(block('不能把它用成什么', bds.length ? '' : '边界还没写',
        bds.length ? ulOf(bds)
          : '<div class="dd-empty">这一条还没写边界——说清它不覆盖什么，比多写一句定义有用。</div>'));
      if (kp && kp.conditions && kp.conditions.length) out.push(block('成立条件', '', ulOf(kp.conditions)));

      /* 课标：原句 + 条目号。我们自己写的 definition 是 ai_draft，课标原句不是，可信度差要看得见。 */
      var stds = (kp && kp.standards) || [];
      if (stds.length) {
        out.push(block('课标怎么要求', stds.length + ' 条 · 原句引用', stds.map(function (s) {
          return '<div style="margin:0 0 8px"><span class="pill">' + C.esc(s.code) + '</span>' +
            '<div class="dd-def" style="margin-top:4px">' + C.mathHtml(s.text) + '</div></div>';
        }).join('') +
          '<div style="font-size:var(--fs-sm);color:var(--ink-soft);margin-top:2px;line-height:var(--lh-read)">条目号对应《义务教育数学课程标准（2022 年版）》第四学段「内容要求」。条文是公开转写、未与教育部 PDF 逐页核对，按条目标注引用。</div>'));
      } else if (kp && kp.std_gap) {
        out.push(block('课标怎么要求', '这一节没有对应条目', '<div style="color:var(--ink-soft);font-size:var(--fs-sm)">' + C.esc(kp.std_gap) + '</div>'));
      } else {
        out.push(block('课标怎么要求', '', '<div class="dd-empty">这一节还没挂课标条目。</div>'));
      }

      /* 第 3 段：直接邻居列在明面，更远的多跳收进折叠——一眼能看清这一步要先会什么。 */
      out.push(block('先得会，学完接着', '箭头从先学的指向后学的',
        '<div class="dd-hint"><a href="#/rel/' + encodeURIComponent(n.id) + '">看它前后的知识点</a>' +
        '（左边先得会、右边学完接着，各边超 8 个折叠）</div>' +
        '<div class="dd-rel">' +
        col('先得会', prevOf(n.id), reachList(n.id, true), '图里没有更早的点', '再往前', '（更早学的）') +
        col('学完接着', nextOf(n.id), reachList(n.id, false), '图里没有更后的点', '再往后', '（以后要学的）') +
        '</div>'));

      /* 横向关联：先修边回答「能不能学」，这两类回答「学的时候能挂到谁身上」。
         why 全来自 content/framework/analogies.json，不是临时编的说明。 */
      var anas = (kp && kp.analogs) || [];
      (function () {
        function lat(title, arr, hint) {
          if (!arr.length) return;
          out.push(block(title, arr.length + ' 个', arr.map(function (a) {
            return '<div style="margin:0 0 9px">' +
              '<button type="button" class="rel-btn" data-pick="' + C.esc(a.uid) + '">' +
              '<span>' + C.mathHtml(a.name) + '</span></button>' +
              '<div class="dd-def" style="margin-top:4px">' + C.mathHtml(a.why || '') + '</div></div>';
          }).join('') +
            (hint ? '<div style="font-size:var(--fs-sm);color:var(--ink-soft);line-height:var(--lh-read)">' + hint + '</div>' : '')));
        }
        lat('可以类比', anas.filter(function (a) { return a.kind === 'equivalent_to'; }),
          '结构相同的对象：把一处研究透，另一处可以照着推。类比出的是猜想，回到本处仍要验证。');
        lat('容易混淆', anas.filter(function (a) { return a.kind === 'contrast_with'; }),
          '名字或形式像，条件和结论不同——这两处要放在一起对着记。');
      })();

      /* 第 4 段：思想（沿方法聚合而来）+ 挂在这个点上的方法（desc 与边界先给，步骤折叠）。 */
      var my = skillsOf(n.id).map(function (x) {
        return sks.filter(function (m) { return m.uid === x.id; })[0];
      }).filter(Boolean);
      var ths = (kp && kp.thoughts) || [];
      if (my.length || ths.length) {
        var b4 = '';
        if (ths.length) {
          b4 += '<div style="display:flex;flex-wrap:wrap;gap:6px;margin:0 0 6px">' + ths.map(function (x) {
            return '<button type="button" class="rel-btn" style="width:auto;margin:0" data-go="#/kp/' +
              C.esc(x.uid) + '">' + C.mathHtml(x.name) + '</button>';
          }).join('') + '</div>' +
            '<div style="font-size:var(--fs-sm);color:var(--ink-soft);line-height:var(--lh-read);margin:0 0 8px">这个点的方法都归在上面这些思想与方法族下，点开看那一层。</div>';
        }
        if (my.length) b4 += my.map(skillFold).join('');
        out.push(block('思想和做法', my.length ? my.length + ' 条方法，点开看步骤' : '', b4));
      } else if (sks.length) {
        out.push(block('思想和做法', '', '<div class="dd-empty">这一节有 ' + sks.length + ' 条方法，但还没连到这个点。</div>'));
      } else {
        out.push(block('思想和做法', '', '<div class="dd-empty">这个点还没挂方法。</div>'));
      }
      var qt = qtypeCards(n.id);
      if (qt) out.push(block('常见题型', '未教研复核', qt));

      var objs = (kp && (kp.objectives || []).map(function (o) { return o.text || o; })) || [];
      if (objs.length) out.push(block('要能做到', '', ulOf(objs)));

      var mm = mcsOf(n.id).map(function (m) {
        return mcs.filter(function (x) { return x.uid === m.id; })[0];
      }).filter(Boolean);
      if (mm.length) out.push(block('常踩的坑', mm.length + ' 种', mm.map(mcFold).join('')));

      /* 第 5 段素养：两跳派生（方法 → 思想 → 素养）。没有方法或方法没归思想的点不渲染，
         不摆六个空标签。文案写明「推出来的」，不冒充课标认定。 */
      var stdCps = cpstdOf(n.id);
      if (stdCps.length) {
        out.push(block('课标条目对到哪些素养', stdCps.length + ' 项', stdCps.map(function (id) {
          var cp = byId[id];
          return '<div class="dd-cp"><b>' + C.esc(cp ? cp.title : id) + '</b>' +
            '<span class="dd-cp-n">' + (cp && cp.code ? C.esc(cp.code) : '') + '</span></div>';
        }).join('') +
          '<div class="dd-empty">按它挂的那几条课标要求的「内容领域 + 原文动词」初判出来的，条目 code 见上一段；这是初判，不是教研逐条认定。</div>'));
      }
      var cps = compsOf(n.id);
      if (cps.length) {
        out.push(block('练到哪些素养', cps.length + ' 项', cps.slice(0, 3).map(function (x) {
          return '<div class="dd-cp"><b>' + C.esc(x.cp.title) + '</b>' +
            '<span class="dd-cp-n">' + x.n + ' 条方法</span>' +
            '<div class="dd-cp-via">经 ' + C.esc(Object.keys(x.ths).join('、')) + '</div></div>';
        }).join('') +
          '<div class="dd-empty">按「它的方法归到哪条思想」推出来的，不是课标对这个点的认定。</div>'));
      }

      /* 第 6 段：只标页码，不打开 PDF（原页阅读器已被判定为次要）。 */
      var pg = kp && kp.textbook && kp.textbook.page;
      out.push(block('课本在哪', '', pg
        ? '<div style="font-size:var(--fs-sm)">课本第 ' + C.esc(String(pg)) + ' 页</div>'
        : '<div class="dd-empty">页码还没标。</div>'));

      /* 第 7 段：例题（教材原题）与题，都写在「这一节」还是「这一点」上。 */
      var fromHere = returnTo(n.id);
      var ex = exCards(exData, n.id, n.vol, n.sec, fromHere);
      if (ex.html) out.push(block('课本例题', ex.hint, ex.html));
      var qs = qCards(itemsData, n.id, n.vol, n.sec, fromHere);
      if (qs.html) out.push(block(qs.title, qs.hint, qs.html));

      out.push('<div class="btn-row">' +
        '<button class="btn btn-primary" data-pick="' + C.esc(n.id) + '">在图上居中</button>' +
        '<button class="btn btn-secondary" data-go="' + C.esc(practiceHref(n.vol, n.sec, { from: fromHere })) + '">练这一节</button>' +
        '<button class="btn btn-secondary" data-go="#/sec/' + C.esc(n.vol) + '/' + C.esc(n.sec) + '">去这一节</button>' +
        '</div>');
    }

    if (n.kind === 'section') {
      var sqPrev = G.edges.filter(function (e) { return e.r === 'sequence' && e.d === n.id; }).map(function (e) { return byId[e.s]; }).filter(Boolean);
      var sqNext = G.edges.filter(function (e) { return e.r === 'sequence' && e.s === n.id; }).map(function (e) { return byId[e.d]; }).filter(Boolean);
      if (sqPrev.length || sqNext.length) {
        out.push(block('教材顺序', '上一节 / 下一节，和「必须先学什么」不是一回事',
          (sqPrev.length ? '<div class="dd-col"><h4>上一节</h4>' + sqPrev.map(function (x) { return relBtn(x); }).join('') + '</div>' : '') +
          (sqNext.length ? '<div class="dd-col"><h4>下一节</h4>' + sqNext.map(function (x) { return relBtn(x); }).join('') + '</div>' : '')));
      }
      var kids = G.nodes.filter(function (x) { return x.kind === 'knowledge_point' && x.vol === n.vol && String(x.sec) === String(n.sec); });
      out.push(block('这一节的知识点', kids.length + ' 个，点一个看讲解',
        kids.map(function (x) { return relBtn(x, x.qn ? x.qn + ' 题' : ''); }).join('')));
      if (sks.length) out.push(block('这一节的方法', sks.length + ' 条', sks.map(skillFold).join('')));
      if (mcs.length) out.push(block('这一节的错因', mcs.length + ' 种', mcs.map(mcFold).join('')));
      out.push('<div class="btn-row">' +
        '<button class="btn btn-primary" data-go="#/sec/' + C.esc(n.vol) + '/' + C.esc(n.sec) + '">进这一节</button>' +
        '<button class="btn btn-secondary" data-go="' + C.esc(practiceHref(n.vol, n.sec, { from: returnTo(n.id) })) + '">练这一节</button>' +
        '</div>');
    }

    if (n.kind === 'skill') {
      var sk = sks.filter(function (m) { return m.uid === n.id; })[0];
      /* 一句话说清：参考产品的每条方法下面都有一句定义式描述，
         光有步骤孩子不知道该在什么时候想起它 */
      if (sk && sk.desc) out.push(block('一句话说清', '', '<div class="dd-def">' + C.mathHtml(sk.desc) + '</div>'));
      var figSk = figureBlock(n.id);
      if (figSk) out.push(block('图示', '按关系重画', figSk));
      if (sk) out.push(block('怎么做', (sk.steps || []).length + ' 步', skillFold(sk).replace('<details class="dd-fold"><summary>', '<details class="dd-fold" open><summary>')));
      /* 边界声明：只覆盖哪几个知识点、哪种情况会失效。不写这句，孩子会当成万能解法 */
      if (sk && (sk.boundaries || []).length) out.push(block('它管不到的地方', '边界声明', ulOf(sk.boundaries)));
      /* 方法之间的先后：教材不写，也没有教研签字。原来试过拿「点级先修一跳」反推，
         2026-10-28 抽检 40 条只有 20 条站得住（收紧后重抽 11/40），整批废掉，改成逐条起草。 */
      var sp = prevOf(n.id), sn = nextOf(n.id);
      if (sp.length || sn.length) {
        out.push(block('先练哪个', sp.length + ' 条在前，' + sn.length + ' 条在后',
          '<div class="dd-def">教材不写方法之间的先后。这部分按「要做这一步得先会什么」逐条起草，还没有教研复核，当线索用。</div>' +
          (sp.length ? '<div class="dd-hint">先练：</div>' + sp.map(function (x) { return relBtn(x); }).join('') : '') +
          (sn.length ? '<div class="dd-hint">之后再练：</div>' + sn.map(function (x) { return relBtn(x); }).join('') : '')));
      }
      /* 用到它的题：只有做过点级映射的题才进得来，所以这里列的是「用过」，不是「可能用到」。 */
      if (sk && (sk.qs || []).length) {
        var qn = sk.qn || (sk.qs || []).length;
        out.push(block('用它做过的题', qn + ' 道' + (qn > (sk.qs || []).length ? '，先列 ' + (sk.qs || []).length + ' 道' : ''),
          '<div class="dd-qs">' + (sk.qs || []).map(function (q) {
            return '<a class="dd-q" href="' + practiceHref(volOfQ(q, n), secOfQ(q, n), { q: q.id, from: returnTo(n.id) }) + '">' +
              qLabel(q) + '</a>';
          }).join('') + '</div>'));
      } else if (sk) {
        /* 空着要说清是「还没标」，不是「没考过」：题到方法的映射目前只做到第 12 章 */
        out.push(block('用它做过的题', '还没有标到方法的题',
          '<div class="dd-def">题到方法的映射目前只做到第 12 章，其他册还没标。这里空着，不代表这个方法没被考过。</div>'));
      }
      var thId = thMain(n.id), thNode = thId ? byId[thId] : null;
      if (thNode) {
        var upTh = thNode.parent ? byId[thNode.parent] : null;
        out.push(block('它体现的思想', '方法 → 思想，这一步最容易被跳过',
          relBtn(thNode, thNode.level === 'family' ? '方法族' : '思想') + (upTh ? relBtn(upTh, '上位思想') : '')));
      }
      var under = kpsUnder(n.id);
      if (under.length) {
        var byVol = {}, vorder = [];
        under.forEach(function (x) {
          var v = x.vol || '?';
          if (!byVol[v]) { byVol[v] = []; vorder.push(v); }
          byVol[v].push(x);
        });
        var dist = vorder.map(function (v) { return volLabel(v) + ' ' + byVol[v].length; }).join(' · ');
        out.push(block('用在哪里', under.length + ' 个知识点（' + dist + '）', under.map(function (x) { return relBtn(x, x.vol ? volLabel(x.vol) : ''); }).join('')));
      }
      /* 同一节里还有别的方法：孩子常把「约分」和「通分」混着用，
         把同节其它方法列在同一屏，能直接看出「这两条不是一回事」 */
      var sib = sks.filter(function (m) { return m.uid !== n.id; });
      if (sib.length) out.push(block('同一节的其他方法', sib.length + ' 条，点开看步骤', sib.map(skillFold).join('')));
      var underIds = {};
      kpsUnder(n.id).forEach(function (k) { underIds[k.id] = 1; });
      var myMc = mcs.filter(function (m) {
        return G.edges.some(function (e) {
          return e.r === 'misconception_of' && e.s === m.uid && underIds[e.d];
        });
      });
      if (myMc.length) out.push(block('用这个方法时容易犯的错', myMc.length + ' 种', myMc.map(mcFold).join('')));
      out.push('<div class="btn-row">' +
        '<button class="btn btn-primary" data-pick="' + C.esc(n.id) + '">在图上居中</button>' +
        '<button class="btn btn-secondary" data-go="#/sec/' + C.esc(n.vol) + '/' + C.esc(n.sec) + '">去这一节</button>' +
        '</div>');
    }

    if (n.kind === 'thought') {
      if (n.desc) out.push(block('这个思想说的是什么', '', '<div class="dd-def">' + C.mathHtml(n.desc) + '</div>'));
      out.push(block('它不管什么', '边界声明', ulOf(n.boundaries)));
      var up = n.parent ? byId[n.parent] : null;
      if (up) out.push(block('上一级', '', relBtn(up, up.level === 'family' ? '方法族' : '思想')));
      var fams = G.nodes.filter(function (x) { return x.kind === 'thought' && x.parent === n.id; });
      if (fams.length) out.push(block('它下面的方法族', fams.length + ' 个', fams.map(function (f) { return relBtn(f); }).join('')));
      var mine = thoughtMethods(n.id);
      if (mine.length) {
        /* 思想的价值就在「跨册反复出现」：先给一册一行的方法数与知识点数，
           再按册分组列方法。217 条方法平铺成一行看不清，分组后才看得出它在哪一册最重 */
        var byVol = {}, vorder = [];
        mine.forEach(function (x) {
          var v = x.vol || '?';
          if (!byVol[v]) { byVol[v] = []; vorder.push(v); }
          byVol[v].push(x);
        });
        var seenK = {}, kpsHit = [];
        mine.forEach(function (x) {
          kpsUnder(x.id).forEach(function (k) { if (!seenK[k.id]) { seenK[k.id] = 1; kpsHit.push(k); } });
        });
        var kpsVol = {};
        kpsHit.forEach(function (k) { var v = k.vol || '?'; kpsVol[v] = (kpsVol[v] || 0) + 1; });
        var recap = vorder.map(function (v) {
          return volLabel(v) + ' ' + byVol[v].length + ' 条方法 / ' + (kpsVol[v] || 0) + ' 个知识点';
        }).join(' · ');
        out.push(block('它在几册里反复出现',
          vorder.length + ' 册 · ' + mine.length + ' 条方法 · ' + kpsHit.length + ' 个知识点', recap));
        var grp = vorder.map(function (v) {
          return '<div class="dd-grp"><div class="dd-grp-t">' + C.esc(volLabel(v)) + ' · ' + byVol[v].length + ' 条</div>' +
            byVol[v].map(function (x) { return relBtn(x); }).join('') + '</div>';
        }).join('');
        out.push(block('按册看这些方法', '含它下面各族的方法，点一个看步骤与边界', grp));
      }
      out.push('<div class="btn-row"><button class="btn btn-primary" data-pick="' + C.esc(n.id) + '">在图上居中</button>' +
        '<button class="btn btn-secondary" data-view="thought">只看思想</button></div>');
    }

    if (n.kind === 'misconception') {
      var mc = mcs.filter(function (m) { return m.uid === n.id; })[0];
      var sibMc = mcs.filter(function (m) { return m.uid !== n.id; });
      if (mc) out.push(block('这种错法', '', mcFold(mc).replace('<details class="dd-fold"><summary>', '<details class="dd-fold" open><summary>')));
      var hurt = kpsHurt(n.id);
      if (hurt.length) out.push(block('会绊住', hurt.length + ' 个知识点', hurt.map(function (x) { return relBtn(x); }).join('')));
      if (sibMc.length) out.push(block('这一节的其他错因', sibMc.length + ' 种', sibMc.map(mcFold).join('')));
      out.push('<div class="btn-row">' +
        '<button class="btn btn-primary" data-pick="' + C.esc(n.id) + '">在图上居中</button>' +
        '<button class="btn btn-secondary" data-go="#/sec/' + C.esc(n.vol) + '/' + C.esc(n.sec) + '">去这一节</button>' +
        '</div>');
    }

    return '<div class="map-detail-card">' + head + out.join('') + '</div>';
  }

  function nodes_of_skill_count(sid) { return kpsUnder(sid).length; }

  function openNode(ele) {
    var d = ele.data();
    /* On the field, a click floats the note and draws where this point grows from. */
    if (state.view === 'mind') {
      if (!byId[d.id]) return;
      state.focus = d.id;
      state.local = null;
      state.kind = 'all';
      focusNode(d.id);
      focusAround(d.id);
      showDetail(d.id);
      return;
    }
    focusNode(d.id);
    showDetail(d.id);
  }

  function pick(id) {
    if (!cy) return false;
    var el = cy.getElementById(id);
    if (!el || !el.length) return false;
    openNode(el);
    return true;
  }

  /* 切视角：分段按钮与「搜索命中后跳过去」共用一套，
     否则两处逻辑会漂移（比如一处记得降层、一处忘了） */
  function switchView(v) {
    if (!v || !VIEW_CN[v]) return false;
    if (v === state.view) return false;
    state.view = v;
    /* 骨架一屏放得下（一章一个岛）；其余视角一次全铺会到 270 个点，
       强制降到「邻域」，看得清比看得全重要。 */
    state.depth = (v === 'skeleton') ? 'all' : 'nb';
    if (v !== 'skeleton' && !state.focus) state.focus = defaultFocus();
    fillControls();
    paintSub();
    rebuild();
    return true;
  }

  /* 搜索：先找当前这张图；图上没有就翻全库，命中后切到对应视角再定位。
     只搜当前图（旧行为）等于「想不到就搜不到」——方法、思想、错因根本不在这一屏 */
  var KIND_VIEW = { section: 'skeleton', knowledge_point: 'kp', skill: 'skill', misconception: 'misconception', thought: 'thought' };
  var si = 0;
  function normQ(s) { return String(s || '').replace(/\s+/g, ''); }
  /* ---------- 搜索 ----------
     三件事：进别名（孩子记的是「将军饮马」，不是我们写的那句描述）、
     出结果列表（只给「回车逐个看」等于让人盲试）、输入时别乱跳图。 */

  var KIND_ORD = { thought: 5, knowledge_point: 4, skill: 3, misconception: 2, section: 1, chapter: 0, volume: 0 };

  function whereOf(n) {
    var parts = [];
    if (n.vol) parts.push(volLabel(n.vol));
    if (n.ch !== null && n.ch !== undefined && n.ch !== '') parts.push('第 ' + n.ch + ' 章');
    var sid = n.sec ? secIdOf(n) : '';
    var sn = sid ? byId[sid] : null;
    if (sn && sn.title) parts.push(sn.title);
    return parts.join(' · ');
  }

  function searchIndex(word) {
    var out = [];
    if (!G) return out;
    G.nodes.forEach(function (n) {
      var v = KIND_VIEW[n.kind];
      if (!v) return;
      var title = normQ(C.tidy(n.title || ''));
      var sch = n.sch ? normQ(C.tidy(n.sch)) : '';
      var sc = 0;
      if (title === word) sc = 4;
      else if (title.indexOf(word) === 0) sc = 3;
      else if (title.indexOf(word) >= 0) sc = 2;
      else if (sch && sch.indexOf(word) >= 0) sc = 1;
      if (!sc) return;
      out.push({ id: n.id, title: n.title || '', kind: n.kind, view: v, score: sc, where: whereOf(n) });
    });
    out.sort(function (a, b) {
      return (b.score - a.score) ||
        ((KIND_ORD[b.kind] || 0) - (KIND_ORD[a.kind] || 0)) ||
        (a.id < b.id ? -1 : 1);
    });
    return out.slice(0, 40);
  }

  function paintHits(word) {
    if (!qResEl) return;
    var w = normQ(word);
    if (!w) { qResEl.hidden = true; qResEl.innerHTML = ''; return; }
    var hits = searchIndex(w);
    if (!hits.length) {
      qResEl.innerHTML = '<div class="q-none">全库没有「' + C.esc(word) + '」</div>';
      qResEl.hidden = false;
      return;
    }
    var onScreen = 0;
    if (cy) {
      hits.forEach(function (h) { if (cy.getElementById(h.id).length) onScreen++; });
    }
    qResEl.innerHTML = hits.slice(0, 8).map(function (h) {
      return '<button type="button" class="q-hit" data-nid="' + C.esc(h.id) + '">' +
        '<span class="q-k">' + C.esc(KIND_CN[h.kind] || '') + '</span>' +
        '<span class="q-t">' + C.mathHtml(C.clipMath(h.title || '', 22)) + '</span>' +
        '<span class="q-w">' + C.esc(h.where) + '</span></button>';
    }).join('') +
      '<div class="q-sum">共 ' + hits.length + ' 个' + (onScreen ? '（这一屏 ' + onScreen + ' 个）' : '') +
      (hits.length > 8 ? '，先列前 8 个' : '') + '</div>';
    qResEl.hidden = false;
  }

  function hideHits() { if (qResEl) { qResEl.hidden = true; } }

  /* 跳到某个节点：已经在屏上就只定位；不在就先把册/章/视图挪过去再重建。
     邻域裁剪以焦点节为中心，不挪就会切过去一个「什么都没有」的视图。 */
  function goTo(hit) {
    if (!hit || !byId[hit.id]) return;
    /* Stay on the total graph: switch the type so the clicked kind is actually drawn. */
    if (state.view === 'mind') {
      hideHits();
      var already = state.kind === 'all' && !state.local && cy && cy.getElementById(hit.id).length;
      state.lens = 'web';
      state.kind = 'all';
      state.local = null;
      state.focus = hit.id;
      /* 焦点变了版面就得跟着换：十字档（#map-cross）是「焦点是谁」的产物，
         这里不主动同步，搜出来的点还停在总图画布上（实测点搜索结果后 cross=false）。 */
      if (already) {
        focusAround(hit.id);
        showDetail(hit.id);
        syncCross();
        return;
      }
      fillControls();
      rebuild();
      setTimeout(function () { focusAround(hit.id); showDetail(hit.id); syncCross(); }, 80);
      return;
    }
    hideHits();
    var el = cy ? cy.getElementById(hit.id) : null;
    if (el && el.length && VIEW_CN[hit.view] === VIEW_CN[state.view]) {
      focusNode(hit.id);
      centerOn(hit.id, 1.2);
      showDetail(hit.id);
      return;
    }
    var node = byId[hit.id];
    if (node.vol && state.vol !== 'all' && node.vol !== state.vol) { state.vol = node.vol; state.ch = 'all'; }
    if (node.ch && state.ch !== 'all' && String(node.ch) !== String(state.ch)) state.ch = 'all';
    if (node.sec) state.focus = secIdOf(node);
    state.view = hit.view;
    state.depth = (hit.view === 'skeleton') ? 'all' : 'nb';
    if (hit.view !== 'skeleton' && !state.focus) state.focus = defaultFocus();
    fillControls();
    paintSub();
    rebuild();
    var want = hit.id;
    setTimeout(function () {
      if (!cy) return;
      var e2 = cy.getElementById(want);
      if (!e2 || !e2.length) return;
      focusNode(want);
      centerOn(want, 1.2);
      showDetail(want);
    }, 60);
  }

  function searchGo(word) {
    word = normQ(word);
    if (!cy) return;
    if (!word) { if (qTipEl) qTipEl.textContent = ''; clearMarks(); return; }
    var hits = searchIndex(word);
    if (!hits.length) { if (qTipEl) qTipEl.textContent = '全库没有「' + word + '」'; return; }
    var on = hits.filter(function (h) { return cy.getElementById(h.id).length; });
    var pool = on.length ? on : hits;
    var pick = pool[si++ % pool.length];
    if (qTipEl) qTipEl.textContent = '「' + word + '」共 ' + hits.length + ' 个，回车逐个看';
    goTo(pick);
  }

  /* ---------- 外壳 ---------- */

  /* ---------- 悬停提示 ---------- */

  var tipEl = null;
  var calloutEl = null;
  var calloutQueued = false;
  var qResEl = null;
  var TIP_SRC = { m: '人工判定', r: '规则推断', sk: '方法挂点推断' };

  /* Drop the name chips drawn over a focused neighborhood. */
  function clearCallouts() {
    if (!calloutEl) return;
    calloutEl.hidden = true;
    calloutEl.innerHTML = '';
    if (hintEl) hintEl.hidden = false;
  }

  /* Coalesce chip redraws while dots are sliding. */
  function scheduleCallouts() {
    if (calloutQueued) return;
    calloutQueued = true;
    requestAnimationFrame(function () {
      calloutQueued = false;
      paintCallouts();
    });
  }

  /* 画布还没量出尺寸时不画。
     file:// 下数据先到、版面后成型，首帧里 #cy 的 clientWidth/clientHeight 还是空的，
     cytoscape 这时给的 width()/height() 是 NaN —— NaN 直接进了 <svg width> 与 <line x1>，
     浏览器控制台报一串 "Expected length, NaN"，线也画不出来。
     量不到就等下一帧（有上限，免得空转）；尺寸到位后 ResizeObserver 也会再叫一次。 */
  var sizeRetry = 0;
  function stageSize() {
    var w = calloutEl ? calloutEl.clientWidth : 0;
    var h = calloutEl ? calloutEl.clientHeight : 0;
    if (!(w >= 40) || !(h >= 40)) { w = cy ? cy.width() : 0; h = cy ? cy.height() : 0; }
    if (!(w >= 40) || !(h >= 40)) return null;
    return { w: Math.round(w), h: Math.round(h) };
  }
  function retryPaint() {
    if (sizeRetry >= 20) return;
    sizeRetry++;
    setTimeout(scheduleCallouts, 120);
  }

  /* 每个标签都要挨着自己的点：先把盒子放在点的旁边，再把互相压住的推开，
     最后谁飘太远就拽回来。以前只沿单一轴推 8px，chip 一多就叠成一竖列，
     而连线照旧从点拉到 chip 边缘，于是整屏都是长线。 */
  var CHIP_GAP = 16, CHIP_PULL = 128;
  function layoutChips(items, H, maxRight, topInset, obstacles) {
    var i, j, it, pad = 4, top = Math.max(pad, topInset || pad);
    /* 标签不许压在圆点上：量过一遍像素，430 宽里中心那个点的名字框正好盖住
       中心点本身，读者看到的是「一个框，不知道它在说哪个点」。所以把每个圆点
       当障碍矩形（按渲染尺寸外扩 8px）参与落位。 */
    var obs = obstacles || [];
    function dotHit(it4, l4, t4) {
      for (var q5 = 0; q5 < obs.length; q5++) {
        var o5 = obs[q5];
        if (!(l4 + it4.w + 2 <= o5.l || o5.l + o5.w + 2 <= l4 ||
              t4 + it4.h + 2 <= o5.t || o5.t + o5.h + 2 <= t4)) return true;
      }
      return false;
    }
    for (i = 0; i < items.length; i++) {
      it = items[i];
      /* 点贴着画布边缘时，偏好的那一侧根本放不下，硬放只能靠 clamp 塞回来，
         结果就是一条横跨半屏的线。先量四个方向还剩多少空间，放不下就换一边。 */
      var fit = {
        right: maxRight - it.x - CHIP_GAP - it.w,
        left: it.x - CHIP_GAP - it.w,
        top: it.y - CHIP_GAP - it.h,
        bottom: H - it.y - CHIP_GAP - it.h
      };
      if (!(fit[it.dir] >= 0)) {
        var best = it.dir;
        ['right', 'left', 'top', 'bottom'].forEach(function (dd) {
          if (fit[dd] > fit[best]) best = dd;
        });
        it.dir = best;
      }
      if (it.dir === 'right') { it.l = it.x + CHIP_GAP; it.t = it.y - it.h / 2; }
      else if (it.dir === 'left') { it.l = it.x - CHIP_GAP - it.w; it.t = it.y - it.h / 2; }
      else if (it.dir === 'top') { it.l = it.x - it.w / 2; it.t = it.y - CHIP_GAP - it.h; }
      else { it.l = it.x - it.w / 2; it.t = it.y + CHIP_GAP; }
    }
    /* 落位：每个标签在画布上的空闲格点里挑「离自己那个点最近」的一格。
       上一版沿射线一圈圈外退，窄屏夹边时一圈圈都被挤回来，11 个标签剩 4 对压着、
       还有一根 260px 的长引线；改成整片网格搜索，只要有空地就一定能落下来，
       而且落的一定是离点最近的那块空地。 */
    var placed = [];
    var STEP = 16;
    items.forEach(function (it) {
      var bestL = it.l, bestT = it.t, bestD = Infinity, found = false;
      for (var gl = pad; gl <= maxRight - it.w - pad; gl += STEP) {
        for (var gt = top; gt <= H - it.h - pad; gt += STEP) {
          var d2 = Math.abs(gl - it.l) + Math.abs(gt - it.t);
          if (found && d2 >= bestD) continue;
          var clash2 = false;
          for (var p3 = 0; p3 < placed.length; p3++) {
            var q3 = placed[p3];
            if (!(gl + it.w + 4 <= q3.l || q3.l + q3.w + 4 <= gl ||
                  gt + it.h + 4 <= q3.t || q3.t + q3.h + 4 <= gt)) { clash2 = true; break; }
          }
          if (clash2 || dotHit(it, gl, gt)) continue;
          bestD = d2; bestL = gl; bestT = gt; found = true;
        }
      }
      /* 一格空位都没有（画布比标签总面积还小）就退回自己点旁边，宁可压着也不甩远 */
      if (found) { it.l = bestL; it.t = bestT; }
      placed.push(it);
    });
    /* 逐个落位是贪心的：先落的占了好位置，最后那个被甩得很远（实测 288px 一根长线）。
       落完再两两换位——A 的格子给 B、B 的给 A，两人总路程变短且都不撞别人就换。 */
    function cartD(it3, l, t) { return Math.abs(l + it3.w / 2 - it3.x) + Math.abs(t + it3.h / 2 - it3.y); }
    function hits(it3, l, t, skip) {
      for (var k3 = 0; k3 < placed.length; k3++) {
        if (k3 === skip) continue;
        var q4 = placed[k3];
        if (!(l + it3.w + 4 <= q4.l || q4.l + q4.w + 4 <= l ||
              t + it3.h + 4 <= q4.t || q4.t + q4.h + 4 <= t)) return true;
      }
      if (dotHit(it3, l, t)) return true;
      return false;
    }
    for (var rd = 0; rd < 3; rd++) {
      var moved = false;
      for (var a3 = 0; a3 < placed.length; a3++) {
        for (var b3 = a3 + 1; b3 < placed.length; b3++) {
          var A = placed[a3], B = placed[b3];
          var now2 = cartD(A, A.l, A.t) + cartD(B, B.l, B.t);
          var sw2 = cartD(A, B.l, B.t) + cartD(B, A.l, A.t);
          if (sw2 >= now2 - 1) continue;
          if (hits(A, B.l, B.t, a3) || hits(B, A.l, A.t, b3)) continue;
          var tl2 = A.l, tt2 = A.t;
          A.l = B.l; A.t = B.t; B.l = tl2; B.t = tt2; moved = true;
        }
      }
      if (!moved) break;
    }
    /* 调排版时的抓手：位置、尺寸、离自己点多远，都在这里 */
    window.__chipDbg = items.map(function (it2) {
      return { w: Math.round(it2.w), h: Math.round(it2.h), x: Math.round(it2.x), y: Math.round(it2.y),
               l: Math.round(it2.l), t: Math.round(it2.t),
               d: Math.round(Math.abs(it2.l + it2.w / 2 - it2.x) + Math.abs(it2.t + it2.h / 2 - it2.y)) };
    });
    return items;
  }

  /* 画布顶上浮着搜索框和「收起」：标签要从它们下面开始，否则会钻到搜索框底下
     （430 宽实测被压住 90%）。量的是相对画布的位置，不是视口位置。 */
  function topInsetPx() {
    var base = calloutEl ? calloutEl.getBoundingClientRect().top : 0;
    var out = 0;
    /* #topbar 是 fixed 的，滚到图谱后它就压在画布顶上：不算进来的话
       最上面那个标签会被标题栏吃掉一半（430 宽实测「一次根式定义」只剩下半截）。 */
    ['#topbar', '.mapsearch', '#map-close'].forEach(function (sel) {
      var e = document.querySelector(sel);
      if (!e || e.hidden) return;
      var r = e.getBoundingClientRect();
      if (!r.height) return;
      /* 只算「真的在画布顶上」的那几个：窄屏的收起按钮是 fixed 定位在视口下方的，
         拿它当顶边会把整片标签压到画布底部（实测顶边被算成 412px）。 */
      if (r.top - base > 180) return;
      out = Math.max(out, r.bottom - base + 8);
    });
    return Math.max(4, Math.min(220, Math.round(out)));
  }

  /* Which way a chip should sit so it stays off its own dot. */
  function calloutSide(node, rp) {
    var out = node.data('out');
    if (out) return out;
    if (node.hasClass('mind-hot') || !cy) return 'bottom';
    var hot = cy.nodes('.mind-hot');
    if (!hot.length) return 'right';
    var hp = hot[0].renderedPosition();
    var ang = Math.atan2(rp.y - hp.y, rp.x - hp.x);
    if (ang > -0.85 && ang < 0.85) return 'right';
    if (ang >= 0.85 && ang < 2.35) return 'bottom';
    if (ang >= -2.35 && ang <= -0.85) return 'top';
    return 'left';
  }

  /* Point on a chip's edge closest to its dot, so the stem meets the box. */
  function stemPoint(left, top, bw, bh, nx, ny) {
    var cx = left + bw / 2, cy = top + bh / 2;
    var dx = nx - cx, dy = ny - cy;
    if (!dx && !dy) return { x: cx, y: cy };
    var sx = (bw / 2) / Math.abs(dx);
    var sy = (bh / 2) / Math.abs(dy);
    var s = Math.min(sx, sy);
    return { x: cx + dx * s, y: cy + dy * s };
  }

  /* One label per textbook section, sitting on that section's dots. */
  function paintSectionChips(chNode) {
    var dch = byId[chNode.id()];
    if (!dch) { clearCallouts(); return; }
    var groups = {};
    cy.nodes('.mind-on').forEach(function (node) {
      var d = byId[node.id()];
      if (!d || !d.sec) return;
      if (!groups[d.sec]) groups[d.sec] = [];
      groups[d.sec].push(node);
    });
    var keys = Object.keys(groups).sort(function (a, b) { return secNum(a) - secNum(b); });
    if (!keys.length) { clearCallouts(); return; }
    var sz = stageSize();
    if (!sz) { clearCallouts(); retryPaint(); return; }
    sizeRetry = 0;
    var W = sz.w, H = sz.h;
    /* 讲解卡又回到「浮在画布上」了（宽屏那套 grid 两列已撤掉），
       所以标签的右边界必须把卡让出来，否则名字整块被卡盖住。
       cardW 现量：卡在窄屏是 static 排在下面，量到 0 就等于不让位。 */
    var cardW = 0;
    try {
      if (detailEl && !detailEl.hidden && getComputedStyle(detailEl).position === 'absolute') {
        cardW = Math.round(detailEl.getBoundingClientRect().width) + 20;
      }
    } catch (eCW) { cardW = 0; }
    var maxRight = Math.max(160, W - 8 - cardW);
    calloutEl.hidden = false;
    calloutEl.innerHTML = '<svg class="call-lines" width="' + W + '" height="' + H + '"></svg>' +
      keys.map(function (sec) {
        var sid = 'S' + dch.vol + '-' + sec;
        return '<button type="button" class="call-chip call-sec" data-call="' + C.esc(sid) + '">' +
          C.esc(secPlain(dch.vol, sec)) + '</button>';
      }).join('');
    var btns = calloutEl.querySelectorAll('.call-chip');
    var chp = chNode.renderedPosition();
    var specs = [];
    keys.forEach(function (sec, i) {
      var node = cy.getElementById('S' + dch.vol + '-' + sec);
      if (!node || !node.length) return;
      var p = node.renderedPosition();
      if (!isFinite(p.x) || !isFinite(p.y)) return;
      var ang = Math.atan2(p.y - chp.y, p.x - chp.x);
      if (!isFinite(ang)) ang = (i / keys.length) * Math.PI * 2;
      specs.push({ sec: sec, id: node.id(), x: p.x, y: p.y, ang: ang });
    });
    specs.sort(function (a, b) { return a.ang - b.ang; });
    var byCall = {};
    for (var b = 0; b < btns.length; b++) byCall[btns[b].getAttribute('data-call')] = btns[b];
    var lines = [];
    specs.forEach(function (s) {
      var btn = byCall[s.id];
      if (!btn) return;
      var bw = btn.offsetWidth, bh = btn.offsetHeight;
      var ux = Math.cos(s.ang), uy = Math.sin(s.ang);
      var left = s.x + ux * 22 - (ux >= 0 ? 0 : bw);
      var top = s.y + uy * 22 - bh / 2;
      if (Math.abs(ux) < 0.4) left = s.x - bw / 2;
      var box = { l: left, t: top, w: bw, h: bh };
      for (var pass = 0; pass < 6; pass++) {
        var hit = null;
        for (var q = 0; q < specs.length; q++) {
          var prev = specs[q].box;
          if (!prev || prev === box) continue;
          if (box.l < prev.l + prev.w + 8 && box.l + box.w + 8 > prev.l && box.t < prev.t + prev.h + 6 && box.t + box.h + 6 > prev.t) {
            hit = prev;
            break;
          }
        }
        var cover = s.x + 12 > box.l && s.x - 12 < box.l + box.w && s.y + 12 > box.t && s.y - 12 < box.t + box.h;
        if (!hit && !cover) break;
        var tx = -uy, ty = ux;
        if (hit) {
          var mid = box.t + box.h / 2;
          var om = hit.t + hit.h / 2;
          if (mid < om) { tx = -tx; ty = -ty; }
        }
        box.l += tx * 12 + ux * 4;
        box.t += ty * 12 + uy * 4;
      }
      box.l = Math.max(4, Math.min(maxRight - box.w - 4, box.l));
      box.t = Math.max(4, Math.min(H - box.h - 4, box.t));
      s.box = box;
      btn.style.left = Math.round(box.l) + 'px';
      btn.style.top = Math.round(box.t) + 'px';
      var stem = stemPoint(box.l, box.t, box.w, box.h, s.x, s.y);
      var dx = stem.x - s.x, dy = stem.y - s.y;
      /* file:// 下首帧 renderedPosition 可能给 NaN（版面还没成型），stemPoint 随之吐 NaN，
         写进 <line x1> 就是浏览器控制台错误，冒烟判据 errs.length===0 会红。
         与下面 paintCallouts 里同款守卫：宁可少画一根引线，不许往 DOM 里塞 NaN。 */
      if (!isFinite(dx) || !isFinite(dy) || !isFinite(stem.x) || !isFinite(stem.y)) return;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var x1 = s.x + dx / len * 12, y1 = s.y + dy / len * 12;
      lines.push('<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) +
        '" x2="' + stem.x.toFixed(1) + '" y2="' + stem.y.toFixed(1) +
        '" stroke="#8a5a00" stroke-width="1.4"/>');
    });
    var svg = calloutEl.querySelector('svg');
    if (svg) svg.innerHTML = lines.join('');
  }

  /* Open one section of the focused chapter: list in the card, dots on the graph. */
  function openSection(sec) {
    var next = (state.openSec === sec) ? '' : sec;
    state.openSec = next;
    if (detailEl) {
      detailEl.querySelectorAll('.sec-body').forEach(function (el) { el.hidden = true; });
      detailEl.querySelectorAll('.sec-head').forEach(function (el) { el.classList.remove('on'); });
      if (next) {
        var head = null;
        detailEl.querySelectorAll('.sec-head').forEach(function (el) {
          if (!head && el.getAttribute('data-sec') === next) head = el;
        });
        if (head) {
          head.classList.add('on');
          var body = head.nextElementSibling;
          if (body && body.classList.contains('sec-body')) body.hidden = false;
          try { head.scrollIntoView({ block: 'nearest' }); } catch (eS) {}
        }
      }
    }
    if (cy) {
      cy.batch(function () {
        cy.nodes().removeClass('mind-secpick mind-secwait mind-secview mind-up mind-upedge');
        if (!next) return;
        cy.nodes('.mind-on').forEach(function (node) {
          var d = byId[node.id()];
          if (!d) return;
          node.addClass(String(d.sec) === String(next) ? 'mind-secpick' : 'mind-secwait');
        });
      });
    }
    scheduleCallouts();
  }

  /* Draw wrapped name chips for the focused dots, each with a line back to its glyph.
     A chapter shows one chip per section instead of a name on every dot. */
  function paintCallouts() {
    if (!calloutEl || !cy || state.view !== 'mind' || !state.zoomed || crossOn()) {
      clearCallouts();
      return;
    }
    var hotCh = cy.nodes('.mind-ch.mind-hot');
    if (hotCh.length) { paintSectionChips(hotCh[0]); return; }
    var nodes = [];
    cy.nodes('.mind-hot, .mind-on').forEach(function (n) {
      if (n.hasClass('mind-tight') || n.hasClass('mind-dim')) return;
      if (n.hasClass('mind-ch') && !n.hasClass('mind-up')) return;
      var up = n.hasClass('mind-up');
      if (!up && !n.hasClass('mind-kp') && !n.hasClass('mind-sk') && !n.hasClass('mind-th') && !n.hasClass('mind-sn')) return;
      /* 标签写全名：data('short') 是按倍率截的 3/6/8 字（clipN），
         「一元二次方程的根的判别式」在标签上只剩「一元二次方」，等于没写。
         宽度交给 .call-chip 的 max-width 与换行，排布由 layoutChips 避让。 */
      var name = up ? ('上一级 · ' + (n.data('label') || '')) : (n.data('title') || n.data('label') || '');
      if (!name) return;
      n.scratch('_chip', name);
      nodes.push(n);
    });
    nodes = nodes.filter(function (n) {
      var rp = n.renderedPosition();
      return rp && isFinite(rp.x) && isFinite(rp.y);
    });
    if (!nodes.length) { clearCallouts(); return; }
    var sz = stageSize();
    if (!sz) { clearCallouts(); retryPaint(); return; }
    sizeRetry = 0;
    var W = sz.w, H = sz.h;
    /* 讲解卡又回到「浮在画布上」了（宽屏那套 grid 两列已撤掉），
       所以标签的右边界必须把卡让出来，否则名字整块被卡盖住。
       cardW 现量：卡在窄屏是 static 排在下面，量到 0 就等于不让位。 */
    var cardW = 0;
    try {
      if (detailEl && !detailEl.hidden && getComputedStyle(detailEl).position === 'absolute') {
        cardW = Math.round(detailEl.getBoundingClientRect().width) + 20;
      }
    } catch (eCW) { cardW = 0; }
    var maxRight = Math.max(160, W - 8 - cardW);
    /* 右栏打开后画布只剩一半宽，视野还按旧宽度取着，标签点会落到画布外。
       先按当前宽度把这一圈重新框进来（每次聚焦只做一次，之后用户自己拖动不再抢）。 */
    var outside = false;
    for (var q0 = 0; q0 < nodes.length; q0++) {
      var rp1 = nodes[q0].renderedPosition();
      if (!(rp1.x > 12 && rp1.x < W - 12 && rp1.y > 12 && rp1.y < H - 12)) { outside = true; break; }
    }
    if (outside && !(state.chipFitTries >= 8)) {
      /* 聚焦时会先播一段 200ms 的取景动画，它比这一帧还晚落地；
         所以这里不能只框一次就放弃，要重试到点真的都在画布里（最多 8 次）。 */
      state.chipFitTries = (state.chipFitTries || 0) + 1;
      try { cy.fit(cy.collection(nodes), 40); } catch (e5) {}
      retryPaint();
      return;
    }

    /* 画布外的点不画标签：它只会在边缘挤出一个 box，再牵一条横跨半屏的线。 */
    nodes = nodes.filter(function (n) {
      var rp0 = n.renderedPosition();
      return rp0 && rp0.x > 12 && rp0.x < W - 12 && rp0.y > 12 && rp0.y < H - 12;
    });
    if (!nodes.length) { clearCallouts(); return; }
    /* 430 宽可用就 414px：11 个 124×63 的标签围着一个巴掌大的十字，数学上挤不下——
       最远那个被顶到 288px 外，引线长得像尾巴。窄屏只标最近的 7 个（焦点优先），
       其余的在右侧详情卡里逐条列着，那里有名有题量，读者不会漏。 */
    /* 标签是「点 + 一句话」，画布能放几张是有数的：1138×690 里 13 张 200×40 的框
       加上圆点障碍，数学上塞不下，最后几张被顶到 300px 外，引线像长尾巴
       （D1280 map-node 实测 304px、M430 map-local 477px）。
       所以按宽度定额：窄屏 7 张、桌面 10 张，焦点永远第一张，其余按离焦点的距离排。
       没标到的点在右边详情卡里逐条列着，名字和题量都在，不会漏。 */
    /* 430 宽只有 430×533 可用：7 张 150px 的框还是塞不下（实测 304px 的长尾巴）。
       窄屏收到 5 张，只为「最该看的那几句话」腾地方。 */
    var chipCap = W < 520 ? 5 : (W < 760 ? 7 : 10);
    if (nodes.length > chipCap) {
      var fk0 = null;
      nodes.forEach(function (n0) { if (n0.id() === state.focus) fk0 = n0; });
      var bz = fk0 ? fk0.renderedPosition() : { x: W / 2, y: H / 2 };
      nodes = nodes.slice().sort(function (a0, b0) {
        if (a0.id() === state.focus) return -1;
        if (b0.id() === state.focus) return 1;
        var pa0 = a0.renderedPosition(), pb0 = b0.renderedPosition();
        return (Math.abs(pa0.x - bz.x) + Math.abs(pa0.y - bz.y)) - (Math.abs(pb0.x - bz.x) + Math.abs(pb0.y - bz.y));
      }).slice(0, chipCap);
    }
    calloutEl.hidden = false;
    var chips = nodes.map(function (n) {
      var up = n.hasClass('mind-up');
      var kind = up ? 'up' : (n.hasClass('mind-sn') ? 'sec' : (n.hasClass('mind-sk') ? 'sk' : (n.hasClass('mind-th') ? 'th' : 'kp')));
      var hot = n.hasClass('mind-hot');
      var tierCls = '';
      if (n.hasClass('mind-sk') && n.data('tier') === 'extend') tierCls = ' call-ext';
      if (n.hasClass('mind-sk') && n.data('tier') === 'olympiad') tierCls = ' call-oly';
      var text = n.scratch('_chip') || n.data('short') || n.data('label') || '';
      /* 标签是 HTML，公式就按公式渲染——否则点开「求根公式」看到的是 x=[-b± √(b^2-4ac)]/(2a) 这种半截文本。 */
      /* 44 字一行在 1138 宽的画布里等于 200px 一个框，十张就铺满；
         一句话介绍用 26 字足够，剩下的在卡里读全文。 */
      var inner = text.indexOf('$') >= 0 ? C.mathHtml(C.clipMath(text, 26)) : C.esc(C.clip(text, 26));
      return '<button type="button" class="call-chip call-' + kind + tierCls + (hot ? ' is-hot' : '') +
        '" data-call="' + C.esc(n.id()) + '">' + inner + '</button>';
    });
    calloutEl.innerHTML = '<svg class="call-lines" width="' + W + '" height="' + H + '"></svg>' + chips.join('');
  /* 已经点开了，顶上的「点一下图上的点」就该让位：430 宽时它正压在这批标签上。 */
  if (hintEl) hintEl.hidden = true;
    var btns = calloutEl.querySelectorAll('.call-chip');
    var items = [];
    for (var i = 0; i < btns.length; i++) {
      var n = nodes[i];
      var rp = n.renderedPosition();
      var b = btns[i];
      /* file:// 下数据先到、版面后成型，首帧 cy 还没量出尺寸：renderedPosition 会是 NaN，
         写进 style.left 与 <line x1> 就是一堆 NaN 属性错误（冒烟靠它判红）。
         量不到位置的标签这一帧先不画，scheduleCallouts 下一帧会重来。 */
      if (!isFinite(rp.x) || !isFinite(rp.y) || !b.offsetWidth || !b.offsetHeight) {
        b.style.display = 'none';
        continue;
      }
      items.push({ btn: b, node: n, x: rp.x, y: rp.y, w: b.offsetWidth, h: b.offsetHeight, dir: calloutSide(n, rp) });
    }
    var dotObs = items.map(function (it0) {
      var rr = Math.max(15, ((it0.node.renderedOuterWidth ? it0.node.renderedOuterWidth() : 24) / 2) + 8);
      return { l: it0.x - rr, t: it0.y - rr, w: rr * 2, h: rr * 2 };
    });
    layoutChips(items, H, maxRight, topInsetPx(), dotObs);
    /* 标签里有公式，KaTeX 是异步上屏的：第一次量到的宽高偏小，随后标签变宽、
       把邻居压住（430 宽实测 4–6 对重叠）。所以画完再重画一遍，
       第二遍量到的是真尺寸。只在焦点没换过时重画一次，不会来回抖。 */
    if (!state.chipStable) { state.chipStable = 1; setTimeout(scheduleCallouts, 160); }
    var lines = [];
    items.forEach(function (it) {
      var n2 = it.node;
      it.btn.style.left = Math.round(it.l) + 'px';
      it.btn.style.top = Math.round(it.t) + 'px';
      var stem = stemPoint(it.l, it.t, it.w, it.h, it.x, it.y);
      var dx = stem.x - it.x, dy = stem.y - it.y;
      if (!isFinite(dx) || !isFinite(dy) || !isFinite(stem.x) || !isFinite(stem.y)) return;
      var len = Math.sqrt(dx * dx + dy * dy) || 1;
      var rad = 10;
      var x1 = it.x + dx / len * rad, y1 = it.y + dy / len * rad;
      var skStroke = n2.data('tier') === 'extend' ? '#e08a2e' : (n2.data('tier') === 'olympiad' ? '#7c3aed' : '#17a34a');
      var stroke = n2.hasClass('mind-up') ? '#c48a12' : (n2.hasClass('mind-sk') ? skStroke : (n2.hasClass('mind-th') ? '#e23d4a' : '#2f7cf6'));
      if (n2.hasClass('mind-hot')) stroke = '#14324f';
      lines.push('<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) +
        '" x2="' + stem.x.toFixed(1) + '" y2="' + stem.y.toFixed(1) +
        '" stroke="' + stroke + '" stroke-width="1.4"/>');
    });
    var svg = calloutEl.querySelector('svg');
    if (svg) svg.innerHTML = lines.join('');
  }

  function showTip(n) {
    if (!tipEl || !cy) return;
    if (state.view === 'mind' && state.zoomed) return;
    if (n.hasClass('island') || n.hasClass('island-label')) return;
    var id = n.data('id'), nid = byId[id];
    var cnt = {}, tot = 0;
    n.connectedEdges().forEach(function (e) {
      var src = e.data('x') || 'r';
      cnt[src] = (cnt[src] || 0) + 1;
      tot++;
    });
    var whys = Object.keys(TIP_SRC).filter(function (k) { return cnt[k]; })
      .map(function (k) { return TIP_SRC[k] + ' ' + cnt[k]; });
    var name = (nid && nid.title) ? C.tidy(nid.title) : (n.data('label') || '');
    var html = '<b>' + C.esc(C.clip(name, 26)) + '</b>';
    html += '<div class="map-tip-1">' + (tot ? (tot + ' 条关联' + (whys.length ? ' · ' + whys.join(' · ') : '')) : '还没有连线到这个点') + '</div>';
    html += '<div class="map-tip-2">' + (n.hasClass('island-label') ? '' : '点一下看讲解') + '</div>';
    tipEl.innerHTML = html;
    tipEl.hidden = false;
    var rp = n.renderedPosition();
    var w = tipEl.offsetWidth || 180;
    var left = Math.max(6, Math.min((cy.container() ? cy.container().clientWidth : 600) - w - 6, rp.x - w / 2));
    tipEl.style.left = Math.round(left) + 'px';
    tipEl.style.top = Math.max(4, Math.round(rp.y - (tipEl.offsetHeight || 44) - 14)) + 'px';
  }

  function hideTip() { if (tipEl) { tipEl.hidden = true; } }

  function frameHtml() {
    var depths = [['sec', '这一节'], ['nb', '邻域'], ['all', '整章']];
    return '<div class="mapwrap">' +
      '<div class="mapbar">' +
        '<div class="seg" id="map-seg"></div>' +
        '<div class="mapbar-2">' +
          '<select id="map-vol" class="mselect"></select>' +
          '<select id="map-ch" class="mselect"></select>' +
          '<div class="seg seg-sm" id="map-depth">' + depths.map(function (d) {
            return '<button type="button" data-depth="' + d[0] + '">' + d[1] + '</button>';
          }).join('') + '</div>' +
          '<button class="btn btn-icon" type="button" id="map-names" title="按节列出这一章的知识点" hidden>点名</button>' +
          '<button class="btn btn-icon" type="button" id="map-fit" title="缩到看得见全图">看全</button>' +
        '</div>' +
        '<div class="mapbar-3"><div class="seg seg-sm seg-cp" id="map-cps"></div></div>' +
      '</div>' +
      '<div class="thought-bar" id="thought-bar" hidden></div>' +
      '<div class="mapstage">' +
        '<div class="map-hint" id="map-hint"></div>' +
        '<div id="cy"></div>' +
        '<div class="map-side" id="map-side" hidden></div>' +
        '<div class="map-cross" id="map-cross" hidden></div>' +
        '<div class="map-callouts" id="map-callouts" hidden></div>' +
        '<div id="map-layers" hidden></div>' +
        '<div class="mapsearch">' +
          '<input id="map-q" type="search" placeholder="在图上找：分式、SSS、将军饮马…" autocomplete="off">' +
          '<span id="map-q-tip"></span>' +
          '<div class="map-q-res" id="map-q-res" hidden></div>' +
        '</div>' +
        '<div class="map-tip" id="map-tip" hidden></div>' +
        '<div class="map-key" id="map-key"><span><i class="mk mk-ch"></i>章节</span><span><i class="mk mk-sn"></i>小节</span><span><i class="mk mk-kp"></i>知识点</span><span><i class="mk mk-sk"></i>教材方法</span><span><i class="mk mk-ext"></i>培优</span><span><i class="mk mk-oly"></i>竞赛</span></div>' +
        '<div class="maplegend" id="map-legend"></div>' +
      '</div>' +
      '<p class="muted map-lead" id="map-lead"></p>' +
      '<p class="muted map-note" id="map-note"></p>' +
      '<div id="map-detail"></div>' +
      '<button type="button" class="map-close" id="map-close" hidden>收起</button>' +
      '<div id="read-sheet" class="read-sheet" hidden></div>' +
      '</div>';
  }

  function paintSub() {
    var parts = [];
    parts.push(state.vol === 'all' ? '六册' : volLabel(state.vol));
    var v = volObj(state.vol);
    if (v && state.ch !== 'all') {
      var c = (v.chapters || []).filter(function (x) { return String(x.no) === String(state.ch); })[0];
      if (c) parts.push('第 ' + c.no + ' 章');
    }
    parts.push(VIEW_CN[state.view]);
    MC.shell.title('知识图谱', { sub: parts.join(' · '), back: '#/today' });
  }

  function fillCh() {
    if (!chSel) return;
    var v = volObj(state.vol);
    var opts = '<option value="all">全部章</option>';
    if (v) {
      opts += (v.chapters || []).map(function (c) {
        return '<option value="' + c.no + '">第 ' + c.no + ' 章 ' + C.esc(c.title) + '</option>';
      }).join('');
    }
    chSel.innerHTML = opts;
    chSel.disabled = state.vol === 'all';
    if (state.vol === 'all') state.ch = 'all';
    chSel.value = state.ch === 'all' ? 'all' : String(state.ch);
    if (chSel.value !== String(state.ch)) { state.ch = 'all'; chSel.value = 'all'; }
  }

  function fillControls() {
    if (segEl) {
      /* spec 4.3：主位只留章图。其余视角还能用（搜索会切过去，老链接也还认），
         但不摆在孩子面前当五个并列选项——它们回答的是「换个看法」，不是「换一章」。 */
      function btn(v) {
        return '<button type="button" data-view="' + v[0] + '"' +
          (state.view === v[0] ? ' class="on"' : '') + '>' + v[1] + '</button>';
      }
      var main = VIEWS.filter(function (v) { return v[0] === 'mind'; });
      var rest = VIEWS.filter(function (v) { return v[0] !== 'mind'; });
      var lens = '';
      if (state.view === 'mind') {
        var upCh = null;
        if (state.zoomed && state.focus) {
          var focused = byId[state.focus];
          if (focused && focused.kind === 'section') upCh = parentChapter(focused);
        }
        lens = (upCh ? '<button type="button" data-up="' + C.esc(upCh.id) + '">回到本章</button>' : '') +
          /* 这里原来写 data-back，boot.js 的全局处理器把它当「返回上一页」（history.back()）。
             从练习页「‹」回到 #/map?...&node=…&read=1 之后再点它，浏览器退回的是练习页，
             永远回不到总图（out/team/map-ux-v3.md 实测 hash 变成 #/practice/801/12.1?from=…）。
             自己的按钮自己管：data-zoomout 只由 map.js 处理，收焦点 + 把地址栏换回 #/map。 */
          (state.zoomed ? '<button type="button" data-zoomout="1">' +
            ((state.vol && state.vol !== 'all' && state.ch && state.ch !== 'all') ? '回到这一章' : '回到总图') +
            '</button>' : '') +
          '<button type="button" class="seg-sub' + (state.lens !== 'layers' ? ' on' : '') + '" data-lens="web">网络</button>' +
          '<button type="button" class="seg-sub' + (state.lens === 'layers' ? ' on' : '') + '" data-lens="layers">分层</button>';
      }
      segEl.innerHTML = lens + main.map(btn).join('') +
        '<details class="seg-more"><summary>其他画法' +
        (state.view !== 'mind' ? '：' + VIEW_CN[state.view] : '') + '</summary>' +
        '<div class="seg-more-list">' + rest.map(btn).join('') + '</div></details>';
    }
    if (namesBtn) namesBtn.hidden = !isChapterView();
    if (volSel) {
      var vs = (MC.catalog && MC.catalog.volumes) || [];
      volSel.innerHTML = '<option value="all">六册全部</option>' + vs.map(function (v) {
        return '<option value="' + C.esc(v.id) + '">' + C.esc(v.label) + '</option>';
      }).join('');
      volSel.value = state.vol;
    }
    fillCh();
    if (depthEl) {
      C.qsa('button', depthEl).forEach(function (b) {
        b.classList.toggle('on', b.getAttribute('data-depth') === state.depth);
      });
      /* 骨架视图的节点就是节，没有「层数」可言，别让按钮骗人 */
      /* 思想层是整册横切的，没有「层数」这个维度 */
      depthEl.classList.toggle('is-off', state.view === 'skeleton' || state.view === 'chart' || state.view === 'thought' || state.view === 'overview' || state.view === 'mind');
    }
    paintCps();
    paintThoughts();
  }

  /* Six ideas sit above the cloud. Their lines are too many to draw inside it. */
  function paintThoughts() {
    var bar = document.getElementById('thought-bar');
    if (!bar) return;
    if (state.view !== 'mind' || !G || isChapterMap()) { bar.hidden = true; return; }
    var list = [];
    G.nodes.forEach(function (n) {
      if (n.kind === 'thought' && n.level === 'thought') list.push(n);
    });
    list.sort(function (a, b) { return a.id < b.id ? -1 : (a.id > b.id ? 1 : 0); });
    bar.hidden = false;
    bar.innerHTML = '<span class="tb-lbl">思想</span>' + list.map(function (t) {
      var on = state.focus === t.id ? ' on' : '';
      return '<button type="button" class="tb-item' + on + '" data-thought="' + C.esc(t.id) + '"><i></i>' +
        C.mathHtml(t.title) + '</button>';
    }).join('');
  }
  /* Open a thought card and put the cloud back. Do not draw its hundreds of lines. */
  function focusThought(id) {
    if (!byId[id]) return;
    if (cy && state.zoomed) {
      haltMotion();
      cy.batch(function () {
        cy.edges('[x = "grow"]').remove();
        cy.elements().removeClass('mind-hot mind-dim mind-on mind-tight mind-secpick mind-secwait mind-secview mind-up mind-upedge dim sel nb');
        cy.nodes().forEach(function (node) { node.removeData('out'); });
      });
      state.zoomed = false;
      restoreHome(true);
      frameHome();
    }
    state.focus = id;
    state.local = null;
    showDetail(id);
    fillControls();
  }

  /* 素养多选（竞品侧栏那块）。计数是「这一屏里有多少个知识点练到它」，
     勾上之后只留「至少练到其中一项」的知识点与方法；册/章/节/思想不动。 */
  function paintCps() {
    if (!cpEl) return;
    if (state.view === 'mind') { cpEl.innerHTML = ''; cpEl.hidden = true; return; }
    cpEl.hidden = false;
    var cnt = cpCounts();
    var on = state.cps || {};
    var list = cpList().map(function (cp) {
      var n = cnt[cp.id] || 0;
      return '<button type="button" data-cp="' + C.esc(cp.id) + '"' +
        (on[cp.id] ? ' class="on"' : '') + (n ? '' : ' disabled') + '>' +
        C.esc(cp.title) + '<i>' + n + '</i></button>';
    }).join('');
    var sel = Object.keys(on).filter(function (k) { return on[k]; }).length;
    cpEl.innerHTML = '<span class="cp-lbl">核心素养<i>按方法推断</i></span>' + list +
      (sel ? '<button type="button" class="cp-reset" data-cp-reset="1">清空</button>' : '');
  }

  /* 从样式表反推线型样本：命中 'edge[r = "xxx"]' 的那条规则，
     取它的 line-color / line-style / target-arrow-shape / width。
     图例不再自己写颜色 —— 以前图例写死 'geo'、样式早改成 num，两边就这么漂开。 */
  function edgeLegend() {
    var rels = EDGE_LEG[state.view] || [];
    if (!rels.length) return [];
    var sheet = styleSheet();
    var out = [];
    rels.forEach(function (rel) {
      var st = null;
      sheet.forEach(function (rule) {
        if (rule.selector === 'edge[r = "' + rel + '"]') st = rule.style;
      });
      if (!st) return;
      var ls = st['line-style'];
      out.push({
        rel: rel,
        text: REL_CN[rel] || rel,
        color: st['line-color'],
        dash: ls === 'dashed',
        dot: ls === 'dotted',
        arrow: st['target-arrow-shape'] !== 'none',
        thick: typeof st.width === 'number' && st.width >= 1.9
      });
    });
    return out;
  }

  var sideOpen = false;
  /* 章内档的「点名」：画布上的知识点是蓝菱形、没有名字（176 个点挤在 517×409 里，
     13px 的字会叠成一片）。名字放到右侧浮层里按节列出，点哪个就进哪个的十字档。 */
  function sideHtml() {
    var groups = {}, order = [];
    /* 从 G 里按册/章现筛，不要读 set：set 是上一次 rebuild 的产物，
       而 syncCross 可能先于 rebuild 跑（深链接直接进章内档时就是这样），
       那时 set 里还是「六册全景」的章节点，名单会空成 0 个。 */
    var pool = (G && G.nodes) ? G.nodes : [];
    pool.forEach(function (n) {
      if (n.kind !== 'knowledge_point') return;
      if (String(n.vol) !== String(state.vol) || String(n.ch) !== String(state.ch)) return;
      var sk = String(n.sec || '');
      if (!groups[sk]) { groups[sk] = []; order.push(sk); }
      groups[sk].push(n);
    });
    order.sort(function (a, b) { return secNumOf({ sec: a }) - secNumOf({ sec: b }); });
    var nKp = 0;
    order.forEach(function (k) { nKp += groups[k].length; });
    var out = ['<div class="ms-h"><b>这一章的点名</b><span class="muted">' + nKp + ' 个知识点 · 按节排</span></div>'];
    order.forEach(function (k) {
      var secNode = byId[secIdOf({ sec: k, vol: state.vol })];
      /* 节名自带节号（「12.1 三角形」），别再拼一遍成「12.1 12.1 三角形」 */
      var secName = secNode ? C.tidy(secNode.title || '') : '';
      if (secName.indexOf(k + ' ') === 0 || secName.indexOf(k + '\u3000') === 0) secName = secName.slice(k.length).replace(/^[\s　]+/, '');
      out.push('<h4>' + C.esc(k + (secName ? ' ' + secName : '')) + ' · ' + groups[k].length + '</h4><ul>');
      groups[k].forEach(function (n) {
        out.push('<li><a href="' + C.esc(crossUrl(n.id)) + '">' + C.mathHtml(n.title || n.id) + '</a></li>');
      });
      out.push('</ul>');
    });
    if (!nKp) out.push('<p class="muted">这一章还没有知识点。</p>');
    return out.join('');
  }
  function paintSide(force) {
    if (!sideEl) return;
    if (force != null) sideOpen = !!force;
    var on = sideOpen && isChapterView();
    sideEl.hidden = !on;
    if (on) {
      sideEl.innerHTML = sideHtml();
      /* 浮层贴着画布顶，但高度按视口算：它比视口高时，末尾几节会被切在屏幕外，
         而它自己又不滚（overflow:auto 只在定高时才起作用）。 */
      var rc = sideEl.getBoundingClientRect();
      sideEl.style.maxHeight = Math.max(220, Math.round(window.innerHeight - rc.top - 16)) + 'px';
    }
    if (namesBtn) namesBtn.classList.toggle('on', on);
  }
  function paintLegend() {
    if (!legendEl) return;
    var P = pal();
    if (isChapterMap()) {
      legendEl.innerHTML =
        '<span class="k"><span class="sw" style="background:' + P.card + ';border:1px solid ' + P.lineStrong + ';border-radius:5px"></span>章（点开看这一章的节与点）</span>' +
        '<span class="k"><span class="sw sw-line" style="height:2px;background:' + P.green + '"></span>先修：这一章要先用哪一章</span>' +
        '<span class="k"><span class="sw sw-line" style="height:2px;background:' + P.inkFaint + ';-webkit-mask-image:repeating-linear-gradient(90deg,#000 0 4px,transparent 4px 8px)"></span>教材顺序（书上排在哪）</span>' +
        '<span class="k k-dep k-note">六册全景只到「章」：1531 个知识点画在一屏里读不出来。线越粗 = 这一章被后面用得越多；点一张卡片进去看这一章的节和点。</span>';
      return;
    }
    var items = LEGEND[state.view] || [];
    var html = items.map(function (it) {
      var o = it[2] || {};
      var lk = look(it[0], { tier: o.double ? 'olympiad' : (o.dash ? 'extend' : 'core') });
      var bg = o.bg ? P[o.bg] : lk.bg;
      var ln = o.line ? P[o.line] : lk.line;
      /* 边样本：图例里要说清四种线各是什么，否则新加的「教材顺序」看着像先修 */
      if (o.edge) {
        return '<span class="k"><span class="sw sw-line" style="' + (o.thick ? 'height:3px;' : '') + 'background:' + C.esc(P[o.edge] || ln) +
          (o.dash ? ';-webkit-mask-image:repeating-linear-gradient(90deg,#000 0 4px,transparent 4px 8px)' : '') +
          '"></span>' + C.esc(it[1]) + '</span>';
      }
      var st = 'background:' + (o.underlay ? 'transparent' : bg) + ';border:1px solid ' + ln;
      if (o.underlay) st += ';box-shadow:0 0 0 3px ' + P.geoS;
      else if (o.dash || lk.dash) st += ';border-style:dashed';
      else if (o.double || lk.double) st += ';border-style:double;border-width:3px';
      return '<span class="k"><span class="sw" style="' + st + '"></span>' + C.esc(it[1]) + '</span>';
    }).join('');
    /* 线型行：颜色/虚实/箭头全部来自 styleSheet()，这里只负责排版 */
    var edges = edgeLegend();
    edges.forEach(function (e) {
      var style = 'height:' + (e.thick ? 3 : 2) + 'px;background:' + C.esc(e.color) + ';';
      if (e.dash) style += '-webkit-mask-image:repeating-linear-gradient(90deg,#000 0 4px,transparent 4px 8px);';
      if (e.dot) style += '-webkit-mask-image:radial-gradient(circle,#000 1.1px,transparent 1.6px);-webkit-mask-size:4px 4px;-webkit-mask-repeat:repeat-x;';
      html += '<span class="k"><span class="sw sw-line" style="' + style + '"></span>' +
        C.esc(e.text) + (e.arrow ? '' : '<i class="k-noarrow">无向</i>') + '</span>';
    });
    /* 依据三档的小字：只在有线的档出现，放在整条图例的最后一个 .k，
       紧跟在同类样本后面 —— 它是「怎么读粗细」的注脚，不是节点说明 */
    if (edges.length) {
      /* 这行注脚在 430px（64vw≈275px）下本身就比容器宽 —— 它是整句说明，
         不许 nowrap，独占一行并允许折行，否则图例自己成为唯一的溢出元素。 */
      html += '<span class="k k-dep k-note">点开一个点，只剩它自己连出去的那几根线（颜色 = 关系种类），'
        + '别的线不画。线越粗越实 = 依据越硬：' +
        '<b class="dep-m">教研判定</b> ／ <b class="dep-r">规则推断</b> ／ <b class="dep-sk">挂点推断</b></span>';
    }
    legendEl.innerHTML = html;
  }

  function emptyMsg() {
    var what = { skeleton: '节', kp: '知识点', skill: '方法', misconception: '错因', thought: '思想' }[state.view];
    if (state.view === 'thought') {
      return '这张图里还没有思想节点。<br><span class="muted">思想来自 content/thoughts.jsonl，方法靠 belongs_to 边挂上来。';
    }
    if (state.view === 'skill' || state.view === 'misconception') {
      return '这个范围里还没有' + what + '节点。<br><span class="muted">方法和错因目前只在八年级上册第 10–13 章生成，换到「八上」再看看。</span>';
    }
    if (state.depth !== 'all') {
      return '这个范围里没有' + what + '节点。<br><span class="muted">把层数切到「整章」再试。</span>';
    }
    return '这个范围里还没有' + what + '节点，换个册或章试试。';
  }

  function paintNote() {
    if (!noteEl) return;
    if (!set.nodes.length) { noteEl.innerHTML = ''; return; }
    if (state.view === 'mind') {
      noteEl.textContent = '全课程的点。章和章之间的线是跨章要先会的，点一个点看它从哪里长出来。';
      return;
    }
    var s = '现在这张图：' + set.nodes.length + ' 个点 · ' + boxes.length + ' 个岛 · ' + set.edges.length + ' 条关系。';
    /* 思想视图不按邻域裁，别在这里说「只画了某一节的邻域」，否则孩子会以为图缺了半边 */
    if (state.view === 'thought') {
      s += '一个岛 = 一条思想，岛里是归到它的方法；跨册显示，不受册章筛选影响。';
      if (cy && cy.zoom() < 0.5) s += '字有点小了：双击一个节点放大，或点「看全」缩回整图。';
      noteEl.textContent = s;
      return;
    }
    /* 这一行要点名一个知识点，标题里常有 √(b²−4ac) 这类写法：
       原来整句走 textContent，公式就成了原文。含标题时改用 innerHTML，
       静态部分照样转义。 */
    if (state.depth !== 'all' && state.focus) {
      var f = byId[state.focus];
      var t = f ? String(f.title || '') : String(state.focus);
      var tail = ' 的' + (state.depth === 'sec' ? '本节' : '邻域') + '，切「整章」看全部。';
      if (cy && cy.zoom() < 0.5) tail += '字有点小了：双击一个节点放大，或点「看全」缩回整图。';
      noteEl.innerHTML = C.esc(s) + '只画了 ' + C.mathHtml(C.clipMath(t, 40)) + C.esc(tail);
      return;
    }
    if (cy && cy.zoom() < 0.5) s += '字有点小了：双击一个节点放大，或点「看全」缩回整图。';
    noteEl.textContent = s;
  }

  /* ---------- 主流程 ---------- */

  /* Column drill from the reference: 素养 → 教材 → 章节 → 知识. */
  function paintLayers() {
    var host = hostEl && hostEl.querySelector('#map-layers');
    if (!host || !G) return;
    host.hidden = false;
    var cps = cpList();
    var counts = {};
    G.nodes.forEach(function (n) {
      if (n.kind !== 'knowledge_point' || !n.cpstd) return;
      n.cpstd.forEach(function (id) { counts[id] = (counts[id] || 0) + 1; });
    });
    function kpCount(pred) {
      var n = 0;
      G.nodes.forEach(function (x) { if (x.kind === 'knowledge_point' && pred(x)) n++; });
      return n;
    }
    var vols = (MC.catalog && MC.catalog.volumes) || [];
    var vol = null;
    vols.forEach(function (v) { if (v.id === state.layerVol) vol = v; });
    if (!vol && vols.length) { vol = vols[0]; state.layerVol = vol.id; }
    var chs = (vol && vol.chapters) || [];
    if (!state.layerCh && chs.length) state.layerCh = String(chs[0].no);
    var kps = [];
    G.nodes.forEach(function (n) {
      if (n.kind !== 'knowledge_point' || n.vol !== state.layerVol || String(n.ch) !== String(state.layerCh)) return;
      if (state.layerCp && !(n.cpstd && n.cpstd.indexOf(state.layerCp) >= 0)) return;
      kps.push(n);
    });
    kps.sort(function (a, b) {
      return String(a.sec).localeCompare(String(b.sec)) || String(a.id).localeCompare(String(b.id));
    });
    function card(attr, id, title, meta, on) {
      return '<button type="button" class="layer-card' + (on ? ' on' : '') + '" ' + attr + '="' + C.esc(String(id)) + '">' +
        '<span>' + C.mathHtml(title) + '</span><em>' + C.esc(String(meta)) + '</em></button>';
    }
    host.innerHTML = '<div class="layers"><p class="layers-sub">素养 → 教材 → 章节 → 知识</p><div class="layers-row">' +
      '<section><h3>核心素养 <em>' + cps.length + '</em><i>点一项筛右边的点</i></h3>' +
      cps.map(function (cp) {
        return card('data-lcp', cp.id, cp.title, counts[cp.id] || 0, state.layerCp === cp.id);
      }).join('') + '</section>' +
      '<section><h3>教材 <em>' + vols.length + '</em><i>选一本</i></h3>' +
      vols.map(function (v) {
        return card('data-lvol', v.id, v.label, kpCount(function (x) { return x.vol === v.id; }) + ' 个知识点', v.id === state.layerVol);
      }).join('') + '</section>' +
      '<section><h3>章节 <em>' + chs.length + '</em><i>' + C.mathHtml(vol ? vol.label : '') + '</i></h3>' +
      chs.map(function (c) {
        var n = kpCount(function (x) { return x.vol === state.layerVol && String(x.ch) === String(c.no); });
        return card('data-lch', c.no, '第' + c.no + '章 ' + c.title, n, String(c.no) === String(state.layerCh));
      }).join('') + '</section>' +
      '<section><h3>知识点 <em>' + kps.length + '</em><i>点一个看方法</i></h3>' +
      (kps.map(function (k) {
        var name = String(k.title || ''), cut = name.search(/[：:]/);
        if (cut > 1) name = name.slice(0, cut);
        return card('data-lkp', k.id, name, k.sec || '', state.layerKp === k.id);
      }).join('') || '<p class="muted">这一章在这个素养下还没有点。</p>') +
      '</section>' +
      '<section><h3>解题方法 <em>' + (state.layerKp ? skillsOf(state.layerKp).length : 0) + '</em><i>点一条看边界</i></h3>' +
      (state.layerKp ? skillsOf(state.layerKp).map(function (s) {
        return card('data-lsk', s.id, s.title, (kpsUnder(s.id).length) + ' 个知识点', false);
      }).join('') || '<p class="muted">这个点还没挂方法。</p>' : '<p class="muted">先点左边一个知识点。</p>') +
      '</section></div></div>';
  }

  function rebuild() {
    if (!cyEl) return;
    PAL = null;                       // 深色模式可能在两次打开之间变了
    applyScope();                     // 先定「看得多远」，尺寸与间距都跟着它
    detailEmpty();
    if (state.view === 'mind' && state.lens === 'layers') {
      if (cy) { try { cy.destroy(); } catch (eL) {} cy = null; }
      if (wrapEl) wrapEl.classList.add('is-mind', 'is-layers');
      paintLayers();
      if (hintEl) hintEl.textContent = '素养 → 教材 → 章节 → 知识。点一个知识点回到网络。';
      return;
    }
    if (wrapEl) wrapEl.classList.remove('is-layers');
    var layOff = hostEl && hostEl.querySelector('#map-layers');
    if (layOff) { layOff.hidden = true; layOff.innerHTML = ''; }
    if (!G || !window.cytoscape) {
      cyEl.innerHTML = '<div class="empty">图形库没加载上，图谱画不出来。</div>';
      return;
    }
    if (cy) { try { cy.destroy(); } catch (e) {} cy = null; }
    cyEl.innerHTML = '';
    homePos = null;

    set = tagDep(buildSet());
    paintLegend();
    /* #map-key 讲的是点（章节/小节/知识点/教材方法/培优/竞赛），章级总图上没有这些点，
       留着就是第二套图例在说瞎话（决策 35：说明文字必须描述图上真实的东西）。 */
    var keyEl = cyEl && cyEl.parentNode ? cyEl.parentNode.querySelector('#map-key') : null;
    if (keyEl) keyEl.style.display = isChapterMap() ? 'none' : '';
    if (hintEl) hintEl.textContent = hintText();
    if (leadEl) leadEl.textContent = LEAD[state.view] || '';
    if (wrapEl) wrapEl.classList.toggle('is-mind', state.view === 'mind');

    if (!set.nodes.length) {
      boxes = [];
      paintNote();
      cyEl.innerHTML = '<div class="empty">' + emptyMsg() + '</div>';
      return;
    }

    var ielems = [];
    if (state.view !== 'mind') {
      var groups = {}, order = [];
      set.nodes.forEach(function (el) {
        var n = byId[el.data.id];
        if (!n) return;
        var k = clusterKey(n);
        if (!groups[k]) { groups[k] = { key: k, items: [] }; order.push(k); }
        groups[k].items.push(n);
      });
      if (state.view === 'chart') {
        order.sort(function (a, b) {
          var na = byId[a], nb = byId[b];
          return secNum(na ? na.sec : '') - secNum(nb ? nb.sec : '');
        });
      }
      boxes = layoutIslands(groups, order);
      if (state.view === 'chart') addSecLinks(boxes);
      var pos = placeElements(boxes);
      set.nodes.forEach(function (el) { var p = pos[el.data.id]; if (p) el.position = p; });

      var tone = state.view === 'kp' ? 0 : (state.view === 'skill' ? 1 : ((state.view === 'misconception' || state.view === 'thought') ? 2 : 0));
      ielems = islandElements(boxes, tone);
    }

    cy = window.cytoscape({
      container: cyEl,
      elements: ielems.concat(set.nodes, set.edges),
      style: styleSheet(),
      wheelSensitivity: 0.15,
      /* 0.1 会把全库视图硬钉成「字缩到 1.1px 还在画」。放到 0.03，让 fit 真的能装下，
         字由 LOD 分档丢弃，而不是靠缩放下限兜住。 */
      minZoom: 0.03,
      maxZoom: 2.4,
      boxSelectionEnabled: false,
      selectionType: 'single',
      layout: { name: 'preset' }
    });

    cy.on('tap', 'node', function (evt) {
      var n = evt.target;
      var nav = n.data('nav');
      if (n.hasClass('island-label') && nav) { MC.router.go(nav); return; }
      if (n.hasClass('island')) return;
      /* 章级总图上的卡片不是「一个点」，点它是「进这一章」：
         直接落到这一册这一章的图上，比在原地把它点亮有意义得多。 */
      if (n.hasClass('mind-cch')) {
        MC.router.go('#/map?vol=' + encodeURIComponent(n.data('vol')) + '&ch=' + encodeURIComponent(n.data('ch')));
        return;
      }
      openNode(n);
    });
    cy.on('dbltap', 'node', function (evt) {
      var n = evt.target;
      if (n.hasClass('island') || n.hasClass('island-label')) return;
      centerOn(n.id(), 1.25);
    });
    cy.on('tap', function (evt) {
      if (evt.target !== cy) return;
      if (state.view === 'mind' && (state.zoomed || state.focus)) {
        if (nearLive(evt.position)) return;
        releaseFocus();
      }
      else { clearMarks(); clearGrow(); detailEmpty(); }
    });
    /* 悬停看依据：图上一根线「凭什么连」，比线本身重要得多。
       三种来路分开数（人工判定 / 规则推断 / 方法挂点推断），三类都没有就不提依据。 */
    cy.on('mouseover', 'node', function (evt) { showTip(evt.target); });
    cy.on('mouseout', 'node', function () { hideTip(); });
    cy.on('pan zoom', function () { hideTip(); scheduleCallouts(); });
    cy.on('zoom', applyLOD);
    cy.on('resize', applyLOD);

    userCam = false;
    fitView(56);
    /* 详情面板一开，#cy 的宽度就变了（1140 → 720），但 cytoscape 不会自己知道；
       不重取景的话，图会停在按旧尺寸算的位置上 —— 实测点开后整块上移 132px、顶部被切。
       所以监听容器尺寸：变了就 resize + （用户没动过相机时）重新取景。 */
    if (state.focus && byId[state.focus]) {
      focusNode(state.focus);
      showDetail(state.focus);
      /* 这里原来会按 read=1 直接摊开整篇讲解（#read-sheet 是 fixed 覆盖层）。
         从练习题点「回到图上」回来的人第一眼就是整页文字、图被完全盖住 ——
         用户把这一屏描述成「绘制混乱」。返回应该落在图上：焦点、标签、详情卡都在，
         想看全文再点卡里的「展开阅读」。
         保留字段本身：openRead 仍可由别的入口显式调用。 */
      state.reopenRead = null;
      if (state.view === 'mind' && !state.local) showGrow(state.focus);
    }
    lastLod = -1;
    applyLOD();
    paintNote();
    /* 没有焦点时线一律退成底纹（e-n）；有焦点的情况 focusNode 已经分好级，别再覆盖。 */
    if (!(state.focus && byId[state.focus])) restEdges();
    else {
      /* 取景、局部环重排、LOD 这些后处理都会把 sel/e-f 一起清掉（实测点节节点：39 点 40 边，
         sel=0、40 条全退成 e-n —— 焦点点开了却一点都不亮）。这里补一次：焦点必须是亮的。 */
      var felt = cy.getElementById(state.focus);
      if (felt && felt.length && !felt.hasClass('sel')) focusNode(state.focus);
    }
    /* 画布高度定型后再补取景（见 refitSoon 的注释）。 */
    refitSoon();
    /* 手机上六册全景换成 DOM 列表（#map-cross 那套容器），画布建完就得同步一次，
       否则它会一直 hidden 在 #cy 后面。 */
    syncCross();
  }

  function bindEvents() {
    var thoughtBar = document.getElementById('thought-bar');
    if (thoughtBar) {
      thoughtBar.addEventListener('click', function (e) {
        var b = e.target && e.target.closest ? e.target.closest('[data-thought]') : null;
        if (!b) return;
        focusThought(b.getAttribute('data-thought'));
      });
    }
    if (segEl) {
      segEl.addEventListener('click', function (e) {
        var kindBtn = e.target && e.target.closest ? e.target.closest('[data-kind]') : null;
        var upBtn = e.target && e.target.closest ? e.target.closest('[data-up]') : null;
        if (upBtn) {
          pick(upBtn.getAttribute('data-up'));
          return;
        }
        var backBtn = e.target && e.target.closest ? e.target.closest('[data-back], [data-zoomout]') : null;
        if (backBtn) {
          e.preventDefault();
          e.stopPropagation();
          releaseFocus();
          /* 收焦点之后地址栏不该还挂着 node=/read=，否则刷新、分享都回到那张卡上。 */
          if (history.replaceState && /[?&](node|read)=/.test(location.hash)) {
            history.replaceState(null, '', '#/map');
          }
          return;
        }
        if (kindBtn) {
          state.kind = kindBtn.getAttribute('data-kind');
          state.lens = 'web';
          state.local = null;
          state.focus = null;
          fillControls();
          rebuild();
          return;
        }
        var lensBtn = e.target && e.target.closest ? e.target.closest('[data-lens]') : null;
        if (lensBtn) {
          state.lens = lensBtn.getAttribute('data-lens');
          fillControls();
          rebuild();
          return;
        }

        var b = e.target && e.target.closest ? e.target.closest('[data-view]') : null;
        if (!b) return;
        if (b.getAttribute('data-view') === 'kp') {
          state.view = 'mind';
          state.lens = 'web';
          state.kind = 'kp';
          var cur = state.focus && byId[state.focus];
          state.local = (cur && cur.kind === 'knowledge_point') ? cur.id : null;
          fillControls();
          rebuild();
          return;
        }
        var want = b.getAttribute('data-view');
        /* 分层是 mind 视角里的一层。换画法时必须退回去，否则点了「导图」还停在分层，
           屏幕一动不动，看着像按钮坏了（ux 复验实测两轮截图 sha256 相同）。 */
        if (state.lens === 'layers') {
          state.lens = 'web';
          if (want === state.view) { fillControls(); paintSub(); rebuild(); return; }
        }
        switchView(want);
      });
      var lay = hostEl && hostEl.querySelector('#map-layers');
      if (lay) lay.addEventListener('click', function (e) {
        var b = e.target && e.target.closest ? e.target.closest('button') : null;
        if (!b) return;
        if (b.hasAttribute('data-lcp')) {
          var id = b.getAttribute('data-lcp');
          state.layerCp = state.layerCp === id ? null : id;
          paintLayers();
          return;
        }
        if (b.hasAttribute('data-lvol')) {
          state.layerVol = b.getAttribute('data-lvol');
          state.layerCh = null;
          paintLayers();
          return;
        }
        if (b.hasAttribute('data-lch')) {
          state.layerCh = b.getAttribute('data-lch');
          paintLayers();
          return;
        }
        if (b.hasAttribute('data-lkp')) {
          state.layerKp = b.getAttribute('data-lkp');
          paintLayers();
          showDetail(state.layerKp);
          return;
        }
        if (b.hasAttribute('data-lsk')) {
          showDetail(b.getAttribute('data-lsk'));
        }
      });
    }
    if (cpEl) {
      cpEl.addEventListener('click', function (e) {
        var b = e.target && e.target.closest ? e.target.closest('[data-cp],[data-cp-reset]') : null;
        if (!b) return;
        if (b.getAttribute('data-cp-reset')) {
          state.cps = {};
        } else {
          var id = b.getAttribute('data-cp');
          state.cps[id] = state.cps[id] ? 0 : 1;
          if (!state.cps[id]) delete state.cps[id];
        }
        paintCps();
        rebuild();
      });
    }
    if (depthEl) {
      depthEl.addEventListener('click', function (e) {
        var b = e.target && e.target.closest ? e.target.closest('[data-depth]') : null;
        if (!b) return;
        var d = b.getAttribute('data-depth');
        if (d === state.depth) return;
        state.depth = d;
        if (d !== 'all' && !state.focus) state.focus = defaultFocus();
        fillControls();
        rebuild();
      });
    }
    if (volSel) {
      volSel.addEventListener('change', function () {
        state.vol = volSel.value;
        state.ch = 'all';
        state.focus = defaultFocus();
        fillCh();
        if (state.depth !== 'all' && !state.focus) state.depth = 'all';
        paintSub();
        rebuild();
      });
    }
    if (chSel) {
      chSel.addEventListener('change', function () {
        state.ch = chSel.value;
        state.focus = defaultFocus();
        if (state.depth !== 'all' && !state.focus) state.depth = 'all';
        fillControls();
        paintSub();
        rebuild();
      });
    }
    if (namesBtn) {
      namesBtn.addEventListener('click', function () {
        paintSide(!sideOpen);
      });
    }
    if (fitBtn) {
      /* 「看全」是「把整张图放到眼前」，不是「保留焦点只换相机」。
         原来只调相机：焦点态的非邻域线还是 e-x（不画）、字还是 lodh（不显示）、卡还开着，
         用户看到的是「满屏淡点 + 没字 + 七八条线」（map-qa-v4 实测 visE 7/3698）。
         先归位（清焦点、还底纹、关掉卡）再取景。 */
      fitBtn.addEventListener('click', function () {
        if (state.zoomed) releaseFocus();
        fitView(56, { all: true });
        paintNote();
      });
    /* 窄屏那层从底部升起的讲解，要有「收起」：关掉它回到图，不跳页顶 */
    if (closeBtn) closeBtn.addEventListener('click', function () { detailEmpty(); });
    }
    if (qEl) {
      var t = 0;
      qEl.addEventListener('input', function () {
        clearTimeout(t);
        t = setTimeout(function () { paintHits(qEl.value); }, 220);
      });
      qEl.addEventListener('focus', function () { if (qEl.value) paintHits(qEl.value); });
      qEl.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { hideHits(); return; }
        if (e.key === 'Enter') { e.preventDefault(); searchGo(qEl.value); }
      });
    }
    if (hostEl) {
      /* 关系按钮：点它就跳到那个点（顺便把它挪到视野中间），这是在图上「顺着关系走」的唯一入口 */
      hostEl.addEventListener('click', function (e) {
        var shut = e.target && e.target.closest ? e.target.closest('[data-read-close]') : null;
        if (shut) { closeRead(true); return; }
        var call = e.target && e.target.closest ? e.target.closest('[data-call]') : null;
        if (call) { pick(call.getAttribute('data-call')); return; }
        var secBtn = e.target && e.target.closest ? e.target.closest('[data-sec]') : null;
        if (secBtn && !(e.target.closest && e.target.closest('[data-pick]'))) {
          openSection(secBtn.getAttribute('data-sec'));
          return;
        }
        var read = e.target && e.target.closest ? e.target.closest('[data-read]') : null;
        if (read) { openRead(read.getAttribute('data-read')); return; }
        var j = e.target && e.target.closest ? e.target.closest('[data-jump]') : null;
        if (j && !j.disabled) {
          var set = j.closest('.dd-jump-set');
          var list = set && set.querySelector('[data-jump-list="' + j.getAttribute('data-jump') + '"]');
          if (!list) return;
          var picks = list.querySelectorAll('[data-pick]');
          if (picks.length === 1) { picks[0].click(); return; }
          var willOpen = list.hidden;
          set.querySelectorAll('[data-jump-list]').forEach(function (el) { el.hidden = true; });
          set.querySelectorAll('.dd-count').forEach(function (el) { el.classList.remove('on'); });
          if (willOpen) { list.hidden = false; j.classList.add('on'); }
          return;
        }
        /* 搜索结果：data-nid 是裸节点 id，不是路由。
           早先写成 data-go="K902-23.3-04"，被 boot.js 的全局 [data-go] 委托接手，
           变成 location.hash = 'K902-23.3-04' —— 路由解析不到就退回「今日」，图上什么都没动。 */
        var pn = e.target && e.target.closest ? e.target.closest('[data-nid]') : null;
        if (pn) {
          var nid = pn.getAttribute('data-nid');
          var nn = byId[nid];
          if (nn) goTo({ id: nid, view: KIND_VIEW[nn.kind] });
          return;
        }
        var p = e.target && e.target.closest ? e.target.closest('[data-pick]') : null;
        if (!p) return;
        var pgo = e.target && e.target.closest ? e.target.closest('[data-go]') : null;
        if (pgo) {
          var gid = pgo.getAttribute('data-go');
          var gn = byId[gid];
          if (gn) goTo({ id: gid, view: KIND_VIEW[gn.kind] });
          return;
        }
        var pid = p.getAttribute('data-pick');
        if (!pid || !byId[pid]) return;
        if (!cy || !cy.getElementById(pid).length) {
          /* 这个点不在当前画面上：先切到它所属的类型，再打开。 */
          state.focus = pid;
          state.depth = 'nb';
          var on = byId[pid];
          if (state.view === 'mind' && on) {
            state.lens = 'web';
            state.kind = 'all';
            state.local = null;
          }
          if (on && on.vol) state.vol = on.vol;
          fillControls(); fillCh(); paintSub();
          rebuild();
          setTimeout(function () { pick(pid); centerOn(pid, 1.2); }, 60);
          return;
        }
        pick(pid);
        if (state.view !== 'mind') centerOn(pid, 1.15);
        var inSheet = e.target.closest && e.target.closest('#read-sheet');
        if (inSheet) openRead(pid);
      });
      hostEl.addEventListener('click', function (e) {
        var b = e.target && e.target.closest ? e.target.closest('[data-act="focus"]') : null;
        if (!b) return;
        var id = b.getAttribute('data-id');
        if (!id) return;
        var n = byId[id];
        if (n && n.sec) { state.focus = 'S' + n.vol + '-' + n.sec; }
        focusNode(id);
        centerOn(id, 1.25);
      });
    }
  }

  /* 范围内的第一节：切到「这一节 / 邻域」时用它当焦点 */
  function defaultFocus() {
    var best = null, bs = Infinity;
    G.nodes.forEach(function (n) {
      if (n.kind !== 'section') return;
      if (state.vol !== 'all' && n.vol !== state.vol) return;
      if (state.ch !== 'all' && chOf(n) !== String(state.ch)) return;
      var v = secNum(n.sec);
      if (v < bs) { bs = v; best = n.id; }
    });
    return best;
  }

  function render(host, params) {
    params = params || {};
    var my = ++token;
    hostEl = host;
    if (!state.vol) state.vol = defVol();

    /* 不带 view 就是「打开图谱」：spec 4.1 要的是每次打开先看到一张章图。
       视图按钮走 switchView（不经过这里），所以切过去的状态不会被这里抹掉。 */
    if (params.view && VIEW_CN[params.view]) state.view = params.view;
    else if (!params.view) state.view = 'mind';
    if (state.view === 'mind' && !params.vol && !params.node && !params.sec) {
      state.vol = 'all';
      if (!params.ch) state.ch = 'all';
    }
    if (params.vol && /^\d{3}$/.test(String(params.vol))) {
      var v = String(params.vol);
      if (v !== state.vol) { state.vol = v; state.ch = 'all'; }
    }
    if (params.ch) state.ch = String(params.ch);
    state.focus = params.sec ? ('S' + state.vol + '-' + params.sec) : null;
    if (params.node) {
      /* 从练习四行卡「回到图上」回来：直接落到那个知识点并打开讲解。
         rebuild 末尾见到 state.focus 就会 focusNode + showDetail，不必另写一遍。 */
      /* 这里原来写 state.view = 'kp'：带 node= 但不带 view= 的地址会被降级成「邻域视图」——
         画布 1138→718、卡从浮层变 sticky 792、标签 chips 8→0、点 1531→14。
         同一次「点开一个知识点」，只因为 URL 里有没有 view=mind 就跑出两套界面
         （out/team/map-qa-v4.md 实测）。打开图谱只有一个默认画法：导图。 */
      if (!VIEW_CN[params.view]) state.view = 'mind';
      state.focus = params.node;
      state.reopenRead = (params.read === '1') ? params.node : null;
    } else state.reopenRead = null;
    /* 带 node= 进来（从练习题「回到图上」就是这么回来的）本身就是焦点态：
       不置 zoomed 的话 paintCallouts 第一行就 early return，画面上只剩光秃秃的点。 */
    if (state.view === 'mind') { state.kind = 'all'; state.local = null; state.zoomed = !!params.node; }
    state.depth = (state.view === 'skeleton' || state.view === 'chart' || state.view === 'overview' || state.view === 'mind') ? 'all' : 'nb';

    if (cy) { try { cy.destroy(); } catch (e) {} cy = null; }
    homePos = null;

    host.innerHTML = frameHtml();
    cyEl = C.qs('#cy', host);
    crossEl = C.qs('#map-cross', host);
    sizeCanvas();
    legendEl = C.qs('#map-legend', host);
    hintEl = C.qs('#map-hint', host);
    tipEl = C.qs('#map-tip', host);
    calloutEl = C.qs('#map-callouts', host);
    sideEl = C.qs('#map-side', host);
    namesBtn = C.qs('#map-names', host);
    closeBtn = C.qs('#map-close', host);
    wrapEl = C.qs('.mapwrap', host);
    detailEl = C.qs('#map-detail', host);
    noteEl = C.qs('#map-note', host);
    leadEl = C.qs('#map-lead', host);
    segEl = C.qs('#map-seg', host);
    depthEl = C.qs('#map-depth', host);
    cpEl = C.qs('#map-cps', host);
    volSel = C.qs('#map-vol', host);
    chSel = C.qs('#map-ch', host);
    fitBtn = C.qs('#map-fit', host);
    qEl = C.qs('#map-q', host);
    qTipEl = C.qs('#map-q-tip', host);
    qResEl = C.qs('#map-q-res', host);

    paintSub();
    cyEl.innerHTML = '<div class="empty">正在取图谱…</div>';
    /* 版面在挂载后还会长高（字体到位、提示换行、图例落位），量到的 top 会一路变大。
       所以挂载后一秒钟内反复补算（sizeCanvas 自己会在高度没变时早退），
       这样无论哪一帧定型，画布高度都收敛到「顶边到视口底还剩下多少」。 */
    settleCanvas(0);
    if (window.ResizeObserver) {
      if (canvasRO) { try { canvasRO.disconnect(); } catch (e) {} }
      canvasRO = new ResizeObserver(function () { sizeCanvas(); });
      /* 观察整块 .mapwrap：画布高度自己变一次就早退，不会自激；
         上面任何一行换行都会让它长高，正好是我们要的信号。 */
      if (wrapEl) canvasRO.observe(wrapEl);
    }

    MC.data.load('graph').then(function (g) {
      if (my !== token) return;
      G = g;
      index(g);
      if (state.focus && !byId[state.focus]) state.focus = null;
      /* 落点比视图参数更具体：节点在哪一册哪一章，就把图切到那一册那一章。
         否则默认章（第 10 章）会把 12 章的方法/思想节点整屏裁掉，详情只剩一句空态。 */
      if (state.focus && byId[state.focus]) {
        var fnode = byId[state.focus];
        if (fnode.vol && state.vol !== 'all' && fnode.vol !== state.vol) { state.vol = fnode.vol; state.ch = 'all'; }
        /* 方法节点的 ch 是空的，只能从 sec（如 12.1）里取章 */
        var fch = (fnode.ch != null) ? String(fnode.ch) : (fnode.sec ? String(fnode.sec).split('.')[0] : null);
        if (fch && /^[0-9]+$/.test(fch)) state.ch = fch;
      }
      /* spec 4.1：册与章来自「我在学哪一节」。还没选章时先落到默认第一节所在章，
         否则 chart 会在整册所有章上摊开，就不是「一张章图」了。 */
      if (state.view === 'chart' && state.ch === 'all') {
        var f0 = defaultFocus(), n0 = f0 ? byId[f0] : null;
        if (n0 && n0.ch != null) state.ch = String(n0.ch);
      }
      if (!state.focus && state.view !== 'skeleton' && state.view !== 'overview' && state.view !== 'mind') state.focus = defaultFocus();
      fillControls();
      bindEvents();
      paintSub();
      return ensureLib().then(function () { if (my === token) rebuild(); });
    }).catch(function (err) {
      if (my !== token) return;
      cyEl.innerHTML = '<div class="empty"><b>图谱没打开</b><br><span class="muted">' +
        C.esc(err && err.message || err) + '</span></div>';
    });
  }

  /* 视口一变，「画布还是列表」这个判定就可能翻转（720px 为界），
     而 DOM 结构不是 CSS 能换的：必须真的重排一次，否则转屏以后
     26 张章卡片还留在画布里缩成 4.8px 的字。 */
  window.addEventListener('resize', function () {
    if (!cyEl || !document.body.contains(cyEl)) return;
    sizeCanvas();
    if (cy) { try { cy.resize(); } catch (e) {} fitView(56); }
    /* is-list 挂在 #map-cross 上（列表就画在它里面），不是挂在 wrap 上 */
    var wasList = !!(crossEl && crossEl.classList.contains('is-list'));
    var nowList = chapterListOn();
    if (wasList !== nowList) {
      /* 换形态时 DOM 整个换掉：列表里的 26 张卡不清会留在 #map-cross 里，
         画布那一档再被量到「有 26 个 mc-card」。 */
      if (!nowList && crossEl) crossEl.innerHTML = '';
      rebuild();
      setTimeout(function () { sizeCanvas(); if (cy) { try { cy.resize(); } catch (e) {} fitView(56); } }, 80);
      return;
    }
    syncCross();
  });

  /* 知识点整页（#/kp/<uid>）与右栏讲解必须是同一份：这里把 renderDetail 直接暴露出去，
     谁要整页谁调它，不再各写一套段落。map 没打开过时 byId 是空的，所以先补一次 index。 */
  function explainPage(host, uid, done) {
    function draw() {
      var n = byId[uid];
      if (!n) {
        host.innerHTML = '<div class="empty">图里没有这个知识点。' +
          '<div class="muted" style="font-size:var(--fs-xs);margin-top:6px">编号：' + C.esc(uid) + '</div>' +
          '<div class="btn-row" style="margin-top:12px"><a class="btn" href="#/toc">去目录挑一节</a></div></div>';
        return;
      }
      var vol = n.vol, sec = n.sec;
      /* secOf 已经带上「12.1 三角形」这个序号加节名，别再拼一次节名 */
      var head = '<div class="muted" style="font-size:var(--fs-xs)">' + C.esc(secOf(n) || '') + '</div>' +
        '<h1 style="font-size:21px">' + C.mathHtml(n.title) + '</h1>';
      if (!vol || !sec) {
        host.innerHTML = '<div class="wrap detail-page">' + head + renderDetail(n, null, null, null) + '</div>';
        if (done) done(n);
        return;
      }
      Promise.all([getSec(vol, sec), getItems(vol, sec), getEx(vol, sec),
        MC.data.load('qtypes').catch(function () { return null; }),
        MC.data.load('figures').catch(function () { return null; })]).then(function (res) {
        host.innerHTML = '<div class="wrap detail-page">' + head +
          renderDetail(n, res[0], res[1], res[2]) + '</div>';
        if (done) done(n);
      });
    }
    if (G && byId[uid]) { draw(); return; }
    MC.data.load('graph').then(function (g) { G = g; index(g); draw(); });
  }

  /* 只读一份图数据给别的视图用（三列页要现算直接先修/后续，不想再发一个切片） */
  MC.mapGraph = function () { return G; };
  /* 视觉断言要量「点开一个点之后到底有几条线是亮的」，只能读 cytoscape 的 class。 */
  MC.mapCy = function () { return cy; };
  MC.mapView = {
    state: state,
    cy: function () { return cy; },
    counts: function () {
      return { nodes: set.nodes.length, edges: set.edges.length, islands: boxes.length,
               view: state.view, vol: state.vol, ch: state.ch, depth: state.depth };
    },
    dagre: function () { return lib.dagre; },
    pick: pick,
    search: searchGo,
    rebuild: rebuild
  };
  MC.explainPage = explainPage;

  MC.router.view('map', { render: render });
})();
