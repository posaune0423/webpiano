import { describe, expect, test } from "bun:test"

import { RemotePedalState } from "@/lib/pedal-state"

describe("RemotePedalState", () => {
  test("applies only monotonic pedal state changes", () => {
    const state = new RemotePedalState(750)

    expect(state.accept({ v: 1, type: "pedal", seq: 4, down: true }, 1_000)).toBe(true)
    expect(state.accept({ v: 1, type: "pedal", seq: 3, down: false }, 1_100)).toBeUndefined()
    expect(state.down).toBeTrue()
    expect(state.accept({ v: 1, type: "pedal", seq: 5, down: false }, 1_200)).toBe(false)
    expect(state.down).toBeFalse()
  })

  test("refreshes the deadman timer when the current state is repeated", () => {
    const state = new RemotePedalState(750)

    state.accept({ v: 1, type: "pedal", seq: 1, down: true }, 1_000)
    expect(state.accept({ v: 1, type: "pedal", seq: 1, down: true }, 1_500)).toBeUndefined()
    expect(state.expire(2_200)).toBeUndefined()
    expect(state.expire(2_251)).toBe(false)
    expect(state.down).toBeFalse()
  })

  test("resets sequence ownership for a replacement data channel", () => {
    const state = new RemotePedalState(750)

    state.accept({ v: 1, type: "pedal", seq: 10, down: true }, 1_000)
    expect(state.reset()).toBe(false)
    expect(state.accept({ v: 1, type: "pedal", seq: 1, down: true }, 1_100)).toBe(true)
  })
})
