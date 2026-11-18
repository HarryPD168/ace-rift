/* 《王牌裂隙》主流程：關卡階段、UI、迴圈 */
(function (global) {
  const AR = global.AR;
  const canvas = document.getElementById("game");
  const ctx = canvas.getContext("2d");

  const Game = {
    mode: "title",
    stage: "landing",
    t: 0,
    acc: 0,
    last: 0,
    timeScale: 1,
    player: null,
    level: null,
    deck: AR.DeckSys,
    enemies: [],
    projectiles: [],
    hitboxes: [],
    hazards: [],
    zones: [],
    toasts: [],
    flavor: null,
    dialogue: null,
    tutorial: null,
    tutQueue: [],
    handFloat: null,
    cinematic: null,
    drawTimer: 0,
    flags: {},
    stats: { hits: 0, deaths: 0, cards: 0, startTime: 0, hidden: false },
    cardRects: [],
    uiRects: {},
    boss: null,
    knight: null,
    hoverUi: null,
    flash: 0,
    endingT: 0,
    result: null,
    debug: /[?&]debug=1/.test(location.search),
    preferAlcove: false,
    shuffleCd: 0,
    checkpoint: "start",
    howToPage: 0,
    introPage: 0,
    introChar: 0,
    titleT: 0,
  };

  const INTRO = [
    "我醒來時，手裡攥著一張被撕掉一半的牌。",
    "牌面上畫著一個戴白帽的金髮少女，紫眼睛靜靜看著我。\n——那是我自己。",
    "遠處，一張巨大的黑桃 A 像山一樣插在大地上，牌面上的眼睛緩緩睜開。",
    "「又一張跑出來的牌。」它說，「滾回牌堆裡去。」",
    "我看了看手裡的半張鬼牌，又看了看它。\n「不好意思，」我說，「我今天不想被洗。」",
  ];

  const HOWTO = [
    { title: "移動與跳躍", body: "鍵盤以方向鍵為主：← / → 左右移動，↑ 跳躍，↓ 互動（開啟寶箱）。空白鍵或 W 也可跳躍，A / D 也可移動，E 或 S 也可互動。\n觸控：使用畫面左側圓形方向鍵（上跳、下互動、左右移動，可滑動），右側「跳」亦可跳躍。按住上方向或「跳」可跳得更高。\n落下深淵會被收回牌堆，可從檢查點重試。" },
    { title: "出牌即攻擊", body: "手牌最多 5 張。\n鍵盤按 1–5 或滑鼠／手指點選手牌（可多選），再按 J、F、Enter 或點「出牌」。\n若未選牌，會打出最左側（最上面）的一張，作為「單張」斬擊。觸控時手牌位於畫面下方，目標足夠大，可用拇指點選。\n按 T 或點「洗牌」，可把手牌與棄牌洗回牌庫並重新抽滿 5 張。" },
    { title: "牌型即技能", body: "對子：兩張同點數——身前雙重長距突刺，可穿透並眩暈 1.5 秒。\n三條：三張同點數——扇形彈幕。\n順子：三張以上連續點數——站立多段連斬，攻擊時不會位移。缺口請藉碎牌平台跳躍通過。\n同花：三張以上同花色——黑桃為貫穿箭雨，可破盾清場。\n另有葫蘆、鐵支、同花順等更高牌型。" },
    { title: "百搭與牌力", body: "主角是鬼牌。按 Q 或點「百搭」，可當作任意花色／點數參與牌型，每場戰鬥限用 3 次。\n連續出牌會累積「牌力值」，滿值後按 K、點擊牌力槽或點「Joker」，發動 Joker Time：10 秒內出牌不消耗，且效果加倍。" },
    { title: "環境與戰鬥", body: "黑桃牌可刺破黑桃障礙、激活黑桃樁。靠近寶箱時按 ↓、E 或點「互動」打開。\n精英的盾要用同花擊破。\nBoss 的紅色地面請用跳躍避開，金色蓄力槍要用對子打斷，召喚物可用同花清場。" },
    { title: "觸控與介面", body: "手機、平板可直向或橫向遊玩。觸控按鈕在偵測到觸控或較窄螢幕時出現，用鍵盤遊玩的電腦預設會隱藏。\n左側為圓形方向鍵（上跳、下互動、左右移動）；右側有「跳」、「出牌」、「互動」、「百搭」、「Joker」與「洗牌」。\n畫面上方可暫停、靜音或開啟說明；死亡後可點「重試」。\n首次點擊畫面會取得焦點並開啟音效。" },
  ];
  AR.HOWTO_LEN = HOWTO.length;
  AR.HOWTO = HOWTO;
  AR.INTRO = INTRO;


  /* ---------------- 初始化 ---------------- */
  Game.init = function () {
    AR.Input.bind(canvas);
    canvas.focus();
    this.resetWorld(true);
    this.last = performance.now();
    requestAnimationFrame(this.loop.bind(this));
  };

  Game.resetWorld = function (fromTitle) {
    this.level = AR.buildLevel();
    this.player = AR.makePlayer(820, -240);
    this.player.state = "fall";
    this.deck.resetLevel();
    this.enemies = [];
    this.projectiles = [];
    this.hitboxes = [];
    this.hazards = [];
    this.zones = [];
    this.toasts = [];
    this.flavor = null;
    this.dialogue = null;
    this.tutorial = null;
    this.tutQueue = [];
    this.handFloat = null;
    this.cinematic = null;
    this.drawTimer = 0;
    this.shuffleCd = 0;
    this.flags = { landed: false, moved: false, jumped: false, firstAtk: false };
    this.boss = null;
    this.knight = null;
    this.stage = "landing";
    this.checkpoint = "start";
    this.timeScale = 1;
    this.endingT = 0;
    this.result = null;
    this.stats = { hits: 0, deaths: this.stats ? this.stats.deaths : 0, cards: 0, startTime: AR.now(), hidden: false };
    AR.Camera.x = 820 - AR.W * 0.42;
    AR.Camera.y = -200;
    AR.Camera.setBounds(0, 2000, -300, 80);
    AR.FX.list = [];
  };

  /* ---------------- 主迴圈 ---------------- */
  Game.loop = function (now) {
    const raw = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.acc += raw;
    const step = 1 / 60;
    while (this.acc >= step) {
      this.update(step);
      this.acc -= step;
    }
    this.render();
    requestAnimationFrame(this.loop.bind(this));
  };

  Game.update = function (dt) {
    this.t += dt;
    if (this.flash > 0) this.flash -= dt;
    const I = AR.Input;

    if (I.pressed("KeyM")) AR.Audio.toggle();
    if (this.mode === "title") this.updateTitle(dt);
    else if (this.mode === "intro") this.updateIntro(dt);
    else if (this.mode === "howto") this.updateHowto(dt);
    else if (this.mode === "pause") this.updatePause(dt);
    else if (this.mode === "dead") this.updateDead(dt);
    else if (this.mode === "victory") this.updateVictory(dt);
    else if (this.mode === "play") this.updatePlay(dt);

    I.endFrame();
  };

  Game.updateTitle = function (dt) {
    this.titleT += dt;
    const I = AR.Input;
    this.hoverUi = this.hitUi();
    if (I.pressed("Enter") || I.pressed("Space") || (I.mouse.clicked && this.hoverUi === "start")) {
      AR.Audio.resume();
      AR.Audio.play("ok");
      this.mode = "intro";
      this.introPage = 0;
      this.introChar = 0;
    } else if (I.pressed("KeyH") || (I.mouse.clicked && this.hoverUi === "howto")) {
      AR.Audio.resume();
      AR.Audio.play("ui");
      this.mode = "howto";
      this.howToPage = 0;
    } else if (I.mouse.clicked && this.hoverUi === "mute") {
      AR.Audio.resume();
      AR.Audio.toggle();
    }
  };

  Game.updateIntro = function (dt) {
    const text = INTRO[this.introPage] || "";
    this.introChar = Math.min(text.length, this.introChar + dt * 28);
    const I = AR.Input;
    if (I.pressed("Escape")) {
      this.startPlay();
      return;
    }
    if (I.pressed("Enter") || I.pressed("Space") || I.mouse.clicked) {
      AR.Audio.play("ui");
      if (this.introChar < text.length) this.introChar = text.length;
      else if (this.introPage < INTRO.length - 1) {
        this.introPage++;
        this.introChar = 0;
      } else this.startPlay();
    }
  };

  Game.updateHowto = function (dt) {
    const I = AR.Input;
    if (I.pressed("Escape") || I.pressed("KeyH") || I.pressed("KeyB")) {
      this.mode = this.flags._fromPause ? "pause" : "title";
      this.flags._fromPause = false;
      AR.Audio.play("ui");
      return;
    }
    if (I.pressed("Enter") || I.pressed("Space") || I.pressed("ArrowRight") || I.pressed("KeyD") || I.mouse.clicked) {
      if (this.howToPage < HOWTO.length - 1) {
        this.howToPage++;
        AR.Audio.play("ui");
      } else {
        this.mode = this.flags._fromPause ? "pause" : "title";
        this.flags._fromPause = false;
      }
    }
    if (I.pressed("ArrowLeft") || I.pressed("KeyA")) {
      this.howToPage = Math.max(0, this.howToPage - 1);
      AR.Audio.play("ui");
    }
  };

  Game.updatePause = function (dt) {
    const I = AR.Input;
    this.hoverUi = this.hitUi();
    if (I.pressed("Escape") || I.pressed("Enter") || (I.mouse.clicked && this.hoverUi === "resume")) {
      this.mode = "play";
      AR.Audio.play("ui");
    } else if (I.pressed("KeyH") || (I.mouse.clicked && this.hoverUi === "howto")) {
      this.flags._fromPause = true;
      this.mode = "howto";
      this.howToPage = 0;
      AR.Audio.play("ui");
    } else if (I.mouse.clicked && this.hoverUi === "title") {
      this.mode = "title";
      AR.Audio.play("ui");
    }
  };

  Game.updateDead = function (dt) {
    const I = AR.Input;
    if (I.pressed("KeyR") || I.pressed("Enter") || I.pressed("Space") || I.mouse.clicked) {
      AR.Audio.play("ok");
      this.retryCheckpoint();
    }
  };

  Game.updateVictory = function (dt) {
    this.endingT += dt;
    const I = AR.Input;
    this.hoverUi = this.hitUi();
    if (I.pressed("Enter") || (I.mouse.clicked && this.hoverUi === "title")) {
      this.mode = "title";
      this.resetWorld(true);
      AR.Audio.play("ui");
    } else if (I.pressed("KeyR") || (I.mouse.clicked && this.hoverUi === "again")) {
      this.stats.deaths = 0;
      this.resetWorld(true);
      this.startPlay();
      AR.Audio.play("ok");
    }
  };

  Game.startPlay = function () {
    this.resetWorld(false);
    this.mode = "play";
    this.stage = "landing";
    this.player.y = -280;
    this.player.vy = 200;
    this.player.state = "fall";
    AR.Audio.resume();
    AR.Audio.play("ok");
  };

  /* ---------------- 遊戲中 ---------------- */
  Game.updatePlay = function (dt) {
    const I = AR.Input;
    if (I.pressed("Escape")) {
      this.mode = "pause";
      AR.Audio.play("ui");
      return;
    }
    if (I.pressed("KeyH")) {
      this.flags._fromPause = true;
      this.mode = "howto";
      this.howToPage = 0;
      AR.Audio.play("ui");
      return;
    }
    if (this.debug) this.updateDebug();

    const gdt = dt * this.timeScale;
    this.timeScale = AR.lerp(this.timeScale, 1, 1 - Math.pow(0.15, dt));

    if (I.pressed("Enter") && this.dialogue) {
      this.dialogue.t = 99;
    }

    if (this.shuffleCd > 0) this.shuffleCd -= gdt;
    this.handleCardInput();
    this.deck.update(gdt);
    this.updateDraw(gdt);

    const solids = AR.allSolids(this.level);
    const lockMove = !!(this.cinematic && this.cinematic.lock) || this.stage === "ending";
    AR.updatePlayer(this.player, gdt, I, solids, lockMove || this.player.kneel > 0);

    const u = this.level.updraft;
    if (u.on && AR.aabb(this.player, u)) {
      this.player.vy = Math.min(this.player.vy, -520);
    }

    this.updateAuras(gdt);
    this.updateProjectiles(gdt);
    this.updateHitboxes(gdt);
    this.updateHazards(gdt);
    AR.updateEnemies(this, gdt);
    AR.FX.update(gdt);
    this.updateToasts(gdt);
    this.updateStage(gdt);

    if (this.player.y > 900 && !this.player.dead && !(this.player.action && this.player.action.iframe)) {
      this.player.hp = 0;
      this.player.dead = true;
      AR.Audio.play("dead");
    }
    if (this.player.dead && this.mode === "play" && this.stage !== "ending") {
      this.stats.deaths++;
      this.mode = "dead";
    }

    this.updateCamera(gdt);
    this.stats.hits = this.player.hitsThisLife;
    this.stats.cards = this.player.cardsPlayed;
    this.stats.hidden = this.player.hiddenFound;
  };

  Game.updateDebug = function () {
    const I = AR.Input;
    if (I.pressed("F7")) {
      this.player.hp = this.player.maxHp;
      this.player.invuln = 5;
      this.toast("DEBUG：短暫無敵");
    }
    if (I.pressed("F8")) this.skipStage();
    if (I.pressed("F9")) {
      this.deck.power = 100;
      this.toast("DEBUG：牌力值已滿");
    }
  };

  Game.skipStage = function () {
    const order = ["landing", "move_teach", "obstacle", "guards", "platforms", "puzzle", "elite", "boss", "ending"];
    const i = order.indexOf(this.stage);
    const next = order[Math.min(order.length - 1, i + 1)];
    this.toast("DEBUG：跳至 " + next);
    if (next === "guards") {
      this.player.x = 1700; this.player.y = 568 - this.player.h;
      this.stage = "guards"; this.flags.readyGuards = false;
    } else if (next === "platforms") {
      this.player.x = 3300; this.player.y = 568 - this.player.h;
      this.stage = "platforms"; this.setCheckpoint("platforms");
      this.ensureStraightCards();
    } else if (next === "puzzle") {
      this.player.x = 6500; this.player.y = 568 - this.player.h;
      this.stage = "puzzle"; this.setCheckpoint("puzzle");
      this.ensurePuzzleCards();
    } else if (next === "elite") {
      this.level.doorOpen = true;
      this.player.x = 8200; this.player.y = 568 - this.player.h;
      this.stage = "elite"; this.flags.eliteStarted = false;
    } else if (next === "boss") {
      this.level.eliteDoorOpen = true;
      this.level.solids.forEach((s) => { if (s.id === "boss_left") s.disabled = true; });
      this.player.x = 9600; this.player.y = 568 - this.player.h;
      this.stage = "boss"; this.flags.bossStarted = false;
    } else if (next === "ending") this.beginEnding();
    else this.stage = next;
  };

  Game.handleCardInput = function () {
    const I = AR.Input;
    for (let n = 1; n <= 5; n++) {
      if (I.pressed("Digit" + n) || I.pressed("Numpad" + n)) this.deck.toggle(n - 1);
    }
    if (I.pressed("KeyQ")) {
      if (!this.deck.toggleWild()) this.toast("百搭次數已用盡");
    }
    if (I.pressed("KeyK")) this.tryJoker();

    if (I.mouse.clicked) {
      const ui = this.hitUi();
      if (ui && ui.startsWith("card:")) this.deck.toggle(+ui.split(":")[1]);
      else if (ui === "play") this.tryPlay();
      else if (ui === "wild") this.deck.toggleWild();
      else if (ui === "power") this.tryJoker();
      else if (ui === "mute") AR.Audio.toggle();
    }

    const playKey = I.pressed("KeyJ") || I.pressed("KeyF") || I.pressed("Enter");
    if (playKey && this.mode === "play" && !this.dialogue) this.tryPlay();

    if (I.pressed("KeyE") || I.pressed("KeyS") || I.pressed("ArrowDown")) this.tryInteract();
    if (I.pressed("KeyT")) this.tryShuffle();
  };

  Game.tryShuffle = function () {
    if (this.mode !== "play") return false;
    if (this.player.dead) return false;
    if (this.deck.locked) return false;
    if (this.dialogue) return false;
    if (this.cinematic && this.cinematic.lock) return false;
    if (this.stage === "ending") return false;
    if (this.shuffleCd > 0) return false;
    if (!this.deck.shuffleDeck()) return false;
    this.shuffleCd = 0.5;
    this.toast("牌庫已重新洗牌");
    return true;
  };

  Game.tryJoker = function () {
    if (this.deck.power >= this.deck.powerMax && this.deck.jokerTime <= 0) {
      this.deck.triggerJokerTime();
      this.flash = 0.4;
      this.toast("JOKER TIME！十秒內出牌不消耗，效果加倍！");
      AR.Camera.bump(12);
      return true;
    }
    return false;
  };

  Game.tryPlay = function () {
    if (this.player.dead || this.player.kneel > 0) return;
    if (this.player.action) return;
    if (this.cinematic && this.cinematic.lock) return;

    let sel = this.deck.selected();
    const wild = this.deck.wildArmed && (this.deck.wildUses > 0 || this.deck.jokerTime > 0);
    if (sel.length === 0 && !wild) {
      if (!this.deck.hand.length) {
        this.toast("沒有手牌。");
        return;
      }
      this.deck.hand[0].selected = true;
      sel = [this.deck.hand[0]];
    }
    const ev = this.deck.preview();
    if (!ev) {
      this.deck.hand.forEach((c) => { if (c.selected) c.shake = 1; });
      AR.Audio.play("error");
      this.toast("無法組成牌型。再選一次，或只出單張。");
      return;
    }
    this.deck.consumePlayed(ev.cards, ev.usedWild);
    this.deck.clearSelect();
    this.deck.addPower(ev.type);
    AR.beginAction(this, ev);
    this.afterPlay(ev);
    if (this.deck.power >= this.deck.powerMax && this.deck.jokerTime <= 0) {
      this.toast(AR.Input.showTouch ? "牌力值已滿——點「Joker」或牌力槽，發動 Joker Time！" : "牌力值已滿——按 K 或點擊牌力槽，發動 Joker Time！");
    }
  };

  Game.afterPlay = function (ev) {
    const hasSpade = ev.cards.some((c) => c.suit === "spade");
    if (hasSpade) {
      for (const pil of this.level.pillars) {
        if (pil.on) continue;
        const dx = Math.abs(this.player.x + this.player.w / 2 - (pil.x + pil.w / 2));
        const dy = Math.abs(this.player.y + this.player.h / 2 - (pil.y + pil.h / 2));
        if (dx < 170 && dy < 160) this.activatePillar(pil);
      }
    }
    if (this.stage === "obstacle" || this.stage === "move_teach") {
      this.flags.firstAtk = true;
    }
    if (ev.type === "pair") { this.flags.playedPair = true; this.flags.allowSix = false; }
    if (ev.type === "straight" || ev.type === "straightflush") this.flags.playedStraight = true;
    if (ev.type === "flush") this.flags.playedFlush = true;
  };

  Game.tryInteract = function () {
    const ch = this.level.chest;
    if (ch && !ch.open && AR.dist(this.player.x, this.player.y, ch.x, ch.y) < 90) {
      ch.open = true;
      ch.got = true;
      this.player.hiddenFound = true;
      this.player.foundAce = true;
      this.deck.addToCollection("spade", 1);
      this.deck.giveCard("spade", 1) || this.deck.queueDraw("spade", 1, true);
      AR.Audio.play("chest");
      AR.FX.spark(ch.x + 20, ch.y, 18, "#e8d48a");
      this.toast("獲得 ♠A —— 最強單張。");
      this.setFlavor("隱藏凹室裡只有一張牌。它比任何數字都更鋒利。");
    }
  };

  Game.updateDraw = function (dt) {
    const max = this.flags.allowSix ? 6 : 5;
    if (this.deck.hand.length >= max) return;
    if (this.player.action) return;
    if (this.flags.holdDraw) return;
    this.drawTimer -= dt;
    if (this.drawTimer > 0) return;
    this.drawTimer = 0.32;
    const hint = this.currentDrawHint();
    this.deck.drawOne(hint, max);
  };

  Game.currentDrawHint = function () {
    if (this.stage === "guards" && !this.flags.playedPair) return "pair3";
    if (this.stage === "platforms" && !this.flags.crossedBig) return "straight";
    if (this.stage === "puzzle") return "spade";
    if (this.stage === "elite") {
      const kn = this.knight;
      if (kn && !kn.dead && kn.shielded) return "flush";
      return "pair";
    }
    if (this.stage === "boss") {
      const b = this.boss;
      if (b && b.state === "goldCharge") return "pair";
      if (b && (b.state === "spikes" || this.hazards.some((h) => h.kind === "spikezone"))) return "straight";
      if (this.enemies.some((e) => e.type === "guard" && !e.dead)) return "flush";
      return "mixed";
    }
    return "mixed";
  };

  Game.giveNow = function (suit, rank, keepPred) {
    if (this.deck.hand.some((c) => c.suit === suit && c.rank === rank)) return;
    if (this.deck.hand.length >= 5) {
      let idx = -1;
      for (let i = this.deck.hand.length - 1; i >= 0; i--) {
        if (keepPred && keepPred(this.deck.hand[i])) continue;
        idx = i;
        break;
      }
      if (idx < 0) return;
      this.deck.discard.push(this.deck.hand.splice(idx, 1)[0]);
    }
    this.deck.giveCard(suit, rank);
  };

  Game.ensureStraightCards = function () {
    const need = [5, 6, 7];
    const keep = (c) => c.suit === "spade" && need.includes(c.rank);
    for (const r of need) this.giveNow("spade", r, keep);
  };

  Game.ensurePuzzleCards = function () {
    const want = [["spade", 5], ["spade", 7], ["spade", 9]];
    const keep = (c) => want.some(([s, r]) => c.suit === s && c.rank === r);
    for (const [s, r] of want) this.giveNow(s, r, keep);
  };

  Game.ensurePairCards = function () {
    this.flags.allowSix = false;
    this.flags.holdDraw = true;
    // 騰出手牌空位，發給兩張教學用 ♠3，維持上限 5 張
    const need = 2 - this.deck.hand.filter((c) => c.rank === 3).length;
    let removed = 0;
    for (let i = this.deck.hand.length - 1; i >= 0 && removed < need; i--) {
      if (this.deck.hand[i].rank === 3) continue;
      this.deck.discard.push(this.deck.hand.splice(i, 1)[0]);
      removed++;
    }
    for (let i = 0; i < need; i++) this.deck.queueDraw("spade", 3, true);
    if (need >= 1) this.deck.drawOne("pair3", 5);
    const self = this;
    setTimeout(function () {
      if (need >= 2) self.deck.drawOne("pair3", 5);
      else if (need === 1 && self.deck.hand.length < 5) self.deck.drawOne("pair3", 5);
      self.flags.holdDraw = false;
    }, 400);
  };

  Game.spawnProj = function (p) { this.projectiles.push(p); };
  Game.spawnHitbox = function (h) { this.hitboxes.push(h); };
  Game.spawnZone = function (z) { this.zones.push(z); };

  Game.updateProjectiles = function (dt) {
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      if (p.delay && p.delay > 0) {
        p.delay -= dt;
        continue;
      }
      if (p.ay) p.vy += p.ay * dt;
      p.x += (p.vx || 0) * dt;
      p.y += (p.vy || 0) * dt;
      p.life -= dt;
      this.collideFriendly(p);
      if (p.life <= 0 || p.y > 900) this.projectiles.splice(i, 1);
    }
  };

  Game.updateHitboxes = function (dt) {
    for (let i = this.hitboxes.length - 1; i >= 0; i--) {
      const h = this.hitboxes[i];
      h.life -= dt;
      if (h.friendly) this.collideFriendly(h);
      else if (AR.aabb(h, this.player)) {
        AR.hurtPlayer(this.player, h.dmg, h.x);
        if (!h.pierce) h.life = 0;
      }
      if (h.life <= 0) this.hitboxes.splice(i, 1);
    }
  };

  Game.collideFriendly = function (box) {
    if (!box.friendly || box._spent) return;
    const obs = this.level.solids.find((s) => s.type === "obstacle" && !this.level.obstacleBroken);
    if (obs && AR.aabb(box, obs)) {
      if (box.suit === "spade" || box.from === "single" || box.from === "flush") {
        this.breakObstacle();
        if (!box.pierce) box.life = 0;
      }
    }
    for (const pil of this.level.pillars) {
      if (!pil.on && AR.aabb(box, pil) && (box.suit === "spade" || box.from === "flush")) {
        this.activatePillar(pil);
      }
    }
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (!AR.aabb(box, e)) continue;
      if (box.hitIds && box.hitIds.has(e)) continue;
      if (!box.hitIds) box.hitIds = new Set();
      box.hitIds.add(e);
      if (box.instakillSmall && e.type === "guard") AR.hurtEnemy(e, 999, box, this);
      else AR.hurtEnemy(e, box.dmg, box, this);
      if (!box.pierce) {
        box.life = 0;
        box._spent = true;
      }
    }
  };

  Game.updateHazards = function (dt) {
    for (let i = this.hazards.length - 1; i >= 0; i--) {
      const h = this.hazards[i];
      h.t += dt;
      h.life -= dt;
      if (h.kind === "spikezone") {
        if (!h.erupted && h.t >= h.tele) {
          h.erupted = true;
          AR.Audio.play("spike");
          AR.Camera.bump(6);
        }
        if (h.erupted && AR.aabb(this.player, { x: h.x, y: h.y - 80, w: h.w, h: 90 })) {
          if (!(this.player.action && this.player.action.iframe)) {
            AR.hurtPlayer(this.player, h.dmg, h.x);
          }
        }
      }
      if (h.life <= 0) this.hazards.splice(i, 1);
    }
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.life -= dt;
      z.tick = (z.tick || 0) - dt;
      if (z.tick <= 0) {
        z.tick = 0.4;
        for (const e of this.enemies) {
          if (!e.dead && AR.aabb(z, e)) AR.hurtEnemy(e, z.dmg, { from: "flush" }, this);
        }
      }
      if (z.life <= 0) this.zones.splice(i, 1);
    }
  };

  Game.updateAuras = function (dt) {
    const p = this.player;
    if (p.aura) {
      p.aura.t -= dt;
      p.aura.tick -= dt;
      if (p.aura.tick <= 0) {
        p.aura.tick = 0.5;
        const c = AR.center(p);
        let hit = false;
        for (const e of this.enemies) {
          if (e.dead) continue;
          const d = AR.dist(c.x, c.y, e.x + e.w / 2, e.y + e.h / 2);
          if (d < p.aura.r) {
            AR.hurtEnemy(e, p.aura.dmg, { from: "flush" }, this);
            hit = true;
          }
        }
        if (hit) {
          p.hp = Math.min(p.maxHp, p.hp + p.aura.heal);
          AR.FX.number(p.x + p.w / 2, p.y, "+" + p.aura.heal, "#e85a6a");
        }
      }
      if (p.aura.t <= 0) p.aura = null;
    }
    if (this.cinematic) {
      this.cinematic.t += dt;
      if (this.cinematic.t >= this.cinematic.dur) this.cinematic = null;
    }
    if (this.boss && this.boss.phase === 3 && this.deck.power >= this.deck.powerMax && this.deck.jokerTime <= 0) {
      this.flags.jtHint = (this.flags.jtHint || 0) + dt;
      if (this.flags.jtHint > 8) {
        this.tryJoker();
        this.flags.jtHint = 0;
      }
    }
  };

  Game.breakObstacle = function () {
    if (this.level.obstacleBroken) return;
    this.level.obstacleBroken = true;
    const obs = this.level.solids.find((s) => s.type === "obstacle");
    AR.FX.paper(obs.x + 40, obs.y + 80, 22, "#f3ead3");
    AR.FX.ink(obs.x + 40, obs.y + 80, 8);
    AR.Audio.play("break");
    AR.Camera.bump(8);
    this.flags.brokeObstacle = true;
    this.setFlavor("廣場的角落還留著上一位訪客的血跡——乾涸成墨。");
  };

  Game.activatePillar = function (pil) {
    if (pil.on) return;
    pil.on = true;
    AR.Audio.play("ok");
    AR.FX.spark(pil.x + 20, pil.y + 40, 14, "#e8d48a");
    if (pil.id === "left") {
      this.level.bridges.left.on = true;
      this.toast("尖刺橋升起。");
    } else {
      this.level.bridges.right.on = true;
      this.toast("橋延伸到對面平台。");
    }
    if (this.level.pillars.every((p) => p.on) && !this.level.doorOpen) {
      const self = this;
      setTimeout(function () {
        self.level.doorOpen = true;
        self.level.updraft.on = true;
        AR.Audio.play("door");
        AR.Camera.bump(10);
        self.setFlavor("黑桃只認黑桃。這個世界的一切，都刻著它的主人。");
        self.toast("大門開啟。上升氣流出現了。");
      }, 500);
    }
  };

  Game.updateStage = function (dt) {
    const p = this.player;
    switch (this.stage) {
      case "landing": this.stageLanding(dt); break;
      case "move_teach": this.stageMove(dt); break;
      case "obstacle": this.stageObstacle(dt); break;
      case "guards": this.stageGuards(dt); break;
      case "platforms": this.stagePlatforms(dt); break;
      case "puzzle": this.stagePuzzle(dt); break;
      case "elite": this.stageElite(dt); break;
      case "boss": this.stageBoss(dt); break;
      case "ending": this.stageEnding(dt); break;
    }
    if (this.stage === "obstacle" || this.stage === "move_teach") {
      if (p.x > 1650 && this.flags.brokeObstacle) this.enterGuards();
    }
    if (this.stage === "guards" && this.flags.guardsDone && p.x > 3100) this.enterPlatforms();
    if (this.stage === "platforms" && p.x > 6360) this.enterPuzzle();
    if ((this.stage === "puzzle" || this.stage === "platforms") && p.x > 7900 && this.level.doorOpen) this.enterElite();
    if ((this.stage === "elite" || this.stage === "puzzle") && p.x > 9300 && this.level.eliteDoorOpen) this.enterBoss();
  };

  Game.stageLanding = function (dt) {
    const p = this.player;
    if (!this.flags.landed && p.onGround) {
      this.flags.landed = true;
      p.kneel = 1.35;
      p.state = "kneel";
      AR.Camera.bump(10);
      AR.Audio.play("hit");
      AR.FX.paper(p.x, p.y + p.h, 16, "#f3ead3");
      this.flags.holdDraw = true;
    }
    if (this.flags.landed && p.kneel <= 0 && !this.flags.landTalk) {
      this.flags.landTalk = true;
      this.flags.holdDraw = false;
      this.queueTut([
        "你是一張鬼牌。你的規則，自己寫。",
        AR.Input.showTouch
          ? "用左側圓形方向鍵移動：上跳、下互動、左右走。右側「跳」也可跳躍。"
          : "方向鍵：← / → 移動，↑ 跳躍，↓ 互動。空白鍵或 W 也可跳躍。",
        AR.Input.showTouch
          ? "點選手牌（可多選），再點「出牌」。未選牌時會打出最左邊一張。"
          : "按 J、F 或 Enter 出牌——打出你手中最上面的一張牌。",
      ]);
      this.stage = "move_teach";
      this.setCheckpoint("start");
    }
  };

  Game.stageMove = function (dt) {
    const p = this.player;
    if (Math.abs(p.vx) > 40) this.flags.moved = true;
    if (p.state === "jump" || p.state === "fall") this.flags.jumped = true;
    if (p.x < 520) {
      this.showTut("嘗試攻擊——對左側那張立著的 ♠2 打出一張黑桃。", "obstacle");
      this.stage = "obstacle";
    }
    if (p.x > 1100 && !this.flags.warnLeft) {
      this.flags.warnLeft = true;
      this.toast("左側立著一張 ♠2 紙牌障礙。先試著攻擊它。");
    }
  };

  Game.stageObstacle = function (dt) {
    if (this.flags.brokeObstacle && !this.flags.afterObs) {
      this.flags.afterObs = true;
      this.clearTut("obstacle");
      this.setCheckpoint("afterObstacle");
      this.toast("單張——基礎斬擊。黑桃會向前射出尖刺。");
    }
  };


  Game.enterStage = function (name, snap) {
    this.stage = name;
    this.clearTut();
    this.toasts = this.toasts.filter((t) => t.t < 0.5 && !/DEBUG/.test(t.msg));
    if (snap && this.player) AR.Camera.follow(this.player.x + this.player.w / 2, this.player.y + this.player.h / 2, 1, true);
  };

  Game.enterGuards = function () {
    if (this.stage === "guards") return;
    this.enterStage("guards", true);
    this.flags.readyGuards = false;
    AR.Camera.setBounds(1500, 2800, -200, 80);
  };

  Game.stageGuards = function (dt) {
    if (!this.flags.readyGuards) {
      this.flags.readyGuards = true;
      this.deck.resetWildForCombat();
      const g = AR.makeGuard(2080, 568 - 78);
      g.state = "idle";
      g.stateT = 2;
      this.enemies.push(g);
      this.flags.guard1 = g;
      this.timeScale = 0.22;
      this.showTut("連續打出兩張相同點數的牌 → 對子", "pair");
      this.ensurePairCards();
      this.toast("系統強制發牌：♠3 ……再來一張 ♠3。");
    }
    const g1 = this.flags.guard1;
    if (g1 && g1.dead && !this.flags.g1done) {
      this.flags.g1done = true;
      this.clearTut("pair");
      this.toast("對子（Pair）——雙重突刺，可穿透並眩暈。");
      this.deck.addToCollection("spade", 3);
      this.deck.queueDraw("spade", 3);
      this.toast("拾取：♠3 加入牌堆。");
      const self = this;
      setTimeout(function () {
        if (self.stage !== "guards") return;
        const g2 = AR.makeGuard(2920, 568 - 78);
        g2.facing = -1;
        self.enemies.push(g2);
        self.flags.guard2 = g2;
        AR.Camera.setBounds(1500, 3400, -200, 80);
        self.toast("又一名衛兵從右側出現。這次自己組牌。");
      }, 900);
    }
    const g2 = this.flags.guard2;
    if (g1 && g1.dead && g2 && g2.dead && !this.flags.guardsDone) {
      this.flags.guardsDone = true;
      this.setCheckpoint("afterGuards");
      this.deck.queueDraw("spade", 6, true);
      this.toast("前方的廣場斷裂了……");
      AR.Camera.setBounds(0, 5200, -200, 80);
    }
  };

  Game.enterPlatforms = function () {
    if (this.stage === "platforms") return;
    this.enterStage("platforms", true);
    this.setCheckpoint("platforms");
    this.ensureStraightCards();
    AR.Camera.setBounds(3000, 6200, -360, 80);
  };

  Game.stagePlatforms = function (dt) {
    const p = this.player;
    if (p.x > 3480 && p.x < 3820 && !this.flags.gap1hint) {
      this.flags.gap1hint = true;
      this.toast("可藉中間的碎牌平台跳過去。");
    }
    if (p.x > 4100 && p.x < 5080 && !this.flags.gap2hint) {
      this.flags.gap2hint = true;
      this.ensureStraightCards();
      this.showTut("連續打出三張點數相連的牌 → 順子（Straight）\n順子會在身前多段連斬，攻擊時不會位移。缺口請跳上碎牌平台通過。", "straight");
    }
    if (p.x >= 5080 && !this.flags.crossedBig) {
      this.flags.crossedBig = true;
      this.clearTut("straight");
      this.setFlavor("牌面上的編號不是裝飾——是順序，是節奏，是你腳步的節拍。");
      this.setCheckpoint("p3");
    }
    if (p.x > 5200 && p.x < 5600 && !this.flags.alcoveHint && !this.player.hiddenFound) {
      this.flags.alcoveHint = true;
      this.toast("高牆上似乎有個撕裂的凹室……可從碎牌踏腳處向上跳入。");
    }
    if (p.y < 400 && p.x > 5480 && p.x < 5880) {
      if (!this.level.chest.open && !this.flags.chestHint) {
        this.flags.chestHint = true;
        this.toast(AR.Input.showTouch ? "靠近寶箱，點「互動」打開。" : "按 E 打開寶箱。");
      }
    }
  };

  Game.enterPuzzle = function () {
    if (this.stage === "puzzle") return;
    this.enterStage("puzzle", true);
    this.setCheckpoint("puzzle");
    this.ensurePuzzleCards();
    this.showTut("花色不只是戰鬥屬性，也是鑰匙。\n對黑桃樁打出任意點數的黑桃牌。", "puzzle");
    AR.Camera.setBounds(6300, 7600, -200, 80);
  };

  Game.stagePuzzle = function (dt) {
    if (this.level.doorOpen) this.clearTut("puzzle");
  };

  Game.enterElite = function () {
    if (this.stage === "elite") return;
    this.enterStage("elite", true);
    this.flags.eliteStarted = false;
    AR.Camera.setBounds(7860, 9100, -200, 80);
  };

  Game.stageElite = function (dt) {
    if (!this.flags.eliteStarted && this.player.x > 8000) {
      this.flags.eliteStarted = true;
      this.deck.resetWildForCombat();
      this.setCheckpoint("elite");
      const kn = AR.makeKnight(8600, 568 - 110);
      this.knight = kn;
      this.enemies.push(kn);
      this.showTut("紙偶騎士舉起了盾。用三張同花色組成「同花」才能破防。", "flush");
      this.ensurePuzzleCards();
      while (this.deck.spadeCount() < 3) {
        if (this.deck.hand.length < 5) this.deck.giveCard("spade", [5, 7, 9, 6, 8][this.deck.spadeCount()]);
        else { this.deck.queueDraw("spade", 9, true); break; }
      }
    }
    if (this.knight && this.knight.shieldBroken) this.clearTut("flush");
    if (this.knight && this.knight.dead && !this.flags.eliteDone) {
      this.flags.eliteDone = true;
      this.setFlavor("騎士的盔甲碎成紙屑，裡面什麼都沒有——空的，像被抽走了靈魂。");
      this.toast("解鎖：牌堆編輯　　獲得：黑桃碎片 × 3");
      this.level.eliteDoorOpen = true;
      AR.Audio.play("door");
      this.setCheckpoint("preboss");
    }
  };

  Game.enterBoss = function () {
    if (this.stage === "boss") return;
    this.enterStage("boss", true);
    this.flags.bossStarted = false;
  };

  Game.stageBoss = function (dt) {
    if (!this.flags.bossStarted && this.player.x > 9480) {
      this.flags.bossStarted = true;
      this.deck.resetWildForCombat();
      this.setCheckpoint("boss");
      this.level.solids.forEach((s) => {
        if (s.id === "boss_left") s.disabled = false;
      });
      AR.Camera.setBounds(9260, 11200, -240, 80);
      const b = AR.makeBoss(10400, 568 - 210);
      this.boss = b;
      this.enemies.push(b);
      AR.Camera.bump(16);
      AR.Audio.play("power");
      this.say("黑桃 J", "區區一張鬼牌，也敢踏入黑桃的領域？");
      this.toast("尖刺地面用跳躍避開　　蓄力金圈用對子打斷");
    }
    if (this.boss && this.boss.dead && !this.flags.bossDead) {
      this.flags.bossDead = true;
      this.beginEnding();
    }
    if (this.boss && this.boss.phase === 3 && !this.flags.shrunk) {
      this.flags.shrunk = true;
      this.shrinkArena();
    }
  };

  Game.onBossPhase = function (phase) {
    if (phase === 2) {
      this.say("黑桃 J", "我的槍尖，貫穿過比你有分量得多的牌。");
      this.toast("槍變化成鞭，並會召喚衛兵。用同花·黑桃清場。");
    }
    if (phase === 3) {
      this.say("黑桃 J", "……你手裡那張牌，為什麼沒有點數？");
      this.toast("狂暴！場地邊緣開始碎裂。攢滿牌力值，發動 Joker Time！");
      AR.Camera.bump(14);
    }
  };

  Game.shrinkArena = function () {
    const floor = this.level.solids.find((s) => s.id === "boss_floor");
    if (floor) {
      floor.x = 9540;
      floor.w = 1640;
    }
    AR.FX.paper(9300, 560, 20);
    AR.FX.paper(11300, 560, 20);
    AR.Audio.play("break");
    AR.Camera.setBounds(9500, 10900, -240, 80);
  };

  Game.beginEnding = function () {
    this.enterStage("ending", true);
    this.endingT = 0;
    this.player.action = null;
    this.player.busy = 99;
    this.cinematic = { kind: "finisher", t: 0, dur: 6, lock: true };
    for (const e of this.enemies) {
      if (e.type !== "boss") { e.dead = true; e.state = "dead"; e.stateT = 0; e.vx = 0; }
      else { e.stun = 99; e.vx = 0; }
    }
    const hasA = this.deck.hand.some((c) => c.suit === "spade" && c.rank === 1);
    if (!hasA) this.deck.giveCard("spade", 1);
    AR.Audio.play("power");
  };

  Game.stageEnding = function (dt) {
    this.endingT += dt;
    const b = this.boss;
    const p = this.player;
    if (this.endingT > 0.6 && !this.flags.finalShot) {
      this.flags.finalShot = true;
      this.toast("♠A——單張");
      this.spawnProj({
        kind: "spike",
        x: p.x + p.w / 2,
        y: p.y + 30,
        w: 60,
        h: 18,
        vx: 900,
        vy: 0,
        life: 0.8,
        dmg: 0,
        friendly: true,
        pierce: true,
        suit: "spade",
        from: "single",
      });
      AR.Audio.play("slash");
    }
    if (this.endingT > 1.1 && !this.flags.shatter) {
      this.flags.shatter = true;
      if (b) AR.FX.paper(b.x + 60, b.y + 80, 40, "#f3ead3");
      AR.Camera.bump(18);
      AR.Audio.play("break");
    }
    if (this.endingT > 2.2 && !this.flags.catchJ) {
      this.flags.catchJ = true;
      this.setFlavor("黑桃 J 的牌面還溫熱的。我把它插進腰帶。\n遠處，紅心聖池的方向，有什麼東西在發光。\n——該走了。牌局才剛開始。");
    }
    if (this.endingT > 5.5 && !this.flags.shownResult) {
      this.flags.shownResult = true;
      this.showResults();
    }
  };

  Game.showResults = function () {
    const time = Math.max(1, AR.now() - this.stats.startTime);
    const hits = this.stats.hits;
    const hidden = this.player.hiddenFound;
    const deaths = this.stats.deaths;
    let rank = "C";
    if (hidden && hits <= 4 && deaths === 0) rank = "S";
    else if (hits <= 8 && deaths <= 1) rank = "A";
    else if (hits <= 16) rank = "B";
    this.result = { rank, time, hits, deaths, hidden, cards: this.player.cardsPlayed };
    this.mode = "victory";
    AR.Audio.play("win");
  };

  Game.setCheckpoint = function (id) { this.checkpoint = id; };

  Game.retryCheckpoint = function () {
    const id = this.checkpoint || "start";
    this.mode = "play";
    this.player.dead = false;
    this.player.hp = this.player.maxHp;
    this.player.invuln = 1.2;
    this.player.action = null;
    this.player.busy = 0;
    this.player.vx = this.player.vy = 0;
    this.player.aura = null;
    this.player.barrier = 0;
    this.projectiles = [];
    this.hitboxes = [];
    this.hazards = [];
    this.zones = [];
    this.cinematic = null;
    this.timeScale = 1;
    this.deck.jokerTime = 0;
    this.deck.wildArmed = false;
    this.deck.clearSelect();

    const place = (x) => {
      this.player.x = x;
      this.player.y = 568 - this.player.h;
    };

    if (id === "start" || id === "afterObstacle") {
      place(id === "start" ? 820 : 700);
      this.stage = id === "start" ? "move_teach" : "obstacle";
      this.enemies = [];
      AR.Camera.setBounds(0, 2000, -200, 80);
    } else if (id === "afterGuards" || id === "platforms" || id === "p3") {
      this.stage = "platforms";
      place(id === "p3" ? 5200 : id === "afterGuards" ? 3000 : 3900);
      this.enemies = this.enemies.filter((e) => e.type !== "guard");
      this.ensureStraightCards();
      AR.Camera.setBounds(3000, 6200, -360, 80);
    } else if (id === "puzzle") {
      this.stage = "puzzle";
      place(6500);
      this.ensurePuzzleCards();
      AR.Camera.setBounds(6300, 7600, -200, 80);
    } else if (id === "elite") {
      this.stage = "elite";
      place(8100);
      this.enemies = [];
      this.knight = null;
      this.flags.eliteStarted = false;
      this.flags.eliteDone = false;
      AR.Camera.setBounds(7860, 9100, -200, 80);
    } else if (id === "preboss") {
      this.stage = "elite";
      this.flags.eliteDone = true;
      this.level.eliteDoorOpen = true;
      place(9000);
      this.enemies = [];
      AR.Camera.setBounds(7860, 9800, -200, 80);
    } else if (id === "boss") {
      this.stage = "boss";
      place(9600);
      this.enemies = [];
      this.boss = null;
      this.flags.bossStarted = false;
      this.flags.bossDead = false;
      this.flags.shrunk = false;
      this.level = AR.buildLevel();
      this.level.obstacleBroken = true;
      this.level.doorOpen = true;
      this.level.eliteDoorOpen = true;
      this.level.pillars.forEach((p) => (p.on = true));
      this.level.bridges.left.on = true;
      this.level.bridges.right.on = true;
      AR.Camera.setBounds(9260, 11200, -240, 80);
    }
    this.deck.resetWildForCombat();
    this.flags.holdDraw = false;
    AR.Camera.follow(this.player.x, this.player.y, 1, true);
  };

  Game.updateCamera = function (dt) {
    const p = this.player;
    AR.Camera.follow(p.x + p.w / 2, p.y + p.h / 2, dt, false);
  };

  Game.toast = function (msg) {
    this.toasts.push({ msg, t: 0, life: 3.2 });
    if (this.toasts.length > 3) this.toasts.shift();
  };
  Game.floatHand = function (msg) {
    this.handFloat = { msg, t: 0, life: 1.1 };
  };
  Game.setFlavor = function (msg) {
    this.flavor = { msg, t: 0, life: 6.5 };
  };
  Game.say = function (name, msg) {
    this.dialogue = { name, msg, t: 0, life: 5.2 };
  };
  Game.showTut = function (msg, id) {
    this.tutorial = { msg, id, t: 0 };
  };
  Game.clearTut = function (id) {
    if (this.tutorial && (!id || this.tutorial.id === id)) this.tutorial = null;
  };
  Game.queueTut = function (arr) {
    this.tutQueue = arr.slice();
    this._nextTut();
  };
  Game._nextTut = function () {
    if (!this.tutQueue.length) return;
    const msg = this.tutQueue.shift();
    this.tutorial = { msg, id: "q", t: 0, auto: 3.4 };
  };
  Game.updateToasts = function (dt) {
    for (const t of this.toasts) t.t += dt;
    this.toasts = this.toasts.filter((t) => t.t < t.life);
    if (this.flavor) {
      this.flavor.t += dt;
      if (this.flavor.t > this.flavor.life) this.flavor = null;
    }
    if (this.dialogue) {
      this.dialogue.t += dt;
      if (this.dialogue.t > this.dialogue.life) this.dialogue = null;
    }
    if (this.handFloat) {
      this.handFloat.t += dt;
      if (this.handFloat.t > this.handFloat.life) this.handFloat = null;
    }
    if (this.tutorial) {
      this.tutorial.t += dt;
      if (this.tutorial.auto && this.tutorial.t > this.tutorial.auto) {
        this.tutorial = null;
        this._nextTut();
      }
    }
  };

  Game.render = function () {
    const c = ctx;
    c.clearRect(0, 0, AR.W, AR.H);
    if (this.mode === "title") { this.drawTitle(c); if (AR.TouchUI && AR.TouchUI.sync) AR.TouchUI.sync(this); return; }
    if (this.mode === "intro") { this.drawIntro(c); if (AR.TouchUI && AR.TouchUI.sync) AR.TouchUI.sync(this); return; }
    if (this.mode === "howto" && !this.flags._fromPause) { this.drawHowto(c, true); if (AR.TouchUI && AR.TouchUI.sync) AR.TouchUI.sync(this); return; }

    this.drawWorld(c);
    this.drawHUD(c);
    if (this.mode === "pause") this.drawPause(c);
    if (this.mode === "howto") this.drawHowto(c, false);
    if (this.mode === "dead") this.drawDead(c);
    if (this.mode === "victory") this.drawVictory(c);
    if (this.flash > 0) {
      c.fillStyle = "rgba(200,160,255," + (this.flash * 0.45) + ")";
      c.fillRect(0, 0, AR.W, AR.H);
    }
    if (AR.TouchUI && AR.TouchUI.sync) AR.TouchUI.sync(this);
  };

  Game.drawWorld = function (c) {
    const cam = AR.Camera;
    AR.drawFelt(c, cam, this.t);
    AR.drawParallax(c, cam, this.t);

    for (const d of this.level.decor) {
      const x = cam.wx(d.x), y = cam.wy(d.y);
      if (d.kind === "inkstain") {
        c.fillStyle = "rgba(20,10,20,0.55)";
        c.beginPath();
        c.ellipse(x, y, d.w / 2, d.h / 2, 0, 0, Math.PI * 2);
        c.fill();
      } else if (d.kind === "scrap") {
        c.save();
        c.translate(x, y);
        c.rotate(d.rot);
        AR.drawCardBack(c, -16, -22, 32, 44, 0);
        c.restore();
      } else if (d.kind === "lamp") {
        c.fillStyle = "#1a1a22";
        c.fillRect(x - 3, y - 90, 6, 90);
        c.fillStyle = "rgba(232,212,138,0.25)";
        c.beginPath();
        c.arc(x, y - 96, 16, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = "#e8d48a";
        c.beginPath();
        c.arc(x, y - 96, 5, 0, Math.PI * 2);
        c.fill();
      } else if (d.kind === "banner") {
        c.fillStyle = "rgba(26,26,34,0.7)";
        c.fillRect(x, y, 50, 90);
        c.fillStyle = "#f3ead3";
        c.font = "36px " + AR.FONT;
        c.textAlign = "center";
        c.fillText("♠", x + 25, y + 55);
      }
    }

    const solids = AR.allSolids(this.level);
    for (const s of solids) AR.drawSolid(c, s, cam, this.t, this.level);

    if (this.level.updraft.on) {
      const u = this.level.updraft;
      c.save();
      c.globalAlpha = 0.25;
      c.fillStyle = "#e8d48a";
      for (let i = 0; i < 8; i++) {
        const py = cam.wy(u.y + ((this.t * 80 + i * 40) % u.h));
        const px = cam.wx(u.x + u.w / 2 + Math.sin(this.t * 3 + i) * 16);
        c.beginPath();
        c.ellipse(px, py, 10, 18, 0, 0, Math.PI * 2);
        c.fill();
      }
      c.restore();
    }

    for (const pil of this.level.pillars) AR.drawPillar(c, pil, cam, this.t);
    AR.drawChest(c, this.level.chest, cam, this.t);

    const obs = this.level.solids.find((s) => s.type === "obstacle");
    if (obs && !this.level.obstacleBroken && this.stage === "obstacle") {
      c.fillStyle = "#e8d48a";
      c.font = "16px " + AR.FONT;
      c.textAlign = "center";
      c.fillText("嘗試攻擊", cam.wx(obs.x + obs.w / 2), cam.wy(obs.y) - 12);
    }

    for (const h of this.hazards) {
      if (h.kind === "spikezone") {
        const x = cam.wx(h.x), y = cam.wy(h.y);
        c.save();
        if (!h.erupted) {
          c.globalAlpha = 0.35 + 0.25 * Math.sin(this.t * 14);
          c.fillStyle = "#c41e3a";
          c.fillRect(x, y - 8, h.w, 16);
          c.strokeStyle = "#ff6b6b";
          c.lineWidth = 2;
          c.strokeRect(x, y - 90, h.w, 90);
          c.font = "14px " + AR.FONT;
          c.fillStyle = "#ffdada";
          c.textAlign = "center";
          c.fillText("跳躍避開", x + h.w / 2, y - 96);
        } else {
          c.fillStyle = "#1a1a22";
          const n = (h.w / 18) | 0;
          for (let i = 0; i < n; i++) {
            c.beginPath();
            c.moveTo(x + i * 18, y);
            c.lineTo(x + i * 18 + 9, y - 80);
            c.lineTo(x + i * 18 + 18, y);
            c.fill();
          }
        }
        c.restore();
      }
    }
    for (const z of this.zones) {
      c.save();
      c.globalAlpha = 0.28;
      c.fillStyle = z.kind === "poison" ? "#3a7a3a" : "#c41e3a";
      c.fillRect(cam.wx(z.x), cam.wy(z.y), z.w, z.h);
      c.restore();
    }

    for (const p of this.projectiles) {
      if (p.delay && p.delay > 0) continue;
      const x = cam.wx(p.x), y = cam.wy(p.y);
      c.save();
      if (p.kind === "spike" || p.kind === "fan" || p.kind === "arrow") {
        c.fillStyle = "#1a1a22";
        c.translate(x, y);
        c.rotate(Math.atan2(p.vy || 0, p.vx || 1));
        c.beginPath();
        c.moveTo(20, 0);
        c.lineTo(-12, -7);
        c.lineTo(-12, 7);
        c.closePath();
        c.fill();
        c.fillStyle = "#e8d48a";
        c.fillRect(-8, -2, 10, 4);
      } else if (p.kind === "chip") {
        c.fillStyle = "#c41e3a";
        c.beginPath();
        c.arc(x + p.w / 2, y + p.h / 2, 40, 0, Math.PI * 2);
        c.fill();
        c.strokeStyle = "#f3ead3";
        c.lineWidth = 4;
        c.stroke();
        c.fillStyle = "#f3ead3";
        c.font = "20px " + AR.FONT;
        c.textAlign = "center";
        c.fillText("100", x + p.w / 2, y + p.h / 2 + 8);
      } else if (p.kind === "wave") {
        c.strokeStyle = "#e8d48a";
        c.lineWidth = 4;
        c.globalAlpha = 0.8;
        c.beginPath();
        c.arc(x, y, 16, 0, Math.PI * 2);
        c.stroke();
      }
      c.restore();
    }

    for (const e of this.enemies) {
      if (e.type === "guard") AR.drawGuard(c, e, cam, this.t);
      else if (e.type === "knight") AR.drawKnight(c, e, cam, this.t);
      else if (e.type === "boss") AR.drawBoss(c, e, cam, this.t);
    }

    AR.drawJoker(c, this.player, cam, this.t);
    AR.drawJokerAura(c, this.player, cam, this.t, this.deck.jokerTime);
    AR.FX.draw(c, cam);

    if (this.cinematic && this.cinematic.kind === "royal") {
      c.fillStyle = "rgba(10,60,40,0.35)";
      c.fillRect(0, 0, AR.W, AR.H);
      c.fillStyle = "#e8d48a";
      c.font = "bold 42px " + AR.SERIF;
      c.textAlign = "center";
      c.fillText("同花順 —— 收入牌堆", AR.W / 2, AR.H / 2);
    }

    if (this.stage === "ending" && this.flags.shatter && this.boss) {
      const fall = Math.min(1, (this.endingT - 1.1) / 1.1);
      const x = cam.wx(this.boss.x + 60);
      const y = cam.wy(this.boss.y + 40) + fall * 140;
      AR.drawCardFace(c, { suit: "spade", rank: 11 }, x - 28, y, 56, 80, { rot: (1 - fall) * 0.6 });
    }
  };

  Game.drawHUD = function (c) {
    const touch = !!(AR.TouchUI && AR.TouchUI.visible);
    if (!touch) {
    c.save();
    c.fillStyle = "rgba(8,16,12,0.7)";
    AR.roundRect(c, 20, 16, 260, 52, 8);
    c.fill();
    c.fillStyle = "#e8d48a";
    c.font = "13px " + AR.FONT;
    c.textAlign = "left";
    c.fillText("鬼牌　Joker", 32, 34);
    c.fillStyle = "rgba(0,0,0,0.5)";
    c.fillRect(32, 42, 232, 14);
    const hpw = 232 * AR.clamp(this.player.hp / this.player.maxHp, 0, 1);
    const hg = c.createLinearGradient(32, 0, 264, 0);
    hg.addColorStop(0, "#8b1e2d");
    hg.addColorStop(1, "#e85a6a");
    c.fillStyle = hg;
    c.fillRect(32, 42, hpw, 14);
    c.fillStyle = "#f3ead3";
    c.font = "11px " + AR.FONT;
    c.textAlign = "center";
    c.fillText(Math.max(0, this.player.hp | 0) + " / " + this.player.maxHp, 148, 53);
    c.restore();

    c.fillStyle = "rgba(8,16,12,0.55)";
    AR.roundRect(c, AR.W / 2 - 140, 14, 280, 36, 8);
    c.fill();
    c.fillStyle = "#e8d48a";
    c.font = "15px " + AR.SERIF;
    c.textAlign = "center";
    c.fillText("撕角廣場　·　黑桃", AR.W / 2, 38);

    const px = AR.W - 280, py = 16;
    c.fillStyle = "rgba(8,16,12,0.7)";
    AR.roundRect(c, px, py, 256, 58, 8);
    c.fill();
    c.fillStyle = "#c9a6ff";
    c.font = "12px " + AR.FONT;
    c.textAlign = "left";
    c.fillText(this.deck.jokerTime > 0 ? "JOKER TIME  " + this.deck.jokerTime.toFixed(1) + "s" : "牌力值", px + 12, py + 18);
    c.fillStyle = "rgba(0,0,0,0.5)";
    c.fillRect(px + 12, py + 28, 232, 12);
    const pw = 232 * (this.deck.jokerTime > 0 ? this.deck.jokerTime / 10 : this.deck.power / this.deck.powerMax);
    c.fillStyle = this.deck.jokerTime > 0 ? "#e8d48a" : "#8a4cbf";
    c.fillRect(px + 12, py + 28, pw, 12);
    if (this.deck.power >= this.deck.powerMax && this.deck.jokerTime <= 0) {
      c.fillStyle = Math.sin(this.t * 8) > 0 ? "#e8d48a" : "#fff";
      c.font = "11px " + AR.FONT;
      c.fillText(AR.Input.showTouch ? "點 Joker 發動" : "按 K 發動", px + 170, py + 18);
    }
    this.uiRects.power = { x: px, y: py, w: 256, h: 58 };

    const wildOn = this.deck.wildArmed;
    c.fillStyle = wildOn ? "rgba(80,30,100,0.9)" : "rgba(8,16,12,0.75)";
    AR.roundRect(c, 20, 78, 150, 36, 8);
    c.fill();
    c.strokeStyle = wildOn ? "#c9a6ff" : "#d4b06a";
    c.lineWidth = 1.5;
    AR.roundRect(c, 20, 78, 150, 36, 8);
    c.stroke();
    c.fillStyle = "#f3ead3";
    c.font = "14px " + AR.FONT;
    c.textAlign = "center";
    c.fillText("百搭  " + this.deck.wildUses + "/" + this.deck.wildMax + "　Q", 95, 101);
    this.uiRects.wild = { x: 20, y: 78, w: 150, h: 36 };

    c.fillStyle = "rgba(8,16,12,0.5)";
    AR.roundRect(c, AR.W - 200, 80, 176, 24, 6);
    c.fill();
    c.fillStyle = "#c8bfa6";
    c.font = "11px " + AR.FONT;
    c.textAlign = "right";
    c.fillText((AR.Audio.muted ? "已靜音" : "M 靜音") + "　Esc 暫停", AR.W - 32, 96);
    this.uiRects.mute = { x: AR.W - 200, y: 80, w: 80, h: 24 };
    }

    const elite = this.knight && !this.knight.dead && this.stage === "elite";
    const boss = this.boss && this.stage === "boss";
    if (elite || boss) {
      const e = elite ? this.knight : this.boss;
      const name = elite ? "紙偶騎士·刺面" : "黑桃 J";
      const y = 86;
      c.fillStyle = "rgba(8,16,12,0.7)";
      AR.roundRect(c, AR.W / 2 - 260, y, 520, 40, 8);
      c.fill();
      c.fillStyle = "#e8d48a";
      c.font = "13px " + AR.FONT;
      c.textAlign = "left";
      c.fillText(name + (elite && e.shielded ? "　（舉盾）" : "") + (boss ? "　第 " + e.phase + " 階段" : ""), AR.W / 2 - 248, y + 14);
      c.fillStyle = "rgba(0,0,0,0.5)";
      c.fillRect(AR.W / 2 - 248, y + 20, 496, 12);
      c.fillStyle = elite && e.shielded ? "#888" : "#c41e3a";
      c.fillRect(AR.W / 2 - 248, y + 20, 496 * AR.clamp(e.hp / e.maxHp, 0, 1), 12);
    }

    if (!touch) {
    this.drawHandUI(c);
    this.drawMessages(c);
    } else {
      this.cardRects = [];
      this.uiRects.play = null;
    }

    if (!touch && (this.stage === "landing" || this.stage === "move_teach" || this.stage === "obstacle")) {
      c.fillStyle = "rgba(243,234,211,0.7)";
      c.font = "12px " + AR.FONT;
      c.textAlign = "center";
      c.fillText(AR.Input.showTouch
        ? "上跳／下互動／左右移動　出牌　洗牌　百搭　Joker"
        : "方向鍵 ← → 移動　↑ 跳躍　↓ 互動　選牌 1-5　出牌 J　洗牌 T　百搭 Q", AR.W / 2, AR.H - 8);
    }
  };

  Game.drawHandUI = function (c) {
    const hand = this.deck.hand;
    const n = hand.length;
    const cw = 86, ch = 122;
    const gap = 14;
    const total = n * (cw + gap) - gap;
    const left = AR.W / 2 - total / 2;
    const baseY = AR.H - 148;
    this.cardRects = [];

    c.fillStyle = "rgba(40,24,8,0.8)";
    AR.roundRect(c, AR.W / 2 + 250, baseY + 40, 90, 46, 8);
    c.fill();
    c.strokeStyle = "#d4b06a";
    c.stroke();
    c.fillStyle = "#e8d48a";
    c.font = "16px " + AR.FONT;
    c.textAlign = "center";
    c.fillText("出牌", AR.W / 2 + 295, baseY + 62);
    c.font = "10px " + AR.FONT;
    c.fillStyle = "#c8bfa6";
    c.fillText("J / Enter", AR.W / 2 + 295, baseY + 78);
    this.uiRects.play = { x: AR.W / 2 + 250, y: baseY + 40, w: 90, h: 46 };

    AR.drawCardBack(c, AR.W / 2 - 360, baseY + 20, 54, 76, -0.1);
    c.fillStyle = "#e8d48a";
    c.font = "11px " + AR.FONT;
    c.textAlign = "center";
    c.fillText("牌堆 " + (this.deck.pendingDraws.length + this.deck.drawPile.length + 8), AR.W / 2 - 333, baseY + 110);

    const prev = this.deck.preview();
    if (prev) {
      c.fillStyle = "#e8d48a";
      c.font = "bold 16px " + AR.FONT;
      c.textAlign = "center";
      c.fillText(AR.handTitle(prev) + (this.deck.wildArmed ? " + 百搭" : ""), AR.W / 2, baseY - 8);
    }

    if (this.handFloat) {
      const a = 1 - this.handFloat.t / this.handFloat.life;
      c.globalAlpha = a;
      c.fillStyle = "#fff6d0";
      c.font = "bold 28px " + AR.SERIF;
      c.textAlign = "center";
      c.fillText(this.handFloat.msg, AR.W / 2, AR.H / 2 - 80 + this.handFloat.t * -20);
      c.globalAlpha = 1;
    }

    for (let i = 0; i < n; i++) {
      const card = hand[i];
      const lift = (card.selected ? 28 : 0) + (i === 0 && !card.selected ? 6 : 0);
      const deal = card.dealT;
      const x = left + i * (cw + gap);
      const y = baseY - lift + deal * 80;
      const rot = (i - (n - 1) / 2) * 0.04;
      AR.drawCardFace(c, card, x, y, cw, ch, { lift: 0, rot });
      c.fillStyle = "rgba(0,0,0,0.55)";
      c.beginPath();
      c.arc(x + 12, y + ch - 10, 9, 0, Math.PI * 2);
      c.fill();
      c.fillStyle = "#e8d48a";
      c.font = "11px " + AR.FONT;
      c.textAlign = "center";
      c.fillText(String(i + 1), x + 12, y + ch - 6);
      this.cardRects.push({ x, y, w: cw, h: ch, i });
    }
  };

  Game.drawMessages = function (c) {
    if (this.tutorial) {
      const a = Math.min(1, this.tutorial.t * 4);
      c.save();
      c.globalAlpha = a;
      const lines = this.tutorial.msg.split("\n");
      const h = 36 + lines.length * 28;
      c.fillStyle = "rgba(8,16,12,0.82)";
      AR.roundRect(c, AR.W / 2 - 320, 150, 640, h, 10);
      c.fill();
      c.strokeStyle = "#d4b06a";
      c.lineWidth = 2;
      c.stroke();
      c.fillStyle = "#f3ead3";
      c.font = "20px " + AR.FONT;
      c.textAlign = "center";
      lines.forEach((ln, i) => c.fillText(ln, AR.W / 2, 186 + i * 28));
      c.restore();
    }
    this.toasts.forEach((t, i) => {
      const a = t.t < 0.2 ? t.t / 0.2 : t.t > t.life - 0.4 ? (t.life - t.t) / 0.4 : 1;
      c.save();
      c.globalAlpha = a;
      c.fillStyle = "rgba(8,16,12,0.75)";
      AR.roundRect(c, AR.W / 2 - 260, 250 + i * 36, 520, 30, 6);
      c.fill();
      c.fillStyle = "#e8d48a";
      c.font = "15px " + AR.FONT;
      c.textAlign = "center";
      c.fillText(t.msg, AR.W / 2, 270 + i * 36);
      c.restore();
    });
    if (this.flavor) {
      const a = this.flavor.t < 0.4 ? this.flavor.t / 0.4 : this.flavor.t > this.flavor.life - 0.8 ? (this.flavor.life - this.flavor.t) / 0.8 : 1;
      const lines = this.flavor.msg.split("\n");
      c.save();
      c.globalAlpha = a;
      c.fillStyle = "rgba(8,16,12,0.7)";
      AR.roundRect(c, 180, AR.H - 230, AR.W - 360, 24 + lines.length * 22, 8);
      c.fill();
      c.fillStyle = "#d8d0bc";
      c.font = "italic 16px " + AR.SERIF;
      c.textAlign = "center";
      lines.forEach((ln, i) => c.fillText(ln, AR.W / 2, AR.H - 208 + i * 22));
      c.restore();
    }
    if (this.dialogue) {
      const a = Math.min(1, this.dialogue.t * 5);
      c.save();
      c.globalAlpha = a;
      c.fillStyle = "rgba(10,8,12,0.88)";
      AR.roundRect(c, 220, AR.H - 280, AR.W - 440, 96, 10);
      c.fill();
      c.strokeStyle = "#d4b06a";
      c.stroke();
      c.fillStyle = "#e8d48a";
      c.font = "15px " + AR.FONT;
      c.textAlign = "left";
      c.fillText(this.dialogue.name, 244, AR.H - 252);
      c.fillStyle = "#f3ead3";
      c.font = "18px " + AR.FONT;
      c.fillText(this.dialogue.msg, 244, AR.H - 222);
      c.restore();
    }
  };

  Game.hitUi = function () {
    const m = AR.Input.mouse;
    if (this.mode === "title") {
      if (this.ptIn(m, { x: AR.W / 2 - 120, y: 440, w: 240, h: 52 })) return "start";
      if (this.ptIn(m, { x: AR.W / 2 - 120, y: 510, w: 240, h: 44 })) return "howto";
      if (this.ptIn(m, { x: AR.W - 140, y: 20, w: 110, h: 32 })) return "mute";
    }
    if (this.mode === "pause") {
      if (this.ptIn(m, { x: AR.W / 2 - 120, y: 300, w: 240, h: 44 })) return "resume";
      if (this.ptIn(m, { x: AR.W / 2 - 120, y: 356, w: 240, h: 44 })) return "howto";
      if (this.ptIn(m, { x: AR.W / 2 - 120, y: 412, w: 240, h: 44 })) return "title";
    }
    if (this.mode === "victory") {
      if (this.ptIn(m, { x: AR.W / 2 - 220, y: 600, w: 200, h: 44 })) return "again";
      if (this.ptIn(m, { x: AR.W / 2 + 20, y: 600, w: 200, h: 44 })) return "title";
    }
    if (this.mode === "play") {
      if (this.uiRects.play && this.ptIn(m, this.uiRects.play)) return "play";
      if (this.uiRects.wild && this.ptIn(m, this.uiRects.wild)) return "wild";
      if (this.uiRects.power && this.ptIn(m, this.uiRects.power)) return "power";
      if (this.uiRects.mute && this.ptIn(m, this.uiRects.mute)) return "mute";
      for (const r of this.cardRects) if (this.ptIn(m, r)) return "card:" + r.i;
    }
    return null;
  };
  Game.ptIn = function (m, r) {
    return m.x >= r.x && m.x <= r.x + r.w && m.y >= r.y && m.y <= r.y + r.h;
  };

  Game.drawTitle = function (c) {
    AR.drawFelt(c, { x: 0, y: 0, wx: function (x) { return x; }, wy: function (y) { return y; } }, this.titleT);
    for (let i = 0; i < 7; i++) {
      const x = 80 + i * 180 + Math.sin(this.titleT * 0.6 + i) * 10;
      const y = 80 + Math.cos(this.titleT * 0.4 + i * 0.7) * 20 + (i % 2) * 40;
      c.save();
      c.globalAlpha = 0.35;
      c.translate(x, y);
      c.rotate(Math.sin(this.titleT * 0.3 + i) * 0.2);
      if (i % 2) AR.drawCardBack(c, 0, 0, 70, 100, 0);
      else AR.drawCardFace(c, { suit: AR.SUITS[i % 4], rank: [1, 11, 13, 3, 7, 5, 9][i] }, 0, 0, 70, 100, {});
      c.restore();
    }
    c.fillStyle = "rgba(0,0,0,0.35)";
    c.fillRect(0, 0, AR.W, AR.H);

    if (AR.Sprites && AR.Sprites.has("front")) {
      const img = AR.Sprites.front;
      const h = 132;
      const w = img.naturalWidth / img.naturalHeight * h;
      const by = 196 + Math.sin(this.titleT * 5) * 2.5;
      c.drawImage(img, AR.W / 2 - w / 2, by - h, w, h);
    }

    c.fillStyle = "#e8d48a";
    c.font = "18px " + AR.FONT;
    c.textAlign = "center";
    c.fillText("♠　當紙牌成為世界的法則　♠", AR.W / 2, 230);
    c.fillStyle = "#f3ead3";
    c.font = "bold 72px " + AR.SERIF;
    c.fillText("王牌裂隙", AR.W / 2, 308);
    c.font = "22px " + AR.FONT;
    c.fillStyle = "#c8bfa6";
    c.fillText("ACE RIFT", AR.W / 2, 348);
    c.fillStyle = "#e8d48a";
    c.font = "20px " + AR.SERIF;
    c.fillText("第一關　·　撕角廣場", AR.W / 2, 396);

    if (!(AR.TouchUI && AR.TouchUI.visible)) {
      const hover = this.hoverUi;
      this.btn(c, AR.W / 2 - 120, 440, 240, 52, "開始遊戲", hover === "start");
      this.btn(c, AR.W / 2 - 120, 510, 240, 44, "操作說明", hover === "howto", true);
      c.fillStyle = "#9a927c";
      c.font = "13px " + AR.FONT;
      c.fillText("Enter 開始　　H 說明　　M 靜音", AR.W / 2, 590);
      c.font = "12px " + AR.FONT;
      c.fillText("鍵盤、滑鼠或觸控皆可遊玩　·　手機與電腦瀏覽器皆支援", AR.W / 2, 680);
    }

    c.fillStyle = "#e8d48a";
    c.font = "12px " + AR.FONT;
    c.textAlign = "right";
    c.fillText(AR.Audio.muted ? "已靜音" : "音效開", AR.W - 36, 40);
  };

  Game.drawIntro = function (c) {
    c.fillStyle = "#07140f";
    c.fillRect(0, 0, AR.W, AR.H);
    AR.roundRect(c, 180, 160, 200, 280, 12);
    c.fillStyle = "#f3ead3";
    c.fill();
    if (AR.Sprites && AR.Sprites.has("front")) {
      c.save();
      AR.roundRect(c, 180, 160, 200, 280, 12);
      c.clip();
      const img = AR.Sprites.front;
      const h = 250;
      const w = img.naturalWidth / img.naturalHeight * h;
      c.drawImage(img, 180 + 92 - w / 2, 175, w, h);
      c.restore();
    } else {
      c.fillStyle = "#1a1a22";
      c.font = "80px " + AR.FONT;
      c.textAlign = "center";
      c.fillText("J", 250, 280);
      c.font = "40px " + AR.FONT;
      c.fillText("♠", 250, 330);
    }
    c.fillStyle = "#07140f";
    c.beginPath();
    c.moveTo(280, 160);
    c.lineTo(380, 160);
    c.lineTo(380, 440);
    c.lineTo(300, 440);
    c.lineTo(310, 360);
    c.lineTo(280, 300);
    c.closePath();
    c.fill();
    c.strokeStyle = "#1a1a22";
    c.lineWidth = 4;
    AR.roundRect(c, 180, 160, 200, 280, 12);
    c.stroke();

    const text = INTRO[this.introPage];
    const shown = text.slice(0, this.introChar | 0);
    c.fillStyle = "#f3ead3";
    c.font = "22px " + AR.SERIF;
    c.textAlign = "left";
    this.wrapText(c, shown, 420, 250, 640, 36);
    c.fillStyle = "#9a927c";
    c.font = "14px " + AR.FONT;
    c.textAlign = "center";
    c.fillText("點擊、觸控或按 Enter 繼續　　Esc 跳過", AR.W / 2, 640);
    c.fillText((this.introPage + 1) + " / " + INTRO.length, AR.W / 2, 670);
  };

  Game.drawHowto = function (c, full) {
    if (full) {
      AR.drawFelt(c, { x: 0, y: 0, wx: function (x) { return x; }, wy: function (y) { return y; } }, this.t);
    } else {
      c.fillStyle = "rgba(0,0,0,0.65)";
      c.fillRect(0, 0, AR.W, AR.H);
    }
    const page = HOWTO[this.howToPage];
    c.fillStyle = "rgba(8,16,12,0.92)";
    AR.roundRect(c, 180, 80, AR.W - 360, 520, 14);
    c.fill();
    c.strokeStyle = "#d4b06a";
    c.lineWidth = 2;
    c.stroke();
    c.fillStyle = "#e8d48a";
    c.font = "28px " + AR.SERIF;
    c.textAlign = "center";
    c.fillText("操作說明　" + page.title, AR.W / 2, 140);
    c.fillStyle = "#f3ead3";
    c.font = "20px " + AR.FONT;
    c.textAlign = "left";
    this.wrapText(c, page.body, 240, 200, AR.W - 480, 36);
    c.fillStyle = "#9a927c";
    c.font = "14px " + AR.FONT;
    c.textAlign = "center";
    c.fillText((this.howToPage + 1) + " / " + HOWTO.length + "　　Enter 或點擊下一頁　　Esc 返回", AR.W / 2, 560);
  };

  Game.drawPause = function (c) {
    c.fillStyle = "rgba(0,0,0,0.55)";
    c.fillRect(0, 0, AR.W, AR.H);
    c.fillStyle = "rgba(8,16,12,0.92)";
    AR.roundRect(c, AR.W / 2 - 220, 180, 440, 340, 14);
    c.fill();
    c.strokeStyle = "#d4b06a";
    c.stroke();
    c.fillStyle = "#e8d48a";
    c.font = "28px " + AR.SERIF;
    c.textAlign = "center";
    c.fillText("暫停", AR.W / 2, 230);
    if (!(AR.TouchUI && AR.TouchUI.visible)) {
      const h = this.hoverUi;
      this.btn(c, AR.W / 2 - 120, 300, 240, 44, "繼續遊戲", h === "resume");
      this.btn(c, AR.W / 2 - 120, 356, 240, 44, "操作說明", h === "howto", true);
      this.btn(c, AR.W / 2 - 120, 412, 240, 44, "返回標題", h === "title", true);
      c.fillStyle = "#9a927c";
      c.font = "13px " + AR.FONT;
      c.fillText("方向鍵 ← → 移動　↑ 跳　↓ 互動　1-5 選牌　J 出牌　T 洗牌　Q 百搭　K 牌力", AR.W / 2, 490);
    }
  };

  Game.drawDead = function (c) {
    c.fillStyle = "rgba(0,0,0,0.6)";
    c.fillRect(0, 0, AR.W, AR.H);
    c.fillStyle = "#f3ead3";
    c.font = "36px " + AR.SERIF;
    c.textAlign = "center";
    c.fillText("你被收回牌堆了……", AR.W / 2, 300);
    c.fillStyle = "#e8d48a";
    c.font = "18px " + AR.FONT;
    c.fillText(AR.Input.showTouch ? "點「重試」或畫面，從檢查點重新開始" : "按 R、Enter 或點擊，從檢查點重新開始", AR.W / 2, 360);
  };

  Game.drawVictory = function (c) {
    c.fillStyle = "rgba(4,10,8,0.82)";
    c.fillRect(0, 0, AR.W, AR.H);
    const r = this.result || { rank: "B", time: 0, hits: 0, deaths: 0, hidden: false, cards: 0 };
    c.fillStyle = "#e8d48a";
    c.font = "22px " + AR.SERIF;
    c.textAlign = "center";
    c.fillText("撕角廣場　通關", AR.W / 2, 80);
    c.fillStyle = "#f3ead3";
    c.font = "bold 96px " + AR.SERIF;
    c.fillText(r.rank, AR.W / 2, 190);
    c.font = "16px " + AR.FONT;
    c.fillStyle = "#c8bfa6";
    c.fillText("通關評價", AR.W / 2, 220);

    const mins = (r.time / 60) | 0;
    const secs = (r.time % 60 | 0).toString().padStart(2, "0");
    const lines = [
      "用時　" + mins + ":" + secs,
      "受傷次數　" + r.hits,
      "倒下次數　" + r.deaths,
      "出牌次數　" + r.cards,
      "隱藏凹室　" + (r.hidden ? "已發現（♠A）" : "未發現"),
    ];
    c.font = "18px " + AR.FONT;
    c.fillStyle = "#f3ead3";
    lines.forEach((ln, i) => c.fillText(ln, AR.W / 2, 260 + i * 28));

    c.fillStyle = "rgba(8,16,12,0.8)";
    AR.roundRect(c, 200, 410, AR.W - 400, 150, 10);
    c.fill();
    c.strokeStyle = "#d4b06a";
    c.stroke();
    c.fillStyle = "#e8d48a";
    c.font = "16px " + AR.SERIF;
    c.fillText("解鎖", AR.W / 2, 438);
    c.fillStyle = "#f3ead3";
    c.font = "17px " + AR.FONT;
    c.fillText("牌堆自由編輯　　下一關「紅心聖池」開啟", AR.W / 2, 470);
    c.fillText("獲得牌靈：♠J（裝備後，黑桃牌型傷害 +15%）", AR.W / 2, 500);
    c.fillStyle = "#c8bfa6";
    c.font = "italic 16px " + AR.SERIF;
    c.fillText("遠處，紅心聖池的方向，有什麼東西在發光。——該走了。牌局才剛開始。", AR.W / 2, 536);

    this.btn(c, AR.W / 2 - 220, 600, 200, 44, "再闖一次", this.hoverUi === "again");
    this.btn(c, AR.W / 2 + 20, 600, 200, 44, "返回標題", this.hoverUi === "title", true);
  };

  Game.btn = function (c, x, y, w, h, label, hover, ghost) {
    c.fillStyle = hover ? "rgba(80,50,16,0.95)" : ghost ? "rgba(8,16,12,0.8)" : "rgba(40,24,8,0.95)";
    AR.roundRect(c, x, y, w, h, 8);
    c.fill();
    c.strokeStyle = "#d4b06a";
    c.lineWidth = hover ? 2.5 : 1.5;
    c.stroke();
    c.fillStyle = "#f3ead3";
    c.font = "20px " + AR.FONT;
    c.textAlign = "center";
    c.textBaseline = "middle";
    c.fillText(label, x + w / 2, y + h / 2 + 1);
    c.textBaseline = "alphabetic";
  };

  Game.wrapText = function (c, text, x, y, maxW, lh) {
    const paras = text.split("\n");
    let yy = y;
    for (const para of paras) {
      let line = "";
      for (const ch of para) {
        const test = line + ch;
        if (c.measureText(test).width > maxW) {
          c.fillText(line, x, yy);
          line = ch;
          yy += lh;
        } else line = test;
      }
      c.fillText(line, x, yy);
      yy += lh;
    }
  };

  global.AceRiftGame = Game;

  Game._booted = false;
  Game.boot = function () {
    if (Game._booted) return;
    Game._booted = true;
    Game.init();
  };
  window.addEventListener("load", function () { Game.boot(); });
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(function () { Game.boot(); }, 0);
  }
})(window);
