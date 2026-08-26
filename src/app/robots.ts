import type { MetadataRoute } from "next"

import { createAppEnv } from "@/env"

export default function robots(): MetadataRoute.Robots {
  const appEnv = createAppEnv({
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  })
  const appUrl = new URL(appEnv.NEXT_PUBLIC_APP_URL)

  return {
    host: appUrl.origin,
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/api/",
    },
    sitemap: new URL("/sitemap.xml", appUrl).toString(),
  }
}
