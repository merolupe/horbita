/* ==========================================================================
   Mundo 3D: teia de galáxias (assinatura do site), poeira e o sistema solar
   ========================================================================== */
'use strict';
(function () {
  const { TAU, clamp, lerp } = R;

  /* ---------- teia de galáxias ----------
     Estrelas numa casca esférica, agrupadas em aglomerados (4 em 5), ligadas
     por fios quando próximas na tela — a mesma regra do canvas #web do site. */
  const rnd = R.rng(20260925);
  const unit = () => {
    const z = rnd() * 2 - 1, a = rnd() * TAU, s = Math.sqrt(1 - z * z);
    return [s * Math.cos(a), z, s * Math.sin(a)];
  };
  const norm = v => { const l = Math.hypot(v[0], v[1], v[2]) || 1; return [v[0] / l, v[1] / l, v[2] / l]; };
  const clusters = Array.from({ length: 46 }, () => ({ d: unit(), s: 0.05 + rnd() * 0.13 }));
  const stars = [];
  for (let i = 0; i < 4600; i++) {
    const inClu = i % 5 !== 0;
    let d;
    if (inClu) {
      const c = clusters[i % clusters.length], q = unit(), k = c.s * Math.sqrt(rnd());
      d = norm([c.d[0] + q[0] * k, c.d[1] + q[1] * k, c.d[2] + q[2] * k]);
    } else d = unit();
    const dist = 6200 + rnd() * 6000, depth = 0.35 + rnd() * 0.65;
    stars.push({
      x: d[0] * dist, y: d[1] * dist, z: d[2] * dist, depth,
      a: 0.2 + depth * 0.5, r: 0.55 + depth * 1.35, hub: inClu && rnd() < 0.09,
      p1: rnd() * TAU, p2: rnd() * TAU, p3: rnd() * TAU, w: 0.25 + rnd() * 0.4, amp: 50 + rnd() * 120,
    });
  }
  /* poeira dentro do sistema: só aparece de verdade no mergulho, como riscos */
  const dust = [];
  for (let i = 0; i < 900; i++) {
    const a = rnd() * TAU, rr = 180 + Math.pow(rnd(), 0.7) * 2900;
    const g = (rnd() + rnd() + rnd() - 1.5) * 420;
    dust.push({ x: Math.sin(a) * rr, y: g, z: Math.cos(a) * rr, r: 1.2 + rnd() * 2.6, a: 0.25 + rnd() * 0.55 });
  }

  const LINK = 124;
  const pts = [];
  R.Stars = {
    /* cam: câmera no instante; cam0: câmera no início do subintervalo
       (os riscos cobrem o subintervalo inteiro e se emendam no motion blur) */
    draw(ctx, cam, cam0, t, o) {
      const alpha = o.alpha == null ? 1 : o.alpha;
      if (alpha <= 0.002) return;
      const linkA = (o.link == null ? 1 : o.link) * alpha;
      pts.length = 0;
      for (let i = 0; i < stars.length; i++) {
        const s = stars[i];
        const wx = s.x + Math.sin(t * s.w + s.p1) * s.amp;
        const wy = s.y + Math.sin(t * s.w * 0.8 + s.p2) * s.amp;
        const wz = s.z + Math.sin(t * s.w * 1.1 + s.p3) * s.amp;
        const p = cam.project(wx, wy, wz);
        if (p.z < 60 || p.x < -80 || p.x > R.W + 80 || p.y < -80 || p.y > R.H + 80) continue;
        const q = cam0.project(wx, wy, wz);
        pts.push({ s, x: p.x, y: p.y, qx: q.z > 60 ? q.x : p.x, qy: q.z > 60 ? q.y : p.y });
      }
      /* fios: grade espacial, só vizinhos */
      if (linkA > 0.01) {
        const grid = new Map(), cols = Math.ceil(R.W / LINK) + 3;
        pts.forEach((p, i) => {
          const k = (Math.floor(p.y / LINK) + 1) * cols + Math.floor(p.x / LINK) + 1;
          let a = grid.get(k); if (!a) grid.set(k, (a = [])); a.push(i);
        });
        ctx.lineWidth = 1;
        for (let i = 0; i < pts.length; i++) {
          const a = pts[i], gx = Math.floor(a.x / LINK) + 1, gy = Math.floor(a.y / LINK) + 1;
          for (let oy = 0; oy <= 1; oy++) for (let ox = oy ? -1 : 0; ox <= 1; ox++) {
            const bucket = grid.get((gy + oy) * cols + gx + ox);
            if (!bucket) continue;
            for (const j of bucket) {
              if (j <= i) continue;
              const b = pts[j], d = Math.hypot(b.x - a.x, b.y - a.y);
              if (d > LINK) continue;
              const k = 1 - d / LINK;
              ctx.strokeStyle = 'rgba(143,175,203,' + (k * k * 0.22 * linkA).toFixed(3) + ')';
              ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke();
            }
          }
        }
      }
      /* nós (ou riscos, quando a câmera corre) */
      for (const p of pts) {
        const s = p.s, dx = p.x - p.qx, dy = p.y - p.qy, len = Math.hypot(dx, dy);
        const a = s.a * (s.hub ? 1 : 0.75) * alpha, rr = s.hub ? s.r * 1.9 : s.r;
        if (len > 1.5) {
          ctx.strokeStyle = 'rgba(190,210,230,' + clamp(a * (1.4 * rr / (len * 0.25 + rr))).toFixed(3) + ')';
          ctx.lineWidth = rr * 1.4; ctx.lineCap = 'round';
          ctx.beginPath(); ctx.moveTo(p.qx, p.qy); ctx.lineTo(p.x, p.y); ctx.stroke();
          ctx.lineCap = 'butt';
        } else {
          ctx.fillStyle = 'rgba(143,175,203,' + a.toFixed(3) + ')';
          ctx.beginPath(); ctx.arc(p.x, p.y, rr, 0, TAU); ctx.fill();
          if (s.hub) {
            ctx.strokeStyle = 'rgba(143,175,203,' + (a * 0.3).toFixed(3) + ')'; ctx.lineWidth = 1;
            ctx.beginPath(); ctx.arc(p.x, p.y, s.r * 4.4, 0, TAU); ctx.stroke();
          }
        }
      }
    },
    drawDust(ctx, cam, cam0, alpha) {
      if (alpha <= 0.002) return;
      ctx.lineCap = 'round';
      for (const d of dust) {
        const p = cam.project(d.x, d.y, d.z);
        if (p.z < 30 || p.x < -200 || p.x > R.W + 200 || p.y < -200 || p.y > R.H + 200) continue;
        const q = cam0.project(d.x, d.y, d.z);
        const rr = clamp(d.r * p.s, 0.4, 7);
        const fade = clamp(p.z / 400) * clamp((5200 - p.z) / 2600);
        const a = d.a * alpha * fade;
        if (a < 0.004) continue;
        const qx = q.z > 30 ? q.x : p.x, qy = q.z > 30 ? q.y : p.y, len = Math.hypot(p.x - qx, p.y - qy);
        ctx.strokeStyle = 'rgba(200,220,236,' + clamp(a * (2 * rr / (len * 0.3 + 2 * rr))).toFixed(3) + ')';
        ctx.lineWidth = rr * 1.6;
        ctx.beginPath(); ctx.moveTo(qx, qy); ctx.lineTo(p.x + 0.01, p.y); ctx.stroke();
      }
      ctx.lineCap = 'butt';
    },
  };

  /* ---------- corpos ----------
     Disco chapado com fase correta: a parte iluminada é meio disco + meia
     elipse de semi-eixo r·cos(α), orientada para a direção do sol. É o
     jeito "sharp" do site (sem verniz 3D), mas fisicamente coerente. */
  R.body = function (ctx, cam, pos, rad, cols, sunPos, o = {}) {
    const p = cam.project(pos[0], pos[1], pos[2]);
    if (p.z < 5) return null;
    const r = rad * p.s * (o.scale == null ? 1 : o.scale);
    if (r < 0.25) return p;
    const L = norm([sunPos[0] - pos[0], sunPos[1] - pos[1], sunPos[2] - pos[2]]);
    const V = norm([cam.pos[0] - pos[0], cam.pos[1] - pos[1], cam.pos[2] - pos[2]]);
    const cosA = clamp(L[0] * V[0] + L[1] * V[1] + L[2] * V[2], -1, 1);
    let lx = L[0] * cam.r[0] + L[1] * cam.r[1] + L[2] * cam.r[2];
    let ly = -(L[0] * cam.u[0] + L[1] * cam.u[1] + L[2] * cam.u[2]);
    const ll = Math.hypot(lx, ly) || 1; lx /= ll; ly /= ll;
    const rot = Math.atan2(ly, lx);
    ctx.save();
    ctx.globalAlpha *= o.alpha == null ? 1 : o.alpha;
    ctx.translate(p.x, p.y);
    /* lado escuro */
    ctx.fillStyle = cols[2];
    ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    /* lado iluminado */
    ctx.rotate(rot);
    const g = ctx.createLinearGradient(r, 0, -r, 0);
    const lit = o.dim ? R.mixHex(cols[0], cols[1], o.dim) : cols[0];
    g.addColorStop(0, lit); g.addColorStop(0.5, lit); g.addColorStop(1, cols[1]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, -Math.PI / 2, Math.PI / 2, false);
    const rx = Math.max(0.001, r * Math.abs(cosA));
    if (cosA >= 0) ctx.ellipse(0, 0, rx, r, 0, Math.PI / 2, (3 * Math.PI) / 2, false);
    else ctx.ellipse(0, 0, rx, r, 0, Math.PI / 2, -Math.PI / 2, true);
    ctx.fill();
    /* escurecimento de borda, bem contido: volume sem verniz */
    if (r > 6) {
      const lg = ctx.createRadialGradient(r * 0.32, -r * 0.12, r * 0.05, 0, 0, r);
      lg.addColorStop(0, 'rgba(255,255,255,' + (0.09 * (1 - (o.dim || 0) * 2)).toFixed(3) + ')');
      lg.addColorStop(0.62, 'rgba(0,0,0,0)');
      lg.addColorStop(1, 'rgba(4,6,12,.24)');
      ctx.fillStyle = lg;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.fill();
    }
    ctx.rotate(-rot);
    /* latitudes, recortadas no disco (o zoom do site) */
    if (o.lat && r > 30) {
      ctx.save();
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.clip();
      ctx.strokeStyle = 'rgba(255,255,255,' + (0.22 * o.lat).toFixed(3) + ')'; ctx.lineWidth = Math.max(1, r / 220);
      for (const k of [-0.56, -0.28, 0, 0.28, 0.56]) {
        const yy = k * r + (o.latShift || 0) * r;
        ctx.beginPath(); ctx.moveTo(-r, yy); ctx.lineTo(r, yy); ctx.stroke();
      }
      ctx.restore();
    }
    /* borda: fio escuro por dentro + halo de acento */
    ctx.strokeStyle = 'rgba(0,0,0,.25)'; ctx.lineWidth = 1;
    if (r > 2) { ctx.beginPath(); ctx.arc(0, 0, r - 0.5, 0, TAU); ctx.stroke(); }
    if (o.halo > 0) {
      ctx.strokeStyle = R.rgba(cols[0], 0.6 * o.halo); ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, r * (1.45 + (1 - o.halo) * 0.9), 0, TAU); ctx.stroke();
    }
    ctx.restore();
    p.r = r;
    return p;
  };

  /* ---------- geometria do sistema ---------- */
  R.ORBIT = 1000;
  R.orbitR = k => R.ORBIT * R.PROJECTS[k].f;
  R.bodyR = k => R.PROJECTS[k].r * 2.7;
  R.SUN_R = 62;
  /* anel inclinado de um corpo (FiscalBot): pontos 3D em volta do centro */
  R.ringPts = function (c, rr, n = 96) {
    const tilt = R.deg(24), out = [];
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * TAU;
      const x = Math.cos(a) * rr, z = Math.sin(a) * rr;
      out.push([c[0] + x * Math.cos(tilt), c[1] - x * Math.sin(tilt), c[2] + z]);
    }
    return out;
  };
})();
