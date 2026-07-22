export type AudioMood = 'menu' | 'game' | 'paused' | 'result';
export type SoundEffect =
  | 'navigate'
  | 'confirm'
  | 'shoot'
  | 'hit'
  | 'kill'
  | 'hurt'
  | 'pickup'
  | 'levelUp'
  | 'pause'
  | 'gameOver';

const LOOKAHEAD_MS = 80;
const SCHEDULE_AHEAD_SECONDS = 0.16;

export class AudioManager {
  private static instance?: AudioManager;

  static getInstance(): AudioManager {
    AudioManager.instance ??= new AudioManager();
    return AudioManager.instance;
  }

  private context?: AudioContext;
  private masterGain?: GainNode;
  private bgmGain?: GainNode;
  private sfxGain?: GainNode;
  private nextStepAt = 0;
  private sequenceStep = 0;
  private mood: AudioMood = 'menu';
  private resumePromise?: Promise<void>;
  private musicStarted = false;
  private readonly padOscillators: OscillatorNode[] = [];
  private readonly padGains: GainNode[] = [];

  private constructor() {
    const unlockFromFirstGesture = (): void => {
      this.unlock();
      window.removeEventListener('pointerdown', unlockFromFirstGesture);
      window.removeEventListener('keydown', unlockFromFirstGesture);
    };
    window.addEventListener('pointerdown', unlockFromFirstGesture);
    window.addEventListener('keydown', unlockFromFirstGesture);
  }

  unlock(): void {
    if (!this.context) {
      this.createGraph();
    }
    if (!this.context || this.context.state === 'running') {
      this.startMusic();
      return;
    }
    this.resumePromise ??= this.context.resume().then(() => {
      this.startMusic();
    }).finally(() => {
      this.resumePromise = undefined;
    });
  }

  setMood(mood: AudioMood): void {
    this.mood = mood;
    if (!this.context || !this.bgmGain) {
      return;
    }
    const volume = mood === 'paused' ? 0.16 : mood === 'result' ? 0.36 : mood === 'game' ? 0.48 : 0.42;
    this.bgmGain.gain.cancelScheduledValues(this.context.currentTime);
    this.bgmGain.gain.linearRampToValueAtTime(volume, this.context.currentTime + 0.22);
    this.updateMusicBed();
  }

  play(effect: SoundEffect): void {
    if (!this.context || !this.sfxGain) {
      return;
    }
    const now = this.context.currentTime;
    switch (effect) {
      case 'navigate':
        this.tone(480, now, 0.065, 0.13, 'square', this.sfxGain);
        break;
      case 'confirm':
        this.tone(520, now, 0.08, 0.15, 'triangle', this.sfxGain);
        this.tone(780, now + 0.055, 0.11, 0.13, 'triangle', this.sfxGain);
        break;
      case 'shoot':
        this.sweep(920, 520, now, 0.075, 0.12, 'square');
        break;
      case 'hit':
        this.sweep(260, 130, now, 0.07, 0.13, 'sawtooth');
        break;
      case 'kill':
        this.tone(392, now, 0.08, 0.14, 'square', this.sfxGain);
        this.tone(659, now + 0.04, 0.13, 0.15, 'triangle', this.sfxGain);
        break;
      case 'hurt':
        this.sweep(180, 72, now, 0.22, 0.2, 'sawtooth');
        break;
      case 'pickup':
        this.tone(880, now, 0.055, 0.1, 'sine', this.sfxGain);
        this.tone(1175, now + 0.035, 0.07, 0.09, 'sine', this.sfxGain);
        break;
      case 'levelUp':
        [523, 659, 784, 1047].forEach((frequency, index) => {
          this.tone(frequency, now + index * 0.07, 0.18, 0.085, 'triangle', this.sfxGain!);
        });
        break;
      case 'pause':
        this.sweep(440, 220, now, 0.16, 0.07, 'triangle');
        break;
      case 'gameOver':
        [220, 185, 147, 110].forEach((frequency, index) => {
          this.tone(frequency, now + index * 0.16, 0.32, 0.1, 'sawtooth', this.sfxGain!);
        });
        break;
    }
  }

  private createGraph(): void {
    this.context = new AudioContext();
    this.masterGain = this.context.createGain();
    this.bgmGain = this.context.createGain();
    this.sfxGain = this.context.createGain();
    const compressor = this.context.createDynamicsCompressor();

    this.masterGain.gain.value = 0.95;
    this.bgmGain.gain.value = 0.42;
    this.sfxGain.gain.value = 0.95;
    this.bgmGain.connect(this.masterGain);
    this.sfxGain.connect(this.masterGain);
    this.masterGain.connect(compressor);
    compressor.connect(this.context.destination);

    this.createMusicBed();

    this.nextStepAt = this.context.currentTime + 0.05;
    window.setInterval(() => this.scheduleMusic(), LOOKAHEAD_MS);
  }

  private startMusic(): void {
    if (!this.context || !this.bgmGain || this.musicStarted) {
      return;
    }
    this.musicStarted = true;
    const now = this.context.currentTime;
    this.nextStepAt = now + 0.03;
    [261.63, 329.63, 392].forEach((frequency, index) => {
      this.tone(frequency, now + index * 0.06, 0.34, 0.18, 'triangle', this.bgmGain!);
    });
    this.updateMusicBed();
    this.scheduleMusic();
  }

  private createMusicBed(): void {
    if (!this.context || !this.bgmGain) {
      return;
    }
    [1, 1.5].forEach((ratio, index) => {
      const oscillator = this.context!.createOscillator();
      const gain = this.context!.createGain();
      oscillator.type = index === 0 ? 'triangle' : 'sine';
      oscillator.frequency.value = 130.81 * ratio;
      gain.gain.value = index === 0 ? 0.11 : 0.055;
      oscillator.connect(gain);
      gain.connect(this.bgmGain!);
      oscillator.start();
      this.padOscillators.push(oscillator);
      this.padGains.push(gain);
    });
  }

  private updateMusicBed(): void {
    if (!this.context || this.padOscillators.length === 0) {
      return;
    }
    const root = this.mood === 'game' ? 146.83 : this.mood === 'result' ? 98 : this.mood === 'paused' ? 110 : 130.81;
    const now = this.context.currentTime;
    this.padOscillators.forEach((oscillator, index) => {
      oscillator.frequency.cancelScheduledValues(now);
      oscillator.frequency.linearRampToValueAtTime(root * (index === 0 ? 1 : 1.5), now + 0.18);
    });
    this.padGains.forEach((gain, index) => {
      const level = this.mood === 'paused' ? (index === 0 ? 0.045 : 0.02) : (index === 0 ? 0.11 : 0.055);
      gain.gain.cancelScheduledValues(now);
      gain.gain.linearRampToValueAtTime(level, now + 0.18);
    });
  }

  private scheduleMusic(): void {
    if (!this.context || !this.bgmGain) {
      return;
    }
    while (this.nextStepAt < this.context.currentTime + SCHEDULE_AHEAD_SECONDS) {
      this.scheduleMusicStep(this.nextStepAt, this.sequenceStep);
      this.sequenceStep = (this.sequenceStep + 1) % 16;
      this.nextStepAt += 60 / this.getTempo() / 2;
    }
  }

  private scheduleMusicStep(time: number, step: number): void {
    if (!this.bgmGain) {
      return;
    }
    const gameBass = [73.42, 73.42, 87.31, 73.42, 65.41, 65.41, 98, 87.31];
    const menuBass = [65.41, 65.41, 73.42, 82.41, 65.41, 73.42, 55, 61.74];
    const bass = (this.mood === 'game' ? gameBass : menuBass)[Math.floor(step / 2) % 8];
    if (step % 2 === 0) {
      this.tone(bass, time, 0.28, 0.3, 'triangle', this.bgmGain);
    }

    const melody = this.mood === 'game'
      ? [293.66, 0, 349.23, 392, 0, 349.23, 440, 392, 293.66, 0, 261.63, 293.66, 349.23, 0, 293.66, 261.63]
      : [261.63, 0, 293.66, 0, 329.63, 0, 293.66, 0, 246.94, 0, 261.63, 0, 293.66, 0, 220, 0];
    if (melody[step] > 0 && this.mood !== 'paused') {
      this.tone(melody[step], time, 0.16, 0.16, 'square', this.bgmGain);
    }
  }

  private getTempo(): number {
    if (this.mood === 'game') return 126;
    if (this.mood === 'result') return 76;
    if (this.mood === 'paused') return 64;
    return 96;
  }

  private sweep(
    startFrequency: number,
    endFrequency: number,
    time: number,
    duration: number,
    volume: number,
    type: OscillatorType,
  ): void {
    if (!this.context || !this.sfxGain) {
      return;
    }
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(startFrequency, time);
    oscillator.frequency.exponentialRampToValueAtTime(endFrequency, time + duration);
    gain.gain.setValueAtTime(volume, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    oscillator.connect(gain);
    gain.connect(this.sfxGain);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.02);
  }

  private tone(
    frequency: number,
    time: number,
    duration: number,
    volume: number,
    type: OscillatorType,
    destination: AudioNode,
  ): void {
    if (!this.context) {
      return;
    }
    const oscillator = this.context.createOscillator();
    const gain = this.context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, time);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.exponentialRampToValueAtTime(volume, time + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);
    oscillator.connect(gain);
    gain.connect(destination);
    oscillator.start(time);
    oscillator.stop(time + duration + 0.02);
  }
}
