/* =========================
   Space Drift
   Cozy space game with smooth drag steering.
========================= */

const canvas = document.getElementById('space');
const ctx = canvas.getContext('2d');

const hud = document.getElementById('hud');
const scoreValue = document.getElementById('scoreValue');
const harmonyValue = document.getElementById('harmonyValue');
const zoneValue = document.getElementById('zoneValue');
const shardValue = document.getElementById('shardValue');

const startScreen = document.getElementById('startScreen');
const pauseScreen = document.getElementById('pauseScreen');
const touchZone = document.getElementById('touchZone');
const thumb = document.getElementById('thumb');
const finishBanner = document.getElementById('finishBanner');
const finishText = document.getElementById('finishText');

let W = 0;
let H = 0;
let DPR = 1;
let last = 0;
let running = false;
let paused = false;
let started = false;

const state = {
  score: 0,
  harmony: 100,
  shards: 0,
  distance: 0,
  combo: 0,
  zoneIndex: 0,
  zoneTimer: 0,
  bannerTimer: 0,
  shake: 0,
  driftTime: 0,
};

const zones = [
  {
    name: 'Dawn Drift',
    sky0: '#07101f',
    sky1: '#0b1330',
    nebula: 'rgba(130, 160, 255, 0.16)',
    accent: '#c9d7ff',
    starTint: 'rgba(255,255,255,0.88)',
  },
  {
    name: 'Moon Velvet',
    sky0: '#090e1a',
    sky1: '#13192b',
    nebula: 'rgba(188, 143, 255, 0.14)',
    accent: '#e4d0ff',
    starTint: 'rgba(236,228,255,0.90)',
  },
  {
    name: 'Aurora Bloom',
    sky0: '#05111c',
    sky1: '#082436',
    nebula: 'rgba(120, 255, 226, 0.12)',
    accent: '#b5fff1',
    starTint: 'rgba(225,255,249,0.92)',
  },
  {
    name: 'Deep Silence',
    sky0: '#04060e',
    sky1: '#080b17',
    nebula: 'rgba(255, 160, 190, 0.08)',
    accent: '#f0d7ff',
    starTint: 'rgba(255,255,255,0.86)',
  }
];

const input = {
  active: false,
  pointerId: null,
  targetX: 0.5,
  rawX: 0.5,
  touchOnly: true,
};

const ship = {
  x: 0.5,
  y: 0.78,
  vx: 0,
  glow: 0,
  tilt: 0,
};

let stars = [];
let dust = [];
let shards = [];
let comets = [];
let planets = [];
let rings = [];
let ripples = [];

let audio = null;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function easeOut(t) { return 1 - Math.pow(1 - t, 3); }
function rand(min, max) { return Math.random() * (max - min) + min; }
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function resize() {
  const rect = canvas.getBoundingClientRect();
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = Math.max(1, Math.floor(rect.width));
  H = Math.max(1, Math.floor(rect.height));
  canvas.width = Math.floor(W * DPR);
  canvas.height = Math.floor(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);

  ship.y = H * 0.75;
  if (!started) {
    ship.x = W * 0.5;
  }

  buildWorld(true);
  draw(0);
}

window.addEventListener('resize', resize, { passive: true });

function buildWorld(force = false) {
  if (force || stars.length === 0) {
    stars = Array.from({ length: 220 }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: rand(0.2, 1.0),
      tw: rand(0, Math.PI * 2),
    }));
  }

  if (force || planets.length === 0) {
    planets = [
      { x: 0.18, y: 0.18, r: 58, color: 'rgba(152, 178, 255, 0.18)', speed: 0.006 },
      { x: 0.82, y: 0.24, r: 92, color: 'rgba(180, 131, 255, 0.12)', speed: 0.004 },
      { x: 0.76, y: 0.68, r: 38, color: 'rgba(141, 246, 226, 0.10)', speed: 0.010 },
    ];
  }
}

function startAudio() {
  if (audio) return;
  const Ctx = window.AudioContext || window.webkitAudioContext;
  if (!Ctx) return;

  const ctxAudio = new Ctx();
  const master = ctxAudio.createGain();
  master.gain.value = 0.02;

  const low = ctxAudio.createOscillator();
  low.type = 'sine';
  low.frequency.value = 54;

  const mid = ctxAudio.createOscillator();
  mid.type = 'triangle';
  mid.frequency.value = 108;

  const lfo = ctxAudio.createOscillator();
  lfo.type = 'sine';
  lfo.frequency.value = 0.05;

  const lfoGain = ctxAudio.createGain();
  lfoGain.gain.value = 6;

  const lowGain = ctxAudio.createGain();
  const midGain = ctxAudio.createGain();
  lowGain.gain.value = 0.6;
  midGain.gain.value = 0.2;

  const filter = ctxAudio.createBiquadFilter();
  filter.type = 'lowpass';
  filter.frequency.value = 420;

  lfo.connect(lfoGain);
  lfoGain.connect(low.frequency);
  lfoGain.connect(mid.frequency);

  low.connect(lowGain);
  mid.connect(midGain);
  lowGain.connect(filter);
  midGain.connect(filter);
  filter.connect(master);
  master.connect(ctxAudio.destination);

  low.start();
  mid.start();
  lfo.start();

  audio = { ctxAudio, master, low, mid, filter };
}

function setAudioMood() {
  if (!audio) return;
  const energy = clamp(0.35 + state.harmony / 180, 0.26, 0.9);
  audio.master.gain.value = 0.018 + energy * 0.018;
  audio.filter.frequency.value = 280 + state.zoneIndex * 60 + state.combo * 8;
}

function makeFallbackButton(text, kind, onClick) {
  const btn = document.createElement('button');
  btn.textContent = text;
  if (kind === 'secondary') btn.className = 'secondary';
  btn.addEventListener('click', onClick);
  return btn;
}

function makeGlassButton(text, onClick, size = 26) {
  if (typeof window.Button === 'function') {
    const btn = new window.Button({
      text,
      size,
      type: 'pill',
      warp: true,
      tintOpacity: 0.28,
      onClick,
    });
    return btn.element;
  }
  const btn = makeFallbackButton(text, '', onClick);
  return btn;
}

function clearNode(node) {
  while (node.firstChild) node.removeChild(node.firstChild);
}

function buildButtons() {
  const menuButtons = document.getElementById('menuButtons');
  const pauseButtons = document.getElementById('pauseButtons');

  clearNode(menuButtons);
  clearNode(pauseButtons);

  const startBtn = makeGlassButton('Start Drift', () => {
    beginRun();
  }, 28);

  const modeBtn = makeGlassButton('Relax Mode', () => {
    beginRun(true);
  }, 24);

  menuButtons.appendChild(startBtn);
  menuButtons.appendChild(modeBtn);

  const resumeBtn = makeGlassButton('Resume', () => {
    resumeRun();
  }, 24);

  const restartBtn = makeGlassButton('Restart', () => {
    beginRun(stateRelax);
  }, 24);

  const menuBtn = makeGlassButton('Main Menu', () => {
    goMenu();
  }, 24);

  pauseButtons.appendChild(resumeBtn);
  pauseButtons.appendChild(restartBtn);
  pauseButtons.appendChild(menuBtn);
}

function beginRun(relax = true) {
  started = true;
  stateRelax = relax;

  startAudio();

  state.score = 0;
  state.harmony = relax ? 100 : 92;
  state.shards = 0;
  state.distance = 0;
  state.combo = 0;
  state.zoneIndex = 0;
  state.zoneTimer = 0;
  state.bannerTimer = 0;
  state.shake = 0;
  state.driftTime = 0;

  ship.x = W * 0.5;
  ship.vx = 0;
  ship.tilt = 0;
  ship.glow = 1;

  shards = [];
  comets = [];
  ripples = [];
  dust = [];
  stars.forEach(s => {
    s.x = Math.random();
    s.y = Math.random();
    s.z = rand(0.2, 1.0);
  });

  startScreen.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  touchZone.classList.remove('hidden');
  hud.classList.remove('hidden');
  running = true;
  paused = false;
  document.body.classList.add('running');

  if (window.innerWidth < 820) {
    touchZone.classList.add('active');
  }

  spawnField();
}

function resumeRun() {
  if (!started) {
    beginRun(true);
    return;
  }
  pauseScreen.classList.add('hidden');
  touchZone.classList.remove('hidden');
  running = true;
  paused = false;
  document.body.classList.add('running');
}

function pauseRun() {
  if (!started) return;
  running = false;
  paused = true;
  pauseScreen.classList.remove('hidden');
  touchZone.classList.add('hidden');
  document.body.classList.remove('running');
}

function goMenu() {
  running = false;
  paused = false;
  started = false;
  pauseScreen.classList.add('hidden');
  startScreen.classList.remove('hidden');
  touchZone.classList.add('hidden');
  hud.classList.add('hidden');
  finishBanner.classList.add('hidden');
  document.body.classList.remove('running');
}

function spawnField() {
  if (comets.length < 6) {
    for (let i = 0; i < 5; i++) spawnComet(true);
  }
  if (shards.length < 5) {
    for (let i = 0; i < 6; i++) spawnShard(true);
  }
  if (rings.length < 2) {
    rings.push(makeRing(rand(0.2, 0.8), rand(0.12, 0.52), rand(50, 120)));
  }
}

function makeRing(x, y, r) {
  return {
    x,
    y,
    r,
    angle: rand(0, Math.PI * 2),
    hue: rand(0.0, 1.0),
    pulse: rand(0, Math.PI * 2),
  };
}

function spawnComet(initial = false) {
  comets.push({
    x: Math.random(),
    y: initial ? rand(-0.4, 1.1) : -0.08,
    size: rand(14, 28),
    vx: rand(-0.01, 0.01),
    vy: rand(0.028, 0.07),
    spin: rand(0, Math.PI * 2),
    spinSpeed: rand(-1.2, 1.2),
    core: Math.random() > 0.65,
  });
}

function spawnShard(initial = false) {
  const orbit = rand(36, 72);
  shards.push({
    x: rand(0.08, 0.92),
    y: initial ? rand(-0.3, 1.0) : -0.06,
    r: rand(7, 12),
    vy: rand(0.03, 0.06),
    spin: rand(0, Math.PI * 2),
    orbit,
    phase: rand(0, Math.PI * 2),
    collected: false,
  });
}

function burst(x, y, count, palette, force = 1) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2);
    const s = rand(18, 68) * force;
    dust.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s * 0.8,
      life: rand(0.35, 0.9),
      r: rand(1, 3.8),
      color: pick(palette),
    });
  }
}

function addRipple(x, y, accent = 'rgba(255,255,255,0.32)') {
  ripples.push({
    x, y,
    r: 10,
    alpha: 0.65,
    accent,
  });
}

function updateHud() {
  scoreValue.textContent = Math.floor(state.score);
  harmonyValue.textContent = Math.max(0, Math.floor(state.harmony));
  shardValue.textContent = state.shards;
  zoneValue.textContent = zones[state.zoneIndex].name;
}

function maybeSwitchZone() {
  const nextIndex = Math.floor(state.distance / 1200) % zones.length;
  if (nextIndex !== state.zoneIndex) {
    state.zoneIndex = nextIndex;
    state.bannerTimer = 2.6;
    finishText.textContent = `${zones[state.zoneIndex].name} — drift mode`;
  }
}

function onCollect(x, y) {
  state.shards += 1;
  state.score += 35;
  state.combo += 1;
  state.harmony = clamp(state.harmony + 6, 0, 100);
  ship.glow = 1;
  burst(x, y, 12, ['rgba(183,255,240,0.95)', 'rgba(255,255,255,0.85)', 'rgba(211,193,255,0.9)'], 1);
  addRipple(x, y, 'rgba(183,255,240,0.26)');
  if (state.combo % 4 === 0) {
    state.bannerTimer = 2.4;
    finishText.textContent = 'Constellation line complete.';
  }
}

function onCometHit(x, y) {
  state.harmony = clamp(state.harmony - 8, 0, 100);
  state.combo = 0;
  state.score = Math.max(0, state.score - 12);
  state.shake = 0.42;
  ship.glow = 1;
  burst(x, y, 16, ['rgba(255,199,214,0.95)', 'rgba(255,255,255,0.82)', 'rgba(227,210,255,0.86)'], 1.1);
  addRipple(x, y, 'rgba(255,224,235,0.22)');
}

function pointerToWorldX(clientX) {
  const rect = canvas.getBoundingClientRect();
  return clamp((clientX - rect.left) / rect.width, 0.04, 0.96);
}

/* =========================
   Input
========================= */
function startPointer(e) {
  if (!running && !started) return;
  if (e.target.closest && e.target.closest('button')) return;
  input.active = true;
  input.pointerId = e.pointerId;
  input.rawX = pointerToWorldX(e.clientX);
  input.targetX = input.rawX;
  touchZone.classList.add('active');
  thumb.style.left = `${input.rawX * 100}%`;
  thumb.style.transform = 'translateX(-50%) scale(1.05)';
  canvas.setPointerCapture?.(e.pointerId);
}

function movePointer(e) {
  if (!input.active || input.pointerId !== e.pointerId) return;
  input.rawX = pointerToWorldX(e.clientX);
  input.targetX = input.rawX;
  thumb.style.left = `${input.rawX * 100}%`;
}

function endPointer(e) {
  if (input.pointerId !== null && e.pointerId !== input.pointerId) return;
  input.active = false;
  input.pointerId = null;
  thumb.style.transform = 'translateX(-50%) scale(1)';
  if (running) {
    touchZone.classList.add('active');
  }
}

canvas.addEventListener('pointerdown', startPointer);
window.addEventListener('pointermove', movePointer);
window.addEventListener('pointerup', endPointer);
window.addEventListener('pointercancel', endPointer);

touchZone.addEventListener('pointerdown', (e) => {
  if (!running) return;
  startPointer(e);
}, { passive: false });

touchZone.addEventListener('pointermove', movePointer, { passive: false });
touchZone.addEventListener('pointerup', endPointer, { passive: false });
touchZone.addEventListener('pointercancel', endPointer, { passive: false });

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (!started) beginRun(true);
    else if (running) pauseRun();
    else resumeRun();
  }
  if (e.code === 'Escape') {
    if (started && running) pauseRun();
    else if (paused) goMenu();
  }
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') {
    input.targetX = clamp(input.targetX - 0.06, 0.04, 0.96);
  }
  if (e.code === 'ArrowRight' || e.code === 'KeyD') {
    input.targetX = clamp(input.targetX + 0.06, 0.04, 0.96);
  }
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && started && running) {
    pauseRun();
  }
});

/* =========================
   Render helpers
========================= */
function drawBackground(dt) {
  const zone = zones[state.zoneIndex];
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, zone.sky0);
  g.addColorStop(1, zone.sky1);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // Nebula glows
  const nebulae = [
    { x: W * 0.20, y: H * 0.18, r: Math.min(W, H) * 0.46, c: zone.nebula },
    { x: W * 0.80, y: H * 0.26, r: Math.min(W, H) * 0.34, c: 'rgba(255,255,255,0.05)' },
    { x: W * 0.56, y: H * 0.04, r: Math.min(W, H) * 0.28, c: 'rgba(255,160,220,0.04)' },
  ];

  for (const n of nebulae) {
    const rg = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
    rg.addColorStop(0, n.c);
    rg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(n.x, n.y, n.r, 0, Math.PI * 2);
    ctx.fill();
  }

  // slow star drift
  for (const s of stars) {
    const x = s.x * W;
    const y = (s.y * H + state.driftTime * (22 + s.z * 36)) % (H + 8) - 4;
    const alpha = 0.2 + s.z * 0.7;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, 0.8 + s.z * 1.8, 0, Math.PI * 2);
    ctx.fill();

    // tiny sparkle
    if ((s.tw + state.driftTime * 1.1) % 6.2 < 0.03) {
      ctx.globalAlpha = 0.25;
      ctx.fillRect(x - 2, y, 4, 1);
      ctx.globalAlpha = 1;
    }
  }

  // planets
  for (const p of planets) {
    const x = p.x * W + Math.sin(state.driftTime * p.speed * 24) * 12;
    const y = p.y * H + Math.cos(state.driftTime * p.speed * 20) * 10;
    const r = p.r * (Math.min(W, H) / 980);
    const grad = ctx.createRadialGradient(x - r * 0.22, y - r * 0.22, r * 0.12, x, y, r);
    grad.addColorStop(0, p.color);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // subtle horizon haze
  const haze = ctx.createLinearGradient(0, H * 0.6, 0, H);
  haze.addColorStop(0, 'rgba(255,255,255,0)');
  haze.addColorStop(1, 'rgba(255,255,255,0.03)');
  ctx.fillStyle = haze;
  ctx.fillRect(0, H * 0.62, W, H * 0.38);
}

function drawRings() {
  for (const r of rings) {
    const x = r.x * W;
    const y = r.y * H;
    const pulse = 0.88 + Math.sin(state.driftTime * 1.6 + r.pulse) * 0.06;
    ctx.save();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = zones[state.zoneIndex].accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r.r * pulse, 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 0.08;
    ctx.beginPath();
    ctx.arc(x, y, r.r * 1.4 * pulse, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

function drawShards() {
  for (const s of shards) {
    if (s.collected) continue;
    const x = s.x * W + Math.sin(state.driftTime * 2 + s.phase) * 8;
    const y = s.y * H;
    const pulse = 0.78 + Math.sin(state.driftTime * 4 + s.phase) * 0.12;

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(s.spin + state.driftTime * 1.5);

    const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, s.r * 3.4);
    glow.addColorStop(0, 'rgba(183,255,240,0.95)');
    glow.addColorStop(1, 'rgba(183,255,240,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(0, 0, s.r * 3.4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = 'rgba(245,255,252,0.96)';
    ctx.beginPath();
    ctx.moveTo(0, -s.r * 1.5);
    ctx.lineTo(s.r * 1.1, 0);
    ctx.lineTo(0, s.r * 1.5);
    ctx.lineTo(-s.r * 1.1, 0);
    ctx.closePath();
    ctx.fill();

    ctx.globalAlpha = 0.42;
    ctx.scale(0.58, 0.58);
    ctx.beginPath();
    ctx.moveTo(0, -s.r * 1.6);
    ctx.lineTo(s.r * 1.2, 0);
    ctx.lineTo(0, s.r * 1.6);
    ctx.lineTo(-s.r * 1.2, 0);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawComets() {
  for (const c of comets) {
    const x = c.x * W;
    const y = c.y * H;
    const size = c.size * (Math.min(W, H) / 980);

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(c.spin + Math.sin(state.driftTime * 2) * 0.12);

    const trail = ctx.createLinearGradient(-size * 5, 0, size * 2, 0);
    trail.addColorStop(0, 'rgba(255,255,255,0)');
    trail.addColorStop(1, c.core ? 'rgba(255,193,209,0.32)' : 'rgba(160,190,255,0.22)');
    ctx.fillStyle = trail;
    ctx.beginPath();
    ctx.ellipse(-size * 2.0, 0, size * 2.4, size * 0.7, 0, 0, Math.PI * 2);
    ctx.fill();

    const core = ctx.createRadialGradient(0, 0, 0, 0, 0, size * 1.4);
    core.addColorStop(0, c.core ? 'rgba(255,255,255,0.98)' : 'rgba(230,246,255,0.96)');
    core.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = core;
    ctx.beginPath();
    ctx.arc(0, 0, size, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}

function drawShip() {
  const x = ship.x;
  const y = ship.y;
  const z = zones[state.zoneIndex];
  const bob = Math.sin(state.driftTime * 2.5) * 2.5;

  ctx.save();
  ctx.translate(x, y + bob);
  ctx.rotate(ship.tilt);

  const glow = ctx.createRadialGradient(0, 0, 4, 0, 0, 58);
  glow.addColorStop(0, 'rgba(183,255,240,0.34)');
  glow.addColorStop(1, 'rgba(183,255,240,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 58, 0, Math.PI * 2);
  ctx.fill();

  // main hull
  const hull = ctx.createLinearGradient(0, -28, 0, 28);
  hull.addColorStop(0, 'rgba(255,255,255,0.95)');
  hull.addColorStop(1, 'rgba(190,198,214,0.86)');
  ctx.fillStyle = hull;
  roundRect(ctx, -22, -28, 44, 56, 18);
  ctx.fill();

  // canopy
  const canopy = ctx.createLinearGradient(0, -12, 0, 12);
  canopy.addColorStop(0, 'rgba(17,24,40,0.90)');
  canopy.addColorStop(1, 'rgba(6,9,17,0.92)');
  ctx.fillStyle = canopy;
  roundRect(ctx, -10, -12, 20, 24, 10);
  ctx.fill();

  // side thrusters
  ctx.fillStyle = 'rgba(183,255,240,0.88)';
  roundRect(ctx, -28, -8, 6, 16, 3);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,220,234,0.82)';
  roundRect(ctx, 22, -8, 6, 16, 3);
  ctx.fill();

  // engine flare
  ctx.globalAlpha = 0.9;
  const flame = ctx.createLinearGradient(0, 28, 0, 60);
  flame.addColorStop(0, 'rgba(183,255,240,0.95)');
  flame.addColorStop(0.5, 'rgba(210,208,255,0.65)');
  flame.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.moveTo(-8, 28);
  ctx.lineTo(0, 54 + Math.sin(state.driftTime * 12) * 2);
  ctx.lineTo(8, 28);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawDust() {
  for (let i = dust.length - 1; i >= 0; i--) {
    const p = dust[i];
    p.life -= 0.016;
    p.x += p.vx * 0.016 / W;
    p.y += p.vy * 0.016 / H;
    p.vx *= 0.986;
    p.vy *= 0.986;
    if (p.life <= 0) {
      dust.splice(i, 1);
      continue;
    }

    const alpha = clamp(p.life, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x * W, p.y * H, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawRipples() {
  for (let i = ripples.length - 1; i >= 0; i--) {
    const r = ripples[i];
    r.r += 170 * 0.016;
    r.alpha -= 0.018;
    if (r.alpha <= 0) {
      ripples.splice(i, 1);
      continue;
    }
    ctx.globalAlpha = r.alpha;
    ctx.strokeStyle = r.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(r.x * W, r.y * H, r.r, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
}

function roundRect(c, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rr, y);
  c.arcTo(x + w, y, x + w, y + h, rr);
  c.arcTo(x + w, y + h, x, y + h, rr);
  c.arcTo(x, y + h, x, y, rr);
  c.arcTo(x, y, x + w, y, rr);
  c.closePath();
}

function drawControls() {
  if (!running) return;
  const x = input.targetX * W;
  thumb.style.left = `${input.targetX * 100}%`;
}

/* =========================
   Update
========================= */
let stateRelax = true;

function update(dt) {
  if (!running) return;

  state.driftTime += dt;
  state.zoneTimer += dt;
  state.distance += dt * 22;
  state.score += dt * (12 + state.combo * 0.5);
  state.harmony = clamp(state.harmony + dt * (stateRelax ? 0.65 : 0.18), 0, 100);
  ship.glow = Math.max(0, ship.glow - dt * 1.8);
  state.bannerTimer = Math.max(0, state.bannerTimer - dt);

  if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);

  maybeSwitchZone();
  setAudioMood();

  // ship movement
  const target = input.active ? input.targetX : input.targetX;
  ship.x = lerp(ship.x, target * W, 1 - Math.pow(0.0008, dt));
  ship.vx = (target * W - ship.x);

  ship.tilt = clamp(ship.vx / 300, -0.26, 0.26);

  // Keep ship comfortably within the view
  ship.x = clamp(ship.x, 40, W - 40);
  ship.y = H * 0.77;

  // spawn rules
  if (Math.random() < 0.03) spawnComet();
  if (Math.random() < 0.025) spawnShard();
  if (Math.random() < 0.008) rings.push(makeRing(rand(0.15, 0.85), rand(0.10, 0.56), rand(34, 108)));

  // cull / move comets
  for (let i = comets.length - 1; i >= 0; i--) {
    const c = comets[i];
    c.y += c.vy * dt * 16;
    c.x += c.vx * dt * 8;
    c.spin += c.spinSpeed * dt;
    if (c.y > 1.2 || c.x < -0.2 || c.x > 1.2) {
      comets.splice(i, 1);
      spawnComet();
      continue;
    }

    const wx = c.x * W;
    const wy = c.y * H;
    const size = c.size;

    // soft collision, not game over
    if (Math.abs(wx - ship.x) < size + 24 && Math.abs(wy - ship.y) < size + 18) {
      onCometHit(wx, wy);
      comets.splice(i, 1);
      spawnComet();
      continue;
    }
  }

  // shards
  for (let i = shards.length - 1; i >= 0; i--) {
    const s = shards[i];
    s.y += s.vy * dt * 1.2;
    s.spin += dt * 2.1;

    if (s.y > 1.18) {
      shards.splice(i, 1);
      spawnShard();
      continue;
    }

    const wx = s.x * W + Math.sin(state.driftTime * 2 + s.phase) * 8;
    const wy = s.y * H;
    const d = Math.hypot(wx - ship.x, wy - ship.y);
    if (d < 28) {
      onCollect(wx, wy);
      shards.splice(i, 1);
      spawnShard();
    }
  }

  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    r.angle += dt * 0.35;
    r.pulse += dt;
    if (Math.random() < 0.008) {
      // slow fade by recycling
      r.r += Math.sin(state.driftTime + i) * 0.02;
    }
    if (r.r > 200) {
      rings.splice(i, 1);
    }
  }

  // auto-shuffle world
  if (comets.length < 7) spawnComet();
  if (shards.length < 8) spawnShard();
  if (rings.length < 3 && Math.random() < 0.02) rings.push(makeRing(rand(0.1, 0.9), rand(0.12, 0.56), rand(38, 124)));

  // ambient combo gently decays if idle
  if (!input.active && state.combo > 0 && Math.random() < 0.01) state.combo = Math.max(0, state.combo - 1);

  updateHud();

  if (state.bannerTimer > 0) {
    finishBanner.classList.remove('hidden');
  } else {
    finishBanner.classList.add('hidden');
  }
}

/* =========================
   Draw
========================= */
function draw(dt) {
  const zone = zones[state.zoneIndex];
  const shakeX = state.shake > 0 ? rand(-6, 6) * state.shake : 0;
  const shakeY = state.shake > 0 ? rand(-6, 6) * state.shake : 0;

  ctx.save();
  ctx.translate(shakeX, shakeY);

  drawBackground(dt);
  drawRings();
  drawShards();
  drawComets();
  drawRipples();
  drawDust();
  drawShip();

  // Bottom veil to keep it cozy
  const veil = ctx.createLinearGradient(0, H * 0.62, 0, H);
  veil.addColorStop(0, 'rgba(0,0,0,0)');
  veil.addColorStop(1, 'rgba(0,0,0,0.12)');
  ctx.fillStyle = veil;
  ctx.fillRect(0, H * 0.62, W, H * 0.38);

  ctx.restore();

  // pulse the thumb slightly to feel alive
  if (running) {
    const drift = Math.sin(performance.now() * 0.004) * 2;
    thumb.style.transform = `translateX(-50%) translateY(${drift}px)`;
    touchZone.classList.add('active');
  }
}

function loop(ts) {
  if (!last) last = ts;
  const dt = Math.min((ts - last) / 1000, 0.034);
  last = ts;

  if (running) update(dt);
  draw(dt);

  requestAnimationFrame(loop);
}

/* =========================
   Buttons and screens
========================= */
document.addEventListener('DOMContentLoaded', () => {
  buildButtons();

  resize();

  // Keep the menu visible until the player starts.
  hud.classList.add('hidden');
  touchZone.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  finishBanner.classList.add('hidden');

  requestAnimationFrame(loop);
});

window.addEventListener('keydown', (e) => {
  if (e.code === 'KeyP' && started) {
    if (running) pauseRun();
    else resumeRun();
  }
});

/* =========================
   High-level touch button
========================= */
const quickStart = () => beginRun(true);

/* Tap the card to start on mobile */
startScreen.addEventListener('pointerdown', (e) => {
  const target = e.target;
  if (target && target.closest && target.closest('button')) return;
  if (target && target.closest && target.closest('.glass-card')) {
    // light tap on the card to start relax mode
    if (!started) quickStart();
  }
});

window.addEventListener('blur', () => {
  if (started && running) pauseRun();
});
