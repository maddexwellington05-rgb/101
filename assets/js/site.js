/* ==========================================================================
   VINTAGE 101 MARKETPLACE - public site script
   Vanilla JS, no dependencies, defensive. Site is fully functional if this
   file fails to load: all content is baked into the HTML.
   --------------------------------------------------------------------------
   Modules:
     1. Mobile nav (drawer, ESC, outside click, focus management)
     2. Lightbox (accessible dialog, focus trap, ESC, backdrop)
     3. Scroll reveal (IntersectionObserver; no-op under reduced motion)
     4. Open-now pill (America/Los_Angeles hours math)
     5. Footer year
     6. Hydration contract (fetch /api/content, override baked content)
   ========================================================================== */
(function () {
  "use strict";

  var doc = document;
  var REDUCED = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Mark JS available so reveal CSS can engage without hiding content for no-JS.
  doc.documentElement.classList.add("js");

  function $(sel, ctx) { return (ctx || doc).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || doc).querySelectorAll(sel)); }
  function on(el, ev, fn, opt) { if (el) el.addEventListener(ev, fn, opt); }

  /* ---------------------------------------------------------------------
     1. MOBILE NAV
  --------------------------------------------------------------------- */
  (function nav() {
    var burger = $("[data-nav-toggle]");
    var drawer = $("[data-nav-drawer]");
    var scrim  = $("[data-nav-scrim]");
    var closeBtn = $("[data-nav-close]");
    if (!burger || !drawer) return;

    var lastFocus = null;

    function focusables() {
      return $all('a[href], button:not([disabled])', drawer);
    }

    function open() {
      lastFocus = doc.activeElement;
      drawer.classList.add("is-open");
      if (scrim) scrim.classList.add("is-open");
      burger.setAttribute("aria-expanded", "true");
      drawer.removeAttribute("hidden");
      doc.body.style.overflow = "hidden";
      var f = focusables();
      if (f.length) f[0].focus();
      doc.addEventListener("keydown", onKey);
    }

    function close() {
      drawer.classList.remove("is-open");
      if (scrim) scrim.classList.remove("is-open");
      burger.setAttribute("aria-expanded", "false");
      doc.body.style.overflow = "";
      doc.removeEventListener("keydown", onKey);
      // Re-hide the drawer so its links + close button leave the tab order off-canvas.
      drawer.setAttribute("hidden", "");
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }

    function toggle() {
      if (burger.getAttribute("aria-expanded") === "true") close();
      else open();
    }

    function onKey(e) {
      if (e.key === "Escape") { close(); return; }
      if (e.key === "Tab") {
        var f = focusables();
        if (!f.length) return;
        var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    }

    on(burger, "click", toggle);
    on(closeBtn, "click", close);
    on(scrim, "click", close);
    // Close after following a same-page link
    $all("a", drawer).forEach(function (a) { on(a, "click", close); });
  })();

  /* ---------------------------------------------------------------------
     1b. MARQUEE PAUSE - keyboard-operable control (WCAG 2.2.2)
     The marquee items are non-interactive spans, so :focus-within can never
     fire for keyboard users. Inject a real button that toggles .is-paused;
     CSS pauses the track via .marquee.is-paused .marquee__track.
  --------------------------------------------------------------------- */
  (function marqueePause() {
    var marquees = $all(".marquee");
    if (!marquees.length) return;

    marquees.forEach(function (marquee) {
      // Guard against double-injection (e.g. if re-run after hydration).
      if (marquee.querySelector("[data-marquee-toggle]")) return;

      var btn = doc.createElement("button");
      btn.type = "button";
      btn.className = "marquee__toggle";
      btn.setAttribute("data-marquee-toggle", "");
      btn.setAttribute("aria-label", "Pause highlights");

      function setPaused(paused) {
        marquee.classList.toggle("is-paused", paused);
        btn.setAttribute("aria-label", paused ? "Play highlights" : "Pause highlights");
        btn.setAttribute("aria-pressed", paused ? "true" : "false");
      }
      setPaused(false);

      on(btn, "click", function () {
        setPaused(!marquee.classList.contains("is-paused"));
      });

      marquee.appendChild(btn);
    });
  })();

  /* ---------------------------------------------------------------------
     2. LIGHTBOX  - any [data-lb] element opens an accessible dialog
  --------------------------------------------------------------------- */
  (function lightbox() {
    var triggers = $all("[data-lb]");
    if (!triggers.length) return;

    var lb = $("[data-lightbox]");
    if (!lb) return;
    var imgEl = $("[data-lightbox-img]", lb);
    var capEl = $("[data-lightbox-cap]", lb);
    var closeEl = $("[data-lightbox-close]", lb);
    var lastFocus = null;

    function srcOf(el) {
      if (el.tagName === "IMG") return el.currentSrc || el.src;
      var inner = $("img", el);
      return inner ? (inner.currentSrc || inner.src) : el.getAttribute("data-lb-src");
    }
    function altOf(el) {
      if (el.tagName === "IMG") return el.alt || "";
      var inner = $("img", el);
      return inner ? (inner.alt || "") : (el.getAttribute("data-lb-cap") || "");
    }

    function open(el) {
      lastFocus = doc.activeElement;
      if (imgEl) { imgEl.src = srcOf(el); imgEl.alt = altOf(el); }
      if (capEl) capEl.textContent = altOf(el);
      lb.classList.add("is-open");
      lb.setAttribute("aria-hidden", "false");
      doc.body.style.overflow = "hidden";
      if (closeEl) closeEl.focus();
      doc.addEventListener("keydown", onKey);
    }
    function close() {
      lb.classList.remove("is-open");
      lb.setAttribute("aria-hidden", "true");
      doc.body.style.overflow = "";
      doc.removeEventListener("keydown", onKey);
      if (imgEl) imgEl.removeAttribute("src");
      if (lastFocus && lastFocus.focus) lastFocus.focus();
    }
    function onKey(e) {
      if (e.key === "Escape") { close(); return; }
      if (e.key === "Tab") { e.preventDefault(); if (closeEl) closeEl.focus(); }
    }

    triggers.forEach(function (t) {
      t.setAttribute("tabindex", t.getAttribute("tabindex") || "0");
      t.setAttribute("role", t.getAttribute("role") || "button");
      t.setAttribute("aria-label", "View larger image: " + altOf(t));
      on(t, "click", function () { open(t); });
      on(t, "keydown", function (e) {
        if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(t); }
      });
    });
    on(closeEl, "click", close);
    on(lb, "click", function (e) { if (e.target === lb) close(); });
  })();

  /* ---------------------------------------------------------------------
     3. SCROLL REVEAL - never hides content if JS/observer unavailable
  --------------------------------------------------------------------- */
  (function reveal() {
    var items = $all("[data-reveal]");
    if (!items.length) return;
    if (REDUCED || !("IntersectionObserver" in window)) return; // leave visible

    items.forEach(function (el) { el.classList.add("reveal-ready"); });

    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (entry.isIntersecting) {
          var el = entry.target;
          var delay = parseInt(el.getAttribute("data-reveal-delay") || "0", 10);
          setTimeout(function () { el.classList.add("is-in"); }, delay);
          io.unobserve(el);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.08 });

    items.forEach(function (el) { io.observe(el); });
  })();

  /* ---------------------------------------------------------------------
     4. OPEN-NOW PILL - America/Los_Angeles, daily 11:00 to 17:00
  --------------------------------------------------------------------- */
  function computeOpen(hours) {
    var open = hours && hours.open ? hours.open : "11:00";
    var close = hours && hours.close ? hours.close : "17:00";
    var tz = hours && hours.tz ? hours.tz : "America/Los_Angeles";

    var nowMin, hh, mm;
    try {
      var fmt = new Intl.DateTimeFormat("en-US", {
        timeZone: tz, hour12: false, hour: "2-digit", minute: "2-digit"
      });
      var parts = fmt.formatToParts(new Date());
      hh = 0; mm = 0;
      parts.forEach(function (p) {
        if (p.type === "hour") hh = parseInt(p.value, 10) % 24;
        if (p.type === "minute") mm = parseInt(p.value, 10);
      });
    } catch (err) {
      var d = new Date(); hh = d.getHours(); mm = d.getMinutes();
    }
    nowMin = hh * 60 + mm;

    function toMin(s) { var a = s.split(":"); return parseInt(a[0], 10) * 60 + parseInt(a[1], 10); }
    function label(s) {
      var a = s.split(":"); var h = parseInt(a[0], 10);
      var ap = h >= 12 ? "PM" : "AM"; var h12 = h % 12; if (h12 === 0) h12 = 12;
      return h12 + " " + ap;
    }

    var openMin = toMin(open), closeMin = toMin(close);
    var isOpen = nowMin >= openMin && nowMin < closeMin;

    return {
      isOpen: isOpen,
      text: isOpen ? ("OPEN NOW · TIL " + label(close))
                   : ("CLOSED · OPENS " + label(open))
    };
  }

  // Last painted open/closed state; null until first paint. Used so periodic
  // repaints only rewrite pill text when the state actually flips, avoiding
  // spurious re-announcements (the aria-live attrs are also dropped in markup).
  var lastIsOpen = null;

  function paintStatus(hours, force) {
    var pills = $all("[data-hours]");
    if (!pills.length) return;
    var st = computeOpen(hours);
    // Skip the rewrite when state is unchanged, unless explicitly forced.
    if (!force && st.isOpen === lastIsOpen) return;
    lastIsOpen = st.isOpen;
    pills.forEach(function (pill) {
      var txt = pill.querySelector("[data-hours-text]") || pill;
      txt.textContent = st.text;
      pill.classList.toggle("is-open", st.isOpen);
      pill.classList.toggle("is-closed", !st.isOpen);
      pill.setAttribute("aria-label", st.text);
    });
  }

  /* ---------------------------------------------------------------------
     5. FOOTER YEAR
  --------------------------------------------------------------------- */
  (function year() {
    $all("[data-year]").forEach(function (el) {
      el.textContent = String(new Date().getFullYear());
    });
  })();

  /* ---------------------------------------------------------------------
     6. HYDRATION CONTRACT (headless CMS overrides baked content)
  --------------------------------------------------------------------- */

  // Baked default hours; overridden if /api/content returns site.hours.
  var DEFAULT_HOURS = { open: "11:00", close: "17:00", tz: "America/Los_Angeles" };

  function getPath(obj, path) {
    return path.split(".").reduce(function (acc, key) {
      if (acc == null) return undefined;
      // support numeric array index segments
      return acc[key];
    }, obj);
  }

  function esc(s) {
    return String(s == null ? "" : s)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }
  function attr(s) { return esc(s); }

  /* ---- Render functions: output MUST match the baked markup structure ---- */

  function ticks() {
    return '<span class="tick tick--tl"></span><span class="tick tick--tr"></span>' +
           '<span class="tick tick--bl"></span><span class="tick tick--br"></span>';
  }

  function frameHTML(img, ar, plate) {
    return '<figure class="frame ' + ar + '">' +
      '<div class="frame__inner" data-lb>' +
        '<img src="' + attr(img.image) + '" alt="' + attr(img.alt) + '" loading="lazy" decoding="async" width="800" height="600">' +
        ticks() +
      '</div>' +
      (plate ? '<figcaption class="frame__caption"><b>' + esc(plate) + '</b></figcaption>' : '') +
    '</figure>';
  }

  function renderBanner(items, container) {
    function group(hidden) {
      var html = '<div class="marquee__group"' + (hidden ? ' aria-hidden="true"' : '') + '>';
      items.forEach(function (it) {
        html += '<span class="marquee__item">' + esc(it.text) + '</span>';
      });
      return html + '</div>';
    }
    container.innerHTML = group(false) + group(true);
  }

  function renderStats(items, container) {
    var html = "";
    items.forEach(function (s) {
      var val = esc(s.value).replace(/stars?/i, '<span class="star">★</span>');
      html += '<div class="stat" data-reveal>' +
        '<div class="stat__value">' + (s.value.toLowerCase().indexOf("star") > -1
            ? '<span class="star">★</span> ' + esc(s.value) : esc(s.value)) + '</div>' +
        '<div class="stat__label">' + esc(s.label) + '</div>' +
      '</div>';
    });
    container.innerHTML = html;
  }

  // Card list -> identical markup to baked cards
  function renderCards(list, container, plateRoot) {
    var html = "";
    list.forEach(function (c, i) {
      var plateNum = ("0" + (i + 1)).slice(-2);
      var ars = ["ar-3-2"];
      var ar = ars[i % ars.length];
      html += '<article class="card" data-reveal data-reveal-delay="' + (i * 80) + '">' +
        '<figure class="frame ' + ar + '">' +
          '<div class="frame__inner" data-lb>' +
            '<img src="' + attr(c.image) + '" alt="' + attr(c.alt) + '" loading="lazy" decoding="async" width="800" height="600">' +
            ticks() +
          '</div>' +
          '<figcaption class="frame__caption"><b>PL. ' + plateNum + '</b> · ' + esc(c.title) + '</figcaption>' +
        '</figure>' +
        '<span class="hangtag">' + esc(c.kicker) + '</span>' +
        '<h3 class="card__title">' + esc(c.title) + '</h3>' +
        '<p class="card__body">' + esc(c.body) + '</p>' +
      '</article>';
    });
    container.innerHTML = html;
  }

  function renderVendors(data, container) {
    var items = (data && data.items) || [];
    var html = "";
    items.forEach(function (v, i) {
      var spin = /wax museum|mcm/i.test(v.name) ? '<span class="disc-glyph" aria-hidden="true"></span>' : '';
      var plateNum = ("0" + (i + 1)).slice(-2);
      var frame = v.image ? (
        '<figure class="frame ar-3-2 vendor__frame">' +
          '<div class="frame__inner" data-lb>' +
            '<img src="' + attr(v.image) + '" alt="' + attr(v.alt) + '" loading="lazy" decoding="async" width="800" height="533">' +
            ticks() +
          '</div>' +
          '<figcaption class="frame__caption"><b>PL. ' + plateNum + '</b> · ' + esc(v.name) + '</figcaption>' +
        '</figure>'
      ) : '';
      html += '<article class="vendor" data-reveal data-category="' + attr(v.category) + '">' +
        frame +
        '<div class="vendor__top">' +
          '<span class="vendor__cat">' + esc(v.category) + '</span>' +
          '<h3 class="vendor__name">' + esc(v.name) + spin + '</h3>' +
        '</div>' +
        '<p class="vendor__desc">' + esc(v.description) + '</p>' +
        (v.social ? '<a class="vendor__social" href="' + attr(v.social) + '" target="_blank" rel="noopener">Follow on Instagram</a>' : '') +
      '</article>';
    });
    container.innerHTML = html;
  }

  function hydrateScalars(content) {
    $all("[data-edit]").forEach(function (el) {
      var path = el.getAttribute("data-edit");
      var val = getPath(content, path);
      if (val == null) return;
      var as = el.getAttribute("data-edit-attr");
      if (as) el.setAttribute(as, val);
      else el.textContent = val;
    });
  }

  function hydrateCollections(content) {
    $all("[data-render]").forEach(function (container) {
      var key = container.getAttribute("data-render");
      try {
        if (key === "banner" && content.banner) renderBanner(content.banner.items || [], container);
        else if (key === "stats" && content.stats) renderStats(content.stats, container);
        else if (key === "marketplace" && content.sections && content.sections.marketplace)
          renderCards(content.sections.marketplace.cards || [], container);
        else if (key === "furniture" && content.sections && content.sections.furniture)
          renderCards(content.sections.furniture.cards || [], container);
        else if (key === "art" && content.sections && content.sections.art)
          renderCards(content.sections.art.cards || [], container);
        else if (key === "vendors" && content.vendors) renderVendors(content.vendors, container);
      } catch (err) { /* keep baked markup */ }
    });
  }

  function hydrate(content) {
    if (!content || typeof content !== "object") return;
    try { hydrateScalars(content); } catch (e) {}
    try { hydrateCollections(content); } catch (e) {}
    // Re-attach lightbox/reveal would require re-init; baked behaviors still work.
    // Repaint status with possibly-updated hours.
    var hours = (content.site && content.site.hours) || DEFAULT_HOURS;
    // Stash hours for the interval; repaint only if the open/closed state changed.
    window.__V101_HOURS = hours;
    paintStatus(hours);
  }

  // Floating "you are previewing a draft" bar with a button back to the admin.
  function injectPreviewBar() {
    if (doc.querySelector("[data-preview-bar]")) return;
    var bar = doc.createElement("div");
    bar.setAttribute("data-preview-bar", "");
    bar.setAttribute("role", "region");
    bar.setAttribute("aria-label", "Preview mode");
    bar.style.cssText = "position:fixed;z-index:99999;top:.7rem;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:.7rem;background:#2A201A;color:#FCF4E9;border:1px solid #7A5A1E;border-radius:999px;padding:.35rem .4rem .35rem 1rem;font-family:'JetBrains Mono',ui-monospace,monospace;font-size:.7rem;letter-spacing:.08em;text-transform:uppercase;box-shadow:0 10px 26px -12px rgba(0,0,0,.55);max-width:calc(100vw - 1.2rem)";
    var label = doc.createElement("span");
    label.textContent = "Previewing draft";
    var btn = doc.createElement("a");
    btn.href = "/admin/";
    btn.textContent = "Back to admin";
    btn.style.cssText = "background:#9E2B25;color:#FCF4E9;text-decoration:none;padding:.45rem .85rem;border-radius:999px;white-space:nowrap;font-weight:500";
    bar.appendChild(label);
    bar.appendChild(btn);
    doc.body.appendChild(bar);
  }

  function loadContent() {
    var preview = /(?:^|[?&])preview=1(?:&|$)/.test(window.location.search);
    if (preview) injectPreviewBar();
    var url = preview ? "/api/content?state=draft" : "/api/content";
    var opts = preview ? { credentials: "include" } : {};
    if (!window.fetch) return; // baked content stands
    fetch(url, opts)
      .then(function (r) { return r && r.ok ? r.json() : null; })
      .then(function (data) {
        if (data && data.content) hydrate(data.content);
        else if (data && data.site) hydrate(data); // accept raw content shape too
      })
      .catch(function () { /* silent: baked content stays live */ });
  }

  /* ---------------------------------------------------------------------
     INIT
  --------------------------------------------------------------------- */
  paintStatus(DEFAULT_HOURS, true);   // 1) paint from baked defaults immediately (forced once)
  loadContent();                      // 2) then try to override from backend

  // Re-run status every 5 minutes so the pill stays accurate on long sessions.
  // Not forced: only rewrites text when the open/closed state actually flips.
  setInterval(function () { paintStatus(window.__V101_HOURS || DEFAULT_HOURS); }, 300000);
})();
