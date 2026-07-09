// Game controller: state machine, canvas rendering, and wiring of all modules.
const Game = {
  state: "CHARACTER_SELECT",

  init() {
    this.canvas = document.getElementById("maze-canvas");
    this.ctx = this.canvas.getContext("2d");
    this.cell = 20;

    this.magic = new MagicManager();

    UI.init();
    Input.init((dir) => this.onMove(dir));

    window.addEventListener("resize", () => {
      if (this.state === "PLAYING") { this._resizeCanvas(); }
    });

    // Leaderboard button on the main screen (persists across menu shows)
    document.getElementById("open-board-btn").onclick = () => {
      UI.showBoard({ showAgain: false, onClose: () => this.showMenu() });
    };

    // How-to-play button on the main screen
    document.getElementById("how-to-btn").onclick = () => {
      UI.showHowTo(() => this.showMenu());
    };

    // Cumulative global player count (unique device = +1)
    this._loadPlayerCount();

    // Show the main menu
    this.showMenu();

    // Main render/update loop
    const loop = (now) => {
      this._tick(now);
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  },

  // ---------- player count ----------
  _loadPlayerCount() {
    const KEY = "hp_maze_counted";
    let counted = false;
    try { counted = !!localStorage.getItem(KEY); } catch (e) { /* ignore */ }
    // First visit on this device increments the global total; later visits read it.
    fetch("/api/players", { method: counted ? "GET" : "POST" })
      .then((r) => r.json())
      .then((d) => {
        if (!counted) { try { localStorage.setItem(KEY, "1"); } catch (e) { /* ignore */ } }
        UI.setPlayerCount(d && typeof d.count === "number" ? d.count : null);
      })
      .catch(() => UI.setPlayerCount(null));
  },

  // ---------- menu ----------
  showMenu() {
    this.state = "CHARACTER_SELECT";
    UI.characterSelect(Storage.getBest(), (char) => this.startRun(char));
  },

  // ---------- run / level lifecycle ----------
  startRun(character) {
    this.character = character;
    this.playerEmoji = (HOUSES[character] || HOUSES.gryffindor).emoji;
    RNG.seed(CONFIG.SEED);
    this.level = 1;
    this.startTime = performance.now();
    this.lastAnswerPositions = []; // persists across the whole run (not per-level)
    this.magicPieces = 0;          // persists across levels until spent on a skip
    this.startLevel();
  },

  startLevel() {
    const size = CONFIG.MAZE_SIZE[this.level - 1];
    this.maze = new Maze(size);
    this.player = new Player(this.maze);
    this.gates = buildGates(this.maze);
    this.magic.reset(this.level, this.magicPieces); // pieces carry over between levels
    this.usedRiddleIds = new Set();

    this.state = "PLAYING";
    UI.hideAllOverlays();
    UI.setPlaying(true);
    UI.setHud(this.level, this._magicActive(), this.magicPieces);
    this._resizeCanvas();
  },

  // Magic is a feature from maze 2 onward — controls whether the HUD chip shows.
  _magicActive() {
    return this.level >= CONFIG.MAGIC_FROM_LEVEL;
  },

  // ---------- per-frame tick ----------
  _tick(now) {
    if (this.state !== "PLAYING") return;
    UI.setTimer(now - this.startTime);
    this.magic.ensure(this.maze, this.player, this.gates, now);
    this.magic.tick(this.maze, this.player, this.gates, now);
    this._render();
  },

  // ---------- movement ----------
  onMove(dir) {
    if (this.state !== "PLAYING") return;
    if (!this.player.tryMove(dir)) return;

    // collect magic
    if (this.magic.tryCollect(this.player)) {
      this.magicPieces = Math.min(CONFIG.MAGIC_TARGET, this.magicPieces + 1);
      if (this.magicPieces >= CONFIG.MAGIC_TARGET) this.magic.stop();
      UI.setHud(this.level, this._magicActive(), this.magicPieces);
    }

    // reached a gate?
    const gate = gateAt(this.gates, this.player.x, this.player.y);
    if (gate) this._openRiddle(gate);
  },

  // ---------- riddle flow ----------
  _openRiddle(gate) {
    this.state = "RIDDLE";
    this.currentGate = gate;
    this.lives = CONFIG.START_LIVES; // each riddle = fresh 3 tries

    const riddle = pickRiddle(this.level, this.usedRiddleIds);
    this.usedRiddleIds.add(riddle.id);

    // controlled answer position: forbid a 3rd consecutive identical slot
    const last = this.lastAnswerPositions;
    let forbidden = -1;
    if (last.length >= 2 && last[last.length - 1] === last[last.length - 2]) {
      forbidden = last[last.length - 1];
    }
    const { options, answerIndex } = shuffleOptions(riddle, forbidden);
    this.currentAnswerIndex = answerIndex;
    this.lastAnswerPositions.push(answerIndex);
    if (this.lastAnswerPositions.length > 2) this.lastAnswerPositions.shift();

    const canSkip = this.magicPieces >= CONFIG.MAGIC_TARGET;

    UI.setLives(this.lives);
    UI.renderRiddle(
      { gateIndex: gate.index, question: riddle.q, options, canSkip },
      {
        onSelect: (i, btn) => this._answer(i, btn),
        onSkip: () => this._useMagic(),
      }
    );
  },

  _answer(index, btn) {
    if (index === this.currentAnswerIndex) {
      UI.markCorrect(btn);
      UI.disableOptions();
      setTimeout(() => this._passGate(), 500);
    } else {
      this.lives--;
      UI.markWrong(btn);
      UI.setLives(this.lives);
      if (this.lives <= 0) {
        UI.disableOptions();
        setTimeout(() => this._die(), 500);
      }
    }
  },

  _useMagic() {
    this.magicPieces = 0;
    this.magic.resume(this.level, this.magicPieces); // pieces can be collected again
    UI.setHud(this.level, this._magicActive(), this.magicPieces);
    this._passGate();
  },

  _passGate() {
    this.currentGate.opened = true;
    if (this.currentGate.isExit) {
      this._completeLevel();
    } else {
      this.state = "PLAYING";
      UI.hideAllOverlays();
      UI.setPlaying(true);
    }
  },

  _die() {
    this.state = "DEAD";
    UI.deathScreen(() => this.startLevel()); // restart same level
  },

  _completeLevel() {
    if (this.level >= CONFIG.TOTAL_LEVELS) {
      this._win();
    } else {
      this.state = "LEVEL_COMPLETE";
      UI.levelScreen(this.level, () => {
        this.level++;
        this.startLevel();
      });
    }
  },

  _win() {
    this.state = "WIN";
    const ms = performance.now() - this.startTime;
    this.lastWinMs = ms;
    const isRecord = Storage.saveBest(ms);
    UI.winScreen(ms, isRecord, {
      onSave: (name) => {
        Storage.submitScore(name, this.lastWinMs, this.playerEmoji).then((res) => {
          UI.showBoard({
            scores: res.scores,
            highlightIndex: res.rank,
            showAgain: true,
            onAgain: () => this.showMenu(),
            onClose: () => this.showMenu(),
          });
        });
      },
      // new run: character is re-chosen (choice is fixed only within a run)
      onPlayAgain: () => this.showMenu(),
    });
  },

  // ---------- rendering ----------
  _resizeCanvas() {
    const stage = document.getElementById("stage");
    const availW = stage.clientWidth - 8;
    const availH = stage.clientHeight - 8;
    const side = Math.max(80, Math.min(availW, availH));
    this.cell = Math.floor(side / this.maze.cols);
    const px = this.cell * this.maze.cols;
    const dpr = window.devicePixelRatio || 1;
    this.canvas.style.width = px + "px";
    this.canvas.style.height = px + "px";
    this.canvas.width = px * dpr;
    this.canvas.height = px * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  },

  _render() {
    const ctx = this.ctx;
    const cell = this.cell;
    const px = cell * this.maze.cols;
    ctx.clearRect(0, 0, px, px);

    // path background
    ctx.fillStyle = "#120e2c";
    ctx.fillRect(0, 0, px, px);

    // gates (draw under player)
    for (const g of this.gates) {
      this._drawGate(g);
    }

    // walls
    ctx.strokeStyle = "#6a55c8";
    ctx.lineWidth = Math.max(2, Math.floor(cell * 0.12));
    ctx.lineCap = "round";
    ctx.beginPath();
    for (let y = 0; y < this.maze.rows; y++) {
      for (let x = 0; x < this.maze.cols; x++) {
        const c = this.maze.grid[y][x];
        const x0 = x * cell, y0 = y * cell, x1 = x0 + cell, y1 = y0 + cell;
        if (c.top) { ctx.moveTo(x0, y0); ctx.lineTo(x1, y0); }
        if (c.left) { ctx.moveTo(x0, y0); ctx.lineTo(x0, y1); }
        if (c.bottom) { ctx.moveTo(x0, y1); ctx.lineTo(x1, y1); }
        if (c.right) { ctx.moveTo(x1, y0); ctx.lineTo(x1, y1); }
      }
    }
    ctx.stroke();

    // magic piece
    if (this.magic.piece) {
      this._drawEmoji("✨", this.magic.piece.x, this.magic.piece.y, cell * 0.7);
    }

    // player
    this._drawEmoji(this.playerEmoji, this.player.x, this.player.y, cell * 0.72);
  },

  _drawGate(g) {
    const ctx = this.ctx;
    const cell = this.cell;
    const pad = Math.max(2, cell * 0.14);
    const x = g.x * cell + pad, y = g.y * cell + pad;
    const w = cell - pad * 2, h = cell - pad * 2;
    ctx.globalAlpha = g.opened ? 0.28 : 1;
    ctx.fillStyle = g.isExit ? "#f0c75e" : "#7b5cff";
    this._roundRect(x, y, w, h, Math.max(3, cell * 0.15));
    ctx.fill();
    // label
    ctx.globalAlpha = g.opened ? 0.4 : 1;
    ctx.fillStyle = g.isExit ? "#2a1f00" : "#ffffff";
    ctx.font = "700 " + Math.floor(cell * 0.42) + "px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    const label = g.opened ? "✓" : (g.isExit ? "★" : String(g.index));
    ctx.fillText(label, g.x * cell + cell / 2, g.y * cell + cell / 2);
    ctx.globalAlpha = 1;
  },

  _roundRect(x, y, w, h, r) {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
  },

  _drawEmoji(ch, cx, cy, size) {
    const ctx = this.ctx;
    ctx.font = Math.floor(size) + "px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(ch, cx * this.cell + this.cell / 2, cy * this.cell + this.cell / 2);
  },
};

document.addEventListener("DOMContentLoaded", () => Game.init());
