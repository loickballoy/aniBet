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
  pfp_url: string | null
}

type CreatorRow = {
  rank: number
  username: string
  pfp_url: string | null
  approved_markets: number
  total_pool: number
  creator_earnings: number
}

type View = "global" | "following" | "creators"

// ── Tiers config ──────────────────────────────────────────────────────────────
const TIERS = [
  {
    name: "Iron",
    min: 0,
    color: "text-zinc-300",
    bg: "bg-zinc-500/10 border-zinc-500/20",
    glow: "",
    dot: "bg-zinc-400",
    icon: "⚙️",
  },
  {
    name: "Bronze",
    min: 1000,
    color: "text-amber-500",
    bg: "bg-amber-600/10 border-amber-500/25",
    glow: "shadow-amber-500/10",
    dot: "bg-amber-500",
    icon: "🥉",
  },
  {
    name: "Silver",
    min: 20000,
    color: "text-slate-200",
    bg: "bg-slate-400/10 border-slate-300/20",
    glow: "shadow-slate-300/10",
    dot: "bg-slate-300",
    icon: "🔘",
  },
  {
    name: "Gold",
    min: 40000,
    color: "text-yellow-300",
    bg: "bg-yellow-400/10 border-yellow-400/25",
    glow: "shadow-yellow-400/15",
    dot: "bg-yellow-400",
    icon: "⭐",
  },
  {
    name: "Diamond",
    min: 100000,
    color: "text-cyan-300",
    bg: "bg-cyan-400/10 border-cyan-400/25",
    glow: "shadow-cyan-400/20",
    dot: "bg-cyan-400",
    icon: "💎",
  },
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
function Avatar({
  username,
  pfpUrl,
  size = 36,
  ringClass = "ring-1 ring-primary/25",
}: {
  username: string
  pfpUrl?: string | null
  size?: number
  ringClass?: string
}) {
  const letter = username?.[0]?.toUpperCase() ?? "?"
  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-full select-none ${ringClass}`}
      style={{ width: size, height: size }}
    >
      {pfpUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={pfpUrl} alt="" className="h-full w-full object-cover" />
      ) : (
        <div
          className="flex h-full w-full items-center justify-center rounded-full bg-primary/15 font-bold text-primary"
          style={{ fontSize: size * 0.38 }}
        >
          {letter}
        </div>
      )}
    </div>
  )
}

// ── Rank medal ────────────────────────────────────────────────────────────────
function Medal({ rank }: { rank: number }) {
  if (rank === 1)
    return (
      <span
        className="text-base"
        style={{ filter: "drop-shadow(0 0 6px rgba(250,204,21,0.6))" }}
      >
        🥇
      </span>
    )
  if (rank === 2)
    return (
      <span
        className="text-base"
        style={{ filter: "drop-shadow(0 0 4px rgba(148,163,184,0.5))" }}
      >
        🥈
      </span>
    )
  if (rank === 3)
    return (
      <span
        className="text-base"
        style={{ filter: "drop-shadow(0 0 4px rgba(180,120,60,0.4))" }}
      >
        🥉
      </span>
    )
  return (
    <span className="w-6 text-center text-sm font-medium text-muted-foreground tabular-nums">
      {rank}
    </span>
  )
}

// ── Podium ────────────────────────────────────────────────────────────────────
const PODIUM_CONFIGS = [
  // 2nd place (left)
  {
    barH: "h-20",
    avatarSize: 44,
    labelSize: "text-xs",
    borderColor: "border-slate-400/30",
    bgColor: "bg-slate-400/8",
    glowColor: "",
    rankIndex: 1,
  },
  // 1st place (center)
  {
    barH: "h-28",
    avatarSize: 56,
    labelSize: "text-sm",
    borderColor: "border-yellow-400/40",
    bgColor: "bg-yellow-400/8",
    glowColor: "shadow-yellow-400/20",
    rankIndex: 0,
  },
  // 3rd place (right)
  {
    barH: "h-16",
    avatarSize: 38,
    labelSize: "text-xs",
    borderColor: "border-amber-600/25",
    bgColor: "bg-amber-600/8",
    glowColor: "",
    rankIndex: 2,
  },
]

function Podium({ rows }: { rows: Row[] }) {
  if (rows.length < 1) return null

  // Display order: 2nd | 1st | 3rd
  const slots =
    rows.length >= 3
      ? [rows[1], rows[0], rows[2]]
      : rows.length === 2
      ? [rows[1], rows[0]]
      : [rows[0]]

  const configs = PODIUM_CONFIGS.slice(0, slots.length)

  // Reorder configs for 1 or 2 players
  const orderedConfigs =
    rows.length === 1
      ? [PODIUM_CONFIGS[1]]
      : rows.length === 2
      ? [PODIUM_CONFIGS[0], PODIUM_CONFIGS[1]]
      : PODIUM_CONFIGS

  return (
    <div className="mb-8 flex items-end justify-center gap-3 sm:gap-5">
      {slots.map((row, i) => {
        const cfg = orderedConfigs[i]
        const tier = getTier(row.points_balance)
        const isFirst = cfg.rankIndex === 0
        const rank = cfg.rankIndex + 1

        return (
          <div
            key={row.username}
            className="flex flex-col items-center gap-2"
            style={{
              animation: `fadeInUp 0.5s ease both`,
              animationDelay: `${i * 80}ms`,
            }}
          >
            {/* Avatar + name */}
            <div className="flex flex-col items-center gap-1.5">
              <div
                className="rounded-full"
                style={{
                  boxShadow: isFirst
                    ? "0 0 20px rgba(250,204,21,0.15), 0 0 0 2px rgba(250,204,21,0.3)"
                    : "0 0 0 2px rgba(99,102,241,0.2)",
                }}
              >
                <Avatar username={row.username} pfpUrl={row.pfp_url} size={cfg.avatarSize} ringClass=""/>
              </div>
              <div className="text-center">
                <div
                  className={`font-semibold ${cfg.labelSize} max-w-[80px] truncate`}
                >
                  {row.username}
                </div>
                <div className={`text-[10px] ${tier.color}`}>{tier.name}</div>
                <div className="text-[10px] text-muted-foreground">
                  {formatPts(row.points_balance)}
                </div>
              </div>
            </div>

            {/* Podium bar */}
            <div
              className={`${cfg.barH} w-20 sm:w-24 flex items-end justify-center rounded-t-2xl border ${cfg.borderColor} ${cfg.bgColor} pb-2 backdrop-blur-sm transition-all ${cfg.glowColor ? `shadow-lg ${cfg.glowColor}` : ""}`}
            >
              <Medal rank={rank} />
            </div>
          </div>
        )
      })}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(16px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

// ── Tier badge ────────────────────────────────────────────────────────────────
function TierBadge({ tier }: { tier: ReturnType<typeof getTier> }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${tier.bg} ${tier.color} ${tier.glow ? `shadow-sm ${tier.glow}` : ""}`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${tier.dot}`}
        style={{
          boxShadow:
            tier.name !== "Iron"
              ? `0 0 4px var(--tw-shadow-color)`
              : undefined,
        }}
      />
      {tier.name}
    </span>
  )
}

// ── Skeleton row ──────────────────────────────────────────────────────────────
function CreatorsTable({ rows }: { rows: CreatorRow[] | null }) {
  if (rows === null) return <p className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</p>
  if (rows.length === 0) {
    return (
      <p className="rounded-2xl border border-border/50 bg-card/40 px-4 py-10 text-center text-sm text-muted-foreground">
        No community market yet — <Link href="/propose" className="text-primary hover:underline">propose the first one</Link> and earn 0.5% of its pool.
      </p>
    )
  }
  return (
    <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm">
      <div className="grid grid-cols-12 border-b border-border/40 bg-background/20 px-4 py-2.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
        <div className="col-span-1">#</div>
        <div className="col-span-5">Creator</div>
        <div className="col-span-2 text-right">Markets</div>
        <div className="col-span-2 text-right">Volume</div>
        <div className="col-span-2 text-right">Earned</div>
      </div>
      <div className="divide-y divide-border/25">
        {rows.map((r) => (
          <div key={r.username} className="grid grid-cols-12 items-center px-4 py-3 text-sm">
            <div className="col-span-1"><Medal rank={r.rank} /></div>
            <div className="col-span-5 flex items-center gap-2.5">
              <Avatar username={r.username} pfpUrl={r.pfp_url} size={30} ringClass="" />
              <span className="truncate font-medium">{r.username}</span>
            </div>
            <div className="col-span-2 text-right tabular-nums">{r.approved_markets}</div>
            <div className="col-span-2 text-right tabular-nums text-muted-foreground">{formatPts(r.total_pool)}</div>
            <div className="col-span-2 text-right tabular-nums text-emerald-400">+{formatPts(r.creator_earnings)}</div>
          </div>
        ))}
      </div>
      <p className="border-t border-border/40 px-4 py-2.5 text-[11px] text-muted-foreground">
        Approved proposals earn +500, then 0.5% of the pool when the market pays out.{" "}
        <Link href="/propose" className="text-primary hover:underline">Propose a bet →</Link>
      </p>
    </div>
  )
}

function SkeletonRow() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <div className="h-4 w-6 animate-pulse rounded bg-muted/40" />
      <div className="flex items-center gap-2.5 flex-1">
        <div className="h-7 w-7 animate-pulse rounded-full bg-muted/40" />
        <div className="h-3.5 w-28 animate-pulse rounded bg-muted/40" />
      </div>
      <div className="h-4 w-14 animate-pulse rounded-full bg-muted/40" />
      <div className="h-3.5 w-10 animate-pulse rounded bg-muted/40" />
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LeaderboardPage() {
  const [rows, setRows] = React.useState<Row[]>([])
  const [myRank, setMyRank] = React.useState<number | null>(null)
  const [myUsername, setMyUsername] = React.useState<string | null>(null)
  const [myPoints, setMyPoints] = React.useState<number | null>(null)
  const [myPfp, setMyPfp] = React.useState<string | null>(null)
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [filter, setFilter] = React.useState<string>("all")
  const [view, setView] = React.useState<View>("global")
  const [following, setFollowing] = React.useState<Set<string>>(new Set())
  const [followRows, setFollowRows] = React.useState<Row[] | null>(null)
  const [creators, setCreators] = React.useState<CreatorRow[] | null>(null)
  const API = process.env.NEXT_PUBLIC_API_URL ?? ""
  const authHeaders = (): Record<string, string> => {
    const t = localStorage.getItem("access_token")
    return t ? { Authorization: `Bearer ${t}` } : {}
  }

  async function loadFollowRows() {
    const r = await fetch(`${API}/rank/leaderboard/following`, { headers: authHeaders() })
    const data = r.ok ? await r.json() : []
    setFollowRows((Array.isArray(data) ? data : []).map((x: { rank: number; username: string; points_balance: number; pfp_url?: string | null }) => ({
      rank: x.rank, username: x.username, points_balance: x.points_balance,
      tier: getTier(x.points_balance).name, pfp_url: x.pfp_url ?? null,
    })))
  }

  async function toggleFollow(username: string) {
    const isFollowing = following.has(username)
    const next = new Set(following)
    if (isFollowing) next.delete(username); else next.add(username)
    setFollowing(next)  // optimiste
    const res = await fetch(`${API}/users/${encodeURIComponent(username)}/follow`, {
      method: isFollowing ? "DELETE" : "POST", headers: authHeaders(),
    }).catch(() => null)
    if (!res?.ok) setFollowing(following)  // échec : on revient en arrière
    else if (followRows) loadFollowRows()
  }

  function switchView(v: View) {
    setView(v)
    if (v === "following" && followRows === null && myUsername) loadFollowRows()
    if (v === "creators" && creators === null) {
      fetch(`${API}/rank/creators?limit=50`)
        .then((r) => (r.ok ? r.json() : []))
        .then((data) => setCreators(Array.isArray(data) ? data : []))
        .catch(() => setCreators([]))
    }
  }

  React.useEffect(() => {
    const token =
      typeof window !== "undefined" ? localStorage.getItem("access_token") : null
    const API = process.env.NEXT_PUBLIC_API_URL ?? ""

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
          pfp_url: r.pfp_url ?? null,
        }))
        setRows(mapped)
      })
      .catch((e) => setError(e?.message ?? "Erreur"))
      .finally(() => setLoading(false))

    if (token) {
      const h = { Authorization: `Bearer ${token}` }
      fetch("/api/me", { headers: h })
        .then((r) => (r.ok ? r.json() : null))
        .then((me) => {
          if (me?.username) {
            setMyUsername(me.username)
            setMyPoints(me.points_balance ?? null)
            setMyPfp(me.pfp_url ?? null)
          }
        })
        .catch(() => {})

      fetch(`${API}/users/me/following`, { headers: h })
        .then((r) => (r.ok ? r.json() : []))
        .then((list) => setFollowing(new Set(Array.isArray(list) ? list : [])))
        .catch(() => {})

      fetch(`${API}/rank/leaderboard/me`, { headers: h })
        .then((r) => (r.ok ? r.json() : null))
        .then((rank) => {
          if (typeof rank === "number") setMyRank(rank)
        })
        .catch(() => {})
    }
  }, [])

  const filtered =
    view === "following" ? (followRows ?? [])
    : filter === "all" ? rows : rows.filter((r) => r.tier === filter)

  const showMyBanner =
    myRank !== null && myUsername !== null && myPoints !== null

  return (
    <>
      <SiteHeader />

      {/* Ambient background glow */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/4 top-0 h-[500px] w-[500px] -translate-x-1/2 rounded-full bg-primary/4 blur-[120px]" />
        <div className="absolute right-1/4 top-1/3 h-[400px] w-[400px] rounded-full bg-cyan-500/3 blur-[100px]" />
      </div>

      <main className="mx-auto w-full max-w-3xl px-4 py-8">

        {/* ── Header ── */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Leaderboard</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Top 50 players · updated live
            </p>
          </div>
          <Link
            href="/"
            className="rounded-xl border border-border/50 bg-background/30 px-3 py-2 text-xs text-muted-foreground backdrop-blur-sm transition hover:border-border hover:text-foreground"
          >
            ← Back
          </Link>
        </div>

        {/* ── My rank banner ── */}
        {showMyBanner && (
          <div className="mb-6 overflow-hidden rounded-2xl border border-primary/20 bg-primary/5 backdrop-blur-sm">
            <div className="flex items-center gap-4 px-5 py-4">
              {/* Avatar */}
              <Avatar
                username={myUsername!}
                pfpUrl={myPfp}
                size={44}
                ringClass="ring-2 ring-primary/30"
              />

              <div className="flex-1 min-w-0">
                <div className="text-xs text-muted-foreground">Your Rank</div>
                <div className="flex items-baseline gap-2">
                  <span className="text-xl font-bold text-primary">#{myRank}</span>
                  <span className="text-sm font-medium truncate">{myUsername}</span>
                </div>
              </div>

              <div className="text-right shrink-0">
                {myPoints !== null && (
                  <>
                    <div className="text-lg font-bold tabular-nums">
                      {formatPts(myPoints)}
                    </div>
                    <div className="text-[10px] text-muted-foreground">AniCoins</div>
                  </>
                )}
              </div>

              {myPoints !== null && (
                <TierBadge tier={getTier(myPoints)} />
              )}
            </div>
            {/* Subtle gradient line at top */}
            <div className="h-px w-full bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          </div>
        )}

        {/* ── Vue : global / amis / créateurs ── */}
        <div className="mb-5 inline-flex rounded-2xl border border-border/50 bg-muted/30 p-1">
          {([["global", "Global"], ["following", "Following"], ["creators", "Top creators"]] as const).map(([v, label]) => (
            <button
              key={v}
              onClick={() => switchView(v)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-medium transition ${
                view === v ? "bg-background text-foreground shadow-sm ring-1 ring-border/60" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {view === "creators" ? (
          <CreatorsTable rows={creators} />
        ) : view === "following" && !myUsername ? (
          <p className="rounded-2xl border border-border/50 bg-card/40 px-4 py-10 text-center text-sm text-muted-foreground">
            <Link href="/login" className="text-primary hover:underline">Log in</Link> to follow friends and compare your scores.
          </p>
        ) : view === "following" && followRows === null ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">Loading…</p>
        ) : view === "following" && followRows!.length <= 1 ? (
          <p className="rounded-2xl border border-border/50 bg-card/40 px-4 py-10 text-center text-sm text-muted-foreground">
            You don&apos;t follow anyone yet. Hit <span className="text-primary">Follow</span> on players in the Global ranking.
          </p>
        ) : loading ? (
          <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/40 backdrop-blur-sm">
            {Array.from({ length: 10 }).map((_, i) => (
              <React.Fragment key={i}>
                {i > 0 && <div className="h-px bg-border/30 mx-4" />}
                <SkeletonRow />
              </React.Fragment>
            ))}
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/8 p-5 text-sm text-red-400">
            {error}
          </div>
        ) : (
          <>
            {/* ── Podium ── */}
            {view === "global" && filter === "all" && rows.length > 0 && (
              <Podium rows={rows} />
            )}

            {/* ── Tier filters ── */}
            <div className={`mb-5 flex flex-wrap gap-2 ${view === "global" ? "" : "hidden"}`}>
              <button
                onClick={() => setFilter("all")}
                className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                  filter === "all"
                    ? "border-primary/40 bg-primary/15 text-primary shadow-sm"
                    : "border-border/50 bg-background/30 text-muted-foreground hover:border-border hover:text-foreground"
                }`}
              >
                All
              </button>
              {TIERS.slice()
                .reverse()
                .map((t) => (
                  <button
                    key={t.name}
                    onClick={() => setFilter(t.name)}
                    className={`flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                      filter === t.name
                        ? `${t.bg} ${t.color} shadow-sm`
                        : "border-border/50 bg-background/30 text-muted-foreground hover:border-border hover:text-foreground"
                    }`}
                  >
                    <span className={`h-1.5 w-1.5 rounded-full ${t.dot}`} />
                    {t.name}
                  </button>
                ))}
            </div>

            {/* ── Table ── */}
            <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/30 backdrop-blur-sm">
              {/* Header */}
              <div className="grid grid-cols-12 border-b border-border/40 bg-background/20 px-4 py-2.5">
                <div className="col-span-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  #
                </div>
                <div className="col-span-6 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Player
                </div>
                <div className="col-span-3 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Tier
                </div>
                <div className="col-span-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/60">
                  Pts
                </div>
              </div>

              <div className="divide-y divide-border/25">
                {filtered.length === 0 ? (
                  <div className="px-4 py-12 text-center text-sm text-muted-foreground">
                    No player in this Tier.
                  </div>
                ) : (
                  filtered.map((row, idx) => {
                    const tier = getTier(row.points_balance)
                    const isMe = row.username === myUsername
                    const isTop3 = row.rank <= 3

                    return (
                      <div
                        key={`${row.rank}-${row.username}`}
                        className={`grid grid-cols-12 items-center px-4 py-3 transition-colors ${
                          isMe
                            ? "bg-primary/6 hover:bg-primary/8"
                            : isTop3
                            ? "bg-background/10 hover:bg-muted/15"
                            : "hover:bg-muted/10"
                        }`}
                        style={{
                          animation: `fadeInRow 0.3s ease both`,
                          animationDelay: `${Math.min(idx * 20, 400)}ms`,
                        }}
                      >
                        {/* Rank */}
                        <div className="col-span-1 flex items-center">
                          {isMe && !isTop3 ? (
                            <span className="w-6 text-center text-xs font-bold text-primary tabular-nums">
                              {row.rank}
                            </span>
                          ) : (
                            <Medal rank={row.rank} />
                          )}
                        </div>

                        {/* Player */}
                        <div className="col-span-6 flex items-center gap-2.5">
                          <Avatar
                            username={row.username}
                            pfpUrl={isMe ? myPfp : null}
                            size={30}
                            ringClass={isMe ? "ring-1 ring-primary/40" : ""}
                          />
                          <span
                            className={`truncate text-sm font-medium ${
                              isMe ? "text-primary" : ""
                            }`}
                          >
                            {row.username}
                            {isMe && (
                              <span className="ml-1.5 text-[10px] text-primary/50 font-normal">
                                (you)
                              </span>
                            )}
                          </span>
                          {myUsername && !isMe && (
                            <button
                              onClick={() => toggleFollow(row.username)}
                              className={`ml-auto mr-2 shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-medium transition ${
                                following.has(row.username)
                                  ? "border-border/50 text-muted-foreground hover:border-red-500/40 hover:text-red-400"
                                  : "border-primary/40 text-primary hover:bg-primary/10"
                              }`}
                            >
                              {following.has(row.username) ? "Following" : "Follow"}
                            </button>
                          )}
                        </div>

                        {/* Tier */}
                        <div className="col-span-3">
                          <TierBadge tier={tier} />
                        </div>

                        {/* Points */}
                        <div
                          className={`col-span-2 text-right text-sm tabular-nums font-medium ${
                            isTop3 ? "text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {formatPts(row.points_balance)}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>

            {/* CTA non-connecté */}
            {!myUsername && (
              <p className="mt-5 text-center text-xs text-muted-foreground">
                <Link href="/login" className="text-primary hover:underline">
                  Log In
                </Link>{" "}
                to see your rank and compete
              </p>
            )}
          </>
        )}
      </main>

      <style>{`
        @keyframes fadeInRow {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
      `}</style>
    </>
  )
}