/**
 * Synthesized Audio Engine using Web Audio API
 * Zero external asset dependencies, zero network lag, zero broken audio files.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private soundVolume: number = 0.8;
  private musicVolume: number = 0.4;
  private musicPlaying: boolean = false;
  private musicInterval: number | null = null;
  private coinPitchStep: number = 0;
  private lastCoinTime: number = 0;

  constructor() {
    // AudioContext will be initialized on first user gesture
  }

  private initCtx() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setVolumes(soundVol: number, musicVol: number) {
    this.soundVolume = Math.max(0, Math.min(1, soundVol));
    this.musicVolume = Math.max(0, Math.min(1, musicVol));
  }

  public toggleMute(): boolean {
    this.isMuted = !this.isMuted;
    if (this.isMuted) {
      this.stopMusic();
    }
    return this.isMuted;
  }

  public getIsMuted(): boolean {
    return this.isMuted;
  }

  public playCoin() {
    if (this.isMuted || this.soundVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = Date.now();
    if (now - this.lastCoinTime < 600) {
      this.coinPitchStep = (this.coinPitchStep + 1) % 8;
    } else {
      this.coinPitchStep = 0;
    }
    this.lastCoinTime = now;

    // Pentatonic scale arpeggio for addictive coin collecting
    const scale = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51];
    const freq = scale[this.coinPitchStep] || 523.25;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.5, this.ctx.currentTime + 0.08);

    gain.gain.setValueAtTime(0.18 * this.soundVolume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.12);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.12);
  }

  public playGem() {
    if (this.isMuted || this.soundVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    // Dual chime sparkle
    [880, 1318.51, 1760].forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = this.ctx.currentTime + i * 0.04;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.2 * this.soundVolume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.25);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.25);
    });
  }

  public playJump() {
    if (this.isMuted || this.soundVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(240, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(620, this.ctx.currentTime + 0.18);

    gain.gain.setValueAtTime(0.25 * this.soundVolume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.2);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.2);
  }

  public playSlide() {
    if (this.isMuted || this.soundVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    // Low swoosh
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(320, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(110, this.ctx.currentTime + 0.22);

    gain.gain.setValueAtTime(0.15 * this.soundVolume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.24);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.24);
  }

  public playHoverboard() {
    if (this.isMuted || this.soundVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    [440, 554.37, 659.25, 880].forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = this.ctx.currentTime + i * 0.05;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime);
      osc.frequency.exponentialRampToValueAtTime(freq * 1.2, startTime + 0.3);

      gain.gain.setValueAtTime(0.22 * this.soundVolume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.35);
    });
  }

  public playPowerup() {
    if (this.isMuted || this.soundVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    // Energetic fanfare
    const notes = [392, 523.25, 659.25, 783.99, 1046.5];
    notes.forEach((freq, idx) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = this.ctx.currentTime + idx * 0.06;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.2 * this.soundVolume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.2);
    });
  }

  public playCrash() {
    if (this.isMuted || this.soundVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    // Noise impact + low boom
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(160, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(30, this.ctx.currentTime + 0.35);

    gain.gain.setValueAtTime(0.35 * this.soundVolume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.4);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.4);
  }

  public playShieldBreak() {
    if (this.isMuted || this.soundVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    // Glass/forcefield pop sound
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(800, this.ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(200, this.ctx.currentTime + 0.25);

    gain.gain.setValueAtTime(0.25 * this.soundVolume, this.ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, this.ctx.currentTime + 0.28);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start();
    osc.stop(this.ctx.currentTime + 0.28);
  }

  public playEmote(type: string = 'wave') {
    if (this.isMuted || this.soundVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    let notes = [523.25, 659.25, 783.99, 1046.5]; // cheerful arpeggio
    if (type === 'spin') {
      notes = [440, 554.37, 659.25, 880, 1108.73];
    } else if (type === 'heart') {
      notes = [587.33, 739.99, 880, 1174.66];
    } else if (type === 'dance') {
      notes = [392, 523.25, 659.25, 783.99, 1046.5];
    } else if (type === 'bow') {
      notes = [440, 523.25, 659.25, 880];
    } else if (type === 'cheer') {
      notes = [523.25, 659.25, 783.99, 1046.5, 1318.51];
    }

    notes.forEach((freq, i) => {
      if (!this.ctx) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const startTime = now + i * 0.06;

      osc.type = type === 'spin' || type === 'heart' ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq, startTime);

      gain.gain.setValueAtTime(0.18 * this.soundVolume, startTime);
      gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.22);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(startTime);
      osc.stop(startTime + 0.22);
    });
  }

  public startMusic() {
    if (this.musicPlaying || this.isMuted || this.musicVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    this.musicPlaying = true;
    let step = 0;
    const bassNotes = [110, 110, 130.81, 146.83, 110, 110, 164.81, 146.83];
    const leadNotes = [440, 523.25, 659.25, 587.33, 523.25, 659.25, 783.99, 659.25];

    const tempoMs = 170; // ~140 BPM subway runner groove
    this.musicInterval = window.setInterval(() => {
      if (!this.musicPlaying || this.isMuted || !this.ctx || this.musicVolume <= 0) return;

      const now = this.ctx.currentTime;
      const bFreq = bassNotes[step % bassNotes.length];
      const lFreq = leadNotes[(step * 2) % leadNotes.length];

      // Bass pulse
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(bFreq, now);
      bassGain.gain.setValueAtTime(0.08 * this.musicVolume, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      bassOsc.connect(bassGain);
      bassGain.connect(this.ctx.destination);
      bassOsc.start(now);
      bassOsc.stop(now + 0.15);

      // Lead melody pulse every other step
      if (step % 2 === 0) {
        const leadOsc = this.ctx.createOscillator();
        const leadGain = this.ctx.createGain();
        leadOsc.type = 'sine';
        leadOsc.frequency.setValueAtTime(lFreq, now);
        leadGain.gain.setValueAtTime(0.05 * this.musicVolume, now);
        leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);
        leadOsc.connect(leadGain);
        leadGain.connect(this.ctx.destination);
        leadOsc.start(now);
        leadOsc.stop(now + 0.13);
      }

      step++;
    }, tempoMs);
  }

  public stopMusic() {
    this.musicPlaying = false;
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }
}

export const soundManager = new SoundEngine();
