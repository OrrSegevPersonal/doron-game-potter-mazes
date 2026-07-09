// Small seedable PRNG (Mulberry32) so mazes can be reproduced with a fixed seed.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const RNG = {
  _rand: Math.random,

  // Seed the generator. Pass null/undefined for a random seed.
  seed(s) {
    if (s === null || s === undefined) {
      this._rand = Math.random;
    } else {
      this._rand = mulberry32(s);
    }
  },

  // float in [0,1)
  next() { return this._rand(); },

  // int in [0, n)
  int(n) { return Math.floor(this._rand() * n); },

  // random element
  pick(arr) { return arr[this.int(arr.length)]; },

  // in-place Fisher-Yates shuffle
  shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = this.int(i + 1);
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  },
};
