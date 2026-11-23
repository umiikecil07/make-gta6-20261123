// input.js — keyboard + mouse state for Sunset Bay. First script after three.js:
// it creates the shared game object SB that every later module reads and writes.

const SB = window.SB = {};

// Seeded random so the city, traffic and pedestrians are identical every load.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
SB.rng = mulberry32(20261123);
SB.rand = (a, b) => a + SB.rng() * (b - a);
SB.randInt = (a, b) => Math.floor(SB.rand(a, b + 1));
SB.pick = (arr) => arr[Math.floor(SB.rng() * arr.length)];
SB.clamp = (v, a, b) => Math.max(a, Math.min(b, v));
SB.lerp = (a, b, t) => a + (b - a) * t;
SB.TAU = Math.PI * 2;

// ---------- keyboard ----------
SB.keys = {};
SB.pressed = {}; // keys pressed since the last frame (edge-triggered)
window.addEventListener('keydown', (e) => {
  if (e.repeat) return;
  SB.keys[e.code] = true;
  SB.pressed[e.code] = true;
  if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
});
window.addEventListener('keyup', (e) => { SB.keys[e.code] = false; });
SB.key = (...codes) => codes.some((c) => SB.keys[c]);
SB.wasPressed = (...codes) => codes.some((c) => SB.pressed[c]);
SB.endFrameInput = () => { for (const k in SB.pressed) SB.pressed[k] = false; SB.mouseDX = 0; SB.mouseDY = 0; SB.clicked = false; };

// ---------- mouse: drag to orbit the camera, click to shoot ----------
SB.mouseDX = 0; SB.mouseDY = 0; SB.clicked = false; SB.dragging = false;
SB.canvas = null;
function attachMouse(canvas) {
  SB.canvas = canvas;
  canvas.addEventListener('mousedown', (e) => { SB.dragging = true; SB.lastX = e.clientX; SB.lastY = e.clientY; });
  window.addEventListener('mouseup', () => { SB.dragging = false; });
  window.addEventListener('mousemove', (e) => {
    if (!SB.dragging) return;
    SB.mouseDX += e.clientX - SB.lastX;
    SB.mouseDY += e.clientY - SB.lastY;
    SB.lastX = e.clientX; SB.lastY = e.clientY;
  });
  canvas.addEventListener('click', () => { SB.clicked = true; });
}
SB.attachMouse = attachMouse;
