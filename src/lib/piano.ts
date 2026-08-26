export type PianoZone = "lower" | "upper"

export interface PianoKey {
  code: string
  isBlack: boolean
  keyboardLabel: string
  midi: number
  note: string
  whiteIndex: number
  zone: PianoZone
}

export interface PianoLayout {
  keyByCode: ReadonlyMap<string, PianoKey>
  keys: PianoKey[]
  lowerKeys: PianoKey[]
  upperKeys: PianoKey[]
}

export interface FullPianoKey {
  isBlack: boolean
  midi: number
  note: string
  whiteIndex: number
}

interface KeyBinding {
  code: string
  keyboardLabel: string
}

interface PianoLayoutOptions {
  lowerStartMidi: number
  upperStartMidi: number
}

const LOWER_BINDINGS: KeyBinding[] = [
  { code: "KeyZ", keyboardLabel: "Z" },
  { code: "KeyS", keyboardLabel: "S" },
  { code: "KeyX", keyboardLabel: "X" },
  { code: "KeyD", keyboardLabel: "D" },
  { code: "KeyC", keyboardLabel: "C" },
  { code: "KeyV", keyboardLabel: "V" },
  { code: "KeyG", keyboardLabel: "G" },
  { code: "KeyB", keyboardLabel: "B" },
  { code: "KeyH", keyboardLabel: "H" },
  { code: "KeyN", keyboardLabel: "N" },
  { code: "KeyJ", keyboardLabel: "J" },
  { code: "KeyM", keyboardLabel: "M" },
  { code: "Comma", keyboardLabel: "," },
  { code: "KeyL", keyboardLabel: "L" },
  { code: "Period", keyboardLabel: "." },
  { code: "Semicolon", keyboardLabel: ";" },
  { code: "Slash", keyboardLabel: "/" },
]

const UPPER_BINDINGS: KeyBinding[] = [
  { code: "KeyQ", keyboardLabel: "Q" },
  { code: "Digit2", keyboardLabel: "2" },
  { code: "KeyW", keyboardLabel: "W" },
  { code: "Digit3", keyboardLabel: "3" },
  { code: "KeyE", keyboardLabel: "E" },
  { code: "KeyR", keyboardLabel: "R" },
  { code: "Digit5", keyboardLabel: "5" },
  { code: "KeyT", keyboardLabel: "T" },
  { code: "Digit6", keyboardLabel: "6" },
  { code: "KeyY", keyboardLabel: "Y" },
  { code: "Digit7", keyboardLabel: "7" },
  { code: "KeyU", keyboardLabel: "U" },
  { code: "KeyI", keyboardLabel: "I" },
  { code: "Digit9", keyboardLabel: "9" },
  { code: "KeyO", keyboardLabel: "O" },
  { code: "Digit0", keyboardLabel: "0" },
  { code: "KeyP", keyboardLabel: "P" },
  { code: "BracketLeft", keyboardLabel: "[" },
  { code: "Equal", keyboardLabel: "=" },
  { code: "BracketRight", keyboardLabel: "]" },
]

export const FULL_PIANO_MIN_MIDI = 21
export const FULL_PIANO_MAX_MIDI = 108
export const DEFAULT_LOWER_START_MIDI = 48
export const DEFAULT_UPPER_START_MIDI = 60
export const LOWER_RANGE_NOTE_COUNT = LOWER_BINDINGS.length
export const UPPER_RANGE_NOTE_COUNT = UPPER_BINDINGS.length
export const STANDARD_RANGE_NOTE_COUNT = 32
export const MAX_LOWER_START_MIDI = FULL_PIANO_MAX_MIDI - LOWER_RANGE_NOTE_COUNT + 1
export const MAX_UPPER_START_MIDI = FULL_PIANO_MAX_MIDI - UPPER_RANGE_NOTE_COUNT + 1
export const MAX_STANDARD_START_MIDI = MAX_UPPER_START_MIDI - 12

const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"]
const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10])

function noteName(midi: number): string {
  return `${NOTE_NAMES.at(midi % 12) ?? "C"}${Math.floor(midi / 12) - 1}`
}

function createZoneKeys(bindings: KeyBinding[], startMidi: number, zone: PianoZone): PianoKey[] {
  let nextWhiteIndex = 0

  return bindings.map((binding, index) => {
    const midi = startMidi + index
    const isBlack = BLACK_PITCH_CLASSES.has(midi % 12)
    const whiteIndex = isBlack ? nextWhiteIndex - 1 : nextWhiteIndex

    if (!isBlack) nextWhiteIndex += 1

    return {
      ...binding,
      isBlack,
      midi,
      note: noteName(midi),
      whiteIndex,
      zone,
    }
  })
}

function assertRangeStart(startMidi: number, noteCount: number, zone: PianoZone): void {
  const maximumStart = FULL_PIANO_MAX_MIDI - noteCount + 1

  if (!Number.isInteger(startMidi) || startMidi < FULL_PIANO_MIN_MIDI || startMidi > maximumStart) {
    throw new RangeError(`${zone === "lower" ? "Lower" : "Upper"} range must fit between A0 and C8`)
  }
}

function mergeVisualKeys(lowerKeys: PianoKey[], upperKeys: PianoKey[]): PianoKey[] {
  const merged = new Map<number, PianoKey>()

  for (const key of [...lowerKeys, ...upperKeys]) {
    const existing = merged.get(key.midi)

    if (!existing) {
      merged.set(key.midi, { ...key })
      continue
    }

    merged.set(key.midi, {
      ...key,
      keyboardLabel: `${key.keyboardLabel} · ${existing.keyboardLabel}`,
    })
  }

  let nextWhiteIndex = 0

  return [...merged.values()]
    .sort((left, right) => left.midi - right.midi)
    .map((key) => {
      const whiteIndex = key.isBlack ? nextWhiteIndex - 1 : nextWhiteIndex

      if (!key.isBlack) nextWhiteIndex += 1

      return { ...key, whiteIndex }
    })
}

export function createPianoLayout({
  lowerStartMidi,
  upperStartMidi,
}: PianoLayoutOptions): PianoLayout {
  assertRangeStart(lowerStartMidi, LOWER_BINDINGS.length, "lower")
  assertRangeStart(upperStartMidi, UPPER_BINDINGS.length, "upper")

  const lowerKeys = createZoneKeys(LOWER_BINDINGS, lowerStartMidi, "lower")
  const upperKeys = createZoneKeys(UPPER_BINDINGS, upperStartMidi, "upper")
  const keys = mergeVisualKeys(lowerKeys, upperKeys)

  return {
    keyByCode: new Map([...lowerKeys, ...upperKeys].map((key) => [key.code, key])),
    keys,
    lowerKeys,
    upperKeys,
  }
}

export function createStandardPianoLayout(startMidi: number): PianoLayout {
  return createPianoLayout({ lowerStartMidi: startMidi, upperStartMidi: startMidi + 12 })
}

export const DEFAULT_PIANO_LAYOUT = createStandardPianoLayout(DEFAULT_LOWER_START_MIDI)
export const PIANO_KEYS = DEFAULT_PIANO_LAYOUT.keys

export function getPianoKeyByCode(
  code: string,
  layout: PianoLayout = DEFAULT_PIANO_LAYOUT,
): PianoKey | undefined {
  return layout.keyByCode.get(code)
}

export const FULL_PIANO_KEYS: FullPianoKey[] = (() => {
  let nextWhiteIndex = 0

  return Array.from({ length: 88 }, (_, index) => {
    const midi = 21 + index
    const isBlack = BLACK_PITCH_CLASSES.has(midi % 12)
    const whiteIndex = isBlack ? nextWhiteIndex - 1 : nextWhiteIndex

    if (!isBlack) nextWhiteIndex += 1

    return { isBlack, midi, note: noteName(midi), whiteIndex }
  })
})()

function getFullPianoKeyBounds(midi: number): { leftPercent: number; rightPercent: number } {
  const key = FULL_PIANO_KEYS.find((candidate) => candidate.midi === midi)

  if (!key) {
    throw new RangeError("Piano note must be between A0 and C8")
  }

  const whiteKeyWidth = 100 / 52

  if (!key.isBlack) {
    return {
      leftPercent: key.whiteIndex * whiteKeyWidth,
      rightPercent: (key.whiteIndex + 1) * whiteKeyWidth,
    }
  }

  const blackKeyWidth = whiteKeyWidth * 0.62
  const center = (key.whiteIndex + 1) * whiteKeyWidth

  return {
    leftPercent: Math.max(0, center - blackKeyWidth / 2),
    rightPercent: Math.min(100, center + blackKeyWidth / 2),
  }
}

export function formatPianoRange(startMidi: number, noteCount: number): string {
  return `${noteName(startMidi)}–${noteName(startMidi + noteCount - 1)}`
}

export function getFullPianoRangeBounds(
  startMidi: number,
  noteCount: number,
): { leftPercent: number; rightPercent: number; widthPercent: number } {
  if (!Number.isInteger(noteCount) || noteCount < 1) {
    throw new RangeError("Piano range must contain at least one note")
  }

  const start = getFullPianoKeyBounds(startMidi)
  const end = getFullPianoKeyBounds(startMidi + noteCount - 1)

  return {
    leftPercent: start.leftPercent,
    rightPercent: end.rightPercent,
    widthPercent: end.rightPercent - start.leftPercent,
  }
}

export function getClosestFullPianoMidi(percent: number): number {
  const target = Math.min(100, Math.max(0, percent))
  let closestMidi = FULL_PIANO_MIN_MIDI
  let closestDistance = Number.POSITIVE_INFINITY

  for (const key of FULL_PIANO_KEYS) {
    const bounds = getFullPianoKeyBounds(key.midi)
    const center = (bounds.leftPercent + bounds.rightPercent) / 2
    const distance = Math.abs(center - target)

    if (distance < closestDistance) {
      closestMidi = key.midi
      closestDistance = distance
    }
  }

  return closestMidi
}

export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}
