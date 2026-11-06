/* 数据层：按需注入数据片。
   file:// 下不能用 fetch / ES module（Chrome 按跨域拒绝），
   所以每个数据片都是普通脚本 window.MC.put(key, value)，用 <script src> 加载。 */
(function () {
  'use strict';
  var MC = window.MC;
  var cache = {};
  var pending = {};

  MC.put = function (key, value) { cache[key] = value; };
  MC.peek = function (key) { return cache[key]; };

  function urlOf(key) {
    if (key === 'catalog') return 'data/catalog.js';
    if (key === 'graph') return 'data/graph.js';
    if (key === 'qkp') return 'data/qkp.js';
    if (key === 'qtypes') return 'data/qtypes.js?v=20261029qtype';
    if (key === 'figures') return 'data/figures.js?v=20261029fig2';
    var m = /^(sec|items|ex):(.+)$/.exec(key);
    if (!m) throw new Error('未知数据片 ' + key);
    var suffix = m[1] === 'sec' ? '' : (m[1] === 'items' ? '.items' : '.ex');
    return 'data/sec/' + m[2] + suffix + '.js';
  }

  function load(key) {
    if (cache[key] !== undefined) return Promise.resolve(cache[key]);
    if (pending[key]) return pending[key];
    pending[key] = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = urlOf(key);
      s.async = true;
      s.onload = function () {
        pending[key] = null;
        if (cache[key] !== undefined) resolve(cache[key]);
        else reject(new Error('数据片没有注册自己：' + key));
      };
      s.onerror = function () {
        pending[key] = null;
        reject(new Error('加载失败：' + urlOf(key)));
      };
      document.head.appendChild(s);
    });
    return pending[key];
  }

  function secBase(vol, no) { return vol + '-' + no; }

  MC.data = {
    load: load, urlOf: urlOf, secBase: secBase,
    /* 便利方法：一次拿到节的三块（元数据 / 题目 / 例题）
       没有题的节没有 items/ex 数据片，这里吞掉加载失败，回空集，不当错误 */
    loadSec: function (vol, no) { return load('sec:' + secBase(vol, no)); },
    loadItems: function (vol, no) {
      return load('items:' + secBase(vol, no)).catch(function () { return { items: [] }; });
    },
    loadExamples: function (vol, no) {
      return load('ex:' + secBase(vol, no)).catch(function () { return { items: [] }; });
    }
  };
})();
