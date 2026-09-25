/* ==========================================================================
   Cenas 6–8 · IMPULSO, HORIZONTE e ASSINATURA
   ========================================================================== */
'use strict';
(function () {
  const { C, E, B, TAU, clamp, lerp, prog, spring, font, layout } = R;
  const T6 = B(20), YC = 560;
  const TX0 = 330, TX1 = 1790, BH = 64;          /* trilho das barras */
  const RA = 354, RB = 452;                       /* linhas antes / depois */
  const MX = 160;                                 /* margem editorial */

  function bar(ctx, x, y, w, h, col) { if (w > 0.5 && h > 0.2) { ctx.fillStyle = col; ctx.fillRect(x, y - h / 2, w, h); } }

  /* ---------------- CENA 6 · IMPULSO ---------------- */
  R.S6 = function (ctx, t) {
    if (t < B(19) + 0.18 || t > 11.42) return;
    /* fio de varredura (tela inteira) → barra no trilho */
    const form = E.io(prog(t, B(19) + 0.2, B(19) + 0.42));
    const split = E.io(prog(t, T6 + 0.02, T6 + 0.3));
    const merge = E.io(prog(t, B(22) - 0.14, B(22) + 0.2));
    const x0 = lerp(0, TX0, form), x1 = lerp(R.W, TX1, form);
    const h = lerp(2.5, BH, E.out(prog(t, B(19) + 0.26, B(19) + 0.46)));
    const TB = { x0: MX, x1: 1760, y: 505, h: 72 };
    if (merge < 1) {
      /* barra "antes" (fantasma cinza) e "depois" (verde que encolhe) */
      const yA = lerp(YC, RA, split), yB = lerp(YC, RB, split);
      const gcol = R.mixHex(C.acc, '#303846', clamp(split * 1.6));
      const gy = lerp(yA, TB.y, merge), gx0 = lerp(x0, TB.x0, merge), gx1 = lerp(x1, TB.x1, merge), gh = lerp(h, TB.h, merge);
      if (split > 0) bar(ctx, gx0, gy, gx1 - gx0, gh, gcol);
      const wB = lerp(x1 - x0, (TX1 - TX0) * 0.125, split);
      const by = lerp(yB, TB.y, merge), bx0 = lerp(x0, TB.x0, merge);
      bar(ctx, bx0, by, lerp(wB, (TB.x1 - TB.x0) * 0.12, merge), lerp(h, TB.h, merge), C.acc);
      if (split <= 0) {
        ctx.fillStyle = 'rgba(214,255,234,.9)'; ctx.fillRect(x0, YC - 1.25, x1 - x0, 2.5);
      }
      const la = 1 - prog(t, B(22) - 0.2, B(22) - 0.05);
      ctx.save(); ctx.globalAlpha = la;
      const vf = font(600, 34);
      R.rise(ctx, layout(ctx, '20h', vf, -1.2), TX0 + 18, gy + 12, t, { t0: T6 - 0.05, size: 34, color: split > 0.4 ? C.ink : '#04140C' });
      R.rise(ctx, layout(ctx, '2h30', vf, -1.2), TX0 + wB + 16, by + 12, t, { t0: T6 + 0.16, size: 34, color: C.ink });
      const mf = font(500, 15, R.MONO);
      R.rise(ctx, layout(ctx, 'ANTES', mf, 3), MX, RA + 6, t, { t0: T6 + 0.12, size: 15, color: C.ink3 });
      R.rise(ctx, layout(ctx, 'DEPOIS', mf, 3), MX, RB + 6, t, { t0: T6 + 0.16, size: 15, color: C.ink3 });
      ctx.restore();
    }
    /* cabeça + delta */
    const outA = { t0: B(22) - 0.2, stagger: 0.006, dur: 0.3 };
    const hf = font(500, 36);
    R.rise(ctx, layout(ctx, 'Horas semanais gastas em relatórios e conferências repetitivas.', hf, -0.9), MX, 214, t, { t0: T6 + 0.06, size: 36, color: C.ink, stagger: 0.005, out: outA });
    const ra = E.io(prog(t, T6 + 0.1, T6 + 0.6)) * (1 - prog(t, B(22) - 0.2, B(22)));
    if (ra > 0) {
      ctx.fillStyle = 'rgba(92,100,116,.7)';
      ctx.fillRect(MX, 254, (1760 - MX) * ra, 1);
      ctx.fillRect(MX, 604, (1760 - MX) * ra, 1);
      R.text(ctx, 'POR ANALISTA · MÉDIA DO NÚCLEO', 1760, 214, { font: font(500, 14, R.MONO), ls: 2.6, color: C.ink3, align: 'right', alpha: ra });
    }
    const dOut = 1 - prog(t, B(22) - 0.18, B(22) + 0.02);
    if (dOut > 0 && t > B(21) - 0.6) {
      ctx.save(); ctx.globalAlpha = dOut;
      const L = R.odometer(ctx, '−87,5%', MX - 8, 860, t, { t0: B(21) - 0.38, size: 250, color: C.acc, dur: 0.42, stagger: 0.02, ls: -15, ease: E.snap });
      const cf = font(500, 40);
      R.rise(ctx, layout(ctx, 'de queda no', cf, -1.2), MX + L.w + 40, 792, t, { t0: B(21) - 0.1, size: 40, color: C.ink2 });
      R.rise(ctx, layout(ctx, 'tempo gasto', cf, -1.2), MX + L.w + 40, 842, t, { t0: B(21) - 0.04, size: 40, color: C.ink });
      ctx.restore();
    }
    /* barra de tempo do analista */
    if (t > B(22) - 0.14) timeBar(ctx, t, TB);
  };

  /* participação no tempo em função de quantos sistemas estão ligados */
  const TOG = k => B(22) + 0.2 + k * B(0.125);
  R.tbN = t => { let n = 0; for (let k = 0; k < 6; k++) n += E.io(prog(t, TOG(k), TOG(k) + 0.24)); return n; };
  R.tbSegs = t => {
    const n = R.tbN(t), g = 12 + 6 * n, p = 30 + n;
    return [[g, C.acc], [p, C.purple], [100 - g - p, C.red]];
  };

  function timeBar(ctx, t, TB) {
    const merge = E.io(prog(t, B(22) - 0.14, B(22) + 0.2));
    const bend = prog(t, 11.3, 11.4);
    const W = TB.x1 - TB.x0;
    if (bend <= 0) {
      /* segmentos: nascem do verde à esquerda e empurram para a direita */
      const segs = R.tbSegs(t);
      let x = TB.x0;
      segs.forEach((s, i) => {
        const w = (W * s[0]) / 100 * (i === 0 ? 1 : merge);
        bar(ctx, x, TB.y, w, TB.h, s[1]);
        if (i && w > 1) { ctx.fillStyle = C.bg; ctx.fillRect(x, TB.y - TB.h / 2, 2, TB.h); }
        if (w > 60) R.text(ctx, Math.round(s[0]) + '%', x + w / 2, TB.y + 7, { font: font(500, 18, R.MONO), ls: 1, color: '#fff', align: 'center', alpha: merge });
        x += w;
      });
      ctx.strokeStyle = 'rgba(152,161,177,.35)'; ctx.lineWidth = 1;
      ctx.strokeRect(TB.x0 - 0.5, TB.y - TB.h / 2 - 0.5, W + 1, TB.h + 1);
    }
    const out = { t0: 11.18, stagger: 0.006, dur: 0.26 };
    R.rise(ctx, layout(ctx, 'No que é gasto o tempo de um analista?', font(600, 62), -2.6), TB.x0, 392, t, { t0: B(22) + 0.02, size: 62, color: C.ink, stagger: 0.008, out });
    /* contador "n de 6 ligados" */
    const ca = prog(t, B(22) + 0.1, B(22) + 0.3) * (1 - prog(t, 11.16, 11.3));
    if (ca > 0) {
      const n = Math.round(R.tbN(t)), f = font(500, 26);
      const rest = ' de 6 ligados', Lr = layout(ctx, rest, f, -0.5);
      R.text(ctx, rest, TB.x1, 452, { font: f, ls: -0.5, color: C.ink2, align: 'right', alpha: ca });
      R.text(ctx, String(n), TB.x1 - Lr.w - 4, 452, { font: font(600, 26), color: C.acc, align: 'right', alpha: ca });
    }
    /* legenda */
    const lg = [['Análise estratégica', C.acc], ['Operacionalizando', C.purple], ['Repetitivo e moroso', C.red]];
    let lx = TB.x0;
    lg.forEach((l, i) => {
      const a = E.out(prog(t, B(22) + 0.12 + i * 0.05, B(22) + 0.45 + i * 0.05)) * (1 - prog(t, 11.16, 11.3));
      if (a > 0) {
        ctx.save(); ctx.globalAlpha = a;
        ctx.fillStyle = l[1]; ctx.fillRect(lx, 574, 13, 13);
        R.text(ctx, l[0], lx + 24, 587, { font: font(400, 22), color: C.ink2 });
        ctx.restore();
      }
      lx += layout(ctx, l[0], font(400, 22), 0).w + 64;
    });
    /* seis interruptores, um por semicolcheia */
    const cw = W / 6;
    R.PROJECTS.forEach((P, k) => {
      const x = TB.x0 + k * cw, y = 672;
      const a = E.out(prog(t, B(22) + 0.08 + k * 0.03, B(22) + 0.4 + k * 0.03)) * (1 - prog(t, 11.12 + k * 0.012, 11.28 + k * 0.012));
      if (a <= 0) return;
      const on = E.out(prog(t, TOG(k), TOG(k) + 0.16));
      ctx.save(); ctx.globalAlpha = a;
      ctx.strokeStyle = 'rgba(152,161,177,.35)'; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x, y - 34); ctx.lineTo(x + cw - 16, y - 34); ctx.stroke();
      ctx.strokeStyle = on > 0.5 ? C.acc : 'rgba(152,161,177,.6)';
      ctx.strokeRect(x + 0.5, y - 12.5, 22, 22);
      if (on > 0) {
        ctx.fillStyle = C.acc;
        const s = 22 * on; ctx.fillRect(x + 11 - s / 2, y - 1.5 - s / 2, s, s);
        ctx.strokeStyle = C.bg; ctx.lineWidth = 2.6; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
        ctx.beginPath(); ctx.moveTo(x + 6, y); ctx.lineTo(x + 6 + 4 * on, y + 4 * on); ctx.lineTo(x + 10 + 7 * on, y - 6 * on); ctx.stroke();
      }
      ctx.fillStyle = P.c[0]; ctx.fillRect(x + 34, y - 4, 8, 8);
      R.text(ctx, P.name, x + 52, y + 7, { font: font(500, 22), ls: -0.4, color: on > 0.5 ? C.ink : C.ink2 });
      ctx.restore();
    });
  }

  /* ---------------- CENA 7 · HORIZONTE ---------------- */
  const RH = 2600, YH = 884;
  R.S7 = function (ctx, t) {
    if (t < 11.28 || t > 13.9) return;
    const m = E.io(prog(t, 11.3, 11.88));
    const drop = E.expoOut(prog(t, B(28), B(28) + 0.55)) * 980;
    ctx.save();
    ctx.translate(0, drop + E.sineIO(prog(t, 11.6, 13.1)) * 26);
    const cy = lerp(505, YH, m), k = -m / RH, len = lerp(1600, 2360, m);
    const th = lerp(72, 3, E.io(prog(t, 11.3, 11.72)));
    const tint = E.io(prog(t, 11.32, 11.7));
    /* nascer do sol atrás do limbo (desenhado antes do planeta) */
    const rise = E.out(prog(t, 11.76, 12.95));
    const hit = R.pulse(t, B(27), 3.2);
    const sunY = YH + 40 - rise * 64;
    const glowA = prog(t, 11.72, 12.3);
    if (glowA > 0) {
      const g = ctx.createRadialGradient(960, sunY, 0, 960, sunY, 820);
      g.addColorStop(0, 'rgba(235,255,245,' + (0.9 * glowA).toFixed(3) + ')');
      g.addColorStop(0.05, 'rgba(160,240,200,' + (0.5 * glowA + hit * 0.2).toFixed(3) + ')');
      g.addColorStop(0.3, 'rgba(53,194,133,' + (0.12 * glowA + hit * 0.06).toFixed(3) + ')');
      g.addColorStop(1, 'rgba(53,194,133,0)');
      ctx.fillStyle = g; ctx.fillRect(0, sunY - 820, R.W, 1640);
    }
    /* o planeta: corpo escuro + atmosfera verde junto ao limbo */
    const body = prog(t, 11.5, 11.95);
    if (body > 0) {
      ctx.save();
      ctx.globalAlpha = body;
      ctx.beginPath(); ctx.arc(960, YH + RH, RH, 0, TAU);
      ctx.fillStyle = C.bg; ctx.fill();
      ctx.clip();
      const g = ctx.createLinearGradient(0, YH, 0, YH + 260);
      g.addColorStop(0, 'rgba(53,194,133,.24)'); g.addColorStop(1, 'rgba(53,194,133,0)');
      ctx.fillStyle = g; ctx.fillRect(0, YH - 10, R.W, 280);
      ctx.restore();
      /* halo de atmosfera: traços concêntricos (brilho barato e nítido) */
      [[26, 0.035], [12, 0.07], [5, 0.14]].forEach(h => {
        ctx.strokeStyle = 'rgba(53,194,133,' + (h[1] * body * (1 + glowA * 1.4 + hit)).toFixed(3) + ')';
        ctx.lineWidth = h[0];
        ctx.beginPath(); ctx.arc(960, YH + RH + h[0] / 2, RH, Math.PI * 1.25, Math.PI * 1.75); ctx.stroke();
      });
    }
    /* a barra dobrando e virando o limbo */
    const segs = R.tbSegs(t);
    let s0 = -len / 2;
    segs.forEach(sg => {
      const sl = (len * sg[0]) / 100;
      ctx.strokeStyle = tint > 0 ? R.mixHex(sg[1], '#8FE3BA', tint) : sg[1];
      ctx.lineWidth = th;
      ctx.beginPath();
      const n = 60;
      for (let i = 0; i <= n; i++) {
        const s = s0 + (sl * i) / n, p = R.bend(s, k);
        i ? ctx.lineTo(960 + p[0], cy + p[1]) : ctx.moveTo(960 + p[0], cy + p[1]);
      }
      ctx.stroke();
      s0 += sl;
    });
    /* estria anamórfica da luz */
    if (glowA > 0) {
      const sw = 1500 * (0.6 + rise * 0.4) * (1 + hit * 0.3);
      const g = ctx.createLinearGradient(960 - sw / 2, 0, 960 + sw / 2, 0);
      g.addColorStop(0, 'rgba(200,255,228,0)'); g.addColorStop(0.5, 'rgba(230,255,242,' + (0.75 * glowA).toFixed(3) + ')'); g.addColorStop(1, 'rgba(200,255,228,0)');
      ctx.fillStyle = g; ctx.fillRect(960 - sw / 2, YH - 2 - rise * 6, sw, 3);
      ctx.fillStyle = 'rgba(245,255,250,' + (glowA * 0.95).toFixed(3) + ')';
      ctx.beginPath(); ctx.ellipse(960, YH - rise * 6, 26 + hit * 14, 4.5, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
    /* a frase */
    const f = font(600, 80), LS = -3.4;
    const out = { t0: B(28) - 0.08, stagger: 0.004, dur: 0.26 };
    const l1 = layout(ctx, 'Automatizar não é cortar gente.', f, LS);
    const l2 = layout(ctx, 'É devolver o tempo para pensar.', f, LS);
    R.rise(ctx, l1, (R.W - l1.w) / 2, 408, t, { t0: B(25) - 0.1, size: 80, color: C.ink, stagger: 0.007, dur: 0.46, out });
    R.rise(ctx, l2, (R.W - l2.w) / 2, 506, t, { t0: B(26) - 0.14, size: 80, color: C.acc, stagger: 0.007, dur: 0.46, out });
  };

  /* ---------------- CENA 8 · ASSINATURA ---------------- */
  const LC = { x: 960, y: 402, sc: 2.1 };
  R.S8 = function (ctx, t) {
    if (t < B(28) - 0.02) return;
    const H = R.HUD_MARK;
    /* órbita decorativa em volta da marca: metade de trás */
    const orb = E.io(prog(t, 13.42, 14.15));
    const oa = R.deg(-14), orx = 300, ory = 66;
    const dotA = t * 2.1 + 2.2;
    const ellipse = (a0, a1) => {
      ctx.beginPath();
      for (let i = 0; i <= 64; i++) {
        const a = a0 + ((a1 - a0) * i) / 64, x = Math.cos(a) * orx, y = Math.sin(a) * ory;
        const px = LC.x + x * Math.cos(oa) - y * Math.sin(oa), py = LC.y + x * Math.sin(oa) + y * Math.cos(oa);
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
    };
    const dot = (front) => {
      if (orb < 1) return;
      const s = Math.sin(dotA);
      if ((s > 0) !== front) return;
      const x = Math.cos(dotA) * orx, y = s * ory;
      const px = LC.x + x * Math.cos(oa) - y * Math.sin(oa), py = LC.y + x * Math.sin(oa) + y * Math.cos(oa);
      ctx.fillStyle = C.acc; ctx.beginPath(); ctx.arc(px, py, 8 + s * 2, 0, TAU); ctx.fill();
    };
    if (orb > 0) {
      ctx.strokeStyle = 'rgba(143,175,203,.32)'; ctx.lineWidth = 1.6;
      ellipse(Math.PI, Math.PI + Math.PI * orb);
      dot(false);
    }
    /* marca: sai do canto do HUD e cresce, cada círculo com seu atraso */
    R.MARK.forEach((m, i) => {
      const f = E.whip(prog(t, B(28) + i * 0.045, B(28) + 0.5 + i * 0.045));
      const sp = spring(t - (B(28) + 0.36 + i * 0.045), 2.4, 0.45);
      const u = 1 - f;
      const ax = H.x + (m[0] - 55) * H.sc, ay = H.y + (m[1] - 49) * H.sc;
      const bx = LC.x + (m[0] - 55) * LC.sc, by = LC.y + (m[1] - 49) * LC.sc;
      const qx = lerp(ax, bx, 0.2) + 160, qy = lerp(ay, by, 0.8) - 40;
      const x = u * u * ax + 2 * u * f * qx + f * f * bx, y = u * u * ay + 2 * u * f * qy + f * f * by;
      let sc = Math.exp(lerp(Math.log(H.sc), Math.log(LC.sc), f));
      if (f >= 1) sc = LC.sc * (1 + (1 - sp) * -0.04);
      const beat = R.pulse(t, B(31) + i * 0.06, 7) * 0.09;
      ctx.save();
      ctx.globalAlpha = m[4];
      ctx.fillStyle = m[3];
      ctx.beginPath(); ctx.arc(x, y, m[2] * sc * (1 + beat), 0, TAU); ctx.fill();
      ctx.restore();
    });
    if (orb > 0) {
      ctx.strokeStyle = 'rgba(143,175,203,.5)'; ctx.lineWidth = 1.6;
      ellipse(0, Math.PI * orb);
      dot(true);
    }
    /* palavra-marca e créditos */
    const wf = font(600, 176), W1 = layout(ctx, 'órbita', wf, -9.5);
    R.rise(ctx, W1, (R.W - W1.w) / 2, 742, t, { t0: B(28) + 0.36, size: 176, color: C.ink, stagger: 0.04, dur: 0.7 });
    const ru = E.io(prog(t, 13.72, 14.2));
    if (ru > 0) { ctx.fillStyle = 'rgba(92,100,116,.8)'; ctx.fillRect(960 - 260 * ru, 790, 520 * ru, 1); }
    const mf = font(500, 15, R.MONO), M1 = layout(ctx, 'HINOVE FERTILIZANTES ESPECIAIS · NÚCLEO FISCAL', mf, 3.4);
    R.rise(ctx, M1, (R.W - M1.w) / 2, 834, t, { t0: 13.8, size: 15, color: C.ink3, stagger: 0.006, dur: 0.4 });
    const uf = font(500, 19, R.MONO), U1 = layout(ctx, 'merolupe.github.io/orbita', uf, 1.2);
    R.rise(ctx, U1, (R.W - U1.w) / 2, 876, t, { t0: 13.95, size: 19, color: C.acc, stagger: 0.008, dur: 0.4 });
  };
})();
