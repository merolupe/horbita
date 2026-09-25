/* ==========================================================================
   Regente: câmera, impactos, composição do quadro, pós e saída
   ========================================================================== */
'use strict';
(function () {
  const { C, E, B, clamp, lerp, prog } = R;

  /* ---------- trilho de câmera ---------- */
  const TOP = { tx: 0, ty: 0, tz: 0, dist: 2600, yaw: 0, pitch: R.deg(90), roll: 0, fov: 33, px: 0, py: 0 };
  const OBL = { tx: 0, ty: 0, tz: 0, dist: 2900, yaw: R.deg(-14), pitch: R.deg(21), roll: R.deg(-6), fov: 33, px: 150, py: 36 };
  const ORB = { tx: 0, ty: 0, tz: 0, dist: 2480, yaw: R.deg(18), pitch: R.deg(14), roll: R.deg(-4), fov: 33, px: 120, py: 40 };
  function dive(t) {
    const p = R.planetPos(3, t), h = Math.max(0, t - 7.5);
    return { tx: p[0], ty: 0, tz: p[2], dist: 400 - h * 16, yaw: R.deg(18) + h * 0.012, pitch: R.deg(4), roll: R.deg(-2), fov: 33, px: -340, py: 20 };
  }
  function camParams(t) {
    if (t < 3.86) return TOP;
    if (t < 4.86) return R.camLerp(TOP, OBL, E.io(prog(t, 3.86, 4.86)));
    if (t < 6.62) return R.camLerp(OBL, ORB, E.sineIO(prog(t, 4.86, 6.62)));
    if (t < 7.5) return R.camLerp(ORB, dive(t), E.io(prog(t, 6.62, 7.5)));
    const c = dive(t);
    /* depois da varredura a câmera só respira; no horizonte ela ergue o olhar,
       e no último acorde dispara para cima */
    c.pitch += Math.max(0, t - 11.25) * 0.018 + E.expoOut(prog(t, B(28), B(28) + 0.6)) * 0.2;
    return c;
  }
  R.camAt = t => R.camera(camParams(t));

  /* ---------- impactos: tremor, flash e aberração ---------- */
  const HITS = [[0.0, 0.25], [B(2), 0.45], [B(3), 0.3], [B(8), 1], [B(16), 0.7], [B(21), 0.55], [B(28), 1], [B(31), 0.2]];
  R.impact = t => HITS.reduce((a, h) => a + h[1] * R.pulse(t, h[0], 6), 0);
  function shake(t) {
    const k = HITS.reduce((a, h) => a + h[1] * R.pulse(t, h[0], 10), 0);
    return [R.noise(t * 40, 1) * 13 * k, R.noise(t * 40, 2) * 13 * k];
  }
  const FLASH = [[B(8), 0.24], [B(16), 0.12], [B(28), 0.5]];
  const flash = t => FLASH.reduce((a, f) => a + f[1] * R.pulse(t, f[0], 16), 0);

  const starA = t => prog(t, 0.15, 1.6) * (1 - prog(t, 14.72, 15));
  const linkA = t => 1 - 0.9 * prog(t, 6.64, 6.9) * (1 - prog(t, 7.4, 7.8));
  const dustA = t => 0.28 * prog(t, 3.9, 4.6) * (1 - prog(t, 6.6, 6.7)) + prog(t, 6.6, 6.8) * (1 - prog(t, 7.35, 7.7));

  R.S = 1;                                          /* escala de saída */
  let bgGrad = null;
  R.draw = function (ctx, t, sub) {
    const cam = R.camAt(t), cam0 = R.camAt(t - sub);
    ctx.setTransform(R.S, 0, 0, R.S, 0, 0);
    ctx.globalAlpha = 1; ctx.globalCompositeOperation = 'source-over'; ctx.filter = 'none';
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, R.W, R.H);
    if (!bgGrad) {
      bgGrad = ctx.createRadialGradient(960, 520, 0, 960, 520, 1150);
      bgGrad.addColorStop(0, 'rgba(18,23,34,.85)'); bgGrad.addColorStop(1, 'rgba(18,23,34,0)');
    }
    ctx.fillStyle = bgGrad; ctx.fillRect(0, 0, R.W, R.H);
    const sh = shake(t);
    ctx.translate(sh[0], sh[1]);
    R.Stars.draw(ctx, cam, cam0, t, { alpha: starA(t), link: linkA(t) });
    R.Stars.drawDust(ctx, cam, cam0, dustA(t));
    R.S1(ctx, t);
    R.S2(ctx, t);
    R.Swirl(ctx, t, cam);
    if (t > B(8) - 0.05 && t < B(19) + 0.3) {
      /* desligamento de CRT: a cena achata no fio de varredura */
      const col = E.expoIn(prog(t, B(19) + 0.02, B(19) + 0.24));
      ctx.save();
      if (col > 0) { ctx.translate(960, 560); ctx.scale(1 + col * 0.06, Math.max(0.002, 1 - col)); ctx.translate(-960, -560); }
      R.S3(ctx, t, cam);
      R.S5(ctx, t, cam);
      ctx.restore();
      R.S5line(ctx, t, cam);
    }
    R.S6(ctx, t);
    R.S7(ctx, t);
    R.S8(ctx, t);
    R.HUD(ctx, t);
    ctx.setTransform(R.S, 0, 0, R.S, 0, 0);
    const fl = flash(t);
    if (fl > 0.002) {
      /* flash aditivo: clareia sem lavar o contraste */
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = 'rgba(150,235,195,' + clamp(fl).toFixed(3) + ')'; ctx.fillRect(0, 0, R.W, R.H);
      ctx.globalCompositeOperation = 'source-over';
    }
    const fb = E.sineIO(prog(t, 14.72, 15));
    if (fb > 0) { ctx.fillStyle = 'rgba(0,0,0,' + fb.toFixed(3) + ')'; ctx.fillRect(0, 0, R.W, R.H); }
  };

  /* ---------- pós ---------- */
  let B1, B2, b1, b2;
  R.bloom = function (ctx, cv, k = 1) {
    if (!B1) {
      B1 = document.createElement('canvas'); B2 = document.createElement('canvas');
      b1 = B1.getContext('2d'); b2 = B2.getContext('2d');
    }
    const w = cv.width, h = cv.height;
    if (B1.width !== Math.round(w / 4)) { B1.width = Math.round(w / 4); B1.height = Math.round(h / 4); B2.width = Math.round(w / 8); B2.height = Math.round(h / 8); }
    b1.setTransform(1, 0, 0, 1, 0, 0); b1.filter = 'url(#thr) blur(' + (3 * R.S).toFixed(1) + 'px)';
    b1.clearRect(0, 0, B1.width, B1.height);
    b1.drawImage(cv, 0, 0, B1.width, B1.height);
    b1.filter = 'none';
    b2.filter = 'blur(' + (5 * R.S).toFixed(1) + 'px)';
    b2.clearRect(0, 0, B2.width, B2.height);
    b2.drawImage(B1, 0, 0, B2.width, B2.height);
    b2.filter = 'none';
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalCompositeOperation = 'lighter';
    ctx.imageSmoothingQuality = 'high';
    ctx.globalAlpha = 0.22 * k; ctx.drawImage(B1, 0, 0, w, h);
    ctx.globalAlpha = 0.3 * k; ctx.drawImage(B2, 0, 0, w, h);
    ctx.restore();
  };

  /* aberração cromática radial + vinheta + grão (determinístico por quadro) */
  let VIG = null, GR = null;
  function grade(src, w, h, t, frame) {
    if (!VIG || VIG.length !== w * h) {
      VIG = new Float32Array(w * h);
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
        const dx = (x / w - 0.5) * 1.78, dy = y / h - 0.5, r = Math.hypot(dx, dy) / 0.9;
        VIG[y * w + x] = 1 - 0.3 * R.smooth(clamp((r - 0.45) / 0.75));
      }
      const g = R.rng(9); GR = new Float32Array(512 * 512);
      for (let i = 0; i < GR.length; i++) GR[i] = (g() + g() + g() - 1.5) * 2.2;
    }
    const out = new Uint8ClampedArray(src.length);
    const k = (0.0008 + clamp(R.impact(t)) * 0.0045), cx = w / 2, cy = h / 2;
    const ox = (frame * 173) % 512, oy = (frame * 311) % 512;
    for (let y = 0; y < h; y++) {
      const yr = Math.round(cy + (y - cy) * (1 + k)), yb = Math.round(cy + (y - cy) * (1 - k));
      const rowR = clamp(yr, 0, h - 1) * w, rowB = clamp(yb, 0, h - 1) * w, gy = ((y + oy) & 511) * 512;
      for (let x = 0; x < w; x++) {
        const i = y * w + x, o = i * 4;
        const xr = clamp(Math.round(cx + (x - cx) * (1 + k)), 0, w - 1), xb = clamp(Math.round(cx + (x - cx) * (1 - k)), 0, w - 1);
        const v = VIG[i], n = GR[gy + ((x + ox) & 511)];
        out[o] = src[(rowR + xr) * 4] * v + n;
        out[o + 1] = src[o + 1] * v + n;
        out[o + 2] = src[(rowB + xb) * 4 + 2] * v + n;
        out[o + 3] = 255;
      }
    }
    return out;
  }

  /* ---------- quadro final com motion blur por subamostragem ---------- */
  R.samplesAt = T => {
    const fast = [[1.4, 1.95], [3.25, 4.2], [6.5, 7.62], [8.86, 9.45], [9.8, 10.05], [13.08, 13.8]];
    return fast.some(f => T >= f[0] && T <= f[1]) ? 16 : 8;
  };
  let ACC = null;
  R.renderFrame = function (cv, ctx, frame, o = {}) {
    const T = frame / R.FPS;
    const n = o.samples || R.samplesAt(T);
    const shutter = (o.shutter == null ? 0.5 : o.shutter) / R.FPS;
    const w = cv.width, h = cv.height;
    if (n > 1) {
      if (!ACC || ACC.length !== w * h * 4) ACC = new Uint16Array(w * h * 4);
      ACC.fill(0);
      for (let s = 0; s < n; s++) {
        const t = T - shutter / 2 + ((s + 0.5) * shutter) / n;
        R.draw(ctx, t, shutter / n);
        const d = ctx.getImageData(0, 0, w, h).data;
        for (let i = 0; i < d.length; i++) ACC[i] += d[i];
      }
      const img = ctx.createImageData(w, h), a = img.data, inv = 1 / n;
      for (let i = 0; i < a.length; i++) a[i] = ACC[i] * inv + 0.5;
      ctx.putImageData(img, 0, 0);
    } else R.draw(ctx, T, shutter);
    R.bloom(ctx, cv, 1);
    const src = ctx.getImageData(0, 0, w, h).data;
    return o.grade === false ? src : grade(src, w, h, T, frame);
  };

  /* ---------- API usada pelo render.mjs ---------- */
  const FACES = [
    ['Inter', 'inter-latin-400-normal', '400'], ['Inter', 'inter-latin-500-normal', '500'],
    ['Inter', 'inter-latin-600-normal', '600'], ['Inter', 'inter-latin-700-normal', '700'],
    ['JetBrains Mono', 'jetbrains-mono-latin-400-normal', '400'], ['JetBrains Mono', 'jetbrains-mono-latin-500-normal', '500'],
  ];
  R.ready = Promise.all(FACES.map(f => new FontFace(f[0], 'url(fonts/' + f[1] + '.woff2)', { weight: f[2] }).load().then(ff => document.fonts.add(ff))));

  window.REEL = {
    ready: R.ready,
    setup(scale) {
      R.S = scale;
      const cv = document.getElementById('c');
      cv.width = Math.round(R.W * scale); cv.height = Math.round(R.H * scale);
      return cv;
    },
    async renderRange(o) {
      const cv = this.setup(o.scale || 1), ctx = cv.getContext('2d', { willReadFrequently: true });
      for (let i = o.from + o.offset; i < o.to; i += o.step) {
        const px = R.renderFrame(cv, ctx, i, o);
        await fetch(o.url + '?i=' + i, { method: 'POST', body: px });
      }
      return true;
    },
    async stills(o) {
      const cv = this.setup(o.scale || 0.5), ctx = cv.getContext('2d', { willReadFrequently: true });
      for (const t of o.times) {
        const px = R.renderFrame(cv, ctx, Math.round(t * R.FPS), o);
        ctx.putImageData(new ImageData(px, cv.width, cv.height), 0, 0);
        const blob = await new Promise(r => cv.toBlob(r, 'image/png'));
        await fetch(o.url + '?name=' + encodeURIComponent(o.prefix + t.toFixed(3)), { method: 'POST', body: blob });
      }
      return true;
    },
  };

  /* ---------- reprodução ao vivo (abrir o reel.html no navegador) ---------- */
  if (/render/.test(location.search)) return;
  R.ready.then(() => {
    const cv = window.REEL.setup(Math.min(1, (innerWidth * devicePixelRatio) / R.W));
    const ctx = cv.getContext('2d');
    const au = document.getElementById('au'), gate = document.getElementById('gate');
    let t0 = 0, paused = true, tp = 0;
    const now = () => (paused ? tp : (performance.now() - t0) / 1000);
    function seek(t) { tp = clamp(t, 0, R.DUR - 0.001); t0 = performance.now() - tp * 1000; if (au) au.currentTime = tp; }
    function play() { paused = false; seek(tp >= R.DUR - 0.01 ? 0 : tp); if (au) au.play().catch(() => {}); gate.classList.add('off'); }
    function pause() { tp = now(); paused = true; if (au) au.pause(); }
    gate.addEventListener('click', play);
    cv.addEventListener('click', () => (paused ? play() : pause()));
    addEventListener('keydown', e => {
      if (e.key === ' ') { e.preventDefault(); paused ? play() : pause(); }
      if (e.key === 'ArrowRight') { pause(); seek(tp + 1 / R.FPS); }
      if (e.key === 'ArrowLeft') { pause(); seek(tp - 1 / R.FPS); }
      if (e.key === 'Home') seek(0);
    });
    (function loop() {
      let t = now();
      if (!paused && t >= R.DUR) { seek(0); t = 0; if (au) au.play().catch(() => {}); }
      R.draw(ctx, t, 1 / R.FPS);
      R.bloom(ctx, cv, 1);
      requestAnimationFrame(loop);
    })();
  });
})();
