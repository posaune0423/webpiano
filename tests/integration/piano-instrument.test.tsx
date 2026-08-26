import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"

import { fireEvent, render, screen } from "@testing-library/react"

import { PianoInstrument } from "@/components/piano-instrument"
import { setPianoAudioEngineForTesting } from "@/lib/piano-audio"
import { PedalApiProvider } from "@/trpc/client"

const noteOn = mock(async () => {})
const noteOff = mock(() => {})
const setSustain = mock(() => {})
const allNotesOff = mock(() => {})

function renderInstrument() {
  return render(
    <PedalApiProvider>
      <PianoInstrument />
    </PedalApiProvider>,
  )
}

describe("PianoInstrument", () => {
  beforeEach(() => {
    noteOn.mockClear()
    noteOff.mockClear()
    setSustain.mockClear()
    allNotesOff.mockClear()
    setPianoAudioEngineForTesting({ allNotesOff, noteOff, noteOn, setSustain })
  })

  afterEach(() => {
    setPianoAudioEngineForTesting(undefined)
  })

  test("renders the expanded standard piano immediately", () => {
    renderInstrument()

    expect(screen.getByRole("heading", { level: 1, name: "webpiano Online piano" })).toBeTruthy()
    expect(screen.getByRole("group", { name: "Playable piano" })).toBeTruthy()
    expect(screen.getAllByRole("button", { name: /Play / })).toHaveLength(32)
    expect(screen.getByRole("status", { name: "Standard range" }).textContent).toBe("C3–G5")
    expect(screen.getByRole("button", { name: "Standard semitone down" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Standard semitone up" })).toBeTruthy()
    expect(screen.getByRole("button", { name: "Open Dual Range" })).toBeTruthy()
    expect(screen.queryByRole("figure", { name: "Full piano range from A0 to C8" })).toBeNull()
    expect(screen.getByText("Z–/ · lower reach")).toBeTruthy()
    expect(screen.getByText("Q–] · upper reach")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Pedal" }).textContent).toBe("")
    expect(
      screen.getByRole("status", {
        name: "Sustain off — hold Space or use phone pedal",
      }),
    ).toBeTruthy()
    expect(screen.getByRole("status", { name: "Play a note to start audio" })).toBeTruthy()
    expect(screen.queryByText("Fixed touch · mf")).toBeNull()
    expect(screen.queryByText("Space holds the pedal")).toBeNull()
    expect(screen.getByRole("link", { name: "Terms" }).getAttribute("href")).toBe("/terms")
    expect(screen.getByRole("link", { name: "Privacy Policy" }).getAttribute("href")).toBe(
      "/privacy",
    )
  })

  test("opens two independent semitone ranges and keeps their settings during the session", () => {
    renderInstrument()

    fireEvent.click(screen.getByRole("button", { name: "Open Dual Range" }))

    expect(screen.getByRole("button", { name: "Close Dual Range" })).toBeTruthy()
    expect(screen.getByRole("figure", { name: "Full piano range from A0 to C8" })).toBeTruthy()
    expect(screen.getByRole("group", { name: "Lower playable piano" })).toBeTruthy()
    expect(screen.getByRole("group", { name: "Upper playable piano" })).toBeTruthy()
    expect(screen.getAllByRole("button", { name: /Play / })).toHaveLength(37)

    fireEvent.click(screen.getByRole("button", { name: "Lower semitone down" }))
    fireEvent.click(screen.getByRole("button", { name: "Upper semitone up" }))

    fireEvent.keyDown(window, { code: "KeyZ", repeat: false })
    fireEvent.keyUp(window, { code: "KeyZ" })
    fireEvent.keyDown(window, { code: "KeyQ", repeat: false })
    fireEvent.keyUp(window, { code: "KeyQ" })

    expect(noteOn).toHaveBeenNthCalledWith(1, 47, 0.68)
    expect(noteOn).toHaveBeenNthCalledWith(2, 61, 0.68)

    fireEvent.click(screen.getByRole("button", { name: "Close Dual Range" }))
    fireEvent.keyDown(window, { code: "KeyZ", repeat: false })
    fireEvent.keyUp(window, { code: "KeyZ" })

    expect(noteOn).toHaveBeenNthCalledWith(3, 48, 0.68)

    fireEvent.click(screen.getByRole("button", { name: "Open Dual Range" }))
    expect(screen.getByRole("status", { name: "Lower range" }).textContent).toBe("B2–D♯4")
    expect(screen.getByRole("status", { name: "Upper range" }).textContent).toBe("C♯4–G♯5")
  })

  test("bounds both ranges inside the full 88-key piano", () => {
    renderInstrument()
    fireEvent.click(screen.getByRole("button", { name: "Open Dual Range" }))

    const lowerDown = screen.getByRole("button", { name: "Lower semitone down" })
    const upperUp = screen.getByRole("button", { name: "Upper semitone up" })

    for (let index = 0; index < 27; index += 1) fireEvent.click(lowerDown)
    for (let index = 0; index < 29; index += 1) fireEvent.click(upperUp)

    expect(lowerDown.hasAttribute("disabled")).toBe(true)
    expect(upperUp.hasAttribute("disabled")).toBe(true)
    expect(screen.getByRole("status", { name: "Lower range" }).textContent).toBe("A0–C♯2")
    expect(screen.getByRole("status", { name: "Upper range" }).textContent).toBe("F6–C8")
  })

  test("moves the complete standard keyboard by one semitone", () => {
    renderInstrument()

    fireEvent.click(screen.getByRole("button", { name: "Standard semitone down" }))
    expect(screen.getByRole("status", { name: "Standard range" }).textContent).toBe("B2–F♯5")

    fireEvent.keyDown(window, { code: "KeyZ", repeat: false })
    fireEvent.keyUp(window, { code: "KeyZ" })
    fireEvent.keyDown(window, { code: "BracketRight", repeat: false })
    fireEvent.keyUp(window, { code: "BracketRight" })

    expect(noteOn).toHaveBeenNthCalledWith(1, 47, 0.68)
    expect(noteOn).toHaveBeenNthCalledWith(2, 78, 0.68)
  })

  test("clears sounding notes and sustain before changing the instrument layout", () => {
    renderInstrument()
    fireEvent.keyDown(window, { code: "KeyZ", repeat: false })
    fireEvent.keyDown(window, { code: "Space", repeat: false })

    fireEvent.click(screen.getByRole("button", { name: "Open Dual Range" }))

    expect(allNotesOff).toHaveBeenCalledTimes(1)
    expect(setSustain).toHaveBeenNthCalledWith(1, true)
    expect(setSustain).toHaveBeenNthCalledWith(2, false)
    expect(screen.getByRole("status", { name: /Sustain off/ })).toBeTruthy()
  })

  test("reflects sounding notes on the decorative full-piano navigator", () => {
    renderInstrument()
    fireEvent.click(screen.getByRole("button", { name: "Open Dual Range" }))

    const navigator = screen.getByRole("figure", { name: "Full piano range from A0 to C8" })
    const c3 = navigator.querySelector('[data-midi="48"]')

    expect(c3?.getAttribute("data-active")).toBe("false")
    fireEvent.keyDown(window, { code: "KeyZ", repeat: false })
    expect(c3?.getAttribute("data-active")).toBe("true")
    fireEvent.keyUp(window, { code: "KeyZ" })
    expect(c3?.getAttribute("data-active")).toBe("false")
  })

  test("drags a range by semitone and commits only when released", () => {
    renderInstrument()
    fireEvent.click(screen.getByRole("button", { name: "Open Dual Range" }))

    const navigator = screen.getByRole("figure", { name: "Full piano range from A0 to C8" })
    const lowerRange = screen.getByRole("slider", { name: "Move Lower range" })
    navigator.getBoundingClientRect = () => new DOMRect(0, 0, 1000, 120)

    fireEvent.keyDown(window, { code: "KeyZ", repeat: false })
    fireEvent.pointerDown(lowerRange, { clientX: 317, pointerId: 11 })
    fireEvent.pointerMove(lowerRange, { clientX: 250, pointerId: 11 })

    expect(screen.getByRole("status", { name: "Lower range" }).textContent).toBe("C3–E4")
    expect(lowerRange.getAttribute("aria-valuetext")).toBe("Lower range F♯2–A♯3")

    fireEvent.pointerUp(lowerRange, { clientX: 250, pointerId: 11 })

    expect(screen.getByRole("status", { name: "Lower range" }).textContent).toBe("F♯2–A♯3")
    expect(allNotesOff).toHaveBeenCalledTimes(1)
  })

  test("plays and releases mapped PC keys without repeating held notes", () => {
    renderInstrument()

    fireEvent.keyDown(window, { code: "KeyZ", repeat: false })
    fireEvent.keyDown(window, { code: "KeyZ", repeat: true })

    expect(noteOn).toHaveBeenCalledTimes(1)
    expect(noteOn).toHaveBeenCalledWith(48, 0.68)
    expect(
      screen.getByRole("button", { name: "Play C3 with Z" }).getAttribute("aria-pressed"),
    ).toBe("true")
    expect(screen.getByRole("status", { name: "Sound on" })).toBeTruthy()

    fireEvent.keyUp(window, { code: "KeyZ" })

    expect(noteOff).toHaveBeenCalledWith(48)
  })

  test("plays pointer input and uses Space as the sustain pedal", () => {
    renderInstrument()

    const key = screen.getByRole("button", { name: "Play C4 with Q · ," })
    fireEvent.pointerDown(key, { pointerId: 7 })
    fireEvent.pointerUp(key, { pointerId: 7 })
    fireEvent.keyDown(window, { code: "Space", repeat: false })
    expect(screen.getByRole("status", { name: "Sustain on" })).toBeTruthy()
    fireEvent.keyUp(window, { code: "Space" })
    expect(
      screen.getByRole("status", {
        name: "Sustain off — hold Space or use phone pedal",
      }),
    ).toBeTruthy()

    expect(noteOn).toHaveBeenCalledWith(60, 0.68)
    expect(noteOff).toHaveBeenCalledWith(60)
    expect(setSustain).toHaveBeenNthCalledWith(1, true)
    expect(setSustain).toHaveBeenNthCalledWith(2, false)
  })

  test("releases held notes when the window loses focus", () => {
    renderInstrument()

    fireEvent.keyDown(window, { code: "KeyZ", repeat: false })
    fireEvent.blur(window)

    expect(allNotesOff).toHaveBeenCalledTimes(1)
  })

  test("keeps a note sounding until its final input source releases", () => {
    renderInstrument()

    const c3 = screen.getByRole("button", { name: "Play C3 with Z" })
    fireEvent.keyDown(window, { code: "KeyZ", repeat: false })
    fireEvent.pointerDown(c3, { pointerId: 9 })

    expect(noteOn).toHaveBeenCalledTimes(1)

    fireEvent.keyUp(window, { code: "KeyZ" })

    expect(noteOff).not.toHaveBeenCalled()

    fireEvent.pointerUp(c3, { pointerId: 9 })

    expect(noteOff).toHaveBeenCalledTimes(1)
    expect(noteOff).toHaveBeenCalledWith(48)
  })

  test("releases every voice and pedal state when unmounted", () => {
    const view = renderInstrument()

    fireEvent.keyDown(window, { code: "KeyZ", repeat: false })
    fireEvent.keyDown(window, { code: "Space", repeat: false })
    view.unmount()

    expect(allNotesOff).toHaveBeenCalledTimes(1)
  })

  test("supports focused-key and assistive activation while announcing audio status", () => {
    renderInstrument()

    const c4 = screen.getByRole("button", { name: "Play C4 with Q · ," })
    fireEvent.keyDown(c4, { code: "Enter", key: "Enter", repeat: false })

    expect(noteOn).toHaveBeenCalledWith(60, 0.68)
    expect(screen.getByRole("status", { name: "Sound on" })).toBeTruthy()

    fireEvent.keyUp(c4, { code: "Enter", key: "Enter" })

    expect(noteOff).toHaveBeenCalledWith(60)

    fireEvent.click(c4, { detail: 0 })

    expect(noteOn).toHaveBeenCalledTimes(2)
  })
})
