/* 《王牌裂隙》觸控與行動版介面 */
(function (global) {
  const AR = global.AR;
  const ui = (AR.TouchUI = {
    visible: false,
    forced: /(?:\?|&)touch=1(?:&|$)/.test(location.search),
    _handSig: "",
    _copySig: "",
    _bound: false,
  });

  const $ = (id) => document.getElementById(id);
  const game = () => global.AceRiftGame;

  function isPortrait() {
    return window.innerHeight >= window.innerWidth;
  }

  function wantTouch() {
    if (ui.forced) return true;
    if (AR.Input && AR.Input.touchUsed) return true;
    // 不用單獨的 (hover: none)：無頭瀏覽器也會是 none，會誤開觸控介面。
    const coarse = window.matchMedia("(pointer: coarse)").matches;
    const narrow = window.innerWidth <= 900;
    if (coarse || narrow) return true;
    return false;
  }

  const virtHold = Object.create(null);
  function setVirt(source, codes, on) {
    const I = AR.Input;
    for (const code of codes) {
      virtHold[code] = virtHold[code] || new Set();
      const refs = virtHold[code];
      if (on) {
        const first = refs.size === 0;
        refs.add(source);
        if (first) I.pressVirt(code);
      } else {
        refs.delete(source);
        if (refs.size === 0) I.releaseVirt(code);
      }
    }
  }

  function setKnob(dx, dy, active) {
    const knob = $("stick-knob");
    const pad = $("touch-move");
    if (!knob) return;
    if (!active) {
      knob.style.transform = "translate(-50%, -50%)";
      if (pad) pad.classList.remove("is-left", "is-right", "is-up", "is-down");
      return;
    }
    const len = Math.hypot(dx, dy);
    let x = dx, y = dy;
    if (len > 1) {
      x /= len;
      y /= len;
    }
    const r = (pad ? pad.clientWidth : 120) * 0.28;
    knob.style.transform = "translate(calc(-50% + " + (x * r) + "px), calc(-50% + " + (y * r) + "px))";
  }

  function setMove(left, right, up, down) {
    setVirt("pad-left", ["ArrowLeft", "KeyA"], !!left);
    setVirt("pad-right", ["ArrowRight", "KeyD"], !!right);
    // 上：同時按下 ArrowUp / KeyW / Space，以保留可變跳躍高度
    setVirt("pad-up", ["ArrowUp", "KeyW", "Space"], !!up);
    setVirt("pad-down", ["ArrowDown", "KeyS", "KeyE"], !!down);
    const map = { "btn-left": left, "btn-right": right, "btn-up": up, "btn-down": down };
    for (const id in map) {
      const el = $(id);
      if (el) el.classList.toggle("is-down", !!map[id]);
    }
    const pad = $("touch-move");
    if (pad) {
      pad.classList.toggle("is-left", !!left);
      pad.classList.toggle("is-right", !!right);
      pad.classList.toggle("is-up", !!up);
      pad.classList.toggle("is-down", !!down);
    }
  }

  function bindHold(el, codes) {
    if (!el || el.dataset.boundHold) return;
    el.dataset.boundHold = "1";
    const src = "hold-" + (el.id || Math.random().toString(36).slice(2));
    const held = new Set();
    const down = (e) => {
      if (e.button != null && e.button !== 0 && e.pointerType === "mouse") return;
      e.preventDefault();
      e.stopPropagation();
      try { el.setPointerCapture(e.pointerId); } catch (err) {}
      held.add(e.pointerId);
      setVirt(src, codes, true);
      el.classList.add("is-down");
      AR.Audio.resume();
      if (e.pointerType === "touch" || e.pointerType === "pen") AR.Input.touchUsed = true;
    };
    const up = (e) => {
      held.delete(e.pointerId);
      if (held.size) return;
      setVirt(src, codes, false);
      el.classList.remove("is-down");
    };
    el.addEventListener("pointerdown", down);
    el.addEventListener("pointerup", up);
    el.addEventListener("pointercancel", up);
    el.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  function bindTap(el, fn) {
    if (!el) return;
    el.addEventListener("pointerdown", (e) => {
      if (e.button != null && e.button !== 0 && e.pointerType === "mouse") return;
      e.preventDefault();
      e.stopPropagation();
      AR.Audio.resume();
      if (e.pointerType === "touch" || e.pointerType === "pen") AR.Input.touchUsed = true;
      el.classList.add("is-down");
      fn(e);
    });
    const clear = () => el.classList.remove("is-down");
    el.addEventListener("pointerup", clear);
    el.addEventListener("pointercancel", clear);
    el.addEventListener("click", (e) => e.preventDefault());
    el.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  function bindMovePad() {
    const pad = $("touch-move");
    if (!pad) return;
    const pointers = new Set();
    const apply = (e) => {
      const r = pad.getBoundingClientRect();
      const dx = (e.clientX - (r.left + r.width / 2)) / Math.max(1, r.width / 2);
      const dy = (e.clientY - (r.top + r.height / 2)) / Math.max(1, r.height / 2);
      const dead = 0.22;
      const left = dx < -dead;
      const right = dx > dead;
      const up = dy < -dead;
      const down = dy > dead;
      setMove(left, right, up, down);
      setKnob(dx, dy, true);
    };
    pad.addEventListener("pointerdown", (e) => {
      if (e.button != null && e.button !== 0 && e.pointerType === "mouse") return;
      e.preventDefault();
      e.stopPropagation();
      try { pad.setPointerCapture(e.pointerId); } catch (err) {}
      pointers.add(e.pointerId);
      AR.Audio.resume();
      if (e.pointerType === "touch" || e.pointerType === "pen") AR.Input.touchUsed = true;
      apply(e);
    });
    pad.addEventListener("pointermove", (e) => {
      if (pointers.has(e.pointerId)) apply(e);
    });
    const end = (e) => {
      pointers.delete(e.pointerId);
      if (!pointers.size) {
        setMove(false, false, false, false);
        setKnob(0, 0, false);
      }
    };
    pad.addEventListener("pointerup", end);
    pad.addEventListener("pointercancel", end);
    pad.addEventListener("contextmenu", (e) => e.preventDefault());
  }

  function openHowto(fromPause) {
    const G = game();
    if (!G) return;
    AR.Audio.resume();
    AR.Audio.play("ui");
    G.flags._fromPause = !!fromPause;
    G.mode = "howto";
    G.howToPage = 0;
  }

  function bindMenus() {
    bindTap($("m-start"), () => {
      const G = game();
      if (!G || G.mode !== "title") return;
      AR.Audio.resume();
      AR.Audio.play("ok");
      G.mode = "intro";
      G.introPage = 0;
      G.introChar = 0;
    });
    bindTap($("m-howto"), () => {
      const G = game();
      openHowto(G && G.mode === "pause");
    });
    bindTap($("m-resume"), () => {
      const G = game();
      if (!G) return;
      G.mode = "play";
      AR.Audio.play("ui");
    });
    bindTap($("m-continue"), () => AR.Input.pulseVirt("Enter"));
    bindTap($("m-skip"), () => {
      const G = game();
      if (G && G.mode === "intro") G.startPlay();
    });
    bindTap($("m-prev"), () => {
      const G = game();
      if (!G || G.mode !== "howto") return;
      G.howToPage = Math.max(0, G.howToPage - 1);
      AR.Audio.play("ui");
    });
    bindTap($("m-next"), () => AR.Input.pulseVirt("Enter"));
    bindTap($("m-back"), () => {
      const G = game();
      if (!G) return;
      G.mode = G.flags._fromPause ? "pause" : "title";
      G.flags._fromPause = false;
      AR.Audio.play("ui");
    });
    bindTap($("m-retry"), () => {
      const G = game();
      if (!G) return;
      AR.Audio.play("ok");
      G.retryCheckpoint();
    });
    bindTap($("m-again"), () => {
      const G = game();
      if (!G) return;
      G.stats.deaths = 0;
      G.resetWorld(true);
      G.startPlay();
      AR.Audio.play("ok");
    });
    bindTap($("m-title"), () => {
      const G = game();
      if (!G) return;
      const fromVictory = G.mode === "victory";
      G.mode = "title";
      if (fromVictory) G.resetWorld(true);
      AR.Audio.play("ui");
    });

    bindTap($("btn-pause"), () => {
      const G = game();
      if (!G) return;
      if (G.mode === "play") {
        G.mode = "pause";
        AR.Audio.play("ui");
      } else if (G.mode === "pause") {
        G.mode = "play";
        AR.Audio.play("ui");
      }
    });
    bindTap($("btn-mute"), () => {
      AR.Audio.resume();
      AR.Audio.toggle();
    });
    bindTap($("btn-help"), () => {
      const G = game();
      if (!G) return;
      if (G.mode === "play" || G.mode === "pause") openHowto(true);
      else if (G.mode === "title") openHowto(false);
      else if (G.mode === "howto") {
        G.mode = G.flags._fromPause ? "pause" : "title";
        G.flags._fromPause = false;
        AR.Audio.play("ui");
      }
    });
    bindTap($("btn-retry"), () => {
      const G = game();
      if (!G) return;
      if (G.mode === "dead") {
        AR.Audio.play("ok");
        G.retryCheckpoint();
      } else if (G.mode === "victory") {
        G.stats.deaths = 0;
        G.resetWorld(true);
        G.startPlay();
        AR.Audio.play("ok");
      }
    });

    bindTap($("btn-play"), () => {
      const G = game();
      if (G && G.mode === "play" && !G.dialogue) G.tryPlay();
    });
    bindTap($("btn-wild"), () => {
      const G = game();
      if (!G || G.mode !== "play") return;
      if (!G.deck.toggleWild()) G.toast("百搭次數已用盡");
    });
    bindTap($("btn-joker"), () => {
      const G = game();
      if (G && G.mode === "play") G.tryJoker();
    });
    bindTap($("btn-interact"), () => {
      const G = game();
      if (G && G.mode === "play") G.tryInteract();
    });
    bindTap($("btn-shuffle"), () => {
      const G = game();
      if (G && G.mode === "play") G.tryShuffle();
    });
    bindHold($("btn-jump"), ["Space", "KeyW", "ArrowUp"]);
  }

  function renderHand(G) {
    const root = $("touch-hand");
    if (!root || !G || !G.deck) return;
    const hand = G.deck.hand || [];
    const sig = hand.map((c) => c.id + ":" + (c.selected ? 1 : 0) + ":" + c.suit + c.rank).join("|");
    if (sig === ui._handSig) return;
    ui._handSig = sig;
    root.innerHTML = "";
    hand.forEach((card, i) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "hcard" + (card.suit === "heart" || card.suit === "diamond" ? " red" : "") + (card.selected ? " selected" : "");
      btn.setAttribute("aria-label", (AR.SUIT_NAME[card.suit] || "") + AR.rankLabel(card.rank));
      const glyph = AR.SUIT_GLYPH[card.suit] || "";
      btn.innerHTML =
        '<span class="hcard-rank">' + AR.rankLabel(card.rank) + "</span>" +
        '<span class="hcard-suit">' + glyph + "</span>" +
        '<span class="hcard-pip">' + glyph + "</span>" +
        '<span class="hcard-idx">' + (i + 1) + "</span>";
      bindTap(btn, () => {
        const g = game();
        if (g && g.mode === "play") g.deck.toggle(i);
      });
      root.appendChild(btn);
    });
  }

  function setMenuButtons(mode, page, howToLast) {
    const on = {
      "m-start": mode === "title",
      "m-howto": mode === "title" || mode === "pause",
      "m-resume": mode === "pause",
      "m-continue": mode === "intro",
      "m-skip": mode === "intro",
      "m-prev": mode === "howto" && page > 0,
      "m-next": mode === "howto",
      "m-back": mode === "howto",
      "m-retry": mode === "dead",
      "m-again": mode === "victory",
      "m-title": mode === "pause" || mode === "victory",
    };
    const next = $("m-next");
    if (next) next.textContent = howToLast ? "完成" : "下一頁";
    const cont = $("m-continue");
    if (cont) cont.textContent = "繼續";
    Object.keys(on).forEach((id) => {
      const el = $(id);
      if (el) el.classList.toggle("is-on", !!on[id]);
    });
  }

  function syncMessages(G) {
    const box = $("touch-msg");
    if (!box) return;
    let text = "";
    if (G.tutorial) text = G.tutorial.msg;
    else if (G.dialogue) text = G.dialogue.name + "　" + G.dialogue.msg;
    else if (G.toasts && G.toasts.length) text = G.toasts.map((t) => t.msg).join("\n");
    else if (G.flavor) text = G.flavor.msg;
    if (text) {
      box.hidden = false;
      if (box.textContent !== text) box.textContent = text;
    } else {
      box.hidden = true;
      box.textContent = "";
    }
  }

  function syncBars(G) {
    const p = G.player;
    if (p) {
      const fill = $("hp-fill");
      const txt = $("hp-text");
      const ratio = AR.clamp(p.hp / p.maxHp, 0, 1);
      if (fill) fill.style.transform = "scaleX(" + ratio + ")";
      if (txt) txt.textContent = Math.max(0, p.hp | 0) + " / " + p.maxHp;
    }
    const d = G.deck;
    if (d) {
      const pf = $("power-fill");
      const pl = $("power-label");
      const bar = pf && pf.parentElement;
      if (d.jokerTime > 0) {
        if (pf) pf.style.transform = "scaleX(" + AR.clamp(d.jokerTime / 10, 0, 1) + ")";
        if (pl) pl.textContent = "JOKER TIME  " + d.jokerTime.toFixed(1) + "s";
        if (bar) bar.classList.add("is-joker");
      } else {
        if (pf) pf.style.transform = "scaleX(" + AR.clamp(d.power / d.powerMax, 0, 1) + ")";
        if (pl) pl.textContent = d.power >= d.powerMax ? "牌力值已滿　點 Joker 發動" : "牌力值";
        if (bar) bar.classList.remove("is-joker");
      }
      const wc = $("wild-count");
      if (wc) wc.textContent = d.wildUses + "/" + d.wildMax;
      const wildBtn = $("btn-wild");
      if (wildBtn) {
        wildBtn.classList.toggle("is-armed", !!d.wildArmed);
        wildBtn.classList.toggle("is-off", d.wildUses <= 0 && !d.jokerTime);
      }
      const jk = $("btn-joker");
      if (jk) {
        jk.classList.toggle("is-ready", d.power >= d.powerMax && d.jokerTime <= 0);
        jk.classList.toggle("is-armed", d.jokerTime > 0);
      }
      const prev = $("touch-preview");
      if (prev) {
        const ev = d.preview && d.preview();
        prev.textContent = ev ? (AR.handTitle(ev) + (d.wildArmed ? " + 百搭" : "")) : "";
      }
    }
    const mute = $("btn-mute");
    if (mute) mute.textContent = AR.Audio.muted ? "已靜音" : "靜音";

    const ch = G.level && G.level.chest;
    const near = !!(ch && !ch.open && G.player && AR.dist(G.player.x, G.player.y, ch.x, ch.y) < 110);
    const ib = $("btn-interact");
    if (ib) ib.classList.toggle("is-near", near);
  }

  function isTight() {
    // 僅直向使用 HTML 標題／說明文案，避免橫向與畫布文字重疊
    return isPortrait();
  }

  function syncCopy(G) {
    const brand = $("touch-brand");
    const copy = $("touch-copy");
    if (!brand || !copy) return;
    const mode = G.mode;
    const tight = isTight();
    brand.hidden = !(tight && mode === "title");
    if (!tight) {
      copy.hidden = true;
      ui._copySig = "";
      return;
    }
    let html = "";
    if (mode === "intro" && AR.INTRO) {
      const text = AR.INTRO[G.introPage] || "";
      const shown = text.slice(0, G.introChar | 0);
      html = "<p>" + escapeHtml(shown).replace(/\n/g, "<br>") + "</p>" +
        '<div class="copy-foot">' + (G.introPage + 1) + " / " + AR.INTRO.length + "</div>";
    } else if (mode === "howto" && AR.HOWTO) {
      const page = AR.HOWTO[G.howToPage] || AR.HOWTO[0];
      html = "<h2>操作說明　" + escapeHtml(page.title) + "</h2><p>" +
        escapeHtml(page.body).replace(/\n/g, "<br>") + "</p>" +
        '<div class="copy-foot">' + (G.howToPage + 1) + " / " + AR.HOWTO.length + "</div>";
    } else if (mode === "dead") {
      html = "「收回牌堆。」<div class='copy-foot'>從最近的檢查點重新開始</div>";
    } else if (mode === "pause") {
      html = "<h2>暫停</h2><p>遊戲已暫停。可繼續、查看說明，或返回標題。</p>";
    }
    if (html) {
      copy.hidden = false;
      copy.classList.add("scrollable");
      if (ui._copySig !== mode + html) {
        copy.innerHTML = html;
        ui._copySig = mode + html;
      }
    } else {
      copy.hidden = true;
      ui._copySig = "";
    }
  }

  function escapeHtml(s) {
    return String(s)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  const MODE_CLASS = ["mode-title", "mode-intro", "mode-howto", "mode-pause", "mode-dead", "mode-victory", "mode-play", "menu-open", "chrome-play"];

  ui.sync = function (G) {
    const visible = wantTouch();
    ui.visible = visible;
    if (AR.Input) AR.Input.showTouch = visible;
    const portrait = isPortrait();
    document.body.classList.toggle("touch-on", visible);
    document.body.classList.toggle("portrait", visible && portrait);
    document.body.classList.toggle("landscape", visible && !portrait);
    MODE_CLASS.forEach((c) => { if (!visible) document.body.classList.remove(c); });

    const root = $("touch-ui");
    if (root) root.hidden = !visible;
    if (!visible || !G) return;

    const mode = G.mode || "title";
    const menuOpen = mode !== "play";
    MODE_CLASS.forEach((c) => document.body.classList.remove(c));
    document.body.classList.add("mode-" + mode);
    document.body.classList.toggle("menu-open", menuOpen);
    document.body.classList.toggle("chrome-play", mode === "play");

    const howToLen = (AR.HOWTO && AR.HOWTO.length) || AR.HOWTO_LEN || 6;
    setMenuButtons(mode, G.howToPage || 0, (G.howToPage || 0) >= howToLen - 1);
    syncCopy(G);
    if (mode === "play") {
      renderHand(G);
      syncBars(G);
      syncMessages(G);
    } else {
      ui._handSig = "";
      const msg = $("touch-msg");
      if (msg) { msg.hidden = true; msg.textContent = ""; }
    }
  };

  ui.bind = function () {
    if (ui._bound) return;
    ui._bound = true;
    bindMovePad();
    bindMenus();

    const preventScroll = (e) => {
      if (e.target.closest && e.target.closest(".scrollable")) return;
      if (e.cancelable) e.preventDefault();
    };
    document.addEventListener("touchmove", preventScroll, { passive: false });
    document.addEventListener("gesturestart", (e) => e.preventDefault());
    document.addEventListener("gesturechange", (e) => e.preventDefault());

    const first = () => {
      const c = $("game");
      if (c) c.focus({ preventScroll: true });
      AR.Audio.resume();
    };
    document.addEventListener("pointerdown", first, { capture: true });

    window.addEventListener("resize", () => ui.sync(game()));
    window.addEventListener("orientationchange", () => setTimeout(() => ui.sync(game()), 80));
  };

  ui.force = function (on) {
    ui.forced = !!on;
    ui.sync(game());
  };

  function boot() {
    ui.bind();
    ui.sync(game());
  }
  window.addEventListener("load", boot);
  if (document.readyState === "complete" || document.readyState === "interactive") {
    setTimeout(boot, 0);
  }
})(window);
