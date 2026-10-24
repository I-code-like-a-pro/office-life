/* OfficeLife audio: everything is synthesized with WebAudio, so there are no sound files. */
(function () {
'use strict';
let ctx = null, master = null, muted = false, noiseBuf = null, ambient = null, ambientF = null, pendingScene = 'apartment';
let volume = 0.7, musicVol = 0.5, musicOn = true;
try { const s = JSON.parse(localStorage.getItem('officelife.audio') || '{}'); if (typeof s.volume === 'number') volume = s.volume; if (s.muted) muted = true; if (typeof s.musicVol === 'number') musicVol = s.musicVol; if (s.musicOn === false) musicOn = false; } catch (e) {}

function persist() { try { localStorage.setItem('officelife.audio', JSON.stringify({ volume, muted, musicVol, musicOn })); } catch (e) {} }

/* ---- lo-fi music: soft chord pad, mellow bass and sparse pentatonic plucks, all generated live ---- */
let musicGain = null, musicTimer = null, nextT = 0, step = 0, rainSrc = null, rainGain = null;
const ROOT = 48;                                           // C3
const CHORDS = [[0, 4, 7, 11], [9, 12, 16, 19], [2, 5, 9, 12], [7, 11, 14, 17]];   // Cmaj7 Am7 Dm7 G7
const PENT = [0, 2, 4, 7, 9, 12, 14, 16];
const hz = n => 440 * Math.pow(2, (n - 69) / 12);
function note(freq, t, dur, vol, type, attack) {
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + (attack || 0.02)); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(musicGain); o.start(t); o.stop(t + dur + 0.05);
}
function musicStep(t, i) {
  const bar = Math.floor(i / 16) % CHORDS.length, ch = CHORDS[bar], e = i % 16;
  if (e === 0) ch.forEach((n, k) => note(hz(ROOT + 12 + n), t, 6.5, 0.045, 'triangle', 0.5 + k * 0.05));
  if (e === 0 || e === 8) note(hz(ROOT - 12 + ch[0]), t, 1.6, 0.11, 'sine', 0.03);
  if ((e === 6 || e === 14) && Math.random() < 0.7) note(hz(ROOT + 24 + ch[Math.floor(Math.random() * 3)] + (Math.random() < 0.3 ? 12 : 0)), t, 1.2, 0.03, 'sine', 0.01);
  else if (e % 4 === 2 && Math.random() < 0.38) note(hz(ROOT + 24 + PENT[Math.floor(Math.random() * PENT.length)]), t + (Math.random() * 0.05), 1.0, 0.025, 'sine', 0.01);
  if (e % 2 === 1) noise(0.03, 7000, 0.7, 0.012, 'highpass');       // soft hi-hat tick
}
function startMusic() {
  if (!ctx || musicTimer || !musicOn) return;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2400;
  musicGain = ctx.createGain(); musicGain.gain.value = musicVol * 1.4; musicGain.connect(lp); lp.connect(master);
  nextT = ctx.currentTime + 0.15; step = 0;
  musicTimer = setInterval(() => { while (nextT < ctx.currentTime + 0.5) { musicStep(nextT, step); nextT += 60 / 68 / 2 + (step % 2 ? 0.02 : 0); step++; } }, 150);
}
function stopMusic() { if (musicTimer) { clearInterval(musicTimer); musicTimer = null; } if (musicGain) { try { musicGain.disconnect(); } catch (e) {} musicGain = null; } }
function init() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = muted ? 0 : volume; master.connect(ctx.destination);
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 1, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  startAmbient();
}
function noise(dur, freq, q, vol, type) {
  if (!ctx) return;
  const src = ctx.createBufferSource(); src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = type || 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); const t = ctx.currentTime;
  g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f); f.connect(g); g.connect(master); src.start(t, Math.random() * 0.5); src.stop(t + dur + 0.02);
}
function tone(freq, dur, vol, type, when, slideTo) {
  if (!ctx) return;
  const t = ctx.currentTime + (when || 0);
  const o = ctx.createOscillator(), g = ctx.createGain();
  o.type = type || 'sine'; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + dur + 0.02);
}
function startAmbient() {
  // soft air-conditioning hum + distant office murmur
  const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
  const g = ctx.createGain(); g.gain.value = 0.05;
  src.connect(f); f.connect(g); g.connect(master); src.start();
  ambient = g; ambientF = f;
}
const Sfx = {
  init() { init(); this.scene(pendingScene); startMusic(); },
  music(on) { musicOn = on; persist(); if (on) startMusic(); else stopMusic(); },
  setMusicVolume(v) { musicVol = v; if (musicGain) musicGain.gain.value = v * 1.4; persist(); },
  get musicOn() { return musicOn; }, get musicVolume() { return musicVol; },
  rain(on, level) {
    if (!ctx) return;
    if (on && !rainSrc) {
      rainSrc = ctx.createBufferSource(); rainSrc.buffer = noiseBuf; rainSrc.loop = true;
      const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 1800; rainGain = ctx.createGain(); rainGain.gain.value = 0;
      rainSrc.connect(f); f.connect(rainGain); rainGain.connect(master); rainSrc.start();
    }
    if (rainGain) rainGain.gain.linearRampToValueAtTime(on ? 0.05 * (level == null ? 1 : level) : 0, ctx.currentTime + 1);
  },
  purr() { if (ctx) { tone(58, 0.9, 0.05, 'sawtooth'); tone(62, 0.9, 0.04, 'sawtooth', 0.05); } },
  coin() { tone(988, 0.08, 0.09, 'square'); tone(1319, 0.16, 0.09, 'square', 0.07); },
  /* ambience per location: quiet flat, traffic outside, office murmur */
  scene(id) {
    pendingScene = id; if (!ctx || !ambient) return;
    const cfg = { apartment: [0.015, 300], street: [0.1, 1100], lobby: [0.035, 450], office: [0.05, 380] }[id] || [0.04, 380], t = ctx.currentTime;
    ambient.gain.linearRampToValueAtTime(cfg[0], t + 0.8); ambientF.frequency.linearRampToValueAtTime(cfg[1], t + 0.8);
  },
  /* vol 0..1 scales the loudness (use distance falloff for coworkers) */
  key(vol) { if (ctx && vol > 0.01) noise(0.04, 2200 + Math.random() * 1600, 1.2, 0.18 * vol); },
  step() { if (ctx) noise(0.09, 160 + Math.random() * 60, 0.8, 0.22, 'lowpass'); },
  ping() { tone(880, 0.16, 0.12, 'sine'); tone(1320, 0.22, 0.1, 'sine', 0.09); },
  urgent() { tone(660, 0.14, 0.14, 'square'); tone(660, 0.14, 0.14, 'square', 0.2); tone(880, 0.2, 0.14, 'square', 0.4); },
  good() { tone(523, 0.12, 0.12, 'triangle'); tone(659, 0.12, 0.12, 'triangle', 0.1); tone(784, 0.25, 0.12, 'triangle', 0.2); },
  bad() { tone(220, 0.28, 0.14, 'sawtooth', 0, 140); },
  click() { noise(0.03, 3000, 2, 0.12); },
  clockIn() { tone(660, 0.2, 0.14, 'sine'); tone(990, 0.35, 0.14, 'sine', 0.15); },
  alarm() { [0, 0.25, 0.5].forEach(w => tone(740, 0.18, 0.16, 'square', w)); },
  fanfare() { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.3, 0.14, 'triangle', i * 0.14)); },
  setVolume(v) { volume = v; if (master && !muted) master.gain.value = v; persist(); },
  toggleMute() { muted = !muted; if (master) master.gain.value = muted ? 0 : volume; persist(); return muted; },
  get muted() { return muted; },
  get volume() { return volume; },
};
window.Sfx = Sfx;
})();
