// Water Buddy — Electron main process
const { app, BrowserWindow, screen, ipcMain, Tray, Menu, nativeImage, globalShortcut, powerMonitor } = require("electron");
const path = require("path");
const fs = require("fs");
const { execFile } = require("child_process");
const { loadCharacter } = require("./charprep");

/* ---------- config.json: your buddy's name and defaults (edit this file!) ---------- */
let config = { name: "Friend", buddyName: "Water Buddy", dailyGoal: 8 };
try { Object.assign(config, JSON.parse(fs.readFileSync(path.join(__dirname, "config.json"), "utf8"))); } catch {}

app.commandLine.appendSwitch("disable-gpu-shader-disk-cache");
if (!app.requestSingleInstanceLock()) { app.quit(); }

const WIN_H = 560;
let win, tray, timer, nextAt = null, pausedReason = "";

/* ---------- settings (saved in %APPDATA%) ---------- */
const settingsFile = () => path.join(app.getPath("userData"), "settings.json");
let settings = {
  interval: 60,          // minutes between visits, aligned to the clock (9:00, 10:00 …)
  snooze: 10,            // "Not yet" comes back after this
  startHour: 8,          // first visit of the day
  endHour: 22,           // no visits from this hour on
  sound: true,
  showOnLaunch: true,
  hideFromRecordings: true,
  // never interrupt while one of these is running (lower-case process names)
  recorders: ["obs64.exe", "obs32.exe", "obs.exe", "streamlabs obs.exe", "bcastdvr.exe",
              "camrecorder.exe", "camtasia.exe", "bandicam.exe", "action.exe", "screenrec.exe", "nvcontainer_record.exe",
              "xsplit.core.exe", "loom.exe", "snagit32.exe", "sharex_recording.exe"]
};
function loadSettings() {
  for (const k of ["interval", "snooze", "startHour", "endHour", "sound"]) if (config[k] !== undefined) settings[k] = config[k];
  try { Object.assign(settings, JSON.parse(fs.readFileSync(settingsFile(), "utf8"))); } catch {} }
function saveSettings() { try { fs.writeFileSync(settingsFile(), JSON.stringify(settings, null, 2)); } catch {} buildTray(); }

/* ---------- time-of-day schedule ---------- */
function inActiveHours(d = new Date()) { const h = d.getHours(); return h >= settings.startHour && h < settings.endHour; }
function nextSlot(from = new Date()) {
  // next clock-aligned slot inside active hours, e.g. every 60 min → 9:00, 10:00, 11:00…
  const d = new Date(from); d.setSeconds(0, 0);
  const start = new Date(d); start.setHours(settings.startHour, 0, 0, 0);
  if (d < start) return start;
  const mins = Math.floor((d - start) / 60000);
  const slot = new Date(start.getTime() + (Math.floor(mins / settings.interval) + 1) * settings.interval * 60000);
  if (!inActiveHours(slot)) { const tmr = new Date(start); tmr.setDate(tmr.getDate() + 1); return tmr; }
  return slot;
}
function scheduleAt(date, reason = "") {
  clearTimeout(timer);
  nextAt = date; pausedReason = reason;
  timer = setTimeout(tryShow, Math.max(1000, date - Date.now()));
  buildTray();
}
function schedule(minutes) {
  // after a visit: snooze → relative; normal → next clock slot
  if (minutes && minutes < settings.interval) {
    const d = new Date(Date.now() + minutes * 60000);
    return scheduleAt(inActiveHours(d) ? d : nextSlot(d));
  }
  scheduleAt(nextSlot());
}

/* ---------- "don't disturb" checks: recording, full-screen, away ---------- */
function runningProcesses() {
  return new Promise(res => {
    if (process.platform !== "win32") return res([]);
    execFile("tasklist", ["/FO", "CSV", "/NH"], { windowsHide: true, maxBuffer: 8 << 20 }, (err, out) => {
      if (err) return res([]);
      res(out.split(/\r?\n/).map(l => (l.split('","')[0] || "").replace(/"/g, "").toLowerCase()).filter(Boolean));
    });
  });
}
function notificationState() {
  // Windows SHQueryUserNotificationState: 2 busy/full-screen, 3 D3D game, 4 presentation, 6 quiet time (Focus)
  return new Promise(res => {
    if (process.platform !== "win32") return res(5);
    const ps = `$s=Add-Type -PassThru -Name Q -Namespace W -MemberDefinition '[DllImport("shell32.dll")] public static extern int SHQueryUserNotificationState(out int s);';$v=0;[void]$s::SHQueryUserNotificationState([ref]$v);$v`;
    execFile("powershell", ["-NoProfile", "-NonInteractive", "-Command", ps], { windowsHide: true, timeout: 8000 },
      (err, out) => res(err ? 5 : parseInt(String(out).trim(), 10) || 5));
  });
}
async function busyReason() {
  const procs = await runningProcesses();
  const rec = settings.recorders.find(r => procs.includes(r));
  if (rec) return `recording (${rec.replace(".exe", "")})`;
  const q = await notificationState();
  if (q === 1) return "screen locked";
  if (q === 2 || q === 3) return "full-screen app";
  if (q === 4) return "presentation mode";
  if (q === 6) return "Focus / quiet time";
  if (powerMonitor.getSystemIdleTime() > 10 * 60) return "you're away";
  return "";
}

async function tryShow(force = false) {
  if (!win || win.isDestroyed()) return;
  if (!force) {
    if (!inActiveHours()) return scheduleAt(nextSlot());
    const why = await busyReason();
    if (why) return scheduleAt(new Date(Date.now() + 2 * 60000), why);   // check again in 2 min
  }
  showReminder();
}

function fitToScreen() {
  const wa = screen.getPrimaryDisplay().workArea;
  win.setBounds({ x: wa.x, y: wa.y + wa.height - WIN_H, width: wa.width, height: WIN_H });
  return wa;
}
function showReminder() {
  if (!win || win.isDestroyed()) return;
  clearTimeout(timer); nextAt = null; pausedReason = ""; buildTray();
  const wa = fitToScreen();
  win.setContentProtection(!!settings.hideFromRecordings);   // invisible to screen capture even if something starts mid-visit
  win.setIgnoreMouseEvents(true, { forward: true });
  win.showInactive();
  win.setAlwaysOnTop(true, "screen-saver");
  win.webContents.send("celsi:show", { side: Math.random() < 0.5 ? "left" : "right", screenWidth: wa.width, hour: new Date().getHours(), settings, config });
}

function createWindow() {
  win = new BrowserWindow({
    width: 800, height: WIN_H, frame: false, transparent: true, resizable: false, movable: false,
    skipTaskbar: true, show: false, alwaysOnTop: true, hasShadow: false, focusable: true, backgroundColor: "#00000000",
    webPreferences: { preload: path.join(__dirname, "preload.js"), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false }
  });
  fitToScreen();
  win.setIgnoreMouseEvents(true, { forward: true });
  win.loadFile(path.join(__dirname, "index.html"));

  ipcMain.on("celsi:hide", () => { if (win && !win.isDestroyed()) win.hide(); });
  ipcMain.on("celsi:next", (_e, minutes) => schedule(minutes));
  ipcMain.handle("celsi:character", () => loadCharacter(path.join(__dirname, "character")));
  ipcMain.handle("celsi:config", () => config);
  ipcMain.on("celsi:clickable", (_e, on) => { if (win && !win.isDestroyed()) win.setIgnoreMouseEvents(!on, { forward: true }); });

  win.webContents.once("did-finish-load", () => {
    if (settings.showOnLaunch && inActiveHours()) setTimeout(() => tryShow(), 2000);
    else scheduleAt(nextSlot());
  });
}

/* ---------- tray ---------- */
// when run from source (npx electron .) Windows must start electron.exe *with this folder*
const loginArgs = () => app.isPackaged ? {} : { path: process.execPath, args: [app.getAppPath()] };
const fmt = d => d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
const hourLabel = h => `${((h + 11) % 12) + 1}:00 ${h < 12 ? "AM" : "PM"}`;
function buildTray() {
  if (!tray) return;
  const t = nextAt ? fmt(nextAt) : "now";
  const status = pausedReason ? `⏸ Waiting — ${pausedReason}` : `💧 Next visit: ${t}`;
  tray.setToolTip(`${config.buddyName} — ${pausedReason ? "waiting: " + pausedReason : "next visit " + t}`);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: status, enabled: false },
    { label: `Call ${config.buddyName} now  (Ctrl+Alt+W)`, click: () => tryShow(true) },
    { type: "separator" },
    { label: "Remind me every…", submenu: [30, 45, 60, 90, 120].map(m => ({
      label: m < 60 ? `${m} minutes` : `${m / 60} hour${m > 60 ? "s" : ""}`, type: "radio", checked: settings.interval === m,
      click: () => { settings.interval = m; saveSettings(); scheduleAt(nextSlot()); } })) },
    { label: `Day starts at ${hourLabel(settings.startHour)}`, submenu: [6, 7, 8, 9, 10].map(h => ({
      label: hourLabel(h), type: "radio", checked: settings.startHour === h, click: () => { settings.startHour = h; saveSettings(); scheduleAt(nextSlot()); } })) },
    { label: `Day ends at ${hourLabel(settings.endHour)}`, submenu: [18, 19, 20, 21, 22, 23].map(h => ({
      label: hourLabel(h), type: "radio", checked: settings.endHour === h, click: () => { settings.endHour = h; saveSettings(); scheduleAt(nextSlot()); } })) },
    { label: "“Not yet” snooze", submenu: [5, 10, 15, 20].map(m => ({
      label: `${m} minutes`, type: "radio", checked: settings.snooze === m, click: () => { settings.snooze = m; saveSettings(); } })) },
    { type: "separator" },
    { label: "Hide from screen recordings", type: "checkbox", checked: settings.hideFromRecordings,
      click: i => { settings.hideFromRecordings = i.checked; saveSettings(); if (win) win.setContentProtection(i.checked); } },
    { label: "Sounds", type: "checkbox", checked: settings.sound, click: i => { settings.sound = i.checked; saveSettings(); } },
    { label: "Visit right after start-up", type: "checkbox", checked: settings.showOnLaunch, click: i => { settings.showOnLaunch = i.checked; saveSettings(); } },
    { label: "Start with Windows", type: "checkbox", checked: app.getLoginItemSettings(loginArgs()).openAtLogin,
      click: i => { app.setLoginItemSettings({ openAtLogin: i.checked, ...loginArgs() }); buildTray(); } },
    { type: "separator" },
    { label: "Quit", click: () => app.exit(0) }
  ]));
}

app.whenReady().then(() => {
  loadSettings();
  createWindow();
  tray = new Tray(nativeImage.createFromPath(path.join(__dirname, "assets", "tray.png")));
  tray.on("click", () => tray.popUpContextMenu());
  buildTray();
  globalShortcut.register("Control+Alt+W", () => tryShow(true));
  screen.on("display-metrics-changed", () => { if (win && win.isVisible()) fitToScreen(); });
  powerMonitor.on("resume", () => scheduleAt(nextSlot()));
  setInterval(buildTray, 60000);
});
app.on("second-instance", () => tryShow(true));
app.on("window-all-closed", e => e.preventDefault());
app.on("will-quit", () => globalShortcut.unregisterAll());
