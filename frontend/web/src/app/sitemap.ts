import type { MetadataRoute } from "next"

// Pages publiques + paris ouverts : c'est ce qui peut ranker sur des
// recherches comme "will X die in chapter Y".
const SITE = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "")

export const revalidate = 3600

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE}/`, changeFrequency: "hourly", priority: 1 },
    { url: `${SITE}/daily`, changeFrequency: "daily", priority: 0.8 },
    { url: `${SITE}/weekly`, changeFrequency: "weekly", priority: 0.7 },
    { url: `${SITE}/leaderboard`, changeFrequency: "daily", priority: 0.6 },
    { url: `${SITE}/bingo`, changeFrequency: "weekly", priority: 0.5 },
  ]

  const api = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "")
  if (!api) return pages
  try {
    const res = await fetch(`${api}/events/?status=open&limit=100`, { next: { revalidate: 3600 } })
    if (!res.ok) return pages
    const events = (await res.json()) as { id: number; updated_at?: string | null }[]
    return [
      ...pages,
      ...events.map((e) => ({
        url: `${SITE}/markets/${e.id}`,
        lastModified: e.updated_at ?? undefined,
        changeFrequency: "daily" as const,
        priority: 0.9,
      })),
    ]
  } catch {
    return pages
  }
}
