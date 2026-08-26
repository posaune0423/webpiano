import type { Metadata, Viewport } from "next"

const SITE_NAME = "webpiano"
const HOME_TITLE = "Online Piano — Play with Your Computer Keyboard | webpiano"
const HOME_DESCRIPTION =
  "Play a free online piano instantly in your browser with your computer keyboard, touch controls, and optional phone sustain pedal. No download or sign-up."
const SOCIAL_IMAGE_ALT = "webpiano online piano played with a computer keyboard"

function createLegalMetadata({
  canonical,
  description,
  title,
}: {
  canonical: string
  description: string
  title: string
}): Metadata {
  return {
    alternates: { canonical },
    description,
    openGraph: {
      description,
      siteName: SITE_NAME,
      title,
      type: "website",
      url: canonical,
    },
    title,
    twitter: {
      card: "summary_large_image",
      description,
      title,
    },
  }
}

export const APP_VIEWPORT: Viewport = {
  colorScheme: "dark",
  initialScale: 1,
  themeColor: "#11100f",
  width: "device-width",
}

export const HOME_METADATA: Metadata = {
  applicationName: SITE_NAME,
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
    title: SITE_NAME,
  },
  formatDetection: { telephone: false },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
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

export const TERMS_METADATA: Metadata = createLegalMetadata({
  canonical: "/terms",
  description: "Terms for using webpiano.",
  title: "Terms — webpiano",
})

export const PRIVACY_METADATA: Metadata = createLegalMetadata({
  canonical: "/privacy",
  description: "How webpiano handles data and Google Analytics.",
  title: "Privacy Policy — webpiano",
})

export const OFFLINE_METADATA: Metadata = {
  alternates: { canonical: null },
  description: "Reconnect to continue with webpiano.",
  robots: { follow: true, index: false },
  title: "Offline — webpiano",
}

export const PEDAL_METADATA: Metadata = {
  alternates: { canonical: null },
  description: "Use this phone as a temporary sustain pedal for webpiano.",
  robots: { follow: true, index: false },
  title: "Phone Pedal — webpiano",
}

export const WEB_APPLICATION_JSON_LD = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: SITE_NAME,
  url: "https://webpiano.xyz",
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
