import { describe, expect, test } from "bun:test"
import { existsSync } from "node:fs"
import { join } from "node:path"

const title = "Online Piano — Play with Your Computer Keyboard | webpiano"
const description =
  "Play a free online piano instantly in your browser with your computer keyboard, touch controls, and optional phone sustain pedal. No download or sign-up."

describe("home metadata", () => {
  test("describes the playable online piano consistently", async () => {
    const metadataModule = join(import.meta.dir, "../../src/constants/metadata.ts")
    expect(existsSync(metadataModule)).toBeTrue()
    expect(existsSync(join(import.meta.dir, "../../src/lib/seo.ts"))).toBeFalse()
    const { APP_VIEWPORT, HOME_METADATA, WEB_APPLICATION_JSON_LD } =
      await import("@/constants/metadata")
    const { serializeJsonLd } = await import("@/lib/json-ld")

    expect(HOME_METADATA).toMatchObject({
      alternates: { canonical: "/" },
      description,
      openGraph: {
        description,
        images: [
          {
            alt: "webpiano online piano played with a computer keyboard",
            height: 630,
            url: "/opengraph-image.jpg",
            width: 1200,
          },
        ],
        locale: "en_US",
        siteName: "webpiano",
        title,
        type: "website",
        url: "/",
      },
      robots: {
        follow: true,
        index: true,
      },
      title,
      twitter: {
        card: "summary_large_image",
        description,
        images: [
          {
            alt: "webpiano online piano played with a computer keyboard",
            url: "/opengraph-image.jpg",
          },
        ],
        title,
      },
    })

    expect(APP_VIEWPORT).toEqual({
      colorScheme: "dark",
      initialScale: 1,
      themeColor: "#11100f",
      width: "device-width",
    })

    expect(WEB_APPLICATION_JSON_LD).toMatchObject({
      "@context": "https://schema.org",
      "@type": "WebApplication",
      applicationCategory: "MusicApplication",
      isAccessibleForFree: true,
      name: "webpiano",
      operatingSystem: "Any",
      url: "https://webpiano.xyz",
    })
    expect(serializeJsonLd({ unsafe: "</script>" })).toBe('{"unsafe":"\\u003c/script>"}')
  })
})
