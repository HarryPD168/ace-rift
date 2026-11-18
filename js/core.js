/* 《王牌裂隙》核心工具：常數、輸入、音效、粒子、相機 */
(function (global) {
  const AR = (global.AR = global.AR || {});

  AR.W = 1280;
  AR.H = 720;
  AR.GROUND = 568;
  AR.FONT = '"Noto Sans CJK TC","Noto Sans CJK SC","PingFang TC","Microsoft JhengHei","Source Han Sans TC",sans-serif';
  AR.SERIF = '"Noto Serif CJK TC","Noto Serif CJK SC","Noto Serif",serif';

  AR.SUITS = ["spade", "heart", "club", "diamond"];
  AR.SUIT_GLYPH = { spade: "♠", heart: "♥", club: "♣", diamond: "♦" };
  AR.SUIT_COLOR = { spade: "#1a1a22", heart: "#c41e3a", club: "#1a1a22", diamond: "#c41e3a" };
  AR.SUIT_NAME = { spade: "黑桃", heart: "紅心", club: "梅花", diamond: "方塊" };
  AR.RANK_NAME = { 1: "A", 11: "J", 12: "Q", 13: "K" };
  AR.rankLabel = (r) => AR.RANK_NAME[r] || String(r);

  AR.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  AR.lerp = (a, b, t) => a + (b - a) * t;
  AR.easeOut = (t) => 1 - Math.pow(1 - t, 3);
  AR.easeInOut = (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  AR.rand = (a, b) => a + Math.random() * (b - a);
  AR.irand = (a, b) => (a + Math.floor(Math.random() * (b - a + 1)));
  AR.pick = (arr) => arr[(Math.random() * arr.length) | 0];
  AR.sign = (v) => (v < 0 ? -1 : v > 0 ? 1 : 0);
  AR.dist = (ax, ay, bx, by) => Math.hypot(bx - ax, by - ay);
  AR.aabb = (a, b) => a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
  AR.hitbox = (e) => ({ x: e.x, y: e.y, w: e.w, h: e.h });
  AR.center = (e) => ({ x: e.x + e.w / 2, y: e.y + e.h / 2 });
  AR.now = () => performance.now() / 1000;

  AR.seeded = function (seed) {
    let s = seed | 0 || 1;
    return function () {
      s = (s * 1664525 + 1013904223) | 0;
      return (s >>> 0) / 4294967296;
    };
  };

  AR.roundRect = function (ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  };

  /* ---------- 輸入 ---------- */
  AR.Input = {
    keys: Object.create(null),
    down: Object.create(null),
    up: Object.create(null),
    mouse: { x: 0, y: 0, down: false, clicked: false, released: false },
    canvas: null,
    touchUsed: false,
    keyboardUsed: false,
    showTouch: false,
    bind(canvas) {
      this.canvas = canvas;
      const set = (e, v) => {
        const k = e.code;
        if (v && !this.keys[k]) this.down[k] = true;
        if (!v && this.keys[k]) this.up[k] = true;
        this.keys[k] = v;
        if (v) {
          this.keyboardUsed = true;
          AR.Audio.resume();
        }
        if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(k)) e.preventDefault();
      };
      window.addEventListener("keydown", (e) => {
        if (e.repeat) return;
        set(e, true);
      });
      window.addEventListener("keyup", (e) => set(e, false));
      const pos = (e) => {
        const r = canvas.getBoundingClientRect();
        if (!r.width || !r.height) return;
        this.mouse.x = ((e.clientX - r.left) / r.width) * AR.W;
        this.mouse.y = ((e.clientY - r.top) / r.height) * AR.H;
      };
      const isPrimary = (e) => e.button === 0 || e.pointerType === "touch" || e.pointerType === "pen";
      canvas.addEventListener("pointermove", (e) => {
        if (e.pointerType === "mouse" || this.mouse.down) pos(e);
      });
      canvas.addEventListener("pointerdown", (e) => {
        if (!isPrimary(e)) return;
        pos(e);
        this.mouse.down = true;
        this.mouse.clicked = true;
        try { canvas.setPointerCapture(e.pointerId); } catch (err) {}
        canvas.focus({ preventScroll: true });
        AR.Audio.resume();
        if (e.pointerType === "touch" || e.pointerType === "pen") this.touchUsed = true;
      });
      const up = (e) => {
        if (e && e.button != null && e.button !== 0 && e.pointerType === "mouse") return;
        if (this.mouse.down) this.mouse.released = true;
        this.mouse.down = false;
      };
      window.addEventListener("pointerup", up);
      window.addEventListener("pointercancel", up);
      canvas.addEventListener("touchstart", (e) => {
        this.touchUsed = true;
        canvas.focus({ preventScroll: true });
        AR.Audio.resume();
        if (e.cancelable) e.preventDefault();
      }, { passive: false });
      canvas.addEventListener("touchmove", (e) => {
        if (e.cancelable) e.preventDefault();
      }, { passive: false });
      canvas.addEventListener("contextmenu", (e) => e.preventDefault());
      window.addEventListener("blur", () => {
        this.keys = Object.create(null);
        this.mouse.down = false;
      });
    },
    pressVirt(code) {
      if (!this.keys[code]) this.down[code] = true;
      this.keys[code] = true;
    },
    releaseVirt(code) {
      if (this.keys[code]) this.up[code] = true;
      this.keys[code] = false;
    },
    pulseVirt(code) {
      this.down[code] = true;
    },
    releaseAllVirt(codes) {
      (codes || []).forEach((c) => this.releaseVirt(c));
    },
    pressed(code) {
      return !!this.down[code];
    },
    held(code) {
      return !!this.keys[code];
    },
    released(code) {
      return !!this.up[code];
    },
    anyPressed() {
      return Object.keys(this.down).length > 0 || this.mouse.clicked;
    },
    endFrame() {
      this.down = Object.create(null);
      this.up = Object.create(null);
      this.mouse.clicked = false;
      this.mouse.released = false;
    },
  };

  /* ---------- 相機 ---------- */
  AR.Camera = {
    x: 0,
    y: 0,
    tx: 0,
    ty: 0,
    shake: 0,
    sx: 0,
    sy: 0,
    follow(px, py, dt, snap) {
      this.tx = AR.clamp(px - AR.W * 0.42, this.minX, this.maxX);
      this.ty = AR.clamp(py - AR.H * 0.62, this.minY, this.maxY);
      if (snap) {
        this.x = this.tx;
        this.y = this.ty;
      } else {
        const k = 1 - Math.pow(0.001, dt);
        this.x = AR.lerp(this.x, this.tx, k);
        this.y = AR.lerp(this.y, this.ty, k);
      }
      if (this.shake > 0) {
        this.sx = (Math.random() - 0.5) * this.shake;
        this.sy = (Math.random() - 0.5) * this.shake;
        this.shake = Math.max(0, this.shake - 40 * dt);
      } else {
        this.sx = this.sy = 0;
      }
    },
    minX: 0,
    maxX: 4000,
    minY: -400,
    maxY: 80,
    setBounds(minX, maxX, minY, maxY) {
      this.minX = minX;
      this.maxX = maxX;
      this.minY = minY ?? -400;
      this.maxY = maxY ?? 80;
    },
    bump(n) {
      this.shake = Math.max(this.shake, n);
    },
    wx(x) {
      return x - this.x + this.sx;
    },
    wy(y) {
      return y - this.y + this.sy;
    },
  };

  /* ---------- 粒子 ---------- */
  AR.FX = {
    list: [],
    spawn(p) {
      this.list.push(p);
      if (this.list.length > 400) this.list.splice(0, this.list.length - 400);
    },
    paper(x, y, n, col) {
      for (let i = 0; i < n; i++) {
        const a = AR.rand(0, Math.PI * 2);
        const s = AR.rand(40, 220);
        this.spawn({
          kind: "paper",
          x, y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s - 80,
          rot: AR.rand(0, 6),
          vr: AR.rand(-8, 8),
          life: AR.rand(0.4, 1.1),
          max: 1,
          w: AR.rand(4, 12),
          h: AR.rand(5, 16),
          col: col || (Math.random() < 0.5 ? "#f3ead3" : "#1a1a22"),
        });
      }
    },
    ink(x, y, n) {
      for (let i = 0; i < n; i++) {
        const a = AR.rand(0, Math.PI * 2);
        const s = AR.rand(20, 160);
        this.spawn({
          kind: "ink",
          x, y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: AR.rand(0.25, 0.7),
          max: 1,
          r: AR.rand(2, 7),
          col: Math.random() < 0.7 ? "#0b0b10" : "#3a1a4a",
        });
      }
    },
    spark(x, y, n, col) {
      for (let i = 0; i < n; i++) {
        const a = AR.rand(0, Math.PI * 2);
        const s = AR.rand(60, 280);
        this.spawn({
          kind: "spark",
          x, y,
          vx: Math.cos(a) * s,
          vy: Math.sin(a) * s,
          life: AR.rand(0.15, 0.45),
          max: 1,
          col: col || "#e8d48a",
        });
      }
    },
    number(x, y, text, col) {
      this.spawn({
        kind: "num",
        x, y,
        vx: AR.rand(-20, 20),
        vy: -80,
        life: 0.7,
        max: 0.7,
        text,
        col: col || "#f3ead3",
      });
    },
    afterimage(x, y, facing, col) {
      this.spawn({
        kind: "ghost",
        x, y,
        facing,
        life: 0.35,
        max: 0.35,
        col: col || "rgba(180,80,220,0.45)",
      });
    },
    update(dt) {
      for (let i = this.list.length - 1; i >= 0; i--) {
        const p = this.list[i];
        p.life -= dt;
        if (p.life <= 0) {
          this.list.splice(i, 1);
          continue;
        }
        p.x += (p.vx || 0) * dt;
        p.y += (p.vy || 0) * dt;
        if (p.kind === "paper") {
          p.vy += 380 * dt;
          p.rot += (p.vr || 0) * dt;
        } else if (p.kind === "ink") {
          p.vx *= 0.92;
          p.vy *= 0.92;
        } else if (p.kind === "spark") {
          p.vy += 200 * dt;
        } else if (p.kind === "num") {
          p.vy += 40 * dt;
        }
      }
    },
    draw(ctx, cam) {
      for (const p of this.list) {
        const x = cam.wx(p.x);
        const y = cam.wy(p.y);
        const a = Math.max(0, p.life / p.max);
        ctx.save();
        if (p.kind === "paper") {
          ctx.translate(x, y);
          ctx.rotate(p.rot);
          ctx.globalAlpha = a;
          ctx.fillStyle = p.col;
          ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        } else if (p.kind === "ink") {
          ctx.globalAlpha = a;
          ctx.fillStyle = p.col;
          ctx.beginPath();
          ctx.arc(x, y, p.r, 0, Math.PI * 2);
          ctx.fill();
        } else if (p.kind === "spark") {
          ctx.globalAlpha = a;
          ctx.strokeStyle = p.col;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(x, y);
          ctx.lineTo(x - (p.vx || 0) * 0.04, y - (p.vy || 0) * 0.04);
          ctx.stroke();
        } else if (p.kind === "num") {
          ctx.globalAlpha = a;
          ctx.fillStyle = p.col;
          ctx.font = `bold 22px ${AR.FONT}`;
          ctx.textAlign = "center";
          ctx.strokeStyle = "rgba(0,0,0,0.6)";
          ctx.lineWidth = 4;
          ctx.strokeText(p.text, x, y);
          ctx.fillText(p.text, x, y);
        } else if (p.kind === "ghost") {
          ctx.globalAlpha = a * 0.6;
          AR.drawJokerSilhouette(ctx, x, y, p.facing, p.col);
        }
        ctx.restore();
      }
    },
  };

  /* 鬼牌立繪（金髮白帽少女三視圖） */
  AR.Sprites = {
    side: null,
    front: null,
    back: null,
    ready: false,
    load() {
      const map = { side: "img/joker-side.png", front: "img/joker-front.png", back: "img/joker-back.png" };
      let left = Object.keys(map).length;
      Object.keys(map).forEach((key) => {
        const img = new Image();
        img.onload = () => { left -= 1; if (left <= 0) this.ready = true; };
        img.onerror = () => { left -= 1; };
        img.src = map[key];
        this[key] = img;
      });
    },
    has(name) {
      const img = this[name];
      return !!(img && img.complete && img.naturalWidth);
    },
    pick(p) {
      if (p && (p.state === "idle" || p.state === "kneel" || p.state === "dead" || p.kneel > 0)) {
        if (this.has("front")) return this.front;
      }
      if (this.has("side")) return this.side;
      if (this.has("front")) return this.front;
      return null;
    },
  };
  AR.Sprites.load();

  AR._tintCanvas = null;
  AR.drawTintedSprite = function (ctx, img, x, y, w, h, col, facing) {
    if (!img || !img.naturalWidth) return;
    let oc = AR._tintCanvas;
    if (!oc) oc = AR._tintCanvas = document.createElement("canvas");
    const iw = img.naturalWidth, ih = img.naturalHeight;
    if (oc.width !== iw || oc.height !== ih) { oc.width = iw; oc.height = ih; }
    const octx = oc.getContext("2d");
    octx.globalCompositeOperation = "source-over";
    octx.clearRect(0, 0, iw, ih);
    octx.drawImage(img, 0, 0);
    octx.globalCompositeOperation = "source-atop";
    octx.fillStyle = col;
    octx.fillRect(0, 0, iw, ih);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing || 1, 1);
    ctx.drawImage(oc, -w / 2, -h / 2, w, h);
    ctx.restore();
  };

  /* 簡易鬼牌剪影（殘影用） */
  AR.drawJokerSilhouette = function (ctx, x, y, facing, col) {
    const img = AR.Sprites && AR.Sprites.has("side") ? AR.Sprites.side : null;
    if (img) {
      AR.drawTintedSprite(ctx, img, x, y, 48, 72, col || "rgba(160,70,210,0.55)", facing || 1);
      return;
    }
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(facing || 1, 1);
    ctx.fillStyle = col || "rgba(160,70,210,0.5)";
    ctx.beginPath();
    ctx.ellipse(0, 10, 14, 28, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(-16, -18);
    ctx.lineTo(0, -40);
    ctx.lineTo(16, -18);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  };

  /* ---------- 音效（Web Audio，無需外部檔） ---------- */
  AR.Audio = {
    ctx: null,
    muted: false,
    master: null,
    musicGain: null,
    sfxGain: null,
    musicTimer: null,
    started: false,
    ensure() {
      if (this.ctx) return;
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.7;
      this.master.connect(this.ctx.destination);
      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.value = 0.22;
      this.musicGain.connect(this.master);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 0.4;
      this.sfxGain.connect(this.master);
    },
    resume() {
      this.ensure();
      if (this.ctx && this.ctx.state !== "running") this.ctx.resume();
      this.started = true;
      if (!this.musicTimer && !this.muted) this.startMusic();
    },
    toggle() {
      this.muted = !this.muted;
      if (this.master) this.master.gain.value = this.muted ? 0 : 0.7;
      if (!this.muted) this.resume();
      return this.muted;
    },
    tone(freq, dur, type, vol, atk, dec) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || "triangle";
      o.frequency.setValueAtTime(freq, t);
      g.gain.setValueAtTime(0, t);
      g.gain.linearRampToValueAtTime(vol ?? 0.12, t + (atk ?? 0.01));
      g.gain.exponentialRampToValueAtTime(0.0001, t + (dur ?? 0.2));
      o.connect(g);
      g.connect(this.sfxGain);
      o.start(t);
      o.stop(t + (dur ?? 0.2) + 0.05);
    },
    noise(dur, vol, freq) {
      if (!this.ctx || this.muted) return;
      const t = this.ctx.currentTime;
      const len = Math.max(1, (dur || 0.12) * this.ctx.sampleRate);
      const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
      const src = this.ctx.createBufferSource();
      src.buffer = buf;
      const f = this.ctx.createBiquadFilter();
      f.type = "lowpass";
      f.frequency.value = freq || 800;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(vol ?? 0.15, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.12));
      src.connect(f);
      f.connect(g);
      g.connect(this.sfxGain);
      src.start(t);
      src.stop(t + (dur || 0.12) + 0.02);
    },
    play(name) {
      if (!this.ctx || this.muted) return;
      switch (name) {
        case "flip":
          this.noise(0.08, 0.1, 1800);
          this.tone(420, 0.08, "square", 0.04);
          break;
        case "deal":
          this.noise(0.06, 0.08, 2200);
          this.tone(660, 0.07, "triangle", 0.05);
          break;
        case "slash":
          this.noise(0.1, 0.16, 1400);
          this.tone(220, 0.12, "sawtooth", 0.06);
          break;
        case "dash":
          this.tone(140, 0.18, "sawtooth", 0.08);
          this.noise(0.16, 0.18, 900);
          break;
        case "straight":
          this.tone(180, 0.3, "sawtooth", 0.08);
          this.tone(360, 0.28, "triangle", 0.06);
          this.noise(0.2, 0.14, 700);
          break;
        case "flush":
          this.tone(196, 0.4, "triangle", 0.07);
          this.tone(392, 0.45, "sine", 0.06);
          this.tone(294, 0.5, "triangle", 0.05);
          break;
        case "hit":
          this.noise(0.08, 0.2, 600);
          this.tone(90, 0.1, "square", 0.08);
          break;
        case "hurt":
          this.tone(180, 0.2, "sawtooth", 0.1);
          this.tone(90, 0.25, "square", 0.07);
          break;
        case "block":
          this.tone(300, 0.12, "square", 0.08);
          this.noise(0.1, 0.1, 400);
          break;
        case "break":
          this.noise(0.22, 0.22, 500);
          this.tone(110, 0.25, "triangle", 0.08);
          break;
        case "ui":
          this.tone(520, 0.06, "sine", 0.05);
          break;
        case "ok":
          this.tone(523, 0.1, "triangle", 0.07);
          this.tone(784, 0.16, "triangle", 0.06);
          break;
        case "error":
          this.tone(160, 0.16, "square", 0.07);
          break;
        case "power":
          this.tone(220, 0.4, "sawtooth", 0.07);
          this.tone(440, 0.5, "triangle", 0.06);
          this.tone(659, 0.6, "sine", 0.05);
          break;
        case "joker":
          this.tone(130, 0.8, "sawtooth", 0.07);
          this.tone(196, 0.9, "triangle", 0.05);
          this.tone(311, 1.0, "sine", 0.04);
          break;
        case "win":
          [261, 329, 392, 523].forEach((f, i) => {
            setTimeout(() => this.tone(f, 0.35, "triangle", 0.08), i * 140);
          });
          break;
        case "dead":
          this.tone(196, 0.4, "triangle", 0.08);
          this.tone(155, 0.6, "sine", 0.07);
          this.tone(98, 0.9, "sawtooth", 0.05);
          break;
        case "spike":
          this.tone(80, 0.18, "square", 0.08);
          this.noise(0.15, 0.16, 400);
          break;
        case "chest":
          this.tone(392, 0.15, "triangle", 0.07);
          this.tone(587, 0.25, "sine", 0.07);
          break;
        case "door":
          this.tone(80, 0.6, "triangle", 0.1);
          this.noise(0.4, 0.12, 300);
          break;
      }
    },
    startMusic() {
      if (!this.ctx || this.musicTimer) return;
      const ctx = this.ctx;
      const gain = this.musicGain;
      let step = 0;
      const bass = [98, 98, 82, 87, 98, 73, 82, 98];
      const pluck = [196, 233, 247, 294, 262, 233, 196, 175];
      const tick = () => {
        if (this.muted || !this.ctx) return;
        const t = ctx.currentTime;
        const b = bass[step % bass.length];
        const o = ctx.createOscillator();
        const g = ctx.createGain();
        o.type = "triangle";
        o.frequency.setValueAtTime(b, t);
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.22, t + 0.04);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
        o.connect(g);
        g.connect(gain);
        o.start(t);
        o.stop(t + 0.6);

        if (step % 2 === 0) {
          const p = pluck[(step / 2) % pluck.length];
          const o2 = ctx.createOscillator();
          const g2 = ctx.createGain();
          o2.type = "sine";
          o2.frequency.setValueAtTime(p, t + 0.08);
          g2.gain.setValueAtTime(0, t + 0.08);
          g2.gain.linearRampToValueAtTime(0.12, t + 0.1);
          g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
          o2.connect(g2);
          g2.connect(gain);
          o2.start(t + 0.08);
          o2.stop(t + 0.5);
        }
        step++;
        this.musicTimer = setTimeout(tick, 520);
      };
      tick();
    },
    stopMusic() {
      if (this.musicTimer) {
        clearTimeout(this.musicTimer);
        this.musicTimer = null;
      }
    },
  };
})(window);
