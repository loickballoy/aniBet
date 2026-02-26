"use client"

import { useEffect, useState } from "react"
import Link from "next/link"

type Me = {
  username: string
  email: string
  points_balance: number
  pfp_url?: string | null
  role?: string
}

function formatCoins(n: number) {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(Math.round(n))
}

export function UserWidget() {
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      setLoading(false)
      return
    }

    fetch("/api/me", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => setMe(data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  // Not logged in
  if (!loading && !me) {
    return (
      <div className="flex items-center gap-2">
        <Link
          href="/login"
          className="rounded-xl border border-border/50 bg-background/30 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur-sm transition hover:border-border hover:text-foreground"
        >
          Connexion
        </Link>
      </div>
    )
  }

  // Loading skeleton
  if (loading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-7 w-20 animate-pulse rounded-full bg-muted/40" />
        <div className="h-7 w-7 animate-pulse rounded-full bg-muted/40" />
      </div>
    )
  }

  const initiale = me!.username?.[0]?.toUpperCase() ?? "?"

  return (
    <Link
      href="/profile"
      className="group flex items-center gap-2 rounded-2xl border border-border/50 bg-card/40 pl-2 pr-1.5 py-1 backdrop-blur-sm transition hover:border-border hover:bg-card/60"
    >
      {/* Coins */}
      <div className="flex items-center gap-1">
        {/* Coin icon */}
        <span
          className="flex h-4 w-4 items-center justify-center rounded-full text-[9px] font-black"
          style={{
            background: "linear-gradient(135deg, #fbbf24, #f59e0b)",
            boxShadow: "0 0 6px rgba(251,191,36,0.4)",
          }}
        >
          A
        </span>
        <span className="tabular-nums text-xs font-semibold text-foreground">
          {formatCoins(me!.points_balance)}
        </span>
      </div>

      {/* Divider */}
      <div className="h-3.5 w-px bg-border/60" />

      {/* Avatar */}
      {me!.pfp_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={me!.pfp_url}
          alt={me!.username}
          className="h-6 w-6 rounded-full object-cover ring-1 ring-border/60 transition group-hover:ring-primary/40"
        />
      ) : (
        <div
          className="flex h-6 w-6 items-center justify-center rounded-full bg-primary/20 text-[10px] font-bold text-primary ring-1 ring-primary/25 transition group-hover:ring-primary/50 select-none"
        >
          {initiale}
        </div>
      )}
    </Link>
  )
}