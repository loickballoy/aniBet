import { ImageResponse } from "next/og"

// Aperçu affiché quand un lien de pari est collé sur Discord/X/Reddit :
// la question et la répartition actuelle des mises, comme un ticket de pari.
// Pas d'image de cover (une URL externe injoignable ferait échouer le rendu).

export const alt = "aniBet market"
export const size = { width: 1200, height: 630 }
export const contentType = "image/png"

type Outcome = { id: number; outcome: string; pool_points: number }
type EventRow = { title: string; status: string; outcomes: Outcome[] }

const BAR_COLORS = ["#a78bfa", "#22d3ee", "#facc15", "#f472b6", "#34d399"]

async function getEvent(id: string): Promise<EventRow | null> {
  const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "")
  if (!base) return null
  try {
    const res = await fetch(`${base}/events/${id}`, { cache: "no-store" })
    return res.ok ? res.json() : null
  } catch {
    return null
  }
}

function formatPts(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return `${Math.round(n)}`
}

export default async function Image({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const event = await getEvent(id)

  const title = event?.title ?? "Anime & manga predictions"
  const outcomes = [...(event?.outcomes ?? [])].sort((a, b) => b.pool_points - a.pool_points).slice(0, 4)
  const total = outcomes.reduce((acc, o) => acc + Number(o.pool_points ?? 0), 0)

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%", height: "100%", display: "flex", flexDirection: "column",
          justifyContent: "space-between", padding: "56px 64px",
          background: "linear-gradient(135deg, #0b0d14 0%, #1a1033 60%, #0b0d14 100%)",
          color: "white", fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ display: "flex", fontSize: 36, fontWeight: 800 }}>
            <span>ani</span><span style={{ color: "#a78bfa" }}>Bet</span>
          </div>
          {event?.status === "open" && (
            <div style={{ display: "flex", fontSize: 24, padding: "8px 20px", borderRadius: 999, background: "rgba(52,211,153,0.15)", color: "#34d399" }}>
              ● Open for bets
            </div>
          )}
        </div>

        <div style={{ display: "flex", fontSize: title.length > 70 ? 46 : 58, fontWeight: 800, lineHeight: 1.15, maxWidth: 1070 }}>
          {title}
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {outcomes.length === 0 && (
            <div style={{ display: "flex", fontSize: 28, color: "#a1a1aa" }}>Make your call with AniCoins</div>
          )}
          {outcomes.map((o, i) => {
            const pct = total > 0 ? Math.round((Number(o.pool_points) / total) * 100) : Math.round(100 / outcomes.length)
            return (
              <div key={o.id} style={{ display: "flex", alignItems: "center", gap: 20 }}>
                <div style={{ display: "flex", width: 330, fontSize: 28, color: "#e4e4e7", overflow: "hidden" }}>{o.outcome}</div>
                <div style={{ display: "flex", flex: 1, height: 22, borderRadius: 999, background: "rgba(255,255,255,0.08)" }}>
                  <div style={{ display: "flex", width: `${Math.max(pct, 2)}%`, height: "100%", borderRadius: 999, background: BAR_COLORS[i % BAR_COLORS.length] }} />
                </div>
                <div style={{ display: "flex", width: 90, justifyContent: "flex-end", fontSize: 28, fontWeight: 700 }}>{pct}%</div>
              </div>
            )
          })}
          {total > 0 && (
            <div style={{ display: "flex", fontSize: 22, color: "#a1a1aa", marginTop: 6 }}>{formatPts(total)} AniCoins in the pool</div>
          )}
        </div>
      </div>
    ),
    size,
  )
}
