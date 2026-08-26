import type { MetadataRoute } from "next"

import { env } from "@/env"

export default function robots(): MetadataRoute.Robots {
  const appUrl = new URL(env.NEXT_PUBLIC_APP_URL)

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
