"use client"

import * as React from "react"
import Link from "next/link"
import { SiteHeader } from "@/components/ui/layout/SiteHeader"

// ── Types ─────────────────────────────────────────────────────────────────────
type Row = {
  rank: number
  username: string
  points_balance: number
  tier: string
}

// ── Tiers ─────────────────────────────────────────────────────────────────────
const TIERS = [
  { name: "Iron",    min: 0,      color: "text-zinc-400",   bg: "bg-zinc-500/10 border-zinc-500/20",    dot: "bg-zinc-400" },
  { name: "Bronze",  min: 1000,   color: "text-amber-600",  bg: "bg-amber-600/10 border-amber-600/20",  dot: "bg-amber-500" },
  { name: "Silver",  min: 20000,  color: "text-slate-300",  bg: "bg-slate-400/10 border-slate-400/20",  dot: "bg-slate-300" },
  { name: "Gold",    min: 40000,  color: "text-yellow-400", bg: "bg-yellow-400/10 border-yellow-400/20",dot: "bg-yellow-400" },
  { name: "Diamond", min: 100000, color: "text-cyan-400",   bg: "bg-cyan-400/10 border-cyan-400/20",    dot: "bg-cyan-400" },
]

function getTier(pts: number) {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (pts >= TIERS[i].min) return TIERS[i]
  }
  return TIERS[0]
}

function formatPts(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(2)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(Math.round(n))
}

// ── Avatar ────────────────────────────────────────────────────────────────────
function Avatar({ username, size = 36 }: { username: string; size?: number }) {
  const letter = username?.[0]?.toUpperCase() ?? "?"
  return (
    <div className="flex shrink-0 items-center justify-center rounded-full bg-primary/20 font-bold text-primary ring-1 ring-primary/30"
      style={{ width: size, height: size, fontSize: size * 0.38 }}>
      {letter}
    </div>
  )
}

// ── Rank medal ────────────────────────────────────────────────────────────────
function Medal({ rank }: { rank: number }) {
  if (rank === 1) return <span className="text-lg">🥇</span>
  if (rank === 2) return <span className="text-lg">🥈</span>
  if (rank === 3) return <span className="text-lg">🥉</span>
  return <span className="w-6 text-center text-sm font-medium text-muted-foreground tabular-nums">{rank}</span>
}

// ── Podium ────────────────────────────────────────────────────────────────────
function Podium({ rows }: { rows: Row[] }) {
  const top3 = rows.slice(0, 3)
  if (top3.length < 1) return null

  // Order: 2nd | 1st | 3rd
  const display = top3.length >= 3
    ? [top3[1], top3[0], top3[2]]
    : top3.length === 2
    ? [top3[1], top3[0]]
    : [top3[0]]

  const origRanks = top3.length >= 3 ? [1, 0, 2] : top3.length === 2 ? [1, 0] : [0]
  const heights   = ["h-20", "h-28", "h-16"]

  return (
    <div className="mb-8 flex items-end justify-center gap-3">
      {display.map((row, i) => {
        const origIdx = origRanks[i]
        const tier = getTier(row.points_balance)
        const isFirst = origIdx === 0
        return (
          <div key={row.username} className="flex flex-col items-center gap-2">
            <Avatar username={row.username} size={isFirst ? 52 : 40} />
            <div className="text-center">
              <div className={`font-semibold ${isFirst ? "text-sm" : "text-xs"}`}>{row.username}</div>
              <div className={`text-[10px] ${tier.color}`}>{tier.name}</div>
              <div className="text-[10px] text-muted-foreground">{formatPts(row.points_balance)} pts</div>
            </div>
            <div className={`${heights[i]} w-20 flex items-end justify-center rounded-t-xl border border-border/60 pb-2 ${
              isFirst ? "bg-primary/15 border-primary/30" : "bg-muted/40"
            }`}>
              <Medal rank={origIdx + 1} />
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const [rows, setRows] = React.useState<Row[]>([])
  const [myRank, setMyRank] = React.useState<number | null>(null)
  const [myUsername, setMyUsername] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [filter, setFilter] = React.useState<string>("all")

  React.useEffect(() => {
    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
    const API = process.env.NEXT_PUBLIC_API_URL ?? ""

    // Leaderboard is always public — fetch it independently
    fetch("/api/leaderboard?limit=50&offset=0")
      .then((r) => {
        if (!r.ok) throw new Error(`Erreur ${r.status}`)
        return r.json()
      })
      .then((data) => {
        const mapped = (Array.isArray(data) ? data : []).map((r: any) => ({
          rank: r.rank ?? 0,
          username: r.username ?? "—",
          points_balance: r.points_balance ?? 0,
          tier: r.tier ?? "Iron",
        }))
        setRows(mapped)
      })
      .catch((e) => setError(e?.message ?? "Erreur"))
      .finally(() => setLoading(false))

    // Auth-dependent: fetch silently, never block the main content
    if (token) {
      const h = { Authorization: `Bearer ${token}` }
      fetch("/api/me", { headers: h })
        .then((r) => r.ok ? r.json() : null)
        .then((me) => { if (me?.username) setMyUsername(me.username) })
        .catch(() => {})

      fetch(`${API}/rank/leaderboard/me`, { headers: h })
        .then((r) => r.ok ? r.json() : null)
        .then((rank) => { if (typeof rank === "number") setMyRank(rank) })
        .catch(() => {})
    }
  }, [])

  const filtered = filter === "all" ? rows : rows.filter((r) => r.tier === filter)

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-3xl px-4 py-8">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Classement</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Top 50 joueurs par AniCoins</p>
          </div>
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Retour</Link>
        </div>

        {/* My rank banner — only if logged in */}
        {myRank && myUsername && (
          <div className="mb-6 flex items-center gap-4 rounded-2xl border border-primary/30 bg-primary/8 p-4">
            <Avatar username={myUsername} size={40} />
            <div>
              <div className="text-xs text-muted-foreground">Ton classement</div>
              <div className="text-lg font-bold">#{myRank}</div>
            </div>
            <div className="ml-auto">
              {(() => {
                const me = rows.find((r) => r.username === myUsername)
                if (!me) return null
                const tier = getTier(me.points_balance)
                return (
                  <span className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold ${tier.bg} ${tier.color}`}>
                    {tier.name}
                  </span>
                )
              })()}
            </div>
          </div>
        )}

        {loading ? (
          <div className="flex h-40 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        ) : error ? (
          <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-400">{error}</div>
        ) : (
          <>
            {/* Podium */}
            {filter === "all" && <Podium rows={rows} />}

            {/* Tier filter */}
            <div className="mb-4 flex flex-wrap gap-2">
              <button onClick={() => setFilter("all")}
                className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                  filter === "all" ? "border-primary/40 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:text-foreground"
                }`}>
                Tous
              </button>
              {TIERS.slice().reverse().map((t) => (
                <button key={t.name} onClick={() => setFilter(t.name)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium transition ${
                    filter === t.name ? `${t.bg} ${t.color}` : "border-border/60 text-muted-foreground hover:text-foreground"
                  }`}>
                  <span className={`mr-1.5 inline-block h-2 w-2 rounded-full ${t.dot}`} />
                  {t.name}
                </button>
              ))}
            </div>

            {/* Table */}
            <div className="overflow-hidden rounded-2xl border border-border/60">
              <div className="grid grid-cols-12 bg-background/50 px-4 py-2.5 text-[11px] font-medium text-muted-foreground">
                <div className="col-span-1">#</div>
                <div className="col-span-7">Joueur</div>
                <div className="col-span-2">Tier</div>
                <div className="col-span-2 text-right">Pts</div>
              </div>

              <div className="divide-y divide-border/40">
                {filtered.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-muted-foreground">Aucun joueur dans ce tier.</div>
                ) : (
                  filtered.map((row) => {
                    const tier = getTier(row.points_balance)
                    const isMe = row.username === myUsername
                    return (
                      <div key={`${row.rank}-${row.username}`}
                        className={`grid grid-cols-12 items-center px-4 py-3 transition ${
                          isMe ? "bg-primary/8 border-l-2 border-l-primary" : "hover:bg-muted/20"
                        }`}>
                        <div className="col-span-1"><Medal rank={row.rank} /></div>
                        <div className="col-span-7 flex items-center gap-2.5">
                          <Avatar username={row.username} size={30} />
                          <span className={`text-sm font-medium truncate ${isMe ? "text-primary" : ""}`}>
                            {row.username}
                            {isMe && <span className="ml-1.5 text-[10px] text-primary/60">(toi)</span>}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tier.bg} ${tier.color}`}>
                            {tier.name}
                          </span>
                        </div>
                        <div className="col-span-2 text-right text-sm tabular-nums text-muted-foreground">
                          {formatPts(row.points_balance)}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* Login CTA for non-connected users */}
            {!myUsername && (
              <p className="mt-4 text-center text-xs text-muted-foreground">
                <Link href="/login" className="text-primary hover:underline">Connecte-toi</Link> pour voir ton rang.
              </p>
            )}
          </>
        )}
      </main>
    </>
  )
}