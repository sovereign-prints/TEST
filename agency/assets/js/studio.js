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

  /* ---- a 4D whale: a "tesseract" made of whales ----------------
     A tesseract is two cubes, one at each end of a fourth axis (w),
     joined corner to corner. This does the same with a whale: the
     whale's wireframe (lofted rings and contour lines, plus flukes,
     flippers, the arched mouth, eye and callosities) is placed at
     w = +W and w = -W, and matching points are joined across w.
     Each frame the tail beats, the whole thing rotates in the ZW and
     YW planes (the 4D turn that makes the inner whale pass
     inside-out through the outer one), then projects 4D -> 3D -> 2D.
     Strokes are sorted into four depth bands: near lines heavy and
     dark, far lines faint. */
  var whaleStage = document.querySelector('[data-whale3d]');
  if (whaleStage) {
    var NS = 'http://www.w3.org/2000/svg';
    var bands = whaleStage.querySelectorAll('[data-band]');
    var marks = whaleStage.querySelector('[data-marks]');

    // body profile: [t along the body 0..1, half-height, half-width]
    var PROFILE = [
      [0.00, 0.02, 0.02], [0.03, 0.22, 0.18], [0.08, 0.36, 0.30], [0.16, 0.47, 0.40],
      [0.26, 0.54, 0.47], [0.38, 0.56, 0.50], [0.50, 0.52, 0.47], [0.62, 0.44, 0.39],
      [0.73, 0.32, 0.28], [0.83, 0.20, 0.17], [0.91, 0.12, 0.10], [1.00, 0.07, 0.06]
    ];
    var SEG = 20;   // points round each ring
    var RINGS = [0.06, 0.2, 0.4, 0.6, 0.78, 0.92];
    var CONTOURS = 8;
    var LEN = 3.2;  // body length in model units, head at -1.6

    var lerpProfile = function (t) {
      for (var i = 1; i < PROFILE.length; i++) {
        if (t <= PROFILE[i][0]) {
          var p0 = PROFILE[i - 1], p1 = PROFILE[i], f = (t - p0[0]) / (p1[0] - p0[0]);
          return [p0[1] + (p1[1] - p0[1]) * f, p0[2] + (p1[2] - p0[2]) * f];
        }
      }
      return [PROFILE[PROFILE.length - 1][1], PROFILE[PROFILE.length - 1][2]];
    };

    // tail beat: the back half bends up and down, more towards the flukes
    var beat = 0;
    var bend = function (t) { var k = Math.max(0, t - 0.45) / 0.55; return Math.sin(beat - k * 1.4) * 0.28 * k * k; };
    var surf = function (t, th) {
      var r = lerpProfile(t);
      return [-LEN / 2 + LEN * t, bend(t) + 0.04 * Math.sin(Math.PI * t) + r[0] * Math.sin(th), r[1] * Math.cos(th)];
    };

    // build the model as a list of polylines (arrays of [x,y,z]),
    // rebuilt each frame because the tail moves
    var build = function () {
      var polys = [], i, j, pts;
      // rings
      RINGS.forEach(function (t) {
        pts = [];
        for (j = 0; j <= SEG; j++) pts.push(surf(t, j / SEG * Math.PI * 2));
        polys.push(pts);
      });
      // contour lines nose to tail
      for (j = 0; j < CONTOURS; j++) {
        pts = [];
        for (i = 0; i <= 24; i++) pts.push(surf(i / 24, j / CONTOURS * Math.PI * 2 + Math.PI / 8));
        polys.push(pts);
      }
      // flukes: a flat crescent in the x-z plane, riding the tail beat
      var tx = LEN / 2, ty = bend(1), tilt = Math.cos(beat - 1.4) * 0.5;
      [1, -1].forEach(function (sd) {
        var f = [[0, 0.04], [0.16, 0.30], [0.34, 0.62], [0.52, 0.88], [0.46, 0.66], [0.36, 0.40], [0.30, 0.16], [0.34, 0]];
        polys.push(f.map(function (q) { return [tx + q[0], ty + q[0] * tilt, sd * q[1]]; }));
      });
      // flippers: paddles low on each side behind the head
      [1, -1].forEach(function (sd) {
        var root = surf(0.30, -0.55 * Math.PI / 2);
        polys.push([
          [root[0] - 0.12, root[1], sd * root[2]],
          [root[0] + 0.05, root[1] - 0.42, sd * (root[2] + 0.38)],
          [root[0] + 0.22, root[1] - 0.50, sd * (root[2] + 0.46)],
          [root[0] + 0.24, root[1] - 0.30, sd * (root[2] + 0.28)],
          [root[0] + 0.14, root[1], sd * root[2]]
        ]);
      });
      // the arched mouth line of a right whale, both sides
      [0, Math.PI].forEach(function (off) {
        pts = [];
        for (i = 0; i <= 12; i++) {
          var t = 0.01 + 0.29 * i / 12;
          var th = -0.45 + 0.75 * Math.sin(Math.PI * i / 12);
          var p = surf(t, off ? Math.PI - th : th);
          pts.push(p);
        }
        polys.push(pts);
      });
      return polys;
    };

    // eye and callosities as small circles
    var spots = [[0.31, -0.25, 1.8], [0.31, Math.PI + 0.25, 1.8], [0.04, 1.35, 2.4], [0.08, 1.5, 2.8], [0.12, 1.7, 2.2], [0.06, 1.9, 2]];
    var spotEls = spots.concat(spots).map(function () {
      var c = document.createElementNS(NS, 'circle');
      marks.appendChild(c);
      return c;
    });

    var W = 0.75;                        // half-distance between the two whales along w
    var yw = 0.5, zw = 0.25;             // 4D rotation angles
    var yaw = -0.9, pitch = -0.32, roll = 0;
    var yawV = 0.0105, dragYaw = 0, dragPitch = 0;   // auto-rotate: one full turn about every 10s

    var rot = function (p, i, j, t) {
      var c = Math.cos(t), s = Math.sin(t), a = p[i], b = p[j];
      p[i] = a * c - b * s; p[j] = a * s + b * c;
    };
    var project = function (p3, w) {
      var p = [p3[0], p3[1], p3[2], w];
      rot(p, 2, 3, zw);                  // z-w plane: the 4D turn
      rot(p, 1, 3, yw);                  // y-w plane
      var k4 = 2.4 / (3 - p[3]);         // 4D -> 3D perspective
      var x = p[0] * k4, y = p[1] * k4, z = p[2] * k4, depth = p[3];
      var c, s, t;
      c = Math.cos(yaw); s = Math.sin(yaw); t = x * c - z * s; z = x * s + z * c; x = t;
      c = Math.cos(roll); s = Math.sin(roll); t = x * c - y * s; y = x * s + y * c; x = t;
      c = Math.cos(pitch); s = Math.sin(pitch); t = y * c - z * s; z = y * s + z * c; y = t;
      var k = 5 / (6 - z);               // 3D -> 2D perspective
      return [x * k * 70, -y * k * 70 + 10, z * 0.6 + depth * 0.6];
    };

    // points joined across the fourth dimension (like a tesseract's
    // corner-to-corner edges): nose, tail tips and a lattice on the body
    var bridges = function () {
      var list = [surf(0, 0)], i, j;
      [0.2, 0.4, 0.6, 0.78].forEach(function (t) {
        for (j = 0; j < 4; j++) list.push(surf(t, j / 4 * Math.PI * 2 + Math.PI / 4));
      });
      return list;
    };

    var addLine = function (paths, a, b) {
      var z = (a[2] + b[2]) / 2;         // about -1.6 (far) .. 1.6 (near)
      var band = Math.max(0, Math.min(3, Math.floor((z + 1.6) / 0.8)));
      paths[band] += 'M' + a[0].toFixed(1) + ' ' + a[1].toFixed(1) + 'L' + b[0].toFixed(1) + ' ' + b[1].toFixed(1);
    };

    var render = function () {
      var polys = build(), paths = ['', '', '', ''];
      [W, -W].forEach(function (w) {
        polys.forEach(function (poly) {
          var prev = project(poly[0], w);
          for (var i = 1; i < poly.length; i++) {
            var cur = project(poly[i], w);
            addLine(paths, prev, cur);
            prev = cur;
          }
        });
      });
      // the fourth-dimension edges between the two whales
      var tail = LEN / 2, ty = bend(1), tilt = Math.cos(beat - 1.4) * 0.5;
      bridges().concat([[tail + 0.52, ty + 0.52 * tilt, 0.88], [tail + 0.52, ty + 0.52 * tilt, -0.88]]).forEach(function (p) {
        addLine(paths, project(p, W), project(p, -W));
      });
      for (var b = 0; b < 4; b++) bands[b].setAttribute('d', paths[b]);
      var n = 0;
      [W, -W].forEach(function (w) {
        spots.forEach(function (sp) {
          var p = project(surf(sp[0], sp[1]), w);
          var el = spotEls[n++];
          el.setAttribute('cx', p[0].toFixed(1));
          el.setAttribute('cy', p[1].toFixed(1));
          el.setAttribute('r', (sp[2] * (0.7 + (p[2] + 1.6) * 0.15)).toFixed(2));
          el.setAttribute('opacity', p[2] < -0.4 ? 0.25 : 1);
        });
      });
    };
    render();

    if (!reduced) {
      var whaleVisible = true, whaleRaf = 0, last = 0;
      var tick = function (t) {
        whaleRaf = 0;
        if (!whaleVisible) return;
        var dt = last ? Math.min(3, (t - last) / 16.7) : 1;   // frames at 60fps, capped after a stall
        last = t;
        beat += 0.05 * dt;
        zw += (0.006 + dragYaw) * dt;            // turning through the fourth dimension
        yw += 0.0019 * dt;
        yaw += (yawV + dragYaw * 0.5) * dt;
        pitch = Math.max(-1.1, Math.min(0.6, pitch + dragPitch * dt));
        pitch += (-0.32 - pitch) * 0.01 * dt;                  // drifts back to the resting view
        roll = Math.sin(beat * 0.5) * 0.06;
        dragYaw *= Math.pow(0.95, dt); dragPitch *= Math.pow(0.9, dt);
        render();
        whaleRaf = requestAnimationFrame(tick);
      };
      var whaleStart = function () { if (!whaleRaf) { last = 0; whaleRaf = requestAnimationFrame(tick); } };

      if ('IntersectionObserver' in window) {
        new IntersectionObserver(function (entries) {
          whaleVisible = entries[0].isIntersecting;
          if (whaleVisible) whaleStart();
        }).observe(whaleStage);
      }
      whaleStart();

      // drag (mouse or finger) to spin it round
      var dragFrom = null;
      whaleStage.addEventListener('pointerdown', function (e) {
        dragFrom = { x: e.clientX, y: e.clientY };
        whaleStage.classList.add('dragging');
        whaleStage.setPointerCapture(e.pointerId);
      });
      whaleStage.addEventListener('pointermove', function (e) {
        if (!dragFrom) return;
        dragYaw = Math.max(-0.12, Math.min(0.12, (e.clientX - dragFrom.x) * 0.0018));   // flings it through 4D
        dragPitch = Math.max(-0.05, Math.min(0.05, (e.clientY - dragFrom.y) * -0.001));
        dragFrom = { x: e.clientX, y: e.clientY };
      });
      var endDrag = function () { dragFrom = null; whaleStage.classList.remove('dragging'); };
      whaleStage.addEventListener('pointerup', endDrag);
      whaleStage.addEventListener('pointercancel', endDrag);
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
