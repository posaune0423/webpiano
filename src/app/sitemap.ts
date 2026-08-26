import type { MetadataRoute } from "next"

import { env } from "@/env"

export default function sitemap(): MetadataRoute.Sitemap {
  const appUrl = new URL(env.NEXT_PUBLIC_APP_URL)

  return ["/", "/privacy", "/terms"].map((pathname) => ({
    url: pathname === "/" ? appUrl.origin : new URL(pathname, appUrl).toString(),
  }))
}
