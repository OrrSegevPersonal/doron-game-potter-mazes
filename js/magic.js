// Magic-piece manager. From maze 2 onward a single magic piece is always on the
// board; it relocates every 15s or when collected. Once 3 pieces are collected
// no more pieces appear for the current maze.
class MagicManager {
  constructor() {
    this.enabled = false;
    this.piece = null;      // {x,y} | null
    this.nextMoveAt = 0;    // timestamp for next relocation
  }

  // Start a fresh maze. `pieces` is the count carried over from earlier levels —
  // if the player is already at the target, no new piece should appear.
  reset(level, pieces) {
    this.enabled = level >= CONFIG.MAGIC_FROM_LEVEL && (pieces || 0) < CONFIG.MAGIC_TARGET;
    this.piece = null;
    this.nextMoveAt = 0;
  }

  // Re-enable spawning within the current maze (e.g. after magic was spent).
  resume(level, pieces) {
    this.enabled = level >= CONFIG.MAGIC_FROM_LEVEL && (pieces || 0) < CONFIG.MAGIC_TARGET;
  }

  // Ensure a piece exists when it should. `collected` is the current piece count.
  ensure(maze, player, gates, now) {
    if (!this.enabled) return;
    if (this.piece === null) this._relocate(maze, player, gates, now);
  }

  // Called every frame. Relocates the piece when its 15s timer elapses.
  tick(maze, player, gates, now) {
    if (!this.enabled || this.piece === null) return;
    if (now >= this.nextMoveAt) this._relocate(maze, player, gates, now);
  }

  _relocate(maze, player, gates, now) {
    const blocked = new Set();
    blocked.add(player.y * maze.cols + player.x);
    for (const g of gates) blocked.add(g.y * maze.cols + g.x);

    const free = [];
    for (let y = 0; y < maze.rows; y++) {
      for (let x = 0; x < maze.cols; x++) {
        if (!blocked.has(y * maze.cols + x)) free.push({ x, y });
      }
    }
    this.piece = free.length ? RNG.pick(free) : null;
    this.nextMoveAt = now + CONFIG.MAGIC_MOVE_MS;
  }

  // If the player stands on the piece, collect it. Returns true on collect.
  tryCollect(player) {
    if (this.piece && this.piece.x === player.x && this.piece.y === player.y) {
      this.piece = null;
      return true;
    }
    return false;
  }

  // Stop spawning (e.g. after reaching the 3-piece target).
  stop() {
    this.enabled = false;
    this.piece = null;
  }
}
