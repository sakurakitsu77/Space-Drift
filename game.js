/* =========================
   Synthwave Signal
   Cozy music-forward drift game
========================= */

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const hud = document.getElementById('hud');
const chapterNameEl = document.getElementById('chapterName');
const scoreValueEl = document.getElementById('scoreValue');
const signalValueEl = document.getElementById('signalValue');
const moodValueEl = document.getElementById('moodValue');

const menuScreen = document.getElementById('menuScreen');
const pauseScreen = document.getElementById('pauseScreen');
const completeScreen = document.getElementById('completeScreen');
const banner = document.getElementById('banner');

const touchRail = document.getElementById('touchRail');
const thumb = document.getElementById('thumb');

const menuButtons = document.getElementById('menuButtons');
const pauseButtons = document.getElementById('pauseButtons');
const completeButtons = document.getElementById('completeButtons');

const completeTitle = document.getElementById('completeTitle');
const completeText = document.getElementById('completeText');
const finalScoreEl = document.getElementById('finalScore');
const finalNotesEl = document.getElementById('finalNotes');
const finalRankEl = document.getElementById('finalRank');

let W = 0, H = 0, DPR = 1, last = 0;
let started = false;
let paused = false;
let playing = false;

const chapters = [
  {
    name: 'Neon Highway',
    mood: 'Warm',
    palette: {
      sky0: '#0b1224',
      sky1: '#1a1740',
      sun: 'rgba(255,122,198,0.92)',
      accent: '#95f3ff',
      note: '#f4fdff',
      grid: 'rgba(255,255,255,0.10)'
    },
    tempo: 92,
    root: 110,
    chords: [
      [110, 138.59, 164.81],
      [123.47, 155.56, 185.00],
      [98, 123.47, 146.83],
      [110, 138.59, 164.81],
    ],
    bassPattern: [0, 0, 7, 0, 0, 5, 7, 0],
    arp: [0, 7, 12, 7, 0, 7, 14, 7],
    noteGoal: 22,
    intro: 'A quiet neon runway. Follow the melody trail and rebuild the signal.'
  },
  {
    name: 'Cassette Moon',
    mood: 'Blue',
    palette: {
      sky0: '#081120',
      sky1: '#121d43',
      sun: 'rgba(167,129,255,0.82)',
      accent: '#d8c6ff',
      note: '#f9f4ff',
      grid: 'rgba(255,255,255,0.09)'
    },
    tempo: 88,
    root: 98,
    chords: [
      [98, 123.47, 146.83],
      [110, 138.59, 164.81],
      [92.50, 116.54, 138.59],
      [98, 123.47, 146.83],
    ],
    bassPattern: [0, 0, 5, 0, 0, 7, 5, 0],
    arp: [0, 7, 12, 10, 7, 0, 14, 12],
    noteGoal: 24,
    intro: 'A softer chapter with long chords and drifting, moonlit notes.'
  },
  {
    name: 'Aurora Tape',
    mood: 'Glow',
    palette: {
      sky0: '#04111c',
      sky1: '#0f2b41',
      sun: 'rgba(106,255,225,0.78)',
      accent: '#b5fff1',
      note: '#f3fffd',
      grid: 'rgba(255,255,255,0.08)'
    },
    tempo: 94,
    root: 123.47,
    chords: [
      [123.47, 155.56, 184.99],
      [138.59, 174.61, 207.65],
      [130.81, 164.81, 196.00],
      [123.47, 155.56, 184.99],
    ],
    bassPattern: [0, 3, 5, 0, 0, 7, 3, 0],
    arp: [0, 7, 12, 14, 12, 7, 0, 14],
    noteGoal: 26,
    intro: 'The signal turns bright and clear. The synths bloom around you.'
  },
  {
    name: 'Lost Transmission',
    mood: 'Silver',
    palette: {
      sky0: '#05060d',
      sky1: '#14131f',
      sun: 'rgba(255,173,203,0.60)',
      accent: '#ffe0ed',
      note: '#ffffff',
      grid: 'rgba(255,255,255,0.08)'
    },
    tempo: 96,
    root: 98,
    chords: [
      [98, 123.47, 146.83],
      [110, 138.59, 164.81],
      [123.47, 155.56, 184.99],
      [110, 138.59, 164.81],
    ],
    bassPattern: [0, 0, 7, 5, 0, 0, 3, 0],
    arp: [0, 7, 12, 7, 14, 12, 7, 0],
    noteGoal: 28,
    intro: 'Final layer. A little brighter, a little fuller, a little more alive.'
  }
];

const state = {
  chapterIndex: 0,
  score: 0,
  notes: 0,
  signal: 0,
  trackTime: 0,
  beat: 0,
  combo: 0,
  moodPulse: 0,
  bannerTimer: 0,
  complete: false,
  aimX: 0.5,
  spawnTimer: 0,
  progressGlow: 0,
};

const ship = {
  x: 0.5,
  y: 0.79,
  targetX: 0.5,
  vx: 0,
  tilt: 0,
  bob: 0,
};

let stars = [];
let notes = [];
let rings = [];
let streaks = [];
let mountains = [];
let sun = { x: 0.75, y: 0.28, r: 95 };

let audio = null;
let beatAccumulator = 0;

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
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

  sun.r = Math.min(W, H) * 0.12;
  ship.y = H * 0.80;
  buildStaticWorld(true);
  draw(0);
}

window.addEventListener('resize', resize, { passive: true });

function buildStaticWorld(force = false) {
  if (force || stars.length === 0) {
    stars = Array.from({ length: 180 }, () => ({
      x: Math.random(),
      y: Math.random(),
      z: rand(0.25, 1.0),
      tw: rand(0, Math.PI * 2)
    }));
  }

  if (force || mountains.length === 0) {
    mountains = [
      { x: 0.00, w: 0.22, h: 0.16 },
      { x: 0.15, w: 0.34, h: 0.22 },
      { x: 0.42, w: 0.30, h: 0.17 },
      { x: 0.68, w: 0.27, h: 0.24 },
      { x: 0.84, w: 0.22, h: 0.18 },
    ];
  }
}

function currentChapter() {
  return chapters[state.chapterIndex];
}

function ensureButtons() {
  makeButton(menuButtons, 'Play Chapter 1', () => startChapter(0), false);
  makeButton(menuButtons, 'Chill Mode', () => startChapter(0), true);

  makeButton(pauseButtons, 'Resume', () => resumeGame(), false);
  makeButton(pauseButtons, 'Restart', () => startChapter(state.chapterIndex), true);
  makeButton(pauseButtons, 'Menu', () => goMenu(), true);

  makeButton(completeButtons, 'Next Chapter', () => startChapter(Math.min(state.chapterIndex + 1, chapters.length - 1)), false);
  makeButton(completeButtons, 'Replay', () => startChapter(state.chapterIndex), true);
  makeButton(completeButtons, 'Menu', () => goMenu(), true);
}

function makeButton(parent, label, onClick, secondary) {
  const btn = document.createElement('button');
  btn.textContent = label;
  if (secondary) btn.className = 'secondary';

  // Try the Liquid Glass button if the library is available.
  if (window.Button && typeof window.Button === 'function') {
    try {
      const glassBtn = new window.Button({
        text: label,
        onClick,
        type: 'pill',
        warp: true,
        tintOpacity: secondary ? 0.22 : 0.34
      });
      if (glassBtn && glassBtn.element) {
        glassBtn.element.addEventListener('click', onClick);
        parent.appendChild(glassBtn.element);
        return;
      }
    } catch (err) {
      // Fallback below.
    }
  }

  btn.addEventListener('click', onClick);
  parent.appendChild(btn);
}

function boot() {
  ensureButtons();
  resize();
  touchRail.classList.add('hidden');
  requestAnimationFrame(loop);
}

function startChapter(index) {
  state.chapterIndex = clamp(index, 0, chapters.length - 1);
  const chapter = currentChapter();

  started = true;
  paused = false;
  playing = true;
  state.score = 0;
  state.notes = 0;
  state.signal = 0;
  state.trackTime = 0;
  state.beat = 0;
  state.combo = 0;
  state.moodPulse = 0;
  state.bannerTimer = 0;
  state.complete = false;
  state.spawnTimer = 0;
  state.progressGlow = 0;
  beatAccumulator = 0;

  ship.x = 0.5;
  ship.targetX = 0.5;
  ship.vx = 0;
  ship.tilt = 0;

  notes = [];
  rings = [];
  streaks = [];

  chapterNameEl.textContent = chapter.name;
  moodValueEl.textContent = chapter.mood;

  menuScreen.classList.add('hidden');
  pauseScreen.classList.add('hidden');
  completeScreen.classList.add('hidden');
  hud.classList.remove('hidden');
  touchRail.classList.remove('hidden');
  touchRail.classList.add('active');

  if (!audio) audio = new window.AudioEngine();
  audio.start(chapter);
  audio.setConfig({ tempo: chapter.tempo, filter: 1350 + state.chapterIndex * 120 });
  audio.update(chapter, onBeat);

  showBanner(chapter.intro);
}

function onBeat(ev) {
  if (!playing || paused) return;
  const chapter = currentChapter();

  // Soft, melodic patterns: 1-3 notes per bar, no chaos.
  const pattern = [
    0.20, 0.42, 0.65, 0.80,
    0.18, 0.35, 0.58, 0.76
  ];
  if (ev.step % 2 === 0 && Math.random() < 0.72) {
    spawnNote(pattern[(ev.step + state.chapterIndex) % pattern.length], chapter);
  }
  if (ev.beatInBar === 0) {
    rings.push({
      x: 0.5 + rand(-0.08, 0.08),
      y: -0.06,
      r: rand(28, 42),
      speed: rand(0.018, 0.028),
      life: 1,
    });
  }

  state.beat = ev.beat;
}

function spawnNote(xNorm, chapter) {
  const scale = [0, 2, 4, 7, 9, 12];
  const note = {
    x: clamp(xNorm + rand(-0.045, 0.045), 0.08, 0.92),
    y: -0.06,
    size: rand(9, 13),
    speed: rand(0.15, 0.22),
    freq: chapter.root * Math.pow(2, pick(scale) / 12),
    spin: rand(0, Math.PI * 2),
    drift: rand(-0.02, 0.02),
    color: chapter.palette.note,
  };
  notes.push(note);
}

function showBanner(text) {
  banner.textContent = text;
  banner.classList.remove('hidden');
  state.bannerTimer = 2.4;
}

function resumeGame() {
  paused = false;
  playing = true;
  pauseScreen.classList.add('hidden');
  touchRail.classList.remove('hidden');
  if (audio && currentChapter()) audio.start(currentChapter());
}

function pauseGame() {
  if (!started) return;
  playing = false;
  paused = true;
  pauseScreen.classList.remove('hidden');
  touchRail.classList.add('hidden');
}

function goMenu() {
  started = false;
  paused = false;
  playing = false;
  menuScreen.classList.remove('hidden');
  pauseScreen.classList.add('hidden');
  completeScreen.classList.add('hidden');
  hud.classList.add('hidden');
  touchRail.classList.add('hidden');
  banner.classList.add('hidden');
  if (audio) audio.stop();
}

function finishChapter() {
  playing = false;
  paused = false;
  state.complete = true;
  touchRail.classList.add('hidden');

  const chapter = currentChapter();
  const rank = rankForSignal(state.signal, state.notes);

  completeTitle.textContent = chapter.name;
  completeText.textContent = state.signal >= 100
    ? 'The full track is back. That one felt good.'
    : 'You restored part of the song. You can always replay and fill it more.';
  finalScoreEl.textContent = Math.floor(state.score);
  finalNotesEl.textContent = state.notes;
  finalRankEl.textContent = rank;

  completeScreen.classList.remove('hidden');
  if (state.signal >= 80) showBanner('Harmony restored.');
}

function rankForSignal(signal, notes) {
  const score = signal + notes * 2;
  if (score >= 170) return 'S';
  if (score >= 140) return 'A';
  if (score >= 110) return 'B';
  if (score >= 80) return 'C';
  return 'D';
}

/* =========================
   Touch steering
========================= */
const pointer = {
  active: false,
  id: null,
  x: 0.5,
};

function pointerX(clientX) {
  const rect = canvas.getBoundingClientRect();
  return clamp((clientX - rect.left) / rect.width, 0.04, 0.96);
}

function beginSteer(e) {
  if (!playing) return;
  if (e.target.closest && e.target.closest('button')) return;

  pointer.active = true;
  pointer.id = e.pointerId;
  pointer.x = pointerX(e.clientX);
  ship.targetX = pointer.x;

  thumb.style.left = `${pointer.x * 100}%`;
  thumb.style.transform = 'translateX(-50%) scale(1.05)';
  touchRail.classList.add('active');

  try {
    e.currentTarget?.setPointerCapture?.(e.pointerId);
  } catch {}
  e.preventDefault();
}

function moveSteer(e) {
  if (!pointer.active || pointer.id !== e.pointerId) return;
  pointer.x = pointerX(e.clientX);
  ship.targetX = pointer.x;
  thumb.style.left = `${pointer.x * 100}%`;
  e.preventDefault();
}

function endSteer(e) {
  if (pointer.id !== null && e.pointerId !== pointer.id) return;
  pointer.active = false;
  pointer.id = null;
  thumb.style.transform = 'translateX(-50%) scale(1)';
  e.preventDefault();
}

canvas.addEventListener('pointerdown', beginSteer);
touchRail.addEventListener('pointerdown', beginSteer);
window.addEventListener('pointermove', moveSteer);
window.addEventListener('pointerup', endSteer);
window.addEventListener('pointercancel', endSteer);

window.addEventListener('keydown', (e) => {
  if (e.code === 'Space') {
    e.preventDefault();
    if (!started) startChapter(0);
    else if (playing) pauseGame();
    else if (paused) resumeGame();
  }
  if (e.code === 'Escape') {
    if (playing) pauseGame();
    else if (paused) goMenu();
  }
  if (e.code === 'ArrowLeft' || e.code === 'KeyA') ship.targetX = clamp(ship.targetX - 0.07, 0.04, 0.96);
  if (e.code === 'ArrowRight' || e.code === 'KeyD') ship.targetX = clamp(ship.targetX + 0.07, 0.04, 0.96);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden && playing) pauseGame();
});

/* =========================
   World generation
========================= */
function spawnBackgroundNote() {
  const chapter = currentChapter();
  notes.push({
    x: rand(0.10, 0.90),
    y: -0.06,
    size: rand(8, 12),
    speed: rand(0.16, 0.24),
    freq: chapter.root * Math.pow(2, pick([0, 2, 4, 7, 9, 12]) / 12),
    spin: rand(0, Math.PI * 2),
    drift: rand(-0.015, 0.015),
    color: chapter.palette.note,
  });
}

function spawnStreak(x, y, color) {
  for (let i = 0; i < 8; i++) {
    streaks.push({
      x, y,
      vx: rand(-36, 36),
      vy: rand(16, 72),
      life: rand(0.25, 0.7),
      r: rand(1, 3),
      color,
    });
  }
}

function collectNote(note, index) {
  notes.splice(index, 1);
  state.notes += 1;
  state.combo += 1;
  state.score += 20 + state.combo * 2;
  state.signal = Math.min(100, (state.notes / currentChapter().noteGoal) * 100);
  state.progressGlow = 1;
  ship.vx = 0.12;
  if (audio && audio.note) audio.note(note.freq, 'triangle', 0.09, 0.22, rand(-0.2, 0.2));
  spawnStreak(note.x * W, note.y * H, currentChapter().palette.accent);
  showBanner(state.combo >= 8 ? 'The melody is blooming.' : 'Nice catch.');
  if (state.signal >= 100) {
    finishChapter();
  }
}

function hitMiss(note, index) {
  // No game over. Just soften the combo and let the player continue.
  notes.splice(index, 1);
  state.combo = Math.max(0, state.combo - 2);
}

/* =========================
   Drawing
========================= */
function drawBackground(dt) {
  const c = currentChapter();
  const sky = ctx.createLinearGradient(0, 0, 0, H);
  sky.addColorStop(0, c.palette.sky0);
  sky.addColorStop(1, c.palette.sky1);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, W, H);

  // Sun
  const sx = W * sun.x;
  const sy = H * sun.y;
  const sunGlow = ctx.createRadialGradient(sx, sy, 2, sx, sy, sun.r * 1.25);
  sunGlow.addColorStop(0, c.palette.sun);
  sunGlow.addColorStop(0.55, c.palette.sun.replace('0.92', '0.22').replace('0.82', '0.22').replace('0.78', '0.22').replace('0.60', '0.16'));
  sunGlow.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = sunGlow;
  ctx.beginPath();
  ctx.arc(sx, sy, sun.r * 1.25, 0, Math.PI * 2);
  ctx.fill();

  const sunCore = ctx.createRadialGradient(sx - sun.r*0.15, sy - sun.r*0.15, 0, sx, sy, sun.r);
  sunCore.addColorStop(0, '#fff6ef');
  sunCore.addColorStop(1, c.palette.sun);
  ctx.fillStyle = sunCore;
  ctx.beginPath();
  ctx.arc(sx, sy, sun.r, 0, Math.PI * 2);
  ctx.fill();

  // Stars
  for (const s of stars) {
    const x = s.x * W;
    const y = (s.y * H + state.trackTime * (15 + s.z * 30)) % (H + 8) - 4;
    const a = 0.25 + s.z * 0.75;
    ctx.globalAlpha = a;
    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.beginPath();
    ctx.arc(x, y, 0.8 + s.z * 1.6, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Gentle nebula swaths
  const swath = ctx.createRadialGradient(W*0.28, H*0.25, 0, W*0.28, H*0.25, Math.min(W, H)*0.4);
  swath.addColorStop(0, 'rgba(255,110,215,0.08)');
  swath.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = swath;
  ctx.beginPath();
  ctx.arc(W*0.28, H*0.25, Math.min(W,H)*0.4, 0, Math.PI*2);
  ctx.fill();

  const swath2 = ctx.createRadialGradient(W*0.72, H*0.18, 0, W*0.72, H*0.18, Math.min(W, H)*0.32);
  swath2.addColorStop(0, 'rgba(85,233,255,0.06)');
  swath2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = swath2;
  ctx.beginPath();
  ctx.arc(W*0.72, H*0.18, Math.min(W,H)*0.32, 0, Math.PI*2);
  ctx.fill();
}

function drawGrid() {
  const c = currentChapter();
  const horizon = H * 0.72;
  const perspective = 0.0019;
  const lines = 16;
  const columns = 12;

  // Horizon glow
  const g = ctx.createLinearGradient(0, horizon - 40, 0, H);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(1, 'rgba(255,255,255,0.04)');
  ctx.fillStyle = g;
  ctx.fillRect(0, horizon - 40, W, H - horizon + 40);

  // Grid lines
  ctx.strokeStyle = c.palette.grid;
  ctx.lineWidth = 1.5;

  for (let i = 0; i < lines; i++) {
    const p = i / (lines - 1);
    const y = horizon + Math.pow(p, 1.65) * (H - horizon);
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  for (let i = -columns; i <= columns; i++) {
    const x = W * 0.5 + i * (W / 12);
    const top = horizon;
    const bottom = H;
    const bend = (x - W * 0.5) * perspective * (H - horizon);
    ctx.beginPath();
    ctx.moveTo(x, top);
    ctx.lineTo(W * 0.5 + (x - W * 0.5) * 1.9, bottom);
    ctx.stroke();
  }

  // Horizon line
  ctx.strokeStyle = 'rgba(255,255,255,0.18)';
  ctx.beginPath();
  ctx.moveTo(0, horizon);
  ctx.lineTo(W, horizon);
  ctx.stroke();
}

function drawMountains() {
  const horizon = H * 0.72;
  ctx.fillStyle = 'rgba(4,6,14,0.82)';
  ctx.beginPath();
  ctx.moveTo(0, horizon);

  for (const m of mountains) {
    const x = m.x * W;
    const peak = horizon - H * m.h;
    const left = x - W * m.w * 0.5;
    const right = x + W * m.w * 0.5;
    ctx.lineTo(left, horizon);
    ctx.lineTo(x, peak);
    ctx.lineTo(right, horizon);
  }

  ctx.lineTo(W, horizon);
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
}

function drawNotes() {
  const c = currentChapter();
  for (let i = notes.length - 1; i >= 0; i--) {
    const n = notes[i];
    const x = n.x * W;
    const y = n.y * H;
    const d = Math.abs(x - ship.x) + Math.abs(y - ship.y);

    n.y += n.speed * 0.014;
    n.x += n.drift * 0.01;
    n.spin += 0.03;

    if (n.y > 1.08) {
      if (d > 40) hitMiss(n, i);
      else notes.splice(i, 1);
      continue;
    }

    const glow = ctx.createRadialGradient(x, y, 0, x, y, n.size * 4.2);
    glow.addColorStop(0, 'rgba(255,255,255,0.9)');
    glow.addColorStop(0.45, 'rgba(185,245,255,0.42)');
    glow.addColorStop(1, 'rgba(185,245,255,0)');
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, n.size * 4.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(n.spin);
    ctx.fillStyle = c.palette.note;
    roundDiamond(-n.size, -n.size, n.size * 2, n.size * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawRings() {
  const c = currentChapter();
  for (let i = rings.length - 1; i >= 0; i--) {
    const r = rings[i];
    r.y += r.speed;
    r.life -= 0.008;

    if (r.life <= 0 || r.y > 1.05) {
      rings.splice(i, 1);
      continue;
    }

    const x = r.x * W;
    const y = r.y * H;
    ctx.strokeStyle = 'rgba(255,255,255,0.16)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r.r, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawStreaks() {
  for (let i = streaks.length - 1; i >= 0; i--) {
    const s = streaks[i];
    s.life -= 0.016;
    if (s.life <= 0) {
      streaks.splice(i, 1);
      continue;
    }
    s.x += s.vx * 0.016;
    s.y += s.vy * 0.016;

    ctx.globalAlpha = clamp(s.life, 0, 1);
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawShip() {
  const c = currentChapter();
  const x = ship.x;
  const y = ship.y;
  const bob = Math.sin(state.trackTime * 2.4) * 3.2;
  ctx.save();
  ctx.translate(x, y + bob);
  ctx.rotate(ship.tilt);

  const glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 60);
  glow.addColorStop(0, 'rgba(255,255,255,0.28)');
  glow.addColorStop(0.45, 'rgba(170,247,255,0.24)');
  glow.addColorStop(1, 'rgba(170,247,255,0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(0, 0, 60, 0, Math.PI * 2);
  ctx.fill();

  // ship body
  const body = ctx.createLinearGradient(0, -24, 0, 24);
  body.addColorStop(0, 'rgba(250,250,255,0.97)');
  body.addColorStop(1, 'rgba(186,192,209,0.90)');
  ctx.fillStyle = body;
  roundRoundedRect(ctx, -18, -24, 36, 48, 14);
  ctx.fill();

  // cockpit
  const cockpit = ctx.createLinearGradient(0, -10, 0, 10);
  cockpit.addColorStop(0, 'rgba(18,21,38,0.98)');
  cockpit.addColorStop(1, 'rgba(10,12,21,0.98)');
  ctx.fillStyle = cockpit;
  roundRoundedRect(ctx, -8, -11, 16, 22, 9);
  ctx.fill();

  // neon wings
  ctx.fillStyle = 'rgba(175,247,255,0.9)';
  roundRoundedRect(ctx, -24, -7, 7, 14, 4);
  ctx.fill();

  ctx.fillStyle = 'rgba(255,189,224,0.86)';
  roundRoundedRect(ctx, 17, -7, 7, 14, 4);
  ctx.fill();

  // engine beam
  const beam = ctx.createLinearGradient(0, 26, 0, 62);
  beam.addColorStop(0, 'rgba(255,255,255,0.9)');
  beam.addColorStop(0.38, 'rgba(170,247,255,0.78)');
  beam.addColorStop(1, 'rgba(170,247,255,0)');
  ctx.fillStyle = beam;
  ctx.beginPath();
  ctx.moveTo(-8, 26);
  ctx.lineTo(0, 58 + Math.sin(state.trackTime * 12) * 2);
  ctx.lineTo(8, 26);
  ctx.closePath();
  ctx.fill();

  ctx.restore();
}

function drawOverlayVignette() {
  const g = ctx.createRadialGradient(W*0.5, H*0.42, 0, W*0.5, H*0.42, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(0,0,0,0)');
  g.addColorStop(1, 'rgba(0,0,0,0.16)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  // subtle scanlines
  ctx.globalAlpha = 0.05;
  ctx.fillStyle = '#ffffff';
  for (let y = 0; y < H; y += 4) ctx.fillRect(0, y, W, 1);
  ctx.globalAlpha = 1;
}

function roundDiamond(x, y, w, h) {
  ctx.beginPath();
  ctx.moveTo(x + w * 0.5, y);
  ctx.lineTo(x + w, y + h * 0.5);
  ctx.lineTo(x + w * 0.5, y + h);
  ctx.lineTo(x, y + h * 0.5);
  ctx.closePath();
}

function roundRoundedRect(c, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  c.beginPath();
  c.moveTo(x + rr, y);
  c.arcTo(x + w, y, x + w, y + h, rr);
  c.arcTo(x + w, y + h, x, y + h, rr);
  c.arcTo(x, y + h, x, y, rr);
  c.arcTo(x, y, x + w, y, rr);
  c.closePath();
}

/* =========================
   Update loop
========================= */
function update(dt) {
  const chapter = currentChapter();
  if (!playing) return;

  state.trackTime += dt;
  state.spawnTimer -= dt;
  state.bannerTimer = Math.max(0, state.bannerTimer - dt);
  state.progressGlow = Math.max(0, state.progressGlow - dt * 1.8);

  // music engine scheduling
  if (audio) audio.update(chapter, onBeat);

  // smooth steering
  ship.x = lerp(ship.x, ship.targetX * W, 1 - Math.pow(0.001, dt));
  ship.x = clamp(ship.x, 40, W - 40);
  ship.tilt = clamp((ship.targetX * W - ship.x) / 260, -0.28, 0.28);
  ship.bob += dt * 5;

  // gentle automatic note spawning
  if (state.spawnTimer <= 0) {
    spawnBackgroundNote();
    state.spawnTimer = rand(0.32, 0.56);
  }

  // move notes and handle pickup
  for (let i = notes.length - 1; i >= 0; i--) {
    const n = notes[i];
    n.y += n.speed * dt;
    n.x += n.drift * dt * 0.6;
    n.spin += dt * 2.2;

    const wx = n.x * W;
    const wy = n.y * H;
    const dist = Math.hypot(wx - ship.x, wy - ship.y);

    if (wy > H + 60) {
      notes.splice(i, 1);
      continue;
    }

    if (dist < 28) {
      collectNote(n, i);
      continue;
    }
  }

  // rings, but kept minimal
  for (let i = rings.length - 1; i >= 0; i--) {
    if (rings[i].y > 1.06) rings.splice(i, 1);
  }

  // combo gently decays over time
  if (Math.random() < 0.01) state.combo = Math.max(0, state.combo - 1);

  state.signal = clamp((state.notes / chapter.noteGoal) * 100, 0, 100);

  if (state.signal >= 100 && !state.complete) {
    finishChapter();
  }

  // HUD
  scoreValueEl.textContent = Math.floor(state.score);
  signalValueEl.textContent = `${Math.floor(state.signal)}%`;
  moodValueEl.textContent = chapter.mood;

  if (state.bannerTimer > 0) {
    banner.classList.remove('hidden');
  } else {
    banner.classList.add('hidden');
  }

  // audio mood changes with signal
  if (audio && audio.master) {
    const layer = 0.015 + (state.signal / 100) * 0.01;
    audio.master.gain.setTargetAtTime(layer, audio.ctx.currentTime, 0.04);
    audio.filter.frequency.setTargetAtTime(1300 + state.signal * 8, audio.ctx.currentTime, 0.06);
  }
}

/* =========================
   Draw loop
========================= */
function draw(dt) {
  if (state.chapterIndex < 0) return;
  drawBackground(dt);
  drawMountains();
  drawGrid();
  drawRings();
  drawNotes();
  drawStreaks();
  drawShip();
  drawOverlayVignette();

  if (playing) {
    const drift = Math.sin(performance.now() * 0.004) * 2;
    if (pointer.active) {
      thumb.style.transform = 'translateX(-50%) scale(1.05)';
    } else {
      thumb.style.transform = `translateX(-50%) translateY(${drift}px)`;
    }
  }
}

function loop(ts) {
  if (!last) last = ts;
  const dt = Math.min((ts - last) / 1000, 0.034);
  last = ts;

  if (playing) update(dt);
  draw(dt);

  requestAnimationFrame(loop);
}

window.addEventListener('blur', () => {
  if (playing) pauseGame();
});

document.addEventListener('DOMContentLoaded', boot);
