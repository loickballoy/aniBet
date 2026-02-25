import Link from "next/link"
import { notFound } from "next/navigation"
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
  outcomes: Outcome[]
}

function formatPts(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M pts`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k pts`
  return `${Math.round(n)} pts`
}

function formatDate(iso?: string | null) {
  if (!iso) return "—"
  const d = new Date(iso)
  return d.toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })
}

async function getEventFromBackend(id: string): Promise<EventRow | null> {
  const base = process.env.NEXT_PUBLIC_API_URL
  if (!base) throw new Error("NEXT_PUBLIC_API_URL manquant dans .env.local")

  // Simple & fiable: on utilise /events?status=open qui marche déjà chez toi
  const url = `${base.replace(/\/$/, "")}/events?status=open&limit=2000&offset=0`
  const res = await fetch(url, { cache: "no-store" })
  if (!res.ok) throw new Error(`Backend error ${res.status} sur ${url}`)

  const events = (await res.json()) as EventRow[]
  return events.find((e) => String(e.id) === String(id)) ?? null
}

export default async function MarketDetailPage(props: { params: any }) {
  const resolvedParams = await Promise.resolve(props.params)
  const id = resolvedParams?.id as string | undefined
  if (!id) notFound()

  const event = await getEventFromBackend(id)
  if (!event) notFound()

  const outcomes = event.outcomes ?? []
  const totalFromOutcomes = outcomes.reduce((acc, o) => acc + Number(o.pool_points ?? 0), 0)
  const poolTotal = Number(event.pool_total ?? totalFromOutcomes ?? 0)

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-4">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Retour
        </Link>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-5">
        <div className="flex items-center justify-between gap-4">
          <h1 className="text-xl font-semibold">{event.title}</h1>
          <span className="rounded-full bg-muted px-3 py-1 text-xs text-muted-foreground">
            {event.status}
          </span>
        </div>

        {event.description ? (
          <p className="mt-2 text-sm text-muted-foreground">{event.description}</p>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl border border-border/70 bg-background/30 p-3">
            <div className="text-xs text-muted-foreground">Pool total</div>
            <div className="mt-1 text-base font-semibold">{formatPts(poolTotal)}</div>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/30 p-3">
            <div className="text-xs text-muted-foreground">Ouverture</div>
            <div className="mt-1 text-sm">{formatDate(event.opens_at)}</div>
          </div>
          <div className="rounded-xl border border-border/70 bg-background/30 p-3">
            <div className="text-xs text-muted-foreground">Lock</div>
            <div className="mt-1 text-sm">{formatDate(event.locks_at)}</div>
          </div>
        </div>

        <h2 className="mt-6 text-sm font-semibold">Outcomes</h2>
        <div className="mt-3 grid gap-2">
          {outcomes.map((o) => (
            <div
              key={o.id}
              className="flex items-center justify-between rounded-xl border border-border/70 bg-background/30 p-3"
            >
              <div className="text-sm font-medium">{o.outcome}</div>
              <div className="text-xs text-muted-foreground">
                {formatPts(Number(o.pool_points ?? 0))}
              </div>
            </div>
          ))}
        </div>

        {/* ✅ Parier (crée un bet via backend) */}
        <div className="mt-6">
          <BetBox
            eventId={event.id}
            outcomes={outcomes.map((o) => ({ id: o.id, label: o.outcome }))}
          />
        </div>
      </div>
    </main>
  )
}