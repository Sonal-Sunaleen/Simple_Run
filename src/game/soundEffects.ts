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

  private currentTheme: string = 'tokyo_sakura';

  public setTheme(theme: string) {
    if (this.currentTheme === theme) return;
    this.currentTheme = theme;
    if (this.musicPlaying) {
      // Smoothly restart loop with new theme's instrumentation & melodies
      this.stopMusic();
      this.startMusic(theme);
    }
  }

  public startMusic(theme?: string) {
    if (theme) {
      this.currentTheme = theme;
    }
    if (this.musicPlaying || this.isMuted || this.musicVolume <= 0) return;
    this.initCtx();
    if (!this.ctx) return;

    this.musicPlaying = true;
    let step = 0;

    // Theme-specific musical scales & arrangements
    // 1. tokyo_sakura: Insen/Yo Japanese Pentatonic blossom sprint
    // 2. neon_subway: 80s driving Synthwave electro arpeggio
    // 3. royal_kingdom: Regal palace fanfare & cheerful royal bells
    // 4. desert_oasis: Exotic Arabian Hijaz melody with desert pulse
    // 5. cyber_future: 150 BPM energetic cyber-trance laser groove
    const themesData: Record<string, {
      tempoMs: number;
      bassNotes: number[];
      leadNotes: number[];
      bassType: OscillatorType;
      leadType: OscillatorType;
      bassGainMult: number;
      leadGainMult: number;
    }> = {
      tokyo_sakura: {
        tempoMs: 165,
        bassNotes: [146.83, 146.83, 196.0, 220.0, 146.83, 155.56, 196.0, 220.0], // D3, G3, A3, Eb3
        leadNotes: [587.33, 622.25, 783.99, 880.0, 1046.5, 880.0, 783.99, 622.25], // D5, Eb5, G5, A5, C6 (Japanese Insen)
        bassType: 'triangle',
        leadType: 'sine',
        bassGainMult: 0.09,
        leadGainMult: 0.06,
      },
      neon_subway: {
        tempoMs: 155,
        bassNotes: [110.0, 110.0, 130.81, 146.83, 110.0, 110.0, 164.81, 146.83], // A2, C3, D3, E3
        leadNotes: [440.0, 523.25, 659.25, 587.33, 523.25, 659.25, 783.99, 659.25], // A4 Synthwave
        bassType: 'sawtooth',
        leadType: 'sawtooth',
        bassGainMult: 0.08,
        leadGainMult: 0.045,
      },
      royal_kingdom: {
        tempoMs: 175,
        bassNotes: [196.0, 196.0, 246.94, 261.63, 196.0, 220.0, 246.94, 293.66], // G3, B3, C4, D4
        leadNotes: [783.99, 987.77, 1046.5, 1174.66, 1046.5, 987.77, 783.99, 880.0], // G5 Royal Fanfare
        bassType: 'triangle',
        leadType: 'triangle',
        bassGainMult: 0.09,
        leadGainMult: 0.065,
      },
      desert_oasis: {
        tempoMs: 160,
        bassNotes: [146.83, 146.83, 155.56, 185.0, 146.83, 146.83, 220.0, 185.0], // D3, Eb3, F#3, A3 (Hijaz)
        leadNotes: [587.33, 622.25, 739.99, 783.99, 880.0, 783.99, 739.99, 622.25], // D5 Hijaz
        bassType: 'sawtooth',
        leadType: 'sine',
        bassGainMult: 0.08,
        leadGainMult: 0.055,
      },
      cyber_future: {
        tempoMs: 145,
        bassNotes: [130.81, 130.81, 164.81, 174.61, 130.81, 130.81, 196.0, 174.61], // C3, E3, F3, G3
        leadNotes: [523.25, 659.25, 783.99, 987.77, 1046.5, 783.99, 880.0, 659.25], // C5 Cyber
        bassType: 'sawtooth',
        leadType: 'square',
        bassGainMult: 0.08,
        leadGainMult: 0.035,
      },
    };

    const activeThemeData = themesData[this.currentTheme] || themesData.tokyo_sakura;

    this.musicInterval = window.setInterval(() => {
      if (!this.musicPlaying || this.isMuted || !this.ctx || this.musicVolume <= 0) return;

      const now = this.ctx.currentTime;
      const bFreq = activeThemeData.bassNotes[step % activeThemeData.bassNotes.length];
      const lFreq = activeThemeData.leadNotes[(step * 2) % activeThemeData.leadNotes.length];

      // Bass pulse with theme waveform
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();
      bassOsc.type = activeThemeData.bassType;
      bassOsc.frequency.setValueAtTime(bFreq, now);
      bassGain.gain.setValueAtTime(activeThemeData.bassGainMult * this.musicVolume, now);
      bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);
      bassOsc.connect(bassGain);
      bassGain.connect(this.ctx.destination);
      bassOsc.start(now);
      bassOsc.stop(now + 0.15);

      // Lead melody pulse every other step
      if (step % 2 === 0) {
        const leadOsc = this.ctx.createOscillator();
        const leadGain = this.ctx.createGain();
        leadOsc.type = activeThemeData.leadType;
        leadOsc.frequency.setValueAtTime(lFreq, now);
        leadGain.gain.setValueAtTime(activeThemeData.leadGainMult * this.musicVolume, now);
        leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
        leadOsc.connect(leadGain);
        leadGain.connect(this.ctx.destination);
        leadOsc.start(now);
        leadOsc.stop(now + 0.14);
      }

      step++;
    }, activeThemeData.tempoMs);
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
