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
    expect(middle.partials.every((partial) => partial.phase === 0)).toBeTrue()
  })

  test("breaks up the phase-locked fundamental without shortening high sustain", () => {
    const treble = createPianoVoiceProfile(79, 0.68)
    const trebleFundamentals = treble.partials.filter((partial) => partial.harmonic === 1)
    const tailTargetTotal = treble.partials.reduce(
      (total, partial) => total + partial.gain * partial.tailLevel,
      0,
    )
    const exponentialValue = (start: number, end: number, progress: number) =>
      start * (end / start) ** progress
    const amplitudeAt = (partial: (typeof treble.partials)[number], time: number) => {
      const peak = Math.max(0.0001, partial.gain)
      const tailAt = Math.min(partial.decay * 0.28, 1.4)
      const tail = Math.max(0.0001, peak * partial.tailLevel)

      if (time <= partial.attack) {
        return exponentialValue(0.0001, peak, time / partial.attack)
      }
      if (time <= tailAt) {
        return exponentialValue(peak, tail, (time - partial.attack) / (tailAt - partial.attack))
      }
      if (time <= partial.decay) {
        return exponentialValue(tail, 0.0001, (time - tailAt) / (partial.decay - tailAt))
      }
      return 0.0001
    }
    const amplitudeAtTail = treble.partials.map((partial) => amplitudeAt(partial, 1.4))
    const fundamentalShareAtTail =
      trebleFundamentals.reduce((total, partial) => total + amplitudeAt(partial, 1.4), 0) /
      amplitudeAtTail.reduce((total, amplitude) => total + amplitude, 0)
    const eighthPartial = treble.partials.find((partial) => partial.harmonic === 8)
    const detuneSpread =
      Math.max(...trebleFundamentals.map((partial) => partial.detune)) -
      Math.min(...trebleFundamentals.map((partial) => partial.detune))
    const fundamentalDecayDifference =
      Math.max(...trebleFundamentals.map((partial) => partial.decay)) -
      Math.min(...trebleFundamentals.map((partial) => partial.decay))

    expect(treble.naturalDuration).toBeGreaterThanOrEqual(6.8)
    expect(
      trebleFundamentals.every((partial) => partial.tailLevel >= 0.36 && partial.tailLevel <= 0.42),
    ).toBeTrue()
    expect(fundamentalShareAtTail).toBeLessThanOrEqual(0.83)
    expect(tailTargetTotal).toBeGreaterThanOrEqual(0.18)
    expect(fundamentalDecayDifference).toBeGreaterThanOrEqual(0.5)
    expect(fundamentalDecayDifference).toBeLessThanOrEqual(0.8)
    expect(detuneSpread).toBeGreaterThanOrEqual(1.2)
    expect(detuneSpread).toBeLessThanOrEqual(1.4)
    expect(eighthPartial?.detune).toBeGreaterThanOrEqual(8.5)
    expect(eighthPartial?.detune).toBeLessThanOrEqual(9.5)
    expect(new Set(trebleFundamentals.map((partial) => partial.phase)).size).toBe(
      trebleFundamentals.length,
    )
    expect(new Set(treble.partials.map((partial) => partial.phase)).size).toBeGreaterThan(2)
    expect(treble.partials.some((partial) => Math.abs(partial.phase) > 0.1)).toBeTrue()
  })

  test("adds acoustic richness without restoring harsh treble partials", () => {
    const trebleMidi = 79
    const middle = createPianoVoiceProfile(60, 0.68)
    const treble = createPianoVoiceProfile(trebleMidi, 0.68)
    const gainFor = (profile: typeof treble, predicate: (harmonic: number) => boolean) =>
      profile.partials
        .filter((partial) => predicate(partial.harmonic))
        .reduce((total, partial) => total + partial.gain, 0)
    const middleFundamentalGain = gainFor(middle, (harmonic) => harmonic === 1)
    const trebleFundamentalGain = gainFor(treble, (harmonic) => harmonic === 1)
    const trebleCoreGain = gainFor(treble, (harmonic) => harmonic === 2 || harmonic === 3)
    const trebleHighGain = gainFor(treble, (harmonic) => harmonic >= 5)
    const trebleFundamentals = treble.partials.filter((partial) => partial.harmonic === 1)
    const fundamentalFrequency = 440 * 2 ** ((trebleMidi - 69) / 12)
    const beatFrequencies = trebleFundamentals
      .flatMap((left, leftIndex) =>
        trebleFundamentals
          .slice(leftIndex + 1)
          .map((right) =>
            Math.abs(
              fundamentalFrequency * 2 ** (left.detune / 1_200) -
                fundamentalFrequency * 2 ** (right.detune / 1_200),
            ),
          ),
      )
      .sort((left, right) => left - right)
    const sortedDecays = trebleFundamentals
      .map((partial) => partial.decay)
      .sort((left, right) => left - right)
    const decayIntervals = sortedDecays.slice(1).map((decay, index) => decay - sortedDecays[index])

    expect(trebleFundamentals).toHaveLength(3)
    expect(trebleFundamentalGain).toBeCloseTo(middleFundamentalGain, 8)
    expect(trebleCoreGain / trebleFundamentalGain).toBeGreaterThanOrEqual(0.31)
    expect(trebleHighGain / trebleFundamentalGain).toBeLessThanOrEqual(0.06)
    expect(beatFrequencies[1] - beatFrequencies[0]).toBeGreaterThanOrEqual(0.05)
    expect(Math.min(...decayIntervals)).toBeGreaterThanOrEqual(0.1)
    expect(treble.bodyFrequency).toBeGreaterThanOrEqual(900)
    expect(treble.bodyFrequency).toBeLessThanOrEqual(1_200)
    expect(treble.bodyGain).toBeGreaterThanOrEqual(1.7)
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
