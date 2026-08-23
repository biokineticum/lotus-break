(() => {
  "use strict";

  const W = 1280;
  const H = 720;
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");
  const bootEl = document.getElementById("boot");

  const COLS = 13;
  const ROWS = 8;
  const BW = 84;
  const BH = 44;
  const GAP = 6;
  const GRID_W = COLS * BW + (COLS - 1) * GAP;
  const OX = (W - GRID_W) / 2;
  const OY = 72;
  const PADDLE_Y = H - 78;
  const PADDLE_H = 36;
  const PADDLE_W = 176;
  const PADDLE_WIDE = 268;
  const BALL_R = 11;
  const BALL_SPD0 = 430;
  const BALL_SPD_CAP = 720;
  const KEY_SPD = 780;

  const STATE = {
    TITLE: "title",
    CALIBRATE: "calibrate",
    PLAY: "play",
    CLEAR: "clear",
    GAMEOVER: "gameover",
    WIN: "win",
  };

  const BRICK = {
    r: { sprite: "brick_ruby", hp: 1, score: 50, color: "#c43a4a" },
    s: { sprite: "brick_sapphire", hp: 1, score: 60, color: "#2a5fd0" },
    e: { sprite: "brick_emerald", hp: 1, score: 70, color: "#1e8a5a" },
    a: { sprite: "brick_amethyst", hp: 1, score: 80, color: "#7a3cb8" },
    g: { sprite: "brick_gold", hp: 2, score: 140, color: "#d4a24a" },
    o: { sprite: "brick_obsidian", hp: 3, score: 220, color: "#2a2430" },
  };

  const POWER = {
    multi: { sprite: "power_multi", label: "TRIPLE PEARL" },
    wide: { sprite: "power_wide", label: "WIDE BARGE" },
    fire: { sprite: "power_fire", label: "FIRE PEARL" },
    life: { sprite: "lotus", label: "LOTUS LIFE" },
  };

  const ASSET_LIST = {
    paddle: "assets/sprites/paddle.png",
    ball: "assets/sprites/ball.png",
    lotus: "assets/sprites/lotus.png",
    brick_ruby: "assets/sprites/brick_ruby.png",
    brick_sapphire: "assets/sprites/brick_sapphire.png",
    brick_emerald: "assets/sprites/brick_emerald.png",
    brick_amethyst: "assets/sprites/brick_amethyst.png",
    brick_gold: "assets/sprites/brick_gold.png",
    brick_obsidian: "assets/sprites/brick_obsidian.png",
    power_multi: "assets/sprites/power_multi.png",
    power_wide: "assets/sprites/power_wide.png",
    power_fire: "assets/sprites/power_fire.png",
    bg_title: "assets/bg/title.jpg",
    bg_temple: "assets/bg/temple.jpg",
  };

  const LEVELS = [
    {
      name: "DAWN GLASS",
      subtitle: "The first window",
      myth: "A prayer caught in ruby light",
      map: [
        ".............",
        "rrrrrrrrrrrrr",
        "sssssssssssss",
        "eeeeeeeeeeeee",
        "aaaaaaaaaaaaa",
        ".............",
        ".............",
        ".............",
      ],
    },
    {
      name: "TWIN RIVERS",
      subtitle: "Two currents, one pearl",
      myth: "Lean with the water, not against it",
      map: [
        ".............",
        "rsrsrsrsrsrsr",
        "srsrsrsrsrsrs",
        "eaeaeaeaeaeae",
        "aeaeaeaeaeaea",
        "..g.g.g.g.g..",
        ".............",
        ".............",
      ],
    },
    {
      name: "LOTUS MANDALA",
      subtitle: "The bloom of the hall",
      myth: "Petals open from the golden heart",
      map: [
        "......g......",
        ".....ggg.....",
        "....gaaag....",
        "...gaeeeag...",
        "..gaessseag..",
        ".gaesrrrseag.",
        "gaesrrrrrseag",
        ".............",
      ],
    },
    {
      name: "TEMPLE ROOF",
      subtitle: "Step the golden stairs",
      myth: "Obsidian holds the eaves",
      map: [
        "ooooooooooooo",
        ".ggggggggggg.",
        "..aaaaaaaaa..",
        "...eeeeeee...",
        "....sssss....",
        ".....rrr.....",
        "......g......",
        ".............",
      ],
    },
    {
      name: "NIGHT VEIL",
      subtitle: "Pillars of the dark",
      myth: "Do not let the pearl fall between",
      map: [
        "oo.rrrrrrr.oo",
        "oo.sssssss.oo",
        "oo.eeeeeee.oo",
        "oo.aaaaaaa.oo",
        "oo..ggggg..oo",
        "oo.........oo",
        "g.g.g.g.g.g.g",
        ".............",
      ],
    },
    {
      name: "GOLDEN SUTRA",
      subtitle: "Every line a vow",
      myth: "Gold remembers two strikes",
      map: [
        "ggggggggggggg",
        "gaaaaaaaaaaag",
        "g.eeeeeeeee.g",
        "g..sssssss..g",
        "g...rrrrr...g",
        "oooo.o.o.oooo",
        ".............",
        ".............",
      ],
    },
    {
      name: "ASURA GATE",
      subtitle: "Broken lattice",
      myth: "Angles hide in the gaps",
      map: [
        "o.o.o.o.o.o.o",
        ".g.g.g.g.g.g.",
        "a.a.a.a.a.a.a",
        ".e.e.e.e.e.e.",
        "s.s.s.s.s.s.s",
        ".r.r.r.r.r.r.",
        "ooooooooooooo",
        ".............",
      ],
    },
    {
      name: "HEART OF THE WINDOW",
      subtitle: "The last mandala",
      myth: "Shatter the night, keep the pearl",
      map: [
        "ooooooooooooo",
        "o.ggggggggg.o",
        "ogaaaaaaaaago",
        "ogaeesseeeago",
        "ogaesrrrseago",
        "ogaeesseeeago",
        "ogaaaaaaaaago",
        "o.ggggggggg.o",
      ],
    },
  ];

  const images = {};
  const keys = Object.create(null);

  let audio = null;
  let muted = false;
  let state = STATE.TITLE;
  let levelIndex = 0;
  let bricks = [];
  let balls = [];
  let paddle = null;
  let powers = [];
  let particles = [];
  let floaters = [];
  let hud = {
    score: 0,
    best: 0,
    lives: 3,
    combo: 0,
    banner: "",
    bannerT: 0,
    introT: 0,
    flash: 0,
    titlePulse: 0,
  };
  let shake = 0;
  let time = 0;
  let last = 0;
  let paused = false;
  let camUi = { settings: null, retry: null };
  let serving = true;

  const VIEW_MODES = [
    { id: "720", name: "720p", w: 1280, h: 720 },
    { id: "1080", name: "1080p", w: 1920, h: 1080 },
    { id: "1440", name: "1440p", w: 2560, h: 1440 },
    { id: "2160", name: "4K", w: 3840, h: 2160 },
    { id: "fit", name: "Fit screen", fit: true },
  ];
  let viewMode = document.documentElement.classList.contains("desktop") ? 4 : 1;
  let view = { scale: 1, cssW: 1280, cssH: 720 };

  try {
    const saved = localStorage.getItem("lotus.res");
    const idx = VIEW_MODES.findIndex((m) => m.id === saved);
    if (idx >= 0) viewMode = idx;
    hud.best = parseInt(localStorage.getItem("lotus.best") || "0", 10) || 0;
  } catch (err) {}

  function currentView() {
    return VIEW_MODES[viewMode] || VIEW_MODES[1];
  }

  function applyView(ox, oy) {
    const s = view.scale || 1;
    ctx.setTransform(s, 0, 0, s, (ox || 0) * s, (oy || 0) * s);
  }

  function applyResolution() {
    const mode = currentView();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const desk = document.documentElement.classList.contains("desktop");
    const maxW = Math.max(320, window.innerWidth - (desk ? 0 : 36));
    const maxH = Math.max(180, window.innerHeight - (desk ? 0 : 72));
    let cssW;
    let cssH;
    if (mode.fit) {
      if (maxW / maxH > W / H) {
        cssH = maxH;
        cssW = maxH * (W / H);
      } else {
        cssW = maxW;
        cssH = maxW * (H / W);
      }
    } else {
      cssW = mode.w;
      cssH = mode.h;
      const f = Math.min(1, maxW / cssW, maxH / cssH);
      cssW *= f;
      cssH *= f;
    }
    view.cssW = cssW;
    view.cssH = cssH;
    view.scale = (cssW * dpr) / W;
    canvas.width = Math.max(1, Math.round(cssW * dpr));
    canvas.height = Math.max(1, Math.round(cssH * dpr));
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    ctx.imageSmoothingEnabled = true;
    if (ctx.imageSmoothingQuality) ctx.imageSmoothingQuality = "high";
  }

  function cycleResolution() {
    viewMode = (viewMode + 1) % VIEW_MODES.length;
    try { localStorage.setItem("lotus.res", currentView().id); } catch (err) {}
    applyResolution();
  }

  function viewLabel() {
    const m = currentView();
    if (m.fit) return "Fit screen";
    return m.w + " × " + m.h;
  }

  function loadImage(src) {
    return new Promise((resolve, reject) => {
      const im = new Image();
      im.onload = () => resolve(im);
      im.onerror = () => reject(new Error(src));
      im.src = src;
    });
  }

  function loadAll() {
    const jobs = Object.keys(ASSET_LIST).map((k) =>
      loadImage(ASSET_LIST[k]).then((im) => { images[k] = im; })
    );
    return Promise.all(jobs);
  }

  function rand(a, b) { return a + Math.random() * (b - a); }
  function lerp(a, b, t) { return a + (b - a) * t; }
  function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }

  function ensureAudio() {
    if (audio) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    audio = { ctx: new AC() };
  }

  function beep(freq, dur, type, vol, slide) {
    if (muted || !audio) return;
    const c = audio.ctx;
    const o = c.createOscillator();
    const g = c.createGain();
    o.type = type || "sine";
    o.frequency.value = freq;
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), c.currentTime + dur);
    g.gain.value = vol || 0.05;
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + dur);
    o.connect(g);
    g.connect(c.destination);
    o.start();
    o.stop(c.currentTime + dur + 0.02);
  }

  function sfxBounce() { beep(520, 0.07, "sine", 0.05, 380); }
  function sfxBrick() { beep(640, 0.09, "triangle", 0.06, 240); }
  function sfxGold() { beep(420, 0.08, "square", 0.03, 280); }
  function sfxLaunch() { beep(360, 0.16, "sine", 0.06, 720); }
  function sfxPower() { beep(880, 0.2, "triangle", 0.06, 1320); }
  function sfxLose() { beep(220, 0.35, "sawtooth", 0.05, 70); }
  function sfxWin() { beep(520, 0.4, "triangle", 0.07, 1040); }

  function requestHeadCam() {
    if (window.HeadCam) {
      if (!window.HeadCam.active) window.HeadCam.start();
      return;
    }
    window.__wantHeadCam = true;
  }

  function setCamBar(on) {
    const el = document.getElementById("cam-bar");
    if (el) el.hidden = !on;
  }

  function canvasPoint(ev) {
    const rect = canvas.getBoundingClientRect();
    const gx = ((ev.clientX - rect.left) / Math.max(1, rect.width)) * W;
    const gy = ((ev.clientY - rect.top) / Math.max(1, rect.height)) * H;
    return { gx, gy };
  }

  function hitBtn(btn, gx, gy) {
    if (!btn) return false;
    return gx >= btn.x && gx <= btn.x + btn.w && gy >= btn.y && gy <= btn.y + btn.h;
  }

  function openWinCamSettings() {
    const wv = window.chrome && chrome.webview;
    if (!wv) {
      try { window.open("ms-settings:privacy-webcam"); } catch (err) {}
      return;
    }
    try {
      if (wv.hostObjects && wv.hostObjects.bodhi) wv.hostObjects.bodhi.OpenCameraSettings();
      else wv.postMessage("open-camera-settings");
    } catch (err) {
      wv.postMessage("open-camera-settings");
    }
  }

  function saveBest() {
    if (hud.score > hud.best) {
      hud.best = hud.score;
      try { localStorage.setItem("lotus.best", String(hud.best)); } catch (err) {}
    }
  }

  function levelSpeed() {
    return Math.min(BALL_SPD_CAP, BALL_SPD0 + levelIndex * 32);
  }

  function makePaddle() {
    return {
      x: (W - PADDLE_W) / 2,
      y: PADDLE_Y,
      w: PADDLE_W,
      h: PADDLE_H,
      vx: 0,
      wideT: 0,
      glow: 0,
    };
  }

  function makeBall(stuck) {
    return {
      x: W / 2,
      y: PADDLE_Y - BALL_R - 2,
      vx: 0,
      vy: 0,
      r: BALL_R,
      stuck: stuck !== false,
      fire: 0,
      trail: [],
    };
  }

  function brickAt(c, r, ch, delay) {
    const def = BRICK[ch];
    if (!def) return null;
    return {
      c, r, ch, def,
      x: OX + c * (BW + GAP),
      y: OY + r * (BH + GAP),
      w: BW,
      h: BH,
      hp: def.hp,
      maxHp: def.hp,
      alive: true,
      born: delay,
      flash: 0,
    };
  }

  function loadLevel(i) {
    levelIndex = i;
    const lv = LEVELS[i];
    bricks = [];
    let n = 0;
    for (let r = 0; r < lv.map.length; r++) {
      const row = lv.map[r];
      for (let c = 0; c < COLS; c++) {
        const ch = row[c];
        if (!ch || ch === ".") continue;
        const b = brickAt(c, r, ch, n * 0.018);
        if (b) {
          bricks.push(b);
          n++;
        }
      }
    }
    balls = [makeBall(true)];
    powers = [];
    serving = true;
    hud.combo = 0;
    hud.introT = 1.8;
    hud.banner = lv.name;
    hud.bannerT = 1.8;
    if (paddle) {
      paddle.x = (W - paddle.w) / 2;
      paddle.wideT = 0;
      paddle.w = PADDLE_W;
    }
  }

  function startRun() {
    setCamBar(false);
    hud.score = 0;
    hud.lives = 3;
    hud.combo = 0;
    paddle = makePaddle();
    particles = [];
    floaters = [];
    loadLevel(0);
    state = STATE.PLAY;
    paused = false;
    ensureAudio();
    if (audio && audio.ctx.state === "suspended") audio.ctx.resume();
  }

  function beginCalibrate() {
    state = STATE.CALIBRATE;
    paused = false;
    setCamBar(true);
    ensureAudio();
    if (audio && audio.ctx.state === "suspended") audio.ctx.resume();
    requestHeadCam();
    try { canvas.focus(); } catch (err) {}
  }

  function startFromCalibrate() {
    if (state === STATE.TITLE) {
      beginCalibrate();
      return;
    }
    if (state !== STATE.CALIBRATE) return;
    const hc = window.HeadCam;
    if (hc && hc.tracking) hc.lockRest();
    startRun();
  }

  window.BodhiStart = startFromCalibrate;
  window.LotusStart = startFromCalibrate;

  function burst(x, y, color, n, spd, life) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(spd * 0.3, spd);
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - rand(20, 80),
        life: rand(life * 0.5, life),
        max: life,
        color,
        w: rand(3, 9),
        h: rand(2, 5),
        rot: rand(0, 6),
        vr: rand(-8, 8),
      });
    }
  }

  function floater(x, y, text, color) {
    floaters.push({ x, y, text, color: color || "#f4d27a", t: 0.8 });
  }

  function launchBall(b) {
    if (!b.stuck) return;
    b.stuck = false;
    serving = false;
    const spd = levelSpeed();
    const lean = paddle ? clamp(paddle.vx / 600, -0.55, 0.55) : 0;
    b.vx = Math.sin(lean) * spd + lean * 120;
    b.vy = -Math.cos(lean) * spd;
    if (b.vy > -220) b.vy = -220;
    const len = Math.hypot(b.vx, b.vy) || 1;
    b.vx = (b.vx / len) * spd;
    b.vy = (b.vy / len) * spd;
    sfxLaunch();
  }

  function launchAll() {
    let any = false;
    for (const b of balls) {
      if (b.stuck) {
        launchBall(b);
        any = true;
      }
    }
    return any;
  }

  function spawnPower(x, y) {
    const roll = Math.random();
    let type = "multi";
    if (roll < 0.28) type = "wide";
    else if (roll < 0.5) type = "fire";
    else if (roll < 0.66) type = "life";
    else type = "multi";
    powers.push({ type, x, y, vy: 140, rot: 0 });
  }

  function applyPower(type) {
    const p = POWER[type];
    hud.banner = p ? p.label : type;
    hud.bannerT = 1.2;
    sfxPower();
    paddle.glow = 0.5;
    if (type === "multi") {
      const src = balls.find((b) => !b.stuck) || balls[0];
      if (!src) return;
      for (const sign of [-1, 1]) {
        const nb = makeBall(false);
        nb.x = src.x;
        nb.y = src.y;
        nb.fire = src.fire;
        const ang = Math.atan2(src.vy, src.vx) + sign * 0.42;
        const spd = Math.hypot(src.vx, src.vy) || levelSpeed();
        nb.vx = Math.cos(ang) * spd;
        nb.vy = Math.sin(ang) * spd;
        if (nb.vy > -40 && nb.vy < 40) nb.vy = -180;
        balls.push(nb);
      }
    } else if (type === "wide") {
      const cx = paddle.x + paddle.w / 2;
      paddle.w = PADDLE_WIDE;
      paddle.x = clamp(cx - paddle.w / 2, 16, W - 16 - paddle.w);
      paddle.wideT = 14;
    } else if (type === "fire") {
      for (const b of balls) b.fire = 9;
    } else if (type === "life") {
      hud.lives = Math.min(5, hud.lives + 1);
    }
  }

  function damageBrick(br, fromFire) {
    if (!br.alive) return;
    br.hp -= 1;
    br.flash = 0.1;
    shake = Math.max(shake, 3);
    if (br.hp > 0) {
      sfxGold();
      burst(br.x + br.w / 2, br.y + br.h / 2, br.def.color, 6, 140, 0.35);
      return;
    }
    br.alive = false;
    hud.combo += 1;
    const pts = br.def.score * (1 + Math.floor(hud.combo / 4));
    hud.score += pts;
    floater(br.x + br.w / 2, br.y, "+" + pts);
    sfxBrick();
    burst(br.x + br.w / 2, br.y + br.h / 2, br.def.color, 16, 280, 0.55);
    if (Math.random() < 0.13) spawnPower(br.x + br.w / 2, br.y + br.h / 2);
    if (fromFire) shake = Math.max(shake, 5);
  }

  function circleRect(b, r) {
    const nx = clamp(b.x, r.x, r.x + r.w);
    const ny = clamp(b.y, r.y, r.y + r.h);
    const dx = b.x - nx;
    const dy = b.y - ny;
    return dx * dx + dy * dy <= b.r * b.r;
  }

  function bounceOffRect(b, r) {
    const cx = r.x + r.w / 2;
    const cy = r.y + r.h / 2;
    const px = (b.x - cx) / (r.w / 2 + b.r);
    const py = (b.y - cy) / (r.h / 2 + b.r);
    if (Math.abs(px) > Math.abs(py)) {
      b.vx = Math.abs(b.vx) * Math.sign(px || 1);
      b.x = px > 0 ? r.x + r.w + b.r + 0.5 : r.x - b.r - 0.5;
    } else {
      b.vy = Math.abs(b.vy) * Math.sign(py || 1);
      b.y = py > 0 ? r.y + r.h + b.r + 0.5 : r.y - b.r - 0.5;
    }
  }

  function bouncePaddle(b) {
    const hit = (b.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2);
    const k = clamp(hit, -1, 1);
    const spd = Math.max(levelSpeed() * 0.92, Math.hypot(b.vx, b.vy));
    const ang = -Math.PI / 2 + k * 1.05;
    b.vx = Math.cos(ang) * spd;
    b.vy = Math.sin(ang) * spd;
    if (b.vy > -160) b.vy = -160;
    b.y = paddle.y - b.r - 0.5;
    hud.combo = 0;
    paddle.glow = 0.25;
    sfxBounce();
  }

  function camControl() {
    const hc = window.HeadCam;
    return !!(hc && hc.active && hc.tracking && !hc.calibrating);
  }

  function updatePaddle(dt) {
    const prev = paddle.x;
    const left = !!(keys.ArrowLeft || keys.KeyA);
    const right = !!(keys.ArrowRight || keys.KeyD);
    const hc = window.HeadCam;
    if (left || right) {
      const want = (right ? 1 : 0) - (left ? 1 : 0);
      paddle.x += want * KEY_SPD * dt;
    } else if (camControl()) {
      const t = (hc.move + 1) * 0.5;
      const target = lerp(18, W - 18 - paddle.w, t);
      paddle.x = lerp(paddle.x, target, Math.min(1, 52 * dt));
    }
    paddle.x = clamp(paddle.x, 16, W - 16 - paddle.w);
    paddle.vx = (paddle.x - prev) / Math.max(dt, 0.001);
    if (paddle.wideT > 0) {
      paddle.wideT -= dt;
      if (paddle.wideT <= 0) {
        const cx = paddle.x + paddle.w / 2;
        paddle.w = PADDLE_W;
        paddle.x = clamp(cx - paddle.w / 2, 16, W - 16 - paddle.w);
      }
    }
    paddle.glow = Math.max(0, paddle.glow - dt);
  }

  function updateBall(b, dt) {
    if (b.stuck) {
      b.x = paddle.x + paddle.w / 2;
      b.y = paddle.y - b.r - 2;
      b.trail.length = 0;
      return true;
    }
    if (b.fire > 0) b.fire -= dt;
    const steps = 3;
    const sdt = dt / steps;
    for (let s = 0; s < steps; s++) {
      b.x += b.vx * sdt;
      b.y += b.vy * sdt;
      if (b.x < 18 + b.r) { b.x = 18 + b.r; b.vx = Math.abs(b.vx); sfxBounce(); }
      if (b.x > W - 18 - b.r) { b.x = W - 18 - b.r; b.vx = -Math.abs(b.vx); sfxBounce(); }
      if (b.y < 18 + b.r) { b.y = 18 + b.r; b.vy = Math.abs(b.vy); sfxBounce(); }
      if (b.y > H + 40) return false;

      const prect = { x: paddle.x, y: paddle.y, w: paddle.w, h: paddle.h };
      if (b.vy > 0 && circleRect(b, prect) && b.y < paddle.y + paddle.h * 0.55) {
        bouncePaddle(b);
      }

      for (let i = 0; i < bricks.length; i++) {
        const br = bricks[i];
        if (!br.alive || br.born > 0) continue;
        const rect = { x: br.x, y: br.y, w: br.w, h: br.h };
        if (!circleRect(b, rect)) continue;
        damageBrick(br, b.fire > 0);
        if (b.fire <= 0) {
          bounceOffRect(b, rect);
          break;
        }
      }
    }
    const spd = Math.hypot(b.vx, b.vy);
    const cap = BALL_SPD_CAP;
    const min = levelSpeed() * 0.85;
    if (spd > cap) {
      b.vx *= cap / spd;
      b.vy *= cap / spd;
    } else if (spd < min && spd > 1) {
      b.vx *= min / spd;
      b.vy *= min / spd;
    }
    if (Math.abs(b.vy) < 90) b.vy = (b.vy < 0 ? -1 : 1) * 140;
    b.trail.push({ x: b.x, y: b.y, fire: b.fire });
    if (b.trail.length > 10) b.trail.shift();
    return true;
  }

  function bricksLeft() {
    let n = 0;
    for (const br of bricks) if (br.alive) n++;
    return n;
  }

  function loseLife() {
    hud.lives -= 1;
    hud.flash = 0.35;
    shake = 12;
    sfxLose();
    powers = [];
    if (hud.lives <= 0) {
      saveBest();
      state = STATE.GAMEOVER;
      return;
    }
    balls = [makeBall(true)];
    serving = true;
    hud.combo = 0;
    paddle.w = PADDLE_W;
    paddle.wideT = 0;
    paddle.x = clamp(paddle.x, 16, W - 16 - paddle.w);
  }

  function nextLevel() {
    sfxWin();
    saveBest();
    if (levelIndex + 1 >= LEVELS.length) {
      state = STATE.WIN;
      return;
    }
    state = STATE.CLEAR;
    hud.banner = "WINDOW FREED";
    hud.bannerT = 2.2;
  }

  function update(dt) {
    hud.titlePulse += dt;
    if (hud.flash > 0) hud.flash -= dt;
    if (hud.bannerT > 0) hud.bannerT -= dt;
    shake *= Math.pow(0.04, dt);

    if (state !== STATE.PLAY || paused) {
      if (state === STATE.CLEAR && hud.bannerT <= 0) {
        loadLevel(levelIndex + 1);
        state = STATE.PLAY;
      }
      return;
    }

    if (hud.introT > 0) hud.introT -= dt;

    const hc = window.HeadCam;
    if (hc && hc.consumeJump && hc.consumeJump()) launchAll();

    updatePaddle(dt);

    for (const br of bricks) {
      if (br.born > 0) br.born -= dt;
      if (br.flash > 0) br.flash -= dt;
    }

    const live = [];
    for (const b of balls) {
      if (updateBall(b, dt)) live.push(b);
    }
    balls = live;
    if (balls.length === 0) loseLife();
    if (state !== STATE.PLAY) return;

    for (let i = powers.length - 1; i >= 0; i--) {
      const p = powers[i];
      p.y += p.vy * dt;
      p.rot += dt * 2;
      p.vy += 40 * dt;
      if (p.y > H + 40) { powers.splice(i, 1); continue; }
      if (p.y + 16 >= paddle.y && p.y < paddle.y + paddle.h && p.x > paddle.x - 10 && p.x < paddle.x + paddle.w + 10) {
        applyPower(p.type);
        powers.splice(i, 1);
      }
    }

    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 420 * dt;
      p.rot += p.vr * dt;
      if (p.life <= 0) particles.splice(i, 1);
    }
    for (let i = floaters.length - 1; i >= 0; i--) {
      floaters[i].t -= dt;
      floaters[i].y -= 28 * dt;
      if (floaters[i].t <= 0) floaters.splice(i, 1);
    }

    if (bricksLeft() === 0) nextLevel();
  }

  function drawImageCover(im, x, y, w, h) {
    if (!im) return;
    const ir = im.width / im.height;
    const rr = w / h;
    let sx = 0, sy = 0, sw = im.width, sh = im.height;
    if (ir > rr) {
      sw = im.height * rr;
      sx = (im.width - sw) / 2;
    } else {
      sh = im.width / rr;
      sy = (im.height - sh) / 2;
    }
    ctx.drawImage(im, sx, sy, sw, sh, x, y, w, h);
  }

  function drawBg() {
    const im = state === STATE.TITLE || state === STATE.CALIBRATE ? images.bg_title : images.bg_temple;
    if (im) drawImageCover(im, 0, 0, W, H);
    else {
      ctx.fillStyle = "#10081a";
      ctx.fillRect(0, 0, W, H);
    }
    if (state === STATE.PLAY || state === STATE.CLEAR) {
      ctx.fillStyle = "rgba(6,4,16,0.28)";
      ctx.fillRect(0, 0, W, H);
    }
  }

  function drawBricks() {
    for (const br of bricks) {
      if (!br.alive) continue;
      const t = br.born > 0 ? 1 - clamp(br.born / 0.25, 0, 1) : 1;
      const y = br.y - (1 - t) * 40;
      ctx.save();
      ctx.globalAlpha = t;
      const im = images[br.def.sprite];
      if (im) ctx.drawImage(im, br.x, y, br.w, br.h);
      else {
        ctx.fillStyle = br.def.color;
        ctx.fillRect(br.x, y, br.w, br.h);
      }
      if (br.hp < br.maxHp) {
        ctx.fillStyle = "rgba(0,0,0," + (0.18 + 0.22 * (br.maxHp - br.hp)) + ")";
        ctx.fillRect(br.x, y, br.w, br.h);
        ctx.strokeStyle = "rgba(255,220,140,0.35)";
        ctx.beginPath();
        ctx.moveTo(br.x + 8, y + 8);
        ctx.lineTo(br.x + br.w - 14, y + br.h - 6);
        if (br.hp === 1 && br.maxHp === 3) {
          ctx.moveTo(br.x + br.w - 10, y + 6);
          ctx.lineTo(br.x + 16, y + br.h - 8);
        }
        ctx.stroke();
      }
      if (br.flash > 0) {
        ctx.fillStyle = "rgba(255,240,200," + br.flash * 4 + ")";
        ctx.fillRect(br.x, y, br.w, br.h);
      }
      const shine = (Math.sin(time * 2 + br.c * 0.4 + br.r) * 0.5 + 0.5) * 0.12;
      ctx.fillStyle = "rgba(255,255,255," + shine + ")";
      ctx.fillRect(br.x, y, br.w, 5);
      ctx.restore();
    }
  }

  function drawPaddle() {
    if (!paddle) return;
    const im = images.paddle;
    const lift = paddle.glow * 6;
    if (paddle.glow > 0) {
      ctx.save();
      ctx.globalAlpha = paddle.glow;
      ctx.shadowColor = "#f4d27a";
      ctx.shadowBlur = 28;
      ctx.fillStyle = "#f4d27a";
      ctx.fillRect(paddle.x + 10, paddle.y + 8, paddle.w - 20, 8);
      ctx.restore();
    }
    if (im) ctx.drawImage(im, paddle.x - 8, paddle.y - 10 - lift, paddle.w + 16, paddle.h + 22);
    else {
      ctx.fillStyle = "#d4a24a";
      ctx.fillRect(paddle.x, paddle.y, paddle.w, paddle.h);
    }
  }

  function drawBall(b) {
    for (let i = 0; i < b.trail.length; i++) {
      const t = b.trail[i];
      const a = (i + 1) / (b.trail.length + 1) * 0.28;
      ctx.beginPath();
      ctx.fillStyle = b.fire > 0 ? "rgba(255,140,60," + a + ")" : "rgba(255,236,180," + a + ")";
      ctx.arc(t.x, t.y, b.r * (0.4 + a), 0, Math.PI * 2);
      ctx.fill();
    }
    const g = ctx.createRadialGradient(b.x, b.y, 2, b.x, b.y, b.r * 3.2);
    if (b.fire > 0) {
      g.addColorStop(0, "rgba(255,210,120,0.55)");
      g.addColorStop(1, "rgba(255,80,0,0)");
    } else {
      g.addColorStop(0, "rgba(255,244,200,0.5)");
      g.addColorStop(1, "rgba(255,200,80,0)");
    }
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.r * 3.2, 0, Math.PI * 2);
    ctx.fill();
    const im = images.ball;
    const s = b.r * 2.6;
    if (im) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r * 1.2, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(im, b.x - s / 2, b.y - s / 2, s, s);
      ctx.restore();
    } else {
      ctx.fillStyle = "#fff4d0";
      ctx.beginPath();
      ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  function drawPowers() {
    for (const p of powers) {
      const im = images[POWER[p.type] ? POWER[p.type].sprite : "lotus"] || images.lotus;
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(Math.sin(p.rot) * 0.2);
      const s = 42;
      if (im) ctx.drawImage(im, -s / 2, -s / 2, s, s);
      ctx.restore();
    }
  }

  function drawParticles() {
    for (const p of particles) {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rot);
      ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
      ctx.fillStyle = p.color;
      ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
    for (const f of floaters) {
      ctx.globalAlpha = clamp(f.t / 0.8, 0, 1);
      ctx.fillStyle = f.color;
      ctx.font = "700 16px Cinzel, serif";
      ctx.textAlign = "center";
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.globalAlpha = 1;
  }

  function headActionLabel(hc) {
    if (!hc) return "WAITING";
    if (hc.status === "loading") return "STARTING CAMERA…";
    if (hc.status === "error") return hc.error || "CAMERA BLOCKED";
    if (hc.status === "lost" || hc.status === "seek") return "LOOK AT THE CAMERA";
    if (!hc.tracking) return "LOOK AT THE CAMERA";
    if (hc.headHigh) return "LAUNCH";
    if (hc.move < -0.22) return "LEFT";
    if (hc.move > 0.22) return "RIGHT";
    return "NEUTRAL";
  }

  function drawCalibrate() {
    const hc = window.HeadCam;
    ctx.fillStyle = "rgba(8,6,18,0.45)";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.fillStyle = "#f4d27a";
    ctx.font = "700 40px Cinzel, serif";
    ctx.fillText("HEAD CAMERA", W / 2, 58);
    ctx.font = "italic 20px 'Cormorant Garamond', serif";
    ctx.fillStyle = "#efe0b8";
    ctx.fillText("YOLOv8-Face — lean to steer the barge", W / 2, 92);

    const vw = 720;
    const vh = 405;
    const vx = (W - vw) / 2;
    const vy = 118;

    ctx.fillStyle = "#1a1014";
    ctx.fillRect(vx - 6, vy - 6, vw + 12, vh + 12);
    ctx.strokeStyle = "#d4b36a";
    ctx.lineWidth = 2;
    ctx.strokeRect(vx - 6, vy - 6, vw + 12, vh + 12);

    const pic = hc && (hc.preview && hc.preview.complete ? hc.preview : hc.video);
    if (pic && (pic.naturalWidth || (pic.readyState >= 2))) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(vx, vy, vw, vh);
      ctx.clip();
      ctx.translate(vx + vw, vy);
      ctx.scale(-1, 1);
      ctx.drawImage(pic, 0, 0, vw, vh);
      ctx.restore();
    } else {
      ctx.fillStyle = "#140c10";
      ctx.fillRect(vx, vy, vw, vh);
      ctx.fillStyle = "#cbb48a";
      ctx.font = "500 18px Cinzel, serif";
      ctx.fillText(hc && hc.status === "error" ? "Camera unavailable — keyboard will be used" : "Opening camera…", W / 2, vy + vh / 2);
    }

    if (hc && hc.pts && hc.pts.length >= 5) {
      const map = (p) => [vx + (1 - p[0]) * vw, vy + p[1] * vh];
      const dots = hc.pts.map(map);
      ctx.strokeStyle = "rgba(120,190,230,0.85)";
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(dots[0][0], dots[0][1]);
      ctx.lineTo(dots[2][0], dots[2][1]);
      ctx.lineTo(dots[1][0], dots[1][1]);
      ctx.moveTo(dots[3][0], dots[3][1]);
      ctx.lineTo(dots[4][0], dots[4][1]);
      ctx.moveTo(dots[2][0], dots[2][1]);
      ctx.lineTo((dots[3][0] + dots[4][0]) / 2, (dots[3][1] + dots[4][1]) / 2);
      ctx.stroke();
      for (const d of dots) {
        ctx.fillStyle = "#8fd0ff";
        ctx.beginPath();
        ctx.arc(d[0], d[1], 5, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (hc && hc.tracking) {
      const mx = vx + (1 - hc.nx) * vw;
      const my = vy + hc.ny * vh;
      const cx = vx + (1 - hc._cal.x) * vw;
      const cy = vy + hc._cal.y * vh;
      ctx.strokeStyle = "rgba(244,210,122,0.7)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(cx - 18, cy);
      ctx.lineTo(cx + 18, cy);
      ctx.moveTo(cx, cy - 18);
      ctx.lineTo(cx, cy + 18);
      ctx.stroke();
      ctx.strokeStyle = "rgba(255,186,70,0.75)";
      ctx.setLineDash([8, 6]);
      ctx.beginPath();
      ctx.moveTo(vx + 24, cy - vh * 0.062);
      ctx.lineTo(vx + vw - 24, cy - vh * 0.062);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = hc.headHigh ? "#7dff9a" : "#ffd56a";
      ctx.beginPath();
      ctx.arc(mx, my, 8, 0, Math.PI * 2);
      ctx.fill();
    }

    const action = headActionLabel(hc);
    ctx.fillStyle = "rgba(10,6,8,0.72)";
    ctx.fillRect(W / 2 - 160, vy + vh - 52, 320, 40);
    ctx.fillStyle = action === "LAUNCH" ? "#7dff9a" : action === "LEFT" || action === "RIGHT" ? "#ffd56a" : "#f4d27a";
    ctx.font = "700 22px Cinzel, serif";
    ctx.fillText(action, W / 2, vy + vh - 24);

    ctx.font = "500 15px Cinzel, serif";
    ctx.fillStyle = "#cbb48a";
    ctx.fillText(hc && hc.lib ? ("tracker: " + hc.lib + "  ·  eyes · nose · mouth corners  ·  CoP = average") : "tracker: YOLOv8-Face", W / 2, 548);
    ctx.fillStyle = "#f4d27a";
    ctx.fillText("Lean = barge    ·    Raise your head / Space = launch the pearl", W / 2, 572);
    camUi.settings = null;
    camUi.retry = null;
    if (hc && hc.error) {
      ctx.fillStyle = "#ff8a7a";
      ctx.font = "500 13px Cinzel, serif";
      ctx.fillText(hc.error, W / 2, 610);
    }
    ctx.font = "italic 16px 'Cormorant Garamond', serif";
    ctx.fillStyle = "#f4d27a";
    ctx.fillText("Enter or “Start game” — you can begin even without a face lock", W / 2, 678);
  }

  function drawHeadCam() {
    const hc = window.HeadCam;
    if (!hc || hc.status === "off") return;
    const vw = 168;
    const vh = 126;
    const x = 16;
    const y = H - vh - 16;
    ctx.save();
    ctx.fillStyle = "rgba(8,4,8,0.72)";
    ctx.fillRect(x - 4, y - 22, vw + 8, vh + 28);
    ctx.strokeStyle = "#d4b36a";
    ctx.lineWidth = 1.4;
    ctx.strokeRect(x - 4, y - 22, vw + 8, vh + 28);
    const pip = hc.preview && hc.preview.complete ? hc.preview : null;
    if (pip && pip.naturalWidth) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, vw, vh);
      ctx.clip();
      ctx.translate(x + vw, y);
      ctx.scale(-1, 1);
      ctx.drawImage(pip, 0, 0, vw, vh);
      ctx.restore();
    } else {
      ctx.fillStyle = "#1a1014";
      ctx.fillRect(x, y, vw, vh);
    }
    const mx = x + (1 - hc.nx) * vw;
    const my = y + hc.ny * vh;
    const cx = x + (1 - (hc._cal ? hc._cal.x : 0.5)) * vw;
    const cy = y + (hc._cal ? hc._cal.y : 0.5) * vh;
    ctx.strokeStyle = "rgba(244,210,122,0.45)";
    ctx.beginPath();
    ctx.moveTo(cx - 10, cy);
    ctx.lineTo(cx + 10, cy);
    ctx.moveTo(cx, cy - 10);
    ctx.lineTo(cx, cy + 10);
    ctx.stroke();
    if (hc.tracking) {
      ctx.fillStyle = hc.headHigh ? "#7dff9a" : "#ffd56a";
      ctx.beginPath();
      ctx.arc(mx, my, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.font = "600 11px Cinzel, serif";
    ctx.fillStyle = "#f4d27a";
    ctx.textAlign = "left";
    let label = "HEAD CAM";
    if (hc.status === "loading") label = "LOADING TRACKER…";
    else if (hc.status === "seek" || hc.status === "lost") label = "LOOK AT THE CAMERA";
    else if (hc.status === "error") label = "CAMERA BLOCKED";
    else if (hc.status === "track") label = hc.headHigh ? "LAUNCH" : "LEAN TO MOVE";
    ctx.fillText(label, x, y - 8);
    ctx.restore();
  }

  function drawHud() {
    const lv = LEVELS[levelIndex];
    ctx.save();
    ctx.fillStyle = "rgba(8,6,16,0.4)";
    ctx.fillRect(0, 0, W, 56);
    ctx.font = "600 15px Cinzel, serif";
    ctx.fillStyle = "#f4d27a";
    ctx.textAlign = "left";
    ctx.fillText(lv ? lv.name : "", 24, 24);
    ctx.font = "italic 15px 'Cormorant Garamond', serif";
    ctx.fillStyle = "#e8d8b0";
    ctx.fillText(lv ? lv.myth : "", 24, 44);

    const lotus = images.lotus;
    for (let i = 0; i < 5; i++) {
      const x = W / 2 - 70 + i * 30;
      ctx.globalAlpha = i < hud.lives ? 1 : 0.18;
      if (lotus) ctx.drawImage(lotus, x, 10, 26, 26);
      else {
        ctx.fillStyle = "#f0c14a";
        ctx.beginPath();
        ctx.arc(x + 12, 24, 8, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;

    ctx.textAlign = "right";
    ctx.font = "700 18px Cinzel, serif";
    ctx.fillStyle = "#f4d27a";
    ctx.fillText(String(hud.score).padStart(6, "0"), W - 24, 26);
    ctx.font = "italic 14px 'Cormorant Garamond', serif";
    ctx.fillStyle = "#cbb48a";
    ctx.fillText("best  " + hud.best + "   ·   " + viewLabel(), W - 24, 46);
    ctx.restore();

    if (serving && hud.introT <= 0) {
      ctx.textAlign = "center";
      ctx.font = "italic 22px 'Cormorant Garamond', serif";
      ctx.fillStyle = "rgba(244,210,122," + (0.55 + Math.sin(time * 3) * 0.25) + ")";
      ctx.fillText("Raise your head or press Space to launch the pearl", W / 2, H - 110);
    }
    if (hud.combo >= 4) {
      ctx.textAlign = "center";
      ctx.font = "700 16px Cinzel, serif";
      ctx.fillStyle = "#7dff9a";
      ctx.fillText("COMBO ×" + hud.combo, W / 2, 70);
    }
    if (hud.bannerT > 0 && hud.banner) {
      ctx.globalAlpha = clamp(hud.bannerT, 0, 1);
      ctx.textAlign = "center";
      ctx.font = "700 28px Cinzel, serif";
      ctx.fillStyle = "#f4d27a";
      ctx.fillText(hud.banner, W / 2, 110);
      ctx.globalAlpha = 1;
    }
    if (paused) {
      ctx.fillStyle = "rgba(6,4,14,0.55)";
      ctx.fillRect(0, 0, W, H);
      ctx.textAlign = "center";
      ctx.fillStyle = "#f4d27a";
      ctx.font = "700 40px Cinzel, serif";
      ctx.fillText("PAUSED", W / 2, H / 2);
      ctx.font = "italic 18px 'Cormorant Garamond', serif";
      ctx.fillText("Esc to resume", W / 2, H / 2 + 36);
    }
  }

  function drawCenterCard(title, sub, hint) {
    ctx.fillStyle = "rgba(8,6,16,0.62)";
    ctx.fillRect(0, 0, W, H);
    ctx.textAlign = "center";
    ctx.fillStyle = "#f4d27a";
    ctx.font = "700 44px Cinzel, serif";
    ctx.fillText(title, W / 2, H / 2 - 10);
    ctx.font = "italic 22px 'Cormorant Garamond', serif";
    ctx.fillStyle = "#efe0b8";
    ctx.fillText(sub, W / 2, H / 2 + 28);
    ctx.font = "500 16px Cinzel, serif";
    ctx.fillStyle = "#cbb48a";
    ctx.fillText(hint, W / 2, H / 2 + 64);
  }

  function drawTitle() {
    ctx.fillStyle = "rgba(8,4,14,0.28)";
    ctx.fillRect(0, 0, W, H);
    const pulse = 0.72 + Math.sin(hud.titlePulse * 2) * 0.08;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(244,210,122," + pulse + ")";
    ctx.font = "700 72px Cinzel, serif";
    ctx.fillText("LOTUS BREAK", W / 2, 168);
    ctx.font = "italic 24px 'Cormorant Garamond', serif";
    ctx.fillStyle = "#efe0b8";
    ctx.fillText("Shatter the stained glass. Keep the pearl aloft.", W / 2, 214);
    ctx.font = "500 16px Cinzel, serif";
    ctx.fillStyle = "#cbb48a";
    ctx.fillText("Lean to move the golden barge   ·   Raise your head to launch", W / 2, 560);
    ctx.fillStyle = "#f4d27a";
    ctx.font = "700 20px Cinzel, serif";
    ctx.fillText("Press  Enter  to begin", W / 2, 610);
    ctx.font = "italic 14px 'Cormorant Garamond', serif";
    ctx.fillStyle = "#9a8860";
    ctx.fillText("F  resolution   ·   C  recalibrate   ·   M  mute   ·   best  " + hud.best, W / 2, 648);
  }

  function render() {
    const sx = (Math.random() - 0.5) * shake;
    const sy = (Math.random() - 0.5) * shake;
    applyView(sx, sy);
    ctx.clearRect(-20, -20, W + 40, H + 40);
    drawBg();

    if (state === STATE.TITLE) {
      applyView();
      drawTitle();
      return;
    }
    if (state === STATE.CALIBRATE) {
      applyView();
      drawCalibrate();
      return;
    }

    drawBricks();
    drawParticles();
    drawPowers();
    drawPaddle();
    for (const b of balls) drawBall(b);

    applyView();
    if (hud.flash > 0) {
      ctx.fillStyle = "rgba(180,30,50," + hud.flash * 0.45 + ")";
      ctx.fillRect(0, 0, W, H);
    }
    const vg = ctx.createRadialGradient(W / 2, H / 2, 220, W / 2, H / 2, 760);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.38)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);

    if (state === STATE.PLAY) {
      drawHud();
      drawHeadCam();
    } else if (state === STATE.CLEAR) {
      drawHud();
      drawCenterCard("WINDOW FREED", LEVELS[levelIndex].name, "The next pane awaits…");
    } else if (state === STATE.GAMEOVER) {
      drawCenterCard("THE PEARL FALLS", "Score  " + hud.score, "Enter to rise again  ·  Esc for title");
    } else if (state === STATE.WIN) {
      drawCenterCard("THE MANDALA IS OPEN", "Compassion outlasts every pane of glass", "Score  " + hud.score + "   ·   Enter for title");
    }
  }

  function onKey(e, down) {
    const code = e.code;
    if (["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"].includes(code)) e.preventDefault();
    keys[code] = down;
    keys[e.key] = down;
    if (!down) return;

    if (code === "KeyM") muted = !muted;
    if (code === "KeyC") {
      requestHeadCam();
      if (window.HeadCam && window.HeadCam.active) window.HeadCam.calibrate();
      return;
    }
    if (code === "KeyW") {
      openWinCamSettings();
      return;
    }
    if (code === "KeyF") {
      cycleResolution();
      return;
    }
    if (code === "F11") {
      e.preventDefault();
      if (!document.fullscreenElement) document.documentElement.requestFullscreen().catch(() => {});
      else document.exitFullscreen().catch(() => {});
      return;
    }
    if (state === STATE.TITLE && (code === "Enter" || code === "NumpadEnter" || code === "Space")) {
      beginCalibrate();
      return;
    }
    if (state === STATE.CALIBRATE && (code === "Enter" || code === "NumpadEnter" || code === "Space")) {
      startFromCalibrate();
      return;
    }
    if (state === STATE.CALIBRATE && code === "Escape") {
      setCamBar(false);
      state = STATE.TITLE;
      return;
    }
    if (state === STATE.PLAY && (code === "Space" || code === "Enter" || code === "NumpadEnter")) {
      launchAll();
      return;
    }
    if (state === STATE.CLEAR && (code === "Enter" || code === "Space")) {
      hud.bannerT = 0;
      return;
    }
    if (state === STATE.GAMEOVER && code === "Enter") {
      beginCalibrate();
      return;
    }
    if (state === STATE.WIN && code === "Enter") {
      state = STATE.TITLE;
      return;
    }
    if ((state === STATE.GAMEOVER || state === STATE.WIN) && code === "Escape") {
      state = STATE.TITLE;
      return;
    }
    if (code === "Escape" && state === STATE.PLAY) paused = !paused;
  }

  function loop(ts) {
    if (!last) last = ts;
    let dt = (ts - last) / 1000;
    last = ts;
    if (dt > 0.05) dt = 0.05;
    time += dt;
    update(dt);
    render();
    requestAnimationFrame(loop);
  }

  applyResolution();
  window.addEventListener("resize", applyResolution);
  document.addEventListener("fullscreenchange", applyResolution);
  window.addEventListener("keydown", (e) => {
    if (e.repeat) return;
    const startKey = e.code === "Enter" || e.code === "NumpadEnter" || e.code === "Space";
    if (startKey && (state === STATE.TITLE || state === STATE.CALIBRATE)) {
      e.preventDefault();
      e.stopPropagation();
      startFromCalibrate();
      return;
    }
    onKey(e, true);
  }, true);
  window.addEventListener("keyup", (e) => onKey(e, false));
  canvas.addEventListener("click", (ev) => {
    canvas.focus();
    ensureAudio();
    if (audio && audio.ctx.state === "suspended") audio.ctx.resume();
    const { gx, gy } = canvasPoint(ev);
    if (state === STATE.CALIBRATE) {
      if (hitBtn(camUi.settings, gx, gy)) { openWinCamSettings(); return; }
      if (hitBtn(camUi.retry, gx, gy)) { requestHeadCam(); return; }
      requestHeadCam();
      return;
    }
    if (state === STATE.TITLE) requestHeadCam();
    if (state === STATE.PLAY) launchAll();
  });

  const btnSet = document.getElementById("btn-cam-settings");
  const btnStart = document.getElementById("btn-cam-start");
  const btnPlay = document.getElementById("btn-cam-play");
  if (btnSet) {
    btnSet.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      openWinCamSettings();
    });
  }
  if (btnStart) {
    btnStart.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      requestHeadCam();
    });
  }
  if (btnPlay) {
    btnPlay.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      startFromCalibrate();
    });
  }

  loadAll()
    .then(() => {
      if (bootEl) bootEl.remove();
      canvas.focus();
      const params = new URLSearchParams(location.search);
      if (location.hash === "#play" || params.has("play")) startRun();
      requestAnimationFrame(loop);
    })
    .catch((err) => {
      if (bootEl) bootEl.textContent = "Missing art — run tools/process_assets.py";
      console.error(err);
      requestAnimationFrame(loop);
    });
})();
