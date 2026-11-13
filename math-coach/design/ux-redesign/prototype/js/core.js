// 纯文本 / 标签工具：进字符串、出字符串。无 DOM、无 state、无网络。
// 从 app.js 搬出来（S1，2026-11-12），一行逻辑没改；靠全局函数名互相调用，不要包 IIFE。
// 这一片只做「搬」，改行为要在单独提交里做。

/** First sentence of a definition already stored on the point. No sentence is invented. */
function firstSentence(text) {
  const value = String(text || "").trim();
  if (!value) return "";
  const cut = value.search(/[。！？]/);
  return cut >= 0 ? value.slice(0, cut + 1) : value;
}

function formName(form) {
  return { choice: "选择", fill: "填空", proof: "证明", solution: "解答", draw: "作图" }[form] || "题目";
}

function bandLabel(band) {
  return { basic: "基础", standard: "中档", advanced: "提高", challenge: "挑战", competition: "竞赛" }[band] || band || "";
}

function bandClass(band) {
  if (band === "standard" || band === "advanced" || band === "challenge" || band === "competition") return " is-band-" + band;
  return " is-band-basic";
}

function kpTypeName(type) {
  return {
    concept: "概念", theorem: "定理", property: "性质", skill: "技能", method: "方法",
    formula: "公式", representation: "表示法", fact: "事实", model: "模型",
    context: "情境", activity: "活动"
  }[type] || "";
}

function kpTypeClass(type) {
  if (kpTypeName(type)) return " is-kpt-" + type;
  return " is-kpt-concept";
}

function methodTierName(tier) {
  if (tier === "extend") return "培优";
  if (tier === "olympiad") return "竞赛";
  return "课本";
}

function methodTierClass(tier) {
  if (tier === "extend") return " is-extend";
  if (tier === "olympiad") return " is-olymp";
  return "";
}

/** Dots and lines. Coordinates are percentages of the field. */
function bookTone(no) {
  if (no <= 3) return "t1";
  if (no <= 9) return "t2";
  if (no <= 13) return "t3";
  if (no <= 17) return "t4";
  if (no <= 22) return "t5";
  return "t6";
}

function shortKp(title) {
  const cut = plainMath(kpLabel(title));
  if (cut.length <= 12) return cut;
  let end = 12;
  const re = /\$[^$]*\$/g;
  let match;
  while ((match = re.exec(cut))) {
    if (end > match.index && end < match.index + match[0].length) end = match.index;
  }
  if (end < 4) return cut;
  return cut.slice(0, end).replace(/[$、，,\s]+$/, "") + "…";
}

function kpLabel(title) {
  const text = String(title || "");
  const warn = text.match(/^易错[：:](.+)$/);
  if (warn) return warn[1];
  return text.split(/[：:]/)[0] || text;
}

function coreKp(node) {
  return !!node && node.kind === "knowledge_point" && node.kp_type !== "context" && node.kp_type !== "activity";
}

function commaLines(text) {
  const value = String(text || "");
  if (value.length <= 14 || value.indexOf("、") < 0) return esc(value);
  const parts = value.split("、");
  let line = "";
  const lines = [];
  parts.forEach(function (part, index) {
    const piece = part + (index < parts.length - 1 ? "、" : "");
    if (line && (line + piece).length > 12) {
      lines.push(line);
      line = piece;
    } else line += piece;
  });
  if (line) lines.push(line);
  return lines.map(esc).join("<br>");
}

function plainMath(value) {
  return String(value == null ? "" : value).replace(/\$\$([\s\S]*?)\$\$|\$([^$]*)\$/g, function (_all, display, inline) {
    return texPlain(display != null ? display : inline);
  });
}

function texPlain(tex) {
  let text = String(tex || "");
  let guard = 0;
  while (text.indexOf("\\sqrt") >= 0 && guard < 8) {
    text = text.replace(/\\sqrt\{([^{}]*)\}/g, "√$1").replace(/\\sqrt\s*([0-9A-Za-z]+)/g, "√$1");
    guard += 1;
  }
  text = text.replace(/\\frac\{([^{}]*)\}\{([^{}]*)\}/g, "$1/$2");
  text = text.replace(/\\triangle/g, "△").replace(/\\angle/g, "∠").replace(/\\degree/g, "°")
    .replace(/\\cdot/g, "·").replace(/\\times/g, "×").replace(/\\perp/g, "⊥");
  text = text.replace(/\\[a-zA-Z]+/g, "");
  return text.replace(/[{}]/g, "").replace(/\s+/g, "");
}

function mathHtml(value) {
  const text = String(value == null ? "" : value);
  const katex = window.katex;
  if (!katex || text.indexOf("$") < 0) return esc(text);
  const out = [];
  let last = 0;
  const re = /\$\$([\s\S]*?)\$\$|\$([^$]*)\$/g;
  const punct = "、，。；：！？,.;:!?）)]】》」』";
  let match;
  while ((match = re.exec(text))) {
    out.push(esc(text.slice(last, match.index)));
    const tex = (match[1] != null ? match[1] : match[2]).trim();
    const display = match[1] != null;
    let html;
    try {
      html = katex.renderToString(tex, { throwOnError: false, output: "html", strict: false, displayMode: display });
      if (html.indexOf("katex-error") >= 0) html = esc(match[0]);
    } catch (err) {
      html = esc(match[0]);
    }
    let end = match.index + match[0].length;
    let tail = "";
    while (end < text.length && punct.indexOf(text.charAt(end)) >= 0) {
      tail += text.charAt(end);
      end += 1;
    }
    out.push('<span class="math-keep">' + html + esc(tail) + "</span>");
    last = end;
    re.lastIndex = end;
  }
  out.push(esc(text.slice(last)));
  return out.join("");
}

function volTone(vol) {
  return { "701": "t1", "702": "t2", "801": "t3", "802": "t4", "901": "t5", "902": "t6" }[vol] || "t1";
}

function round1(n) { return Math.round(n * 10) / 10; }

function cellGrid(list, x0, y0, x1, y1) {
  const count = list.length || 1;
  const cols = Math.max(1, Math.ceil(Math.sqrt(count)));
  const rows = Math.ceil(count / cols);
  return list.map(function (item, index) {
    const col = index % cols;
    const row = Math.floor(index / cols);
    return {
      item: item,
      x: round1(x0 + (col + 0.5) * (x1 - x0) / cols),
      y: round1(y0 + (row + 0.5) * (y1 - y0) / rows)
    };
  });
}

function chapterLabelHtml(node) {
  const no = node.no || node.ch;
  const name = String(node.title || "").replace(/^第\d+章\s*/, "");
  const head = "第" + no + "章";
  const breaks = {
    "一元一次不等式和一元一次不等式组": "一元一次不等式和",
    "二次函数和反比例函数": "二次函数和",
    "综合运用数学知识解决实际问题": "综合运用数学知识",
    "投影、视图与展开图": "投影、视图与",
    "概念、命题与证明": "概念、命题与",
    "数据的收集与描述": "数据的收集与",
    "概率的求法与应用": "概率的求法与"
  };
  const cutAt = breaks[name];
  if (!cutAt) return esc(head + (name ? " " + name : ""));
  return esc(head + " " + cutAt) + "<br>" + esc(name.slice(cutAt.length));
}

function bandWord() {
  if (state.kpBand === "core") return "只看课本";
  if (state.kpBand === "extend") return "连培优";
  return "再加竞赛";
}

function methodRank(method) {
  if (method.tier === "olympiad") return 2;
  if (method.tier === "extend") return 1;
  return 0;
}

/** Escape text that is written into the prototype page. */
function esc(text) {
  return String(text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}
