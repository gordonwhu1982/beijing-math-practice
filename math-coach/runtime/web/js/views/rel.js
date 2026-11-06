/* 卡住时的三列：左边要会什么、中间就是这里、右边学完去哪。
   只用图里已有的直接先修/后续（一跳），不做多跳推断——多跳一展开就没人看得懂，也看不出该先补哪一步。
   名单是文字，不是另一张图：卡住的时候人只需要一份「先补哪几个」的清单。 */
(function () {
  "use strict";
  var MC = window.MC, C = MC.core;
  var CAP = 8, G = null;

  function graph() { return G || (MC.mapGraph ? MC.mapGraph() : null); }

  function rels(uid) {
    var g = graph(), pre = [], next = [], byId = {};
    if (!g) return { pre: pre, next: next, byId: byId };
    g.nodes.forEach(function (n) { byId[n.id] = n; });
    g.edges.forEach(function (e) {
      /* 出边字段是 s/d/r（见 build_web.py 的 compact 写法），别按 src/dst 猜 */
      if (e.r !== "prerequisite_of") return;
      if (e.d === uid) pre.push(e.s);
      if (e.s === uid) next.push(e.d);
    });
    function uniq(a) { var seen = {}, out = []; a.forEach(function (x) { if (!seen[x]) { seen[x] = 1; out.push(x); } }); return out.sort(); }
    return { pre: uniq(pre), next: uniq(next), byId: byId };
  }

  function item(uid, byId) {
    var n = byId[uid];
    var t = n ? C.clipMath(n.title, 40) : uid;
    return "<li><a href=\"#/kp/" + C.esc(uid) + "\">" + C.mathHtml(t) + "</a>" +
      (n && n.sec ? "<span class=\"rel-sec\">" + C.esc(n.sec) + "</span>" : "") + "</li>";
  }

  function col(title, uids, byId, emptyTxt) {
    var h = "<div class=\"rel-col\"><div class=\"rel-h\">" + C.esc(title) +
      "<span class=\"rel-n\">" + uids.length + "</span></div>";
    if (!uids.length) return h + "<div class=\"muted\">" + C.esc(emptyTxt) + "</div></div>";
    var head = uids.slice(0, CAP), rest = uids.slice(CAP);
    h += "<ul class=\"rel-list\">" + head.map(function (u) { return item(u, byId); }).join("") + "</ul>";
    if (rest.length) {
      h += "<details class=\"rel-more\"><summary>还有 " + rest.length + " 个</summary><ul class=\"rel-list\">" +
        rest.map(function (u) { return item(u, byId); }).join("") + "</ul></details>";
    }
    return h + "</div>";
  }

  function render(host, params) {
    var uid = params.uid;
    if (!/^K\d{3}-/.test(String(uid || ""))) {
      host.innerHTML = '<div class="empty">这一页只对知识点开（收到 ' + C.esc(String(uid)) + '）</div>';
      return;
    }
    function draw() {
      var r = rels(uid), me = r.byId[uid];
      if (!me) { host.innerHTML = "<div class=\"empty\">图谱里没有 " + C.esc(uid) + "</div>"; return; }
      var mid = "<div class=\"rel-col rel-now\"><div class=\"rel-h\">就是这里<span class=\"rel-n\">1</span></div>" +
        "<div class=\"rel-cur\">" + C.mathHtml(C.clipMath(me.title, 60)) + "</div>" +
        (me.sec ? "<div class=\"muted\">" + C.esc(me.sec) + "</div>" : "") +
        "<div class=\"rel-links\"><a href=\"#/kp/" + C.esc(uid) + "\">看这一段讲解</a>" +
        (me.sec && me.vol ? "<a href=\"#/practice/" + C.esc(me.vol) + "/" + C.esc(me.sec) + "\">练这一节</a>" : "") + "</div></div>";
      host.innerHTML = "<div class=\"wrap rel-page\">" +
        "<div class=\"muted\" style=\"font-size:var(--fs-xs)\">卡住的时候先看左边：那些是这一步真正要用的</div>" +
        "<div class=\"rel-grid\">" +
        col("先得会", r.pre, r.byId, "图里没有更早的点") + mid +
        col("学完接着", r.next, r.byId, "图里没有更靠后的点") +
        "</div></div>";
      MC.shell.title("前后知识点", { sub: C.clipMath(me.title, 30), back: me.vol && me.sec ? "#/sec/" + me.vol + "/" + me.sec : "#/toc" });
    }
    if (graph()) { draw(); return; }
    host.innerHTML = "<div class=\"empty\">正在取…</div>";
    MC.data.load("graph").then(function (g) { G = g; draw(); });
  }

  MC.router.view("rel", { render: render });
})();