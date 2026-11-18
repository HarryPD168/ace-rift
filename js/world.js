/* 關卡幾何、角色物理、敵人與戰鬥表現 */
(function (global) {
  const AR = (global.AR = global.AR || {});
  const G = 2200;
  const MAX_FALL = 1500;

  function solid(x, y, w, h, type, extra) {
    return Object.assign({ x, y, w, h, type: type || "platform", seed: (x * 13 + y * 7 + w) | 0, torn: true }, extra || {});
  }

  AR.buildLevel = function () {
    const solids = [];
    const decor = [];
    const zones = [];

    // —— 廣場 ——
    solids.push(solid(-80, -200, 80, 1100, "wall", { face: "back" }));
    solids.push(solid(0, 568, 3180, 260, "ground", { card: "A", suit: "spade" }));
    solids.push(solid(1980, 300, 50, 268, "wall", { id: "tutorial_gate", face: "card", card: "A", suit: "spade" }));
    // 左側立起的 ♠2 障礙
    solids.push(solid(260, 392, 86, 176, "obstacle", { id: "spade2", hp: 1, suit: "spade", rank: 2 }));

    // 平台段
    solids.push(solid(3180, 568, 440, 260, "ground", { card: "3", suit: "spade" }));
    // gap1 3620-3820：中間碎牌平台，普通跳躍即可通過
    solids.push(solid(3688, 520, 108, 36, "platform", { card: "4", suit: "spade", torn: true, id: "gap1_step" }));
    solids.push(solid(3820, 568, 540, 260, "platform", { card: "5", suit: "spade" }));
    // gap2 4360-5080（720px）：三塊碎牌踏腳石，連續跳躍即可通過
    solids.push(solid(4480, 540, 130, 36, "platform", { card: "4", suit: "spade", torn: true, id: "gap2_step1" }));
    solids.push(solid(4700, 500, 140, 36, "platform", { card: "6", suit: "spade", torn: true, id: "gap2_step2" }));
    solids.push(solid(4930, 536, 130, 36, "platform", { card: "8", suit: "spade", torn: true, id: "gap2_step3" }));
    solids.push(solid(5080, 568, 920, 260, "platform", { card: "7", suit: "spade", id: "p3" }));

    // 第三平台右側高牆，內藏凹室
    // 踏腳平台：地面 568 → 488（80px）再跳上凹室 400（88px），皆在普通跳躍高度內
    solids.push(solid(5320, 488, 180, 28, "platform", { card: "Q", suit: "spade", torn: true, id: "alcove_step" }));
    solids.push(solid(5560, -40, 80, 260, "wall", { face: "back" })); // 凹室上方
    solids.push(solid(5480, 400, 480, 40, "platform", { id: "alcove_floor", card: "A", suit: "spade", hidden: true }));
    solids.push(solid(5880, -40, 120, 440, "wall", { face: "card", card: "K", suit: "spade" }));
    solids.push(solid(5560, 400, 80, 168, "wall", { face: "card" })); // 凹室左下方擋牆，入口朝左開

    // 通往機關房的短橋
    solids.push(solid(6080, 568, 280, 260, "platform", { card: "8", suit: "spade" }));

    // —— 黑桃之眼房間 ——
    solids.push(solid(6360, -80, 80, 420, "wall", { id: "puzzle_in", face: "back" })); // 入口上沿，下方可進
    solids.push(solid(6360, 568, 280, 260, "ground", { card: "9", suit: "spade" }));
    // 左平台（樁）
    solids.push(solid(6360, 568, 420, 260, "ground"));
    // 缺口 6780-7240，靠橋通過
    solids.push(solid(7240, 568, 620, 260, "ground", { card: "10", suit: "spade" }));
    solids.push(solid(6360, -80, 1500, 80, "wall", { face: "ceil" })); // 天花板
    solids.push(solid(7780, -80, 80, 900, "wall", { id: "puzzle_door", face: "door", locked: true }));

    // 機關橋（初始關閉，以 invisible/disabled 方式，激活後加入）
    // 用 zones 管理，不直接當固體直到激活

    // —— 精英房 ——
    solids.push(solid(7860, 568, 1400, 260, "ground", { card: "J", suit: "spade" }));
    solids.push(solid(7860, -80, 80, 200, "wall", { face: "back" }));
    solids.push(solid(9180, -80, 80, 900, "wall", { id: "elite_door", face: "door", locked: true }));
    solids.push(solid(7860, -80, 1400, 80, "wall", { face: "ceil" }));

    // —— Boss 場 ——
    solids.push(solid(9260, 568, 2200, 260, "ground", { id: "boss_floor", card: "J", suit: "spade" }));
    solids.push(solid(9260, -80, 80, 900, "wall", { id: "boss_left", face: "back", disabled: true }));
    solids.push(solid(11380, -80, 120, 900, "wall", { id: "boss_right", face: "back" }));

    // 裝飾墨漬
    decor.push({ kind: "inkstain", x: 980, y: 548, w: 160, h: 28 });
    decor.push({ kind: "scrap", x: 620, y: 540, rot: -0.3 });
    decor.push({ kind: "scrap", x: 1400, y: 536, rot: 0.4 });
    decor.push({ kind: "lamp", x: 1700, y: 568 });
    decor.push({ kind: "lamp", x: 4000, y: 568 });
    decor.push({ kind: "lamp", x: 5300, y: 568 });
    decor.push({ kind: "banner", x: 2400, y: 300 });

    const pillars = [
      { id: "left", x: 6520, y: 448, w: 44, h: 120, on: false },
      { id: "right", x: 7460, y: 448, w: 44, h: 120, on: false },
    ];

    const chest = { x: 5640, y: 328, w: 54, h: 40, open: false, got: false };

    const bridges = {
      left: { x: 6760, y: 548, w: 260, h: 24, on: false },
      right: { x: 7000, y: 548, w: 260, h: 24, on: false },
    };

    const updraft = { x: 7620, y: 200, w: 140, h: 370, on: false };

    const alcoveLand = { x: 5620, y: 322 };

    return {
      solids,
      decor,
      zones,
      pillars,
      chest,
      bridges,
      updraft,
      alcoveLand,
      obstacleBroken: false,
      doorOpen: false,
      eliteDoorOpen: false,
      worldLeft: 0,
      worldRight: 11500,
      hazard: [],
      crumbling: [], // phase 3 碎裂區塊
    };
  };

  AR.bridgeSolids = function (level) {
    const out = [];
    if (level.bridges.left.on) out.push(solid(level.bridges.left.x, level.bridges.left.y, level.bridges.left.w, level.bridges.left.h, "bridge", { spike: true }));
    if (level.bridges.right.on) out.push(solid(level.bridges.right.x, level.bridges.right.y, level.bridges.right.w, level.bridges.right.h, "bridge", { spike: true }));
    return out;
  };

  AR.unstuck = function (a, solids) {
    const hb = { x: a.x, y: a.y, w: a.w, h: a.h };
    for (const s of solids) {
      if (!AR.aabb(hb, s)) continue;
      if (s.oneWay) continue;
      const left = (a.x + a.w) - s.x;
      const right = (s.x + s.w) - a.x;
      const top = (a.y + a.h) - s.y;
      const bot = (s.y + s.h) - a.y;
      const m = Math.min(left, right, top, bot);
      if (m === left) a.x = s.x - a.w;
      else if (m === right) a.x = s.x + s.w;
      else if (m === top) { a.y = s.y - a.h; a.vy = 0; a.onGround = true; }
      else { a.y = s.y + s.h; a.vy = 0; }
      hb.x = a.x; hb.y = a.y;
    }
  };

  AR.allSolids = function (level) {
    const base = level.solids.filter((s) => {
      if (s.type === "obstacle" && level.obstacleBroken) return false;
      if (s.id === "tutorial_gate" && level.obstacleBroken) return false;
      if (s.id === "puzzle_door" && level.doorOpen) return false;
      if (s.id === "elite_door" && level.eliteDoorOpen) return false;
      return !s.disabled;
    });
    return base.concat(AR.bridgeSolids(level), level.crumbling.filter((c) => !c.gone));
  };

  /* ---------- 物理 ---------- */
  AR.moveActor = function (a, solids, dt, opts) {
    opts = opts || {};
    a.vy += (opts.gravity ?? G) * dt;
    if (a.vy > MAX_FALL) a.vy = MAX_FALL;
    a.onGround = false;

    a.x += a.vx * dt;
    const hb = { x: a.x, y: a.y, w: a.w, h: a.h };
    for (const s of solids) {
      if (s.oneWay) continue;
      if (!AR.aabb(hb, s)) continue;
      if (a.vx > 0) a.x = s.x - a.w;
      else if (a.vx < 0) a.x = s.x + s.w;
      a.vx = 0;
      hb.x = a.x;
    }

    a.y += a.vy * dt;
    hb.x = a.x;
    hb.y = a.y;
    for (const s of solids) {
      if (!AR.aabb(hb, s)) continue;
      if (s.oneWay && (a.vy < 0 || a.y + a.h - a.vy * dt > s.y + 8)) continue;
      if (a.vy > 0 && a.y + a.h - a.vy * dt <= s.y + 12) {
        a.y = s.y - a.h;
        a.vy = 0;
        a.onGround = true;
      } else if (a.vy < 0 && !s.oneWay) {
        a.y = s.y + s.h;
        a.vy = 0;
      }
      hb.y = a.y;
    }
  };

  /* ---------- 玩家 ---------- */
  AR.makePlayer = function (x, y) {
    return {
      x, y, w: 36, h: 78,
      vx: 0, vy: 0,
      facing: 1,
      onGround: false,
      hp: 100,
      maxHp: 100,
      invuln: 0,
      coyote: 0,
      jumpBuf: 0,
      state: "idle",
      anim: 0,
      busy: 0,
      action: null,
      barrier: 0,
      aura: null,
      dead: false,
      kneel: 0,
      hitsThisLife: 0,
      cardsPlayed: 0,
      foundAce: false,
      hiddenFound: false,
    };
  };

  AR.hurtPlayer = function (p, dmg, srcX) {
    if (p.invuln > 0 || p.dead || p.busy && p.action && (p.action.type === "pair" || p.action.type === "straight") && p.action.iframe) return false;
    if (p.barrier > 0) {
      p.barrier = Math.max(0, p.barrier - 1);
      AR.Audio.play("block");
      AR.FX.spark(p.x + p.w / 2, p.y + p.h / 2, 8, "#7ec8e8");
      p.invuln = 0.4;
      return false;
    }
    p.hp -= dmg;
    p.hitsThisLife++;
    p.invuln = 0.95;
    p.vy = -280;
    p.vx = srcX != null ? AR.sign(p.x - srcX) * 220 : -p.facing * 220;
    p.state = "hurt";
    p.busy = 0.2;
    AR.Audio.play("hurt");
    AR.Camera.bump(10);
    AR.FX.ink(p.x + p.w / 2, p.y + p.h * 0.4, 10);
    AR.FX.number(p.x + p.w / 2, p.y, "-" + dmg, "#ff6b6b");
    if (p.hp <= 0) {
      p.hp = 0;
      p.dead = true;
      p.state = "dead";
      AR.Audio.play("dead");
    }
    return true;
  };

  AR.updatePlayer = function (p, dt, input, solids, locked) {
    p.anim += dt;
    if (p.invuln > 0) p.invuln -= dt;
    if (p.barrier > 0 && typeof p.barrier === "number" && p.barrierT != null) {
      p.barrierT -= dt;
      if (p.barrierT <= 0) p.barrier = 0;
    }
    if (p.dead) {
      p.vx *= 0.9;
      AR.moveActor(p, solids, dt);
      return;
    }

    // 行動中（站立出招等）：不位移，但仍套用重力與碰撞
    if (p.action) {
      AR.updateAction(p, dt, solids);
      return;
    }

    if (p.busy > 0) p.busy -= dt;

    const canCtrl = !locked && p.busy <= 0 && p.kneel <= 0;
    const left = input.held("KeyA") || input.held("ArrowLeft");
    const right = input.held("KeyD") || input.held("ArrowRight");
    const jumpKey = input.pressed("Space") || input.pressed("KeyW") || input.pressed("ArrowUp");
    const jumpHeld = input.held("Space") || input.held("KeyW") || input.held("ArrowUp");

    if (jumpKey) p.jumpBuf = 0.12;
    else if (p.jumpBuf > 0) p.jumpBuf -= dt;
    if (p.onGround) p.coyote = 0.1;
    else if (p.coyote > 0) p.coyote -= dt;

    const speed = 330;
    if (canCtrl) {
      if (left && !right) {
        p.vx = -speed;
        p.facing = -1;
      } else if (right && !left) {
        p.vx = speed;
        p.facing = 1;
      } else {
        p.vx *= Math.pow(0.0008, dt);
        if (Math.abs(p.vx) < 8) p.vx = 0;
      }
      if (p.jumpBuf > 0 && p.coyote > 0) {
        p.vy = -860;
        p.onGround = false;
        p.coyote = 0;
        p.jumpBuf = 0;
        p.state = "jump";
        AR.Audio.tone(320, 0.08, "sine", 0.04);
      }
    } else if (p.kneel > 0) {
      p.vx = 0;
      p.kneel -= dt;
    } else {
      p.vx *= Math.pow(0.01, dt);
    }

    // 短跳
    if (!jumpHeld && p.vy < -420) p.vy = AR.lerp(p.vy, -420, 0.35);

    AR.moveActor(p, solids, dt);

    if (p.state === "hurt" && p.busy > 0) return;
    if (!p.onGround) p.state = p.vy < 0 ? "jump" : "fall";
    else if (Math.abs(p.vx) > 30) p.state = "run";
    else p.state = "idle";
  };

  AR.updateAction = function (p, dt, solids) {
    const act = p.action;
    act.t += dt;
    // 出牌不再位移角色；水平速度迅速衰減，重力與關卡物理仍生效
    p.vx *= Math.pow(0.01, dt);
    if (Math.abs(p.vx) < 8) p.vx = 0;
    AR.moveActor(p, solids, dt);
    if ((act.type === "pair" || act.type === "straight") && (act.t * 30 | 0) !== ((act.t - dt) * 30 | 0)) {
      const col = act.type === "straight" ? "rgba(230,210,120,0.45)" : "rgba(170,80,220,0.45)";
      AR.FX.afterimage(p.x + p.w / 2 + p.facing * 36, p.y + p.h / 2, p.facing, col);
    }
    // 命中脈衝
    if (act.pulses) {
      for (const pul of act.pulses) {
        if (!pul.done && act.t >= pul.at) {
          pul.done = true;
          pul.fire();
        }
      }
    }
    if (act.t >= act.duration) {
      p.action = null;
      p.busy = 0.08;
      p.state = p.onGround ? "idle" : (p.vy < 0 ? "jump" : "fall");
      AR.unstuck(p, solids);
    }
  };

  AR.startStraightDash = function (game, ev) {
    const p = game.player;
    const dir = p.facing;
    const mul = game.deck.jokerTime > 0 ? 1.2 : 1;
    const dist = (ev.cards.length >= 4 ? 880 : 780) * mul;
    p.state = "attack";
    const dmgBase = AR.handDamage(ev, game.deck.jokerTime > 0);
    p.action = {
      type: "straight",
      t: 0,
      duration: 0.52,
      iframe: true,
      pulses: [
        { at: 0.05, done: false, fire: function () { strHit(); } },
        { at: 0.2, done: false, fire: function () { strHit(); } },
        { at: 0.36, done: false, fire: function () { strHit(); } },
      ],
    };
    function strHit() {
      game.spawnHitbox({
        x: dir > 0 ? p.x + p.w * 0.35 : p.x + p.w * 0.65 - dist,
        y: p.y - 20,
        w: dist,
        h: p.h + 40,
        dmg: dmgBase,
        life: 0.12,
        friendly: true,
        pierce: true,
        from: "straight",
      });
      AR.FX.spark(p.x + p.w / 2 + dir * 80, p.y + p.h / 2, 12, "#e6d278");
    }
  };

  /* ---------- 出牌動作 ---------- */
  AR.beginAction = function (game, ev) {
    const p = game.player;
    const mul = game.deck.jokerTime > 0 ? 2 : 1;
    const dir = p.facing;
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    p.cardsPlayed++;

    const dmgBase = AR.handDamage(ev, game.deck.jokerTime > 0);
    const info = AR.HAND_INFO[ev.type];

    game.floatHand(AR.handTitle(ev) + (ev.usedWild ? "（百搭）" : ""));

    switch (ev.type) {
      case "single": {
        AR.Audio.play("slash");
        p.state = "attack";
        p.busy = 0.32;
        const card = ev.cards[0];
        const isSpade = card.suit === "spade" || ev.usedWild;
        const dmg = dmgBase;
        if (isSpade) {
          game.spawnProj({
            kind: "spike",
            x: cx + dir * 20,
            y: cy - 6,
            w: 42,
            h: 14,
            vx: dir * 720,
            vy: 0,
            life: 0.55,
            dmg,
            friendly: true,
            pierce: true,
            suit: "spade",
            from: "single",
          });
        } else {
          game.spawnHitbox({
            x: dir > 0 ? p.x + p.w : p.x - 54,
            y: p.y + 10,
            w: 54,
            h: 50,
            dmg,
            life: 0.16,
            friendly: true,
            pierce: true,
            suit: card.suit,
            stun: 0,
            from: "single",
          });
        }
        AR.FX.spark(cx + dir * 30, cy, 8, card.suit === "heart" || card.suit === "diamond" ? "#e85a6a" : "#ddd");
        break;
      }
      case "pair": {
        AR.Audio.play("dash");
        AR.Camera.bump(6);
        const dist = 540 * (game.deck.jokerTime > 0 ? 1.25 : 1);
        p.state = "attack";
        p.action = {
          type: "pair",
          t: 0,
          duration: 0.38,
          iframe: true,
          pulses: [
            { at: 0.06, done: false, fire: () => pairHit(0) },
            { at: 0.2, done: false, fire: () => pairHit(1) },
          ],
        };
        function pairHit() {
          game.spawnHitbox({
            x: dir > 0 ? p.x + p.w * 0.25 : p.x + p.w * 0.75 - dist,
            y: p.y - 4,
            w: dist,
            h: p.h + 8,
            dmg: dmgBase,
            life: 0.1,
            friendly: true,
            pierce: true,
            stun: 1.5,
            from: "pair",
            interrupt: true,
          });
          AR.FX.spark(p.x + p.w / 2, cy, 10, "#c9a6ff");
          AR.FX.ink(p.x + p.w / 2, cy, 4);
        }
        break;
      }
      case "three": {
        AR.Audio.play("slash");
        p.state = "attack";
        p.busy = 0.4;
        const angles = [-0.4, 0, 0.4];
        for (const ang of angles) {
          const a = (dir > 0 ? 0 : Math.PI) + ang * dir;
          game.spawnProj({
            kind: "fan",
            x: cx,
            y: cy - 4,
            w: 22,
            h: 14,
            vx: Math.cos(a) * 620 * dir * dir + (dir > 0 ? 1 : -1) * Math.cos(Math.abs(ang)) * 620,
            vy: Math.sin(ang) * 420,
            life: 0.7,
            dmg: dmgBase,
            friendly: true,
            pierce: true,
            from: "three",
          });
        }
        // 修正速度：朝 facing
        game.projectiles.slice(-3).forEach((pr, i) => {
          const ang = angles[i];
          pr.vx = dir * 640 * Math.cos(ang);
          pr.vy = 640 * Math.sin(ang);
        });
        break;
      }
      case "straight": {
        AR.Audio.play("straight");
        AR.Camera.bump(8);
        AR.startStraightDash(game, ev);
        break;
      }
      case "flush": {
        AR.Audio.play("flush");
        AR.Camera.bump(10);
        p.state = "attack";
        p.busy = 0.55;
        const suit = ev.suit || "spade";
        if (suit === "spade") {
          game.spawnHitbox({
            x: cx - 120,
            y: p.y - 120,
            w: 980,
            h: 260,
            dmg: dmgBase,
            life: 0.45,
            friendly: true,
            pierce: true,
            from: "flush",
            suit: "spade",
            breakShield: true,
          });
          const baseX = cx + dir * 40;
          for (let i = 0; i < 12; i++) {
            const ox = baseX + (i - 1) * 70 * dir + AR.rand(-10, 10);
            const delay = i * 0.04;
            game.spawnProj({
              kind: "arrow",
              x: ox,
              y: p.y - 420 - i * 20,
              w: 16,
              h: 36,
              vx: 0,
              vy: 0,
              delay,
              ay: 1600,
              life: 1.1,
              dmg: dmgBase,
              friendly: true,
              pierce: true,
              from: "flush",
              suit: "spade",
              breakShield: true,
            });
          }
        } else if (suit === "heart") {
          p.aura = { kind: "heart", t: 3.2 * mul, r: 160, dmg: 8 * mul, heal: 4 * mul, tick: 0 };
        } else if (suit === "club") {
          game.spawnZone({
            kind: "poison",
            x: cx + dir * 80 - 90,
            y: p.y - 20,
            w: 220,
            h: 110,
            life: 3.5,
            dmg: 6 * mul,
            tick: 0,
            friendly: true,
          });
        } else if (suit === "diamond") {
          p.barrier = 3;
          p.barrierT = 5;
          AR.FX.spark(cx, cy, 16, "#7ec8e8");
        }
        break;
      }
      case "fullhouse": {
        AR.Audio.play("power");
        p.state = "attack";
        p.busy = 0.6;
        game.spawnProj({
          kind: "chip",
          x: cx - 50,
          y: p.y - 500,
          w: 100,
          h: 100,
          vx: 0,
          vy: 900,
          life: 1.2,
          dmg: dmgBase,
          friendly: true,
          pierce: true,
          stun: 2,
          from: "fullhouse",
        });
        break;
      }
      case "four": {
        AR.Audio.play("power");
        AR.Camera.bump(14);
        p.state = "attack";
        p.busy = 0.7;
        const dirs = [
          [1, 0], [-1, 0], [0, -1], [0, 1],
        ];
        for (const [dx, dy] of dirs) {
          game.spawnProj({
            kind: "wave",
            x: cx,
            y: cy,
            w: 30,
            h: 30,
            vx: dx * 700,
            vy: dy * 700,
            life: 0.5,
            dmg: dmgBase,
            friendly: true,
            pierce: true,
            from: "four",
          });
        }
        break;
      }
      case "straightflush": {
        AR.Audio.play("joker");
        AR.Camera.bump(16);
        game.cinematic = { kind: "royal", t: 0, dur: 0.9, dmg: dmgBase };
        AR.startStraightDash(game, ev);
        game.spawnHitbox({
          x: p.x - 400,
          y: p.y - 300,
          w: 800,
          h: 600,
          dmg: dmgBase,
          life: 0.4,
          friendly: true,
          pierce: true,
          from: "straightflush",
          instakillSmall: true,
          breakShield: true,
        });
        break;
      }
    }
    return info;
  };

  AR.findLanding = function (level, p, dir, dist, up) {
    const alcove = level.alcoveLand;
    if (up && alcove && Math.abs(alcove.x - p.x) < 1300 && ((dir > 0 && alcove.x >= p.x - 80) || (dir < 0 && alcove.x <= p.x + 80))) {
      return { x: alcove.x, y: alcove.y, arc: -220 };
    }
    const solids = AR.allSolids(level);
    const maxReach = p.x + dir * (dist + 300);
    const minAhead = p.x + dir * 80;
    let best = null;
    for (const s of solids) {
      if (!(s.type === "ground" || s.type === "platform" || s.type === "bridge" || s.id === "alcove_floor")) continue;
      const ly = s.y - p.h;
      if (ly < p.y - 380 || ly > p.y + 90) continue;
      const standingOn = p.x + p.w > s.x + 8 && p.x < s.x + s.w - 8 && Math.abs((p.y + p.h) - s.y) < 16;
      if (standingOn) continue;
      const left = s.x + 16;
      const right = s.x + s.w - p.w - 16;
      if (right < left) continue;
      if (dir > 0) {
        if (s.x + s.w < minAhead) continue;
        if (s.x > maxReach) continue;
        const lx = AR.clamp(Math.max(left, p.x + Math.min(dist, s.x - p.x + 40)), left, right);
        const score = s.x; // nearer first
        if (!best || score < best._score) best = { x: lx, y: ly, arc: ly < p.y - 20 ? -160 : -50, _score: score };
      } else {
        if (s.x > minAhead) continue;
        if (s.x + s.w < maxReach) continue;
        const lx = AR.clamp(Math.min(right, p.x - Math.min(dist, p.x - (s.x + s.w) + 40)), left, right);
        const score = -(s.x + s.w);
        if (!best || score < best._score) best = { x: lx, y: ly, arc: ly < p.y - 20 ? -160 : -50, _score: score };
      }
    }
    if (best) return best;
    return { x: p.x + dir * dist, y: p.y, arc: -60 };
  };

  AR.makeGuard = function (x, y, opts) {
    return Object.assign({
      type: "guard",
      x, y, w: 48, h: 78,
      vx: 0, vy: 0,
      facing: -1,
      hp: 30,
      maxHp: 30,
      state: "idle",
      stateT: 0.4,
      stun: 0,
      invuln: 0,
      dead: false,
      atk: 10,
      onGround: false,
      anim: 0,
    }, opts || {});
  };

  AR.makeKnight = function (x, y) {
    return {
      type: "knight",
      x, y, w: 64, h: 110,
      vx: 0, vy: 0,
      facing: -1,
      hp: 200,
      maxHp: 200,
      state: "intro",
      stateT: 1.2,
      stun: 0,
      invuln: 0,
      dead: false,
      shielded: true,
      shieldBroken: false,
      cycles: 0,
      atk: 14,
      onGround: false,
      anim: 0,
      introDone: false,
    };
  };

  AR.makeBoss = function (x, y) {
    return {
      type: "boss",
      x, y, w: 120, h: 210,
      vx: 0, vy: 0,
      facing: -1,
      hp: 500,
      maxHp: 500,
      state: "intro",
      stateT: 2.2,
      stun: 0,
      invuln: 0,
      dead: false,
      atk: 16,
      onGround: false,
      anim: 0,
      phase: 1,
      risen: false,
      spearMode: "spear",
      enraged: false,
    };
  };

  AR.hurtEnemy = function (e, dmg, opts, game) {
    opts = opts || {};
    if (e.dead) return 0;
    if (e.invuln > 0 && !opts.ignoreInv) return 0;

    // 騎士盾
    if (e.type === "knight" && e.shielded && !opts.breakShield) {
      AR.Audio.play("block");
      AR.FX.spark(e.x + e.w / 2, e.y + 40, 8, "#cccccc");
      AR.FX.number(e.x + e.w / 2, e.y, "格擋", "#ccc");
      return 0;
    }
    if (e.type === "knight" && e.shielded && opts.breakShield) {
      e.shielded = false;
      e.shieldBroken = true;
      e.stun = Math.max(e.stun, 3);
      e.state = "stun";
      e.stateT = 3;
      AR.Audio.play("break");
      AR.Camera.bump(14);
      AR.FX.paper(e.x + e.w / 2, e.y + 40, 24, "#f3ead3");
      AR.FX.number(e.x + e.w / 2, e.y - 10, "破防！", "#e8d48a");
      game && game.toast && game.toast("同花·黑桃——盾牌碎裂！");
    }

    const dealt = Math.max(1, Math.round(dmg));
    e.hp -= dealt;
    e.invuln = opts.from === "flush" || opts.from === "straight" ? 0.08 : 0.12;
    AR.FX.ink(e.x + e.w / 2, e.y + e.h * 0.4, 6);
    AR.FX.number(e.x + e.w / 2, e.y, String(dealt), "#f3ead3");
    AR.Audio.play("hit");

    if (opts.stun) e.stun = Math.max(e.stun, opts.stun);
    if (opts.interrupt && (e.state === "charge" || e.state === "thrustCharge" || e.state === "goldCharge")) {
      e.state = "stun";
      e.stateT = Math.max(e.stun, 0.8);
      e.vx = 0;
      AR.FX.number(e.x + e.w / 2, e.y - 16, "打斷！", "#e8d48a");
    }
    if (e.stun > 0 && e.state !== "stun" && e.type !== "boss") {
      e.state = "stun";
      e.stateT = e.stun;
      e.vx = 0;
    }
    if (e.type === "boss" && opts.interrupt && (e.state === "goldCharge" || e.state === "thrustCharge")) {
      e.state = "stagger";
      e.stateT = 1.2;
      e.vx = 0;
    }

    if (e.hp <= 0) {
      e.hp = 0;
      e.dead = true;
      e.state = "dead";
      e.stateT = 1;
      AR.FX.paper(e.x + e.w / 2, e.y + e.h / 2, 20, "#f3ead3");
      AR.Audio.play("break");
    }
    return dealt;
  };

  AR.updateEnemies = function (game, dt) {
    const p = game.player;
    const solids = AR.allSolids(game.level);
    const scale = game.boss && game.boss.enraged && !game.boss.dead ? 1.5 : 1;
    for (const e of game.enemies) {
      if (e.dead) {
        e.stateT -= dt;
        e.vy += G * dt;
        continue;
      }
      if (e.invuln > 0) e.invuln -= dt;
      if (e.stun > 0) e.stun -= dt;
      e.anim += dt;
      if (e.type === "guard") AR.updateGuard(e, game, dt, solids, p);
      else if (e.type === "knight") AR.updateKnight(e, game, dt, solids, p);
      else if (e.type === "boss") AR.updateBoss(e, game, dt * (e.state === "intro" ? 1 : 1), solids, p, scale);
    }
    // 清掉死去過久的小兵
    game.enemies = game.enemies.filter((e) => !(e.dead && e.type === "guard" && e.stateT < -1.5));
  };

  AR.updateGuard = function (e, game, dt, solids, p) {
    const pc = AR.center(p);
    const ec = AR.center(e);
    if (e.stun > 0 || e.state === "stun") {
      e.vx = 0;
      e.state = "stun";
      e.stateT -= dt;
      if (e.stateT <= 0 && e.stun <= 0) {
        e.state = "idle";
        e.stateT = 0.3;
      }
      AR.moveActor(e, solids, dt);
      return;
    }
    e.facing = pc.x < ec.x ? -1 : 1;
    if (e.state === "idle") {
      e.vx = 0;
      e.stateT -= dt;
      if (e.stateT <= 0 && Math.abs(pc.x - ec.x) < 520 && Math.abs(pc.y - ec.y) < 160) {
        e.state = "telegraph";
        e.stateT = 0.55;
      }
    } else if (e.state === "telegraph") {
      e.vx = 0;
      e.stateT -= dt;
      if (e.stateT <= 0) {
        e.state = "charge";
        e.stateT = 0.55;
        e.vx = e.facing * 560;
        AR.Audio.play("dash");
      }
    } else if (e.state === "charge") {
      e.stateT -= dt;
      if (AR.aabb({ x: e.x, y: e.y, w: e.w, h: e.h }, p) && p.invuln <= 0) {
        AR.hurtPlayer(p, e.atk, e.x);
      }
      if (e.stateT <= 0) {
        e.state = "idle";
        e.stateT = 0.9;
        e.vx = 0;
      }
    }
    AR.moveActor(e, solids, dt);
  };

  AR.updateKnight = function (e, game, dt, solids, p) {
    const pc = AR.center(p);
    const ec = AR.center(e);
    e.facing = pc.x < ec.x ? -1 : 1;

    if (e.state === "intro") {
      e.vx = 0;
      e.stateT -= dt;
      if (e.stateT <= 0) {
        e.state = "shield";
        e.stateT = 0.8;
        e.shielded = true;
      }
      AR.moveActor(e, solids, dt);
      return;
    }
    if (e.stun > 0 || e.state === "stun") {
      e.vx = 0;
      e.state = "stun";
      e.stateT -= dt;
      if (e.stateT <= 0 && e.stun <= 0) {
        e.state = "thrust";
        e.stateT = 0.3;
        e.thrustN = 0;
      }
      AR.moveActor(e, solids, dt);
      return;
    }

    if (e.state === "shield") {
      e.vx = 0;
      e.stateT -= dt;
      e.shielded = true;
      if (e.stateT <= 0) {
        e.state = "shieldCharge";
        e.stateT = 0.9;
        e.vx = e.facing * 280;
      }
    } else if (e.state === "shieldCharge") {
      e.stateT -= dt;
      if (AR.aabb({ x: e.x, y: e.y, w: e.w, h: e.h }, p)) {
        AR.hurtPlayer(p, e.atk + 2, e.x);
      }
      if (e.stateT <= 0) {
        e.vx = 0;
        e.state = "shield";
        e.stateT = 1.2;
      }
    } else if (e.state === "thrust") {
      e.vx = 0;
      e.stateT -= dt;
      if (e.stateT <= 0) {
        e.state = "thrusting";
        e.stateT = 0.22;
        const dir = e.facing;
        game.spawnHitbox({
          x: dir > 0 ? e.x + e.w : e.x - 90,
          y: e.y + 30,
          w: 90,
          h: 28,
          dmg: e.atk,
          life: 0.16,
          friendly: false,
        });
        AR.Audio.play("slash");
      }
    } else if (e.state === "thrusting") {
      e.stateT -= dt;
      if (e.stateT <= 0) {
        e.thrustN = (e.thrustN || 0) + 1;
        if (e.thrustN < 3) {
          e.state = "thrust";
          e.stateT = 0.18;
        } else {
          e.state = "summon";
          e.stateT = 0.8;
        }
      }
    } else if (e.state === "summon") {
      e.vx = 0;
      e.stateT -= dt;
      if (e.stateT <= 0) {
        const n = game.enemies.filter((x) => x.type === "guard" && !x.dead).length;
        if (n < 2) {
          game.enemies.push(AR.makeGuard(e.x + 80, 568 - 78));
          game.enemies.push(AR.makeGuard(e.x - 120, 568 - 78));
          AR.FX.paper(e.x, e.y, 12);
        }
        e.cycles++;
        e.shielded = true;
        e.state = "shield";
        e.stateT = 1.0;
      }
    }
    AR.moveActor(e, solids, dt);
  };

  AR.updateBoss = function (e, game, dt, solids, p, scale) {
    // phase
    const ratio = e.hp / e.maxHp;
    const prevPhase = e.phase;
    if (ratio <= 0.25) e.phase = 3;
    else if (ratio <= 0.6) e.phase = 2;
    else e.phase = 1;
    if (e.phase !== prevPhase && e.phase > prevPhase) {
      game.onBossPhase(e.phase);
    }
    e.enraged = e.phase === 3;
    if (e.phase === 2) e.spearMode = "whip";

    const pc = AR.center(p);
    const ec = AR.center(e);
    e.facing = pc.x < ec.x ? -1 : 1;
    const spd = scale;

    if (e.state === "intro") {
      e.vx = 0;
      e.stateT -= dt;
      if (e.stateT <= 0) {
        e.state = "idle";
        e.stateT = 0.6;
        e.risen = true;
      }
      return;
    }
    if (e.state === "stagger" || e.stun > 0) {
      e.vx = 0;
      e.stateT -= dt;
      if (e.stateT <= 0 && e.stun <= 0) {
        e.state = "idle";
        e.stateT = 0.3;
      }
      AR.moveActor(e, solids, dt);
      return;
    }
    if (e.state === "dead") return;

    if (e.state === "idle") {
      e.vx = 0;
      e.stateT -= dt;
      if (e.stateT <= 0) AR.bossChoose(e, game);
    } else if (e.state === "thrustTele") {
      e.vx = 0;
      e.stateT -= dt;
      if (e.stateT <= 0) {
        e.state = "thrusting";
        e.stateT = 0.2 / spd;
        const dir = e.facing;
        game.spawnHitbox({
          x: dir > 0 ? e.x + e.w : e.x - 130,
          y: e.y + 70,
          w: 130,
          h: 32,
          dmg: e.atk,
          life: 0.16,
          friendly: false,
        });
        AR.Audio.play("slash");
        AR.Camera.bump(5);
      }
    } else if (e.state === "thrusting") {
      e.stateT -= dt;
      if (e.stateT <= 0) {
        e.thrustN = (e.thrustN || 0) + 1;
        if (e.thrustN < 3) {
          e.state = "thrustTele";
          e.stateT = 0.22 / spd;
        } else {
          e.state = "idle";
          e.stateT = 0.8 / spd;
        }
      }
    } else if (e.state === "spikes") {
      e.vx = 0;
      e.stateT -= dt;
      if (!e.didSpike && e.stateT < 0.05) {
        e.didSpike = true;
        AR.spawnSpikeZones(game, e.phase);
      }
      if (e.stateT <= 0) {
        e.state = "idle";
        e.stateT = 0.7 / spd;
      }
    } else if (e.state === "goldCharge") {
      e.vx = 0;
      e.stateT -= dt;
      if (e.stateT <= 0) {
        e.state = "goldThrust";
        e.stateT = 0.35 / spd;
        const dir = e.facing;
        game.spawnHitbox({
          x: dir > 0 ? e.x + e.w : e.x - 220,
          y: e.y + 40,
          w: 220,
          h: 50,
          dmg: e.atk + 8,
          life: 0.22,
          friendly: false,
        });
        AR.Audio.play("spike");
        AR.Camera.bump(10);
      }
    } else if (e.state === "goldThrust") {
      e.stateT -= dt;
      if (e.stateT <= 0) {
        e.state = "idle";
        e.stateT = 0.8 / spd;
      }
    } else if (e.state === "whipTele") {
      e.vx = 0;
      e.stateT -= dt;
      if (e.stateT <= 0) {
        e.state = "whip";
        e.stateT = 0.4 / spd;
        game.spawnHitbox({
          x: e.x - 200,
          y: e.y + 90,
          w: e.w + 400,
          h: 40,
          dmg: e.atk + 2,
          life: 0.25,
          friendly: false,
        });
        AR.Audio.play("slash");
        AR.Camera.bump(8);
      }
    } else if (e.state === "whip") {
      e.stateT -= dt;
      if (e.stateT <= 0) {
        e.state = "idle";
        e.stateT = 0.7 / spd;
      }
    } else if (e.state === "summon") {
      e.vx = 0;
      e.stateT -= dt;
      if (e.stateT <= 0) {
        const n = game.enemies.filter((x) => x.type === "guard" && !x.dead).length;
        const need = 3 - n;
        for (let i = 0; i < need; i++) {
          const gx = e.x + (i - 1) * 140 + AR.irand(-40, 40);
          game.enemies.push(AR.makeGuard(gx, 568 - 78));
        }
        AR.FX.paper(ec.x, ec.y, 16);
        e.state = "idle";
        e.stateT = 1.0 / spd;
      }
    }
    AR.moveActor(e, solids, dt);
  };

  AR.bossChoose = function (e, game) {
    const opts = [];
    if (e.phase === 1) opts.push("thrust", "thrust", "spikes", "gold");
    else if (e.phase === 2) opts.push("whip", "spikes", "summon", "gold", "thrust");
    else opts.push("thrust", "whip", "spikes", "gold", "summon");
    // 避免連續相同兩次太多
    let pick = AR.pick(opts);
    if (pick === e.lastMove) pick = AR.pick(opts);
    e.lastMove = pick;
    e.didSpike = false;
    e.thrustN = 0;
    const spd = e.enraged ? 1.5 : 1;
    if (pick === "thrust") {
      e.state = "thrustTele";
      e.stateT = 0.4 / spd;
    } else if (pick === "spikes") {
      e.state = "spikes";
      e.stateT = 0.9 / spd;
    } else if (pick === "gold") {
      e.state = "goldCharge";
      e.stateT = 0.85 / spd;
    } else if (pick === "whip") {
      e.state = "whipTele";
      e.stateT = 0.5 / spd;
    } else if (pick === "summon") {
      e.state = "summon";
      e.stateT = 0.6 / spd;
    }
  };

  AR.spawnSpikeZones = function (game, phase) {
    const p = game.player;
    const floorY = 568;
    const count = phase >= 3 ? 4 : 3;
    const w = phase >= 2 ? 180 : 160;
    const spots = [];
    // 一圈鎖玩家位置，另外隨機
    spots.push(p.x + p.w / 2 - w / 2);
    for (let i = 1; i < count; i++) {
      spots.push(AR.rand(9400, 11000) - w / 2);
    }
    for (const x of spots) {
      game.hazards.push({
        kind: "spikezone",
        x: AR.clamp(x, 9320, 11200),
        y: floorY - 8,
        w,
        h: 90,
        tele: 0.85,
        t: 0,
        life: 1.4,
        erupted: false,
        dmg: 18,
      });
    }
  };

  /* ---------- 繪製世界 ---------- */
  AR.drawFelt = function (ctx, cam, time) {
    const g = ctx.createLinearGradient(0, 0, 0, AR.H);
    g.addColorStop(0, "#163d2e");
    g.addColorStop(0.45, "#0d2c22");
    g.addColorStop(1, "#071611");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, AR.W, AR.H);
    // 牌桌網格（視差）
    ctx.save();
    ctx.globalAlpha = 0.14;
    const ox = -((cam.x * 0.3) % 48);
    const oy = -((cam.y * 0.2) % 48);
    ctx.strokeStyle = "#0a1a14";
    ctx.lineWidth = 1;
    for (let x = ox; x < AR.W + 48; x += 48) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, AR.H);
      ctx.stroke();
    }
    for (let y = oy; y < AR.H + 48; y += 48) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(AR.W, y);
      ctx.stroke();
    }
    ctx.restore();
    // 暗角
    const vg = ctx.createRadialGradient(AR.W / 2, AR.H * 0.45, 120, AR.W / 2, AR.H * 0.5, AR.W * 0.7);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(1, "rgba(0,0,0,0.45)");
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, AR.W, AR.H);
  };

  AR.drawParallax = function (ctx, cam, time) {
    // 遠景巨大黑桃 A
    const ax = cam.wx(2200) * 0.25 + 820;
    const ay = 80 - cam.y * 0.08;
    ctx.save();
    ctx.translate(ax, ay);
    ctx.rotate(-0.12);
    ctx.globalAlpha = 0.35;
    AR.roundRect(ctx, -180, -20, 360, 520, 18);
    ctx.fillStyle = "#f3ead3";
    ctx.fill();
    ctx.strokeStyle = "#1a1a22";
    ctx.lineWidth = 8;
    ctx.stroke();
    ctx.fillStyle = "#1a1a22";
    ctx.font = `bold 72px ${AR.FONT}`;
    ctx.textAlign = "left";
    ctx.fillText("A", -150, 70);
    ctx.font = `200px ${AR.FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("♠", 10, 300);
    // 眼睛緩緩睜開
    const open = 0.5 + 0.5 * Math.sin(time * 0.4);
    ctx.fillStyle = "#1a1a22";
    ctx.beginPath();
    ctx.ellipse(8, 210, 28, 18 * open, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#e8d48a";
    ctx.beginPath();
    ctx.ellipse(8, 210, 8, 8 * open, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // 漂浮碎牌
    ctx.globalAlpha = 0.25;
    for (let i = 0; i < 9; i++) {
      const rng = AR.seeded(i * 99 + 3);
      const x = cam.wx((i * 1400 + 400) % 11000) * 0.4 + (i * 180);
      const y = 80 + (i * 47) % 200 + Math.sin(time * 0.4 + i) * 16 - cam.y * 0.1;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(Math.sin(time * 0.2 + i) * 0.2);
      AR.drawCardBack(ctx, 0, 0, 50, 70, 0);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  };

  AR.drawSolid = function (ctx, s, cam, time, level) {
    const x = cam.wx(s.x);
    const y = cam.wy(s.y);
    if (x > AR.W + 40 || x + s.w < -40 || y > AR.H + 40 || y + s.h < -40) return;
    const rng = AR.seeded(s.seed || 1);

    if (s.type === "bridge") {
      ctx.save();
      ctx.fillStyle = "#1a1a22";
      ctx.beginPath();
      ctx.moveTo(x, y + s.h);
      const spikes = Math.max(3, (s.w / 22) | 0);
      for (let i = 0; i <= spikes; i++) {
        const sx = x + (i / spikes) * s.w;
        const sy = y + (i % 2 === 0 ? -18 : 4);
        ctx.lineTo(sx, sy);
      }
      ctx.lineTo(x + s.w, y + s.h);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = "#e8d48a";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.restore();
      return;
    }

    if (s.type === "obstacle") {
      ctx.save();
      ctx.translate(x + s.w / 2, y + s.h);
      ctx.rotate(-0.04);
      AR.drawCardFace(ctx, { suit: "spade", rank: 2 }, -s.w / 2, -s.h, s.w, s.h, {});
      ctx.restore();
      return;
    }

    if (s.face === "door" || s.id === "puzzle_door") {
      AR.roundRect(ctx, x, y, s.w, s.h, 4);
      ctx.fillStyle = "#140c12";
      ctx.fill();
      ctx.strokeStyle = "#d4b06a";
      ctx.lineWidth = 3;
      ctx.stroke();
      // 黑桃之眼
      const ex = x + s.w / 2;
      const ey = y + 280;
      ctx.fillStyle = "#f3ead3";
      ctx.beginPath();
      ctx.ellipse(ex, ey, 28, 40, 0, 0, Math.PI * 2);
      ctx.fill();
      const blink = 0.75 + 0.25 * Math.sin(time * 2);
      ctx.fillStyle = "#1a1a22";
      ctx.beginPath();
      ctx.ellipse(ex, ey, 14, 22 * blink, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#c41e3a";
      ctx.beginPath();
      ctx.ellipse(ex, ey, 5, 8 * blink, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#d4b06a";
      ctx.font = `28px ${AR.FONT}`;
      ctx.textAlign = "center";
      ctx.fillText("♠", ex, ey - 50);
      return;
    }

    // 紙牌地面 / 牆
    const body = s.type === "wall" ? "#d8c9a8" : "#efe4cc";
    ctx.fillStyle = body;
    ctx.beginPath();
    const steps = Math.max(4, (s.w / 40) | 0);
    ctx.moveTo(x, y);
    // 撕裂上緣
    if (s.torn !== false && s.type !== "wall") {
      for (let i = 0; i <= steps; i++) {
        const tx = x + (i / steps) * s.w;
        const ty = y + (rng() < 0.5 ? rng() * 7 : -rng() * 5);
        ctx.lineTo(tx, ty);
      }
    } else {
      ctx.lineTo(x + s.w, y);
    }
    ctx.lineTo(x + s.w, y + s.h);
    ctx.lineTo(x, y + s.h);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "rgba(40,30,20,0.55)";
    ctx.lineWidth = 2;
    ctx.stroke();

    // 反覆牌面紋理
    if (s.h > 40 && s.w > 80) {
      ctx.save();
      ctx.beginPath();
      ctx.rect(x, y, s.w, Math.min(s.h, 90));
      ctx.clip();
      ctx.globalAlpha = 0.12;
      ctx.fillStyle = "#1a1a22";
      ctx.font = `64px ${AR.FONT}`;
      ctx.textAlign = "center";
      const glyph = AR.SUIT_GLYPH[s.suit || "spade"];
      for (let tx = x + 50; tx < x + s.w; tx += 140) {
        ctx.fillText(glyph, tx, y + 70);
      }
      ctx.restore();
      if (s.card) {
        ctx.globalAlpha = 0.22;
        ctx.fillStyle = "#1a1a22";
        ctx.font = `bold 28px ${AR.FONT}`;
        ctx.textAlign = "left";
        ctx.fillText(s.card, x + 10, y + 32);
        ctx.globalAlpha = 1;
      }
    }
    // 厚度陰影
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fillRect(x, y + Math.min(18, s.h), s.w, 8);
  };

  AR.drawPillar = function (ctx, pil, cam, time) {
    const x = cam.wx(pil.x);
    const y = cam.wy(pil.y);
    ctx.save();
    ctx.fillStyle = pil.on ? "#1a1a22" : "#2a2a32";
    AR.roundRect(ctx, x, y, pil.w, pil.h, 6);
    ctx.fill();
    ctx.strokeStyle = pil.on ? "#e8d48a" : "#6a6a72";
    ctx.lineWidth = 3;
    ctx.stroke();
    ctx.fillStyle = pil.on ? "#e8d48a" : "#888";
    ctx.font = `36px ${AR.FONT}`;
    ctx.textAlign = "center";
    ctx.fillText("♠", x + pil.w / 2, y + 48);
    if (pil.on) {
      ctx.globalAlpha = 0.4 + 0.3 * Math.sin(time * 6);
      ctx.strokeStyle = "#e8d48a";
      ctx.lineWidth = 4;
      ctx.strokeRect(x - 4, y - 4, pil.w + 8, pil.h + 8);
    }
    ctx.restore();
  };

  AR.drawChest = function (ctx, ch, cam, time) {
    const x = cam.wx(ch.x);
    const y = cam.wy(ch.y);
    ctx.save();
    ctx.fillStyle = ch.open ? "#3a2a12" : "#6b4a16";
    AR.roundRect(ctx, x, y, ch.w, ch.h, 4);
    ctx.fill();
    ctx.strokeStyle = "#e8d48a";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#e8d48a";
    ctx.font = `20px ${AR.FONT}`;
    ctx.textAlign = "center";
    ctx.fillText(ch.open ? "空" : "♠", x + ch.w / 2, y + 26);
    if (!ch.open) {
      ctx.globalAlpha = 0.5 + 0.4 * Math.sin(time * 4);
      ctx.fillStyle = "#ffe9a0";
      ctx.beginPath();
      ctx.arc(x + ch.w / 2, y - 10, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  };

  /* ---------- 角色繪製 ---------- */
  AR.drawJoker = function (ctx, p, cam, time) {
    const x = cam.wx(p.x + p.w / 2);
    const y = cam.wy(p.y + p.h);
    const blink = p.invuln > 0 && Math.sin(p.invuln * 40) < 0 ? 0.35 : 1;
    ctx.save();
    ctx.translate(x, y);
    ctx.globalAlpha = blink;

    const bob = p.onGround && p.state === "idle" ? Math.sin(time * 5) * 1.5 : 0;
    const run = p.state === "run" ? Math.sin(p.anim * 14) : 0;
    const kneel = p.kneel > 0 || (p.state === "kneel");

    // 影子
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 20, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.translate(0, -bob + (kneel ? 16 : 0) + (p.state === "run" ? Math.abs(run) * 1.2 : 0));

    const img = AR.Sprites && AR.Sprites.pick(p);
    if (img) {
      const flip = (img === AR.Sprites.side) ? (p.facing || 1) : 1;
      ctx.scale(flip, 1);
      const drawH = kneel ? 96 : 110;
      const drawW = img.naturalWidth / img.naturalHeight * drawH;
      const atk = p.state === "attack" || (p.action && (p.action.type === "singleDash" || p.action.type === "pair"));
      if (atk) ctx.rotate(-0.12);
      if (p.state === "hurt") ctx.rotate(0.16);
      if (p.state === "dead") ctx.rotate(0.55);
      ctx.drawImage(img, -drawW / 2, -drawH, drawW, drawH);
    } else {
      // 立繪尚未載入時的簡化後備
      ctx.scale(p.facing, 1);
      ctx.fillStyle = "#f6e7b8";
      ctx.beginPath();
      ctx.ellipse(0, -78, 16, 18, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#f7f4ee";
      ctx.beginPath();
      ctx.ellipse(0, -98, 22, 8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#fff7f0";
      ctx.fillRect(-12, -62, 24, 28);
    }

    ctx.restore();
  };

  AR.drawJokerAura = function (ctx, p, cam, time, jokerTime) {
    if (jokerTime <= 0 && !p.aura && p.barrier <= 0) return;
    const x = cam.wx(p.x + p.w / 2);
    const y = cam.wy(p.y + p.h / 2);
    if (jokerTime > 0) {
      ctx.save();
      ctx.globalAlpha = 0.25 + 0.15 * Math.sin(time * 8);
      ctx.strokeStyle = "#c9a6ff";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 48 + Math.sin(time * 6) * 4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (p.barrier > 0) {
      ctx.save();
      ctx.globalAlpha = 0.4;
      ctx.strokeStyle = "#7ec8e8";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(x, y, 44, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }
    if (p.aura) {
      ctx.save();
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = "#c41e3a";
      ctx.beginPath();
      ctx.arc(x, y, p.aura.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  AR.drawGuard = function (ctx, e, cam, time) {
    const x = cam.wx(e.x + e.w / 2);
    const y = cam.wy(e.y + e.h);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(e.facing, 1);
    const flash = e.state === "telegraph" && Math.sin(time * 20) > 0;
    if (e.dead) ctx.globalAlpha = Math.max(0, e.stateT);

    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 16, 4, 0, 0, Math.PI * 2);
    ctx.fill();

    // 紙人身體
    ctx.fillStyle = flash ? "#c41e3a" : "#f3ead3";
    ctx.beginPath();
    ctx.moveTo(-16, -64);
    ctx.lineTo(16, -64);
    ctx.lineTo(18, -8);
    ctx.lineTo(-18, -8);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1a1a22";
    ctx.lineWidth = 1.5;
    ctx.stroke();
    // 盾（黑桃）
    ctx.fillStyle = "#1a1a22";
    ctx.beginPath();
    ctx.moveTo(14, -50);
    ctx.lineTo(28, -36);
    ctx.lineTo(14, -16);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f3ead3";
    ctx.font = `14px ${AR.FONT}`;
    ctx.textAlign = "center";
    ctx.scale(e.facing, 1);
    ctx.fillText("♠", 20 * e.facing, -32);
    ctx.scale(e.facing, 1);
    // 頭
    ctx.fillStyle = flash ? "#c41e3a" : "#f3ead3";
    ctx.beginPath();
    ctx.arc(0, -74, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = "#1a1a22";
    ctx.fillRect(-5, -76, 3, 2);
    ctx.fillRect(2, -76, 3, 2);

    if (e.state === "stun") {
      ctx.fillStyle = "#e8d48a";
      ctx.font = `12px ${AR.FONT}`;
      ctx.scale(e.facing, 1);
      ctx.fillText("眩暈", 0, -96);
    }
    ctx.restore();
    AR.drawMiniHp(ctx, cam, e);
  };

  AR.drawKnight = function (ctx, e, cam, time) {
    const x = cam.wx(e.x + e.w / 2);
    const y = cam.wy(e.y + e.h);
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(e.facing, 1);
    if (e.dead) ctx.globalAlpha = Math.max(0, e.stateT);
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 26, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = "#d8c9a8";
    ctx.beginPath();
    ctx.moveTo(-24, -100);
    ctx.lineTo(24, -100);
    ctx.lineTo(28, -10);
    ctx.lineTo(-28, -10);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#1a1a22";
    ctx.lineWidth = 2;
    ctx.stroke();

    if (e.shielded) {
      ctx.fillStyle = "rgba(230,220,180,0.85)";
      ctx.beginPath();
      ctx.ellipse(20, -60, 22, 36, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "#d4b06a";
      ctx.stroke();
      ctx.fillStyle = "#1a1a22";
      ctx.font = `28px ${AR.FONT}`;
      ctx.textAlign = "center";
      ctx.scale(e.facing, 1);
      ctx.fillText("♠", 20 * e.facing, -52);
      ctx.scale(e.facing, 1);
    }

    // 頭盔
    ctx.fillStyle = "#2a2a32";
    ctx.beginPath();
    ctx.arc(0, -112, 16, Math.PI, 0);
    ctx.lineTo(16, -100);
    ctx.lineTo(-16, -100);
    ctx.fill();
    ctx.fillStyle = "#e8d48a";
    ctx.fillRect(-10, -118, 20, 4);

    // 槍
    ctx.strokeStyle = "#f3ead3";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(20, -70);
    ctx.lineTo(70, -50);
    ctx.stroke();
    ctx.fillStyle = "#1a1a22";
    ctx.beginPath();
    ctx.moveTo(70, -54);
    ctx.lineTo(88, -48);
    ctx.lineTo(70, -44);
    ctx.fill();

    ctx.restore();
    AR.drawMiniHp(ctx, cam, e, e.shielded ? "#aaa" : "#c41e3a");
  };

  AR.drawBoss = function (ctx, e, cam, time) {
    const x = cam.wx(e.x + e.w / 2);
    const y = cam.wy(e.y + e.h);
    const rise = e.state === "intro" ? AR.clamp(1 - e.stateT / 2.2, 0, 1) : 1;
    ctx.save();
    ctx.translate(x, y + (1 - rise) * 220);
    if (e.dead) ctx.globalAlpha = Math.max(0, 0.3 + e.stateT);
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(0, 0, 50, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    // 巨大牌面身體
    AR.roundRect(ctx, -60, -210, 120, 200, 10);
    ctx.fillStyle = "#f3ead3";
    ctx.fill();
    ctx.strokeStyle = "#1a1a22";
    ctx.lineWidth = 5;
    ctx.stroke();
    ctx.fillStyle = "#1a1a22";
    ctx.font = `bold 36px ${AR.FONT}`;
    ctx.textAlign = "left";
    ctx.fillText("J", -48, -168);
    ctx.font = `24px ${AR.FONT}`;
    ctx.fillText("♠", -46, -140);
    // 臉
    ctx.fillStyle = "#1a1a22";
    const open = e.risen || e.state !== "intro" ? 1 : rise;
    ctx.beginPath();
    ctx.ellipse(-16, -110, 8, 10 * open, 0, 0, Math.PI * 2);
    ctx.ellipse(16, -110, 8, 10 * open, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#c41e3a";
    ctx.beginPath();
    ctx.ellipse(-16, -110, 3, 4 * open, 0, 0, Math.PI * 2);
    ctx.ellipse(16, -110, 3, 4 * open, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#1a1a22";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(-12, -80);
    ctx.lineTo(12, -80);
    ctx.stroke();
    ctx.font = `80px ${AR.FONT}`;
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(26,26,34,0.85)";
    ctx.fillText("♠", 0, -20);

    // 長槍 / 鞭
    ctx.save();
    ctx.scale(e.facing, 1);
    const whip = e.spearMode === "whip";
    ctx.strokeStyle = whip ? "#5a1020" : "#f3ead3";
    ctx.lineWidth = whip ? 6 : 5;
    ctx.beginPath();
    ctx.moveTo(50, -100);
    if (whip) {
      ctx.bezierCurveTo(90, -80, 140, -40, 180, -30 + Math.sin(time * 8) * 10);
      ctx.stroke();
    } else {
      ctx.lineTo(160, -40);
      ctx.stroke();
      ctx.fillStyle = "#1a1a22";
      ctx.beginPath();
      ctx.moveTo(160, -50);
      ctx.lineTo(200, -36);
      ctx.lineTo(160, -22);
      ctx.fill();
    }
    ctx.restore();

    // 蓄力金圈
    if (e.state === "goldCharge") {
      const t = 1 - e.stateT / 0.85;
      ctx.strokeStyle = `rgba(232,212,138,${0.6 + 0.4 * Math.sin(time * 16)})`;
      ctx.lineWidth = 5;
      ctx.beginPath();
      ctx.arc(0, -90, 70, 0, Math.PI * 2 * AR.clamp(t, 0, 1));
      ctx.stroke();
      ctx.font = `16px ${AR.FONT}`;
      ctx.fillStyle = "#e8d48a";
      ctx.textAlign = "center";
      ctx.fillText("蓄力 · 用對子打斷", 0, -180);
    }
    ctx.restore();
  };

  AR.drawMiniHp = function (ctx, cam, e, col) {
    if (e.dead || e.hp >= e.maxHp) return;
    const x = cam.wx(e.x + e.w / 2);
    const y = cam.wy(e.y) - 10;
    const w = 40;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(x - w / 2, y, w, 5);
    ctx.fillStyle = col || "#c41e3a";
    ctx.fillRect(x - w / 2, y, w * AR.clamp(e.hp / e.maxHp, 0, 1), 5);
  };
})(window);
