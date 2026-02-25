"use client"

import * as React from "react"
import Link from "next/link"
import { SiteHeader } from "@/components/ui/layout/SiteHeader"

// ── Types ─────────────────────────────────────────────────────────────────────
type User = {
  username: string
  email: string
  role: string
  points_balance: number
  is_banned: boolean
}

type Transaction = {
  id: number
  created_at: string
  kind: string
  amount: number
  balance_after: number
}

type Winrate = {
  won: number
  lost: number
  total: number
  winrate: number | null
}

type BetWithDetails = {
  id: number
  created_at: string
  points_placed: number
  status: string
  outcome_label: string | null
  event_title: string | null
  event_status: string | null
  potential_payout: number | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function formatPts(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(Math.round(n))
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", { day: "2-digit", month: "short" })
}

const KIND_LABEL: Record<string, string> = {
  bet_placed: "Pari placé",
  bet_won: "Pari gagné",
  bingo_reward: "Bingo",
  refund: "Remboursement",
}

const KIND_COLOR: Record<string, string> = {
  bet_placed: "text-red-400",
  bet_won: "text-emerald-400",
  bingo_reward: "text-yellow-400",
  refund: "text-blue-400",
}

const STATUS_STYLE: Record<string, string> = {
  won: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  lost: "bg-red-500/15 text-red-400 border-red-500/30",
  pending: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  refunded: "bg-blue-500/15 text-blue-400 border-blue-500/30",
}

// ── Mini SVG line chart ────────────────────────────────────────────────────────
function BalanceChart({ data }: { data: Transaction[] }) {
  if (data.length < 2) {
    return (
      <div className="flex h-full items-center justify-center text-xs text-muted-foreground">
        Pas encore assez de données
      </div>
    )
  }

  const W = 600
  const H = 120
  const PAD = 8

  const values = data.map((d) => d.balance_after)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const range = max - min || 1

  const pts = data.map((d, i) => {
    const x = PAD + (i / (data.length - 1)) * (W - PAD * 2)
    const y = H - PAD - ((d.balance_after - min) / range) * (H - PAD * 2)
    return `${x},${y}`
  })

  const firstY = H - PAD - ((values[0] - min) / range) * (H - PAD * 2)
  const lastY = H - PAD - ((values[values.length - 1] - min) / range) * (H - PAD * 2)
  const lastX = PAD + ((data.length - 1) / (data.length - 1)) * (W - PAD * 2)

  const isUp = values[values.length - 1] >= values[0]
  const lineColor = isUp ? "#10b981" : "#f87171"
  const fillId = "chartFill"

  const areaPath = `M ${PAD},${H - PAD} L ${pts.join(" L ")} L ${lastX},${H - PAD} Z`

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: "100%" }} preserveAspectRatio="none">
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={lineColor} stopOpacity="0.25" />
          <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      {/* Area fill */}
      <path d={areaPath} fill={`url(#${fillId})`} />
      {/* Line */}
      <polyline
        points={pts.join(" ")}
        fill="none"
        stroke={lineColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {/* Last dot */}
      <circle cx={lastX} cy={lastY} r="4" fill={lineColor} />
    </svg>
  )
}

// ── Tier badge ────────────────────────────────────────────────────────────────
const TIERS = [
  { name: "Iron",    min: 0,      color: "text-zinc-400",   bg: "bg-zinc-500/15 border-zinc-500/30" },
  { name: "Bronze",  min: 1000,   color: "text-amber-600",  bg: "bg-amber-600/15 border-amber-600/30" },
  { name: "Silver",  min: 20000,  color: "text-slate-300",  bg: "bg-slate-400/15 border-slate-400/30" },
  { name: "Gold",    min: 40000,  color: "text-yellow-400", bg: "bg-yellow-400/15 border-yellow-400/30" },
  { name: "Diamond", min: 100000, color: "text-cyan-400",   bg: "bg-cyan-400/15 border-cyan-400/30" },
]

function getTier(pts: number) {
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (pts >= TIERS[i].min) return TIERS[i]
  }
  return TIERS[0]
}

// ── Avatar placeholder ────────────────────────────────────────────────────────
function Avatar({ username, size = 64 }: { username: string; size?: number }) {
  const letter = username?.[0]?.toUpperCase() ?? "?"
  return (
    <div
      className="flex shrink-0 items-center justify-center rounded-full bg-primary/20 font-bold text-primary ring-2 ring-primary/30"
      style={{ width: size, height: size, fontSize: size * 0.4 }}
    >
      {letter}
    </div>
  )
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-border/60 bg-card/60 p-4">
      <div className="text-[11px] text-muted-foreground">{label}</div>
      <div className="mt-1 text-xl font-bold">{value}</div>
      {sub && <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>}
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const [user, setUser] = React.useState<User | null>(null)
  const [transactions, setTransactions] = React.useState<Transaction[]>([])
  const [winrate, setWinrate] = React.useState<Winrate | null>(null)
  const [bets, setBets] = React.useState<BetWithDetails[]>([])
  const [rank, setRank] = React.useState<number | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)

  const API = process.env.NEXT_PUBLIC_API_URL

  React.useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) { setError("Non connecté."); setLoading(false); return }

    const h = { Authorization: `Bearer ${token}`, Accept: "application/json" }

    Promise.all([
      fetch("/api/me", { headers: h }).then((r) => r.json()),
      fetch(`${API}/transactions/me`, { headers: h }).then((r) => r.json()),
      fetch(`${API}/transactions/winrate`, { headers: h }).then((r) => r.json()),
      fetch(`${API}/bets/me`, { headers: h }).then((r) => r.json()),
      fetch(`${API}/rank/leaderboard/me`, { headers: h }).then((r) => r.json()),
    ])
      .then(([u, tx, wr, b, rk]) => {
        setUser(u)
        setTransactions(Array.isArray(tx) ? tx : [])
        setWinrate(wr)
        setBets(Array.isArray(b) ? b : [])
        setRank(typeof rk === "number" ? rk : null)
      })
      .catch((e) => setError(e?.message ?? "Erreur"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return (
    <>
      <SiteHeader />
      <main className="flex min-h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="text-sm text-muted-foreground">Chargement…</p>
        </div>
      </main>
    </>
  )

  if (error || !user) return (
    <>
      <SiteHeader />
      <main className="flex min-h-[60vh] items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-red-400">{error ?? "Utilisateur introuvable"}</p>
          <Link href="/login" className="mt-3 inline-block text-sm text-primary hover:underline">Se connecter</Link>
        </div>
      </main>
    </>
  )

  const tier = getTier(user.points_balance)
  const lastBalance = transactions.at(-1)?.balance_after ?? 0
  const firstBalance = transactions[0]?.balance_after ?? 0
  const pnl = lastBalance - firstBalance
  const isUp = pnl >= 0

  // Recent 20 transactions for the chart
  const chartData = transactions.slice(-40)

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-8">

        {/* ── Hero card ── */}
        <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm">
          {/* Decorative glow */}
          <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-primary/8 blur-3xl" />

          <div className="relative flex flex-wrap items-center gap-5">
            <Avatar username={user.username} size={72} />

            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight">{user.username}</h1>
                <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${tier.bg} ${tier.color}`}>
                  {tier.name}
                </span>
                {user.role === "admin" && (
                  <span className="rounded-full border border-primary/30 bg-primary/15 px-2.5 py-0.5 text-[11px] font-semibold text-primary">
                    Admin
                  </span>
                )}
              </div>
              <p className="mt-0.5 text-sm text-muted-foreground">{user.email}</p>
              {rank && (
                <p className="mt-1 text-xs text-muted-foreground">
                  Classement global : <span className="font-semibold text-foreground">#{rank}</span>
                </p>
              )}
            </div>

            <div className="text-right">
              <div className="text-3xl font-bold tabular-nums">{formatPts(user.points_balance)}</div>
              <div className="text-xs text-muted-foreground">AniCoins</div>
            </div>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatCard
            label="Winrate"
            value={winrate?.winrate != null ? `${winrate.winrate}%` : "—"}
            sub={winrate ? `${winrate.won}W / ${winrate.lost}L` : undefined}
          />
          <StatCard
            label="Paris totaux"
            value={String(winrate?.total ?? 0)}
            sub="résolus"
          />
          <StatCard
            label="P&L net"
            value={`${isUp ? "+" : ""}${formatPts(pnl)}`}
            sub="depuis le début"
          />
          <StatCard
            label="Transactions"
            value={String(transactions.length)}
            sub="au total"
          />
        </div>

        {/* ── Balance chart ── */}
        <div className="mt-4 rounded-2xl border border-border/60 bg-card/60 p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-sm font-semibold">Évolution du solde</h2>
            <span className={`text-xs font-medium ${isUp ? "text-emerald-400" : "text-red-400"}`}>
              {isUp ? "▲" : "▼"} {formatPts(Math.abs(pnl))} pts
            </span>
          </div>
          <div className="h-[130px]">
            <BalanceChart data={chartData} />
          </div>
          {transactions.length > 0 && (
            <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
              <span>{formatDate(transactions[0].created_at)}</span>
              <span>{formatDate(transactions.at(-1)!.created_at)}</span>
            </div>
          )}
        </div>

        {/* ── Bets + Transactions side by side ── */}
        <div className="mt-4 grid gap-4 lg:grid-cols-2">

          {/* Bets history */}
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
            <h2 className="mb-3 text-sm font-semibold">Historique des paris</h2>
            {bets.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucun pari pour l'instant.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {bets.slice().reverse().map((bet) => (
                  <div key={bet.id} className="flex items-start justify-between gap-3 rounded-xl border border-border/50 bg-background/30 p-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-xs font-medium">{bet.event_title ?? "Event inconnu"}</p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">{bet.outcome_label ?? "—"}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <span className={`inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium ${STATUS_STYLE[bet.status] ?? ""}`}>
                        {bet.status}
                      </span>
                      <p className="mt-1 text-[11px] text-muted-foreground">{formatPts(bet.points_placed)} pts</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transactions */}
          <div className="rounded-2xl border border-border/60 bg-card/60 p-5">
            <h2 className="mb-3 text-sm font-semibold">Dernières transactions</h2>
            {transactions.length === 0 ? (
              <p className="text-xs text-muted-foreground">Aucune transaction.</p>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {transactions.slice().reverse().slice(0, 20).map((tx) => (
                  <div key={tx.id} className="flex items-center justify-between gap-2 rounded-xl border border-border/50 bg-background/30 p-3">
                    <div>
                      <p className={`text-xs font-medium ${KIND_COLOR[tx.kind] ?? "text-foreground"}`}>
                        {KIND_LABEL[tx.kind] ?? tx.kind}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{formatDate(tx.created_at)}</p>
                    </div>
                    <div className="text-right">
                      <p className={`text-sm font-semibold tabular-nums ${tx.amount > 0 ? "text-emerald-400" : "text-red-400"}`}>
                        {tx.amount > 0 ? "+" : ""}{formatPts(tx.amount)}
                      </p>
                      <p className="text-[10px] text-muted-foreground">{formatPts(tx.balance_after)} pts</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}