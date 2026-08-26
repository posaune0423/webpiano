import { describe, expect, test } from "bun:test"

import * as piano from "@/lib/piano"
import {
  FULL_PIANO_KEYS,
  PIANO_KEYS,
  createPianoLayout,
  getPianoKeyByCode,
  midiToFrequency,
} from "@/lib/piano"

describe("piano keyboard mapping", () => {
  test("extends the standard piano across the available QWERTY keys", () => {
    expect(PIANO_KEYS).toHaveLength(32)
    expect(PIANO_KEYS[0]).toMatchObject({
      code: "KeyZ",
      keyboardLabel: "Z",
      midi: 48,
      note: "C3",
    })
    expect(PIANO_KEYS[12]).toMatchObject({
      midi: 60,
      note: "C4",
    })
    expect(PIANO_KEYS[12]?.keyboardLabel).toContain("Q")
    expect(PIANO_KEYS[12]?.keyboardLabel).toContain(",")
    expect(PIANO_KEYS.at(-1)).toMatchObject({ midi: 79, note: "G5" })

    expect(getPianoKeyByCode("Comma")?.note).toBe("C4")
    expect(getPianoKeyByCode("KeyL")?.note).toBe("C♯4")
    expect(getPianoKeyByCode("Period")?.note).toBe("D4")
    expect(getPianoKeyByCode("Semicolon")?.note).toBe("D♯4")
    expect(getPianoKeyByCode("Slash")?.note).toBe("E4")
    expect(getPianoKeyByCode("KeyI")?.note).toBe("C5")
    expect(getPianoKeyByCode("Digit9")?.note).toBe("C♯5")
    expect(getPianoKeyByCode("KeyO")?.note).toBe("D5")
    expect(getPianoKeyByCode("Digit0")?.note).toBe("D♯5")
    expect(getPianoKeyByCode("KeyP")?.note).toBe("E5")
    expect(getPianoKeyByCode("BracketLeft")?.note).toBe("F5")
    expect(getPianoKeyByCode("Equal")?.note).toBe("F♯5")
    expect(getPianoKeyByCode("BracketRight")?.note).toBe("G5")
    expect(getPianoKeyByCode("Digit8")).toBeUndefined()
    expect(getPianoKeyByCode("Minus")).toBeUndefined()
  })

  test("keeps each hand slightly wider than one octave", () => {
    const layout = createPianoLayout({
      lowerStartMidi: 48,
      upperStartMidi: 60,
    })

    expect(layout.lowerKeys).toHaveLength(17)
    expect(layout.upperKeys).toHaveLength(20)
    expect(layout.lowerKeys.at(-1)).toMatchObject({ code: "Slash", midi: 64, note: "E4" })
    expect(layout.upperKeys.at(-1)).toMatchObject({
      code: "BracketRight",
      midi: 79,
      note: "G5",
    })
  })

  test("looks up physical codes and converts MIDI pitch to frequency", () => {
    expect(getPianoKeyByCode("Digit2")?.note).toBe("C♯4")
    expect(getPianoKeyByCode("Unknown")).toBeUndefined()
    expect(midiToFrequency(69)).toBe(440)
    expect(midiToFrequency(60)).toBeCloseTo(261.626, 3)
  })

  test("creates independently movable ranges from any semitone", () => {
    const layout = createPianoLayout({ lowerStartMidi: 37, upperStartMidi: 73 })

    expect(layout.lowerKeys[0]).toMatchObject({ code: "KeyZ", midi: 37, note: "C♯2" })
    expect(layout.lowerKeys.at(-1)).toMatchObject({ code: "Slash", midi: 53, note: "F3" })
    expect(layout.upperKeys[0]).toMatchObject({ code: "KeyQ", midi: 73, note: "C♯5" })
    expect(layout.upperKeys.at(-1)).toMatchObject({
      code: "BracketRight",
      midi: 92,
      note: "G♯6",
    })
    expect(getPianoKeyByCode("KeyZ", layout)?.note).toBe("C♯2")
    expect(getPianoKeyByCode("KeyQ", layout)?.note).toBe("C♯5")
  })

  test("keeps complete hand ranges inside the 88-key piano", () => {
    expect(() => createPianoLayout({ lowerStartMidi: 20, upperStartMidi: 60 })).toThrow(RangeError)
    expect(() => createPianoLayout({ lowerStartMidi: 93, upperStartMidi: 89 })).toThrow(RangeError)
    expect(() => createPianoLayout({ lowerStartMidi: 48, upperStartMidi: 90 })).toThrow(RangeError)
  })

  test("moves the complete standard keyboard by one semitone", () => {
    const api = piano as typeof piano & {
      createStandardPianoLayout: (startMidi: number) => ReturnType<typeof createPianoLayout>
    }

    expect(typeof api.createStandardPianoLayout).toBe("function")
    const layout = api.createStandardPianoLayout(49)

    expect(layout.keys).toHaveLength(32)
    expect(layout.keys[0]).toMatchObject({ midi: 49, note: "C♯3" })
    expect(layout.keys.at(-1)).toMatchObject({ midi: 80, note: "G♯5" })
    expect(getPianoKeyByCode("KeyZ", layout)?.midi).toBe(49)
    expect(getPianoKeyByCode("KeyQ", layout)?.midi).toBe(61)
  })

  test("exposes range lengths and valid start boundaries", () => {
    const api = piano as typeof piano & Record<string, number>

    expect(api.FULL_PIANO_MIN_MIDI).toBe(21)
    expect(api.FULL_PIANO_MAX_MIDI).toBe(108)
    expect(api.DEFAULT_LOWER_START_MIDI).toBe(48)
    expect(api.DEFAULT_UPPER_START_MIDI).toBe(60)
    expect(api.LOWER_RANGE_NOTE_COUNT).toBe(17)
    expect(api.UPPER_RANGE_NOTE_COUNT).toBe(20)
    expect(api.STANDARD_RANGE_NOTE_COUNT).toBe(32)
    expect(api.MAX_LOWER_START_MIDI).toBe(92)
    expect(api.MAX_UPPER_START_MIDI).toBe(89)
    expect(api.MAX_STANDARD_START_MIDI).toBe(77)
  })

  test("positions semitone ranges on the full piano navigator", () => {
    const api = piano as typeof piano & {
      formatPianoRange: (startMidi: number, noteCount: number) => string
      getClosestFullPianoMidi: (percent: number) => number
      getFullPianoRangeBounds: (
        startMidi: number,
        noteCount: number,
      ) => { leftPercent: number; rightPercent: number; widthPercent: number }
    }

    expect(typeof api.formatPianoRange).toBe("function")
    expect(typeof api.getFullPianoRangeBounds).toBe("function")
    expect(typeof api.getClosestFullPianoMidi).toBe("function")
    expect(api.formatPianoRange(42, 17)).toBe("F♯2–A♯3")

    const bounds = api.getFullPianoRangeBounds(42, 17)
    expect(bounds.leftPercent).toBeGreaterThan(24)
    expect(bounds.rightPercent).toBeLessThan(43)
    expect(bounds.widthPercent).toBeCloseTo(bounds.rightPercent - bounds.leftPercent, 8)
    expect(api.getClosestFullPianoMidi(0)).toBe(21)
    expect(api.getClosestFullPianoMidi(100)).toBe(108)
    expect(
      api.getClosestFullPianoMidi((bounds.leftPercent + bounds.rightPercent) / 2),
    ).toBeGreaterThan(42)
  })

  test("describes the full 88-key piano from A0 through C8", () => {
    expect(FULL_PIANO_KEYS).toHaveLength(88)
    expect(FULL_PIANO_KEYS[0]).toMatchObject({ midi: 21, note: "A0" })
    expect(FULL_PIANO_KEYS.at(-1)).toMatchObject({ midi: 108, note: "C8" })
    expect(FULL_PIANO_KEYS.filter((key) => key.isBlack)).toHaveLength(36)
    expect(FULL_PIANO_KEYS.filter((key) => !key.isBlack)).toHaveLength(52)
  })
})
