import { HeroCarousel } from "@/components/ui/home/HeroCarousel"
import { MarketCard } from "@/components/ui/market/MarketCard"
import { SeriesStrip } from "@/components/ui/home/SeriesStrip"
import Link from "next/link"
import { SiteHeader } from "@/components/ui/layout/SiteHeader"
import { Suspense } from "react"

type OutcomeRow = {
  id: number
  outcome: string
  pool_points: number
  is_winner?: boolean
}

type EventWithOutcomes = {
  id: number
  title: string
  description?: string | null
  status: string
  series_id: number | null
  pool_total?: number | null
  cover_url?: string | null   // ← event's own cover
  outcomes: OutcomeRow[]
}

type SeriesRow = {
  id: number
  name: string
  slug: string
  cover_url: string | null
}

type HomeCard = {
  id: string
  question: string
  imageUrl?: string
  category?: string
  yesPct: number
  volumeText?: string
}

function formatPool(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M pts`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k pts`
  return `${Math.round(n)} pts`
}

async function apiGet<T>(path: string): Promise<T> {
  const base = process.env.NEXT_PUBLIC_API_URL
  if (!base) throw new Error("NEXT_PUBLIC_API_URL is missing")
  const res = await fetch(`${base}${path}`, { cache: "no-store" })
  if (!res.ok) throw new Error(`API error: ${path}`)
  return res.json()
}

export default async function HomePage({
  searchParams,
}: {
  searchParams: Promise<{ series_id?: string }>
}) {
  const params = await searchParams
  const seriesId = params.series_id ? Number(params.series_id) : null

  const eventsPath = seriesId
    ? `/events?status=open&limit=24&offset=0&series_id=${seriesId}`
    : `/events?status=open&limit=24&offset=0`

  const [events, series] = await Promise.all([
    apiGet<EventWithOutcomes[]>(eventsPath),
    apiGet<SeriesRow[]>("/series"),
  ])

  const seriesById = new Map(series.map((s) => [s.id, s]))
  const activeSeries = seriesId ? seriesById.get(seriesId) : null

  const cards: HomeCard[] = events.map((e) => {
    const outcomes = e.outcomes ?? []
    const totalFromOutcomes = outcomes.reduce((acc, o) => acc + Number(o.pool_points ?? 0), 0)
    const firstPoints = Number(outcomes[0]?.pool_points ?? 0)
    const yesPct = totalFromOutcomes > 0 ? Math.round((firstPoints / totalFromOutcomes) * 100) : 50
    const s = e.series_id ? seriesById.get(e.series_id) : undefined
    const poolTotal = Number(e.pool_total ?? totalFromOutcomes ?? 0)

    return {
      id: String(e.id),
      question: e.title,
      // event cover takes priority, fallback to series cover
      imageUrl: e.cover_url ?? s?.cover_url ?? undefined,
      category: s?.name ?? undefined,
      yesPct,
      volumeText: formatPool(poolTotal),
    }
  })

  const featured = cards.slice(0, 6)
  const markets = cards.slice(0, 24)

  return (
    <>
      <SiteHeader />

      <main className="mx-auto w-full max-w-6xl px-4 py-6">
        {!seriesId && <HeroCarousel items={featured} />}

        <Suspense>
          <SeriesStrip series={series} />
        </Suspense>

        <div className="mt-10">
          <div className="mb-4 flex items-end justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold">
                {activeSeries ? activeSeries.name : "Marchés ouverts"}
              </h3>
              {markets.length > 0 && (
                <span className="text-xs text-muted-foreground">
                  {markets.length} event{markets.length > 1 ? "s" : ""}
                </span>
              )}
            </div>
            <Link className="text-sm text-muted-foreground hover:underline" href="/markets">
              Tout voir
            </Link>
          </div>

          {markets.length === 0 ? (
            <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-border/50 bg-card/40">
              <p className="text-sm text-muted-foreground">
                {activeSeries
                  ? `Aucun event ouvert pour ${activeSeries.name} pour l'instant.`
                  : "Aucun event ouvert pour l'instant."}
              </p>
              {activeSeries && (
                <Link href="/" className="text-xs text-primary hover:underline">
                  Voir tous les marchés
                </Link>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {markets.map((m) => (
                <MarketCard key={m.id} market={m} />
              ))}
            </div>
          )}
        </div>
      </main>
    </>
  )
}