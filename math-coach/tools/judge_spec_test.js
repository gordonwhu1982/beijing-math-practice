/* answer_spec 判题回归：每条都断言「不假判 correct、不把 manual 当 wrong」 */
const J = require('../runtime/shared/judge.js');
let pass = 0, fail = 0;
function t(name, got, want) {
  if (got === want) { pass++; }
  else { fail++; console.log('FAIL', name, '| got', got, '| want', want); }
}
function run(spec, stu) { return J.judgeWithSpec(spec, spec && spec.ref || '', stu).verdict; }

/* 1. exact_value */
const ev = { type: 'exact_value', values: [{ raw: '22', num: 22, kind: 'number' }], ref: '22' };
t('exact 22/22', run(ev, '22'), 'correct');
t('exact 22/22cm', run(ev, '22 cm'), 'correct');
t('exact 22/23', run(ev, '23'), 'wrong');
t('exact 22/空', run(ev, ''), 'blank');
t('exact 22/不会', run(ev, '不会'), 'manual');
t('exact 22/两个值', run(ev, '22,23'), 'manual');
t('exact 分数 1/2', run({ type: 'exact_value', values: [{ raw: '0.5', num: 0.5 }] }, '1/2'), 'correct');
t('exact 中文分数', run({ type: 'exact_value', values: [{ raw: '0.5', num: 0.5 }] }, '二分之一'), 'correct');

/* 2. value_set */
const vs = { type: 'value_set', order_policy: 'any', values: [{ raw: '12', num: 12 }, { raw: '16', num: 16 }, { raw: '20', num: 20 }] };
t('set 顺序无关', run(vs, '20,16,12'), 'correct');
t('set 原序', run(vs, '12、16、20'), 'correct');
t('set 少一个', run(vs, '12,16'), 'manual');
t('set 多一个', run(vs, '12,16,20,24'), 'manual');
t('set 值错', run(vs, '12,16,21'), 'wrong');
const vso = { type: 'value_set', order_policy: 'ordered', values: [{ raw: '50', num: 50 }, { raw: '60', num: 60 }] };
t('set ordered 对', run(vso, '50,60'), 'correct');
t('set ordered 反序', run(vso, '60,50'), 'wrong');

/* 2b. value_set 里混文字空（两空题：直角 + 90） */
const vsm = { type: 'value_set', order_policy: 'ordered',
  values: [{ raw: '直角', num: null, kind: 'text' }, { raw: '90', num: 90, kind: 'number' }] };
t('混合空 对', run(vsm, '直角,90'), 'correct');
t('混合空 错', run(vsm, '直角,80'), 'wrong');
t('混合空 少一空', run(vsm, '直角'), 'manual');
t('混合空 无序不判', run({ type: 'value_set', order_policy: 'any',
  values: [{ raw: '直角', kind: 'text' }, { raw: '90', num: 90 }] }, '直角,90'), 'manual');

/* 3. interval */
const iv = { type: 'interval', var: 'x', low: 3, high: 13, low_closed: false, high_closed: false };
t('interval 对', run(iv, '3<x<13'), 'correct');
t('interval 闭区间', run(iv, '3≤x≤13'), 'wrong');
t('interval 单边', run(iv, 'x>3'), 'manual');
t('interval 学生写区间文字', run(iv, 'x 大于 3 小于 13'), 'manual');
const iv2 = { type: 'interval', var: null, low: 3, high: null, low_closed: true, high_closed: false };
t('interval x≥3', run(iv2, 'x>=3'), 'correct');
t('interval x>3 应 wrong', run(iv2, 'x>3'), 'wrong');

/* 4. judgement 同义组 */
const j1 = { type: 'judgement', values: [{ raw: '能', kind: 'text' }] };
t('judge 能/可以', run(j1, '可以'), 'correct');
t('judge 能/能', run(j1, '能'), 'correct');
t('judge 能/不能', run(j1, '不能'), 'wrong');
t('judge 能/也许', run(j1, '也许'), 'manual');
const j2 = { type: 'judgement', values: [{ raw: '全等', kind: 'text' }] };
t('judge 全等/不全等', run(j2, '不全等'), 'wrong');
const j3 = { type: 'judgement', values: [{ raw: '直角', kind: 'text' }] };
t('judge 直角/直角', run(j3, '直角'), 'correct');
t('judge 直角/钝角', run(j3, '钝角'), 'manual');
t('judge 直角/锐角', run(j3, '锐角'), 'manual');

/* 5. proof / relation / unknown */
t('proof 一律 manual', run({ type: 'proof' }, '因为 AB=AC 所以 ∠B=∠C'), 'manual');
t('relation 一律 manual', run({ type: 'relation' }, 'AB+AC>BC'), 'manual');
t('unknown 退回文本抽取', run({ type: 'unknown', ref: '22' }, '22'), 'correct');
t('none/无答案', run({ type: 'none', ref: '' }, '22'), 'manual');

/* 6. 空 spec / 缺 spec 不崩 */
t('spec 为 null', J.judgeWithSpec(null, '22', '22').verdict, 'correct');

/* 7. 铁律：manual 不计入 wrong */
const r7 = J.judgeWithSpec(ev, '22', '不会');
t('manual 不是 wrong', r7.verdict === 'wrong' ? 'BAD' : 'ok', 'ok');


/* 5. 关系式（L3）：x=2 / x≠3 / x≠±1 这类答案，数值路径认不出字母，老路径一律 manual */
function jr(ref, stu) { return J.judge(ref, stu).verdict; }
t('rel x≠3 / x≠3', jr('$x\\neq 3$', 'x≠3'), 'correct');
t('rel x≠3 / x!=3', jr('$x\\neq 3$', 'x!=3'), 'correct');
t('rel x≠3 / x=3', jr('$x\\neq 3$', 'x=3'), 'manual');
t('rel x≠3 / x≠4', jr('$x\\neq 3$', 'x≠4'), 'wrong');
t('rel ±1 两式合写', jr('$x\\neq\\pm 1$', 'x≠1且x≠-1'), 'correct');
t('rel ±1 反序', jr('$x\\neq\\pm 1$', 'x≠-1且x≠1'), 'correct');
t('rel 单值只写数字', jr('$x=2$', '2'), 'correct');
t('rel 单值写错', jr('$x=2$', '3'), 'wrong');
t('rel geq', jr('$x\\geq 1$', 'x>=1'), 'correct');
t('rel 分数解', jr('$x\\neq\\frac{1}{2}$', 'x≠二分之一'), 'correct');
t('rel 变量不同不判', jr('$a\\neq 3$', 'x≠3'), 'manual');
t('rel 写法人读不懂', jr('$x\\neq 3$', '不是3'), 'manual');

/* 6. 规范化不吞关系符（曾把 \neq 变成 !=q） */
t('norm neq', J.normalize('$x\\neq 3$').indexOf('q') < 0, true);
t('norm geq', J.normalize('$a\\geq b$'), 'a>= b');
t('norm gt 空花括号', J.normalize('$x\\gt{}0$'), 'x> 0');

console.log('pass=' + pass + ' fail=' + fail);
process.exit(fail ? 1 : 0);
