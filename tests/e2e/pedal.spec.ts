import { expect, test } from "@playwright/test"

test("pairs a phone pedal and applies sustain over WebRTC", async ({ browser, page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "Use phone as pedal" }).click()

  const dialog = page.getByRole("dialog")
  await expect(dialog.getByRole("img", { name: "QR code for phone pedal" })).toBeVisible()
  const joinUrl = await dialog.locator("code").textContent()
  expect(joinUrl).toMatch(/^http:\/\/localhost:8787\/pedal\//u)

  const phoneContext = await browser.newContext({
    hasTouch: true,
    isMobile: true,
    viewport: { width: 390, height: 844 },
  })
  const phone = await phoneContext.newPage()

  try {
    await phone.goto(joinUrl ?? "")
    await expect(phone.getByText("Connected · WebRTC")).toBeVisible()
    await expect(page.getByRole("button", { name: "Phone pedal connected" })).toBeVisible()

    const pedal = phone.getByRole("button", { name: "Sustain pedal" })
    const pedalBox = await pedal.boundingBox()
    expect(pedalBox).not.toBeNull()
    await phone.mouse.move((pedalBox?.x ?? 0) + 24, (pedalBox?.y ?? 0) + 120)
    await phone.mouse.down()

    await expect(page.getByRole("status", { name: "Sustain on" })).toBeVisible()

    const c3 = page.getByRole("button", { name: "Play C3 with Z" })
    await page.keyboard.down("z")
    await expect(c3).toHaveAttribute("aria-pressed", "true")
    await page.keyboard.up("z")
    await expect(c3).toHaveAttribute("aria-pressed", "false")
    await expect(page.getByRole("status", { name: "Sustain on" })).toBeVisible()

    await phone.mouse.up()
    await expect(
      page.getByRole("status", { name: "Sustain off — hold Space or use phone pedal" }),
    ).toBeVisible()
  } finally {
    await phoneContext.close()
  }
})
