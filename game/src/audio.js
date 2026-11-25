// All sound is synthesized with WebAudio — no audio files, no network. Short
// blips for chops and pickups, a sizzle loop while a pan cooks, a ding for a serve
// and a low buzz for a mistake.
export function createAudio() {
  let context = null;
  let muted = false;
  let sizzle = null;

  function ensure() {
    if (!context) {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return null;
      context = new AudioContext();
    }
    if (context.state === 'suspended') void context.resume();
    return context;
  }

  function tone(frequency, duration, type, gainValue, slideTo) {
    if (muted) return;
    const ctx = ensure();
    if (!ctx) return;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, ctx.currentTime);
    if (slideTo) oscillator.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
    gain.gain.setValueAtTime(gainValue, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    oscillator.connect(gain).connect(ctx.destination);
    oscillator.start();
    oscillator.stop(ctx.currentTime + duration);
  }

  return {
    unlock() {
      ensure();
    },
    toggleMute() {
      muted = !muted;
      if (muted) this.stopSizzle();
      return muted;
    },
    get muted() {
      return muted;
    },
    chop(perfect) {
      tone(perfect ? 880 : 520, 0.08, 'square', 0.12);
      tone(perfect ? 1320 : 700, 0.12, 'triangle', 0.1, perfect ? 1760 : 900);
    },
    pickup() {
      tone(440, 0.07, 'sine', 0.1, 660);
    },
    serve() {
      tone(523, 0.12, 'triangle', 0.14);
      setTimeout(() => tone(784, 0.18, 'triangle', 0.14), 90);
      setTimeout(() => tone(1046, 0.24, 'triangle', 0.12), 180);
    },
    error() {
      tone(160, 0.2, 'sawtooth', 0.1, 110);
    },
    expire() {
      tone(330, 0.25, 'sawtooth', 0.1, 180);
    },
    win() {
      [523, 659, 784, 1046].forEach((frequency, index) => {
        setTimeout(() => tone(frequency, 0.25, 'triangle', 0.14), index * 130);
      });
    },
    startSizzle() {
      if (muted || sizzle) return;
      const ctx = ensure();
      if (!ctx) return;
      const length = ctx.sampleRate * 1;
      const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 5200;
      filter.Q.value = 0.6;
      const gain = ctx.createGain();
      gain.gain.value = 0.035;
      source.connect(filter).connect(gain).connect(ctx.destination);
      source.start();
      sizzle = { source, gain };
    },
    stopSizzle() {
      if (!sizzle) return;
      try {
        sizzle.source.stop();
      } catch {
        // Already stopped.
      }
      sizzle = null;
    },
  };
}
