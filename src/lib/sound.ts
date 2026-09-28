/* ============================================================
   Procedural Web Audio sound engine, zero audio assets.

   Design goals this pass: addicting and fun.
   - Every cue is musical: quick attacks, singing decays and
     notes that resolve where your ear wants them to.
   - Steps climb a pentatonic scale, so moving up the board
     literally feels like winning, one note at a time.
   - The coin sound is the game's signature: two bright
     bell partials, B5 into E6, the most loved coin in gaming.
   - A short echo bus gives musical cues a touch of space,
     which reads instantly as "premium game" rather than "web".
   - Master compressor keeps stacked cues smooth, never harsh.
   ============================================================ */

export type SoundName =
  | "click"
  | "chat"
  | "roll"
  | "step"
  | "snake"
  | "ladder"
  | "power"
  | "six"
  | "win"
  | "turn"
  | "swap"
  | "shield"
  | "fail"
  | "start"
  | "coin"
  | "coinLose"
  | "unlock"
  | "notify"
  | "match"
  | "join";

/** C major pentatonic ladder for stepping upward */
const PENTA = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.66, 1318.51, 1567.98];

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private echo: DelayNode | null = null;
  private echoBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private musicTimer: ReturnType<typeof setInterval> | null = null;
  private unlocked = false;

  sfxEnabled = true;
  musicEnabled = false;
  hapticsEnabled = true;

  /** Must be called from a user gesture at least once */
  unlock(): void {
    if (this.unlocked) return;
    try {
      if (!this.ctx) {
        const AC =
          window.AudioContext ||
          (window as unknown as { webkitAudioContext: typeof AudioContext })
            .webkitAudioContext;
        this.ctx = new AC();

        // gentle glue compressor: stacked cues stay smooth
        const comp = this.ctx.createDynamicsCompressor();
        comp.threshold.value = -16;
        comp.knee.value = 22;
        comp.ratio.value = 5;
        comp.attack.value = 0.006;
        comp.release.value = 0.24;

        this.master = this.ctx.createGain();
        this.master.gain.value = 0.55;
        this.master.connect(comp);
        comp.connect(this.ctx.destination);

        // echo bus: 140ms slap with soft feedback = arcade cabinet sparkle
        this.echoBus = this.ctx.createGain();
        this.echoBus.gain.value = 0.16;
        this.echo = this.ctx.createDelay(0.5);
        this.echo.delayTime.value = 0.14;
        const fb = this.ctx.createGain();
        fb.gain.value = 0.24;
        const lp = this.ctx.createBiquadFilter();
        lp.type = "lowpass";
        lp.frequency.value = 3200;
        this.echoBus.connect(this.echo);
        this.echo.connect(lp);
        lp.connect(fb);
        fb.connect(this.echo);
        lp.connect(this.master);
      }
      if (this.ctx.state === "suspended") void this.ctx.resume();
      this.unlocked = true;
      if (this.musicEnabled) this.startMusic();
    } catch {
      // audio unsupported, quietly carry on without sound
    }
  }

  private now(): number {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  /**
   * A singing tone. Soft sines and triangles with musical
   * envelopes; optional pitch glide, vibrato, echo send and a
   * detuned twin for a fuller, rounder timbre.
   */
  private tone(opts: {
    freq: number;
    dur: number;
    type?: OscillatorType;
    gain?: number;
    delay?: number;
    glideTo?: number;
    attack?: number;
    vibrato?: number;
    vibratoRate?: number;
    echo?: number;
    detune?: number;
  }): void {
    if (!this.ctx || !this.master) return;
    const {
      freq,
      dur,
      type = "sine",
      gain = 0.1,
      delay = 0,
      glideTo,
      attack = 0.006,
      vibrato,
      vibratoRate = 6.5,
      echo = 0,
      detune,
    } = opts;
    const t0 = this.now() + delay;

    const makeOsc = (detuneCents: number) => {
      const osc = this.ctx!.createOscillator();
      const g = this.ctx!.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0);
      if (glideTo) osc.frequency.exponentialRampToValueAtTime(Math.max(40, glideTo), t0 + dur);
      if (detuneCents) osc.detune.value = detuneCents;
      if (vibrato) {
        const lfo = this.ctx!.createOscillator();
        const lfoGain = this.ctx!.createGain();
        lfo.frequency.value = vibratoRate;
        lfoGain.gain.value = vibrato;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start(t0);
        lfo.stop(t0 + dur + 0.05);
      }
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g);
      g.connect(this.master!);
      if (echo > 0 && this.echoBus) {
        const send = this.ctx!.createGain();
        send.gain.value = echo;
        g.connect(send);
        send.connect(this.echoBus);
      }
      osc.start(t0);
      osc.stop(t0 + dur + 0.05);
    };

    makeOsc(0);
    if (detune) makeOsc(detune);
  }

  /** Filtered noise, always gentle and lowpassed. */
  private noise(opts: {
    dur: number;
    gain?: number;
    delay?: number;
    type?: BiquadFilterType;
    freq?: number;
    freqEnd?: number;
    q?: number;
  }): void {
    if (!this.ctx || !this.master) return;
    const { dur, gain = 0.06, delay = 0, type = "lowpass", freq = 900, freqEnd, q = 0.9 } = opts;
    const t0 = this.now() + delay;
    const len = Math.ceil(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.setValueAtTime(freq, t0);
    if (freqEnd) filter.frequency.exponentialRampToValueAtTime(freqEnd, t0 + dur);
    filter.Q.value = q;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + dur * 0.2);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.master);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  /** the game's signature coin voice: bright, round, two hits */
  private coinVoice(gain = 0.09, pitch = 1): void {
    const f1 = 987.77 * pitch; // B5
    const f2 = 1318.51 * pitch; // E6
    this.tone({ freq: f1, dur: 0.09, gain, attack: 0.002, echo: 0.5 });
    this.tone({ freq: f1 * 2, dur: 0.07, gain: gain * 0.4, attack: 0.002 });
    this.tone({ freq: f2, dur: 0.34, gain: gain * 0.95, delay: 0.082, attack: 0.002, echo: 0.6 });
    this.tone({ freq: f2 * 2, dur: 0.2, gain: gain * 0.3, delay: 0.082, attack: 0.002 });
  }

  play(name: SoundName, param?: number): void {
    if (!this.sfxEnabled) return;
    this.unlock();
    if (!this.ctx) return;
    const p = param ?? 0;

    switch (name) {
      case "click":
        // crisp bubble tap
        this.tone({ freq: 620, dur: 0.055, gain: 0.05, glideTo: 520, attack: 0.003 });
        break;
      case "chat":
        // friendly little double blip
        this.tone({ freq: 740, dur: 0.06, gain: 0.045, attack: 0.003 });
        this.tone({ freq: 990, dur: 0.09, gain: 0.04, delay: 0.07, attack: 0.003, echo: 0.25 });
        break;
      case "turn":
        // bubbly hand-off: quick upward blip
        this.tone({ freq: 330, dur: 0.1, gain: 0.05, glideTo: 620, attack: 0.004, echo: 0.2 });
        break;
      case "roll":
        // shaker rattle that accelerates and brightens...
        for (let i = 0; i < 7; i++) {
          const t = i * (0.075 - i * 0.004);
          this.noise({
            dur: 0.04,
            gain: 0.03 + i * 0.004,
            delay: t + Math.random() * 0.018,
            freq: 900 + i * 160 + Math.random() * 400,
            q: 1.6,
          });
        }
        // ...then a satisfying wooden settle...
        this.tone({ freq: 196, dur: 0.1, gain: 0.06, delay: 0.46, glideTo: 150 });
        this.tone({ freq: 165, dur: 0.12, gain: 0.05, delay: 0.54, glideTo: 128 });
        // ...sealed with a bright ta-dum so the value feels earned
        this.tone({ freq: 392, dur: 0.12, gain: 0.05, delay: 0.56, attack: 0.004, echo: 0.3 });
        this.tone({ freq: 523.25, dur: 0.2, gain: 0.055, delay: 0.66, attack: 0.004, echo: 0.35 });
        break;
      case "step": {
        // water-drop bloop climbing the pentatonic ladder
        const idx = Math.max(0, Math.min(PENTA.length - 1, p));
        const f = PENTA[idx];
        this.tone({ freq: f * 0.66, dur: 0.085, gain: 0.045, glideTo: f, attack: 0.004, echo: 0.18 });
        break;
      }
      case "snake":
        // playful slide-whistle "wheee" down with a cartoon boing at the end
        this.tone({ freq: 880, dur: 0.4, gain: 0.055, glideTo: 235, vibrato: 16, vibratoRate: 7.5, echo: 0.2 });
        // boing: fast wobble on a low triangle
        this.tone({ freq: 130, dur: 0.22, gain: 0.05, delay: 0.38, vibrato: 26, vibratoRate: 13, type: "triangle" });
        this.noise({ dur: 0.09, gain: 0.028, delay: 0.38, freq: 320, q: 1.1 });
        break;
      case "ladder":
        // music-box run straight up a C major arpeggio, plus a quiet gliss underneath
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) => {
          this.tone({ freq: f, dur: 0.17, gain: 0.05, delay: i * 0.075, attack: 0.004, echo: 0.45 });
          this.tone({ freq: f * 2, dur: 0.11, gain: 0.014, delay: i * 0.075, attack: 0.004 });
        });
        this.tone({ freq: 300, dur: 0.34, gain: 0.02, glideTo: 900, attack: 0.03 });
        // sparkle seal
        this.tone({ freq: 1567.98, dur: 0.24, gain: 0.03, delay: 0.3, attack: 0.003, echo: 0.5 });
        break;
      case "power":
        // quick ascending sparkle
        [880, 1174.66, 1567.98].forEach((f, i) =>
          this.tone({ freq: f, dur: 0.12, gain: 0.04, delay: i * 0.055, attack: 0.003, echo: 0.4 })
        );
        break;
      case "six":
        // slot-machine triple ding climbing thirds
        [659.25, 783.99, 987.77].forEach((f, i) => {
          this.tone({ freq: f, dur: 0.14, gain: 0.055, delay: i * 0.075, attack: 0.003, echo: 0.4 });
          this.tone({ freq: f * 2, dur: 0.1, gain: 0.012, delay: i * 0.075, attack: 0.003 });
        });
        this.tone({ freq: 1318.51, dur: 0.26, gain: 0.03, delay: 0.22, attack: 0.003, echo: 0.5 });
        break;
      case "shield":
        // round metallic cling with a detuned twin
        this.tone({ freq: 1046.5, dur: 0.32, gain: 0.05, glideTo: 990, attack: 0.004, detune: 7, echo: 0.5 });
        break;
      case "swap":
        // playful zigzag whoosh
        this.tone({ freq: 420, dur: 0.15, gain: 0.045, glideTo: 940, echo: 0.2 });
        this.tone({ freq: 940, dur: 0.17, gain: 0.045, delay: 0.16, glideTo: 420, echo: 0.2 });
        break;
      case "win":
        // earned fanfare: rising arpeggio, melodic answer, then a warm chord
        [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
          this.tone({ freq: f, dur: 0.2, gain: 0.055, delay: i * 0.115, attack: 0.005, echo: 0.5 })
        );
        // the answer phrase
        this.tone({ freq: 1174.66, dur: 0.16, gain: 0.05, delay: 0.52, attack: 0.005, echo: 0.5 });
        this.tone({ freq: 1046.5, dur: 0.5, gain: 0.06, delay: 0.65, attack: 0.005, echo: 0.6 });
        // warm home chord underneath
        [261.63, 329.63, 392.0].forEach((f) =>
          this.tone({ freq: f, dur: 1.0, gain: 0.026, delay: 0.62, attack: 0.09 })
        );
        // confetti sparkle on top
        [1567.98, 1975.5, 2349.3].forEach((f, i) =>
          this.tone({ freq: f, dur: 0.14, gain: 0.016, delay: 0.78 + i * 0.06, attack: 0.002, echo: 0.6 })
        );
        break;
      case "fail":
        // gentle wah-wah, cute rather than sad
        this.tone({ freq: 392, dur: 0.18, gain: 0.04, glideTo: 370, vibrato: 8, vibratoRate: 5 });
        this.tone({ freq: 349.23, dur: 0.26, gain: 0.035, delay: 0.17, glideTo: 294, vibrato: 8, vibratoRate: 5 });
        break;
      case "start":
        // curtain-raising rise with a soft cymbal sweep
        [392, 523.25, 659.25].forEach((f, i) =>
          this.tone({ freq: f, dur: 0.18, gain: 0.05, delay: i * 0.095, attack: 0.006, echo: 0.35 })
        );
        this.noise({ dur: 0.5, gain: 0.014, delay: 0.18, freq: 2400, freqEnd: 6000, q: 0.7 });
        break;
      case "coin":
        // the signature: pure joy in two notes
        this.coinVoice(0.09);
        break;
      case "coinLose":
        // two soft descending tones, a polite sigh
        this.tone({ freq: 659.25, dur: 0.16, gain: 0.05, attack: 0.005 });
        this.tone({ freq: 440, dur: 0.3, gain: 0.045, delay: 0.13, attack: 0.005, echo: 0.3 });
        break;
      case "unlock":
        // purchase fanfare: coin cascade with a rising sparkle
        this.coinVoice(0.08);
        this.coinVoice(0.08, 1.335); // a fourth up
        this.coinVoice(0.08, 1.782); // an octave+ up (G# feel, lydian sparkle)
        [1318.51, 1567.98, 2093].forEach((f, i) =>
          this.tone({ freq: f, dur: 0.16, gain: 0.03, delay: 0.3 + i * 0.07, attack: 0.002, echo: 0.6 })
        );
        break;
      case "notify":
        // soft two-tone chime
        this.tone({ freq: 783.99, dur: 0.14, gain: 0.045, attack: 0.004, echo: 0.3 });
        this.tone({ freq: 1046.5, dur: 0.22, gain: 0.04, delay: 0.1, attack: 0.004, echo: 0.35 });
        break;
      case "match":
        // opponent found: quick triumphant call and answer
        [523.25, 659.25, 783.99].forEach((f, i) =>
          this.tone({ freq: f, dur: 0.14, gain: 0.05, delay: i * 0.07, attack: 0.004, echo: 0.4 })
        );
        this.tone({ freq: 1046.5, dur: 0.4, gain: 0.055, delay: 0.24, attack: 0.004, echo: 0.5 });
        this.coinVoice(0.06);
        break;
      case "join":
        // a friend arrived: cheerful upside gliss
        this.tone({ freq: 523.25, dur: 0.16, gain: 0.05, glideTo: 830, attack: 0.005, echo: 0.3 });
        this.tone({ freq: 1046.5, dur: 0.2, gain: 0.03, delay: 0.12, attack: 0.004, echo: 0.4 });
        break;
    }
  }

  /* ---------------- calm ambient background music ---------------- */

  startMusic(): void {
    if (!this.ctx || this.musicTimer) return;
    this.musicEnabled = true;
    if (!this.musicBus) {
      this.musicBus = this.ctx.createGain();
      this.musicBus.gain.value = 0.5;
      const lp = this.ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1600;
      this.musicBus.connect(lp);
      lp.connect(this.master!);
    }
    // Slow, breathing chord progression: Cmaj7, Am7, Fmaj7, G.
    // Each chord is a soft pad that fades in and out like waves.
    const chords: number[][] = [
      [130.81, 261.63, 329.63, 392.0, 493.88], // Cmaj7
      [110.0, 220.0, 261.63, 329.63, 392.0], // Am7
      [87.31, 174.61, 220.0, 261.63, 329.63], // Fmaj7
      [98.0, 196.0, 246.94, 293.66, 392.0], // G
    ];
    let chordIdx = 0;
    const playChord = () => {
      if (!this.ctx || !this.musicBus) return;
      const t0 = this.now();
      const chord = chords[chordIdx % chords.length];
      chordIdx++;
      chord.forEach((freq, i) => {
        const osc = this.ctx!.createOscillator();
        const g = this.ctx!.createGain();
        osc.type = i === 0 ? "sine" : "triangle";
        osc.frequency.value = freq;
        // 4 second breathe: 1.4s fade in, 1.2s fade out
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(i === 0 ? 0.028 : 0.014, t0 + 1.4);
        g.gain.setValueAtTime(i === 0 ? 0.028 : 0.014, t0 + 2.6);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + 3.8);
        osc.connect(g);
        g.connect(this.musicBus!);
        osc.start(t0);
        osc.stop(t0 + 3.9);
      });
    };
    playChord();
    this.musicTimer = setInterval(playChord, 4000);
  }

  stopMusic(): void {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
    this.musicEnabled = false;
  }

  /* ---------------- haptics ---------------- */

  haptic(pattern: number | number[]): void {
    if (!this.hapticsEnabled) return;
    try {
      navigator.vibrate?.(pattern);
    } catch {
      // unsupported
    }
  }
}

export const sound = new SoundEngine();

/** Attach a one-time unlock listener (call once on client mount) */
export function attachAudioUnlock(): () => void {
  const handler = () => sound.unlock();
  window.addEventListener("pointerdown", handler, { once: true });
  window.addEventListener("keydown", handler, { once: true });
  return () => {
    window.removeEventListener("pointerdown", handler);
    window.removeEventListener("keydown", handler);
  };
}
