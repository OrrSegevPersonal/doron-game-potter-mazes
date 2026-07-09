// UI layer: overlays, riddle modal, HUD, and the win fireworks.
// Game logic lives in game.js — UI only renders and reports interactions.
const UI = {
  init() {
    this.hud = document.getElementById("hud");
    this.dpad = document.getElementById("dpad");
    this.hudLevel = document.getElementById("hud-level");
    this.hudMagic = document.getElementById("hud-magic");
    this.hudTimer = document.getElementById("hud-timer");

    this.overlays = document.querySelectorAll(".overlay");
    this.optionButtons = [];
    this._fireworks = null;
  },

  // --- overlay + chrome visibility ---
  hideAllOverlays() {
    this.overlays.forEach((o) => o.classList.add("hidden"));
  },
  showOverlay(id) {
    this.hideAllOverlays();
    document.getElementById(id).classList.remove("hidden");
  },
  setPlaying(on) {
    this.hud.classList.toggle("hidden", !on);
    this.dpad.classList.toggle("hidden", !on);
  },

  // --- HUD ---
  setHud(level, magicEnabled, pieces) {
    this.hudLevel.textContent = "מבוך " + level;
    this.hudMagic.classList.toggle("hidden", !magicEnabled);
    this.hudMagic.textContent = "✨ " + pieces + "/" + CONFIG.MAGIC_TARGET;
  },
  setTimer(ms) {
    this.hudTimer.textContent = formatTime(ms);
  },

  // --- Character select ---
  characterSelect(bestMs, onPick) {
    this.setPlaying(false);
    this.showOverlay("screen-select");
    const best = document.getElementById("best-time");
    if (bestMs !== null) {
      best.textContent = "🏆 השיא שלך: " + formatTime(bestMs);
      best.classList.remove("hidden");
    } else {
      best.classList.add("hidden");
    }
    document.querySelectorAll(".char-card").forEach((card) => {
      card.onclick = () => onPick(card.getAttribute("data-char"));
    });
  },

  // --- Riddle modal ---
  // data: { gateIndex, question, options[], canSkip }
  // handlers: { onSelect(index, btn), onSkip() }
  renderRiddle(data, handlers) {
    this.setPlaying(false);
    this.showOverlay("screen-riddle");
    document.getElementById("gate-tag").textContent =
      "שער " + data.gateIndex + " מתוך " + CONFIG.GATES_PER_LEVEL +
      (data.gateIndex === CONFIG.GATES_PER_LEVEL ? " · שער היציאה" : "");
    document.getElementById("riddle-q").textContent = data.question;

    const box = document.getElementById("options");
    box.innerHTML = "";
    this.optionButtons = [];
    data.options.forEach((text, i) => {
      const btn = document.createElement("button");
      btn.className = "option-btn";
      btn.textContent = text;
      btn.onclick = () => handlers.onSelect(i, btn);
      box.appendChild(btn);
      this.optionButtons.push(btn);
    });

    const skip = document.getElementById("magic-skip");
    skip.classList.toggle("hidden", !data.canSkip);
    skip.onclick = data.canSkip ? handlers.onSkip : null;
  },

  setLives(n) {
    const el = document.getElementById("lives");
    let s = "";
    for (let i = 0; i < CONFIG.START_LIVES; i++) s += i < n ? "❤️" : "🤍";
    el.textContent = s;
  },
  markWrong(btn) {
    btn.classList.add("wrong");
    setTimeout(() => { btn.classList.remove("wrong"); btn.classList.add("gone"); }, 350);
  },
  markCorrect(btn) {
    btn.classList.add("correct");
  },
  disableOptions() {
    this.optionButtons.forEach((b) => (b.onclick = null));
  },

  // --- Death ---
  deathScreen(onRetry) {
    this.setPlaying(false);
    this.showOverlay("screen-dead");
    document.getElementById("retry-btn").onclick = onRetry;
  },

  // --- Level complete ---
  levelScreen(level, onNext) {
    this.setPlaying(false);
    this.showOverlay("screen-level");
    document.getElementById("level-title").textContent = "עברת את מבוך " + level + "!";
    document.getElementById("level-sub").textContent =
      "מתכוננת למבוך " + (level + 1) + "…";
    document.getElementById("next-btn").onclick = onNext;
  },

  // --- Win ---
  // handlers: { onSave(name), onPlayAgain }
  winScreen(ms, isRecord, handlers) {
    this.setPlaying(false);
    this.showOverlay("screen-win");
    document.getElementById("win-time").textContent = "⏱ " + formatTime(ms);
    document.getElementById("win-best").textContent = isRecord
      ? "🎉 שיא חדש!"
      : "השיא שלך: " + formatTime(Storage.getBest() || ms);

    const nameEntry = document.getElementById("name-entry");
    const input = document.getElementById("win-name");
    nameEntry.classList.remove("hidden");
    input.value = "";
    document.getElementById("save-score-btn").onclick = () => {
      this.stopFireworks();
      handlers.onSave(input.value);
    };
    document.getElementById("play-again-btn").onclick = () => {
      this.stopFireworks();
      handlers.onPlayAgain();
    };
    this.startFireworks();
  },

  // --- Leaderboard (Marauder's Map) ---
  // opts: { highlightIndex=-1, showAgain=false, onAgain, onClose }
  showBoard(opts) {
    const o = opts || {};
    this.setPlaying(false);
    this.showOverlay("screen-board");
    const scores = Storage.getScores();

    const list = document.getElementById("board-list");
    const empty = document.getElementById("board-empty");
    list.innerHTML = "";
    empty.classList.toggle("hidden", scores.length > 0);

    const medals = ["🥇", "🥈", "🥉"];
    scores.forEach((s, i) => {
      const li = document.createElement("li");
      li.className = "board-row" + (i === o.highlightIndex ? " me" : "");
      const rank = document.createElement("span");
      rank.className = "rank";
      rank.textContent = medals[i] || "👣";
      const nameBlock = document.createElement("span");
      nameBlock.className = "name";
      const name = document.createElement("span");
      name.className = "name-text";
      name.textContent = s.name;
      nameBlock.appendChild(name);
      const dateStr = formatDate(s.ts);
      if (dateStr) {
        const date = document.createElement("span");
        date.className = "date";
        date.textContent = dateStr;
        nameBlock.appendChild(date);
      }
      const dots = document.createElement("span");
      dots.className = "dots";
      const time = document.createElement("span");
      time.className = "time";
      time.textContent = formatTime(s.ms);
      li.append(rank, nameBlock, dots, time);
      list.appendChild(li);
    });

    const again = document.getElementById("board-again-btn");
    again.classList.toggle("hidden", !o.showAgain);
    again.onclick = o.onAgain || null;
    document.getElementById("board-close-btn").onclick = o.onClose || null;
  },

  // --- Fireworks particle animation ---
  startFireworks() {
    const canvas = document.getElementById("fireworks-canvas");
    const ctx = canvas.getContext("2d");
    const resize = () => {
      canvas.width = canvas.clientWidth;
      canvas.height = canvas.clientHeight;
    };
    resize();
    window.addEventListener("resize", resize);

    const particles = [];
    const colors = ["#f0c75e", "#7b5cff", "#3ecf8e", "#ff6b9d", "#5ec8ff"];
    let frame = 0;

    const burst = () => {
      const cx = Math.random() * canvas.width;
      const cy = Math.random() * canvas.height * 0.6 + canvas.height * 0.1;
      const color = colors[Math.floor(Math.random() * colors.length)];
      const n = 34;
      for (let i = 0; i < n; i++) {
        const a = (Math.PI * 2 * i) / n;
        const sp = 2 + Math.random() * 3;
        particles.push({ x: cx, y: cy, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, life: 1, color });
      }
    };

    const loop = () => {
      if (!this._fireworks) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (frame % 28 === 0) burst();
      frame++;
      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx; p.y += p.vy; p.vy += 0.045; p.life -= 0.012;
        if (p.life <= 0) { particles.splice(i, 1); continue; }
        ctx.globalAlpha = Math.max(0, p.life);
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      this._fireworks = requestAnimationFrame(loop);
    };
    this._fireworks = requestAnimationFrame(loop);
  },

  stopFireworks() {
    if (this._fireworks) {
      cancelAnimationFrame(this._fireworks);
      this._fireworks = null;
    }
  },
};
