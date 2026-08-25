import { describe, expect, mock, test } from "bun:test"

import { SynthPianoEngine } from "./piano-audio"

describe("SynthPianoEngine", () => {
  test("resumes the interactive audio context before starting a note", async () => {
    const resume = mock(async () => {})
    const release = mock(() => {})
    const context = {
      currentTime: 1,
      resume,
      state: "suspended",
    } as unknown as AudioContext
    const createVoice = mock(() => ({ release }))
    const engine = new SynthPianoEngine(() => context, createVoice)

    await engine.noteOn(60, 0.68)

    expect(resume).toHaveBeenCalledTimes(1)
    expect(createVoice).toHaveBeenCalledWith(context, 60, 0.68)
  })

  test("defers note release until sustain is lifted", async () => {
    const release = mock(() => {})
    const context = {
      currentTime: 2,
      resume: async () => {},
      state: "running",
    } as unknown as AudioContext
    const engine = new SynthPianoEngine(
      () => context,
      () => ({ release }),
    )

    await engine.noteOn(60, 0.68)
    engine.setSustain(true)
    engine.noteOff(60)

    expect(release).not.toHaveBeenCalled()

    engine.setSustain(false)

    expect(release).toHaveBeenCalledTimes(1)
  })

  test("does not start a stale voice when keyup wins the resume race", async () => {
    let finishResume: (() => void) | undefined
    const resume = mock(async () => {
      await new Promise<void>((resolve) => {
        finishResume = resolve
      })
    })
    const context = {
      currentTime: 3,
      resume,
      state: "suspended",
    } as unknown as AudioContext
    const createVoice = mock(() => ({ release: () => {} }))
    const engine = new SynthPianoEngine(() => context, createVoice)

    const noteStarted = engine.noteOn(60, 0.68)
    engine.noteOff(60)
    finishResume?.()
    await noteStarted

    expect(createVoice).not.toHaveBeenCalled()
  })

  test("starts only the latest attack after a rapid re-press during resume", async () => {
    const resumeResolvers: Array<() => void> = []
    const context = {
      currentTime: 4,
      resume: async () => {
        await new Promise<void>((resolve) => resumeResolvers.push(resolve))
      },
      state: "suspended",
    } as unknown as AudioContext
    const createVoice = mock((_context: AudioContext, _midi: number, velocity: number) => ({
      release: () => {},
      velocity,
    }))
    const engine = new SynthPianoEngine(() => context, createVoice)

    const firstAttack = engine.noteOn(60, 0.2)
    engine.noteOff(60)
    const secondAttack = engine.noteOn(60, 0.8)

    resumeResolvers[0]?.()
    await firstAttack
    resumeResolvers[1]?.()
    await secondAttack

    expect(createVoice).toHaveBeenCalledTimes(1)
    expect(createVoice).toHaveBeenCalledWith(context, 60, 0.8)
  })

  test("allNotesOff releases sustained and pressed voices", async () => {
    const release = mock(() => {})
    const context = {
      currentTime: 5,
      resume: async () => {},
      state: "running",
    } as unknown as AudioContext
    const engine = new SynthPianoEngine(
      () => context,
      () => ({ release }),
    )

    await engine.noteOn(60, 0.68)
    engine.setSustain(true)
    engine.noteOff(60)
    engine.allNotesOff()

    expect(release).toHaveBeenCalledTimes(1)
  })
})
