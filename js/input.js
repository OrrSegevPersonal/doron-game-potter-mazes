import { CONFIG } from "./config.js";

// Input: swipe gestures on the play area + on-screen D-pad buttons.
// Both funnel into a single onMove(dir) callback.
export const Input = {
  init(onMove) {
    this.onMove = onMove;

    // --- D-pad buttons ---
    document.querySelectorAll(".dpad-btn").forEach((btn) => {
      const dir = btn.getAttribute("data-dir");
      const fire = (e) => { e.preventDefault(); this.onMove(dir); };
      btn.addEventListener("touchstart", fire, { passive: false });
      btn.addEventListener("mousedown", fire);
    });

    // --- Swipe on the stage ---
    const stage = document.getElementById("stage");
    let sx = 0, sy = 0, tracking = false;

    stage.addEventListener("touchstart", (e) => {
      const t = e.changedTouches[0];
      sx = t.clientX; sy = t.clientY; tracking = true;
    }, { passive: true });

    stage.addEventListener("touchend", (e) => {
      if (!tracking) return;
      tracking = false;
      const t = e.changedTouches[0];
      this._resolveSwipe(t.clientX - sx, t.clientY - sy);
    }, { passive: true });

    // --- Keyboard (desktop convenience) ---
    window.addEventListener("keydown", (e) => {
      const map = {
        ArrowUp: "up", ArrowDown: "down", ArrowLeft: "left", ArrowRight: "right",
        w: "up", s: "down", a: "left", d: "right",
      };
      const dir = map[e.key];
      if (dir) { e.preventDefault(); this.onMove(dir); }
    });
  },

  _resolveSwipe(dx, dy) {
    const min = CONFIG.SWIPE_MIN_PX;
    if (Math.abs(dx) < min && Math.abs(dy) < min) return;
    if (Math.abs(dx) > Math.abs(dy)) {
      this.onMove(dx > 0 ? "right" : "left");
    } else {
      this.onMove(dy > 0 ? "down" : "up");
    }
  },
};
