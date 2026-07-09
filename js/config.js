// Global game configuration & tunable constants.
const CONFIG = {
  TOTAL_LEVELS: 5,
  GATES_PER_LEVEL: 5,
  START_LIVES: 3,
  MAGIC_TARGET: 3,          // pieces needed to unlock a skip
  MAGIC_MOVE_MS: 15000,     // magic piece relocates every 15s
  MAGIC_FROM_LEVEL: 2,      // magic appears from maze 2 onward

  // Maze grid size per level (must be odd for the wall-carving grid).
  // level 1..5
  MAZE_SIZE: [9, 11, 13, 15, 19],

  SWIPE_MIN_PX: 24,         // minimum swipe distance to register a move

  // seed: null => random each run. Set a number to reproduce mazes in tests.
  SEED: null,
};

// Hogwarts houses — single-codepoint emoji so they render as one glyph on iOS
// canvas (ZWJ sequences like 🧙‍♀️ split into two glyphs there).
const HOUSES = {
  gryffindor: { emoji: "🦁", name: "גריפינדור" },
  hufflepuff: { emoji: "🦡", name: "הפלפאף" },
  ravenclaw:  { emoji: "🦅", name: "רייבנקלו" },
  slytherin:  { emoji: "🐍", name: "סלית׳רין" },
};
