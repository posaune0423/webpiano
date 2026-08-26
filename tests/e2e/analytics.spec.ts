import { expect, test } from "@playwright/test"

test("loads the configured GA4 Google tag without changing the instrument UI", async ({ page }) => {
  let googleTagRequest = ""
  await page.route("https://www.googletagmanager.com/**", async (route) => {
    googleTagRequest = route.request().url()
    await route.fulfill({ body: "", contentType: "application/javascript", status: 200 })
  })

  await page.goto("/")

  await expect(
    page.locator('script[src="https://www.googletagmanager.com/gtag/js?id=G-FPXJJ64H74"]'),
  ).toHaveCount(1)
  expect(googleTagRequest).toBe("https://www.googletagmanager.com/gtag/js?id=G-FPXJJ64H74")
  await expect(page.getByRole("heading", { level: 1, name: "webpiano Online piano" })).toBeVisible()
  await expect(page.getByRole("group", { name: "Playable piano" })).toBeVisible()
})
