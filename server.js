// Minimal static file server for local preview (no dependencies).
// Also serves a tiny global player-count API backed by a JSON file.
const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

const ROOT = __dirname;
const PORT = process.env.PORT || 8080;

// Player-count storage. Point DATA_DIR at a Railway volume so the count
// survives redeploys (the container's own filesystem is ephemeral).
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, "data");
const COUNTER_FILE = path.join(DATA_DIR, "players.json");
const SCORES_FILE = path.join(DATA_DIR, "scores.json");
const BOARD_MAX = 10; // keep only the fastest 10 on the shared leaderboard

// --- Run tokens: proof that a real game session started on this server ---
// A score is accepted only with a token issued by /api/run/start, and the
// claimed time may not beat the elapsed time the server itself observed.
// This keeps devtools tricks (resetting the client timer, calling the win
// handler directly, or POSTing to /api/scores by hand) off the shared board.
const RUN_TOKENS = new Map(); // token -> startedAt (Date.now())
const TOKEN_TTL_MS = 2 * 60 * 60 * 1000; // forget runs older than 2h
const MAX_TOKENS = 500;                  // hard cap so the map can't grow unbounded
const MIN_WIN_MS = 30000;                // even a perfect run of 5 mazes takes longer
const CLOCK_TOLERANCE_MS = 10000;        // network/clock slack when comparing times

function pruneTokens() {
  const now = Date.now();
  for (const [t, startedAt] of RUN_TOKENS) {
    if (now - startedAt > TOKEN_TTL_MS) RUN_TOKENS.delete(t);
  }
  // Still over cap (burst of starts): drop oldest first (Map keeps insertion order).
  while (RUN_TOKENS.size >= MAX_TOKENS) {
    RUN_TOKENS.delete(RUN_TOKENS.keys().next().value);
  }
}

function ensureDataDir() {
  try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) { /* ignore */ }
}
function readCount() {
  try {
    const raw = fs.readFileSync(COUNTER_FILE, "utf8");
    const n = JSON.parse(raw).count;
    return Number.isFinite(n) ? n : 0;
  } catch (e) {
    return 0;
  }
}
function writeCount(n) {
  try {
    ensureDataDir();
    fs.writeFileSync(COUNTER_FILE, JSON.stringify({ count: n }));
  } catch (e) { /* ignore */ }
}
function readScores() {
  try {
    const arr = JSON.parse(fs.readFileSync(SCORES_FILE, "utf8"));
    return Array.isArray(arr) ? arr : [];
  } catch (e) {
    return [];
  }
}
function writeScores(list) {
  try {
    ensureDataDir();
    fs.writeFileSync(SCORES_FILE, JSON.stringify(list));
  } catch (e) { /* ignore */ }
}

// Read a request's JSON body (capped) and hand it to cb; cb({}) on any error.
function readJsonBody(req, cb) {
  let body = "";
  req.on("data", (c) => {
    body += c;
    if (body.length > 10000) { body = ""; req.destroy(); }
  });
  req.on("end", () => {
    try { cb(JSON.parse(body || "{}")); } catch (e) { cb({}); }
  });
  req.on("error", () => cb({}));
}

ensureDataDir();

const TYPES = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function sendJson(res, obj) {
  res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
  res.end(JSON.stringify(obj));
}

http
  .createServer((req, res) => {
    const urlPath = decodeURIComponent(req.url.split("?")[0]);

    // --- Player-count API ---
    // GET  /api/players -> current total
    // POST /api/players -> increment (a new unique device) and return the total
    if (urlPath === "/api/players") {
      if (req.method === "POST") {
        const next = readCount() + 1; // sync read-modify-write: atomic on the event loop
        writeCount(next);
        return sendJson(res, { count: next });
      }
      return sendJson(res, { count: readCount() });
    }

    // --- Run-start API ---
    // POST /api/run/start -> {token}. Called when a run begins; the server
    // remembers when, so a submitted score can be checked against real time.
    if (urlPath === "/api/run/start" && req.method === "POST") {
      pruneTokens();
      const token = crypto.randomUUID();
      RUN_TOKENS.set(token, Date.now());
      return sendJson(res, { token: token });
    }

    // --- Shared leaderboard API ---
    // GET  /api/scores -> top list (fastest first)
    // POST /api/scores {name, ms, house, token} -> add, return {scores, rank}
    // A score without a valid run token, faster than MIN_WIN_MS, or faster than
    // the server-observed elapsed time is rejected with rank -1.
    if (urlPath === "/api/scores") {
      if (req.method === "POST") {
        readJsonBody(req, (body) => {
          const ms = Number(body.ms);
          const token = typeof body.token === "string" ? body.token : "";
          const startedAt = RUN_TOKENS.get(token);
          if (startedAt !== undefined) RUN_TOKENS.delete(token); // one score per run
          const serverMs = startedAt !== undefined ? Date.now() - startedAt : -1;
          const valid =
            Number.isFinite(ms) &&
            ms >= MIN_WIN_MS &&
            serverMs >= 0 &&
            ms <= serverMs + CLOCK_TOLERANCE_MS;
          if (!valid) {
            return sendJson(res, { scores: readScores(), rank: -1 });
          }
          const rec = {
            name: String(body.name || "").trim().slice(0, 14) || "אלמוני/ת",
            ms: ms,
            ts: Date.now(),
            house: String(body.house || "").slice(0, 8),
          };
          const scores = readScores();
          scores.push(rec);
          scores.sort((a, b) => a.ms - b.ms);
          const trimmed = scores.slice(0, BOARD_MAX);
          writeScores(trimmed);
          return sendJson(res, { scores: trimmed, rank: trimmed.indexOf(rec) });
        });
        return;
      }
      return sendJson(res, { scores: readScores() });
    }

    // --- Static files ---
    let file = urlPath === "/" ? "/index.html" : urlPath;
    const filePath = path.join(ROOT, path.normalize(file));
    if (!filePath.startsWith(ROOT)) {
      res.writeHead(403);
      return res.end("Forbidden");
    }
    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        return res.end("Not found");
      }
      res.writeHead(200, { "Content-Type": TYPES[path.extname(filePath)] || "application/octet-stream" });
      res.end(data);
    });
  })
  .listen(PORT, "0.0.0.0", () => console.log("serving on http://0.0.0.0:" + PORT));
