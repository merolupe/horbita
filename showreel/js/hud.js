/* ==========================================================================
   HUD — o "instrumento de medição" do site: cantos de mira, marca no canto,
   timecode, capítulo, régua de compassos e um editor de curva em miniatura
   ========================================================================== */
'use strict';
(function () {
  const { C, E, B, TAU, clamp, lerp, prog, font, layout } = R;
  const CH = ['IGNIÇÃO', 'MANIFESTO', 'SISTEMA', 'ALINHAMENTO', 'VARREDURA', 'IMPULSO', 'HORIZONTE', 'ASSINATURA'];
  const X0 = 96, X1 = 1824, RY = 1016;
  const mono = (s, w = 500) => font(w, s, R.MONO);

  R.HUD = function (ctx, t) {
    const inA = E.out(prog(t, 1.5, 2.05));
    const outA = 1 - prog(t, B(28) - 0.1, B(28) + 0.2);
    const endA = 1 - prog(t, 14.7, 15);
    ctx.save();
    /* cantos de mira */
    const cm = E.io(prog(t, 1.42, 1.9)) * endA;
    if (cm > 0) {
      const I = 40, A = 22 * cm;
      ctx.strokeStyle = 'rgba(152,161,177,.42)'; ctx.lineWidth = 1.5;
      [[I, I, 1, 1], [R.W - I, I, -1, 1], [R.W - I, R.H - I, -1, -1], [I, R.H - I, 1, -1]].forEach(c => {
        ctx.beginPath(); ctx.moveTo(c[0], c[1] + A * c[3]); ctx.lineTo(c[0], c[1]); ctx.lineTo(c[0] + A * c[2], c[1]); ctx.stroke();
      });
    }
    const a = inA * outA;
    if (a <= 0.003) { ctx.restore(); return; }
    ctx.globalAlpha = a;
    /* marca + nome (a marca chega voando da abertura) */
    const H = R.HUD_MARK;
    if (t >= 1.86 && t < B(28)) R.mark(ctx, H.x, H.y, H.sc);
    const wa = prog(t, 1.8, 2.0);
    if (wa > 0) {
      R.rise(ctx, layout(ctx, 'Hinove', font(600, 20), -0.3), 128, 70, t, { t0: 1.8, size: 20, color: C.ink, stagger: 0.02 });
      R.rise(ctx, layout(ctx, 'NÚCLEO FISCAL', mono(11), 2.2), 128, 88, t, { t0: 1.9, size: 11, color: C.ink3, stagger: 0.012 });
    }
    /* canto superior direito: sinal piscando no tempo + timecode */
    const on = (t % R.BEAT) < R.BEAT * 0.5;
    const L1 = layout(ctx, 'ÓRBITA — SHOWREEL', mono(13), 2.6);
    ctx.fillStyle = on ? C.acc : 'rgba(53,194,133,.25)';
    ctx.fillRect(X1 - L1.w - 18, 57, 7, 7);
    R.text(ctx, 'ÓRBITA — SHOWREEL', X1, 65, { font: mono(13), ls: 2.6, color: C.ink2, align: 'right' });
    const f = Math.max(0, Math.round(t * R.FPS)), ss = Math.floor(f / 60), ff = f % 60;
    const tc = 'TC 00:00:' + String(ss).padStart(2, '0') + ':' + String(ff).padStart(2, '0') + ' · 60 FPS · 128 BPM';
    R.text(ctx, tc, X1, 88, { font: mono(12), ls: 2, color: C.ink3, align: 'right' });

    /* régua de compassos */
    const rl = E.io(prog(t, 1.55, 2.1));
    ctx.fillStyle = 'rgba(92,100,116,.55)';
    ctx.fillRect(X0, RY, (X1 - X0) * rl, 1);
    for (let b = 0; b <= 32; b++) {
      const x = X0 + ((X1 - X0) * b) / 32;
      if (x > X0 + (X1 - X0) * rl) break;
      const bar = b % 4 === 0;
      ctx.fillStyle = bar ? 'rgba(152,161,177,.6)' : 'rgba(92,100,116,.55)';
      ctx.fillRect(x - 0.5, RY - (bar ? 12 : 5), 1, bar ? 12 : 5);
      if (bar && b < 32) R.text(ctx, String(b / 4 + 1).padStart(2, '0'), x + 5, RY + 18, { font: mono(10), ls: 1.5, color: C.ink3 });
    }
    const px = X0 + ((X1 - X0) * clamp(t / R.DUR));
    ctx.fillStyle = C.acc;
    ctx.fillRect(X0, RY - 1, (px - X0) * rl, 2);
    ctx.fillRect(px - 1, RY - 16, 2, 22);

    /* capítulo: troca rolando a cada compasso */
    const ci = clamp(Math.floor(t / R.BAR), 0, 7), ct = t - ci * R.BAR;
    const roll = E.out(prog(ct, 0, 0.32));
    ctx.save();
    ctx.beginPath(); ctx.rect(X0 - 4, 972, 460, 30); ctx.clip();
    const lab = i => String(i + 1).padStart(2, '0');
    const draw = (i, dy, al) => {
      if (i < 0) return;
      R.text(ctx, lab(i), X0, 994 + dy, { font: mono(14), ls: 3, color: C.acc, alpha: al });
      R.text(ctx, '— ' + CH[i], X0 + 40, 994 + dy, { font: mono(14), ls: 3, color: C.ink2, alpha: al });
    };
    draw(ci - 1, -roll * 26, 1 - roll);
    draw(ci, (1 - roll) * 26, roll);
    ctx.restore();

    /* editor de curva: a curva da casa, com alças, e o ponto andando no tempo */
    const bx = 1716, by = 942, bw = 108, bh = 52;
    ctx.strokeStyle = 'rgba(92,100,116,.5)'; ctx.lineWidth = 1;
    ctx.strokeRect(bx + 0.5, by + 0.5, bw, bh);
    const P = (u, v) => [bx + 6 + u * (bw - 12), by + bh - 6 - v * (bh - 12)];
    ctx.strokeStyle = 'rgba(152,161,177,.45)';
    ctx.beginPath(); ctx.moveTo(...P(0, 0)); ctx.lineTo(...P(0.22, 0.9)); ctx.moveTo(...P(1, 1)); ctx.lineTo(...P(0.24, 1)); ctx.stroke();
    ctx.fillStyle = 'rgba(152,161,177,.8)';
    [P(0.22, 0.9), P(0.24, 1)].forEach(q => ctx.fillRect(q[0] - 2, q[1] - 2, 4, 4));
    ctx.strokeStyle = 'rgba(243,245,249,.7)'; ctx.lineWidth = 1.4;
    ctx.beginPath();
    for (let i = 0; i <= 40; i++) { const u = i / 40, q = P(u, E.out(u)); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }
    ctx.stroke();
    const ph = (t % R.BEAT) / R.BEAT, dq = P(ph, E.out(ph));
    ctx.fillStyle = C.acc; ctx.beginPath(); ctx.arc(dq[0], dq[1], 3.2, 0, TAU); ctx.fill();
    R.text(ctx, 'EASE .22 .9 .24 1', bx - 14, by + bh - 4, { font: mono(11), ls: 1.6, color: C.ink3, align: 'right' });
    ctx.restore();
  };
})();
