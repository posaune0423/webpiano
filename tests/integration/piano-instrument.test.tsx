import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test"

import { act, fireEvent, render, screen } from "@testing-library/react"

import { PianoInstrument } from "@/components/piano-instrument"
import { setPianoAudioEngineForTesting } from "@/lib/piano-audio"
import { PedalApiProvider } from "@/trpc/client"

const noteOn = mock(async () => {})
const noteOff = mock(() => {})
const setMuted = mock((_muted: boolean) => {})
const setSustain = mock((_enabled: boolean) => {})
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
    setMuted.mockClear()
    setSustain.mockClear()
    allNotesOff.mockClear()
    setPianoAudioEngineForTesting({ allNotesOff, noteOff, noteOn, setMuted, setSustain })
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
    expect(screen.getByRole("group", { name: "Keyboard mode" })).toBeTruthy()
    const singleMode = screen.getByRole("button", { name: "Single keyboard" })
    const dualMode = screen.getByRole("button", { name: "Dual keyboard" })
    expect(singleMode.getAttribute("aria-pressed")).toBe("true")
    expect(dualMode.getAttribute("aria-pressed")).toBe("false")
    expect(singleMode.querySelector("[data-single-range-icon]")).toBeTruthy()
    expect(dualMode.querySelector("[data-dual-range-icon]")).toBeTruthy()
    const soundToggle = screen.getByRole("button", { name: "Mute sound" })
    expect(soundToggle.getAttribute("aria-pressed")).toBe("false")
    expect(soundToggle.querySelector('[data-sound-icon="on"]')).toBeTruthy()
    expect(screen.getByRole("button", { name: "Install webpiano" })).toBeTruthy()
    expect(screen.getByRole("figure", { name: "Full piano range from A0 to C8" })).toBeTruthy()
    expect(screen.getByRole("slider", { name: "Move Standard range" })).toBeTruthy()
    expect(screen.queryByRole("slider", { name: "Move Lower range" })).toBeNull()
    expect(screen.queryByRole("slider", { name: "Move Upper range" })).toBeNull()
    expect(screen.getByText("A0 — C8 · 88-key piano")).toBeTruthy()
    expect(screen.getByText(/32 notes · 37 keys/)).toBeTruthy()
    expect(screen.getByText("Z–/ · lower reach")).toBeTruthy()
    expect(screen.getByText("Q–] · upper reach")).toBeTruthy()
    const pedal = screen.getByRole("button", { name: "Pedal" })
    expect(pedal.dataset.sustainActive).toBe("false")
    expect(pedal.dataset.sustainLocked).toBe("false")
    expect(pedal.querySelector('[data-pedal-lock="unlocked"]')).toBeTruthy()
    expect(
      screen.getByRole("status", {
        name: "Sustain off — press Space or use phone pedal",
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

    fireEvent.click(screen.getByRole("button", { name: "Dual keyboard" }))

    expect(
      screen.getByRole("button", { name: "Single keyboard" }).getAttribute("aria-pressed"),
    ).toBe("false")
    expect(screen.getByRole("button", { name: "Dual keyboard" }).getAttribute("aria-pressed")).toBe(
      "true",
    )
    expect(screen.getAllByRole("figure", { name: "Full piano range from A0 to C8" })).toHaveLength(
      1,
    )
    expect(screen.queryByRole("slider", { name: "Move Standard range" })).toBeNull()
    expect(screen.getByRole("slider", { name: "Move Lower range" })).toBeTruthy()
    expect(screen.getByRole("slider", { name: "Move Upper range" })).toBeTruthy()
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

    fireEvent.click(screen.getByRole("button", { name: "Single keyboard" }))
    fireEvent.keyDown(window, { code: "KeyZ", repeat: false })
    fireEvent.keyUp(window, { code: "KeyZ" })

    expect(noteOn).toHaveBeenNthCalledWith(3, 48, 0.68)

    fireEvent.click(screen.getByRole("button", { name: "Dual keyboard" }))
    expect(screen.getByRole("status", { name: "Lower range" }).textContent).toBe("B2–D♯4")
    expect(screen.getByRole("status", { name: "Upper range" }).textContent).toBe("C♯4–G♯5")
  })

  test("drags the standard gauge across the shared 88-key navigator", () => {
    renderInstrument()

    const navigator = screen.getByRole("figure", { name: "Full piano range from A0 to C8" })
    const standardRange = screen.getByRole("slider", { name: "Move Standard range" })
    navigator.getBoundingClientRect = () => new DOMRect(0, 0, 1000, 120)

    fireEvent.keyDown(window, { code: "KeyZ", repeat: false })
    fireEvent.pointerDown(standardRange, { clientX: 317, pointerId: 12 })
    fireEvent.pointerMove(standardRange, { clientX: 250, pointerId: 12 })

    expect(screen.getByRole("status", { name: "Standard range" }).textContent).toBe("C3–G5")
    expect(standardRange.getAttribute("aria-valuetext")).toBe("Standard range F♯2–C♯5")

    fireEvent.pointerUp(standardRange, { clientX: 250, pointerId: 12 })

    expect(screen.getByRole("status", { name: "Standard range" }).textContent).toBe("F♯2–C♯5")
    expect(allNotesOff).toHaveBeenCalledTimes(1)
  })

  test("bounds both ranges inside the full 88-key piano", () => {
    renderInstrument()
    fireEvent.click(screen.getByRole("button", { name: "Dual keyboard" }))

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

  test("moves only the standard keyboard with the left and right arrow keys", () => {
    renderInstrument()

    fireEvent.keyDown(window, { code: "ArrowLeft", key: "ArrowLeft" })
    expect(screen.getByRole("status", { name: "Standard range" }).textContent).toBe("B2–F♯5")

    fireEvent.keyDown(window, { code: "ArrowRight", key: "ArrowRight" })
    expect(screen.getByRole("status", { name: "Standard range" }).textContent).toBe("C3–G5")

    fireEvent.click(screen.getByRole("button", { name: "Dual keyboard" }))
    fireEvent.keyDown(window, { code: "ArrowLeft", key: "ArrowLeft" })

    expect(screen.getByRole("status", { name: "Lower range" }).textContent).toBe("C3–E4")
    expect(screen.getByRole("status", { name: "Upper range" }).textContent).toBe("C4–G5")
  })

  test("clears sounding notes and reapplies an intentional Sustain Lock across layouts", () => {
    renderInstrument()
    fireEvent.keyDown(window, { code: "KeyZ", repeat: false })
    fireEvent.keyDown(window, { code: "Space", repeat: false })

    fireEvent.click(screen.getByRole("button", { name: "Dual keyboard" }))

    expect(allNotesOff).toHaveBeenCalledTimes(1)
    expect(setSustain).toHaveBeenNthCalledWith(1, true)
    expect(setSustain).toHaveBeenNthCalledWith(2, true)
    expect(screen.getByRole("status", { name: "Sustain locked" })).toBeTruthy()
  })

  test("reapplies Sustain Lock after moving the playable range", () => {
    renderInstrument()
    fireEvent.keyDown(window, { code: "Space", repeat: false })

    fireEvent.click(screen.getByRole("button", { name: "Standard semitone down" }))

    expect(screen.getByRole("status", { name: "Standard range" }).textContent).toBe("B2–F♯5")
    expect(allNotesOff).toHaveBeenCalledTimes(1)
    expect(setSustain.mock.calls).toEqual([[true], [true]])
    expect(screen.getByRole("status", { name: "Sustain locked" })).toBeTruthy()
  })

  test("reflects sounding notes on the decorative full-piano navigator", () => {
    renderInstrument()

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
    fireEvent.click(screen.getByRole("button", { name: "Dual keyboard" }))

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

  test("plays pointer input and toggles Sustain Lock with Space", () => {
    renderInstrument()

    const key = screen.getByRole("button", { name: "Play C4 with Q · ," })
    const pedal = screen.getByRole("button", { name: "Pedal" })
    expect(pedal.dataset.sustainActive).toBe("false")
    fireEvent.pointerDown(key, { pointerId: 7 })
    fireEvent.pointerUp(key, { pointerId: 7 })
    fireEvent.keyDown(window, { code: "Space", repeat: false })
    expect(screen.getByRole("status", { name: "Sustain locked" })).toBeTruthy()
    expect(pedal.dataset.sustainActive).toBe("true")
    expect(pedal.dataset.sustainLocked).toBe("true")
    expect(pedal.querySelector('[data-pedal-lock="locked"]')).toBeTruthy()
    fireEvent.keyUp(window, { code: "Space" })
    expect(screen.getByRole("status", { name: "Sustain locked" })).toBeTruthy()
    expect(pedal.dataset.sustainActive).toBe("true")

    fireEvent.keyDown(window, { code: "Space", repeat: true })
    expect(screen.getByRole("status", { name: "Sustain locked" })).toBeTruthy()

    fireEvent.keyDown(window, { code: "Space", repeat: false })
    expect(
      screen.getByRole("status", {
        name: "Sustain off — press Space or use phone pedal",
      }),
    ).toBeTruthy()
    expect(pedal.dataset.sustainActive).toBe("false")
    expect(pedal.dataset.sustainLocked).toBe("false")
    expect(pedal.querySelector('[data-pedal-lock="unlocked"]')).toBeTruthy()

    expect(noteOn).toHaveBeenCalledWith(60, 0.68)
    expect(noteOff).toHaveBeenCalledWith(60)
    expect(setSustain).toHaveBeenNthCalledWith(1, true)
    expect(setSustain).toHaveBeenNthCalledWith(2, false)
  })

  test("keeps the pedal menu and Space Sustain Lock state synchronized", async () => {
    renderInstrument()

    fireEvent.click(screen.getByRole("button", { name: "Pedal" }))
    await act(async () => {
      fireEvent.click(screen.getByRole("menuitemcheckbox", { name: /Sustain lock/ }))
      await Promise.resolve()
    })

    const pedal = screen.getByRole("button", { name: "Pedal" })
    expect(pedal.dataset.sustainLocked).toBe("true")
    expect(screen.getByRole("status", { name: "Sustain locked" })).toBeTruthy()

    fireEvent.keyDown(window, { code: "Space", repeat: false })
    expect(pedal.dataset.sustainLocked).toBe("false")
    expect(
      screen.getByRole("status", { name: "Sustain off — press Space or use phone pedal" }),
    ).toBeTruthy()

    await act(async () => {
      fireEvent.click(pedal)
      await Promise.resolve()
    })
    expect(
      screen.getByRole("menuitemcheckbox", { name: /Sustain lock/ }).getAttribute("aria-checked"),
    ).toBe("false")
    await act(async () => {
      fireEvent.keyDown(document, { key: "Escape" })
      await Promise.resolve()
    })
  })

  test("opens the reserved PWA install Drawer from the header", async () => {
    renderInstrument()

    fireEvent.click(screen.getByRole("button", { name: "Install webpiano" }))

    const drawer = await screen.findByRole("dialog", { name: "Install webpiano" })
    expect(drawer.querySelector('[data-slot="drawer-content"]')).toBeTruthy()
    expect(screen.getByText("Open the piano instantly from your Home Screen.")).toBeTruthy()
    expect(screen.getByText("Use your browser’s install option")).toBeTruthy()
    expect(screen.getByRole("button", { name: "Close" })).toBeTruthy()
  })

  test("runs the captured browser install prompt directly from the header", async () => {
    const prompt = mock(async () => ({ outcome: "accepted" as const, platform: "web" }))
    renderInstrument()
    const event = new Event("beforeinstallprompt", { cancelable: true })
    Object.defineProperty(event, "prompt", { value: prompt })

    await act(async () => {
      window.dispatchEvent(event)
    })
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Install webpiano" }))
      await Promise.resolve()
      await Promise.resolve()
    })

    expect(prompt).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole("dialog", { name: "Install webpiano" })).toBeNull()
  })

  test("toggles sound mute state and icon without changing the keyboard mode", () => {
    renderInstrument()

    const mute = screen.getByRole("button", { name: "Mute sound" })
    fireEvent.click(mute)

    const unmute = screen.getByRole("button", { name: "Unmute sound" })
    expect(unmute.getAttribute("aria-pressed")).toBe("true")
    expect(unmute.querySelector('[data-sound-icon="muted"]')).toBeTruthy()
    expect(setMuted).toHaveBeenNthCalledWith(1, true)
    expect(
      screen.getByRole("button", { name: "Single keyboard" }).getAttribute("aria-pressed"),
    ).toBe("true")

    fireEvent.click(unmute)

    expect(screen.getByRole("button", { name: "Mute sound" }).getAttribute("aria-pressed")).toBe(
      "false",
    )
    expect(setMuted).toHaveBeenNthCalledWith(2, false)
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
