import { describe, expect, mock, test } from "bun:test"

import { SynthPianoEngine, createPianoVoiceProfile, schedulePianoRelease } from "@/lib/piano-audio"

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
    expect(createVoice).toHaveBeenCalledWith(context, 60, 0.68, false)
  })

  test("defers note release until sustain is lifted", async () => {
    const release = mock((_kind?: string) => {})
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

    expect(release).toHaveBeenCalledWith("pedal")
  })

  test("uses normal damping when a key is released without sustain", async () => {
    const release = mock((_kind?: string) => {})
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
    engine.noteOff(60)

    expect(release).toHaveBeenCalledWith("key")
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
    expect(createVoice).toHaveBeenCalledWith(context, 60, 0.8, false)
  })

  test("allNotesOff releases sustained and pressed voices", async () => {
    const release = mock((_kind?: string) => {})
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

    expect(release).toHaveBeenCalledWith("immediate")
  })

  test("allNotesOff shortens a key release that is already fading", async () => {
    const release = mock((_kind?: string) => {})
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
    engine.noteOff(60)
    engine.allNotesOff()

    expect(release.mock.calls).toEqual([["key"], ["immediate"]])
  })

  test("allNotesOff shortens a pedal release that is already fading", async () => {
    const release = mock((_kind?: string) => {})
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
    engine.setSustain(false)
    engine.allNotesOff()

    expect(release.mock.calls).toEqual([["pedal"], ["immediate"]])
  })

  test("a rapid re-press shortens the previous release before starting a new voice", async () => {
    const firstRelease = mock((_kind?: string) => {})
    const secondRelease = mock((_kind?: string) => {})
    const context = {
      currentTime: 5,
      resume: async () => {},
      state: "running",
    } as unknown as AudioContext
    const createVoice = mock()
    createVoice.mockReturnValueOnce({ release: firstRelease })
    createVoice.mockReturnValueOnce({ release: secondRelease })
    const engine = new SynthPianoEngine(() => context, createVoice)

    await engine.noteOn(60, 0.68)
    engine.noteOff(60)
    await engine.noteOn(60, 0.68)

    expect(firstRelease.mock.calls).toEqual([["key"], ["immediate"]])
    expect(createVoice).toHaveBeenCalledTimes(2)
  })

  test("mutes existing and future voices until sound is restored", async () => {
    const setMuted = mock((_muted: boolean) => {})
    const context = {
      currentTime: 6,
      resume: async () => {},
      state: "running",
    } as unknown as AudioContext
    const createVoice = mock(
      (_context: AudioContext, _midi: number, _velocity: number, _muted: boolean) => ({
        release: () => {},
        setMuted,
      }),
    )
    const engine = new SynthPianoEngine(() => context, createVoice)

    await engine.noteOn(60, 0.68)
    engine.setMuted(true)
    await engine.noteOn(64, 0.68)
    engine.setMuted(false)

    expect(createVoice).toHaveBeenNthCalledWith(1, context, 60, 0.68, false)
    expect(createVoice).toHaveBeenNthCalledWith(2, context, 64, 0.68, true)
    expect(setMuted.mock.calls).toEqual([[true], [false], [false]])
  })
})

describe("piano voice profile", () => {
  test("keeps middle C ringing for a grand-piano-length natural tail", () => {
    const profile = createPianoVoiceProfile(60, 0.68)

    expect(profile.naturalDuration).toBeGreaterThanOrEqual(8)
    expect(profile.partials[0].decay).toBe(profile.naturalDuration)
  })

  test("lets bass strings ring longer than treble strings", () => {
    const bass = createPianoVoiceProfile(36, 0.68)
    const treble = createPianoVoiceProfile(84, 0.68)

    expect(bass.naturalDuration).toBeGreaterThan(treble.naturalDuration)
    expect(bass.pedalRelease).toBeGreaterThan(treble.pedalRelease)
  })

  test("models slightly detuned strings and inharmonic upper partials with sine waves", () => {
    const profile = createPianoVoiceProfile(60, 0.68)
    const fundamentals = profile.partials.filter((partial) => partial.harmonic === 1)
    const thirdHarmonic = profile.partials.find((partial) => partial.harmonic === 3)

    expect(fundamentals.length).toBeGreaterThanOrEqual(2)
    expect(fundamentals.some((partial) => partial.detune < 0)).toBeTrue()
    expect(fundamentals.some((partial) => partial.detune > 0)).toBeTrue()
    expect(thirdHarmonic?.detune).toBeGreaterThan(0)
    expect(profile.partials.every((partial) => partial.type === "sine")).toBeTrue()
  })

  test("damps a pedal tail more gently than a normal key release", () => {
    const profile = createPianoVoiceProfile(60, 0.68)

    expect(profile.pedalRelease).toBeGreaterThan(profile.keyRelease)
  })

  test("softens the treble above the middle register", () => {
    const middle = createPianoVoiceProfile(60, 0.68)
    const treble = createPianoVoiceProfile(79, 0.68)
    const upperPartialRatio = (profile: typeof middle) => {
      const fundamentals = profile.partials
        .filter((partial) => partial.harmonic === 1)
        .reduce((total, partial) => total + partial.gain, 0)
      const upperPartials = profile.partials
        .filter((partial) => partial.harmonic >= 3)
        .reduce((total, partial) => total + partial.gain, 0)

      return upperPartials / fundamentals
    }

    expect(treble.filterFrequency).toBeLessThan(middle.filterFrequency)
    expect(treble.filterFrequency).toBeGreaterThanOrEqual(6_800)
    expect(treble.filterFrequency).toBeLessThanOrEqual(7_500)
    expect(treble.filterQ).toBeLessThan(middle.filterQ)
    expect(treble.hammerGain).toBeLessThan(middle.hammerGain)
    expect(upperPartialRatio(treble)).toBeLessThan(upperPartialRatio(middle))
    expect(upperPartialRatio(treble)).toBeLessThanOrEqual(0.21)
  })

  test("omits treble partials above the mild acoustic ceiling", () => {
    const trebleMidi = 96
    const treble = createPianoVoiceProfile(trebleMidi, 0.68)
    const fundamental = 440 * 2 ** ((trebleMidi - 69) / 12)

    expect(treble.partials.every((partial) => fundamental * partial.harmonic <= 10_000)).toBeTrue()
  })

  test("gives the bass more low-mid core with less string beating", () => {
    const bass = createPianoVoiceProfile(48, 0.68)
    const middle = createPianoVoiceProfile(60, 0.68)
    const coreRatio = (profile: typeof bass) => {
      const fundamental = profile.partials
        .filter((partial) => partial.harmonic === 1)
        .reduce((total, partial) => total + partial.gain, 0)
      const core = profile.partials
        .filter((partial) => partial.harmonic === 2 || partial.harmonic === 3)
        .reduce((total, partial) => total + partial.gain, 0)

      return core / fundamental
    }
    const detuneSpread = (profile: typeof bass) => {
      const fundamentals = profile.partials.filter((partial) => partial.harmonic === 1)
      return (
        Math.max(...fundamentals.map((partial) => partial.detune)) -
        Math.min(...fundamentals.map((partial) => partial.detune))
      )
    }
    const coreTailRatio = (profile: typeof bass) => {
      const fundamentals = profile.partials.filter((partial) => partial.harmonic === 1)
      const corePartials = profile.partials.filter(
        (partial) => partial.harmonic === 2 || partial.harmonic === 3,
      )
      const fundamentalTail = fundamentals.reduce(
        (total, partial) => total + partial.gain * partial.tailLevel,
        0,
      )
      const coreTail = corePartials.reduce(
        (total, partial) => total + partial.gain * partial.tailLevel,
        0,
      )

      return coreTail / fundamentalTail
    }
    const totalGain = (profile: typeof bass) =>
      profile.partials.reduce((total, partial) => total + partial.gain, 0)

    expect(coreRatio(bass)).toBeGreaterThan(coreRatio(middle))
    expect(coreRatio(bass)).toBeGreaterThanOrEqual(0.42)
    expect(coreTailRatio(bass)).toBeGreaterThanOrEqual(0.27)
    expect(detuneSpread(bass)).toBeLessThan(detuneSpread(middle))
    expect(detuneSpread(bass)).toBeLessThanOrEqual(1.4)
    expect(bass.hammerGain).toBeGreaterThan(middle.hammerGain)
    expect(totalGain(bass)).toBeLessThanOrEqual(totalGain(middle) * 1.05)
  })

  test("keeps the approved middle-register profile unchanged", () => {
    const middle = createPianoVoiceProfile(60, 0.68)

    expect(middle.filterFrequency).toBe(8_180)
    expect(middle.filterQ).toBe(0.7)
    expect(middle.hammerGain).toBeCloseTo(0.68 * 0.055, 8)
  })
})

describe("piano release envelope", () => {
  test("schedules an isolated gain ramp without reading or canceling partial automation", () => {
    const exponentialRampToValueAtTime = mock((_value: number, _time: number) => undefined)
    const cancelScheduledValues = mock((_time: number) => undefined)
    const setValueAtTime = mock((_value: number, _time: number) => undefined)
    const parameter = {
      cancelScheduledValues,
      exponentialRampToValueAtTime,
      setValueAtTime,
      get value() {
        throw new Error("release scheduling must not read AudioParam.value")
      },
    } as unknown as AudioParam

    schedulePianoRelease(parameter, 4, 1.3)

    expect(cancelScheduledValues).not.toHaveBeenCalled()
    expect(setValueAtTime).toHaveBeenCalledWith(1, 4)
    expect(exponentialRampToValueAtTime).toHaveBeenCalledWith(0.0001, 5.3)
  })
})
