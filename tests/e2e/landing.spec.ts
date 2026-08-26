import { expect, test } from "@playwright/test"

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
  await expect(main.getByRole("link")).toHaveCount(0)
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
  await expect(main.getByText("Sound on")).toHaveText("Sound on")
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
