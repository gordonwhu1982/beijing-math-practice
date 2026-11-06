/* Draw a geometry figure from a structured description. The description is
   the source; this file only turns marks into SVG. */
(function () {
  'use strict';
  var MC = window.MC = window.MC || {};
  var C = MC.core;

  function num(v) { return Math.round(v * 10) / 10; }

  function unit(from, to) {
    var dx = to[0] - from[0], dy = to[1] - from[1];
    var len = Math.sqrt(dx * dx + dy * dy) || 1;
    return [dx / len, dy / len];
  }

  /* Equal-length ticks across the middle of a segment. */
  function tickMarks(a, b, n) {
    var u = unit(a, b);
    var px = -u[1], py = u[0];
    var mx = (a[0] + b[0]) / 2, my = (a[1] + b[1]) / 2;
    var gap = 6;
    var start = -((n - 1) * gap) / 2;
    var out = '';
    for (var i = 0; i < n; i++) {
      var s = start + i * gap;
      var cx = mx + u[0] * s, cy = my + u[1] * s;
      out += '<line x1="' + num(cx - px * 7) + '" y1="' + num(cy - py * 7) +
        '" x2="' + num(cx + px * 7) + '" y2="' + num(cy + py * 7) +
        '" stroke="#b45309" stroke-width="1.6"/>';
    }
    return out;
  }

  /* Arc of the angle at `at` between the directions toward p and q. */
  function angleArc(at, p, q, r) {
    var a1 = Math.atan2(p[1] - at[1], p[0] - at[0]);
    var a2 = Math.atan2(q[1] - at[1], q[0] - at[0]);
    var d = a2 - a1;
    while (d > Math.PI) d -= Math.PI * 2;
    while (d < -Math.PI) d += Math.PI * 2;
    var x1 = at[0] + r * Math.cos(a1), y1 = at[1] + r * Math.sin(a1);
    var x2 = at[0] + r * Math.cos(a2), y2 = at[1] + r * Math.sin(a2);
    var sweep = d > 0 ? 1 : 0;
    return '<path d="M ' + num(x1) + ' ' + num(y1) + ' A ' + r + ' ' + r +
      ' 0 0 ' + sweep + ' ' + num(x2) + ' ' + num(y2) +
      '" fill="none" stroke="#b45309" stroke-width="1.6"/>';
  }

  /* Small square for a right angle, sitting between two directions. */
  function rightMark(at, p, q, s) {
    var u = unit(at, p), v = unit(at, q);
    var a = [at[0] + u[0] * s, at[1] + u[1] * s];
    var b = [a[0] + v[0] * s, a[1] + v[1] * s];
    var c = [at[0] + v[0] * s, at[1] + v[1] * s];
    return '<polyline points="' + num(a[0]) + ',' + num(a[1]) + ' ' +
      num(b[0]) + ',' + num(b[1]) + ' ' + num(c[0]) + ',' + num(c[1]) +
      '" fill="none" stroke="#0f172a" stroke-width="1.4"/>';
  }

  function markSvg(m) {
    if (!m || !m.kind) return '';
    if (m.kind === 'poly') {
      return '<polygon points="' + (m.pts || []).map(function (p) {
        return num(p[0]) + ',' + num(p[1]);
      }).join(' ') + '" fill="#eff6ff" stroke="#1d4ed8" stroke-width="2"/>';
    }
    if (m.kind === 'seg') {
      var a = m.pts[0], b = m.pts[1];
      return '<line x1="' + num(a[0]) + '" y1="' + num(a[1]) + '" x2="' + num(b[0]) +
        '" y2="' + num(b[1]) + '" stroke="' + (m.stroke || '#0f172a') +
        '" stroke-width="' + (m.w || 2) + '"' +
        (m.dash ? ' stroke-dasharray="6 4"' : '') + '/>';
    }
    if (m.kind === 'dot') {
      return '<circle cx="' + num(m.x) + '" cy="' + num(m.y) + '" r="3.2" fill="#0f172a"/>';
    }
    if (m.kind === 'label') {
      return '<text x="' + num(m.x) + '" y="' + num(m.y) + '" font-size="15" fill="#0f172a" text-anchor="' +
        (m.anchor || 'middle') + '" font-family="Segoe UI, Microsoft YaHei, sans-serif">' +
        C.esc(m.text || '') + '</text>';
    }
    if (m.kind === 'tick') return tickMarks(m.pts[0], m.pts[1], m.n || 1);
    if (m.kind === 'angle') return angleArc(m.at, m.to[0], m.to[1], m.r || 18);
    if (m.kind === 'right') return rightMark(m.at, m.to[0], m.to[1], m.s || 12);
    return '';
  }

  /* One figure: the picture first, then a one-line caption of what it shows. */
  function render(fig) {
    if (!fig) return '';
    var w = fig.w || 360, h = fig.h || 240;
    var body = (fig.marks || []).map(markSvg).join('');
    return '<figure class="figbox"><svg viewBox="0 0 ' + w + ' ' + h +
      '" role="img" aria-label="' + C.esc(fig.name || '') + '">' + body +
      '</svg><figcaption>' + C.esc(fig.caption || fig.name || '') + '</figcaption></figure>';
  }

  function matching(id, field) {
    var pack = MC.peek('figures');
    if (!pack || !id) return [];
    return (pack.figures || []).filter(function (f) {
      return (f[field] || []).indexOf(id) >= 0;
    });
  }

  MC.fig = { render: render, matching: matching };
})();
