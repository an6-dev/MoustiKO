'use strict';
(() => {
  const C = CONFIG;
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  canvas.width = C.W;
  canvas.height = C.H;

  const $ = (id) => document.getElementById(id);
  const stage = $('stage');
  const menuEl = $('menu');
  const overlayEl = $('overlay');

  // ---------- Utilitaires ----------
  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const rand = (a, b) => a + Math.random() * (b - a);
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const TAU = Math.PI * 2;
  function lerpAngle(a, b, t) {
    const d = ((((b - a + Math.PI) % TAU) + TAU) % TAU) - Math.PI;
    return a + d * t;
  }
  function circleRect(cx, cy, r, rc) {
    const nx = clamp(cx, rc.x, rc.x + rc.w);
    const ny = clamp(cy, rc.y, rc.y + rc.h);
    const dx = cx - nx, dy = cy - ny;
    return dx * dx + dy * dy < r * r;
  }

  // ---------- Images ----------
  const IMG = {};
  function loadImages() {
    const names = new Set(['moustique', 'humain', 'mains-ouvertes', 'mains-clap', 'eau']);
    ROOMS.forEach((r) => [...r.furniture, ...r.deco].forEach((f) => names.add(f.img)));
    return Promise.all([...names].map((n) => new Promise((res) => {
      const im = new Image();
      im.onload = res;
      im.onerror = () => { console.warn('Image manquante : img/' + n + '.svg'); res(); };
      im.src = 'img/' + n + '.svg';
      IMG[n] = im;
    })));
  }
  function drawImg(name, x, y, w, h) {
    const im = IMG[name];
    if (im && im.complete && im.naturalWidth) ctx.drawImage(im, x, y, w, h);
    else { ctx.fillStyle = '#f0f'; ctx.fillRect(x, y, w, h); }
  }

  // ---------- État ----------
  let state = 'loading';          // loading | menu | intro | play | paused | roundEnd
  let room = null, roomIndex = 0, floorCanvas = null;
  let mos, hum, hands;
  let popups = [], splats = [];
  let time = 0, introT = 0;
  const score = { moustique: 0, humain: 0 };
  const keys = {};
  const mouse = { x: C.W / 2, y: C.H / 2 };

  function setState(s) {
    state = s;
    stage.classList.toggle('playing', s === 'play');
  }

  // ---------- Sol et murs (pré-rendus une fois par pièce) ----------
  function buildFloor(r) {
    const c = document.createElement('canvas');
    c.width = C.W;
    c.height = C.H;
    const g = c.getContext('2d');
    let seed = r.seed || 1;
    const rnd = () => (seed = (seed * 16807) % 2147483647) / 2147483647;

    if (r.floor === 'parquet') {
      g.fillStyle = '#5e3a20';
      g.fillRect(0, 0, C.W, C.H);
      const ph = 32;
      for (let y = 0; y < C.H; y += ph) {
        let x = -rnd() * 200;
        while (x < C.W) {
          const w = 110 + rnd() * 170;
          g.fillStyle = `hsl(${26 + rnd() * 6}, ${42 + rnd() * 10}%, ${44 + rnd() * 12}%)`;
          g.fillRect(x + 1, y + 1, w - 2, ph - 2);
          g.strokeStyle = 'rgba(60, 30, 10, 0.14)';
          g.lineWidth = 1;
          for (let k = 0; k < 3; k++) {
            const yy = y + 5 + rnd() * (ph - 10);
            g.beginPath();
            g.moveTo(x + 4, yy);
            g.bezierCurveTo(x + w * 0.3, yy + rnd() * 4 - 2, x + w * 0.7, yy + rnd() * 4 - 2, x + w - 4, yy);
            g.stroke();
          }
          x += w;
        }
      }
    } else if (r.floor === 'moquette') {
      g.fillStyle = '#b3a288';
      g.fillRect(0, 0, C.W, C.H);
      for (let i = 0; i < 12000; i++) {
        g.fillStyle = rnd() < 0.5 ? 'rgba(255,255,255,0.07)' : 'rgba(60,40,20,0.09)';
        g.fillRect(rnd() * C.W, rnd() * C.H, 2, 2);
      }
    } else {
      const t = 64;
      g.fillStyle = '#a9b8c2';
      g.fillRect(0, 0, C.W, C.H);
      for (let y = 0; y < C.H; y += t) {
        for (let x = 0; x < C.W; x += t) {
          g.fillStyle = `hsl(200, 25%, ${86 + rnd() * 6}%)`;
          g.fillRect(x + 1.5, y + 1.5, t - 3, t - 3);
        }
      }
    }

    // Lumière des fenêtres
    (r.windows || []).forEach((w) => {
      const cx = (w.from + w.to) / 2;
      const gr = g.createRadialGradient(cx, C.WALL, 10, cx, C.WALL, (w.to - w.from) * 1.4);
      gr.addColorStop(0, 'rgba(255, 245, 210, 0.3)');
      gr.addColorStop(1, 'rgba(255, 245, 210, 0)');
      g.fillStyle = gr;
      g.fillRect(0, 0, C.W, C.H);
    });

    // Murs
    const W = C.WALL;
    g.fillStyle = '#3f332c';
    g.fillRect(0, 0, C.W, W);
    g.fillRect(0, C.H - W, C.W, W);
    g.fillRect(0, 0, W, C.H);
    g.fillRect(C.W - W, 0, W, C.H);
    g.strokeStyle = '#e9dfd0';
    g.lineWidth = 3;
    g.strokeRect(W - 1.5, W - 1.5, C.W - 2 * W + 3, C.H - 2 * W + 3);
    (r.windows || []).forEach((w) => {
      g.fillStyle = '#a8dcf5';
      g.fillRect(w.from, 7, w.to - w.from, W - 14);
      g.strokeStyle = '#f4fbff';
      g.lineWidth = 3;
      g.strokeRect(w.from, 7, w.to - w.from, W - 14);
      g.beginPath();
      g.moveTo((w.from + w.to) / 2, 7);
      g.lineTo((w.from + w.to) / 2, W - 7);
      g.stroke();
    });
    if (r.door) {
      g.fillStyle = '#8a5a36';
      g.fillRect(r.door.from, C.H - W + 3, r.door.to - r.door.from, W - 6);
      g.fillStyle = '#e6c469';
      g.beginPath();
      g.arc(r.door.to - 12, C.H - W / 2, 3.5, 0, TAU);
      g.fill();
    }
    return c;
  }

  // ---------- Mise en place d'une pièce ----------
  function resetRoom(i) {
    roomIndex = i;
    room = ROOMS[i];
    floorCanvas = buildFloor(room);
    const d = room.difficulty;
    const s = room.humanStart;
    hum = {
      x: s.x, y: s.y, vx: 0, vy: 0, angle: 0, walk: 0,
      target: null, wanderT: 0, stuckT: 0, lastX: s.x, lastY: s.y, itch: 0,
      reach: d.reach, speed: d.speed, cooldownMax: d.cooldown,
    };
    hands = { x: s.x, y: s.y - 80, angle: 0, cooldown: 0, cdTotal: 1, clap: 0 };
    mos = {
      x: room.water.x, y: room.water.y, vx: 0, vy: 0, angle: 0,
      alive: true, respawn: 0, invuln: C.mosquito.invulnTime,
      blood: 0, hearts: 0, eggs: C.startEggs,
      action: null, progress: 0, attach: null, hidden: false,
    };
    popups = [];
    splats = [];
    updateHud(true);
  }

  function startRoom(i) {
    sfx.init();
    resetRoom(i);
    menuEl.classList.add('hidden');
    introT = 3;
    setState('intro');
    showOverlay(`
      <h2>${room.bonus ? '★ Bonus — ' : `Niveau ${i + 1} — `}${room.name}</h2>
      <p class="subtitle">${room.tagline}</p>
      <div class="count">3</div>`);
  }

  function showOverlay(html) {
    overlayEl.innerHTML = html;
    overlayEl.classList.remove('hidden');
  }
  function hideOverlay() { overlayEl.classList.add('hidden'); }

  function showMenu() {
    hideOverlay();
    menuEl.classList.remove('hidden');
    setState('menu');
    sfx.buzz(0, 600);
  }

  // ---------- Moustique ----------
  function inShadow(x, y) {
    return room.shadows.some((s) => {
      const dx = (x - s.cx) / s.rx, dy = (y - s.cy) / s.ry;
      return dx * dx + dy * dy < 0.49;
    });
  }

  function updateMosquito(dt) {
    const M = C.mosquito;
    if (!mos.alive) {
      mos.respawn -= dt;
      if (mos.respawn <= 0) respawnMosquito();
      return;
    }
    if (mos.invuln > 0) mos.invuln -= dt;
    mos.hidden = inShadow(mos.x, mos.y);

    let acting = false;
    if (keys.Space) {
      if (mos.action === 'sting') {
        mos.x = hum.x + mos.attach.x;
        mos.y = hum.y + mos.attach.y;
        mos.hidden = inShadow(mos.x, mos.y);
        if (mos.hidden) {
          mos.action = null;
          mos.progress = 0;
        } else {
          acting = true;
          mos.progress += dt / M.stingTime;
          if (mos.progress >= 1) completeSting();
        }
      } else if (mos.action === 'lay') {
        acting = true;
        mos.progress += dt / M.layTime;
        if (mos.progress >= 1) completeLay();
      } else if (!mos.hidden && mos.blood < 1 && dist(mos, hum) < C.human.bodyRadius) {
        mos.action = 'sting';
        mos.progress = 0;
        mos.attach = { x: mos.x - hum.x, y: mos.y - hum.y };
        acting = true;
      } else if (mos.blood >= 1 && dist(mos, room.water) < room.water.r + 16) {
        mos.action = 'lay';
        mos.progress = 0;
        acting = true;
      }
    } else {
      mos.action = null;
      mos.progress = 0;
    }

    if (acting) {
      mos.vx = 0;
      mos.vy = 0;
    } else {
      let ax = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
      let ay = (keys.ArrowDown ? 1 : 0) - (keys.ArrowUp ? 1 : 0);
      const l = Math.hypot(ax, ay);
      if (l) { ax /= l; ay /= l; }
      mos.vx += ax * M.accel * dt;
      mos.vy += ay * M.accel * dt;
      const damp = Math.exp(-M.friction * dt);
      mos.vx *= damp;
      mos.vy *= damp;
      const sp = Math.hypot(mos.vx, mos.vy);
      if (sp > M.speed) { mos.vx *= M.speed / sp; mos.vy *= M.speed / sp; }
      mos.x += mos.vx * dt;
      mos.y += mos.vy * dt;
      if (sp > 20) mos.angle = lerpAngle(mos.angle, Math.atan2(mos.vy, mos.vx) + Math.PI / 2, 1 - Math.exp(-12 * dt));
    }
    const m = C.WALL + M.radius;
    mos.x = clamp(mos.x, m, C.W - m);
    mos.y = clamp(mos.y, m, C.H - m);
  }

  function completeSting() {
    mos.blood = 1;
    mos.action = null;
    mos.progress = 0;
    hum.itch = C.human.itchTime;
    hum.target = null;
    popup(hum.x, hum.y - 50, 'Aïe ! Ça gratte !', '#ff6b7a', 24);
    popup(mos.x, mos.y - 20, '+ sang', '#ff3b4e', 18);
    sfx.aie();
  }

  function completeLay() {
    mos.blood = 0;
    mos.action = null;
    mos.progress = 0;
    mos.hearts++;
    mos.eggs++;
    popup(room.water.x, room.water.y - 40, '+1 ❤  +1 œuf', '#ffd23f', 24);
    sfx.lay();
    if (mos.hearts >= C.heartsToWin) endRound('moustique');
  }

  function killMosquito() {
    mos.alive = false;
    splats.push({
      x: mos.x, y: mos.y, t: 0, blood: mos.blood >= 1,
      blobs: Array.from({ length: 8 }, () => ({ dx: rand(-9, 9), dy: rand(-9, 9), r: rand(2, 6) })),
    });
    popup(mos.x, mos.y - 30, 'SPLAT !', '#fff', 32);
    sfx.splat();
    mos.blood = 0;
    mos.action = null;
    mos.progress = 0;
    if (mos.eggs > 0) {
      mos.eggs--;
      mos.respawn = C.mosquito.respawnDelay;
    } else {
      endRound('humain');
    }
  }

  function respawnMosquito() {
    Object.assign(mos, {
      alive: true, x: room.water.x, y: room.water.y, vx: 0, vy: 0,
      invuln: C.mosquito.invulnTime,
    });
    popup(room.water.x, room.water.y - 36, 'Un œuf éclot !', '#9be7ff', 20);
    sfx.hatch();
  }

  // ---------- Humain ----------
  function humanBlocked(x, y, r = C.human.radius) {
    if (x - r < C.WALL || x + r > C.W - C.WALL || y - r < C.WALL || y + r > C.H - C.WALL) return true;
    return room.furniture.some((f) => circleRect(x, y, r, f));
  }

  function randomWalkable() {
    for (let i = 0; i < 40; i++) {
      const x = rand(C.WALL + 40, C.W - C.WALL - 40);
      const y = rand(C.WALL + 40, C.H - C.WALL - 40);
      if (!humanBlocked(x, y, C.human.radius + 8)) return { x, y };
    }
    return { x: hum.x, y: hum.y };
  }

  function updateHuman(dt) {
    hum.wanderT -= dt;
    if (!hum.target || hum.wanderT <= 0 || dist(hum, hum.target) < 20) {
      hum.target = randomWalkable();
      hum.wanderT = rand(2.5, 5.5);
    }
    let tx = hum.target.x - hum.x, ty = hum.target.y - hum.y;
    const tl = Math.hypot(tx, ty) || 1;
    tx /= tl; ty /= tl;

    // Attraction vers la souris (plus forte quand elle est loin du cercle)
    const mdx = mouse.x - hum.x, mdy = mouse.y - hum.y;
    const md = Math.hypot(mdx, mdy) || 1;
    const pull = clamp((md - hum.reach * 0.5) / 300, 0, 1) * C.human.attraction;
    let dx = tx * 0.7 + (mdx / md) * pull;
    let dy = ty * 0.7 + (mdy / md) * pull;
    const dl = Math.hypot(dx, dy) || 1;
    dx /= dl; dy /= dl;

    const sp = hum.speed * (hum.itch > 0 ? 1.6 : 1);
    const k = 1 - Math.exp(-4 * dt);
    hum.vx += (dx * sp - hum.vx) * k;
    hum.vy += (dy * sp - hum.vy) * k;

    const nx = hum.x + hum.vx * dt;
    if (!humanBlocked(nx, hum.y)) hum.x = nx;
    else { hum.vx *= -0.2; hum.wanderT = Math.min(hum.wanderT, 0.4); }
    const ny = hum.y + hum.vy * dt;
    if (!humanBlocked(hum.x, ny)) hum.y = ny;
    else { hum.vy *= -0.2; hum.wanderT = Math.min(hum.wanderT, 0.4); }

    hum.stuckT += dt;
    if (hum.stuckT > 1) {
      if (Math.hypot(hum.x - hum.lastX, hum.y - hum.lastY) < 8) hum.target = randomWalkable();
      hum.stuckT = 0;
      hum.lastX = hum.x;
      hum.lastY = hum.y;
    }

    const speed = Math.hypot(hum.vx, hum.vy);
    if (speed > 5) hum.angle = lerpAngle(hum.angle, Math.atan2(hum.vy, hum.vx) + Math.PI / 2, 1 - Math.exp(-6 * dt));
    hum.walk += speed * dt;
    if (hum.itch > 0) hum.itch -= dt;

    // Les mains suivent la souris, limitées au cercle
    const k2 = md > hum.reach ? hum.reach / md : 1;
    hands.x = hum.x + mdx * k2;
    hands.y = hum.y + mdy * k2;
    if (md > 20) hands.angle = lerpAngle(hands.angle, Math.atan2(mdy, mdx) + Math.PI / 2, 1 - Math.exp(-15 * dt));
    if (hands.cooldown > 0) hands.cooldown = Math.max(0, hands.cooldown - dt);
    if (hands.clap > 0) hands.clap -= dt;
  }

  function clap() {
    if (hands.cooldown > 0) return;
    hands.clap = 0.18;
    hands.cooldown = hum.cooldownMax;
    sfx.clap();
    const hit = mos.alive && !mos.hidden && mos.invuln <= 0 &&
      dist(hands, mos) < C.human.handRadius + C.mosquito.radius;
    if (hit) {
      killMosquito();
    } else {
      hands.cooldown += C.human.missPenalty;
      if (dist(hands, hum) < C.human.bodyRadius) popup(hands.x, hands.y - 40, 'Aïe… raté !', '#fff', 18);
      else popup(hands.x, hands.y - 40, 'Raté !', '#ddd', 16);
    }
    hands.cdTotal = hands.cooldown;
  }

  // ---------- Fin de manche ----------
  function endRound(winner) {
    setState('roundEnd');
    score[winner]++;
    sfx.buzz(0, 600);
    sfx.win();
    updateHud(true);
    const last = roomIndex === ROOMS.length - 1;
    const next = last ? 'Recommencer au Salon ↺' : `Pièce suivante : ${ROOMS[roomIndex + 1].name} →`;
    const title = winner === 'moustique' ? '🦟 Le moustique tigre gagne !' : '👋 L\'humain gagne !';
    const sub = winner === 'moustique'
      ? `${C.heartsToWin} cœurs récoltés : ${room.name.toLowerCase()} est envahi${room.id === 'chambre' || room.id === 'sdb' ? 'e' : ''} !`
      : 'Plus aucun œuf : la lignée des moustiques est éteinte.';
    const nextBtn = `<button data-act="next" class="${winner === 'moustique' ? 'primary' : ''}">${next}</button>`;
    const retryBtn = `<button data-act="retry" class="${winner === 'humain' ? 'primary' : ''}">Rejouer la pièce</button>`;
    showOverlay(`
      <h2>${title}</h2>
      <p class="subtitle">${sub}</p>
      <p class="score-line">Manches — 🦟 Moustique <b>${score.moustique}</b> : <b>${score.humain}</b> Humain ✋</p>
      <p class="tip">Astuce : échangez vos places pour la prochaine manche !</p>
      <div class="btns">${winner === 'moustique' ? nextBtn + retryBtn : retryBtn + nextBtn}<button data-act="menu">Menu</button></div>`);
  }

  function togglePause() {
    if (state === 'play') {
      setState('paused');
      sfx.buzz(0, 600);
      showOverlay(`<h2>⏸ Pause</h2>
        <div class="btns"><button class="primary" data-act="resume">Reprendre</button><button data-act="menu">Menu</button></div>
        <p class="hint"><kbd>P</kbd> ou <kbd>Échap</kbd> pour reprendre</p>`);
    } else if (state === 'paused') {
      hideOverlay();
      setState('play');
    }
  }

  // ---------- Effets ----------
  function popup(x, y, text, color = '#fff', size = 22) {
    popups.push({ x, y, text, color, size, t: 0 });
  }

  // ---------- HUD ----------
  const hudCache = {};
  function updateHud(force) {
    if (!mos) return;
    if (force || hudCache.hearts !== mos.hearts) {
      hudCache.hearts = mos.hearts;
      $('hearts').innerHTML = Array.from({ length: C.heartsToWin }, (_, i) =>
        `<img src="img/coeur.svg" class="${i < mos.hearts ? 'on' : 'off'}" alt="">`).join('');
    }
    if (force || hudCache.eggs !== mos.eggs) { hudCache.eggs = mos.eggs; $('eggs').textContent = mos.eggs; }
    const roomLabel = room.name + (sfx.muted ? ' 🔇' : '');
    if (force || hudCache.room !== roomLabel) { hudCache.room = roomLabel; $('roomName').textContent = roomLabel; }
    if (force) $('score').textContent = `🦟 ${score.moustique} : ${score.humain} ✋`;

    let bar = mos.blood;
    if (mos.action === 'sting') bar = mos.progress;
    else if (mos.action === 'lay') bar = 1 - mos.progress;
    $('bloodBar').style.width = (bar * 100).toFixed(1) + '%';

    let ms;
    if (!mos.alive) ms = state === 'play' ? 'Éclosion…' : 'Écrasé !';
    else if (mos.action === 'sting') ms = 'Piqûre en cours…';
    else if (mos.action === 'lay') ms = 'Ponte en cours…';
    else if (mos.hidden) ms = "Caché dans l'ombre";
    else if (mos.blood >= 1) ms = "Plein ! Va pondre 💧";
    else ms = "Pique l'humain !";
    if (hudCache.ms !== ms) { hudCache.ms = ms; $('mosStatus').textContent = ms; }

    const hs = hands.cooldown > 0 ? 'Recharge…' : 'Prêt à claquer !';
    if (hudCache.hs !== hs) { hudCache.hs = hs; $('humStatus').textContent = hs; }
    $('cdBar').style.width = ((1 - hands.cooldown / hands.cdTotal) * 100).toFixed(1) + '%';
  }

  // ---------- Rendu ----------
  function drawFurniture(f) {
    const rot = f.rot || 0;
    const side = rot === 90 || rot === 270;
    const sw = side ? f.h : f.w;
    const sh = side ? f.w : f.h;
    ctx.save();
    ctx.translate(f.x + f.w / 2, f.y + f.h / 2);
    ctx.rotate((rot * Math.PI) / 180);
    drawImg(f.img, -sw / 2, -sh / 2, sw, sh);
    ctx.restore();
  }

  function drawShadows() {
    ctx.save();
    ctx.beginPath();
    ctx.rect(C.WALL, C.WALL, C.W - 2 * C.WALL, C.H - 2 * C.WALL);
    ctx.clip();
    room.shadows.forEach((s) => {
      ctx.save();
      ctx.translate(s.cx, s.cy);
      ctx.scale(s.rx, s.ry);
      const gr = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      gr.addColorStop(0, 'rgba(5, 4, 14, 0.9)');
      gr.addColorStop(0.6, 'rgba(5, 4, 14, 0.78)');
      gr.addColorStop(1, 'rgba(5, 4, 14, 0)');
      ctx.fillStyle = gr;
      ctx.beginPath();
      ctx.arc(0, 0, 1, 0, TAU);
      ctx.fill();
      ctx.restore();
    });
    ctx.restore();
  }

  function drawWater() {
    const w = room.water;
    const pulse = (time * 0.8) % 1;
    const full = mos.alive && mos.blood >= 1;
    ctx.lineWidth = full ? 3 : 2;
    ctx.strokeStyle = full ? `rgba(255, 215, 90, ${1 - pulse})` : `rgba(160, 225, 255, ${0.5 * (1 - pulse)})`;
    ctx.beginPath();
    ctx.arc(w.x, w.y, w.r + 4 + pulse * (full ? 24 : 12), 0, TAU);
    ctx.stroke();
    if (w.img !== null) drawImg(w.img || 'eau', w.x - w.r * 1.3, w.y - w.r * 1.3, w.r * 2.6, w.r * 2.6);

    // Œufs pondus au bord de l'eau
    const n = Math.min(mos.eggs, 14);
    for (let i = 0; i < n; i++) {
      const a = -Math.PI / 2 + i * 0.62;
      const rr = w.r * 0.8 + (i % 2) * 3;
      ctx.save();
      ctx.translate(w.x + Math.cos(a) * rr, w.y + Math.sin(a) * rr);
      ctx.rotate(a);
      ctx.fillStyle = '#1e1e1e';
      ctx.strokeStyle = '#f1e9d0';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 2.4, 4, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.restore();
    }
  }

  function drawSplats() {
    splats.forEach((s) => {
      const a = clamp(1 - (s.t - 8) / 3, 0, 1);
      if (a <= 0) return;
      ctx.globalAlpha = a;
      ctx.fillStyle = s.blood ? '#9b0f1c' : '#1b1b1b';
      s.blobs.forEach((b) => {
        ctx.beginPath();
        ctx.arc(s.x + b.dx, s.y + b.dy, b.r, 0, TAU);
        ctx.fill();
      });
      ctx.strokeStyle = '#111';
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      for (let i = 0; i < 6; i++) {
        const a2 = i * 1.05 + 0.3;
        ctx.moveTo(s.x, s.y);
        ctx.lineTo(s.x + Math.cos(a2) * 14, s.y + Math.sin(a2) * 14);
      }
      ctx.stroke();
      ctx.globalAlpha = 1;
    });
  }

  function drawHuman() {
    ctx.save();
    ctx.translate(hum.x, hum.y);
    ctx.fillStyle = 'rgba(0, 0, 0, 0.25)';
    ctx.beginPath();
    ctx.ellipse(4, 6, 44, 28, hum.angle, 0, TAU);
    ctx.fill();
    ctx.rotate(hum.angle);
    const bob = 1 + Math.sin(hum.walk * 0.12) * 0.025;
    ctx.scale(bob, bob);
    if (hum.itch > 0) ctx.rotate(Math.sin(time * 40) * 0.08);
    drawImg('humain', -46, -34, 92, 59);
    ctx.restore();
  }

  function drawMosquito() {
    if (!mos.alive) return;
    let alpha = mos.hidden ? 0.16 : 1;
    if (mos.invuln > 0 && Math.floor(time * 12) % 2 === 0) alpha *= 0.35;
    const acting = !!mos.action;
    const jx = acting ? 0 : Math.sin(time * 37) * 1.3;
    const jy = acting ? 0 : Math.cos(time * 29) * 1.3;

    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.translate(mos.x + jx, mos.y + jy);
    if (!acting) {
      ctx.fillStyle = 'rgba(0, 0, 0, 0.28)';
      ctx.beginPath();
      ctx.ellipse(8, 16, 7, 3, 0, 0, TAU);
      ctx.fill();
    }
    ctx.rotate(mos.angle);
    // Ailes
    ctx.fillStyle = 'rgba(225, 238, 255, 0.5)';
    ctx.strokeStyle = 'rgba(80, 90, 110, 0.5)';
    ctx.lineWidth = 0.8;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      if (acting) {
        ctx.ellipse(side * 3, 6, 3, 12, side * 0.12, 0, TAU);
      } else {
        const flap = Math.sin(time * 90) * 0.4;
        ctx.ellipse(side * 12, -1, 12, 4.5, side * (0.45 + flap), 0, TAU);
      }
      ctx.fill();
      ctx.stroke();
    }
    drawImg('moustique', -18, -21, 36, 42);
    if (mos.blood >= 1 || mos.action === 'sting') {
      const fill = mos.action === 'sting' ? mos.progress : 1;
      ctx.fillStyle = `rgba(210, 20, 35, ${0.35 + 0.55 * fill})`;
      ctx.beginPath();
      ctx.ellipse(0, 5, 3 + 1.5 * fill, 6 + 3 * fill, 0, 0, TAU);
      ctx.fill();
    }
    ctx.restore();

    if (mos.action) {
      ctx.strokeStyle = mos.action === 'sting' ? '#ff4d5a' : '#58c7ff';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(mos.x, mos.y, 20, -Math.PI / 2, -Math.PI / 2 + TAU * mos.progress);
      ctx.stroke();
    }
  }

  function drawHands() {
    // Cercle de portée
    ctx.save();
    ctx.setLineDash([8, 8]);
    ctx.lineDashOffset = -time * 10;
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(hum.x, hum.y, hum.reach, 0, TAU);
    ctx.stroke();
    ctx.restore();

    const ready = hands.cooldown <= 0;
    const clapping = hands.clap > 0;

    // Bras (des épaules jusqu'aux mains)
    const ra = hum.angle, ha = hands.angle;
    const sx = Math.cos(ra) * 36, sy = Math.sin(ra) * 36;
    const hx = Math.cos(ha) * (clapping ? 10 : 26), hy = Math.sin(ha) * (clapping ? 10 : 26);
    const bx = -Math.sin(ha) * 12, by = Math.cos(ha) * 12;   // décalage vers les poignets
    ctx.save();
    ctx.globalAlpha = ready ? 0.9 : 0.55;
    ctx.lineCap = 'round';
    for (const s of [-1, 1]) {
      const x1 = hum.x + s * sx, y1 = hum.y + s * sy;
      const x2 = hands.x + s * hx + bx, y2 = hands.y + s * hy + by;
      ctx.strokeStyle = '#a8683f';
      ctx.lineWidth = 13;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
      ctx.strokeStyle = '#e8b08a';
      ctx.lineWidth = 9;
      ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke();
    }

    // Mains
    ctx.translate(hands.x, hands.y);
    ctx.rotate(ha);
    const sc = clapping ? 1.12 : 1;
    ctx.scale(sc, sc);
    drawImg(clapping ? 'mains-clap' : 'mains-ouvertes', -60, -45, 120, 90);
    ctx.restore();

    // Viseur / recharge
    ctx.lineWidth = 2;
    if (ready) {
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.45)';
      ctx.beginPath();
      ctx.arc(hands.x, hands.y, C.human.handRadius, 0, TAU);
      ctx.stroke();
    } else {
      ctx.strokeStyle = 'rgba(255, 210, 63, 0.9)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(hands.x, hands.y, C.human.handRadius, -Math.PI / 2, -Math.PI / 2 + TAU * (1 - hands.cooldown / hands.cdTotal));
      ctx.stroke();
    }
  }

  function drawPopups() {
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    popups.forEach((p) => {
      ctx.globalAlpha = clamp(1 - p.t / 1.3, 0, 1);
      ctx.font = `bold ${p.size}px "Trebuchet MS", sans-serif`;
      const y = p.y - p.t * 40;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.strokeText(p.text, p.x, y);
      ctx.fillStyle = p.color;
      ctx.fillText(p.text, p.x, y);
    });
    ctx.globalAlpha = 1;
  }

  function render() {
    ctx.drawImage(floorCanvas, 0, 0);
    room.deco.forEach(drawFurniture);
    ctx.save();
    ctx.shadowColor = 'rgba(0, 0, 0, 0.35)';
    ctx.shadowBlur = 14;
    ctx.shadowOffsetX = 4;
    ctx.shadowOffsetY = 6;
    room.furniture.forEach(drawFurniture);
    ctx.restore();
    drawSplats();
    drawWater();
    drawHuman();
    drawShadows();
    drawMosquito();
    drawHands();
    drawPopups();
  }

  // ---------- Boucle ----------
  function update(dt) {
    time += dt;
    updateHuman(dt);
    updateMosquito(dt);
    popups.forEach((p) => (p.t += dt));
    popups = popups.filter((p) => p.t < 1.3);
    splats.forEach((s) => (s.t += dt));
    splats = splats.filter((s) => s.t < 11);

    if (state === 'play' && mos.alive) {
      const sp = Math.hypot(mos.vx, mos.vy);
      if (mos.action) sfx.buzz(0.035, 470);
      else sfx.buzz((mos.hidden ? 0.03 : 0.06) + (sp / C.mosquito.speed) * 0.06, 560 + sp * 0.5);
    } else {
      sfx.buzz(0, 600);
    }
  }

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    if (state === 'play') {
      update(dt);
    } else if (state === 'intro') {
      time += dt;
      introT -= dt;
      const count = overlayEl.querySelector('.count');
      if (count) count.textContent = introT > 0.4 ? Math.ceil(introT - 0.4) : 'GO !';
      if (introT <= 0) { hideOverlay(); setState('play'); }
    } else {
      time += dt;
    }
    if (room) {
      render();
      updateHud(false);
    }
    requestAnimationFrame(frame);
  }

  // ---------- Entrées ----------
  const GAME_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
  window.addEventListener('keydown', (e) => {
    if (GAME_KEYS.has(e.code)) e.preventDefault();
    keys[e.code] = true;
    if (e.repeat) return;
    if (e.code === 'KeyP' || e.code === 'Escape') togglePause();
    else if (e.code === 'KeyM') { sfx.init(); sfx.toggleMute(); updateHud(true); }
    else if (e.code === 'Enter' && (state === 'roundEnd' || state === 'paused')) {
      const b = overlayEl.querySelector('button.primary') || overlayEl.querySelector('button');
      if (b) b.click();
    }
  });
  window.addEventListener('keyup', (e) => { keys[e.code] = false; });
  window.addEventListener('blur', () => {
    Object.keys(keys).forEach((k) => (keys[k] = false));
    if (state === 'play') togglePause();
  });

  window.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    mouse.x = clamp(((e.clientX - r.left) / r.width) * C.W, 0, C.W);
    mouse.y = clamp(((e.clientY - r.top) / r.height) * C.H, 0, C.H);
  });
  canvas.addEventListener('mousedown', (e) => {
    if (e.button === 0 && state === 'play') { sfx.init(); clap(); }
  });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());

  overlayEl.addEventListener('click', (e) => {
    const b = e.target.closest('button');
    if (!b) return;
    b.blur();
    const act = b.dataset.act;
    if (act === 'next') startRoom((roomIndex + 1) % ROOMS.length);
    else if (act === 'retry') startRoom(roomIndex);
    else if (act === 'menu') { resetRoom(roomIndex); showMenu(); }
    else if (act === 'resume') togglePause();
  });

  $('roomChoice').innerHTML = 'Choisir la pièce : ' + ROOMS.map((r, i) =>
    `<button data-room="${i}">${r.bonus ? '★ ' : ''}${r.name}</button>`).join('');
  menuEl.addEventListener('click', (e) => {
    const b = e.target.closest('button[data-room]');
    if (!b) return;
    b.blur();
    score.moustique = 0;
    score.humain = 0;
    startRoom(Number(b.dataset.room));
  });

  // ---------- Démarrage ----------
  loadImages().then(() => {
    resetRoom(0);
    showMenu();
    requestAnimationFrame(frame);
  });
})();
