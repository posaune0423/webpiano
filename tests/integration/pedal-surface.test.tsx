import { describe, expect, mock, test } from "bun:test"

import { fireEvent, render, screen, waitFor } from "@testing-library/react"

import { PedalSurface } from "@/components/pedal-surface"
import { PedalPressController } from "@/lib/pedal-press"

describe("PedalSurface", () => {
  test("sends pedal down and up while reflecting its physical state", () => {
    const onMessage = mock(() => {})
    render(<PedalSurface connected connectionLabel="Connected · Direct" onMessage={onMessage} />)

    const pedal = screen.getByRole("button", { name: "Sustain pedal" })
    fireEvent.pointerDown(pedal, { pointerId: 8 })

    expect(pedal.getAttribute("aria-pressed")).toBe("true")
    expect(onMessage).toHaveBeenLastCalledWith({ v: 1, type: "pedal", seq: 1, down: true })

    fireEvent.pointerUp(pedal, { pointerId: 8 })

    expect(pedal.getAttribute("aria-pressed")).toBe("false")
    expect(onMessage).toHaveBeenLastCalledWith({ v: 1, type: "pedal", seq: 2, down: false })
  })

  test("stays pressed while any touch contact remains", () => {
    const onMessage = mock(() => {})
    render(<PedalSurface connected connectionLabel="Connected · TURN" onMessage={onMessage} />)

    const pedal = screen.getByRole("button", { name: "Sustain pedal" })
    fireEvent.pointerDown(pedal, { pointerId: 2 })
    fireEvent.pointerDown(pedal, { pointerId: 3 })
    fireEvent.lostPointerCapture(pedal, { pointerId: 2 })

    expect(pedal.getAttribute("aria-pressed")).toBe("true")
    expect(onMessage).toHaveBeenLastCalledWith({ v: 1, type: "pedal", seq: 1, down: true })

    fireEvent.pointerCancel(pedal, { pointerId: 3 })

    expect(pedal.getAttribute("aria-pressed")).toBe("false")
    expect(onMessage).toHaveBeenLastCalledWith({ v: 1, type: "pedal", seq: 2, down: false })
  })

  test("disables pedal input until WebRTC is connected", () => {
    render(<PedalSurface connected={false} connectionLabel="Connecting" onMessage={() => {}} />)

    expect(
      screen.getByRole("button", { name: "Sustain pedal" }).getAttribute("disabled"),
    ).not.toBeNull()
    expect(screen.getByRole("status").textContent).toContain("Connecting")
  })

  test("releases on disconnect without resetting the message sequence", () => {
    const onMessage = mock(() => {})
    const controller = new PedalPressController(onMessage)
    const { rerender } = render(
      <PedalSurface
        key="connected-1"
        connected
        connectionLabel="Connected · WebRTC"
        controller={controller}
      />,
    )
    let pedal = screen.getByRole("button", { name: "Sustain pedal" })
    fireEvent.pointerDown(pedal, { pointerId: 3 })

    rerender(
      <PedalSurface
        key="reconnecting"
        connected={false}
        connectionLabel="Reconnecting"
        controller={controller}
      />,
    )

    expect(onMessage).toHaveBeenLastCalledWith({ v: 1, type: "pedal", seq: 2, down: false })
    pedal = screen.getByRole("button", { name: "Sustain pedal" })
    expect(pedal.getAttribute("aria-pressed")).toBe("false")

    rerender(
      <PedalSurface
        key="connected-2"
        connected
        connectionLabel="Connected · WebRTC"
        controller={controller}
      />,
    )
    pedal = screen.getByRole("button", { name: "Sustain pedal" })
    fireEvent.pointerDown(pedal, { pointerId: 4 })

    expect(onMessage).toHaveBeenLastCalledWith({ v: 1, type: "pedal", seq: 3, down: true })
  })

  test("can request a new wake lock after the previous lock is released", async () => {
    let releaseListener: (() => void) | undefined
    const request = mock(async () => ({
      addEventListener: (_type: string, listener: () => void) => {
        releaseListener = listener
      },
      release: async () => undefined,
    }))
    Object.defineProperty(navigator, "wakeLock", {
      configurable: true,
      value: { request },
    })
    render(<PedalSurface connected connectionLabel="Connected · WebRTC" onMessage={() => {}} />)
    const pedal = screen.getByRole("button", { name: "Sustain pedal" })

    fireEvent.pointerDown(pedal, { pointerId: 10 })
    await waitFor(() => expect(request).toHaveBeenCalledTimes(1))
    releaseListener?.()
    fireEvent.pointerUp(pedal, { pointerId: 10 })
    fireEvent.pointerDown(pedal, { pointerId: 11 })

    await waitFor(() => expect(request).toHaveBeenCalledTimes(2))
  })
})
