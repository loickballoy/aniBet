import Link from "next/link"
import { notFound } from "next/navigation"
import { SiteHeader } from "@/components/ui/layout/SiteHeader"
import BetBox from "@/components/ui/bet/BetBox"

type Outcome = {
  id: number
  outcome: string
  pool_points: number
}

type EventRow = {
  id: number
  title: string
  description?: string | null
  status: string
  pool_total?: number | null
  opens_at?: string | null
  locks_at?: string | null
  cover_url?: string | null
  series_id?: number | null
  outcomes: Outcome[]
}

type SeriesRow = {
  id: number
  name: string
  cover_url: string | null
}

function formatPts(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M pts`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k pts`
  return `${Math.round(n)} pts`
}

function formatDate(iso?: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })
}

const BASE = () => {
  const b = process.env.NEXT_PUBLIC_API_URL
  if (!b) throw new Error("NEXT_PUBLIC_API_URL manquant")
  return b.replace(/\/$/, "")
}

async function getEvent(id: string): Promise<EventRow | null> {
  // Try direct endpoint first, fallback to list
  try {
    const res = await fetch(`${BASE()}/events/${id}`, { cache: "no-store" })
    if (res.ok) return res.json()
  } catch {}
  // fallback: list all open events
  const res = await fetch(`${BASE()}/events?status=open&limit=2000&offset=0`, { cache: "no-store" })
  if (!res.ok) return null
  const events = (await res.json()) as EventRow[]
  return events.find((e) => String(e.id) === String(id)) ?? null
}

async function getSeries(id: number): Promise<SeriesRow | null> {
  try {
    const res = await fetch(`${BASE()}/series`, { cache: "no-store" })
    if (!res.ok) return null
    const series = (await res.json()) as SeriesRow[]
    return series.find((s) => s.id === id) ?? null
  } catch {
    return null
  }
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open:     "border-emerald-500/40 bg-emerald-500/15 text-emerald-400",
    locked:   "border-orange-500/40 bg-orange-500/15 text-orange-400",
    resolved: "border-blue-500/40 bg-blue-500/15 text-blue-400",
    closed:   "border-border/50 bg-background/60 text-muted-foreground",
  }
  const labels: Record<string, string> = {
    open: "Ouvert", locked: "Verrouillé", resolved: "Résolu", closed: "Fermé"
  }
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-sm ${styles[status] ?? styles.closed}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${status === "open" ? "bg-emerald-400" : status === "resolved" ? "bg-blue-400" : status === "locked" ? "bg-orange-400" : "bg-border"}`} />
      {labels[status] ?? status}
    </span>
  )
}

export default async function MarketDetailPage(props: { params: any }) {
  const resolvedParams = await Promise.resolve(props.params)
  const id = resolvedParams?.id as string | undefined
  if (!id) notFound()

  const event = await getEvent(id)
  if (!event) notFound()

  const series = event.series_id ? await getSeries(event.series_id) : null

  const outcomes = event.outcomes ?? []
  const totalFromOutcomes = outcomes.reduce((acc, o) => acc + Number(o.pool_points ?? 0), 0)
  const poolTotal = Number(event.pool_total ?? totalFromOutcomes ?? 0)
  const coverUrl = event.cover_url ?? series?.cover_url ?? null

  // Sort outcomes by pool desc for display
  const sortedOutcomes = [...outcomes].sort((a, b) => Number(b.pool_points) - Number(a.pool_points))

  return (
    <>
      <SiteHeader />

      {/* Ambient glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/3 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/4 blur-[130px]" />
        <div className="absolute right-1/4 top-1/2 h-[350px] w-[350px] rounded-full bg-cyan-500/3 blur-[100px]" />
      </div>

      <main className="mx-auto w-full max-w-5xl px-4 py-8">

        {/* Back */}
        <div style={{ animation: "fadeUp 0.3s ease both" }}>
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-border/50 bg-background/30 px-3 py-1.5 text-xs text-muted-foreground backdrop-blur-sm transition hover:border-border hover:text-foreground"
          >
            ← Retour
          </Link>
        </div>

        {/* ── Hero cover ── */}
        {coverUrl && (
          <div
            className="relative mt-4 h-52 w-full overflow-hidden rounded-3xl border border-border/60 sm:h-64"
            style={{ animation: "fadeUp 0.4s ease 0.05s both" }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={coverUrl}
              alt=""
              className="h-full w-full object-cover"
              style={{ animation: "heroZoom 8s ease forwards" }}
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-black/10" />
            <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent" />

            {/* Overlay content */}
            <div className="absolute bottom-0 left-0 right-0 p-6" style={{ animation: "slideUp 0.5s ease 0.2s both" }}>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  {series && (
                    <span className="mb-2 inline-block rounded-full border border-primary/30 bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                      {series.name}
                    </span>
                  )}
                  <h1 className="text-xl font-bold leading-tight text-white sm:text-2xl">
                    {event.title}
                  </h1>
                </div>
                <StatusBadge status={event.status} />
              </div>
            </div>
          </div>
        )}

        {/* ── Title row (no cover) ── */}
        {!coverUrl && (
          <div
            className="mt-5 flex flex-wrap items-start justify-between gap-3"
            style={{ animation: "fadeUp 0.4s ease 0.05s both" }}
          >
            <div>
              {series && (
                <span className="mb-1.5 inline-block rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                  {series.name}
                </span>
              )}
              <h1 className="text-2xl font-bold tracking-tight">{event.title}</h1>
            </div>
            <StatusBadge status={event.status} />
          </div>
        )}

        {/* ── Two-column layout ── */}
        <div className="mt-6 grid grid-cols-1 gap-5 lg:grid-cols-5">

          {/* ── Left column — event info ── */}
          <div className="space-y-4 lg:col-span-3">

            {/* Description */}
            {event.description && (
              <div
                className="rounded-2xl border border-border/50 bg-card/40 p-5 backdrop-blur-sm"
                style={{ animation: "fadeUp 0.4s ease 0.15s both" }}
              >
                <p className="text-sm leading-relaxed text-muted-foreground">{event.description}</p>
              </div>
            )}

            {/* Stats row */}
            <div
              className="grid grid-cols-3 gap-3"
              style={{ animation: "fadeUp 0.4s ease 0.2s both" }}
            >
              <div className="rounded-2xl border border-border/50 bg-card/40 p-4 backdrop-blur-sm">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Pool total</div>
                <div className="mt-1.5 text-lg font-bold tabular-nums text-primary">{formatPts(poolTotal)}</div>
              </div>
              <div className="rounded-2xl border border-border/50 bg-card/40 p-4 backdrop-blur-sm">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Ouverture</div>
                <div className="mt-1.5 text-xs font-medium">{formatDate(event.opens_at)}</div>
              </div>
              <div className="rounded-2xl border border-border/50 bg-card/40 p-4 backdrop-blur-sm">
                <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground/60">Lock</div>
                <div className="mt-1.5 text-xs font-medium">{formatDate(event.locks_at)}</div>
              </div>
            </div>

            {/* Outcomes */}
            <div
              className="overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm"
              style={{ animation: "fadeUp 0.4s ease 0.28s both" }}
            >
              <div className="border-b border-border/40 bg-background/20 px-4 py-2.5">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Outcomes · {outcomes.length}
                </span>
              </div>

              <div className="divide-y divide-border/25 p-2">
                {sortedOutcomes.map((o, i) => {
                  const pts = Number(o.pool_points ?? 0)
                  const pct = totalFromOutcomes > 0 ? Math.round((pts / totalFromOutcomes) * 100) : 0
                  const isLeading = i === 0

                  return (
                    <div
                      key={o.id}
                      className="group rounded-xl px-3 py-3 transition hover:bg-muted/10"
                      style={{
                        animation: "fadeUp 0.35s ease both",
                        animationDelay: `${0.3 + i * 0.04}s`,
                      }}
                    >
                      <div className="mb-2 flex items-start justify-between gap-3">
                        <div className="flex items-start gap-2.5">
                          {/* Rank dot */}
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                              isLeading
                                ? "bg-primary/20 text-primary"
                                : "bg-border/40 text-muted-foreground"
                            }`}
                          >
                            {i + 1}
                          </span>
                          <p className="text-sm font-medium leading-snug">{o.outcome}</p>
                        </div>
                        <div className="shrink-0 text-right">
                          <div className={`text-xs font-bold tabular-nums ${isLeading ? "text-primary" : "text-muted-foreground"}`}>
                            {pct}%
                          </div>
                          <div className="text-[10px] text-muted-foreground/60">{formatPts(pts)}</div>
                        </div>
                      </div>

                      {/* Pool bar */}
                      <div className="ml-7 h-1 w-full overflow-hidden rounded-full bg-border/30">
                        <div
                          className={`h-full rounded-full transition-all duration-700 ${isLeading ? "bg-primary/70" : "bg-border/60"}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          {/* ── Right column — bet ── */}
          <div
            className="lg:col-span-2"
            style={{ animation: "fadeUp 0.4s ease 0.35s both" }}
          >
            <div className="sticky top-20">
              <div className="overflow-hidden rounded-2xl border border-primary/20 bg-card/50 backdrop-blur-sm shadow-lg shadow-primary/5">
                {/* Header */}
                <div className="border-b border-border/40 bg-primary/5 px-5 py-3.5">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold">Placer un pari</span>
                    <span className="text-[11px] text-muted-foreground">
                      {outcomes.length} outcome{outcomes.length > 1 ? "s" : ""}
                    </span>
                  </div>
                  {/* Gradient line */}
                  <div className="mt-3 h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
                </div>

                <div className="p-5">
                  <BetBox
                    eventId={event.id}
                    outcomes={outcomes.map((o) => ({ id: o.id, label: o.outcome }))}
                  />
                </div>
              </div>

              {/* Disclaimer */}
              <p className="mt-3 text-center text-[11px] text-muted-foreground/50">
                Les AniCoins sont virtuels · Aucune valeur réelle
              </p>
            </div>
          </div>

        </div>
      </main>

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(14px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroZoom {
          from { transform: scale(1.03); }
          to   { transform: scale(1.07); }
        }
      `}</style>
    </>
  )
}