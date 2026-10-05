// Prepares the buddy's pictures from the /character folder (runs in Electron's main process).
// Removes a solid green background (ChatGPT "green screen") and trims empty space.
const { nativeImage } = require("electron");
const fs = require("fs");
const path = require("path");
const POSES = ["idle", "wave", "run", "run_happy", "drink", "angry", "pout"];
const EXTS = ["png", "webp", "jpg", "jpeg"];

function prepare(file) {
  let img = nativeImage.createFromPath(file);
  if (img.isEmpty()) return null;
  let { width: w, height: h } = img.getSize();
  if (h > 1400) { img = img.resize({ height: 1400, quality: "best" }); ({ width: w, height: h } = img.getSize()); }
  const buf = Buffer.from(img.toBitmap());           // BGRA
  const px = (x, y) => { const i = (y * w + x) * 4; return [buf[i + 2], buf[i + 1], buf[i]]; };
  const corners = [[2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3], [w >> 1, 2]];
  const green = corners.filter(([x, y]) => { const [r, g, b] = px(x, y); return g > 150 && g - Math.max(r, b) > 70; }).length >= 3;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (y * w + x) * 4;
    if (green) {
      let b = buf[i], g = buf[i + 1], r = buf[i + 2];
      const a = 1 - Math.min(1, Math.max(0, (g - Math.max(r, b) - 15) / 55));
      if (a <= 0) { buf[i] = buf[i + 1] = buf[i + 2] = buf[i + 3] = 0; continue; }
      if (a < 1) { const ia = Math.max(a, .05); r = r / ia; b = b / ia; g = (g - (1 - a) * 255) / ia; }
      g = Math.min(g, Math.max(r, b));
      // stored premultiplied for Skia
      buf[i] = Math.max(0, Math.min(255, b * a)); buf[i + 1] = Math.max(0, Math.min(255, g * a));
      buf[i + 2] = Math.max(0, Math.min(255, r * a)); buf[i + 3] = Math.round(a * 255);
    }
    if (buf[i + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  }
  let out = nativeImage.createFromBitmap(buf, { width: w, height: h });
  if (x1 > x0) out = out.crop({ x: x0, y: y0, width: x1 - x0 + 1, height: y1 - y0 + 1 });
  return out.toDataURL();
}

function loadCharacter(dir) {
  const res = {};
  for (const p of POSES) {
    const f = EXTS.map(e => path.join(dir, `${p}.${e}`)).find(fs.existsSync);
    try { res[p] = f ? prepare(f) : null; } catch { res[p] = null; }
  }
  return res;
}
module.exports = { loadCharacter };
