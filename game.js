(() => {
  "use strict";
  const c = document.getElementById("c"),
    x = c.getContext("2d", { alpha: false }),
    $ = (i) => document.getElementById(i);
  const scoreEl = $("score"),
    comboEl = document.querySelector("#combo b"),
    timeEl = document.querySelector("#time b"),
    timeBox = $("time"),
    livesEl = $("livesVal"),
    pauseBtn = $("pauseBtn");
  const ovStart = $("ovStart"),
    ovPause = $("ovPause"),
    ovOver = $("ovOver"),
    ovSet = $("ovSet"),
    ovStat = $("ovStat"),
    ovAch = $("ovAch"),
    ovTut = $("ovTut"),
    ovCos = $("ovCos"),
    ovErr = $("errOv"),
    ovMsg = $("ovMsg"),
    ovGrade = $("ovGrade"),
    best0 = $("best0"),
    updEl = $("upd"),
    achEl = $("ach"),
    instBtn = $("instBtn");
  const OVS = [
    ovStart,
    ovPause,
    ovOver,
    ovSet,
    ovStat,
    ovAch,
    ovTut,
    ovCos,
    ovErr,
  ];
  const TAU = 6.283185307,
    ROUND = 60,
    ROWS = 3,
    MAXC = 4,
    COMBO_WIN = 1.5,
    GRACE = 1.5;
  const MENU = 0,
    PLAY = 1,
    PAUSE = 2,
    OVER = 3,
    CD = 4;
  let state = MENU,
    score = 0,
    combo = 0,
    lives = 3,
    timeLeft = ROUND,
    elapsed = 0,
    spawnT = 0,
    shake = 0,
    last = 0;
  function lsGet(k) {
    try {
      return localStorage.getItem(k);
    } catch (e) {
      return null;
    }
  }
  function lsSet(k, v) {
    try {
      localStorage.setItem(k, v);
    } catch (e) {}
  }
  function clamp(n, a, b) {
    n = +n;
    if (!isFinite(n)) return a;
    return n < a ? a : n > b ? b : n;
  }
  function lsNum(k, d, a, b) {
    const n = parseFloat(lsGet(k));
    return isFinite(n) ? clamp(n, a, b) : d;
  }
  function lsFlag(k, d) {
    const v = lsGet(k);
    if (v === "0") return false;
    if (v === "1") return true;
    return !!d;
  }
  (function migrate() {
    const v = lsNum("wam_ver", 0, 0, 99) | 0;
    if (v < 8) {
      if (v < 5 && lsGet("wam_snd") === "0") {
        if (lsGet("wam_mus") === null) lsSet("wam_mus", "0");
        if (lsGet("wam_sfx") === null) lsSet("wam_sfx", "0");
      }
      lsSet("wam_ver", "8");
    }
  })();
  let dl = lsNum("wam_diff", 1, 0, 2) | 0;
  const DM = [0.7, 1, 1.35],
    DU = [1.3, 1, 0.85],
    DN = ["EASY", "NORMAL", "HARD"];
  const bk = () => (dl === 1 ? "wam_best" : "wam_best_" + dl);
  let best = lsNum(bk(), 0, 0, 1e9) | 0;
  const oldSnd = lsGet("wam_snd");
  let musV = lsNum("wam_mus", oldSnd === "0" ? 0 : 0.45, 0, 1);
  let sfxV = lsNum("wam_sfx", oldSnd === "0" ? 0 : 0.85, 0, 1);
  let hap = lsFlag("wam_hap", true);
  let shakeOn = lsFlag("wam_shk", true);
  let rmMode = lsNum("wam_rm", 0, 0, 2) | 0;
  let theme = lsNum("wam_theme", 0, 0, 1) | 0;
  let cbMode = lsFlag("wam_cb", false);
  let skin = lsNum("wam_skin", 0, 0, 3) | 0;
  let board = lsNum("wam_board", 0, 0, 1) | 0;
  let osReduced = false;
  try {
    osReduced = !!(
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  } catch (e) {}
  function reduced() {
    if (rmMode === 1) return true;
    if (rmMode === 2) return false;
    return osReduced;
  }
  const shk = (v) => (reduced() || !shakeOn ? 0 : v);
  let W = 0,
    H = 0,
    DPR = 1,
    cell = 60,
    rh = 18,
    mr = 14,
    bx = 0,
    by = 0,
    gridC = 3,
    gridT = 3;
  let bgSky = null,
    bgHill = null,
    vigC = null,
    iceC = null,
    hurtC = null,
    holeG = null,
    moleG = null,
    bombG = null,
    goldG = null;
  const safe = { t: 0, r: 0, b: 0, l: 0 };
  const holes = [];
  for (let j = 0; j < ROWS; j++)
    for (let i = 0; i < MAXC; i++)
      holes.push({
        i,
        j,
        cx: 0,
        cy: 0,
        st: "empty",
        t: 0,
        dur: 0,
        type: 0,
        hitT: 0,
        sq: 0,
        on: i < 3,
        hp: 0,
      });
  const fx = [],
    fxPool = [],
    parts = [],
    pPool = [],
    swings = [],
    swPool = [];
  const CCOLS = ["#ffd257", "#ff7a3a", "#7fdcff", "#68e08a", "#e0708a", "#fff"];
  let partCap = 120;
  const probe = document.createElement("div");
  probe.style.cssText =
    "position:fixed;top:0;left:0;width:0;height:0;pointer-events:none;padding-top:env(safe-area-inset-top);padding-right:env(safe-area-inset-right);padding-bottom:env(safe-area-inset-bottom);padding-left:env(safe-area-inset-left)";
  document.body.appendChild(probe);
  function readSafe() {
    const s = getComputedStyle(probe);
    safe.t = parseFloat(s.paddingTop) || 0;
    safe.r = parseFloat(s.paddingRight) || 0;
    safe.b = parseFloat(s.paddingBottom) || 0;
    safe.l = parseFloat(s.paddingLeft) || 0;
  }
  function makeOff(w, h) {
    const o = document.createElement("canvas");
    o.width = Math.max(1, Math.round(w));
    o.height = Math.max(1, Math.round(h));
    return o;
  }
  function rebuildBg() {
    const pw = Math.max(1, Math.round(W * DPR)),
      ph = Math.max(1, Math.round(H * DPR));
    bgSky = makeOff(pw, ph);
    const s = bgSky.getContext("2d");
    s.setTransform(DPR, 0, 0, DPR, 0, 0);
    const g = s.createLinearGradient(0, 0, 0, H);
    if (theme) {
      g.addColorStop(0, "#243656");
      g.addColorStop(0.5, "#10182a");
      g.addColorStop(1, "#07090d");
    } else if (board === 1) {
      g.addColorStop(0, "#3a2210");
      g.addColorStop(0.45, "#1a1008");
      g.addColorStop(1, "#0a0604");
    } else {
      g.addColorStop(0, "#1a2a44");
      g.addColorStop(0.45, "#0e1624");
      g.addColorStop(1, "#07090d");
    }
    s.fillStyle = g;
    s.fillRect(0, 0, W, H);
    s.fillStyle = "#dce7ff";
    for (let i = 0; i < 48; i++) {
      const sx = (i * 97 + 13) % W,
        sy = (i * 53 + 29) % (H * 0.55);
      s.globalAlpha = 0.15 + ((i * 17) % 10) * 0.04;
      s.beginPath();
      s.arc(sx, sy, 0.8 + (i % 3) * 0.5, 0, TAU);
      s.fill();
    }
    s.globalAlpha = 1;
    s.fillStyle = "#e8eefc";
    moonR = Math.min(W, H) * 0.06;
    const minMoon = (hudBottom > 0 ? hudBottom : H * 0.2) + 1.2 * moonR;
    moonY = Math.max(minMoon, moonR + 2);
    s.beginPath();
    s.arc(W * 0.82, moonY, moonR, 0, TAU);
    s.fill();
    bgHill = makeOff(pw, ph);
    const hctx = bgHill.getContext("2d");
    hctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    hctx.fillStyle = theme ? "#1a2a1c" : board === 1 ? "#2a1810" : "#121a14";
    hctx.beginPath();
    hctx.moveTo(0, H);
    for (let i = 0; i <= 16; i++) {
      const px = (i / 16) * W,
        py = H * 0.62 + Math.sin(i * 0.9) * H * 0.04;
      hctx.lineTo(px, py);
    }
    hctx.lineTo(W, H);
    hctx.fill();
    hctx.fillStyle = theme ? "#0f1c12" : board === 1 ? "#1a0e08" : "#0c140e";
    hctx.beginPath();
    hctx.moveTo(0, H);
    for (let i = 0; i <= 16; i++) {
      const px = (i / 16) * W,
        py = H * 0.72 + Math.sin(i * 1.3 + 1) * H * 0.05;
      hctx.lineTo(px, py);
    }
    hctx.lineTo(W, H);
    hctx.fill();
    vigC = makeOff(pw, ph);
    const v = vigC.getContext("2d");
    v.setTransform(DPR, 0, 0, DPR, 0, 0);
    const vg = v.createRadialGradient(
      W * 0.5,
      H * 0.45,
      Math.min(W, H) * 0.2,
      W * 0.5,
      H * 0.5,
      Math.max(W, H) * 0.72,
    );
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, theme ? "rgba(0,0,0,.35)" : "rgba(0,0,0,.55)");
    v.fillStyle = vg;
    v.fillRect(0, 0, W, H);
    iceC = makeOff(pw, ph);
    const ic = iceC.getContext("2d");
    ic.setTransform(DPR, 0, 0, DPR, 0, 0);
    const ig = ic.createRadialGradient(
      W * 0.5,
      H * 0.5,
      Math.min(W, H) * 0.25,
      W * 0.5,
      H * 0.5,
      Math.max(W, H) * 0.7,
    );
    ig.addColorStop(0, "rgba(180,230,255,0)");
    ig.addColorStop(1, "rgba(140,220,255,.4)");
    ic.fillStyle = ig;
    ic.fillRect(0, 0, W, H);
    hurtC = makeOff(pw, ph);
    const hc = hurtC.getContext("2d");
    hc.setTransform(DPR, 0, 0, DPR, 0, 0);
    const hg = hc.createRadialGradient(
      W * 0.5,
      H * 0.5,
      Math.min(W, H) * 0.2,
      W * 0.5,
      H * 0.5,
      Math.max(W, H) * 0.7,
    );
    hg.addColorStop(0, "rgba(255,0,0,0)");
    hg.addColorStop(1, "rgba(255,40,50,.5)");
    hc.fillStyle = hg;
    hc.fillRect(0, 0, W, H);
  }
  function layout() {
    const land = W > H;
    const padX = Math.max(14, W * 0.05);
    const padTop = (land ? 64 : 104) + safe.t;
    const padBot = 28 + safe.b;
    const availW = W - padX * 2 - safe.l - safe.r,
      availH = Math.max(80, H - padTop - padBot);
    const gc = Math.max(3, gridC);
    cell = Math.max(42, Math.min(availW / gc, availH / ROWS));
    const bw = cell * gc,
      bh = cell * ROWS;
    bx = safe.l + (W - safe.l - safe.r - bw) / 2;
    by = padTop + Math.max(0, (availH - bh) / 2);
    rh = cell * 0.3;
    mr = cell * 0.235;
    for (const h of holes) {
      h.cx = bx + (h.i + 0.5) * cell;
      h.cy = by + (h.j + 0.62) * cell;
      h.on = h.i < 3 || gridC >= 3.5;
    }
  }
  function buildGrads() {
    holeG = x.createRadialGradient(0, -rh * 0.15, rh * 0.05, 0, 0, rh * 1.05);
    holeG.addColorStop(0, theme ? "#3a2814" : "#281a09");
    holeG.addColorStop(0.7, "#150d04");
    holeG.addColorStop(1, "#060302");
    moleG = x.createRadialGradient(
      -mr * 0.35,
      -mr * 0.45,
      mr * 0.1,
      0,
      0,
      mr * 1.15,
    );
    moleG.addColorStop(0, theme ? "#e0b07a" : "#bd8d61");
    moleG.addColorStop(0.55, "#8a5a34");
    moleG.addColorStop(1, "#5a3620");
    bombG = x.createRadialGradient(
      -mr * 0.35,
      -mr * 0.4,
      mr * 0.08,
      0,
      0,
      mr * 1.15,
    );
    bombG.addColorStop(0, theme ? "#7a8498" : "#4c5568");
    bombG.addColorStop(1, "#141822");
    goldG = x.createRadialGradient(
      -mr * 0.3,
      -mr * 0.4,
      mr * 0.08,
      0,
      0,
      mr * 1.1,
    );
    goldG.addColorStop(0, "#fff1a8");
    goldG.addColorStop(0.5, "#ffd257");
    goldG.addColorStop(1, "#c47a12");
  }
  function cacheHud() {
    hudBottom = 0;
    try {
      const el = $("hud");
      if (el) {
        const r = el.getBoundingClientRect();
        if (r && r.bottom > 0) hudBottom = r.bottom;
      }
    } catch (e) {}
  }
  function applyDpr() {
    const cap = lowQ ? 1.5 : 2;
    const nd = Math.min(window.devicePixelRatio || 1, cap);
    if (Math.abs(nd - DPR) < 0.01 && c.width) return;
    DPR = nd;
    c.width = Math.round(W * DPR);
    c.height = Math.round(H * DPR);
    c.style.width = W + "px";
    c.style.height = H + "px";
    layout();
    buildGrads();
    cacheHud();
    rebuildBg();
  }
  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    applyDpr();
    readSafe();
    layout();
    buildGrads();
    cacheHud();
    rebuildBg();
  }
  let AC = null,
    master = null,
    musG = null,
    sfxG = null,
    bassG = null,
    hatG = null,
    leadG = null,
    voices = 0,
    musTimer = 0,
    musNext = 0,
    duckT = 0;
  const MAX_VOICES = 12;
  const NOTES = [110, 110, 165, 131, 110, 110, 196, 165];
  const LEAD = [220, 330, 262, 392, 330, 262, 440, 330];
  function rampG(g, v, t) {
    if (!g || !AC) return;
    const now = AC.currentTime;
    try {
      g.gain.cancelScheduledValues(now);
      g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), now);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0001, v), now + t);
    } catch (e) {
      g.gain.value = v;
    }
  }
  function actx() {
    if (!AC) {
      try {
        AC = new (window.AudioContext || window.webkitAudioContext)();
        master = AC.createGain();
        master.gain.value = 0.9;
        const comp = AC.createDynamicsCompressor();
        comp.threshold.value = -24;
        comp.knee.value = 12;
        comp.ratio.value = 4;
        comp.attack.value = 0.003;
        comp.release.value = 0.12;
        musG = AC.createGain();
        bassG = AC.createGain();
        hatG = AC.createGain();
        leadG = AC.createGain();
        sfxG = AC.createGain();
        musG.gain.value = musV;
        bassG.gain.value = 1;
        hatG.gain.value = 0.0001;
        leadG.gain.value = 0.0001;
        sfxG.gain.value = sfxV;
        bassG.connect(musG);
        hatG.connect(musG);
        leadG.connect(musG);
        musG.connect(master);
        sfxG.connect(master);
        master.connect(comp);
        comp.connect(AC.destination);
      } catch (e) {
        AC = null;
      }
    }
    if (AC && AC.state === "suspended") AC.resume();
    if (musG) musG.gain.value = musV * (duckT > 0 ? 0.7 : 1);
    if (sfxG) sfxG.gain.value = sfxV;
    return AC;
  }
  function toneWhen(bus, type, f0, f1, dur, vol, when) {
    if (vol <= 0 || !bus) return;
    if ((bus === sfxG && sfxV <= 0) || (bus === musG && musV <= 0)) return;
    const a = actx();
    if (!a) return;
    if (voices >= MAX_VOICES) return;
    voices++;
    const t = when;
    const o = a.createOscillator(),
      g = a.createGain();
    o.type = type;
    o.frequency.setValueAtTime(Math.max(1, f0), t);
    if (f1 !== f0)
      o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(bus);
    o.onended = () => {
      voices = Math.max(0, voices - 1);
    };
    o.start(t);
    o.stop(t + dur + 0.04);
  }
  function tone(bus, type, f0, f1, dur, vol, delay) {
    const a = actx();
    if (!a) return;
    toneWhen(bus, type, f0, f1, dur, vol, a.currentTime + (delay || 0));
  }
  function noise(dur, vol, delay) {
    if (sfxV <= 0) return;
    const a = actx();
    if (!a || !sfxG) return;
    if (voices >= MAX_VOICES) return;
    voices++;
    const t = a.currentTime + (delay || 0),
      n = Math.max(1, Math.floor(a.sampleRate * dur));
    const b = a.createBuffer(1, n, a.sampleRate),
      d = b.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = a.createBufferSource(),
      g = a.createGain();
    s.buffer = b;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(Math.max(0.0001, vol), t + 0.008);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(g);
    g.connect(sfxG);
    s.onended = () => {
      voices = Math.max(0, voices - 1);
    };
    s.start(t);
  }
  function tickMus() {
    if (state !== PLAY || musV <= 0 || !AC) return;
    const t = AC.currentTime;
    if (musNext < t) musNext = t + 0.02;
    const look = t + 0.12;
    const step = Math.max(0.18, 0.3 - 0.08 * diff() - (dl === 2 ? 0.04 : 0));
    const wantHat = combo >= 3 ? 0.35 : 0.0001;
    const wantLead = combo >= 6 || frenzyT > 0 ? 0.28 : 0.0001;
    rampG(hatG, wantHat, 0.08);
    rampG(leadG, wantLead, 0.08);
    while (musNext <= look) {
      const i = mi++ % 8;
      toneWhen(bassG, "triangle", NOTES[i], NOTES[i], 0.16, 0.22, musNext);
      if (hatG && hatG.gain.value > 0.05)
        toneWhen(hatG, "square", 2400, 1800, 0.04, 0.07, musNext);
      if (leadG && leadG.gain.value > 0.05)
        toneWhen(leadG, "sine", LEAD[i], LEAD[i], 0.14, 0.16, musNext);
      musNext += step;
    }
  }
  function startMus() {
    if (musV <= 0) return;
    const a = actx();
    if (!a) return;
    musNext = a.currentTime + 0.05;
    if (hatG) hatG.gain.value = 0.0001;
    if (leadG) leadG.gain.value = 0.0001;
    if (!musTimer) musTimer = setInterval(tickMus, 25);
  }
  function stopMus() {
    if (musTimer) {
      clearInterval(musTimer);
      musTimer = 0;
    }
    musNext = 0;
  }
  function duckMus() {
    duckT = 0.15;
    if (musG && AC) {
      const now = AC.currentTime;
      try {
        musG.gain.cancelScheduledValues(now);
        musG.gain.setValueAtTime(Math.max(0.0001, musV * 0.7), now);
        musG.gain.exponentialRampToValueAtTime(
          Math.max(0.0001, musV),
          now + 0.15,
        );
      } catch (e) {}
    }
  }
  function sfx(k) {
    if (sfxV <= 0) return;
    switch (k) {
      case "hit":
        tone(sfxG, "square", 680 + Math.min(combo, 20) * 25, 190, 0.11, 0.2);
        break;
      case "gold":
        tone(sfxG, "sine", 880, 1400, 0.16, 0.16);
        break;
      case "combo":
        tone(sfxG, "sine", 900, 1900, 0.13, 0.14);
        break;
      case "thud":
        tone(sfxG, "sine", 90, 48, 0.14, 0.1);
        break;
      case "miss":
        tone(sfxG, "sawtooth", 320, 70, 0.28, 0.15);
        break;
      case "bomb":
        noise(0.3, 0.32, 0);
        tone(sfxG, "sawtooth", 220, 40, 0.35, 0.18);
        break;
      case "over":
        tone(sfxG, "square", 500, 80, 0.5, 0.16);
        tone(sfxG, "sine", 300, 60, 0.7, 0.12, 0.1);
        break;
      case "pow":
        tone(sfxG, "sine", 600, 1300, 0.18, 0.14);
        break;
      case "ui":
        tone(sfxG, "sine", 520, 760, 0.06, 0.1);
        break;
      case "tick":
        tone(sfxG, "square", 880, 880, 0.05, 0.09);
        break;
      case "frenzy":
        tone(sfxG, "square", 400, 900, 0.2, 0.12);
        break;
      case "clang":
        tone(sfxG, "square", 1200, 520, 0.09, 0.14);
        break;
    }
  }
  function mulberry32(a) {
    return function () {
      a |= 0;
      a = (a + 0x6d2b79f5) | 0;
      let t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function dateSeed() {
    const d = new Date();
    return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
  }
  function isoWeekId() {
    const d = new Date();
    const t = new Date(d.getFullYear(), d.getMonth(), d.getDate());
    const day = t.getDay() || 7;
    t.setDate(t.getDate() + 4 - day);
    const y = t.getFullYear();
    const y1 = new Date(y, 0, 1);
    const week = Math.ceil(((t - y1) / 86400000 + 1) / 7);
    return y * 100 + week;
  }
  function prevYmd(ymd) {
    const y = (ymd / 10000) | 0,
      m = ((ymd / 100) | 0) % 100,
      d = ymd % 100;
    const dt = new Date(y, m - 1, d);
    dt.setDate(dt.getDate() - 1);
    return dt.getFullYear() * 10000 + (dt.getMonth() + 1) * 100 + dt.getDate();
  }
  let rngT = Math.random,
    rngC = Math.random,
    isDaily = false,
    isWk = false,
    wkId = 0,
    wkMod = 0,
    lastGrade = "";
  let freezeT = 0,
    cd = 0,
    flash = 0,
    fc = "#fff",
    hits = 0,
    shots = 0,
    maxC = 0,
    mi = 0,
    lowQ = false,
    comboT = 0,
    frenzyT = 0,
    nextFrenzy = 20,
    hurt = 0,
    ice = 0,
    tickS = 11,
    bannerT = 0,
    bannerTxt = "",
    pausedFrom = PLAY,
    pausedCd = 0,
    mx = -1,
    my = -1,
    finePtr = false,
    lastTouchT = -1e9,
    ended = false,
    scoreShow = 0,
    setFrom = MENU,
    graceT = 0,
    hitStop = 0,
    punch = 0,
    assist = false,
    earlyLost = 0,
    frenzyHits = 0,
    playAcc = 0,
    isZen = false,
    isTut = false,
    tutStep = 0,
    gpIdx = -1,
    holeSel = 4,
    accu = 0,
    rafId = 0,
    fatal = false,
    wake = null,
    resetArm = 0,
    dblT = 0,
    bossDone = 0,
    pendingMode = 0,
    showFps = false,
    lastAnn = 0,
    mileN = 0,
    loopSteps = 0,
    inputMode = "ptr",
    ringA = 0,
    kbSeen = false,
    hudBottom = 0,
    moonY = 0,
    moonR = 0;
  try {
    finePtr = !!(
      window.matchMedia && window.matchMedia("(pointer:fine)").matches
    );
  } catch (e) {}
  const fl = (v, col) => {
    if (!reduced()) {
      flash = v;
      fc = col;
    }
  };
  function vib(ms) {
    if (!hap || reduced()) return;
    try {
      if (navigator.vibrate) navigator.vibrate(ms);
    } catch (e) {}
  }
  function vibPat(k) {
    if (!hap || reduced()) return;
    const p =
      k === "hit"
        ? [12]
        : k === "bomb"
          ? [40, 30, 80]
          : k === "life"
            ? [80, 40, 80]
            : k === "boss"
              ? [30, 40, 30, 40, 90]
              : k === "best"
                ? [20, 30, 20, 30, 60]
                : [15];
    try {
      if (navigator.vibrate) navigator.vibrate(p);
    } catch (e) {}
  }
  function announce(msg) {
    const now = performance.now();
    if (now - lastAnn < 2000) return;
    lastAnn = now;
    const el = $("srLive");
    if (el) el.textContent = msg;
  }
  function diff() {
    return Math.min(1, elapsed / 42);
  }
  function spawnInt() {
    let d = isZen ? 0.5 : diff();
    const base = (0.8 - 0.48 * d + rngT() * 0.18) / (isZen ? 1 : DM[dl]);
    let v = frenzyT > 0 && !isZen ? base * 0.45 : base;
    if (assist) v *= 1.1;
    if (isZen && v < 0.55) v = 0.55;
    if (isWk) {
      if (wkMod === 1) v *= 0.85;
      else if (wkMod === 2) v *= 1.08;
    }
    return v;
  }
  function grab(pool) {
    return pool.pop() || {};
  }
  function addFx(px, py, txt, col) {
    const f = grab(fxPool);
    f.x = px;
    f.y = py;
    f.t = 0;
    f.d = 0.8;
    f.txt = txt;
    f.col = col;
    f.ring = 0;
    f.stars = 0;
    fx.push(f);
  }
  function addRing(px, py, col) {
    const f = grab(fxPool);
    f.x = px;
    f.y = py;
    f.t = 0;
    f.d = 0.4;
    f.txt = "";
    f.col = col;
    f.ring = 1;
    f.stars = 0;
    fx.push(f);
  }
  function addStars(px, py) {
    const f = grab(fxPool);
    f.x = px;
    f.y = py;
    f.t = 0;
    f.d = 0.35;
    f.txt = "";
    f.col = "#ffe680";
    f.ring = 0;
    f.stars = 1;
    fx.push(f);
  }
  function burst(px, py, col, n, kind) {
    if (reduced()) return;
    n = lowQ ? n >> 1 : n;
    for (let i = 0; i < n && parts.length < partCap; i++) {
      const p = grab(pPool);
      const a = Math.random() * TAU,
        sp = cell * (0.5 + Math.random() * 1.4);
      p.x = px;
      p.y = py;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp - cell * 0.45;
      p.t = 0;
      p.d = 0.4 + Math.random() * 0.35;
      p.col = col;
      p.k = kind || 0;
      p.sz = 2 + Math.random() * 3;
      parts.push(p);
    }
  }
  function confetti(px, py, n) {
    if (reduced()) return;
    n = Math.min(n, partCap - parts.length);
    for (let i = 0; i < n; i++) {
      const p = grab(pPool);
      const a = Math.random() * TAU,
        sp = cell * (0.8 + Math.random() * 2);
      p.x = px;
      p.y = py;
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp - cell;
      p.t = 0;
      p.d = 0.8 + Math.random() * 0.5;
      p.col = CCOLS[i % CCOLS.length];
      p.k = 2;
      p.sz = 3 + Math.random() * 4;
      parts.push(p);
    }
  }
  function addSwing(px, py) {
    const s = grab(swPool);
    s.x = px;
    s.y = py;
    s.t = 0;
    s.d = reduced() ? 0.08 : 0.18;
    swings.push(s);
  }
  const ACHD = [
    ["first", "First Whack", "Land a hit"],
    ["roll", "On a Roll", "Reach x3 multiplier"],
    ["fire", "On Fire", "Reach x6 multiplier"],
    ["unstop", "Unstoppable", "Reach x9 multiplier"],
    ["half", "Half Grand", "Score 500 in one game"],
    ["grid", "Grid Unlocked", "Expand the field at 1500"],
    ["frenzy", "Frenzy Hit", "Score during Frenzy"],
    ["life", "Lifesaver", "Catch a heart"],
    ["ice", "Ice Cold", "Catch a freeze"],
    ["daily", "Daily Grind", "Finish a Daily Challenge"],
    ["sharp", "Sharpshooter", "80% accuracy and 20 hits"],
    ["untouch", "Untouchable", "Finish with 3 or more lives"],
    ["helm", "Helmet Breaker", "Finish a helmet mole"],
    ["pfz", "Perfect Frenzy", "8 or more hits in one Frenzy"],
    ["streak", "Daily Streak 3", "Finish Daily 3 days in a row"],
    ["mar", "Marathon", "Play 25 games"],
  ];
  let achMap = {};
  try {
    const raw = JSON.parse(lsGet("wam_ach") || "{}");
    if (raw && typeof raw === "object") {
      for (let i = 0; i < ACHD.length; i++) {
        const id = ACHD[i][0];
        if (raw[id] === 1 || raw[id] === true) achMap[id] = 1;
      }
    }
  } catch (e) {
    achMap = {};
  }
  const achQ = [];
  function unlock(id) {
    if (isZen && id !== "first") return;
    if (isTut) return;
    if (achMap[id]) return;
    achMap[id] = 1;
    lsSet("wam_ach", JSON.stringify(achMap));
    const row = ACHD.find((a) => a[0] === id);
    achQ.push(row ? row[1] : id);
    if (achEl.classList.contains("hide")) showAch();
  }
  function showAch() {
    if (!achQ.length) {
      achEl.classList.add("hide");
      return;
    }
    achEl.textContent = "ACHIEVEMENT: " + achQ.shift();
    achEl.classList.remove("hide");
    setTimeout(showAch, 2200);
  }
  let stats = {
    games: 0,
    hits: 0,
    shots: 0,
    bestCombo: 0,
    playTime: 0,
    dailyStreak: 0,
    lastDaily: 0,
  };
  try {
    const raw = JSON.parse(lsGet("wam_stats") || "{}");
    if (raw && typeof raw === "object") {
      stats.games = clamp(raw.games, 0, 1e9) | 0;
      stats.hits = clamp(raw.hits, 0, 1e9) | 0;
      stats.shots = clamp(raw.shots, 0, 1e9) | 0;
      stats.bestCombo = clamp(raw.bestCombo, 0, 1e6) | 0;
      stats.playTime = clamp(raw.playTime, 0, 1e9) | 0;
      stats.dailyStreak = clamp(raw.dailyStreak, 0, 1e6) | 0;
      stats.lastDaily = clamp(raw.lastDaily, 0, 3e7) | 0;
    }
  } catch (e) {}
  function saveStats() {
    lsSet("wam_stats", JSON.stringify(stats));
  }
  function dailyKey() {
    return "wam_daily_" + dateSeed() + "_" + dl;
  }
  function dailyBest() {
    return lsNum(dailyKey(), 0, 0, 1e9) | 0;
  }
  function weekKey(id) {
    return "wam_wk_" + (id || wkId || isoWeekId());
  }
  function weekBest() {
    return lsNum(weekKey(), 0, 0, 1e9) | 0;
  }
  function pruneWeeks() {
    const cur = isoWeekId();
    const keep = {};
    for (let i = 0; i < 4; i++) {
      let y = (cur / 100) | 0,
        w = cur % 100;
      w -= i;
      while (w < 1) {
        y--;
        w += 52;
      }
      keep["wam_wk_" + (y * 100 + w)] = 1;
    }
    try {
      const drop = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf("wam_wk_") === 0 && !keep[k]) drop.push(k);
      }
      for (let i = 0; i < drop.length; i++) localStorage.removeItem(drop[i]);
    } catch (e) {}
  }
  function runGrade(sc, acc, mx, zen) {
    if (zen) {
      if (sc >= 4000) return "S";
      if (sc >= 2500) return "A";
      if (sc >= 1200) return "B";
      if (sc >= 500) return "C";
      return "D";
    }
    if (sc >= 2500 && acc >= 0.85 && mx >= 9) return "S";
    if (sc >= 1500 && acc >= 0.7) return "A";
    if (sc >= 800) return "B";
    if (sc >= 300) return "C";
    return "D";
  }
  function setGradeEl(g) {
    lastGrade = g || "";
    if (!ovGrade) return;
    if (!g) {
      ovGrade.textContent = "";
      ovGrade.className = "grade hide";
      ovGrade.setAttribute("aria-hidden", "true");
      return;
    }
    ovGrade.textContent = g;
    ovGrade.className = "grade g" + g.toLowerCase();
    ovGrade.removeAttribute("aria-hidden");
  }
  function helmUp() {
    for (let i = 0; i < holes.length; i++)
      if (holes[i].on && holes[i].st !== "empty" && holes[i].type === 5)
        return true;
    return false;
  }
  function trySpawn() {
    const interval = spawnInt();
    const idx = (rngC() * holes.length) | 0;
    const r = rngC();
    const durR = rngC();
    spawnT = interval;
    const d = diff();
    const max = (1 + Math.floor(d * 3) + (frenzyT > 0 ? 2 : 0)) | 0;
    let active = 0;
    for (let i = 0; i < holes.length; i++) {
      const hh = holes[i];
      if (hh.on && hh.st !== "empty") active++;
    }
    const h = holes[idx];
    if (!h || !h.on || h.st !== "empty" || active >= max) return;
    let b = d * 0.16 * DM[dl];
    if (isWk && wkMod === 0) b *= 1.35;
    let type = 0;
    if (r < b) type = 1;
    else if (r < b + 0.06) type = 2;
    else if (r < b + 0.09) type = 3;
    else if (r < b + 0.12) type = 4;
    else if (r < b + 0.15) type = 6;
    else if (r < b + 0.21) type = 5;
    if (
      !isZen &&
      !isTut &&
      dl > 0 &&
      !bossDone &&
      elapsed >= 40 &&
      elapsed < 42
    )
      type = 7;
    if (isZen && type === 1) type = 0;
    if (isWk && wkMod === 3 && type === 1) type = 0;
    if (isTut) {
      if (tutStep === 0) type = 0;
      else if (tutStep === 1) type = 1;
      else if (tutStep === 2) type = 3;
    }
    if (type === 3 && lives >= 5) type = 0;
    if (
      type === 5 &&
      (elapsed < 25 || helmUp() || isZen || (isWk && wkMod === 2))
    )
      type = 0;
    if (type === 6 && (dblT > 0 || isZen || isTut)) type = 0;
    if (type === 7 && (isZen || isTut || dl === 0 || elapsed < 40 || bossDone))
      type = 0;
    h.type = type;
    h.hp = type === 7 ? 5 : type === 5 ? 2 : 1;
    h.st = "rise";
    h.t = 0;
    h.sq = 0;
    h.hitT = 0;
    h.dur =
      (1.2 - 0.65 * d + durR * 0.25) *
      DU[dl] *
      (h.type === 2 ? 0.7 : h.type === 7 ? 1.8 : 1);
    if (type === 7) {
      bossDone = 1;
      banner("BOSS");
      duckMus();
      sfx("frenzy");
      announce("Boss mole");
    }
  }
  function banner(t) {
    bannerTxt = t;
    bannerT = 1.15;
  }
  function lostLife() {
    if (elapsed < 15) earlyLost++;
    if (!isDaily && !isWk && dl === 1 && earlyLost >= 2) assist = true;
  }
  function escaped(h) {
    h.st = "empty";
    h.sq = 0;
    h.hp = 0;
    if (h.type !== 0 && h.type !== 5 && h.type !== 7) return;
    if (graceT > 0 || isTut) return;
    combo = 0;
    comboT = 0;
    lives--;
    lostLife();
    hurt = 1;
    sfx("miss");
    vibPat("life");
    announce("Life lost. " + lives + " left");
    if (lives <= 0) gameOver("OUT OF LIVES");
  }
  function scoreHit(h, py, t, extra) {
    hits++;
    combo++;
    comboT = COMBO_WIN;
    maxC = Math.max(maxC, combo);
    stats.bestCombo = Math.max(stats.bestCombo, combo);
    const mult = Math.min(1 + Math.floor(combo / 3), 9);
    const pts = 10 * mult * extra * (frenzyT > 0 ? 2 : 1) * (dblT > 0 ? 2 : 1);
    score += pts;
    shake = Math.max(shake, shk(5));
    if (t === 2) sfx("gold");
    else sfx("hit");
    vibPat("hit");
    const mn = (score / 250) | 0;
    if (mn > mileN) {
      mileN = mn;
      announce("Score " + score);
    }
    if (mult === 3) unlock("roll");
    if (mult === 6) unlock("fire");
    if (mult === 9) {
      unlock("unstop");
      if (!reduced()) hitStop = 0.04;
    }
    if (combo === 3 || combo === 6 || combo === 9) {
      if (t !== 2) sfx("combo");
      banner("x" + combo);
      fl(0.16, "#ffd257");
      punch = 1;
    }
    addFx(h.cx, py, "+" + pts, t === 2 ? "#ffe680" : "#ffd257");
    burst(h.cx, h.cy, t === 2 ? "#ffd257" : "#c9925f", t === 2 ? 20 : 10, 0);
    if (frenzyT > 0) {
      frenzyHits++;
      unlock("frenzy");
      if (frenzyHits >= 8) unlock("pfz");
    }
    unlock("first");
    if (isTut && t === 0) tutStep = Math.max(tutStep, 1);
    if (score >= 500) unlock("half");
    if (!reduced()) {
      comboEl.parentNode.classList.remove("pulse");
      void comboEl.offsetWidth;
      comboEl.parentNode.classList.add("pulse");
    }
    if (score > 1500 && gridT < 4) {
      gridT = 4;
      banner("WIDE FIELD");
      unlock("grid");
    }
  }
  function doHit(h) {
    const py = h.cy - cell * 0.35,
      t = h.type;
    addRing(h.cx, h.cy, "#fff");
    addStars(h.cx, h.cy - mr);
    burst(h.cx, h.cy, "#c4a070", 6, 1);
    if (t === 1) {
      h.st = "hit";
      h.hitT = 0.16;
      h.sq = 0.18;
      if (isTut) {
        tutStep = Math.max(tutStep, 1);
        banner("AVOID BOMBS");
        sfx("bomb");
        return;
      }
      combo = 0;
      comboT = 0;
      lives--;
      lostLife();
      timeLeft = Math.max(0, timeLeft - 2);
      shake = shk(16);
      sfx("bomb");
      duckMus();
      vibPat("bomb");
      announce("Life lost. " + lives + " left");
      fl(0.3, "#ff5566");
      hurt = 1;
      if (!reduced()) hitStop = 0.04;
      addFx(h.cx, py, "-2s", "#ff5566");
      burst(h.cx, h.cy, "#ff5566", 18, 0);
      if (lives <= 0) return gameOver("OUT OF LIVES");
      return;
    }
    if ((t === 5 || t === 7) && h.hp > 1) {
      h.hp--;
      h.sq = 0.2;
      sfx("clang");
      vib(18);
      addFx(h.cx, py, t === 7 ? String(h.hp) : "CLANG", "#c8d0dc");
      burst(h.cx, h.cy, t === 7 ? "#ff7a3a" : "#9aa3b2", 8, 0);
      if (t === 7) duckMus();
      return;
    }
    h.st = "hit";
    h.hitT = 0.16;
    h.sq = 0.18;
    if (t === 3) {
      lives = Math.min(5, lives + 1);
      sfx("pow");
      vib(20);
      addFx(h.cx, py, "+1 LIFE", "#68e08a");
      burst(h.cx, h.cy, "#68e08a", 14, 0);
      unlock("life");
      if (isTut) tutStep = 2;
      return;
    }
    if (t === 4) {
      freezeT = 3;
      ice = 1;
      sfx("pow");
      vib(20);
      addFx(h.cx, py, "FREEZE", "#7fdcff");
      burst(h.cx, h.cy, "#7fdcff", 14, 0);
      unlock("ice");
      return;
    }
    if (t === 6) {
      dblT = 6;
      sfx("pow");
      vib(20);
      addFx(h.cx, py, "x2", "#ffd257");
      burst(h.cx, h.cy, "#ffd257", 16, 0);
      banner("DOUBLE");
      return;
    }
    if (t === 5) unlock("helm");
    if (t === 7) {
      hits++;
      combo++;
      comboT = COMBO_WIN;
      maxC = Math.max(maxC, combo);
      const pts = 500 * (frenzyT > 0 ? 2 : 1) * (dblT > 0 ? 2 : 1);
      score += pts;
      addFx(h.cx, py, "+" + pts, "#ff7a3a");
      burst(h.cx, h.cy, "#ff7a3a", 22, 0);
      banner("BOSS DOWN");
      duckMus();
      sfx("gold");
      vibPat("boss");
      announce("Boss defeated");
      unlock("first");
      if (score >= 500) unlock("half");
      if (score > 1500 && gridT < 4) {
        gridT = 4;
        banner("WIDE FIELD");
        unlock("grid");
      }
      return;
    }
    scoreHit(h, py, t, t === 2 ? 5 : t === 5 ? 2 : 1);
  }
  function hitAt(px, py) {
    if (state !== PLAY || graceT > 0) return;
    shots++;
    addSwing(px, py);
    let bh = null,
      bd = 1e9;
    for (let i = 0; i < holes.length; i++) {
      const h = holes[i];
      if (!h.on || h.st === "empty" || h.st === "hit" || h.t < 0.3) continue;
      const cy = h.cy - h.t * mr * 1.15 + (1 - h.t) * rh * 0.95;
      const dx = px - h.cx,
        dy = py - cy,
        rr = mr * 1.35,
        d = dx * dx + dy * dy;
      if (d <= rr * rr && d < bd) {
        bd = d;
        bh = h;
      }
    }
    if (bh) doHit(bh);
    else sfx("thud");
  }
  function resetPtr() {
    mx = -1;
    my = -1;
  }
  function notePtr() {
    inputMode = "ptr";
  }
  function noteKb() {
    inputMode = "kb";
    kbSeen = true;
  }
  function kbCapable() {
    if (kbSeen) return true;
    try {
      return !!(
        window.matchMedia && window.matchMedia("(pointer: fine)").matches
      );
    } catch (e) {
      return !!finePtr;
    }
  }
  function onPointer(e) {
    notePtr();
    if (state !== PLAY) return;
    if (e.cancelable) e.preventDefault();
    lastTouchT = performance.now();
    const r = c.getBoundingClientRect();
    hitAt(e.clientX - r.left, e.clientY - r.top);
  }
  function onTouch(e) {
    notePtr();
    if (state !== PLAY) return;
    if (e.cancelable) e.preventDefault();
    lastTouchT = performance.now();
    const r = c.getBoundingClientRect();
    const ts = e.changedTouches;
    if (!ts) return;
    for (let i = 0; i < ts.length; i++)
      hitAt(ts[i].clientX - r.left, ts[i].clientY - r.top);
  }
  function onMouse(e) {
    notePtr();
    if (state !== PLAY) return;
    if (performance.now() - lastTouchT < 700) return;
    const r = c.getBoundingClientRect();
    hitAt(e.clientX - r.left, e.clientY - r.top);
  }
  const hasPointer =
    typeof window.PointerEvent === "function" || "onpointerdown" in window;
  if (hasPointer) {
    c.addEventListener("pointerdown", onPointer, { passive: false });
    c.addEventListener(
      "pointermove",
      (e) => {
        notePtr();
        const r = c.getBoundingClientRect();
        mx = e.clientX - r.left;
        my = e.clientY - r.top;
      },
      { passive: true },
    );
    c.addEventListener("pointercancel", resetPtr);
    c.addEventListener("lostpointercapture", resetPtr);
  } else {
    c.addEventListener("touchstart", onTouch, { passive: false });
    c.addEventListener(
      "touchmove",
      (e) => {
        if (e.cancelable) e.preventDefault();
      },
      { passive: false },
    );
    c.addEventListener("mousedown", onMouse);
    c.addEventListener("mousemove", (e) => {
      notePtr();
      const r = c.getBoundingClientRect();
      mx = e.clientX - r.left;
      my = e.clientY - r.top;
    });
  }
  ["pointerdown", "mousemove", "touchstart"].forEach((ev) => {
    document.addEventListener(ev, notePtr, { passive: true });
  });
  const ft = new Float32Array(31),
    ftS = new Float32Array(31);
  let ftI = 0,
    ftN = 0;
  function pushFt(dt) {
    ft[ftI] = dt;
    ftI = (ftI + 1) % 31;
    if (ftN < 31) ftN++;
  }
  function medianFt() {
    for (let i = 0; i < ftN; i++) ftS[i] = ft[i];
    for (let i = 1; i < ftN; i++) {
      const v = ftS[i];
      let j = i;
      while (j > 0 && ftS[j - 1] > v) {
        ftS[j] = ftS[j - 1];
        j--;
      }
      ftS[j] = v;
    }
    return ftS[ftN >> 1];
  }
  function adaptQ() {
    if (ftN < 15) return;
    const m = medianFt();
    const was = lowQ;
    if (!lowQ && m > 0.022) lowQ = true;
    else if (lowQ && m < 0.016) lowQ = false;
    partCap = lowQ ? 36 : m > 0.018 ? 72 : 140;
    if (was !== lowQ) applyDpr();
  }
  function update(dt) {
    if (graceT > 0) {
      graceT = Math.max(0, graceT - dt);
      return;
    }
    if (hitStop > 0) {
      hitStop = Math.max(0, hitStop - dt);
      return;
    }
    elapsed += dt;
    playAcc += dt;
    if (gridC < gridT) {
      gridC = Math.min(gridT, gridC + dt * 1.15);
      layout();
    }
    if (comboT > 0) {
      comboT -= dt;
      if (comboT <= 0) {
        comboT = 0;
        combo = 0;
      }
    }
    if (duckT > 0) duckT = Math.max(0, duckT - dt);
    if (dblT > 0) dblT = Math.max(0, dblT - dt);
    if (freezeT > 0) freezeT = Math.max(0, freezeT - dt);
    else if (!isZen && !isTut) timeLeft = Math.max(0, timeLeft - dt);
    if (freezeT > 0) ice = 1;
    else ice = Math.max(0, ice - dt * 0.8);
    hurt = Math.max(0, hurt - dt * 1.6);
    if (!isZen && !isTut && timeLeft <= 0) {
      timeLeft = 0;
      return gameOver("TIME UP");
    }
    if (isTut && elapsed >= 20) {
      lsSet("wam_tut", "1");
      return gameOver("TUTORIAL DONE");
    }
    if (timeLeft <= 10 && freezeT <= 0) {
      const s = Math.ceil(timeLeft);
      if (s !== tickS && s > 0 && s <= 10) {
        tickS = s;
        sfx("tick");
      }
    }
    if (!isZen && !isTut && elapsed >= nextFrenzy && frenzyT <= 0) {
      frenzyT = 5;
      frenzyHits = 0;
      nextFrenzy += 20;
      banner("FRENZY");
      sfx("frenzy");
      announce("Frenzy");
    }
    if (frenzyT > 0) {
      frenzyT = Math.max(0, frenzyT - dt);
      if (frenzyT <= 0 && frenzyHits >= 8) unlock("pfz");
    }
    spawnT -= dt;
    if (spawnT <= 0) trySpawn();
    for (let i = 0; i < holes.length; i++) {
      const h = holes[i];
      if (!h.on) continue;
      if (h.st === "empty") {
        if (h.sq > 0) h.sq = Math.max(0, h.sq - dt * 8);
        continue;
      }
      if (h.st === "rise") {
        h.t += dt / 0.1;
        h.sq = Math.sin(Math.min(1, h.t) * Math.PI) * 0.12;
        if (h.t >= 1) {
          h.t = 1;
          h.st = "up";
          h.sq = 0;
          burst(h.cx, h.cy, "#6a4a2a", 4, 1);
        }
      } else if (h.st === "up") {
        h.dur -= dt;
        if (h.dur <= 0) {
          h.st = "fall";
          h.t = 1;
        }
      } else if (h.st === "fall") {
        h.t -= dt / 0.14;
        if (h.t <= 0) {
          h.t = 0;
          escaped(h);
          if (ended) return;
        }
      } else if (h.st === "hit") {
        h.hitT -= dt;
        h.sq = Math.min(1, (0.16 - h.hitT) * 10);
        if (h.hitT <= 0) {
          h.st = "empty";
          h.sq = 0;
          h.hp = 0;
        }
      }
    }
  }
  function colA(h) {
    if (h.i < 3) return 1;
    if (gridC < 3.5) return 0;
    return Math.min(1, (gridC - 3.5) * 2);
  }
  function drawHeartPath(r) {
    x.beginPath();
    x.moveTo(0, r * 0.42);
    x.bezierCurveTo(-r * 1.05, -r * 0.15, -r * 0.5, -r * 1.05, 0, -r * 0.42);
    x.bezierCurveTo(r * 0.5, -r * 1.05, r * 1.05, -r * 0.15, 0, r * 0.42);
    x.fill();
  }
  function drawSnowflake(r) {
    x.save();
    x.strokeStyle = "#eef9ff";
    x.lineWidth = Math.max(1.5, r * 0.12);
    x.lineCap = "round";
    for (let i = 0; i < 6; i++) {
      x.rotate(Math.PI / 3);
      x.beginPath();
      x.moveTo(0, 0);
      x.lineTo(0, -r);
      x.moveTo(0, -r * 0.55);
      x.lineTo(-r * 0.22, -r * 0.78);
      x.moveTo(0, -r * 0.55);
      x.lineTo(r * 0.22, -r * 0.78);
      x.stroke();
    }
    x.restore();
  }
  function drawStar(r) {
    x.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i * TAU) / 5,
        b = a + TAU / 10;
      x.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      x.lineTo(Math.cos(b) * r * 0.45, Math.sin(b) * r * 0.45);
    }
    x.closePath();
    x.fill();
  }
  function strokeTgt(r) {
    if (!theme) return;
    x.strokeStyle = "#fff";
    x.lineWidth = Math.max(2, r * 0.1);
    x.stroke();
  }
  function drawHoleBack(h) {
    const a = colA(h);
    if (a <= 0) return;
    x.globalAlpha = a;
    x.save();
    x.translate(h.cx, h.cy + rh * 0.3);
    x.scale(1, 0.5);
    x.fillStyle = "rgba(92,68,38,.30)";
    x.beginPath();
    x.arc(0, 0, rh * 1.2, 0, TAU);
    x.fill();
    x.restore();
    x.save();
    x.translate(h.cx, h.cy);
    x.scale(1, 0.6);
    x.fillStyle = holeG;
    x.beginPath();
    x.arc(0, 0, rh, 0, TAU);
    x.fill();
    x.strokeStyle = theme ? "rgba(255,220,140,.45)" : "rgba(255,175,85,.10)";
    x.lineWidth = rh * (theme ? 0.22 : 0.16);
    x.beginPath();
    x.arc(0, 0, rh * 0.86, Math.PI * 1.05, Math.PI * 1.95);
    x.stroke();
    x.restore();
    x.globalAlpha = 1;
  }
  function drawHoleFront(h) {
    const a = colA(h);
    if (a <= 0) return;
    x.globalAlpha = a;
    x.save();
    x.translate(h.cx, h.cy);
    x.scale(1, 0.6);
    x.fillStyle = "#060302";
    x.beginPath();
    x.arc(0, 0, rh, 0, Math.PI);
    x.fill();
    x.restore();
    x.globalAlpha = 1;
  }
  function drawFace(r) {
    x.fillStyle = "#fff";
    x.beginPath();
    x.arc(-r * 0.34, -r * 0.18, r * 0.2, 0, TAU);
    x.arc(r * 0.34, -r * 0.18, r * 0.2, 0, TAU);
    x.fill();
    x.fillStyle = "#141414";
    x.beginPath();
    x.arc(-r * 0.31, -r * 0.15, r * 0.1, 0, TAU);
    x.arc(r * 0.37, -r * 0.15, r * 0.1, 0, TAU);
    x.fill();
    x.fillStyle = "#e0708a";
    x.beginPath();
    x.arc(0, r * 0.17, r * 0.16, 0, TAU);
    x.fill();
  }
  function drawMole(h) {
    const a = colA(h);
    if (a <= 0) return;
    const r = mr;
    const v = h.st === "hit" ? 1 : h.t;
    const cy = h.cy - v * r * 1.15 + (1 - v) * rh * 0.95;
    const sq = h.sq || 0;
    x.globalAlpha = a;
    x.save();
    x.translate(h.cx, cy);
    x.scale(1 + sq * 0.5, 1 - sq * 0.42);
    if (h.type === 3) {
      x.fillStyle = cbMode ? "#4a90d9" : theme ? "#3fe08a" : "#2fbf6a";
      x.beginPath();
      x.arc(0, 0, r * 0.98, 0, TAU);
      x.fill();
      strokeTgt(r);
      x.fillStyle = "#d8ffe8";
      drawHeartPath(r * 0.62);
    } else if (h.type === 4) {
      x.fillStyle = cbMode ? "#7eb3f0" : theme ? "#5ecfff" : "#3aa7d4";
      x.beginPath();
      for (let i = 0; i < 6; i++) {
        const ang = (i * TAU) / 6 - Math.PI / 6;
        const fn = i ? x.lineTo : x.moveTo;
        fn.call(x, Math.cos(ang) * r, Math.sin(ang) * r);
      }
      x.closePath();
      x.fill();
      strokeTgt(r);
      x.fillStyle = "rgba(220,245,255,.35)";
      x.beginPath();
      x.arc(-r * 0.2, -r * 0.2, r * 0.28, 0, TAU);
      x.fill();
      drawSnowflake(r * 0.55);
    } else if (h.type === 1) {
      x.fillStyle = cbMode ? "#c45a12" : "#2a3140";
      x.beginPath();
      for (let i = 0; i < 10; i++) {
        const ang = (i * TAU) / 10 - Math.PI / 2,
          rr = i % 2 ? r : r * 1.22;
        const fn = i ? x.lineTo : x.moveTo;
        fn.call(x, Math.cos(ang) * rr, Math.sin(ang) * rr);
      }
      x.closePath();
      x.fill();
      strokeTgt(r);
      x.fillStyle = bombG;
      x.beginPath();
      x.arc(0, 0, r * 0.82, 0, TAU);
      x.fill();
      x.strokeStyle = "#8a93a6";
      x.lineWidth = r * 0.13;
      x.beginPath();
      x.moveTo(r * 0.28, -r * 0.88);
      x.quadraticCurveTo(r * 0.85, -r * 1.45, r * 0.5, -r * 1.75);
      x.stroke();
      x.fillStyle = "#ffd257";
      x.beginPath();
      x.arc(r * 0.5, -r * 1.78, r * 0.17, 0, TAU);
      x.fill();
      x.fillStyle = "#ff5566";
      x.beginPath();
      x.arc(-r * 0.22, 0, r * 0.1, 0, TAU);
      x.arc(r * 0.22, 0, r * 0.1, 0, TAU);
      x.fill();
    } else if (h.type === 2) {
      x.fillStyle = cbMode ? "#ff7a3a" : goldG;
      drawStar(r * 1.15);
      strokeTgt(r);
      x.fillStyle = "#fff6c8";
      x.beginPath();
      x.arc(0, 0, r * 0.42, 0, TAU);
      x.fill();
      x.fillStyle = "#141414";
      x.beginPath();
      x.arc(-r * 0.16, -r * 0.04, r * 0.08, 0, TAU);
      x.arc(r * 0.16, -r * 0.04, r * 0.08, 0, TAU);
      x.fill();
    } else if (h.type === 6) {
      x.fillStyle = cbMode ? "#ff7a3a" : "#ffd257";
      x.beginPath();
      x.moveTo(0, -r);
      x.lineTo(r * 0.72, 0);
      x.lineTo(0, r);
      x.lineTo(-r * 0.72, 0);
      x.closePath();
      x.fill();
      strokeTgt(r);
      x.strokeStyle = "#fff6c8";
      x.lineWidth = r * 0.12;
      x.beginPath();
      x.arc(0, 0, r * 0.38, 0, TAU);
      x.stroke();
    } else if (h.type === 7) {
      const br = r * 1.18;
      x.fillStyle = cbMode ? "#4a90d9" : "#5a2a12";
      x.beginPath();
      x.ellipse(-br * 0.7, -br * 0.7, br * 0.32, br * 0.42, -0.4, 0, TAU);
      x.ellipse(br * 0.7, -br * 0.7, br * 0.32, br * 0.42, 0.4, 0, TAU);
      x.fill();
      x.fillStyle = cbMode ? "#7eb3f0" : "#8a3a18";
      x.beginPath();
      x.arc(0, 0, br, 0, TAU);
      x.fill();
      strokeTgt(br);
      drawFace(br);
      x.fillStyle = "rgba(0,0,0,.45)";
      x.fillRect(-br, -br * 1.45, br * 2, br * 0.22);
      x.fillStyle = "#ff7a3a";
      x.fillRect(-br, -br * 1.45, br * 2 * (h.hp / 5), br * 0.22);
    } else {
      x.fillStyle = "#6d4527";
      x.beginPath();
      x.ellipse(-r * 0.66, -r * 0.72, r * 0.28, r * 0.38, -0.4, 0, TAU);
      x.ellipse(r * 0.66, -r * 0.72, r * 0.28, r * 0.38, 0.4, 0, TAU);
      x.fill();
      x.fillStyle = moleG;
      x.beginPath();
      x.arc(0, 0, r, 0, TAU);
      x.fill();
      strokeTgt(r);
      x.fillStyle = "rgba(232,196,156,.5)";
      x.beginPath();
      x.arc(0, r * 0.28, r * 0.58, 0, TAU);
      x.fill();
      drawFace(r);
      if (h.type === 5) {
        x.fillStyle = h.hp > 1 ? "#8b95a8" : "#5c6574";
        x.beginPath();
        x.ellipse(0, -r * 0.55, r * 0.78, r * 0.42, 0, Math.PI, TAU);
        x.fill();
        x.fillStyle = "#2a3140";
        x.fillRect(-r * 0.72, -r * 0.58, r * 1.44, r * 0.16);
        if (h.hp === 1) {
          x.strokeStyle = "#1a1e28";
          x.lineWidth = r * 0.08;
          x.beginPath();
          x.moveTo(-r * 0.2, -r * 0.85);
          x.lineTo(r * 0.12, -r * 0.35);
          x.lineTo(r * 0.35, -r * 0.7);
          x.stroke();
        }
      }
    }
    x.restore();
    x.globalAlpha = 1;
  }
  function drawFx(dt) {
    x.textAlign = "center";
    x.textBaseline = "middle";
    x.font =
      "800 " +
      Math.round(cell * 0.24) +
      "px ui-sans-serif,system-ui,sans-serif";
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i];
      f.t += dt;
      if (f.t >= f.d) {
        fxPool.push(f);
        fx[i] = fx[fx.length - 1];
        fx.pop();
        continue;
      }
      const p = f.t / f.d;
      x.globalAlpha = 1 - p;
      x.fillStyle = f.col;
      if (f.ring) {
        x.strokeStyle = f.col;
        x.lineWidth = 3;
        x.beginPath();
        x.arc(f.x, f.y, p * cell * 0.55, 0, TAU);
        x.stroke();
      } else if (f.stars) {
        for (let k = 0; k < 3; k++) {
          const ang = p * 6 + k * 2.1;
          x.fillStyle = "#ffe680";
          x.beginPath();
          x.arc(
            f.x + Math.cos(ang) * cell * 0.22,
            f.y + Math.sin(ang) * cell * 0.16,
            3,
            0,
            TAU,
          );
          x.fill();
        }
      } else x.fillText(f.txt, f.x, f.y - p * cell * 0.5);
    }
    x.globalAlpha = 1;
  }
  function drawParts(dt) {
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.t += dt;
      if (p.t >= p.d) {
        pPool.push(p);
        parts[i] = parts[parts.length - 1];
        parts.pop();
        continue;
      }
      p.vy += cell * (p.k === 2 ? 1.2 : 2.5) * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      x.globalAlpha = 1 - p.t / p.d;
      x.fillStyle = p.col;
      const sz = p.k === 1 ? p.sz * 1.6 : p.sz;
      if (p.k === 2) x.fillRect(p.x - sz * 0.35, p.y - sz, sz * 0.7, sz);
      else x.fillRect(p.x - sz * 0.5, p.y - sz * 0.5, sz, sz);
    }
    x.globalAlpha = 1;
  }
  function drawMallet(px, py, ang) {
    x.save();
    x.translate(px, py);
    x.rotate(ang);
    const sk = skin;
    const hcol =
      sk === 1
        ? "#c8d0dc"
        : sk === 2
          ? "#ffd257"
          : sk === 3
            ? "#7fdcff"
            : "#6b3d18";
    const bcol =
      sk === 1
        ? "#8b95a8"
        : sk === 2
          ? "#c47a12"
          : sk === 3
            ? "#3aa7d4"
            : "#c9a36a";
    const tcol =
      sk === 1
        ? "#5c6574"
        : sk === 2
          ? "#fff1a8"
          : sk === 3
            ? "#e8eefc"
            : "#8a5a2a";
    x.fillStyle = hcol;
    x.fillRect(-3, 0, 6, cell * 0.42);
    x.fillStyle = bcol;
    x.fillRect(-cell * 0.16, -cell * 0.08, cell * 0.32, cell * 0.16);
    x.fillStyle = tcol;
    x.fillRect(-cell * 0.16, -cell * 0.08, cell * 0.32, 3);
    x.restore();
  }
  function drawSwings(dt) {
    for (let i = swings.length - 1; i >= 0; i--) {
      const s = swings[i];
      s.t += dt;
      if (s.t >= s.d) {
        swPool.push(s);
        swings[i] = swings[swings.length - 1];
        swings.pop();
        continue;
      }
      const p = s.t / s.d;
      drawMallet(s.x, s.y, -0.9 + p * 1.6);
    }
  }
  function drawVignetteTint() {
    if (ice > 0) {
      x.globalAlpha = ice * 0.12;
      x.fillStyle = "#78d2ff";
      x.fillRect(0, 0, W, H);
      x.globalAlpha = 1;
      if (iceC) {
        x.globalAlpha = ice;
        x.drawImage(iceC, 0, 0, W, H);
        x.globalAlpha = 1;
      }
    }
    if (hurt > 0 && hurtC) {
      x.globalAlpha = hurt;
      x.drawImage(hurtC, 0, 0, W, H);
      x.globalAlpha = 1;
    }
    if (flash > 0) {
      x.globalAlpha = Math.min(0.35, flash);
      x.fillStyle = fc;
      x.fillRect(0, 0, W, H);
      x.globalAlpha = 1;
    }
  }
  function render(dt) {
    x.setTransform(DPR, 0, 0, DPR, 0, 0);
    if (punch > 0 && !reduced()) {
      const s = 1 + punch * 0.02;
      x.translate(W * 0.5, H * 0.5);
      x.scale(s, s);
      x.translate(-W * 0.5, -H * 0.5);
      punch = Math.max(0, punch - dt * 4);
    } else punch = Math.max(0, punch - dt * 4);
    if (bgSky) x.drawImage(bgSky, 0, 0, W, H);
    else {
      x.fillStyle = "#07090d";
      x.fillRect(0, 0, W, H);
    }
    if (bgHill && !lowQ && !reduced() && !theme) {
      const ox = Math.sin(elapsed * 0.15) * 10;
      x.drawImage(bgHill, ox, 0, W, H);
    } else if (bgHill) x.drawImage(bgHill, 0, 0, W, H);
    if (vigC) x.drawImage(vigC, 0, 0, W, H);
    x.save();
    if (shake > 0) {
      x.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
      shake = Math.max(0, shake - dt * 60);
    }
    for (let i = 0; i < holes.length; i++) drawHoleBack(holes[i]);
    for (let i = 0; i < holes.length; i++) {
      const h = holes[i];
      if (colA(h) <= 0 || h.st === "empty") continue;
      x.save();
      x.beginPath();
      x.rect(
        h.cx - cell * 0.5,
        h.cy - cell * 1.2,
        cell,
        cell * 1.2 + rh * 0.15,
      );
      x.clip();
      drawMole(h);
      x.restore();
    }
    for (let i = 0; i < holes.length; i++) drawHoleFront(holes[i]);
    if (state === PLAY || state === CD) {
      const want = inputMode === "kb" && !isTut;
      const tgt = want ? 1 : 0;
      if (ringA < tgt) ringA = Math.min(tgt, ringA + dt / 0.12);
      else if (ringA > tgt) ringA = Math.max(tgt, ringA - dt / 0.12);
      if (ringA < 0.02 && !want) ringA = 0;
      if (ringA > 0) {
        const hs = holeByKey(holeSel);
        if (hs && hs.on) {
          x.save();
          x.globalAlpha = ringA;
          x.strokeStyle = "rgba(127,220,255,.7)";
          x.lineWidth = 3;
          x.beginPath();
          x.arc(hs.cx, hs.cy - rh * 0.2, rh * 1.15, 0, TAU);
          x.stroke();
          x.restore();
        }
      }
    } else ringA = 0;
    x.restore();
    drawParts(dt);
    drawFx(dt);
    drawSwings(dt);
    if (comboT > 0 && (state === PLAY || state === CD || state === PAUSE)) {
      const bw = Math.min(W * 0.42, 220),
        bh = 6,
        bx0 = (W - bw) * 0.5,
        by0 = (hudBottom > 0 ? hudBottom : safe.t + 72) + 8;
      x.fillStyle = "rgba(0,0,0,.4)";
      x.fillRect(bx0, by0, bw, bh);
      x.fillStyle = "#ffd257";
      x.fillRect(bx0, by0, bw * (comboT / COMBO_WIN), bh);
    }
    if (bannerT > 0) {
      bannerT -= dt;
      x.save();
      x.globalAlpha = Math.min(1, bannerT * 2);
      x.fillStyle =
        frenzyT > 0 && bannerTxt === "FRENZY" ? "#ff7a3a" : "#ffd257";
      x.textAlign = "center";
      x.textBaseline = "middle";
      x.font =
        "900 " +
        Math.round(cell * 0.42) +
        "px ui-sans-serif,system-ui,sans-serif";
      x.fillText(bannerTxt, W / 2, by - 36);
      x.restore();
    }
    if (state === CD) {
      x.fillStyle = "#fff";
      x.textAlign = "center";
      x.textBaseline = "middle";
      x.font =
        "900 " +
        Math.round(cell * 1.2) +
        "px ui-sans-serif,system-ui,sans-serif";
      x.fillText(String(Math.max(1, Math.ceil(cd))), W / 2, H / 2);
    }
    if (state === PLAY && isTut) {
      x.fillStyle = "#ffd257";
      x.textAlign = "center";
      x.textBaseline = "middle";
      x.font =
        "800 " +
        Math.round(cell * 0.22) +
        "px ui-sans-serif,system-ui,sans-serif";
      const tip =
        tutStep === 0
          ? "TAP THE MOLE"
          : tutStep === 1
            ? "AVOID THE BOMB"
            : "GRAB THE HEART";
      x.fillText(tip, W / 2, by - 48);
    }
    if (state === PLAY && graceT > 0) {
      const p = 1 - graceT / GRACE;
      x.strokeStyle = "#7fdcff";
      x.lineWidth = 6;
      x.beginPath();
      x.arc(W / 2, H / 2, cell * 0.9, -Math.PI / 2, -Math.PI / 2 + p * TAU);
      x.stroke();
      x.fillStyle = "#fff";
      x.textAlign = "center";
      x.textBaseline = "middle";
      x.font =
        "900 " +
        Math.round(cell * 0.9) +
        "px ui-sans-serif,system-ui,sans-serif";
      x.fillText(String(Math.max(1, Math.ceil(graceT / 0.5))), W / 2, H / 2);
    }
    if (dblT > 0 && (state === PLAY || state === CD || state === PAUSE)) {
      x.save();
      x.strokeStyle = "#ffd257";
      x.lineWidth = 8;
      x.globalAlpha = 0.45 + 0.25 * Math.sin(elapsed * 8);
      x.beginPath();
      x.arc(W / 2, H / 2, Math.min(W, H) * 0.48, 0, TAU);
      x.stroke();
      x.restore();
    }
    drawVignetteTint();
    if (finePtr && mx >= 0 && (state === PLAY || state === CD))
      drawMallet(mx, my, -0.35);
    flash = Math.max(0, flash - dt * 1.2);
  }
  const STEP = 1 / 120;
  function loop(ts) {
    if (fatal) return;
    rafId = requestAnimationFrame(loop);
    if (document.hidden) {
      last = ts;
      return;
    }
    let dt = (ts - last) / 1000;
    last = ts;
    if (!isFinite(dt) || dt < 0) dt = 0;
    if (dt > 0.1) dt = 0.1;
    pushFt(dt);
    adaptQ();
    pollGp();
    accu += dt;
    let n = 0;
    while (accu >= STEP && n < 12) {
      if (state === PLAY) update(STEP);
      else if (state === CD) {
        cd -= STEP;
        if (cd <= 0) {
          cd = 0;
          state = PLAY;
          grabWake();
          startMus();
          sfx("ui");
        }
      }
      accu -= STEP;
      n++;
    }
    loopSteps = n;
    if (accu > STEP * 2) accu = 0;
    if (state === OVER && scoreShow < score) {
      const step = Math.max(40, score * 1.8);
      scoreShow = Math.min(score, scoreShow + dt * step);
      $("ovScore").textContent = String(Math.floor(scoreShow));
    }
    render(dt);
    syncHUD();
    if (showFps) {
      const el = $("fpsOv");
      if (el)
        el.textContent =
          Math.round(dt * 1000) + "ms  " + loopSteps + "st  p" + parts.length;
    }
  }
  function syncHUD() {
    if (syncHUD.s !== score) {
      syncHUD.s = score;
      scoreEl.textContent = score;
    }
    const m = Math.min(1 + Math.floor(combo / 3), 9);
    if (syncHUD.m !== m) {
      syncHUD.m = m;
      comboEl.textContent = "x" + m;
    }
    const t = Math.ceil(timeLeft);
    if (syncHUD.t !== t) {
      syncHUD.t = t;
      timeEl.textContent = t;
    }
    timeBox.classList.toggle("low", t <= 10 && freezeT <= 0);
    timeBox.classList.toggle("frz", freezeT > 0);
    if (syncHUD.l !== lives) {
      syncHUD.l = lives;
      livesEl.textContent = lives;
    }
  }
  syncHUD.s = -1;
  syncHUD.m = -1;
  syncHUD.t = -1;
  syncHUD.l = -1;
  function focusables(el) {
    return el.querySelectorAll("button:not([hidden]),input");
  }
  function pauseBtnVis(on) {
    if (on) pauseBtn.removeAttribute("hidden");
    else pauseBtn.setAttribute("hidden", "");
  }
  function showOv(el) {
    OVS.forEach((o) => o.classList.add("hide"));
    el.classList.remove("hide");
    pauseBtnVis(false);
    const fb = el.querySelector(".btn:not([hidden]),input");
    if (fb) fb.focus({ preventScroll: true });
  }
  function hideOv() {
    OVS.forEach((o) => o.classList.add("hide"));
  }
  function grabWake() {
    try {
      if (!navigator.wakeLock || !navigator.wakeLock.request) return;
      navigator.wakeLock.request("screen").then(
        (l) => {
          wake = l;
          l.addEventListener("release", () => {
            if (wake === l) wake = null;
          });
        },
        () => {},
      );
    } catch (e) {}
  }
  function dropWake() {
    try {
      if (wake) wake.release();
    } catch (e) {}
    wake = null;
  }
  function holeByKey(n) {
    const i = n % 3,
      j = (n / 3) | 0;
    for (let k = 0; k < holes.length; k++)
      if (holes[k].on && holes[k].i === i && holes[k].j === j) return holes[k];
    return null;
  }
  function whackHole(n) {
    const h = holeByKey(n);
    if (!h) return;
    noteKb();
    holeSel = n;
    if (h.st === "empty" || h.st === "hit" || h.t < 0.3) {
      shots++;
      sfx("thud");
      addSwing(h.cx, h.cy);
      return;
    }
    shots++;
    addSwing(h.cx, h.cy);
    doHit(h);
  }
  const gpPrev = { x: 0, y: 0, a: 0, b: 0, s: 0 };
  function pollGp() {
    try {
      if (!navigator.getGamepads) return;
      const gps = navigator.getGamepads();
      let gp = gpIdx >= 0 ? gps[gpIdx] : null;
      if (!gp) {
        for (let i = 0; i < gps.length; i++)
          if (gps[i]) {
            gp = gps[i];
            gpIdx = i;
            break;
          }
      }
      if (!gp) return;
      const ax = gp.axes[0] || 0,
        ay = gp.axes[1] || 0;
      const dx =
        (gp.buttons[15] && gp.buttons[15].pressed ? 1 : 0) -
        (gp.buttons[14] && gp.buttons[14].pressed ? 1 : 0);
      const dy =
        (gp.buttons[13] && gp.buttons[13].pressed ? 1 : 0) -
        (gp.buttons[12] && gp.buttons[12].pressed ? 1 : 0);
      const mx2 = Math.abs(ax) > 0.5 ? (ax > 0 ? 1 : -1) : dx;
      const my2 = Math.abs(ay) > 0.5 ? (ay > 0 ? 1 : -1) : dy;
      if (
        mx2 ||
        my2 ||
        (gp.buttons[0] && gp.buttons[0].pressed) ||
        (gp.buttons[2] && gp.buttons[2].pressed)
      )
        noteKb();
      if (inputMode === "kb") {
        if (mx2 && !gpPrev.x) {
          const col = holeSel % 3;
          const ncol = Math.max(0, Math.min(2, col + mx2));
          holeSel = holeSel - col + ncol;
        }
        if (my2 && !gpPrev.y) {
          const row = (holeSel / 3) | 0;
          const nrow = Math.max(0, Math.min(2, row + my2));
          holeSel = nrow * 3 + (holeSel % 3);
        }
      }
      gpPrev.x = mx2;
      gpPrev.y = my2;
      const a =
        (gp.buttons[0] && gp.buttons[0].pressed) ||
        (gp.buttons[2] && gp.buttons[2].pressed);
      const b = gp.buttons[1] && gp.buttons[1].pressed;
      const st = gp.buttons[9] && gp.buttons[9].pressed;
      if (a && !gpPrev.a && state === PLAY) whackHole(holeSel);
      if ((b && !gpPrev.b) || (st && !gpPrev.s)) {
        if (state === PLAY || state === CD) pause();
        else if (state === PAUSE) resume();
      }
      gpPrev.a = a ? 1 : 0;
      gpPrev.b = b ? 1 : 0;
      gpPrev.s = st ? 1 : 0;
    } catch (e) {}
  }
  function startGame(daily, zen, tut, wk) {
    isDaily = !!daily;
    isZen = !!zen;
    isTut = !!tut;
    isWk = !!wk;
    lastGrade = "";
    setGradeEl("");
    if (isTut) {
      isDaily = false;
      isZen = false;
      isWk = false;
    }
    if (isWk) {
      isDaily = false;
      isZen = false;
      wkId = isoWeekId();
      wkMod = wkId % 4;
      pruneWeeks();
    } else {
      wkMod = 0;
      wkId = 0;
    }
    const seed = isWk ? wkId : dateSeed();
    const seeded = isDaily || isWk;
    rngT = seeded ? mulberry32((seed * 4 + dl) | 0) : Math.random;
    rngC = seeded ? mulberry32((seed * 4 + dl + 7919) | 0) : Math.random;
    score = 0;
    combo = 0;
    comboT = 0;
    lives = isZen ? 5 : 3;
    timeLeft = isZen || isTut ? 999 : ROUND;
    elapsed = 0;
    spawnT = 0.35;
    shake = 0;
    while (fx.length) fxPool.push(fx.pop());
    while (parts.length) pPool.push(parts.pop());
    while (swings.length) swPool.push(swings.pop());
    gridC = 3;
    gridT = 3;
    frenzyT = 0;
    nextFrenzy = 20;
    tickS = 11;
    bannerT = 0;
    hurt = 0;
    ice = 0;
    ended = false;
    graceT = 0;
    hitStop = 0;
    punch = 0;
    assist = false;
    earlyLost = 0;
    frenzyHits = 0;
    playAcc = 0;
    flash = 0;
    freezeT = 0;
    for (let i = 0; i < holes.length; i++) {
      const h = holes[i];
      h.st = "empty";
      h.t = 0;
      h.sq = 0;
      h.hitT = 0;
      h.type = 0;
      h.hp = 0;
      h.on = h.i < 3;
    }
    hits = shots = maxC = mi = 0;
    tutStep = 0;
    holeSel = 4;
    inputMode = "ptr";
    ringA = 0;
    accu = 0;
    duckT = 0;
    dblT = 0;
    bossDone = 0;
    mileN = 0;
    stopMus();
    state = CD;
    cd = isTut ? 1 : 3;
    last = performance.now();
    grabWake();
    pauseBtnVis(true);
    c.classList.toggle("fine", finePtr);
    syncHUD.s = -1;
    syncHUD.m = -1;
    syncHUD.t = -1;
    syncHUD.l = -1;
    layout();
    syncHUD();
    actx();
    sfx("ui");
    hideOv();
  }
  function gameOver(msg) {
    if (state === OVER || ended) return;
    ended = true;
    state = OVER;
    inputMode = "ptr";
    ringA = 0;
    stopMus();
    ice = 0;
    hurt = 0;
    frenzyT = 0;
    flash = 0;
    while (swings.length) swPool.push(swings.pop());
    pauseBtnVis(false);
    c.classList.remove("fine");
    dropWake();
    if (!isTut) {
      stats.games++;
      stats.hits += hits;
      stats.shots += shots;
      stats.bestCombo = Math.max(stats.bestCombo, maxC);
      stats.playTime = (stats.playTime + (playAcc | 0)) | 0;
      saveStats();
    }
    const acc = shots ? hits / shots : 0;
    if (!isTut && !isZen) {
      if (acc >= 0.8 && hits >= 20) unlock("sharp");
      if (lives >= 3) unlock("untouch");
      if (stats.games >= 25) unlock("mar");
    }
    if (isDaily) {
      unlock("daily");
      if (score > dailyBest()) lsSet(dailyKey(), String(score));
      const today = dateSeed();
      if (stats.lastDaily !== today) {
        if (stats.lastDaily === prevYmd(today)) stats.dailyStreak++;
        else stats.dailyStreak = 1;
        stats.lastDaily = today;
        saveStats();
        if (stats.dailyStreak >= 3) unlock("streak");
      }
    }
    let nb = false;
    if (isWk) {
      const wb = weekBest();
      if (score > wb) nb = score > 0;
      if (lsGet(weekKey()) === null || score > wb)
        lsSet(weekKey(), String(score > wb ? score : wb || score));
      best = weekBest();
      pruneWeeks();
    } else if (isZen) {
      const zb = lsNum("wam_best_zen", 0, 0, 1e9) | 0;
      if (score > zb) {
        nb = score > 0;
        lsSet("wam_best_zen", String(score));
      }
      best = lsNum("wam_best_zen", 0, 0, 1e9) | 0;
    } else if (!isTut && score > best) {
      nb = score > 0;
      best = score;
      lsSet(bk(), String(best));
    }
    const grade = isTut ? "" : runGrade(score, acc, maxC, isZen);
    setGradeEl(grade);
    ovMsg.textContent = nb ? "NEW BEST!" : msg || "TIME UP";
    $("ovStats").textContent =
      "HITS " +
      hits +
      "  ·  ACC " +
      (shots ? Math.round(acc * 100) : 0) +
      "%  ·  MAX COMBO " +
      maxC +
      (grade ? "  ·  GRADE " + grade : "") +
      (isDaily ? "  ·  DAILY " + dailyBest() : "") +
      (isWk ? "  ·  WEEK " + weekBest() : "") +
      (isZen ? "  ·  ZEN" : "");
    scoreShow = 0;
    $("ovScore").textContent = "0";
    $("ovBest").textContent = best;
    if (nb) {
      confetti(W * 0.5, H * 0.32, 48);
      vibPat("best");
    }
    sfx("over");
    announce(
      (nb ? "New best. " : "") +
        (msg || "Time up") +
        ". Score " +
        score +
        ". Hits " +
        hits +
        (grade ? ". Grade " + grade : ""),
    );
    if (isTut) {
      isTut = false;
      lsSet("wam_tut", "1");
    }
    showOv(ovOver);
  }
  function pause() {
    if (state !== PLAY && state !== CD) return;
    pausedFrom = state;
    pausedCd = cd;
    state = PAUSE;
    stopMus();
    dropWake();
    showOv(ovPause);
    sfx("ui");
  }
  function resume() {
    if (state !== PAUSE) return;
    last = performance.now();
    accu = 0;
    hideOv();
    pauseBtnVis(true);
    actx();
    grabWake();
    if (pausedFrom === CD) {
      state = CD;
      cd = pausedCd;
    } else {
      state = PLAY;
      graceT = GRACE;
      startMus();
    }
    sfx("ui");
  }
  function toTitle() {
    dropWake();
    isTut = false;
    isZen = false;
    isWk = false;
    lastGrade = "";
    setGradeEl("");
    inputMode = "ptr";
    ringA = 0;
    state = MENU;
    stopMus();
    pauseBtnVis(false);
    c.classList.remove("fine");
    best = lsNum(bk(), 0, 0, 1e9) | 0;
    best0.textContent = best;
    showOv(ovStart);
    sfx("ui");
  }
  function setDiff() {
    $("diffBtn").textContent = "DIFFICULTY: " + DN[dl];
    best = lsNum(bk(), 0, 0, 1e9) | 0;
    best0.textContent = best;
  }
  const SKINN = ["CLASSIC", "STEEL", "GOLD", "ICE"];
  const BOARDN = ["NIGHT", "DUSK"];
  function skinUnlocked(i) {
    if (i === 0) return true;
    if (i === 1) return stats.hits >= 100;
    if (i === 2) return stats.games >= 10;
    if (i === 3) return stats.bestCombo >= 15;
    return false;
  }
  function boardUnlocked(i) {
    if (i === 0) return true;
    if (i === 1) return !!achMap.streak || stats.dailyStreak >= 3;
    return false;
  }
  function skinHint(i) {
    return (
      ["Default", "100 lifetime hits", "Play 10 games", "Combo 15"][i] || ""
    );
  }
  function boardHint(i) {
    return ["Default night hills", "Daily streak 3"][i] || "";
  }
  function fillCos() {
    if (!skinUnlocked(skin)) skin = 0;
    if (!boardUnlocked(board)) board = 0;
    $("skinBtn").textContent = "MALLET: " + SKINN[skin];
    $("boardBtn").textContent = "BOARD: " + BOARDN[board];
    let t = "MALLETS\n";
    for (let i = 0; i < 4; i++)
      t +=
        (skinUnlocked(i) ? "[x] " : "[ ] ") +
        SKINN[i] +
        " - " +
        skinHint(i) +
        "\n";
    t += "\nBOARDS\n";
    for (let i = 0; i < 2; i++)
      t +=
        (boardUnlocked(i) ? "[x] " : "[ ] ") +
        BOARDN[i] +
        " - " +
        boardHint(i) +
        "\n";
    $("cosP").textContent = t;
  }
  function syncSet() {
    $("musVol").value = String(Math.round(musV * 100));
    $("sfxVol").value = String(Math.round(sfxV * 100));
    $("hapBtn").textContent = "HAPTICS: " + (hap ? "ON" : "OFF");
    $("shkBtn").textContent = "SHAKE: " + (shakeOn ? "ON" : "OFF");
    $("rmBtn").textContent =
      "MOTION: " + (rmMode === 0 ? "AUTO" : rmMode === 1 ? "OFF" : "ON");
    $("themeBtn").textContent =
      "THEME: " + (theme ? "HIGH CONTRAST" : "DEFAULT");
    $("cbBtn").textContent = "COLORBLIND: " + (cbMode ? "ON" : "OFF");
  }
  function openSet(from) {
    setFrom = from;
    syncSet();
    showOv(ovSet);
  }
  function fmtTime(s) {
    s = s | 0;
    const m = (s / 60) | 0,
      sec = s % 60;
    return m + ":" + (sec < 10 ? "0" : "") + sec;
  }
  function fillStats() {
    const acc = stats.shots ? Math.round((stats.hits / stats.shots) * 100) : 0;
    $("statP").textContent =
      "GAMES  " +
      stats.games +
      "\nHITS  " +
      stats.hits +
      "\nSHOTS  " +
      stats.shots +
      "\nACCURACY  " +
      acc +
      "%\nBEST COMBO  " +
      stats.bestCombo +
      "\nPLAY TIME  " +
      fmtTime(stats.playTime) +
      "\nBEST EASY  " +
      (lsNum("wam_best_0", 0, 0, 1e9) | 0) +
      "\nBEST NORMAL  " +
      (lsNum("wam_best", 0, 0, 1e9) | 0) +
      "\nBEST HARD  " +
      (lsNum("wam_best_2", 0, 0, 1e9) | 0) +
      "\nBEST ZEN  " +
      (lsNum("wam_best_zen", 0, 0, 1e9) | 0) +
      "\nDAILY BEST  " +
      dailyBest() +
      "\nDAILY STREAK  " +
      stats.dailyStreak +
      "\nWEEKLY BEST  " +
      weekBest();
  }
  function fillAch() {
    let a = "";
    for (let i = 0; i < ACHD.length; i++)
      a +=
        (achMap[ACHD[i][0]] ? "[x] " : "[ ] ") +
        ACHD[i][1] +
        "\n" +
        ACHD[i][2] +
        "\n\n";
    $("achP").textContent = a;
  }
  const TUTS_TOUCH = [
    "Practice round: tap the moles. Lives are not lost.",
    "Avoid spiked bombs. They steal a life and 2 seconds.",
    "Grab the green heart for +1 life. Skip anytime.",
  ];
  const TUTS_KB = [
    "Practice round: tap moles. Lives are not lost.",
    "Keys 1-9 / QWEASDZXC hit holes. Gamepad: stick/d-pad + A.",
    "Avoid spiked bombs. They steal a life and 2 seconds.",
    "Grab the green heart for +1 life. Skip anytime.",
  ];
  function tutSlides() {
    return kbCapable() ? TUTS_KB : TUTS_TOUCH;
  }
  let tutI = 0;
  function showTut(i) {
    const slides = tutSlides();
    tutI = i;
    if (tutI >= slides.length) tutI = slides.length - 1;
    $("tutP").textContent = slides[tutI];
    $("tutNext").textContent = tutI === slides.length - 1 ? "PRACTICE" : "NEXT";
    showOv(ovTut);
  }
  function finishTut() {
    lsSet("wam_tut", "1");
    if (pendingMode === 1) {
      pendingMode = 0;
      startGame(false, false, false);
    } else if (pendingMode === 2) {
      pendingMode = 0;
      startGame(true, false, false);
    } else if (pendingMode === 3) {
      pendingMode = 0;
      startGame(false, false, false, true);
    } else toTitle();
  }
  function shareScore() {
    const accN = shots ? Math.round((hits / shots) * 100) : 0;
    const filled = Math.max(0, Math.min(10, (accN / 10) | 0));
    let bar = "";
    for (let i = 0; i < 10; i++) bar += i < filled ? "#" : "-";
    let t =
      "I scored " +
      score +
      " in Whack-A-Mole" +
      (isZen ? " (Zen)" : isDaily ? " (Daily)" : isWk ? " (Weekly)" : "") +
      (lastGrade ? " grade " + lastGrade : "") +
      "!";
    if (isDaily) {
      const d = new Date();
      const ymd =
        d.getFullYear() +
        "-" +
        (d.getMonth() + 1 < 10 ? "0" : "") +
        (d.getMonth() + 1) +
        "-" +
        (d.getDate() < 10 ? "0" : "") +
        d.getDate();
      t =
        "Whack-A-Mole Daily " +
        ymd +
        "  score " +
        score +
        "  acc " +
        bar +
        " " +
        accN +
        "%  streak " +
        stats.dailyStreak +
        (lastGrade ? "  grade " + lastGrade : "");
    } else if (isWk) {
      t =
        "Whack-A-Mole Weekly " +
        wkId +
        "  score " +
        score +
        "  acc " +
        bar +
        " " +
        accN +
        "%" +
        (lastGrade ? "  grade " + lastGrade : "");
    }
    try {
      const card = document.createElement("canvas");
      card.width = 1080;
      card.height = 1080;
      const cx = card.getContext("2d");
      if (cx) {
        cx.fillStyle = "#0b1018";
        cx.fillRect(0, 0, 1080, 1080);
        cx.fillStyle = "#ffd257";
        cx.font = "900 72px ui-sans-serif,system-ui,sans-serif";
        cx.textAlign = "center";
        cx.fillText("WHACK-A-MOLE", 540, 160);
        cx.fillStyle = "#eaf0f7";
        cx.font = "800 48px ui-sans-serif,system-ui,sans-serif";
        const mode = isZen
          ? "ZEN"
          : isDaily
            ? "DAILY"
            : isWk
              ? "WEEKLY"
              : DN[dl];
        cx.fillText(mode, 540, 240);
        cx.fillStyle = "#ffd257";
        cx.font = "900 160px ui-sans-serif,system-ui,sans-serif";
        cx.fillText(String(score), 540, 460);
        cx.fillStyle = "#eaf0f7";
        cx.font = "700 36px ui-sans-serif,system-ui,sans-serif";
        const accN2 = shots ? Math.round((hits / shots) * 100) : 0;
        cx.fillText("BEST " + best, 540, 560);
        cx.fillText("ACC " + accN2 + "%   MAX COMBO " + maxC, 540, 620);
        if (lastGrade) cx.fillText("GRADE " + lastGrade, 540, 760);
        const d = new Date();
        cx.fillText(d.toISOString().slice(0, 10), 540, 700);
        card.toBlob((blob) => {
          if (!blob) {
            textShare(t);
            return;
          }
          const file = new File([blob], "whack-a-mole.png", {
            type: "image/png",
          });
          const data = { title: "Whack-A-Mole", text: t, files: [file] };
          if (
            navigator.canShare &&
            navigator.canShare(data) &&
            navigator.share
          ) {
            navigator.share(data).catch(() => dlPng(blob));
          } else if (navigator.share) {
            navigator
              .share({ title: "Whack-A-Mole", text: t })
              .catch(() => dlPng(blob));
          } else dlPng(blob);
        }, "image/png");
        return;
      }
    } catch (e) {}
    textShare(t);
  }
  function dlPng(blob) {
    try {
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = "whack-a-mole.png";
      a.click();
      setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {}
      }, 1500);
    } catch (e) {
      textShare("I scored " + score + " in Whack-A-Mole!");
    }
  }
  function textShare(t) {
    if (navigator.share) {
      navigator
        .share({ title: "Whack-A-Mole", text: t, url: location.href })
        .catch(() => clip(t));
    } else clip(t);
  }
  function clip(t) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(t).then(
          () => {
            achEl.textContent = "Copied to clipboard";
            achEl.classList.remove("hide");
            setTimeout(() => {
              if (achEl.textContent === "Copied to clipboard")
                achEl.classList.add("hide");
            }, 1600);
          },
          () => {},
        );
      }
    } catch (e) {}
  }
  function togFs() {
    try {
      const el = document.documentElement;
      if (!document.fullscreenElement && !document.webkitFullscreenElement) {
        const fn = el.requestFullscreen || el.webkitRequestFullscreen;
        if (fn) fn.call(el);
      } else {
        const fn = document.exitFullscreen || document.webkitExitFullscreen;
        if (fn) fn.call(document);
      }
    } catch (e) {}
  }
  $("diffBtn").addEventListener("click", () => {
    dl = (dl + 1) % 3;
    lsSet("wam_diff", String(dl));
    setDiff();
    sfx("ui");
  });
  $("playBtn").addEventListener("click", () => startGame(false, false, false));
  $("dailyBtn").addEventListener("click", () => startGame(true, false, false));
  $("wkBtn").addEventListener("click", () =>
    startGame(false, false, false, true),
  );
  $("zenBtn").addEventListener("click", () => startGame(false, true, false));
  $("retryBtn").addEventListener("click", () =>
    startGame(isDaily, isZen, false, isWk),
  );
  $("resumeBtn").addEventListener("click", resume);
  $("restartBtn").addEventListener("click", () =>
    startGame(isDaily, isZen, false, isWk),
  );
  $("menuBtn").addEventListener("click", toTitle);
  $("titleBtn").addEventListener("click", toTitle);
  $("shareBtn").addEventListener("click", shareScore);
  $("setBtn").addEventListener("click", () => openSet(MENU));
  $("setBtn2").addEventListener("click", () => openSet(PAUSE));
  $("setBack").addEventListener("click", () => {
    if (setFrom === PAUSE) {
      state = PAUSE;
      showOv(ovPause);
    } else toTitle();
  });
  $("statBtn").addEventListener("click", () => {
    fillStats();
    showOv(ovStat);
  });
  $("statBack").addEventListener("click", toTitle);
  $("achBtn").addEventListener("click", () => {
    fillAch();
    showOv(ovAch);
  });
  $("achBack").addEventListener("click", toTitle);
  $("hapBtn").addEventListener("click", () => {
    hap = !hap;
    lsSet("wam_hap", hap ? "1" : "0");
    syncSet();
    sfx("ui");
  });
  $("shkBtn").addEventListener("click", () => {
    shakeOn = !shakeOn;
    lsSet("wam_shk", shakeOn ? "1" : "0");
    syncSet();
    sfx("ui");
  });
  $("rmBtn").addEventListener("click", () => {
    rmMode = (rmMode + 1) % 3;
    lsSet("wam_rm", String(rmMode));
    syncSet();
    sfx("ui");
  });
  $("themeBtn").addEventListener("click", () => {
    theme = theme ? 0 : 1;
    lsSet("wam_theme", String(theme));
    syncSet();
    rebuildBg();
    buildGrads();
    sfx("ui");
  });
  $("cbBtn").addEventListener("click", () => {
    cbMode = !cbMode;
    lsSet("wam_cb", cbMode ? "1" : "0");
    syncSet();
    sfx("ui");
  });
  $("cosBtn").addEventListener("click", () => {
    fillCos();
    showOv(ovCos);
    sfx("ui");
  });
  $("skinBtn").addEventListener("click", () => {
    for (let k = 1; k <= 4; k++) {
      const n = (skin + k) % 4;
      if (skinUnlocked(n)) {
        skin = n;
        lsSet("wam_skin", String(skin));
        fillCos();
        break;
      }
    }
    sfx("ui");
  });
  $("boardBtn").addEventListener("click", () => {
    for (let k = 1; k <= 2; k++) {
      const n = (board + k) % 2;
      if (boardUnlocked(n)) {
        board = n;
        lsSet("wam_board", String(board));
        fillCos();
        rebuildBg();
        break;
      }
    }
    sfx("ui");
  });
  $("cosBack").addEventListener("click", () => {
    showOv(ovSet);
    sfx("ui");
  });
  $("fsBtn").addEventListener("click", togFs);
  $("musVol").addEventListener("input", (e) => {
    musV = clamp(e.target.value / 100, 0, 1);
    lsSet("wam_mus", String(musV));
    if (musG) musG.gain.value = musV;
  });
  $("sfxVol").addEventListener("input", (e) => {
    sfxV = clamp(e.target.value / 100, 0, 1);
    lsSet("wam_sfx", String(sfxV));
    if (sfxG) sfxG.gain.value = sfxV;
  });
  $("tutNext").addEventListener("click", () => {
    if (tutI >= tutSlides().length - 1) {
      lsSet("wam_tut", "1");
      if (pendingMode === 1) {
        pendingMode = 0;
        startGame(false, false, false);
      } else if (pendingMode === 2) {
        pendingMode = 0;
        startGame(true, false, false);
      } else if (pendingMode === 3) {
        pendingMode = 0;
        startGame(false, false, false, true);
      } else startGame(false, false, true);
    } else showTut(tutI + 1);
    sfx("ui");
  });
  $("tutSkip").addEventListener("click", finishTut);
  $("tutReplay").addEventListener("click", () => {
    pendingMode = 0;
    showTut(0);
    sfx("ui");
  });
  function toastMsg(m) {
    achEl.textContent = m;
    achEl.classList.remove("hide");
    setTimeout(() => {
      if (achEl.textContent === m) achEl.classList.add("hide");
    }, 1800);
  }
  const SAVE_KEYS = {
    wam_ver: [0, 99, 1],
    wam_diff: [0, 2, 1],
    wam_best: [0, 1e9, 1],
    wam_best_0: [0, 1e9, 1],
    wam_best_2: [0, 1e9, 1],
    wam_best_zen: [0, 1e9, 1],
    wam_mus: [0, 1, 0],
    wam_sfx: [0, 1, 0],
    wam_hap: [0, 1, 1],
    wam_shk: [0, 1, 1],
    wam_rm: [0, 2, 1],
    wam_theme: [0, 1, 1],
    wam_cb: [0, 1, 1],
    wam_skin: [0, 3, 1],
    wam_board: [0, 1, 1],
    wam_tut: [0, 1, 1],
  };
  function knownKey(k) {
    if (SAVE_KEYS[k]) return true;
    if (/^wam_daily_\d{8}_[0-2]$/.test(k)) return true;
    if (/^wam_wk_\d{6}$/.test(k)) return true;
    if (k === "wam_stats" || k === "wam_ach" || k === "wam_snd") return true;
    return false;
  }
  function numOk(v, a, b) {
    const n = +v;
    return isFinite(n) && n >= a && n <= b;
  }
  function shapeOk(k, v) {
    const s = String(v);
    if (s.length > 8000) return false;
    if (SAVE_KEYS[k]) {
      const r = SAVE_KEYS[k];
      return numOk(s, r[0], r[1]);
    }
    if (/^wam_daily_\d{8}_[0-2]$/.test(k) || /^wam_wk_\d{6}$/.test(k))
      return numOk(s, 0, 1e9);
    if (k === "wam_snd") return s === "0" || s === "1";
    if (k === "wam_stats") {
      try {
        const o = JSON.parse(s);
        if (!o || typeof o !== "object" || Array.isArray(o)) return false;
        const n = [
          "games",
          "hits",
          "shots",
          "bestCombo",
          "playTime",
          "dailyStreak",
          "lastDaily",
        ];
        for (let i = 0; i < n.length; i++) {
          if (o[n[i]] !== undefined && !numOk(o[n[i]], 0, 1e9)) return false;
        }
        return true;
      } catch (e) {
        return false;
      }
    }
    if (k === "wam_ach") {
      try {
        const o = JSON.parse(s);
        return !!o && typeof o === "object" && !Array.isArray(o);
      } catch (e) {
        return false;
      }
    }
    return true;
  }
  function collectSave() {
    const o = { wam_ver: 8 };
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && knownKey(k)) o[k] = localStorage.getItem(k);
      }
    } catch (e) {}
    o.wam_ver = 8;
    return o;
  }
  function validSave(o) {
    if (!o || typeof o !== "object" || Array.isArray(o)) return false;
    const keys = Object.keys(o);
    if (keys.length > 80) return false;
    let known = 0;
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i];
      if (!knownKey(k)) continue;
      known++;
      const v = o[k];
      if (typeof v !== "string" && typeof v !== "number") return false;
      if (!shapeOk(k, v)) return false;
    }
    return known > 0;
  }
  $("exportBtn").addEventListener("click", () => {
    try {
      const blob = new Blob([JSON.stringify(collectSave())], {
        type: "application/json",
      });
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = "wam-save.json";
      a.click();
      setTimeout(() => {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {}
      }, 1500);
      toastMsg("Save exported");
    } catch (e) {
      toastMsg("Export failed");
    }
  });
  $("importBtn").addEventListener("click", () => {
    $("importFile").click();
  });
  $("importFile").addEventListener("change", (e) => {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    if (f.size > 200000) {
      toastMsg("File too large");
      return;
    }
    const reader = new FileReader();
    reader.onerror = () => toastMsg("Import failed");
    reader.onload = () => {
      try {
        const o = JSON.parse(String(reader.result || ""));
        if (!validSave(o)) {
          toastMsg("Invalid save");
          return;
        }
        if (!window.confirm("Replace all Whack-A-Mole data with this save?"))
          return;
        const keys = [];
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && k.indexOf("wam_") === 0) keys.push(k);
          }
          for (let i = 0; i < keys.length; i++)
            localStorage.removeItem(keys[i]);
          const nk = Object.keys(o);
          for (let i = 0; i < nk.length; i++) {
            if (!knownKey(nk[i])) continue;
            localStorage.setItem(nk[i], String(o[nk[i]]));
          }
        } catch (err) {
          toastMsg("Import failed");
          return;
        }
        location.reload();
      } catch (err) {
        toastMsg("Invalid save");
      }
    };
    reader.readAsText(f);
  });
  $("resetBtn").addEventListener("click", () => {
    if (!resetArm) {
      resetArm = 1;
      $("resetBtn").textContent = "CONFIRM RESET";
      return;
    }
    try {
      const keys = [];
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.indexOf("wam_") === 0) keys.push(k);
      }
      for (let i = 0; i < keys.length; i++) localStorage.removeItem(keys[i]);
    } catch (e) {}
    location.reload();
  });
  $("errReload").addEventListener("click", () => location.reload());
  pauseBtn.addEventListener("click", pause);
  let swReg = null,
    swReloading = false,
    updateWaiting = false;
  function showUpdate() {
    if (swReloading) return;
    updateWaiting = true;
    updEl.classList.remove("hide");
  }
  updEl.addEventListener("click", () => {
    if (swReloading) return;
    if (swReg && swReg.waiting) {
      updEl.classList.add("hide");
      swReg.waiting.postMessage("SKIP_WAITING");
    } else {
      swReloading = true;
      location.reload();
    }
  });
  let instEvt = null;
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    instEvt = e;
    instBtn.removeAttribute("hidden");
  });
  instBtn.addEventListener("click", () => {
    if (!instEvt) return;
    instEvt.prompt();
    instEvt.userChoice.then(() => {
      instEvt = null;
      instBtn.setAttribute("hidden", "");
    });
  });
  window.addEventListener("appinstalled", () => {
    instEvt = null;
    instBtn.setAttribute("hidden", "");
  });
  c.addEventListener("contextmenu", (e) => e.preventDefault());
  window.addEventListener("keydown", (e) => {
    const vis = OVS.find((o) => !o.classList.contains("hide"));
    if (e.key === "Tab" && vis) {
      const f = focusables(vis);
      if (!f.length) return;
      const first = f[0],
        last = f[f.length - 1];
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
      return;
    }
    if (
      (e.key === "Enter" || e.key === " ") &&
      vis &&
      state !== PLAY &&
      state !== CD
    ) {
      const a = document.activeElement;
      if (!(a && (a.tagName === "BUTTON" || a.tagName === "INPUT"))) {
        e.preventDefault();
        const b = vis.querySelector(".btn:not([hidden])");
        if (b) b.click();
      }
    }
    if (state === PLAY && !vis) {
      const k = e.key;
      const map = {
        1: 6,
        2: 7,
        3: 8,
        4: 3,
        5: 4,
        6: 5,
        7: 0,
        8: 1,
        9: 2,
        q: 0,
        w: 1,
        e: 2,
        a: 3,
        s: 4,
        d: 5,
        z: 6,
        x: 7,
        c: 8,
        Q: 0,
        W: 1,
        E: 2,
        A: 3,
        S: 4,
        D: 5,
        Z: 6,
        X: 7,
        C: 8,
      };
      if (
        k === "ArrowLeft" ||
        k === "ArrowRight" ||
        k === "ArrowUp" ||
        k === "ArrowDown"
      ) {
        noteKb();
        e.preventDefault();
        const col = holeSel % 3,
          row = (holeSel / 3) | 0;
        if (k === "ArrowLeft") holeSel = row * 3 + Math.max(0, col - 1);
        else if (k === "ArrowRight") holeSel = row * 3 + Math.min(2, col + 1);
        else if (k === "ArrowUp") holeSel = Math.max(0, row - 1) * 3 + col;
        else holeSel = Math.min(2, row + 1) * 3 + col;
        return;
      }
      if (
        k === "1" ||
        k === "2" ||
        k === "3" ||
        k === "4" ||
        k === "5" ||
        k === "6" ||
        k === "7" ||
        k === "8" ||
        k === "9"
      ) {
        const code = e.code || "";
        if (code.indexOf("Numpad") === 0) {
          const n = k.charCodeAt(0) - 49;
          const ni = n % 3,
            nj = 2 - ((n / 3) | 0);
          e.preventDefault();
          whackHole(nj * 3 + ni);
          return;
        }
      }
      if (map[k] !== undefined) {
        e.preventDefault();
        whackHole(map[k]);
        return;
      }
    }
    if (e.key === "Escape" || e.key === "p" || e.key === "P") {
      e.preventDefault();
      if (vis === ovSet) {
        $("setBack").click();
        return;
      }
      if (vis === ovCos) {
        $("cosBack").click();
        return;
      }
      if (vis === ovStat || vis === ovAch) {
        toTitle();
        return;
      }
      if (vis === ovTut) {
        finishTut();
        return;
      }
      if (state === PLAY || state === CD) pause();
      else if (state === PAUSE) resume();
    }
  });
  document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
      if (AC && AC.state === "running") {
        try {
          AC.suspend();
        } catch (e) {}
      }
      if (state === PLAY || state === CD) pause();
    } else {
      last = performance.now();
      accu = 0;
      if (state === PLAY || state === CD) grabWake();
    }
  });
  window.addEventListener("gamepaddisconnected", () => {
    gpIdx = -1;
  });
  window.addEventListener("pagehide", () => {
    if (state === PLAY || state === CD) pause();
  });
  window.addEventListener("blur", () => {
    resetPtr();
    if (state === PLAY) pause();
  });
  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", () => setTimeout(resize, 120));
  document.addEventListener("gesturestart", (e) => e.preventDefault());
  ["pointerdown", "touchstart", "keydown"].forEach((ev) => {
    document.addEventListener(ev, () => actx(), { passive: true });
  });
  try {
    if (window.matchMedia) {
      const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
      const fn = () => {
        osReduced = !!mq.matches;
      };
      if (mq.addEventListener) mq.addEventListener("change", fn);
      else if (mq.addListener) mq.addListener(fn);
    }
  } catch (e) {}
  function boom() {
    if (fatal) return;
    fatal = true;
    try {
      if (rafId) cancelAnimationFrame(rafId);
    } catch (e) {}
    stopMus();
    dropWake();
    $("errOv").classList.remove("hide");
    const b = $("errReload");
    if (b) b.focus({ preventScroll: true });
  }
  window.addEventListener("error", boom);
  window.addEventListener("unhandledrejection", boom);
  resize();
  setDiff();
  best0.textContent = best;
  syncSet();
  fillCos();
  syncHUD();
  rafId = requestAnimationFrame(loop);
  try {
    const sp = new URLSearchParams(location.search);
    showFps = sp.get("fps") === "1";
    if (showFps) $("fpsOv").classList.remove("hide");
    const q = sp.get("mode");
    const needTut = lsGet("wam_tut") !== "1";
    if (q === "daily") {
      if (needTut) {
        pendingMode = 2;
        showTut(0);
      } else startGame(true, false, false);
    } else if (q === "weekly") {
      if (needTut) {
        pendingMode = 3;
        showTut(0);
      } else startGame(false, false, false, true);
    } else if (q === "play") {
      if (needTut) {
        pendingMode = 1;
        showTut(0);
      } else startGame(false, false, false);
    } else if (needTut) showTut(0);
  } catch (e) {
    if (lsGet("wam_tut") !== "1") showTut(0);
  }
  if ("serviceWorker" in navigator && /^https?:$/.test(location.protocol)) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("sw.js")
        .then((reg) => {
          swReg = reg;
          if (reg.waiting) showUpdate();
          reg.addEventListener("updatefound", () => {
            const w = reg.installing;
            if (!w) return;
            w.addEventListener("statechange", () => {
              if (w.state === "installed" && navigator.serviceWorker.controller)
                showUpdate();
            });
          });
        })
        .catch(() => {});
      navigator.serviceWorker.addEventListener("controllerchange", () => {
        if (swReloading || !updateWaiting) return;
        swReloading = true;
        location.reload();
      });
    });
  }
})();
