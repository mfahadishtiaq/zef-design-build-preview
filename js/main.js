/* =====================================================================
   ZEF Design Build — shared

   THE ONE THING TWO IIFEs BOTH NEED. This file is a series of separate
   IIFEs, and callback windows are read in two of them: the time field
   fills itself from them, and the date picker disables any day that has
   none. Declaring it in the first one and calling it from the picker's is
   how this shipped broken for one build, and file:// reports that
   ReferenceError as nothing but "Script error." so the calendar just
   silently rendered no days.

   It lives here rather than being written twice, because two copies of a
   rule about Zain's working hours is two copies to drift apart.
   ===================================================================== */
var ZEF = {
  /* Windows available on a date: the day's list from the map the form
     carries, minus any whose START has already passed when that date is
     today. A window that has begun is not one you can still ask for, and
     offering it is the fixed-list problem in miniature. Returning an empty
     list is also what closes Sunday and what retires today after 9 PM, so
     no closing-time rule is written anywhere else. */
  windowsOn: function (map, d) {
    var list = (map && map[String(d.getDay())]) || [];
    var now = new Date();
    if (d.getFullYear() !== now.getFullYear() || d.getMonth() !== now.getMonth() ||
        d.getDate() !== now.getDate()) return list;
    var mins = now.getHours() * 60 + now.getMinutes();
    return list.filter(function (w) {
      var parts = w.s.split(':');
      return (+parts[0]) * 60 + (+parts[1]) > mins;
    });
  }
};

/* =====================================================================
   ZEF Design Build — behaviour
   Vanilla, no framework. Nothing here gates content VISIBILITY on JS
   (prod-rules #31): the reveal styles only arm once html.js is set, and a
   failsafe timer releases everything if the observer never fires.
   ===================================================================== */
(function () {
  'use strict';

  var root = document.documentElement;
  root.classList.add('js');

  /* THE CURTAIN IS THE HOME PAGE'S ALONE (Fahad, 2026-08-20: the basement
     page "should not have the same scrolling down affect as the main/hero
     page ... Page scrolls normally").

     It used to run everywhere: `beats` was every `main > section` on any
     page, so all nine inner pages took each other over, dimmed, and revealed
     a fixed footer. Those are reference pages read in sequence, and a
     takeover fights that.

     ONE CLASS DRIVES ALL OF IT. `html.curtain` gates the four CSS rules that
     make the effect (sticky sections, the `--retire` content fade, the
     footer stage's clip and height, and the fixed footer inside it) and the
     `beats` list below gates the JavaScript half. Without the class a page
     is an ordinary document: sections in flow, `--retire` unset so its
     fallback of 1 applies, footer at the end. Detected from the home hero
     rather than a filename so it cannot drift from the markup. */
  var isCurtainPage = !!document.querySelector('.hero-stage.home');
  if (isCurtainPage) root.classList.add('curtain');

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ------------------------------------------------------------------
     Smooth scroll (2026-08-19, the kodeimmersive round — Fahad's live
     reference). Lenis 1.3.26, vendored at js/vendor/lenis.min.js,
     installed via npm per the studio's library rule. Same engine and
     the same default glide (lerp .1) as the reference. It drives the
     real window scroll, so scrollY, the header flip, the dock and the
     observers all keep working. Wheel/trackpad only — touch stays
     native — and it never starts under reduced motion, where the site
     scrolls exactly as before. `anchors: true` keeps in-page links
     landing where they always did.
     ------------------------------------------------------------------ */
  var lenis = null;
  if (!reduceMotion && typeof Lenis !== 'undefined') {
    lenis = new Lenis({ lerp: 0.1, smoothWheel: true, anchors: true });
    requestAnimationFrame(function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    });
  }

  /* ------------------------------------------------------------------
     The curtain chain (2026-08-19 night — NDA's site-wide law, ported
     verbatim; see the CURTAIN CHAIN note in site.css). Every section
     pins once fully read (top = min(0, vh − height)) and the next one
     rises over it (ascending z). ResizeObserver per beat, NOT a
     one-shot measure — NDA hit and fixed a frozen-void bug that way.
     The footer rides one layer above the last beat, and stays under
     the dock (z45) and sheets (z60).
     ------------------------------------------------------------------ */
  /* THE HEADING ARRIVALS ARE GONE (6.26 — Fahad, 2026-08-20: "this
     heading thing just isnt working. Lets drop this whole headers idea
     and revert back to how it was before").

     Removed wholesale: the title pages of 6.20.2, the section arrivals
     of 6.21 to 6.25, the shutter, the auto-fit, and the screen-reader-
     only retirement of the real headings. Section headings are ordinary
     `h2.sec` elements in the page again, visible to everyone, with the
     `.reveal` entrance every other element gets. Six rounds died here
     across two days; the full history is in the build log under 6.19 to
     6.25, and nothing from it should be revived without a new ruling.

     WHAT SURVIVES, because Fahad ruled on these separately and kept
     them: the curtain chain, the retire dim, the Lenis glide, the scrub
     (6.22), and the footer reveal (6.23). */

  /* The process stepper (6.20.3, Fahad: "step 1 -> you scroll down and
     step 2 appears and so forth"): each pinned card steps in as it
     crosses the middle band of the viewport — reveal once, IO-driven,
     transition-smooth. The hidden state is CSS-gated (html.js + motion
     allowed), so without JS or under reduced motion every card simply
     stands visible. */
  /* LABELLED PHOTOGRAPH: one name open at a time (Fahad, 2026-08-24, on the
     kitchens template: "if you click into a button it pops out").

     Hover already opens a name on a fine pointer, in CSS. This is what touch
     and the keyboard need, and it is also what keeps a pinned name from
     being left behind when the next one opens. Clicking the open dot again
     closes it; clicking anywhere off the photograph closes it; Escape closes
     it and returns focus to the dot, which is the standard popover contract.

     No-JS is intact: the dots are real buttons and :focus-visible opens a
     name without a line of this running. */
  /* THE PROCESS STEPS: CHOSEN BY THE READER, NOT DRIVEN BY THE PAGE
     (Fahad, 2026-08-28: "I dont like the way it moves, revert back to how
     it was before").

     THIS SECTION HAS BEEN DRIVEN THREE WAYS AND THE FIRST TWO WERE BOTH
     REJECTED, which is the useful thing to know before proposing a fourth.

     1. THE WHEEL (2026-08-24). "the page should not scroll down rather when
        you scroll, you move onto the next step ... the page length should
        stay the same". It called lenis.stop(), preventDefault()ed every
        wheel event while the section held the viewport, and advanced one
        step per 520ms. A trackpad flick fires dozens of events, so most of
        the gesture was cancelled and discarded while the page sat still,
        and the 450ms crossfade lived inside that 520ms window so the
        photograph was mid-dissolve 87% of the time. "The page freezes" and
        "the picture is not clearly visible" were one defect, one cause.

     2. SCROLL POSITION (2026-08-26, Build 30). No wheel handling at all:
        the live step was whichever sat nearest the middle of the screen,
        and the photograph was pinned at 12vh so the steps ran past it. That
        cost the section three screens instead of one, and it is the version
        rejected here.

     3. NOW: nothing reads the scroll. Step 1 is live on arrival, the step
        numbers set it, hovering a step on a fine pointer sets it, and a
        reader passing through sees a section that does not move. The wheel
        is still never touched -- no preventDefault, no lenis.stop() -- so
        the freeze from (1) cannot come back this way.

     WHAT (1) AND (2) HAD IN COMMON is worth naming, because it is what he
     objected to both times: the section changed itself while the reader was
     only passing through. Any future proposal that reads scroll position
     here is a proposal to do that again. */
  var ssWidgets = document.querySelectorAll('[data-scrollsteps]');
  Array.prototype.forEach.call(ssWidgets, function (w) {
    var stage = w.querySelector('.ssstage');
    var items = Array.prototype.slice.call(w.querySelectorAll('.ssitem'));
    var shots = Array.prototype.slice.call(w.querySelectorAll('.ssshot'));
    var picks = Array.prototype.slice.call(w.querySelectorAll('.sspick'));
    if (!stage || !items.length) return;
    var idx = -1;

    function running() {
      /* Same three gates as before: the stage layout has to actually be in
         play, reduced motion opts out, and phones never had this at all. */
      if (getComputedStyle(stage).position !== 'relative') return false;
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
      return innerWidth >= 901;
    }

    function paint(next) {
      if (next === idx) return;
      idx = next;
      items.forEach(function (it, i) { it.classList.toggle('live', i === idx); });
      shots.forEach(function (sh, i) { sh.classList.toggle('on', i === idx); });
      picks.forEach(function (b, i) {
        b.setAttribute('aria-current', i === idx ? 'step' : 'false');
      });
      /* The rule is a state now, not a scrub: the live step's is full, the
         rest are empty. It used to carry that step's scroll travel as a
         fraction, which there no longer is one of. */
      items.forEach(function (it, i) {
        it.style.setProperty('--f', i === idx ? '1' : '0');
      });
    }

    /* THE STEP IS CHOSEN, NOT SCROLLED TO (Fahad, 2026-08-28: "I dont like
       the way it moves, revert back to how it was before").

       This section has now been driven three ways. It took the WHEEL until
       2026-08-26, which froze the page and was rejected. Build 30 replaced
       that with SCROLL POSITION and a pinned photograph, which is what he
       rejected here. Both share the property he keeps objecting to: the
       section changes under the reader while they are only passing through
       it. Neither the wheel nor scroll position is the fix -- reading the
       scroll at all is.

       So nothing is measured any more. Step 1 is live on arrival, the
       numbers switch it, and a reader who never touches them sees a section
       that holds perfectly still. The photograph stays beside its steps
       because the list is compact again (see site.css).

       WHAT THIS KEEPS FROM BUILD 30: no wheel handler, no preventDefault,
       no lenis.stop(). Scrolling this section is ordinary page scrolling.
       WHAT IT DROPS: the per-step rule fill, which was scroll travel drawn
       as a progress bar. With no travel to draw, the live step's rule is
       simply full and the rest are empty. */
    picks.forEach(function (b, i) {
      b.addEventListener('click', function () { paint(i); });
    });
    /* Hovering a step is the same intent as clicking its number, and on a
       compact list the whole row is the obvious target. Pointer only: this
       must not fire for keyboard users mid-tab, who get it from the
       buttons. */
    if (matchMedia('(hover: hover) and (pointer: fine)').matches) {
      items.forEach(function (it, i) {
        it.addEventListener('mouseenter', function () { if (running()) paint(i); });
      });
    }
    if (running()) paint(0);
    addEventListener('resize', function () { if (running() && idx < 0) paint(0); });
  });

  /* THE NAMED AREAS drive the labelled photograph (2026-08-24). Selecting an
     area shows its paragraph and lights the points it owns on the house,
     dimming the others, which is what stops the four areas and the nine
     labels from being two lists of the same four things.

     `data-hot` carries 0-based indices into the photograph's marks, written
     by generate.py from the same table that positions them, so the two can
     never drift apart. Real tablist semantics and arrow keys, matching the
     step rail; the panels ship open and this collapses them, so no-JS keeps
     everything readable. */
  Array.prototype.forEach.call(document.querySelectorAll('[data-areas]'), function (w) {
    var tabs = Array.prototype.slice.call(w.querySelectorAll('.areatab'));
    var panels = Array.prototype.slice.call(w.querySelectorAll('.areapanel'));
    if (!tabs.length || tabs.length !== panels.length) return;
    /* The marks live in the sibling figure, so search the whole section. */
    var section = w.closest('section') || document;
    var marks = Array.prototype.slice.call(section.querySelectorAll('.lphmark'));
    var list = w.querySelector('.arealist');
    list.setAttribute('role', 'tablist');

    function select(i, focus) {
      tabs.forEach(function (t, j) {
        t.classList.toggle('on', i === j);
        t.setAttribute('aria-selected', i === j ? 'true' : 'false');
        t.tabIndex = i === j ? 0 : -1;
      });
      panels.forEach(function (p, j) { p.classList.toggle('on', i === j); });
      var hot = (tabs[i].getAttribute('data-hot') || '').split(',').filter(String).map(Number);
      /* Light the area's own points. Nothing is dimmed: an unselected chip
         has to look the same here as on every other service page. */
      marks.forEach(function (m, j) {
        m.classList.toggle('hot', hot.indexOf(j) !== -1);
        m.classList.remove('dim');
      });
      if (focus) tabs[i].focus();
    }

    tabs.forEach(function (t, i) {
      t.setAttribute('role', 'tab');
      t.setAttribute('aria-controls', t.getAttribute('data-panel'));
      panels[i].setAttribute('role', 'tabpanel');
      panels[i].setAttribute('aria-labelledby', t.id);
      panels[i].tabIndex = 0;
      t.addEventListener('click', function () { select(i); });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        select((i + d + tabs.length) % tabs.length, true);
      });
    });
    select(0);
  });

  var lphMarks = document.querySelectorAll('.lphmark');
  if (lphMarks.length) {
    var closeMarks = function (except) {
      lphMarks.forEach(function (m) {
        if (m !== except) m.setAttribute('aria-expanded', 'false');
      });
    };
    lphMarks.forEach(function (mark) {
      mark.addEventListener('click', function () {
        var open = mark.getAttribute('aria-expanded') === 'true';
        closeMarks(mark);
        mark.setAttribute('aria-expanded', open ? 'false' : 'true');
      });
      mark.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { mark.setAttribute('aria-expanded', 'false'); mark.focus(); }
      });
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('.lphmark')) closeMarks(null);
    });
  }

  var stepCards = document.querySelectorAll('.procard');
  if (stepCards.length && 'IntersectionObserver' in window) {
    var stepIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add('step-in');
          stepIO.unobserve(e.target);
        }
      });
    }, { rootMargin: '0px 0px -32% 0px', threshold: 0.35 });
    Array.prototype.forEach.call(stepCards, function (c) { stepIO.observe(c); });
  }

  var beats = isCurtainPage ? document.querySelectorAll('main > section') : [];
  var siteFooter = document.querySelector('footer.site');
  var footerStage = document.querySelector('.footer-stage');
  if (beats.length) {
    Array.prototype.forEach.call(beats, function (s, i) {
      // Inline, not just the CSS rule: component rules with higher
      // specificity (the photo CTA band's own position: relative) must
      // not exempt a beat from the chain.
      s.style.position = 'sticky';
      s.style.zIndex = i + 1;
    });
    /* THE FOOTER REVEAL (6.23). The footer no longer rises over the last
       beat; it is fixed to the viewport and the last beat slides up off
       it, uncovered through the stage's clip-path. The STAGE is what
       carries the z-index and what the chain measures against, because
       the stage is the element still in flow — the footer itself is out
       of it. */
    if (footerStage) {
      footerStage.style.zIndex = beats.length + 1;
    } else if (siteFooter) {
      siteFooter.style.position = 'relative';
      siteFooter.style.zIndex = beats.length + 1;
    }
    var syncBeats = function () {
      var vh = window.innerHeight;
      Array.prototype.forEach.call(beats, function (s) {
        s.style.top = Math.min(0, vh - s.offsetHeight) + 'px';
      });
      /* The stage holds the fixed footer's height in the document, so
         the page keeps its real length and the last scroll position
         still lands on a fully revealed footer. Measured, never
         assumed: the footer's height changes with viewport width as its
         columns wrap. */
      if (footerStage && siteFooter) {
        // minHeight is cleared, not just overridden: the CSS fallback is
        // 60vh, and on a viewport taller than the footer (60vh of 1200px
        // beats a 492px footer) it would win over the exact height and
        // leave dead scroll under an already-revealed footer.
        footerStage.style.minHeight = '0px';
        footerStage.style.height = siteFooter.offsetHeight + 'px';
      }
    };
    if ('ResizeObserver' in window) {
      var ro = new ResizeObserver(syncBeats);
      Array.prototype.forEach.call(beats, function (s) { ro.observe(s); });
      ro.observe(document.documentElement);
      if (siteFooter) ro.observe(siteFooter);
    }
    window.addEventListener('resize', syncBeats);
    syncBeats();

    /* The retire dim ("the following page completely takes over"):
       every beat gets a shadow layer whose opacity tracks how far the
       NEXT curtain has risen over it. Geometry from
       getBoundingClientRect. */
    var dims = Array.prototype.map.call(beats, function (s) {
      var d = document.createElement('div');
      d.className = 'beat-dim';
      d.setAttribute('aria-hidden', 'true');
      s.appendChild(d);
      return d;
    });
    var nexts = Array.prototype.slice.call(beats, 1);
    /* The final dim measures against the STAGE, not the footer: the
       footer is fixed now, so its rect no longer moves with scroll and
       would report the last beat as permanently covered. */
    if (footerStage) nexts.push(footerStage);
    else if (siteFooter) nexts.push(siteFooter);

    /* ------------------------------------------------------------------
       THE SCRUB (6.22 — Fahad, 2026-08-20, sending a GSAP ScrollTrigger
       reference: "this is how I want the scrolling to feel").

       WHAT IN THAT REFERENCE MAKES THE FEEL. Not the footer, not the
       glass, not the magnetic buttons: `scrub: 1`. ScrollTrigger with a
       scrub does NOT map scroll position to style. It maps scroll to a
       TARGET and then tweens the real value toward it over `scrub`
       seconds, so every scroll-linked property arrives a beat late and
       eases in rather than tracking the wheel tooth for tooth. That lag
       is the entire sensation.

       Everything painted from scroll on this site now works that way.
       measure() writes targets; frame() eases the rendered values toward
       them with a TIME-BASED lerp, so the feel is identical at 60Hz and
       120Hz (a per-frame constant, which is what 6.20.1 used, is not).
       The loop runs only while something is still moving and shuts
       itself off once every value has settled, so a still page costs
       nothing.

       LENIS IS NOT THE SAME THING and does not make this redundant.
       Lenis eases the SCROLL POSITION; the scrub eases what the styles
       do with that position. The reference has both (its own smooth
       scroll plus scrub), which is why it reads softer than this site
       did with Lenis alone.

       --SCRUB_TAU is the dial: seconds to close ~63% of the remaining
       distance. GSAP's `scrub: 1` is a full second and reads slack on a
       title fade; 0.28 keeps the lag legible without feeling
       disconnected from the hand. Raise it for more float.

       UNDER REDUCED MOTION THE SCRUB IS OFF, not softened: k = 1 writes
       targets straight through. The dim survives reduced motion because
       it is depth, not movement (the depth doctrine in site.css) — but
       easing it would be movement, so that part goes.
       ------------------------------------------------------------------ */
    var SCRUB_TAU = 0.28;
    var dimT = [], dimV = [], fadeT = [], fadeV = [];
    var i0;
    for (i0 = 0; i0 < nexts.length; i0++) { dimT[i0] = 0; dimV[i0] = 0; fadeT[i0] = 1; fadeV[i0] = 1; }

    function measure() {
      var vh = window.innerHeight;
      for (var i = 0; i < nexts.length; i++) {
        var selfBox = beats[i].getBoundingClientRect();
        var nextTop = nexts[i].getBoundingClientRect().top;
        /* COVERAGE IS MEASURED AGAINST THE BEAT'S OWN VISIBLE BOX, NOT THE
           VIEWPORT (2026-08-22, register M1). The old measure was
           `(vh - nextTop) / (vh - pinTop)`, i.e. how far up the SCREEN the
           next beat had climbed. For a beat as tall as the screen that is
           the same number as this one, which is why it read correctly on
           desktop for two years. For a beat SHORTER than the screen it is
           not: the next beat's top is already high up the viewport before
           anything has scrolled, so the beat was born half covered. The
           home hero at 375 (430px tall in an 812px screen) arrived at
           `--retire` 0.545 and a 0.28 shadow before the visitor touched
           anything, and the same thing appeared on DESKTOP the moment the
           hero became a 480px banner (2026-08-22, the slideshow round).

           What "covered" actually means: how much of the part of this beat
           that is ON SCREEN the next beat has slid over. At rest the next
           beat's top sits at this beat's bottom, so the numerator is zero
           for every beat at every viewport, by construction — the dead zone
           below is no longer what protects the resting state. Fully covered
           when the next beat's top reaches the top of this beat's visible
           box. Tall beats use their visible span (the last screenful), not
           their whole height, or a 3000px section could never reach 1. */
        var visTop = Math.max(selfBox.top, 0);
        var visBottom = Math.min(selfBox.bottom, vh);
        var visSpan = visBottom - visTop;
        var raw = visSpan > 0
          ? (visBottom - Math.max(nextTop, visTop)) / visSpan
          : 0;
        raw = Math.max(0, Math.min(1, raw));
        /* Dead zone, then ramp. The dead zone is why a section peeking
           above the fold at REST casts no shadow.

           THE SLOPE WAS RAISED 2026-08-20 (was `(raw - 0.12) * 1.55`) after
           Fahad reported three times that nothing was fading. Nothing was
           broken: the ramp was simply back-loaded. It only reached full
           strength at raw 0.765, by which point the next page already
           covered three quarters of the screen, so while a heading was
           still readable the shadow sat around 0.05 to 0.15 and read as
           nothing at all. It now tops out at raw 0.626, which puts real
           darkness on the page while there is still page to see. */
        var p = Math.max(0, Math.min(1, (raw - 0.10) * 1.90));
        dimT[i] = 0.55 * p;
        /* AND THE CONTENT ITSELF FADES (Fahad, 2026-08-20: "nor the page
           nor the heading are fading"). A shadow over a page is not what
           "fading" describes, and the oversized Anton headings sat on top
           of it looking untouched. The beat's children, headings included,
           now drop toward 0.12 opacity on the same curve. The beat's own
           background is left alone, so the page dissolves rather than
           turning transparent and showing the one underneath. */
        fadeT[i] = 1 - 0.88 * p;
      }
    }

    function writeDim(i) { dims[i].style.opacity = dimV[i].toFixed(3); }
    function writeFade(i) { beats[i].style.setProperty('--retire', fadeV[i].toFixed(3)); }

    var lastT = 0, running = false;
    function frame(now) {
      // Clamped so a backgrounded tab returning does not jump the whole
      // elapsed time into one frame.
      var dt = lastT ? Math.min((now - lastT) / 1000, 0.05) : 1 / 60;
      lastT = now;
      var k = reduceMotion ? 1 : 1 - Math.exp(-dt / SCRUB_TAU);
      // Write only what actually moved. Restyling every element on every
      // frame because ONE of them is easing is ten wasted style
      // invalidations a frame on the flagship.
      var moving = false, d;
      for (var i = 0; i < dimT.length; i++) {
        d = dimT[i] - dimV[i];
        if (Math.abs(d) < 0.0015) { if (dimV[i] !== dimT[i]) { dimV[i] = dimT[i]; writeDim(i); } }
        else { dimV[i] += d * k; moving = true; writeDim(i); }
        d = fadeT[i] - fadeV[i];
        if (Math.abs(d) < 0.0015) { if (fadeV[i] !== fadeT[i]) { fadeV[i] = fadeT[i]; writeFade(i); } }
        else { fadeV[i] += d * k; moving = true; writeFade(i); }
      }
      if (moving) { requestAnimationFrame(frame); }
      else { running = false; lastT = 0; }
    }

    function kick() {
      measure();
      if (!running) { running = true; lastT = 0; requestAnimationFrame(frame); }
    }
    window.addEventListener('scroll', kick, { passive: true });
    window.addEventListener('resize', kick);

    /* KEYBOARD REACHABILITY (6.23). A fixed element cannot be scrolled
       into view, so once the footer left the flow, tabbing into it put
       focus on a link the clip had hidden: no scroll, no visible focus
       ring, nothing to tell the visitor where they were. That is a
       regression this reveal introduced and it has to travel with it.
       Focus entering the footer now takes the page to the bottom, which
       is the position where the footer is fully uncovered. Lenis owns
       the scroll when it is running, so it is asked rather than
       bypassed, and `immediate` keeps a keyboard jump instant instead of
       gliding for a second while focus is already elsewhere. */
    if (footerStage && siteFooter) {
      siteFooter.addEventListener('focusin', function () {
        var stageTop = footerStage.getBoundingClientRect().top;
        if (stageTop <= window.innerHeight - siteFooter.offsetHeight + 1) return;
        var y = document.documentElement.scrollHeight - window.innerHeight;
        if (lenis) lenis.scrollTo(y, { immediate: true });
        else window.scrollTo(0, y);
      });
    }

    // First paint lands ON the resting state rather than easing into it
    // from zero: nothing at rest should animate on load.
    measure();
    for (i0 = 0; i0 < dimT.length; i0++) {
      dimV[i0] = dimT[i0]; writeDim(i0);
      fadeV[i0] = fadeT[i0]; writeFade(i0);
    }
  }

  /* ------------------------------------------------------------------
     Header: navy over the hero, paper once scrolled past it.
     (The 2026-08-19 scroll experience — deck measurements, nav
     auto-hide, the ?fxcheck gate chip — is removed by Fahad's revert
     ruling; the full version is parked in
     `../06 - Archive/scroll-experience-v3-2026-08-19/main.js`.)
     ------------------------------------------------------------------ */
  var header = document.querySelector('header.site');
  var hero = document.querySelector('.hero-stage');

  function navRemoved() {
    // The bar is removed from the top on desktop (Fahad, 2026-08-19
    // night); phones keep it — the burger is their only navigation.
    return window.innerWidth >= 901;
  }
  function setHeaderH() {
    if (!header) return;
    // With the bar removed the hero owns the top of the screen: its
    // header offset collapses to zero. Mobile keeps the measured bar.
    root.style.setProperty('--header-h',
      navRemoved() ? '0px' : header.offsetHeight + 'px');
  }
  setHeaderH();
  window.addEventListener('resize', setHeaderH);

  function onScroll() {
    if (!header) return;
    var trigger = hero ? hero.offsetHeight - 80 : 40;
    header.classList.toggle('on-paper', window.scrollY > trigger);
  }
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  /* ------------------------------------------------------------------
     The bar as an overlay drawn by intent (desktop): mouse to the top
     edge, pointer resting on it, keyboard focus inside it (the skip
     link and tab users — never remove this path), or the open mobile
     popover. Hidden again when none of those hold.
     ------------------------------------------------------------------ */
  var navWanted = false;
  /* PINNED BY THE MENU BUTTON (2026-08-20). Intent alone could not carry
     this: a pointer that reaches the top edge opens the bar and a pointer
     that leaves closes it, which is fine for a mouse already travelling
     there and useless as a way of TELLING someone the menu exists. A click
     has to hold the bar open past the moment the pointer moves off the
     button, so it survives until the pointer leaves the bar itself or Esc
     is pressed. */
  var navPinned = false;
  var navHint = document.querySelector('.navhint');

  function navSync() {
    if (!header) return;
    if (!navRemoved()) {
      header.classList.remove('nav-open');
      navPinned = false;
      if (navHint) navHint.setAttribute('aria-expanded', 'false');
      return;
    }
    var open = navWanted || navPinned ||
      header.contains(document.activeElement) ||
      (typeof mpop !== 'undefined' && mpop && mpop.classList.contains('open'));
    header.classList.toggle('nav-open', open);
    if (navHint) navHint.setAttribute('aria-expanded', open ? 'true' : 'false');
  }

  if (navHint) {
    navHint.addEventListener('click', function () {
      navPinned = !navPinned;
      navSync();
      // Hand focus into the bar it just opened, or a keyboard user is left
      // on a control that has vanished from under them.
      if (navPinned) {
        var first = header && header.querySelector('a[href], button:not(.navhint)');
        if (first) first.focus();
      }
    });
  }
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || !navPinned) return;
    navPinned = false;
    navSync();
    if (navHint) navHint.focus();
  });
  document.addEventListener('mousemove', function (e) {
    var want = e.clientY <= (header && header.classList.contains('nav-open')
      ? header.offsetHeight : 24);
    if (want !== navWanted) { navWanted = want; navSync(); }
  }, { passive: true });
  if (header) {
    header.addEventListener('pointerenter', function () { navWanted = true; navSync(); });
    header.addEventListener('pointerleave', function () {
      navWanted = false;
      // Leaving the bar releases a pinned open as well, or the button would
      // latch the bar on screen with no obvious way to put it back.
      navPinned = false;
      navSync();
    });
    header.addEventListener('focusin', navSync);
    header.addEventListener('focusout', function () { setTimeout(navSync, 0); });
  }
  window.addEventListener('resize', navSync);
  navSync();

  /* ------------------------------------------------------------------
     Dropdown panels (navigation-menu-4 port, 2026-08-16). Hover opens on
     pointer devices the way the Radix component does; click toggles
     everywhere, so touch and keyboard get the same menu. Panels anchor
     under their trigger; Esc closes and returns focus.
     ------------------------------------------------------------------ */
  var openDD = null;
  var openDDTrigger = null;
  var hoverable = window.matchMedia('(hover: hover)').matches;

  function closeDD(returnFocus) {
    if (!openDD) return;
    openDD.classList.remove('open');
    if (openDDTrigger) {
      openDDTrigger.setAttribute('aria-expanded', 'false');
      if (returnFocus) openDDTrigger.focus();
    }
    openDD = null;
    openDDTrigger = null;
  }

  function openDropdown(trigger, panel) {
    if (openDD && openDD !== panel) closeDD(false);
    // Anchor the panel under its trigger, clamped to the viewport edge.
    // Measured with rects: the menu is absolutely centered, so offsetLeft
    // would be relative to the menu, not the header row the panel lives in.
    var row = trigger.closest('.hrow');
    var left = trigger.getBoundingClientRect().left - row.getBoundingClientRect().left;
    var max = document.documentElement.clientWidth - panel.offsetWidth - 12;
    panel.style.setProperty('--dd-left', Math.max(12, Math.min(left, max)) + 'px');
    panel.classList.add('open');
    trigger.setAttribute('aria-expanded', 'true');
    openDD = panel;
    openDDTrigger = trigger;
  }

  document.querySelectorAll('[data-dd]').forEach(function (trigger) {
    var panel = document.getElementById(trigger.getAttribute('data-dd'));
    if (!panel) return;

    trigger.addEventListener('click', function () {
      if (openDD === panel) { closeDD(false); return; }
      openDropdown(trigger, panel);
    });

    if (hoverable) {
      var closeTimer = null;
      function armClose() {
        closeTimer = setTimeout(function () {
          if (openDD === panel) closeDD(false);
        }, 140);
      }
      function disarm() { if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; } }
      trigger.addEventListener('pointerenter', function () { disarm(); openDropdown(trigger, panel); });
      trigger.addEventListener('pointerleave', armClose);
      panel.addEventListener('pointerenter', disarm);
      panel.addEventListener('pointerleave', armClose);
    }
  });

  /* ------------------------------------------------------------------
     Mobile popover. The burger morphs to an X via aria-expanded (the
     component's animation, ported to CSS attribute selectors).
     ------------------------------------------------------------------ */
  var burger = document.querySelector('.burger');
  var mpop = document.getElementById('mpop');

  function toggleMobile(open) {
    if (!mpop || !burger) return;
    mpop.classList.toggle('open', open);
    burger.setAttribute('aria-expanded', open ? 'true' : 'false');
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    if (open) {
      var first = mpop.querySelector('a');
      if (first) first.focus();
    } else {
      burger.focus();
    }
  }
  if (burger) {
    burger.addEventListener('click', function () {
      toggleMobile(!mpop.classList.contains('open'));
    });
  }

  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    if (openDD) { closeDD(true); return; }
    if (mpop && mpop.classList.contains('open')) { toggleMobile(false); return; }
    var sheet = document.querySelector('.sheet.open');
    if (sheet) closeSheet(sheet);
  });

  document.addEventListener('click', function (e) {
    if (openDD && !openDD.contains(e.target) &&
        !(openDDTrigger && openDDTrigger.contains(e.target))) {
      closeDD(false);
    }
    if (mpop && mpop.classList.contains('open') &&
        !mpop.contains(e.target) && !(burger && burger.contains(e.target))) {
      toggleMobile(false);
    }
  });

  /* ------------------------------------------------------------------
     Sheets (quote / booking). Focus trapped while open.
     ------------------------------------------------------------------ */
  var lastSheetTrigger = null;

  function openSheet(sheet) {
    sheet.classList.add('open');
    document.body.style.overflow = 'hidden';
    if (lenis) lenis.stop();  // wheel must not scroll the page behind a dialog
    // Freeze the testimonial strip for the dialog's whole lifetime, so the
    // card the reader opened has not moved when focus returns to it.
    root.classList.add('sheet-open');
    // A content-only dialog (the testimonial records) has no form control and
    // its only button is .close, which this selector deliberately skips.
    // Without the fallbacks focus would stay on the trigger BEHIND the
    // backdrop, so the panel itself is the last resort.
    var first = sheet.querySelector('input, textarea, button:not(.close)')
      || sheet.querySelector('.panel[tabindex]')
      || sheet.querySelector('.close');
    if (first) first.focus();
  }
  function closeSheet(sheet) {
    sheet.classList.remove('open');
    document.body.style.overflow = '';
    if (lenis) lenis.start();
    root.classList.remove('sheet-open');
    // Guarded: the trigger may be a card that is no longer in the document.
    if (lastSheetTrigger && document.contains(lastSheetTrigger)) lastSheetTrigger.focus();
    else { var h = document.getElementById('tstm-h'); if (h) h.focus(); }
    lastSheetTrigger = null;
  }

  // DELEGATED, not a parse-time loop over existing nodes: the testimonial
  // strip clones its cards in JS for the seamless loop, and a clone created
  // later could never be wired by a loop that already ran. Clones carry no
  // ids, so data-focus-return names the ORIGINAL card to hand focus back to.
  document.addEventListener('click', function (e) {
    var trigger = e.target.closest && e.target.closest('[data-open]');
    if (!trigger) return;
    var sheet = document.getElementById(trigger.getAttribute('data-open'));
    if (!sheet) return;
    e.preventDefault();
    var ret = trigger.getAttribute('data-focus-return');
    lastSheetTrigger = (ret && document.getElementById(ret)) || trigger;
    closeDD(false);
    if (mpop && mpop.classList.contains('open')) toggleMobile(false);
    openSheet(sheet);
  });

  document.querySelectorAll('.sheet').forEach(function (sheet) {
    sheet.addEventListener('click', function (e) { if (e.target === sheet) closeSheet(sheet); });
    var close = sheet.querySelector('.close');
    if (close) close.addEventListener('click', function () { closeSheet(sheet); });

    // Trap Tab inside an open sheet.
    sheet.addEventListener('keydown', function (e) {
      if (e.key !== 'Tab') return;
      var focusable = sheet.querySelectorAll('a[href], button, input, textarea, select');
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  });

  /* ------------------------------------------------------------------
     "SOMETHING ELSE", AND THE LINE THAT FOLLOWS IT (Fahad, 2026-08-20).

     A project list that ends in "Something else" and stops there hands
     Zain the one answer he cannot act on, so the field opens a line to
     say what it is.

     THE LINE IS IN THE MARKUP UNHIDDEN and this folds it away, which is
     the right way round for rule 31: with no JS it is an optional field
     on the form and the enquiry still says what it is about. The reverse
     (hidden in HTML, revealed here) would take it off the no-JS page.

     Focus moves into it only on a CHANGE, never on the first pass: this
     runs at load, and a page that grabs focus on load throws a keyboard
     user out of wherever they were.
     ------------------------------------------------------------------ */
  document.querySelectorAll('[data-other-for]').forEach(function (field) {
    var select = document.getElementById(field.getAttribute('data-other-for'));
    if (!select) return;
    var match = field.getAttribute('data-other-value');
    function sync(moveFocus) {
      var on = select.value === match;
      field.hidden = !on;
      if (on && moveFocus) {
        var input = field.querySelector('input');
        if (input) input.focus();
      }
    }
    sync(false);
    select.addEventListener('change', function () { sync(true); });
  });

  /* ------------------------------------------------------------------
     Chips: multi-select, state carried by aria-pressed not colour alone.
     ------------------------------------------------------------------ */
  document.querySelectorAll('.chips button').forEach(function (chip) {
    chip.addEventListener('click', function () {
      var on = chip.getAttribute('aria-pressed') === 'true';
      chip.setAttribute('aria-pressed', on ? 'false' : 'true');
    });
  });

  /* ------------------------------------------------------------------
     CALLBACK WINDOWS (register F11, Fahad's ruling 2026-08-20).

     The field used to offer Morning / Afternoon / Evening, which was
     vague but never wrong. Two-hour windows are specific, and specific
     is only an improvement if it is also true: Zain works 8 to 9 Monday
     to Thursday, 12:30 to 10 on Friday, 8 to 7 on Saturday, and not at
     all on Sunday, so one fixed list would sell Friday mornings and
     Saturday evenings that do not exist.

     So the list is a function of the chosen DATE. The tiling rule lives
     in generate.py (`_tile`) and arrives here as a per-weekday map on
     the form, which is why this file can hold the behaviour without
     holding a single one of Zain's hours. Before a date is picked, and
     with no JS at all, the server-rendered envelope list stands and the
     date field still accepts "weekday evenings" as free text.
     ------------------------------------------------------------------ */
  document.querySelectorAll('form[data-windows]').forEach(function (form) {
    var select = form.querySelector('[data-window-list]');
    if (!select) return;
    var map;
    try { map = JSON.parse(form.getAttribute('data-windows')); } catch (err) { return; }

    // Snapshots, not strings: options are rebuilt by cloning nodes, so a
    // window label can never be parsed as markup on its way back in.
    var generic = Array.prototype.map.call(select.options, function (o) { return o.cloneNode(true); });
    var anytime = select.options[0].cloneNode(true);

    function render(nodes) {
      while (select.firstChild) select.removeChild(select.firstChild);
      nodes.forEach(function (n) { select.appendChild(n.cloneNode(true)); });
    }

    form.addEventListener('dpick:change', function (e) {
      var iso = e.detail && e.detail.iso;
      var keep = select.value;
      if (!iso) {
        render(generic);
      } else {
        var p = iso.split('-');
        var nodes = [anytime];
        ZEF.windowsOn(map, new Date(+p[0], +p[1] - 1, +p[2])).forEach(function (w) {
          var o = document.createElement('option');
          o.textContent = w.l;
          nodes.push(o);
        });
        render(nodes);
      }
      // Hold the visitor's choice when the new day still offers it, rather
      // than resetting a decision they already made.
      var still = false;
      for (var i = 0; i < select.options.length; i++) {
        if (select.options[i].value === keep) { still = true; break; }
      }
      select.value = still ? keep : '';
    });
  });

  /* ------------------------------------------------------------------
     Forms: validate on BLUR, never on keystroke (UX gate). Errors are
     announced in text and tied to the field.
     ------------------------------------------------------------------ */
  document.querySelectorAll('form[data-validate]').forEach(function (form) {
    var fields = form.querySelectorAll('.field input[required], .field textarea[required]');

    /* novalidate is set HERE, not in the markup. With JS the custom errors
       below are the designed path and the browser's own bubbles would fire
       first and fight them; without JS the browser's checking is the only
       checking there is, and writing novalidate into the markup would take
       it away from the one visitor who has nothing else. */
    form.noValidate = true;

    function validate(input) {
      var field = input.closest('.field');
      var ok = input.checkValidity() && input.value.trim() !== '';
      field.classList.toggle('invalid', !ok);
      input.setAttribute('aria-invalid', ok ? 'false' : 'true');
      return ok;
    }

    fields.forEach(function (input) {
      input.addEventListener('blur', function () { validate(input); });
      // Once a field is marked invalid, clear it as soon as it becomes valid,
      // rather than making the user tab away again to see it resolve.
      input.addEventListener('input', function () {
        if (input.closest('.field').classList.contains('invalid')) validate(input);
      });
    });

    /* ----------------------------------------------------------------
       THE SEND (register F11, wired 2026-08-20).

       Until today this handler called preventDefault(), validated, and
       swapped to the "Got it." panel with no network call anywhere in the
       file. The visitor's name and phone number were discarded in the
       browser while they were told they had made contact.

       Three states now, and the middle one is the reason the item was
       worth doing properly:

         pending  the button is disabled and says so, so a slow network
                  cannot be double-submitted into two leads
         sent     the confirmation panel, reached ONLY after FormSubmit
                  has acknowledged the POST
         failed   the details stay on screen, the notice says the send did
                  not go through, and it hands back the phone number

       A form that answers "Got it." to a dropped POST tells the same lie
       the unwired form told, in a quieter voice. The confirmation is now
       a consequence of a resolved promise, never of a click.

       Every client fact (endpoint, recipients, subject, failure wording)
       is a data attribute emitted by generate.py. This file holds none of
       them, and verify() fails the build if a form ships without them.
       ---------------------------------------------------------------- */
    var btn = form.querySelector('.send');
    var notice = form.querySelector('.formerr');
    var busy = false;

    /* The email is only as readable as its field names, and Zain is the
       one reading it. The visible label IS the field's name in the email,
       so the two can never drift: the sheet's inputs carry aria-label
       (its ruled placeholder-only exception), the contact page's carry a
       visible <label>, and the required marker is stripped out. */
    function labelFor(el) {
      var aria = el.getAttribute('aria-label');
      if (aria) return aria;
      var lab = el.id && form.querySelector('label[for="' + el.id + '"]');
      if (!lab) return el.name || el.id || 'Field';
      var copy = lab.cloneNode(true);
      var req = copy.querySelector('.req');
      if (req) req.parentNode.removeChild(req);
      return copy.textContent.replace(/\s+/g, ' ').trim();
    }

    function fail() {
      busy = false;
      if (btn) { btn.disabled = false; btn.removeAttribute('aria-busy'); btn.textContent = btn.getAttribute('data-label'); }
      if (!notice) return;
      notice.textContent = form.getAttribute('data-failtext') || '';
      notice.setAttribute('tabindex', '-1');
      notice.focus();
    }

    form.addEventListener('submit', function (e) {
      e.preventDefault();
      if (busy) return;
      var firstBad = null;
      fields.forEach(function (input) { if (!validate(input) && !firstBad) firstBad = input; });
      if (firstBad) { firstBad.focus(); return; }

      var user = form.getAttribute('data-to-user');
      var domain = form.getAttribute('data-to-domain');
      var endpoint = form.getAttribute('data-endpoint');
      // No endpoint means the build shipped broken. Say so rather than
      // showing a confirmation, which is the exact failure F11 was about.
      if (!user || !domain || !endpoint || typeof fetch !== 'function') { fail(); return; }

      var payload = {};
      form.querySelectorAll('input, select, textarea').forEach(function (el) {
        if (!el.name || el.name.charAt(0) === '_') return;
        var val = (el.value || '').trim();
        if (val) payload[labelFor(el)] = val;
      });
      // Ten pages share one booking sheet, so the lead has to say which
      // page it came from or Zain cannot tell a deck enquiry from a
      // basement one before he calls.
      payload['Sent from'] = document.title;
      payload._subject = form.getAttribute('data-subject') || document.title;
      payload._template = 'box';
      payload._captcha = 'false';
      payload._honey = (form.querySelector('[name="_honey"]') || {}).value || '';
      var ccUser = form.getAttribute('data-cc-user');
      var ccDomain = form.getAttribute('data-cc-domain');
      if (ccUser && ccDomain) payload._cc = ccUser + '@' + ccDomain;

      busy = true;
      if (notice) notice.textContent = '';
      if (btn) {
        btn.setAttribute('data-label', btn.textContent);
        btn.disabled = true;
        btn.setAttribute('aria-busy', 'true');
        btn.textContent = 'Sending';
      }

      fetch(endpoint + user + '@' + domain, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify(payload)
      })
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(function () {
          form.closest('.form, .sheet .panel').classList.add('done');
          var sent = form.parentElement.querySelector('.sent');
          if (sent) { sent.setAttribute('tabindex', '-1'); sent.focus(); }
        })
        .catch(fail);
    });
  });

  /* ------------------------------------------------------------------
     Reveal on scroll, with a failsafe (prod-rules #31).
     ------------------------------------------------------------------ */
  var reveals = document.querySelectorAll('.reveal');

  function releaseAll() {
    reveals.forEach(function (el) { el.classList.add('in'); });
  }

  if (reduceMotion || !('IntersectionObserver' in window)) {
    releaseAll();
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -10% 0px' });
    reveals.forEach(function (el) { io.observe(el); });
    // If anything goes wrong with the observer, the page is never left blank.
    setTimeout(releaseAll, 3000);
  }
})();

/* =====================================================================
   Step tabs (Ashton planning-design reference, Fahad 2026-08-17).
   Without JS every panel is open and the strip is hidden (rule 31);
   arming collapses to the active panel and wires ARIA tab semantics.
   ===================================================================== */
(function () {
  'use strict';
  var widgets = document.querySelectorAll('[data-steptabs]');
  Array.prototype.forEach.call(widgets, function (w) {
    var tabs = Array.prototype.slice.call(w.querySelectorAll('.steptab'));
    var panels = Array.prototype.slice.call(w.querySelectorAll('.steppanel'));
    var list = w.querySelector('.steptablist');
    if (!tabs.length || tabs.length !== panels.length) return;
    list.setAttribute('role', 'tablist');

    function select(i, focus) {
      tabs.forEach(function (t, j) {
        t.classList.toggle('on', i === j);
        /* Ark's `data-complete`: every step BEFORE the current one stays lit,
           so the rail reads as progress rather than as one selected tab. */
        t.classList.toggle('done', j < i);
        t.setAttribute('aria-selected', i === j ? 'true' : 'false');
        t.tabIndex = i === j ? 0 : -1;
      });
      panels.forEach(function (p, j) { p.classList.toggle('on', i === j); });
      if (focus) tabs[i].focus();
    }

    tabs.forEach(function (t, i) {
      t.setAttribute('role', 'tab');
      t.setAttribute('aria-controls', t.getAttribute('data-panel'));
      panels[i].setAttribute('role', 'tabpanel');
      panels[i].setAttribute('aria-labelledby', t.id);
      panels[i].tabIndex = 0;
      t.addEventListener('click', function () { select(i); });
      t.addEventListener('keydown', function (e) {
        var d = e.key === 'ArrowRight' ? 1 : e.key === 'ArrowLeft' ? -1 : 0;
        if (!d) return;
        e.preventDefault();
        select((i + d + tabs.length) % tabs.length, true);
      });
    });
    select(0);
  });
})();

/* "How a project runs" needs no JS since 2026-08-19: the pinned-card board
   is static content and its dash crawl is CSS. The one-at-a-time tab
   handler it replaces is parked, with its markup and styles, in
   `../06 - Archive/process-pre-pinned-2026-08-19/`. */

/* =====================================================================
   Dashboard open/closed pill (Start your project, 2026-08-17).
   Read from the same SCHEMA_HOURS the page prints in full below it, so
   this is supplementary and nothing is lost without JS (rule 31).
   Evaluated in America/Toronto, not the visitor's zone: the hours are
   Zain's, and a visitor abroad would otherwise be told the wrong thing.
   ===================================================================== */
(function () {
  'use strict';
  var el = document.querySelector('.dstatus[data-hours]');
  if (!el) return;
  var spec;
  try { spec = JSON.parse(el.getAttribute('data-hours')); } catch (e) { return; }
  if (!spec || !spec.length) return;

  function toMin(s) { var p = String(s).split(':'); return (+p[0]) * 60 + (+p[1]); }

  var day, hour, min;
  try {
    var parts = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/Toronto', weekday: 'long',
      hour: '2-digit', minute: '2-digit', hour12: false
    }).formatToParts(new Date());
    parts.forEach(function (p) {
      if (p.type === 'weekday') day = p.value;
      if (p.type === 'hour') hour = +p.value;
      if (p.type === 'minute') min = +p.value;
    });
  } catch (e) { return; }
  if (!day || isNaN(hour) || isNaN(min)) return;

  var now = (hour % 24) * 60 + min;
  var open = spec.some(function (row) {
    return row.days.indexOf(day) !== -1 && now >= toMin(row.opens) && now < toMin(row.closes);
  });

  el.hidden = false;
  el.classList.toggle('isopen', open);
  el.textContent = open ? 'Open now' : 'Closed now';
})();

/* =====================================================================
   The testimonial record columns (react-day-picker era part 2: the
   TestimonialsColumn vertical marquee Fahad sent 2026-08-19, ported
   vanilla; replaces the horizontal strip of 2026-08-17). His standing
   rulings carry over unchanged: it scrolls, hover stops it, and a card
   click still pops the review in a small window.

   Rule 31: the served markup is one plain flat list holding every record
   exactly once, and nothing here is required to read them. This script
   rebuilds it into 1 to 3 vertical columns (by viewport, so every record
   is present at every width), appends one aria-hidden clone set per
   column for the seamless -50% loop, and arms the controls. The CSS only
   masks and animates a container marked data-armed, so the JS-less page
   never hides a card.

   WCAG 2.2.2: hover-to-pause is a convenience, not conformance, because it
   strands keyboard and touch users. The Pause button is the real mechanism
   and it LATCHES: once pressed, moving the mouse away does not restart the
   columns. Focus entering a column also pauses them (CSS), so a keyboard
   user tabbing through cards is never reading a moving target.
   ===================================================================== */
(function () {
  'use strict';
  var wrap = document.querySelector('[data-marquee]');
  if (!wrap) return;
  var seed = wrap.querySelector('.rectrack');
  if (!seed || !seed.children.length) return;

  var root = document.documentElement;
  var btn = document.getElementById('recpause');
  var state = document.getElementById('recstate');

  /* --- the columns --------------------------------------------------------
     The pristine card nodes are held once; every (re)build MOVES them into
     fresh columns, so the record sheets' global data-open wiring survives.
     Clones are hidden from assistive tech and taken out of the tab order,
     and stripped of ids so nothing is duplicated in the accessibility tree
     or in document.getElementById. The reference's three paces (15/19/17s
     per set of three) are scaled by each column's card count so a taller
     column is not simply faster. */
  var originals = Array.prototype.slice.call(seed.children);
  // Faster again per Fahad 2026-08-19 (reference 15/19/17, then 10/12.5/11,
  // now this). The three paces stay unequal on purpose: equal columns read
  // as one block sliding, which is the thing the staggered reference avoids.
  var DURS = [6.5, 8, 7];
  var mqMd = window.matchMedia('(min-width: 700px)');
  var mqLg = window.matchMedia('(min-width: 1060px)');

  function buildCols() {
    var n = mqLg.matches ? 3 : (mqMd.matches ? 2 : 1);
    var per = Math.ceil(originals.length / n);
    wrap.innerHTML = '';
    for (var c = 0; c < n; c++) {
      var chunk = originals.slice(c * per, (c + 1) * per);
      if (!chunk.length) continue;
      var col = document.createElement('div');
      col.className = 'reccol';
      var ul = document.createElement('ul');
      ul.className = 'rectrack';
      ul.setAttribute('role', 'list');
      chunk.forEach(function (li) { ul.appendChild(li); });
      chunk.forEach(function (li) {
        var k = li.cloneNode(true);
        k.setAttribute('aria-hidden', 'true');
        k.querySelectorAll('[id]').forEach(function (x) { x.removeAttribute('id'); });
        k.querySelectorAll('button, a').forEach(function (x) { x.tabIndex = -1; });
        ul.appendChild(k);
      });
      ul.style.setProperty('--col-dur',
        Math.round(DURS[c % DURS.length] * chunk.length / 3 * 10) / 10 + 's');
      col.appendChild(ul);
      wrap.appendChild(col);
    }
    wrap.setAttribute('data-armed', '');
    clampAll();
  }

  /* --- "... More", Google's own truncation (Fahad, 2026-08-20) -------------
     The card shows three lines and hands the rest to the dialog. Where the
     text runs out is MEASURED, never a character budget: the same sentence
     is a different number of lines in the fallback font than in the real
     one, and a budget tuned to today's placeholder copy is wrong the first
     time one of Zain's real reviews lands.

     The button lives INSIDE the paragraph, so the search below measures the
     line WITH it in place and the trimmed text always leaves room for it.
     Absolutely positioning it over the last line would have been fewer
     lines of code and would have covered whatever word was underneath.

     A review that fits whole keeps no button at all, which is what Google
     does too: the "More" is a promise that there is more. */
  var FITS = 1;   // px of tolerance, so a quote that exactly fills three
                  // lines is not truncated by a sub-pixel rounding.

  function clampQuote(p) {
    var t = p.querySelector('.recqt');
    if (!t) return;
    if (t.dataset.full === undefined) t.dataset.full = t.textContent;
    var full = t.dataset.full;

    // Always re-measure from the FULL text: this runs again when the fonts
    // land and when the card changes width, and a second pass over an
    // already-trimmed string would eat the review a few words at a time.
    t.textContent = full;
    p.removeAttribute('data-clipped');
    if (p.scrollHeight <= p.clientHeight + FITS) return;

    p.setAttribute('data-clipped', '');   // the button is now in the flow
    var lo = 0, hi = full.length;
    while (lo < hi) {
      var mid = (lo + hi + 1) >> 1;
      t.textContent = full.slice(0, mid) + '\u2026\u00a0';
      if (p.scrollHeight <= p.clientHeight + FITS) lo = mid; else hi = mid - 1;
    }
    // Back off to a word boundary. The search cuts mid-word by design (it is
    // looking for the widest string that fits) and a shorter string always
    // still fits, so trimming here cannot push the line over again.
    var cut = full.slice(0, lo);
    var sp = cut.lastIndexOf(' ');
    if (sp > 0) cut = cut.slice(0, sp);
    t.textContent = cut.replace(/[\s.,;:!?]+$/, '') + '\u2026\u00a0';
  }

  var lastW = 0;
  function clampAll() {
    var card = wrap.querySelector('.rec');
    lastW = card ? Math.round(card.getBoundingClientRect().width) : 0;
    wrap.querySelectorAll('.recq').forEach(clampQuote);
  }

  buildCols();
  mqMd.addEventListener('change', buildCols);
  mqLg.addEventListener('change', buildCols);

  // The first pass ran on the fallback face. Instrument Sans sets a different
  // number of characters per line, so the cut is taken again once it is in.
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(clampAll);

  // Card width is min(348px, 86vw): fixed on a desktop resize, but a phone
  // rotating changes it, and the trim made for the wider card would then run
  // to a fourth line and take the button off the bottom of the box with it.
  var rz;
  window.addEventListener('resize', function () {
    clearTimeout(rz);
    rz = setTimeout(function () {
      var card = wrap.querySelector('.rec');
      var w = card ? Math.round(card.getBoundingClientRect().width) : 0;
      if (w && w !== lastW) clampAll();
    }, 150);
  });

  /* --- the pause control -------------------------------------------------- */
  function paint() {
    var paused = root.classList.contains('recpaused');
    if (btn) {
      btn.textContent = paused ? 'Play the reviews' : 'Pause the reviews';
      btn.setAttribute('aria-pressed', paused ? 'true' : 'false');
    }
    if (state) state.textContent = paused ? 'Paused' : 'Scrolling';
  }

  if (btn) {
    btn.addEventListener('click', function () {
      root.classList.toggle('recpaused');
      paint();
    });
  }
  paint();

  /* --- touch: tapping the columns toggles the pause -----------------------
     A touch device has no hover, and the visible Pause button was removed at
     Fahad's request, so without this a touch user has no way to stop the
     columns at all and 2.2.2 fails for them. Taps that land on a card's own
     control are left alone so the review still opens. */
  wrap.addEventListener('pointerdown', function (e) {
    if (e.pointerType === 'mouse') return;
    if (e.target.closest && e.target.closest('button, a')) return;
    root.classList.toggle('recpaused');
    paint();
  });

  /* --- keyboard: bring a focused card fully into view ---------------------
     Focus already pauses the columns and lifts the fade mask in CSS (a
     focused card must never sit dimmed under the fade). A card can still be
     clipped by the container when it receives focus, so nudge the scroller;
     block:'nearest' keeps the page itself from jumping. */
  wrap.addEventListener('focusin', function (e) {
    var card = e.target.closest && e.target.closest('.rec');
    if (card && card.scrollIntoView) card.scrollIntoView({ block: 'nearest' });
  });
})();

/* =====================================================================
   Date picker (react-day-picker "Calendar" port, 2026-08-19; replaces
   the Ark UI header of 2026-08-18, same shell and behaviours)
   The booking sheet's "When suits you" field. Ported per the Build-5
   precedent: the behaviour, never the framework. What the component does
   is here as vanilla JS: calendar popup with a centred month caption,
   prev and next at the edges, disabled past days, a today dot,
   click-outside and Esc to close, arrow-key movement on the grid, and a
   clear control. The field STAYS free text: picking a day writes a
   formatted date, typing writes whatever the caller wants to say.
   Month/year jump selects came out with the reskin — the range is
   capped at a year, so prev/next covers it the way the reference does.
   ===================================================================== */
(function () {
  'use strict';

  var MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];
  var DOW = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  document.querySelectorAll('.dpick').forEach(arm);

  function arm(wrap) {
    var input = wrap.querySelector('input');
    var btnClear = wrap.querySelector('.dpick-clear');
    var btnOpen = wrap.querySelector('.dpick-open');
    var pop = wrap.querySelector('.dpick-pop');
    var control = wrap.querySelector('.dpick-control');
    if (!input || !btnClear || !btnOpen || !pop || !control) return;

    btnOpen.hidden = false;

    /* A DAY WITH NO CALLBACK WINDOWS CANNOT BE CHOSEN (F11). The form
       carries the per-weekday map; one rule closes Sunday and also retires
       today once its last window has passed. Where there is no map (any
       other .dpick) nothing is blocked and this stays a plain date field. */
    var owner = wrap.closest('form');
    var wmap = null;
    if (owner && owner.getAttribute('data-windows')) {
      try { wmap = JSON.parse(owner.getAttribute('data-windows')); } catch (err) { wmap = null; }
    }
    function shut(d) { return !!wmap && !ZEF.windowsOn(wmap, d).length; }
    function announce(iso) {
      wrap.dispatchEvent(new CustomEvent('dpick:change', { bubbles: true, detail: { iso: iso } }));
    }

    var today = new Date();
    today.setHours(0, 0, 0, 0);
    var view = { y: today.getFullYear(), m: today.getMonth() };
    var selected = null;

    function fmt(d) {
      return new Intl.DateTimeFormat('en-CA', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
      }).format(d);
    }
    /* The long form is what a screen reader should hear on a day button.
       The SHORT form is what gets written into the field, because the row
       now shares its width evenly with the callback windows and "Friday,
       August 21, 2026" no longer fits. Both are the same date. */
    function fmtShort(d) {
      return new Intl.DateTimeFormat('en-CA', {
        weekday: 'short', month: 'short', day: 'numeric', year: 'numeric'
      }).format(d);
    }
    function sameDay(a, b) {
      return a && b && a.getFullYear() === b.getFullYear() &&
        a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
    }
    function atCurrentMonth() {
      return view.y === today.getFullYear() && view.m === today.getMonth();
    }

    /* The grid is rebuilt from scratch on every state change. Cheap at
       42 buttons, and it keeps the render a pure function of (view,
       selected) with no incremental-update bugs. */
    function build(focusDay) {
      var maxY = today.getFullYear() + 1;
      var h = '<div class="dpick-head">' +
        '<button class="dpick-nav" type="button" data-nav="-1" aria-label="Previous month"' +
        (atCurrentMonth() ? ' disabled' : '') + '>' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 5l-7 7 7 7"/></svg></button>' +
        '<span class="dpick-caption">' + MONTHS[view.m] + ' ' + view.y + '</span>' +
        '<button class="dpick-nav" type="button" data-nav="1" aria-label="Next month"' +
        (view.y === maxY && view.m === 11 ? ' disabled' : '') + '>' +
        '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg></button></div>';

      h += '<div class="dpick-grid" role="grid" aria-label="' + MONTHS[view.m] + ' ' + view.y + '">';
      DOW.forEach(function (d) { h += '<span class="dow" aria-hidden="true">' + d + '</span>'; });

      var first = new Date(view.y, view.m, 1);
      var start = new Date(view.y, view.m, 1 - first.getDay());
      var focusable = null;
      var cells = [];
      for (var i = 0; i < 42; i++) {
        var d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i);
        var out = d.getMonth() !== view.m;
        var past = d < today;
        var closed = shut(d);
        var isSel = sameDay(d, selected);
        var isToday = sameDay(d, today);
        var iso = d.getFullYear() + '-' +
          ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
        cells.push({ iso: iso, past: past, sel: isSel, today: isToday });
        h += '<button type="button" class="dpick-day' + (out ? ' out' : '') + '"' +
          ' data-iso="' + iso + '"' + (past || closed ? ' disabled' : '') +
          (isToday ? ' data-today=""' : '') +
          ' aria-pressed="' + (isSel ? 'true' : 'false') + '"' +
          ' aria-label="' + fmt(d) + '" tabindex="-1">' + d.getDate() + '</button>';
      }
      h += '</div>';
      pop.innerHTML = h;

      /* Roving tabindex: the selected day, else today, else the first
         enabled day carries the tab stop. */
      var days = pop.querySelectorAll('.dpick-day');
      var stop = pop.querySelector('.dpick-day[aria-pressed="true"]:not(:disabled)') ||
        pop.querySelector('.dpick-day[data-today]:not(:disabled)') ||
        pop.querySelector('.dpick-day:not(:disabled)');
      if (stop) stop.tabIndex = 0;
      if (focusDay && stop) stop.focus();

      pop.querySelectorAll('.dpick-nav').forEach(function (b) {
        b.addEventListener('click', function () { shift(+b.getAttribute('data-nav')); });
      });
      days.forEach(function (b) {
        b.addEventListener('click', function () { pick(b.getAttribute('data-iso')); });
      });
    }

    function clampView() {
      if (view.y === today.getFullYear() && view.m < today.getMonth()) view.m = today.getMonth();
    }
    function shift(dir) {
      view.m += dir;
      if (view.m < 0) { view.m = 11; view.y--; }
      if (view.m > 11) { view.m = 0; view.y++; }
      clampView();
      build(false);
    }

    function pick(iso) {
      var p = iso.split('-');
      selected = new Date(+p[0], +p[1] - 1, +p[2]);
      input.value = fmtShort(selected);
      btnClear.hidden = false;
      announce(iso);
      close(true);
    }

    /* THE POPOVER IS FIXED, SO ITS POSITION IS THIS FUNCTION'S JOB (Fahad,
       2026-08-28: the form must not expand when the calendar opens). See
       the .dpick-pop block in site.css for why fixed and not absolute.
       Measured AFTER build(), because a popover with no month in it yet has
       no height to flip against. Below the field by default; above it when
       the viewport has no room below, which is the common case for a field
       near the bottom of the booking sheet; and clamped into the viewport
       if neither side fits, so it can never open off screen.

       THIS ONLY READS THE VIEWPORT BECAUSE open() PORTALS THE POPOVER TO
       <body> FIRST -- see there. Left in place it inherits whichever
       ancestor is mid-transform, and every number below silently becomes
       relative to that box instead. */
    function place() {
      if (pop.hidden) return;
      var GAP = 8, EDGE = 8;
      var r = control.getBoundingClientRect();
      var w = pop.offsetWidth, h = pop.offsetHeight;
      var left = Math.max(EDGE, Math.min(r.left, window.innerWidth - w - EDGE));
      var top = r.bottom + GAP;
      if (top + h > window.innerHeight - EDGE) {
        top = (r.top - GAP - h >= EDGE)
          ? r.top - GAP - h
          : Math.max(EDGE, window.innerHeight - h - EDGE);
      }
      pop.style.left = left + 'px';
      pop.style.top = top + 'px';
    }

    /* THE POPOVER IS PORTALED TO <body> WHILE IT IS OPEN, AND WITHOUT THIS
       `position: fixed` DOES NOT MEAN THE VIEWPORT. A transform on ANY
       ancestor makes that ancestor the containing block for a fixed
       descendant, and this site puts a transform on the one element every
       form sits inside: `html.js .reveal` is `translateY(24px)` until its
       entrance finishes. Left in place the calendar was laid out against
       the reveal box and opened hundreds of pixels from its own field --
       photographed on the home page's closing form, 2026-08-28, before
       this was added.

       It goes back into the wrapper on close, so the markup a no-JS
       visitor gets is never disturbed and the CSS scoping still reads.
       Two things follow the popover out and are handled below: the
       `.in-sheet` skin (the booking sheet's radius rules cannot reach it
       at <body>), and the key/outside-click handlers, which have to watch
       `pop` as well as `wrap` now that one is not inside the other. */
    var inSheet = !!wrap.closest('.panel.duo');

    function open() {
      view.y = (selected || today).getFullYear();
      view.m = (selected || today).getMonth();
      clampView();
      if (inSheet) pop.classList.add('in-sheet');
      document.body.appendChild(pop);
      pop.hidden = false;
      btnOpen.setAttribute('aria-expanded', 'true');
      build(true);
      place();
    }
    function close(returnFocus) {
      pop.hidden = true;
      pop.innerHTML = '';
      pop.classList.remove('in-sheet');
      pop.removeAttribute('style');
      wrap.appendChild(pop);
      btnOpen.setAttribute('aria-expanded', 'false');
      if (returnFocus) btnOpen.focus();
    }

    /* Capture phase, so scrolling the SHEET'S OWN panel repositions it too:
       .bkform scrolls independently of the window and a bubbling scroll
       listener on window never hears it. place() no-ops while closed. */
    window.addEventListener('scroll', place, true);
    window.addEventListener('resize', place);

    btnOpen.addEventListener('click', function () {
      if (pop.hidden) open(); else close(true);
    });

    /* A LOCKED FIELD IS PICKED, NEVER TYPED (Fahad, 2026-08-20: "when you
       click into date, it should pull up calendar, customer should not be
       able to type"). Opt-in per instance: the booking sheet's field is
       deliberately free text so "weekday evenings" stays a valid answer,
       and only a field carrying data-locked gives that up.

       `readonly` is set HERE and not written into the markup, for the same
       reason `novalidate` is: with no JS there is no calendar, and a field
       nobody can type in and nothing can fill is a dead field.

       THE PLACEHOLDER IS THE ATTRIBUTE'S VALUE, and an empty `data-locked`
       leaves the authored one alone. A placeholder that offers a typed
       answer has to go when the field stops accepting one -- the closing
       form said "Weekday evenings", which is now unanswerable -- but the
       booking sheet's fields are PLACEHOLDER-ONLY by ruling, so there its
       placeholder is the field's only visible label and overwriting it
       would leave a box with no name. Set it per instance, in the markup,
       where the two conventions are visible.

       readonly, NOT disabled: a disabled field is skipped by the tab order
       and its value is not submitted, which would drop the date on send.

       Opening on CLICK and on Enter / Space / Down, never on focus: focus
       returns to this field after a pick, and opening on focus would
       reopen the calendar the moment it closed. mousedown is where the
       caret and the text selection are stopped. */
    if (wrap.hasAttribute('data-locked')) {
      input.readOnly = true;
      var lockedPlaceholder = wrap.getAttribute('data-locked');
      if (lockedPlaceholder) input.placeholder = lockedPlaceholder;
      input.addEventListener('mousedown', function (e) {
        e.preventDefault();
        input.focus();
        if (pop.hidden) open(); else close(false);
      });
      input.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
          e.preventDefault();   // Enter would otherwise submit the form
          if (pop.hidden) open();
        }
      });
    }

    btnClear.addEventListener('click', function () {
      selected = null;
      input.value = '';
      btnClear.hidden = true;
      announce(null);
      input.focus();
    });
    /* Typed text gets the clear control too, exactly like the component's
       ClearTrigger; typing after a pick simply overrides the pick. */
    input.addEventListener('input', function () {
      btnClear.hidden = input.value === '';
      // Typing overrides a pick, and "weekday evenings" names no weekday,
      // so the windows go back to the envelope list until a date is chosen.
      if (selected || input.value === '') { selected = null; announce(null); }
    });

    /* Esc closes the calendar WITHOUT closing the booking sheet around
       it: this listener sits below the document-level sheet handler, so
       stopping propagation here eats the first Esc.

       BOUND TO BOTH `wrap` AND `pop`, because while the calendar is open
       the two are separate subtrees (see open()'s portal note) and the day
       buttons this navigates live in `pop`.

       TAB CLOSES rather than moving through 42 day buttons, and that is
       what keeps the booking sheet's focus trap honest: the trap collects
       focusables from inside the sheet, and a portaled calendar is not in
       that list. Closing first returns focus to the trigger, which IS, so
       the Tab that follows moves inside the sheet as it should. */
    function onKey(e) {
      if (e.key === 'Escape' && !pop.hidden) {
        e.stopPropagation();
        close(true);
        return;
      }
      if (e.key === 'Tab' && !pop.hidden) { close(true); return; }
      var day = e.target.closest && e.target.closest('.dpick-day');
      if (!day) return;
      var step = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 }[e.key];
      if (!step) return;
      e.preventDefault();
      var d = day.getAttribute('data-iso').split('-');
      /* STEP OVER unavailable days, do not step into them. Disabling Sunday
         put a hole in the middle of the grid, and a single step left
         ArrowRight from any Saturday landing on a disabled button with
         focus stuck where it started. */
      var next = new Date(+d[0], +d[1] - 1, +d[2]);
      for (var hop = 0; hop < 42; hop++) {
        next = new Date(next.getFullYear(), next.getMonth(), next.getDate() + step);
        if (next < today) return;
        if (next.getFullYear() > today.getFullYear() + 1) return;
        if (!shut(next)) break;
      }
      if (shut(next)) return;
      view.y = next.getFullYear();
      view.m = next.getMonth();
      build(false);
      var target = pop.querySelector('.dpick-day[data-iso="' +
        next.getFullYear() + '-' + ('0' + (next.getMonth() + 1)).slice(-2) + '-' +
        ('0' + next.getDate()).slice(-2) + '"]');
      if (target && !target.disabled) { target.tabIndex = 0; target.focus(); }
    }
    wrap.addEventListener('keydown', onKey);
    pop.addEventListener('keydown', onKey);

    /* OUTSIDE-CLICK IS DECIDED IN THE CAPTURE PHASE, NOT BY ASKING WHERE THE
       TARGET IS AFTERWARDS. `build()` replaces the popover's entire contents,
       so by the time a click on a month arrow reaches this bubble listener
       the button it was fired on has been detached -- and a detached node is
       inside nothing, so a containment test says "outside" and shuts the
       calendar on the first press of the next-month arrow. The capture
       listeners below run BEFORE the arrow's own handler rebuilds anything,
       which is the only moment the answer is reliable. Both `wrap` and `pop`
       are marked because while it is open the two are separate subtrees
       (see open()). */
    var clickedInside = false;
    function markInside() { clickedInside = true; }
    wrap.addEventListener('click', markInside, true);
    pop.addEventListener('click', markInside, true);
    document.addEventListener('click', function () {
      if (!pop.hidden && !clickedInside) close(false);
      clickedInside = false;
    });
  }
})();

/* =====================================================================
   The About stat roll (Fahad, 2026-08-21, decision board
   2026-08-21-stats-motion-demos: the slot-machine entrance, joined with
   option C's hover ink, colours inverted, in site.css).

   The figures are PLAIN TEXT in the markup and stay that way at rest:
   this module builds the digit strips only at the moment the section
   scrolls into view, rolls them, and RESTORES the plain text when the
   roll settles (rule 31 — nothing readable ever depends on JS, and a
   screenshot at rest always shows the real numbers). While a strip is
   live its <b> carries the final value as an aria-label and the strip is
   aria-hidden, so a screen reader never meets the shuffle. Reduced
   motion or no IntersectionObserver: never builds, figures never move.
   The pane freezes IO, so QA forces a roll with ZEF.rollStats().
   ===================================================================== */
(function () {
  'use strict';
  if (!document.documentElement.classList.contains('js')) return;
  var row = document.querySelector('.about .statrow');
  if (!row) return;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var done = false;

  function roll() {
    if (done) return;
    done = true;
    var figs = Array.prototype.slice.call(row.querySelectorAll('.sfig[data-roll]'));
    var longest = 0;

    // THE SETTLE MUST BE INVISIBLE (Fahad, 2026-08-21: "a small delay when
    // the slot machine numbers stop, its not completely smooth"). Two
    // things caused it, both fixed here. (1) Columns used to be as wide as
    // their widest strip digit, so restoring the plain text shifted the
    // figure by a pixel or two right after it landed — every column is now
    // WIDTH-LOCKED to its own final digit, measured off a canvas in the
    // figure's computed font (kerning is off in both states via .sfig's
    // font-kerning: none, so the sums match). (2) The strip used to start
    // on 0 and run up to the digit, which jumped the content at the start;
    // it now STARTS AND ENDS ON THE REAL DIGIT — two full loops, 21 cells,
    // landing on index 20 — so nothing on screen changes at either edge of
    // the roll except the motion itself.
    var meter = null;
    try {
      var probe = figs[0] && figs[0].closest('b');
      if (probe) {
        var cs = window.getComputedStyle(probe);
        meter = document.createElement('canvas').getContext('2d');
        meter.font = cs.fontWeight + ' ' + cs.fontSize + ' ' + cs.fontFamily;
      }
    } catch (e) { meter = null; }

    figs.forEach(function (fig) {
      var value = fig.getAttribute('data-roll');
      var b = fig.closest('b');
      if (b) b.setAttribute('aria-label', b.textContent);
      fig.setAttribute('aria-hidden', 'true');
      fig.textContent = '';
      value.split('').forEach(function (ch, ix) {
        var col = document.createElement('span'); col.className = 'scol';
        var strip = document.createElement('span'); strip.className = 'sstrip';
        for (var k = 0; k <= 20; k++) {
          var i = document.createElement('i');
          i.textContent = String((+ch + k) % 10);
          strip.appendChild(i);
        }
        if (meter) {
          var w = meter.measureText(ch).width;
          if (w > 0) col.style.width = w + 'px';
        }
        var dur = 0.9 + ix * 0.22, delay = ix * 0.06;
        strip.style.setProperty('--d', '20');
        strip.style.setProperty('--t', dur + 's');
        strip.style.setProperty('--dl', delay + 's');
        if (dur + delay > longest) longest = dur + delay;
        col.appendChild(strip); fig.appendChild(col);
      });
    });
    void row.offsetWidth;
    row.classList.add('roll');
    setTimeout(function () {
      figs.forEach(function (fig) {
        fig.textContent = fig.getAttribute('data-roll');
        fig.removeAttribute('aria-hidden');
        var b = fig.closest('b');
        if (b) b.removeAttribute('aria-label');
      });
      row.classList.remove('roll');
    }, (longest + 0.15) * 1000);
  }

  ZEF.rollStats = roll;

  if (reduceMotion || !('IntersectionObserver' in window)) return;
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      if (!entry.isIntersecting) return;
      io.disconnect();
      roll();
    });
  }, { threshold: 0.35 });
  io.observe(row);
})();

/* =====================================================================
   THE REVIEW OVERLAY (2026-08-21, preview-only — see review_overlay() in
   generate.py and the verify() guard that keeps it out of any launch
   build). Zain's draft-round tooling: a Review toggle, tap-to-pin notes,
   and long-form General notes, all posting to Fahad through the same
   FormSubmit AJAX shape the client forms use.

   PINS ARE NEVER INJECTED INTO CONTENT. Extra children inside arbitrary
   containers would shift the site's :nth-child / :nth-of-type chains (the
   statrow's column rules, the Expertise slideshow's offset-by-one panel
   pairing), so every pin lives on the fixed .rvlayer and chases its
   target's getBoundingClientRect on scroll and resize. localStorage keeps
   Zain's own pins visible across visits on his device; Fahad's record is
   the email.
   ===================================================================== */
(function () {
  'use strict';
  var root = document.querySelector('.rv');
  if (!root || !document.documentElement.classList.contains('js')) return;
  var tab = root.querySelector('.rvtab');
  var general = root.querySelector('.rvgeneral');
  var hint = root.querySelector('.rvhint');
  var layer = root.querySelector('.rvlayer');
  var sheet = root.querySelector('.rvsheet');
  var where = sheet.querySelector('.rvwhere');
  var note = sheet.querySelector('textarea');
  var send = sheet.querySelector('.rvsend');
  var cancel = sheet.querySelector('.rvcancel');
  var remove = sheet.querySelector('.rvremove');
  var status = sheet.querySelector('.rvstatus');
  var endpoint = root.getAttribute('data-endpoint');
  var address = root.getAttribute('data-to-user') + '@' + root.getAttribute('data-to-domain');
  var KEY = 'zef-review-pins';
  var pagePath = location.pathname.split('/').pop() || 'index.html';
  var on = false, ctx = null, busy = false, marks = [];

  root.hidden = false;

  function stored() {
    try { return JSON.parse(localStorage.getItem(KEY) || '[]'); }
    catch (e) { return []; }
  }
  function persist(list) {
    try { localStorage.setItem(KEY, JSON.stringify(list)); } catch (e) {}
  }

  function cssPath(el) {
    var path = [];
    while (el && el.nodeType === 1 && el !== document.documentElement) {
      var seg = el.tagName.toLowerCase(), sib = el, n = 1;
      while ((sib = sib.previousElementSibling)) n += 1;
      path.unshift(seg + ':nth-child(' + n + ')');
      el = el.parentElement;
    }
    return path.join(' > ');
  }

  function describe(el, xr, yr) {
    var section = el.closest('section, footer, header');
    var head = section && section.querySelector('h1, h2');
    var text = (el.textContent || '').replace(/\s+/g, ' ').trim();
    if (!text && el.getAttribute) text = el.getAttribute('alt') || el.tagName.toLowerCase();
    if (text.length > 70) text = text.slice(0, 67) + '...';
    var placeParts = [];
    if (head) placeParts.push((head.textContent || '').replace(/\s+/g, ' ').trim());
    if (text) placeParts.push('"' + text + '"');
    placeParts.push(Math.round(xr * 100) + '% across, ' + Math.round(yr * 100) + '% down that element');
    return placeParts.join(' / ');
  }

  function placeMark(mark) {
    var el = null;
    try { el = document.querySelector(mark.path); } catch (e) {}
    if (!el) { if (mark.dot) mark.dot.hidden = true; return; }
    if (!mark.dot) {
      mark.dot = document.createElement('button');
      mark.dot.type = 'button';
      mark.dot.className = 'rvpin rvpin-mine';
      mark.dot.setAttribute('aria-label', 'Your note here');
      mark.dot.addEventListener('click', function () { openSheet('view', mark); });
      layer.appendChild(mark.dot);
    }
    var r = el.getBoundingClientRect();
    mark.dot.hidden = r.width === 0 && r.height === 0;
    mark.dot.style.left = (r.left + mark.xr * r.width) + 'px';
    mark.dot.style.top = (r.top + mark.yr * r.height) + 'px';
  }
  function placeAll() { marks.forEach(placeMark); }
  window.addEventListener('scroll', placeAll, { passive: true });
  window.addEventListener('resize', placeAll);

  marks = stored().filter(function (m) { return m.page === pagePath; });
  marks.forEach(placeMark);

  function openSheet(mode, data) {
    sheet.hidden = false;
    status.textContent = ''; status.className = 'rvstatus';
    send.hidden = cancel.hidden = remove.hidden = true;
    note.readOnly = false;
    if (mode === 'pin') {
      ctx = data;
      where.textContent = 'Pinned to: ' + data.place;
      note.value = ''; send.hidden = cancel.hidden = false;
      note.focus();
    } else if (mode === 'general') {
      ctx = null;
      where.textContent = 'General notes about this page. Write as much as you like.';
      note.value = ''; send.hidden = cancel.hidden = false;
      note.focus();
    } else {
      ctx = data;
      where.textContent = 'Already sent to Fahad. Pinned to: ' + data.place;
      note.value = data.note; note.readOnly = true;
      cancel.hidden = remove.hidden = false;
    }
  }
  function closeSheet() {
    sheet.hidden = true;
    if (ctx && ctx.temp) { layer.removeChild(ctx.temp); }
    ctx = null;
  }

  function setMode(next) {
    on = next;
    tab.setAttribute('aria-pressed', on ? 'true' : 'false');
    hint.hidden = general.hidden = !on;
    document.body.classList.toggle('rv-on', on);
    if (!on) closeSheet();
  }
  tab.addEventListener('click', function () { setMode(!on); });
  general.addEventListener('click', function () { openSheet('general'); });
  cancel.addEventListener('click', closeSheet);
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !sheet.hidden) closeSheet();
  });

  remove.addEventListener('click', function () {
    if (!ctx || !ctx.ts) return;
    var keep = stored().filter(function (m) { return m.ts !== ctx.ts; });
    persist(keep);
    marks = marks.filter(function (m) {
      if (m.ts !== ctx.ts) return true;
      if (m.dot) layer.removeChild(m.dot);
      return false;
    });
    closeSheet();
  });

  // Capture-phase so review mode wins over every link and control on the
  // page; the overlay's own chrome is exempt.
  document.addEventListener('click', function (e) {
    if (!on || !sheet.hidden) return;
    if (e.target.closest('.rv')) return;
    e.preventDefault(); e.stopPropagation();
    var el = e.target.closest('*');
    var r = el.getBoundingClientRect();
    if (!r.width && !r.height) return;
    var xr = (e.clientX - r.left) / (r.width || 1);
    var yr = (e.clientY - r.top) / (r.height || 1);
    var temp = document.createElement('span');
    temp.className = 'rvpin';
    temp.style.left = e.clientX + 'px';
    temp.style.top = e.clientY + 'px';
    layer.appendChild(temp);
    openSheet('pin', {
      path: cssPath(el), xr: xr, yr: yr,
      place: describe(el, xr, yr), temp: temp
    });
  }, true);

  send.addEventListener('click', function () {
    if (busy) return;
    var text = (note.value || '').trim();
    if (!text) { note.focus(); return; }
    busy = true;
    send.disabled = true; send.textContent = 'Sending';
    status.textContent = ''; status.className = 'rvstatus';
    var payload = {
      'Page': document.title,
      'Note': text,
      '_subject': 'ZEF preview: note from the site review',
      '_template': 'box',
      '_captcha': 'false'
    };
    if (ctx) payload['Pinned to'] = ctx.place;
    fetch(endpoint + address, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(payload)
    })
      .then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(function () {
        status.textContent = 'Sent. Fahad has it.';
        status.className = 'rvstatus ok';
        if (ctx) {
          var mark = { page: pagePath, path: ctx.path, xr: ctx.xr, yr: ctx.yr,
                       note: text, place: ctx.place, ts: Date.now() };
          var all = stored(); all.push(mark); persist(all);
          if (ctx.temp) { layer.removeChild(ctx.temp); ctx.temp = null; }
          marks.push(mark); placeMark(mark);
        }
        setTimeout(function () { closeSheet(); }, 900);
      })
      .catch(function () {
        status.textContent = 'The send did not go through. Your note is still here. Please try once more.';
        status.className = 'rvstatus bad';
      })
      .then(function () {
        busy = false; send.disabled = false; send.textContent = 'Send to Fahad';
      });
  });
})();

/* =====================================================================
   HOME HERO SLIDESHOW (Fahad, 2026-08-22). Markup from HERO_SLIDES in
   generate.py; contracts in site.css under HOME HERO SLIDESHOW.
   6.5s hold, 1.5s fade; the outgoing slide stays opaque underneath
   (`.was-on`) while the next fades in, so the crossfade never dips to the
   ground. A dot tap is the stop control: it shows that photograph and ends
   the auto-advance for the visit. The timer skips a beat while the pointer
   rests on the hero or the tab is hidden, and it never starts under
   reduced motion. QA hook: ZEF.heroSlides.go(n) / .stop() / .index().
   ===================================================================== */
(function () {
  'use strict';
  var stage = document.querySelector('.hero-stage.home');
  var layer = stage && stage.querySelector('.hero-slides');
  if (!layer) return;
  var slides = Array.prototype.slice.call(layer.querySelectorAll('.slide'));
  var dots = Array.prototype.slice.call(stage.querySelectorAll('.herodots button'));
  if (slides.length < 2) return;
  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var HOLD = 6500, FADE = 1500;
  var i = 0, timer = null, swapTimer = null, stopped = false, hovering = false;

  function show(n) {
    n = ((n % slides.length) + slides.length) % slides.length;
    if (n === i) return;
    var prev = slides[i], next = slides[n];
    prev.classList.remove('is-on'); prev.classList.add('was-on');
    next.classList.add('is-on');
    clearTimeout(swapTimer);
    swapTimer = setTimeout(function () { prev.classList.remove('was-on'); }, FADE + 100);
    i = n;
    dots.forEach(function (d, k) {
      d.classList.toggle('is-on', k === n);
      d.setAttribute('aria-pressed', k === n ? 'true' : 'false');
    });
  }
  function tick() { if (!hovering && !document.hidden) show(i + 1); }
  function start() { if (timer || stopped || reduceMotion) return; timer = setInterval(tick, HOLD + FADE); }
  function stop() { clearInterval(timer); timer = null; stopped = true; }

  dots.forEach(function (d) {
    d.addEventListener('click', function () { stop(); show(+d.getAttribute('data-go')); });
  });
  if (window.matchMedia('(hover: hover)').matches) {
    stage.addEventListener('mouseenter', function () { hovering = true; });
    stage.addEventListener('mouseleave', function () { hovering = false; });
  }
  start();
  ZEF.heroSlides = { go: show, stop: stop, index: function () { return i; }, count: slides.length };
})();

/* =====================================================================
   PHOTOGRAPH CAROUSEL (Fahad's kitchen deck, 2026-08-22, section 4).
   Markup from photo_carousel() in generate.py; contracts in site.css
   under PHOTOGRAPH CAROUSEL.

   THE TRACK IS ALREADY A WORKING GALLERY BEFORE THIS RUNS. It is a
   scroll-snap element, so swipe, trackpad and the focused container's
   arrow keys all move it with no JS at all (rule 31). Everything here
   is ADDITIVE: the arrows, the dots, and keeping both in step with
   whatever the visitor scrolled to by hand.

   The scroll listener is rAF-coalesced because a snap scroll fires it
   dozens of times a second and the read (offsetLeft on every slide) is
   layout-thrashing if it runs per event.
   QA hook: ZEF.carousels[0].go(n) / .index() / .count.
   ===================================================================== */
(function () {
  'use strict';
  var nodes = document.querySelectorAll('[data-carousel]');
  if (!nodes.length) return;
  ZEF.carousels = [];

  Array.prototype.forEach.call(nodes, function (root) {
    var track = root.querySelector('.ctrack');
    var slides = Array.prototype.slice.call(root.querySelectorAll('.cslide'));
    var dots = Array.prototype.slice.call(root.querySelectorAll('.cdot'));
    var arrows = Array.prototype.slice.call(root.querySelectorAll('.carrow'));
    if (!track || slides.length < 2) return;
    var i = 0, queued = false;

    function go(n) {
      n = Math.max(0, Math.min(slides.length - 1, n));
      track.scrollTo({ left: slides[n].offsetLeft - slides[0].offsetLeft });
      sync(n);
    }

    /* The index the track is actually resting on: the slide whose left
       edge is nearest the scroll position. Read from the DOM rather than
       remembered, so a hand swipe and a dot press cannot disagree. */
    function nearest() {
      var x = track.scrollLeft + slides[0].offsetLeft;
      var best = 0, bestD = Infinity;
      for (var k = 0; k < slides.length; k++) {
        var d = Math.abs(slides[k].offsetLeft - x);
        if (d < bestD) { bestD = d; best = k; }
      }
      return best;
    }

    function sync(n) {
      i = n;
      slides.forEach(function (s, k) { s.classList.toggle('is-on', k === n); });
      dots.forEach(function (d, k) {
        d.classList.toggle('is-on', k === n);
        d.setAttribute('aria-pressed', k === n ? 'true' : 'false');
      });
      arrows.forEach(function (a) {
        var step = +a.getAttribute('data-step');
        a.disabled = (step < 0 && n === 0) || (step > 0 && n === slides.length - 1);
      });
    }

    track.addEventListener('scroll', function () {
      if (queued) return;
      queued = true;
      requestAnimationFrame(function () { queued = false; sync(nearest()); });
    }, { passive: true });

    arrows.forEach(function (a) {
      a.addEventListener('click', function () { go(i + (+a.getAttribute('data-step'))); });
    });
    dots.forEach(function (d) {
      d.addEventListener('click', function () { go(+d.getAttribute('data-go')); });
    });

    sync(0);
    ZEF.carousels.push({ go: go, index: function () { return i; }, count: slides.length });
  });
})();
