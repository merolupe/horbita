/* ==========================================================================
   Cenas 3–5 · SISTEMA, ALINHAMENTO e VARREDURA
   ========================================================================== */
'use strict';
(function () {
  const { C, E, B, TAU, clamp, lerp, prog, spring, font, layout } = R;

  /* ---------- relógio orbital ----------
     Velocidade variável (time-lapse), integrada numa tabela: os planetas
     aceleram, freiam com força e travam alinhados exatamente no tempo 14. */
  const TS = B(8);
  R.ALIGN_T = B(14);
  function speed(t) {
    if (t < 4.2) return 1;
    if (t < 5.9) return lerp(1, 4.2, E.sineIO(prog(t, 4.2, 5.9)));
    if (t < 6.2) return 4.2;
    return lerp(4.2, 0.16, E.expoOut(prog(t, 6.2, 6.75)));
  }
  const DT = 1 / 2000, TAB = new Float64Array(Math.ceil(16 / DT) + 2);
  for (let i = 1; i < TAB.length; i++) TAB[i] = TAB[i - 1] + speed((i - 0.5) * DT) * DT;
  R.clock = t => {
    const x = clamp(t, 0, 15.99) / DT, i = Math.floor(x);
    return lerp(TAB[i], TAB[i + 1], x - i);
  };
  R.W_ORB = k => (0.085 / Math.pow(R.PROJECTS[k].f, 1.5)) * 1.55;
  R.ALIGN_TH = R.deg(18 + 104);            /* raio do alinhamento (definido pela câmera) */
  R.planetAngle = (k, t) => R.ALIGN_TH + R.W_ORB(k) * (R.clock(t) - R.clock(R.ALIGN_T));
  R.planetPos = (k, t) => {
    const a = R.planetAngle(k, t), r = R.orbitR(k);
    return [r * Math.sin(a), 0, r * Math.cos(a)];
  };
  R.POP = k => B(9) + k * B(0.5);          /* colcheias a partir do tempo 9 */
  /* no mergulho os vizinhos saem de cena (antecipação + estouro), do mais
     próximo do FiscalBot para o mais distante — o foco fica num corpo só */
  const OUT_ORDER = { 4: 0, 2: 0, 5: 1, 1: 1, 0: 2 };
  R.OUT_T = k => 6.74 + (OUT_ORDER[k] || 0) * 0.07;
  R.popOut = (k, t) => (k === 3 ? 1 : 1 - E.backIn(prog(t, R.OUT_T(k), R.OUT_T(k) + 0.24), 2.2));

  const SUN = [0, 0, 0];

  function orbitPath(ctx, cam, r, a0, span, dash) {
    const n = Math.max(24, Math.round(220 * Math.abs(span) / TAU));
    ctx.beginPath();
    let pen = false;
    for (let i = 0; i <= n; i++) {
      const a = a0 + (span * i) / n;
      const p = cam.project(r * Math.sin(a), 0, r * Math.cos(a));
      if (p.z < 25) { pen = false; continue; }
      pen ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y);
      pen = true;
    }
    if (dash) ctx.setLineDash(dash);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  function chip(ctx, x, y, idx, name, p, col, dir) {
    /* etiqueta do corpo: fio em cotovelo + caixa monoespaçada */
    const f = font(500, 14, R.MONO);
    const L1 = layout(ctx, idx, f, 2), L2 = layout(ctx, name.toUpperCase(), f, 2);
    const w = 25 + L1.w + 12 + L2.w + 14, h = 30;
    const lead = E.out(prog(p, 0, 0.35)), box = E.out(prog(p, 0.2, 0.7));
    ctx.save();
    ctx.strokeStyle = 'rgba(152,161,177,.55)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(x, y);
    const ex = x + 20 * lead, ey = y + 20 * lead * dir;
    ctx.lineTo(ex, ey);
    if (lead >= 1) ctx.lineTo(ex + 14, ey);
    ctx.stroke();
    if (box > 0) {
      const bx = ex + 14, by = ey - h / 2, bw = w * box;
      ctx.fillStyle = 'rgba(7,9,14,.82)'; ctx.fillRect(bx, by, bw, h);
      ctx.strokeStyle = 'rgba(152,161,177,.4)'; ctx.strokeRect(bx + 0.5, by + 0.5, bw - 1, h - 1);
      ctx.beginPath(); ctx.rect(bx, by, bw, h); ctx.clip();
      ctx.fillStyle = col; ctx.fillRect(bx + 11, ey - 3, 6, 6);
      R.text(ctx, idx, bx + 25, ey + 5, { font: f, ls: 2, color: C.ink3 });
      R.text(ctx, name.toUpperCase(), bx + 25 + L1.w + 12, ey + 5, { font: f, ls: 2, color: C.ink });
    }
    ctx.restore();
  }

  /* ---------- CENA 3/4: o sistema ---------- */
  R.S3 = function (ctx, t, cam) {
    if (t < TS - 0.05 || t > 9.45) return;
    const dive = prog(t, 6.62, 7.3);
    /* órbitas */
    ctx.save();
    for (let k = 0; k < 6; k++) {
      const drawOn = E.io(prog(t, 3.86 + k * 0.05, 4.62 + k * 0.05));
      if (drawOn <= 0) continue;
      const hot = k === 3 ? prog(t, 6.3, 6.5) * (1 - prog(t, 6.95, 7.2)) : 0;
      const base = (0.16 + k * 0.045) * (1 - E.io(dive));
      const a = base * drawOn + hot * 0.5;
      if (a <= 0.003) continue;
      ctx.strokeStyle = hot > 0 ? R.rgba(R.mixHex('#8FAFCB', C.acc, hot), a) : 'rgba(143,175,203,' + a.toFixed(3) + ')';
      ctx.lineWidth = 1.5 + hot;
      const a0 = R.planetAngle(k, TS) - 0.2;
      orbitPath(ctx, cam, R.orbitR(k), a0, TAU * drawOn, R.PROJECTS[k].wip ? [7, 9] : null);
    }
    ctx.restore();

    /* raio do alinhamento */
    const lay = E.expoOut(prog(t, R.ALIGN_T - 0.12, R.ALIGN_T + 0.12));
    const layOut = 1 - prog(t, R.ALIGN_T + 0.3, R.ALIGN_T + 0.62);
    if (lay > 0 && layOut > 0) {
      const a = R.ALIGN_TH, r1 = 1180 * lay;
      const p0 = cam.project(0, 0, 0), p1 = cam.project(r1 * Math.sin(a), 0, r1 * Math.cos(a));
      if (p0.z > 20 && p1.z > 20) {
        ctx.save();
        ctx.globalAlpha = layOut;
        ctx.strokeStyle = R.rgba(C.acc, 0.22); ctx.lineWidth = 9;
        ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
        ctx.strokeStyle = '#BFF5DA'; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1.x, p1.y); ctx.stroke();
        ctx.restore();
      }
    }

    /* corpos, ordenados por profundidade (o sol entra na fila) */
    const list = [];
    const sp = cam.project(0, 0, 0);
    list.push({ z: sp.z, sun: true });
    for (let k = 0; k < 6; k++) {
      const pop = spring(t - R.POP(k), 2.8, 0.38) * R.popOut(k, t);
      if (pop <= 0.002 && !(t > R.OUT_T(k) && t < R.OUT_T(k) + 0.6)) continue;
      const pos = R.planetPos(k, t), p = cam.project(pos[0], pos[1], pos[2]);
      list.push({ z: p.z, k, pos, pop });
    }
    list.sort((a, b) => b.z - a.z);
    for (const it of list) {
      if (it.sun) { drawSun(ctx, t, cam, sp); continue; }
      drawPlanet(ctx, t, cam, it);
    }

    /* etiquetas: seguem o corpo com atraso (ação secundária) */
    const labA = 1 - prog(t, 5.92, 6.18);
    if (labA > 0) {
      ctx.save(); ctx.globalAlpha = labA;
      for (let k = 0; k < 6; k++) {
        const p = t - R.POP(k) - 0.06;
        if (p <= 0) continue;
        const pos = R.planetPos(k, t - 0.07), q = cam.project(pos[0], pos[1], pos[2]);
        if (q.z < 30) continue;
        const rr = R.bodyR(k) * q.s;
        const dir = k % 2 ? 1 : -1;
        chip(ctx, q.x + rr * 0.72, q.y + rr * 0.72 * dir, '0' + (k + 1), R.PROJECTS[k].name, p, R.PROJECTS[k].c[0], dir);
      }
      ctx.restore();
    }

    /* título editorial */
    const ty0 = 4.0, tOut = 6.12;
    if (t > ty0 && t < tOut + 0.6) {
      const F = font(600, 78), LS = -3.6;
      const a1 = layout(ctx, 'Seis rotinas', F, LS), a2 = layout(ctx, 'em ', F, LS), a3 = layout(ctx, 'órbita.', F, LS);
      const out = { t0: tOut, stagger: 0.012, dur: 0.4 };
      R.rise(ctx, a1, 96, 236, t, { t0: ty0, size: 78, color: C.ink, out });
      R.rise(ctx, a2, 96, 318, t, { t0: ty0 + 0.1, size: 78, color: C.ink, out });
      R.rise(ctx, a3, 96 + a2.w + LS, 318, t, { t0: ty0 + 0.16, size: 78, color: C.acc, out: { ...out, t0: tOut + 0.04 } });
      const pf = font(400, 23), pa = 1 - prog(t, tOut, tOut + 0.25);
      const l1 = layout(ctx, 'Cada corpo é um sistema que assumiu', pf, -0.2);
      const l2 = layout(ctx, 'uma tarefa repetitiva do fechamento.', pf, -0.2);
      ctx.save(); ctx.globalAlpha = pa;
      R.rise(ctx, l1, 98, 378, t, { t0: ty0 + 0.34, size: 23, color: C.ink2, stagger: 0.006, dur: 0.5 });
      R.rise(ctx, l2, 98, 410, t, { t0: ty0 + 0.4, size: 23, color: C.ink2, stagger: 0.006, dur: 0.5 });
      ctx.restore();
    }
  };

  function drawSun(ctx, t, cam, p) {
    if (p.z < 20) return;
    const pop = spring(t - TS, 2.2, 0.4);
    if (pop <= 0.002) return;
    let beat = 0;
    for (let b = 8; b < 16; b++) beat = Math.max(beat, R.pulse(t, B(b), 10));
    const r = R.SUN_R * p.s * pop * (1 + beat * 0.07);
    const gl = ctx.createRadialGradient(p.x, p.y, r * 0.6, p.x, p.y, r * 5.5);
    gl.addColorStop(0, 'rgba(243,245,249,' + (0.26 + beat * 0.12).toFixed(3) + ')');
    gl.addColorStop(0.35, 'rgba(160,220,200,.07)');
    gl.addColorStop(1, 'rgba(160,220,200,0)');
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.arc(p.x, p.y, r * 5.5, 0, TAU); ctx.fill();
    ctx.fillStyle = C.ink;
    ctx.beginPath(); ctx.arc(p.x, p.y, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(243,245,249,.2)'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.arc(p.x, p.y, r * 2.4, 0, TAU); ctx.stroke();
    /* onda de choque do drop */
    const w = prog(t, TS, TS + 0.9);
    if (w > 0 && w < 1) {
      const q = E.expoOut(w);
      ctx.strokeStyle = 'rgba(210,255,232,' + (0.7 * (1 - w)).toFixed(3) + ')';
      ctx.lineWidth = 3 * (1 - w) + 0.5;
      ctx.beginPath(); ctx.arc(p.x, p.y, r + q * 1300, 0, TAU); ctx.stroke();
    }
  }

  function drawPlanet(ctx, t, cam, it) {
    const k = it.k, P = R.PROJECTS[k], rad = R.bodyR(k);
    const tw = t - (R.OUT_T(k) + 0.2);
    if (k !== 3 && tw > 0 && tw < 0.45) {
      const p = cam.project(it.pos[0], it.pos[1], it.pos[2]);
      if (p.z > 20) {
        const q = E.cubicOut(tw / 0.45);
        ctx.strokeStyle = R.rgba(P.c[0], 0.7 * (1 - q)); ctx.lineWidth = 2 * (1 - q) + 0.6;
        ctx.beginPath(); ctx.arc(p.x, p.y, rad * p.s * (0.6 + q * 1.6), 0, TAU); ctx.stroke();
      }
    }
    if (it.pop <= 0.002) return;
    const ripple = R.pulse(t, R.ALIGN_T + k * 0.035, 6);
    const halo = Math.max(1 - prog(t, R.POP(k), R.POP(k) + 0.55), ripple);
    const big = k === 3 ? prog(t, 7.0, 7.6) : 0;
    const ringPts = P.ring ? R.ringPts(it.pos, rad * 2.2) : null;
    if (ringPts) ringHalf(ctx, cam, ringPts, it, -1, P);
    R.body(ctx, cam, it.pos, rad, P.c, SUN, { scale: it.pop, halo: halo * (1 - big), lat: big, latShift: ((t * 0.035) % 0.28), dim: big * 0.3 });
    if (ringPts) ringHalf(ctx, cam, ringPts, it, 1, P);
    if (P.moon) {
      const ma = R.clock(t) * 1.9 + 1.2, md = rad * 2.7;
      const mp = [it.pos[0] + Math.cos(ma) * md, Math.sin(ma) * md * 0.18, it.pos[2] + Math.sin(ma) * md];
      R.body(ctx, cam, mp, 5 * 2.7, ['#C9D2DE', '#98A1B1', '#3A4150'], SUN, { scale: it.pop });
    }
  }
  function ringHalf(ctx, cam, pts, it, side, P) {
    /* side −1: metade atrás do corpo; +1: metade na frente */
    ctx.save();
    ctx.strokeStyle = R.rgba(P.c[0], 0.6);
    ctx.beginPath();
    let pen = false;
    const c = cam.project(it.pos[0], 0, it.pos[2]);
    for (const q of pts) {
      const p = cam.project(q[0], q[1], q[2]);
      const behind = p.z > it.z;
      if (p.z < 10 || (side < 0) !== behind) { pen = false; continue; }
      const px = lerp(c.x, p.x, it.pop), py = lerp(c.y, p.y, it.pop);
      pen ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      pen = true;
      ctx.lineWidth = clamp(2.2 * p.s * 2, 1.2, 3);
    }
    ctx.stroke();
    ctx.restore();
  }

  /* ---------- CENA 5: varredura do FiscalBot ---------- */
  const T5 = B(16);
  const NODES = [[0.26, 0.33, 'CFOP'], [0.62, 0.25, 'CST'], [0.355, 0.67, 'ALÍQUOTA'], [0.69, 0.75, 'CADASTRO']];
  R.S5 = function (ctx, t, cam) {
    if (t < T5 - 0.1 || t > 9.45) return;
    const pos = R.planetPos(3, t), p = cam.project(pos[0], pos[1], pos[2]);
    const r = R.bodyR(3) * p.s;
    const m = 30, x0 = p.x - r - m, y0 = p.y - r - m, S = 2 * (r + m);
    /* cantos de mira */
    const br = E.expoOut(prog(t, T5 - 0.04, T5 + 0.3));
    if (br > 0) {
      const off = (1 - br) * 90, arm = 46;
      ctx.save();
      ctx.strokeStyle = 'rgba(243,245,249,' + (0.75 * br).toFixed(3) + ')'; ctx.lineWidth = 2;
      [[x0 - off, y0 - off, 1, 1], [x0 + S + off, y0 - off, -1, 1], [x0 + S + off, y0 + S + off, -1, -1], [x0 - off, y0 + S + off, 1, -1]].forEach(c => {
        ctx.beginPath(); ctx.moveTo(c[0], c[1] + arm * c[3]); ctx.lineTo(c[0], c[1]); ctx.lineTo(c[0] + arm * c[2], c[1]); ctx.stroke();
      });
      /* mostrador em volta do disco — eco da abertura */
      const dial = E.io(prog(t, T5 + 0.05, T5 + 0.6));
      ctx.strokeStyle = 'rgba(152,161,177,.5)'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 72 * dial; i++) {
        const a = -Math.PI / 2 + (i / 72) * TAU + t * 0.08, l = i % 6 === 0 ? 14 : 6;
        ctx.beginPath();
        ctx.moveTo(p.x + Math.cos(a) * (r + 12), p.y + Math.sin(a) * (r + 12));
        ctx.lineTo(p.x + Math.cos(a) * (r + 12 + l), p.y + Math.sin(a) * (r + 12 + l));
        ctx.stroke();
      }
      ctx.restore();
    }
    /* nós: acendem quando a varredura passa */
    ctx.save();
    const nodeOut = 1 - prog(t, B(19) - 0.1, B(19) + 0.05);
    NODES.forEach((n, i) => {
      const nx = x0 + n[0] * S, ny = y0 + n[1] * S;
      const tHit = T5 + 0.12 + 0.78 * inverseIO(clamp((ny - y0 - 8) / (S - 16)));
      const q = E.out(prog(t, tHit, tHit + 0.35));
      if (q <= 0) return;
      ctx.globalAlpha = q * nodeOut;
      const dx = (1 - q) * -8;
      ctx.strokeStyle = C.ink; ctx.lineWidth = 1.6;
      ctx.strokeRect(nx - 10 + dx, ny - 10, 20, 20);
      ctx.fillStyle = C.acc; ctx.fillRect(nx - 5 + dx, ny - 5, 10, 10);
      ctx.strokeStyle = 'rgba(243,245,249,.55)'; ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.moveTo(nx + 10 + dx, ny); ctx.lineTo(nx + 46 + dx, ny); ctx.stroke();
      ctx.fillStyle = 'rgba(7,9,14,.72)'; ctx.fillRect(nx + 50 + dx, ny - 16, layout(ctx, n[2], font(500, 17, R.MONO), 2.6).w + 16, 32);
      R.text(ctx, n[2], nx + 58 + dx, ny + 6, { font: font(500, 17, R.MONO), ls: 2.6, color: C.ink });
      R.text(ctx, 'OK', nx + 66 + dx + layout(ctx, n[2], font(500, 17, R.MONO), 2.6).w, ny + 6, { font: font(500, 13, R.MONO), ls: 2, color: C.acc, alpha: prog(t, tHit + 0.2, tHit + 0.3) });
    });
    ctx.restore();
    panel(ctx, t);
  };
  /* linha de varredura: desce, volta ao centro e vira o fio da próxima cena.
     Fica fora do achatamento de CRT — é ela que sobra na tela. */
  R.S5line = function (ctx, t, cam) {
    if (t < T5 + 0.1 || t > B(19) + 0.2) return;
    const pos = R.planetPos(3, t), p = cam.project(pos[0], pos[1], pos[2]);
    const r = R.bodyR(3) * p.s, m = 30, x0 = p.x - r - m, y0 = p.y - r - m, S = 2 * (r + m);
    const down = E.io(prog(t, T5 + 0.12, T5 + 0.9));
    const back = E.io(prog(t, B(18) + 0.18, B(19)));
    const sy = lerp(lerp(y0 + 8, y0 + S - 8, down), p.y, back);
    const wide = E.expoOut(prog(t, B(19), B(19) + 0.2));
    const xa = lerp(x0 - 20, 0, wide), xb = lerp(x0 + S + 20, R.W, wide);
    const trail = (1 - back) * clamp((down - 0.02) * 8) * (1 - down * 0.2);
    if (trail > 0) {
      const g = ctx.createLinearGradient(0, sy - 140, 0, sy);
      g.addColorStop(0, R.rgba(C.acc, 0)); g.addColorStop(1, R.rgba(C.acc, 0.2 * trail));
      ctx.fillStyle = g; ctx.fillRect(xa, sy - 140, xb - xa, 140);
    }
    ctx.fillStyle = R.rgba(C.acc, 0.35); ctx.fillRect(xa, sy - 4, xb - xa, 8);
    ctx.fillStyle = '#D6FFEA'; ctx.fillRect(xa, sy - 1.25, xb - xa, 2.5);
  };
  function inverseIO(y) { let lo = 0, hi = 1; for (let i = 0; i < 30; i++) { const m = (lo + hi) / 2; if (E.io(m) < y) lo = m; else hi = m; } return lo; }

  /* painel de leitura à direita */
  function panel(ctx, t) {
    const X = 1110, out = { t0: B(19) - 0.14, stagger: 0.008, dur: 0.3 };
    const oa = 1 - prog(t, B(19) - 0.1, B(19) + 0.12);
    if (oa <= 0) return;
    ctx.save(); ctx.globalAlpha = oa;
    /* selo */
    const pa = E.out(prog(t, T5 + 0.08, T5 + 0.4));
    if (pa > 0) {
      const f = font(500, 14, R.MONO), L = layout(ctx, 'EM PRODUÇÃO', f, 2.4);
      ctx.save(); ctx.globalAlpha *= pa;
      ctx.strokeStyle = 'rgba(152,161,177,.45)'; ctx.lineWidth = 1;
      ctx.strokeRect(X + 0.5, 318.5, L.w + 48, 34);
      ctx.fillStyle = C.acc; ctx.fillRect(X + 15, 332, 7, 7);
      R.text(ctx, 'EM PRODUÇÃO', X + 32, 341, { font: f, ls: 2.4, color: C.ink2 });
      ctx.restore();
    }
    const H = font(600, 124), LH = layout(ctx, 'FiscalBot', H, -6.4);
    R.rise(ctx, LH, X - 4, 480, t, { t0: T5 + 0.12, size: 124, color: C.ink, stagger: 0.028, out });
    const K = font(500, 38), LK = layout(ctx, 'O revisor que nunca pisca.', K, -1.2);
    R.rise(ctx, LK, X, 540, t, { t0: T5 + 0.34, size: 38, color: C.ink2, stagger: 0.01, out });
    /* KPIs com contador de rolo */
    const kp = E.io(prog(t, T5 + 0.4, T5 + 0.8));
    if (kp > 0) {
      const W = 690, y = 590;
      ctx.fillStyle = 'rgba(92,100,116,.7)';
      ctx.fillRect(X, y, W * kp, 1); ctx.fillRect(X, y + 118, W * kp, 1);
      const cells = [['99', '%', 'sem toque humano'], ['8.000', '', 'docs em 2 min'], ['+60', '', 'regras aplicadas']];
      cells.forEach((c, i) => {
        const cx = X + i * (W / 3) + (i ? 24 : 0);
        if (i) { ctx.fillStyle = 'rgba(92,100,116,.7)'; ctx.fillRect(X + i * (W / 3), y + 1, 1, 117 * kp); }
        const tt = T5 + 0.3 + i * 0.07;
        R.odometer(ctx, c[0] + c[1], cx, y + 66, t, { t0: tt, size: 54, color: C.ink, dur: 0.5, stagger: 0.03 });
        const lf = font(400, 20), LL = layout(ctx, c[2], lf, -0.2);
        R.rise(ctx, LL, cx, y + 100, t, { t0: tt + 0.1, size: 20, color: C.ink3, stagger: 0.006, dur: 0.45 });
      });
    }
    ctx.restore();
  }

  /* números que rolam como odômetro: cada dígito numa coluna com máscara */
  R.odometer = function (ctx, str, x, y, t, o) {
    const size = o.size, F = o.font || font(600, size), ls = o.ls == null ? -size * 0.04 : o.ls;
    const L = layout(ctx, str, F, ls);
    ctx.save();
    ctx.beginPath(); ctx.rect(x - 10, y - size * 0.98, L.w + 40, size * 1.22); ctx.clip();
    ctx.font = F; ctx.letterSpacing = '0px'; ctx.fillStyle = o.color || C.ink;
    const n = L.chars.length;
    L.chars.forEach((ch, i) => {
      const t0 = o.t0 + (n - 1 - i) * (o.stagger == null ? 0.05 : o.stagger);
      const p = (o.ease || E.out)(prog(t, t0, t0 + (o.dur || 0.8)));
      if (p <= 0) return;
      const cx = x + L.xs[i];
      if (/[0-9]/.test(ch)) {
        const d = +ch, spins = 1 + ((i * 7) % 3);
        const v = d - 10 * spins * (1 - p);   /* conta para cima; o próximo dígito desce do alto */
        const lo = Math.floor(v), fr = v - lo;
        const pitch = size * 1.08, w10 = n => String(((n % 10) + 10) % 10);
        ctx.fillText(w10(lo), cx, y + fr * pitch);
        ctx.fillText(w10(lo + 1), cx, y + fr * pitch - pitch);
      } else {
        ctx.globalAlpha = p;
        ctx.fillText(ch, cx, y + (1 - p) * size * 0.6);
        ctx.globalAlpha = 1;
      }
    });
    ctx.restore();
    return L;
  };
})();
