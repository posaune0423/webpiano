import { expect, test } from "@playwright/test"

const homeTitle = "Online Piano — Play with Your Computer Keyboard | webpiano"
const homeDescription =
  "Play a free online piano instantly in your browser with your computer keyboard, touch controls, and optional phone sustain pedal. No download or sign-up."

test("serves the indexable home metadata and structured application data", async ({ page }) => {
  await page.goto("/")

  await expect(page).toHaveTitle(homeTitle)
  await expect(page.locator('meta[name="description"]')).toHaveAttribute("content", homeDescription)
  await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "index, follow")
  await expect(page.locator('meta[name="viewport"]')).toHaveAttribute(
    "content",
    "width=device-width, initial-scale=1",
  )
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute("content", "dark")
  await expect(page.locator('meta[name="theme-color"]')).toHaveAttribute("content", "#11100f")
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href",
    "http://localhost:3000",
  )
  expect(
    (await page.locator('meta[name="twitter:image:alt"]').getAttribute("content"))?.trim(),
  ).toBe("webpiano online piano played with a computer keyboard")

  const structuredData = JSON.parse(
    (await page.locator('script[type="application/ld+json"]').textContent()) ?? "null",
  ) as Record<string, unknown>
  expect(structuredData).toMatchObject({
    "@context": "https://schema.org",
    "@type": "WebApplication",
    isAccessibleForFree: true,
    name: "webpiano",
    url: "https://webpiano.xyz",
  })
})

test("serves standard discovery files and excludes temporary pages from the sitemap", async ({
  request,
}) => {
  const robotsResponse = await request.get("/robots.txt")
  expect(robotsResponse.ok()).toBe(true)
  expect(robotsResponse.headers()["content-type"]).toContain("text/plain")
  const robots = await robotsResponse.text()
  expect(robots).toContain("User-Agent: *")
  expect(robots).toContain("Allow: /")
  expect(robots).toContain("Disallow: /api/")
  expect(robots).toContain("Sitemap: http://localhost:3000/sitemap.xml")

  const sitemapResponse = await request.get("/sitemap.xml")
  expect(sitemapResponse.ok()).toBe(true)
  expect(sitemapResponse.headers()["content-type"]).toContain("application/xml")
  const sitemap = await sitemapResponse.text()
  expect(sitemap).toContain("<loc>http://localhost:3000</loc>")
  expect(sitemap).toContain("<loc>http://localhost:3000/privacy</loc>")
  expect(sitemap).toContain("<loc>http://localhost:3000/terms</loc>")
  expect(sitemap).not.toContain("/pedal/")
  expect(sitemap).not.toContain("/~offline")

  const llmsResponse = await request.get("/llms.txt")
  expect(llmsResponse.ok()).toBe(true)
  expect(llmsResponse.headers()["content-type"]).toContain("text/plain")
  expect(await llmsResponse.text()).toContain("# webpiano")
})

test("marks temporary utility pages noindex without blocking crawlers", async ({ page }) => {
  for (const pathname of ["/~offline", "/pedal/test-session"]) {
    await page.goto(pathname)
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", "noindex, follow")
    await expect(page.locator('link[rel="canonical"]')).toHaveCount(0)
  }
})
