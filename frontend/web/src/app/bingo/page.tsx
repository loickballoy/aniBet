import Link from "next/link"
import { SiteHeader } from "@/components/ui/layout/SiteHeader"
import { BingoCarousel, BingoHeroItem } from "@/components/ui/bingo/BingoCarousel"

type BingoCardRow = {
  id: number
  title: string
  series_id: number | null
  chapter_number: number | null
  opens_at: string
  closes_at: string
  status: string
}

type SeriesRow = {
  id: number
  name: string
  slug: string
  cover_url: string | null
}

async function apiGet<T>(path: string): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL
  if (!base) throw new Error("NEXT_PUBLIC_API_URL is missing")
  const res = await fetch(`${base}${path}`, { cache: "no-store" })
  if (!res.ok) throw new Error(`API error: ${path}`)
  return res.json()
}

function formatDate(iso?: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })
}

export default async function BingoHomePage() {
  const [cards, series] = await Promise.all([
    apiGet<BingoCardRow[]>("/bingo/"),
    apiGet<SeriesRow[]>("/series"),
  ])

  const seriesById = new Map(series.map((s) => [s.id, s]))

  const heroItems: BingoHeroItem[] = cards.slice(0, 6).map((c) => {
    const s = c.series_id ? seriesById.get(c.series_id) : undefined
    return {
      id: String(c.id),
      title: c.title,
      series: s?.name ?? "Bingo",
      imageUrl: s?.cover_url ?? undefined,
      href: `/bingo/${c.id}`,
      metaText: `Clôture: ${formatDate(c.closes_at)}`,
    }
  })

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        <BingoCarousel items={heroItems} />

        <div className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <h3 className="text-lg font-semibold">Bingos</h3>
            <div className="text-sm text-muted-foreground">Clique pour ouvrir</div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {cards.slice(0, 18).map((c) => {
              const s = c.series_id ? seriesById.get(c.series_id) : undefined
              return (
                <Link
                  key={c.id}
                  href={`/bingo/${c.id}`}
                  className="rounded-2xl border border-border/70 bg-card p-4 hover:bg-muted/30"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{c.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {s?.name ?? "Bingo"}
                        {c.chapter_number ? ` • Ch. ${c.chapter_number}` : ""}
                      </div>
                    </div>
                    <div className="shrink-0 rounded-full bg-background/40 px-2 py-1 text-xs text-muted-foreground">
                      {c.status}
                    </div>
                  </div>

                  <div className="mt-3 text-xs text-muted-foreground">
                    Clôture: {formatDate(c.closes_at)}
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      </main>
    </>
  )
}