import { SiteHeader } from "@/components/ui/layout/SiteHeader"
import { BingoCarousel, BingoHeroItem } from "@/components/ui/bingo/BingoCarousel"
import BingoGrid from "./BingoGrid"

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

export type GridCard = {
  id: number
  title: string
  series_id: number | null
  chapter_number: number | null
  closes_at: string
  status: string
  coverUrl: string | null
  seriesName: string | null
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

  // Only keep series that have at least one bingo
  const seriesWithBingo = series.filter((s) =>
    cards.some((c) => c.series_id === s.id)
  )

  const heroItems: BingoHeroItem[] = cards.slice(0, 6).map((c) => {
    const s = c.series_id ? seriesById.get(c.series_id) : undefined
    const imageUrl = c.cover_url ?? s?.cover_url ?? undefined
    return {
      id: String(c.id),
      title: c.title,
      series: s?.name ?? "Bingo",
      imageUrl,
      href: `/bingo/${c.id}`,
      metaText: `Clôture : ${formatDate(c.closes_at)}`,
    }
  })

  const gridCards: GridCard[] = cards.slice(0, 36).map((c) => {
    const s = c.series_id ? seriesById.get(c.series_id) : undefined
    return {
      id: c.id,
      title: c.title,
      series_id: c.series_id,
      chapter_number: c.chapter_number,
      closes_at: c.closes_at,
      status: c.status,
      coverUrl: c.cover_url ?? s?.cover_url ?? null,
      seriesName: s?.name ?? null,
    }
  })

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 space-y-8">
        <BingoCarousel items={heroItems} />
        <BingoGrid cards={gridCards} series={seriesWithBingo} />
      </main>
    </>
  )
}