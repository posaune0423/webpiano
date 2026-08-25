import { describe, expect, test } from "bun:test"

import { PIANO_KEYS, getPianoKeyByCode, midiToFrequency } from "./piano"

describe("piano keyboard mapping", () => {
  test("maps two chromatic octaves onto the two PC keyboard rows", () => {
    expect(PIANO_KEYS).toHaveLength(24)
    expect(PIANO_KEYS[0]).toMatchObject({
      code: "KeyZ",
      keyboardLabel: "Z",
      midi: 48,
      note: "C3",
    })
    expect(PIANO_KEYS[11]).toMatchObject({
      code: "KeyM",
      keyboardLabel: "M",
      midi: 59,
      note: "B3",
    })
    expect(PIANO_KEYS[12]).toMatchObject({
      code: "KeyQ",
      keyboardLabel: "Q",
      midi: 60,
      note: "C4",
    })
    expect(PIANO_KEYS[23]).toMatchObject({
      code: "KeyU",
      keyboardLabel: "U",
      midi: 71,
      note: "B4",
    })
  })

  test("keeps the physical two-black then three-black pattern", () => {
    expect(PIANO_KEYS.filter((key) => key.isBlack).map((key) => key.note)).toEqual([
      "C♯3",
      "D♯3",
      "F♯3",
      "G♯3",
      "A♯3",
      "C♯4",
      "D♯4",
      "F♯4",
      "G♯4",
      "A♯4",
    ])
  })

  test("looks up physical codes and converts MIDI pitch to frequency", () => {
    expect(getPianoKeyByCode("Digit2")?.note).toBe("C♯4")
    expect(getPianoKeyByCode("Unknown")).toBeUndefined()
    expect(midiToFrequency(69)).toBe(440)
    expect(midiToFrequency(60)).toBeCloseTo(261.626, 3)
  })
})
