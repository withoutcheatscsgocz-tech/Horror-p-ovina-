/* ============================================================
   HOLLOW — Game engine
   Render loop, input mapping, narration, choices, inventory,
   save/load, settings, menu flow. Touch-first.
   ============================================================ */
(function (root) {
  "use strict";

  var H = root.HOLLOW;
  var art = H.art, audio = H.audio, story = H.story;

  /* ---------------- DOM ---------------- */
  var $ = function (id) { return document.getElementById(id); };
  var canvas = $("scene"), ctx = canvas.getContext("2d");
  var veil = $("veil");
  var hud = $("hud"), inventoryEl = $("inventory");
  var storyEl = $("story"), narrationEl = $("narration"), choicesEl = $("choices"), hintEl = $("hint");

  /* ---------------- persistent settings ---------------- */
  var SETTINGS_KEY = "hollow.settings";
  var settings = loadJSON(SETTINGS_KEY) || { volume: 60, textSpeed: 30, brightness: 100 };

  function applySettings() {
    audio.setVolume(settings.volume / 100);
    var b = settings.brightness;
    veil.style.opacity = b >= 100 ? 0 : ((100 - b) / 100 * 0.85).toFixed(3);
    veil.style.background = "#000";
    $("volume").value = settings.volume; $("volumeVal").textContent = settings.volume;
    $("textSpeed").value = settings.textSpeed; $("textSpeedVal").textContent = settings.textSpeed;
    $("brightness").value = settings.brightness; $("brightnessVal").textContent = settings.brightness;
  }

  /* ---------------- game state ---------------- */
  var state = null;            // { node, inventory:[], flags:{}, examined:{} }
  var current = null;          // current node object
  var examineRects = [];       // active hotspots for input mapping
  var unlockedChoices = {};    // examine-unlocked choice ids for this node
  var inGame = false;

  function newGame() {
    state = { node: H.START, inventory: [], flags: {}, examined: {} };
    inGame = true;
    showScreen(null);
    hud.classList.remove("hidden");
    storyEl.classList.remove("hidden");
    enterNode(H.START);
  }

  /* ---------------- node entry ---------------- */
  function enterNode(id) {
    var node = story[id];
    if (!node) { return; }

    // resolve nodes: pick first matching branch, jump immediately
    if (node.resolve) {
      var target = null;
      for (var i = 0; i < node.resolve.length; i++) {
        var r = node.resolve[i];
        if (matches(r)) { target = r.goto; break; }
      }
      enterNode(target || "end_escape");
      return;
    }

    state.node = id;
    current = node;
    unlockedChoices = {};
    examineRects = [];

    // onEnter effects
    if (node.onEnter) {
      applyEffect(node.onEnter);
      if (node.onEnter.sound) playSound(node.onEnter.sound);
    }

    // fade scene art in
    canvas.classList.remove("fade-in"); void canvas.offsetWidth; canvas.classList.add("fade-in");

    // narration
    typeText(node.text || "", node.speaker, false);

    buildChoices();
    renderInventory();

    // hint visibility
    if (node.examine && node.hint) { hintEl.classList.remove("gone"); }
    else { hintEl.classList.add("gone"); }

    // endings: record completion
    if (node.ending) { recordEnding(node.endingName || "an ending"); }
  }

  function buildChoices() {
    choicesEl.innerHTML = "";
    var node = current;

    if (node.ending) {
      addChoiceButton("…", function () { toMenu(); });
      return;
    }
    (node.choices || []).forEach(function (c) {
      if (c.hidden && !unlockedChoices[c.id]) return;
      if (c.hideIfFlag && state.flags[c.hideIfFlag]) return;
      if (c.requireItem && !hasItem(c.requireItem)) return;
      if (c.requireFlag && !state.flags[c.requireFlag]) return;
      addChoiceButton(c.text, function () { chooseChoice(c); });
    });
  }

  function addChoiceButton(label, fn) {
    var btn = document.createElement("button");
    btn.textContent = label;
    btn.addEventListener("click", function () { audio.blip(160); fn(); });
    choicesEl.appendChild(btn);
  }

  function chooseChoice(c) {
    if (c.set) setFlag(c.set);
    if (c.give) giveItem(c.give);
    if (c.take) takeItem(c.take);
    if (c.sound) playSound(c.sound);
    transitionTo(c.goto);
  }

  function transitionTo(id) {
    storyEl.classList.add("fade-out");
    setTimeout(function () {
      storyEl.classList.remove("fade-out");
      enterNode(id);
    }, 240);
  }

  /* ---------------- examine (tap the art) ---------------- */
  function examineAt(nx, ny) {
    if (!current || !current.examine || typing) return false;
    for (var i = 0; i < current.examine.length; i++) {
      var h = current.examine[i];
      if (nx >= h.x && nx <= h.x + h.w && ny >= h.y && ny <= h.y + h.h) {
        var key = state.node + ":" + (h.name || i);
        if (h.oneTime && state.examined[key]) {
          flashNarration("Nothing more here.");
          return true;
        }
        // effects
        if (h.give) giveItem(h.give);
        if (h.set) setFlag(h.set);
        if (h.choiceUnlock) { unlockedChoices[h.choiceUnlock] = true; buildChoices(); }
        if (h.sound) playSound(h.sound);
        state.examined[key] = true;
        typeText(h.text || "", h.name ? h.name.toUpperCase() : "", true);
        hintEl.classList.add("gone");
        audio.blip(120);
        return true;
      }
    }
    return false;
  }

  function flashNarration(t) { typeText(t, "", true); }

  /* ---------------- typewriter ---------------- */
  var typing = false, typeTimer = null, fullText = "", typeIdx = 0, activeSpeaker = "";
  function typeText(text, speaker, examined) {
    clearTimeout(typeTimer);
    narrationEl.classList.toggle("examined", !!examined);
    fullText = text; typeIdx = 0; typing = true; activeSpeaker = speaker || "";
    var prefix = speaker ? '<span class="speaker">' + esc(speaker) + "</span>" : "";
    narrationEl.innerHTML = prefix;
    var body = document.createElement("span");
    narrationEl.appendChild(body);
    var cps = settings.textSpeed;
    if (cps <= 0) { body.textContent = text; typing = false; return; }
    var delay = Math.max(8, 1000 / cps);
    (function step() {
      if (typeIdx >= fullText.length) { typing = false; return; }
      var ch = fullText[typeIdx++];
      body.textContent += ch;
      if (ch !== " " && ch !== "\n" && typeIdx % 2 === 0) audio.blip(90 + (typeIdx % 5) * 6);
      typeTimer = setTimeout(step, ch === "\n" ? delay * 6 : delay);
    })();
  }
  function completeTyping() {
    if (!typing) return false;
    clearTimeout(typeTimer); typing = false;
    var html = (activeSpeaker ? '<span class="speaker">' + esc(activeSpeaker) + "</span>" : "");
    narrationEl.innerHTML = html;
    var body = document.createElement("span");
    body.textContent = fullText; narrationEl.appendChild(body);
    return true;
  }

  /* ---------------- inventory ---------------- */
  function hasItem(name) { return state.inventory.indexOf(name) >= 0; }
  function giveItem(name) { if (!hasItem(name)) { state.inventory.push(name); renderInventory(); } }
  function takeItem(name) { var i = state.inventory.indexOf(name); if (i >= 0) { state.inventory.splice(i, 1); renderInventory(); } }
  function renderInventory() {
    inventoryEl.innerHTML = "";
    state.inventory.forEach(function (name) {
      var el = document.createElement("div");
      el.className = "inv-item"; el.textContent = name;
      el.addEventListener("click", function () {
        audio.blip(140);
        flashNarration(ITEM_DESC[name] || ("You're carrying the " + name + "."));
      });
      inventoryEl.appendChild(el);
    });
  }
  var ITEM_DESC = {
    "folded note": "A note, soft from handling, in your own handwriting. It warns you about the house.",
    "brass key": "A brass key, still faintly warm. It fits the front door.",
    "kitchen knife": "A kitchen knife whose handle fits your grip too perfectly.",
    "photograph": "A photograph of three people. The middle figure has been scratched out."
  };

  /* ---------------- flags / effects / conditions ---------------- */
  function setFlag(f) { state.flags[f] = true; }
  function applyEffect(e) {
    if (!e) return;
    if (e.set) (Array.isArray(e.set) ? e.set : [e.set]).forEach(setFlag);
    if (e.give) (Array.isArray(e.give) ? e.give : [e.give]).forEach(giveItem);
    if (e.take) (Array.isArray(e.take) ? e.take : [e.take]).forEach(takeItem);
  }
  function matches(r) {
    if (r.ifFlag && !state.flags[r.ifFlag]) return false;
    if (r.ifFlagAlso && !state.flags[r.ifFlagAlso]) return false;
    if (r.notFlag && state.flags[r.notFlag]) return false;
    if (r.notFlagB && state.flags[r.notFlagB]) return false;
    if (r.ifItem && !hasItem(r.ifItem)) return false;
    return true;
  }

  /* ---------------- sound dispatch ---------------- */
  function playSound(name) {
    if (name === "stinger") { audio.stinger(); glitchPulse(0.9, 6); }
    else if (name === "knock") audio.knock();
    else if (name === "blip") audio.blip();
  }

  /* ---------------- render loop ---------------- */
  var glitchUntil = 0, shakeMag = 0;
  function glitchPulse(seconds, shake) { glitchUntil = performance.now() + seconds * 1000; shakeMag = shake || 4; }

  function resize() {
    var dpr = Math.min(2, root.devicePixelRatio || 1);
    canvas.width = Math.floor(root.innerWidth * dpr);
    canvas.height = Math.floor(root.innerHeight * dpr);
  }

  function frame(now) {
    var t = now / 1000;
    var sceneId = current ? current.art : "title";
    var glitch = !!(current && current.glitch) || now < glitchUntil;
    var shake = (now < glitchUntil ? shakeMag : 0) + (current && current.shake ? current.shake : 0);
    art.render(ctx, sceneId, t, glitch, shake);
    requestAnimationFrame(frame);
  }

  /* ---------------- input ---------------- */
  function canvasTap(clientX, clientY) {
    if (!inGame) return;
    if (completeTyping()) return;             // first tap finishes the line
    var dpr = Math.min(2, root.devicePixelRatio || 1);
    var rect = canvas.getBoundingClientRect();
    var pxx = (clientX - rect.left) * dpr;
    var pxy = (clientY - rect.top) * dpr;
    var scale = Math.max(canvas.width / art.BW, canvas.height / art.BH);
    var dw = art.BW * scale, dh = art.BH * scale;
    var ox = (canvas.width - dw) / 2, oy = (canvas.height - dh) / 2;
    var bx = (pxx - ox) / scale, by = (pxy - oy) / scale;
    examineAt(bx / art.BW, by / art.BH);
  }
  canvas.addEventListener("pointerdown", function (e) { canvasTap(e.clientX, e.clientY); });

  /* ============================================================
     SAVE / LOAD  (3 slots)
     ============================================================ */
  var SAVE_PREFIX = "hollow.save.";
  function slotKey(i) { return SAVE_PREFIX + i; }
  function saveToSlot(i) {
    if (!state) return;
    var meta = {
      state: state,
      node: state.node,
      label: nodeLabel(state.node),
      time: Date.now()
    };
    localStorage.setItem(slotKey(i), JSON.stringify(meta));
  }
  function loadFromSlot(i) {
    var m = loadJSON(slotKey(i));
    if (!m) return false;
    state = m.state;
    state.examined = state.examined || {};
    inGame = true;
    showScreen(null);
    hud.classList.remove("hidden"); storyEl.classList.remove("hidden");
    enterNode(state.node);
    return true;
  }
  function nodeLabel(id) {
    var n = story[id];
    if (!n) return "…";
    if (n.ending) return n.endingName || "ending";
    if (id === "wake") return "The waking";
    var a = (n.art || "").replace("_", " ");
    return "In the " + (a || "house");
  }
  function recordEnding(name) {
    var seen = loadJSON("hollow.endings") || {};
    seen[name] = Date.now();
    localStorage.setItem("hollow.endings", JSON.stringify(seen));
  }

  function buildSlots(mode) {                 // mode: "load" | "save"
    var wrap = $("slots"); wrap.innerHTML = "";
    $("loadTitle").textContent = mode === "save" ? "SAVE GAME" : "LOAD GAME";
    for (var i = 0; i < 3; i++) {
      (function (i) {
        var m = loadJSON(slotKey(i));
        var el = document.createElement("button");
        el.className = "slot" + (m ? "" : (mode === "load" ? " empty" : ""));
        var title = document.createElement("div"); title.className = "slot-title";
        var meta = document.createElement("div"); meta.className = "slot-meta";
        title.textContent = "SLOT " + (i + 1) + (m ? " — " + m.label : (mode === "save" ? " — empty" : " — empty"));
        meta.textContent = m ? new Date(m.time).toLocaleString() : (mode === "save" ? "tap to save here" : "no save");
        el.appendChild(title); el.appendChild(meta);
        el.addEventListener("click", function () {
          audio.blip(160);
          if (mode === "save") { saveToSlot(i); buildSlots("save"); }
          else { if (m) loadFromSlot(i); }
        });
        if (mode === "load" && !m) el.disabled = false; // still tappable, just inert
        wrap.appendChild(el);
      })(i);
    }
  }

  /* ============================================================
     SCREEN / MENU FLOW
     ============================================================ */
  var SCREENS = ["menu", "settings", "credits", "load", "pause"];
  var prevScreen = "menu";
  function showScreen(id) {
    SCREENS.forEach(function (s) { $(s).classList.toggle("hidden", s !== id); });
    if (id === null) { /* in-game */ }
  }
  function toMenu() {
    inGame = false; current = null;
    hud.classList.add("hidden"); storyEl.classList.add("hidden");
    showScreen("menu");
  }

  // main menu buttons
  $("menu").addEventListener("click", function (e) {
    var act = e.target.getAttribute && e.target.getAttribute("data-act");
    if (!act) return;
    audio.blip(160);
    if (act === "play") newGame();
    else if (act === "load") { prevScreen = "menu"; buildSlots("load"); showScreen("load"); }
    else if (act === "settings") { prevScreen = "menu"; showScreen("settings"); }
    else if (act === "credits") { prevScreen = "menu"; showScreen("credits"); }
  });

  // back buttons (settings/credits/load)
  ["settings", "credits", "load"].forEach(function (s) {
    $(s).addEventListener("click", function (e) {
      if (e.target.getAttribute("data-act") === "back") {
        audio.blip(120); saveJSON(SETTINGS_KEY, settings);
        if (prevScreen === "pause") showScreen("pause"); else showScreen("menu");
      }
    });
  });

  // pause menu
  $("menuBtn").addEventListener("click", function () { audio.blip(160); showScreen("pause"); });
  $("pause").addEventListener("click", function (e) {
    var act = e.target.getAttribute && e.target.getAttribute("data-act");
    if (!act) return;
    audio.blip(160);
    if (act === "resume") showScreen(null);
    else if (act === "save") { prevScreen = "pause"; buildSlots("save"); showScreen("load"); }
    else if (act === "opensettings") { prevScreen = "pause"; showScreen("settings"); }
    else if (act === "quit") toMenu();
  });

  // settings sliders
  $("volume").addEventListener("input", function (e) { settings.volume = +e.target.value; applySettings(); });
  $("textSpeed").addEventListener("input", function (e) { settings.textSpeed = +e.target.value; applySettings(); });
  $("brightness").addEventListener("input", function (e) { settings.brightness = +e.target.value; applySettings(); });

  /* ---------------- tap to start (audio gesture) ---------------- */
  $("tapToStart").addEventListener("click", function () {
    audio.start();
    $("tapToStart").classList.add("hidden");
    showScreen("menu");
  });

  /* ---------------- utils ---------------- */
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" })[c]; }); }
  function loadJSON(k) { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } }
  function saveJSON(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }

  /* ---------------- boot ---------------- */
  function boot() {
    resize();
    root.addEventListener("resize", resize);
    applySettings();
    showScreen("menu");                 // behind the tap-to-start veil
    requestAnimationFrame(frame);
  }
  boot();

})(window);
