// Minimal static file server for local preview (no dependencies).
// Also serves a tiny global player-count API backed by a JSON file.
const http = require("http");
const fs = require("fs");
const path = require("path");

const ROOT = __dirname;
const PORT = process.env.PORT || 8080;

// Player-count storage. Point DATA_DIR at a Railway volume so the count
// survives redeploys (the container's own filesystem is ephemeral).
const DATA_DIR = process.env.DATA_DIR || path.join(ROOT, "data");
const COUNTER_FILE = path.join(DATA_DIR, "players.json");
const SCORES_FILE = path.join(DATA_DIR, "scores.json");
const BOARD_MAX = 10; // keep only the fastest 10 on the shared leaderboard

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

    // --- Shared leaderboard API ---
    // GET  /api/scores -> top list (fastest first)
    // POST /api/scores {name, ms, house} -> add, return {scores, rank}
    if (urlPath === "/api/scores") {
      if (req.method === "POST") {
        readJsonBody(req, (body) => {
          const ms = Number(body.ms);
          if (!Number.isFinite(ms) || ms <= 0) {
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
