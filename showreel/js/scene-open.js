/* ==========================================================================
   Cenas 1–2 · IGNIÇÃO e MANIFESTO
   ========================================================================== */
'use strict';
(function () {
  const { C, E, B, TAU, clamp, lerp, prog, spring, font, layout } = R;

  /* ---------- a marca: três círculos do logo Hinove (viewBox 120×100) ---------- */
  const MARK = [[40, 38, 38, C.blue, 1], [74, 52, 34, C.navy, 0.9], [45, 72, 26, C.green, 0.9]];
  R.MARK = MARK;
  R.mark = function (ctx, cx, cy, sc, o = {}) {
    ctx.save();
    const a0 = ctx.globalAlpha * (o.alpha == null ? 1 : o.alpha);
    MARK.forEach((m, i) => {
      const pop = o.pop ? o.pop[i] : 1;
      if (pop <= 0.001) return;
      ctx.globalAlpha = a0 * m[4];
      ctx.fillStyle = m[3];
      ctx.beginPath();
      ctx.arc(cx + (m[0] - 55) * sc, cy + (m[1] - 49) * sc, Math.max(0, m[2] * sc * pop), 0, TAU);
      ctx.fill();
    });
    ctx.restore();
  };
  /* posição da marca no HUD */
  R.HUD_MARK = { x: 98, y: 70, sc: 0.3 };

  /* linha que se curva: ponto e ângulo na posição s, curvatura k */
  R.bend = function (s, k) {
    if (Math.abs(k) < 1e-7) return [s, -(k * s * s) / 2, k * s];
    const th = k * s;
    return [Math.sin(th) / k, -(1 - Math.cos(th)) / k, th];
  };

  /* ================= CENA 1 · IGNIÇÃO ================= */
  const L1 = 1640, RD = L1 / TAU, TICK = 32.8;          /* 50 intervalos */
  const LOGO_SC = 2.6;
  R.logoPath = function (t) {
    /* voo da marca até o canto (arco + antecipação); retorna {x,y,sc} */
    const a = E.out(prog(t, 1.4, 1.52)) * (1 - prog(t, 1.52, 1.6));
    const f = E.whip(prog(t, 1.5, 1.86));
    const x0 = 960 + a * 12, y0 = 540 + a * 10;
    const cx = lerp(620, 300, f), cy = lerp(620, 120, f);   /* controle do arco */
    const u = 1 - f;
    const x = u * u * x0 + 2 * u * f * cx + f * f * R.HUD_MARK.x;
    const y = u * u * y0 + 2 * u * f * cy + f * f * R.HUD_MARK.y;
    const sc = Math.exp(lerp(Math.log(LOGO_SC * (1 + a * 0.07)), Math.log(R.HUD_MARK.sc), f));
    return { x, y, sc, f };
  };

  R.S1 = function (ctx, t) {
    if (t > 1.95) return;
    const cx = 960, cy = 540;
    /* ponto inicial */
    const dotR = 5 * spring(t - 0.0, 3.2, 0.45) * (1 - prog(t, 0.1, 0.3));
    if (dotR > 0.05) {
      ctx.fillStyle = '#E9FFF3';
      ctx.beginPath(); ctx.arc(cx, cy, dotR, 0, TAU); ctx.fill();
    }
    /* linha → régua → mostrador */
    const grow = E.io(prog(t, 0.05, 0.47));
    const curl = E.io(prog(t, 0.47, 0.96));
    const burst = E.expoOut(prog(t, B(3), B(3) + 0.5));
    const fadeDial = 1 - prog(t, B(3) + 0.05, B(3) + 0.42);
    if (grow > 0 && fadeDial > 0) {
      const kmax = TAU / L1, k = curl * kmax;
      const baseY = cy + curl * RD;
      const spin = prog(t, 0.96, 2) * 0.9 - E.io(prog(t, 0.47, 0.96)) * 0.35;
      const half = (L1 / 2) * grow;
      const scale = 1 + burst * 1.7;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(spin);
      ctx.scale(scale, scale);
      ctx.translate(0, baseY - cy);
      ctx.globalAlpha = fadeDial;
      /* a linha */
      ctx.lineWidth = 2.5 / scale;
      ctx.strokeStyle = C.acc;
      ctx.beginPath();
      const N = 180;
      for (let i = 0; i <= N; i++) {
        const s = -half + (2 * half * i) / N, p = R.bend(s, k);
        i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
      }
      ctx.stroke();
      /* núcleo quente no centro da linha, enquanto ela nasce */
      const hot = 1 - prog(t, 0.2, 0.6);
      if (hot > 0) {
        const g = ctx.createLinearGradient(-half, 0, half, 0);
        g.addColorStop(0, 'rgba(233,255,243,0)'); g.addColorStop(0.5, 'rgba(233,255,243,' + hot + ')'); g.addColorStop(1, 'rgba(233,255,243,0)');
        ctx.strokeStyle = g; ctx.lineWidth = 3;
        ctx.beginPath(); ctx.moveTo(-half, 0); ctx.lineTo(half, 0); ctx.stroke();
      }
      /* marcas de régua, que viram o mostrador */
      for (let i = -25; i <= 25; i++) {
        const s = i * TICK;
        if (Math.abs(s) > half + 0.5) continue;
        if (i === 25 && curl > 0.98) continue;              /* fecha sem duplicar */
        const born = 0.05 + (Math.abs(s) / (L1 / 2)) * 0.34;
        const h0 = i === 0 ? 34 : i % 5 === 0 ? 22 : 11;
        const hh = h0 * spring(t - born - 0.02, 3.4, 0.5);
        const drift = burst * (i % 2 ? 60 : 30);               /* na explosão, marcas escapam */
        const p = R.bend(s, k), th = p[2];
        const nx = -Math.sin(th), ny = -Math.cos(th);
        ctx.strokeStyle = i % 5 === 0 ? 'rgba(243,245,249,.85)' : 'rgba(152,161,177,.6)';
        ctx.lineWidth = (i % 5 === 0 ? 2 : 1.5) / scale;
        ctx.beginPath();
        ctx.moveTo(p[0] - nx * drift, p[1] - ny * drift);
        ctx.lineTo(p[0] + nx * (hh - drift), p[1] + ny * (hh - drift));
        ctx.stroke();
      }
      ctx.restore();
      /* rótulos das pontas, só na fase reta */
      const la = prog(t, 0.3, 0.42) * (1 - prog(t, 0.47, 0.6));
      if (la > 0) {
        R.text(ctx, 'ÓRBITA', cx - L1 / 2, cy + 40, { font: font(500, 15, R.MONO), ls: 3, color: C.ink3, alpha: la });
        R.text(ctx, 'HINOVE · 2026', cx + L1 / 2, cy + 40, { font: font(500, 15, R.MONO), ls: 3, color: C.ink3, alpha: la, align: 'right' });
      }
    }
    /* marca: três estouros com anel de choque, depois voo para o HUD */
    const pops = [0, 1, 2].map(i => spring(t - (B(2) + i * 0.117), 2.6, 0.36));
    if (t < 1.9 && pops[0] > 0) {
      const lp = R.logoPath(t);
      R.mark(ctx, lp.x, lp.y, lp.sc, { pop: pops });
      /* anéis de choque */
      MARK.forEach((m, i) => {
        const tt = t - (B(2) + i * 0.117);
        if (tt < 0 || tt > 0.6) return;
        const q = E.cubicOut(tt / 0.6);
        ctx.strokeStyle = R.rgba(m[3] === C.navy ? '#7E8BD2' : m[3], (1 - q) * 0.8);
        ctx.lineWidth = 2.5 * (1 - q) + 0.5;
        ctx.beginPath();
        ctx.arc(lp.x + (m[0] - 55) * lp.sc, lp.y + (m[1] - 49) * lp.sc, m[2] * lp.sc * (1 + q * 0.9), 0, TAU);
        ctx.stroke();
      });
    }
  };

  /* ================= CENA 2 · MANIFESTO ================= */
  const SZ = 132, LS = -6.4;
  const F1 = font(600, SZ), FK = font(500, 36), FKB = font(600, 36);
  const TXT = {
    l1a: 'Menos ', l1b: 'desculpability,', l2a: 'mais ', l2b: 'accountability.',
    k1: 'Todos remando na ', k2: 'mesma direção.',
  };
  let G = null;                      /* geometria do bloco (medida uma vez) */
  function geo(ctx) {
    if (G) return G;
    const la = layout(ctx, TXT.l1a, F1, LS), lb = layout(ctx, TXT.l1b, F1, LS);
    const lc = layout(ctx, TXT.l2a, F1, LS), ld = layout(ctx, TXT.l2b, F1, LS);
    const k1 = layout(ctx, TXT.k1, FK, -0.8), k2 = layout(ctx, TXT.k2, FKB, -0.8);
    const w1 = la.w + LS + lb.w, w2 = lc.w + LS + ld.w, w = Math.max(w1, w2);
    const x = Math.round((R.W - w) / 2);
    G = { la, lb, lc, ld, k1, k2, x, y1: 476, y2: 476 + SZ * 1.0, yk: 476 + SZ * 1.0 + 92,
      xb: x + la.w + LS, xd: x + lc.w + LS, xk2: x + k1.w - 0.8 };
    return G;
  }
  R.manifestoGeo = geo;
  const T_TXT_OUT = 3.44;             /* texto real some; partículas assumem */

  /* texto no estado de um instante (usado na tela e para rasterizar partículas) */
  function drawManifesto(ctx, t, final) {
    const g = geo(ctx);
    const on = tt => (final ? -1 : tt);
    R.rise(ctx, g.la, g.x, g.y1, final ? 99 : t, { t0: on(B(4)), size: SZ, color: C.ink });
    /* "desculpability," entra e depois é riscada e apagada */
    const dim = final ? 1 : prog(t, B(5) + 0.2, B(5) + 0.42);
    const colB = dim > 0 ? mixHex(C.ink, '#4A5160', dim) : C.ink;
    R.rise(ctx, g.lb, g.xb, g.y1, final ? 99 : t, { t0: on(B(4.5)), size: SZ, color: colB });
    const strike = final ? 1 : E.io(prog(t, B(5), B(5) + 0.24));
    if (strike > 0) {
      ctx.fillStyle = '#C0555F';
      ctx.fillRect(g.xb - 6, g.y1 - SZ * 0.33, (g.lb.w + 12) * strike, 9);
    }
    R.rise(ctx, g.lc, g.x, g.y2, final ? 99 : t, { t0: on(B(5.5)), size: SZ, color: C.ink });
    R.rise(ctx, g.ld, g.xd, g.y2, final ? 99 : t, { t0: on(B(6)), size: SZ, color: C.acc, stagger: 0.026 });
    R.rise(ctx, g.k1, g.x, g.yk, final ? 99 : t, { t0: on(B(6.5)), size: 36, color: C.ink2, stagger: 0.012, dur: 0.5 });
    R.rise(ctx, g.k2, g.xk2, g.yk, final ? 99 : t, { t0: on(B(6.5) + 0.12), size: 36, color: C.ink, stagger: 0.012, dur: 0.5 });
  }
  function mixHex(a, b, t) {
    const pa = parseInt(a.slice(1), 16), pb = parseInt(b.slice(1), 16);
    const r = Math.round(lerp(pa >> 16, pb >> 16, t)), gg = Math.round(lerp((pa >> 8) & 255, (pb >> 8) & 255, t)), bb = Math.round(lerp(pa & 255, pb & 255, t));
    return '#' + ((1 << 24) | (r << 16) | (gg << 8) | bb).toString(16).slice(1);
  }
  R.mixHex = mixHex;

  R.S2 = function (ctx, t) {
    if (t < B(4) - 0.05 || t > T_TXT_OUT + 0.2) return;
    const a = 1 - prog(t, T_TXT_OUT, T_TXT_OUT + 0.14);
    if (a <= 0) return;
    ctx.save();
    ctx.globalAlpha = a;
    drawManifesto(ctx, t, false);
    ctx.restore();
  };

  /* ================= TRANSIÇÃO · texto → partículas → órbitas =================
     O bloco de texto vira ~5 mil partículas que giram no mesmo sentido
     ("todos remando na mesma direção"), com rotação diferencial kepleriana
     (o miolo gira mais rápido → braços em espiral), e se encaixam nas seis
     órbitas no drop. Tudo em coordenadas do mundo: a câmera, que está
     olhando de cima, depois inclina e as partículas inclinam junto. */
  let P = null;
  const TS = B(8);                     /* 3,75 s — o drop */
  function buildParticles(ctx0) {
    const c = document.createElement('canvas');
    c.width = R.W; c.height = R.H;
    const ctx = c.getContext('2d', { willReadFrequently: true });
    drawManifesto(ctx, 0, true);
    const img = ctx.getImageData(0, 0, R.W, R.H).data;
    const cam = R.camAt(T_TXT_OUT);
    const s = cam.F / cam.o.dist;
    const rnd = R.rng(77);
    const out = [];
    const ST = 4;
    for (let y = 0; y < R.H; y += ST) for (let x = 0; x < R.W; x += ST) {
      const i = (y * R.W + x) * 4;
      if (img[i + 3] < 110) continue;
      const wx = (x + ST / 2 - R.W / 2) / s, wz = (y + ST / 2 - R.H / 2) / s;
      const r0 = Math.hypot(wx, wz), th0 = Math.atan2(wx, wz);
      let k = 0, best = 1e9;
      for (let j = 0; j < 6; j++) { const d = Math.abs(R.orbitR(j) - r0); if (d < best) { best = d; k = j; } }
      out.push({ x, y, r0, th0, k, col: [img[i], img[i + 1], img[i + 2]], j: (rnd() - 0.5) * 2, q: rnd(), w: rnd() });
    }
    P = out;
    return P;
  }
  R.swirlAngle = function (p, t) {
    const om = 2.1 * Math.pow(420 / Math.max(p.r0, 70), 0.85);
    const g = E.quartIn(prog(t, T_TXT_OUT, TS));
    let th = p.th0 + om * g;
    if (t > TS) th += R.W_ORB(p.k) * (R.clock(t) - R.clock(TS));
    return th;
  };
  const colCache = new Map();
  R.Swirl = function (ctx, t, cam) {
    if (t < T_TXT_OUT - 0.02 || t > 4.9) return;
    if (!P) buildParticles(ctx);
    const snap = E.io(prog(t, 3.5, TS + 0.04));
    const tint = E.io(prog(t, 3.55, 3.95));
    const size = lerp(4, 2.2, E.out(prog(t, 3.5, 3.8)));
    const inA = prog(t, T_TXT_OUT - 0.02, T_TXT_OUT + 0.1);
    const flash = R.pulse(t, TS, 7);
    ctx.save();
    for (const p of P) {
      const fade = 1 - prog(t, 3.95 + p.q * 0.35, 4.3 + p.q * 0.5);
      const a = inA * fade;
      if (a <= 0.004) continue;
      const th = R.swirlAngle(p, t);
      const rr = lerp(p.r0, R.orbitR(p.k) + p.j * 10 * (1 - prog(t, TS, 4.4)), snap);
      const pr = cam.project(rr * Math.sin(th), 0, rr * Math.cos(th));
      if (pr.z < 10) continue;
      const qi = Math.round(tint * 8);
      const key = p.col[0] * 65536 + p.col[1] * 256 + p.col[2] + ':' + p.k + ':' + qi;
      let fs = colCache.get(key);
      if (!fs) {
        const pc = parseInt(R.PROJECTS[p.k].c[0].slice(1), 16), m = qi / 8;
        fs = 'rgb(' + Math.round(lerp(p.col[0], pc >> 16, m)) + ',' + Math.round(lerp(p.col[1], (pc >> 8) & 255, m)) + ',' + Math.round(lerp(p.col[2], pc & 255, m)) + ')';
        colCache.set(key, fs);
      }
      ctx.globalAlpha = clamp(a * (0.85 + flash * 0.6));
      ctx.fillStyle = fs;
      const sz = size * clamp(pr.s / (cam.F / 2600), 0.6, 1.6);
      ctx.fillRect(pr.x - sz / 2, pr.y - sz / 2, sz, sz);
    }
    ctx.restore();
  };
})();
