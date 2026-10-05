/* Water Buddy — sprite character with procedural motion */
const $ = id => document.getElementById(id);
const buddy = $("buddy"), wrap = $("wrap"), sprite = $("sprite");
const card = $("card"), msg = $("message"), btnA = $("btnA"), btnB = $("btnB"), buttons = $("buttons");
const bubble = $("bubble"), bubbleText = $("bubbleText"), fx = $("fx"), speed = $("speed"), tallyEl = $("tally");

/* ---------- bridge (Electron) or browser preview ---------- */
const bridge = window.celsi || {
  hide() {}, next() { setTimeout(() => visit({ screenWidth: innerWidth }), 2500); },
  clickable() {}, onShow(cb) { setTimeout(() => cb({ screenWidth: innerWidth }), 400); }
};
let settings = { interval: 60, snooze: 10, sound: true };
let screenW = innerWidth;

/* ---------- poses: h = display height in px, b = bottom offset (negative = cut off below edge) ---------- */
const POSES = {
  idle:      { src: "idle.png",      h: 330, b: 0 },
  wave:      { src: "wave.png",      h: 330, b: 0 },
  run:       { src: "run.png",       h: 320, b: 0 },
  run_happy: { src: "run_happy.png", h: 320, b: 0 },
  drink:     { src: "drink.png",     h: 330, b: 0 },
  angry:     { src: "angry.png",     h: 330, b: 0 },
  pout:      { src: "pout.png",      h: 230, b: -10 }
};
let SPRITES = {};
let NAME = "Friend", GOAL = 8;
let pose = "idle";
function setPose(name) {
  if (name === pose && sprite.dataset.pose === name) return;
  pose = name; const p = POSES[name];
  sprite.src = SPRITES[name] || ""; sprite.dataset.pose = name;
  sprite.style.height = p.h + "px"; sprite.style.bottom = p.b + "px";
  popT = performance.now();                      // little squash-pop hides the swap
}

/* ---------- daily tally ---------- */
const today = () => new Date().toISOString().slice(0, 10);
const getTally = () => { try { const t = JSON.parse(localStorage.getItem("celsi-tally") || "{}"); return t.date === today() ? t.count : 0; } catch { return 0; } };
function addGlass() { const n = getTally() + 1; try { localStorage.setItem("celsi-tally", JSON.stringify({ date: today(), count: n })); } catch {} return n; }

/* ---------- motion ---------- */
let x = -400, facing = 1, motion = "idle", motionT0 = performance.now(), popT = 0, riseY = 0;
function setMotion(m) { if (m !== motion) { motion = m; motionT0 = performance.now(); } }
function frame(now) {
  const t = (now - motionT0) / 1000, S = Math.sin;
  let dx = 0, y = 0, r = 0, sx = 1, sy = 1;
  switch (motion) {
    case "idle":  sy = 1 + S(t * 2.4) * .014; sx = 1 - S(t * 2.4) * .007; r = S(t * 1.1) * 1.2; break;
    case "run": { const c = Math.abs(S(t * 13)); y = -c * 16; r = facing * 7 + S(t * 13) * 3; sy = 1 + (c - .5) * .06; sx = 1 - (c - .5) * .04; break; }
    case "hop":   { const c = Math.abs(S(t * 6)); y = -c * 22; sy = 1 + (c - .4) * .08; r = S(t * 6) * 4; break; }
    case "wave":  r = S(t * 3.2) * 4; y = -Math.abs(S(t * 3.2)) * 4; sy = 1 + S(t * 6.4) * .01; break;
    case "drink": y = -Math.abs(S(t * 4)) * 5; r = S(t * 4) * 2.5; sy = 1 + S(t * 8) * .012; break;
    case "angry": dx = (S(t * 38) * 4) * (S(t * 3) > 0 ? 1 : .2); r = S(t * 17) * 2.2; sy = 1 + Math.abs(S(t * 5)) * .02; break;
    case "pout":  r = S(t * 1.4) * 2; sy = 1 + S(t * 2) * .01; break;
  }
  // squash-and-stretch pop after each pose change
  const pt = (now - popT) / 1000;
  if (pt < .35) { const k = Math.exp(-pt * 10) * Math.cos(pt * 30); sx *= 1 + k * .07; sy *= 1 - k * .07; }
  wrap.style.transform = `translate(${dx.toFixed(1)}px, ${(y + riseY).toFixed(1)}px) rotate(${r.toFixed(2)}deg) scale(${(sx * facing).toFixed(3)}, ${sy.toFixed(3)})`;
  buddy.style.left = `${Math.round(x)}px`;
  placeUI();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);

function moveTo(tx, spd = 640, opts = {}) {
  return new Promise(res => {
    facing = tx > x ? 1 : -1; setMotion("run");
    let prev = performance.now(), fxT = 0;
    (function step(now) {
      const dt = Math.min(.05, (now - prev) / 1000); prev = now; fxT += dt;
      if (fxT > .09) { fxT = 0; trail(); }
      const d = tx - x, slow = opts.ease === false ? 1 : Math.max(.3, Math.min(1, Math.abs(d) / 140));
      const st = spd * dt * slow;
      if (Math.abs(d) <= st) { x = tx; setMotion("idle"); res(); return; }
      x += Math.sign(d) * st; requestAnimationFrame(step);
    })(prev);
  });
}
function riseTo(target, ms) {
  return new Promise(res => {
    const from = riseY, t0 = performance.now();
    (function s(now) {
      const p = Math.min(1, (now - t0) / ms), e = 1 - Math.pow(1 - p, 3) * (1 - p * .0);
      riseY = from + (target - from) * (p === 1 ? 1 : e + Math.sin(p * Math.PI) * .08 * Math.sign(from - target));
      if (p < 1) requestAnimationFrame(s); else { riseY = target; res(); }
    })(t0);
  });
}
const wait = ms => new Promise(r => setTimeout(r, ms));

/* ---------- effects ---------- */
function spawn(cls, px, bottom, text, life = 1700) {
  const e = document.createElement("div"); e.className = cls;
  e.style.left = px + "px"; e.style.bottom = bottom + "px";
  e.style.setProperty("--dx", (Math.random() - .5) * 90 + "px");
  e.style.setProperty("--rot", (Math.random() - .5) * 50 + "deg");
  if (text) e.textContent = text;
  fx.appendChild(e); setTimeout(() => e.remove(), life); return e;
}
function trail() {
  spawn("cloud", x - facing * 70, 6 + Math.random() * 10, null, 700);
  for (let i = 0; i < 2; i++) {
    const l = document.createElement("div"); l.className = "line";
    const w = 50 + Math.random() * 60;
    l.style.width = w + "px"; l.style.bottom = 70 + Math.random() * 150 + "px";
    l.style.left = (facing > 0 ? x - 130 - w : x + 130) + "px";
    l.style.setProperty("--dx", -facing * 40 + "px");
    speed.appendChild(l); setTimeout(() => l.remove(), 450);
  }
}
function hearts(n = 10, set = ["💙", "💧", "💖", "✨", "💗"]) {
  for (let i = 0; i < n; i++) setTimeout(() => spawn("pop", x - 110 + Math.random() * 220, 180 + Math.random() * 120, set[i % set.length]), i * 120);
}
let markEl = null, steamTimer = null;
function angerOn() {
  markEl = spawn("mark", x + 70, 340, "💢", 999999);
  steamTimer = setInterval(() => { for (let i = 0; i < 3; i++) setTimeout(() => spawn("steam", x - 50 + i * 40, 330, null, 1000), i * 110); }, 1200);
}
function angerOff() { if (markEl) markEl.remove(); markEl = null; clearInterval(steamTimer); }

let ac;
function chirp(kind = "hi") {
  if (!settings.sound) return;
  try {
    ac = ac || new AudioContext();
    ({ hi: [660, 880], yay: [660, 880, 1100], hmph: [320, 230] })[kind].forEach((f, i) => {
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + i * .11;
      o.frequency.value = f; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(.07, t + .02);
      g.gain.exponentialRampToValueAtTime(.001, t + .18); o.connect(g).connect(ac.destination); o.start(t); o.stop(t + .2);
    });
  } catch {}
}

/* ---------- UI placement ---------- */
function placeUI() {
  const onRight = x > screenW / 2;
  const half = (POSES[pose].h * .45);
  if (!card.classList.contains("hidden")) {
    let l = onRight ? x - half - card.offsetWidth - 10 : x + half + 10;
    card.style.left = Math.max(10, Math.min(screenW - card.offsetWidth - 10, l)) + "px";
  }
  if (!bubble.classList.contains("hidden")) {
    let l = onRight ? x - half - bubble.offsetWidth + 50 : x + half - 50;
    bubble.style.left = Math.max(10, Math.min(screenW - bubble.offsetWidth - 10, l)) + "px";
    bubble.style.bottom = (POSES[pose].h + POSES[pose].b - 40 + riseY * -1) + "px";
    bubble.classList.toggle("tailR", onRight); bubble.classList.toggle("tailL", !onRight);
  }
}
let choiceResolve = null;
function ask(text, opts = {}) {
  msg.innerHTML = text;
  card.classList.remove("angry", "happy"); if (opts.tone) card.classList.add(opts.tone);
  const a = opts.a, b = opts.b;
  buttons.className = "buttons" + (a || b ? "" : " none");
  btnA.style.display = a ? "" : "none"; btnB.style.display = b ? "" : "none";
  if (a) btnA.textContent = a; if (b) btnB.textContent = b;
  tallyEl.textContent = `💧 ${getTally()} / ${GOAL} today`;
  card.classList.remove("hidden");
  return new Promise(res => { choiceResolve = res; });
}
function hideCard() { card.classList.add("hidden"); }
function say(text) { bubbleText.innerHTML = text; bubble.classList.remove("hidden"); }
function unsay() { bubble.classList.add("hidden"); }
function choose(v) { if (choiceResolve) { const r = choiceResolve; choiceResolve = null; r(v); } }
btnA.onclick = () => choose("a"); btnB.onclick = () => choose("b"); $("close").onclick = () => choose("b");
const withTimeout = (p, ms, v) => Promise.race([p, wait(ms).then(() => { choose(v); return v; })]);
const pick = a => a[Math.floor(Math.random() * a.length)];

/* ---------- time-of-day lines ---------- */
function timeLines(h) {
  if (h < 11) return [`Good morning ${NAME}! ☀️<br>Start your day with water!`, "Morning! 🌼<br>First glass of the day?"];
  if (h < 14) return [`Heyy ${NAME}! 💙<br>Lunch-time water break!`, "Psst… midday sip! 💧"];
  if (h < 17) return ["Afternoon check! 🌤️<br>Time to drink water!", "Feeling sleepy? 😴<br>Water wakes you up!"];
  if (h < 20) return [`Good evening ${NAME}! 🌇<br>Water time!`, "Evening sip? 💧<br>You worked hard today!"];
  return ["Almost bedtime! 🌙<br>One more glass?", "Night check! 🌙💧"];
}

/* ---------- the visit ---------- */
let busy = false;
async function visit(data = {}) {
  if (busy) return; busy = true;
  screenW = data.screenWidth || innerWidth;
  if (data.settings) settings = { ...settings, ...data.settings };
  const side = data.side || (Math.random() < .5 ? "left" : "right");
  const spot = side === "left" ? 200 : screenW - 200;
  hideCard(); unsay(); angerOff(); riseY = 0;

  if (Math.random() < .5) {
    // peek from the screen edge first
    setPose("idle"); facing = side === "left" ? 1 : -1;
    x = side === "left" ? -60 : screenW + 60; setMotion("idle");
    await moveTo(side === "left" ? 40 : screenW - 40, 260);
    say(`Heyy ${NAME}! 💙`); chirp("hi"); await wait(1500); unsay();
    setPose("run"); await moveTo(spot, 520);
  } else {
    setPose("run"); x = side === "left" ? -200 : screenW + 200;
    await moveTo(spot, 700);
  }
  facing = side === "left" ? 1 : -1;
  setPose("wave"); setMotion("wave"); chirp("hi");
  say(pick(timeLines(data.hour ?? new Date().getHours())));
  await wait(1900); unsay();

  setPose("idle"); setMotion("idle");
  let ans = await withTimeout(ask("Did you drink<br>some water?", { a: "✓ Yes, I drank 💧", b: "🕒 Not yet 😅" }), 120000, "timeout");
  hideCard();

  if (ans === "a") { await celebrate(); return leave(true); }
  if (ans === "timeout") return sulk("You didn't answer me… 🥺<br>I'll be back soon!");

  // ---- angry: holds out the bottle ----
  setPose("angry"); setMotion("angry"); chirp("hmph"); angerOn();
  ans = await withTimeout(ask(pick([`${NAME}${NAME.slice(-1).repeat(2)}!! 😤<br>No water?! Drink NOW!`, "Hmph! 😠<br>Please drink water right now!", "What?! 😤<br>Your body needs water!"]),
    { tone: "angry", a: "💧 Okay, drinking now", b: "⏰ Remind me later" }), 120000, "b");
  angerOff(); hideCard();
  if (ans === "a") {
    setPose("idle"); setMotion("idle");
    await withTimeout(ask("Go on, drink it! 🥤<br>I'm watching you 👀", { a: "✅ Done, I drank it!" }), 180000, "a");
    hideCard(); await celebrate(); return leave(true);
  }
  return sulk("Hmm… Okay, but don't forget!<br>Your body needs water 💙");
}

async function celebrate() {
  const n = addGlass();
  setPose("drink"); setMotion("drink"); chirp("yay"); hearts(12);
  say(n >= GOAL ? `Goal done! 🎉<br>${n} glasses today 💙` : pick([`Good job! 💙<br>Stay hydrated ${NAME}!`, `Yay! 💧 Glass ${n} today!`, `Proud of you! 🥳<br>${n} / ${GOAL}`]));
  await wait(2600); unsay();
}

async function sulk(text) {
  // drops down and peeks up from the bottom of the screen, chin on hands
  setPose("pout"); setMotion("pout"); riseY = 220; facing = x > screenW / 2 ? -1 : 1;
  await riseTo(0, 600);
  say(text); await wait(3200); unsay();
  await riseTo(240, 450);
  riseY = 0; finish(settings.snooze);
}

async function leave(happy) {
  setPose("run_happy");
  const dest = x < screenW / 2 ? screenW + 260 : -260;
  say("See you later! 💙"); setTimeout(unsay, 1200);
  await moveTo(dest, 760, { ease: false });
  finish(settings.interval);
}
function finish(minutes) { busy = false; bridge.hide(); bridge.next(minutes); }

/* poke her */
sprite.addEventListener("click", async () => {
  if (motion !== "idle" && motion !== "wave") return;
  const m = motion; setMotion("hop"); spawn("pop", x, 280, "💖"); await wait(650); setMotion(m);
});

/* click-through: only the buddy and her card catch the mouse */
let overUI = false;
window.addEventListener("mousemove", e => {
  const el = document.elementFromPoint(e.clientX, e.clientY);
  const hit = !!(el && el.closest(".interactive:not(.hidden)"));
  if (hit !== overUI) { overUI = hit; bridge.clickable(hit); }
});

/* ---------- start-up: config + pictures ---------- */
function applyConfig(c) {
  if (!c) return;
  NAME = c.name || NAME; GOAL = c.dailyGoal || GOAL;
  document.querySelector(".title").innerHTML = `${c.buddyName || NAME} <span class="heart">💙</span>`;
}
(async () => {
  try { applyConfig(window.celsi ? await window.celsi.getConfig() : await (await fetch("config.json")).json()); } catch {}
  const ch = await window.loadCharacter(); SPRITES = ch.sprites;
  Object.values(SPRITES).forEach(s => { const i = new Image(); i.src = s; });
  sprite.dataset.pose = ""; setPose("idle");
  bridge.onShow(d => { applyConfig(d.config); visit(d); });
})();
window.__celsi = { visit, setPose, setMotion, choose };
