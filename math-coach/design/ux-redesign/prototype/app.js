/* Isolated pad prototype. State stays in this page and is not the product store. */

const QUESTIONS = [
  { id: "q1", stem: "哪一组长度能组成三角形？", options: ["2、3、6", "3、4、5", "1、2、3"], answer: 1, kp: "三角形的定义", explain: "完整解析：3、4、5 满足任意两边之和大于第三边，能组成三角形。2、3、6 和 1、2、3 不能。" },
  { id: "q2", stem: "三角形有几条边？填一个数。", kind: "blank", expect: "number", answer: "3", kp: "三角形的元素", explain: "三角形有三条边。" },
  { id: "q3", stem: "不在同一直线上、首尾顺次相接的三条线段组成什么？", options: ["直线", "三角形", "圆"], answer: 1, kp: "三角形的定义", explain: "这三条线段组成的图形叫做三角形。" },
  { id: "q4", stem: "为什么三点在同一直线上不能组成三角形？把过程写下来。", kind: "open", answer: "三点共线时，三条线段不能围成一个封闭图形。", kp: "三角形的定义" },
  { id: "q5", stem: "任意两边之和与第三边相比，应该怎样？", options: ["大于第三边", "等于第三边", "小于第三边"], answer: 0, kp: "三边关系", explain: "任意两边之和要大于第三边。" },
  { id: "q6", stem: "△ABC 读作什么？", options: ["角 ABC", "三角形 ABC", "弧 ABC"], answer: 1, kp: "三角形的记法", explain: "△ABC 读作三角形 ABC。" }
];

const HINTS = [
  "先看题在问哪一种图形。",
  "课本第 74 页写着三角形的定义。",
  "用三边关系：两边之和要大于第三边。",
  "先把每组数的两边加起来，再和第三边比。",
  "完整解析：3、4、5 满足任意两边之和大于第三边，能组成三角形。2、3、6 和 1、2、3 不能。"
];

const CHAPTERS = ["第10章 分式", "第11章 实数和二次根式", "第12章 三角形", "第13章 事件与可能性"];
/** Chapter titles from the product catalog. Positions are a net, not six parallel rows. */
const COURSE_NODES = [
  { no: 1, short: "有理数", title: "有理数", x: 16, y: 20 },
  { no: 2, short: "一次方程", title: "一元一次方程", x: 30, y: 12 },
  { no: 3, short: "几何图形", title: "简单的几何图形", x: 24, y: 32 },
  { no: 4, short: "不等式", title: "一元一次不等式和一元一次不等式组", x: 14, y: 42 },
  { no: 5, short: "方程组", title: "二元一次方程组", x: 28, y: 44 },
  { no: 6, short: "整式", title: "整式的运算", x: 16, y: 56 },
  { no: 7, short: "命题证明", title: "概念、命题与证明", x: 30, y: 58 },
  { no: 8, short: "因式分解", title: "因式分解", x: 18, y: 72 },
  { no: 9, short: "数据描述", title: "数据的收集与描述", x: 34, y: 74 },
  { no: 10, short: "分式", title: "分式", x: 38, y: 32 },
  { no: 11, short: "二次根式", title: "实数和二次根式", x: 44, y: 18 },
  { no: 12, short: "三角形", title: "三角形", x: 50, y: 42 },
  { no: 13, short: "可能性", title: "事件与可能性", x: 62, y: 26 },
  { no: 14, short: "一次函数", title: "一次函数", x: 40, y: 54 },
  { no: 15, short: "四边形", title: "四边形", x: 58, y: 54 },
  { no: 16, short: "二次方程", title: "一元二次方程", x: 36, y: 70 },
  { no: 17, short: "方差", title: "方差与频数分布", x: 52, y: 72 },
  { no: 18, short: "相似形", title: "相似形", x: 68, y: 40 },
  { no: 19, short: "二次函数", title: "二次函数和反比例函数", x: 74, y: 18 },
  { no: 20, short: "解直角", title: "解直角三角形", x: 80, y: 34 },
  { no: 21, short: "圆（上）", title: "圆（上）", x: 70, y: 54 },
  { no: 22, short: "圆（下）", title: "圆（下）", x: 84, y: 48 },
  { no: 23, short: "图形变换", title: "图形的变换", x: 64, y: 66 },
  { no: 24, short: "投影视图", title: "投影、视图与展开图", x: 78, y: 64 },
  { no: 25, short: "概率", title: "概率的求法与应用", x: 86, y: 22 },
  { no: 26, short: "综合运用", title: "综合运用数学知识解决实际问题", x: 84, y: 76 }
];
/** Nearby chapters, plus a few cross links. Not the product's full edge table. */
const COURSE_LINKS = [
  [1, 2], [2, 3], [1, 3],
  [4, 5], [5, 6], [6, 7], [7, 8], [8, 9], [4, 6], [5, 7],
  [10, 11], [11, 12], [12, 13], [10, 12],
  [14, 15], [15, 16], [16, 17], [14, 16],
  [18, 19], [19, 20], [20, 21], [21, 22], [18, 21],
  [23, 24], [24, 26], [23, 26], [25, 26],
  [3, 12], [2, 5], [2, 16], [6, 10], [8, 10], [1, 11],
  [12, 15], [12, 18], [12, 21], [14, 19], [16, 19], [9, 17], [13, 25], [15, 18]
];
const SECTIONS = {
  1: [["1.1", "负数的引入"], ["1.2", "用数轴上的点表示有理数"], ["1.3", "相反数和绝对值"], ["1.4", "有理数的加法"], ["1.5", "有理数的减法"], ["1.6", "有理数加减法的混合运算"], ["1.7", "有理数的乘法"], ["1.8", "有理数的除法"], ["1.9", "有理数的乘方"], ["1.10", "有理数的混合运算"], ["1.11", "数的近似和科学记数法"], ["1.12", "用计算器做有理数的混合运算"]],
  2: [["2.1", "字母表示数"], ["2.2", "同类项与合并同类项"], ["2.3", "等式与方程"], ["2.4", "等式的基本性质"], ["2.5", "一元一次方程"], ["2.6", "列方程解应用问题"]],
  3: [["3.1", "平面图形与立体图形"], ["3.2", "某些立体图形的展开图"], ["3.3", "从不同方向观察立体图形"], ["3.4", "点、线、面、体"], ["3.5", "直线、射线、线段"], ["3.6", "角及其分类"], ["3.7", "角的度量与角的换算"], ["3.8", "角平分线"], ["3.9", "两条直线的位置关系"], ["3.10", "相交线与平行线"], ["3.11", "用计算机绘图"]],
  4: [["4.1", "不等式"], ["4.2", "不等式的基本性质"], ["4.3", "不等式的解集"], ["4.4", "一元一次不等式及其解法"], ["4.5", "一元一次不等式组及其解法"]],
  5: [["5.1", "二元一次方程和它的解"], ["5.2", "二元一次方程组和它的解"], ["5.3", "用代入消元法解二元一次方程组"], ["5.4", "用加减消元法解二元一次方程组"], ["5.5", "三元一次方程组"], ["5.6", "二元一次方程组的应用"]],
  6: [["6.1", "整式的加减"], ["6.2", "幂的运算"], ["6.3", "整式的乘法"], ["6.4", "乘法公式"], ["6.5", "整式的除法"]],
  7: [["7.1", "概念与抽象"], ["7.2", "命题"], ["7.3", "实验"], ["7.4", "归纳"], ["7.5", "类比"], ["7.6", "演绎"], ["7.7", "证明"], ["7.8", "简单几何图形及其推理"]],
  8: [["8.1", "因式分解"], ["8.2", "提公因式法"], ["8.3", "公式法"]],
  9: [["9.1", "总体与样本"], ["9.2", "数据的收集与整理"], ["9.3", "数据的表示"], ["9.4", "用计算机绘制统计图"], ["9.5", "平均数"], ["9.6", "众数和中位数"]],
  10: [["10.1", "分式"], ["10.2", "分式的基本性质"], ["10.3", "分式的乘除法"], ["10.4", "分式的加减法"], ["10.5", "分式方程"]],
  11: [["11.1", "平方根"], ["11.2", "立方根"], ["11.3", "用计算器开方"], ["11.4", "无理数与实数"], ["11.5", "二次根式及其性质"], ["11.6", "二次根式的乘除法"], ["11.7", "二次根式的加减法"]],
  12: [["12.1", "三角形"], ["12.2", "三角形的性质"], ["12.3", "三角形中的主要线段"], ["12.4", "全等三角形"], ["12.5", "全等三角形的判定"], ["12.6", "等腰三角形"], ["12.7", "直角三角形"], ["12.8", "尺规作图"], ["12.9", "逆命题、逆定理"], ["12.10", "轴对称和轴对称图形"], ["12.11", "勾股定理"], ["12.12", "勾股定理的逆定理"]],
  13: [["13.1", "必然事件与随机事件"], ["13.2", "随机事件发生的可能性"], ["13.3", "求简单随机事件发生的可能性的大小"]],
  14: [["14.1", "函数"], ["14.2", "函数的表示法"], ["14.3", "函数图象的画法"], ["14.4", "一次函数"], ["14.5", "一次函数的图象"], ["14.6", "一次函数的性质"], ["14.7", "一次函数的应用"]],
  15: [["15.1", "多边形"], ["15.2", "平行四边形和特殊的平行四边形"], ["15.3", "平行四边形的性质与判定"], ["15.4", "特殊的平行四边形的性质与判定"], ["15.5", "三角形中位线定理"], ["15.6", "中心对称图形"]],
  16: [["16.1", "一元二次方程"], ["16.2", "一元二次方程的解法"], ["16.3", "列方程解应用问题"]],
  17: [["17.1", "方差"], ["17.2", "用科学计算器计算方差"], ["17.3", "频数分布表与频数分布图"]],
  18: [["18.1", "比例线段"], ["18.2", "黄金分割"], ["18.3", "平行线分三角形两边成比例"], ["18.4", "相似多边形"], ["18.5", "相似三角形的判定"], ["18.6", "相似三角形的性质"], ["18.7", "应用举例"]],
  19: [["19.1", "二次函数"], ["19.2", "二次函数 y = ax2 + bx + c（a ≠ 0）的图象"], ["19.3", "二次函数的性质"], ["19.4", "二次函数的应用"], ["19.5", "反比例函数"], ["19.6", "反比例函数的图象、性质和应用"]],
  20: [["20.1", "锐角三角函数"], ["20.2", "30°，45°，60°角的三角函数值"], ["20.3", "用科学计算器求锐角三角函数值"], ["20.4", "解直角三角形"], ["20.5", "测量与计算"]],
  21: [["21.1", "圆的有关概念"], ["21.2", "过三点的圆"], ["21.3", "圆的对称性"], ["21.4", "圆周角"]],
  22: [["22.1", "直线和圆的位置关系"], ["22.2", "圆的切线"], ["22.3", "正多边形的有关计算"]],
  23: [["23.1", "平移变换"], ["23.2", "旋转变换"], ["23.3", "轴对称变换"], ["23.4", "位似变换"]],
  24: [["24.1", "中心投影与平行投影"], ["24.2", "基本几何体的三视图"], ["24.3", "基本几何体的平面展开图"]],
  25: [["25.1", "求概率的方法"], ["25.2", "概率的简单应用"]],
  26: [["26.1", "解决实际问题的一般思路"], ["26.2", "应用举例"]],
};

const POINT_NAMES = ["三角形的定义", "三角形的元素", "三边关系", "三角形的记法"];
const POINT_METHOD = {
  "三角形的定义": { method: "用定义判断", idea: "分类", line: "先看三条线段是不是首尾相接，再看是不是在同一条直线上。" },
  "三角形的元素": { method: "数边和角", idea: "对应", line: "先数边，再数内角和顶点。" },
  "三边关系": { method: "两边之和", idea: "比较", line: "任意两边之和要大于第三边。" },
  "三角形的记法": { method: "用符号 △", idea: "符号意识", line: "△ABC 读作三角形 ABC，不是角 ABC。" }
};

const state = {
  route: "today",
  nav: "today",
  rail: false,
  bookOpen: true,
  bookVol: "801",
  volId: "801",
  chNo: "12",
  secId: "12.1",
  afterExplain: false,
  queue: [],
  index: 0,
  mode: "practice",
  source: "today",
  picked: null,
  revealed: false,
  hintOpen: 0,
  hintFold: {},
  hintPanel: "",
  hintUsed: {},
  given: {},
  blank: "",
  formatNote: "",
  explainId: null,
  showOk: false,
  processOpen: false,
  processes: {},
  openText: "",
  awaitingJudge: false,
  answers: {},
  owedOn: {},
  setMarks: {},
  peeked: {},
  setPeeked: {},
  skippedIds: [],
  drafts: {},
  draft: null,
  baseline: {},
  testPicks: {},
  testSkipped: {},
  mapMode: "layer",
  mapPoint: null,
  mapCard: false,
  mapNetNo: 12,
  mapLevel: "course",
  mapSection: "",
  mapZoom: 1,
  mapPanX: 0,
  mapPanY: 0,
  mapShowAll: false,
  mapSideOpen: true,
  mapSkill: "",
  methodId: "",
  qId: "",
  qVol: "",
  qNo: "",
  mapBook: "801",
  mapChapter: "801-12",
  mapLiteracy: "",
  mapMethod: "",
  mapIdea: "",
  chapterFrom: "book",
  recordFrom: "review",
  scrolls: {},
  query: "",
  testBack: "",
  checked: { "三角形的定义": false },
  kpName: "三角形的定义",
  kpMark: "",
  kpQid: "",
  kpSource: "",
  kpTrail: [],
  kpExplain: false,
  kpFrom: "section",
  testScope: "review",
  pendingScope: "",
  liveScope: "",
  priorOwed: null,
  chapterBefore: null,
  lastChange: null,
  exportNote: "",
  flash: "",
  aboutData: false,
  ignoreHash: false
};

/** Read a question by id. */
function questionById(id) {
  return QUESTIONS.find(function (item) { return item.id === id; });
}

/** Return whether a mark is already recorded for review. */
function isFinal(mark) {
  return mark === "ok" || mark === "bad" || mark === "empty" || mark === "peek" || mark === "skip" || mark === "judge";
}

/** Correct count on the chapter-12 sample set. Other chapters have no questions here. */
function chapterOk() {
  return QUESTIONS.filter(function (item) { return state.answers[item.id] === "ok"; }).length;
}

/** Short date for when a question entered the retry column. */
function todayLabel() {
  const now = new Date();
  return (now.getMonth() + 1) + "月" + now.getDate() + "日";
}

/** Child-facing name for a retry mark. */
function retryLabel(mark) {
  if (mark === "bad") return "错";
  if (mark === "empty") return "空着交";
  if (mark === "peek") return "看了答案";
  if (mark === "skip") return "没做";
  return "要重做";
}

/** Unstable points, one row per knowledge point that still has retry questions. */
function weakPoints() {
  const by = {};
  retryIds().forEach(function (id) {
    const name = questionById(id).kp;
    if (!by[name]) by[name] = [];
    by[name].push(id);
  });
  return Object.keys(by).map(function (name) {
    const counts = { bad: 0, empty: 0, peek: 0, skip: 0 };
    by[name].forEach(function (id) {
      const mark = state.answers[id];
      if (counts[mark] !== undefined) counts[mark] += 1;
    });
    const parts = [];
    if (counts.bad) parts.push("错了 " + counts.bad + " 道");
    if (counts.empty) parts.push("空着交了 " + counts.empty + " 道");
    if (counts.peek) parts.push("看了 " + counts.peek + " 道的答案");
    if (counts.skip) parts.push("没做 " + counts.skip + " 道");
    return { name: name, ids: by[name], why: parts.join("，") };
  });
}

/** Questions a review test can actually start. Two per checked point, and only ones not yet right. */
function reviewTestIds() {
  const ids = [];
  weakPoints().forEach(function (point) {
    if (!state.checked[point.name]) return;
    point.ids.slice(0, 2).forEach(function (id) {
      if (ids.indexOf(id) < 0) ids.push(id);
    });
  });
  return ids.slice(0, 10);
}

/** Ids that belong in the retry column, including skipped items. */
function retryIds() {
  return QUESTIONS.filter(function (item) {
    const mark = state.answers[item.id];
    return mark === "bad" || mark === "empty" || mark === "peek" || mark === "skip";
  }).map(function (item) { return item.id; });
}

/** Write a mark for this set without treating older sets as already handed in. */
function record(id, mark) {
  const item = questionById(id);
  state.setMarks[id] = mark;
  state.answers[id] = mark;
  if (mark === "bad" || mark === "empty" || mark === "peek" || mark === "skip") {
    if (!state.owedOn[id]) state.owedOn[id] = todayLabel();
  } else if (mark === "ok") delete state.owedOn[id];
  if (state.hintOpen > 0) state.hintUsed[id] = state.hintOpen;
  if (item && item.kind === "open") state.given[id] = (state.mode === "test" ? state.testPicks[id] : state.openText) || "空着";
  else if (item && item.kind === "blank") state.given[id] = (state.mode === "test" ? state.testPicks[id] : state.blank) || "空着";
  else if (item && item.options && state.picked !== null && state.picked !== undefined) state.given[id] = item.options[state.picked];
  else if (item && item.options && state.testPicks[id] !== undefined && state.testPicks[id] !== null) state.given[id] = item.options[state.testPicks[id]];
  if (state.queue.length) saveDraft();
}

/** Ids in this set that do not yet have a final mark or a saved test choice. */
function unanswered(queue, picks, marks) {
  const chosen = picks || (state.mode === "test" ? state.testPicks : {});
  const book = marks || state.setMarks;
  return queue.filter(function (id) {
    if (isFinal(book[id])) return false;
    if (typeof chosen[id] === "string" && !String(chosen[id]).trim()) return true;
    return chosen[id] === undefined || chosen[id] === null;
  });
}

/** Questions attached to one knowledge point. */
function idsForKp(name) {
  return QUESTIONS.filter(function (item) { return item.kp === name; }).map(function (item) { return item.id; });
}

/** True when the open set has writing or a recorded answer. */
function inSet() {
  return state.route === "practice" || state.route === "test";
}

/** Practice stays on #/practice. A test uses #/test and the same question view. */
function setRoute(mode) {
  return (mode || state.mode) === "test" ? "test" : "practice";
}

function isDirty() {
  if (!inSet()) return false;
  if (state.picked !== null || state.hintOpen > 0 || state.revealed) return true;
  if ((state.blank || "").trim() || (state.openText || "").trim()) return true;
  const current = state.queue[state.index];
  if (current && (state.processes[current] || "").trim()) return true;
  if (Object.keys(state.testPicks).length) return true;
  if (state.skippedIds.length) return true;
  return state.queue.some(function (id) { return isFinal(state.setMarks[id]); });
}

/** How many items in a saved set are still open. */
function remaining(draft) {
  if (!draft) return 0;
  return unanswered(draft.queue, draft.testPicks, draft.setMarks).length;
}

/** Storage key. A test from a section, a chapter, and review each keep their own draft. */
function bucket(source, scope) {
  if (source === "test") return "test:" + (scope || "review");
  return source;
}

/** A test stays open until it is graded, even when every question already has a choice. */
function stillOpen(draft) {
  if (!draft || !draft.queue || !draft.queue.length) return false;
  if (draft.source === "test") {
    return draft.queue.some(function (id) { return !isFinal((draft.setMarks || {})[id]); });
  }
  return remaining(draft) > 0;
}

/** Write the prototype draft book. This key is not the product record. */
function persistDrafts() {
  const payload = JSON.stringify({
    drafts: state.drafts,
    answers: state.answers,
    priorOwed: state.priorOwed,
    lastChange: state.lastChange,
    place: {
      bookOpen: state.bookOpen,
      bookVol: state.bookVol,
      volId: state.volId,
      chNo: state.chNo,
      secId: state.secId,
      mapMode: state.mapMode,
      mapPoint: state.mapPoint,
      mapCard: state.mapCard,
      mapChapter: state.mapChapter,
      mapNetNo: state.mapNetNo,
      mapLevel: state.mapLevel,
      mapSection: state.mapSection,
      mapShowAll: state.mapShowAll,
      mapSideOpen: state.mapSideOpen,
      mapSkill: state.mapSkill,
      methodId: state.methodId,
      qId: state.qId,
      qVol: state.qVol,
      qNo: state.qNo,
      mapBook: state.mapBook,
      mapLiteracy: state.mapLiteracy,
      mapMethod: state.mapMethod,
      mapIdea: state.mapIdea,
      checked: state.checked,
      scrolls: state.scrolls,
      recordFrom: state.recordFrom,
      chapterFrom: state.chapterFrom
    }
  });
  try { sessionStorage.setItem("mc-proto-drafts", payload); } catch (error) { /* prototype only */ }
  try { localStorage.setItem("mc-proto-drafts", payload); } catch (error) { /* prototype only */ }
}

/** Remember one in-progress set for its source. Other sources keep their own. */
function saveDraft() {
  const scope = state.source === "test" && state.liveScope ? state.liveScope : state.testScope;
  const key = bucket(state.source, scope);
  state.drafts[key] = {
    queue: state.queue.slice(),
    index: state.index,
    mode: state.mode,
    source: state.source,
    picked: state.picked,
    revealed: state.revealed,
    hintOpen: state.hintOpen,
    hintFold: Object.assign({}, state.hintFold),
    hintPanel: state.hintPanel,
    hintUsed: Object.assign({}, state.hintUsed),
    given: Object.assign({}, state.given),
    blank: state.blank,
    openText: state.openText,
    processOpen: state.processOpen,
    processes: Object.assign({}, state.processes),
    awaitingJudge: state.awaitingJudge,
    testPicks: Object.assign({}, state.testPicks),
    testSkipped: Object.assign({}, state.testSkipped),
    setMarks: Object.assign({}, state.setMarks),
    setPeeked: Object.assign({}, state.setPeeked),
    skippedIds: state.skippedIds.slice(),
    baseline: Object.assign({}, state.baseline),
    testScope: scope,
    chapterBefore: state.chapterBefore,
    kpName: state.kpName,
    key: key,
    savedAt: Date.now()
  };
  persistDrafts();
}

/** Restore an in-progress set, including marks already handed in. */
function resumeDraft(source) {
  const draft = state.drafts[source];
  if (!draft) return;
  state.queue = draft.queue.slice();
  state.index = draft.index;
  state.mode = draft.mode;
  state.source = draft.source;
  state.picked = draft.picked;
  state.revealed = draft.revealed;
  state.hintOpen = draft.hintOpen;
  state.hintFold = Object.assign({}, draft.hintFold || {});
  state.hintPanel = draft.hintPanel || "";
  state.hintUsed = Object.assign({}, draft.hintUsed || {});
  state.given = Object.assign({}, draft.given || {});
  state.blank = draft.blank || "";
  state.openText = draft.openText || "";
  state.processOpen = !!draft.processOpen;
  state.processes = Object.assign({}, draft.processes || {});
  state.awaitingJudge = !!draft.awaitingJudge;
  state.testPicks = Object.assign({}, draft.testPicks);
  state.testSkipped = Object.assign({}, draft.testSkipped || {});
  state.setMarks = Object.assign({}, draft.setMarks || {});
  state.setPeeked = Object.assign({}, draft.setPeeked || {});
  state.skippedIds = (draft.skippedIds || []).slice();
  state.baseline = Object.assign({}, draft.baseline);
  state.testScope = draft.testScope;
  state.liveScope = draft.source === "test" ? draft.testScope : "";
  state.chapterBefore = typeof draft.chapterBefore === "number" ? draft.chapterBefore : null;
  if (draft.kpName) state.kpName = draft.kpName;
  Object.keys(state.setMarks).forEach(function (id) { state.answers[id] = state.setMarks[id]; });
  state.rail = true;
  go(setRoute(draft.mode));
}

/** Drop one source's draft. A test drops its marks. Practice keeps handed-in marks. */
function abandonDraft(source) {
  const draft = state.drafts[source];
  if (draft && draft.source === "test" && draft.setMarks) {
    Object.keys(draft.setMarks).forEach(function (id) {
      if (draft.baseline[id]) state.answers[id] = draft.baseline[id];
      else delete state.answers[id];
    });
  }
  delete state.drafts[source];
  persistDrafts();
}

/** Forget a finished source so a reload cannot bring that set back. */
function clearDraft(source) {
  delete state.drafts[source];
  persistDrafts();
}

/** Open a new set. Marks from earlier sets stay in the record and do not count as this set. */
function beginQueue(ids, mode, source) {
  const baseline = {};
  ids.forEach(function (id) {
    if (state.answers[id]) baseline[id] = state.answers[id];
  });
  state.baseline = baseline;
  state.setMarks = {};
  state.setPeeked = {};
  state.skippedIds = [];
  state.queue = ids.slice();
  state.index = 0;
  state.mode = mode;
  state.source = source;
  state.chapterBefore = chapterOk();
  if (source === "test" && state.pendingScope) state.testScope = state.pendingScope;
  state.liveScope = source === "test" ? state.testScope : "";
  state.picked = null;
  state.revealed = false;
  state.hintOpen = 0;
  state.hintFold = {};
  state.hintPanel = "";
  state.blank = "";
  state.openText = "";
  state.processOpen = false;
  state.awaitingJudge = false;
  state.formatNote = "";
  state.explainId = null;
  state.showOk = false;
  state.afterExplain = false;
  ids.forEach(function (id) {
    delete state.hintUsed[id];
    delete state.given[id];
    delete state.processes[id];
  });
  state.testPicks = {};
  state.testSkipped = {};
  state.rail = true;
  clearDraft(bucket(source, source === "test" ? state.liveScope : state.testScope));
  go(setRoute(mode));
}

/** Start a set. Only the same source's open draft has to be finished or dropped. */
function startQueue(ids, mode, source) {
  if (!ids || !ids.length) {
    state.flash = source === "test" ? "暂时没有能测的题" : "暂时没有能练的题";
    render();
    return;
  }
  const scope = source === "test" ? (state.pendingScope || state.testScope) : state.testScope;
  const key = bucket(source, scope);
  const existing = state.drafts[key];
  if (existing && stillOpen(existing)) {
    const test = source === "test";
    openDialog("还有一组没做完", "先做完或放弃这一来源的那一组，再开新的。", test ? "放弃这次测试" : "放弃那一组", function () {
      abandonDraft(key);
      beginQueue(ids, mode, source);
    }, test ? "接着测" : "接着做那一组", function () { resumeDraft(key); });
    return;
  }
  beginQueue(ids, mode, source);
}

/** Newest open draft, used when a reload lands on an empty practice page. */
function newestDraft(testOnly) {
  let best = null;
  Object.keys(state.drafts).forEach(function (key) {
    const isTest = key.indexOf("test") === 0;
    if (testOnly === true && !isTest) return;
    if (testOnly === false && isTest) return;
    const draft = state.drafts[key];
    if (!stillOpen(draft)) return;
    if (!best || (draft.savedAt || 0) > (best.savedAt || 0)) best = draft;
  });
  return best;
}

/** Page to return to for the current set. */
function homeRoute() {
  if (state.source === "test") {
    if (state.testScope === "section") return "section";
    if (state.testScope === "chapter") return "chapter";
    return "review";
  }
  if (state.source === "review" || state.source === "kp") return state.source === "kp" ? "kp" : "review";
  if (state.source === "section" || state.source === "chapter" || state.source === "map") return "section";
  return "today";
}

/** Move the hash and redraw. Hash changes are real history entries. */
function rememberScroll() {
  const main = document.getElementById("main");
  if (!main) return;
  state.scrolls[state.route] = main.scrollTop;
}

function restoreScroll() {
  const main = document.getElementById("main");
  const top = state.scrolls[state.route];
  if (main && typeof top === "number") main.scrollTop = top;
}

/** Remember where the record page was opened from. Returning from its own chapter does not count. */
function noteRecordFrom(from) {
  if (from === "chapter" && state.chapterFrom === "record") return;
  if (from && from !== "record") state.recordFrom = from;
}

function go(route) {
  rememberScroll();
  if (route === "record" && state.route !== "record") noteRecordFrom(state.route);
  state.flash = "";
  if (route === "result" && state.route !== "result" && state.route !== "kp") {
    state.explainId = null;
    state.showOk = false;
  }
  if (state.route === "review" && route !== "review") state.testBack = "";
  state.route = route;
  if (route !== "practice" && route !== "test" && route !== "result") state.rail = false;
  state.ignoreHash = true;
  location.hash = "#/" + route;
  state.ignoreHash = false;
  render();
  restoreScroll();
  persistDrafts();
}

/** Ask before leaving a set that already has work. */
function requestLeave(dest) {
  if (!isDirty()) {
    go(dest);
    return;
  }
  if (state.mode !== "test" && !unanswered(state.queue).length) {
    finishSet();
    return;
  }
  const test = state.mode === "test";
  const answered = state.queue.filter(function (id) { return isFinal(state.setMarks[id]); }).length;
  const left = unanswered(state.queue).length;
  openDialog(
    test ? "测试还没交卷" : "这一组还没交卷",
    test
      ? "已写的答案会留着，交卷前不会判对错。"
      : "已交的 " + answered + " 题已经记下，没做的 " + left + " 题会留着，回来可以接着做。",
    "先离开",
    function () {
      saveDraft();
      go(dest);
    },
    "接着做",
    function () {}
  );
}

/** Draw the five-item navigation. */
function drawNav() {
  const items = [
    ["today", "今天"],
    ["book", "课本"],
    ["map", "图谱"],
    ["review", "回顾"],
    ["record", "我的记录"]
  ];
  const nav = document.getElementById("nav");
  nav.className = state.rail ? "nav rail" : "nav";
  var legacy = location.pathname.indexOf("beijing-math-practice") >= 0
    ? '<a class="legacy" href="../../../../#old" target="_top">原来的站点</a>'
    : "";
  nav.innerHTML = '<p class="brand">数学练习</p>' + legacy + items.map(function (item) {
    const current = state.nav === item[0] ? ' aria-current="page"' : "";
    return '<a href="#/' + item[0] + '"' + current + ' data-dest="' + item[0] + '">' + item[1] + "</a>";
  }).join("");
}

/** Primary label for a page that may have a saved set. */
function resumeLabel(source) {
  const draft = state.drafts[source];
  if (!draft || !stillOpen(draft)) return "";
  if (source.indexOf("test") === 0) {
    const left = remaining(draft);
    if (!left) return "接着测 · 还没交卷";
    return "接着测 · 还剩 " + left + " 题";
  }
  const left = remaining(draft);
  if (!left) return "";
  return "接着做 · 还剩 " + left + " 题";
}

/** Today page with one section and a single primary action. */
function viewToday() {
  state.nav = "today";
  if (hashParam("load") === "1") {
    return '<h1>今天</h1><section class="card"><p>正在打开……</p></section>';
  }
  if (hashParam("down") === "1") {
    return '<h1>今天</h1><section class="card"><p>今天的推荐暂时出不来。</p>' +
      '<button class="btn" id="to-book">按课本目录挑一节</button></section>';
  }
  const owed = retryIds().length;
  const resume = resumeLabel("today");
  const started = Object.keys(state.answers).length > 0;
  const blurb = started
    ? "12.1 讲三角形的定义和记法。做错或跳过的可以回到回顾。"
    : "还没开始练。先从 12.1《三角形》做 6 道题吧，课本第 74 页。";
  const owedBar = owed
    ? '<div class="card owed"><span class="muted">有 ' + owed + ' 道要重做</span> <button class="link" id="to-review">去回顾 ›</button></div>'
    : "";
  const progress = sectionDone()
    ? '<p class="progress"><button type="button" class="link" id="to-chapter">第 12 章 · 12.1 练过</button></p>'
    : "";
  const extra = resume
    ? '<button class="btn danger" id="abandon">放弃这一组</button>'
    : '<button class="link" id="see-section">先看这一节</button>';
  const points = [
    ["三角形的定义", "课本第 74 页"],
    ["三角形的元素", "边、角、顶点"],
    ["三边关系", "两边之和大于第三边"],
    ["三角形的记法", "△ABC"]
  ];
  const rows = points.map(function (pair) {
    return '<button class="kp-row" data-kp-name="' + pair[0] + '"><strong>' + pair[0] + '</strong><span class="muted">' + pair[1] + "</span></button>";
  }).join("");
  return '<h1>今天练这一节</h1><div class="today"><div class="today-side"><section class="card task"><span class="chip">八年级上册 · 第 12 章 三角形</span>' +
    '<div class="hero">12.1 三角形</div><p class="muted">课本第 74 页 · 6 个知识点</p><p>' + blurb + '</p>' +
    '<div class="row"><button class="btn" id="start">' + (resume || "开始练 · 6 题") + "</button>" + extra +
    '</div></section><section class="card points"><h2>这一节先看这 4 个</h2><div class="kp-rows">' + rows +
    "</div></section>" + owedBar + progress + "</div>" +
    '<section class="card qs"><h2>今天这 6 道</h2><div class="qgrid">' +
    QUESTIONS.map(function (item, index) {
      return '<article class="qcell"><p class="stem">' + (index + 1) + ". " + item.stem + '</p><p class="muted">' +
        item.kp + (item.kind === "blank" ? " · 填空" : item.kind === "open" ? " · 自己判" : "") + "</p></article>";
    }).join("") + "</div></section></div>";
}

/** True when any of the six demo questions already has a final mark. */
function sectionDone() {
  return QUESTIONS.some(function (item) { return isFinal(state.answers[item.id]); });
}

let CATALOG = null;

function catalog() {
  if (CATALOG) return CATALOG;
  const graph = window.MC && window.MC.graph;
  if (!graph || !graph.nodes) return null;
  const byId = {};
  graph.nodes.forEach(function (node) { byId[node.id] = node; });
  const volumes = graph.nodes.filter(function (node) { return node.kind === "volume"; })
    .sort(function (a, b) { return String(a.vol).localeCompare(String(b.vol)); });
  const chapters = graph.nodes.filter(function (node) { return node.kind === "chapter"; })
    .sort(function (a, b) { return Number(a.ch) - Number(b.ch); });
  const sections = graph.nodes.filter(function (node) { return node.kind === "section"; })
    .sort(function (a, b) { return String(a.sec).localeCompare(String(b.sec), undefined, { numeric: true }); });
  const competencies = graph.nodes.filter(function (node) { return node.kind === "competency"; })
    .sort(function (a, b) { return String(a.id).localeCompare(String(b.id)); });
  const thoughts = graph.nodes.filter(function (node) { return node.kind === "thought"; });
  const chByVol = {};
  const secsByCh = {};
  const kpsBySec = {};
  const skillsBySec = {};
  chapters.forEach(function (node) { (chByVol[node.vol] = chByVol[node.vol] || []).push(node); });
  sections.forEach(function (node) { (secsByCh[node.vol + "-" + node.ch] = secsByCh[node.vol + "-" + node.ch] || []).push(node); });
  graph.nodes.forEach(function (node) {
    if (node.kind === "knowledge_point" && node.sec) (kpsBySec[node.sec] = kpsBySec[node.sec] || []).push(node);
    if (node.kind === "skill" && node.sec) (skillsBySec[node.sec] = skillsBySec[node.sec] || []).push(node);
  });
  const thoughtBySkill = {};
  const compByThought = {};
  (graph.edges || []).forEach(function (edge) {
    const from = byId[edge.s];
    const to = byId[edge.d];
    if (!from || !to) return;
    if (edge.r === "belongs_to") {
      const skill = from.kind === "skill" ? from : to.kind === "skill" ? to : null;
      const thought = from.kind === "thought" ? from : to.kind === "thought" ? to : null;
      if (skill && thought && skill !== thought) (thoughtBySkill[skill.id] = thoughtBySkill[skill.id] || []).push(thought);
    }
    if (edge.r === "supports") {
      const thought = from.kind === "thought" ? from : to.kind === "thought" ? to : null;
      const comp = from.kind === "competency" ? from : to.kind === "competency" ? to : null;
      if (thought && comp) (compByThought[thought.id] = compByThought[thought.id] || []).push(comp);
    }
  });
  CATALOG = {
    byId: byId, volumes: volumes, chapters: chapters, sections: sections,
    competencies: competencies, thoughts: thoughts, chByVol: chByVol, secsByCh: secsByCh,
    kpsBySec: kpsBySec, skillsBySec: skillsBySec, thoughtBySkill: thoughtBySkill, compByThought: compByThought
  };
  return CATALOG;
}

function activeVol() {
  const cat = catalog();
  if (!state.mapBook) return "";
  if (!cat) return state.mapBook === "八年级上册" ? "801" : state.mapBook;
  const hit = cat.volumes.filter(function (vol) { return vol.vol === state.mapBook || vol.title === state.mapBook; })[0];
  return hit ? hit.vol : "";
}

function activeChapterKey() {
  if (state.mapChapter === true) return "801-12";
  if (typeof state.mapChapter === "string" && state.mapChapter) return state.mapChapter;
  return "";
}

function currentChapter() {
  const cat = catalog();
  if (!cat) return null;
  const vol = state.volId || "801";
  const ch = String(state.chNo || "12");
  return (cat.chByVol[vol] || []).filter(function (node) { return String(node.ch) === ch; })[0] || null;
}

function currentSection() {
  const cat = catalog();
  if (!cat) return null;
  const sec = state.secId || "12.1";
  return cat.sections.filter(function (node) { return node.sec === sec; })[0] || null;
}

function enterChapter(vol, ch, from) {
  state.volId = vol;
  state.chNo = String(ch);
  state.bookVol = vol;
  state.chapterFrom = from || "book";
  go("chapter");
}

function openSection(vol, ch, sec) {
  state.volId = vol;
  state.chNo = String(ch);
  state.secId = sec;
  state.bookVol = vol;
  go("section");
}

/** Textbook volumes, chapters and sections from the existing graph. */
function viewBook() {
  state.nav = "book";
  if (hashParam("load") === "1") {
    return '<h1>课本</h1><section class="card"><p>正在打开……</p></section>';
  }
  if (hashParam("down") === "1") {
    return '<h1>课本</h1><div class="book-list"><p class="vol">这一册暂时打不开</p></div>';
  }
  const cat = catalog();
  if (!cat) return '<h1>课本</h1><section class="card"><p>图谱还在打开。</p></section>';
  const openVol = state.bookVol;
  const html = cat.volumes.map(function (vol) {
    const open = openVol === vol.vol;
    const chapters = cat.chByVol[vol.vol] || [];
    const body = open ? chapters.map(function (ch) {
      const key = ch.vol + "-" + ch.ch;
      const secs = cat.secsByCh[key] || [];
      let kpCount = 0;
      secs.forEach(function (sec) { kpCount += (cat.kpsBySec[sec.sec] || []).length; });
      const secHtml = secs.map(function (sec) {
        const count = (cat.kpsBySec[sec.sec] || []).length;
        return '<button type="button" class="sec-row" data-book-sec="' + esc(sec.sec) + '" data-book-vol="' + esc(sec.vol) + '" data-book-ch="' + esc(sec.ch) + '"><span>' + esc(sec.title) + '</span><span class="muted">' + count + " 个知识点</span></button>";
      }).join("");
      return '<div class="ch-block"><button type="button" class="ch-row" data-book-ch="' + esc(ch.ch) + '" data-book-vol="' + esc(ch.vol) + '"><span>' + esc(ch.title) + '</span><span class="muted">' + secs.length + " 节 · " + kpCount + " 个知识点</span></button>" + secHtml + "</div>";
    }).join("") : "";
    return '<button type="button" class="vol" data-book-vol="' + esc(vol.vol) + '">' + esc(vol.title) + " · " + chapters.length + " 章 · " + (open ? "收起" : "展开") + "</button>" + body;
  }).join("");
  return '<h1>课本</h1><div class="book-list">' + html + "</div>";
}

/** Chapter page. Sections come from the graph. The playable test stays on chapter 12. */
function viewChapter() {
  state.nav = "book";
  if (hashParam("missing") === "1") {
    return '<h1>找不到这一章</h1><section class="card"><p>找不到这一章。</p>' +
      '<button class="btn" id="to-book">回到课本</button></section>';
  }
  const chapter = currentChapter();
  const title = chapter ? chapter.title : "这一章";
  if (hashParam("load") === "1") {
    return "<h1>" + esc(title) + '</h1><section class="card"><p>正在打开……</p></section>';
  }
  if (!chapter) {
    return '<h1>找不到这一章</h1><section class="card"><p>找不到这一章。</p><button class="btn" id="to-book">回到课本</button></section>';
  }
  const cat = catalog();
  const secs = (cat && cat.secsByCh[chapter.vol + "-" + chapter.ch]) || [];
  const demo = chapter.vol === "801" && String(chapter.ch) === "12";
  const rows = secs.map(function (sec) {
    const count = (cat.kpsBySec[sec.sec] || []).length;
    const note = demo && sec.sec === "12.1" ? (sectionDone() ? " · 示意题练过" : " · 有示意题") : "";
    return '<button type="button" class="kp-row" data-book-sec="' + esc(sec.sec) + '" data-book-vol="' + esc(sec.vol) + '" data-book-ch="' + esc(sec.ch) + '"><strong>' + esc(sec.title) + '</strong><span class="muted">' + count + " 个知识点" + note + "</span></button>";
  }).join("");
  const first = secs[0];
  const testHere = demo && stillOpen(state.drafts["test:chapter"]);
  const testLabel = testHere ? resumeLabel("test:chapter") : "";
  const firstBtn = first
    ? '<button class="btn" data-book-sec="' + esc(first.sec) + '" data-book-vol="' + esc(first.vol) + '" data-book-ch="' + esc(first.ch) + '">先看 ' + esc(first.sec) + "</button>"
    : "";
  const actions = testLabel
    ? '<button class="btn" id="test-chapter">' + testLabel + "</button>" + firstBtn +
      '<button type="button" class="link" id="abandon-test">放弃这次测试</button>'
    : firstBtn +
      (demo ? '<button type="button" class="link" id="test-chapter">测一下这一章</button>' : "") +
      '<button type="button" class="link" id="see-map">在图里看本章</button>';
  let kpTotal = 0;
  secs.forEach(function (sec) { kpTotal += (cat.kpsBySec[sec.sec] || []).length; });
  const weak = demo ? (weakPoints().length
    ? weakPoints().map(function (point) { return "<p>" + esc(point.name) + " · " + point.why + "</p>"; }).join("")
    : '<p class="muted">' + (Object.keys(state.answers).length ? "这一章还看不出哪里不稳。" : "还没练过这一章。示意题只接在 12.1。") + "</p>")
    : '<p class="muted">这一章的练习还没接到示意题上。节和知识点来自现有图谱。</p>';
  return "<h1>" + esc(title) + '</h1><div class="chapter-page"><div class="chapter-body"><section class="card"><h2>这一章的节</h2><p class="muted">' +
    secs.length + " 节 · " + kpTotal + ' 个知识点</p><div class="kp-rows scroll">' + rows + "</div></section>" +
    '<section class="card"><h2>这一章哪里不稳</h2>' + weak + "</section></div>" +
    '<div class="chapter-side">' + actions + "</div></div>";
}

/** Section page. Knowledge points come from the graph. Only 12.1 keeps the six demo questions. */
function viewSection() {
  state.nav = "book";
  if (hashParam("missing") === "1") {
    return '<h1>找不到这一节</h1><section class="card"><p>找不到这一节。</p>' +
      '<button class="btn" id="to-book">回到课本</button></section>';
  }
  const sec = currentSection();
  const title = sec ? sec.title : "这一节";
  if (hashParam("empty") === "1") {
    return "<h1>" + esc(title) + '</h1><section class="card"><p>这一节暂时没有能练的题。</p>' +
      '<button class="btn" disabled>开始练 · 6 题</button>' +
      '<p><button type="button" class="link" id="back-ch">回到这一章</button></p></section>';
  }
  if (hashParam("load") === "1") {
    return "<h1>" + esc(title) + '</h1><section class="card"><p>正在打开……</p></section>';
  }
  if (!sec) {
    return '<h1>找不到这一节</h1><section class="card"><p>找不到这一节。</p><button class="btn" id="to-book">回到课本</button></section>';
  }
  const cat = catalog();
  const kps = (cat && cat.kpsBySec[sec.sec]) || [];
  const skills = (cat && cat.skillsBySec[sec.sec]) || [];
  const demo = sec.vol === "801" && sec.sec === "12.1";
  const points = kps.map(function (kp) {
    return '<button type="button" class="kp-row" data-kp-name="' + esc(kp.id) + '"><strong>' + mathHtml(kpLabel(kp.title)) + "</strong></button>";
  }).join("");
  const skillLine = skills.length
    ? skills.slice(0, 8).map(function (skill) { return mathHtml(kpLabel(skill.title)); }).join("、") + (skills.length > 8 ? " 等 " + skills.length + " 个" : "")
    : "这一节在图谱里还没有挂方法。";
  let actions = '<button class="btn" id="see-section-map">在图里看这一节</button>';
  let note = '<p class="muted">这一节的知识点来自现有图谱。示意题还只接在 12.1。</p>';
  if (demo) {
    const resume = resumeLabel("section");
    const testHere = stillOpen(state.drafts["test:section"]);
    const testLabel = testHere ? resumeLabel("test:section") : "";
    if (resume) {
      actions = '<button class="btn" id="start">' + resume + '</button>' +
        '<button type="button" class="link" id="abandon">放弃这一组</button>' +
        (testLabel
          ? '<button type="button" class="link" id="test-section">' + testLabel + '</button><button type="button" class="link" id="abandon-test">放弃这次测试</button>'
          : '<button type="button" class="link" id="test-section">测一下这一节</button>') +
        '<button type="button" class="link" id="see-section-map">在图里看这一节</button>';
    } else if (testLabel) {
      actions = '<button class="btn" id="test-section">' + testLabel + '</button>' +
        '<button type="button" class="link" id="start">开始练 · 6 题</button>' +
        '<button type="button" class="link" id="abandon-test">放弃这次测试</button>' +
        '<button type="button" class="link" id="see-section-map">在图里看这一节</button>';
    } else {
      actions = '<button class="btn" id="start">开始练 · 6 题</button>' +
        '<button type="button" class="link" id="test-section">测一下这一节</button>' +
        '<button type="button" class="link" id="see-section-map">在图里看这一节</button>';
    }
    note = '<p class="muted">上面是这一节的全部知识点。能交卷的还是原来的 6 道示意题。</p>';
  }
  return "<h1>" + esc(title) + '</h1><div class="chapter-page"><div class="section-body">' +
    '<section class="card"><h2>知识点</h2><p class="muted">' + kps.length + ' 个</p><div class="kp-rows scroll">' +
    (points || "<p>这一节还没有知识点。</p>") + "</div></section>" +
    '<p class="chapter-notes">方法：' + skillLine + "</p>" + note + "</div>" +
    '<div class="chapter-side"><p class="muted">' + (demo && sectionDone() ? "示意题练过" : demo ? "示意题还没练" : "还没接到练习") + "</p>" + actions + "</div></div>";
}

function viewGraphKp(node) {
  const net = ensureNet();
  function links(ids) {
    return (ids || []).map(function (id) { return net.byId[id]; }).filter(function (item) {
      return item && item.kind === "knowledge_point";
    }).slice(0, 8).map(function (item) {
      return '<button type="button" class="link" data-kp-jump="' + esc(item.id) + '">' + mathHtml(kpLabel(item.title)) + "</button>";
    }).join("");
  }
  const pres = links(net.pre[node.id]);
  const posts = links(net.post[node.id]);
  const skills = (net.skillByKp[node.id] || []).slice(0, 6).map(function (skill) {
    return mathHtml(kpLabel(skill.title));
  }).join("、");
  return '<div class="kp-page"><p class="chip">从图谱来 · <button class="link" id="kp-map">回到图谱</button></p><h1>' +
    mathHtml(node.title) + '</h1><section class="card"><p>第 ' + esc(node.ch) + " 章 · " + esc(node.sec) +
    "</p><p>" + mathHtml(node.title) + "</p></section>" +
    '<div class="kp-rel"><section><h3>前置</h3>' + (pres || '<span class="muted">这是起点</span>') + "</section>" +
    "<section><h3>当前</h3><strong>" + mathHtml(kpLabel(node.title)) + "</strong></section>" +
    "<section><h3>后置</h3>" + (posts || '<span class="muted">暂时没有接着学的</span>') + "</section></div>" +
    "<h2>方法</h2><p>" + (skills || "现有图谱里还没有挂方法。") + "</p>" +
    '<div class="dock"><button class="btn" id="kp-map">回到图谱</button></div></div>';
}

function listHtml(items, empty) {
  if (!items || !items.length) return "<p>" + empty + "</p>";
  return "<ul>" + items.map(function (item) { return "<li>" + mathHtml(item) + "</li>"; }).join("") + "</ul>";
}

function viewMethod() {
  state.nav = "map";
  const id = state.methodId || state.mapSkill;
  const pack = id && skillBundle(id);
  if (!pack) return '<div class="kp-page method-page"><h1>方法</h1><p>先在图谱里点一个方法。</p><div class="dock"><button class="btn" id="method-map">回到图谱</button></div></div>';
  const skill = pack.skill;
  const rec = pack.rec;
  const sec = pack.sec;
  const edges = (window.MC.graph && window.MC.graph.edges) || [];
  const steps = rec && rec.steps ? rec.steps.slice().sort(function (a, b) { return (a.ordinal || 0) - (b.ordinal || 0); }) : [];
  const stepHtml = steps.length
    ? "<ol>" + steps.map(function (step) {
      return "<li><p>" + mathHtml(step.action || "") + "</p>" + (step.basis ? "<p>" + mathHtml(step.basis) + "</p>" : "") + "</li>";
    }).join("") + "</ol>"
    : "<p>步骤还没有写进这一节的数据。</p>";
  const alt = (rec && rec.alternatives) || [];
  const altHtml = alt.length
    ? alt.map(function (uid) {
      const named = (sec && (sec.skills || []).filter(function (item) { return item.uid === uid; })[0]) || graphById(uid);
      const label = named ? (named.name || named.title) : uid;
      if (!named) return "<p>" + esc(uid) + "</p>";
      return '<p><button type="button" class="link" data-open-skill="' + esc(uid) + '">' + mathHtml(label) + "</button></p>";
    }).join("")
    : "<p>没有标其他做法。</p>";
  const thoughtIds = {};
  ((rec && rec.thoughts) || []).forEach(function (tid) { thoughtIds[tid] = 1; });
  edges.forEach(function (edge) {
    if (edge.r === "belongs_to" && edge.s === skill.id) thoughtIds[edge.d] = 1;
  });
  const thoughtKeys = Object.keys(thoughtIds);
  const thoughtHtml = thoughtKeys.length
    ? thoughtKeys.map(function (tid) {
      const node = graphById(tid);
      return "<p>" + esc(node && node.title ? node.title : tid) + "</p>";
    }).join("")
    : "<p>图谱里还没有把这条方法连到思想上。</p>";
  const siblings = sec && sec.skills ? sec.skills.filter(function (item) { return item.uid !== skill.id; }) : [];
  const siblingHtml = siblings.length
    ? "<section><h2>同一节的其他方法</h2>" + siblings.map(function (item) {
      return '<p><button type="button" class="link" data-open-skill="' + esc(item.uid) + '">' + mathHtml(item.name || item.uid) + "</button></p>";
    }).join("") + "</section>"
    : "";
  const before = [];
  const after = [];
  edges.forEach(function (edge) {
    if (edge.r !== "prerequisite_of") return;
    const from = graphById(edge.s);
    const to = graphById(edge.d);
    if (edge.d === skill.id && from && from.kind === "skill") before.push(from.title || from.id);
    if (edge.s === skill.id && to && to.kind === "skill") after.push(to.title || to.id);
  });
  const orderHtml = before.length || after.length
    ? "<p>教材不写方法之间的先后。这是图谱里已有的边，还没有教研复核。</p>" +
      (before.length ? "<p>先有</p>" + listHtml(before, "") : "") +
      (after.length ? "<p>之后</p>" + listHtml(after, "") : "")
    : "<p>图谱里没有标方法的先后。</p>";
  const covered = {};
  (pack.net.skillKps[skill.id] || []).forEach(function (kp) { covered[kp.id] = 1; });
  const mistakes = [];
  const seenMc = {};
  edges.forEach(function (edge) {
    if (edge.r !== "misconception_of" || !covered[edge.d] || seenMc[edge.s]) return;
    seenMc[edge.s] = 1;
    const mc = sec && (sec.mcs || []).filter(function (item) { return item.uid === edge.s; })[0];
    if (mc && mc.signals && mc.signals.length) mc.signals.forEach(function (line) { mistakes.push(line); });
    else {
      const node = graphById(edge.s);
      mistakes.push(node && node.title ? node.title : edge.s);
    }
  });
  const qs = (rec && rec.qs) || [];
  const seenFiles = {};
  qs.forEach(function (item) {
    const key = item.vol + "-" + item.no;
    if (seenFiles[key]) return;
    seenFiles[key] = 1;
    ensureItems(item.vol, item.no);
  });
  const qTitle = rec && rec.qn
    ? "练习标了 " + rec.qn + " 道，这里先列 " + qs.length + " 道。这些不是教材例题。点一道就打开原题。"
    : "这里先列 " + qs.length + " 道练习。点一道就打开原题。";
  const qHtml = qs.length
    ? "<p class=\"muted\">" + qTitle + "</p>" + qs.map(function (item) {
      const packItems = window.MC["items:" + item.vol + "-" + item.no];
      const found = packItems && (packItems.items || []).filter(function (row) { return row.id === item.id; })[0];
      const stem = found ? mathHtml(found.stem) : esc(bandLabel(item.band) + " · " + (item.no || "") + " · " + String(item.id || "").split("_").pop());
      return '<button type="button" class="kp-row q-row" data-open-q="' + esc(item.id) + '" data-q-vol="' + esc(item.vol || "") + '" data-q-no="' + esc(item.no || "") + '"><em>' + esc(bandLabel(item.band)) + "</em><span>" + stem + "</span></button>";
    }).join("")
    : "<p>这一条还没有挂练习题。</p>";
  const exPack = ensureEx(skill.vol, skill.sec);
  let exampleHtml = "<p>正在打开这一节的教材例题。</p>";
  if (exPack && exPack.missing) exampleHtml = "<p>这一节没有单独的教材例题。</p>";
  else if (exPack) {
    const linked = (exPack.items || []).filter(function (item) {
      return (item.kps || []).some(function (kp) { return kp.m1 && kp.m1.uid === skill.id; });
    });
    if (!linked.length) {
      exampleHtml = "<p>教材例题是单独一份数据，用「这道题的做法」标到方法上。这一条还没有被标上，所以不拿别的题来充。</p>";
    } else {
      const shown = linked.slice(0, 3);
      exampleHtml = '<p class="muted">教材例题里有 ' + linked.length + " 道标了这个方法。先列 " + shown.length + " 道，解析原来就写在例题里。</p>" +
        shown.map(function (item) {
          return '<article class="ex-card"><p class="stem">' + mathHtml(item.stem || "") + '</p><details><summary>看这道例题的解析</summary><div class="stem">' +
            mathHtml(item.ans || "这道例题的解析还没入库") + "</div></details></article>";
        }).join("");
    }
  }
  const more = "<section><h2>换个做法</h2>" + altHtml + "</section>" +
    "<section><h2>它管不到的地方</h2>" + listHtml(rec && rec.boundaries, "还没有写下它不管的情况。") + "</section>" +
    "<section><h2>用在哪里</h2>" + kpLinks(pack.net.skillKps[skill.id] || []) + "</section>" +
    "<section><h2>它体现的思想</h2>" + thoughtHtml + "</section>" +
    siblingHtml +
    "<section><h2>先练哪个</h2>" + orderHtml + "</section>" +
    "<section><h2>用这个方法时容易犯的错</h2>" + (mistakes.length ? listHtml(mistakes, "") : "<p>现有图谱里没有标出用这个方法时的错因。</p>") + "</section>";
  return '<div class="method-page"><header class="card method-head"><h1>' + mathHtml(skill.title) + "</h1><p class=\"muted\">" + esc(skillMeta(skill, rec, sec)) + "</p>" +
    (rec && rec.desc ? "<p>" + mathHtml(rec.desc) + "</p>" : "<p>这条方法还没有一句话说明。</p>") +
    '<div class="method-acts"><button class="btn" id="method-map">回到图谱</button><button type="button" class="link" id="method-section">去这一节</button></div></header>' +
    '<div class="method-grid"><section class="card"><h2>怎么做</h2>' + stepHtml +
    "<h2>什么时候用</h2>" + listHtml(rec && rec.conditions, "还没有写下什么时候用。") +
    "<h2>做错的样子</h2>" + listHtml(rec && rec.signals, "还没有写下做错的样子。") +
    '</section><section class="card"><h2>教材例题</h2>' + exampleHtml +
    "<h2>用它做过的题</h2>" + qHtml + "</section></div>" +
    '<details class="card method-more"><summary>其余说明</summary>' + more + "</details></div>";
}

function viewQ() {
  state.nav = "map";
  const pack = state.methodId && skillBundle(state.methodId);
  const list = (pack && pack.rec && pack.rec.qs) || [];
  const index = list.findIndex(function (item) { return item.id === state.qId; });
  const ref = list[index] || { id: state.qId, vol: state.qVol, no: state.qNo };
  const items = ref.vol && ref.no ? ensureItems(ref.vol, ref.no) : null;
  const found = items && (items.items || []).filter(function (row) { return row.id === ref.id; })[0];
  if (!found && ref.id && items === null) return '<div class="method-page"><section class="card"><h1>正在打开这道题</h1></section></div>';
  if (!found) return '<div class="method-page"><section class="card"><h1>这道题的原文还没有载入</h1><button class="btn" id="q-back">回到这个方法</button></section></div>';
  const opts = found.form === "choice" && found.opts && found.opts.list
    ? '<div class="list">' + found.opts.list.map(function (opt, i) {
      const key = opt.key || String.fromCharCode(65 + i);
      return '<button type="button" class="choice" data-real-choice="' + esc(key) + '"><b>' + esc(key) + "</b> " + mathHtml(opt.text || "") + "</button>";
    }).join("") + "</div>"
    : "";
  const prev = index > 0 ? list[index - 1] : null;
  const next = index >= 0 && index < list.length - 1 ? list[index + 1] : null;
  const jump = (prev ? '<button type="button" class="link" data-open-q="' + esc(prev.id) + '" data-q-vol="' + esc(prev.vol || "") + '" data-q-no="' + esc(prev.no || "") + '">上一题</button>' : "") +
    (next ? '<button type="button" class="link" data-open-q="' + esc(next.id) + '" data-q-vol="' + esc(next.vol || "") + '" data-q-no="' + esc(next.no || "") + '">下一题</button>' : "");
  return '<div class="method-page"><div class="work"><section class="card"><p class="chip">' + esc(bandLabel(found.band || ref.band)) + " · " + esc(ref.no || "") + "</p><p class=\"stem\">" + mathHtml(found.stem || "") + "</p>" + opts +
    (opts ? "" : "<p class=\"muted\">这是原来的题干。答案先收着，点开再看。</p>") +
    '</section><aside class="card"><h2>答案与思路</h2><details><summary>看答案</summary><div class="stem">' + mathHtml(found.ans || "这题答案还没入库") + "</div></details></aside></div>" +
    '<div class="dock"><button class="btn" id="q-back">回到这个方法</button>' + jump + "</div></div>";
}

/** Knowledge point. One solid action: practice this point. The map link stays text. */
function viewKp() {
  state.nav = state.kpFrom === "review" ? "review" : state.kpFrom === "map" ? "map" : state.kpFrom === "today" ? "today" : "book";
  if (hashParam("missing") === "1") {
    return '<h1>找不到这个知识点</h1><section class="card"><p>找不到这个知识点。</p>' +
      '<button class="btn" id="focus-search">搜一搜</button></section>';
  }
  if (hashParam("load") === "1") {
    return '<h1>' + esc(state.kpName) + '</h1><section class="card"><p>正在打开……</p></section>';
  }
  const graphNode = ensureNet() && ensureNet().byId[state.kpName];
  if (graphNode && graphNode.kind === "knowledge_point" && !{
    "三角形的定义": 1, "三角形的元素": 1, "三边关系": 1, "三角形的记法": 1
  }[state.kpName]) return viewGraphKp(graphNode);
  const ids = idsForKp(state.kpName);
  const kpDraft = state.drafts.kp;
  const resume = kpDraft && kpDraft.kpName === state.kpName ? resumeLabel("kp") : "";
  const notes = {
    "三角形的定义": { avoid: "三点共线时不能构成三角形。", use: "用三边关系判三角形。", before: "", beforeLabel: "平面图形（3.1）· 还没放进这版原型", after: "三角形的元素" },
    "三角形的元素": { avoid: "把边和角的个数说反。", use: "先数边、内角和顶点。", before: "三角形的定义", beforeLabel: "", after: "三边关系" },
    "三边关系": { avoid: "两边之和等于第三边也当成能组成。", use: "任意两边之和要大于第三边。", before: "三角形的元素", beforeLabel: "", after: "三角形的记法" },
    "三角形的记法": { avoid: "把 △ABC 读成角 ABC。", use: "用符号 △ 表示三角形。", before: "三角形的定义", beforeLabel: "", after: "", afterLabel: "全等三角形 · 还没放进这版原型" }
  };
  const note = notes[state.kpName] || notes["三角形的定义"];
  const bodies = {
    "三角形的定义": "由不在同一直线上的三条线段首尾顺次相接所组成的图形叫做三角形。",
    "三角形的元素": "三角形有三条边、三个内角和三个顶点。",
    "三边关系": "任意两边之和大于第三边。",
    "三角形的记法": "用符号 △ 表示，读作三角形 ABC。"
  };
  const body = bodies[state.kpName] || bodies["三角形的定义"];
  const back = state.kpFrom === "result"
    ? '<p class="chip">从这一组的结果来 · <button class="link" id="back-from">回到结果</button></p>'
    : state.kpFrom === "review"
      ? '<p class="chip">从回顾来 · <button class="link" id="back-from">回到回顾</button></p>'
      : "";
  let missed = null;
  if (state.kpFrom === "result" || state.kpFrom === "review") {
    const named = state.kpQid ? questionById(state.kpQid) : null;
    if (named && named.kp === state.kpName) missed = named;
    else {
      missed = QUESTIONS.filter(function (item) {
        const mark = state.answers[item.id];
        return item.kp === state.kpName && (mark === "bad" || mark === "empty" || mark === "peek" || mark === "skip");
      }).pop() || null;
    }
  }
  const missedHtml = missed
    ? '<section class="card"><h2>你上次错在这里</h2><p>' + esc(missed.stem) + "</p><p>你的答案：" +
      esc(state.given[missed.id] || "没有留下作答") + '</p><button type="button" class="link" id="kp-explain">看解析</button>' +
      (state.kpExplain ? "<p>" + esc(missed.explain || missed.answer) + "</p>" : "") + "</section>"
    : "";
  function sourceLine(key) {
    return '<button type="button" class="link" data-source="' + key + '">课本第 74 页</button>' +
      (state.kpSource === key ? "<p>" + body + "</p>" : "");
  }
  function relCell(title, name, fallback, sourceKey) {
    const inner = name
      ? '<button type="button" class="link" data-kp-jump="' + name + '">' + name + "</button>"
      : '<span class="muted">' + (fallback || (title === "前置" ? "这是起点" : "暂时没有接着学的")) + "</span>";
    return "<section><h3>" + title + "</h3>" + inner + sourceLine(sourceKey) + "</section>";
  }
  const primary = resume
    ? '<button class="btn" id="resume-kp">' + resume + "</button>"
    : '<button class="btn" id="redo-kp">再练这个知识点</button>';
  return '<div class="kp-page">' + back + "<h1>" + esc(state.kpName) + "</h1>" +
    '<section class="card"><p>' + body + "</p>" + sourceLine("body") + "</section>" + missedHtml +
    '<div class="kp-rel">' + relCell("前置", note.before, note.beforeLabel, "before") +
    "<section><h3>当前</h3><strong>" + esc(state.kpName) + "</strong></section>" +
    relCell("后续", note.after, note.afterLabel, "after") + "</div>" +
    "<h2>方法和思想</h2><p><strong>先用</strong> " + note.use + "</p><p><strong>别用成</strong> " + note.avoid + "</p>" +
    "<h2>相关题</h2><div class=\"kp-qs\">" + QUESTIONS.filter(function (item) { return item.kp === state.kpName; }).map(function (item) {
      const kind = item.kind === "blank" ? "填空" : item.kind === "open" ? "例题" : "选择题";
      return '<button type="button" class="kp-row" data-kp-q="' + item.id + '"><strong>' + kind + "</strong><span>" + esc(item.stem) + "</span></button>";
    }).join("") + "</div>" +
    '<p class="muted">这一知识点 ' + ids.length + " 道示意题。点一道就只做这一道。</p>" +
    '<div class="dock">' + primary + '<button type="button" class="link" id="kp-map">在图里看</button></div></div>';
}

/** Side card for the selected point. It stays under the mode switch. */
function graphPointSide(id, extra) {
  const net = ensureNet();
  const node = net && net.byId[id];
  if (!node || node.kind !== "knowledge_point") return "";
  const preN = (net.pre[node.id] || []).length;
  const postN = (net.post[node.id] || []).length;
  return '<aside class="side"><div class="row"><h2>' + mathHtml(kpLabel(node.title)) + '</h2><button class="link" id="map-close">关闭</button></div>' +
    "<p>" + mathHtml(node.title) + "</p>" +
    "<p>第 " + node.ch + " 章 · " + esc(node.sec) + "</p>" +
    "<p>前置 " + preN + " 个，后置 " + postN + " 个。关系来自现有图谱，原来的数据没有改。</p>" +
    '<button class="btn" id="map-kp">看这个知识点</button>' +
    (extra || "") + "</aside>";
}

function graphById(id) {
  if (!graphById.cache) {
    graphById.cache = {};
    const nodes = window.MC && window.MC.graph && window.MC.graph.nodes;
    (nodes || []).forEach(function (node) { graphById.cache[node.id] = node; });
  }
  return graphById.cache[id] || null;
}

function ensureSlice(key, src) {
  if (window.MC && window.MC[key]) return window.MC[key];
  if (!key || !src) return null;
  if (!ensureSlice.pending) ensureSlice.pending = {};
  if (ensureSlice.pending[key]) return null;
  ensureSlice.pending[key] = 1;
  const script = document.createElement("script");
  script.src = src;
  script.onload = function () { ensureSlice.pending[key] = 0; render(); };
  script.onerror = function () {
    ensureSlice.pending[key] = 0;
    window.MC[key] = window.MC[key] || { missing: 1 };
    render();
  };
  document.head.appendChild(script);
  return null;
}

function ensureSec(vol, sec) {
  return ensureSlice("sec:" + vol + "-" + sec, "../../../runtime/web/data/sec/" + vol + "-" + sec + ".js");
}

function ensureItems(vol, no) {
  return ensureSlice("items:" + vol + "-" + no, "../../../runtime/web/data/sec/" + vol + "-" + no + ".items.js");
}

function ensureEx(vol, no) {
  return ensureSlice("ex:" + vol + "-" + no, "../../../runtime/web/data/sec/" + vol + "-" + no + ".ex.js");
}

function bandLabel(band) {
  return { basic: "基础", standard: "中档", advanced: "提高", challenge: "挑战", competition: "竞赛" }[band] || band || "";
}

function skillBundle(id) {
  const net = ensureNet();
  const skill = net && net.byId[id];
  if (!skill || skill.kind !== "skill") return null;
  const sec = ensureSec(skill.vol, skill.sec);
  const rec = sec && (sec.skills || []).filter(function (item) { return item.uid === id; })[0];
  return { net: net, skill: skill, sec: sec, rec: rec || null };
}

function skillMeta(skill, rec, sec) {
  const ch = skill.ch || (skill.sec ? String(skill.sec).split(".")[0] : "");
  if (!ch && !skill.sec) return "章节还没标在图谱上";
  let tier = skill.tier === "extend" ? "培优" : skill.tier === "olympiad" ? "竞赛" : "教材方法";
  if (rec && rec.family) tier += " · " + rec.family;
  const secName = sec && sec.title ? " " + sec.title : "";
  return tier + " · 第 " + ch + " 章 · " + (skill.sec || "") + secName;
}

function kpLinks(kps) {
  if (!kps.length) return "<p>现有图谱里还没有挂到知识点上。</p>";
  return kps.map(function (kp) {
    return '<p><button type="button" class="link" data-focus-point="' + esc(kp.id) + '">' + mathHtml(kpLabel(kp.title)) + "</button></p>";
  }).join("");
}

function graphSkillSide(id) {
  const pack = skillBundle(id);
  if (!pack) return "";
  const skill = pack.skill;
  const kps = pack.net.skillKps[id] || [];
  const desc = pack.rec && pack.rec.desc ? "<p>" + mathHtml(pack.rec.desc) + "</p>" : "";
  return '<aside class="side"><div class="row"><h2>' + mathHtml(skill.title) + '</h2></div>' +
    '<button type="button" class="link" id="map-close">关闭</button>' +
    "<p>" + esc(skillMeta(skill, pack.rec, pack.sec)) + "</p>" +
    desc + "<p><strong>用在</strong></p>" + kpLinks(kps) +
    '<button class="btn" id="map-skill">看这个方法</button></aside>';
}

function pointCard(extra) {
  const notes = {
    "三角形的定义": { body: "由不在同一直线上的三条线段首尾顺次相接组成。", use: "平面图形（3.1）", avoid: "三点共线时不能构成三角形。" },
    "三角形的元素": { body: "三条边、三个内角、三个顶点。", use: "三角形的定义", avoid: "把边和角的个数说反。" },
    "三边关系": { body: "任意两边之和大于第三边。", use: "三角形的元素", avoid: "两边之和等于第三边也当成能组成。" },
    "三角形的记法": { body: "用 △ 表示，读作三角形 ABC。", use: "三角形的定义", avoid: "把 △ABC 读成角 ABC。" }
  };
  const note = notes[state.mapPoint] || notes["三角形的定义"];
  return '<aside class="side"><div class="row"><h2>' + esc(state.mapPoint) + '</h2><button class="link" id="map-close">关闭</button></div>' +
    "<p>" + note.body + "</p>" +
    "<p><strong>先用</strong> " + note.use + "</p>" +
    "<p><strong>别用成</strong> " + note.avoid + "</p>" +
    '<p class="muted">12.1 三角形 · 课本第 74 页</p>' +
    '<button class="btn" id="map-kp">看这个知识点</button>' +
    '<button type="button" class="link" id="map-sec">去这一节</button>' +
    '<button type="button" class="link" id="map-practice">去练这一节</button>' + (extra || "") + "</aside>";
}

function courseByNo(no) {
  for (let i = 0; i < COURSE_NODES.length; i += 1) {
    if (COURSE_NODES[i].no === no) return COURSE_NODES[i];
  }
  return null;
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

function ringSlots(count, cx, cy, rx, ry) {
  const slots = [];
  for (let i = 0; i < count; i += 1) {
    const angle = -Math.PI / 2 + (i + 0.12) * (Math.PI * 2 / count);
    slots.push({
      x: Math.round((cx + Math.cos(angle) * rx) * 10) / 10,
      y: Math.round((cy + Math.sin(angle) * ry) * 10) / 10,
      dx: Math.round(Math.cos(angle) * 58),
      dy: Math.round(Math.sin(angle) * 26)
    });
  }
  return slots;
}

function leaveHub(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  let t = 0.42;
  if (dx > 0.01) t = Math.min(t, 6.4 / dx);
  else if (dx < -0.01) t = Math.min(t, -6.4 / dx);
  if (dy > 0.01) t = Math.min(t, 7.6 / dy);
  else if (dy < -0.01) t = Math.min(t, 2.8 / -dy);
  return { x: round1(from.x + dx * t), y: round1(from.y + dy * t) };
}

function arriveNode(from, to) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const pull = Math.min(2.1, len * 0.16);
  return { x: round1(to.x - (dx / len) * pull), y: round1(to.y - (dy / len) * pull * 1.45) };
}

function curvePath(from, to, bend, cls, opt) {
  opt = opt || {};
  const dest = opt.end || to;
  const marker = opt.arrow ? ' marker-end="url(#mk-' + cls + ')"' : "";
  if (!bend) return '<path d="M ' + from.x + " " + from.y + " L " + dest.x + " " + dest.y + '" class="' + cls + '"' + marker + "/>";
  const dx = dest.x - from.x;
  const dy = dest.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const mx = (from.x + dest.x) / 2 + (-dy / len) * bend;
  const my = (from.y + dest.y) / 2 + (dx / len) * bend;
  return '<path d="M ' + from.x + " " + from.y + " Q " + mx.toFixed(1) + " " + my.toFixed(1) + " " + dest.x + " " + dest.y + '" class="' + cls + '"' + marker + "/>";
}

function softBend(x1, y1, x2, y2, amount) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
  const sign = (Math.round(x1 * 3 + y1 * 7) % 2) ? 1 : -1;
  return sign * Math.min(amount, dist * 0.22);
}

function dotField(nodes, lines, note, tags, legendKind) {
  const at = {};
  const focus = legendKind === "chapter" || legendKind === "mind";
  const course = legendKind === "course";
  const book = course && !state.mapShowAll;
  nodes.forEach(function (node) { at[node.id] = node; });
  const geo = [];
  const svg = lines.map(function (pair, index) {
    const from = at[pair[0]];
    const to = at[pair[1]];
    if (!from || !to) return "";
    const cls = pair[2] || (index % 2 ? "b" : "a");
    if (focus) {
      const flow = pair[3] || "none";
      const tail = flow === "in" ? to : from;
      const head = flow === "in" ? from : to;
      geo.push({
        x1: tail.x, y1: tail.y, x2: head.x, y2: head.y, from: tail.id, to: head.id, cls: cls,
        arrow: flow === "in" || flow === "out",
        tailGap: flow === "out" ? 22 : 14,
        hubHead: flow === "in"
      });
      return "";
    }
    const bend = pair.length > 3 && typeof pair[3] === "number" ? pair[3] : (index % 2 ? 8 : -8);
    return curvePath(from, to, bend, cls);
  }).join("");
  const marks = nodes.map(function (node) {
    const cls = "seed" + (node.tone ? " " + node.tone : "") + (node.kp ? " kp" : "") + (node.sec ? " sec" : "") +
      (node.mid ? " mid" : "") + (node.tiny ? " tiny" : "") + (node.lead ? " ch" : "") +
      (node.method ? " method" : "") + (node.extend ? " extend" : "") + (node.olymp ? " olymp" : "") +
      (node.idea ? " idea" : "") + (node.on ? " on" : "") + (node.big ? " here" : "") +
      (node.mute ? " mute" : "") + (node.pin ? " pin" : "") + (node.named ? " named" : "") +
      (node.above ? " above" : "") + (node.quiet ? " quiet" : "") + (node.dim ? " dim" : "") +
      (node.side ? " side-" + node.side : "") + (node.full ? " full" : "") + (node.card ? " card" : "") + (node.math && plainMath(node.label).length > 14 ? " wrap" : "");
    const role = node.role ? "<em>" + esc(node.role) + "</em>" : "";
    let attr = "";
    if (node.point) attr = ' data-point="' + esc(node.point) + '"';
    else if (node.methodId) attr = ' data-open-method="' + esc(node.methodId) + '"';
    else if (node.section) attr = ' data-open-section="' + esc(node.section) + '"';
    else if (node.backNet) attr = ' data-back-net="1"';
    else if (node.openChapter) attr = ' data-open-chapter="' + node.no + '"';
    else if (node.no) attr = ' data-net-chapter="' + node.no + '"';
    const tag = node.mute || node.pin ? "span" : "button";
    const type = node.mute || node.pin ? "" : ' type="button"';
    const float = node.dx || node.dy ? ' class="float" style="--dx:' + (node.dx || 0) + "px;--dy:" + (node.dy || 0) + 'px"' : "";
    return "<" + tag + type + ' class="' + cls + '" data-nid="' + esc(node.id) + '" style="left:' + node.x + "%;top:" + node.y + '%" title="' +
      esc(node.title || node.label) + '"' + attr + ">" + role + "<i></i><span" + float + ">" +
      (node.math ? esc(plainMath(node.label)) : node.card ? chapterLabelHtml(node) : node.full && !node.big && nodes.length > 14 ? esc(node.label).replace(" ", "<br>") : esc(node.label)) +
      "</span></" + tag + ">";
  }).join("");
  const legend = legendKind === "course"
    ? '<p class="field-legend"><span><i class="lg t1"></i>七上</span><span><i class="lg t2"></i>七下</span><span><i class="lg t3"></i>八上</span><span><i class="lg t4"></i>八下</span><span><i class="lg t5"></i>九上</span><span><i class="lg t6"></i>九下</span>' +
      (state.mapShowAll ? '<span><i class="lg sec"></i>小节</span><span><i class="lg kp"></i>知识点</span>' : "") + "</p>"
    : legendKind === "chapter"
      ? '<p class="field-legend"><span><i class="lg here"></i>本章</span><span><i class="lg sec"></i>小节</span><span><i class="lg t1"></i>七上</span><span><i class="lg t2"></i>七下</span><span><i class="lg t3"></i>八上</span><span><i class="lg t4"></i>八下</span><span><i class="lg t5"></i>九上</span><span><i class="lg t6"></i>九下</span><span class="lg-line c">金线小节</span><span class="lg-line b">绿线相关章</span></p>'
      : '<p class="field-legend"><span><i class="lg"></i>章节</span><span><i class="lg sec"></i>小节</span><span><i class="lg kp"></i>知识点</span><span><i class="lg method"></i>方法</span><span><i class="lg ext"></i>培优</span><span><i class="lg oly"></i>竞赛</span></p>';
  const worldStyle = "transform:translate(" + (state.mapPanX || 0) + "px," + (state.mapPanY || 0) + "px) scale(" + (state.mapZoom || 1) + ")";
  const pointsBtn = legendKind === "course"
    ? '<button type="button" id="toggle-points" aria-pressed="' + (state.mapShowAll ? "true" : "false") + '">全部点</button>'
    : "";
  const bookEdges = course ? lines.filter(function (pair) { return at[pair[0]] && at[pair[1]]; }).map(function (pair) {
    return { s: pair[0], d: pair[1], cls: pair[2] || "rel", bend: typeof pair[3] === "number" ? pair[3] : 0 };
  }) : [];
  const focusSvg = focus
    ? '<svg id="focus-svg" aria-hidden="true"></svg><script type="application/json" id="focus-geo">' + JSON.stringify(geo) + "</script>"
    : '<svg viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">' + svg + "</svg>" +
      (course ? '<script type="application/json" id="book-geo">' + JSON.stringify(bookEdges) + "</script>" : "");
  return '<div class="field' + (focus ? " focus-net" : "") + (book ? " book-net" : "") + (focus && nodes.length > 14 ? " dense" : "") + '" id="pano-field"><div class="field-world" id="pano-world" style="' + worldStyle + '">' +
    (tags || "") + focusSvg + marks +
    '</div><p class="field-note">' + note + "</p>" + legend +
    '<div class="field-zoom">' + pointsBtn + '<button type="button" id="zoom-out" aria-label="缩小">−</button><button type="button" id="zoom-fit">适配</button><button type="button" id="zoom-in" aria-label="放大">+</button></div></div>';
}

function wedgeBend(from, to, targets) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  const ang = Math.atan2(dy, dx);
  let gap = Math.PI;
  targets.forEach(function (other) {
    if (other === to) return;
    let delta = Math.atan2(other.y - from.y, other.x - from.x) - ang;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    gap = Math.min(gap, Math.abs(delta));
  });
  const room = (len * 0.5) * Math.tan(Math.min(gap, 1.2) / 2);
  return Math.max(1.6, Math.min(3.2, room * 0.45));
}

function spreadSides(center, groups, note, legendKind) {
  const nodes = [center];
  const lines = [];
  const buckets = [groups.top, groups.right, groups.bottom, groups.left].filter(Boolean).map(function (list) {
    return list.slice();
  });
  const mixed = [];
  let guard = 0;
  const total = buckets.reduce(function (sum, list) { return sum + list.length; }, 0);
  while (mixed.length < total && guard < total + 2) {
    buckets.forEach(function (list) {
      if (list.length) mixed.push(list.shift());
    });
    guard += 1;
  }
  const n = mixed.length || 1;
  const rx = n > 14 ? 28 : n > 8 ? 25 : 22;
  const ry = n > 14 ? 32 : n > 8 ? 30 : 28;
  center.x = n > 14 ? 42 : 38;
  center.y = 48;
  mixed.forEach(function (item, index) {
    const ang = -Math.PI / 2 + (index + 0.5) * (Math.PI * 2 / n);
    item.x = round1(center.x + Math.cos(ang) * rx);
    item.y = round1(center.y + Math.sin(ang) * ry);
    const deg = (ang * 180 / Math.PI + 360) % 360;
    if (deg >= 315 || deg < 45) item.side = "right";
    else if (deg < 135) item.side = "bottom";
    else if (deg < 225) item.side = "left";
    else item.side = "top";
    nodes.push(item);
    lines.push([center.id, item.id, item.line || "a", item.flow || "none"]);
  });
  return dotField(nodes, lines, note, "", legendKind);
}

function placeMind(center, satellites, note) {
  const slots = ringSlots(satellites.length, 48, 48, satellites.length > 8 ? 30 : 28, satellites.length > 8 ? 26 : 24);
  const nodes = [center];
  const lines = [];
  satellites.forEach(function (item, index) {
    const slot = slots[index];
    item.id = item.id || "n-" + index;
    item.x = slot.x;
    item.y = slot.y;
    item.dx = slot.dx;
    item.dy = slot.dy;
    nodes.push(item);
    lines.push(["c", item.id, item.line || "spoke", 5]);
  });
  return dotField(nodes, lines, note, "", "mind");
}

let NET = null;

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
  return String(title || "").split(/[：:]/)[0] || String(title || "");
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
  let match;
  while ((match = re.exec(text))) {
    out.push(esc(text.slice(last, match.index)));
    const tex = (match[1] != null ? match[1] : match[2]).trim();
    const display = match[1] != null;
    try {
      const html = katex.renderToString(tex, { throwOnError: false, output: "html", strict: false, displayMode: display });
      out.push(html.indexOf("katex-error") >= 0 ? esc(match[0]) : html);
    } catch (err) {
      out.push(esc(match[0]));
    }
    last = match.index + match[0].length;
  }
  out.push(esc(text.slice(last)));
  return out.join("");
}

function volTone(vol) {
  return { "701": "t1", "702": "t2", "801": "t3", "802": "t4", "901": "t5", "902": "t6" }[vol] || "t1";
}

function relaxNet(pos, edges) {
  const ids = Object.keys(pos);
  const anchor = {};
  ids.forEach(function (id) { anchor[id] = [pos[id][0], pos[id][1]]; });
  for (let iter = 0; iter < 8; iter += 1) {
    const cell = {};
    ids.forEach(function (id) {
      const key = Math.round(pos[id][0] / 2) + "," + Math.round(pos[id][1] / 2);
      (cell[key] = cell[key] || []).push(id);
    });
    const disp = {};
    ids.forEach(function (id) { disp[id] = [0, 0]; });
    ids.forEach(function (id) {
      const p = pos[id];
      const gx = Math.round(p[0] / 2);
      const gy = Math.round(p[1] / 2);
      for (let ox = -1; ox <= 1; ox += 1) {
        for (let oy = -1; oy <= 1; oy += 1) {
          const bucket = cell[(gx + ox) + "," + (gy + oy)];
          if (!bucket) continue;
          bucket.forEach(function (other) {
            if (other === id) return;
            let vx = p[0] - pos[other][0];
            let vy = p[1] - pos[other][1];
            let dist2 = vx * vx + vy * vy;
            if (dist2 < 0.04) { vx = 0.2; vy = 0.12; dist2 = 0.05; }
            if (dist2 < 2.4) {
              const dist = Math.sqrt(dist2);
              const push = (1.55 - dist) * 0.09;
              disp[id][0] += vx / dist * push;
              disp[id][1] += vy / dist * push;
            }
          });
        }
      }
    });
    edges.forEach(function (edge) {
      const a = pos[edge.s];
      const b = pos[edge.d];
      if (!a || !b) return;
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
      const pull = (dist - (edge.r === "prerequisite_of" ? 4.5 : 2.2)) * 0.01;
      disp[edge.s][0] += dx / dist * pull;
      disp[edge.s][1] += dy / dist * pull;
      disp[edge.d][0] -= dx / dist * pull;
      disp[edge.d][1] -= dy / dist * pull;
    });
    ids.forEach(function (id) {
      disp[id][0] += (anchor[id][0] - pos[id][0]) * 0.12;
      disp[id][1] += (anchor[id][1] - pos[id][1]) * 0.12;
      pos[id][0] = Math.max(7, Math.min(93, pos[id][0] + disp[id][0]));
      pos[id][1] = Math.max(12, Math.min(88, pos[id][1] + disp[id][1]));
    });
  }
}

/** Read the product graph. The source file is not modified. */
function ensureNet() {
  if (NET) return NET;
  const graph = window.MC && window.MC.graph;
  if (!graph || !graph.nodes || !graph.edges) return null;
  const keep = { chapter: 1, section: 1, knowledge_point: 1 };
  const nodes = [];
  const byId = {};
  graph.nodes.forEach(function (node) {
    if (!keep[node.kind]) return;
    const copy = { id: node.id, kind: node.kind, title: node.title, vol: node.vol, sec: node.sec, ch: node.ch };
    nodes.push(copy);
    byId[node.id] = copy;
  });
  const chapterId = {};
  const secId = {};
  const kpsBySec = {};
  nodes.forEach(function (node) {
    if (node.kind === "chapter") chapterId[node.vol + "-" + node.ch] = node.id;
    if (node.kind === "section") secId[node.sec] = node.id;
    if (node.kind === "knowledge_point") (kpsBySec[node.sec] = kpsBySec[node.sec] || []).push(node);
  });
  const skillsBySec = {};
  const skillByKp = {};
  const skillKps = {};
  graph.nodes.forEach(function (node) {
    if (node.kind !== "skill" || !node.sec) return;
    const copy = { id: node.id, kind: "skill", title: node.title, vol: node.vol, sec: node.sec, ch: node.ch || String(node.sec).split(".")[0], tier: node.tier || "core" };
    byId[node.id] = copy;
    (skillsBySec[node.sec] = skillsBySec[node.sec] || []).push(copy);
  });
  const edges = [];
  const pre = {};
  const post = {};
  graph.edges.forEach(function (edge) {
    if (!byId[edge.s] || !byId[edge.d]) return;
    if (edge.r !== "prerequisite_of" && edge.r !== "sequence" && edge.r !== "is_part_of") return;
    edges.push({ s: edge.s, d: edge.d, r: edge.r });
    if (edge.r === "prerequisite_of") {
      (post[edge.s] = post[edge.s] || []).push(edge.d);
      (pre[edge.d] = pre[edge.d] || []).push(edge.s);
    }
  });
  graph.edges.forEach(function (edge) {
    if (edge.r !== "applies_to") return;
    const skill = byId[edge.s];
    const kp = byId[edge.d];
    if (!skill || !kp || skill.kind !== "skill" || kp.kind !== "knowledge_point") return;
    (skillByKp[kp.id] = skillByKp[kp.id] || []).push(skill);
    (skillKps[skill.id] = skillKps[skill.id] || []).push(kp);
  });
  const pos = {};
  const chapters = nodes.filter(function (node) { return node.kind === "chapter"; })
    .sort(function (a, b) { return Number(a.ch) - Number(b.ch); });
  chapters.forEach(function (node, index) {
    const radius = 22 * Math.sqrt((index + 0.5) / chapters.length);
    const angle = index * 2.399963229728653;
    pos[node.id] = [50 + Math.cos(angle) * radius, 48 + Math.sin(angle) * radius * 0.86];
  });
  const sectionsByCh = {};
  nodes.forEach(function (node) {
    if (node.kind === "section") (sectionsByCh[node.vol + "-" + node.ch] = sectionsByCh[node.vol + "-" + node.ch] || []).push(node);
  });
  Object.keys(sectionsByCh).forEach(function (key) {
    const base = pos[chapterId[key]];
    if (!base) return;
    const list = sectionsByCh[key].sort(function (a, b) {
      return String(a.sec).localeCompare(String(b.sec), undefined, { numeric: true });
    });
    list.forEach(function (node, index) {
      const angle = -Math.PI / 2 + index * (Math.PI * 2 / list.length);
      pos[node.id] = [base[0] + Math.cos(angle) * 4.6, base[1] + Math.sin(angle) * 4];
    });
  });
  const pairCount = {};
  edges.forEach(function (edge) {
    if (edge.r !== "prerequisite_of") return;
    const from = byId[edge.s];
    const to = byId[edge.d];
    if (!from || !to || from.kind !== "knowledge_point" || to.kind !== "knowledge_point" || from.ch === to.ch) return;
    const source = chapterId[from.vol + "-" + from.ch];
    const target = chapterId[to.vol + "-" + to.ch];
    if (!source || !target || source === target) return;
    const key = source + ">" + target;
    pairCount[key] = (pairCount[key] || 0) + 1;
  });
  const chapterLinks = [];
  Object.keys(pairCount).forEach(function (key) {
    if (pairCount[key] < 2) return;
    const parts = key.split(">");
    chapterLinks.push({ s: parts[0], d: parts[1], n: pairCount[key] });
  });
  const springs = [];
  edges.forEach(function (edge) {
    if (edge.r !== "is_part_of" || !pos[edge.s] || !pos[edge.d]) return;
    const from = byId[edge.s];
    const to = byId[edge.d];
    if (!from || !to || from.kind === "knowledge_point" || to.kind === "knowledge_point") return;
    springs.push({ s: edge.s, d: edge.d, rest: 6.4, k: 0.06 });
  });
  chapterLinks.forEach(function (link) {
    if (link.n < 3 || !pos[link.s] || !pos[link.d]) return;
    springs.push({ s: link.s, d: link.d, rest: 16, k: 0.01 });
  });
  const anchor = {};
  Object.keys(pos).forEach(function (id) { anchor[id] = [pos[id][0], pos[id][1]]; });
  const ids = Object.keys(pos);
  for (let iter = 0; iter < 48; iter += 1) {
    const cell = {};
    ids.forEach(function (id) {
      const key = Math.round(pos[id][0] / 2.2) + "," + Math.round(pos[id][1] / 2.2);
      (cell[key] = cell[key] || []).push(id);
    });
    const disp = {};
    ids.forEach(function (id) { disp[id] = [0, 0]; });
    ids.forEach(function (id) {
      const p = pos[id];
      const gx = Math.round(p[0] / 2.2);
      const gy = Math.round(p[1] / 2.2);
      for (let ox = -1; ox <= 1; ox += 1) {
        for (let oy = -1; oy <= 1; oy += 1) {
          const bucket = cell[(gx + ox) + "," + (gy + oy)];
          if (!bucket) continue;
          bucket.forEach(function (other) {
            if (other === id) return;
            let vx = p[0] - pos[other][0];
            let vy = p[1] - pos[other][1];
            let dist2 = vx * vx + vy * vy;
            if (dist2 < 0.04) { vx = 0.22; vy = 0.13; dist2 = 0.06; }
            if (dist2 < 10) {
              const dist = Math.sqrt(dist2);
              const push = (2.8 - dist) * 0.12;
              disp[id][0] += vx / dist * push;
              disp[id][1] += vy / dist * push;
            }
          });
        }
      }
    });
    springs.forEach(function (spring) {
      const a = pos[spring.s];
      const b = pos[spring.d];
      if (!a || !b) return;
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const dist = Math.sqrt(dx * dx + dy * dy) || 0.1;
      const pull = (dist - spring.rest) * spring.k;
      disp[spring.s][0] += dx / dist * pull;
      disp[spring.s][1] += dy / dist * pull;
      disp[spring.d][0] -= dx / dist * pull;
      disp[spring.d][1] -= dy / dist * pull;
    });
    ids.forEach(function (id) {
      const hold = byId[id] && byId[id].kind === "chapter" ? 0.04 : 0.07;
      disp[id][0] += (anchor[id][0] - pos[id][0]) * hold + (50 - pos[id][0]) * 0.008;
      disp[id][1] += (anchor[id][1] - pos[id][1]) * hold + (48 - pos[id][1]) * 0.008;
      pos[id][0] = Math.max(4, Math.min(96, pos[id][0] + disp[id][0]));
      pos[id][1] = Math.max(8, Math.min(92, pos[id][1] + disp[id][1]));
    });
  }
  let minX = 100;
  let maxX = 0;
  let minY = 100;
  let maxY = 0;
  ids.forEach(function (id) {
    minX = Math.min(minX, pos[id][0]);
    maxX = Math.max(maxX, pos[id][0]);
    minY = Math.min(minY, pos[id][1]);
    maxY = Math.max(maxY, pos[id][1]);
  });
  const spanX = (maxX - minX) || 1;
  const spanY = (maxY - minY) || 1;
  ids.forEach(function (id) {
    pos[id][0] = 8 + (pos[id][0] - minX) / spanX * 84;
    pos[id][1] = 12 + (pos[id][1] - minY) / spanY * 74;
  });
  NET = { nodes: nodes, byId: byId, edges: edges, pos: pos, kpsBySec: kpsBySec, skillsBySec: skillsBySec, skillByKp: skillByKp, skillKps: skillKps, pre: pre, post: post, chapterLinks: chapterLinks, secId: secId };
  return NET;
}

function resetMapView() {
  state.mapZoom = 1;
  state.mapPanX = 0;
  state.mapPanY = 0;
}

function applyMapView() {
  const world = document.getElementById("pano-world");
  if (!world) return;
  world.style.transform = "translate(" + (state.mapPanX || 0) + "px," + (state.mapPanY || 0) + "px) scale(" + (state.mapZoom || 1) + ")";
}

function zoomAt(clientX, clientY, nextZoom, field) {
  const rect = field.getBoundingClientRect();
  const px = clientX - rect.left;
  const py = clientY - rect.top;
  const old = state.mapZoom || 1;
  const next = Math.max(0.8, Math.min(3, nextZoom));
  const lx = (px - (state.mapPanX || 0)) / old;
  const ly = (py - (state.mapPanY || 0)) / old;
  state.mapZoom = next;
  state.mapPanX = px - lx * next;
  state.mapPanY = py - ly * next;
  applyMapView();
}

function drawFocusEdges() {
  const field = document.getElementById("pano-field");
  const svg = document.getElementById("focus-svg");
  const raw = document.getElementById("focus-geo");
  if (!field || !svg || !raw) return;
  let geo = [];
  try { geo = JSON.parse(raw.textContent); } catch (err) { return; }
  const w = field.clientWidth || 1;
  const h = field.clientHeight || 1;
  svg.setAttribute("viewBox", "0 0 " + w + " " + h);
  const count = geo.length || 1;
  const gap = Math.PI * 2 / count;
  svg.innerHTML = geo.map(function (edge) {
    const x1 = edge.x1 / 100 * w;
    const y1 = edge.y1 / 100 * h;
    const x2 = edge.x2 / 100 * w;
    const y2 = edge.y2 / 100 * h;
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len = Math.hypot(dx, dy) || 1;
    const ux = dx / len;
    const uy = dy / len;
    const px = -uy;
    const py = ux;
    const room = (len * 0.5) * Math.tan(Math.min(gap, 1) / 2);
    const bend = Math.max(10, Math.min(18, room * 0.34));
    const fromBelow = edge.hubHead && edge.y1 > edge.y2 + 3;
    const tipGap = edge.hubHead ? (fromBelow ? 58 : 22) : 14;
    const sx0 = x1 + ux * (edge.tailGap || 18);
    const sy0 = y1 + uy * (edge.tailGap || 18);
    const tipX = x2 - ux * tipGap;
    const tipY = y2 - uy * tipGap;
    const headLen = 16;
    const half = 7;
    const endX = edge.arrow ? tipX - ux * headLen : tipX;
    const endY = edge.arrow ? tipY - uy * headLen : tipY;
    const cx = (sx0 + endX) / 2 + px * bend;
    const cy = (sy0 + endY) / 2 + py * bend;
    let tx = endX - cx;
    let ty = endY - cy;
    const tlen = Math.hypot(tx, ty) || 1;
    tx /= tlen;
    ty /= tlen;
    const nx = -ty;
    const ny = tx;
    const seamX = edge.arrow ? endX + tx * 2 : endX;
    const seamY = edge.arrow ? endY + ty * 2 : endY;
    const curve = "M " + sx0.toFixed(1) + " " + sy0.toFixed(1) + " Q " + cx.toFixed(1) + " " + cy.toFixed(1) + " " + seamX.toFixed(1) + " " + seamY.toFixed(1);
    let head = "";
    if (edge.arrow) {
      const tipFx = endX + tx * headLen;
      const tipFy = endY + ty * headLen;
      const lx = endX + nx * half;
      const ly = endY + ny * half;
      const rx = endX - nx * half;
      const ry = endY - ny * half;
      head = '<path class="' + edge.cls + ' head" d="M ' + tipFx.toFixed(1) + " " + tipFy.toFixed(1) + " L " + lx.toFixed(1) + " " + ly.toFixed(1) + " L " + rx.toFixed(1) + " " + ry.toFixed(1) + ' Z"/>';
    }
    return '<path class="' + edge.cls + ' edge" d="' + curve + '"/>' + head;
  }).join("");
}

function stepMapBack() {
  if (state.mapMode !== "panorama") return;
  resetMapView();
  state.mapSkill = "";
  state.mapMethod = "";
  state.mapIdea = "";
  if (state.mapPoint) {
    state.mapPoint = null;
    state.mapCard = true;
  } else if (state.mapSection) {
    state.mapSection = "";
    state.mapPoint = null;
    state.mapLevel = "chapter";
    state.mapCard = true;
  } else if (state.mapLevel === "chapter") {
    state.mapLevel = "course";
    state.mapSection = "";
    state.mapPoint = null;
    state.mapCard = true;
  } else {
    return;
  }
  render();
}

function layoutBookCloud(field) {
  if (!field.classList.contains("book-net")) return;
  const geoEl = document.getElementById("book-geo");
  const w = field.clientWidth;
  const h = field.clientHeight;
  if (!geoEl || w < 240 || h < 240) return;
  const fr = field.getBoundingClientRect();
  const board = field.parentElement;
  const modes = board ? board.querySelector(".float-modes") : null;
  const side = board ? board.querySelector(":scope > .side, :scope > .side-tab") : null;
  const legend = field.querySelector(".field-legend");
  const zoom = field.querySelector(".field-zoom");
  const topBand = Math.max(
    modes ? modes.getBoundingClientRect().bottom - fr.top : 44,
    zoom ? zoom.getBoundingClientRect().bottom - fr.top : 44
  );
  const sideBox = side ? side.getBoundingClientRect() : null;
  const block = sideBox ? {
    x: sideBox.left - fr.left - 16,
    y: sideBox.top - fr.top - 16,
    w: sideBox.width + 32,
    h: sideBox.height + 32
  } : null;
  const usable = {
    x: 16,
    y: topBand + 16,
    r: side && side.classList.contains("side-tab") ? 36 + 16 : 16,
    b: legend ? fr.bottom - legend.getBoundingClientRect().top + 12 : 48
  };
  usable.w = w - usable.x - usable.r;
  usable.h = h - usable.y - usable.b;
  if (usable.w < 280 || usable.h < 220) return;
  const nodes = Array.prototype.slice.call(field.querySelectorAll(".field-world > .seed"));
  const items = nodes.map(function (el) {
    const span = el.querySelector("span");
    return {
      el: el,
      id: el.getAttribute("data-nid"),
      x: parseFloat(el.style.left) / 100 * w,
      y: parseFloat(el.style.top) / 100 * h,
      lw: span ? span.offsetWidth : 96,
      lh: span ? span.offsetHeight : 28,
      here: el.classList.contains("here")
    };
  }).filter(function (it) { return it.id; });
  if (items.length < 2) return;
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;
  items.forEach(function (it) {
    minX = Math.min(minX, it.x);
    maxX = Math.max(maxX, it.x);
    minY = Math.min(minY, it.y);
    maxY = Math.max(maxY, it.y);
  });
  const spanX = (maxX - minX) || 1;
  const spanY = (maxY - minY) || 1;
  const box = { x: usable.x + 28, y: usable.y + 24, w: usable.w - 56, h: usable.h - 48 };
  items.forEach(function (it) {
    it.x = box.x + (it.x - minX) / spanX * box.w;
    it.y = box.y + (it.y - minY) / spanY * box.h;
  });
  function clamp(it) {
    it.x = Math.max(usable.x + 20, Math.min(usable.x + usable.w - 20, it.x));
    it.y = Math.max(usable.y + 18, Math.min(usable.y + usable.h - 18, it.y));
    if (!block) return;
    if (it.x <= block.x || it.x >= block.x + block.w || it.y <= block.y || it.y >= block.y + block.h) return;
    if (block.y + block.h - it.y < it.x - block.x) it.y = Math.min(usable.y + usable.h - 18, block.y + block.h + 28);
    else it.x = Math.max(usable.x + 20, block.x - 28);
  }
  for (let iter = 0; iter < 70; iter += 1) {
    for (let i = 0; i < items.length; i += 1) {
      for (let j = i + 1; j < items.length; j += 1) {
        const a = items[i];
        const b = items[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const dist = Math.hypot(dx, dy) || 0.01;
        if (dist >= 70) continue;
        const push = (70 - dist) / 2;
        a.x += dx / dist * push;
        a.y += dy / dist * push;
        b.x -= dx / dist * push;
        b.y -= dy / dist * push;
      }
    }
    items.forEach(clamp);
  }
  let bx0 = Infinity;
  let bx1 = -Infinity;
  let by0 = Infinity;
  let by1 = -Infinity;
  items.forEach(function (it) {
    bx0 = Math.min(bx0, it.x);
    bx1 = Math.max(bx1, it.x);
    by0 = Math.min(by0, it.y);
    by1 = Math.max(by1, it.y);
  });
  const needW = usable.w * 0.78;
  const needH = usable.h * 0.78;
  const bw = (bx1 - bx0) || 1;
  const bh = (by1 - by0) || 1;
  if (bw < needW || bh < needH) {
    const cx = (bx0 + bx1) / 2;
    const cy = (by0 + by1) / 2;
    const sx = Math.max(1, Math.min(needW / bw, 1.35));
    const sy = Math.max(1, Math.min(needH / bh, 1.35));
    items.forEach(function (it) {
      it.x = cx + (it.x - cx) * sx;
      it.y = cy + (it.y - cy) * sy;
      clamp(it);
    });
  }
  function labelRect(it, side) {
    const gap = 8;
    const rad = it.here ? 16 : 11;
    if (side === "right") return { x: it.x + rad + gap, y: it.y - it.lh / 2, w: it.lw, h: it.lh };
    if (side === "left") return { x: it.x - rad - gap - it.lw, y: it.y - it.lh / 2, w: it.lw, h: it.lh };
    if (side === "top") return { x: it.x - it.lw / 2, y: it.y - rad - gap - it.lh, w: it.lw, h: it.lh };
    return { x: it.x - it.lw / 2, y: it.y + rad + gap, w: it.lw, h: it.lh };
  }
  function inside(rect) {
    if (rect.x < usable.x - 1 || rect.y < usable.y - 1) return false;
    if (rect.x + rect.w > usable.x + usable.w + 1 || rect.y + rect.h > usable.y + usable.h + 1) return false;
    if (block && rect.x < block.x + block.w && rect.x + rect.w > block.x && rect.y < block.y + block.h && rect.y + rect.h > block.y) return false;
    return true;
  }
  function overlap(a, b, gap) {
    return a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y;
  }
  function blocked(it, rect, placed) {
    if (!inside(rect)) return true;
    if (placed.some(function (other) { return overlap(rect, other.rect, 8); })) return true;
    return items.some(function (other) {
      if (other === it) return false;
      const rad = other.here ? 18 : 13;
      return overlap(rect, { x: other.x - rad, y: other.y - rad, w: rad * 2, h: rad * 2 }, 2);
    });
  }
  function orderFor(it) {
    const room = {
      right: usable.x + usable.w - it.x,
      left: it.x - usable.x,
      bottom: usable.y + usable.h - it.y,
      top: it.y - usable.y
    };
    return ["right", "left", "bottom", "top"].sort(function (a, b) { return room[b] - room[a]; });
  }
  function choose(it, placed) {
    let side = "";
    let rect = null;
    orderFor(it).some(function (candidate) {
      const next = labelRect(it, candidate);
      if (blocked(it, next, placed)) return false;
      side = candidate;
      rect = next;
      return true;
    });
    return side ? { side: side, rect: rect } : null;
  }
  const placed = [];
  items.slice().sort(function (a, b) { return (b.here - a.here) || (b.lw - a.lw); }).forEach(function (it) {
    let picked = null;
    for (let attempt = 0; attempt < 24 && !picked; attempt += 1) {
      picked = choose(it, placed);
      if (picked) break;
      let near = null;
      let best = 1e9;
      placed.forEach(function (other) {
        const dist = Math.hypot(other.x - it.x, other.y - it.y);
        if (dist < best) {
          best = dist;
          near = other;
        }
      });
      if (!near) break;
      const dx = it.x - near.x;
      const dy = it.y - near.y;
      const dist = Math.hypot(dx, dy) || 1;
      it.x += dx / dist * 16;
      it.y += dy / dist * 16;
      clamp(it);
    }
    if (!picked) {
      const fallback = orderFor(it).filter(function (candidate) { return inside(labelRect(it, candidate)); })[0] || "bottom";
      picked = { side: fallback, rect: labelRect(it, fallback) };
    }
    it.side = picked.side;
    it.rect = picked.rect;
    placed.push(it);
  });
  for (let pass = 0; pass < 36; pass += 1) {
    let dirty = false;
    for (let i = 0; i < placed.length; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        const a = placed[i];
        const b = placed[j];
        if (!overlap(a.rect, b.rect, 8)) continue;
        dirty = true;
        const dx = b.x - (a.rect.x + a.rect.w / 2);
        const dy = b.y - (a.rect.y + a.rect.h / 2);
        const dist = Math.hypot(dx, dy) || 1;
        b.x += dx / dist * 20;
        b.y += dy / dist * 14;
        clamp(b);
        const again = choose(b, placed.filter(function (other) { return other !== b; }));
        const fallback = orderFor(b)[0];
        b.side = again ? again.side : fallback;
        b.rect = again ? again.rect : labelRect(b, fallback);
      }
    }
    if (!dirty) break;
  }
  for (let guard = 0; guard < 24; guard += 1) {
    let pending = null;
    for (let i = 0; i < placed.length && !pending; i += 1) {
      for (let j = i + 1; j < placed.length; j += 1) {
        if (overlap(placed[i].rect, placed[j].rect, 8)) {
          pending = placed[j];
          break;
        }
      }
    }
    if (!pending) break;
    pending.y += pending.lh + 18;
    if (pending.y > usable.y + usable.h - 24) {
      pending.y = usable.y + 36;
      pending.x -= 48;
    }
    clamp(pending);
    const again = choose(pending, placed.filter(function (other) { return other !== pending; }));
    pending.side = again ? again.side : "bottom";
    pending.rect = again ? again.rect : labelRect(pending, pending.side);
  }
  items.forEach(function (it) {
    it.el.style.left = (it.x / w * 100) + "%";
    it.el.style.top = (it.y / h * 100) + "%";
    it.el.classList.remove("side-left", "side-right", "side-top", "side-bottom");
    it.el.classList.add("side-" + it.side);
  });
  const byId = {};
  items.forEach(function (it) { byId[it.id] = it; });
  const edges = JSON.parse(geoEl.textContent);
  const svg = field.querySelector("svg");
  if (!svg) return;
  svg.innerHTML = edges.map(function (edge) {
    const from = byId[edge.s];
    const to = byId[edge.d];
    if (!from || !to) return "";
    const a = { x: from.x / w * 100, y: from.y / h * 100 };
    const b = { x: to.x / w * 100, y: to.y / h * 100 };
    return curvePath(a, b, softBend(a.x, a.y, b.x, b.y, 5), edge.cls);
  }).join("");
}

function layoutShowAllChapters(field) {
  if (field.classList.contains("book-net")) return;
  const geoEl = document.getElementById("book-geo");
  const cards = Array.prototype.slice.call(field.querySelectorAll(".field-world > .seed.card"));
  if (!geoEl || cards.length < 2) return;
  const w = field.clientWidth;
  const h = field.clientHeight;
  if (w < 240 || h < 240) return;
  const fr = field.getBoundingClientRect();
  const board = field.parentElement;
  const side = board ? board.querySelector(":scope > .side, :scope > .side-tab") : null;
  const sideBox = side ? side.getBoundingClientRect() : null;
  const block = sideBox ? {
    x: sideBox.left - fr.left - 16,
    y: sideBox.top - fr.top - 16,
    w: sideBox.width + 32,
    h: sideBox.height + 32
  } : null;
  const legend = field.querySelector(".field-legend");
  const bottom = legend ? h - (fr.bottom - legend.getBoundingClientRect().top) - 12 : h - 48;
  const items = cards.map(function (el) {
    const span = el.querySelector("span");
    return {
      el: el,
      id: el.getAttribute("data-nid"),
      x: parseFloat(el.style.left) / 100 * w,
      y: parseFloat(el.style.top) / 100 * h,
      lw: span ? span.offsetWidth : 120,
      lh: span ? span.offsetHeight : 28
    };
  });
  function clamp(it) {
    it.x = Math.max(24, Math.min(w - 24, it.x));
    it.y = Math.max(72, Math.min(bottom - 16, it.y));
    if (!block) return;
    if (it.x <= block.x || it.x >= block.x + block.w || it.y <= block.y || it.y >= block.y + block.h) return;
    if (block.y + block.h - it.y < it.x - block.x) it.y = Math.min(bottom - 16, block.y + block.h + 24);
    else it.x = Math.max(24, block.x - 24);
  }
  items.forEach(clamp);
  function labelRect(it, side) {
    const gap = 8;
    const rad = 12;
    if (side === "right") return { x: it.x + rad + gap, y: it.y - it.lh / 2, w: it.lw, h: it.lh };
    if (side === "left") return { x: it.x - rad - gap - it.lw, y: it.y - it.lh / 2, w: it.lw, h: it.lh };
    if (side === "top") return { x: it.x - it.lw / 2, y: it.y - rad - gap - it.lh, w: it.lw, h: it.lh };
    return { x: it.x - it.lw / 2, y: it.y + rad + gap, w: it.lw, h: it.lh };
  }
  function clearOf(rect, others) {
    if (rect.x < 8 || rect.y < 56 || rect.x + rect.w > w - 8 || rect.y + rect.h > bottom) return false;
    if (block && rect.x < block.x + block.w && rect.x + rect.w > block.x && rect.y < block.y + block.h && rect.y + rect.h > block.y) return false;
    return !others.some(function (other) {
      const box = other.rect;
      return box && rect.x < box.x + box.w + 8 && rect.x + rect.w + 8 > box.x && rect.y < box.y + box.h + 8 && rect.y + rect.h + 8 > box.y;
    });
  }
  const placed = [];
  items.slice().sort(function (a, b) { return b.lw - a.lw; }).forEach(function (it) {
    let picked = "";
    for (let attempt = 0; attempt < 18 && !picked; attempt += 1) {
      ["left", "right", "bottom", "top"].some(function (side) {
        const rect = labelRect(it, side);
        if (!clearOf(rect, placed)) return false;
        picked = side;
        it.rect = rect;
        return true;
      });
      if (picked) break;
      it.y += 22;
      clamp(it);
    }
    it.side = picked || "left";
    if (!it.rect) it.rect = labelRect(it, it.side);
    placed.push(it);
  });
  items.forEach(function (it) {
    it.el.style.left = (it.x / w * 100) + "%";
    it.el.style.top = (it.y / h * 100) + "%";
    it.el.classList.remove("side-left", "side-right", "side-top", "side-bottom");
    it.el.classList.add("side-" + it.side);
  });
  const byId = {};
  Array.prototype.slice.call(field.querySelectorAll(".field-world > .seed")).forEach(function (el) {
    const id = el.getAttribute("data-nid");
    if (!id) return;
    byId[id] = { x: parseFloat(el.style.left), y: parseFloat(el.style.top) };
  });
  const svg = field.querySelector("svg");
  if (!svg) return;
  svg.innerHTML = JSON.parse(geoEl.textContent).map(function (edge) {
    const from = byId[edge.s];
    const to = byId[edge.d];
    if (!from || !to) return "";
    return curvePath(from, to, edge.bend || 0, edge.cls);
  }).join("");
}

function layoutFocusLabels(field) {
  if (!field || !field.classList.contains("focus-net")) return;
  const hub = field.querySelector(".seed.here");
  const raw = document.getElementById("focus-geo");
  if (!hub || !raw) return;
  if (!raw.dataset.base) raw.dataset.base = raw.textContent;
  raw.textContent = raw.dataset.base;
  let geo = [];
  try { geo = JSON.parse(raw.dataset.base); } catch (err) { geo = []; }
  field.querySelectorAll(".seed").forEach(function (seed) {
    if (!seed.dataset.homeX) {
      seed.dataset.homeX = String(parseFloat(seed.style.left));
      seed.dataset.homeY = String(parseFloat(seed.style.top));
    }
    seed.dataset.ox = seed.dataset.homeX;
    seed.dataset.oy = seed.dataset.homeY;
    seed.style.left = seed.dataset.homeX + "%";
    seed.style.top = seed.dataset.homeY + "%";
    const span = seed.querySelector("span");
    if (!span) return;
    span.style.left = "";
    span.style.right = "";
    span.style.top = "";
    span.style.bottom = "";
    span.style.transform = "";
    span.style.width = "max-content";
    span.style.maxWidth = seed.classList.contains("here") ? "none" : "16em";
    span.style.whiteSpace = seed.classList.contains("here") ? "nowrap" : "normal";
  });
  drawFocusEdges();
  const zoom = state.mapZoom || 1;
  const box = field.getBoundingClientRect();
  const legend = field.querySelector(".field-legend");
  const side = document.querySelector(".pano-board > .side");
  const modes = document.querySelector(".float-modes");
  const modesBottom = modes ? modes.getBoundingClientRect().bottom : box.top + 16;
  const usable = {
    left: box.left + 16,
    top: Math.max(box.top + 16, modesBottom + 10),
    right: box.right - 16,
    bottom: legend ? legend.getBoundingClientRect().top - 12 : box.bottom - 16
  };
  const sideRect = side ? side.getBoundingClientRect() : null;
  const hubBox = hub.getBoundingClientRect();
  function outside(rect) {
    if (rect.left < usable.left || rect.top < usable.top || rect.right > usable.right || rect.bottom > usable.bottom) return true;
    if (sideRect && rect.left < sideRect.right + 16 && rect.right > sideRect.left - 16 && rect.top < sideRect.bottom + 16 && rect.bottom > sideRect.top - 16) return true;
    return false;
  }
  function overlap(a, b) {
    return a.left < b.right + 8 && a.right > b.left - 8 && a.top < b.bottom + 8 && a.bottom > b.top - 8;
  }
  function applySpan(seed, span, rect) {
    const host = seed.getBoundingClientRect();
    span.style.left = ((rect.left - host.left) / zoom) + "px";
    span.style.top = ((rect.top - host.top) / zoom) + "px";
    span.style.right = "auto";
    span.style.bottom = "auto";
    span.style.transform = "none";
  }
  function cardAt(seed, span, extra, slide) {
    const host = seed.getBoundingClientRect();
    const hx = (hubBox.left + hubBox.right) / 2;
    const hy = (hubBox.top + hubBox.bottom) / 2;
    const sx = (host.left + host.right) / 2;
    const sy = (host.top + host.bottom) / 2;
    let dx = sx - hx;
    let dy = sy - hy;
    const len = Math.hypot(dx, dy) || 1;
    dx /= len;
    dy /= len;
    const w = span.offsetWidth;
    const h = span.offsetHeight;
    const dist = Math.hypot(host.width, host.height) / 2 + 8 + extra + Math.hypot(w, h) / 2;
    const cx = sx + dx * dist - dy * slide;
    const cy = sy + dy * dist + dx * slide;
    return { left: cx - w / 2, top: cy - h / 2, right: cx + w / 2, bottom: cy + h / 2, dx: dx, dy: dy };
  }
  function clampRect(rect) {
    const w = rect.right - rect.left;
    const h = rect.bottom - rect.top;
    let left = rect.left;
    let top = rect.top;
    if (left < usable.left) left = usable.left;
    if (left + w > usable.right) left = Math.max(usable.left, usable.right - w);
    if (top < usable.top) top = usable.top;
    if (top + h > usable.bottom) top = Math.max(usable.top, usable.bottom - h);
    if (sideRect && left < sideRect.right + 16 && left + w > sideRect.left - 16 && top < sideRect.bottom + 16 && top + h > sideRect.top - 16) {
      left = Math.min(left, sideRect.left - 16 - w);
    }
    return { left: left, top: top, right: left + w, bottom: top + h };
  }
  function fits(rect, placed) {
    if (outside(rect) || overlap(rect, hubBox)) return false;
    return !placed.some(function (other) { return overlap(rect, other); });
  }
  const placed = [];
  const hubSpan = hub.querySelector("span");
  if (hubSpan) {
    const w = hubSpan.offsetWidth;
    const h = hubSpan.offsetHeight;
    let left = (hubBox.left + hubBox.right) / 2 - w / 2;
    let top = hubBox.bottom + 8;
    const rect = clampRect({ left: left, top: top, right: left + w, bottom: top + h });
    applySpan(hub, hubSpan, rect);
    placed.push(rect);
  }
  field.querySelectorAll(".seed").forEach(function (seed) {
    if (seed === hub) return;
    const span = seed.querySelector("span");
    if (!span) return;
    const tries = [];
    for (let extra = 0; extra <= 200; extra += 16) tries.push([extra, 0]);
    for (let slide = 16; slide <= 180; slide += 16) {
      tries.push([8, slide]);
      tries.push([8, -slide]);
    }
    let chosen = null;
    tries.forEach(function (pair) {
      if (chosen) return;
      const rect = clampRect(cardAt(seed, span, pair[0], pair[1]));
      if (fits(rect, placed)) chosen = rect;
    });
    if (!chosen) chosen = clampRect(cardAt(seed, span, 0, 0));
    applySpan(seed, span, chosen);
    placed.push(chosen);
  });
}

function bindMapView() {
  const field = document.getElementById("pano-field");
  if (!field) return;
  layoutBookCloud(field);
  layoutShowAllChapters(field);
  if (!field.dataset.laid) {
    field.dataset.laid = "1";
    let key = field.clientWidth + "x" + field.clientHeight;
    const watch = new ResizeObserver(function () {
      const next = field.clientWidth + "x" + field.clientHeight;
      if (next === key) return;
      key = next;
      layoutBookCloud(field);
      layoutShowAllChapters(field);
      layoutFocusLabels(field);
    });
    watch.observe(field);
  }
  layoutFocusLabels(field);
  const pointers = {};
  let drag = null;
  let pinch = null;
  let arm = null;
  let backTimer = null;
  function live() { return Object.keys(pointers).map(function (id) { return pointers[id]; }); }
  field.addEventListener("wheel", function (ev) {
    ev.preventDefault();
    const old = state.mapZoom || 1;
    zoomAt(ev.clientX, ev.clientY, old * (ev.deltaY < 0 ? 1.12 : 1 / 1.12), field);
  }, { passive: false });
  field.addEventListener("pointerdown", function (ev) {
    if (ev.target.closest(".field-zoom, .seed")) {
      arm = null;
      return;
    }
    arm = { x: ev.clientX, y: ev.clientY, id: ev.pointerId };
    try { field.setPointerCapture(ev.pointerId); } catch (err) { /* older browsers */ }
    pointers[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
    if (live().length === 2) {
      const pts = live();
      pinch = { dist: Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1, zoom: state.mapZoom || 1 };
      drag = null;
      return;
    }
    drag = { x: ev.clientX, y: ev.clientY, px: state.mapPanX || 0, py: state.mapPanY || 0 };
  });
  field.addEventListener("pointermove", function (ev) {
    if (!pointers[ev.pointerId]) return;
    pointers[ev.pointerId] = { x: ev.clientX, y: ev.clientY };
    const pts = live();
    if (pts.length >= 2 && pinch) {
      const dist = Math.hypot(pts[0].x - pts[1].x, pts[0].y - pts[1].y) || 1;
      zoomAt((pts[0].x + pts[1].x) / 2, (pts[0].y + pts[1].y) / 2, pinch.zoom * dist / pinch.dist, field);
      return;
    }
    if (!drag) return;
    state.mapPanX = drag.px + ev.clientX - drag.x;
    state.mapPanY = drag.py + ev.clientY - drag.y;
    applyMapView();
  });
  function forget(ev) {
    delete pointers[ev.pointerId];
    if (live().length < 2) pinch = null;
    if (!live().length) drag = null;
  }
  field.addEventListener("pointerup", function (ev) {
    const start = arm && arm.id === ev.pointerId ? arm : null;
    forget(ev);
    if (!start) return;
    arm = null;
    if (Math.hypot(ev.clientX - start.x, ev.clientY - start.y) > 8) return;
    if (ev.target.closest(".seed, .field-zoom, .field-legend, button, a")) return;
    if (backTimer) clearTimeout(backTimer);
    backTimer = setTimeout(function () {
      backTimer = null;
      stepMapBack();
    }, 260);
  });
  field.addEventListener("pointercancel", function (ev) {
    arm = null;
    forget(ev);
  });
  field.addEventListener("dblclick", function (ev) {
    if (backTimer) {
      clearTimeout(backTimer);
      backTimer = null;
    }
    if (ev.target.closest(".seed, .field-zoom")) return;
    resetMapView();
    applyMapView();
  });
  const zoomIn = document.getElementById("zoom-in");
  const zoomOut = document.getElementById("zoom-out");
  const zoomFit = document.getElementById("zoom-fit");
  if (zoomIn) zoomIn.onclick = function () {
    const rect = field.getBoundingClientRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, (state.mapZoom || 1) * 1.2, field);
  };
  if (zoomOut) zoomOut.onclick = function () {
    const rect = field.getBoundingClientRect();
    zoomAt(rect.left + rect.width / 2, rect.top + rect.height / 2, (state.mapZoom || 1) / 1.2, field);
  };
  if (zoomFit) zoomFit.onclick = function () { resetMapView(); applyMapView(); };
  const togglePoints = document.getElementById("toggle-points");
  if (togglePoints) togglePoints.onclick = function () {
    state.mapShowAll = !state.mapShowAll;
    render();
  };
}

function round1(n) { return Math.round(n * 10) / 10; }

const VOLS = [
  { id: "701", name: "七上", tone: "t1" },
  { id: "702", name: "七下", tone: "t2" },
  { id: "801", name: "八上", tone: "t3" },
  { id: "802", name: "八下", tone: "t4" },
  { id: "901", name: "九上", tone: "t5" },
  { id: "902", name: "九下", tone: "t6" }
];

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

function graphCourseField(net) {
  const nodes = [];
  const lines = [];
  const showAll = !!state.mapShowAll;
  const focusNo = Number(state.mapNetNo) || 12;
  let focusId = "";
  net.nodes.forEach(function (node) {
    if (node.kind === "chapter" && Number(node.ch) === focusNo) focusId = node.id;
  });
  net.nodes.forEach(function (node) {
    const at = net.pos[node.id];
    if (!at) return;
    const x = round1(at[0]);
    const y = round1(at[1]);
    if (node.kind === "chapter") {
      const on = Number(node.ch) === focusNo;
      nodes.push({
        id: node.id, no: node.ch, openChapter: true, tone: volTone(node.vol), lead: true,
        named: true, on: on, big: on, above: y > 80,
        label: node.title, title: node.title, card: true, x: x, y: y
      });
    } else if (showAll && node.kind === "section") {
      nodes.push({
        id: node.id, section: node.sec, sec: true, mid: true, quiet: true, named: true,
        label: node.sec, title: node.title, x: x, y: y
      });
    }
  });
  if (showAll) {
    net.nodes.forEach(function (node) {
      if (node.kind !== "section" || !net.pos[node.id]) return;
      const at = net.pos[node.id];
      const kps = net.kpsBySec[node.sec] || [];
      kps.forEach(function (kp, index) {
        const angle = -Math.PI / 2 + index * (Math.PI * 2 / kps.length);
        nodes.push({
          id: kp.id, point: kp.id, kp: true, tiny: true, quiet: true,
          label: shortKp(kp.title), title: kp.title,
          x: round1(at[0] + Math.cos(angle) * 2.4),
          y: round1(at[1] + Math.sin(angle) * 2.1)
        });
        lines.push([node.id, kp.id, "hair", 2]);
      });
    });
    net.edges.forEach(function (edge) {
      if (edge.r !== "is_part_of" || !net.pos[edge.s] || !net.pos[edge.d]) return;
      const from = net.byId[edge.s];
      const to = net.byId[edge.d];
      if (!from || !to || from.kind === "knowledge_point" || to.kind === "knowledge_point") return;
      const bend = softBend(net.pos[edge.s][0], net.pos[edge.s][1], net.pos[edge.d][0], net.pos[edge.d][1], 3);
      lines.push([edge.s, edge.d, "hair", bend]);
    });
  }
  (net.chapterLinks || []).forEach(function (link) {
    if (!net.pos[link.s] || !net.pos[link.d]) return;
    const hot = link.s === focusId || link.d === focusId;
    if (link.n < 3 || (!hot && link.n < 5)) return;
    const dx = net.pos[link.s][0] - net.pos[link.d][0];
    const dy = net.pos[link.s][1] - net.pos[link.d][1];
    const far = dx * dx + dy * dy > 34 * 34;
    const bend = softBend(net.pos[link.s][0], net.pos[link.s][1], net.pos[link.d][0], net.pos[link.d][1], 6);
    lines.push([link.s, link.d, hot ? "rel hot" : far ? "rel far" : "rel", bend]);
  });
  const note = showAll
    ? "全部点已打开。浅黄是节，蓝点是知识点，线都画淡。章名里有第几章。"
    : "默认只画各章，章名里有第几章。绿线是先修，已经画淡。要看节和知识点，打开「全部点」。";
  if (!showAll) spreadChapters(nodes);
  return dotField(nodes, lines, note, "", "course");
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

function chapterChip(node) {
  const no = node.ch || node.no;
  const name = String(node.title || "").replace(/^第\d+章\s*/, "");
  const short = name.length > 4 ? name.slice(0, 4) + "…" : name;
  return "第" + no + "章" + (short ? " " + short : "");
}

function spreadChapters(nodes) {
  const chapters = nodes.filter(function (node) { return node.openChapter; });
  if (chapters.length < 2) return;
  let minX = 100;
  let maxX = 0;
  let minY = 100;
  let maxY = 0;
  chapters.forEach(function (node) {
    minX = Math.min(minX, node.x);
    maxX = Math.max(maxX, node.x);
    minY = Math.min(minY, node.y);
    maxY = Math.max(maxY, node.y);
  });
  const spanX = (maxX - minX) || 1;
  const spanY = (maxY - minY) || 1;
  chapters.forEach(function (node) {
    node.x = 8 + (node.x - minX) / spanX * 56;
    node.y = 16 + (node.y - minY) / spanY * 68;
  });
  for (let iter = 0; iter < 28; iter += 1) {
    for (let i = 0; i < chapters.length; i += 1) {
      for (let j = i + 1; j < chapters.length; j += 1) {
        const a = chapters[i];
        const b = chapters[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const nx = dx / 18;
        const ny = dy / 12;
        const dist = Math.sqrt(nx * nx + ny * ny);
        if (dist >= 1 || dist < 0.001) continue;
        const push = (1 - dist) * 0.7;
        const len = Math.sqrt(dx * dx + dy * dy) || 1;
        const mx = dx / len * push * 2;
        const my = dy / len * push * 1.4;
        a.x += mx;
        a.y += my;
        b.x -= mx;
        b.y -= my;
      }
    }
  }
  chapters.forEach(function (node) {
    node.x = round1(Math.max(8, Math.min(64, node.x)));
    node.y = round1(Math.max(14, Math.min(86, node.y)));
    let nearest = null;
    let best = 1e9;
    chapters.forEach(function (other) {
      if (other === node) return;
      const dx = node.x - other.x;
      const dy = node.y - other.y;
      const dist = dx * dx + dy * dy;
      if (dist < best) {
        best = dist;
        nearest = other;
      }
    });
    const dx = nearest ? node.x - nearest.x : node.x - 36;
    const dy = nearest ? node.y - nearest.y : node.y - 50;
    node.side = Math.abs(dx) >= Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "top" : "bottom");
    node.label = node.title || chapterChip(node);
    node.above = false;
  });
  function labelBox(node, side) {
    const w = 12;
    const h = 5;
    if (side === "left") return { x: node.x - w - 1, y: node.y - h / 2, w: w, h: h };
    if (side === "right") return { x: node.x + 2, y: node.y - h / 2, w: w, h: h };
    if (side === "top") return { x: node.x - w / 2, y: node.y - h - 2, w: w, h: h };
    return { x: node.x - w / 2, y: node.y + 2, w: w, h: h };
  }
  function boxesOverlap(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  }
  const placed = [];
  chapters.slice().sort(function (a, b) { return Number(a.no) - Number(b.no); }).forEach(function (node) {
    const choices = [node.side, "right", "left", "bottom", "top"].filter(function (side, index, list) {
      return list.indexOf(side) === index;
    }).filter(function (side) {
      if (side === "left" && node.x < 20) return false;
      if (side === "right" && node.x > 54) return false;
      if (side === "top" && node.y < 22) return false;
      if (side === "bottom" && node.y > 78) return false;
      return true;
    });
    let picked = "";
    choices.forEach(function (side) {
      if (picked) return;
      const box = labelBox(node, side);
      const blocked = chapters.some(function (other) {
        if (other === node) return false;
        return boxesOverlap(box, { x: other.x - 2.2, y: other.y - 2.2, w: 4.4, h: 4.4 });
      }) || placed.some(function (other) {
        return boxesOverlap(box, labelBox(other, other.side));
      });
      if (!blocked) picked = side;
    });
    node.side = picked || choices[0] || "bottom";
    placed.push(node);
  });
}

function graphChapterRadial(net, no) {
  const chapter = courseByNo(no) || courseByNo(12);
  const list = (SECTIONS[chapter.no] || []).slice();
  const half = Math.ceil(list.length / 2);
  const left = [];
  const right = [];
  list.forEach(function (sec, index) {
    const item = {
      id: "s-" + sec[0], section: sec[0], sec: true, named: true, full: true,
      label: sec[0] + " " + sec[1], title: sec[0] + " " + sec[1], line: "c", flow: "none"
    };
    (index < half ? left : right).push(item);
  });
  const self = net.nodes.filter(function (node) {
    return node.kind === "chapter" && Number(node.ch) === Number(chapter.no);
  })[0];
  const related = [];
  if (self) {
    (net.chapterLinks || []).forEach(function (link) {
      const otherId = link.s === self.id ? link.d : link.d === self.id ? link.s : "";
      if (!otherId || !net.byId[otherId]) return;
      related.push({ id: otherId, n: link.n, flow: link.s === self.id ? "out" : "in" });
    });
  }
  related.sort(function (a, b) { return b.n - a.n; });
  const top = [];
  const bottom = [];
  related.slice(0, 6).forEach(function (item, index) {
    const other = net.byId[item.id];
    const chip = {
      id: other.id, openChapter: true, no: other.ch, tone: volTone(other.vol), lead: true, named: true, full: true,
      label: other.title, title: other.title, line: "b",
      flow: item.flow
    };
    (index % 2 === 0 ? top : bottom).push(chip);
  });
  return spreadSides({
    id: "c", backNet: true, big: true, on: true, lead: true, full: true,
    label: "第" + chapter.no + "章 " + chapter.title,
    title: "第" + chapter.no + "章 " + chapter.title, x: 42, y: 48
  }, { left: left, right: right, top: top, bottom: bottom },
  "这一章的节和相关章均匀围在周围。绿线箭头指向先修的方向：从先修章指向要用它的章。点一节，再看里面的知识点和方法。", "chapter");
}

function graphChapterIslands(net, no) {
  const chapter = courseByNo(no) || courseByNo(12);
  const list = (SECTIONS[chapter.no] || []).slice();
  const nodes = [];
  const lines = [];
  const placed = [];
  cellGrid(list, 8, 16, 92, 84).forEach(function (spot) {
    const sec = spot.item;
    const id = sec[0];
    placed.push({ id: "sec-" + id, x: spot.x, y: spot.y });
    nodes.push({
      id: "sec-" + id, section: id, sec: true, named: true, above: true,
      label: id + " " + sec[1], title: id + " " + sec[1], x: spot.x, y: spot.y
    });
    const kps = net.kpsBySec[id] || [];
    const skills = (net.skillsBySec[id] || []).slice(0, 4);
    const satellites = kps.map(function (node) { return { kind: "kp", node: node }; })
      .concat(skills.map(function (node) { return { kind: "sk", node: node }; }));
    satellites.forEach(function (item, index) {
      const angle = -Math.PI / 2 + 0.7 + index * (Math.PI * 2 / Math.max(satellites.length, 1));
      const radius = satellites.length > 8 ? 3.1 : 3.6;
      const x = round1(spot.x + Math.cos(angle) * radius);
      const y = round1(spot.y + Math.sin(angle) * radius * 0.82);
      if (item.kind === "kp") {
        nodes.push({
          id: item.node.id, kp: true, tiny: true, pin: true, quiet: true,
          label: shortKp(item.node.title), title: item.node.title, x: x, y: y
        });
      } else {
        nodes.push({
          id: item.node.id, method: true, tiny: true, pin: true, quiet: true,
          label: shortKp(item.node.title), title: item.node.title, x: x, y: y
        });
      }
      lines.push(["sec-" + id, item.node.id, "hair", 0]);
    });
  });
  for (let i = 0; i < placed.length - 1; i += 1) {
    const from = placed[i];
    const to = placed[i + 1];
    const dx = from.x - to.x;
    const dy = from.y - to.y;
    if (dx * dx + dy * dy > 900) continue;
    lines.push([from.id, to.id, "seq", 0]);
  }
  return dotField(nodes, lines, "这一章有 " + list.length + " 节。图上只标节名，点开一节再看里面的知识。", "", "chapter");
}

function graphSectionField(net, id) {
  const found = sectionParts(id);
  const chapter = courseByNo(found.no);
  const kps = net.kpsBySec[id] || [];
  const skills = (net.skillsBySec[id] || []).slice(0, 3);
  const left = [];
  const right = [];
  const mid = Math.ceil(kps.length / 2);
  kps.forEach(function (node, index) {
    const item = {
      id: node.id, point: node.id, kp: true, named: true, math: true,
      label: kpLabel(node.title), title: node.title, line: "a", flow: "none"
    };
    (index < mid ? left : right).push(item);
  });
  const bottom = skills.map(function (node) {
    const extend = node.tier === "extend";
    const olymp = node.tier === "olympiad";
    return {
      id: node.id, method: true, methodId: node.id, extend: extend, olymp: olymp, named: true,
      on: state.mapSkill === node.id,
      label: shortKp(node.title), title: node.title,
      line: olymp ? "oly" : extend ? "ext" : "b", flow: "in"
    };
  });
  const top = [{
    id: "ch", openChapter: true, no: found.no, lead: true, named: true,
    label: "第" + found.no + "章", title: "第" + found.no + "章 " + (chapter ? chapter.title : ""), line: "c", flow: "none"
  }];
  if (found.idx >= 0 && found.list[found.idx + 1]) {
    const next = found.list[found.idx + 1];
    top.push({
      id: "next", section: next[0], sec: true, named: true,
      label: next[0] + " " + next[1], title: next[0] + " " + next[1], line: "c", flow: "none"
    });
  }
  const title = found.sec ? found.sec[0] + " " + found.sec[1] : id;
  return spreadSides({
    id: "c", openChapter: true, no: found.no, sec: true, big: true, on: true,
    label: title, title: title, x: 42, y: 48
  }, { left: left, right: right, top: top, bottom: bottom },
  "知识点、方法和章节均匀围在这一节周围。方法的箭头指向这一节。点知识点看它的前置和后置。", "mind");
}

function graphPointField(net, id) {
  const node = net.byId[id];
  function related(ids) {
    return (ids || []).filter(function (otherId) {
      const other = net.byId[otherId];
      return other && other.kind === "knowledge_point";
    }).slice(0, 4);
  }
  const pres = related(net.pre[id]).map(function (otherId) {
    const other = net.byId[otherId];
    return { id: other.id, point: other.id, kp: true, named: true, math: true, label: kpLabel(other.title), title: other.title, line: "b", flow: "in" };
  });
  const posts = related(net.post[id]).map(function (otherId) {
    const other = net.byId[otherId];
    return { id: other.id, point: other.id, kp: true, named: true, math: true, label: kpLabel(other.title), title: other.title, line: "b", flow: "out" };
  });
  const chapter = courseByNo(node.ch);
  const top = chapter ? [{
    id: "ch-" + node.ch, openChapter: true, no: node.ch, lead: true, named: true,
    label: "第" + node.ch + "章", title: "第" + node.ch + "章 " + chapter.title, line: "c", flow: "none"
  }] : [];
  const bottom = (net.skillByKp[id] || []).slice(0, 3).map(function (method) {
    const extend = method.tier === "extend";
    const olymp = method.tier === "olympiad";
    return {
      id: method.id, method: true, methodId: method.id, extend: extend, olymp: olymp, named: true,
      on: state.mapSkill === method.id,
      label: kpLabel(method.title), title: method.title, math: true,
      line: olymp ? "oly" : extend ? "ext" : "a", flow: "in"
    };
  });
  return spreadSides({
    id: "c", point: id, kp: true, big: true, on: true,
    label: kpLabel(node.title), title: node.title, math: true, x: 42, y: 48
  }, { left: pres, right: posts, top: top, bottom: bottom },
  "周围的点均匀排开。绿线是先修：前置的箭头指向这里，后置的箭头从这里指出去。蓝线是方法，箭头指向这个知识点。", "mind");
}

function ensureSectionId(net, sec) {
  let found = "";
  net.nodes.forEach(function (node) {
    if (!found && node.kind === "section" && node.sec === sec) found = node.id;
  });
  return found;
}

/** All 26 chapters as one net. Lines cross; they are not six parallel rows. */
function courseField() {
  const net = ensureNet();
  if (net) return graphCourseField(net);
  const nodes = COURSE_NODES.map(function (chapter) {
    return {
      id: "ch-" + chapter.no,
      no: chapter.no,
      label: chapter.short,
      title: "第" + chapter.no + "章 " + chapter.title,
      x: chapter.x,
      y: chapter.y,
      on: state.mapNetNo === chapter.no && state.mapLevel !== "chapter",
      big: chapter.no === 12,
      above: chapter.y >= 70,
      tone: bookTone(chapter.no),
      openChapter: true
    };
  });
  const lines = COURSE_LINKS.map(function (pair, index) {
    return ["ch-" + pair[0], "ch-" + pair[1], index % 3 === 0 ? "a" : index % 3 === 1 ? "b" : "c", index % 2 ? 7 : -7];
  });
  const hub = nodes.filter(function (node) { return node.no === 12; })[0];
  const spots = [[-6, -7], [7, -5], [8, 4], [-5, 7]];
  const shortName = ["定义", "元素", "三边", "记法"];
  POINT_NAMES.forEach(function (name, index) {
    nodes.push({
      id: "kp-" + index,
      point: name,
      kp: true,
      quiet: true,
      label: shortName[index],
      title: name,
      x: hub.x + spots[index][0],
      y: hub.y + spots[index][1],
      on: state.mapPoint === name
    });
    lines.push(["ch-12", "kp-" + index, "kp"]);
  });
  const note = "颜色按册分开。点一章，看这一章的节。线是先后和相关。";
  return dotField(nodes, lines, note, "", "course");
}

function chapterField(no) {
  const net = ensureNet();
  if (net) return graphChapterRadial(net, no);
  const chapter = courseByNo(no) || courseByNo(12);
  const list = SECTIONS[chapter.no] || [];
  const satellites = list.map(function (sec) {
    return {
      id: "s-" + sec[0],
      section: sec[0],
      sec: true,
      label: sec[0] + " " + sec[1],
      title: sec[0] + " " + sec[1]
    };
  });
  return placeMind({
    id: "c",
    no: chapter.no,
    backNet: true,
    big: true,
    on: true,
    label: "第" + chapter.no + "章 " + chapter.short,
    title: "第" + chapter.no + "章 " + chapter.title,
    x: 48,
    y: 48
  }, satellites, "这一章有 " + list.length + " 节。点一节，看这一节的图。再点中间，回到全书。");
}

function sectionParts(id) {
  const no = Number(String(id).split(".")[0]);
  const list = SECTIONS[no] || [];
  let idx = -1;
  for (let i = 0; i < list.length; i += 1) {
    if (list[i][0] === id) idx = i;
  }
  return { no: no, list: list, idx: idx, sec: idx >= 0 ? list[idx] : null };
}

function sectionField(id) {
  const net = ensureNet();
  if (net && net.kpsBySec[id] && net.kpsBySec[id].length) return graphSectionField(net, id);
  const found = sectionParts(id);
  const chapter = courseByNo(found.no);
  const satellites = [];
  if (id === "12.1") {
    POINT_NAMES.forEach(function (name) {
      satellites.push({ id: "kp-" + name, point: name, kp: true, label: name, title: name });
    });
    satellites.push({ id: "m", method: true, label: "两边之和", title: "两边之和" });
    const next = found.list[found.idx + 1];
    if (next) satellites.push({ id: "next", section: next[0], sec: true, label: next[0] + " " + next[1], title: next[0] + " " + next[1] });
  } else {
    if (found.idx > 0) {
      const prev = found.list[found.idx - 1];
      satellites.push({ id: "prev", section: prev[0], sec: true, label: prev[0] + " " + prev[1], title: "上一节 " + prev[0] + " " + prev[1] });
    }
    if (found.idx >= 0 && found.list[found.idx + 1]) {
      const next = found.list[found.idx + 1];
      satellites.push({ id: "next", section: next[0], sec: true, label: next[0] + " " + next[1], title: "下一节 " + next[0] + " " + next[1] });
    }
  }
  satellites.push({
    id: "ch",
    openChapter: true,
    no: found.no,
    label: "第" + found.no + "章",
    title: "第" + found.no + "章 " + (chapter ? chapter.title : "")
  });
  const title = found.sec ? found.sec[0] + " " + found.sec[1] : id;
  const note = id === "12.1"
    ? "蓝点是这一节的知识点。点一个，看它四周。再点中间，回到这一章的节。"
    : "这一节的知识点还没放进这版原型。周围是前后节和本章。";
  return placeMind({
    id: "c",
    openChapter: true,
    no: found.no,
    sec: true,
    big: true,
    on: true,
    label: title,
    title: title,
    x: 48,
    y: 48
  }, satellites, note);
}

/** One knowledge point, with prerequisite, successor, method and idea around it. */
function focusField(name) {
  const net = ensureNet();
  if (net && net.byId[name] && net.byId[name].kind === "knowledge_point") return graphPointField(net, name);
  const row = POINT_METHOD[name] || POINT_METHOD["三角形的定义"];
  const priors = {
    "三角形的定义": { no: 3, label: "几何图形", title: "第3章 简单的几何图形" },
    "三角形的元素": { point: "三角形的定义", label: "三角形的定义", title: "三角形的定义", kp: true },
    "三边关系": { point: "三角形的元素", label: "三角形的元素", title: "三角形的元素", kp: true },
    "三角形的记法": { point: "三角形的定义", label: "三角形的定义", title: "三角形的定义", kp: true }
  };
  const nextName = {
    "三角形的定义": "三角形的元素",
    "三角形的元素": "三边关系",
    "三边关系": "三角形的记法"
  }[name];
  const before = priors[name] || priors["三角形的定义"];
  const satellites = [
    { id: "pre", label: before.label, title: before.title || before.label, point: before.point, no: before.no, openChapter: !before.point && !!before.no, kp: !!before.kp },
    { id: "method", label: row.method, title: row.method, method: true },
    { id: "idea", label: row.idea, title: row.idea, idea: true },
    { id: "ch", openChapter: true, no: 12, label: "第12章 三角形", title: "第12章 三角形" }
  ];
  if (nextName) satellites.splice(1, 0, { id: "post", point: nextName, kp: true, label: nextName, title: nextName });
  else satellites.splice(1, 0, { id: "post", mute: true, label: "还没放", title: "这一节后面的知识点还没放进这版原型" });
  return placeMind({
    id: "c",
    point: name,
    kp: true,
    big: true,
    on: true,
    label: name,
    title: name,
    x: 48,
    y: 48
  }, satellites, "周围是前置、后置、本章、方法和思想。再点中间，回到这一节。");
}

function withSideFold(html) {
  if (!html || html.indexOf('<aside class="side">') < 0) return html;
  if (state.mapSideOpen === false) return '<button type="button" class="side-tab" id="side-open">章节</button>';
  return html.replace('<aside class="side">', '<aside class="side"><button type="button" class="side-fold" id="side-fold">收起</button>');
}

function panoramaSide() {
  if (state.mapSkill && state.mapCard) {
    const skillCard = graphSkillSide(state.mapSkill);
    if (skillCard) return skillCard;
  }
  const backCourse = '<button type="button" class="link" id="back-net">回到全书点阵</button>';
  const backChapter = '<button type="button" class="link" id="back-chapter">回到这一章</button>';
  if (state.mapPoint && state.mapCard) {
    const graphCard = graphPointSide(state.mapPoint, '<button type="button" class="link" id="back-section">回到这一节</button>' + backCourse);
    if (graphCard) return graphCard;
    return pointCard('<button type="button" class="link" id="back-section">回到这一节</button>' + backCourse);
  }
  if (state.mapPoint) {
    return '<aside class="side"><p class="muted">卡片已收起。</p><button type="button" class="btn" id="side-reopen">打开这张卡片</button><button type="button" class="link" id="back-section">回到这一节</button>' + backCourse + "</aside>";
  }
  const chapter = courseByNo(state.mapNetNo) || courseByNo(12);
  if (state.mapSection) {
    const found = sectionParts(state.mapSection);
    const title = found.sec ? found.sec[0] + " " + found.sec[1] : state.mapSection;
    const net = ensureNet();
    const kps = net && net.kpsBySec[state.mapSection];
    const body = kps && kps.length
      ? "这一节有 " + kps.length + " 个知识点，来自现有图谱。点一个，看它的前置和后置。"
      : "这一节的知识点还没放进这版原型。图上是前后节和本章。";
    return '<aside class="side"><div class="row"><h2>' + esc(title) + "</h2></div><p>" + body + "</p>" +
      backChapter + backCourse + "</aside>";
  }
  if (state.mapLevel === "chapter") {
    const net = ensureNet();
    const list = SECTIONS[chapter.no] || [];
    const rows = list.map(function (sec) {
      const kps = net && net.kpsBySec[sec[0]] ? net.kpsBySec[sec[0]].length : 0;
      const skills = net && net.skillsBySec[sec[0]] ? net.skillsBySec[sec[0]].length : 0;
      return '<button type="button" data-open-section="' + esc(sec[0]) + '"><b>' + esc(sec[0] + " " + sec[1]) + "</b><span>" +
        kps + " 知识 · " + skills + " 方法</span></button>";
    }).join("");
    const open = chapter.no === 12 ? '<button class="btn" id="open-chapter">打开这一章</button>' : "";
    return '<aside class="side"><div class="row"><h2>第 ' + chapter.no + " 章 " + esc(chapter.title) + "</h2></div>" +
      "<p>节和相关章均匀围在这一章周围。绿线箭头从先修章指向要用它的章。点一节，再看里面的知识点和方法。</p>" +
      '<div class="sec-list">' + rows + "</div>" + open + backCourse +
      '<button type="button" class="link" id="back-layer">回到分层</button></aside>';
  }
  return '<aside class="side"><div class="row"><h2>第 ' + chapter.no + " 章 " + esc(chapter.title) + "</h2></div>" +
    "<p>默认只画 26 章，章名带第几章。图上的「全部点」打开后，才画出节和知识点。</p>" +
    (chapter.no === 12 ? '<button class="btn" id="open-chapter">打开这一章</button>' : "") +
    '<button type="button" class="link" id="back-layer">回到分层</button></aside>';
}

/** Chapter point field under the layer columns. Lines are the sample prerequisite order. */
function fieldMarkup(network) {
  const nodes = network
    ? [
      { id: "三角形的定义", label: "三角形的定义", x: 22, y: 42 },
      { id: "三角形的元素", label: "三角形的元素", x: 42, y: 68 },
      { id: "三边关系", label: "三边关系", x: 64, y: 36 },
      { id: "三角形的记法", label: "三角形的记法", x: 82, y: 64 }
    ]
    : [
      { id: "chapter", label: "第 12 章", x: 18, y: 42, chapter: true },
      { id: "三角形的定义", label: "三角形的定义", x: 40, y: 24 },
      { id: "三角形的元素", label: "三角形的元素", x: 46, y: 52 },
      { id: "三边关系", label: "三边关系", x: 66, y: 26 },
      { id: "三角形的记法", label: "三角形的记法", x: 74, y: 52 }
    ];
  const lines = network
    ? [["三角形的定义", "三角形的元素"], ["三角形的元素", "三边关系"], ["三边关系", "三角形的记法"]]
    : [["chapter", "三角形的定义"], ["三角形的定义", "三角形的元素"], ["三角形的元素", "三边关系"], ["三边关系", "三角形的记法"]];
  const at = {};
  nodes.forEach(function (node) { at[node.id] = node; });
  const svg = lines.map(function (pair) {
    const from = at[pair[0]];
    const to = at[pair[1]];
    const hot = state.mapPoint && (pair[0] === state.mapPoint || pair[1] === state.mapPoint);
    return '<line x1="' + from.x + '%" y1="' + from.y + '%" x2="' + to.x + '%" y2="' + to.y + '%"' +
      (hot ? ' class="hot"' : "") + "/>";
  }).join("");
  const buttons = nodes.map(function (node) {
    const on = node.chapter ? state.mapChapter : state.mapPoint === node.id;
    const attr = node.chapter ? ' data-chapter="12"' : ' data-point="' + node.id + '"';
    return '<button class="node' + (on ? " on" : "") + '" style="left:' + node.x + "%;top:" + node.y + '%"' +
      attr + ">" + node.label + "</button>";
  }).join("");
  return '<div class="field"><svg aria-hidden="true">' + svg + "</svg>" + buttons +
    '<p class="field-note">' + (network ? "线是前置。点一下，卡片在右边。" : "线是先修。点一下，卡片在右边，不盖住图。") + "</p></div>";
}

/** What the six layer columns show after the current selection. */
function literacyNode() {
  const cat = catalog();
  if (!cat || !state.mapLiteracy) return null;
  return cat.competencies.filter(function (node) {
    return node.id === state.mapLiteracy || node.title === state.mapLiteracy;
  })[0] || null;
}

function skillMatchesLiteracy(skill, cat) {
  const comp = literacyNode();
  if (!comp) return true;
  const thoughts = cat.thoughtBySkill[skill.id] || [];
  return thoughts.some(function (thought) {
    return (cat.compByThought[thought.id] || []).some(function (item) { return item.id === comp.id; });
  });
}

function layerScope() {
  const cat = catalog();
  const empty = { books: [], chapters: [], sections: [], points: [], methods: [], ideas: [] };
  if (!cat) return empty;
  const vol = activeVol();
  const books = cat.volumes;
  if (!vol) return { books: books, chapters: [], sections: [], points: [], methods: [], ideas: [] };
  const key = activeChapterKey();
  const chapter = key && key.indexOf(vol + "-") === 0 ? (cat.chByVol[vol] || []).filter(function (node) {
    return node.vol + "-" + node.ch === key;
  })[0] : null;
  const sections = chapter ? (cat.secsByCh[key] || []) : [];
  const sec = sections.filter(function (node) { return node.sec === state.mapSection; })[0] || null;
  const points = sec ? (cat.kpsBySec[sec.sec] || []).slice() : [];
  const net = ensureNet();
  const methods = [];
  const seenSkill = {};
  function addSkill(skill) {
    if (!skill || seenSkill[skill.id]) return;
    seenSkill[skill.id] = 1;
    methods.push(skill);
  }
  if (sec) (cat.skillsBySec[sec.sec] || []).forEach(addSkill);
  points.forEach(function (kp) {
    ((net && net.skillByKp[kp.id]) || []).forEach(addSkill);
  });
  const ideas = [];
  const seen = {};
  methods.forEach(function (skill) {
    (cat.thoughtBySkill[skill.id] || []).forEach(function (thought) {
      if (seen[thought.id]) return;
      seen[thought.id] = 1;
      ideas.push(thought);
    });
  });
  return { books: books, chapters: cat.chByVol[vol] || [], sections: sections, points: points, methods: methods, ideas: ideas, chapter: chapter, sec: sec };
}

function layerCol(title, names, html, extra) {
  return '<div class="col' + (extra ? " " + extra : "") + '"><h3>' + title + " " + names.length + "</h3>" + (html || '<p class="muted">这里没有</p>') + "</div>";
}

function layerPile(title, count, html) {
  return '<section class="pile"><h3>' + title + " " + count + '</h3><div class="pile-body">' + html + "</div></section>";
}

function layerButtons(names, attr, selected) {
  return names.map(function (name) {
    const on = selected === name ? " on" : "";
    return '<button type="button" class="link' + on + '" ' + attr + '="' + name + '">' + name + "</button>";
  }).join("");
}

function methodCard() {
  const cat = catalog();
  const skill = cat && cat.byId[state.mapMethod];
  if (!skill) return "";
  state.mapSkill = skill.id;
  return '<aside class="side"><div class="row"><h2>' + mathHtml(kpLabel(skill.title)) + '</h2><button class="link" id="map-close">关闭</button></div>' +
    "<p>" + esc(skill.sec || "") + '</p><button class="btn" id="map-skill">看这个方法</button></aside>';
}

function ideaCard() {
  const cat = catalog();
  const thought = cat && cat.byId[state.mapIdea];
  if (!thought) return "";
  return '<aside class="side"><div class="row"><h2>' + esc(thought.title) + '</h2><button class="link" id="map-close">关闭</button></div>' +
    "<p>这个思想挂在当前列出的方法上。</p></aside>";
}

function layerNodeButtons(nodes, attr, selected, bright) {
  return nodes.map(function (node) {
    const on = selected === node.id || selected === node.vol || selected === node.title ? " on" : "";
    const dim = bright && !bright(node) ? " dim" : "";
    const value = attr === "data-book" ? node.vol : node.id;
    return '<button type="button" class="link' + on + dim + '" ' + attr + '="' + esc(value) + '">' + mathHtml(kpLabel(node.title)) + "</button>";
  }).join("");
}

/** Layered graph. The view switch stays above the point card. */
function viewMap() {
  state.nav = "map";
  if (hashParam("load") === "1") {
    return '<h1>图谱</h1><div class="seg">' + modeButton("layer", "分层") + modeButton("panorama", "全景") +
      '</div><section class="card"><p>正在打开……</p></section>';
  }
  let body = "";
  const net = hashParam("net") === "1" ? modeButton("network", "网络") : "";
  if (state.mapMode === "layer") {
    const sets = layerScope();
    let side = "";
    if (state.mapCard && state.mapIdea) side = ideaCard();
    else if (state.mapCard && state.mapMethod) side = methodCard();
    else if (state.mapPoint && state.mapCard) side = graphPointSide(state.mapPoint, "") || pointCard();
    else if (sets.sec && state.mapCard) {
      side = '<aside class="side"><div class="row"><h2>' + esc(sets.sec.title) + '</h2><button class="link" id="map-close">关闭</button></div>' +
        "<p>" + sets.points.length + ' 个知识点</p><button class="btn" id="open-layer-sec">打开这一节</button></aside>';
    } else if (sets.chapter && state.mapCard) {
      side = '<aside class="side"><div class="row"><h2>' + esc(sets.chapter.title) + '</h2><button class="link" id="map-close">关闭</button></div>' +
        "<p>" + sets.sections.length + ' 节</p><button class="btn" id="open-chapter">打开这一章</button></aside>';
    } else if (!sets.chapter && !state.mapPoint && !state.mapMethod && !state.mapIdea) {
      side = '<aside class="side"><p class="muted">先选一册、一章，再点一节。知识点出现在右边可以往下翻。</p></aside>';
    }
    const sectionHtml = sets.chapter
      ? (sets.sections.length ? sets.sections.map(function (sec) {
        const on = state.mapSection === sec.sec ? " on" : "";
        const count = ((catalog() && catalog().kpsBySec[sec.sec]) || []).length;
        return '<button type="button" class="link' + on + '" data-layer-sec="' + esc(sec.sec) + '"><b>' + esc(sec.title) + '</b><span>' + count + " 个知识点</span></button>";
      }).join("") : '<p class="muted">这一章还没有节。</p>')
      : '<p class="muted">先选一章。</p>';
    const catNow = catalog();
    const netNow = ensureNet();
    function pointOn(kp) {
      if (!literacyNode() || !catNow || !netNow) return true;
      return ((netNow.skillByKp[kp.id]) || []).some(function (skill) { return skillMatchesLiteracy(skill, catNow); });
    }
    const pointHtml = sets.sec
      ? (sets.points.length ? layerNodeButtons(sets.points, "data-point", state.mapPoint || "", pointOn) : '<p class="muted">这一节在图谱里还没有知识点。</p>')
      : '<p class="muted">先选一节。</p>';
    const methodHtml = sets.sec
      ? (sets.methods.length ? sets.methods.map(function (skill) {
        const on = state.mapMethod === skill.id ? " on" : "";
        const dim = literacyNode() && catNow && !skillMatchesLiteracy(skill, catNow) ? " dim" : "";
        const thoughts = ((catNow && catNow.thoughtBySkill[skill.id]) || []).map(function (thought) { return thought.title; });
        const sub = thoughts.length ? "<span>" + esc(thoughts.join(" · ")) + "</span>" : "";
        return '<button type="button" class="link' + on + dim + '" data-method="' + esc(skill.id) + '"><b>' + mathHtml(kpLabel(skill.title)) + "</b>" + sub + "</button>";
      }).join("") : '<p class="muted">这一节在图谱里还没有挂方法。</p>')
      : '<p class="muted">先选一节。</p>';
    const columns = layerCol("节", sets.sections, sectionHtml, "slim") +
      layerCol("知识", sets.points, pointHtml, "main-col") +
      layerCol("方法", sets.methods, methodHtml, "main-col");
    body = '<div class="map-page map-fill' + (state.mapSideOpen === false ? " side-collapsed" : "") + '"><div class="board pano-board"><div class="float-modes">' +
      modeButton("layer", "分层") + modeButton("panorama", "全景") + net + "</div>" +
      '<div class="layer-board">' + mapFilters() + '<div class="map' + (side ? " with-card" : "") + '">' + columns + withSideFold(side) + "</div></div></div></div>";
  } else if (state.mapMode === "network") {
    const side = state.mapPoint && state.mapCard ? pointCard() : '<aside class="side"><p class="muted">点一个知识点。</p></aside>';
    body = '<div class="map-page"><div class="board">' + fieldMarkup(true) + side + "</div></div>";
  } else if (hashParam("pano") === "fail") {
    body = '<section class="card"><p>全景暂时打不开，先用分层看。</p><button class="btn" id="back-layer">回到分层</button></section>';
  } else {
    const field = state.mapPoint ? focusField(state.mapPoint) : state.mapSection ? sectionField(state.mapSection) : state.mapLevel === "chapter" ? chapterField(state.mapNetNo) : courseField();
    body = '<div class="map-page map-fill' + (state.mapSideOpen === false ? " side-collapsed" : "") + '"><div class="board pano-board"><div class="float-modes">' +
      modeButton("layer", "分层") + modeButton("panorama", "全景") + net + "</div>" + field + withSideFold(panoramaSide()) + "</div></div>";
  }
  if (state.mapMode === "layer" || (state.mapMode === "panorama" && hashParam("pano") !== "fail")) return body;
  return '<h1>图谱</h1><div class="seg">' + modeButton("layer", "分层") + modeButton("panorama", "全景") + net + "</div>" + body;
}

/** Book and chapter filters. The selected values stay the same as the columns. */
function mapFilters() {
  const cat = catalog();
  const vol = activeVol();
  const books = cat ? cat.volumes.map(function (item) {
    return '<option value="' + esc(item.vol) + '"' + (item.vol === vol ? " selected" : "") + ">" + esc(item.title) + "</option>";
  }).join("") : "";
  const chapters = cat && vol ? (cat.chByVol[vol] || []).map(function (item) {
    const key = item.vol + "-" + item.ch;
    return '<option value="' + esc(key) + '"' + (activeChapterKey() === key ? " selected" : "") + ">" + esc(item.title) + "</option>";
  }).join("") : "";
  const comps = cat ? cat.competencies.map(function (item) {
    return '<option value="' + esc(item.id) + '"' + (state.mapLiteracy === item.id || state.mapLiteracy === item.title ? " selected" : "") + ">" + esc(item.title) + "</option>";
  }).join("") : "";
  return '<div class="map-filters"><label>册 <select id="pick-book"><option value="">不选</option>' + books +
    '</select></label><label>章 <select id="pick-chapter"><option value="">不选</option>' + chapters +
    '</select></label><label>素养 <select id="pick-literacy"><option value="">不筛</option>' + comps + "</select></label></div>";
}

/** One segment button for the graph mode. */
function modeButton(mode, label) {
  const pressed = state.mapMode === mode ? ' aria-pressed="true"' : ' aria-pressed="false"';
  return '<button data-mode="' + mode + '"' + pressed + ">" + label + "</button>";
}

/** Explain a test before the first question. */
function viewBrief() {
  const scope = state.pendingScope || state.testScope;
  state.nav = scope === "review" ? "review" : "book";
  const count = scope === "review" ? reviewTestIds().length : QUESTIONS.length;
  if (!count) {
    return '<h1>这次是测试</h1><section class="card"><p>这几个知识点暂时没有能测的题。</p>' +
      '<button class="btn" id="to-kp">去看这个知识点</button></section>';
  }
  return '<h1>这次是测试</h1><section class="card"><p>不能看提示，交卷后才知道对错。做的过程中可以改答案。</p>' +
    '<p class="muted">这一次 ' + count + " 道示意题。</p>" +
    '<div class="row"><button class="btn" id="begin-test">开始测</button><button class="btn secondary" id="skip-test">先不测</button></div></section>';
}

/** Escape text that is written into the prototype page. */
function esc(text) {
  return String(text || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/"/g, "&quot;");
}

/** One question, with graded hints in practice and none in a test. */
/** Passage and method stay on this question. Closing the panel does not change the route. */
function hintPanelHtml() {
  if (state.hintPanel === "passage") {
    return '<div class="sheet-panel"><h3>12.1 这一段</h3><p>课本第 74 页。由不在同一直线上的三条线段首尾顺次相接所组成的图形叫做三角形。</p><button type="button" class="btn secondary" id="close-panel">回到这道题</button></div>';
  }
  if (state.hintPanel === "method") {
    return '<div class="sheet-panel"><h3>三边关系</h3><p>先加较短的两边，再和最长的一边比。两边之和要大于第三边。</p><button type="button" class="btn secondary" id="close-panel">回到这道题</button></div>';
  }
  return "";
}

function viewPractice() {
  const testNav = state.source === "test" && state.testScope === "review";
  state.nav = testNav || state.source === "review" ? "review" : state.source === "today" ? "today" : "book";
  if (hashParam("load") === "1") {
    const head = state.mode === "test" ? "测试" : "12.1 三角形 · 练习";
    return '<div class="practice-fit"><h1>' + head + '</h1><div class="work"><section class="card"><p>正在打开……</p></section>' +
      '<aside class="card"><h2>' + (state.mode === "test" ? "题号" : "提示") + '</h2><p>正在打开……</p></aside></div></div>';
  }
  const item = questionById(state.queue[state.index]);
  if (!item) return '<h1>这一组没有题</h1><button class="btn" id="to-today">回到今天</button>';
  const title = state.mode === "test"
    ? "测试 · 第 " + (state.index + 1) + " / " + state.queue.length + " 题 · 不能看提示"
    : state.mode === "wrong" ? "只练错的" : state.mode === "skip" ? "把跳过的做完" : "12.1 三角形 · 练习";
  const openSkips = state.skippedIds.filter(function (id) { return !isFinal(state.setMarks[id]); });
  const skipNote = openSkips.length ? " · 跳过 " + openSkips.length : "";
  const backNote = openSkips.indexOf(item.id) >= 0 ? " · 回来做跳过的题" : "";
  const peekNote = state.setMarks[item.id] === "peek" ? " · 看了答案" : "";
  const dots = state.queue.map(function (id, index) {
    const mark = state.setMarks[id];
    const cls = index === state.index ? "now" : mark === "ok" ? "ok" : mark === "bad" || mark === "empty" ? "bad" : mark === "peek" ? "peek" : "";
    const tag = state.mode === "test" ? "button" : "i";
    return "<" + tag + ' class="dot ' + cls + '" data-jump="' + index + '"></' + tag + ">";
  }).join("");
  const chosen = state.mode === "test" ? state.testPicks[item.id] : state.picked;
  const symbols = ["∠", "△", "≌", "√", "π", "²"].map(function (symbol) {
    return '<button type="button" class="symbol" data-symbol="' + symbol + '">' + symbol + "</button>";
  }).join("");
  let answerBlock = "";
  if (item.kind === "blank") {
    const written = state.mode === "test" ? (state.testPicks[item.id] || "") : (state.blank || "");
    const note = state.formatNote ? '<p class="format">' + state.formatNote + "</p>" : "";
    answerBlock = '<label class="blank">答案<input id="blank" value="' + esc(written) + '"></label>' +
      '<div class="symbols">' + symbols + "</div>" + note;
  } else if (item.kind === "open") {
    const written = state.mode === "test" ? (state.testPicks[item.id] || "") : (state.openText || "");
    answerBlock = '<label class="blank">把过程写在这里<textarea id="open-answer" class="process">' + esc(written) +
      "</textarea></label>" + '<div class="symbols">' + symbols + "</div>";
  } else {
    answerBlock = '<div class="list">' + item.options.map(function (text, index) {
      const picked = chosen === index ? " picked" : "";
      return '<button class="choice' + picked + '" data-choice="' + index + '">' + text + "</button>";
    }).join("") + "</div>";
  }
  const processBox = item.kind === "open" ? "" : '<button type="button" class="link" id="toggle-process">写过程（可不写）</button>' +
    (state.processOpen ? '<textarea id="process" class="process">' + esc(state.processes[item.id] || "") + "</textarea>" : "");
  let feedback = "";
  if (item.kind === "open" && state.revealed && state.mode !== "test") {
    if (!isFinal(state.setMarks[item.id])) {
      feedback = '<div class="feedback"><p>和参考答案比，你做对了吗？</p><p>参考答案：' + esc(item.answer) + "</p>" +
        '<div class="ops"><button class="btn" data-self="ok">对了</button>' +
        '<button class="btn secondary" data-self="bad">不对</button>' +
        '<button class="btn secondary" data-self="judge">不确定</button></div></div>';
    } else {
      const named = { ok: "你判成对了", bad: "你判成不对", judge: "先记成判不了，结果页还可以再判" }[state.setMarks[item.id]] || "";
      feedback = '<div class="feedback">' + named + "</div>";
    }
  } else if (state.revealed && state.mode !== "test") {
    const right = item.kind === "blank" ? item.answer : item.options[item.answer];
    const correct = item.kind === "blank" ? String(state.blank || "").trim() === String(item.answer) : state.picked === item.answer;
    const seen = state.afterExplain || state.setMarks[item.id] === "peek";
    const extra = seen
      ? "<p>" + esc(item.explain || HINTS[4]) + "</p>"
      : ' <button type="button" class="link" id="after-peek">看完整解析</button>';
    feedback = correct
      ? '<div class="feedback ok">对了</div>'
      : '<div class="feedback bad">不对，正确答案是 ' + esc(right) + extra + "</div>";
  }
  let hints = "";
  if (state.mode !== "test" && !state.revealed) {
    hints = HINTS.map(function (text, level) {
      const open = level < state.hintOpen;
      const next = level === state.hintOpen;
      const folded = open && state.hintFold[level];
      const disabled = !open && !next ? " disabled" : "";
      const note = level === 4 ? ' <span class="muted">会记成看了答案</span>' : "";
      const foldNote = open ? (folded ? " · 展开" : " · 收起") : "";
      let extra = "";
      if (level === 1) extra = '<button type="button" class="link" id="open-passage">看这一段</button>';
      if (level === 2) extra = '<button type="button" class="link" id="open-method">看这个方法</button>';
      const body = open && !folded ? '<div class="hint-body"><p>' + text + "</p>" + extra + "</div>" : "";
      return '<div class="hint-row"><button type="button" class="hint' + (open ? " open" : "") + (level === 4 ? " peek" : "") + '" data-hint="' + level + '"' + disabled + ">" +
        (level + 1) + ". " + ["重述题意", "去课本", "方法方向", "给第一步", "完整解析"][level] + foldNote + note + "</button>" + body + "</div>";
    }).join("") + hintPanelHtml();
  }
  const canSkip = state.mode !== "test" && !state.revealed && !isFinal(state.setMarks[item.id]);
  const atLast = state.index + 1 >= state.queue.length;
  const primary = state.mode === "test" ? (atLast ? "交卷" : "下一题") : state.revealed ? (atLast ? "看这一组结果" : "下一题") : "交这一题";
  const hintBlock = state.mode === "test"
    ? '<div class="num-sheet">' + state.queue.map(function (id, index) {
      const pick = state.testPicks[id];
      const wrote = pick !== undefined && pick !== null && String(pick).trim() !== "";
      const skipped = !!state.testSkipped[id];
      const cls = index === state.index ? " now" : wrote ? " wrote" : skipped ? " skip" : "";
      return '<button type="button" class="num' + cls + '" data-jump="' + index + '">' + (index + 1) + "</button>";
    }).join("") + "</div>"
    : (hints || '<p class="muted">这一页不给提示。</p>');
  const progress = state.mode === "test"
    ? ""
    : '<div class="muted">第 ' + (state.index + 1) + " / " + state.queue.length + " 题" + skipNote + backNote + peekNote + '</div><div class="dots">' + dots + "</div>";
  return '<div class="practice-fit"><div class="head"><button class="link" id="leave">‹ 返回</button><div><strong>' + title +
    "</strong>" + progress + "</div>" + (state.mode === "test" ? "" : '<button class="btn secondary" id="finish">交卷</button>') + "</div>" +
    '<div class="work"><section class="card"><p class="stem">' + item.stem + "</p>" + answerBlock +
    processBox + feedback + '</section><aside class="card hint-side"><h2>' + (state.mode === "test" ? "题号" : "提示") + "</h2>" + hintBlock + "</aside></div>" +
    '<div class="dock"><button class="btn" id="submit">' + primary + "</button>" +
    (canSkip ? '<button class="btn secondary" id="skip">先跳过</button>' : "") +
    (state.mode === "test" ? '<button class="btn secondary" id="skip">先跳过</button>' : "") + "</div></div>";
}

function shownMark(id) {
  return state.setMarks[id] || state.answers[id] || "";
}

/** Where a follow-up practice set should return. A set started from today stays with today. */
function practiceOrigin() {
  if (state.source === "test") {
    if (state.testScope === "section") return "section";
    if (state.testScope === "chapter") return "chapter";
    return "review";
  }
  return state.source || "today";
}

/** Questions left after removing the ones this set got right. */
function againPool() {
  const correct = {};
  state.queue.forEach(function (id) { if (shownMark(id) === "ok") correct[id] = true; });
  return QUESTIONS.filter(function (item) { return !correct[item.id]; }).map(function (item) { return item.id; });
}

/** Result of the current set. The row itself is not a button. */
function viewResult() {
  if (!state.queue.length) {
    return '<h1>这一组结果</h1><section class="card"><p>这一组的结果找不到了。</p>' +
      '<button class="btn" id="to-today">回到今天</button></section>';
  }
  if (hashParam("load") === "1") {
    return '<h1>这一组结果</h1><section class="card"><p>正在打开……</p></section>';
  }
  const ids = state.queue;
  let ok = 0;
  let bad = 0;
  let peek = 0;
  let skip = 0;
  let judge = 0;
  let empty = 0;
  ids.forEach(function (id) {
    const mark = shownMark(id);
    if (mark === "ok") ok += 1;
    else if (mark === "empty") empty += 1;
    else if (mark === "bad") bad += 1;
    else if (mark === "peek") peek += 1;
    else if (mark === "skip") skip += 1;
    else if (mark === "judge") judge += 1;
  });
  const wrong = ids.filter(function (id) {
    const mark = shownMark(id);
    return mark === "bad" || mark === "empty" || mark === "peek";
  });
  const skipped = ids.filter(function (id) { return shownMark(id) === "skip"; });
  const groups = [
    { title: "做错了", marks: { bad: true, empty: true } },
    { title: "看了答案", marks: { peek: true } },
    { title: "跳过了", marks: { skip: true } },
    { title: "等你自己判", marks: { judge: true } },
    { title: "做对了", marks: { ok: true }, fold: true }
  ];
  const body = groups.map(function (group) {
    const rows = ids.filter(function (id) { return group.marks[shownMark(id)]; });
    if (!rows.length) return "";
    if (group.fold && !state.showOk) {
      return '<button class="link" id="show-ok">做对了 ' + rows.length + " 题 · 展开</button>";
    }
    const lines = rows.map(function (id) {
      return resultRow(id, ids.indexOf(id) + 1);
    }).join("");
    const head = group.fold ? '<button class="link" id="hide-ok">做对了 · 收起</button>' : '<h2 class="group-title">' + group.title + "</h2>";
    return head + lines;
  }).join("");
  let actions = "";
  const again = againPool();
  const againLabel = again.length === QUESTIONS.length ? "再来一组" : "再来一组（" + again.length + " 道）";
  const againBtn = '<button class="btn secondary" id="again">' + againLabel + "</button>";
  const wrongBtn = wrong.length ? '<button class="btn secondary" id="redo">只练错的（' + wrong.length + " 道）</button>" : "";
  if (state.source === "test" && state.testScope === "section") {
    actions = '<button class="btn" id="to-section">回到这一节</button>' + wrongBtn + '<button class="btn secondary" id="to-review">去回顾</button>';
  } else if (state.source === "test" && state.testScope === "chapter") {
    actions = '<button class="btn" id="to-chapter">回到这一章</button>' + wrongBtn + '<button class="btn secondary" id="to-review">去回顾</button>';
  } else if (state.source === "test") {
    actions = '<button class="btn" id="to-review">回到回顾</button>' + wrongBtn;
  } else if (wrong.length) {
    actions = '<button class="btn" id="redo">只练错的（' + wrong.length + " 道）</button>" + againBtn + '<button class="btn secondary" id="to-today">回到今天</button>';
  } else if (skipped.length) {
    actions = '<button class="btn" id="redo-skip">把跳过的做完（' + skipped.length + " 道）</button>" + againBtn +
      '<button class="btn secondary" id="to-today">回到今天</button>';
  } else {
    actions = '<button class="btn" id="again">' + againLabel + '</button><button class="btn secondary" id="to-today">回到今天</button>';
  }
  const missed = wrong.length + skipped.length;
  const note = missed ? '<p class="muted">没做对的 ' + missed + " 道已放进回顾，之后还能再做。</p>" : "";
  const cleared = clearedFromReview();
  const clearedNote = cleared ? '<p class="muted">这 ' + cleared + " 道已从回顾里移出。</p>" : "";
  const extra = (skip ? "，跳过 " + skip : "") + (judge ? "，等你判 " + judge : "");
  const testLine = state.source === "test" && state.testBack ? "<p>" + state.testBack + "</p>" : "";
  const title = state.source === "test" ? "这一组的结果 · 测试" : state.mode === "wrong" ? "这一组的结果 · 只练错的" : "这一组的结果 · 12.1 三角形";
  const allSkip = ids.length && skip === ids.length;
  const summary = allSkip
    ? '<p class="sum">这一组都跳过了。</p>'
    : '<p class="sum">这一组 ' + ids.length + ' 题：<b class="ok">' + ok + ' 对</b>，<b class="bad">' + bad + " 错</b>" +
      (empty ? '，<b class="bad">' + empty + " 空着交</b>" : "") +
      '，<b class="peek">' + peek + " 看了答案</b>" + extra + "。</p>";
  return '<div class="practice-fit"><div class="result-scroll"><h1>' + title + "</h1><section class=\"card\">" + summary +
    countBar(ok, bad, empty, peek, skip, judge) + testLine +
    '</section><div class="groups">' + body + '</div></div><div class="dock result-dock"><div>' + note + clearedNote +
    '</div><div class="row">' + actions + "</div></div></div>";
}

/** Colored share of this set. The words above the bar stay, so color is not the only cue. */
function countBar(ok, bad, empty, peek, skip, judge) {
  const parts = [["ok", ok], ["bad", bad], ["empty", empty], ["peek", peek], ["skip", skip], ["judge", judge]].filter(function (pair) {
    return pair[1] > 0;
  });
  if (!parts.length) return "";
  return '<div class="count-bar">' + parts.map(function (pair) {
    return '<i class="' + pair[0] + '" style="flex:' + pair[1] + '"></i>';
  }).join("") + "</div>";
}
function clearedFromReview() {
  return state.queue.filter(function (id) {
    const was = state.baseline[id];
    return (was === "bad" || was === "empty" || was === "peek" || was === "skip") && shownMark(id) === "ok";
  }).length;
}
function resultRow(id, number) {
  const item = questionById(id);
  const mark = shownMark(id);
  const label = { ok: "做对了", bad: "做错了", empty: "空着交", peek: "看了答案", skip: "跳过了", judge: "等你自己判" }[mark] || "还没做";
  const level = state.hintUsed[id];
  const hint = level ? '<p class="muted">用了提示：到第 ' + level + " 级</p>" : "";
  let ops = "";
  if (mark === "skip") ops = '<button type="button" class="link" data-redo-one="' + id + '">现在做</button>';
  else if (mark === "judge") {
    ops = '<button class="btn secondary" data-rejudge="ok" data-id="' + id + '">对了</button>' +
      '<button class="btn secondary" data-rejudge="bad" data-id="' + id + '">不对</button>';
  } else if (mark === "ok" || mark === "bad" || mark === "empty" || mark === "peek") {
    ops = '<button type="button" class="link" data-explain="' + id + '">看解析</button>';
    if (mark !== "ok") {
      ops += '<button class="link" data-result-kp="' + id + '">回到知识点</button>' +
        '<button class="link" data-redo-one="' + id + '">重做这道</button>';
    }
  }
  let detail = "";
  if (state.explainId === id) {
    const mine = state.given[id] || (mark === "empty" ? "空着" : "没有留下作答");
    const right = item.kind === "blank" || item.kind === "open" ? item.answer : item.options[item.answer];
    detail = '<div class="explain"><p>你的答案：' + mine + "</p><p>正确答案：" + right + "</p><p>" + HINTS[4] + "</p></div>";
  }
  const chars = Array.from(item.stem);
  const preview = chars.length > 30 ? chars.slice(0, 30).join("") + "…" : item.stem;
  return '<article class="result-row"><span class="qno ' + mark + '">' + number + "</span><div>" +
    "<p>" + esc(preview) + " · " + esc(item.kp) + " · " + label + "</p>" +
    hint + '<div class="ops">' + ops + "</div>" + detail + "</div></article>";
}

/** Review keeps both columns even when one of them is empty. */
function viewReview() {
  state.nav = "review";
  if (hashParam("load") === "1") {
    return '<h1>回顾</h1><div class="two"><section class="card"><h2>要重做的题</h2><p>正在打开……</p></section>' +
      '<section class="card"><h2>不稳的地方</h2><p>正在打开……</p></section></div>';
  }
  const redo = retryIds();
  const batch = redo.slice(0, 10);
  const points = weakPoints();
  const picked = points.filter(function (point) { return state.checked[point.name]; });
  const banner = state.testBack ? '<p class="banner">' + state.testBack + "</p>" : "";
  const reviewResume = resumeLabel("review");
  const testResume = stillOpen(state.drafts["test:review"]) ? resumeLabel("test:review") : "";
  const testing = picked.length > 0 || testResume;
  const practiceClass = testing ? "btn secondary" : "btn";
  const noAnswers = Object.keys(state.answers).length === 0;
  const left = redo.length
    ? redo.map(function (id) {
      const item = questionById(id);
      const chars = Array.from(item.stem);
      const preview = chars.length > 30 ? chars.slice(0, 30).join("") + "…" : item.stem;
      const when = state.owedOn[id] || "日期没记下";
      return '<article class="review-row"><p>' + esc(preview) + " · 12.1 · " + retryLabel(state.answers[id]) + " · " + when + "</p>" +
        '<div class="ops"><button type="button" class="link" data-redo-one="' + id + '">重做</button>' +
        '<button type="button" class="link" data-review-kp="' + id + '">回到知识点</button></div></article>';
    }).join("") +
      (redo.length > 10 ? '<p class="muted">一次最多重做 10 道，其余留在这里。</p>' : "") +
      (reviewResume ? '<button class="btn" id="resume-review">' + reviewResume + '</button><button class="btn danger" id="abandon-review">放弃这一组</button>' : "") +
      '<button class="' + (reviewResume ? "btn secondary" : practiceClass) + '" id="redo-all">全部重做（' + batch.length + " 道）</button>"
    : '<p>还没有要重做的题。做完一组题后，做错的会放到这里。</p><button class="' +
      (noAnswers ? "btn" : practiceClass) + '" id="to-today">去今天的练习</button>';
  const testCount = reviewTestIds().length;
  const limitNote = state.weakLimit ? '<p class="muted">一次最多测 5 个</p>' : "";
  const shortNote = testing && !testResume && testCount < 4
    ? '<p class="muted">这一版这些点一共只有 ' + testCount + " 道没做对的，先测这些。</p>" : "";
  const testBtn = testing
    ? '<button class="btn" id="test">' + (testResume || "测一次（" + testCount + " 题）") + "</button>" +
      (testResume ? '<button class="btn danger" id="abandon-test">放弃这次测试</button>' : "") + shortNote
    : '<button class="btn secondary" id="test" disabled>测一次</button><p class="muted">先勾选要测的地方</p>';
  const right = noAnswers
    ? '<p>还看不出哪里不稳。多做几组题，这里会列出容易错的知识点。</p>' +
      '<button class="link" id="to-book">按课本目录挑一节</button>'
    : points.length
      ? points.map(function (point) {
        const checked = state.checked[point.name] ? " checked" : "";
        const disabled = !state.checked[point.name] && picked.length >= 5 ? " disabled" : "";
        return '<article class="review-row"><button type="button" class="link" data-weak-name="' + esc(point.name) + '">' +
          esc(point.name) + "</button><p class=\"muted\">" + point.why + "</p>" +
          '<label class="check"><input type="checkbox" data-weak="' + esc(point.name) + '"' + checked + disabled + "> 选它来测</label></article>";
      }).join("") + limitNote + testBtn
      : '<p>还看不出哪里不稳。做对的知识点不会留在这里。</p>' +
        '<button class="link" id="to-book">按课本目录挑一节</button>';
  const leftBody = hashParam("down") === "left" ? "<p>这一栏暂时打不开。</p>" : left;
  const rightBody = hashParam("down") === "right" ? "<p>这一栏暂时打不开。</p>" : banner + right;
  return '<h1>回顾</h1><div class="two"><section class="card"><h2>要重做的题</h2>' + leftBody +
    '</section><section class="card"><h2>不稳的地方</h2>' + rightBody + "</section></div>";
}

/** Local record, without repository commands. */
function viewRecord() {
  state.nav = "record";
  if (hashParam("load") === "1") {
    return '<div class="record-page"><h1>我的记录</h1><section class="card"><p>正在打开……</p></section></div>';
  }
  const marks = Object.keys(state.answers).filter(function (id) { return isFinal(state.answers[id]); });
  const graded = marks.filter(function (id) { return state.answers[id] !== "skip"; });
  const total = graded.length;
  const correct = graded.filter(function (id) { return state.answers[id] === "ok"; }).length;
  const rate = total ? Math.round(correct * 100 / total) : 0;
  const owed = retryIds().length;
  if (!marks.length) {
    return '<div class="record-page"><h1>我的记录</h1><section class="card"><p>还没有做题记录。记录只保存在这台平板的浏览器里，换设备或清理浏览器就看不到了。</p>' +
      '<button class="btn" id="to-today">去今天的练习</button>' +
      '<p class="muted"><button class="link" id="import-empty">导入以前的记录</button></p>' +
      '<input id="import-record" type="file" hidden></section></div>';
  }
  const change = state.lastChange
    ? "第 12 章上一回做对 " + state.lastChange.before + " 道，现在 " + state.lastChange.after + " 道。"
    : "还没有上一次的数可以比。";
  const lines = ((catalog() && catalog().chapters) || []).map(function (chapter) {
    if (chapter.vol === "801" && String(chapter.ch) === "12") {
      return '<p><button type="button" class="link" id="open-record-ch">' + esc(chapter.title) + "</button> · 要重做 " + owed + " 道</p>";
    }
    return '<p class="muted">' + esc(chapter.title) + " · 还没练过</p>";
  }).join("");
  const note = state.exportNote ? "<p>" + state.exportNote + "</p>" : "";
  return '<div class="record-page"><h1>我的记录</h1><div class="stats">' +
    '<section class="card"><p class="muted">交过</p><p class="stat">' + total + ' 道</p><p class="muted">跳过的不算</p></section>' +
    '<section class="card"><p class="muted">正确率</p><p class="stat">' + rate + '%</p><p class="muted">做对 ' + correct + " 道</p></section>" +
    '<section class="card"><p class="muted">最近的变化</p><p>' + change + "</p></section></div>" +
    '<section class="card"><h2>各章</h2>' + lines + "</section>" +
    '<section class="card"><h2>导入导出</h2>' + note +
    '<div class="row"><button class="btn secondary" id="export-record">导出</button>' +
    '<label class="btn secondary">导入<input id="import-record" type="file" hidden></label></div></section>' +
    '<p class="muted about"><button type="button" class="link" id="about-data">关于这些数据</button></p></div>';
}

/** Where the numbers on this tablet come from. Not in the child navigation. */
function viewEvidence() {
  state.nav = "record";
  return '<div class="record-page"><h1>关于这些数据</h1><section class="card">' +
    "<p>这些数来自这台平板上做过的示意题。换设备或清理浏览器就看不到了。</p>" +
    "<p>知识之间的关系还是草稿，不能当成已经核对过的教材依据。</p>" +
    '<button type="button" class="link" id="to-record">回到我的记录</button></section></div>';
}

/** Open a dialog. The safe action is the right-hand primary button. */
function openDialog(title, body, secondaryLabel, onSecondary, primaryLabel, onPrimary) {
  const scrim = document.getElementById("scrim");
  scrim.classList.add("is-open");
  scrim.innerHTML = '<div class="modal" role="dialog"><h2>' + title + "</h2><p>" + body + "</p>" +
    '<div class="row"><button class="btn secondary" id="dlg-secondary">' + secondaryLabel +
    '</button><button class="btn" id="dlg-primary">' + primaryLabel + "</button></div></div>";
  function close() { scrim.classList.remove("is-open"); scrim.innerHTML = ""; }
  document.getElementById("dlg-secondary").onclick = function () { close(); onSecondary(); };
  document.getElementById("dlg-primary").onclick = function () { close(); onPrimary(); };
  scrim.onclick = function (event) {
    if (event.target === scrim) { close(); onPrimary(); }
  };
}

/** Mark every unfinished question in the open set as skipped. */
function markUnansweredSkipped() {
  unanswered(state.queue).forEach(function (id) { record(id, "skip"); });
}

/** Grade a finished test by knowledge point, not by raw question count. */
function gradeTest() {
  const points = {};
  state.queue.forEach(function (id) {
    const item = questionById(id);
    const pick = state.testPicks[id];
    const text = typeof pick === "string" ? pick.trim() : pick;
    if (item.kind === "open") {
      if (text === undefined || text === null || text === "") record(id, "skip");
      else record(id, "judge");
    } else if (text === undefined || text === null || text === "") record(id, "skip");
    else if (item.kind === "blank") record(id, String(text) === String(item.answer) ? "ok" : "bad");
    else record(id, text === item.answer ? "ok" : "bad");
    points[item.kp] = true;
  });
  let stable = 0;
  let weak = 0;
  Object.keys(points).forEach(function (name) {
    const ids = state.queue.filter(function (id) { return questionById(id).kp === name; });
    const allOk = ids.every(function (id) { return state.answers[id] === "ok"; });
    if (allOk) stable += 1;
    else weak += 1;
  });
  state.testBack = "刚测完：稳了 " + stable + " 个，还不稳 " + weak + " 个";
  state.testPicks = {};
  state.testSkipped = {};
}

/** Close the set and open the result page. */
/** Store the chapter-12 correct count from when this set opened. */
function noteChange() {
  if (typeof state.chapterBefore !== "number") return;
  state.lastChange = { before: state.chapterBefore, after: chapterOk() };
  state.chapterBefore = null;
}

function finishSet() {
  const scope = state.source === "test" ? (state.liveScope || state.testScope) : state.testScope;
  const key = bucket(state.source, scope);
  if (state.mode === "test") gradeTest();
  else markUnansweredSkipped();
  noteChange();
  clearDraft(key);
  go("result");
}

/** Ask before an early hand-in turns blank items into skips. */
function requestFinish() {
  const left = unanswered(state.queue).length;
  if (!left) {
    finishSet();
    return;
  }
  const noun = state.mode === "test" ? "没写" : "没交";
  openDialog(
    "还有题" + noun,
    "还有 " + left + " 题" + noun + "，交卷后会记成跳过。",
    "交卷",
    finishSet,
    "接着做",
    function () {}
  );
}

/** Download the prototype record. This file is not the product store. */
function downloadRecord() {
  const blob = new Blob([JSON.stringify({ answers: state.answers, lastChange: state.lastChange })], { type: "application/json" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "mc-proto-record.json";
  link.click();
  state.exportNote = "已导出，文件在下载里。";
  render();
}

/** Read a prototype export and ask before merging it. The delta is counted on this page. */
function readImport(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function () {
    let data = null;
    try { data = JSON.parse(String(reader.result)); } catch (error) { data = null; }
    if (!data || !data.answers) {
      state.exportNote = "这个文件打不开，换一个试试。";
      render();
      return;
    }
    const keys = Object.keys(data.answers).filter(function (id) {
      return questionById(id) && isFinal(data.answers[id]);
    });
    openDialog("导入这些记录？", "导入后会和这台平板上的记录合并，共 " + keys.length + " 条。", "导入", function () {
      const before = chapterOk();
      keys.forEach(function (id) { state.answers[id] = data.answers[id]; });
      state.lastChange = { before: before, after: chapterOk() };
      state.exportNote = "已导入，和这台平板上的记录合并。";
      persistDrafts();
      render();
    }, "先不导入", function () {});
  };
  reader.readAsText(file);
}

/** Confirm before dropping one source's draft. */
function bindAbandon(id, source) {
  const button = document.getElementById(id);
  if (!button) return;
  button.onclick = function () {
  const draft = state.drafts[source] || {};
  const queue = draft.queue || [];
  const answered = queue.filter(function (id) { return isFinal((draft.setMarks || {})[id]); }).length;
  const left = queue.length - answered;
  const test = source.indexOf("test") === 0;
  openDialog(
    test ? "放弃这次测试？" : "放弃这一组？",
    test ? "这次测试整组不记。" : "没做的 " + left + " 题不会记下，已交的 " + answered + " 题保留。",
    test ? "放弃这次测试" : "放弃",
    function () { abandonDraft(source); render(); },
    "接着做",
    function () {}
  );
  };
}

/** Wire the buttons for the current route. */
/** Wire search results without redrawing the page, so the box keeps focus. */
function bindHits(box) {
  box.querySelectorAll("[data-go]").forEach(function (button) {
    button.onclick = function () {
      const kp = button.getAttribute("data-kp");
      const vol = button.getAttribute("data-book-vol");
      const ch = button.getAttribute("data-book-ch");
      const sec = button.getAttribute("data-book-sec");
      state.query = "";
      if (vol) state.bookVol = vol;
      if (vol && ch) {
        state.volId = vol;
        state.chNo = ch;
      }
      if (sec) state.secId = sec;
      if (kp) {
        state.kpName = kp;
        state.kpFrom = state.route === "map" ? "map" : state.route === "review" ? "review" : state.route === "today" ? "today" : "section";
        state.kpMark = "";
        state.kpQid = "";
        state.kpSource = "";
      state.kpTrail = [];
        state.kpExplain = false;
      }
      go(button.getAttribute("data-go"));
    };
  });
}

function bind() {
  document.querySelectorAll(".nav a").forEach(function (link) {
    link.onclick = function (event) {
      if (!link.getAttribute("data-dest")) return;
      event.preventDefault();
      requestLeave(link.getAttribute("data-dest"));
    };
  });
  const start = document.getElementById("start");
  if (start) {
    start.onclick = function () {
      const source = state.route === "today" ? "today" : "section";
      if (stillOpen(state.drafts[source])) resumeDraft(source);
      else startQueue(QUESTIONS.map(function (item) { return item.id; }), "practice", source);
    };
  }
  bindAbandon("abandon", state.route === "today" ? "today" : "section");
  bindAbandon("abandon-review", "review");
  bindAbandon("abandon-test", state.route === "chapter" ? "test:chapter" : state.route === "section" ? "test:section" : "test:review");
  const see = document.getElementById("see-section");
  if (see) see.onclick = function () { go("section"); };
  const toReview = document.getElementById("to-review");
  if (toReview) toReview.onclick = function () { go("review"); };
  const toToday = document.getElementById("to-today");
  if (toToday) toToday.onclick = function () { state.kpFrom = "today"; go("today"); };
  const toRecord = document.getElementById("to-record");
  if (toRecord) toRecord.onclick = function () { go("record"); };
  const toKp = document.getElementById("to-kp");
  if (toKp) toKp.onclick = function () { state.kpFrom = "review"; go("kp"); };
  const toBook = document.getElementById("to-book");
  if (toBook) toBook.onclick = function () { go("book"); };
  const focusSearch = document.getElementById("focus-search");
  if (focusSearch) focusSearch.onclick = function () {
    const box = document.getElementById("q");
    if (box) box.focus();
  };
  const toSection = document.getElementById("to-section");
  if (toSection) toSection.onclick = function () { go("section"); };
  const toChapter = document.getElementById("to-chapter");
  if (toChapter) toChapter.onclick = function () { go("chapter"); };
  const openRecord = document.getElementById("open-record-ch");
  if (openRecord) openRecord.onclick = function () { state.chapterFrom = "record"; go("chapter"); };
  const exportRecord = document.getElementById("export-record");
  if (exportRecord) exportRecord.onclick = function () { downloadRecord(); };
  const importRecord = document.getElementById("import-record");
  if (importRecord) importRecord.onchange = function () { readImport(importRecord.files[0]); };
  const importEmpty = document.getElementById("import-empty");
  if (importEmpty) importEmpty.onclick = function () {
    const input = document.getElementById("import-record");
    if (input) input.click();
  };
  const aboutData = document.getElementById("about-data");
  if (aboutData) aboutData.onclick = function () { go("evidence"); };
  const resumeKp = document.getElementById("resume-kp");
  if (resumeKp) resumeKp.onclick = function () { resumeDraft("kp"); };
  const resumeReview = document.getElementById("resume-review");
  if (resumeReview) resumeReview.onclick = function () { resumeDraft("review"); };
  document.querySelectorAll("[data-book-vol]").forEach(function (button) {
    if (button.hasAttribute("data-book-ch") || button.hasAttribute("data-book-sec")) return;
    button.onclick = function () {
      const vol = button.getAttribute("data-book-vol");
      state.bookVol = state.bookVol === vol ? "" : vol;
      render();
    };
  });
  document.querySelectorAll("[data-book-ch]").forEach(function (button) {
    if (button.hasAttribute("data-book-sec")) return;
    button.onclick = function () {
      enterChapter(button.getAttribute("data-book-vol"), button.getAttribute("data-book-ch"), "book");
    };
  });
  document.querySelectorAll("[data-book-sec]").forEach(function (button) {
    button.onclick = function () {
      openSection(button.getAttribute("data-book-vol"), button.getAttribute("data-book-ch"), button.getAttribute("data-book-sec"));
    };
  });
  const openSec = document.querySelectorAll("[data-open-sec]");
  openSec.forEach(function (button) { button.onclick = function () { go("section"); }; });
  const seeMap = document.getElementById("see-map");
  if (seeMap) seeMap.onclick = function () {
    const chapter = currentChapter();
    state.mapMode = "panorama";
    state.mapBook = chapter ? chapter.vol : state.volId || "801";
    state.mapChapter = chapter ? chapter.vol + "-" + chapter.ch : activeChapterKey();
    state.mapNetNo = chapter ? Number(chapter.ch) : state.mapNetNo;
    state.mapLevel = "chapter";
    state.mapSection = "";
    state.mapPoint = null;
    state.mapMethod = "";
    state.mapIdea = "";
    state.mapSkill = "";
    state.mapCard = true;
    state.mapSideOpen = true;
    go("map");
  };
  const seeSection = document.getElementById("see-section-map");
  if (seeSection) seeSection.onclick = function () {
    const sec = currentSection();
    state.mapMode = "panorama";
    state.mapSection = sec ? sec.sec : state.secId;
    state.mapNetNo = sec ? Number(sec.ch) : state.mapNetNo;
    state.mapBook = sec ? sec.vol : state.volId;
    state.mapChapter = sec ? sec.vol + "-" + sec.ch : state.mapChapter;
    state.mapLevel = "chapter";
    state.mapPoint = null;
    state.mapSkill = "";
    state.mapCard = true;
    state.mapSideOpen = true;
    go("map");
  };
  const backBook = document.getElementById("back-book");
  if (backBook) backBook.onclick = function () { go("book"); };
  const backCh = document.getElementById("back-ch");
  if (backCh) backCh.onclick = function () { go("chapter"); };
  const backSec = document.getElementById("back-sec");
  if (backSec) backSec.onclick = function () { go("section"); };
  const backToday = document.getElementById("back-today");
  if (backToday) backToday.onclick = function () { go("today"); };
  document.querySelectorAll("[data-kp-name]").forEach(function (button) {
    button.onclick = function () {
      state.kpName = button.getAttribute("data-kp-name");
      state.kpFrom = state.route === "today" ? "today" : "section";
      state.kpQid = "";
      state.kpSource = "";
      state.kpTrail = [];
      state.kpExplain = false;
      go("kp");
    };
  });
  document.querySelectorAll("[data-kp-q]").forEach(function (button) {
    button.onclick = function () { startQueue([button.getAttribute("data-kp-q")], "single", "kp"); };
  });
  const openKp = document.getElementById("open-kp");
  if (openKp) openKp.onclick = function () {
    state.kpName = "三角形的定义";
    state.kpFrom = "section";
    state.kpQid = "";
    state.kpSource = "";
      state.kpTrail = [];
    state.kpExplain = false;
    go("kp");
  };
  const backFrom = document.getElementById("back-from");
  if (backFrom) backFrom.onclick = function () { go(state.kpFrom === "review" ? "review" : "result"); };
  const redoKp = document.getElementById("redo-kp");
  if (redoKp) redoKp.onclick = function () { startQueue(idsForKp(state.kpName), "wrong", "kp"); };
  document.querySelectorAll("[data-source]").forEach(function (button) {
    button.onclick = function () {
      const key = button.getAttribute("data-source");
      state.kpSource = state.kpSource === key ? "" : key;
      render();
    };
  });
  const kpExplain = document.getElementById("kp-explain");
  if (kpExplain) kpExplain.onclick = function () { state.kpExplain = !state.kpExplain; render(); };
  document.querySelectorAll("#kp-map").forEach(function (kpMap) {
    kpMap.onclick = function () {
    const net = ensureNet();
    const node = net && net.byId[state.kpName];
    if (node && node.kind === "knowledge_point") {
      state.mapMode = "panorama";
      state.mapPoint = node.id;
      state.mapSection = node.sec || state.mapSection;
      state.mapNetNo = Number(node.ch) || state.mapNetNo;
      state.mapLevel = "chapter";
      state.mapCard = true;
      state.mapSideOpen = true;
      go("map");
      return;
    }
    state.mapMode = "layer";
    state.mapPoint = state.kpName;
    state.mapChapter = true;
    state.mapBook = "八年级上册";
    state.mapCard = true;
    go("map");
    };
  });
  document.querySelectorAll("[data-kp-jump]").forEach(function (button) {
    button.onclick = function () {
      const next = button.getAttribute("data-kp-jump");
      const at = state.kpTrail.indexOf(next);
      if (at >= 0) state.kpTrail = state.kpTrail.slice(0, at);
      else state.kpTrail.push(state.kpName);
      state.kpName = next;
      state.kpQid = "";
      state.kpSource = "";
      state.kpExplain = false;
      render();
    };
  });
  document.querySelectorAll("[data-mode]").forEach(function (button) {
    button.onclick = function () {
      state.mapMode = button.getAttribute("data-mode");
      render();
    };
  });
  document.querySelectorAll("[data-open-chapter]").forEach(function (button) {
    button.onclick = function () {
      resetMapView();
      const no = Number(button.getAttribute("data-open-chapter"));
      state.mapNetNo = no >= 1 && no <= 26 ? no : 12;
      state.mapLevel = "chapter";
      state.mapSection = "";
      state.mapPoint = null;
      state.mapSkill = "";
      state.mapMethod = "";
      state.mapIdea = "";
      state.mapCard = true;
      if (state.mapNetNo === 12) {
        state.mapChapter = true;
        state.mapBook = "八年级上册";
      }
      render();
    };
  });
  document.querySelectorAll("[data-open-section]").forEach(function (button) {
    button.onclick = function () {
      resetMapView();
      const id = button.getAttribute("data-open-section");
      state.mapSection = id;
      state.mapPoint = null;
      state.mapSkill = "";
      state.mapMethod = "";
      state.mapIdea = "";
      state.mapLevel = "chapter";
      state.mapNetNo = Number(String(id).split(".")[0]) || state.mapNetNo;
      state.mapCard = true;
      render();
    };
  });
  document.querySelectorAll("[data-open-method]").forEach(function (button) {
    button.onclick = function () {
      const id = button.getAttribute("data-open-method");
      if (state.mapSkill === id) {
        state.mapSkill = "";
        state.mapCard = false;
      } else {
        state.mapSkill = id;
        state.mapCard = true;
      }
      render();
    };
  });
  document.querySelectorAll("[data-back-net]").forEach(function (button) {
    button.onclick = function () {
      resetMapView();
      state.mapLevel = "course";
      state.mapSection = "";
      state.mapPoint = null;
      state.mapSkill = "";
      state.mapMethod = "";
      state.mapIdea = "";
      state.mapCard = true;
      render();
    };
  });
  document.querySelectorAll("[data-net-chapter]").forEach(function (button) {
    button.onclick = function () {
      const no = Number(button.getAttribute("data-net-chapter"));
      state.mapNetNo = no >= 1 && no <= 26 ? no : 12;
      state.mapPoint = null;
      state.mapSkill = "";
      state.mapMethod = "";
      state.mapIdea = "";
      state.mapCard = true;
      if (state.mapNetNo === 12) {
        state.mapChapter = true;
        state.mapBook = "八年级上册";
      }
      render();
    };
  });
  const backNet = document.getElementById("back-net");
  if (backNet) backNet.onclick = function () {
    resetMapView();
    state.mapLevel = "course";
    state.mapSection = "";
    state.mapPoint = null;
    state.mapSkill = "";
    state.mapMethod = "";
    state.mapIdea = "";
    state.mapCard = true;
    render();
  };
  const backChapter = document.getElementById("back-chapter");
  if (backChapter) backChapter.onclick = function () {
    resetMapView();
    state.mapLevel = "chapter";
    state.mapSection = "";
    state.mapPoint = null;
    state.mapSkill = "";
    state.mapMethod = "";
    state.mapIdea = "";
    state.mapCard = true;
    render();
  };
  const backSection = document.getElementById("back-section");
  if (backSection) backSection.onclick = function () {
    resetMapView();
    state.mapPoint = null;
    state.mapSkill = "";
    state.mapMethod = "";
    state.mapIdea = "";
    state.mapSection = state.mapSection || "12.1";
    state.mapLevel = "chapter";
    state.mapCard = true;
    render();
  };
  document.querySelectorAll("[data-point]").forEach(function (button) {
    button.onclick = function () {
      resetMapView();
      const name = button.getAttribute("data-point");
      const net = ensureNet();
      const node = net && net.byId[name];
      if (state.mapPoint === name && !state.mapCard) {
        state.mapCard = true;
      } else if (state.mapPoint === name) {
        state.mapPoint = null;
        state.mapSkill = "";
        state.mapMethod = "";
        state.mapIdea = "";
        state.mapCard = false;
      } else if (node && node.kind === "knowledge_point") {
        state.mapPoint = name;
        state.mapSkill = "";
        state.mapMethod = "";
        state.mapIdea = "";
        state.mapSection = node.sec || state.mapSection;
        state.mapNetNo = node.ch || state.mapNetNo;
        state.mapLevel = "chapter";
        state.mapCard = true;
      } else {
        state.mapPoint = name;
        state.mapMethod = "";
        state.mapIdea = "";
        state.mapSection = state.mapSection || "12.1";
        state.mapNetNo = 12;
        state.mapLevel = "chapter";
        state.mapChapter = true;
        state.mapBook = "八年级上册";
        state.mapCard = true;
      }
      render();
    };
  });
  const chapterButtons = document.querySelectorAll("[data-chapter]");
  chapterButtons.forEach(function (button) {
    button.onclick = function () {
      if (state.mapPoint || state.mapMethod || state.mapIdea) {
        state.mapPoint = null;
        state.mapMethod = "";
        state.mapIdea = "";
        state.mapChapter = true;
        state.mapBook = "八年级上册";
        state.mapCard = true;
      } else if (state.mapChapter && !state.mapCard) {
        state.mapCard = true;
      } else if (state.mapChapter) {
        state.mapChapter = false;
        state.mapCard = false;
      } else {
        state.mapChapter = true;
        state.mapBook = "八年级上册";
        state.mapCard = true;
      }
      render();
    };
  });
  document.querySelectorAll("[data-literacy]").forEach(function (button) {
    button.onclick = function () {
      const name = button.getAttribute("data-literacy");
      state.mapLiteracy = state.mapLiteracy === name ? "" : name;
      state.mapPoint = null;
      state.mapMethod = "";
      state.mapIdea = "";
      render();
    };
  });
  document.querySelectorAll("[data-layer-ch]").forEach(function (button) {
    button.onclick = function () {
      const key = button.getAttribute("data-layer-ch");
      if (activeChapterKey() === key) {
        state.mapChapter = "";
        state.mapSection = "";
        state.mapPoint = null;
        state.mapCard = false;
      } else {
        state.mapChapter = key;
        state.mapSection = "";
        state.mapPoint = null;
        state.mapMethod = "";
        state.mapIdea = "";
        state.mapCard = true;
        const parts = key.split("-");
        state.mapBook = parts[0];
        state.mapNetNo = Number(parts[1]) || state.mapNetNo;
      }
      render();
    };
  });
  document.querySelectorAll("[data-layer-sec]").forEach(function (button) {
    button.onclick = function () {
      const sec = button.getAttribute("data-layer-sec");
      if (state.mapSection === sec) {
        state.mapSection = "";
        state.mapPoint = null;
        state.mapCard = !!activeChapterKey();
      } else {
        state.mapSection = sec;
        state.mapPoint = null;
        state.mapMethod = "";
        state.mapIdea = "";
        state.mapCard = true;
      }
      render();
    };
  });
  const openLayerSec = document.getElementById("open-layer-sec");
  if (openLayerSec) openLayerSec.onclick = function () {
    const key = activeChapterKey();
    const parts = key.split("-");
    openSection(parts[0] || state.volId, parts[1] || state.chNo, state.mapSection);
  };
  document.querySelectorAll("[data-book]").forEach(function (button) {
    button.onclick = function () {
      const name = button.getAttribute("data-book");
      if (state.mapBook === name || activeVol() === name) {
        state.mapBook = "";
        state.mapChapter = "";
        state.mapSection = "";
        state.mapPoint = null;
        state.mapMethod = "";
        state.mapIdea = "";
        state.mapCard = false;
      } else {
        state.mapBook = name;
        state.mapChapter = "";
        state.mapSection = "";
        state.mapPoint = null;
        state.mapMethod = "";
        state.mapIdea = "";
        state.mapCard = false;
      }
      render();
    };
  });
  const pickBook = document.getElementById("pick-book");
  if (pickBook) pickBook.onchange = function () {
    if (!pickBook.value) {
      state.mapBook = "";
      state.mapChapter = "";
      state.mapSection = "";
      state.mapPoint = null;
      state.mapSkill = "";
      state.mapMethod = "";
      state.mapIdea = "";
      state.mapCard = false;
    } else {
      state.mapBook = pickBook.value;
      state.mapChapter = "";
      state.mapSection = "";
      state.mapPoint = null;
    }
    render();
  };
  const pickChapter = document.getElementById("pick-chapter");
  if (pickChapter) pickChapter.onchange = function () {
    state.mapPoint = null;
    state.mapMethod = "";
    state.mapIdea = "";
    if (!pickChapter.value) {
      state.mapChapter = "";
      state.mapSection = "";
      state.mapCard = false;
    } else {
      state.mapChapter = pickChapter.value;
      state.mapSection = "";
      state.mapBook = pickChapter.value.split("-")[0] || state.mapBook;
      state.mapNetNo = Number(pickChapter.value.split("-")[1]) || state.mapNetNo;
      state.mapCard = true;
    }
    render();
  };
  const pickLiteracy = document.getElementById("pick-literacy");
  if (pickLiteracy) pickLiteracy.onchange = function () {
    state.mapLiteracy = pickLiteracy.value;
    render();
  };
  document.querySelectorAll("[data-method]").forEach(function (button) {
    button.onclick = function () {
      const name = button.getAttribute("data-method");
      if (state.mapMethod === name) {
        state.mapMethod = "";
        state.mapIdea = "";
        state.mapCard = false;
      } else {
        state.mapMethod = name;
        state.mapIdea = "";
        state.mapCard = true;
      }
      render();
    };
  });
  document.querySelectorAll("[data-idea]").forEach(function (button) {
    button.onclick = function () {
      const name = button.getAttribute("data-idea");
      if (state.mapIdea === name) {
        state.mapIdea = "";
        state.mapCard = false;
      } else {
        state.mapIdea = name;
        state.mapCard = true;
      }
      render();
    };
  });
  const sideReopen = document.getElementById("side-reopen");
  if (sideReopen) sideReopen.onclick = function () { state.mapCard = true; state.mapSideOpen = true; render(); };
  const mapClose = document.getElementById("map-close");
  if (mapClose) mapClose.onclick = function () {
    if (state.mapSkill) {
      state.mapSkill = "";
      state.mapCard = !!(state.mapPoint || state.mapSection || state.mapLevel === "chapter");
    } else state.mapCard = false;
    render();
  };
  const query = document.getElementById("q");
  if (query) {
    query.oninput = function () {
      state.query = query.value;
      const hits = document.getElementById("hits");
      if (!hits) return;
      hits.hidden = !state.query.trim();
      hits.innerHTML = searchHits(state.query);
      bindHits(hits);
    };
  }
  const hits = document.getElementById("hits");
  if (hits) bindHits(hits);
  const topBack = document.getElementById("top-back");
  if (topBack) topBack.onclick = function () {
    if (state.route === "kp" && state.kpTrail.length) {
      state.kpName = state.kpTrail.pop();
      state.kpQid = "";
      state.kpSource = "";
      state.kpExplain = false;
      render();
      return;
    }
    const next = backTarget();
    if (next) go(next);
  };
  document.querySelectorAll(".crumbs [data-go]").forEach(function (button) {
    button.onclick = function () { go(button.getAttribute("data-go")); };
  });
  document.querySelectorAll(".crumbs [data-kp-crumb]").forEach(function (button) {
    button.onclick = function () {
      const index = Number(button.getAttribute("data-kp-crumb"));
      state.kpName = state.kpTrail[index];
      state.kpTrail = state.kpTrail.slice(0, index);
      state.kpQid = "";
      state.kpSource = "";
      state.kpExplain = false;
      render();
    };
  });
  const openChapter = document.getElementById("open-chapter");
  if (openChapter) openChapter.onclick = function () {
    const key = activeChapterKey();
    const parts = key.split("-");
    if (parts[0] && parts[1]) enterChapter(parts[0], parts[1], "map");
    else { state.chapterFrom = "map"; go("chapter"); }
  };
  document.querySelectorAll("[data-focus-point]").forEach(function (button) {
    button.onclick = function () {
      const pointId = button.getAttribute("data-focus-point");
      const net = ensureNet();
      const node = net && net.byId[pointId];
      if (!node) return;
      resetMapView();
      state.mapMode = "panorama";
      state.mapPoint = pointId;
      state.mapSkill = "";
      state.mapCard = true;
      state.mapSideOpen = true;
      state.mapSection = node.sec || "";
      state.mapLevel = "chapter";
      state.mapNetNo = Number(node.ch) || Number(String(node.sec || "").split(".")[0]) || state.mapNetNo;
      go("map");
    };
  });
  document.querySelectorAll("[data-open-skill]").forEach(function (button) {
    button.onclick = function () {
      state.methodId = button.getAttribute("data-open-skill");
      state.mapSkill = state.methodId;
      state.mapCard = true;
      if (state.route === "method") render();
      else go("method");
    };
  });
  document.querySelectorAll("[data-open-q]").forEach(function (button) {
    button.onclick = function () {
      state.qId = button.getAttribute("data-open-q");
      state.qVol = button.getAttribute("data-q-vol") || "";
      state.qNo = button.getAttribute("data-q-no") || "";
      go("q");
    };
  });
  const qBack = document.getElementById("q-back");
  if (qBack) qBack.onclick = function () { go("method"); };
  const mapSkillBtn = document.getElementById("map-skill");
  if (mapSkillBtn) mapSkillBtn.onclick = function () {
    state.methodId = state.mapSkill;
    state.mapCard = true;
    go("method");
  };
  const methodMap = document.getElementById("method-map");
  if (methodMap) methodMap.onclick = function () {
    if (state.methodId) state.mapSkill = state.methodId;
    state.mapCard = true;
    state.mapSideOpen = true;
    go("map");
  };
  const methodSection = document.getElementById("method-section");
  if (methodSection) methodSection.onclick = function () {
    const pack = skillBundle(state.methodId || state.mapSkill);
    if (!pack) { go("map"); return; }
    resetMapView();
    state.mapMode = "panorama";
    state.mapSection = pack.skill.sec;
    state.mapPoint = null;
    state.mapSkill = "";
    state.mapLevel = "chapter";
    state.mapNetNo = Number(String(pack.skill.sec || "").split(".")[0]) || state.mapNetNo;
    state.mapCard = true;
    go("map");
  };
  const mapKp = document.getElementById("map-kp");
  if (mapKp) mapKp.onclick = function () {
    state.kpName = state.mapPoint;
    state.kpFrom = "map";
    state.kpQid = "";
    state.kpSource = "";
    state.kpTrail = [];
    state.kpExplain = false;
    go("kp");
  };
  const mapSec = document.getElementById("map-sec");
  if (mapSec) mapSec.onclick = function () { go("section"); };
  const mapPractice = document.getElementById("map-practice");
  if (mapPractice) mapPractice.onclick = function () {
    const ids = QUESTIONS.map(function (item) { return item.id; });
    if (stillOpen(state.drafts.section)) resumeDraft("section");
    else startQueue(ids, "practice", "section");
  };
  const backLayer = document.getElementById("back-layer");
  if (backLayer) backLayer.onclick = function () { state.mapMode = "layer"; render(); };
  const sideFold = document.getElementById("side-fold");
  if (sideFold) sideFold.onclick = function () { state.mapSideOpen = false; render(); };
  const sideOpen = document.getElementById("side-open");
  if (sideOpen) sideOpen.onclick = function () { state.mapSideOpen = true; render(); };
  document.querySelectorAll("[data-choice]").forEach(function (button) {
    button.onclick = function () {
      if (state.revealed && state.mode !== "test") return;
      const choice = Number(button.getAttribute("data-choice"));
      const id = state.queue[state.index];
      if (state.mode === "test") {
        if (state.testPicks[id] === choice) delete state.testPicks[id];
        else state.testPicks[id] = choice;
      } else {
        state.picked = state.picked === choice ? null : choice;
      }
      saveDraft();
      render();
    };
  });
  document.querySelectorAll("[data-jump]").forEach(function (dot) {
    if (state.mode !== "test") return;
    dot.onclick = function () {
      state.index = Number(dot.getAttribute("data-jump"));
      render();
    };
  });
  document.querySelectorAll("[data-hint]").forEach(function (button) {
    button.onclick = function () {
      const level = Number(button.getAttribute("data-hint"));
      if (level > state.hintOpen || state.revealed) return;
      if (level < state.hintOpen) {
        state.hintFold[level] = !state.hintFold[level];
        render();
        return;
      }
      if (level === 4 && state.hintOpen === 4) {
        openDialog("会记成看了答案", "看了完整解析之后，这道题不算做对，会放进要重做的题。", "还是要看", function () {
          const item = questionById(state.queue[state.index]);
          state.setPeeked[item.id] = true;
          record(item.id, "peek");
          state.hintOpen = 5;
          state.revealed = true;
          render();
        }, "再想想", function () {});
        return;
      }
      if (level === state.hintOpen) state.hintOpen += 1;
      render();
    };
  });
  const passage = document.getElementById("open-passage");
  if (passage) {
    passage.onclick = function (event) {
      event.stopPropagation();
      state.hintPanel = "passage";
      render();
    };
  }
  const method = document.getElementById("open-method");
  if (method) {
    method.onclick = function (event) {
      event.stopPropagation();
      state.hintPanel = "method";
      render();
    };
  }
  const closePanel = document.getElementById("close-panel");
  if (closePanel) {
    closePanel.onclick = function () {
      state.hintPanel = "";
      render();
    };
  }
  const afterPeek = document.getElementById("after-peek");
  if (afterPeek) {
    afterPeek.onclick = function () {
      state.afterExplain = true;
      render();
    };
  }
  const submit = document.getElementById("submit");
  if (submit) {
    submit.onclick = function () {
      const item = questionById(state.queue[state.index]);
      if (item.kind === "open") {
        const text = String(state.mode === "test" ? (state.testPicks[item.id] || "") : (state.openText || "")).trim();
        if (state.mode === "test") {
          if (state.index + 1 >= state.queue.length) requestFinish();
          else { state.index += 1; state.openText = ""; render(); }
          return;
        }
        if (state.revealed) {
          if (!isFinal(state.setMarks[item.id])) record(item.id, "judge");
          advance();
          return;
        }
        if (!text) {
          openDialog("这道题还空着", "空着交会记成做错。", "就这样交", function () {
            record(item.id, "empty");
            state.revealed = true;
            render();
          }, "回去写", function () {});
          return;
        }
        state.revealed = true;
        state.awaitingJudge = true;
        render();
        return;
      }
      if (item.kind === "blank") {
        const text = String(state.mode === "test" ? (state.testPicks[item.id] || "") : (state.blank || "")).trim();
        const format = item.expect === "number" && text && !/^\d+$/.test(text);
        const formatText = text.indexOf("//") >= 0 ? "分数不要写成两个斜杠" : "这里要填一个数";
        if (state.mode === "test") {
          if (format) { state.formatNote = formatText; render(); return; }
          state.formatNote = "";
          if (state.index + 1 >= state.queue.length) requestFinish();
          else { state.index += 1; render(); }
          return;
        }
        if (state.revealed) { advance(); return; }
        if (!text) {
          openDialog("这道题还空着", "空着交会记成做错。", "就这样交", function () {
            record(item.id, "empty");
            state.revealed = true;
            render();
          }, "回去写", function () {});
          return;
        }
        if (format) { state.formatNote = formatText; render(); return; }
        state.formatNote = "";
        record(item.id, text === String(item.answer) ? "ok" : "bad");
        state.revealed = true;
        render();
        return;
      }
      if (state.mode === "test") {
        if (state.index + 1 >= state.queue.length) requestFinish();
        else { state.index += 1; render(); }
        return;
      }
      if (state.revealed) { advance(); return; }
      if (state.picked === null) {
        openDialog("这道题还空着", "空着交会记成做错。", "就这样交", function () {
          record(item.id, "empty");
          state.revealed = true;
          render();
        }, "回去写", function () {});
        return;
      }
      if (state.setPeeked[item.id]) record(item.id, "peek");
      else record(item.id, state.picked === item.answer ? "ok" : "bad");
      state.revealed = true;
      render();
    };
  }
  const skip = document.getElementById("skip");
  if (skip) {
    skip.onclick = function () {
      const current = state.queue[state.index];
      if (state.mode === "test") {
        state.testSkipped[current] = true;
        if (state.index + 1 < state.queue.length) state.index += 1;
        saveDraft();
        render();
        return;
      }
      if (isFinal(state.setMarks[current])) return;
      const othersOpen = state.queue.some(function (id) { return id !== current && !isFinal(state.setMarks[id]); });
      if (!othersOpen) {
        record(current, "skip");
        finishSet();
        return;
      }
      if (state.skippedIds.indexOf(current) < 0) state.skippedIds.push(current);
      state.queue.push(state.queue.splice(state.index, 1)[0]);
      state.picked = null;
      state.blank = "";
      state.openText = "";
      state.processOpen = false;
      state.formatNote = "";
      state.revealed = false;
      state.hintOpen = 0;
      state.hintFold = {};
      state.hintPanel = "";
      state.afterExplain = false;
      saveDraft();
      render();
    };
  }
  const finish = document.getElementById("finish");
  if (finish) finish.onclick = requestFinish;
  const leave = document.getElementById("leave");
  if (leave) leave.onclick = function () { requestLeave(homeRoute()); };
  const redo = document.getElementById("redo");
  if (redo) {
    redo.onclick = function () {
      const ids = state.queue.filter(function (id) {
        const mark = shownMark(id);
        return mark === "bad" || mark === "empty" || mark === "peek";
      });
      startQueue(ids, "wrong", practiceOrigin());
    };
  }
  const redoSkip = document.getElementById("redo-skip");
  if (redoSkip) {
    redoSkip.onclick = function () {
      const ids = state.queue.filter(function (id) { return shownMark(id) === "skip"; });
      startQueue(ids, "skip", practiceOrigin());
    };
  }
  const redoAll = document.getElementById("redo-all");
  if (redoAll) redoAll.onclick = function () { startQueue(retryIds().slice(0, 10), "wrong", "review"); };
  const test = document.getElementById("test");
  if (test) {
    test.onclick = function () {
      if (!reviewTestIds().length) return;
      const draft = state.drafts["test:review"];
      if (draft && stillOpen(draft)) { resumeDraft("test:review"); return; }
      state.pendingScope = "review";
      state.testBack = "";
      go("brief");
    };
  }
  const testSection = document.getElementById("test-section");
  if (testSection) testSection.onclick = function () {
    const draft = state.drafts["test:section"];
    if (draft && stillOpen(draft)) { resumeDraft("test:section"); return; }
    state.pendingScope = "section";
    go("brief");
  };
  const testChapter = document.getElementById("test-chapter");
  if (testChapter) testChapter.onclick = function () {
    const draft = state.drafts["test:chapter"];
    if (draft && stillOpen(draft)) { resumeDraft("test:chapter"); return; }
    state.pendingScope = "chapter";
    go("brief");
  };
  const begin = document.getElementById("begin-test");
  if (begin) {
    begin.onclick = function () {
      const scope = state.pendingScope || state.testScope;
      const ids = scope === "review" ? reviewTestIds() : QUESTIONS.map(function (item) { return item.id; });
      if (!ids.length) {
        state.flash = "暂时没有能测的题";
        render();
        return;
      }
      state.pendingScope = scope;
      startQueue(ids, "test", "test");
    };
  }
  const skipTest = document.getElementById("skip-test");
  if (skipTest) skipTest.onclick = function () { go(backTarget() || "review"); };
  document.querySelectorAll("[data-weak]").forEach(function (box) {
    box.onchange = function () {
      const name = box.getAttribute("data-weak");
      const picked = weakPoints().filter(function (point) { return state.checked[point.name]; }).length;
      if (box.checked && picked >= 5) {
        state.weakLimit = true;
        render();
        return;
      }
      state.checked[name] = box.checked;
      state.weakLimit = false;
      render();
    };
  });
  document.querySelectorAll("[data-weak-name]").forEach(function (button) {
    button.onclick = function () {
      const name = button.getAttribute("data-weak-name");
      const point = weakPoints().filter(function (item) { return item.name === name; })[0];
      state.kpName = name;
      state.kpFrom = "review";
      state.kpQid = point && point.ids.length ? point.ids[0] : "";
      state.kpSource = "";
      state.kpTrail = [];
      state.kpExplain = false;
      go("kp");
    };
  });
  document.querySelectorAll("[data-review-kp]").forEach(function (button) {
    button.onclick = function () {
      const qid = button.getAttribute("data-review-kp");
      state.kpName = questionById(qid).kp;
      state.kpMark = shownMark(qid);
      state.kpQid = qid;
      state.kpFrom = "review";
      state.kpSource = "";
      state.kpTrail = [];
      state.kpExplain = false;
      go("kp");
    };
  });
  const openAnswer = document.getElementById("open-answer");
  if (openAnswer) {
    openAnswer.oninput = function () {
      const item = questionById(state.queue[state.index]);
      if (state.mode === "test") state.testPicks[item.id] = openAnswer.value;
      else state.openText = openAnswer.value;
      saveDraft();
    };
  }
  const toggleProcess = document.getElementById("toggle-process");
  if (toggleProcess) toggleProcess.onclick = function () { state.processOpen = !state.processOpen; render(); };
  const process = document.getElementById("process");
  if (process) {
    process.oninput = function () {
      state.processes[state.queue[state.index]] = process.value;
      saveDraft();
    };
  }
  document.querySelectorAll("[data-self]").forEach(function (button) {
    button.onclick = function () {
      const item = questionById(state.queue[state.index]);
      record(item.id, button.getAttribute("data-self"));
      state.awaitingJudge = false;
      render();
    };
  });
  document.querySelectorAll("[data-rejudge]").forEach(function (button) {
    button.onclick = function () {
      const id = button.getAttribute("data-id");
      const mark = button.getAttribute("data-rejudge");
      state.setMarks[id] = mark;
      state.answers[id] = mark;
      render();
    };
  });
  const blank = document.getElementById("blank");
  if (blank) {
    blank.oninput = function () {
      const item = questionById(state.queue[state.index]);
      state.formatNote = "";
      if (state.mode === "test") state.testPicks[item.id] = blank.value;
      else state.blank = blank.value;
      saveDraft();
    };
  }
  document.querySelectorAll("[data-symbol]").forEach(function (button) {
    button.onclick = function () {
      const item = questionById(state.queue[state.index]);
      const symbol = button.getAttribute("data-symbol");
      if (state.mode === "test") state.testPicks[item.id] = (state.testPicks[item.id] || "") + symbol;
      else if (item.kind === "open") state.openText = (state.openText || "") + symbol;
      else state.blank = (state.blank || "") + symbol;
      state.formatNote = "";
      render();
      const input = document.getElementById(item.kind === "open" ? "open-answer" : "blank");
      if (input) {
        input.focus();
        const end = input.value.length;
        input.setSelectionRange(end, end);
      }
    };
  });
  const showOk = document.getElementById("show-ok");
  if (showOk) showOk.onclick = function () { state.showOk = true; render(); };
  const hideOk = document.getElementById("hide-ok");
  if (hideOk) hideOk.onclick = function () { state.showOk = false; render(); };
  const again = document.getElementById("again");
  if (again) again.onclick = function () { startQueue(againPool(), "practice", practiceOrigin()); };
  document.querySelectorAll("[data-explain]").forEach(function (button) {
    button.onclick = function () {
      const id = button.getAttribute("data-explain");
      state.explainId = state.explainId === id ? null : id;
      render();
    };
  });
  document.querySelectorAll("[data-result-kp]").forEach(function (button) {
    button.onclick = function () {
      const qid = button.getAttribute("data-result-kp");
      state.kpName = questionById(qid).kp;
      state.kpMark = shownMark(qid);
      state.kpQid = qid;
      state.kpSource = "";
      state.kpTrail = [];
      state.kpExplain = false;
      state.kpFrom = "result";
      go("kp");
    };
  });
  document.querySelectorAll("[data-redo-one]").forEach(function (button) {
    button.onclick = function () {
      const id = button.getAttribute("data-redo-one");
      startQueue([id], shownMark(id) === "skip" ? "skip" : "wrong", state.route === "review" ? "review" : practiceOrigin());
    };
  });
  bindMapView();
}

/** Step to the next practice item or the result page. */
function advance() {
  state.picked = null;
  state.blank = "";
  state.openText = "";
  state.awaitingJudge = false;
  state.processOpen = false;
  state.formatNote = "";
  state.revealed = false;
  state.hintOpen = 0;
  state.hintFold = {};
  state.hintPanel = "";
  state.afterExplain = false;
  if (state.index + 1 >= state.queue.length) {
    noteChange();
    const scope = state.source === "test" ? (state.liveScope || state.testScope) : state.testScope;
    clearDraft(bucket(state.source, scope));
    go("result");
    return;
  }
  state.index += 1;
  render();
}

/** Pages that already have their own head, so they do not get the shared bar. */
function hideTopBar() {
  return inSet();
}

/** One step back from the current page. Empty means this page is a root. */
function backTarget() {
  if (state.route === "chapter") {
    if (state.chapterFrom === "map") return "map";
    if (state.chapterFrom === "record") return "record";
    return "book";
  }
  if (state.route === "record") return state.recordFrom || "review";
  if (state.route === "section") return "chapter";
  if (state.route === "brief") {
    const scope = state.pendingScope || state.testScope;
    if (scope === "chapter") return "chapter";
    if (scope === "section") return "section";
    return "review";
  }
  if (state.route === "evidence") return "record";
  if (state.route === "result") return homeRoute();
  if (state.route === "q") return "method";
  if (state.route === "method") return "map";
  if (state.route === "kp") {
    if (state.kpFrom === "today") return "today";
    if (state.kpFrom === "map") return "map";
    if (state.kpFrom === "review") return "review";
    if (state.kpFrom === "result") return "result";
    return "section";
  }
  return "";
}

/** Breadcrumb for the shared top bar. The last item is the current page. */
function crumbBar() {
  const volTitle = (catalog() && (catalog().volumes.filter(function (vol) { return vol.vol === (state.volId || "801"); })[0] || {}).title) || "课本";
  const book = { route: "book", label: volTitle };
  const chapter = { route: "chapter", label: (currentChapter() && currentChapter().title) || "这一章" };
  const section = { route: "section", label: (currentSection() && currentSection().title) || "这一节" };
  let parts = [{ label: "今天" }];
  if (state.route === "book") parts = [{ label: "课本" }];
  else if (state.route === "chapter") parts = [book, { label: (currentChapter() && currentChapter().title) || "这一章" }];
  else if (state.route === "section") parts = [book, { route: "chapter", label: (currentChapter() && currentChapter().title) || "这一章" }, { label: (currentSection() && currentSection().title) || "这一节" }];
  else if (state.route === "kp") {
    parts = [book, chapter, section];
    state.kpTrail.forEach(function (name, index) {
      parts.push({ label: name, kpIndex: index });
    });
    parts.push({ label: state.kpName });
  }
  else if (state.route === "map") parts = [{ label: "图谱" }];
  else if (state.route === "method" || state.route === "q") {
    const named = state.methodId && ensureNet() && ensureNet().byId[state.methodId];
    parts = [{ route: "map", label: "图谱" }, { route: state.route === "q" ? "method" : "", label: named ? named.title : "方法" }];
    if (state.route === "q") parts.push({ label: "这一题" });
  }
  else if (state.route === "review") parts = [{ label: "回顾" }];
  else if (state.route === "record") parts = [{ label: "我的记录" }];
  else if (state.route === "evidence") parts = [{ route: "record", label: "我的记录" }, { label: "关于这些数据" }];
  else if (state.route === "brief") parts = [{ label: "这次是测试" }];
  else if (state.route === "result") parts = [{ label: "这一组结果" }];
  return parts.map(function (part, index) {
    if (part.kpIndex !== undefined && index !== parts.length - 1) {
      return '<button type="button" data-kp-crumb="' + part.kpIndex + '">' + part.label + "</button>";
    }
    if (!part.route || index === parts.length - 1) return "<span>" + part.label + "</span>";
    return '<button type="button" data-go="' + part.route + '">' + part.label + "</button>";
  }).join("<span> › </span>");
}

/** Search hits grouped the way the interaction spec asks. */
function searchHits(text) {
  const word = (text || "").trim();
  if (!word) return "";
  const cat = catalog();
  if (!cat) return '<p class="muted">图谱还在打开。</p>';
  const rows = [];
  const count = {};
  function push(group, label, route, extra) {
    if ((count[group] || 0) >= 8 || rows.length >= 24) return;
    if (plainMath(label).indexOf(word) < 0 && label.indexOf(word) < 0) return;
    count[group] = (count[group] || 0) + 1;
    rows.push({ group: group, label: plainMath(kpLabel(label)), route: route, extra: extra || "" });
  }
  cat.volumes.forEach(function (vol) { push("册", vol.title, "book", '" data-book-vol="' + vol.vol); });
  cat.chapters.forEach(function (ch) { push("章", ch.title, "chapter", '" data-book-vol="' + ch.vol + '" data-book-ch="' + ch.ch); });
  cat.sections.forEach(function (sec) { push("节", sec.title, "section", '" data-book-vol="' + sec.vol + '" data-book-ch="' + sec.ch + '" data-book-sec="' + sec.sec); });
  const net = ensureNet();
  if (net) {
    Object.keys(net.byId).forEach(function (id) {
      const node = net.byId[id];
      if (node.kind === "knowledge_point") push("知识点", node.title, "kp", '" data-kp="' + node.id);
    });
  }
  if (!rows.length) return '<p class="muted">没找到。换个词试试，比如「三角形」。</p>';
  let last = "";
  return rows.map(function (item) {
    const head = item.group === last ? "" : '<p class="muted">' + item.group + "</p>";
    last = item.group;
    return head + '<button type="button" data-go="' + item.route + item.extra + '">' + esc(item.label) + "</button>";
  }).join("");
}

/** Shared back, breadcrumb and search. Practice keeps its own head. */
function topBar() {
  if (hideTopBar()) return "";
  const back = backTarget();
  const backBtn = back ? '<button type="button" class="link" id="top-back">‹ 返回</button>' : "";
  return '<div class="topbar">' + backBtn + '<div class="crumbs">' + crumbBar() + "</div>" +
    '<div class="search"><input id="q" type="search" placeholder="搜知识点、章节" autocomplete="off" value="' +
    (state.query || "").replace(/"/g, "&quot;") + '"><div id="hits" class="hits"' +
    (state.query ? "" : " hidden") + ">" + searchHits(state.query) + "</div></div></div>";
}

/** Paint the current route. */
function render() {
  const views = {
    today: viewToday,
    book: viewBook,
    chapter: viewChapter,
    section: viewSection,
    kp: viewKp,
    method: viewMethod,
    q: viewQ,
    map: viewMap,
    brief: viewBrief,
    practice: viewPractice,
    test: viewPractice,
    result: viewResult,
    review: viewReview,
    record: viewRecord,
    evidence: viewEvidence
  };
  const view = views[state.route] || viewToday;
  document.getElementById("main").innerHTML = topBar() + (state.flash ? '<p class="banner">' + esc(state.flash) + "</p>" : "") + view();
  drawNav();
  bind();
}

/** Fill the review page for a screenshot. Headless profiles have no saved answers. */
function seedReviewSample() {
  const sample = { q1: "bad", q2: "empty", q5: "peek", q6: "skip" };
  Object.keys(sample).forEach(function (id) {
    state.answers[id] = sample[id];
    state.owedOn[id] = "11月5日";
    const item = questionById(id);
    if (item && item.options) state.given[id] = item.options[0];
  });
}

function seedResultSample() {
  state.queue = ["q1", "q2", "q3", "q4", "q5", "q6"];
  state.source = "today";
  state.mode = "practice";
  const marks = { q1: "bad", q2: "empty", q3: "ok", q4: "judge", q5: "peek", q6: "skip" };
  Object.keys(marks).forEach(function (id) {
    state.answers[id] = marks[id];
    state.setMarks[id] = marks[id];
  });
  state.baseline = { q3: "bad" };
  state.given.q1 = "2、3、6";
}

function seedRecordSample() {
  seedReviewSample();
  state.answers.q3 = "ok";
  state.lastChange = { before: 0, after: 1 };
}

/** Read one value from the hash query, for example #/map?point=三角形的定义. */
function hashParam(key) {
  const raw = (location.hash || "").split("?")[1] || "";
  const found = raw.split("&").filter(function (part) { return part.indexOf(key + "=") === 0; })[0];
  if (!found) return "";
  try { return decodeURIComponent(found.slice(key.length + 1)); }
  catch (error) { return found.slice(key.length + 1); }
}

/** Follow the hash, and confirm before a back button drops an open set. */
function onHash() {
  if (state.ignoreHash) return;
  const name = (location.hash || "#/today").replace("#/", "").split("?")[0];
  if (!viewsHas(name)) return;
  if (inSet() && name !== state.route && isDirty()) {
    state.ignoreHash = true;
    location.hash = "#/" + state.route;
    state.ignoreHash = false;
    requestLeave(name);
    return;
  }
  if ((name === "practice" || name === "test") && hashParam("load") === "1" && !state.queue.length) {
    state.queue = ["q1"];
    state.index = 0;
    state.mode = name === "test" ? "test" : "practice";
    state.source = "today";
  }
  if (name === "chapter" && hashParam("draft") === "1" && !state.drafts["test:chapter"]) {
    state.drafts["test:chapter"] = {
      queue: ["q1", "q2", "q3", "q4", "q5", "q6"],
      index: 1,
      mode: "test",
      source: "test",
      testScope: "chapter",
      setMarks: {},
      testPicks: { q1: 0 },
      savedAt: Date.now()
    };
    state.testScope = "chapter";
  }
  if (name === "test" && hashParam("sample") === "1" && !state.queue.length) {
    state.queue = ["q1", "q2", "q3", "q4", "q5", "q6"];
    state.index = 1;
    state.mode = "test";
    state.source = "test";
    state.testScope = "section";
    state.testPicks = { q1: 0 };
    state.testSkipped = { q6: true };
  }
  if ((name === "practice" || name === "test") && !state.queue.length) {
    const draft = newestDraft(name === "test");
    if (draft) { resumeDraft(draft.key || draft.source); return; }
    const back = name === "test"
      ? (state.testScope === "section" ? "section" : state.testScope === "chapter" ? "chapter" : "review")
      : "today";
    state.ignoreHash = true;
    location.hash = "#/" + back;
    state.ignoreHash = false;
    state.route = back;
    state.rail = false;
    render();
    return;
  }
  if (state.route === "review" && name !== "review") state.testBack = "";
  if (name === "record" && state.route !== "record") noteRecordFrom(state.route);
  if (name !== state.route) rememberScroll();
  state.route = name;
  if (name === "map") {
    const point = hashParam("point");
    const literacy = hashParam("literacy");
    if (hashParam("net") === "1") state.mapMode = "network";
    else if (hashParam("pano") === "fail") state.mapMode = "panorama";
    if (literacy) state.mapLiteracy = literacy;
    if (point) {
      state.mapMode = "layer";
      state.mapPoint = point;
      state.mapChapter = true;
      state.mapBook = "八年级上册";
      state.mapCard = true;
    }
  }
  if (name === "review" && hashParam("sample") === "1" && Object.keys(state.answers).length === 0) seedReviewSample();
  if (name === "record" && hashParam("sample") === "1" && Object.keys(state.answers).length === 0) seedRecordSample();
  if (name === "today" && hashParam("sample") === "1" && Object.keys(state.answers).length === 0) seedReviewSample();
  if (name === "result" && hashParam("sample") === "1" && !state.queue.length) seedResultSample();
  if (name !== "practice" && name !== "test") state.rail = false;
  else state.rail = !!state.queue.length;
  render();
  restoreScroll();
}

/** Return whether the route is one this prototype draws. */
function viewsHas(name) {
  return ["today", "book", "chapter", "section", "kp", "method", "q", "map", "brief", "practice", "test", "result", "review", "record", "evidence"].indexOf(name) >= 0;
}

window.addEventListener("hashchange", onHash);
window.addEventListener("beforeunload", function () {
  if (isDirty()) saveDraft();
});
window.addEventListener("pagehide", function () {
  if (isDirty()) saveDraft();
  rememberScroll();
  persistDrafts();
});
try {
  const raw = localStorage.getItem("mc-proto-drafts") || sessionStorage.getItem("mc-proto-drafts");
  if (raw) {
    const data = JSON.parse(raw);
    if (data && data.drafts) {
      state.drafts = data.drafts;
      if (data.answers) state.answers = data.answers;
      if (data.priorOwed === null || typeof data.priorOwed === "number") state.priorOwed = data.priorOwed;
      if (data.lastChange && typeof data.lastChange.before === "number" && typeof data.lastChange.after === "number") {
        state.lastChange = { before: data.lastChange.before, after: data.lastChange.after };
      }
    }
    applyPlace(data);
  } else {
    const old = sessionStorage.getItem("mc-proto-draft");
    if (old) {
      const one = JSON.parse(old);
      if (one && one.source) state.drafts[one.source] = one;
    }
  }
  if (state.drafts.test && state.drafts.test.source === "test") {
    const old = state.drafts.test;
    const moved = "test:" + (old.testScope || "review");
    if (!state.drafts[moved]) state.drafts[moved] = old;
    delete state.drafts.test;
  }
  Object.keys(state.drafts).forEach(function (key) {
    if (!stillOpen(state.drafts[key])) delete state.drafts[key];
  });
} catch (error) { /* prototype only */ }

/** Restore book, map, review checks and scroll after the page is opened again. */
function applyPlace(data) {
  const place = data && data.place;
  if (!place) return;
  if (typeof place.bookOpen === "boolean") state.bookOpen = place.bookOpen;
  if (typeof place.mapMode === "string") state.mapMode = place.mapMode;
  if (place.mapPoint === null || typeof place.mapPoint === "string") state.mapPoint = place.mapPoint;
  if (typeof place.mapCard === "boolean") state.mapCard = place.mapCard;
  if (typeof place.bookVol === "string") state.bookVol = place.bookVol;
  if (typeof place.volId === "string") state.volId = place.volId;
  if (typeof place.chNo === "string" || typeof place.chNo === "number") state.chNo = String(place.chNo);
  if (typeof place.secId === "string") state.secId = place.secId;
  if (typeof place.mapChapter === "boolean" || typeof place.mapChapter === "string") state.mapChapter = place.mapChapter;
  if (typeof place.mapNetNo === "number" && place.mapNetNo >= 1 && place.mapNetNo <= 26) state.mapNetNo = place.mapNetNo;
  if (place.mapLevel === "course" || place.mapLevel === "chapter") state.mapLevel = place.mapLevel;
  if (typeof place.mapSection === "string") state.mapSection = place.mapSection;
  if (typeof place.mapShowAll === "boolean") state.mapShowAll = place.mapShowAll;
  if (typeof place.mapSideOpen === "boolean") state.mapSideOpen = place.mapSideOpen;
  if (typeof place.mapSkill === "string") state.mapSkill = place.mapSkill;
  if (typeof place.methodId === "string") state.methodId = place.methodId;
  if (typeof place.qId === "string") state.qId = place.qId;
  if (typeof place.qVol === "string") state.qVol = place.qVol;
  if (typeof place.qNo === "string") state.qNo = place.qNo;
  if (typeof place.mapBook === "string") state.mapBook = place.mapBook;
  if (typeof place.mapLiteracy === "string") state.mapLiteracy = place.mapLiteracy;
  if (typeof place.mapMethod === "string") state.mapMethod = place.mapMethod;
  if (typeof place.mapIdea === "string") state.mapIdea = place.mapIdea;
  if (place.checked && typeof place.checked === "object") state.checked = place.checked;
  if (place.scrolls && typeof place.scrolls === "object") state.scrolls = place.scrolls;
  if (typeof place.recordFrom === "string" && place.recordFrom) state.recordFrom = place.recordFrom;
  if (place.chapterFrom === "book" || place.chapterFrom === "map" || place.chapterFrom === "record") {
    state.chapterFrom = place.chapterFrom;
  }
}

onHash();
