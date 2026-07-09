// Procedural maze generation (Recursive Backtracker) + BFS solver.
// Cell model: each cell has 4 walls; carving removes walls between neighbors.

const DIRS = {
  up:    { dx: 0, dy: -1, wall: "top",    opp: "bottom" },
  down:  { dx: 0, dy: 1,  wall: "bottom", opp: "top" },
  left:  { dx: -1, dy: 0, wall: "left",   opp: "right" },
  right: { dx: 1, dy: 0,  wall: "right",  opp: "left" },
};

class Maze {
  constructor(size) {
    this.cols = size;
    this.rows = size;
    this.start = { x: 0, y: 0 };
    this.exit = { x: size - 1, y: size - 1 };
    this.grid = [];
    for (let y = 0; y < this.rows; y++) {
      const row = [];
      for (let x = 0; x < this.cols; x++) {
        row.push({ x, y, top: true, right: true, bottom: true, left: true, visited: false });
      }
      this.grid.push(row);
    }
    this._generate();
  }

  cell(x, y) {
    if (x < 0 || y < 0 || x >= this.cols || y >= this.rows) return null;
    return this.grid[y][x];
  }

  // Iterative recursive-backtracker carving.
  _generate() {
    const stack = [];
    let current = this.cell(0, 0);
    current.visited = true;
    let visitedCount = 1;
    const total = this.cols * this.rows;

    while (visitedCount < total) {
      const neighbors = this._unvisitedNeighbors(current);
      if (neighbors.length > 0) {
        const { dir, cell } = RNG.pick(neighbors);
        // knock down walls between current and chosen neighbor
        current[DIRS[dir].wall] = false;
        cell[DIRS[dir].opp] = false;
        cell.visited = true;
        visitedCount++;
        stack.push(current);
        current = cell;
      } else {
        current = stack.pop();
      }
    }
  }

  _unvisitedNeighbors(cell) {
    const out = [];
    for (const dir in DIRS) {
      const d = DIRS[dir];
      const n = this.cell(cell.x + d.dx, cell.y + d.dy);
      if (n && !n.visited) out.push({ dir, cell: n });
    }
    return out;
  }

  // Can you move from (x,y) in a direction? (wall is open)
  canMove(x, y, dir) {
    const c = this.cell(x, y);
    if (!c) return false;
    if (c[DIRS[dir].wall]) return false;
    const d = DIRS[dir];
    return this.cell(x + d.dx, y + d.dy) !== null;
  }

  // BFS shortest path between two cells, respecting walls.
  // Returns array of {x,y} from `from` to `to`, or [] if unreachable.
  solvePath(from, to) {
    const key = (x, y) => y * this.cols + x;
    const prev = new Map();
    const start = key(from.x, from.y);
    const goal = key(to.x, to.y);
    const queue = [from];
    const seen = new Set([start]);

    while (queue.length) {
      const c = queue.shift();
      if (key(c.x, c.y) === goal) break;
      for (const dir in DIRS) {
        if (!this.canMove(c.x, c.y, dir)) continue;
        const d = DIRS[dir];
        const nx = c.x + d.dx, ny = c.y + d.dy;
        const k = key(nx, ny);
        if (seen.has(k)) continue;
        seen.add(k);
        prev.set(k, { x: c.x, y: c.y });
        queue.push({ x: nx, y: ny });
      }
    }

    // reconstruct
    if (!prev.has(goal) && start !== goal) return [];
    const path = [];
    let cur = { x: to.x, y: to.y };
    while (cur) {
      path.push(cur);
      if (key(cur.x, cur.y) === start) break;
      cur = prev.get(key(cur.x, cur.y));
    }
    return path.reverse();
  }
}
