/* Ilumi homepage — behaviour ported from the reference site.
   No dependencies. Everything is wrapped in an IIFE and runs after DOMContentLoaded. */
(function () {
  "use strict";

  // Where the "Generate" button sends people. Leave "" to just validate for now.
  var GENERATE_URL = "";

  /* ------------------------------------------------------------------ */
  /* Helpers                                                              */
  /* ------------------------------------------------------------------ */
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  /* ------------------------------------------------------------------ */
  /* URL input                                                            */
  /* ------------------------------------------------------------------ */
  function initUrlForm() {
    var form = $("#url-form");
    if (!form) return;
    var glass = $("#url-glass");
    var input = $("#url-input");
    var error = $("#url-error");

    function looksLikeDomain(v) {
      var s = v.trim().replace(/^https?:\/\//i, "").replace(/\/.*$/, "");
      return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(s);
    }

    function shake(msg) {
      error.textContent = msg;
      error.classList.add("is-visible");
      glass.classList.remove("is-error");
      // restart animation
      void glass.offsetWidth;
      glass.classList.add("is-error");
      input.focus();
    }

    input.addEventListener("input", function () {
      error.classList.remove("is-visible");
      glass.classList.remove("is-error");
    });

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var value = input.value;
      if (!value.trim()) { shake("Add your website to get started."); return; }
      if (!looksLikeDomain(value)) { shake("That doesn't look like a website address."); return; }
      if (GENERATE_URL) {
        var url = value.trim().replace(/^https?:\/\//i, "");
        window.location.href = GENERATE_URL + (GENERATE_URL.indexOf("?") === -1 ? "?" : "&") + "url=" + encodeURIComponent(url);
      } else {
        // No destination wired yet — show a friendly confirmation instead of doing nothing.
        error.textContent = "Thanks! Sign-up isn't connected yet.";
        error.style.color = "#5a7a1f";
        error.classList.add("is-visible");
        setTimeout(function () { error.style.color = ""; }, 4000);
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* The guides section's ground: white, or the world (trial)             */
  /* ------------------------------------------------------------------ */
  // data-ground="world" on #guides (index.html) stands that section on
  // paintings that fill the window, and the hero fades into the first of them,
  // not to white. Read once at start; without the attribute everything below
  // behaves as it did. The look is at "standing in the world" in css/styles.css.
  var WORLD = { on: false };
  function readGround() {
    WORLD.on = !!$('#guides[data-ground="world"]');
    document.documentElement.classList.toggle("has-world-ground", WORLD.on);
  }

  /* ------------------------------------------------------------------ */
  /* Header: bar that closes into a pill, and the menu drawer             */
  /* ------------------------------------------------------------------ */
  // One fixed header. It stays the clear bar all the way through the hero's
  // scroll story, and gets .is-scrolled when the white guides section arrives
  // under it; scrolling back up into the hero returns it to the bar. The
  // stylesheet does the rest (.site-header in css/styles.css): on wide screens
  // the bar closes into a floating pill, on narrower ones the pill's glass
  // fades in.
  var NAV_SWITCH_AT = "#guides"; // the section whose arrival changes the header
  var NAV_SWITCH_LINE = 88;      // px from the top of the window: the bar's height, so it changes as the white touches it
  var NAV_WORLD_LINE = 0.5;      // share of the window's height instead, when the section stands in the world: the bar's dark ink needs the pill once the night is half in
  var NAV_SCROLL_AT = 80;        // px of scroll instead, on a page without that section
  var NAV_DESKTOP = 1200;        // px. Narrower than this the links live in the drawer.

  function initNav() {
    var header = $("#site-header");
    if (!header) return;
    var btn = $(".menu-btn", header);
    var drawer = $("#nav-drawer");
    var main = $("main");

    var switchAt = $(NAV_SWITCH_AT);

    var frame = 0;
    function sync() {
      frame = 0;
      var line = WORLD.on ? window.innerHeight * NAV_WORLD_LINE : NAV_SWITCH_LINE;
      var past = switchAt
        ? switchAt.getBoundingClientRect().top <= line
        : window.scrollY > NAV_SCROLL_AT;
      header.classList.toggle("is-scrolled", past);
    }
    function queue() { if (!frame) frame = requestAnimationFrame(sync); }

    // A reload part-way down the page starts as the pill, without animating into it.
    header.classList.add("is-fixed", "is-instant");
    sync();
    void header.offsetWidth;
    requestAnimationFrame(function () { header.classList.remove("is-instant"); });
    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue); // the section moves when the window changes size

    if (!btn || !drawer) return;

    // The drawer covers the page, so the page behind it neither scrolls nor takes focus.
    function setMenu(open) {
      header.classList.toggle("is-menu-open", open);
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      btn.setAttribute("aria-label", open ? "Close menu" : "Menu");
      document.documentElement.style.overflow = open ? "hidden" : "";
      document.body.style.overflow = open ? "hidden" : "";
      if (main) main.inert = open;
    }
    function isOpen() { return header.classList.contains("is-menu-open"); }

    btn.addEventListener("click", function () { setMenu(!isOpen()); });
    // Following a link closes the menu first, so an in-page link can scroll to its section.
    drawer.addEventListener("click", function (e) {
      if (e.target.closest("a")) setMenu(false);
    });
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && isOpen()) { setMenu(false); btn.focus(); }
    });
    window.addEventListener("resize", function () {
      if (isOpen() && window.innerWidth >= NAV_DESKTOP) setMenu(false);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Hero sequence: pinned scroll story                                   */
  /* ------------------------------------------------------------------ */
  // Every position is scroll travel past the top of the sequence, in svh
  // (100 = one screen). The hero stays pinned until the guides section has
  // scrolled up over it (FIREFLY).
  var SEQ = {
    heroOut: [0, 30],       // hero copy fades away
    zoom: [0, 185],         // background art eases in to zoomScale
    zoomScale: 1.12,
    lineStarts: [36, 72, 132], // where each sentence starts to unfurl
    stagger: 31,            // travel spent spreading one sentence's letters
    charSpan: 7.75,         // travel each letter takes to settle
    panelOut: [[122, 126]]  // the first panel (sentences 1-2) leaves before the third; the third stays until the light takes it
  };

  // The firefly: the gold spark over the i of "Ilumi", let loose. While the
  // third sentence unfurls it comes in from above, sweeps one wide, even
  // circle round the word trailing a thread of light, and drops onto the i as
  // its dot. Once the sentence stands the page moves on: the sentence scrolls
  // up and blurs away, the painting stays where it is and fades to the white
  // of the guides section, that section scrolls up over it at the page's own
  // pace, and the firefly lifts off the i and flies down in one long curve to
  // the top of that section's heading, fading as it goes. It reaches the
  // heading, and has faded out, at the moment the section has arrived. Positions are svh of scroll, like SEQ. Both flights are worked
  // out from where the word and the heading sit in this window (buildFirefly).
  var FIREFLY = {
    flight: [134, 174],     // comes in, circles the word, drops onto the i
    turns: 1.2,             // times round the word before it lands
    reach: 1.9,             // how far out it starts, in loop radii
    wide: 700,              // how far the loop stands off the ends of the word, in font units (1000 = the type's size)
    tall: 1500,             // half the loop's height, in font units; with wide, this makes it close to a circle
    trail: 0.11,            // length of the thread of light behind it, as a share of the path
    leave: 179,             // lifts off the i; the page starts to move on. The pin ends one screen later
    meetY: [0.06, 1],       // share of that screen over which it comes level with the heading: all of it, so it arrives as the section does
    meetX: [0.12, 1],       // and over which it comes across to it
    land: [0.12, -0.17],    // where it ends: right and down from the top left of the heading's words, in the heading's type size
    fade: [0.42, 1],        // share of it over which it fades: slowly at first, gone exactly as it arrives
    trailDown: 0.15,        // length of the thread of light on the way down, as a share of that path
    dip: 0.24,              // how far it falls on its own before the heading draws it in, as a share of the window's height
    dipWorld: 0.4,          // the same in the world (WORLD), where the heading stands still and the flight is a swoop down and back up to it
    meetYWorld: [0.2, 1],   // and meetY there: the heading starts to draw it up a little later, so it has gone down first
    // In the world the thread on the way down is an aura: soft layers along
    // the same path, each [share of the thread's length, strength]. The long
    // faint one is the tail, the short one sits round the firefly; their widths
    // and blur are .firefly-aura-* in css/styles.css. The circle round the word
    // keeps its thin thread.
    aura: [[1, 0.2], [0.6, 0.27], [0.28, 0.36]],
    halo: 0.14,             // share of the way down over which its extra glow comes up (.firefly-halo); there is none while it circles
    out: 0.45,              // share of it by which the sentence has blurred away
    wash: [0.08, 0.72],     // share of it over which the painting fades to white
    washWorld: [0, 1],      // the same when the section stands in the world (WORLD): all of it, at an even rate, as the reference's two backgrounds cross-fade
    samples: 140
  };
  var FIREFLY_TRAVEL = 100; // svh the handover takes: the guides section scrolls up exactly one screen (.guides.is-handoff)
  // What the hero tells the guides section about the handover.
  var HANDOFF = { on: false };
  function announceHandoff() { document.dispatchEvent(new CustomEvent("ilumi:handoff")); }

  var SEQ_MS = 10; // animation milliseconds per svh; only a unit conversion

  // Where each letter of the wordmark starts, in EB Garamond 500 units
  // (1000 per em): I, l, u, m, i, then the word's full advance. See
  // .wordmark in css/styles.css.
  var WORDMARK_CUTS = [0, 348.41, 604.36, 1136.87, 1925.02, 2187.71];
  var SVG_NS = "http://www.w3.org/2000/svg";

  // Turns a sentence into per-letter spans (words stay unbreakable), keeping
  // the plain sentence for screen readers. A <br> starts a new line. A
  // .wordmark in the sentence becomes one masked piece per letter.
  function splitIntoChars(el) {
    var lines = el.innerHTML.split(/<br\s*\/?>/i).map(function (html) {
      var tmp = document.createElement("span");
      tmp.innerHTML = html;
      // Pieces in reading order: a character, or "logo" for the wordmark.
      var pieces = [];
      var text = "";
      Array.prototype.forEach.call(tmp.childNodes, function (node) {
        if (node.nodeType === 1 && node.classList.contains("wordmark")) {
          pieces.push("logo");
          text += node.getAttribute("aria-label");
          return;
        }
        Array.from(node.textContent.replace(/\s+/g, " ")).forEach(function (ch) { pieces.push(ch); });
        text += node.textContent;
      });
      while (pieces[0] === " ") pieces.shift();
      while (pieces[pieces.length - 1] === " ") pieces.pop();
      return { text: text.replace(/\s+/g, " ").trim(), pieces: pieces };
    });
    var readable = document.createElement("span");
    readable.className = "visually-hidden";
    readable.textContent = lines.map(function (l) { return l.text; }).join(" ");
    var copy = document.createElement("span");
    copy.className = "reveal-copy";
    copy.setAttribute("aria-hidden", "true");
    var chars = [];
    lines.forEach(function (line) {
      var lineEl = document.createElement("span");
      lineEl.className = "reveal-line";
      var wordEl = null;
      line.pieces.forEach(function (p) {
        if (p === " ") {
          if (wordEl) lineEl.appendChild(document.createTextNode(" "));
          wordEl = null;
          return;
        }
        if (!wordEl) {
          wordEl = document.createElement("span");
          wordEl.className = "reveal-word";
          lineEl.appendChild(wordEl);
        }
        if (p === "logo") {
          for (var g = 0; g < WORDMARK_CUTS.length - 1; g++) {
            var w = WORDMARK_CUTS[g + 1] - WORDMARK_CUTS[g];
            var piece = document.createElementNS(SVG_NS, "svg");
            piece.setAttribute("class", "reveal-char wordmark-glyph");
            piece.setAttribute("viewBox", WORDMARK_CUTS[g] + " -790 " + w + " 810");
            piece.style.width = w / 1000 + "em";
            var use = document.createElementNS(SVG_NS, "use");
            use.setAttribute("href", "#ilumi-wordmark-glyphs");
            piece.appendChild(use);
            wordEl.appendChild(piece);
            chars.push(piece);
          }
          return;
        }
        var c = document.createElement("span");
        c.className = "reveal-char";
        c.textContent = p;
        wordEl.appendChild(c);
        chars.push(c);
      });
      copy.appendChild(lineEl);
    });
    el.textContent = "";
    el.appendChild(readable);
    el.appendChild(copy);
    return chars;
  }

  function initHeroSequence() {
    var seq = $("#hero-sequence");
    if (!seq || !window.matchMedia || !Element.prototype.animate) return;
    var stage = $(".hero-stage", seq);
    var bg = $(".hero-bg img", seq);
    var heroCopy = $(".hero-content", seq);
    var panels = $$(".manifesto-panel", seq);
    if (!stage || !bg || !heroCopy || !panels.length) return;
    var sentences = $$(".manifesto-line", seq).map(splitIntoChars);

    // No pinning for people who asked for less motion, or on screens too short
    // to hold the text; they get the sentences as a plain block under the hero.
    var mq = window.matchMedia("(prefers-reduced-motion: no-preference) and (min-height: 480px)");
    var root = document.documentElement;
    var wash = $(".hero-wash", seq);
    var fly = {
      wrap: $(".firefly"), mover: $(".firefly-fly"), star: $(".firefly-star"),
      trails: $$(".firefly-trail path")   // the thread behind the loop, and the one behind the flight down
    };
    var glyphs = $$(".wordmark-glyph", seq); // the wordmark's letters; the last is the i
    var hasFirefly = !!(fly.wrap && fly.mover && fly.star && fly.trails.length === 2 && glyphs.length === WORDMARK_CUTS.length - 1);
    var tracks = [];
    var flyTracks = [];     // rebuilt when the window changes size: the flight depends on where the word sits
    var end = SEQ.zoom[1];  // where the pin ends
    var unit = 1;
    var last = -1;
    var queued = false;

    function track(el, keyframes, from, to, easing, list) {
      var anim = el.animate(keyframes, {
        delay: from * SEQ_MS,
        duration: (to - from) * SEQ_MS,
        fill: "both",
        easing: easing || "linear"
      });
      anim.pause();
      (list || tracks).push({ anim: anim, from: from, to: to, el: el });
    }

    // The firefly's extra glow on the way down in the world: a second, wider
    // halo behind the star, made once (.firefly-halo in css/styles.css).
    function halo() {
      if (!fly.halo) {
        fly.halo = document.createElement("span");
        fly.halo.className = "firefly-halo";
        fly.star.parentNode.insertBefore(fly.halo, fly.star);
      }
      return fly.halo;
    }
    // The layers an aura is drawn with: the thread itself and copies of it,
    // one per FIREFLY.aura entry, made once.
    function auraLayers(el) {
      if (!el.auraLayers) {
        el.auraLayers = FIREFLY.aura.map(function (layer, k) {
          var copy = k ? el.parentNode.appendChild(el.cloneNode(false)) : el;
          copy.setAttribute("class", "firefly-aura firefly-aura-" + (k + 1));
          return { el: copy, len: layer[0], show: layer[1] };
        });
      }
      return el.auraLayers;
    }

    function clamp01(x) { return Math.max(0, Math.min(1, x)); }
    function smooth(a, b, x) {
      var t = clamp01((x - a) / (b - a));
      return t * t * (3 - 2 * t);
    }

    // The firefly's flight, for this window, as one track from the moment it
    // appears to the moment it has faded out.
    //
    // The circle: the word is measured with its letters at rest. The path is
    // one smooth spiral round the middle of the word: it starts far out,
    // above, comes round clockwise onto a wide ellipse, and over the last half
    // turn draws in to the i's dot, so it arrives over the top and drops onto
    // the i. Nothing is added to the curve (no wobble, no rocking), and it is
    // sampled finely, so it reads as one even sweep.
    //
    // The way down: the guides section is scrolling up one screen while this
    // plays, so the place above its heading where the firefly settles is a
    // moving target whose position at every moment is known. The firefly
    // lifts off the i, curves down, and closes on that target over the whole
    // of the handover, so it never waits there: it arrives as the section
    // does, and it has been fading all the way in. Every part of the curve is
    // eased at both ends and nothing is added to it, so it has no corners.
    function buildFirefly() {
      flyTracks.forEach(function (t) { t.anim.cancel(); });
      flyTracks = [];
      root.classList.toggle("has-firefly", hasFirefly);
      var title = hasFirefly && $("#guides .guides-title");
      var titleStage = title && $("#guides .guides-stage");
      var handoff = !!(title && titleStage && wash);
      end = handoff ? FIREFLY.leave + FIREFLY_TRAVEL : SEQ.zoom[1];
      seq.classList.toggle("is-handoff", handoff);
      seq.style.setProperty("--seq-travel", end);
      if (HANDOFF.on !== handoff) {
        HANDOFF.on = handoff;
        announceHandoff();
      }
      if (!hasFirefly) return;

      // Letters at rest, to measure them; render() puts them back.
      tracks.forEach(function (t) { if (glyphs.indexOf(t.el) >= 0) t.anim.currentTime = t.to * SEQ_MS; });
      var sr = stage.getBoundingClientRect();
      var W = sr.width, H = sr.height;
      var first = glyphs[0].getBoundingClientRect();
      var dot = glyphs[glyphs.length - 1].getBoundingClientRect();
      var u = dot.height / 810;                        // px per font unit (the pieces are 810 units tall)
      var top = dot.top - sr.top;
      var px = dot.left - sr.left + (2057 - WORDMARK_CUTS[WORDMARK_CUTS.length - 2]) * u; // the spark's middle
      var py = top + 134.4 * u;
      var left = first.left - sr.left, right = dot.right - sr.left;
      var cx = (left + right) / 2, cy = top + 460 * u; // the middle of the letters
      var rx = (right - left) / 2 + FIREFLY.wide * u, ry = FIREFLY.tall * u;
      fly.wrap.style.setProperty("--u", u.toFixed(4) + "px");

      var a = FIREFLY.flight[0], b = FIREFLY.flight[1];
      var c = handoff ? end : b;
      function at(pos) { return (pos - a) / (c - a); } // a scroll position as a place on the one track
      function path(pts) { return "M" + pts.map(function (pt) { return pt[0].toFixed(1) + " " + pt[1].toFixed(1); }).join("L"); }
      function lengths(pts) {
        var out = [0];
        for (var i = 1; i < pts.length; i++) out.push(out[i - 1] + Math.sqrt(Math.pow(pts[i][0] - pts[i - 1][0], 2) + Math.pow(pts[i][1] - pts[i - 1][1], 2)));
        return out;
      }
      var move = [], size = [];
      var n = FIREFLY.samples;

      // The circle.
      var ax = (px - cx) / rx, ay = (py - cy) / ry;
      var home = Math.atan2(ay, ax);                   // the dot's bearing from the word's middle
      var homeR = Math.sqrt(ax * ax + ay * ay);        // and how far out it is, in loop radii
      var loop = [];
      for (var i = 0; i <= n; i++) {
        var p = i / n;
        var e = 0.25 * p + 0.75 * smooth(0, 1, p);     // unhurried at both ends, never stopping in between
        var th = home - Math.PI * 2 * FIREFLY.turns * (1 - e); // clockwise, ending on the dot's bearing
        var rho = FIREFLY.reach + (1 - FIREFLY.reach) * smooth(0, 0.5, p); // in from far out onto the loop
        rho += (homeR - rho) * smooth(0.55, 1, p);     // and off the loop, in to the dot
        loop.push([cx + rx * rho * Math.cos(th), cy + ry * rho * Math.sin(th)]);
        var o = at(a + p * (b - a));
        move.push({ offset: o, opacity: Math.min(1, p / 0.08), transform: "translate3d(" + loop[i][0].toFixed(2) + "px," + loop[i][1].toFixed(2) + "px,0)" });
        // A touch larger along the underside of the loop, where it is nearer.
        size.push({ offset: o, transform: "scale(" + (1 + 0.14 * Math.sin(th) * (1 - smooth(0.75, 1, p))).toFixed(3) + ")" });
      }
      // The light behind it: a dash of `share` of the path that runs along it
      // with the firefly at its head, `seen` (0 to 1) along the way. It is one
      // thin thread, or with `aura` the same dash drawn as several soft layers
      // (FIREFLY.aura).
      function thread(el, pts, share, seen, from, to, aura) {
        var len = lengths(pts), total = len[n] || 1, d = path(pts);
        (aura ? auraLayers(el) : [{ el: el, len: 1, show: 1 }]).forEach(function (layer) {
          var dash = share * layer.len;
          layer.el.setAttribute("d", d);
          layer.el.style.strokeDasharray = dash + " 2";
          track(layer.el, pts.map(function (pt, i) {
            return { offset: i / n, strokeDashoffset: (dash - len[i] / total).toFixed(4), opacity: (seen(i / n, i) * layer.show).toFixed(3) };
          }), from, to, null, flyTracks);
        });
      }
      thread(fly.trails[0], loop, FIREFLY.trail, function (p) { return Math.min(1, p / 0.1) * (1 - smooth(0.82, 1, p)); }, a, b);

      if (handoff) {
        var m = FIREFLY.leave;
        // The heading's words (not its box, which runs the width of its column),
        // where they stand once the section has arrived.
        var gr = titleStage.getBoundingClientRect();
        var words = document.createRange();
        words.selectNodeContents(title);
        var tr = words.getBoundingClientRect();
        var type = parseFloat(window.getComputedStyle(title).fontSize) || 48;
        var lx = tr.left - gr.left + FIREFLY.land[0] * type;
        var ly = tr.top - gr.top + FIREFLY.land[1] * type;
        var down = [], fades = [];
        for (var j = 0; j <= n; j++) {
          var q = j / n;
          // On its own: a small lift off the i, a slow drift out, and a fall.
          var ownX = px + 0.04 * W * Math.sin(Math.PI * smooth(0, 0.75, q));
          var ownY = py - 0.03 * H * smooth(0, 0.1, q) * (1 - smooth(0.1, 0.32, q)) + (WORLD.on ? FIREFLY.dipWorld : FIREFLY.dip) * H * smooth(0.08, 0.75, q);
          // Where it is headed right now: one screen below where that ends, less
          // what has scrolled. In the world the section fades in where it will
          // stand, so the heading is already there.
          var ty = WORLD.on ? ly : ly + (1 - q) * H;
          var wx = smooth(FIREFLY.meetX[0], FIREFLY.meetX[1], q);
          var meetY = WORLD.on ? FIREFLY.meetYWorld : FIREFLY.meetY;
          var wy = smooth(meetY[0], meetY[1], q);
          down.push([ownX + (lx - ownX) * wx, ownY + (ty - ownY) * wy]);
          var o2 = at(m + q * FIREFLY_TRAVEL);
          // Fading slowly at first and faster toward the end, so it can still be
          // seen coming in, and is gone exactly at the end.
          var seen = 1 - Math.pow(clamp01((q - FIREFLY.fade[0]) / (FIREFLY.fade[1] - FIREFLY.fade[0])), 1.8);
          fades.push(seen);
          move.push({ offset: o2, opacity: seen.toFixed(3), transform: "translate3d(" + down[j][0].toFixed(2) + "px," + down[j][1].toFixed(2) + "px,0)" });
          // It grows a little as it comes down toward you.
          size.push({ offset: o2, transform: "scale(" + (1 + 0.2 * smooth(0.05, 0.6, q)).toFixed(3) + ")" });
        }
        // The thread fades with the firefly. In the world it is an aura, and
        // the firefly glows a little more from the moment it lifts off.
        thread(fly.trails[1], down, FIREFLY.trailDown, function (q, j) { return smooth(0.01, 0.07, q) * fades[j]; }, m, end, WORLD.on);
        if (WORLD.on) {
          track(halo(), [{ offset: 0, opacity: 0 }, { offset: FIREFLY.halo, opacity: 1 }, { offset: 1, opacity: 1 }], m, end, null, flyTracks);
        }

        // The page moving on underneath it: the sentence scrolls up at the
        // page's pace and blurs away; the painting stays and fades to white.
        var lastPanel = panels[panels.length - 1];
        track(lastPanel, [
          { offset: 0, opacity: 1, filter: "blur(0px)", transform: "translate3d(0,0,0)" },
          { offset: FIREFLY.out, opacity: 0, filter: "blur(12px)", transform: "translate3d(0," + (-FIREFLY.out * H).toFixed(1) + "px,0)" },
          { offset: 1, opacity: 0, filter: "blur(12px)", transform: "translate3d(0," + (-H).toFixed(1) + "px,0)" }
        ], m, end, null, flyTracks);
        // In the world the wash is the guides section's first painting, and it
        // comes in as the reference's does (clearpath-template.framer.website,
        // measured): pinned, nothing moving, its opacity following the scroll at
        // an even rate over the whole screen of travel.
        var washAt = WORLD.on ? FIREFLY.washWorld : FIREFLY.wash;
        track(wash, [
          { offset: 0, opacity: 0 },
          { offset: washAt[0], opacity: 0, easing: WORLD.on ? "linear" : "ease-in-out" },
          { offset: washAt[1], opacity: 1 },
          { offset: 1, opacity: 1 }
        ], m, end, null, flyTracks);
      }
      track(fly.mover, move, a, c, null, flyTracks);
      track(fly.star, size, a, c, null, flyTracks);
    }

    function build() {
      track(bg, [{ transform: "scale(1)" }, { transform: "scale(" + SEQ.zoomScale + ")" }], SEQ.zoom[0], SEQ.zoom[1]);
      track(heroCopy, [{ opacity: 1, visibility: "visible" }, { opacity: 0, visibility: "hidden" }], SEQ.heroOut[0], SEQ.heroOut[1]);
      track(heroCopy, [{ transform: "scale(1)" }, { transform: "scale(1.08)" }], SEQ.heroOut[0], SEQ.heroOut[1], "ease-in");
      SEQ.panelOut.forEach(function (range, p) {
        if (!panels[p]) return;
        track(panels[p], [
          { opacity: 1, transform: "translateY(0)" },
          { opacity: 0, transform: "translateY(-24px)" }
        ], range[0], range[1]);
      });

      // Letters unfurl from above, tipped back and fanned out from the middle
      // of the sentence: the outer letters travel furthest and tilt most.
      sentences.forEach(function (chars, s) {
        chars.forEach(function (c, i) {
          var r = chars.length > 1 ? i / (chars.length - 1) : 0.5;
          var f = 2 * r - 1;
          var lift = 0.21 + Math.pow(Math.abs(f), 1.7) * 0.48;
          var start = SEQ.lineStarts[s] + r * SEQ.stagger;
          track(c, [
            { offset: 0, opacity: 0, easing: "ease-out",
              transform: "translate3d(" + (0.114 * f) + "em," + (-lift) + "em,0) rotateX(72deg) rotateZ(" + (8 * f) + "deg) scale(0.98)" },
            { offset: 0.35, opacity: 0.22, easing: "ease-out" },
            { offset: 0.7, opacity: 0.72, easing: "ease-out" },
            { offset: 1, opacity: 1, transform: "translate3d(0,0,0) rotateX(0deg) rotateZ(0deg) scale(1)" }
          ], start, start + SEQ.charSpan);
        });
      });
    }

    function render() {
      queued = false;
      if (!tracks.length) return;
      var pos = Math.max(0, Math.min(end, -seq.getBoundingClientRect().top / unit));
      if (pos === last) return;
      for (var n = 0; n < 2; n++) {
        var list = n ? flyTracks : tracks;
        for (var i = 0; i < list.length; i++) {
          var t = list[i];
          // Skip tracks that sat at the same end before and after this move.
          if (last >= 0 && ((last <= t.from && pos <= t.from) || (last >= t.to && pos >= t.to))) continue;
          t.anim.currentTime = pos * SEQ_MS;
        }
      }
      last = pos;
    }
    function queue() {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(render);
    }
    function measure() {
      if (!tracks.length) return;
      buildFirefly();
      unit = stage.offsetHeight / 100 || 1;
      last = -1;
      render();
    }

    function sync() {
      var on = mq.matches;
      seq.classList.toggle("is-scrolly", on);
      if (on && !tracks.length) {
        build();
        measure();
      } else if (!on && tracks.length) {
        tracks.concat(flyTracks).forEach(function (t) { t.anim.cancel(); });
        tracks = [];
        flyTracks = [];
        seq.style.removeProperty("--seq-travel");
        seq.classList.remove("is-handoff");
        root.classList.remove("has-firefly");
        if (HANDOFF.on) { HANDOFF.on = false; announceHandoff(); }
      } else if (on) {
        measure();
      }
    }

    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", measure);
    if (mq.addEventListener) mq.addEventListener("change", sync);
    else if (mq.addListener) mq.addListener(sync);
    // The word and the heading move when the web fonts arrive, and the heading
    // when the guides section changes layout.
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
    document.addEventListener("ilumi:guides-layout", measure);
    sync();
  }

  /* ------------------------------------------------------------------ */
  /* One world, three guides                                              */
  /* ------------------------------------------------------------------ */
  // On wide screens the section pins and scrolling picks the guide: each
  // guide holds for GUIDES.dwell svh of scroll, and the ring round its
  // picture shows how far through that stretch you are. Nothing advances on
  // a timer. The scene on the right loops its own short animation while its
  // guide is the one showing. Below pinWidth (or on short screens) the
  // section is three plain rows and each scene plays while it is on screen.
  var GUIDES = {
    dwell: 75,
    pinQuery: "(min-width: 960px) and (min-height: 700px)"
  };
  // The app's colours, as in .guides in css/styles.css.
  var MOCK = { ink: "#1c1a17", coral: "#e8503a", blueTint: "#dfe9f8", amberTint: "#fdf0cf", canvas: "#fdfbf7" };

  function assign(target, source) {
    for (var k in source) if (Object.prototype.hasOwnProperty.call(source, k)) target[k] = source[k];
    return target;
  }

  // One looping animation from a list of [ms, style] states. The element
  // holds each state until the next one's time, then eases into it over
  // `ease` ms. Every part of a scene loops over the same length, so the
  // parts stay in step with each other.
  function timeline(el, length, states, ease, easing) {
    if (!el) return null;
    var frames = [];
    var prev = states[0][1];
    frames.push(assign({ offset: 0 }, prev));
    for (var i = 1; i < states.length; i++) {
      var at = states[i][0];
      frames.push(assign({ offset: at / length, easing: easing || "ease-out" }, prev));
      frames.push(assign({ offset: Math.min(1, (at + ease) / length) }, states[i][1]));
      prev = states[i][1];
    }
    frames.push(assign({ offset: 1 }, prev));
    var anim = el.animate(frames, { duration: length, iterations: Infinity });
    anim.pause();
    return anim;
  }

  // The card's contents fade out at the end of a loop and back in at the
  // start, so the jump back to the first frame is never seen.
  function fadeLoop(el, length) {
    return timeline(el, length, [[0, { opacity: 0 }], [1, { opacity: 1 }], [length - 450, { opacity: 0 }]], 400);
  }

  // Reading: a page of the story. The rabbit's line is already standing when
  // the scene starts (its first frame is not a fade from nothing, so nobody
  // waits for it); the child's line comes up almost at once and is read
  // aloud, word by word. On the last word what the line says happens: the
  // lantern lights in the tree (in the section's painting, and in the framed
  // scene), the rabbit hops, and it answers. The loop ends by fading out,
  // setting everything back unseen (`reset`), and fading in to the first
  // frame again, with the lantern gone out.
  function readingScene(root) {
    var length = 9700;
    var turnAt = 350;                         // the child's line comes up
    var readAt = [1100, 1650, 2250, 2850];    // each word is read
    var litAt = 3100;                         // the lantern lights
    var outAt = length - 1200;                // the page fades out
    var reset = length - 780;                 // unseen: back to the first frame
    var unread = { color: MOCK.ink, opacity: 0.35, fontWeight: 400 };
    var read = { color: MOCK.coral, opacity: 1, fontWeight: 700 };
    var hidden = { opacity: 0, transform: "translateY(0.25em)" };
    var shown = { opacity: 1, transform: "translateY(0)" };
    var out = [timeline($(".mock", root), length, [[0, { opacity: 1 }], [outAt, { opacity: 0 }], [length - 400, { opacity: 1 }]], 400)];
    $$(".mock-word", root).forEach(function (word, i) {
      out.push(timeline(word, length, [[0, unread], [readAt[i], read], [reset, unread]], 140));
    });
    out.push(timeline($(".mock-tell", root), length, [[0, shown], [litAt + 500, hidden], [reset, shown]], 260));
    out.push(timeline($(".mock-reply", root), length, [[0, hidden], [litAt + 900, shown], [reset, hidden]], 320));
    out.push(timeline($(".mock-turn", root), length, [[0, hidden], [turnAt, shown], [reset, hidden]], 300));
    // The listening dot beats while the app waits for the line, and rests once it is read.
    var beat = { transform: "scale(1.6)", opacity: 1 };
    var still = { transform: "scale(1)", opacity: 1 };
    out.push(timeline($(".mock-ear", root), length, [
      [0, still], [turnAt + 250, beat], [turnAt + 500, still],
      [readAt[0] + 250, beat], [readAt[0] + 500, still],
      [readAt[1] + 250, beat], [readAt[1] + 500, still],
      [readAt[2] + 250, beat], [readAt[2] + 500, still],
      [litAt, { transform: "scale(1)", opacity: 0.4 }], [reset, still]
    ], 230, "ease-in-out"));
    [$(".guides-lit"), $(".guide-scene-lit", root)].forEach(function (el) {
      out.push(timeline(el, length, [[0, { opacity: 0 }], [litAt, { opacity: 1 }], [length - 1300, { opacity: 0 }]], 900, "ease-in-out"));
    });
    [$(".guides-bloom"), $(".guide-scene-bloom", root)].forEach(function (el) {
      if (!el) return;
      var flash = el.animate([
        { offset: 0, opacity: 0 },
        { offset: litAt / length, opacity: 0, easing: "ease-out" },
        { offset: (litAt + 380) / length, opacity: 1, easing: "ease-in-out" },
        { offset: (litAt + 2200) / length, opacity: 0 },
        { offset: 1, opacity: 0 }
      ], { duration: length, iterations: Infinity });
      flash.pause();
      out.push(flash);
    });
    // `translate`, not `transform`: the stylesheet moves the figure into place with transform.
    out.push(timeline($(".guide-figure", root), length, [
      [0, { translate: "0 0" }], [litAt + 250, { translate: "0 -7%" }], [litAt + 470, { translate: "0 0" }]
    ], 220, "cubic-bezier(0.3, 0, 0.3, 1)"));
    // The child reading the line (child-reading.mp4, 5.2s, cut to this scene:
    // the child reads for 3s, smiles, and looks up at 4.15s, as the rabbit
    // answers; see README). It then holds its last frame until the page fades.
    out.push(childClip($(".mock-child video", root), length, out[0]));
    return out;
  }

  // Plays a video in step with a scene. It stands in the scene's list beside
  // the animations and answers to the same calls (currentTime, play, pause,
  // cancel). Each time the scene comes round (read off `clock`, one of the
  // scene's animations) the clip goes back to its start and plays once; that
  // moment is unseen, the child's turn having faded out before it.
  function childClip(video, length, clock) {
    if (!video || !video.play || !clock) return null;
    var timer = 0;
    video.muted = true;
    function start() {
      window.clearTimeout(timer);
      // Back to the start. A server that cannot seek leaves the time where it
      // was; loading the clip again starts it over all the same.
      if (video.currentTime > 0.05) {
        try { video.currentTime = 0; } catch (e) { /* not seekable */ }
        if (video.currentTime > 0.05) video.load();
      }
      var played = video.play();
      if (played && played.catch) played.catch(function () {});
      var at = Number(clock.currentTime) || 0;
      timer = window.setTimeout(start, Math.max(60, length - (at % length)));
    }
    function stop() {
      window.clearTimeout(timer);
      video.pause();
    }
    return {
      currentTime: 0,
      play: start,
      pause: stop,
      // Reduced motion asked for mid-visit: back to the still (the poster).
      cancel: function () { stop(); video.load(); }
    };
  }

  // Writing: a callback. The swallow's ask is standing; the child writes
  // "up" on the blank pad (a u in one stroke, a p in two) and taps Done, and
  // the swallow answers. Nothing flies, and the swallow does not move.
  function writingScene(root) {
    var length = 8600;
    var strokes = [{ at: 900, dur: 1250 }, { at: 2450, dur: 600 }, { at: 3200, dur: 950 }];
    var doneAt = 4750;      // Done is tapped
    var replyAt = 5100;     // the swallow answers
    var out = [fadeLoop($(".mock", root), length)];
    $$(".mock-stroke", root).forEach(function (stroke, i) {
      var s = strokes[i];
      if (s) out.push(timeline(stroke, length, [[0, { strokeDashoffset: 1.04 }], [s.at, { strokeDashoffset: 0 }]], s.dur, "ease-in-out"));
    });
    out.push(press($(".mock-btn", root), length, doneAt, MOCK.blueTint));
    out.push(timeline($(".mock-ask", root), length, [[0, { opacity: 1 }], [replyAt, { opacity: 0 }]], 250));
    out.push(timeline($(".mock-beat", root), length, [[0, { opacity: 0 }], [replyAt + 250, { opacity: 1 }]], 300));
    return out;
  }

  // Math: three acorns are in the tray and it needs five. Two are slid in
  // from the pile, one at a time, and each one's count comes up as it lands.
  // Two are left behind. Then Go, the squirrel's answer, and in Go's place the
  // note the parent gets. The squirrel does not move.
  function mathScene(root) {
    var length = 11200;
    var tapAt = [1500, 3000];   // each acorn is picked up
    var slide = 620;            // how long it takes to slide in
    var goAt = 4500;            // Go is tapped
    var beatAt = 4900;          // the squirrel answers
    var noteAt = 6000;          // the parent's note takes Go's place
    var out = [fadeLoop($(".mock", root), length)];
    var movers = $$(".mock-acorn-move", root);
    var taps = $$(".mock-tap", root);
    var counts = $$(".mock-count", root);
    tapAt.forEach(function (at, i) {
      var el = movers[i];
      if (!el) return;
      // It stands where it lands; data-dx and data-dy are how far back its
      // place in the pile is, in the bench's units. Its box is 10 units
      // square, so a unit is 10% of it.
      var from = "translate(" + (Number(el.getAttribute("data-dx")) || 0) * 10 + "%, " + (Number(el.getAttribute("data-dy")) || 0) * 10 + "%)";
      out.push(timeline(el, length, [[0, { transform: from }], [at, { transform: "translate(0%, 0%)" }]], slide, "cubic-bezier(0.3, 0, 0.2, 1)"));
      out.push(timeline(taps[i], length, [
        [0, { opacity: 0, transform: "scale(0.7)" }],
        [at - 260, { opacity: 0.2, transform: "scale(1.1)" }],
        [at, { opacity: 0, transform: "scale(1.5)" }]
      ], 240));
      out.push(timeline(counts[i], length, [[0, { opacity: 0 }], [at + slide - 120, { opacity: 1 }]], 260));
    });
    var btn = $(".mock-btn", root);
    out.push(timeline(btn, length, [
      [0, { opacity: 1, transform: "scale(1)", backgroundColor: MOCK.canvas }],
      [goAt, { opacity: 1, transform: "scale(0.93)", backgroundColor: MOCK.amberTint }],
      [goAt + 180, { opacity: 1, transform: "scale(1)", backgroundColor: MOCK.canvas }],
      [noteAt - 300, { opacity: 0, transform: "scale(1)", backgroundColor: MOCK.canvas }]
    ], 150));
    out.push(timeline($(".mock-ask", root), length, [[0, { opacity: 1 }], [beatAt, { opacity: 0 }]], 250));
    out.push(timeline($(".mock-beat", root), length, [[0, { opacity: 0 }], [beatAt + 250, { opacity: 1 }]], 300));
    out.push(timeline($(".mock-note", root), length, [
      [0, { opacity: 0, transform: "translateY(0.5em)" }],
      [noteAt, { opacity: 1, transform: "translateY(0)" }]
    ], 480, "cubic-bezier(0.2, 0.8, 0.2, 1)"));
    return out;
  }

  // A button being tapped: it dips and tints for a moment.
  function press(el, length, at, tint) {
    var rest = { transform: "scale(1)", backgroundColor: MOCK.canvas };
    return timeline(el, length, [[0, rest], [at, { transform: "scale(0.93)", backgroundColor: tint }], [at + 180, rest]], 150);
  }

  var GUIDE_SCENES = { reading: readingScene, writing: writingScene, math: mathScene };

  function initGuides() {
    var section = $("#guides");
    if (!section || !window.matchMedia) return;
    var stage = $(".guides-stage", section);
    var guides = $$(".guide", section);
    if (!stage || !guides.length) return;
    var grounds = WORLD.on ? $$(".guides-ground", section) : []; // the paintings behind the section, in the guides' order
    var ground = -1;
    var count = guides.length;
    var motionMq = window.matchMedia("(prefers-reduced-motion: no-preference)");
    var pinMq = window.matchMedia("(prefers-reduced-motion: no-preference) and " + GUIDES.pinQuery);
    var canObserve = "IntersectionObserver" in window;

    var scenes = null;          // per guide: its list of animations, once built
    var playing = [];           // per guide: is its scene running
    var onScreen = [];          // per guide: is its scene on screen (plain layout)
    var sectionOnScreen = !canObserve;
    var pinned = false;
    var handoff = false;        // the section scrolls up over the pinned hero as the hero fades to white (HANDOFF)
    var revealed = -1;
    var arriving = false;       // the section is still on its way in over the hero
    var active = 0;
    var queued = false;

    function setPlaying(i, on) {
      if (!scenes || playing[i] === on) return;
      playing[i] = on;
      scenes[i].forEach(function (anim) {
        if (!anim) return;
        if (on) { anim.currentTime = 0; anim.play(); } else { anim.pause(); }
      });
    }
    // Which scenes should be running right now. In the world none runs until
    // the section has arrived: the hero's wash stands in for the first painting
    // until then, and it has no lantern to light.
    function syncPlayback() {
      var held = WORLD.on && handoff && arriving;
      guides.forEach(function (g, i) {
        setPlaying(i, !held && (pinned ? (sectionOnScreen && i === active) : !!onScreen[i]));
      });
    }
    // The painting behind the section (WORLD). Every painting up to the
    // current one is opaque, so a change is always one painting fading in or
    // out over the one before it, and the ground never thins out on the way.
    function setGround(i) {
      if (i === ground) return;
      ground = i;
      grounds.forEach(function (g, k) { g.classList.toggle("is-on", k <= i); });
    }
    // In the plain layout: the last guide whose row has come up past the
    // middle of the window.
    function guideInView() {
      var line = window.innerHeight * 0.6;
      var k = 0;
      guides.forEach(function (g, i) { if (g.getBoundingClientRect().top < line) k = i; });
      return k;
    }
    function setActive(i) {
      active = i;
      if (pinned) setGround(i);
      guides.forEach(function (g, k) {
        g.classList.toggle("is-active", k === i);
        var tab = $(".guide-tab", g);
        if (!tab) return;
        if (k === i) tab.setAttribute("aria-current", "step"); else tab.removeAttribute("aria-current");
        if (k !== i) g.style.removeProperty("--p");
      });
      syncPlayback();
    }

    // In the world the section fades in where it will stand: until it has
    // arrived its stage is held in the window (.is-arriving in css/styles.css),
    // out of the page's flow. Pinned, the section has a set height; in the
    // plain layout its height is the stage's, so that room is kept here.
    function holdRoom() {
      if (WORLD.on && handoff && !pinned) section.style.minHeight = stage.offsetHeight + "px";
      else section.style.removeProperty("min-height");
    }
    // Focus moving into the section while it is held there gives the browser
    // nothing to scroll to; go to where the section has arrived.
    section.addEventListener("focusin", function () {
      if (WORLD.on && handoff && section.classList.contains("is-arriving")) {
        window.scrollTo(0, Math.ceil(section.getBoundingClientRect().top + window.scrollY));
      }
    });

    // Pinned, the last --guides-cover svh of the section are the curriculum
    // sheet coming up over the stage (css/styles.css); the guides share the rest.
    var covered = -1;
    function coverRoom() {
      var svh = parseFloat(getComputedStyle(section).getPropertyValue("--guides-cover")) || 0;
      return pinned ? stage.offsetHeight * svh / 100 : 0;
    }
    function travel() { return section.offsetHeight - stage.offsetHeight - coverRoom(); }
    function render() {
      queued = false;
      var scrolled = -section.getBoundingClientRect().top;
      if (handoff) {
        // How far up the screen the section has come, 0 to 1. Its copy fades in
        // on the way, and it has no ground of its own until it has arrived:
        // the hero behind it is turning white meanwhile (css/styles.css).
        var hero = $("#hero-sequence .hero-stage");
        var screen = (hero && hero.offsetHeight) || window.innerHeight;
        var shown = Math.max(0, Math.min(1, 1 + scrolled / screen)).toFixed(3);
        if (shown !== revealed) {
          revealed = shown;
          section.style.setProperty("--reveal", shown);
          var onTheWay = parseFloat(shown) < 1;
          section.classList.toggle("is-arriving", onTheWay);
          if (onTheWay !== arriving) { arriving = onTheWay; syncPlayback(); }
        }
      }
      if (!pinned) {
        if (grounds.length) setGround(guideInView());
        return;
      }
      var dist = travel();
      var room = coverRoom();
      var cover = room > 0 ? Math.max(0, Math.min(1, (scrolled - dist) / room)).toFixed(3) : "0";
      if (cover !== covered) { covered = cover; section.style.setProperty("--cover", cover); }
      var done = dist > 0 ? Math.max(0, Math.min(1, scrolled / dist)) : 0;
      var pos = Math.min(done * count, count - 0.0001);
      var i = Math.floor(pos);
      if (i !== active) setActive(i);
      guides[i].style.setProperty("--p", (pos - i).toFixed(4));
    }
    function queue() {
      if (queued) return;
      queued = true;
      window.requestAnimationFrame(render);
    }

    // Choosing a guide from the list scrolls to its stretch of the section.
    guides.forEach(function (g, i) {
      var tab = $(".guide-tab", g);
      if (!tab) return;
      tab.addEventListener("click", function () {
        if (!pinned) return;
        var top = section.getBoundingClientRect().top + window.scrollY;
        window.scrollTo({ top: Math.round(top + travel() * i / count) + 2, behavior: "smooth" });
      });
    });

    if (canObserve) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { sectionOnScreen = entry.isIntersecting; });
        syncPlayback();
      }, { threshold: 0 }).observe(section);
      var sceneObserver = new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { onScreen[guides.indexOf(entry.target.closest(".guide"))] = entry.isIntersecting; });
        syncPlayback();
      }, { threshold: 0.2 });
      guides.forEach(function (g) {
        var visual = $(".guide-visual", g);
        if (visual) sceneObserver.observe(visual);
      });
    }

    function sync() {
      // Scenes animate only for people who have not asked for less motion;
      // otherwise the stills written in the HTML stand.
      if (motionMq.matches && !scenes && Element.prototype.animate) {
        scenes = guides.map(function (g) {
          var build = GUIDE_SCENES[g.getAttribute("data-guide")];
          return build ? build(g) : [];
        });
      } else if (!motionMq.matches && scenes) {
        scenes.forEach(function (list) { list.forEach(function (anim) { if (anim) anim.cancel(); }); });
        scenes = null;
        playing = [];
      }
      pinned = pinMq.matches;
      handoff = HANDOFF.on;
      section.classList.toggle("is-scrolly", pinned);
      section.classList.toggle("is-handoff", handoff);
      revealed = -1;
      if (!handoff) { section.style.removeProperty("--reveal"); section.classList.remove("is-arriving"); arriving = false; }
      holdRoom();
      if (pinned) {
        section.style.setProperty("--guides-travel", GUIDES.dwell * count);
        active = -1;
        render();
      } else {
        section.style.removeProperty("--guides-travel");
        section.style.removeProperty("--cover");
        covered = -1;
        setActive(0);
        render();
      }
      // The firefly settles on this section's heading; tell the hero it may have moved.
      document.dispatchEvent(new CustomEvent("ilumi:guides-layout"));
    }

    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    // The stage grows and shrinks with the window and when the web fonts arrive.
    if (WORLD.on && "ResizeObserver" in window) new ResizeObserver(holdRoom).observe(stage);
    [motionMq, pinMq].forEach(function (mq) {
      if (mq.addEventListener) mq.addEventListener("change", sync);
      else if (mq.addListener) mq.addListener(sync);
    });
    // The hero says when its handover starts or stops.
    document.addEventListener("ilumi:handoff", function () {
      if (HANDOFF.on !== handoff) sync();
    });
    sync();
  }

  /* ------------------------------------------------------------------ */
  /* Aligned to the curriculum                                            */
  /* ------------------------------------------------------------------ */
  // The path under the guides section. Unlike the guides' scenes this one is
  // not a timeline of keyframes: it has a state (which subject, which
  // curriculum, which step each path is on, whether its slip is up), `render`
  // writes that state onto the markup, and the stylesheet's transitions do
  // the moving ("Aligned to the curriculum" in css/styles.css). `play` is only
  // a list of moments at which the state changes. So a visitor's click on a
  // switch and the scene playing by itself go through the same door.
  //
  // One run, for one subject: the line draws, the spark lights the steps up to
  // the path's data-land, the slip comes up in the visitor's own curriculum,
  // the switch goes over to the other one and the codes change (same step,
  // same child), the next step lights, and the path blinks out. The next run
  // is the next subject. A switch someone has touched is theirs from then on:
  // the scene goes on playing but leaves that switch alone.
  var STANDARDS = {
    fade: 450,    // the path blinks out, unseen, before a run
    draw: 700,    // the line draws before the first step lights
    step: 460,    // from one step lighting to the next
    note: 650,    // the spark has landed: the slip comes up
    read: 2400,   // the slip stands in the visitor's own curriculum
    other: 2600,  // and then in the other one
    next: 3200,   // the next step lights, and holds until the run ends
    // What a curriculum calls one of its lines, for one code and for several.
    // The app prints "Covers Common Core RF.1.3.a"; the page adds the noun,
    // so a parent can tell the code is a line in a document.
    names: { us: ["Common Core standard", "Common Core standards"], on: ["Ontario expectation", "Ontario expectations"] }
  };

  // Which curriculum a visitor starts on: Ontario's if their browser says
  // Canada (a -CA language, or a Canadian time zone), the Common Core
  // otherwise. Read from the browser's own settings; nothing is looked up or
  // kept. It only picks which of the two shows first, and the switch is there
  // for everyone it gets wrong. Country is as far as it can honestly go (a
  // time zone cannot tell Ontario from Quebec), which is why the page never
  // says where it thinks anyone is.
  var CANADA_ZONES = /^(?:Canada\/.+|America\/(?:Toronto|Montreal|Vancouver|Edmonton|Winnipeg|Halifax|St_Johns|Regina|Moncton|Whitehorse|Yellowknife|Iqaluit|Rankin_Inlet|Cambridge_Bay|Inuvik|Dawson|Dawson_Creek|Fort_Nelson|Glace_Bay|Goose_Bay|Swift_Current|Resolute|Thunder_Bay|Nipigon|Rainy_River|Atikokan|Blanc-Sablon|Creston|Pangnirtung))$/;
  function homeCurriculum() {
    try {
      var langs = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || ""];
      for (var i = 0; i < langs.length; i++) if (/-CA$/i.test(langs[i])) return "on";
      if (CANADA_ZONES.test(Intl.DateTimeFormat().resolvedOptions().timeZone || "")) return "on";
    } catch (e) { /* no Intl: the default stands */ }
    return "us";
  }

  // Changes a piece of the slip's text. With `roll` the old text lifts away
  // and the new comes up from under it; otherwise it is simply written. If the
  // text changes again while the old one is still leaving, the newest wins.
  function swapText(el, text, roll) {
    if (!el) return;
    if (el._to === undefined) el._to = el.textContent;
    if (el._to === text) return;
    el._to = text;
    if (!roll || !el.animate) {
      if (el._roll) { el._roll.cancel(); el._roll = null; }
      el.textContent = text;
      return;
    }
    if (el._roll) return;
    el._roll = el.animate(
      [{ opacity: 1, transform: "translateY(0)" }, { opacity: 0, transform: "translateY(-0.4em)" }],
      { duration: 170, easing: "ease-in", fill: "forwards" }
    );
    el._roll.onfinish = function () {
      el._roll.cancel();
      el._roll = null;
      el.textContent = el._to;
      el.animate(
        [{ opacity: 0, transform: "translateY(0.4em)" }, { opacity: 1, transform: "translateY(0)" }],
        { duration: 280, easing: "cubic-bezier(0.2, 0.8, 0.2, 1)" }
      );
    };
  }

  function initStandards() {
    var section = $("#curriculum");
    if (!section) return;
    var visual = $(".standards-visual", section);
    var buttons = $$(".seg-btn", section);
    var paths = {};
    var subjects = [];
    $$(".path", section).forEach(function (el) {
      var name = el.getAttribute("data-subject");
      var land = Number(el.getAttribute("data-land")) || 1;
      subjects.push(name);
      paths[name] = {
        el: el,
        steps: $$(".path-step", el),
        land: land,           // the step the spark stops on
        says: $('[data-slip="says"]', el),
        grade: $('[data-slip="grade"]', el),
        cites: $('[data-slip="cites"]', el),
        codes: $('[data-slip="codes"]', el),
        // What the markup shows, the finished still: one past the landing,
        // line drawn, slip up.
        at: land + 1, drawn: true, noted: true, faded: false
      };
    });
    if (!visual || !subjects.length) return;

    var home = homeCurriculum();
    var state = { subject: section.getAttribute("data-subject") || subjects[0], curriculum: home };
    if (!paths[state.subject]) state.subject = subjects[0];
    var auto = { subject: true, curriculum: true };   // may the scene still move this switch
    var motionMq = window.matchMedia ? window.matchMedia("(prefers-reduced-motion: no-preference)") : null;
    var onScreen = !("IntersectionObserver" in window);
    var moving = false;
    var unseen = false;   // no path has been shown yet: the first run has nothing to blink out
    var timers = [];

    function motion() { return !!(motionMq && motionMq.matches); }

    function render() {
      section.setAttribute("data-subject", state.subject);
      section.setAttribute("data-curriculum", state.curriculum);
      buttons.forEach(function (btn) {
        var on = btn.getAttribute("data-subject") === state.subject || btn.getAttribute("data-curriculum") === state.curriculum;
        btn.setAttribute("aria-pressed", on ? "true" : "false");
      });
      subjects.forEach(function (name) {
        var p = paths[name];
        var showing = name === state.subject;
        p.el.classList.toggle("is-on", showing);
        p.el.classList.toggle("is-faded", p.faded);
        p.el.classList.toggle("is-drawn", p.drawn);
        p.el.classList.toggle("is-lit", p.at > 0);
        p.el.classList.toggle("is-noted", p.noted);
        p.el.style.setProperty("--at", p.at);
        p.steps.forEach(function (step, i) {
          step.classList.toggle("is-done", i + 1 < p.at);
          step.classList.toggle("is-current", i + 1 === p.at);
          if (i + 1 === p.at) step.setAttribute("aria-current", "step"); else step.removeAttribute("aria-current");
        });
        // The slip says what the current step is. A step with nothing to say
        // (none is ever landed on) leaves it as it was.
        var step = p.steps[p.at - 1];
        if (!step || !step.hasAttribute("data-says")) return;
        var roll = motion() && showing && p.noted && !p.faded;
        var codes = step.getAttribute("data-" + state.curriculum) || "";
        swapText(p.says, step.getAttribute("data-says"), roll);
        // The grade in the curriculum's own words, where they differ
        // (Ontario: Senior Kindergarten for Kindergarten).
        swapText(p.grade, step.getAttribute("data-grade-" + state.curriculum) || step.getAttribute("data-grade"), roll);
        swapText(p.cites, codes ? "Covers " + STANDARDS.names[state.curriculum][codes.indexOf(",") === -1 ? 0 : 1] : "", roll);
        swapText(p.codes, codes, roll);
      });
    }

    function stop() {
      timers.forEach(function (id) { window.clearTimeout(id); });
      timers = [];
    }
    function at(ms, change) {
      timers.push(window.setTimeout(function () { change(); render(); }, ms));
    }

    // One run of the current subject's path, then the next run.
    function play() {
      stop();
      var S = STANDARDS;
      var p = paths[state.subject];
      var other = home === "us" ? "on" : "us";
      // The first run starts from nothing, so it comes in at once.
      var t = unseen ? 0 : S.fade;
      unseen = false;
      p.faded = true;
      render();
      // Unseen: back to the start, without the transitions running backwards.
      at(t, function () {
        p.el.classList.add("is-instant");
        p.at = 0; p.drawn = false; p.noted = false;
        if (auto.curriculum) state.curriculum = home;
      });
      t += 60;
      at(t, function () {
        void p.el.offsetWidth;
        p.el.classList.remove("is-instant");
        p.faded = false; p.drawn = true;
      });
      t += S.draw;
      for (var k = 1; k <= p.land; k++) {
        at(t, (function (k) { return function () { p.at = k; }; })(k));
        t += S.step;
      }
      t += S.note - S.step;
      at(t, function () { p.noted = true; });
      t += S.read;
      if (auto.curriculum) {
        at(t, function () { if (auto.curriculum) state.curriculum = other; });
        t += S.other;
      }
      at(t, function () { p.at = p.land + 1; });
      t += S.next;
      at(t, function () {
        if (auto.subject) state.subject = subjects[(subjects.indexOf(state.subject) + 1) % subjects.length];
        play();
      });
    }

    // The finished still: what reduced motion gets, in the visitor's curriculum.
    function still() {
      stop();
      unseen = false;
      subjects.forEach(function (name) {
        var p = paths[name];
        p.at = p.land + 1; p.drawn = true; p.noted = true; p.faded = false;
      });
      render();
    }

    // The scene plays only while it is on screen, in a tab that is showing,
    // for people who have not asked for less motion.
    function sync() {
      if (!motion()) { moving = false; still(); return; }
      var want = onScreen && !document.hidden;
      if (want && !moving) { moving = true; play(); }
      else if (!want && moving) { moving = false; stop(); }
    }

    buttons.forEach(function (btn) {
      btn.disabled = false;
      btn.addEventListener("click", function () {
        var subject = btn.getAttribute("data-subject");
        var curriculum = btn.getAttribute("data-curriculum");
        if (curriculum) {
          auto.curriculum = false;
          home = curriculum;
          state.curriculum = curriculum;
          render();
        } else if (subject && paths[subject]) {
          auto.subject = false;
          if (subject === state.subject) return;
          state.subject = subject;
          if (moving) play(); else render();
        }
      });
    });

    // Before anyone has seen it, with motion: every path at its start and
    // out of sight, so the first run draws from nothing.
    if (motion()) {
      subjects.forEach(function (name) {
        var p = paths[name];
        p.el.classList.add("is-instant");
        p.at = 0; p.drawn = false; p.noted = false; p.faded = true;
      });
      unseen = true;
      render();
      void section.offsetWidth;
      subjects.forEach(function (name) { paths[name].el.classList.remove("is-instant"); });
    }

    // It starts as soon as the top of the path shows (the grades over it), so
    // the path is there by the time the visitor has scrolled down to it.
    if ("IntersectionObserver" in window) {
      new IntersectionObserver(function (entries) {
        entries.forEach(function (entry) { onScreen = entry.isIntersecting; });
        sync();
      }, { threshold: 0.1 }).observe($(".standards-paths", visual) || visual);
    }
    document.addEventListener("visibilitychange", sync);
    if (motionMq) {
      if (motionMq.addEventListener) motionMq.addEventListener("change", sync);
      else if (motionMq.addListener) motionMq.addListener(sync);
    }
    sync();
  }

  /* ---------- The why ----------
     The markup is the finished still: the note, written in full. With
     motion allowed, and only if the note starts out below the window, it is
     hidden (.is-waiting) and written in once
     when it comes into view (.is-revealing carries the transitions; the
     timings are --d on the rows in index.html and "The why" in
     css/styles.css). It plays once. A page reloaded part-way down, reduced
     motion and no JS keep the still. How the section comes in is not here:
     that is data-fade on its panel (initFades, below). */
  function initWhy() {
    var section = $("#the-why");
    var visual = section && $(".why-visual", section);
    if (!visual || !("IntersectionObserver" in window) || !window.matchMedia) return;
    if (!window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
    if (visual.getBoundingClientRect().top < window.innerHeight) return;

    section.classList.add("is-waiting");
    var observer = new IntersectionObserver(function (entries) {
      var seen = entries.some(function (entry) { return entry.isIntersecting; });
      if (!seen) return;
      observer.disconnect();
      section.classList.add("is-revealing");
      section.classList.remove("is-waiting");
    }, { threshold: 0.3 });
    observer.observe(visual);
  }

  /* ---------- The birds over the why ----------
     The app's meadow birds (src/components/meadowMotion.ts there, birdPose),
     crossing the dark panel behind the writing. As in the app, where a bird
     is depends only on the clock: it crosses in a straight line at a height
     of its own, tilted a little, with a slow bob, its two wing frames
     swapped a few times a second. Unlike the app, they fly both ways (a
     bird turns round after every crossing) and use the whole height of the
     panel, not just the top of the sky, and the far ones are smaller,
     slower and fainter.

     A bird marked `clear` keeps out of the writing: each of its crossings
     goes either above the text or below it (main.js measures where the
     head, the note and the four lines are), never across it, so nothing
     moves behind what someone is reading. If neither strip has room for
     it, it sits that crossing out.

     The clock runs only while the panel is on screen in a tab that is
     showing, for people who have not asked for less motion; otherwise there
     are no birds at all, and their pictures are not even loaded. */
  var BIRDS = {
    size: [34, 0.034, 50],    // the nearest bird's width: least, share of the panel's width, most (px)
    band: [0.07, 0.93],       // the heights they fly between, as shares of the panel's height
    bob: 5,                   // px up and down as it flies
    tilt: 0.035,              // how far a crossing may climb or sink, as a share of the panel's height
    // Each bird: its picture, when its first crossing starts (s), how long
    // from one crossing to the next (s; they share no common multiple, so the
    // sky never repeats), its speed (px a second), wing frames a second, where
    // in the band it starts (0 to 1), its size against the nearest, and how
    // strongly it shows. `clear`: it flies above or below the text, never
    // across it (see above).
    flock: [
      { art: "blue",  start: 0.8,  every: 29, speed: 96, flap: 7,   from: 0.12, scale: 1,    dim: 0.78 },
      { art: "brown", start: 5.5,  every: 37, speed: 80, flap: 6.2, from: 0.62, scale: 0.82, dim: 0.66, clear: true },
      { art: "blue",  start: 12.5, every: 43, speed: 60, flap: 6.6, from: 0.38, scale: 0.6,  dim: 0.46, clear: true },
      { art: "brown", start: 20,   every: 53, speed: 70, flap: 5.8, from: 0.85, scale: 0.7,  dim: 0.54 }
    ],
    aspect: { blue: 309 / 216, brown: 294 / 224 }, // height over width of the pictures in assets/birds/
    margin: 18                // px a `clear` bird keeps from the text, besides its own size and bob
  };
  var GOLDEN_STEP = 0.6180339887; // stepping by this never lands near the step before

  function birdHash(seed) {
    var x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  // Where bird `i` is at `t` seconds, in a panel `w` by `h`: null between
  // crossings, else its middle, its lean, which way it faces and its wings.
  // `text` is the top and foot of the writing in the panel, in px from its
  // top (or null), for the birds that keep clear of it.
  function birdPose(i, t, w, h, text) {
    var b = BIRDS.flock[i];
    var local = t - b.start;
    if (local < 0) return null;
    var cycle = Math.floor(local / b.every);
    var width = Math.max(BIRDS.size[0], Math.min(BIRDS.size[2], BIRDS.size[1] * w)) * b.scale;
    var travel = w + 2 * width;
    var cross = Math.max(6, Math.min(b.every - 3, travel / b.speed));
    var u = (local - cycle * b.every) / cross;
    if (u >= 1) return null;

    // One way, then back the other. The art faces right.
    var direction = (i + cycle) % 2 === 0 ? 1 : -1;
    // Each crossing well above or well below the one before, never settling.
    var walk = cycle * GOLDEN_STEP + b.from + (birdHash(i * 53 + cycle * 11 + 2) - 0.5) * 0.12;
    var altitude = walk - Math.floor(walk);
    var tilt = (birdHash(i * 53 + cycle * 11 + 3) - 0.5) * 2 * BIRDS.tilt * h;
    var top = BIRDS.band[0] * h, room = (BIRDS.band[1] - BIRDS.band[0]) * h;
    if (b.clear && text) {
      // Half the bird's height, its bob and the most it climbs or sinks
      // either side of its middle, kept off the text on top of the margin.
      var reach = width * BIRDS.aspect[b.art] / 2 + BIRDS.bob * b.scale + Math.abs(tilt) / 2 + BIRDS.margin;
      var strips = [
        [top + reach, text[0] - reach],     // above the writing
        [text[1] + reach, top + room - reach] // below it
      ].filter(function (s) { return s[1] >= s[0]; });
      if (!strips.length) return null;
      // Above or below by turns, starting where `from` says.
      var strip = strips[(cycle + (b.from < 0.5 ? 0 : 1)) % strips.length];
      top = strip[0];
      room = strip[1] - strip[0];
    }
    var beat = 2 * Math.PI * 0.55 * t + i;
    return {
      width: width,
      x: direction > 0 ? -width + travel * u : w + width - travel * u,
      y: top + room * altitude + tilt * (u - 0.5) + BIRDS.bob * b.scale * Math.sin(beat),
      rotate: direction * (-3 + 3 * Math.sin(beat + 1.2)),
      direction: direction,
      down: Math.floor(t * b.flap) % 2 === 1
    };
  }

  function initWhyBirds() {
    var panel = $("#the-why .why-panel");
    var layer = panel && $(".why-birds", panel);
    if (!layer || !window.matchMedia || !window.requestAnimationFrame || !("IntersectionObserver" in window)) return;
    var motionMq = window.matchMedia("(prefers-reduced-motion: no-preference)");
    var birds = null;     // built the first time they are wanted
    var onScreen = false;
    var running = false;
    var clock = 0;        // seconds the birds have been flying; it stops while they are not seen
    var last = 0;
    var w = 0, h = 0;
    var text = null;      // [top, foot] of the writing, in px from the layer's top
    var writing = [".why-head", ".why-note", ".why-points"].map(function (sel) { return $(sel, panel); }).filter(Boolean);

    function build() {
      birds = BIRDS.flock.map(function (b) {
        var el = document.createElement("span");
        el.className = "why-bird";
        el.style.setProperty("--dim", b.dim);
        ["up", "down"].forEach(function (frame) {
          var img = document.createElement("img");
          img.alt = "";
          img.decoding = "async";
          img.src = "assets/birds/bird-" + b.art + "-" + frame + ".webp";
          el.appendChild(img);
        });
        layer.appendChild(el);
        return { el: el, aspect: BIRDS.aspect[b.art], shown: false, down: false, width: 0 };
      });
    }
    function measure() {
      w = layer.clientWidth; h = layer.clientHeight;
      // The panel may be part-way through growing into place (initFades),
      // so screen px are turned back into the layer's own.
      var box = layer.getBoundingClientRect(), k = box.height ? h / box.height : 1;
      var lo = Infinity, hi = -Infinity;
      writing.forEach(function (el) {
        var r = el.getBoundingClientRect();
        if (!r.height) return;
        lo = Math.min(lo, (r.top - box.top) * k);
        hi = Math.max(hi, (r.bottom - box.top) * k);
      });
      text = lo < hi ? [lo, hi] : null;
    }
    function hide(bird) {
      if (!bird.shown) return;
      bird.shown = false;
      bird.el.style.visibility = "hidden";
    }
    function frame(now) {
      if (!running) return;
      clock += Math.min(0.1, Math.max(0, (now - last) / 1000));
      last = now;
      birds.forEach(function (bird, i) {
        var p = w && h ? birdPose(i, clock, w, h, text) : null;
        if (!p) { hide(bird); return; }
        if (p.width !== bird.width) { bird.width = p.width; bird.el.style.width = p.width.toFixed(1) + "px"; }
        if (p.down !== bird.down) { bird.down = p.down; bird.el.classList.toggle("is-down", p.down); }
        bird.el.style.transform = "translate(" + (p.x - p.width / 2).toFixed(1) + "px, " + (p.y - p.width * bird.aspect / 2).toFixed(1) + "px) rotate(" + p.rotate.toFixed(2) + "deg) scaleX(" + p.direction + ")";
        if (!bird.shown) { bird.shown = true; bird.el.style.visibility = "visible"; }
      });
      window.requestAnimationFrame(frame);
    }
    function sync() {
      var want = motionMq.matches && onScreen && !document.hidden;
      if (want && !running) {
        if (!birds) build();
        measure();
        running = true;
        last = performance.now();
        window.requestAnimationFrame(frame);
      } else if (!want && running) {
        running = false;
        if (!motionMq.matches) birds.forEach(hide);
      }
    }

    new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) { onScreen = entry.isIntersecting; });
      sync();
    }, { threshold: 0 }).observe(panel);
    if ("ResizeObserver" in window) {
      var watch = new ResizeObserver(measure);
      watch.observe(layer);
      writing.forEach(function (el) { watch.observe(el); });
    }
    else window.addEventListener("resize", measure);
    document.addEventListener("visibilitychange", sync);
    if (motionMq.addEventListener) motionMq.addEventListener("change", sync);
    else if (motionMq.addListener) motionMq.addListener(sync);
  }

  /* ---------- Grows ----------
     "More than a tutor", the section after the why. Its markup is the
     finished still (a painting, the writing in its sky). On a wide window
     this pins it and the why section together and ties the change from one
     to the other to the scroll, nothing on a timer but the flicker of the
     star and the stars:

       1. the star beside "The note" flies loose, trailing a thread of light,
          to where the child and the rabbit sit in the painting, while the
          night comes over the why panel's writing, with stars and clouds;
       2. it opens into a circle of daylight on the two of them, and the
          heading comes in beside it, in the night's ink;
       3. the circle grows, the painting coming closer inside it, until the
          whole painting stands; the words turn to ink as the light passes;
       4. the lede, the three lines, the link and the two strips arrive.

     How it is pinned is at "Pinned" under "Grows" in the stylesheet: this
     section's panel lies exactly on the why panel, and both stick. All of it
     is worked out from where the page is, so scrolling back undoes it.

     Phones, short windows (the why panel taller than the window), reduced
     motion and browsers without CSS masks keep the still, and there the two
     panels change over with data-fade (initFades skips a pinned panel).

     Every position is a share of the way through (0 to 1); the still is
     complete at `done` of the track and the rest of it is rest. */
  var GROWS = {
    pinQuery: "(min-width: 1000px) and (min-height: 600px)",
    lead: 0.25,              // screens of scroll the why panel stands still, pinned, before any of it starts (room to take in the whole panel)
    track: 2.6,              // screens of scroll the whole change takes, after the lead
    hold: 0.2,               // the share of it the why panel stays put for (the night must be over it by then: `gone`)
    done: 0.9,               // the share by which everything stands
    art: [1672, 941],        // the painting's own size
    pair: [0.233, 0.648],    // the middle of the child and the rabbit in it: where the light opens
    focusY: 0.7,             // object-position's y in the stylesheet, for a window wider than the painting
    gone: [0.01, 0.13],      // the night comes over the why panel
    flight: [0, 0.21],       // the star flies
    trail: 0.3,              // how much of the way the thread of light covers
    trailOut: [0.2, 0.27],
    starSize: [1, 3.5, 3.3], // beside "The note"; more by the end of the flight; more again as it opens
    open: [0.27, 0.36],      // the star opens into the light
    portrait: [0.36, 0.52],  // the circle round the two of them
    rest: [0.52, 0.62],      // it nearly holds, while the heading's second line comes
    grow: [0.62, 0.9],       // it grows to the whole painting
    radii: [44, 100, 22],    // px the circle gains in open, portrait and rest, in a panel 868px tall
    zoom: [0.5, 0.06, 0.04], // the painting's size inside the circle at first, and what portrait and rest add (it ends at 1)
    rimOut: [0.72, 0.86],
    cloudsIn: [0.08, 0.3],
    cloudsOut: [0.66, 0.84],
    // each cloud: its angle round the light, how far out it rests and its width (px in a panel 868px tall), its picture, its strength
    clouds: [
      { a: 200, d: 250, w: 330, n: 1, k: 0.8 }, { a: 335, d: 235, w: 260, n: 2, k: 0.75 },
      { a: 150, d: 330, w: 190, n: 3, k: 0.55 }, { a: 25, d: 300, w: 300, n: 4, k: 0.6 },
      { a: 262, d: 300, w: 240, n: 2, k: 0.5 }, { a: 95, d: 270, w: 280, n: 1, k: 0.65 },
      { a: 350, d: 620, w: 360, n: 1, k: 0.5 }, { a: 20, d: 820, w: 250, n: 3, k: 0.45 }, { a: 318, d: 900, w: 300, n: 4, k: 0.4 }
    ],
    cloudShape: { 1: 419 / 758, 2: 343 / 464, 3: 251 / 258, 4: 174 / 544 }, // height over width of assets/grows/cloud-N.webp
    stars: 64,
    // when each piece of the writing comes in
    words: [
      [".grows-eyebrow", 0.36, 0.42],
      [".grows-title span:first-child", 0.38, 0.47],
      [".grows-title span:last-child", 0.54, 0.63],
      [".grows-lede", 0.84, 0.9],
      [".grows-points li:nth-child(1)", 0.86, 0.92],
      [".grows-points li:nth-child(2)", 0.88, 0.94],
      [".grows-points li:nth-child(3)", 0.9, 0.96],
      [".grows-more", 0.93, 0.98],
      [".grows-say-rabbit", 0.9, 0.95],
      [".grows-say-child", 0.95, 1]
    ]
  };

  function initGrows() {
    var grows = $("#grows"), why = $("#the-why");
    if (!grows || !why || !window.matchMedia || !window.requestAnimationFrame) return;
    var whyStage = $(".why-stage", why), mark = $(".why-eyebrow-mark", why);
    var stage = $(".grows-stage", grows), panel = $(".grows-panel", grows), night = $(".grows-night", grows);
    var world = $(".grows-world", grows), painting = $(".grows-painting", grows), rim = $(".grows-rim", grows);
    var fly = $(".grows-fly", grows), trail = $(".grows-trail", grows);
    if (!whyStage || !mark || !stage || !panel || !night || !world || !painting || !rim || !fly || !trail) return;
    var inner = $(".grows-inner", world), trailPath = $("path", trail);
    var masks = window.CSS && CSS.supports && (CSS.supports("mask-image", "radial-gradient(#000, transparent)") || CSS.supports("-webkit-mask-image", "radial-gradient(#000, transparent)"));
    if (!inner || !trailPath || !masks) return;
    var mq = window.matchMedia("(prefers-reduced-motion: no-preference) and " + GROWS.pinQuery);

    var pinned = false, built = false, g = null, words = [], clouds = [], drawQueued = false, measureQueued = false, lastD = "";

    function clamp(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
    function seg(ab, x) { return clamp((x - ab[0]) / (ab[1] - ab[0])); }
    function ease(x) { return x * x * (3 - 2 * x); }
    function bez(t, a, c, b) { var u = 1 - t; return u * u * a + 2 * u * t * c + t * t * b; }

    // The night's own things, made once, and only where the section is ever
    // pinned: the stars, the clouds (so their pictures are not loaded
    // otherwise) and a second copy of the writing in the night's ink, which
    // nobody can reach or hear (the real one is in the painting).
    function build() {
      built = true;
      var seed = 7;
      function rnd() { seed = (seed * 16807) % 2147483647; return seed / 2147483647; }
      var starBox = $(".grows-stars", night), cloudBox = $(".grows-clouds", night);
      var spark = $("svg", mark);
      for (var i = 0; i < GROWS.stars; i++) {
        var x = rnd() * 100, y = rnd() * 100, el;
        if (i % 9 === 0 && spark) {
          el = spark.cloneNode(true);
          var h = 9 + rnd() * 8;
          el.style.width = (h * 0.74).toFixed(1) + "px"; el.style.height = h.toFixed(1) + "px";
        } else {
          el = document.createElement("i");
          var d = (1.2 + rnd() * 1.8).toFixed(1) + "px";
          el.style.width = d; el.style.height = d;
        }
        el.setAttribute("class", "grows-star");
        el.style.left = x.toFixed(2) + "%"; el.style.top = y.toFixed(2) + "%";
        el.style.setProperty("--t", (2.4 + rnd() * 3.4).toFixed(2) + "s");
        el.style.setProperty("--dl", (-rnd() * 5).toFixed(2) + "s");
        el.style.setProperty("--lo", (0.15 + rnd() * 0.3).toFixed(2));
        starBox.appendChild(el);
      }
      clouds = GROWS.clouds.map(function (c, n) {
        var box = document.createElement("div"), img = new Image();
        box.className = "grows-cloud";
        img.alt = ""; img.decoding = "async"; img.src = "assets/grows/cloud-" + c.n + ".webp";
        img.style.setProperty("--t", (13 + (n % 4) * 3) + "s");
        img.style.setProperty("--dl", (-n * 2.3) + "s");
        box.appendChild(img); cloudBox.appendChild(box);
        return box;
      });
      var twin = inner.cloneNode(true);
      $$("[id]", twin).forEach(function (el) { el.removeAttribute("id"); });
      $$("a", twin).forEach(function (el) { el.setAttribute("tabindex", "-1"); });
      twin.setAttribute("inert", "");
      night.appendChild(twin);
      words = GROWS.words.map(function (w) { return { els: $$(w[0], panel), at: [w[1], w[2]] }; });
    }

    // Back to the still: everything draw() and measure() wrote, taken off.
    function clear() {
      [night, world, painting, rim, fly, trailPath, panel].forEach(function (el) { el.removeAttribute("style"); });
      words.forEach(function (w) { w.els.forEach(function (el) { el.style.opacity = el.style.transform = ""; }); });
      stage.classList.remove("is-live");
      world.classList.remove("is-full");
      why.classList.remove("is-starless", "is-covered");
      [why, grows].forEach(function (el) { ["--grows-h", "--grows-top", "--grows-hold", "--grows-track"].forEach(function (v) { el.style.removeProperty(v); }); });
      g = null;
    }

    function measure() {
      measureQueued = false;
      var vh = window.innerHeight;
      // Only where the why panel fits the window whole: it has to stand still to be covered.
      var can = mq.matches && whyStage.offsetHeight <= vh + 2;
      if (can !== pinned) {
        pinned = can;
        why.classList.toggle("is-handing", can);
        grows.classList.toggle("is-pinned", can);
        if (!can) clear();
      }
      if (!pinned) return;
      if (!built) build();

      var h = whyStage.offsetHeight, top = Math.max(0, Math.round((vh - h) / 2)), track = GROWS.track * vh, lead = Math.round(GROWS.lead * vh);
      [why, grows].forEach(function (el) {
        el.style.setProperty("--grows-h", h + "px");
        el.style.setProperty("--grows-top", top + "px");
        el.style.setProperty("--grows-hold", lead + Math.round(GROWS.hold * track) + "px");
        el.style.setProperty("--grows-track", lead + Math.round(track) + "px");
      });

      // The painting covers the panel as object-fit: cover would, but as a
      // box of its own whole size, so that drawn smaller (inside the circle)
      // it shows more of itself and never an edge.
      var W = panel.clientWidth, H = panel.clientHeight;
      var k = Math.max(W / GROWS.art[0], H / GROWS.art[1]), iw = GROWS.art[0] * k, ih = GROWS.art[1] * k;
      var ox = 0, oy = (H - ih) * GROWS.focusY;
      var cx = ox + GROWS.pair[0] * iw, cy = oy + GROWS.pair[1] * ih;
      painting.style.left = ox.toFixed(1) + "px"; painting.style.top = oy.toFixed(1) + "px";
      painting.style.width = iw.toFixed(1) + "px"; painting.style.height = ih.toFixed(1) + "px";
      painting.style.transformOrigin = (cx - ox).toFixed(1) + "px " + (cy - oy).toFixed(1) + "px";
      panel.style.setProperty("--cx", cx.toFixed(1) + "px");
      panel.style.setProperty("--cy", cy.toFixed(1) + "px");
      trail.setAttribute("viewBox", "0 0 " + W + " " + H);
      var unit = H / 868;
      clouds.forEach(function (el, n) { el.style.width = (GROWS.clouds[n].w * unit).toFixed(0) + "px"; });
      // Where the mark beside "The note" is in this panel: the why panel
      // lies exactly under it. From the layout, not from what is on screen,
      // so a fade or a drift on the why panel cannot move it.
      var mx = mark.offsetWidth / 2 - panel.offsetLeft, my = mark.offsetHeight / 2 - panel.offsetTop;
      for (var el = mark; el && el !== whyStage; el = el.offsetParent) { mx += el.offsetLeft; my += el.offsetTop; }
      g = {
        top: top, lead: lead, track: track, W: W, H: H, cx: cx, cy: cy, unit: unit, from: [mx, my],
        edge: [cx - ox, cy - oy, ox + iw - cx, oy + ih - cy], // from the two of them to each edge of the painting
        room: [cx, cy, W - cx, H - cy],                        // and to each edge of the panel
        rmax: Math.sqrt(Math.pow(Math.max(cx, W - cx), 2) + Math.pow(Math.max(cy, H - cy), 2)) + 16
      };
      lastD = "";
      draw();
    }

    function draw() {
      drawQueued = false;
      if (!pinned || !g) return;
      var p = clamp((g.top - grows.getBoundingClientRect().top - g.lead) / g.track), q = clamp(p / GROWS.done);

      // 1. the night comes over the why panel
      var gone = ease(seg(GROWS.gone, q));
      night.style.opacity = gone.toFixed(3);
      stage.classList.toggle("is-live", gone >= 1);
      why.classList.toggle("is-starless", q > 0);
      // Once the night is over it the why panel is put out of sight: when it
      // lets go and scrolls away it would show in the paper round this panel.
      why.classList.toggle("is-covered", gone >= 1);

      // 2. the star: from the mark beside "The note" to the two of them
      var t = ease(seg(GROWS.flight, q)), open = seg(GROWS.open, q);
      var starOut = ease(seg([GROWS.open[0] + 0.03, GROWS.open[1] + 0.04], q));
      var a = g.from, c = [a[0] - g.W * 0.034, g.cy + g.H * 0.07];
      if (q > 0 && starOut < 1) {
        var size = GROWS.starSize[0] + GROWS.starSize[1] * t + GROWS.starSize[2] * ease(open);
        fly.style.transform = "translate(" + bez(t, a[0], c[0], g.cx).toFixed(1) + "px," + bez(t, a[1], c[1], g.cy).toFixed(1) + "px) scale(" + size.toFixed(3) + ")";
        fly.style.opacity = (1 - starOut).toFixed(3);
        fly.style.visibility = "visible";
      } else fly.style.visibility = "hidden";
      var d = "M" + a[0].toFixed(1) + " " + a[1].toFixed(1) + " Q" + c[0].toFixed(1) + " " + c[1].toFixed(1) + " " + g.cx.toFixed(1) + " " + g.cy.toFixed(1);
      if (d !== lastD) { trailPath.setAttribute("d", d); g.len = trailPath.getTotalLength(); lastD = d; }
      var head = g.len * t, tail = g.len * Math.max(0, t - GROWS.trail);
      trailPath.style.strokeDasharray = "0 " + tail.toFixed(1) + " " + (head - tail).toFixed(1) + " " + (g.len + 1).toFixed(1);
      trailPath.style.opacity = t > 0 ? (1 - seg(GROWS.trailOut, q)).toFixed(3) : "0";

      // 3. the light opens on the two of them and grows
      var g1 = ease(open), g2 = ease(seg(GROWS.portrait, q)), g3 = ease(seg(GROWS.rest, q)), g4 = ease(seg(GROWS.grow, q));
      var small = (GROWS.radii[0] * g1 + GROWS.radii[1] * g2 + GROWS.radii[2] * g3) * g.unit;
      var r = small + (g.rmax - (GROWS.radii[0] + GROWS.radii[1] + GROWS.radii[2]) * g.unit) * g4;
      var s = GROWS.zoom[0] + GROWS.zoom[1] * g2 + GROWS.zoom[2] * g3 + (1 - GROWS.zoom[0] - GROWS.zoom[1] - GROWS.zoom[2]) * g4;
      for (var i = 0; i < 4; i++) s = Math.max(s, Math.min(r, g.room[i]) / g.edge[i]); // never an edge of the painting inside the light
      s = Math.min(1, s);
      var full = q >= 1;
      world.classList.toggle("is-full", full);
      world.style.visibility = r < 1 ? "hidden" : "visible";
      panel.style.setProperty("--r", r.toFixed(1) + "px");
      painting.style.transform = full ? "" : "scale(" + s.toFixed(4) + ")";
      rim.style.left = (g.cx - r).toFixed(1) + "px"; rim.style.top = (g.cy - r).toFixed(1) + "px";
      rim.style.width = rim.style.height = (2 * r).toFixed(1) + "px";
      rim.style.opacity = r < 1 ? "0" : (1 - seg(GROWS.rimOut, q)).toFixed(3);

      // 4. the clouds come in round the star, ride the rim out and thin away
      var inn = ease(seg(GROWS.cloudsIn, q)), out = seg(GROWS.cloudsOut, q);
      clouds.forEach(function (el, n) {
        var cl = GROWS.clouds[n], rad = cl.a * Math.PI / 180, w = cl.w * g.unit;
        var far = Math.max(cl.d * g.unit, r * 1.04 + w * 0.18) + (1 - inn) * 520 * g.unit;
        el.style.transform = "translate(" + (g.cx + Math.cos(rad) * far * 1.25 - w / 2).toFixed(1) + "px," + (g.cy + Math.sin(rad) * far * 0.82 - w * GROWS.cloudShape[cl.n] / 2).toFixed(1) + "px)";
        el.style.opacity = (cl.k * inn * (1 - out)).toFixed(3);
      });

      // 5. the writing
      words.forEach(function (w) {
        var o = ease(seg(w.at, q));
        w.els.forEach(function (el) {
          el.style.opacity = o >= 1 ? "" : o.toFixed(3);
          el.style.transform = o >= 1 ? "" : "translateY(" + ((1 - o) * 14).toFixed(1) + "px)";
        });
      });
    }

    function queueDraw() { if (!drawQueued && pinned) { drawQueued = true; window.requestAnimationFrame(draw); } }
    function queueMeasure() { if (!measureQueued) { measureQueued = true; window.requestAnimationFrame(measure); } }

    window.addEventListener("scroll", queueDraw, { passive: true });
    window.addEventListener("resize", queueMeasure);
    window.addEventListener("load", queueMeasure);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(queueMeasure);
    if (mq.addEventListener) mq.addEventListener("change", queueMeasure);
    else if (mq.addListener) mq.addListener(queueMeasure);
    // The link is in the page from the start but stands only at the end:
    // keyboard focus moving to it scrolls to where it stands.
    world.addEventListener("focusin", function () {
      if (!pinned || !g) return;
      var top = grows.getBoundingClientRect().top, end = g.lead + g.track * GROWS.done;
      if (g.top - top < end) window.scrollTo(0, window.scrollY + top - g.top + end + 1);
    });
    measure();
  }

  /* ---------- Fades between sections ----------
     Any element with data-fade="in", "out" or "in out" fades with the
     scroll while the page goes on scrolling: in as its top comes up the
     window (from 95% of the way down to 70%), out as its foot goes up it
     (from 45% to 15%). data-fade-in="0.95 0.7" and data-fade-out="0.45 0.15"
     move the two windows, as shares of the window's height. Text and small
     blocks blur a little and drift as they go. data-fade-as="panel" is for a
     whole panel: no blur (a window-sized layer, and blurring that on every
     frame is heavy); it grows the last few
     percent into its place instead, from its top edge (give it
     transform-origin: 50% 0).

     The curriculum's content and the why section's panel use it together, as
     one change: the first fades out as its foot goes up the window and the
     second fades in right behind it. Change the two windows (data-fade-out
     on .standards-inner, data-fade-in on .why-panel) together. Tied to
     scroll, never a timer, and nothing ever stops the page; with reduced
     motion or no JS everything simply stands.

     The why panel and the grows panel after it use it the same way (the
     why panel is "in out"), but only where initGrows has not pinned them:
     there the change is that function's.

     The grows panel is "in out" too, and its way out is the one thing done
     here to a pinned panel: once the pin lets go of it and it starts up the
     window, the painting fades into the paper while the waitlist is written
     in under it. A pinned panel's foot never crosses the window while it
     stands, so its fade is measured from where it stood instead: by how far
     it has gone past its place, in window heights (data-fade-leave="0.03
     0.62": from there to there). data-fade-melt softens the foot as it goes
     (a mask that climbs the panel), so no edge is left standing in the
     fade; like the blur, that is for a mouse or trackpad only. */
  function initFades() {
    var els = $$("[data-fade]");
    if (!els.length || !window.matchMedia || !window.requestAnimationFrame) return;
    var motionMq = window.matchMedia("(prefers-reduced-motion: no-preference)");
    // The blur is for a mouse or trackpad: on a phone a whole section is one
    // tall layer, and blurring it on every frame of a flick is too much to ask.
    var soft = window.matchMedia("(pointer: fine)").matches;

    function pair(text, fallback) {
      var p = (text || "").trim().split(/\s+/).map(Number);
      return p.length === 2 && p[0] > p[1] && !isNaN(p[1]) ? p : fallback;
    }
    function span(text, fallback) {
      var p = (text || "").trim().split(/\s+/).map(Number);
      return p.length === 2 && p[1] > p[0] && !isNaN(p[0]) ? p : fallback;
    }
    function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
    function ease(x) { return x * x * (3 - 2 * x); }
    function still(it) {
      var s = it.el.style;
      s.opacity = s.filter = s.transform = "";
      if (it.melt) s.webkitMaskImage = s.maskImage = "";
      it.y = 0;
    }

    var items = els.map(function (el) {
      var modes = " " + el.getAttribute("data-fade") + " ";
      return {
        el: el,
        fadeIn: modes.indexOf(" in ") !== -1,
        fadeOut: modes.indexOf(" out ") !== -1,
        inAt: pair(el.getAttribute("data-fade-in"), [0.95, 0.7]),
        outAt: pair(el.getAttribute("data-fade-out"), [0.45, 0.15]),
        leaveAt: span(el.getAttribute("data-fade-leave"), [0.03, 0.62]),
        melt: el.hasAttribute("data-fade-melt"),
        panel: el.getAttribute("data-fade-as") === "panel",
        y: 0 // the drift last set, taken off again when measuring
      };
    });

    var queued = false;
    function update() {
      queued = false;
      var vh = window.innerHeight;
      var on = motionMq.matches;
      items.forEach(function (it) {
        var s = it.el.style;
        // A panel initGrows has pinned is that function's: it stands whole,
        // and all that is done to it here is the way out, if it has one.
        var pin = it.el.closest(".is-pinned");
        if (!on || (pin && !it.fadeOut)) { still(it); return; }
        var r = it.el.getBoundingClientRect();
        var top = r.top - it.y, bottom = r.bottom - it.y;
        var a, b;
        if (pin) {
          // Where it stands while stuck: its sticking parent's top, and its own place in that.
          var stuck = it.el.offsetParent;
          var gone = ((parseFloat(window.getComputedStyle(stuck).top) || 0) + it.el.offsetTop - top) / vh;
          a = 1;
          b = 1 - ease(clamp01((gone - it.leaveAt[0]) / (it.leaveAt[1] - it.leaveAt[0])));
        } else {
          a = it.fadeIn ? ease(clamp01((it.inAt[0] * vh - top) / ((it.inAt[0] - it.inAt[1]) * vh))) : 1;
          b = it.fadeOut ? ease(clamp01((bottom - it.outAt[1] * vh) / ((it.outAt[0] - it.outAt[1]) * vh))) : 1;
        }
        var o = Math.min(a, b);
        if (o > 0.999) { still(it); return; }
        s.opacity = o.toFixed(3);
        if (it.melt && soft) s.webkitMaskImage = s.maskImage = b < 0.999 ? "linear-gradient(to bottom, #000 " + (100 - (1 - b) * 85).toFixed(1) + "%, transparent)" : "";
        if (it.panel) {
          // Grown from the top edge, so the top (which is what is measured) only moves by the drift.
          it.y = (1 - a) * 44 - (1 - b) * 24;
          s.transform = "translateY(" + it.y.toFixed(1) + "px) scale(" + (1 - (1 - o) * 0.05).toFixed(4) + ")";
          return;
        }
        it.y = (1 - a) * 28 - (1 - b) * 20;
        if (soft) s.filter = "blur(" + ((1 - o) * 6).toFixed(2) + "px)";
        s.transform = "translateY(" + it.y.toFixed(1) + "px)";
      });
    }
    function queue() { if (!queued) { queued = true; window.requestAnimationFrame(update); } }

    window.addEventListener("scroll", queue, { passive: true });
    window.addEventListener("resize", queue);
    if (motionMq.addEventListener) motionMq.addEventListener("change", queue);
    else if (motionMq.addListener) motionMq.addListener(queue);
    update();
  }

  /* ---------- Waitlist ----------
     Two jobs.

     The reveal: the markup is the finished still. With motion allowed, and
     only if the section starts out below the window, it is hidden
     (.is-waiting) and written in once when the reader gets to it
     (.is-revealing carries the transitions; the order is --d on the pieces
     in index.html, the look is "Waitlist" in css/styles.css). A page
     reloaded part-way down, reduced motion and no JS keep the still.

     The form: it posts to its own action attribute (index.html), so there
     is one place to connect it and it still works with no JS. While that
     attribute is empty nothing is sent, and the form says so; it never says
     an address was taken when it was not. With an action it posts the
     fields in the background, form-encoded and asking for JSON back (what
     Netlify Forms, Formspree and the like accept), and on a yes the form
     gives way to .waitlist-done. What it has to say goes in
     .waitlist-status, which stands in for the three facts under the field.

     The lantern in the painting at the foot: the stylesheet brings it most
     of the way up while the reader is in the field or has written in it; .is-lit, set
     here with .waitlist-done, lights it. Nothing else may set .is-lit. */
  var WAITLIST = {
    line: 0.88, // the writing starts when a third of the heading block is above this share of the window's height
    email: /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
    says: {
      empty: "Add your email to join the waitlist.",
      wrong: "That doesn’t look like an email address.",
      unset: "The waitlist isn’t connected yet, so nothing was sent.",
      failed: "That didn’t go through. Please try again.",
      busy: "Joining…"
    }
  };

  function initWaitlist() {
    var section = $("#waitlist");
    var form = section && $("#waitlist-form", section);
    if (!form) return;
    var field = $(".waitlist-field", form), input = $("#waitlist-email", form), go = $(".waitlist-go", form);
    var label = $(".waitlist-go-label", form), status = $("#waitlist-status", section), done = $(".waitlist-done", section);
    var head = $(".waitlist-head", section);
    var resting = label.textContent, busy = false;

    if (head && "IntersectionObserver" in window && window.matchMedia &&
        window.matchMedia("(prefers-reduced-motion: no-preference)").matches &&
        head.getBoundingClientRect().top >= window.innerHeight) {
      section.classList.add("is-waiting");
      var observer = new IntersectionObserver(function (entries) {
        if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
        observer.disconnect();
        section.classList.add("is-revealing");
        section.classList.remove("is-waiting");
      }, { threshold: 0.33, rootMargin: "0px 0px -" + Math.round((1 - WAITLIST.line) * 100) + "% 0px" });
      observer.observe(head);
    }

    // The messages below are the page's own; without JS the browser's stand in.
    form.noValidate = true;

    function say(text, quiet) {
      status.textContent = text || "";
      status.classList.toggle("is-quiet", !!quiet);
      section.classList.toggle("has-status", !!text);
    }
    function refuse(text) {
      say(text);
      input.setAttribute("aria-invalid", "true");
      field.classList.remove("is-error");
      void field.offsetWidth; // so the shake starts again
      field.classList.add("is-error");
      input.focus();
    }
    function setBusy(on) {
      busy = on;
      go.disabled = on;
      input.readOnly = on;
      label.textContent = on ? WAITLIST.says.busy : resting;
    }
    function finish(email) {
      say("");
      $(".waitlist-done-email", done).textContent = email;
      form.hidden = true;
      done.hidden = false;
      // The painting's lantern lights: only here, where an address was really taken.
      section.classList.add("is-lit");
      // The button that had the focus is gone; this is also what reads the news out.
      done.focus({ preventScroll: true });
    }

    input.addEventListener("input", function () {
      if (!section.classList.contains("has-status")) return;
      say("");
      input.removeAttribute("aria-invalid");
      field.classList.remove("is-error");
    });

    form.addEventListener("submit", function (event) {
      var email = input.value.trim();
      var to = form.getAttribute("action");
      if (busy) { event.preventDefault(); return; }
      if (!email) { event.preventDefault(); refuse(WAITLIST.says.empty); return; }
      if (!WAITLIST.email.test(email)) { event.preventDefault(); refuse(WAITLIST.says.wrong); return; }
      input.value = email;
      if (!to) { event.preventDefault(); say(WAITLIST.says.unset, true); return; }
      // An old browser posts the form itself, and the host answers with a page.
      if (!window.fetch || !window.FormData || !window.URLSearchParams) return;
      event.preventDefault();
      var body = new URLSearchParams(new FormData(form));
      say("");
      setBusy(true);
      fetch(to, { method: "POST", headers: { Accept: "application/json" }, body: body })
        .then(function (res) {
          if (!res.ok) throw new Error("waitlist " + res.status);
          setBusy(false);
          finish(email);
        })
        .catch(function () {
          setBusy(false);
          say(WAITLIST.says.failed);
        });
    });
  }

  /* ---------- The carry to the waitlist ----------
     Between the painting standing whole (the end of the grows section's pin)
     and the waitlist filling the window there is about a window of scroll
     in which the painting fades and little else happens. The scroll there
     is the reader's own, always: nothing is taken over and nothing is held
     up, and the page can be stopped anywhere in it.

     The help is only at the end. When the page has come to rest (no scroll
     for CARRY.idle) most of the way across, it is eased the rest of the way,
     so the section it was nearly on stands in the window exactly: going
     down, past CARRY.down of the gap, onto the waitlist; going up, within
     CARRY.up of the painting's rest, onto that. It is never eased back the
     way it came, and a rest in the middle is left where it is.

     Any scrolling while it eases wins. The same way, and the reader is
     simply ahead of it (it never pulls the page back); the other way, a
     finger, a key or a click, and it lets go.

     A first version (the same day) took the scroll over at the end of the
     pin and glided the whole gap, swallowing the wheel on the way. The
     founder: too assisted, it jumps, and you cannot stop halfway.

     Only where initGrows has pinned the painting, and only with motion
     allowed. */
  var CARRY = {
    time: [520, 1000], // ms the ease takes: the shortest, and one over half the gap
    idle: 160,         // ms the page must be still before it is eased
    down: 0.5,         // going down: a rest past this share of the gap goes on to the waitlist
    up: 0.3            // going up: a rest within this share of the gap from the painting goes on to it
  };

  function initCarry() {
    var grows = $("#grows"), waitlist = $("#waitlist");
    var stage = grows && $(".grows-stage", grows);
    if (!stage || !waitlist || !window.requestAnimationFrame || !window.matchMedia || !window.performance) return;
    var motionMq = window.matchMedia("(prefers-reduced-motion: no-preference)");
    var glide = null, lastY = window.scrollY, dir = 0, idleTimer = 0, touching = false, lastPush = 0;

    // The two rests, as scroll positions: the painting whole, the waitlist at the top.
    function ends() {
      if (!motionMq.matches || !grows.classList.contains("is-pinned")) return null;
      var y = window.scrollY;
      var to = Math.round(waitlist.getBoundingClientRect().top + y);
      var from = Math.round(grows.getBoundingClientRect().bottom + y - (parseFloat(window.getComputedStyle(stage).top) || 0) - stage.offsetHeight);
      return to - from > 80 ? { from: from, to: to } : null;
    }
    function put(y) {
      try { window.scrollTo({ top: y, behavior: "instant" }); }
      catch (e) { window.scrollTo(0, y); }
    }
    function curve(t) { return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; }
    function start(to, e) {
      var from = window.scrollY, far = Math.abs(to - from);
      if (far < 1) return;
      glide = {
        from: from, to: to, dir: to > from ? 1 : -1, at: window.performance.now(),
        time: CARRY.time[0] + (CARRY.time[1] - CARRY.time[0]) * Math.min(1, far / (0.5 * (e.to - e.from)))
      };
      window.requestAnimationFrame(step);
    }
    function step(now) {
      if (!glide) return;
      var t = Math.min(1, Math.max(0, (now - glide.at) / glide.time));
      var y = window.scrollY;
      var plan = t < 1 ? glide.from + (glide.to - glide.from) * curve(t) : glide.to;
      // A reader scrolling on the same way is ahead of it: never pulled back, and never past where they went.
      if (glide.dir > 0 ? y >= glide.to : y <= glide.to) { glide = null; return; }
      if (glide.dir > 0 ? plan > y : plan < y) put(plan);
      if (t < 1) window.requestAnimationFrame(step);
      else glide = null;
    }
    function stop() { glide = null; }

    function rest() {
      if (glide || touching || window.performance.now() - lastPush < CARRY.idle) return;
      var e = ends();
      if (!e) return;
      var y = window.scrollY, gap = e.to - e.from;
      if (y <= e.from + 1 || y >= e.to - 1) return;
      if (dir > 0 && y - e.from > CARRY.down * gap) start(e.to, e);
      else if (dir < 0 && y - e.from < CARRY.up * gap) start(e.from, e);
    }
    function wait() { window.clearTimeout(idleTimer); idleTimer = window.setTimeout(rest, CARRY.idle); }

    window.addEventListener("scroll", function () {
      var y = window.scrollY;
      // The direction is the reader's: the ease's own steps do not set it.
      if (!glide && y !== lastY) dir = y > lastY ? 1 : -1;
      lastY = y;
      if (!glide) wait();
    }, { passive: true });
    window.addEventListener("wheel", function (event) {
      if (Math.abs(event.deltaY) < 2) return; // the last crumbs of a trackpad's momentum
      lastPush = window.performance.now();
      if (glide && (event.deltaY > 0 ? 1 : -1) !== glide.dir) stop();
      if (!glide) wait();
    }, { passive: true });
    window.addEventListener("keydown", function () { stop(); wait(); }, { passive: true });
    window.addEventListener("mousedown", stop, { passive: true });
    window.addEventListener("touchstart", function () { touching = true; stop(); window.clearTimeout(idleTimer); }, { passive: true });
    ["touchend", "touchcancel"].forEach(function (type) {
      window.addEventListener(type, function (event) {
        touching = !!(event.touches && event.touches.length);
        if (!touching) wait();
      }, { passive: true });
    });
  }

  /* ---------- A link straight to a section ----------
     A page opened at a #link (ilumi's address with #waitlist on the end, say)
     is taken there by the browser as soon as the markup is in. The why and
     grows sections can pin after that (they wait for the fonts and the
     pictures), which makes the page above the target longer and leaves the
     reader a screen or so short of it. So once things have settled, go to
     the target again, unless the reader has already taken hold of the page. */
  function initHash() {
    var id = window.location.hash.slice(1);
    var target = id && document.getElementById(id);
    if (!target || !window.requestAnimationFrame) return;
    var held = false;
    ["wheel", "touchstart", "keydown", "mousedown"].forEach(function (type) {
      window.addEventListener(type, function () { held = true; }, { passive: true, once: true });
    });
    function go() {
      if (held) return;
      var top = target.getBoundingClientRect().top;
      if (Math.abs(top) < 2) return;
      try { window.scrollTo({ top: window.scrollY + top, behavior: "instant" }); }
      catch (e) { window.scrollTo(0, window.scrollY + top); }
    }
    // Two frames: the sections measure themselves in the first.
    function settle() { window.requestAnimationFrame(function () { window.requestAnimationFrame(go); }); }
    settle();
    window.addEventListener("load", settle);
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(settle);
  }

  /* ---------- Questions ----------
     Each question is a <details>, so it opens and shuts by itself; this only
     eases the height of the answer (.faq-a) as it does. While an answer is
     shutting the item has .is-closing, so the mark turns back at once (the
     stylesheet reads it) though the item stays open until the answer has
     gone. A click part-way carries on from where the answer stands. With
     reduced motion, or in a browser that cannot animate an element, the
     click is left to the browser. */
  var FAQ = {
    open: 460, shut: 340, ease: "cubic-bezier(0.22, 1, 0.36, 1)", // ms, and the page's easing
    // The way in, once: when the section's top comes above this share of the
    // window's height, every [data-reveal] piece fades in, top to bottom.
    line: 0.82,
    perPx: 0.75, // ms of delay for each pixel a piece sits below the highest one
    most: 850    // ms, the longest delay; anything further down is out of sight anyway
  };

  /* The reveal: the markup is the finished still. With motion allowed, and
     only if the section starts out below the window, its pieces are hidden
     (.is-waiting) and faded in once, on a timer, when the reader gets there
     (.is-revealing carries the transitions; the look is "Questions" in
     css/styles.css). Each piece waits in proportion to how far down it sits,
     so the two columns come in together, row by row. After that nothing here
     moves with the scroll. A page loaded part-way down, reduced motion and no
     JS keep the still. */
  function initFaqReveal() {
    var section = $("#faq");
    var pieces = section ? $$("[data-reveal]", section) : [];
    if (!pieces.length || !window.matchMedia ||
        !window.matchMedia("(prefers-reduced-motion: no-preference)").matches) return;
    // The delays are set whatever happens: initJumps plays the way in again
    // when the header's "Questions" brings the reader straight here.
    var highest = Math.min.apply(null, pieces.map(function (p) { return p.getBoundingClientRect().top; }));
    pieces.forEach(function (p) {
      var d = Math.min(FAQ.most, (p.getBoundingClientRect().top - highest) * FAQ.perPx);
      p.style.setProperty("--d", Math.round(d) + "ms");
    });
    if (!("IntersectionObserver" in window) || section.getBoundingClientRect().top < window.innerHeight) return;
    section.classList.add("is-waiting");
    var observer = new IntersectionObserver(function (entries) {
      if (!entries.some(function (entry) { return entry.isIntersecting; })) return;
      observer.disconnect();
      section.classList.add("is-revealing");
      section.classList.remove("is-waiting");
      // Done: take the transitions off again, so nothing lingers on the pieces.
      window.setTimeout(function () { section.classList.remove("is-revealing"); }, FAQ.most + 1400);
    }, { rootMargin: "0px 0px -" + Math.round((1 - FAQ.line) * 100) + "% 0px" });
    observer.observe(section);
  }

  function initFaq() {
    initFaqReveal();
    var items = $$(".faq-item");
    if (!items.length || !window.matchMedia) return;
    var motionMq = window.matchMedia("(prefers-reduced-motion: no-preference)");

    items.forEach(function (item) {
      var summary = $("summary", item), body = $(".faq-a", item);
      if (!summary || !body || !body.animate) return;
      var running = null;

      function settle(open) {
        running = null;
        body.style.overflow = "";
        item.classList.remove("is-closing");
        if (!open) item.open = false;
      }

      summary.addEventListener("click", function (event) {
        if (!motionMq.matches) return;
        event.preventDefault();
        var open = !item.open || item.classList.contains("is-closing");
        // Where the answer stands now: measured before the last run is dropped.
        var from = item.open ? body.getBoundingClientRect().height : 0;
        if (running) { running.onfinish = null; running.cancel(); }
        item.open = true;
        item.classList.toggle("is-closing", !open);
        body.style.overflow = "hidden";
        var to = open ? body.scrollHeight : 0;
        running = body.animate(
          { height: [from + "px", to + "px"], opacity: [open ? (from ? 1 : 0) : 1, open ? 1 : 0] },
          { duration: open ? FAQ.open : FAQ.shut, easing: FAQ.ease }
        );
        running.onfinish = function () { settle(open); };
      });
    });
  }

  /* ---------- Straight to a section ----------
     A link to the waitlist or the questions (the header's "Join the waitlist"
     and "Questions", the same in the drawer, the hero's button) does not
     scroll the page there: the page is there at once, and the section's
     content fades in. The fade is the section's own way in (.is-waiting, then
     .is-revealing: "Waitlist" and "Questions" in css/styles.css), played
     again on every click. With reduced motion the page only goes there. The
     address bar shows the #link, with no history entry and no scroll. Focus
     moves to the section, so the keyboard carries on from there. Without JS
     these are plain #links and the browser scrolls.

     The number is how long the way in takes, in ms, after which .is-revealing
     comes off again (as initFaqReveal does); 0 leaves it on (as initWaitlist
     does). */
  var JUMPS = {
    waitlist: 0,
    faq: FAQ.most + 1400
  };

  function initJumps() {
    var motionMq = window.matchMedia && window.matchMedia("(prefers-reduced-motion: no-preference)");
    var timers = {};

    // Instant, whatever the stylesheet's scroll-behavior says.
    function put(y) {
      var root = document.documentElement, was = root.style.scrollBehavior;
      root.style.scrollBehavior = "auto";
      window.scrollTo(0, y);
      root.style.scrollBehavior = was;
    }

    document.addEventListener("click", function (event) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      var link = event.target.closest && event.target.closest('a[href^="#"]');
      var id = link && link.getAttribute("href").slice(1);
      if (!id || !Object.prototype.hasOwnProperty.call(JUMPS, id)) return;
      var section = document.getElementById(id);
      if (!section) return;
      event.preventDefault();

      var fade = !!(motionMq && motionMq.matches && window.requestAnimationFrame);
      if (fade) {
        // Hidden with no transition, so nothing of the old still shows on arrival.
        window.clearTimeout(timers[id]);
        section.classList.remove("is-revealing");
        section.classList.add("is-waiting");
      }
      put(Math.round(window.scrollY + section.getBoundingClientRect().top));
      if (window.history && window.history.replaceState) window.history.replaceState(null, "", "#" + id);
      if (!section.hasAttribute("tabindex")) section.setAttribute("tabindex", "-1");
      try { section.focus({ preventScroll: true }); } catch (e) { /* an old browser keeps focus on the link */ }
      if (!fade) return;

      // Two frames: the hidden content is painted where it now stands, then written in.
      window.requestAnimationFrame(function () {
        window.requestAnimationFrame(function () {
          section.classList.add("is-revealing");
          section.classList.remove("is-waiting");
          if (JUMPS[id]) timers[id] = window.setTimeout(function () { section.classList.remove("is-revealing"); }, JUMPS[id]);
        });
      });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    readGround();
    initUrlForm();
    initHeroSequence();
    initGuides();
    initStandards();
    initWhy();
    initWhyBirds();
    initGrows(); // before the fades, which leave a pinned panel alone
    initWaitlist(); // after the sections above it, whose pinning decides where it starts
    initFaq();
    initFades();
    initCarry(); // after initGrows: it goes by where the pin ends
    initNav(); // after the sections, so it knows whether the hero hands over to the guides section
    initJumps();
    initHash(); // last: it goes by where the sections have ended up
  });
})();
