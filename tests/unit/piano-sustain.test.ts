import { describe, expect, mock, test } from "bun:test"

import { SustainSources } from "@/lib/piano-sustain"

describe("SustainSources", () => {
  test("keeps sustain enabled until the final input source releases", () => {
    const onChange = mock(() => {})
    const sources = new SustainSources(onChange)

    sources.set("keyboard", true)
    sources.set("remote-pedal", true)
    sources.set("keyboard", false)

    expect(onChange).toHaveBeenCalledTimes(1)
    expect(onChange).toHaveBeenLastCalledWith(true)
    expect(sources.active).toBeTrue()

    sources.set("remote-pedal", false)

    expect(onChange).toHaveBeenNthCalledWith(2, false)
    expect(sources.active).toBeFalse()
  })

  test("clears only the disconnected remote pedal source", () => {
    const onChange = mock(() => {})
    const sources = new SustainSources(onChange)

    sources.set("keyboard", true)
    sources.set("remote-pedal", true)
    sources.clear("remote-pedal")

    expect(sources.has("keyboard")).toBeTrue()
    expect(sources.has("remote-pedal")).toBeFalse()
    expect(sources.active).toBeTrue()
    expect(onChange).toHaveBeenCalledTimes(1)
  })

  test("clears every source during instrument teardown", () => {
    const onChange = mock(() => {})
    const sources = new SustainSources(onChange)

    sources.set("keyboard", true)
    sources.set("remote-pedal", true)
    sources.clearAll()

    expect(sources.active).toBeFalse()
    expect(onChange).toHaveBeenNthCalledWith(2, false)
  })

  test("keeps a manual lock active after the keyboard pedal releases", () => {
    const onChange = mock(() => {})
    const sources = new SustainSources(onChange)

    sources.set("manual-lock", true)
    sources.set("keyboard", true)
    sources.set("keyboard", false)

    expect(sources.has("manual-lock")).toBeTrue()
    expect(sources.active).toBeTrue()
    expect(onChange).toHaveBeenCalledTimes(1)

    sources.set("manual-lock", false)

    expect(sources.active).toBeFalse()
    expect(onChange).toHaveBeenNthCalledWith(2, false)
  })
})
