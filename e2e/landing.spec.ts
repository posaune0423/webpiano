import { expect, test } from "@playwright/test"

test("renders the premium coming-soon surface without overflow", async ({ page }) => {
  await page.goto("/")

  const main = page.getByRole("main")

  await expect(main.getByRole("heading", { level: 1, name: "webpiano" })).toBeVisible()
  await expect(main.getByText("Play anywhere with your portable piano.")).toBeVisible()
  await expect(main.getByText("Coming soon")).toBeVisible()
  await expect(main.getByRole("button")).toHaveCount(0)
  await expect(main.getByRole("link")).toHaveCount(0)

  const hero = main.getByRole("img", { name: "Glossy grand piano keys" })
  await expect(hero).toBeVisible()
  await expect
    .poll(async () => {
      const isLoaded = await hero.evaluate(
        (image: HTMLImageElement) => image.complete && image.naturalWidth > 0,
      )

      return isLoaded
    })
    .toBeTruthy()

  const hasHorizontalOverflow = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  )
  expect(hasHorizontalOverflow).toBe(false)
})
