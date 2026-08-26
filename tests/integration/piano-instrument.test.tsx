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

  test("renders two playable octaves immediately", () => {
    renderInstrument()

    expect(screen.getByRole("heading", { level: 1, name: "webpiano" })).toBeTruthy()
    expect(screen.getByRole("group", { name: "Playable piano" })).toBeTruthy()
    expect(screen.getAllByRole("button", { name: /Play / })).toHaveLength(24)
    expect(screen.getByText("Z–M · lower octave")).toBeTruthy()
    expect(screen.getByText("Q–U · upper octave")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Use phone as pedal" })).toBeTruthy()
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
    expect(screen.getByText("Sound on")).toBeTruthy()

    fireEvent.keyUp(window, { code: "KeyZ" })

    expect(noteOff).toHaveBeenCalledWith(48)
  })

  test("plays pointer input and uses Space as the sustain pedal", () => {
    renderInstrument()

    const key = screen.getByRole("button", { name: "Play C4 with Q" })
    fireEvent.pointerDown(key, { pointerId: 7 })
    fireEvent.pointerUp(key, { pointerId: 7 })
    fireEvent.keyDown(window, { code: "Space", repeat: false })
    fireEvent.keyUp(window, { code: "Space" })

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

    const c4 = screen.getByRole("button", { name: "Play C4 with Q" })
    fireEvent.keyDown(c4, { code: "Enter", key: "Enter", repeat: false })

    expect(noteOn).toHaveBeenCalledWith(60, 0.68)
    expect(screen.getByRole("status").textContent).toBe("Sound on")

    fireEvent.keyUp(c4, { code: "Enter", key: "Enter" })

    expect(noteOff).toHaveBeenCalledWith(60)

    fireEvent.click(c4, { detail: 0 })

    expect(noteOn).toHaveBeenCalledTimes(2)
  })
})
