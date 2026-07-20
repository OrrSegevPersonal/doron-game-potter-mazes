// Gate placement. 5 gates per maze:
//  - gates 1-4 sit ON the solution path at spread-out points, so they are
//    unavoidable and visually hint the correct direction.
//  - gate 5 is the exit gate at the end of the path (leads to the next maze).
// Positions vary every maze because the path itself is procedural.

export function buildGates(maze) {
  const path = maze.solvePath(maze.start, maze.exit);
  const L = path.length;
  const gates = [];

  // 4 interior gates, evenly spread along the path (exclude start & exit).
  const chosen = new Set();
  for (let i = 1; i <= 4; i++) {
    let idx = Math.round((i * (L - 1)) / 5);
    idx = Math.max(1, Math.min(L - 2, idx));
    // nudge to avoid collisions on very short paths
    while (chosen.has(idx) && idx < L - 2) idx++;
    while (chosen.has(idx) && idx > 1) idx--;
    chosen.add(idx);
    const p = path[idx];
    gates.push({ x: p.x, y: p.y, index: gates.length + 1, isExit: false, opened: false });
  }

  // Exit gate (5th).
  const end = path[L - 1] || maze.exit;
  gates.push({ x: end.x, y: end.y, index: 5, isExit: true, opened: false });

  return gates;
}

// Find an unopened gate at a cell, or null.
export function gateAt(gates, x, y) {
  for (const g of gates) {
    if (g.x === x && g.y === y && !g.opened) return g;
  }
  return null;
}
