import { expect, test } from "@playwright/test"

test("registers the worker and falls back offline in workerd", async ({ context, page }) => {
  await page.goto("/")

  await page.waitForFunction(
    async () => (await navigator.serviceWorker.getRegistrations()).length > 0,
  )
  const registration = await page.evaluate(async () => {
    const ready = await navigator.serviceWorker.ready

    return {
      scope: ready.scope,
      scriptURL: ready.active?.scriptURL ?? null,
    }
  })

  expect(registration.scope).toBe("http://localhost:8787/")
  expect(registration.scriptURL).toBe("http://localhost:8787/sw.js")

  const manifest = await page.request.get("/manifest.webmanifest")
  expect(manifest.status()).toBe(200)
  expect(manifest.headers()["content-type"]).toContain("application/manifest+json")

  await page.reload()
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null)
  await expect
    .poll(async () => {
      const isOfflinePageCached = await page.evaluate(async () =>
        Boolean(await caches.match("/~offline", { ignoreSearch: true })),
      )

      return isOfflinePageCached
    })
    .toBe(true)

  const offlinePath = `/uncached-workerd-offline-${crypto.randomUUID()}`
  await context.setOffline(true)
  await page.waitForFunction(() => navigator.onLine === false)
  await page.goto(offlinePath, {
    waitUntil: "domcontentloaded",
  })

  await expect(page.getByRole("heading", { name: "You’re offline" })).toBeVisible()
})
