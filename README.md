# 💧 Water Buddy

**A cute character that runs across your desktop and reminds you to drink water, and it can look like *you*.**

Your buddy peeks in from the edge of the screen, waves, and asks *"Did you drink some water?"*

- **Yes** → she happily drinks with you, hearts fly, and she runs off across the screen 🎉
- **Not yet** → she gets angry 😤, stamps her foot, and tells you to drink NOW
- **Remind me later** → she pouts from the bottom of the screen and comes back in a few minutes

![Water Buddy preview](docs/preview.jpg)

Out of the box you get **Drippy**, a little water drop. The fun part is turning it into a caricature of yourself (or a friend, your kid, your pet…). See [Make your own character](#-make-your-own-character) below.

---

## ✨ Features

- 🏃 Runs, waves, jumps and pouts, with squash-and-stretch animation, speech bubbles and hearts
- 🕘 Visits **on the clock** (9:00, 10:00, 11:00…) and only during your day (8 AM–10 PM by default)
- 🌅 Different lines for morning, lunch, afternoon, evening and bedtime
- 🎥 **Never interrupts recordings or games.** It waits while OBS / Xbox Game Bar are recording, while a full-screen game or a presentation is open, during Focus mode, or when you're away
- 🙈 Hidden from screen recordings and screen shares even if one starts mid-visit
- 💧 Counts your glasses for the day (goal: 8)
- 🖱️ Clicks pass straight through. Only the character and her card catch the mouse
- ⌨️ `Ctrl + Alt + W` calls your buddy any time

Works on **Windows 10/11**. It also runs on macOS and Linux, but the "don't disturb while recording" checks are Windows-only for now.

---

## 🚀 Install (5 minutes, no coding needed)

1. Install **Node.js LTS** from <https://nodejs.org> (just click Next → Next → Finish).
2. On this page click the green **Code** button → **Download ZIP**, then unzip it anywhere (e.g. your Documents folder).
3. Open the folder and double-click **`start-buddy.bat`**.
   - The first time, it installs itself (about a minute).
   - Your buddy appears about 2 seconds later. 🎉

A 💧 icon appears in your system tray (bottom-right, maybe under the `^` arrow). Right-click it to:

- call your buddy now
- change how often she comes (30 min – 2 hours)
- set when your day starts and ends
- change the "Not yet" snooze, turn sounds on/off
- **Start with Windows**, so she runs every day automatically
- Quit

To stop everything, double-click **`stop-buddy.bat`**.

---

## 📝 Put your name in

Open **`config.json`** with Notepad and change it:

```json
{
  "name": "Celsia",
  "buddyName": "Celsia",
  "dailyGoal": 8,
  "interval": 60,
  "snooze": 10,
  "startHour": 8,
  "endHour": 22,
  "sound": true
}
```

| Setting | What it does |
|---|---|
| `name` | what the buddy calls **you** ("Good morning Celsia!") |
| `buddyName` | the title on the card |
| `dailyGoal` | glasses per day |
| `interval` | minutes between visits |
| `snooze` | minutes until she comes back after "Not yet" |
| `startHour` / `endHour` | your day, in 24-hour time (8 = 8 AM, 22 = 10 PM) |

Save, then run `start-buddy.bat` again.

---

## 🎨 Make your own character

You need **7 pictures**. The easiest way is to let an AI image tool (ChatGPT, Gemini, Copilot…) draw them from your photo.

### Step 1: Upload your photo and paste this prompt

Upload 1–3 clear photos of yourself (full body is best), then paste:

> Create a cute 3D Pixar-style chibi caricature of the person in my photo. Keep their face, hairstyle, skin tone, and the outfit from the photo.
>
> Make **7 separate images** of this same character, one pose per image:
> 1. standing, hands clasped, smiling
> 2. waving hello with a big smile
> 3. running to the right (side view), face turned to the camera
> 4. running happily while holding a water bottle
> 5. drinking from a water bottle
> 6. angry: hands on hips, frowning, puffed cheeks
> 7. sad pout, chin resting on both hands (upper body only)
>
> Rules for every image: the character is **looking straight into the camera**, the **whole body is inside the frame with space above the head**, **plain solid pure green background (#00FF00)**, no text, no speech bubbles, no shadows on the ground, high resolution.

**Tips**

- If it gives you **one big sheet** with all 7 poses, ask: *"Now give me each pose as a separate image, same style, green background."*
- Not looking at the camera? Say *"make the eyes look directly at the viewer."*
- Want a different outfit? Describe it: *"wearing a yellow saree"*, *"in a cricket jersey"*…
- The green background matters: the app removes it automatically. Don't use white, since it would eat white clothes.

### Step 2: Name the files and drop them in

Save the 7 pictures into the **`character`** folder with exactly these names:

| # | Pose | File name |
|---|---|---|
| 1 | standing | `idle.png` |
| 2 | waving | `wave.png` |
| 3 | running | `run.png` |
| 4 | running with bottle | `run_happy.png` |
| 5 | drinking | `drink.png` |
| 6 | angry | `angry.png` |
| 7 | pout | `pout.png` |

`.jpg` and `.webp` work too. Missing a pose? Drippy fills in for that one.

### Step 3: Restart

Double-click `start-buddy.bat`. Your caricature is now running around your screen. 💙

> 🔒 **Privacy:** your pictures stay on your computer. The `character` folder is ignored by Git, so they're never uploaded if you fork or contribute.

---

## ❓ Troubleshooting

| Problem | Fix |
|---|---|
| Nothing appears | Check that it's within your day hours. Right-click the tray 💧: the first line says when she'll come next, or why she's waiting |
| Tray says "Waiting — recording (bcastdvr)" | Xbox "Record what happened" is switched on in the background. Turn it off in **Settings → Gaming → Captures**, or remove `bcastdvr.exe` from the `recorders` list in `%APPDATA%\water-buddy\settings.json` |
| I see an old version | Run `stop-buddy.bat`, then `start-buddy.bat` |
| A green outline around the hair | Ask the AI for a *pure #00FF00* background and a higher resolution |
| She doesn't show in my screenshots | That's the "Hide from screen recordings" option. Untick it in the tray menu |

---

## 🤝 Contributing

Ideas, bug reports and pull requests are very welcome!

- 🐛 Found a bug or have an idea? Open an **Issue**.
- 💬 More lines, other languages (Tamil, Hindi…), new reminders (stretch, eye break)? Send a **Pull Request**.
- Please **don't** commit personal photos or characters of real people without their permission.

**How the project is organised**

| File | What it does |
|---|---|
| `main.js` | the desktop app: tray menu, schedule, "don't disturb" checks |
| `renderer.js` | the character's movements, speech and the reminder flow |
| `character.js` / `charprep.js` | loads your pictures, removes the green background, built-in Drippy |
| `style.css`, `index.html` | the speech card and bubbles |
| `config.json` | your name and defaults |

Run from source: `npm install` then `npm start`.

---

## 📄 License

[MIT](LICENSE) © 2026 [Celsia R](https://github.com/CelsiaR). Free to use, change and share. Just keep the credit. 💙
