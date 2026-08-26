import type { Metadata } from "next"

const HOME_TITLE = "Online Piano — Play with Your Computer Keyboard | webpiano"
const HOME_DESCRIPTION =
  "Play a free online piano instantly in your browser with your computer keyboard, touch controls, and optional phone sustain pedal. No download or sign-up."
const SOCIAL_IMAGE_ALT = "webpiano online piano played with a computer keyboard"

export function createHomeMetadata(appUrl: string): Metadata {
  return {
    metadataBase: new URL(appUrl),
    applicationName: "webpiano",
    title: HOME_TITLE,
    description: HOME_DESCRIPTION,
    alternates: { canonical: "/" },
    manifest: "/manifest.webmanifest",
    robots: {
      follow: true,
      index: true,
    },
    appleWebApp: {
      capable: true,
      statusBarStyle: "black-translucent",
      title: "webpiano",
    },
    formatDetection: { telephone: false },
    openGraph: {
      type: "website",
      siteName: "webpiano",
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      images: [
        {
          url: "/opengraph-image.jpg",
          alt: SOCIAL_IMAGE_ALT,
          width: 1200,
          height: 630,
        },
      ],
      locale: "en_US",
      url: "/",
    },
    twitter: {
      card: "summary_large_image",
      title: HOME_TITLE,
      description: HOME_DESCRIPTION,
      images: [{ url: "/opengraph-image.jpg", alt: SOCIAL_IMAGE_ALT }],
    },
  }
}

export function createWebApplicationJsonLd(appUrl: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "webpiano",
    url: appUrl,
    description: HOME_DESCRIPTION,
    applicationCategory: "MusicApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires JavaScript and Web Audio API support.",
    isAccessibleForFree: true,
    featureList: [
      "Two-octave online piano",
      "Computer keyboard input",
      "Pointer and touch input",
      "Space-key sustain",
      "Optional phone sustain pedal",
    ],
  }
}

export function serializeJsonLd(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c")
}
