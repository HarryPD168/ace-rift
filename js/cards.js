/* 卡牌、牌型判定、牌堆與手牌繪製 */
(function (global) {
  const AR = (global.AR = global.AR || {});

  let _cid = 1;
  AR.makeCard = function (suit, rank, opts) {
    return {
      id: "c" + _cid++,
      suit,
      rank,
      selected: false,
      dealT: 1,
      hover: 0,
      shake: 0,
      glow: 0,
      fromPickup: !!(opts && opts.fromPickup),
    };
  };
  AR.cardName = (c) => AR.SUIT_GLYPH[c.suit] + AR.rankLabel(c.rank);
  AR.cardFullName = (c) => AR.SUIT_NAME[c.suit] + AR.rankLabel(c.rank);

  AR.HAND_INFO = {
    single: { name: "單張", en: "Single", pri: 1, power: 6, desc: "基礎斬擊" },
    pair: { name: "對子", en: "Pair", pri: 2, power: 12, desc: "雙重突刺，可穿透並眩暈" },
    three: { name: "三條", en: "Three of a Kind", pri: 3, power: 16, desc: "扇形散射彈幕" },
    straight: { name: "順子", en: "Straight", pri: 4, power: 18, desc: "身前多段連斬" },
    flush: { name: "同花", en: "Flush", pri: 5, power: 20, desc: "花色屬性爆發" },
    fullhouse: { name: "葫蘆", en: "Full House", pri: 6, power: 28, desc: "重力砸擊" },
    four: { name: "鐵支", en: "Four of a Kind", pri: 7, power: 35, desc: "四方衝擊波" },
    straightflush: { name: "同花順", en: "Straight Flush", pri: 8, power: 50, desc: "終極奧義" },
  };

  function ranksOf(cards) {
    return cards.map((c) => c.rank).sort((a, b) => a - b);
  }

  function isConsecutive(sortedUnique) {
    if (sortedUnique.length < 3) return false;
    // A as 1
    let ok = true;
    for (let i = 1; i < sortedUnique.length; i++) {
      if (sortedUnique[i] !== sortedUnique[i - 1] + 1) ok = false;
    }
    if (ok) return true;
    // A as 14 (high)
    const mapped = sortedUnique.map((r) => (r === 1 ? 14 : r)).sort((a, b) => a - b);
    ok = true;
    for (let i = 1; i < mapped.length; i++) {
      if (mapped[i] !== mapped[i - 1] + 1) ok = false;
    }
    return ok;
  }

  function uniqueRanks(cards) {
    const s = new Set(cards.map((c) => c.rank));
    return [...s].sort((a, b) => a - b);
  }

  function countRanks(cards) {
    const m = Object.create(null);
    for (const c of cards) m[c.rank] = (m[c.rank] || 0) + 1;
    return m;
  }

  function allSameSuit(cards) {
    if (!cards.length) return false;
    const s = cards[0].suit;
    return cards.every((c) => c.suit === s);
  }

  AR.evaluateConcrete = function (cards) {
    const n = cards.length;
    if (n === 0) return null;
    if (n === 1) return { type: "single", cards, suit: cards[0].suit, rank: cards[0].rank };

    const counts = countRanks(cards);
    const countVals = Object.values(counts).sort((a, b) => b - a);
    const uniq = uniqueRanks(cards);
    const flush = n >= 3 && allSameSuit(cards);
    const straight = uniq.length === n && isConsecutive(uniq);

    if (n >= 3 && flush && straight) return { type: "straightflush", cards, suit: cards[0].suit };
    if (n === 4 && countVals[0] === 4) return { type: "four", cards, rank: +Object.keys(counts)[0] };
    if (n === 5 && countVals[0] === 4) return { type: "four", cards, rank: +Object.entries(counts).find((e) => e[1] === 4)[0] };
    if (n === 5 && countVals[0] === 3 && countVals[1] === 2) return { type: "fullhouse", cards };
    if (flush) return { type: "flush", cards, suit: cards[0].suit };
    if (straight) return { type: "straight", cards };
    if (n === 3 && countVals[0] === 3) return { type: "three", cards, rank: +Object.keys(counts)[0] };
    if (n === 4 && countVals[0] === 3) return { type: "three", cards, rank: +Object.entries(counts).find((e) => e[1] === 3)[0] };
    if (n === 2 && countVals[0] === 2) return { type: "pair", cards, rank: +Object.keys(counts)[0] };
    if (n === 3 && countVals[0] === 2) return { type: "pair", cards, rank: +Object.entries(counts).find((e) => e[1] === 2)[0] };
    return null;
  };

  /**
   * 評估選牌，可附加一張百搭（任意花色/點數）。
   * 百搭會被指定為能組成最高牌型的花色與點數。
   */
  AR.evaluateHand = function (cards, useWild) {
    if (!useWild) return AR.evaluateConcrete(cards);
    const suits = AR.SUITS;
    const ranks = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13];
    let best = null;
    for (const suit of suits) {
      for (const rank of ranks) {
        const wild = { id: "wild", suit, rank, isWild: true };
        const ev = AR.evaluateConcrete(cards.concat(wild));
        if (!ev) continue;
        const pri = AR.HAND_INFO[ev.type].pri;
        if (!best || pri > best._pri) {
          ev.wildAssigned = { suit, rank };
          ev.usedWild = true;
          ev._pri = pri;
          best = ev;
        }
      }
    }
    // 若只有百搭、沒選牌：當作單張（預設黑桃 A 不算，當作鬼牌斬擊）
    if (!best && cards.length === 0) {
      best = { type: "single", cards: [{ suit: "spade", rank: 1, isWild: true }], usedWild: true, _pri: 1 };
    }
    return best;
  };

  AR.handTitle = function (ev) {
    if (!ev) return "";
    const info = AR.HAND_INFO[ev.type];
    if (ev.type === "flush" || ev.type === "straightflush") {
      return info.name + "·" + AR.SUIT_NAME[ev.suit];
    }
    return info.name;
  };

  AR.singleDamage = function (card) {
    if (!card) return 16;
    if (card.rank === 1) return 36; // A
    if (card.rank >= 11) return 22;
    return 16;
  };

  AR.handDamage = function (ev, jokerTime) {
    if (!ev) return 0;
    const mul = jokerTime ? 2 : 1;
    switch (ev.type) {
      case "single":
        return AR.singleDamage(ev.cards[0]) * mul;
      case "pair":
        return 14 * mul; // per hit, two hits
      case "three":
        return 18 * mul; // per projectile
      case "straight":
        return 22 * mul;
      case "flush":
        return 14 * mul; // per arrow / tick
      case "fullhouse":
        return 55 * mul;
      case "four":
        return 80 * mul;
      case "straightflush":
        return 140 * mul;
      default:
        return 12 * mul;
    }
  };

  /* ---------- 牌堆 / 手牌 ---------- */
  AR.DeckSys = {
    hand: [],
    drawPile: [],
    discard: [],
    collection: [], // 永久收藏
    pendingDraws: [], // 腳本化抽牌佇列
    wildUses: 3,
    wildMax: 3,
    wildArmed: false,
    power: 0,
    powerMax: 100,
    jokerTime: 0,
    drawAnim: [],
    locked: false,

    resetLevel() {
      this.hand = [
        AR.makeCard("spade", 3),
        AR.makeCard("spade", 5),
        AR.makeCard("spade", 7),
        AR.makeCard("diamond", 2),
        AR.makeCard("heart", 4),
      ];
      this.drawPile = [];
      this.discard = [];
      this.collection = this.hand.map((c) => ({ suit: c.suit, rank: c.rank }));
      this.pendingDraws = [];
      this.wildUses = 3;
      this.wildArmed = false;
      this.power = 0;
      this.jokerTime = 0;
      this.drawAnim = [];
      this.locked = false;
    },

    resetWildForCombat() {
      this.wildUses = this.wildMax;
      this.wildArmed = false;
    },

    queueDraw(suit, rank, front) {
      const item = { suit, rank };
      if (front) this.pendingDraws.unshift(item);
      else this.pendingDraws.push(item);
    },

    addToCollection(suit, rank) {
      this.collection.push({ suit, rank });
    },

    countInHand(pred) {
      return this.hand.filter(pred).length;
    },

    hasRank(rank, n) {
      return this.hand.filter((c) => c.rank === rank).length >= (n || 1);
    },

    spadeCount() {
      return this.hand.filter((c) => c.suit === "spade").length;
    },

    selected() {
      return this.hand.filter((c) => c.selected);
    },

    clearSelect() {
      this.hand.forEach((c) => (c.selected = false));
    },

    toggle(i) {
      if (i < 0 || i >= this.hand.length) return;
      this.hand[i].selected = !this.hand[i].selected;
      AR.Audio.play("ui");
    },

    toggleWild() {
      if (this.jokerTime > 0) {
        this.wildArmed = !this.wildArmed;
        AR.Audio.play("ui");
        return true;
      }
      if (this.wildUses <= 0 && !this.wildArmed) {
        AR.Audio.play("error");
        return false;
      }
      this.wildArmed = !this.wildArmed;
      AR.Audio.play("ui");
      return true;
    },

    preview() {
      const sel = this.selected();
      const useWild = this.wildArmed && (this.wildUses > 0 || this.jokerTime > 0);
      if (sel.length === 0 && !useWild) return null;
      if (sel.length === 0 && useWild) return AR.evaluateHand([], true);
      return AR.evaluateHand(sel, useWild);
    },

    consumePlayed(cards, usedWild) {
      const free = this.jokerTime > 0;
      if (free) return;
      const ids = new Set(cards.filter((c) => !c.isWild).map((c) => c.id));
      const kept = [];
      for (const c of this.hand) {
        if (ids.has(c.id)) this.discard.push(c);
        else kept.push(c);
      }
      this.hand = kept;
      if (usedWild) this.wildUses = Math.max(0, this.wildUses - 1);
      this.wildArmed = false;
    },

    addPower(type) {
      if (this.jokerTime > 0) return;
      const info = AR.HAND_INFO[type];
      this.power = Math.min(this.powerMax, this.power + (info ? info.power : 6));
    },

    tryJokerTime() {
      if (this.power >= this.powerMax && this.jokerTime <= 0) {
        this.jokerTime = 10;
        this.power = 0;
        AR.Audio.play("joker");
        return true;
      }
      return false;
    },

    triggerJokerTime() {
      this.jokerTime = 10;
      this.power = 0;
      AR.Audio.play("joker");
    },

    update(dt) {
      if (this.jokerTime > 0) this.jokerTime = Math.max(0, this.jokerTime - dt);
      for (const c of this.hand) {
        if (c.dealT > 0) c.dealT = Math.max(0, c.dealT - dt * 2.4);
        if (c.shake > 0) c.shake = Math.max(0, c.shake - dt * 6);
        c.glow = AR.lerp(c.glow, c.selected ? 1 : 0, 1 - Math.pow(0.001, dt));
      }
    },

    canDraw() {
      return this.hand.length < 5 && (this.pendingDraws.length > 0 || this.drawPile.length > 0 || true);
    },

    /* 智慧抽牌：優先腳本佇列，再依關卡需求補牌，避免卡關 */
    drawOne(needHint, maxHand) {
      const cap = maxHand || 5;
      if (this.hand.length >= cap) return null;
      let card = null;
      if (this.pendingDraws.length) {
        const n = this.pendingDraws.shift();
        card = AR.makeCard(n.suit, n.rank);
      } else if (needHint) {
        card = this._smartCard(needHint);
      } else if (this.drawPile.length) {
        card = this.drawPile.shift();
      } else {
        card = this._smartCard(needHint || "mixed");
      }
      card.dealT = 1;
      this.hand.push(card);
      AR.Audio.play("deal");
      return card;
    },

    _smartCard(hint) {
      const h = hint || "mixed";
      if (h === "pair3" || h === "pair") {
        const ranks = this.hand.map((c) => c.rank);
        for (const r of ranks) {
          if (this.hand.filter((c) => c.rank === r).length === 1) {
            return AR.makeCard("spade", r);
          }
        }
        return AR.makeCard("spade", 3);
      }
      if (h === "straight") {
        const need = this._neededForStraight();
        if (need) return AR.makeCard("spade", need);
        return AR.makeCard("spade", 6);
      }
      if (h === "spade" || h === "flush") {
        if (this.spadeCount() < 3) {
          const have = new Set(this.hand.filter((c) => c.suit === "spade").map((c) => c.rank));
          for (const r of [5, 7, 9, 6, 8, 4, 10, 3, 11, 1]) {
            if (!have.has(r)) return AR.makeCard("spade", r);
          }
        }
        return AR.makeCard("spade", AR.irand(2, 10));
      }
      if (h === "ace") return AR.makeCard("spade", 1);
      // mixed: keep some variety but bias to useful combos
      if (Math.random() < 0.55) {
        const r = this.hand.length ? AR.pick(this.hand).rank : AR.irand(2, 10);
        const s = Math.random() < 0.65 ? "spade" : AR.pick(AR.SUITS);
        // avoid identical copy if already a pair of that rank
        if (this.hand.filter((c) => c.rank === r).length < 2) return AR.makeCard(s, r);
      }
      const pool = [
        ["spade", 3], ["spade", 5], ["spade", 6], ["spade", 7], ["spade", 8], ["spade", 9],
        ["spade", 4], ["heart", 4], ["diamond", 2], ["heart", 6], ["club", 5], ["spade", 10],
        ["spade", 11], ["diamond", 7], ["heart", 3],
      ];
      const p = AR.pick(pool);
      return AR.makeCard(p[0], p[1]);
    },

    _neededForStraight() {
      const ranks = [...new Set(this.hand.map((c) => c.rank))].sort((a, b) => a - b);
      // prefer completing 5-6-7 teaching set
      const has = (r) => ranks.includes(r);
      if (has(5) && has(7) && !has(6)) return 6;
      if (has(5) && has(6) && !has(7)) return 7;
      if (has(6) && has(7) && !has(5)) return 5;
      for (const r of ranks) {
        if (!has(r + 1) && r + 1 <= 13) return r + 1;
      }
      return null;
    },

    shuffleDeck() {
      if (this.locked) return false;
      while (this.hand.length) {
        const c = this.hand.pop();
        c.selected = false;
        this.drawPile.push(c);
      }
      while (this.discard.length) {
        const c = this.discard.pop();
        c.selected = false;
        this.drawPile.push(c);
      }
      for (let i = this.drawPile.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        const tmp = this.drawPile[i];
        this.drawPile[i] = this.drawPile[j];
        this.drawPile[j] = tmp;
      }
      this.clearSelect();
      // drawOne 會優先消耗 pendingDraws，腳本教學牌不會丟失
      while (this.hand.length < 5) {
        if (this.pendingDraws.length || this.drawPile.length) {
          if (!this.drawOne(null)) break;
        } else {
          const card = this._smartCard("mixed");
          card.dealT = 1;
          this.hand.push(card);
        }
      }
      AR.Audio.play("deal");
      AR.Audio.play("flip");
      return true;
    },

    giveCard(suit, rank, select) {
      if (this.hand.length >= 5) {
        // 暫存到抽牌佇列前端
        this.queueDraw(suit, rank, true);
        return null;
      }
      const c = AR.makeCard(suit, rank);
      c.dealT = 1;
      if (select) c.selected = true;
      this.hand.push(c);
      AR.Audio.play("deal");
      return c;
    },
  };

  /* ---------- 繪製單張牌（UI 或世界） ---------- */
  AR.drawCardFace = function (ctx, card, x, y, w, h, opts) {
    opts = opts || {};
    const ox = (card && card.shake ? Math.sin(card.shake * 30) * 3 : 0);
    x += ox;
    const selected = card && card.selected;
    const lift = opts.lift || 0;
    y -= lift;
    ctx.save();
    if (opts.rot) {
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(opts.rot);
      ctx.translate(-(x + w / 2), -(y + h / 2));
    }
    // shadow
    ctx.shadowColor = selected ? "rgba(220,180,80,0.65)" : "rgba(0,0,0,0.5)";
    ctx.shadowBlur = selected ? 18 : 8;
    ctx.shadowOffsetY = 4;
    AR.roundRect(ctx, x, y, w, h, 8);
    ctx.fillStyle = "#f7f1e3";
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.lineWidth = selected ? 3 : 1.5;
    ctx.strokeStyle = selected ? "#d4b06a" : "#2a2a32";
    ctx.stroke();

    if (!card) {
      ctx.restore();
      return;
    }

    const col = AR.SUIT_COLOR[card.suit];
    const g = AR.SUIT_GLYPH[card.suit];
    const label = AR.rankLabel(card.rank);
    ctx.fillStyle = col;
    ctx.textAlign = "left";
    ctx.textBaseline = "top";
    const fs = Math.max(12, w * 0.22);
    ctx.font = `bold ${fs}px ${AR.FONT}`;
    ctx.fillText(label, x + 6, y + 6);
    ctx.font = `${fs * 0.85}px ${AR.FONT}`;
    ctx.fillText(g, x + 6, y + 6 + fs);
    ctx.save();
    ctx.translate(x + w - 6, y + h - 6);
    ctx.rotate(Math.PI);
    ctx.font = `bold ${fs}px ${AR.FONT}`;
    ctx.fillText(label, 0, 0);
    ctx.font = `${fs * 0.85}px ${AR.FONT}`;
    ctx.fillText(g, 0, fs);
    ctx.restore();

    // center pip
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${w * 0.42}px ${AR.FONT}`;
    ctx.globalAlpha = 0.95;
    ctx.fillText(g, x + w / 2, y + h / 2 + 4);
    ctx.globalAlpha = 1;

    if (card.isWild || opts.wildMark) {
      ctx.fillStyle = "#6b2d8b";
      ctx.font = `bold ${fs * 0.7}px ${AR.FONT}`;
      ctx.fillText("百搭", x + w / 2, y + h - 16);
    }
    if (opts.disabled) {
      ctx.fillStyle = "rgba(0,0,0,0.35)";
      AR.roundRect(ctx, x, y, w, h, 8);
      ctx.fill();
    }
    ctx.restore();
  };

  AR.drawCardBack = function (ctx, x, y, w, h, rot) {
    ctx.save();
    if (rot) {
      ctx.translate(x + w / 2, y + h / 2);
      ctx.rotate(rot);
      ctx.translate(-(x + w / 2), -(y + h / 2));
    }
    ctx.shadowColor = "rgba(0,0,0,0.45)";
    ctx.shadowBlur = 8;
    AR.roundRect(ctx, x, y, w, h, 8);
    ctx.fillStyle = "#5a1020";
    ctx.fill();
    ctx.shadowColor = "transparent";
    ctx.strokeStyle = "#d4b06a";
    ctx.lineWidth = 2;
    ctx.stroke();
    AR.roundRect(ctx, x + 6, y + 6, w - 12, h - 12, 5);
    ctx.strokeStyle = "#e8d48a";
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = "#e8d48a";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = `${w * 0.4}px ${AR.FONT}`;
    ctx.fillText("♠", x + w / 2, y + h / 2 + 2);
    ctx.restore();
  };
})(window);
