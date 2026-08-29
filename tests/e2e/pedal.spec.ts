import { expect, test } from "@playwright/test"

test("pairs a phone pedal and applies sustain over WebRTC", async ({ browser, page }) => {
  await page.goto("/")
  await page.getByRole("button", { name: "Pedal" }).click()
  await page.getByRole("menuitem", { name: /Use phone as pedal/ }).click()

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
    await expect(dialog).toBeHidden()
    await expect(page.getByRole("button", { name: "Pedal" })).toBeVisible()

    const pedal = phone.getByRole("button", { name: "Sustain pedal" })
    const pedalBox = await pedal.boundingBox()
    expect(pedalBox).not.toBeNull()
    await phone.mouse.move((pedalBox?.x ?? 0) + 24, (pedalBox?.y ?? 0) + 120)
    await phone.mouse.down()

    await expect(page.getByRole("status", { name: "Sustain on" })).toBeVisible()
    const phonePedalStatus = page.getByRole("note", {
      name: "Phone pedal is down. Space toggles Sustain Lock",
    })
    await expect(phonePedalStatus).toHaveText("Pedal on · Phone")
    await expect(phonePedalStatus).toHaveAttribute("data-pedal-active", "true")
    await expect(phonePedalStatus).toHaveAttribute("data-pedal-source", "phone")

    const c3 = page.getByRole("button", { name: "Play C3 with Z" })
    await page.keyboard.down("z")
    await expect(c3).toHaveAttribute("aria-pressed", "true")
    await page.keyboard.up("z")
    await expect(c3).toHaveAttribute("aria-pressed", "false")
    await expect(page.getByRole("status", { name: "Sustain on" })).toBeVisible()

    await page.evaluate(() => window.dispatchEvent(new Event("blur")))
    await expect(
      page.getByRole("note", {
        name: "Pedal off. Press Space to turn the sustain pedal on or off",
      }),
    ).toHaveText("Pedal off")

    await page.keyboard.press("Space")
    const lockedPedalStatus = page.getByRole("note", {
      name: "Pedal on from Sustain Lock. Press Space to turn the sustain pedal on or off",
    })
    await expect(lockedPedalStatus).toHaveText("Pedal on · Lock")

    await phone.mouse.up()
    await expect(lockedPedalStatus).toHaveText("Pedal on · Lock")
    await page.keyboard.press("Space")
    await expect(
      page.getByRole("status", { name: "Sustain off — press Space or use phone pedal" }),
    ).toBeVisible()
    await expect(
      page.getByRole("note", {
        name: "Pedal off. Press Space to turn the sustain pedal on or off",
      }),
    ).toHaveText("Pedal off")
  } finally {
    await phoneContext.close()
  }
})
