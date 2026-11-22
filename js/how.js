/* Ilumi — the How it works page (how-it-works.html). The header and its menu
   are js/main.js, loaded first; this file is the page's own two pieces.
   No dependencies; nothing runs on a timer. */
(function () {
  "use strict";

  function $$(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }

  // .js on <html> lets the stylesheet hide what is about to be revealed; with
  // no JS nothing is hidden and every row of the session stands open (.no-js).
  document.documentElement.classList.add("js");

  /* Inside a session: one row open at a time, and its picture showing.
     Opening a row is the only thing that changes it: nothing advances by
     itself, so a reader is never pulled off the row they are reading. */
  function initSession() {
    var rows = $$(".how-row");
    var pictures = $$(".how-picture");
    if (!rows.length) return;

    function open(step) {
      rows.forEach(function (row) {
        var on = row.getAttribute("data-step") === step;
        row.classList.toggle("is-open", on);
        var btn = row.querySelector(".how-row-btn");
        if (btn) btn.setAttribute("aria-expanded", on ? "true" : "false");
      });
      pictures.forEach(function (pic) {
        pic.classList.toggle("is-on", pic.getAttribute("data-step") === step);
      });
    }

    rows.forEach(function (row) {
      var btn = row.querySelector(".how-row-btn");
      if (!btn) return;
      btn.addEventListener("click", function () {
        // An open row stays open: closing the last one would leave the picture blank.
        if (!row.classList.contains("is-open")) open(row.getAttribute("data-step"));
      });
    });
  }

  /* The way in: each [data-reveal] fades up once, when a fifth of it is in
     the window; the moving-up card's three days light then too. Scrolling
     back does not undo it. Reduced motion and no JS show the page as it stands. */
  function initReveal() {
    var items = $$("[data-reveal]");
    var climb = document.querySelector(".how-climb");
    var reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !("IntersectionObserver" in window)) {
      items.forEach(function (el) { el.classList.add("is-in"); });
      if (climb) climb.classList.add("is-in");
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-in");
        io.unobserve(entry.target);
      });
    }, { threshold: 0.2, rootMargin: "0px 0px -6% 0px" });
    items.forEach(function (el) {
      // Anything already in the window at load shows at once.
      var r = el.getBoundingClientRect();
      if (r.top < window.innerHeight * 0.94 && r.bottom > 0) el.classList.add("is-in");
      else io.observe(el);
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    initSession();
    initReveal();
  });
})();
