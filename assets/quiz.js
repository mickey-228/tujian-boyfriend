/* 满分男友测评 · 计分引擎（答案键驱动）
   多选题 · 分数分档 · 逐题对照 · 一句话奖励 · 「看答案」分享链接
   页面里定义 window.QUIZ 后引入本文件。 */
(function () {
  var Q = window.QUIZ;
  if (!Q) { console.warn("缺少 window.QUIZ"); return; }

  var $ = function (id) { return document.getElementById(id); };
  function txt(id, v) { var e = $(id); if (e) e.textContent = v; }
  function html(id, v) { var e = $(id); if (e) e.innerHTML = v; }
  function bind(id, fn) { var e = $(id); if (e) e.onclick = fn; }

  var LETTERS = "ABCDEFGH";
  var idx = 0, answers = [], forced = null, viewer = false;

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
    bind("again", function () { location.hash = ""; to("s-start"); });
    bind("prevBtn", function () { go(-1); });
    bind("nextBtn", function () { go(1); });
    bind("shareBtn", share);

    var m = /(?:^|[#&])a=([^&]+)/.exec(location.hash);
    if (m) { loadShared(decodeURIComponent(m[1])); return; }
    demo();
  }

  function to(id) {
    ["s-start", "s-quiz", "s-result"].forEach(function (s) {
      var e = $(s); if (e) e.classList.toggle("hidden", s !== id);
    });
    window.scrollTo(0, 0);
  }

  /* ---------- 出图直达：#demo=gold / silver / bronze / fail ---------- */
  function demo() {
    var m = /(?:^|[#&])demo=([A-Za-z0-9_]+)/.exec(location.hash);
    if (!m || !Q.bands) return;
    var band = null;
    Q.bands.forEach(function (b) { if (b.id === m[1]) band = b; });
    if (!band) return;
    Q.questions.forEach(function (q, i) { answers[i] = (q.key || []).slice(); });
    forced = band;
    finish(true);
  }

  /* ---------- 分享链接：把答案编码进 hash ---------- */
  function encode() {
    return answers.map(function (a) {
      return (a || []).slice().sort(function (x, y) { return x - y; })
        .map(function (i) { return LETTERS[i]; }).join("");
    }).join(".");
  }

  function loadShared(code) {
    viewer = true;
    var parts = code.split(".");
    answers = Q.questions.map(function (q, i) {
      var s = parts[i] || "";
      return s.split("").map(function (ch) { return LETTERS.indexOf(ch); })
        .filter(function (n) { return n >= 0 && n < q.opts.length; });
    });
    finish(true);
  }

  function share() {
    var url = location.origin + location.pathname + "#a=" + encodeURIComponent(encode());
    var box = $("shareMsg");
    function ok() { if (box) { box.textContent = "链接已复制，发给她就能看你的答案 ✓"; box.classList.remove("hidden"); } }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(url).then(ok, function () { window.prompt("复制这条链接发给她：", url); });
    } else { window.prompt("复制这条链接发给她：", url); }
  }

  /* ---------- 答题 ---------- */
  function begin() {
    idx = 0; answers = []; forced = null; viewer = false;
    to("s-quiz"); renderQ();
  }

  function renderQ() {
    var q = Q.questions[idx], n = Q.questions.length;
    txt("pnum", (idx + 1) + " / " + n);
    $("pfill").style.width = ((idx + 1) / n * 100) + "%";
    txt("qtag", q.tag || ("第 " + (idx + 1) + " 题"));
    txt("qtext", q.text);

    var hint = $("qhint");
    if (hint) { if (q.multi) { hint.textContent = Q.hintMulti || "可多选"; hint.classList.remove("hidden"); } else hint.classList.add("hidden"); }

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
        } else { answers[idx] = [i]; go(1); }
      };
      box.appendChild(b);
    });

    var prev = $("prevBtn"), next = $("nextBtn");
    if (prev) prev.disabled = idx === 0;
    if (next) {
      var last = idx === n - 1;
      next.querySelector(".lbl").textContent = last ? "看看结果" : "下一题";
      next.disabled = !(answers[idx] && answers[idx].length);
    }
    var card = $("s-quiz").querySelector(".card");
    card.classList.remove("reveal"); void card.offsetWidth; card.classList.add("reveal");
  }

  function go(d) {
    var n = Q.questions.length;
    if (d > 0 && idx === n - 1) { finish(false); return; }
    if (d > 0 && !(answers[idx] && answers[idx].length)) return;
    idx = Math.min(n - 1, Math.max(0, idx + d));
    renderQ();
  }

  /* ---------- 计分 ---------- */
  function scoreOne(q, sel) {
    var key = q.key || []; if (!key.length) return 0;
    var hit = 0, wrong = 0;
    (sel || []).forEach(function (i) { if (key.indexOf(i) >= 0) hit++; else wrong++; });
    var raw = (hit - wrong) / key.length;
    return Math.max(0, Math.min(1, raw)) * 4;
  }

  function bandFor(p) {
    var b = null;
    (Q.bands || []).forEach(function (x) { if (p >= x.min) b = x; });
    return b || (Q.bands || [])[Q.bands.length - 1];
  }

  function finish(fromDemoOrShare) {
    var total = 0, full = 0, red = false, rows = [];
    Q.questions.forEach(function (q, i) {
      var sel = (answers[i] || []).slice();
      var s = scoreOne(q, sel);
      total += s;
      if (s >= 3.999) full++;
      sel.forEach(function (oi) { if (q.opts[oi] && q.opts[oi].red) red = true; });

      var key = q.key || [];
      var ok = sel.length > 0 && sel.length === key.length && sel.every(function (x) { return key.indexOf(x) >= 0; });
      var picked = sel.sort(function (a, b) { return a - b; });
      rows.push({
        tag: q.tag || ("第 " + (i + 1) + " 题"),
        text: q.text,
        right: key.map(function (k) { return LETTERS[k] + " " + (q.opts[k] ? q.opts[k].label : ""); }).join("　+　"),
        his: picked.length ? picked.map(function (k) { return LETTERS[k] + " " + (q.opts[k] ? q.opts[k].label : ""); }).join("　+　") : "（没作答）",
        ok: ok
      });
    });

    var max = Q.questions.length * 4;
    var percent = Math.round(total / max * 100);
    var band = forced || bandFor(percent);
    render(percent, full, red, band, rows);
  }

  function render(percent, full, red, band, rows) {
    var n = Q.questions.length;
    txt("scorenum", percent);
    txt("scoresub", "全部答对 " + full + " / " + n + " 题");
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

    var rw = $("rreward");
    if (rw) {
      if (band.reward) { rw.innerHTML = '<span class="rw-tag">' + (band.rewardLabel || "这份奖励，凭本页兑现") + '</span><div class="rw-txt">' + band.reward + "</div>"; rw.classList.remove("hidden"); }
      else rw.classList.add("hidden");
    }

    var rb = $("rred");
    if (rb) {
      if (red) { rb.innerHTML = "<b>" + (Q.redTitle || "🚩 提醒") + "</b><br>" + (Q.redText || ""); rb.classList.remove("hidden"); }
      else rb.classList.add("hidden");
    }

    var q = $("rquote");
    if (q) { if (band.quote) { q.textContent = "“" + band.quote + "”"; q.classList.remove("hidden"); } else q.classList.add("hidden"); }

    var rv = $("rreview");
    if (rv) {
      var yes = rows.filter(function (r) { return r.ok; }).length;
      var list = rows.map(function (r) {
        return '<div class="rv-row' + (r.ok ? " ok" : "") + '">' +
          '<div class="rv-q"><span class="rv-mark">' + (r.ok ? "✓" : "✗") + "</span>" + r.tag + " · " + r.text + "</div>" +
          '<div class="rv-line"><span class="rv-lb">她选的</span><span>' + r.right + "</span></div>" +
          '<div class="rv-line"><span class="rv-lb">他选的</span><span>' + r.his + "</span></div>" +
          "</div>";
      }).join("");
      rv.innerHTML = "<summary>逐题对照 · 答对 " + yes + " / " + rows.length + " 题</summary><div class=\"rv-list\">" + list + "</div>";
    }

    var sb = $("shareBtn");
    if (sb) sb.classList.toggle("hidden", viewer);

    var sm = $("shareMsg"); if (sm) sm.classList.add("hidden");

    to("s-result");
    var card = $("s-result").querySelector(".card");
    card.classList.remove("reveal"); void card.offsetWidth; card.classList.add("reveal");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
