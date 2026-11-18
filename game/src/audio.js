// Tiny synthesised sound effects through WebAudio. No audio files, no
// network: every sound is an oscillator or a burst of filtered noise.

export function createAudio() {
  let context = null;
  let muted = false;

  function ensure() {
    if (!context) {
      try {
        const Ctor = window.AudioContext || window.webkitAudioContext;
        context = new Ctor();
      } catch {
        context = null;
      }
    }
    if (context && context.state === 'suspended') void context.resume();
    return context;
  }

  function tone(freq, dur, type, gain, slideTo) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(20, slideTo), ctx.currentTime + dur);
    amp.gain.setValueAtTime(gain, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + dur + 0.02);
  }

  function noise(dur, gain, cutoff) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const len = Math.floor(ctx.sampleRate * dur);
    const buffer = ctx.createBuffer(1, len, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i += 1) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = cutoff;
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(gain, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
    src.connect(filter);
    filter.connect(amp);
    amp.connect(ctx.destination);
    src.start();
  }

  const sounds = {
    shoot() { tone(880, 0.07, 'triangle', 0.05, 520); },
    collect(combo) { tone(520 + Math.min(combo, 12) * 40, 0.12, 'sine', 0.09, 980); },
    hit() { tone(160, 0.25, 'sawtooth', 0.12, 60); noise(0.2, 0.1, 900); },
    kill() { tone(320, 0.14, 'square', 0.06, 90); noise(0.12, 0.07, 1600); },
    dash() { noise(0.14, 0.06, 3200); },
    wave() { tone(523, 0.12, 'sine', 0.09); setTimeout(() => tone(659, 0.12, 'sine', 0.09), 110); setTimeout(() => tone(784, 0.2, 'sine', 0.1), 220); },
    upgrade() { tone(440, 0.1, 'sine', 0.08, 660); setTimeout(() => tone(880, 0.16, 'sine', 0.08), 100); },
    boss() { tone(110, 0.5, 'sawtooth', 0.1, 55); },
    win() { [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.22, 'sine', 0.1), i * 140)); },
    lose() { [392, 330, 262, 196].forEach((f, i) => setTimeout(() => tone(f, 0.25, 'triangle', 0.09), i * 160)); },
  };

  return {
    unlock: ensure,
    play(name, arg) { if (sounds[name]) sounds[name](arg); },
    toggleMute() { muted = !muted; return muted; },
    isMuted() { return muted; },
  };
}
