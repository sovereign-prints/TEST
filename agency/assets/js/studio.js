/* Fynbos Studio — interactions
   No libraries. Everything here is progressive: without JS the page
   is complete and readable, it just doesn't move. */
(function () {
  'use strict';

  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;

  /* ---- mobile nav --------------------------------------------- */
  var toggle = document.querySelector('.nav-toggle');
  var nav = document.getElementById('nav');
  if (toggle && nav) {
    toggle.addEventListener('click', function () {
      var open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) {
        nav.classList.remove('open');
        toggle.setAttribute('aria-expanded', 'false');
      }
    });
  }

  /* ---- scroll reveal (unfold toward the reader) --------------- */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window && !reduced) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        var el = entry.target;
        el.classList.add('is-in');
        io.unobserve(el);
        if (el.classList.contains('tilt')) {
          setTimeout(function () { el.classList.add('tilt-live'); }, 950);
        }
      });
    }, { rootMargin: '0px 0px -12% 0px', threshold: 0.12 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in', 'tilt-live'); });
  }

  /* ---- flip cards --------------------------------------------- */
  document.querySelectorAll('.flip').forEach(function (card) {
    card.addEventListener('click', function () {
      var on = card.getAttribute('aria-pressed') === 'true';
      card.setAttribute('aria-pressed', String(!on));
    });
  });

  /* ---- phone carousels: a dot per card, the current one long -- */
  document.querySelectorAll('.carousel').forEach(function (track) {
    var cards = Array.prototype.slice.call(track.children);
    var dots = document.createElement('div');
    dots.className = 'dots';
    dots.setAttribute('aria-hidden', 'true');
    cards.forEach(function () { dots.appendChild(document.createElement('i')); });
    track.after(dots);

    var mark = function () {
      var mid = track.scrollLeft + track.clientWidth / 2, best = 0, bestD = Infinity;
      cards.forEach(function (c, i) {
        var d = Math.abs(c.offsetLeft + c.offsetWidth / 2 - mid);
        if (d < bestD) { bestD = d; best = i; }
      });
      Array.prototype.forEach.call(dots.children, function (dot, i) { dot.classList.toggle('on', i === best); });
    };
    var pending = false;
    track.addEventListener('scroll', function () {
      if (!pending) { pending = true; requestAnimationFrame(function () { pending = false; mark(); }); }
    }, { passive: true });
    mark();
  });

  /* ---- plan buttons prefill the contact form ------------------ */
  var planSelect = document.querySelector('[data-contact] select[name="plan"]');
  document.querySelectorAll('[data-plan]').forEach(function (btn) {
    btn.addEventListener('click', function () {
      if (planSelect) planSelect.value = btn.dataset.plan;
    });
  });

  /* ---- contact form -> email ---------------------------------- */
  var form = document.querySelector('[data-contact]');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var subject = 'Website enquiry: ' + (d.get('business') || d.get('name')) + ' (' + d.get('plan') + ')';
      var body = [
        'Name: ' + d.get('name'),
        'Email: ' + d.get('email'),
        'Business: ' + (d.get('business') || '-'),
        'Package: ' + d.get('plan'),
        '',
        d.get('message')
      ].join('\n');
      window.location.href = 'mailto:hello@example.com?subject=' +
        encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
    });
  }

  var year = document.querySelector('[data-year]');
  if (year) year.textContent = new Date().getFullYear();

  /* ---- live preview: scale the 1280px iframe to its frame ------ */
  var fit = document.querySelector('[data-fit]');
  if (fit) {
    var sizeFrame = function () { fit.style.setProperty('--fit', fit.clientWidth / 1280); };
    sizeFrame();
    if ('ResizeObserver' in window) new ResizeObserver(sizeFrame).observe(fit);
    else window.addEventListener('resize', sizeFrame);
  }

  if (reduced) return;   /* everything below is motion */

  /* ---- hero: pop-up scene tilts with pointer, sways on touch --- */
  var scene = document.querySelector('[data-scene]');
  var inner = document.querySelector('[data-scene-inner]');
  if (scene && inner) {
    var target = { x: 0, y: 0 }, cur = { x: 0, y: 0 };
    var lastMove = -1e9, visible = true, raf = 0;

    if (finePointer) {
      window.addEventListener('pointermove', function (e) {
        var r = scene.getBoundingClientRect();
        // -1..1 relative to the scene centre, clamped so far-away
        // pointers don't over-rotate
        var nx = Math.max(-1.5, Math.min(1.5, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
        var ny = Math.max(-1.5, Math.min(1.5, (e.clientY - (r.top + r.height / 2)) / (r.height / 2)));
        target.x = nx; target.y = ny;
        lastMove = performance.now();
      }, { passive: true });
    }

    var frame = function (t) {
      raf = 0;
      if (!visible) return;
      // idle (or touch): drift in a slow figure-of-eight
      if (t - lastMove > 2500) {
        target.x = Math.sin(t / 3200) * 0.8;
        target.y = Math.sin(t / 2300) * 0.45;
      }
      cur.x += (target.x - cur.x) * 0.06;
      cur.y += (target.y - cur.y) * 0.06;
      // scrolling past tips the page back, like closing a book
      var r = scene.getBoundingClientRect();
      var scrollTip = Math.max(0, Math.min(1, -r.top / r.height)) * 14;
      inner.style.setProperty('--ry', (cur.x * 9).toFixed(2) + 'deg');
      inner.style.setProperty('--rx', (-cur.y * 6 + scrollTip).toFixed(2) + 'deg');
      raf = requestAnimationFrame(frame);
    };
    var start = function () { if (!raf) raf = requestAnimationFrame(frame); };

    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (entries) {
        visible = entries[0].isIntersecting;
        if (visible) start();
      }).observe(scene);
    }
    start();
  }

  /* ---- cards: tilt toward the pointer ------------------------- */
  if (finePointer) {
    document.querySelectorAll('[data-tilt]').forEach(function (card) {
      card.addEventListener('pointermove', function (e) {
        var r = card.getBoundingClientRect();
        var px = (e.clientX - r.left) / r.width;
        var py = (e.clientY - r.top) / r.height;
        card.style.setProperty('--ty', ((px - 0.5) * 12).toFixed(2) + 'deg');
        card.style.setProperty('--tx', ((0.5 - py) * 10).toFixed(2) + 'deg');
        card.style.setProperty('--gx', (px * 100).toFixed(1) + '%');
        card.style.setProperty('--gy', (py * 100).toFixed(1) + '%');
      });
      card.addEventListener('pointerleave', function () {
        card.style.setProperty('--tx', '0deg');
        card.style.setProperty('--ty', '0deg');
      });
    });
  }

  /* ---- work: browser swings flat as it scrolls into view ------- */
  var stage = document.querySelector('[data-swing]');
  if (stage) {
    var ticking = false;
    var swing = function () {
      ticking = false;
      var r = stage.getBoundingClientRect();
      var vh = window.innerHeight;
      // 1 when the stage's top enters the bottom of the screen,
      // 0 once its centre reaches the middle
      var p = (r.top + r.height / 2 - vh / 2) / (vh / 2 + r.height / 2);
      stage.style.setProperty('--swing', Math.max(-0.4, Math.min(1, p)).toFixed(3));
    };
    window.addEventListener('scroll', function () {
      if (!ticking) { ticking = true; requestAnimationFrame(swing); }
    }, { passive: true });
    window.addEventListener('resize', swing);
    swing();
  }
})();
