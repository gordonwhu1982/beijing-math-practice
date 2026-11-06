/* 基础层：DOM 工具、KaTeX 渲染、提示条。无依赖，全局挂在 window.MC.core */
(function () {
  'use strict';
  var MC = window.MC = window.MC || {};
  var K = window.katex;

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c];
    });
  }

  /* KaTeX 输出方式：http(s) 下用 HTML+自带字体（观感最接近排版书）；
     file:// 下浏览器会把 woff2 当跨源拦掉，退回 MathML 由系统字体兜底。
     两条路都必须「渲染失败就退回原文，绝不吞字」。 */
  var MATH_OUT = (typeof location !== 'undefined' && location.protocol === 'file:') ? 'mathml' : 'html';

  /* 公式的两种定界：$...$ 行内，$$...$$ 独占一行的显示式。
     渲染失败一律退回原文：不吞字，也不给读者看红色报错。 */
  /* 渲染失败清单：页面上每一处「本该是公式、却没渲染出来」都记一笔。
     退回原文是为了不让读者看报错，但也因此把问题藏住了；留个清单，
     冒烟读 MC.core.mathFails 就知道有没有题在页面上露出源码，不用靠肉眼扫。 */
  var mathFails = [];
  /* 填空占位符：成串下划线、破折号、点、星号。它们长得像 LaTeX 下标（_ 是下标符），
     其实是「这里留空」的占位，不该进渲染器——否则页面上一片 katex-error 噪声，
     真出错的公式反而被埋掉。 */
  var FILLER = /^[_\uFF3F\u2014\u2013\u2500-\u257F.\u00B7*\uFF0A\s]+$/;
  function fillerTex(tex) { return FILLER.test(String(tex).replace(/\\_/g, '_').replace(/[{}]/g, '')); }
  function noteMathFail(tex, raw, err) {
    if (fillerTex(tex)) return;
    if (mathFails.length < 50) mathFails.push({ tex: String(tex).slice(0, 80), raw: String(raw).slice(0, 80), err: err ? String(err).slice(0, 80) : '' });
  }
  function katexHtml(tex, raw, display) {
    if (!K) { noteMathFail(tex, raw, 'no-katex'); return esc(raw); }
    try {
      var opt = { throwOnError: false, output: MATH_OUT, strict: false };
      if (display) opt.displayMode = true;
      var html = K.renderToString(tex, opt);
      if (html.indexOf('katex-error') >= 0) { noteMathFail(tex, raw, 'katex-error'); return esc(raw); }
      return html;
    } catch (e) { noteMathFail(tex, raw, (e && e.message) || e); return esc(raw); }
  }

  /* 中文与全角标点：这些字符不进公式，只在两侧拼。 */
  var CJK = /[\u3000-\u303f\u3400-\u9fff\uf900-\ufaff\uff00-\uffef\u2018-\u201d\u2014\u2026]/;

  var UNI_MAP = [
    ['×', '\\times '], ['÷', '\\div '], ['·', '\\cdot '], ['⋅', '\\cdot '],
    ['±', '\\pm '], ['∓', '\\mp '], ['⩽', '\\le '], ['⩾', '\\ge '],
    ['≤', '\\le '], ['≥', '\\ge '], ['≠', '\\ne '], ['≈', '\\approx '],
    ['≡', '\\equiv '], ['∽', '\\backsim '], ['≌', '\\cong '], ['∝', '\\propto '],
    ['∥', '\\parallel '], ['⊥', '\\perp '], ['∠', '\\angle '], ['△', '\\triangle '],
    ['°', '^{\\circ}'], ['∞', '\\infty '], ['∈', '\\in '], ['∪', '\\cup '], ['∩', '\\cap '],
    ['－', '-'], ['−', '-'], ['＝', '='], ['＋', '+'], ['（', '('], ['）', ')']
  ];
  var SUP = { '⁰': '0', '¹': '1', '²': '2', '³': '3', '⁴': '4', '⁵': '5',
              '⁶': '6', '⁷': '7', '⁸': '8', '⁹': '9', 'ⁿ': 'n', '⁻': '-' };

  /* 值得当公式渲染的记号：根号、乘除、比较、角与度、上下标。
     只有等号不算——K801-11.1-01 这类编号里也有连字符，不该被排成斜体。 */
  var MATHY = /[√∛±×÷≤≥≠≈∥⊥∠△°−²³⁴⁰¹⁵⁶⁷⁸⁹⁻ⁿ^_]/;

  /* √(...) / √a / |a| 变成 \sqrt{...}，可嵌套 */
  function rootify(t) {
    var out = '', i = 0, n = t.length;
    while (i < n) {
      var c = t.charAt(i);
      if (c !== '√' && c !== '∛') { out += c; i++; continue; }
      var pre = c === '√' ? '\\sqrt' : '\\sqrt[3]';
      var j = i + 1;
      while (j < n && t.charAt(j) === ' ') j++;
      var body = null, next = j;
      if (t.charAt(j) === '(') {
        var d = 0, k = j, closed = false;
        for (; k < n; k++) {
          var ch = t.charAt(k);
          if (ch === '(') d++;
          else if (ch === ')') { d--; if (!d) { k++; closed = true; break; } }
        }
        /* 括号没写完（多半是 elsewhere 截断后剩下的半截式子）：整段进根号，
           让横线照旧画出来，不要退回「√(b²−4ac」这样的原文 */
        if (closed) { body = t.slice(j + 1, k - 1); next = k; }
        else { body = t.slice(j + 1); next = n; }
      } else if (t.charAt(j) === '|') {
        var k2 = t.indexOf('|', j + 1);
        if (k2 < 0) { body = t.slice(j + 1); next = n; }
        else { body = t.slice(j + 1, k2); next = k2 + 1; }
      } else {
        var m = /^[0-9A-Za-z]+/.exec(t.slice(j));
        if (!m) { out += c; i++; continue; }
        body = m[0];
        next = j + body.length;
      }
      out += pre + '{' + rootify(body) + '}';
      i = next;
    }
    return out;
  }

  /* Unicode 数学写法 → LaTeX。只换写法，不改数学含义。 */
  function uni2tex(t) {
    t = rootify(t);
    t = t.replace(/[⁰¹²³⁴⁵⁶⁷⁸⁹ⁿ⁻]+/g, function (m) {
      var s = '';
      for (var i = 0; i < m.length; i++) s += SUP[m.charAt(i)] || '';
      return '^{' + s + '}';
    });
    t = t.replace(/\^\(([^()]*)\)/g, '^{$1}');
    for (var i = 0; i < UNI_MAP.length; i++) t = t.split(UNI_MAP[i][0]).join(UNI_MAP[i][1]);
    return t;
  }

  /* LaTeX 里的保留字符：% & # 会在公式里吃掉后半句，先转义。
     已被反斜杠转义过的（\%）不要重复处理。 */
  function escapeTex(t) {
    return t.replace(/(^|[^\\])([%&#])/g, function (m, p, c) { return p + '\\' + c; });
  }

  /* $ 之外的一段文字：里面可能有 Unicode 数学写法，也可能整段是漏写 $ 的 LaTeX。 */
  function textHtml(t) {
    if (!t) return '';
    if (/\\[a-zA-Z]{2,}/.test(t)) {
      var tex = t.replace(/[\u3400-\u9fff]+/g, function (c) { return '\\text{' + c + '}'; });
      return katexHtml(escapeTex(tex), t, false);
    }
    var out = '', buf = '', i = 0, n = t.length;
    for (; i < n; i++) {
      var c = t.charAt(i);
      if (CJK.test(c)) { out += mathRun(buf); buf = ''; out += esc(c); }
      else buf += c;
    }
    return out + mathRun(buf);
  }

  /* 一段连续的西文/数字：够像公式就渲染，否则原样。首尾空白留在公式外。 */
  function mathRun(run) {
    if (!run) return '';
    var lead = /^\s*/.exec(run)[0], trail = /\s*$/.exec(run)[0];
    var core = run.slice(lead.length, run.length - trail.length);
    if (core.length < 2) return esc(run);
    if (FILLER.test(core)) return esc(run);
    if (!MATHY.test(core) && !(/[=<>]/.test(core) && /[0-9A-Za-z]/.test(core))) return esc(run);
    var tex = escapeTex(uni2tex(core)).trim();
    if (!tex) return esc(run);
    return esc(lead) + katexHtml(tex, core, false) + esc(trail);
  }

  /* 全文渲染入口：$$ 显示式、$ 行内式，其余交给 textHtml。 */
  function mathHtml(s) {
    s = String(s == null ? '' : s);
    var out = [], last = 0, m;
    var re = /\$\$([\s\S]*?)\$\$|\$([^$]*)\$/g;
    while ((m = re.exec(s))) {
      out.push(textHtml(s.slice(last, m.index)));
      if (m[1] != null) out.push(katexHtml(escapeTex(m[1].trim()), m[0], true));
      else out.push(katexHtml(escapeTex(m[2]), m[0], false));
      last = m.index + m[0].length;
    }
    out.push(textHtml(s.slice(last)));
    return out.join('');
  }

  /* 去 LaTeX 的纯文本：用于 chip、列表标题这类不能放公式的位置 */
  function plain(s) {
    s = String(s == null ? '' : s).replace(/\$\$?/g, '');
    s = s.replace(/\\text\{([^{}]*)\}/g, '$1');
    s = s.replace(/\\[a-zA-Z]+/g, ' ');
    s = s.replace(/[{}]/g, ' ');
    return s.replace(/\s+/g, ' ').trim();
  }

  var SYMBOL = {
    times: '×', div: '÷', cdot: '·', pm: '±', mp: '∓', le: '≤', leq: '≤', ge: '≥', geq: '≥',
    ne: '≠', neq: '≠', approx: '≈', equiv: '≡', sim: '∽', cong: '≌', propto: '∝',
    pi: 'π', alpha: 'α', beta: 'β', gamma: 'γ', theta: 'θ', lambda: 'λ', mu: 'μ',
    angle: '∠', triangle: '△', parallel: '∥', perp: '⊥', circ: '°', degree: '°',
    infty: '∞', Rightarrow: '⇒', Leftrightarrow: '⇔', rightarrow: '→', to: '→',
    sum: '∑', prod: '∏', in: '∈', notin: '∉', subset: '⊂', supset: '⊃', cup: '∪', cap: '∩',
    emptyset: '∅', forall: '∀', exists: '∃', therefore: '∴', because: '∵',
    sqrt: '√', int: '∫', partial: '∂', nabla: '∇'
  };

  /* 短标签用的紧凑文本：把行内 LaTeX 压成能塞进 chip / 标题栏的短串。
     和 plain() 的差别是数学含义：plain() 把 \sqrt 整条命令当噪点删掉，
     「√2 约等于 1.41」会变成「2 约等于 1.41」——式子被改写成了另一句话。
     这里保留根号、分数线与常用符号，只丢排版命令。

     注意 tidy() 不是渲染：它给的是「√(12)」这样的纯文本，根号头顶没有
     那条横线，和课本不是一回事。能放 HTML 的地方一律 mathHtml + clipMath，
     只有 canvas 节点标签、SVG text、title 属性这些塞不进 HTML 的位置才用它。 */
  function tidy(s) {
    s = String(s == null ? '' : s).replace(/\$\$?/g, '');
    s = s.replace(/\^\{\\circ\}/g, '°').replace(/\^\\circ/g, '°');
    s = s.replace(/\^\{([^{}]*)\}/g, '^$1').replace(/_\{([^{}]*)\}/g, '_$1');
    for (var i = 0; i < 3; i++) {
      s = s.replace(/\\sqrt\[([^\]]*)\]\{([^{}]*)\}/g, '[$1]√($2)');
      s = s.replace(/\\sqrt\{([^{}]*)\}/g, '√($1)');
      s = s.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, '($1)/($2)');
    }
    s = s.replace(/\\text\{([^{}]*)\}/g, '$1');
    s = s.replace(/\\(left|right|quad|qquad|displaystyle|textstyle)\b/g, '');
    s = s.replace(/\\[,;! ]/g, ' ');
    s = s.replace(/\\[a-zA-Z]+/g, function (t) {
      var k = t.slice(1);
      return Object.prototype.hasOwnProperty.call(SYMBOL, k) ? SYMBOL[k] : ' ';
    });
    s = s.replace(/[{}]/g, ' ');
    return s.replace(/\s+/g, ' ').trim();
  }

  function clip(s, n) {
    s = String(s == null ? '' : s);
    return s.length > n ? s.slice(0, n) + '…' : s;
  }

  /* chip / 按钮上的短标签：截断后不留半截括号。
     直接 clip 会把「2√(6)」切成「2√(6」，看着像根号没写闭。 */
  function clipLabel(s, n) {
    var t = clip(s, n);
    while (t.length && /[（(【《,，、；;：:]$/.test(t)) t = t.slice(0, -1);
    var op = t.lastIndexOf('('), cl = t.lastIndexOf(')');
    if (op > cl) t = t.slice(0, op);
    return t.trim();
  }

  var CLIP_OPEN = { '(': ')', '（': '）', '[': ']', '【': '】', '{': '}', '《': '》' };
  var CLIP_SHUT = { ')': 1, '）': 1, ']': 1, '】': 1, '}': 1, '》': 1 };

  /* 按可见长度截断，但不切断 $...$ 公式：切在 $ 之间会把后半截公式
     变成裸 LaTeX 文本，渲染出来又是源码。截完再交给 mathHtml。

     还有一类半截样子：切在括号或根号里面。22 字切断
     「求根公式 x=[−b±√(b²−4ac)]/(2a)」会剩下「…√(b²−4a」——括号没了右半边，
     根号也就画不出横线。所以先找括号外的分隔符退回去；括号里实在找不到
     断点，就把缺的右括号补齐，宁可尾巴多两个符号也不留半截根号。 */
  function clipMath(s, n) {
    s = String(s == null ? '' : s);
    if (s.length <= n) return s;
    var cut = n, m, re = /\$[^$]*\$/g, spans = [];
    while ((m = re.exec(s))) spans.push([m.index, m.index + m[0].length]);
    for (var i = 0; i < spans.length; i++) {
      if (cut > spans[i][0] && cut < spans[i][1]) { cut = spans[i][0]; break; }
    }
    var stack = [], outer = [], j, ch;
    for (j = 0; j < cut; j++) {
      ch = s.charAt(j);
      if (CLIP_OPEN[ch]) stack.push(j);
      else if (CLIP_SHUT[ch]) { if (stack.length) stack.pop(); }
      if (!stack.length) outer.push(j);
    }
    if (stack.length) {
      var alt = -1;
      for (j = outer.length - 1; j >= 0; j--) {
        if (/[，,、；;。\s]/.test(s.charAt(outer[j])) && outer[j] >= Math.floor(n * 0.6)) { alt = outer[j]; break; }
      }
      if (alt > 0) return s.slice(0, alt).replace(/[\s，、；：]+$/, '') + '…';
      /* 分隔符也找不到时，宁可整段公式不要，也不补一串右括号：
         顶栏出现「求根公式 x=[−b±b²−4a…)]」这种半截式子，比少半句更难看。
         退到最外层开括号之前，顺带清掉悬空的 √ ± = 这些没配完的符号。 */
      if (stack[0] > 0 && stack[0] >= Math.floor(n * 0.35)) {
        return s.slice(0, stack[0]).replace(/[\s，、；：（\[【{《√∛±×÷+=−-]+$/, '') + '…';
      }
      var tail = '';
      for (j = stack.length - 1; j >= 0; j--) tail += CLIP_OPEN[s.charAt(stack[j])];
      return s.slice(0, cut).replace(/[\s，、；：]+$/, '') + '…' + tail;
    }
    return s.slice(0, cut).replace(/[\s，、；：]+$/, '') + '…';
  }

/* 公式自检：把渲染器真会吃进去的每一段都渲染一遍，报出问题。
     页面可疑处（dev 工具）与 tools/math_text_check.js 共用这一份判据，两边规则不漂移。
     kind: dollar（$ 没配对）/ parse（KaTeX 解析不了）/ cjk（公式里裸中文）/ empty / bare（漏写 $ 的 LaTeX） */
  var CJK_HAN = /[\u3400-\u9fff]/;
  /* JSON 里 LaTeX 只写一个反斜杠时，解析器会把它当转义符吃掉：
     \f → 换页符、\t → 制表符、\b → 退格。于是 $\frac1x$ 变成 $<FF>rac1x$，
     KaTeX 报 Unexpected character，页面上就是半截乱码。这里先把它抓出来。 */
  var CTRL_CH = /[\u0008\u000c\u0009]/;
  /* 反斜杠被整颗丢掉的情况：$sqrt{6}$、$sqrt a$、\sqrtAB。
     只在公式体内找，且要求后面紧跟 { ( 或空格+字母，避免把普通英文单词当命令。 */
  var LOST_CMD = /(^|[^\\a-zA-Z])(sqrt|frac|triangle|angle|cdot|times|div|leq|geq|neq|pm|infty)(\s*[{(]|\s+[a-zA-Z])/;
  function ctrlShow(t) {
    return String(t).replace(/[\u0000-\u001f]/g, function (c) {
      return '<' + ({ '\u0008': 'BS', '\u0009': 'TAB', '\u000c': 'FF' }[c] || ('U+' + ('000' + c.charCodeAt(0).toString(16)).slice(-4))) + '>';
    });
  }
  function mathCheck(s) {
    s = String(s == null ? '' : s);
    var probs = [], m;
    if (CTRL_CH.test(s)) {
      var ci = s.search(CTRL_CH);
      probs.push({
        kind: 'ctrl',
        frag: ctrlShow(s.slice(Math.max(0, ci - 12), ci + 16)),
        msg: '出现控制字符（换页/制表/退格）：JSON 里的 LaTeX 只写了一个反斜杠，被当成转义符吃掉了，要写两个'
      });
    }
    var seen = s.replace(/\\\$/g, '');
    if (((seen.match(/\$\$/g) || []).length) % 2) probs.push({ kind: 'dollar', frag: '$$', msg: '$$ 没有配对' });
    if ((((seen.replace(/\$\$/g, '')).match(/\$/g) || []).length) % 2) probs.push({ kind: 'dollar', frag: '$', msg: '$ 没有配对' });
    var re = /\$\$([\s\S]*?)\$\$|\$([^$]*)\$/g;
    while ((m = re.exec(s))) {
      var body = m[1] != null ? m[1].trim() : m[2];
      if (!body) { probs.push({ kind: 'empty', frag: m[0], msg: '空公式' }); continue; }
      if (CJK_HAN.test(body.replace(/\\text\{[^{}]*\}/g, ''))) {
        probs.push({ kind: 'cjk', frag: m[0].slice(0, 40), msg: '公式里混了中文，要用 \\text{} 包住' });
      }
      var lm = LOST_CMD.exec(body);
      if (lm) {
        probs.push({ kind: 'lost', frag: m[0].slice(0, 40), msg: '命令缺反斜杠：应写成 \\' + lm[2] });
      }
      if (!K) continue;
      try {
        K.renderToString(escapeTex(body), { throwOnError: true, displayMode: m[1] != null, output: 'html', strict: false });
      } catch (e) {
        probs.push({ kind: 'parse', frag: m[0].slice(0, 40), msg: String((e && e.message) || e).split('\n')[0] });
      }
    }
    var bare = s.replace(/\$\$[\s\S]*?\$\$|\$[^$]*\$/g, '');
    if (/\\[a-zA-Z]{2,}/.test(bare)) {
      var tex = bare.replace(/[\u3400-\u9fff]+/g, function (c) { return '\\text{' + c + '}'; });
      if (K) {
        try {
          K.renderToString(escapeTex(tex), { throwOnError: true, output: 'html', strict: false });
        } catch (e) {
          probs.push({ kind: 'bare', frag: bare.slice(0, 40), msg: '漏写 $，整段当公式渲染时出错：' + String((e && e.message) || e).split('\n')[0] });
        }
      } else {
        probs.push({ kind: 'bare', frag: bare.slice(0, 40), msg: 'LaTeX 命令没放进 $…$' });
      }
    }
    return probs;
  }

  function firstSentence(s, max) {
    s = String(s == null ? '' : s).trim();
    var i = s.indexOf('。');
    var cut = i > 0 ? s.slice(0, i + 1) : s;
    if (cut.length > (max || 60)) cut = cut.slice(0, max || 60) + '…';
    return cut;
  }

  /* 题库存的答案带着编号和栏目名（「6.【答】选 D。解析：…」），原样印出来像草稿。
     这条清洗原来只写在 practice.js 里，于是知识点详解（map.js）与章节页（section.js）
     各自直接把 it.ans 印出来，界面上真的露出过「1.【答】」。收到 core 里由大家共用。 */
  function ansText(a) {
    return String(a == null ? '' : a)
      .replace(/^\s*\d+\s*[.、．]\s*/, '')
      .replace(/【答】/g, '')
      .replace(/^\s*解析[:：]\s*/, '')
      .trim();
  }

  function toast(msg) {
    var t = document.getElementById('toast');
    if (!t) return;
    t.textContent = msg;
    t.classList.add('on');
    clearTimeout(t._h);
    t._h = setTimeout(function () { t.classList.remove('on'); }, 1900);
  }

  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  function pct(n, d) { return d ? Math.round((n / d) * 100) : 0; }
  function pad(n) { return (n < 10 ? '0' : '') + n; }
  function stamp(d) {
    d = d || new Date();
    return '' + d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) + '-' + pad(d.getHours()) + pad(d.getMinutes());
  }
  function mmss(ms) {
    var t = Math.max(0, Math.round(ms / 1000));
    return Math.floor(t / 60) + ':' + pad(t % 60);
  }

  /* 知识点标题的两种写法：
     ① 只有名词  "三角形的定义：…"
     ② 名词：释义  "不等式：用不等号（>、<、≥、≤、≠）连接表示不等关系的式子"
     没有 detail 侧车时，第 ② 种的「释义」本身就是定义，拆出来当定义用，不要只显示"只有标题"。 */
  /* Question scoring steps are {c, p}. Method steps are {ordinal, action}.
     A card that reads only action prints the index twice and no sentence,
     because the ordered list and the fallback index are the same number.
     When the written note was later split out of the answer, the last
     criterion may still end with that note; cut it so the note is not shown twice. */
  function stepBodies(steps, note) {
    var key = String(note || '').trim();
    key = key.length >= 8 ? key.slice(0, 15) : '';
    return (steps || []).map(function (s) {
      var body = String((s && (s.c || s.action || s.text)) || '').trim();
      if (key && body.indexOf(key) >= 0) {
        var cut = body.slice(0, body.indexOf(key)).replace(/[。；;，,\s]+$/, '').trim();
        if (cut.length >= 6) body = cut;
      }
      return { body: body, p: s ? s.p : null };
    }).filter(function (x) { return x.body; });
  }

  function kpText(k) {
    var name = String((k && k.name) || '').trim();
    var def = String((k && k.definition) || '').trim();
    if (def) return { name: name, def: def, fromTitle: false };
    var i = name.search(/[：:]/);
    if (i > 1 && i < name.length - 6) {
      return { name: name.slice(0, i).trim(), def: name.slice(i + 1).trim(), fromTitle: true };
    }
    return { name: name, def: '', fromTitle: false };
  }

  var BAND_CN = { basic: '基础', standard: '中档', advanced: '提高', challenge: '挑战', competition: '竞赛' };
  /* 题目用途：参考产品用五类回答「为什么这里有这道题」。我们只标有证据的，
     没证据不写（it.purpose 为空时前端不显示），不在界面上猜。 */
  var PURPOSE_CN = { method_contrast: '方法对照', definition: '概念辨析', example: '教材原题', method_apply: '方法应用', context: '情境应用' };
  var GRADE_CN = { 7: '七年级', 8: '八年级', 9: '九年级' };
  var TERM_CN = { 1: '上册', 2: '下册' };
  /* 知识点类型：数据里是英文枚举（kp_type），界面直接摆出来孩子看不懂。
     这张表原来只藏在 map.js 里，section 页漏了一处，所以提到 core 共享。 */
  var KPT_CN = {
    concept: '概念', theorem: '定理', property: '性质', skill: '技能', method: '方法',
    formula: '公式', representation: '表示法', fact: '事实', model: '模型',
    context: '情境', activity: '活动'
  };
  /* 错因大类：数据里有 8 类（content/misconceptions 实测全集），
     原来 map.js 的 MCAT_CN 只写了 4 类，另外 4 类原样漏成英文。 */
  var MCAT_CN = {
    concept: '概念理解', prerequisite_missing: '前置缺失', method_choice: '方法选择',
    step_logic: '步骤逻辑', computation_symbol: '运算符号', reading_modeling: '读题建模',
    expression: '书写规范', guess_overconfidence: '猜测过度自信'
  };

  /* 「跳过」和「交白卷」在记录层是不同的 how（skip vs letter-blank / spec-blank），
     但消费层原来全写成一个「没做」，孩子明明交过卷却被说成没遇到这道题。
     这一处把口径统一起来，界面按 kind 说不同的话。 */
  function blankKind(rec) {
    if (!rec || rec.final !== 'blank') return '';
    return String(rec.how || '') === 'skip' ? 'skip' : 'empty';
  }

  /* 判不了（manual）的题交卷后孩子会点「我做对了 / 我做错了」，记录里
     final 被改成 correct/wrong、并带 self 字段。这类「自己定的」结论不是判题器给的：
     不算独立做对、不进「已掌握」、不进会做率分子。界面与统计都走这一个判据。 */
  function selfJudged(rec) {
    if (!rec) return '';
    if (!manualHow(rec)) return '';
    var s = String(rec.self || '');
    return (s === 'correct' || s === 'wrong') ? s : '';
  }
  /* 「判不了」这一族的记录：判题器自己没下结论（how 是 manual / letter-manual /
     spec-manual）。孩子后来点的「我做对了」只改 final，不改这条出身。
     统计里凡「独立做对 / 已掌握 / 会做率」都必须先排掉它。 */
  function manualHow(rec) {
    if (!rec) return false;
    return /(^|-)manual$/.test(String(rec.how || ''));
  }

  MC.core = {
    blankKind: blankKind, selfJudged: selfJudged, manualHow: manualHow,
    esc: esc, mathHtml: mathHtml, mathCheck: mathCheck, mathFails: mathFails, fillerTex: fillerTex, plain: plain, tidy: tidy, clip: clip, clipLabel: clipLabel, clipMath: clipMath, firstSentence: firstSentence, ansText: ansText,
    stepBodies: stepBodies,
    kpText: kpText,
    toast: toast, qs: qs, qsa: qsa, pct: pct, stamp: stamp, mmss: mmss,
    BAND_CN: BAND_CN, PURPOSE_CN: PURPOSE_CN, GRADE_CN: GRADE_CN, TERM_CN: TERM_CN,
    KPT_CN: KPT_CN, MCAT_CN: MCAT_CN, hasKatex: !!K
  };
})();
