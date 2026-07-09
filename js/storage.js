// Best-time persistence in localStorage.
const Storage = {
  KEY: "hp_maze_best_ms",

  getBest() {
    try {
      const v = localStorage.getItem(this.KEY);
      return v ? parseInt(v, 10) : null;
    } catch (e) {
      return null;
    }
  },

  // Save time (ms) if it beats the existing best. Returns true if it's a new record.
  saveBest(ms) {
    try {
      const best = this.getBest();
      if (best === null || ms < best) {
        localStorage.setItem(this.KEY, String(ms));
        return true;
      }
    } catch (e) { /* ignore */ }
    return false;
  },

  // ----- Leaderboard (top 10, fastest first) -----
  BOARD_KEY: "hp_maze_board",
  BOARD_MAX: 10,

  getScores() {
    try {
      const raw = localStorage.getItem(this.BOARD_KEY);
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) {
      return [];
    }
  },

  // Add a score {name, ms}. Returns the 0-based rank it landed at (or -1 if it
  // didn't make the top list).
  addScore(name, ms, house) {
    const clean = (name || "").trim().slice(0, 14) || "אלמוני/ת";
    const scores = this.getScores();
    const entry = { name: clean, ms, ts: Date.now(), house: house || "" };
    scores.push(entry);
    scores.sort((a, b) => a.ms - b.ms);
    const trimmed = scores.slice(0, this.BOARD_MAX);
    try {
      localStorage.setItem(this.BOARD_KEY, JSON.stringify(trimmed));
    } catch (e) { /* ignore */ }
    return trimmed.indexOf(entry);
  },
};

// Format milliseconds as MM:SS.
function formatTime(ms) {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return String(m).padStart(2, "0") + ":" + String(s).padStart(2, "0");
}

// Format a timestamp (ms) as DD.MM.YY. Returns "" if missing.
function formatDate(ts) {
  if (!ts) return "";
  const d = new Date(ts);
  const dd = String(d.getDate()).padStart(2, "0");
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const yy = String(d.getFullYear()).slice(-2);
  return dd + "." + mm + "." + yy;
}
