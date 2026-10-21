import type { MetadataRoute } from "next"

const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "")

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // Pages privées ou sans intérêt pour un moteur de recherche.
      disallow: ["/admin", "/mod", "/profile", "/auth", "/login", "/setup-username", "/api/"],
    },
    sitemap: `${SITE}/sitemap.xml`,
  }
}
