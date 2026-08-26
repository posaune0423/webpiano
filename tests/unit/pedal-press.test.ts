import { describe, expect, test } from "bun:test"

import { PedalPressController } from "@/lib/pedal-press"

describe("PedalPressController", () => {
  test("releases only after the final pointer leaves the pedal", () => {
    const sent: Array<{ v: 1; type: "pedal"; down: boolean; seq: number }> = []
    const pedal = new PedalPressController((message) => sent.push(message))

    pedal.press(1)
    pedal.press(2)
    pedal.release(1)

    expect(pedal.down).toBeTrue()
    expect(sent).toEqual([{ v: 1, type: "pedal", seq: 1, down: true }])

    pedal.release(2)

    expect(pedal.down).toBeFalse()
    expect(sent.at(-1)).toEqual({ v: 1, type: "pedal", seq: 2, down: false })
  })

  test("repeats the current down sequence as a heartbeat", () => {
    const sent: Array<{ v: 1; type: "pedal"; down: boolean; seq: number }> = []
    const pedal = new PedalPressController((message) => sent.push(message))

    pedal.press(7)
    pedal.heartbeat()

    expect(sent).toEqual([
      { v: 1, type: "pedal", seq: 1, down: true },
      { v: 1, type: "pedal", seq: 1, down: true },
    ])
  })

  test("forces an off message when page lifecycle cancels input", () => {
    const sent: Array<{ v: 1; type: "pedal"; down: boolean; seq: number }> = []
    const pedal = new PedalPressController((message) => sent.push(message))

    pedal.press(4)
    pedal.cancelAll()
    pedal.release(4)

    expect(pedal.down).toBeFalse()
    expect(sent).toEqual([
      { v: 1, type: "pedal", seq: 1, down: true },
      { v: 1, type: "pedal", seq: 2, down: false },
    ])
  })
})
