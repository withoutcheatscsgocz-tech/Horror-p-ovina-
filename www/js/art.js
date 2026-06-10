/* ============================================================
   HOLLOW — Procedural pixel art renderer
   Everything is drawn to a small low-res buffer (BW high-contrast)
   then scaled up with smoothing OFF for a deliberate pixelated,
   manga line-art feel. No external image assets.
   ============================================================ */
(function (root) {
  "use strict";

  var BW = 192, BH = 256;                 // buffer resolution (3:4 portrait)
  var buf = document.createElement("canvas");
  buf.width = BW; buf.height = BH;
  var b = buf.getContext("2d");

  var INK = "#0a0a0a", PAPER = "#f4f4f0", GRAY = "#5a5a58", GRAY2 = "#9a9a96";

  /* ---- deterministic noise (so grain doesn't shimmer randomly) ---- */
  function hash(x, y, s) {
    var n = Math.sin(x * 127.1 + y * 311.7 + s * 74.7) * 43758.5453;
    return n - Math.floor(n);
  }
  function grain(amount, seed, t) {
    seed = seed || 1;
    var jitter = t ? Math.floor(t * 6) % 7 : 0;
    for (var y = 0; y < BH; y += 1) {
      for (var x = 0; x < BW; x += 1) {
        if (hash(x, y, seed + jitter) < amount) {
          b.fillStyle = hash(x + 1, y, seed) < 0.5 ? INK : GRAY;
          b.fillRect(x, y, 1, 1);
        }
      }
    }
  }
  function px(x, y, c) { b.fillStyle = c; b.fillRect(x | 0, y | 0, 1, 1); }
  function rect(x, y, w, h, c) { b.fillStyle = c; b.fillRect(x | 0, y | 0, w | 0, h | 0); }
  function line(x0, y0, x1, y1, c) {        // bresenham, 1px ink
    x0 |= 0; y0 |= 0; x1 |= 0; y1 |= 0;
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0);
    var sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy, e2;
    b.fillStyle = c;
    for (;;) {
      b.fillRect(x0, y0, 1, 1);
      if (x0 === x1 && y0 === y1) break;
      e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  function clear(c) { b.fillStyle = c || INK; b.fillRect(0, 0, BW, BH); }

  /* a soft pixel light cone */
  function lightCone(cx, topY, botY, topW, botW) {
    for (var y = topY; y < botY; y += 1) {
      var k = (y - topY) / (botY - topY);
      var w = topW + (botW - topW) * k;
      for (var x = cx - w / 2; x < cx + w / 2; x += 1) {
        if (hash(x, y, 9) < 0.5 - k * 0.35) px(x, y, y % 2 ? PAPER : GRAY2);
      }
    }
  }

  /* uncanny face: empty stare, slightly-off proportions */
  function uncannyFace(cx, cy, scale, distort) {
    scale = scale || 1; distort = distort || 0;
    var ew = 7 * scale, eh = 4 * scale, gap = 9 * scale;
    // head outline (subtly asymmetric)
    rect(cx - 14 * scale, cy - 16 * scale, 28 * scale + distort, 34 * scale, PAPER);
    rect(cx - 13 * scale, cy - 15 * scale, 26 * scale + distort, 32 * scale, INK);
    // eyes — too far apart, pure black voids with a single white speck
    rect(cx - gap - ew, cy - 2 * scale, ew, eh, PAPER);
    rect(cx + gap, cy - 2 * scale + distort, ew, eh, PAPER);
    rect(cx - gap - ew + 1, cy - 1 * scale, ew - 2, eh - 2, INK);
    rect(cx + gap + 1, cy - 1 * scale + distort, ew - 2, eh - 2, INK);
    px(cx - gap - ew + 2, cy - 1 * scale, PAPER);
    px(cx + gap + 2, cy - 1 * scale + distort, PAPER);
    // mouth — a thin flat line, no expression
    line(cx - 5 * scale, cy + 11 * scale, cx + 5 * scale, cy + 11 * scale + distort, PAPER);
  }

  /* ============================================================
     SCENES — each: fn(time, glitch)
     ============================================================ */
  var scenes = {};

  scenes.title = function (t) {
    clear(INK);
    // a doorway, slightly open, pale light bleeding out
    lightCone(96, 40, 256, 14, 120);
    rect(70, 36, 52, 200, INK);
    line(70, 36, 70, 236, PAPER);
    line(122, 36, 122, 236, PAPER);
    line(70, 36, 122, 36, PAPER);
    rect(96, 36, 26, 200, INK);          // open gap
    line(96, 36, 96, 236, PAPER);
    line(96, 40, 110, 236, GRAY);
    grain(0.04, 3, t);
  };

  scenes.living = function (t) {
    clear(INK);
    rect(0, 168, BW, 88, "#101010");     // floor
    line(0, 168, BW, 168, PAPER);
    // far wall + window with cold light
    rect(118, 60, 50, 70, INK);
    line(118, 60, 168, 60, PAPER); line(118, 130, 168, 130, PAPER);
    line(118, 60, 118, 130, PAPER); line(168, 60, 168, 130, PAPER);
    line(143, 60, 143, 130, GRAY); line(118, 95, 168, 95, GRAY);
    lightCone(143, 60, 200, 40, 90);
    // couch — squat, wrong
    rect(20, 150, 80, 34, INK);
    line(20, 150, 100, 150, PAPER); line(20, 150, 20, 184, PAPER);
    line(100, 150, 100, 184, PAPER); line(20, 184, 100, 184, PAPER);
    line(20, 164, 100, 164, GRAY);
    rect(28, 138, 14, 14, INK); line(28, 138, 42, 138, PAPER);
    // TV showing static
    rect(132, 150, 40, 30, INK);
    line(132, 150, 172, 150, PAPER); line(132, 180, 172, 180, PAPER);
    line(132, 150, 132, 180, PAPER); line(172, 150, 172, 180, PAPER);
    for (var i = 0; i < 90; i++) {
      var sx = 134 + ((hash(i, t * 9 | 0, 5) * 36) | 0);
      var sy = 152 + ((hash(i, t * 7 | 0, 6) * 26) | 0);
      px(sx, sy, i % 2 ? PAPER : GRAY2);
    }
    grain(0.05, 2, t);
  };

  scenes.hall = function (t) {
    clear(INK);
    // one-point perspective hallway
    var vx = 96, vy = 120;
    [0, BW].forEach(function (ex) {
      line(ex, 0, vx, vy, PAPER);
      line(ex, BH, vx, vy, PAPER);
    });
    rect(vx - 16, vy - 26, 32, 52, INK);     // far door
    line(vx - 16, vy - 26, vx + 16, vy - 26, PAPER);
    line(vx - 16, vy + 26, vx + 16, vy + 26, PAPER);
    line(vx - 16, vy - 26, vx - 16, vy + 26, PAPER);
    line(vx + 16, vy - 26, vx + 16, vy + 26, PAPER);
    lightCone(vx, vy - 26, 230, 24, 150);
    // side doors (receding)
    [[40, 60], [150, 60]].forEach(function (d) {
      var x = d[0], dir = x < vx ? 1 : -1;
      line(x, 70, x, 200, GRAY);
      line(x + dir * 26, 86, x + dir * 26, 184, GRAY);
      line(x, 70, x + dir * 26, 86, GRAY);
      line(x, 200, x + dir * 26, 184, GRAY);
    });
    grain(0.045, 4, t);
  };

  scenes.bedroom = function (t) {
    clear(INK);
    rect(0, 170, BW, 86, "#0d0d0d");
    line(0, 170, BW, 170, PAPER);
    // window, moonless — just a pale rectangle that feels wrong
    rect(120, 40, 54, 70, INK);
    line(120, 40, 174, 40, PAPER); line(120, 110, 174, 110, PAPER);
    line(120, 40, 120, 110, PAPER); line(174, 40, 174, 110, PAPER);
    rect(124, 44, 46, 62, "#1a1a1a");
    line(147, 40, 147, 110, GRAY); line(120, 75, 174, 75, GRAY);
    // bed — sheets like a shroud
    rect(16, 150, 90, 50, INK);
    line(16, 150, 106, 150, PAPER); line(16, 200, 106, 200, PAPER);
    line(16, 150, 16, 200, PAPER); line(106, 150, 106, 200, PAPER);
    rect(20, 140, 26, 16, INK); line(20, 140, 46, 140, PAPER); line(46, 140, 46, 156, GRAY);
    for (var i = 0; i < 6; i++) line(30 + i * 12, 156, 26 + i * 12, 198, GRAY);
    grain(0.05, 7, t);
  };

  scenes.kitchen = function (t) {
    clear(INK);
    rect(0, 176, BW, 80, "#0d0d0d");
    line(0, 176, BW, 176, PAPER);
    // counter
    rect(14, 150, 164, 28, INK);
    line(14, 150, 178, 150, PAPER); line(14, 178, 178, 178, PAPER);
    line(14, 150, 14, 178, PAPER); line(178, 150, 178, 178, PAPER);
    // cabinets above
    for (var i = 0; i < 3; i++) {
      var x = 24 + i * 50;
      rect(x, 70, 44, 50, INK);
      line(x, 70, x + 44, 70, PAPER); line(x, 120, x + 44, 120, PAPER);
      line(x, 70, x, 120, PAPER); line(x + 44, 70, x + 44, 120, PAPER);
      px(x + 38, 95, PAPER);
    }
    // a single drawer, slightly ajar — the wrong one
    rect(60, 154, 36, 18, INK);
    line(60, 154, 96, 154, PAPER); line(60, 172, 96, 172, PAPER);
    line(60, 154, 60, 172, PAPER); line(96, 154, 96, 172, PAPER);
    rect(96, 156, 6, 14, "#1c1c1c"); line(96, 156, 96, 170, GRAY2);
    grain(0.05, 11, t);
  };

  scenes.mirror = function (t, glitch) {
    clear(INK);
    // a tall mirror; in it, you — but the stare is empty and the head tilts
    rect(58, 40, 76, 180, INK);
    line(58, 40, 134, 40, PAPER); line(58, 220, 134, 220, PAPER);
    line(58, 40, 58, 220, PAPER); line(134, 40, 134, 220, PAPER);
    rect(64, 46, 64, 168, "#141414");
    var tilt = Math.sin(t * 0.6) * (glitch ? 4 : 1.2);
    uncannyFace(96 + tilt, 96, 1.1, glitch ? 3 : 1);
    // body suggestion
    line(80, 132, 78, 210, GRAY); line(112, 132, 114, 210, GRAY);
    line(80, 132, 112, 132, GRAY);
    if (glitch) {                          // reflection desync
      var off = (hash(t * 30 | 0, 1, 2) * 8 - 4) | 0;
      b.drawImage(buf, 64, 70, 64, 40, 64 + off, 70, 64, 40);
    }
    grain(0.06, 13, t);
  };

  scenes.photo = function (t) {
    clear("#1a1a1a");
    // a held photograph — family of three, but one face scratched out
    rect(44, 60, 104, 136, PAPER);
    rect(50, 66, 92, 110, INK);
    uncannyFace(74, 110, 0.8, 0);
    uncannyFace(118, 110, 0.8, 0);
    // middle figure: scratched away
    rect(88, 92, 24, 40, INK);
    for (var i = 0; i < 26; i++) {
      line(86 + (hash(i, 1, 3) * 28 | 0), 88, 90 + (hash(i, 2, 3) * 28 | 0), 134, PAPER);
    }
    rect(50, 180, 92, 14, PAPER);
    rect(54, 183, 84, 8, INK);             // caption bar (illegible)
    for (var j = 0; j < 18; j++) px(58 + j * 4, 187, GRAY2);
    grain(0.04, 17, t);
  };

  scenes.basement = function (t) {
    clear(INK);
    // stairs descending into pure black
    for (var i = 0; i < 8; i++) {
      var y = 70 + i * 14, w = 120 - i * 12, x = 96 - w / 2;
      line(x, y, x + w, y, i < 5 ? PAPER : GRAY);
      line(x, y, x - 6, y + 14, GRAY);
      line(x + w, y, x + w + 6, y + 14, GRAY);
    }
    rect(70, 182, 52, 74, "#000");         // the dark below
    // two pale dots in the dark — eyes? only sometimes
    if (Math.sin(t * 0.8) > 0.6) { px(86, 210, PAPER); px(106, 210, PAPER); }
    grain(0.05, 19, t);
  };

  scenes.front_door = function (t) {
    clear(INK);
    lightCone(96, 30, 256, 10, 70);
    rect(56, 28, 80, 210, INK);
    line(56, 28, 136, 28, PAPER); line(56, 238, 136, 238, PAPER);
    line(56, 28, 56, 238, PAPER); line(136, 28, 136, 238, PAPER);
    // panels
    [[64, 44, 26, 70], [102, 44, 26, 70], [64, 124, 26, 90], [102, 124, 26, 90]].forEach(function (p) {
      line(p[0], p[1], p[0] + p[2], p[1], GRAY);
      line(p[0], p[1] + p[3], p[0] + p[2], p[1] + p[3], GRAY);
      line(p[0], p[1], p[0], p[1] + p[3], GRAY);
      line(p[0] + p[2], p[1], p[0] + p[2], p[1] + p[3], GRAY);
    });
    rect(120, 130, 6, 6, PAPER);           // knob
    grain(0.04, 23, t);
  };

  /* ---- endings ---- */
  scenes.end_escape = function (t) {
    clear(INK);
    // you step out — into the same hallway. forever.
    scenes.hall(t);
    rect(0, 0, BW, BH, "rgba(0,0,0,0.0)");
    uncannyFace(96, 120, 0.5, 0);          // your own face waits at the end
  };
  scenes.end_replaced = function (t, glitch) {
    clear(INK);
    scenes.mirror(t, true);
    // the glass is empty now; you are on the wrong side
    rect(64, 46, 64, 168, "#141414");
    line(58, 40, 134, 220, GRAY); line(134, 40, 58, 220, GRAY);
    grain(0.08, 29, t);
  };
  scenes.end_truth = function (t) {
    clear(INK);
    // a small calm light. acceptance.
    lightCone(96, 60, 240, 8, 70);
    uncannyFace(96, 120, 1.0, 0);
    // the mouth, for once, is not a flat line
    line(86, 134, 96, 138, PAPER); line(96, 138, 106, 134, PAPER);
    grain(0.03, 31, t);
  };

  scenes.black = function () { clear("#000"); };

  /* ============================================================
     Public render — scales buffer to cover the target canvas
     ============================================================ */
  function render(ctx, sceneId, t, glitch, shake) {
    var fn = scenes[sceneId] || scenes.black;
    fn(t, glitch);

    var cw = ctx.canvas.width, ch = ctx.canvas.height;
    ctx.imageSmoothingEnabled = false;
    ctx.fillStyle = "#000";
    ctx.fillRect(0, 0, cw, ch);
    var scale = Math.max(cw / BW, ch / BH);
    var dw = BW * scale, dh = BH * scale;
    var ox = (cw - dw) / 2, oy = (ch - dh) / 2;
    if (shake) { ox += (Math.random() * 2 - 1) * shake; oy += (Math.random() * 2 - 1) * shake; }
    ctx.drawImage(buf, ox, oy, dw, dh);
  }

  root.HOLLOW = root.HOLLOW || {};
  root.HOLLOW.art = { render: render, BW: BW, BH: BH, scenes: scenes };
})(window);
