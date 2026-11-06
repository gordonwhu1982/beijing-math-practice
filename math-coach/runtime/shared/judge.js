/* math-coach 判题：L0 规范化 / L1 数值精确 / L2 多值无序。
   铁律：判不准就 manual，绝不假判 correct，也绝不把 manual 当 wrong。
   返回 { verdict: 'correct'|'wrong'|'manual'|'blank', how: 'exact'|'bag'|'manual', refTokens, stuTokens } */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.MCJudge = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var CN_DIGIT = { '零': 0, '〇': 0, '一': 1, '二': 2, '两': 2, '三': 3, '四': 4, '五': 5, '六': 6, '七': 7, '八': 8, '九': 9 };
  var CN_UNIT = { '十': 10, '百': 100, '千': 1000 };

  function cnToNumber(s) {
    if (!s) return null;
    if (s === '十') return 10;
    var total = 0, section = 0, num = 0, seen = false;
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (CN_DIGIT[ch] !== undefined) { num = CN_DIGIT[ch]; seen = true; }
      else if (CN_UNIT[ch] !== undefined) {
        var u = CN_UNIT[ch];
        section += (num === 0 ? 1 : num) * u; num = 0; seen = true;
      } else return null;
    }
    if (!seen) return null;
    return total + section + num;
  }

  // 去噪：单位、度、量词、答案前缀、空白、全角
  function normalize(s) {
    if (s === null || s === undefined) return '';
    var t = String(s).normalize ? String(s).normalize('NFKC') : String(s);
    t = t.replace(/[\u200b-\u200d\ufeff]/g, '');
    t = t.replace(/[−–—]/g, '-').replace(/[×✕]/g, '*').replace(/[÷∕]/g, '/');
    /* 全角关系符要归一成 ASCII，否则学生照书上写「x≠3」时下面的 parseRel 一条都匹配不到。
       顺序：先 ≠（含 ≦ ≧ 变体），再 ≤ ≥，最后 ≈，避免被 '<' '>' 先吃掉一半。 */
    t = t.replace(/[≠]/g, '!=').replace(/[≤≦]/g, '<=').replace(/[≥≧]/g, '>=').replace(/[≈≃]/g, '=');
    t = t.replace(/\$/g, ' ');
    t = t.replace(/\\left|\\right|\\!|\\,|\\;|\\ /g, ' ');
    t = t.replace(/\\text\s*\{([^{}]*)\}/g, ' $1 ');
    t = t.replace(/\\dfrac|\\tfrac|\\frac/g, '\\frac');
    t = t.replace(/\\frac\s*\{([^{}]*)\}\s*\{([^{}]*)\}/g, '($1)/($2)');
    t = t.replace(/\\sqrt\s*\{([^{}]*)\}/g, 'sqrt($1)');
    t = t.replace(/\\circ|\\degree|°/g, '');
    t = t.replace(/\\times/g, '*').replace(/\\div/g, '/');
    t = t.replace(/\\pi/g, 'pi').replace(/\\angle|\\triangle|\\perp|\\parallel|\\cong|\\sim/g, ' ');
    /* 关系符：长的必须排在前面。原来写成 (gt|lt|ge|le|geq|leq|ne|neq)，
       正则从左往右试，\neq 先命中 \ne 再剩一个 q，答案就成了「!=q」；
       \geq 同理成「>=q」。这条 bug 让所有含不等号的答案一律判不了。 */
    t = t.replace(/\\(geq|leq|neq|gt|lt|ge|le|ne)/g, function (m, p) {
      return ({ gt: '>', lt: '<', ge: '>=', le: '<=', geq: '>=', leq: '<=', ne: '!=', neq: '!=' })[p] || ' ';
    });
    /* \gt{} 这类写法替换后会留下 {}，变成垃圾 token；\pm 要留住正负号 */
    t = t.replace(/\{\}/g, ' ');
    t = t.replace(/\\pm/g, '\u00b1');
    t = t.replace(/\\(Rightarrow|Longrightarrow|rightarrow|to)/g, '=>');
    t = t.replace(/\\(Leftrightarrow|leftrightarrow)/g, '<=>');
    t = t.replace(/(答案|答|解|结果|结论)\s*[:：]/g, ' ');
    t = t.replace(/(平方厘米|平方分米|平方米|立方厘米|立方分米|立方米|厘米|分米|毫米|千米|米|克|千克|公斤|吨|分钟|小时|秒|元|个|条|只|度|次|人|件|页|题)/g, ' ');
    t = t.replace(/[，、;；]/g, ',');
    t = t.replace(/[（]/g, '(').replace(/[）]/g, ')');
    t = t.replace(/[\[\]【】]/g, ' ');
    t = t.replace(/\s+/g, ' ').trim();
    return t;
  }

  function toRational(tok) {
    var t = tok.trim().replace(/\s+/g, '');
    if (!t) return null;
    t = t.replace(/[()]/g, '');
    if (!t) return null;
    // 带分数 1又1/2 或 1 1/2
    var m = t.match(/^(-?\d+)(?:又|\s)(\d+)\/(\d+)$/);
    if (m) {
      var whole = parseInt(m[1], 10), num = parseInt(m[2], 10), den = parseInt(m[3], 10);
      if (!den) return null;
      var sign = whole < 0 ? -1 : 1;
      return { n: sign * (Math.abs(whole) * den + num), d: den };
    }
    m = t.match(/^(-?\d+(?:\.\d+)?)\/(-?\d+(?:\.\d+)?)$/);
    if (m) {
      var a = m[1], b = m[2];
      var an = Number(a), bn = Number(b);
      if (!isFinite(an) || !isFinite(bn) || bn === 0) return null;
      if (a.indexOf('.') >= 0 || b.indexOf('.') >= 0) {
        var fa = fracFromDecimal(a), fb = fracFromDecimal(b);
        if (!fa || !fb) return null;
        return { n: fa.n * fb.d, d: fa.d * fb.n === 0 ? 0 : fa.d * fb.n };
      }
      return { n: an, d: bn };
    }
    // 中文分数：「二分之一」= 1/2，「三分之五」= 5/3
    m = t.match(/^(.+?)分之(.+)$/);
    if (m) {
      var den = /^\d+$/.test(m[1]) ? parseInt(m[1], 10) : cnToNumber(m[1]);
      var num = /^\d+$/.test(m[2]) ? parseInt(m[2], 10) : cnToNumber(m[2]);
      if (den && num !== null && num !== undefined) return reduce({ n: num, d: den });
    }
    m = t.match(/^(-?\d+(?:\.\d+)?)%$/);
    if (m) return divRational(fracFromDecimal(m[1]), { n: 100, d: 1 });
    if (/^-?\d+$/.test(t)) return { n: parseInt(t, 10), d: 1 };
    if (/^-?\d*\.\d+$/.test(t)) return fracFromDecimal(t);
    var cn = cnToNumber(t);
    if (cn !== null) return { n: cn, d: 1 };
    return null;
  }

  function fracFromDecimal(s) {
    var neg = s[0] === '-';
    var body = neg ? s.slice(1) : s;
    var dot = body.indexOf('.');
    if (dot < 0) return { n: parseInt(body, 10) * (neg ? -1 : 1), d: 1 };
    var intPart = body.slice(0, dot) || '0';
    var fracPart = body.slice(dot + 1);
    var d = Math.pow(10, fracPart.length);
    var n = parseInt(intPart + fracPart, 10);
    if (!isFinite(n) || !isFinite(d) || d === 0) return null;
    return { n: neg ? -n : n, d: d };
  }

  function divRational(x, y) {
    if (!x || !y || y.n === 0) return null;
    return reduce({ n: x.n * y.d, d: x.d * y.n });
  }

  function gcd(a, b) { a = Math.abs(a); b = Math.abs(b); while (b) { var t = a % b; a = b; b = t; } return a || 1; }
  function reduce(r) {
    if (!r || r.d === 0) return null;
    var g = gcd(r.n, r.d);
    var n = r.n / g, d = r.d / g;
    if (d < 0) { n = -n; d = -d; }
    return { n: n, d: d };
  }
  function ratEq(x, y) {
    if (!x || !y) return false;
    var a = reduce(x), b = reduce(y);
    if (!a || !b) return false;
    return a.n === b.n && a.d === b.d;
  }

  // 切分成 token：括号内的逗号保留（元组），其余逗号切分
  function splitTokens(s) {
    var out = [], buf = '', depth = 0;
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (ch === '(') depth++;
      if (ch === ')') depth = Math.max(0, depth - 1);
      if (depth === 0 && /[,\s]/.test(ch)) {
        if (buf.trim()) out.push(buf.trim());
        buf = '';
      } else buf += ch;
    }
    if (buf.trim()) out.push(buf.trim());
    return out;
  }

  function tokensOf(text) {
    var t = normalize(text);
    if (!t) return [];
    var raw = splitTokens(t);
    var out = [];
    for (var i = 0; i < raw.length; i++) {
      var tok = raw[i];
      var inner = tok.replace(/^\(|\)$/g, '');
      var parts = inner.split(',');
      if (parts.length > 1) {
        for (var j = 0; j < parts.length; j++) out.push(parts[j].trim());
      } else out.push(tok);
    }
    return out.filter(function (x) { return x !== ''; });
  }

  // 从参考答案里抽「结论段」候选：优先 结论/答/解 之后，其次整段
  var CONCLUDE = /(答案|所以|故|因此|即|综上|从而|可得|答\s*[:：])/;
  var HAS_NUM = /[0-9零一二三四五六七八九十百两千]/;

  function sentences(t) {
    var out = [], re = /[^。！？；]*[。！？；]?/g, m;
    while ((m = re.exec(t))) {
      var seg = m[0].trim();
      if (seg) out.push(seg);
      if (m.index === re.lastIndex) re.lastIndex++;
    }
    return out;
  }

  /* 结论句：答案常把结论写在最后一句（「所以……是 5」），只取第一句会漏掉。
     只在同时满足三条时才采用，宁可不用也不要抽错：
       ① 该句含收束词（答案/所以/故/因此/即/综上/从而/可得/答：）
       ② 该句含数字
       ③ 该句不超过 120 字 */
  function conclusionSentence(t) {
    var segs = sentences(t);
    for (var i = segs.length - 1; i >= 0; i--) {
      var seg = segs[i];
      if (seg.length > 120) continue;
      if (!CONCLUDE.test(seg)) continue;
      if (!HAS_NUM.test(seg)) continue;
      return trimExplanatoryParen(seg);
    }
    return '';
  }

  function answerCandidates(answer) {
    var t = String(answer || '');
    if (!t) return '';
    t = t.replace(/^\s*\d+\s*[.、]\s*/, ' ');
    t = t.replace(/【\s*(解|答|分析|详解|点睛|思路|证明)\s*】/g, ' ');
    var cut = t.search(/步骤\s*\d|详\s*解|分\s*析\s*[:：]|点\s*睛|思\s*路\s*[:：]/);
    if (cut > 0) t = t.slice(0, cut);
    var stop = t.indexOf('。');
    var head = stop > 0 ? t.slice(0, stop) : t;
    head = trimExplanatoryParen(head);
    head = head.replace(/\\^/g, ' ').replace(/\\s+/g, ' ').trim();
    // 首句里根本没有数：才退回结论句（兜底，不抢原有路径）
    if (!HAS_NUM.test(head)) {
      var concl = conclusionSentence(t);
      if (concl) return concl.replace(/\\^/g, ' ').replace(/\\s+/g, ' ').trim();
    }
    return head || String(answer || '');
  }

  var EXPLAIN_MARK = ['由', '因为', '所以', '时', '不成立', '即', '故', '所以', '根据', '设'];
  function trimExplanatoryParen(s) {
    for (var i = 0; i < s.length; i++) {
      var ch = s[i];
      if (ch !== '(' && ch !== '（') continue;
      var tail = s.slice(i + 1, i + 24);
      var hit = false;
      for (var k = 0; k < EXPLAIN_MARK.length; k++) {
        if (tail.indexOf(EXPLAIN_MARK[k]) >= 0) { hit = true; break; }
      }
      if (hit) return s.slice(0, i);
    }
    return s;
  }

  /* ---------- L3 关系式：变量 + 关系 + 值 ----------
     八上很多答案长这样：「x≠3」「x=±1」「x≠0 且 x≠-1」。这类答案在数值路径上
     一个可比 token 都没有（字母式一律被当成不可比），所以老路径永远 manual。
     这里只在两侧都认成同一种形状时才判；形状不同就交回老路径——宁可 manual，不猜。 */
  function parseRel(text) {
    var t = normalize(text || '').replace(/\s+/g, '');
    if (!t || !/[<>=!]/.test(t)) return null;
    var chunks = t.split(/(?:\u4e14|\u5e76\u4e14|,)+/).filter(function (x) { return x; });
    if (!chunks.length) return null;
    var res = {};
    for (var i = 0; i < chunks.length; i++) {
      var m = chunks[i].match(/^([a-zA-Z])(<=|>=|!=|=|<|>)(.+)$/);
      if (!m) return null;
      var v = m[1], op = m[2], rest = m[3];
      var segs = rest.split(/\u6216/);
      var vals = [];
      for (var k = 0; k < segs.length; k++) {
        var seg = segs[k];
        var pm = seg.match(/^\u00b1(.+)$/);
        if (pm) {
          var r0 = toRational(pm[1]);
          if (!r0) return null;
          var rr = reduce(r0);
          vals.push({ n: -rr.n, d: rr.d }, rr);
        } else {
          var r = toRational(seg);
          if (!r) return null;
          vals.push(reduce(r));
        }
      }
      res[v] = res[v] || { eq: {}, neq: {}, ineq: {} };
      if (op === '=' || op === '!=') {
        var bucket = (op === '=') ? res[v].eq : res[v].neq;
        for (var q = 0; q < vals.length; q++) bucket[vals[q].n + '/' + vals[q].d] = 1;
      } else {
        if (vals.length !== 1) return null;
        if (Object.keys(res[v].ineq).length) return null;  /* 双边区间不支持，交回老路径 */
        res[v].ineq[op] = vals[0].n + '/' + vals[0].d;
      }
    }
    return res;
  }

  function relKey(g) {
    var out = [];
    for (var v in g) {
      var eq = Object.keys(g[v].eq).sort(), ne = Object.keys(g[v].neq).sort();
      var inq = Object.keys(g[v].ineq).sort().map(function (op) { return op + g[v].ineq[op]; });
      out.push(v + '|eq:' + eq.join(',') + '|ne:' + ne.join(',') + '|in:' + inq.join(','));
    }
    return out.sort().join(';');
  }

  /* 形状相同 = 同一个变量、同一类约束、同一个数目的取值：这时值不同才敢说 wrong */
  function relSameShape(a, b) {
    var va = Object.keys(a).sort().join(','), vb = Object.keys(b).sort().join(',');
    if (!va || va !== vb) return false;
    for (var v in a) {
      if (Object.keys(a[v].eq).length !== Object.keys(b[v].eq).length) return false;
      if (Object.keys(a[v].neq).length !== Object.keys(b[v].neq).length) return false;
      if (Object.keys(a[v].ineq).sort().join(',') !== Object.keys(b[v].ineq).sort().join(',')) return false;
    }
    return true;
  }

  /* 单变量、只有一个等号解的时候，学生只写数值也认（答案 x=2，学生写 2） */
  function relSingle(g) {
    var vs = Object.keys(g);
    if (vs.length !== 1) return null;
    var it = g[vs[0]];
    var eq = Object.keys(it.eq);
    if (eq.length !== 1 || Object.keys(it.neq).length || Object.keys(it.ineq).length) return null;
    var ab = eq[0].split('/');
    return { n: Number(ab[0]), d: Number(ab[1]) };
  }

  function relJudge(refAnswer, stuAnswer) {
    var refTxt = answerCandidates(refAnswer);
    var a = parseRel(refTxt);
    if (!a) return null;
    var b = parseRel(stuAnswer);
    if (!b) {
      var one = relSingle(a);
      var stuOne = toRational(normalize(stuAnswer || ''));
      if (one && stuOne) {
        if (ratEq(one, stuOne)) {
          return { verdict: 'correct', how: 'rel', refTokens: [refTxt], stuTokens: [String(stuAnswer)] };
        }
        /* 答案只有唯一一个解（x=2），学生也交了一个干净的数值却不相等，那就是错。
           若学生交的不是纯数值（含多值、含未知写法），toRational 会给 null，走上面的 return null。 */
        return { verdict: 'wrong', how: 'rel', refTokens: [refTxt], stuTokens: [String(stuAnswer)] };
      }
      return null;
    }
    if (relKey(a) === relKey(b)) return { verdict: 'correct', how: 'rel', refTokens: [refTxt], stuTokens: [String(stuAnswer)] };
    if (relSameShape(a, b)) return { verdict: 'wrong', how: 'rel', refTokens: [refTxt], stuTokens: [String(stuAnswer)] };
    return null;
  }

  function judge(refAnswer, stuAnswer) {
    var stu = normalize(stuAnswer);
    if (!stu) return { verdict: 'blank', how: 'exact', refTokens: [], stuTokens: [] };
    var stuToks = tokensOf(stuAnswer);
    var stuRats = stuToks.map(toRational);
    var anyBad = stuRats.some(function (r) { return !r; });

    /* 关系式先试：x=2 / x!=3 这类答案在数值路径上一个可比 token 都没有 */
    var rel = relJudge(refAnswer, stuAnswer);
    if (rel) return rel;

    var refSrc = answerCandidates(refAnswer);
    var refToks = tokensOf(refSrc).filter(function (x) { return /[0-9零一二三四五六七八九十百两千]/.test(x); });
    var refRats = refToks.map(toRational);

    if (!refToks.length) return { verdict: 'manual', how: 'manual', refTokens: [], stuTokens: stuToks };

    if (anyBad) {
      // 学生答案含非数值 token（如 (2,4,4) 之外的字母式）：只在参考侧也含文字时给 manual
      return { verdict: 'manual', how: 'manual', refTokens: refToks, stuTokens: stuToks };
    }

    // 单值对单值：可以给 wrong
    if (stuRats.length === 1 && refRats.length === 1 && refRats[0]) {
      return { verdict: ratEq(stuRats[0], refRats[0]) ? 'correct' : 'wrong', how: 'exact', refTokens: refToks, stuTokens: stuToks };
    }

    // 多值：多重集完全相等才 correct；其余一律 manual（宁可不判，不可假判）
    if (refRats.every(Boolean) && stuRats.length === refRats.length) {
      var used = new Array(refRats.length).fill(false);
      var ok = true;
      for (var i = 0; i < stuRats.length; i++) {
        var hit = -1;
        for (var j = 0; j < refRats.length; j++) {
          if (!used[j] && ratEq(stuRats[i], refRats[j])) { hit = j; break; }
        }
        if (hit < 0) { ok = false; break; }
        used[hit] = true;
      }
      if (ok) return { verdict: 'correct', how: 'bag', refTokens: refToks, stuTokens: stuToks };
    }
    return { verdict: 'manual', how: 'manual', refTokens: refToks, stuTokens: stuToks };
  }


  /* ---------- 结构化答案（answer_spec）优先判题 ----------
     有 spec 时按 spec 判：类型明确才敢给 wrong；类型不符或值不可比一律 manual。
     spec 字段见 tools/answer_spec_build.py：{type, values:[{raw,num,kind}], order_policy, var, low/high/low_closed/high_closed} */
  var JYES = ['能', '可以', '行', '成立', '正确', '对', '是', '能构成', '可以构成', '全等', '相似'];
  var JNO = ['不能', '不可以', '不行', '不成立', '不正确', '不对', '有误', '错', '不是', '不能构成', '不全等', '不相似', '不'];

  function hitWord(t, arr) {
    for (var i = 0; i < arr.length; i++) if (t.indexOf(arr[i]) >= 0) return arr[i];
    return null;
  }
  function groupOf(t) {
    if (hitWord(t, JNO)) return 'no';   // 先判否定：'不是' 里含 '是'，'不全等' 里含 '全等'
    if (hitWord(t, JYES)) return 'yes';
    return null;
  }

  function plainText(s) {
    return normalize(s).replace(/[\s,。;；!?！？]/g, '');
  }

  function parseIntervalText(s) {
    var t = String(s || '').replace(/[\s\u3000]/g, '');
    t = t.replace(/[≤]/g, '<=').replace(/[≥]/g, '>=').replace(/[＜]/g, '<').replace(/[＞]/g, '>');
    var m = t.match(/^(-?\d+(?:\.\d+)?)?(<=|<)([A-Za-z][A-Za-z0-9']*)(<=|<)(-?\d+(?:\.\d+)?)$/);
    if (m) {
      return { lo: m[1] === undefined ? null : Number(m[1]), loClosed: m[2] === '<=', varName: m[3],
               hiClosed: m[4] === '<=', hi: Number(m[5]) };
    }
    m = t.match(/^([A-Za-z][A-Za-z0-9']*)(>=|>)(-?\d+(?:\.\d+)?)$/);
    if (m) return { lo: Number(m[3]), loClosed: m[2] === '>=', varName: m[1], hi: null, hiClosed: false };
    m = t.match(/^([A-Za-z][A-Za-z0-9']*)(<=|<)(-?\d+(?:\.\d+)?)$/);
    if (m) return { lo: null, loClosed: false, varName: m[1], hiClosed: m[2] === '<=', hi: Number(m[3]) };
    return null;
  }

  /* 学生答案末尾的单位：22 cm / 60 度 / 5 个 —— 只剥末尾，不动中间 */
  var UNIT_TAIL = /[\s\u3000]*(平方厘米|平方毫米|平方米|平方分米|厘米|毫米|分米|千米|米|度|°|元|个|条|只|次|人|件|页|cm2|cm\^2|m2|m\^2|cm|mm|dm|km|kg|ml)$/i;
  function stripUnitTail(s) {
    var t = String(s == null ? '' : s).trim();
    for (var i = 0; i < 2; i++) t = t.replace(UNIT_TAIL, '').trim();
    return t;
  }

  function numOfValue(v) {
    if (!v) return null;
    if (typeof v.num === 'number' && isFinite(v.num)) return toRational(String(v.num));
    return toRational(String(v.raw == null ? '' : v.raw));
  }

  function judgeWithSpec(spec, refAnswer, stuAnswer) {
    var stu = stuAnswer == null ? '' : String(stuAnswer).trim();
    var type = spec && spec.type;
    if (!stu) return { verdict: 'blank', how: 'spec-blank', specType: type || null };
    if (!type || type === 'unknown' || type === 'none') return judge(refAnswer, stuAnswer);
    if (type === 'proof' || type === 'relation') {
      return { verdict: 'manual', how: 'spec-manual', specType: type };
    }

    if (type === 'exact_value') {
      var want = (spec.values || [])[0];
      /* 文本型唯一答案：选项字母（A/B/C/D）与比值（2:1）这类 */
      if (want && want.kind === 'text') {
        var wtxt = plainText(want.raw), stxt = plainText(stripUnitTail(stu));
        if (!wtxt || !stxt) return { verdict: 'manual', how: 'spec-manual', specType: type };
        if (wtxt === stxt) return { verdict: 'correct', how: 'spec-exact', specType: type };
        var single = function (x) { return x.length === 1 && /^[A-Da-d]$/.test(x); };
        if (single(wtxt) && single(stxt)) {
          return { verdict: wtxt.toUpperCase() === stxt.toUpperCase() ? 'correct' : 'wrong',
                   how: 'spec-exact', specType: type };
        }
        return { verdict: 'manual', how: 'spec-manual', specType: type };
      }
      var wr = numOfValue(want);
      if (!wr) return { verdict: 'manual', how: 'spec-manual', specType: type };
      var toks = tokensOf(stripUnitTail(stu));
      if (toks.length !== 1) return { verdict: 'manual', how: 'spec-manual', specType: type };
      var sr = toRational(toks[0]);
      if (!sr) return { verdict: 'manual', how: 'spec-manual', specType: type };
      return { verdict: ratEq(sr, wr) ? 'correct' : 'wrong', how: 'spec-exact', specType: type };
    }

    if (type === 'value_set') {
      var wantVals = spec.values || [];
      if (!wantVals.length) return { verdict: 'manual', how: 'spec-manual', specType: type };
      /* 全是文字的多空答案（「钝角,直角,锐角」「BD,AC」）：
         多重集完全相等才 correct，其余一律 manual —— 学生换个说法也是对的，不能判错 */
      var allText = wantVals.length > 0, ti0;
      for (ti0 = 0; ti0 < wantVals.length; ti0++) if (!wantVals[ti0] || wantVals[ti0].kind !== 'text') allText = false;
      if (allText) {
        var stT = tokensOf(stripUnitTail(stu)).map(plainText);
        var wtT = wantVals.map(function (v) { return plainText(v.raw); });
        if (stT.length !== wtT.length) return { verdict: 'manual', how: 'spec-manual', specType: type };
        var pool = wtT.slice(), hitAll = true, k;
        for (k = 0; k < stT.length; k++) {
          var idx = pool.indexOf(stT[k]);
          if (idx < 0) { hitAll = false; break; }
          pool.splice(idx, 1);
        }
        return { verdict: hitAll ? 'correct' : 'manual', how: hitAll ? 'spec-set' : 'spec-manual', specType: type };
      }
      /* 多空题里可能混着文字空（如「直角」+「90」）：有序时逐位比，数值位比数值、文字位比文字 */
      var hasText = false, ti;
      for (ti = 0; ti < wantVals.length; ti++) if (wantVals[ti] && wantVals[ti].kind === 'text') hasText = true;
      if (hasText) {
        if (spec.order_policy !== 'ordered') return { verdict: 'manual', how: 'spec-manual', specType: type };
        var tk = tokensOf(stripUnitTail(stu));
        if (tk.length !== wantVals.length) return { verdict: 'manual', how: 'spec-manual', specType: type };
        var bad = false, eqAll = true;
        for (ti = 0; ti < wantVals.length; ti++) {
          var wv = wantVals[ti] || {};
          if (wv.kind === 'text') {
            var wt = plainText(wv.raw), stx = plainText(tk[ti]);
            if (!wt || !stx) { bad = true; break; }
            /* 文字位不同说法太多，判不了就 manual，不判错 */
            if (wt !== stx) { bad = true; break; }
          } else {
            var wq = numOfValue(wv), sq = toRational(tk[ti]);
            if (!wq || !sq) { bad = true; break; }
            if (!ratEq(sq, wq)) eqAll = false;
          }
        }
        if (bad) return { verdict: 'manual', how: 'spec-manual', specType: type };
        return { verdict: eqAll ? 'correct' : 'wrong', how: 'spec-set', specType: type };
      }
      var toks2 = tokensOf(stripUnitTail(stu));
      var sr2 = [], i;
      for (i = 0; i < toks2.length; i++) {
        var r = toRational(toks2[i]);
        if (!r) return { verdict: 'manual', how: 'spec-manual', specType: type };
        sr2.push(r);
      }
      var wr2 = [];
      for (i = 0; i < wantVals.length; i++) {
        var q = numOfValue(wantVals[i]);
        if (!q) return { verdict: 'manual', how: 'spec-manual', specType: type };
        wr2.push(q);
      }
      /* 少写或多写都不判错：数量不同一律 manual */
      if (sr2.length !== wr2.length) return { verdict: 'manual', how: 'spec-manual', specType: type };
      if (spec.order_policy === 'ordered') {
        var same = true;
        for (i = 0; i < wr2.length; i++) if (!ratEq(sr2[i], wr2[i])) { same = false; break; }
        return { verdict: same ? 'correct' : 'wrong', how: 'spec-set', specType: type };
      }
      var used = [], allHit = true;
      for (i = 0; i < sr2.length; i++) {
        var hit = -1;
        for (var j = 0; j < wr2.length; j++) {
          if (used.indexOf(j) < 0 && ratEq(sr2[i], wr2[j])) { hit = j; break; }
        }
        if (hit < 0) { allHit = false; break; }
        used.push(hit);
      }
      return { verdict: allHit ? 'correct' : 'wrong', how: 'spec-set', specType: type };
    }

    if (type === 'interval') {
      var got = parseIntervalText(stu);
      if (!got) return { verdict: 'manual', how: 'spec-manual', specType: type };
      if (spec.var && got.varName && spec.var !== got.varName) {
        return { verdict: 'manual', how: 'spec-manual', specType: type };
      }
      /* 形状不同（一边是双边区间、一边只写了半边）→ manual：学生可能只是漏写，不能算错 */
      if ((spec.low == null) !== (got.lo == null) || (spec.high == null) !== (got.hi == null)) {
        return { verdict: 'manual', how: 'spec-manual', specType: type };
      }
      var okLo = (spec.low == null && got.lo == null) || (spec.low != null && got.lo != null && Math.abs(spec.low - got.lo) < 1e-9 && !!spec.low_closed === !!got.loClosed);
      var okHi = (spec.high == null && got.hi == null) || (spec.high != null && got.hi != null && Math.abs(spec.high - got.hi) < 1e-9 && !!spec.high_closed === !!got.hiClosed);
      return { verdict: (okLo && okHi) ? 'correct' : 'wrong', how: 'spec-interval', specType: type };
    }

    if (type === 'judgement') {
      var wantTxt = plainText((spec.values || [])[0] ? (spec.values || [])[0].raw : (spec.raw || ''));
      var stuTxt = plainText(stu);
      if (!wantTxt) return { verdict: 'manual', how: 'spec-manual', specType: type };
      if (wantTxt === stuTxt) return { verdict: 'correct', how: 'spec-judge', specType: type };
      var gw = groupOf(wantTxt), gs = groupOf(stuTxt);
      if (gw && gs && gw === gs) return { verdict: 'correct', how: 'spec-judge', specType: type };
      if (gw && gs && gw !== gs) return { verdict: 'wrong', how: 'spec-judge', specType: type };
      return { verdict: 'manual', how: 'spec-manual', specType: type };
    }

    return judge(refAnswer, stuAnswer);
  }

  return { judge: judge, judgeWithSpec: judgeWithSpec, parseRel: parseRel, normalize: normalize, toRational: toRational,
           tokensOf: tokensOf, answerCandidates: answerCandidates, ratEq: ratEq, parseIntervalText: parseIntervalText };
});
