class SoundManager {
  constructor() {
    this.ctx = null;
    this.muted = false;
  }

  init() {
    if (!this.ctx) {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AudioContext();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playTone(freq, duration, startTime, gainVal = 0.35) {
    if (this.muted || !this.ctx) return;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sine';
    osc1.frequency.setValueAtTime(freq, startTime);

    osc2.type = 'sine';
    osc2.frequency.setValueAtTime(freq * 2, startTime);

    gain.gain.setValueAtTime(0.001, startTime);
    gain.gain.exponentialRampToValueAtTime(gainVal, startTime + Math.min(0.01, duration * 0.2));
    gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.ctx.destination);

    osc1.start(startTime);
    osc2.start(startTime);
    osc1.stop(startTime + duration + 0.02);
    osc2.stop(startTime + duration + 0.02);
  }

  play(name) {
    this.init();
    if (!this.ctx || this.muted) return;
    const now = this.ctx.currentTime;

    switch (name) {
      case 'agarrar':
        this.playTone(440, 0.05, now, 0.25);
        break;
      case 'click':
        this.playTone(660, 0.06, now, 0.3);
        break;
      case 'colocar':
        this.playTone(523, 0.08, now, 0.35);
        this.playTone(784, 0.25, now + 0.08, 0.35);
        break;
      case 'final':
        this.playTone(523, 0.14, now, 0.35);
        this.playTone(659, 0.14, now + 0.14, 0.35);
        this.playTone(784, 0.14, now + 0.28, 0.35);
        this.playTone(1047, 0.55, now + 0.42, 0.4);
        break;
    }
  }
}

export const soundManager = new SoundManager();
