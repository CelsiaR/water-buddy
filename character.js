/* Loads the buddy's pictures from the /character folder.
   - Files can be PNG (transparent) or images on a solid GREEN background — green is removed automatically.
   - Any missing pose falls back to the built-in water-drop buddy "Drippy". */

const POSE_NAMES = ["idle", "wave", "run", "run_happy", "drink", "angry", "pout"];
const EXTS = ["png", "webp", "jpg", "jpeg"];

function loadImg(src) {
  return new Promise(res => { const i = new Image(); i.onload = () => res(i); i.onerror = () => res(null); i.src = src; });
}

/* ---- green-screen removal (runs once per picture, in the browser) ---- */
function looksGreen(ctx, w, h) {
  const pts = [[2, 2], [w - 3, 2], [2, h - 3], [w - 3, h - 3], [w >> 1, 2]];
  return pts.filter(([x, y]) => { const [r, g, b] = ctx.getImageData(x, y, 1, 1).data; return g > 150 && g - Math.max(r, b) > 70; }).length >= 3;
}
function keyGreen(img) {
  const c = document.createElement("canvas"); c.width = img.naturalWidth; c.height = img.naturalHeight;
  const ctx = c.getContext("2d", { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
  if (!looksGreen(ctx, c.width, c.height)) return { canvas: c, keyed: false };
  const id = ctx.getImageData(0, 0, c.width, c.height), d = id.data;
  for (let i = 0; i < d.length; i += 4) {
    const r = d[i], g = d[i + 1], b = d[i + 2], mx = Math.max(r, b);
    const greenness = g - mx;
    let a = 1 - Math.min(1, Math.max(0, (greenness - 15) / 55));
    if (a <= 0) { d[i + 3] = 0; continue; }
    if (a < 1) {                                   // un-mix the green that bled into soft edges (hair!)
      const ia = Math.max(a, .05);
      d[i] = Math.min(255, Math.max(0, r / ia)); d[i + 2] = Math.min(255, Math.max(0, b / ia));
      d[i + 1] = Math.min(255, Math.max(0, (g - (1 - a) * 255) / ia));
    }
    d[i + 1] = Math.min(d[i + 1], Math.max(d[i], d[i + 2]));   // remove green spill
    d[i + 3] = Math.round(a * 255);
  }
  ctx.putImageData(id, 0, 0);
  return { canvas: c, keyed: true };
}
function trim(canvas) {
  const ctx = canvas.getContext("2d"), { width: w, height: h } = canvas, d = ctx.getImageData(0, 0, w, h).data;
  let x0 = w, y0 = h, x1 = 0, y1 = 0;
  for (let y = 0; y < h; y += 2) for (let x = 0; x < w; x += 2) if (d[(y * w + x) * 4 + 3] > 20) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
  if (x1 <= x0) return canvas;
  const o = document.createElement("canvas"); o.width = x1 - x0 + 2; o.height = y1 - y0 + 2;
  o.getContext("2d").drawImage(canvas, x0, y0, o.width, o.height, 0, 0, o.width, o.height);
  return o;
}

/* ---- built-in default buddy: Drippy the water drop ---- */
function drippy(pose) {
  const faces = {
    idle:  { eyes: "open", mouth: "M86 150 Q100 162 114 150", brow: "" },
    wave:  { eyes: "open", mouth: "M84 148 Q100 170 116 148 Z", brow: "" },
    run:   { eyes: "open", mouth: "M86 150 Q100 162 114 150", brow: "" },
    run_happy: { eyes: "happy", mouth: "M84 148 Q100 170 116 148 Z", brow: "" },
    drink: { eyes: "happy", mouth: "M96 152 a4 4 0 1 0 8 0 a4 4 0 1 0 -8 0", brow: "" },
    angry: { eyes: "open", mouth: "M88 160 Q100 150 112 160", brow: "M70 104 L92 114 M130 104 L108 114" },
    pout:  { eyes: "open", mouth: "M96 154 Q104 156 98 160 Q104 163 96 166", brow: "M72 112 L90 104 M128 112 L110 104" }
  }[pose];
  const eyes = faces.eyes === "happy"
    ? `<path d="M70 128 Q80 116 90 128 M110 128 Q120 116 130 128" stroke="#163a6b" stroke-width="5" fill="none" stroke-linecap="round"/>`
    : `<ellipse cx="80" cy="126" rx="10" ry="13" fill="#fff"/><ellipse cx="120" cy="126" rx="10" ry="13" fill="#fff"/>
       <circle cx="81" cy="128" r="7" fill="#163a6b"/><circle cx="121" cy="128" r="7" fill="#163a6b"/>
       <circle cx="78" cy="124" r="2.5" fill="#fff"/><circle cx="118" cy="124" r="2.5" fill="#fff"/>`;
  const legs = (pose === "run" || pose === "run_happy")
    ? `<path d="M86 232 L70 262 M114 232 L136 254" stroke="#2f7fd8" stroke-width="10" stroke-linecap="round"/>`
    : `<path d="M88 234 L86 266 M112 234 L114 266" stroke="#2f7fd8" stroke-width="10" stroke-linecap="round"/>`;
  const arms = {
    wave: `<path d="M52 170 L36 196 M148 170 L172 132" stroke="#2f7fd8" stroke-width="10" stroke-linecap="round"/>`,
    angry: `<path d="M52 166 L40 186 L56 196 M148 166 L160 186 L144 196" stroke="#2f7fd8" stroke-width="10" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`,
    drink: `<path d="M52 170 L38 200 M148 170 L128 150" stroke="#2f7fd8" stroke-width="10" stroke-linecap="round"/><rect x="104" y="146" width="22" height="30" rx="4" fill="#bfe6ff" stroke="#7cc4f5" stroke-width="3" transform="rotate(-35 115 161)"/>`,
    run_happy: `<path d="M52 170 L36 150 M148 170 L170 188" stroke="#2f7fd8" stroke-width="10" stroke-linecap="round"/><rect x="164" y="172" width="20" height="32" rx="4" fill="#bfe6ff" stroke="#7cc4f5" stroke-width="3"/>`,
    pout: `<path d="M54 176 L96 196 M146 176 L104 196" stroke="#2f7fd8" stroke-width="10" stroke-linecap="round"/>`
  }[pose] || `<path d="M52 170 L38 200 M148 170 L162 200" stroke="#2f7fd8" stroke-width="10" stroke-linecap="round"/>`;
  const extra = pose === "angry" ? `<path d="M140 64 l6 6 m0 -6 l-6 6" stroke="#e5383b" stroke-width="4"/>` : "";
  const blush = pose === "angry" ? "#ff5a5a" : "#ff9aa8";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 280" width="400" height="560">
    <defs><radialGradient id="g" cx=".38" cy=".35" r=".75"><stop offset="0" stop-color="#9fdcff"/><stop offset=".6" stop-color="#4fa9f0"/><stop offset="1" stop-color="#2f7fd8"/></radialGradient></defs>
    ${legs}
    <path d="M100 20 C 120 60 165 110 165 160 A65 65 0 0 1 35 160 C 35 110 80 60 100 20 Z" fill="url(#g)"/>
    <ellipse cx="72" cy="92" rx="10" ry="18" fill="#fff" opacity=".55" transform="rotate(25 72 92)"/>
    ${arms}${eyes}
    <path d="${faces.brow}" stroke="#163a6b" stroke-width="5" stroke-linecap="round"/>
    <ellipse cx="66" cy="146" rx="9" ry="5" fill="${blush}" opacity=".6"/><ellipse cx="134" cy="146" rx="9" ry="5" fill="${blush}" opacity=".6"/>
    <path d="${faces.mouth}" stroke="#163a6b" stroke-width="4" fill="${faces.mouth.endsWith("Z") ? "#163a6b" : "none"}" stroke-linecap="round"/>
    ${extra}</svg>`;
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

async function loadCharacter() {
  const out = {}; let custom = 0;
  // In the desktop app the main process prepares the pictures (green removed, trimmed)
  if (window.celsi && window.celsi.getCharacter) {
    const fromMain = await window.celsi.getCharacter();
    for (const p of POSE_NAMES) { if (fromMain[p]) { out[p] = fromMain[p]; custom++; } else out[p] = drippy(p); }
    return { sprites: out, custom };
  }
  for (const p of POSE_NAMES) {
    let img = null;
    for (const e of EXTS) { img = await loadImg(`character/${p}.${e}`); if (img) break; }
    if (img) {
      try { out[p] = trim(keyGreen(img).canvas).toDataURL("image/png"); } catch { out[p] = img.src; }
      custom++;
    } else out[p] = drippy(p);
  }
  return { sprites: out, custom };
}
window.loadCharacter = loadCharacter;
