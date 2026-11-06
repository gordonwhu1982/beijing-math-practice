/* Static contracts for the mind-map view. See docs/STATE.md section 11.
   Reads source text only. Does not start a browser. */
const fs = require('fs');
const path = require('path');

/**
 * Read a text file from the repository root.
 * @param {string} rel path relative to the repository root
 * @return {string}
 */
function readRepo(rel) {
  return fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
}

var failed = 0;

/**
 * Record one failed contract.
 * @param {string} msg what is wrong
 * @return {void}
 */
function fail(msg) {
  failed += 1;
  console.log('FAIL', msg);
}

/**
 * Require a source snippet that the current picture depends on.
 * @param {string} label short name of the contract
 * @param {string} text file contents
 * @param {string} needle snippet that must be present
 * @return {void}
 */
function need(label, text, needle) {
  if (text.indexOf(needle) < 0) fail(label + ' missing: ' + needle);
}

/**
 * Reject a snippet that would bring back a known-bad picture.
 * @param {string} label short name of the contract
 * @param {string} text file contents
 * @param {string} needle snippet that must be absent
 * @return {void}
 */
function ban(label, text, needle) {
  if (text.indexOf(needle) >= 0) fail(label + ' still has: ' + needle);
}

/**
 * Check the mind-map source against the rules in STATE section 11.
 * @return {number} 0 when every contract holds
 */
function main() {
  const map = readRepo('runtime/web/js/views/map.js');
  const css = readRepo('runtime/web/app.css');
  const html = readRepo('runtime/web/index.html');

  ban('stable positions', map, 'Math.random');
  need('chapter centroid restore', map, 'function restoreCenters');
  need('section dots stay small', map, 'mind-secview');
  need('back to chapter button', map, '回到本章');
  need('back to chapter action', map, 'data-up');
  need('section prerequisites only', map, "a.role !== 'sn' || b.role !== 'sn'");
  need('same chapter is not a pull', map, 'a.n.vol === b.n.vol && String(a.n.ch) === String(b.n.ch)');
  need('full-width canvas', css, '.mapwrap.is-mind{display:block');
  ban('right-hand column', css, '1fr 480px');
  need('map script', html, 'js/views/map.js');
  need('enrichment color', map, "tier === 'extend'");
  need('contest color', map, "tier === 'olympiad'");
  need('enrichment swatch', map, 'mk-ext');
  need('contest swatch', map, 'mk-oly');
  /* 边的颜色必须来自 pal()，不许再写死 hex —— mind 档那 8 条 #c5d0da 式规则就是这么漂成一片灰的 */
  ban('edge color hardcoded', map, "'line-color': '#");
  need('relation colors are tokens', map, 'edge[r = "is_part_of"]');
  need('confidence axis exists', map, 'edge[d = "m"]');
  /* 四计数条四格都要能点：第四格曾经是 <span>，长得一样却点不动 */
  need('question count is a button', map, "'q', '练习题'");

  if (failed) {
    console.log('map contract fail=' + failed);
    return 1;
  }
  console.log('map contract ok');
  return 0;
}

process.exit(main());
