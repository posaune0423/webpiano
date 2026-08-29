import { midiToFrequency } from "./piano"

interface PianoVoice {
  release: (kind?: PianoReleaseKind) => void
  setMuted?: (muted: boolean) => void
}

type PianoReleaseKind = "immediate" | "key" | "pedal"

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

interface PianoPartial {
  attack: number
  decay: number
  detune: number
  gain: number
  harmonic: number
  phase: number
  tailLevel: number
  type: OscillatorType
}

export interface PianoVoiceProfile {
  bodyFrequency: number
  bodyGain: number
  filterFrequency: number
  filterQ: number
  hammerFrequency: number
  hammerGain: number
  keyRelease: number
  naturalDuration: number
  partials: PianoPartial[]
  pedalRelease: number
}

interface PartialTemplate {
  decayRatio: number
  detuneDirection: -1 | 0 | 1
  gain: number
  harmonic: number
  phase: number
  tailLevel: number
}

const PARTIAL_TEMPLATES: PartialTemplate[] = [
  { decayRatio: 1, detuneDirection: -1, gain: 0.34, harmonic: 1, phase: -0.5, tailLevel: 0.42 },
  { decayRatio: 0.97, detuneDirection: 1, gain: 0.3, harmonic: 1, phase: 0.38, tailLevel: 0.4 },
  { decayRatio: 0.76, detuneDirection: 0, gain: 0.14, harmonic: 2, phase: 0.18, tailLevel: 0.26 },
  { decayRatio: 0.61, detuneDirection: 0, gain: 0.075, harmonic: 3, phase: -0.32, tailLevel: 0.18 },
  { decayRatio: 0.48, detuneDirection: 0, gain: 0.042, harmonic: 4, phase: 0.44, tailLevel: 0.13 },
  { decayRatio: 0.37, detuneDirection: 0, gain: 0.026, harmonic: 5, phase: -0.24, tailLevel: 0.09 },
  { decayRatio: 0.29, detuneDirection: 0, gain: 0.017, harmonic: 6, phase: 0.34, tailLevel: 0.065 },
  { decayRatio: 0.2, detuneDirection: 0, gain: 0.01, harmonic: 8, phase: -0.42, tailLevel: 0.04 },
]

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value))
}

function bassPartialGain(harmonic: number, bass: number): number {
  if (harmonic === 1) return 1 - bass * 0.05
  if (harmonic === 2) return 1 + bass * 0.25
  if (harmonic === 3) return 1 + bass * 0.3
  if (harmonic === 4) return 1 + bass * 0.08
  return 1
}

function bassTailLevel(harmonic: number, bass: number): number {
  if (harmonic === 2) return 1 + bass * 0.2
  if (harmonic === 3) return 1 + bass * 0.25
  return 1
}

function treblePartialGain(harmonic: number, treble: number): number {
  if (harmonic === 1) return 1
  if (harmonic === 2) return 1 - treble * 0.15
  return 1 - treble * 0.4
}

export function createPianoVoiceProfile(midi: number, velocity: number): PianoVoiceProfile {
  const register = clamp((midi - 21) / (108 - 21), 0, 1)
  const bass = clamp((60 - midi) / 12, 0, 1)
  const treble = clamp((midi - 64) / 20, 0, 1)
  const frequency = midiToFrequency(midi)
  const velocityLevel = clamp(velocity, 0, 1)
  const velocityGain = Math.pow(clamp(velocity, 0, 1), 1.25)
  const naturalDuration = 12.5 - 7.4 * Math.pow(register, 0.72)
  const stringDetune = (0.65 + register * 0.85) * (1 - bass * 0.3) * (1 - treble * 0.62)
  const inharmonicity = (0.00008 + register * 0.00022) * (1 - treble * 0.38)
  const openFilterFrequency = Math.min(8_200, 4_200 + midi * 55 + velocityLevel * 1_000)
  const hammerFrequency = Math.min(6_000, 1_800 + frequency * 4)

  return {
    bodyFrequency: 240 + bass * 60 + treble * 140,
    bodyGain: 2.2 + bass * 0.5 - treble,
    filterFrequency: openFilterFrequency - treble * 1_400,
    filterQ: 0.7 - treble * 0.16,
    hammerFrequency: (hammerFrequency + bass * 400) * (1 - treble * 0.1),
    hammerGain: velocityLevel * (0.055 + bass * 0.008) * (1 - treble * 0.35),
    keyRelease: 1.05 - register * 0.68,
    naturalDuration,
    partials: PARTIAL_TEMPLATES.filter((partial) => frequency * partial.harmonic <= 10_000).map(
      (partial) => {
        const stretchedRatio = Math.sqrt(
          partial.harmonic ** 2 + inharmonicity * partial.harmonic ** 4,
        )
        const stretchedDetune = 1_200 * Math.log2(stretchedRatio / partial.harmonic)
        const bassGain = bassPartialGain(partial.harmonic, bass)
        const trebleGain = treblePartialGain(partial.harmonic, treble)
        const coreTail = bassTailLevel(partial.harmonic, bass)
        const trebleTail = partial.harmonic === 2 || partial.harmonic === 3 ? 1 + treble * 0.4 : 1
        const decayRatio =
          partial.harmonic === 1 && partial.detuneDirection === 1
            ? partial.decayRatio - treble * 0.07
            : partial.decayRatio

        return {
          attack: Math.max(0.002, 0.0052 - partial.harmonic * 0.00035),
          decay: naturalDuration * decayRatio,
          detune: stretchedDetune + partial.detuneDirection * stringDetune,
          gain: partial.gain * velocityGain * bassGain * trebleGain,
          harmonic: partial.harmonic,
          phase: partial.phase * treble,
          tailLevel: partial.tailLevel * coreTail * trebleTail,
          type: "sine" as const,
        }
      },
    ),
    pedalRelease: 1.75 - register,
  }
}

export function schedulePianoRelease(
  parameter: AudioParam,
  startAt: number,
  duration: number,
): void {
  parameter.setValueAtTime(1, startAt)
  parameter.exponentialRampToValueAtTime(0.0001, startAt + duration)
}

function createWebAudioVoice(
  context: AudioContext,
  midi: number,
  velocity: number,
  muted: boolean,
): PianoVoice {
  const now = context.currentTime
  const frequency = midiToFrequency(midi)
  const profile = createPianoVoiceProfile(midi, velocity)
  const filter = context.createBiquadFilter()
  const body = context.createBiquadFilter()
  const emergencyEnvelope = context.createGain()
  const output = context.createGain()
  const releaseEnvelope = context.createGain()
  const oscillators: OscillatorNode[] = []

  filter.type = "lowpass"
  filter.frequency.setValueAtTime(profile.filterFrequency, now)
  filter.Q.setValueAtTime(profile.filterQ, now)
  body.type = "peaking"
  body.frequency.setValueAtTime(profile.bodyFrequency, now)
  body.Q.setValueAtTime(0.75, now)
  body.gain.setValueAtTime(profile.bodyGain, now)
  emergencyEnvelope.gain.setValueAtTime(1, now)
  output.gain.setValueAtTime(muted ? 0 : 0.74, now)
  releaseEnvelope.gain.setValueAtTime(1, now)
  output.connect(releaseEnvelope)
  releaseEnvelope.connect(emergencyEnvelope)
  emergencyEnvelope.connect(filter)
  filter.connect(body)
  body.connect(context.destination)

  for (const partial of profile.partials) {
    const oscillator = context.createOscillator()
    const gain = context.createGain()
    const peak = Math.max(0.0001, partial.gain)
    const tailAt = Math.min(partial.decay * 0.28, 1.4)
    const tailGain = Math.max(0.0001, peak * partial.tailLevel)

    if (partial.phase === 0) {
      oscillator.type = partial.type
      oscillator.frequency.setValueAtTime(frequency * partial.harmonic, now)
    } else {
      const real = new Float32Array(partial.harmonic + 1)
      const imaginary = new Float32Array(partial.harmonic + 1)
      real[partial.harmonic] = Math.sin(partial.phase)
      imaginary[partial.harmonic] = Math.cos(partial.phase)
      oscillator.setPeriodicWave(
        context.createPeriodicWave(real, imaginary, { disableNormalization: true }),
      )
      oscillator.frequency.setValueAtTime(frequency, now)
    }
    oscillator.detune.setValueAtTime(partial.detune, now)
    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.exponentialRampToValueAtTime(peak, now + partial.attack)
    gain.gain.exponentialRampToValueAtTime(tailGain, now + tailAt)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + partial.decay)
    oscillator.connect(gain)
    gain.connect(output)
    oscillator.start(now)
    oscillator.stop(now + partial.decay + 0.08)
    oscillators.push(oscillator)
  }

  const hammer = context.createBufferSource()
  const hammerFilter = context.createBiquadFilter()
  const hammerGain = context.createGain()
  const hammerDuration = 0.045
  const hammerBuffer = context.createBuffer(
    1,
    Math.ceil(context.sampleRate * hammerDuration),
    context.sampleRate,
  )
  const hammerSamples = hammerBuffer.getChannelData(0)

  hammerSamples.set(
    hammerSamples.map(
      (_sample, index) => (Math.random() * 2 - 1) * (1 - index / hammerSamples.length),
    ),
  )

  hammer.buffer = hammerBuffer
  hammerFilter.type = "bandpass"
  hammerFilter.frequency.setValueAtTime(profile.hammerFrequency, now)
  hammerFilter.Q.setValueAtTime(0.8, now)
  hammerGain.gain.setValueAtTime(Math.max(0.0001, profile.hammerGain), now)
  hammerGain.gain.exponentialRampToValueAtTime(0.0001, now + hammerDuration)
  hammer.connect(hammerFilter)
  hammerFilter.connect(hammerGain)
  hammerGain.connect(output)
  hammer.start(now)
  hammer.stop(now + hammerDuration)

  let damped = false
  let immediatelyStopped = false

  return {
    release(kind = "key") {
      const releaseAt = context.currentTime

      if (kind === "immediate") {
        if (immediatelyStopped) {
          return
        }

        immediatelyStopped = true
        const releaseDuration = 0.08
        schedulePianoRelease(emergencyEnvelope.gain, releaseAt, releaseDuration)

        for (const oscillator of oscillators) {
          oscillator.stop(releaseAt + releaseDuration + 0.08)
        }

        return
      }

      if (damped || immediatelyStopped) {
        return
      }

      damped = true
      const releaseDuration = kind === "pedal" ? profile.pedalRelease : profile.keyRelease
      schedulePianoRelease(releaseEnvelope.gain, releaseAt, releaseDuration)

      for (const oscillator of oscillators) {
        oscillator.stop(releaseAt + releaseDuration + 0.08)
      }
    },
    setMuted(muted) {
      const changeAt = context.currentTime
      output.gain.cancelScheduledValues(changeAt)
      output.gain.setValueAtTime(output.gain.value, changeAt)
      output.gain.linearRampToValueAtTime(muted ? 0 : 0.74, changeAt + 0.008)
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

    this.voices.get(midi)?.release("immediate")
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
    this.releaseNote(midi, "key")
  }

  allNotesOff(): void {
    for (const voice of this.voices.values()) {
      voice.release("immediate")
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
      this.releaseNote(midi, "pedal")
    }

    this.sustainedNotes.clear()
  }

  setMuted(muted: boolean): void {
    if (this.muted === muted) return

    this.muted = muted
    for (const voice of this.voices.values()) voice.setMuted?.(muted)
  }

  private releaseNote(midi: number, kind: PianoReleaseKind): void {
    this.voices.get(midi)?.release(kind)
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
