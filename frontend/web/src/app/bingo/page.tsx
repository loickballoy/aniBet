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
  cover_url: string | null
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
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })
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
      // cover bingo prioritaire, fallback série
      imageUrl: c.cover_url ?? undefined,
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
              const coverUrl = c.cover_url ?? s?.cover_url ?? null

              return (
                <Link
                  key={c.id}
                  href={`/bingo/${c.id}`}
                  className="group overflow-hidden rounded-2xl border border-border/70 bg-card transition hover:border-border hover:shadow-md"
                >
                  {/* Cover image */}
                  {coverUrl && (
                    <div className="relative h-28 w-full overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={coverUrl}
                        alt=""
                        className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                      {/* Status badge sur l'image */}
                      <span className={`absolute right-2 top-2 rounded-full border px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm ${
                        c.status === "open"
                          ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-400"
                          : c.status === "resolved"
                          ? "border-blue-500/40 bg-blue-500/20 text-blue-400"
                          : "border-border/60 bg-background/60 text-muted-foreground"
                      }`}>
                        {c.status}
                      </span>
                    </div>
                  )}

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{c.title}</div>
                        <div className="mt-1 text-xs text-muted-foreground">
                          {s?.name ?? "Bingo"}
                          {c.chapter_number ? ` • Ch. ${c.chapter_number}` : ""}
                        </div>
                      </div>
                      {/* Status badge seulement si pas de cover */}
                      {!coverUrl && (
                        <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                          c.status === "open"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : c.status === "resolved"
                            ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                            : "border-border/50 text-muted-foreground"
                        }`}>
                          {c.status}
                        </span>
                      )}
                    </div>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Clôture: {formatDate(c.closes_at)}
                    </div>
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