import { expect, test } from "@playwright/test"
import type { Page } from "@playwright/test"

interface ViewTransitionAnimation {
  delay: number
  duration: number
  pseudoElement: string
}

interface ViewTransitionProbe {
  animations: ViewTransitionAnimation[]
  readyCount: number
}

async function installViewTransitionProbe(page: Page) {
  await page.evaluate(() => {
    const originalStartViewTransition = document.startViewTransition.bind(document)
    const probeWindow = window as Window & {
      __viewTransitionProbe?: ViewTransitionProbe
    }
    probeWindow.__viewTransitionProbe = { animations: [], readyCount: 0 }
    document.startViewTransition = ((
      ...options: Parameters<typeof document.startViewTransition>
    ) => {
      const transition = originalStartViewTransition(...options)
      void transition.ready.then(() => {
        probeWindow.__viewTransitionProbe = {
          animations: document.getAnimations().flatMap((animation) => {
            const effect = animation.effect as KeyframeEffect | null
            const pseudoElement = effect?.pseudoElement
            if (!effect || !pseudoElement?.startsWith("::view-transition")) {
              return []
            }
            const timing = effect.getTiming()
            return [
              {
                delay: Number(timing.delay ?? 0),
                duration: Number(timing.duration),
                pseudoElement,
              },
            ]
          }),
          readyCount: (probeWindow.__viewTransitionProbe?.readyCount ?? 0) + 1,
        }
      })
      return transition
    }) as typeof document.startViewTransition
  })
}

async function readViewTransitionProbe(page: Page) {
  return page.evaluate(
    () =>
      (window as Window & { __viewTransitionProbe?: ViewTransitionProbe })
        .__viewTransitionProbe ?? { animations: [], readyCount: 0 },
  )
}

test("opens directly into the responsive playable piano without page overflow", async ({
  page,
}, testInfo) => {
  await page.goto("/")

  const main = page.getByRole("main")
  const orientationGuide = page.getByRole("region", { name: "Landscape orientation required" })

  if (testInfo.project.name === "mobile-portrait-chromium") {
    await expect(orientationGuide).toBeVisible()
    await expect(page.getByText("Turn your device sideways")).toBeVisible()
    await expect(main).toBeHidden()
    return
  }

  await expect(orientationGuide).toBeHidden()
  const piano = main.getByRole("group", { name: "Playable piano" })

  await expect(main.getByRole("heading", { level: 1, name: "webpiano Online piano" })).toBeVisible()
  const taskDescription = main.getByText(
    "Play this free online piano with your computer keyboard or touch. No download or sign-up.",
  )
  if (testInfo.project.name === "mobile-landscape-chromium") {
    await expect(taskDescription).toBeAttached()
  } else {
    await expect(taskDescription).toBeVisible()
  }
  await expect(piano).toBeVisible()
  await expect(main.getByRole("button", { name: /Play / })).toHaveCount(32)
  await expect(main.getByRole("button", { name: "Pedal" })).toBeVisible()
  await expect(main.getByRole("button", { name: "Install webpiano" })).toBeVisible()
  await expect(main.getByRole("status", { name: "Standard range" })).toHaveText("C3–G5")
  const transpositionReadout = main.getByLabel("Standard transposition key C")
  await expect(transpositionReadout).toHaveText("Key C")
  await expect(main.locator("header").getByLabel(/transposition key/)).toHaveCount(0)
  await expect(main.locator("section").getByLabel("Standard transposition key C")).toHaveCount(1)
  const movementGuide = main.getByRole("note", {
    name: "Use Left and Right Arrow keys to move the range",
  })
  await expect(movementGuide).toContainText("Move range")
  await expect(movementGuide.locator('[data-slot="kbd"]')).toHaveCount(2)
  const pedalStatus = main.getByRole("note", {
    name: "Pedal off. Press Space to turn the sustain pedal on or off",
  })
  await expect(pedalStatus).toHaveText("Pedal off")
  await expect(pedalStatus).toHaveAttribute("data-pedal-active", "false")
  await expect(pedalStatus).toHaveAttribute("data-pedal-source", "none")
  await expect(main.getByRole("button", { name: /semitone (down|up)/ })).toHaveCount(0)
  await expect(main.getByRole("status", { name: /Sustain (on|off)/ })).toBeAttached()
  await expect(main.getByRole("status", { name: "Play a note to start audio" })).toBeAttached()
  await expect(main.getByRole("group", { name: "Keyboard mode" })).toBeVisible()
  await expect(main.getByRole("button", { name: "Single keyboard" })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  await expect(main.getByRole("button", { name: "Dual keyboard" })).toHaveAttribute(
    "aria-pressed",
    "false",
  )
  await expect(main.getByRole("button", { name: "Mute sound" })).toHaveAttribute(
    "aria-pressed",
    "false",
  )
  const navigator = main.getByRole("figure", { name: "Full piano range from A0 to C8" })
  await expect(navigator).toBeVisible()
  await expect(main.getByRole("slider", { name: "Move Standard range" })).toBeVisible()
  await expect(main.getByText("A0 — C8 · 88-key piano")).toBeVisible()
  await expect(main.getByRole("link", { name: "Terms" })).toHaveAttribute("href", "/terms")
  await expect(main.getByRole("link", { name: "Privacy Policy" })).toHaveAttribute(
    "href",
    "/privacy",
  )
  await expect(main.getByText("Fixed touch · mf")).toHaveCount(0)
  await expect(main.getByText("Space holds the pedal")).toHaveCount(0)
  await expect(main.getByText("Coming soon")).toHaveCount(0)

  const mergedKeycap = main.getByRole("button", { name: "Play C4 with Q · ," }).locator("kbd")
  await expect
    .poll(async () =>
      mergedKeycap.evaluate(
        (element) =>
          element.scrollWidth <= element.clientWidth &&
          element.scrollHeight <= element.clientHeight,
      ),
    )
    .toBe(true)

  const standardSummary = main.locator("span").filter({ hasText: /· 32 notes · 37 keys$/ })
  const notesLeft = async () =>
    standardSummary.evaluate((element) => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
      let node = walker.nextNode()

      while (node) {
        const markerIndex = node.textContent?.indexOf("32 notes") ?? -1
        if (markerIndex >= 0) {
          const range = document.createRange()
          range.setStart(node, markerIndex)
          range.setEnd(node, markerIndex + "32 notes".length)
          return range.getBoundingClientRect().left
        }
        node = walker.nextNode()
      }

      throw new Error("32 notes marker was not rendered")
    })
  const naturalNotesLeft =
    testInfo.project.name === "desktop-chromium" ? await notesLeft() : undefined

  await page.keyboard.press("ArrowLeft")
  await expect(main.getByRole("status", { name: "Standard range" })).toHaveText("B2–F♯5")
  await expect(main.getByLabel("Standard transposition key B")).toHaveText("Key B")
  if (naturalNotesLeft !== undefined) {
    await expect.poll(notesLeft).toBeCloseTo(naturalNotesLeft, 0)
  }
  await page.keyboard.press("ArrowRight")
  await expect(main.getByLabel("Standard transposition key C")).toHaveText("Key C")

  const c3 = main.getByRole("button", { name: "Play C3 with Z" })
  const cSharp3 = main.getByRole("button", { name: "Play C♯3 with S" })
  const minimumWhiteKeyHeight = testInfo.project.name === "desktop-chromium" ? 430 : 190
  const minimumBlackKeyHeight = testInfo.project.name === "desktop-chromium" ? 260 : 110
  await expect
    .poll(async () => (await c3.boundingBox())?.height ?? 0)
    .toBeGreaterThan(minimumWhiteKeyHeight)
  await expect
    .poll(async () => (await cSharp3.boundingBox())?.height ?? 0)
    .toBeGreaterThan(minimumBlackKeyHeight)

  await page.keyboard.down("z")
  await expect(c3).toHaveAttribute("aria-pressed", "true")
  await expect(main.getByRole("status", { name: "Sound on" })).toBeAttached()
  await page.keyboard.up("z")
  await expect(c3).toHaveAttribute("aria-pressed", "false")

  const c3Box = await c3.boundingBox()
  expect(c3Box).not.toBeNull()
  if (testInfo.project.name === "mobile-landscape-chromium") {
    expect((c3Box?.y ?? 0) + (c3Box?.height ?? 0)).toBeLessThanOrEqual(390)
  }
  await page.mouse.move((c3Box?.x ?? 0) + 12, (c3Box?.y ?? 0) + 12)
  await page.mouse.down()
  await expect(c3).toHaveAttribute("aria-pressed", "true")
  await page.mouse.up()
  await expect(c3).toHaveAttribute("aria-pressed", "false")

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasHorizontalOverflow).toBe(false)
})

test("shares one 88-key navigator between Standard and Dual Range", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile-portrait-chromium",
    "Portrait shows only the landscape orientation guide",
  )

  await page.goto("/")

  const main = page.getByRole("main")
  await expect(main.getByRole("group", { name: "Playable piano" })).toBeVisible()
  const navigator = main.getByRole("figure", { name: "Full piano range from A0 to C8" })
  await expect(navigator).toBeVisible()
  await expect(main.getByRole("slider", { name: "Move Standard range" })).toBeVisible()
  await expect(main.getByRole("button", { name: "Single keyboard" })).toHaveAttribute(
    "aria-pressed",
    "true",
  )

  await main.getByRole("button", { name: "Dual keyboard" }).click()

  await expect(navigator).toBeVisible()
  await expect(navigator).toHaveCount(1)
  await expect(main.getByRole("slider", { name: "Move Standard range" })).toHaveCount(0)
  await expect(main.getByRole("slider", { name: "Move Lower range" })).toBeVisible()
  await expect(main.getByRole("slider", { name: "Move Upper range" })).toBeVisible()
  await expect(main.getByRole("button", { name: "Dual keyboard" })).toHaveAttribute(
    "aria-pressed",
    "true",
  )
  const lowerPiano = main.getByRole("group", { name: "Lower playable piano" })
  const upperPiano = main.getByRole("group", { name: "Upper playable piano" })
  await expect(lowerPiano).toBeVisible()
  await expect(upperPiano).toBeVisible()
  await expect(main.getByRole("button", { name: /Play / })).toHaveCount(37)
  await expect(main.getByLabel("Lower transposition key C, Upper transposition key C")).toHaveText(
    "L C · U C",
  )
  await expect(main.locator("header").getByLabel(/transposition key/)).toHaveCount(0)
  await expect(main.locator("section").getByLabel(/Lower transposition key/)).toHaveCount(1)
  await expect(
    main.getByRole("note", {
      name: "Select a range, then use Left and Right Arrow keys for fine movement",
    }),
  ).toContainText("Fine move")
  await expect(main.getByRole("button", { name: /semitone (down|up)/ })).toHaveCount(0)

  const minimumZoneHeight = testInfo.project.name === "desktop-chromium" ? 300 : 120
  await expect
    .poll(async () => (await lowerPiano.boundingBox())?.height ?? 0)
    .toBeGreaterThan(minimumZoneHeight)
  await expect
    .poll(async () => (await upperPiano.boundingBox())?.height ?? 0)
    .toBeGreaterThan(minimumZoneHeight)

  const navigatorBox = await navigator.boundingBox()
  expect(navigatorBox).not.toBeNull()
  expect((navigatorBox?.width ?? 0) / (navigatorBox?.height ?? 1)).toBeGreaterThan(7.8)
  expect((navigatorBox?.width ?? 0) / (navigatorBox?.height ?? 1)).toBeLessThan(8.6)

  const lowerRange = main.getByRole("slider", { name: "Move Lower range" })
  await expect(lowerRange).toHaveAttribute("aria-describedby", "range-movement-guide")
  await lowerRange.click()
  await expect(lowerRange).toBeFocused()
  await page.keyboard.press("ArrowLeft")
  await lowerRange.blur()
  await expect(main.getByRole("status", { name: "Lower range" })).toHaveText("B2–D♯4")
  await expect(main.getByLabel("Lower transposition key B, Upper transposition key C")).toHaveText(
    "L B · U C",
  )

  const lowerC = main.getByRole("button", { name: "Play B2 with Z" })
  await page.keyboard.down("z")
  await expect(lowerC).toHaveAttribute("aria-pressed", "true")
  await expect(navigator.locator('[data-midi="47"]')).toHaveAttribute("data-active", "true")
  await page.keyboard.up("z")

  const lowerRangeBox = await lowerRange.boundingBox()
  const navigatorBoxForDrag = await navigator.boundingBox()
  expect(lowerRangeBox).not.toBeNull()
  expect(navigatorBoxForDrag).not.toBeNull()
  const startMidi = Number(await lowerRange.getAttribute("aria-valuenow"))
  await page.mouse.move(
    (lowerRangeBox?.x ?? 0) + (lowerRangeBox?.width ?? 0) / 2,
    (lowerRangeBox?.y ?? 0) + (lowerRangeBox?.height ?? 0) / 2,
  )
  await page.mouse.down()
  await page.mouse.move(
    (lowerRangeBox?.x ?? 0) +
      (lowerRangeBox?.width ?? 0) / 2 -
      (navigatorBoxForDrag?.width ?? 0) * 0.06,
    (lowerRangeBox?.y ?? 0) + (lowerRangeBox?.height ?? 0) / 2,
  )
  await expect(lowerRange).toHaveAttribute("data-dragging", "true")
  await page.mouse.up()
  await expect
    .poll(async () => Number(await lowerRange.getAttribute("aria-valuenow")))
    .toBeLessThan(startMidi)

  await main.getByRole("button", { name: "Single keyboard" }).click()
  await expect(main.getByRole("group", { name: "Playable piano" })).toBeVisible()
  await expect(navigator).toBeVisible()
  await expect(main.getByRole("slider", { name: "Move Standard range" })).toBeVisible()
})

test("explains icon-only header controls on hover and focus", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile-portrait-chromium",
    "Portrait shows only the landscape orientation guide",
  )
  await page.goto("/")

  const pedal = page.getByRole("button", { name: "Pedal" })
  const sustain = page.getByRole("status", {
    name: "Sustain off — press Space or use phone pedal",
  })
  const audio = page.getByRole("status", { name: "Play a note to start audio" })
  const singleMode = page.getByRole("button", { name: "Single keyboard" })
  const dualMode = page.getByRole("button", { name: "Dual keyboard" })
  const soundToggle = page.getByRole("button", { name: "Mute sound" })
  await expect(singleMode.locator("[data-single-range-icon]")).toBeVisible()
  await expect(dualMode.locator("[data-dual-range-icon]")).toBeVisible()

  await pedal.hover()
  await expect(page.locator('[data-slot="tooltip-content"]', { hasText: "Pedal" })).toBeVisible()

  await expect(sustain).toBeAttached()

  await expect(audio).toBeAttached()
  await soundToggle.hover()
  await expect(
    page.locator('[data-slot="tooltip-content"]', { hasText: "Mute sound" }),
  ).toBeVisible()

  await soundToggle.click()
  const unmute = page.getByRole("button", { name: "Unmute sound" })
  await expect(unmute).toHaveAttribute("aria-pressed", "true")
  await expect(unmute.locator('[data-sound-icon="muted"]')).toBeVisible()
})

test("opens the pedal menu without shifting the instrument and locks sustain", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile-portrait-chromium",
    "Portrait shows only the landscape orientation guide",
  )
  await page.goto("/")

  const main = page.getByRole("main")
  const pedal = page.getByRole("button", { name: "Pedal" })
  await expect(pedal).toHaveAttribute("data-sustain-active", "false")
  const before = await main.boundingBox()
  await pedal.click()

  const sustainLock = page.getByRole("menuitemcheckbox", { name: /Sustain lock/ })
  await expect(sustainLock).toBeVisible()
  await expect(page.getByRole("menuitem", { name: /Use phone as pedal/ })).toBeVisible()
  const after = await main.boundingBox()
  expect(after).toEqual(before)

  await sustainLock.click()
  await expect(page.getByRole("status", { name: "Sustain locked" })).toBeVisible()
  await expect(pedal).toHaveAttribute("data-sustain-active", "true")
  await expect(pedal).toHaveAttribute("data-sustain-locked", "true")
  await expect(pedal.locator('[data-pedal-lock="locked"]')).toBeVisible()
  await page.keyboard.down("Space")
  await page.keyboard.up("Space")
  await expect(
    page.getByRole("status", { name: "Sustain off — press Space or use phone pedal" }),
  ).toBeVisible()
  await expect(pedal).toHaveAttribute("data-sustain-locked", "false")
  await expect(pedal.locator('[data-pedal-lock="unlocked"]')).toBeVisible()

  await page.getByRole("button", { name: "Pedal" }).click()
  await page.getByRole("menuitem", { name: /Use phone as pedal/ }).click()
  await expect(page.getByRole("dialog", { name: "Connect your phone" })).toBeVisible()
})

test("opens a stable fallback Drawer and runs the desktop prompt from the header", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile-portrait-chromium",
    "Portrait shows only the landscape orientation guide",
  )
  await page.goto("/")

  const installTrigger = page.getByRole("button", { name: "Install webpiano" })
  const installSlot = page.locator("[data-install-state]")
  const triggerBoxBefore = await installSlot.boundingBox()
  expect(triggerBoxBefore).not.toBeNull()

  await installTrigger.click()
  const drawer = page.getByRole("dialog", { name: "Install webpiano" })
  await expect(drawer).toBeVisible()
  await expect(drawer.getByText("Use your browser’s install option")).toBeVisible()
  const installContent = drawer.locator("[data-install-content]")
  const contentSize = async () => {
    const box = await installContent.boundingBox()
    return { height: box?.height ?? 0, width: box?.width ?? 0 }
  }
  await expect.poll(async () => (await contentSize()).height).toBe(128)
  const contentSizeBefore = await contentSize()

  await page.evaluate(() => {
    const probeWindow = window as Window & { __installPromptCount?: number }
    probeWindow.__installPromptCount = 0
    const event = new Event("beforeinstallprompt", { cancelable: true })
    Object.defineProperty(event, "prompt", {
      value: async () => {
        probeWindow.__installPromptCount = (probeWindow.__installPromptCount ?? 0) + 1
        return { outcome: "accepted", platform: "web" }
      },
    })
    window.dispatchEvent(event)
  })

  await expect(installSlot).toHaveAttribute("data-install-state", "installable")
  const triggerBoxAfter = await installSlot.boundingBox()
  expect(triggerBoxAfter).toEqual(triggerBoxBefore)
  await expect
    .poll(async () => (await contentSize()).height)
    .toBeCloseTo(contentSizeBefore.height, 3)
  await expect.poll(async () => (await contentSize()).width).toBeCloseTo(contentSizeBefore.width, 3)

  await drawer.getByRole("button", { name: "Close" }).click()
  await expect(drawer).toBeHidden()
  await installTrigger.click()
  await expect
    .poll(async () =>
      page.evaluate(
        () => (window as Window & { __installPromptCount?: number }).__installPromptCount ?? 0,
      ),
    )
    .toBe(1)
  await expect(drawer).toBeHidden()

  await page.evaluate(() => window.dispatchEvent(new Event("appinstalled")))
  await expect(page.getByRole("button", { name: "webpiano is installed" })).toHaveAttribute(
    "data-install-state",
    "installed",
  )
  expect(await installSlot.boundingBox()).toEqual(triggerBoxBefore)
})

test("shows Add to Home Screen steps on iPhone and iPad browsers", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name !== "mobile-landscape-chromium",
    "The manual mobile install flow is covered in landscape",
  )
  await page.addInitScript(() => {
    Object.defineProperties(navigator, {
      maxTouchPoints: { configurable: true, get: () => 5 },
      platform: { configurable: true, get: () => "iPhone" },
      userAgent: {
        configurable: true,
        get: () => "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
      },
    })
  })
  await page.goto("/")

  await page.getByRole("button", { name: "Install webpiano" }).click()
  const drawer = page.getByRole("dialog", { name: "Install webpiano" })
  await expect(drawer.getByText("Add to Home Screen")).toBeVisible()
  await expect(drawer.getByText(/Tap the browser’s/)).toBeVisible()
  await expect(drawer.getByText("Space toggles Sustain Lock.")).toBeVisible()
})

test("opens the legal pages from the footer", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile-portrait-chromium",
    "Portrait shows only the landscape orientation guide",
  )
  await page.goto("/")

  await page.getByRole("link", { name: "Terms" }).click()
  await expect(page).toHaveURL(/\/terms$/u)
  await expect(page.getByRole("heading", { level: 1, name: "Terms" })).toBeVisible()

  await page.getByRole("link", { name: "Privacy Policy" }).click()
  await expect(page).toHaveURL(/\/privacy$/u)
  await expect(page.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeVisible()
})

test("crossfades route content with the native View Transitions API", async ({
  page,
}, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile-portrait-chromium",
    "Portrait shows only the landscape orientation guide",
  )
  await page.goto("/")
  await installViewTransitionProbe(page)

  await page.getByRole("link", { name: "Terms" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Terms" })).toBeVisible()
  await expect
    .poll(async () => (await readViewTransitionProbe(page)).animations)
    .toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          delay: 0,
          duration: 400,
          pseudoElement: "::view-transition-old(crossfade)",
        }),
        expect.objectContaining({
          delay: 200,
          duration: 600,
          pseudoElement: "::view-transition-new(crossfade)",
        }),
      ]),
    )

  await page.getByRole("link", { name: "Privacy Policy" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeVisible()
})

test("removes route animation for reduced motion", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile-portrait-chromium",
    "Portrait shows only the landscape orientation guide",
  )
  await page.emulateMedia({ reducedMotion: "reduce" })
  await page.goto("/")
  await installViewTransitionProbe(page)

  await page.getByRole("link", { name: "Terms" }).click()
  await expect(page.getByRole("heading", { level: 1, name: "Terms" })).toBeVisible()
  await expect
    .poll(async () => {
      const probe = await readViewTransitionProbe(page)
      return (
        probe.readyCount > 0 &&
        probe.animations.every(({ delay, duration }) => delay === 0 && duration === 0)
      )
    })
    .toBe(true)
})
