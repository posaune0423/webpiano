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
  const piano = main.getByRole("group", { name: "Playable piano" })

  await expect(main.getByRole("heading", { level: 1, name: "webpiano" })).toBeVisible()
  await expect(piano).toBeVisible()
  await expect(main.getByRole("button", { name: /Play / })).toHaveCount(24)
  await expect(main.getByRole("button", { name: "Use phone as pedal" })).toBeVisible()
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

test("explains icon-only header controls on hover and focus", async ({ page }) => {
  await page.goto("/")

  const pedal = page.getByRole("button", { name: "Use phone as pedal" })
  const sustain = page.getByRole("status", {
    name: "Sustain off — hold Space or use phone pedal",
  })
  const audio = page.getByRole("status", { name: "Play a note to start audio" })

  await pedal.hover()
  await expect(
    page.locator('[data-slot="tooltip-content"]', { hasText: "Use phone as pedal" }),
  ).toBeVisible()

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
})

test("opens the legal pages from the footer", async ({ page }) => {
  await page.goto("/")

  await page.getByRole("link", { name: "Terms" }).click()
  await expect(page).toHaveURL(/\/terms$/u)
  await expect(page.getByRole("heading", { level: 1, name: "Terms" })).toBeVisible()

  await page.getByRole("link", { name: "Privacy Policy" }).click()
  await expect(page).toHaveURL(/\/privacy$/u)
  await expect(page.getByRole("heading", { level: 1, name: "Privacy Policy" })).toBeVisible()
})

test("crossfades route content with the native View Transitions API", async ({ page }) => {
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

test("removes route animation for reduced motion", async ({ page }) => {
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
