/* ============================================================
   HOLLOW — Procedural eerie audio (Web Audio API)
   A low room-tone drone, occasional unease, and sharp stingers.
   No audio files. Everything synthesised. Respects volume.
   ============================================================ */
(function (root) {
  "use strict";

  var ctx = null, master = null, droneGain = null;
  var droneNodes = [];
  var volume = 0.6;
  var started = false;

  function ensure() {
    if (ctx) return;
    var AC = root.AudioContext || root.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    if (master) master.gain.setTargetAtTime(volume, ctx.currentTime, 0.05);
  }

  // brown-ish noise buffer for breath/room tone
  function noiseBuffer(seconds) {
    var len = (ctx.sampleRate * seconds) | 0;
    var buf = ctx.createBuffer(1, len, ctx.sampleRate);
    var d = buf.getChannelData(0), last = 0;
    for (var i = 0; i < len; i++) {
      var w = Math.random() * 2 - 1;
      last = (last + 0.02 * w) / 1.02;
      d[i] = last * 3.5;
    }
    return buf;
  }

  function startDrone() {
    if (!ctx || droneNodes.length) return;
    droneGain = ctx.createGain();
    droneGain.gain.value = 0.0;
    droneGain.gain.setTargetAtTime(0.18, ctx.currentTime, 4);
    droneGain.connect(master);

    // two detuned low oscillators = unstable hum
    [55, 55.4, 82.1].forEach(function (f, i) {
      var o = ctx.createOscillator();
      o.type = i === 2 ? "triangle" : "sine";
      o.frequency.value = f;
      var g = ctx.createGain();
      g.gain.value = i === 2 ? 0.06 : 0.12;
      // slow LFO on gain for "breathing"
      var lfo = ctx.createOscillator();
      lfo.frequency.value = 0.05 + i * 0.02;
      var lg = ctx.createGain(); lg.gain.value = 0.05;
      lfo.connect(lg); lg.connect(g.gain);
      o.connect(g); g.connect(droneGain);
      o.start(); lfo.start();
      droneNodes.push(o, lfo);
    });

    // filtered room-tone noise
    var src = ctx.createBufferSource();
    src.buffer = noiseBuffer(8); src.loop = true;
    var lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 320;
    var ng = ctx.createGain(); ng.gain.value = 0.12;
    src.connect(lp); lp.connect(ng); ng.connect(droneGain);
    src.start();
    droneNodes.push(src);
  }

  function stopDrone() {
    if (droneGain) droneGain.gain.setTargetAtTime(0, ctx.currentTime, 0.6);
    droneNodes.forEach(function (n) { try { n.stop(ctx.currentTime + 1.2); } catch (e) {} });
    droneNodes = [];
  }

  // sharp dissonant stinger for scares
  function stinger() {
    if (!ctx) return;
    var t = ctx.currentTime;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.0, t);
    g.gain.linearRampToValueAtTime(0.5, t + 0.005);
    g.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    g.connect(master);
    [440, 466, 622].forEach(function (f) {
      var o = ctx.createOscillator();
      o.type = "sawtooth"; o.frequency.value = f;
      o.connect(g); o.start(t); o.stop(t + 0.9);
    });
    // noise burst
    var s = ctx.createBufferSource(); s.buffer = noiseBuffer(0.4);
    var hp = ctx.createBiquadFilter(); hp.type = "highpass"; hp.frequency.value = 1200;
    var ng = ctx.createGain();
    ng.gain.setValueAtTime(0.4, t); ng.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    s.connect(hp); hp.connect(ng); ng.connect(master);
    s.start(t); s.stop(t + 0.5);
  }

  // soft UI click / footstep
  function blip(freq) {
    if (!ctx) return;
    var t = ctx.currentTime;
    var o = ctx.createOscillator(); o.type = "square"; o.frequency.value = freq || 180;
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.12, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.08);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.09);
  }

  // a single distant knock / creak
  function knock() {
    if (!ctx) return;
    var t = ctx.currentTime;
    var o = ctx.createOscillator(); o.type = "sine"; o.frequency.setValueAtTime(90, t);
    o.frequency.exponentialRampToValueAtTime(45, t + 0.2);
    var g = ctx.createGain();
    g.gain.setValueAtTime(0.3, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.3);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.3);
  }

  function resume() { if (ctx && ctx.state === "suspended") ctx.resume(); }

  function start() {
    ensure(); resume();
    if (!started) { startDrone(); started = true; }
  }

  root.HOLLOW = root.HOLLOW || {};
  root.HOLLOW.audio = {
    start: start, resume: resume, setVolume: setVolume,
    stinger: stinger, blip: blip, knock: knock,
    stopDrone: stopDrone, startDrone: function () { started = true; startDrone(); }
  };
})(window);
