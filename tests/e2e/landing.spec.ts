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
  await expect(main.getByRole("status", { name: "Standard range" })).toHaveText("C3–G5")
  await expect(main.getByRole("status", { name: /Sustain (on|off)/ })).toBeVisible()
  await expect(main.getByRole("status", { name: "Play a note to start audio" })).toBeVisible()
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

  await main.getByRole("button", { name: "Standard semitone down" }).click()
  await expect(main.getByRole("status", { name: "Standard range" })).toHaveText("B2–F♯5")
  await main.getByRole("button", { name: "Standard semitone up" }).click()

  const c3 = main.getByRole("button", { name: "Play C3 with Z" })
  const cSharp3 = main.getByRole("button", { name: "Play C♯3 with S" })
  const minimumWhiteKeyHeight = testInfo.project.name === "desktop-chromium" ? 500 : 200
  const minimumBlackKeyHeight = testInfo.project.name === "desktop-chromium" ? 300 : 120
  await expect
    .poll(async () => (await c3.boundingBox())?.height ?? 0)
    .toBeGreaterThan(minimumWhiteKeyHeight)
  await expect
    .poll(async () => (await cSharp3.boundingBox())?.height ?? 0)
    .toBeGreaterThan(minimumBlackKeyHeight)

  await page.keyboard.down("z")
  await expect(c3).toHaveAttribute("aria-pressed", "true")
  await expect(main.getByRole("status", { name: "Sound on" })).toBeVisible()
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

test("opens Dual Range without changing the standard first view", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile-portrait-chromium",
    "Portrait shows only the landscape orientation guide",
  )

  await page.goto("/")

  const main = page.getByRole("main")
  await expect(main.getByRole("group", { name: "Playable piano" })).toBeVisible()
  await expect(main.getByRole("figure", { name: "Full piano range from A0 to C8" })).toHaveCount(0)

  await main.getByRole("button", { name: "Open Dual Range" }).click()

  const navigator = main.getByRole("figure", { name: "Full piano range from A0 to C8" })
  await expect(navigator).toBeVisible()
  const lowerPiano = main.getByRole("group", { name: "Lower playable piano" })
  const upperPiano = main.getByRole("group", { name: "Upper playable piano" })
  await expect(lowerPiano).toBeVisible()
  await expect(upperPiano).toBeVisible()
  await expect(main.getByRole("button", { name: /Play / })).toHaveCount(37)

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

  await main.getByRole("button", { name: "Lower semitone down" }).click()
  await expect(main.getByRole("status", { name: "Lower range" })).toHaveText("B2–D♯4")

  const lowerC = main.getByRole("button", { name: "Play B2 with Z" })
  await page.keyboard.down("z")
  await expect(lowerC).toHaveAttribute("aria-pressed", "true")
  await expect(navigator.locator('[data-midi="47"]')).toHaveAttribute("data-active", "true")
  await page.keyboard.up("z")

  const lowerRange = main.getByRole("slider", { name: "Move Lower range" })
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

  await main.getByRole("button", { name: "Close Dual Range" }).click()
  await expect(main.getByRole("group", { name: "Playable piano" })).toBeVisible()
  await expect(navigator).toHaveCount(0)
})

test("explains icon-only header controls on hover and focus", async ({ page }, testInfo) => {
  test.skip(
    testInfo.project.name === "mobile-portrait-chromium",
    "Portrait shows only the landscape orientation guide",
  )
  await page.goto("/")

  const pedal = page.getByRole("button", { name: "Pedal" })
  const sustain = page.getByRole("status", {
    name: "Sustain off — hold Space or use phone pedal",
  })
  const audio = page.getByRole("status", { name: "Play a note to start audio" })
  const dualRange = page.getByRole("button", { name: "Open Dual Range" })

  await pedal.hover()
  await expect(page.locator('[data-slot="tooltip-content"]', { hasText: "Pedal" })).toBeVisible()

  await sustain.focus()
  await expect(
    page.locator('[data-slot="tooltip-content"]', {
      hasText: "Sustain off — hold Space or use phone pedal",
    }),
  ).toBeVisible()

  await audio.focus()
  await expect(
    page.locator('[data-slot="tooltip-content"]', { hasText: "Play a note to start audio" }),
  ).toBeVisible()

  await dualRange.hover()
  await expect(
    page.locator('[data-slot="tooltip-content"]', {
      hasText: "Play two independent keyboard ranges",
    }),
  ).toBeVisible()
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
  const before = await main.boundingBox()
  await page.getByRole("button", { name: "Pedal" }).click()

  const sustainLock = page.getByRole("menuitemcheckbox", { name: /Sustain lock/ })
  await expect(sustainLock).toBeVisible()
  await expect(page.getByRole("menuitem", { name: /Use phone as pedal/ })).toBeVisible()
  const after = await main.boundingBox()
  expect(after).toEqual(before)

  await sustainLock.click()
  await expect(page.getByRole("status", { name: "Sustain on" })).toBeVisible()
  await page.keyboard.down("Space")
  await page.keyboard.up("Space")
  await expect(page.getByRole("status", { name: "Sustain on" })).toBeVisible()

  await page.getByRole("button", { name: "Pedal" }).click()
  await page.getByRole("menuitem", { name: /Use phone as pedal/ }).click()
  await expect(page.getByRole("dialog", { name: "Connect your phone" })).toBeVisible()
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
