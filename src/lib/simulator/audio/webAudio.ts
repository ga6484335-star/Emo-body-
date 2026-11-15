class VirtualAudioEngine {
  private ctx: AudioContext | null = null;
  private buzzerOsc: OscillatorNode | null = null;
  private buzzerGain: GainNode | null = null;
  private buzzerStopTimer: ReturnType<typeof setTimeout> | null = null;

  private speakerOsc: OscillatorNode | null = null;
  private speakerGain: GainNode | null = null;

  public muted = false;
  public volume = 0.25;

  private ensureContext(): AudioContext | null {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {
        // Browser requires user gesture to unlock audio
      });
    }
    return this.ctx;
  }

  public playBuzzer(freqHz: number, durationMs?: number): void {
    if (this.muted || freqHz < 20 || freqHz > 20000) {
      this.stopBuzzer();
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx) return;

    this.stopBuzzer();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "square";
    osc.frequency.setValueAtTime(freqHz, ctx.currentTime);
    gain.gain.setValueAtTime(Math.max(0.01, this.volume * 0.3), ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    this.buzzerOsc = osc;
    this.buzzerGain = gain;

    if (durationMs && durationMs > 0) {
      this.buzzerStopTimer = setTimeout(() => {
        this.stopBuzzer();
      }, durationMs);
    }
  }

  public stopBuzzer(): void {
    if (this.buzzerStopTimer) {
      clearTimeout(this.buzzerStopTimer);
      this.buzzerStopTimer = null;
    }
    if (this.buzzerOsc) {
      try {
        this.buzzerOsc.stop();
        this.buzzerOsc.disconnect();
      } catch {
        // already stopped
      }
      this.buzzerOsc = null;
    }
    if (this.buzzerGain) {
      try {
        this.buzzerGain.disconnect();
      } catch {
        // ignore
      }
      this.buzzerGain = null;
    }
  }

  public playSpeaker(freqHz: number): void {
    if (this.muted || freqHz < 20 || freqHz > 20000) {
      this.stopSpeaker();
      return;
    }
    const ctx = this.ensureContext();
    if (!ctx) return;

    if (!this.speakerOsc || !this.speakerGain) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "triangle";
      osc.frequency.setValueAtTime(freqHz, ctx.currentTime);
      gain.gain.setValueAtTime(Math.max(0.01, this.volume * 0.45), ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      this.speakerOsc = osc;
      this.speakerGain = gain;
    } else {
      this.speakerOsc.frequency.setTargetAtTime(freqHz, ctx.currentTime, 0.01);
      this.speakerGain.gain.setTargetAtTime(Math.max(0.01, this.volume * 0.45), ctx.currentTime, 0.01);
    }
  }

  public stopSpeaker(): void {
    if (this.speakerOsc) {
      try {
        this.speakerOsc.stop();
        this.speakerOsc.disconnect();
      } catch {
        // ignore
      }
      this.speakerOsc = null;
    }
    if (this.speakerGain) {
      try {
        this.speakerGain.disconnect();
      } catch {
        // ignore
      }
      this.speakerGain = null;
    }
  }

  public stopAll(): void {
    this.stopBuzzer();
    this.stopSpeaker();
  }
}

export const virtualAudio = new VirtualAudioEngine();
