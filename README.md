# HOLLOW

> *A pixelated black-and-white psychological horror point-and-click adventure.*
> You wake on the floor of your living room. You don't remember coming home. You never do.

HOLLOW is a mobile-first horror click-adventure built entirely with **HTML5 Canvas + Web Audio** and packaged as an **Android APK** with Apache Cordova. There are **no external image or sound assets** — every scene is drawn pixel-by-pixel as high-contrast black-and-white manga line art, and every sound is synthesised at runtime. The whole game is a few kilobytes and runs fully offline.

---

## Features

| Spec | Implemented |
|---|---|
| Point-and-click horror | Tap the scene to *look closer*; tap choices to act |
| Multiple branches & endings | **3 endings** driven by your choices & items |
| Inventory system | Collect & inspect items (note, brass key, knife) |
| Dialogue choices that matter | The mirror remembers what you give it |
| Save / Load | **3 save slots** in local storage |
| Manga / anime aesthetic | B/W line art, high-contrast, minimal grays |
| Deliberately pixelated | Low-res buffer scaled with smoothing **off** |
| Uncanny feeling | Off proportions, empty stares, glitch/desync, wrong rooms |
| Psychological (not gory) | Atmosphere of *something not quite right* |
| Minimal eerie sound | Synth drone, room-tone, stingers, knocks |
| Touch-optimized & responsive | Full-screen cover scaling, large tap targets, safe-area aware |
| Menus | **Play · Load Game · Settings · Credits** |
| Settings | **Volume · Text speed · Brightness** |

Playtime: **~3–5 minutes per route.** Try to reach all three endings:
*The Long Way Out* · *There You Are* · *What You Left Behind*.

---

## Project layout

```
www/                 ← the entire game (this is the Cordova web root)
  index.html
  css/style.css
  js/art.js          ← procedural pixel-art renderer (all scenes)
  js/audio.js        ← Web Audio synth (drone, stingers, knocks)
  js/scenes.js       ← the narrative graph (story data)
  js/game.js         ← engine: input, narration, inventory, save/load, menus
config.xml           ← Cordova app config (fullscreen, portrait, dark)
package.json         ← scripts + Cordova deps
.github/workflows/build-apk.yml   ← CI: builds a downloadable debug APK
```

---

## Play it right now (browser, no build)

```bash
npm run serve          # serves www/ at http://localhost:8080
# then open it on your phone or in a desktop browser and tap "tap to begin"
```

(or just open `www/index.html` directly in any modern browser.)

---

## Get the APK

### Option A — download from CI (easiest)
Every push runs **`.github/workflows/build-apk.yml`**, which builds a debug APK and
uploads it as a workflow artifact named **`hollow-debug-apk`**. Open the run under the
repo's **Actions** tab and download the APK from the *Artifacts* section, then install
it on your device (enable *Install unknown apps*).

You can also trigger it manually via **Actions → Build Android APK → Run workflow**.

### Option B — build locally
Requires Node.js, a JDK (17), and the Android SDK.

```bash
npm install -g cordova@12
cordova platform add android        # npm run prepare:android
cordova build android               # npm run build:android
# → debug APK at: platforms/android/app/build/outputs/apk/debug/app-debug.apk
```

For a signed release build:

```bash
cordova build android --release -- --packageType=apk
# then zipalign + apksign with your keystore
```

---

## How the look is achieved

- **Pixelation:** scenes render to a tiny `192×256` buffer, then scale to *cover* the
  screen with `imageSmoothingEnabled = false` and CSS `image-rendering: pixelated`.
- **Uncanny faces:** `uncannyFace()` draws subtly asymmetric heads, eyes set a touch too
  far apart as black voids, and a flat expressionless mouth — with optional `distort`.
- **Wrongness:** one-point-perspective hallways that loop, reflection desync in the mirror,
  CRT scanlines + vignette, deterministic film grain, and screen-shake stingers.
- **Sound:** detuned low oscillators + filtered brown noise for an unstable room-tone,
  with dissonant saw-stack stingers and low sine "knocks."

## Controls

- **Tap the scene** → look closer at things (hotspots glow into description).
- **Tap a choice** → advance the story.
- **Tap while text is typing** → reveal the full line instantly.
- **☰ (top-left)** → pause: resume / save / settings / quit.

---

*Built with HTML5 Canvas & Web Audio. It was never really a game.*
