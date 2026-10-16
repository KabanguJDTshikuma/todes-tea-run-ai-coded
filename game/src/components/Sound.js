const VOLUME = 0.08;

export class Sound {
  constructor(onError) {
    this.context = null;
    this.muted = false;
    this.volume = 1;
    this.failed = false;
    this.voices = new Set();
    this.onError = onError;
  }

  async enable() {
    if (this.muted || this.failed) {
      return;
    }

    try {
      if (!this.context) {
        this.context = new AudioContext();
      }

      if (this.context.state === 'suspended') {
        await this.context.resume();
      }
    } catch (error) {
      this.failed = true;
      this.stop();
      console.warn('Game audio is unavailable.', error);
      this.onError();
    }
  }

  toggleMute() {
    this.muted = !this.muted;
    this.stop();

    if (!this.muted) {
      void this.enable();
    }
  }

  setVolume(volume) {
    if (!Number.isFinite(volume) || volume < 0 || volume > 1) {
      throw new Error('Sound volume must be between 0 and 1.');
    }
    this.volume = volume;
    this.stop();
  }

  tone(startFrequency, endFrequency, duration, delay = 0, type = 'sine') {
    if (this.muted || this.volume === 0 || this.failed || this.context?.state !== 'running'
      || document.hidden || !document.hasFocus()) {
      return;
    }

    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    const start = this.context.currentTime + delay;
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, start);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    gain.gain.setValueAtTime(0, start);
    gain.gain.linearRampToValueAtTime(VOLUME * this.volume, start + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain);
    gain.connect(this.context.destination);
    this.voices.add(oscillator);
    oscillator.onended = () => {
      oscillator.disconnect();
      gain.disconnect();
      this.voices.delete(oscillator);
    };
    oscillator.start(start);
    oscillator.stop(start + duration + 0.01);
  }

  attack() {
    this.tone(450, 110, 0.14, 0, 'triangle');
  }

  defeat() {
    this.tone(600, 1000, 0.12, 0.04);
  }

  hit() {
    this.tone(220, 90, 0.16, 0, 'sawtooth');
  }

  lowHealth() {
    this.tone(110, 70, 0.08, 0, 'triangle');
    this.tone(100, 60, 0.08, 0.12, 'triangle');
  }

  superCroak() {
    this.tone(150, 450, 0.25, 0, 'sawtooth');
    this.tone(300, 800, 0.35, 0.08, 'triangle');
  }

  gameOver() {
    this.stop();
    this.tone(300, 200, 0.18, 0, 'triangle');
    this.tone(200, 80, 0.3, 0.18, 'triangle');
  }

  stop() {
    for (const oscillator of this.voices) {
      oscillator.stop();
    }
    this.voices.clear();
  }
}
