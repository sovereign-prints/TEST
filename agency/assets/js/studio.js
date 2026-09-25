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

  /* ---- 4D: a tesseract, rotated in 4D and projected to 2D ------
     16 vertices at (±1, ±1, ±1, ±1); 32 edges join vertices that
     differ in one coordinate. Each frame rotates them in the XW, ZW
     and XY planes, projects 4D -> 3D with a perspective divide on w,
     then 3D -> 2D the same way on z. Nearer lines draw heavier. */
  var tessStage = document.querySelector('[data-tesseract]');
  if (tessStage) {
    var edgeGroup = tessStage.querySelector('[data-tess-edges]');
    var NS = 'http://www.w3.org/2000/svg';
    var verts = [];
    for (var i = 0; i < 16; i++) {
      verts.push([i & 1 ? 1 : -1, i & 2 ? 1 : -1, i & 4 ? 1 : -1, i & 8 ? 1 : -1]);
    }
    var edges = [];
    for (var a = 0; a < 16; a++) {
      for (var bit = 1; bit < 16; bit <<= 1) {
        if (!(a & bit)) edges.push([a, a | bit]);
      }
    }
    var lines = edges.map(function () {
      var l = document.createElementNS(NS, 'line');
      edgeGroup.appendChild(l);
      return l;
    });
    var dots = verts.map(function () {
      var c = document.createElementNS(NS, 'circle');
      edgeGroup.appendChild(c);
      return c;
    });

    var angle = { xw: 0.6, zw: 0.3, xy: 0.2, yz: -0.35 };
    var spin = { xw: 0.0042, zw: 0.0027, xy: 0.0011 };
    var push = { x: 0, y: 0 };   // extra spin from dragging, decays

    var rot = function (p, i, j, t) {
      var c = Math.cos(t), s = Math.sin(t), a = p[i], b = p[j];
      p[i] = a * c - b * s; p[j] = a * s + b * c;
    };

    var draw = function () {
      var pts = verts.map(function (v) {
        var p = v.slice();
        rot(p, 0, 3, angle.xw);   // x-w plane: the 4D turn
        rot(p, 2, 3, angle.zw);   // z-w plane
        rot(p, 0, 1, angle.xy);
        rot(p, 1, 2, angle.yz);   // fixed tilt so we look down onto it
        var k4 = 2.6 / (3.2 - p[3]);             // 4D -> 3D
        var x = p[0] * k4, y = p[1] * k4, z = p[2] * k4;
        var k3 = 3.4 / (5 - z);                  // 3D -> 2D
        return { x: x * k3 * 74, y: y * k3 * 74, depth: p[3] * 0.6 + z * 0.4 };
      });
      edges.forEach(function (e, n) {
        var p = pts[e[0]], q = pts[e[1]], d = (p.depth + q.depth) / 2;   // roughly -1.6 .. 1.6
        var l = lines[n];
        l.setAttribute('x1', p.x.toFixed(2)); l.setAttribute('y1', p.y.toFixed(2));
        l.setAttribute('x2', q.x.toFixed(2)); l.setAttribute('y2', q.y.toFixed(2));
        l.setAttribute('stroke-width', (1.1 + (d + 1.6) * 0.55).toFixed(2));
        l.setAttribute('opacity', (0.35 + (d + 1.6) * 0.2).toFixed(2));
      });
      pts.forEach(function (p, n) {
        dots[n].setAttribute('cx', p.x.toFixed(2));
        dots[n].setAttribute('cy', p.y.toFixed(2));
        dots[n].setAttribute('r', (1.6 + (p.depth + 1.6) * 0.6).toFixed(2));
      });
    };
    draw();

    if (!reduced) {
      var tessVisible = true, tessRaf = 0, last = 0;
      var tick = function (t) {
        tessRaf = 0;
        if (!tessVisible) return;
        var dt = last ? Math.min(3, (t - last) / 16.7) : 1;   // frames at 60fps, capped after a stall
        last = t;
        angle.xw += (spin.xw + push.x) * dt;
        angle.zw += (spin.zw + push.y) * dt;
        angle.xy += spin.xy * dt;
        push.x *= Math.pow(0.95, dt); push.y *= Math.pow(0.95, dt);
        draw();
        tessRaf = requestAnimationFrame(tick);
      };
      var tessStart = function () { if (!tessRaf) { last = 0; tessRaf = requestAnimationFrame(tick); } };

      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          tessVisible = entries[0].isIntersecting;
          if (tessVisible) tessStart();
        }).observe(tessStage);
      }
      tessStart();

      // drag (mouse or finger) flings it through the fourth dimension
      var dragFrom = null;
      tessStage.addEventListener('pointerdown', function (e) {
        dragFrom = { x: e.clientX, y: e.clientY };
        tessStage.classList.add('dragging');
        tessStage.setPointerCapture(e.pointerId);
      });
      tessStage.addEventListener('pointermove', function (e) {
        if (!dragFrom) return;
        push.x = Math.max(-0.12, Math.min(0.12, (e.clientX - dragFrom.x) * 0.0016));
        push.y = Math.max(-0.12, Math.min(0.12, (e.clientY - dragFrom.y) * 0.0016));
        dragFrom = { x: e.clientX, y: e.clientY };
      });
      var endDrag = function () { dragFrom = null; tessStage.classList.remove('dragging'); };
      tessStage.addEventListener('pointerup', endDrag);
      tessStage.addEventListener('pointercancel', endDrag);
    }
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
