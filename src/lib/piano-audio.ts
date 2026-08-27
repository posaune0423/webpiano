import { midiToFrequency } from "./piano"

interface PianoVoice {
  release: () => void
  setMuted?: (muted: boolean) => void
}

export interface PianoEngine {
  allNotesOff: () => void
  noteOff: (midi: number) => void
  noteOn: (midi: number, velocity: number) => Promise<void>
  setMuted: (muted: boolean) => void
  setSustain: (enabled: boolean) => void
}

type AudioContextFactory = () => AudioContext
type VoiceFactory = (
  context: AudioContext,
  midi: number,
  velocity: number,
  muted: boolean,
) => PianoVoice

interface Partial {
  decay: number
  gain: number
  ratio: number
  type: OscillatorType
}

const PARTIALS: Partial[] = [
  { decay: 4.2, gain: 0.42, ratio: 1, type: "triangle" },
  { decay: 2.8, gain: 0.16, ratio: 2, type: "sine" },
  { decay: 1.8, gain: 0.08, ratio: 3, type: "sine" },
  { decay: 0.7, gain: 0.035, ratio: 6, type: "sine" },
]

function createWebAudioVoice(
  context: AudioContext,
  midi: number,
  velocity: number,
  muted: boolean,
): PianoVoice {
  const now = context.currentTime
  const frequency = midiToFrequency(midi)
  const filter = context.createBiquadFilter()
  const output = context.createGain()
  const oscillators: OscillatorNode[] = []
  const partialGains: GainNode[] = []

  filter.type = "lowpass"
  filter.frequency.setValueAtTime(Math.min(7_000, 3_800 + midi * 32), now)
  filter.Q.setValueAtTime(0.55, now)
  output.gain.setValueAtTime(muted ? 0 : 0.82, now)
  output.connect(filter)
  filter.connect(context.destination)

  for (const partial of PARTIALS) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const peak = Math.max(0.0001, partial.gain * velocity)

    oscillator.type = partial.type
    oscillator.frequency.setValueAtTime(frequency * partial.ratio, now)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(peak, now + 0.006)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + partial.decay)
    oscillator.connect(gain)
    gain.connect(output)
    oscillator.start(now)
    oscillator.stop(now + partial.decay + 0.05)
    oscillators.push(oscillator)
    partialGains.push(gain)
  }

  let released = false

  return {
    release() {
      if (released) {
        return
      }

      released = true
      const releaseAt = context.currentTime

      for (const gain of partialGains) {
        gain.gain.cancelScheduledValues(releaseAt)
        gain.gain.setValueAtTime(Math.max(gain.gain.value, 0.0001), releaseAt)
        gain.gain.exponentialRampToValueAtTime(0.0001, releaseAt + 0.32)
      }

      for (const oscillator of oscillators) {
        oscillator.stop(releaseAt + 0.36)
      }
    },
    setMuted(muted) {
      const changeAt = context.currentTime
      output.gain.cancelScheduledValues(changeAt)
      output.gain.setValueAtTime(output.gain.value, changeAt)
      output.gain.linearRampToValueAtTime(muted ? 0 : 0.82, changeAt + 0.008)
    },
  }
}

export class SynthPianoEngine implements PianoEngine {
  private readonly attackTokens = new Map<number, number>()
  private context: AudioContext | undefined
  private muted = false
  private nextAttackToken = 0
  private readonly pressedNotes = new Set<number>()
  private sustain = false
  private readonly sustainedNotes = new Set<number>()
  private readonly voices = new Map<number, PianoVoice>()

  constructor(
    private readonly contextFactory: AudioContextFactory = () =>
      new AudioContext({ latencyHint: "interactive" }),
    private readonly voiceFactory: VoiceFactory = createWebAudioVoice,
  ) {}

  async noteOn(midi: number, velocity: number): Promise<void> {
    const attackToken = this.nextAttackToken + 1
    this.nextAttackToken = attackToken
    this.attackTokens.set(midi, attackToken)
    this.pressedNotes.add(midi)
    this.sustainedNotes.delete(midi)
    const context = this.context ?? this.contextFactory()
    this.context = context

    if (context.state === "suspended") {
      await context.resume()
    }

    if (
      this.attackTokens.get(midi) !== attackToken ||
      (!this.pressedNotes.has(midi) && !this.sustainedNotes.has(midi))
    ) {
      return
    }

    this.voices.get(midi)?.release()
    const voice = this.voiceFactory(context, midi, velocity, this.muted)
    this.voices.set(midi, voice)
  }

  noteOff(midi: number): void {
    this.pressedNotes.delete(midi)

    if (this.sustain) {
      this.sustainedNotes.add(midi)
      return
    }

    this.attackTokens.delete(midi)
    this.sustainedNotes.delete(midi)
    this.releaseNote(midi)
  }

  allNotesOff(): void {
    for (const voice of this.voices.values()) {
      voice.release()
    }

    this.attackTokens.clear()
    this.pressedNotes.clear()
    this.sustainedNotes.clear()
    this.voices.clear()
    this.sustain = false
  }

  setSustain(enabled: boolean): void {
    this.sustain = enabled

    if (enabled) {
      return
    }

    for (const midi of this.sustainedNotes) {
      this.attackTokens.delete(midi)
      this.releaseNote(midi)
    }

    this.sustainedNotes.clear()
  }

  setMuted(muted: boolean): void {
    if (this.muted === muted) return

    this.muted = muted
    for (const voice of this.voices.values()) voice.setMuted?.(muted)
  }

  private releaseNote(midi: number): void {
    this.voices.get(midi)?.release()
    this.voices.delete(midi)
  }
}

let sharedPianoEngine: PianoEngine | undefined

export function getPianoAudioEngine(): PianoEngine {
  sharedPianoEngine ??= new SynthPianoEngine()
  return sharedPianoEngine
}

export function setPianoAudioEngineForTesting(engine: PianoEngine | undefined): void {
  sharedPianoEngine = engine
}
