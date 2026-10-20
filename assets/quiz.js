/* 满分男友测评 · 计分引擎
   答案键驱动（每题 key 为正确选项下标）· 支持多选题 · 分数分档
   页面里定义 window.QUIZ 后引入本文件。 */
(function () {
  var Q = window.QUIZ;
  if (!Q) { console.warn("缺少 window.QUIZ"); return; }

  var $ = function (id) { return document.getElementById(id); };
  function txt(id, v) { var e = $(id); if (e) e.textContent = v; }
  function html(id, v) { var e = $(id); if (e) e.innerHTML = v; }
  function bind(id, fn) { var e = $(id); if (e) e.onclick = fn; }

  var LETTERS = "ABCDEFGH";
  var idx = 0, answers = [], forced = null;

  function init() {
    if (Q.title) document.title = Q.title;
    txt("kicker", Q.kicker || "");
    txt("title", Q.title || "");
    html("intro", Q.intro || "");
    html("startNote", Q.startNote || "");
    html("disclaimer", Q.disclaimer || "");
    txt("startLabel", Q.startLabel || "开始答题");
    txt("qTotal", Q.questions.length);
    txt("qUnit", (Q.meta && Q.meta.unit) || "题");
    bind("start", begin);
    bind("again", function () { to("s-start"); });
    bind("prevBtn", function () { go(-1); });
    bind("nextBtn", function () { go(1); });
    demo();
  }

  function to(id) {
    ["s-start", "s-quiz", "s-result"].forEach(function (s) {
      var e = $(s); if (e) e.classList.toggle("hidden", s !== id);
    });
    window.scrollTo(0, 0);
  }

  // 出图直达：#demo=gold / silver / bronze / fail
  function demo() {
    var m = /(?:^|[#&])demo=([A-Za-z0-9_]+)/.exec(location.hash);
    if (!m || !Q.bands) return;
    var band = null;
    Q.bands.forEach(function (b) { if (b.id === m[1]) band = b; });
    if (!band) return;
    Q.questions.forEach(function (q, i) { answers[i] = (q.key || []).slice(); });
    forced = band;
    showResult();
  }

  function begin() {
    idx = 0; answers = []; forced = null;
    to("s-quiz"); renderQ();
  }

  function renderQ() {
    var q = Q.questions[idx], n = Q.questions.length;
    txt("pnum", (idx + 1) + " / " + n);
    $("pfill").style.width = ((idx + 1) / n * 100) + "%";
    txt("qtag", q.tag || ("第 " + (idx + 1) + " 题"));
    txt("qtext", q.text);

    var hint = $("qhint");
    if (hint) {
      if (q.multi) { hint.textContent = Q.hintMulti || "可多选"; hint.classList.remove("hidden"); }
      else hint.classList.add("hidden");
    }

    var sel = answers[idx] || [];
    var box = $("opts"); box.innerHTML = "";
    q.opts.forEach(function (o, i) {
      var b = document.createElement("button");
      b.className = "opt" + (sel.indexOf(i) >= 0 ? " on" : "");
      var k = document.createElement("span"); k.className = "k"; k.textContent = LETTERS[i];
      var t = document.createElement("span"); t.textContent = o.label;
      b.appendChild(k); b.appendChild(t);
      b.onclick = function () {
        if (q.multi) {
          var cur = (answers[idx] || []).slice();
          var p = cur.indexOf(i);
          if (p >= 0) cur.splice(p, 1); else cur.push(i);
          answers[idx] = cur;
          b.classList.toggle("on", cur.indexOf(i) >= 0);
          if (next) next.disabled = cur.length === 0;
        } else {
          answers[idx] = [i]; go(1);
        }
      };
      box.appendChild(b);
    });

    var prev = $("prevBtn"), next = $("nextBtn");
    if (prev) prev.disabled = idx === 0;
    if (next) {
      var last = idx === n - 1;
      next.querySelector(".lbl").textContent = last ? "查看结果" : "下一题";
      next.disabled = !(answers[idx] && answers[idx].length);
    }
    var card = $("s-quiz").querySelector(".card");
    card.classList.remove("reveal"); void card.offsetWidth; card.classList.add("reveal");
  }

  function go(d) {
    var n = Q.questions.length;
    if (d > 0 && idx === n - 1) { finish(); return; }
    if (d > 0 && !(answers[idx] && answers[idx].length)) return;
    idx = Math.min(n - 1, Math.max(0, idx + d));
    renderQ();
  }

  // 单题满分 4 分；多选按 (命中 - 错选) / 正确总数 折算，落在 0~4
  function scoreOne(q, sel) {
    var key = q.key || []; if (!key.length) return 0;
    var hit = 0, wrong = 0;
    (sel || []).forEach(function (i) { if (key.indexOf(i) >= 0) hit++; else wrong++; });
    var raw = (hit - wrong) / key.length;
    raw = Math.max(0, Math.min(1, raw));
    return raw * 4;
  }

  function finish() {
    var total = 0, full = 0, red = false;
    Q.questions.forEach(function (q, i) {
      var sel = answers[i] || [];
      var s = scoreOne(q, sel);
      total += s;
      if (s >= 3.999) full++;
      sel.forEach(function (oi) { if (q.opts[oi] && q.opts[oi].red) red = true; });
    });
    var max = Q.questions.length * 4;
    var percent = Math.round(total / max * 100);
    render(percent, full, red, false);
  }

  function bandFor(p) {
    var b = null;
    (Q.bands || []).forEach(function (x) { if (p >= x.min) b = x; });
    return b || (Q.bands || [])[Q.bands.length - 1];
  }

  function showResult() { // #demo 出图
    var n = Q.questions.length;
    render(forced.min, Math.round(forced.min / 100 * n), false, true);
  }

  function render(percent, full, red, isDemo) {
    var band = (isDemo && forced) ? forced : bandFor(percent);
    var n = Q.questions.length;
    txt("scorenum", percent);
    txt("scoresub", "全部答对 " + full + " / " + n + " 题" + (isDemo ? "（示例）" : ""));
    txt("plate", band.glyph || "✦");
    txt("rcode", band.code || "");
    txt("rname", band.name || "");
    txt("rtag", band.tag || "");
    txt("portrait", band.portrait || "");

    var d = $("rdetail"); d.innerHTML = "";
    (band.detail || []).forEach(function (sec) {
      var h = document.createElement("h3"); h.textContent = sec[0]; d.appendChild(h);
      if (typeof sec[1] === "string") {
        var p = document.createElement("p"); p.textContent = sec[1]; d.appendChild(p);
      } else {
        var ul = document.createElement("ul");
        sec[1].forEach(function (it) { var li = document.createElement("li"); li.textContent = it; ul.appendChild(li); });
        d.appendChild(ul);
      }
    });

    var rb = $("rred");
    if (rb) {
      if (red) {
        rb.innerHTML = "<b>" + (Q.redTitle || "🚩 提醒") + "</b><br>" + (Q.redText || "");
        rb.classList.remove("hidden");
      } else rb.classList.add("hidden");
    }

    var q = $("rquote");
    if (q) {
      if (band.quote) { q.textContent = "“" + band.quote + "”"; q.classList.remove("hidden"); }
      else q.classList.add("hidden");
    }

    var c = $("rcta");
    if (c) {
      if (Q.cta) {
        var h = '<span class="eyebrow">' + Q.cta.eyebrow + '</span>';
        h += '<h4>' + Q.cta.title + '</h4>';
        h += '<p class="lead">' + Q.cta.lead + '</p>';
        if (Q.cta.items && Q.cta.items.length) {
          h += "<ul>" + Q.cta.items.map(function (it) { return "<li>" + it + "</li>"; }).join("") + "</ul>";
        }
        if (Q.cta.foot) h += '<p class="foot">' + Q.cta.foot + "</p>";
        c.innerHTML = h; c.classList.remove("hidden");
      } else c.classList.add("hidden");
    }

    to("s-result");
    var card = $("s-result").querySelector(".card");
    card.classList.remove("reveal"); void card.offsetWidth; card.classList.add("reveal");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
