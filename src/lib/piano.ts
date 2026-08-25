export interface PianoKey {
  code: string
  isBlack: boolean
  keyboardLabel: string
  midi: number
  note: string
  whiteIndex: number
}

interface KeyBinding {
  code: string
  keyboardLabel: string
}

const LOW_ROW: KeyBinding[] = [
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
]

const HIGH_ROW: KeyBinding[] = [
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
]

const NOTE_NAMES = ["C", "C♯", "D", "D♯", "E", "F", "F♯", "G", "G♯", "A", "A♯", "B"]
const BLACK_PITCH_CLASSES = new Set([1, 3, 6, 8, 10])

let nextWhiteIndex = 0

export const PIANO_KEYS: PianoKey[] = [...LOW_ROW, ...HIGH_ROW].map((binding, index) => {
  const midi = 48 + index
  const pitchClass = midi % 12
  const isBlack = BLACK_PITCH_CLASSES.has(pitchClass)
  const whiteIndex = isBlack ? nextWhiteIndex - 1 : nextWhiteIndex

  if (!isBlack) {
    nextWhiteIndex += 1
  }

  return {
    ...binding,
    isBlack,
    midi,
    note: `${NOTE_NAMES.at(pitchClass) ?? "C"}${Math.floor(midi / 12) - 1}`,
    whiteIndex,
  }
})

const PIANO_KEY_BY_CODE = new Map(PIANO_KEYS.map((key) => [key.code, key]))

export function getPianoKeyByCode(code: string): PianoKey | undefined {
  return PIANO_KEY_BY_CODE.get(code)
}

export function midiToFrequency(midi: number): number {
  return 440 * 2 ** ((midi - 69) / 12)
}
