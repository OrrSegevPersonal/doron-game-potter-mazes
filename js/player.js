import { DIRS } from "./maze.js";

// Player position + movement against the maze walls.
export class Player {
  constructor(maze) {
    this.maze = maze;
    this.x = maze.start.x;
    this.y = maze.start.y;
  }

  // Attempt a move in a direction. Returns true if the player actually moved.
  tryMove(dir) {
    if (!this.maze.canMove(this.x, this.y, dir)) return false;
    const d = DIRS[dir];
    this.x += d.dx;
    this.y += d.dy;
    return true;
  }
}
