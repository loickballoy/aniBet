"use client"

import * as React from "react"
import Link from "next/link"

type Quest = {
  key: string
  title: string
  reward: number
  href: string
  completed: boolean
  claimed: boolean
}

// Quête de démarrage : fait découvrir tout le site (parier, jouer, proposer,
// personnaliser son profil) contre ~2000 AniCoins. Invisible pour les invités
// et une fois toutes les récompenses réclamées.
export function StarterQuest() {
  const [quests, setQuests] = React.useState<Quest[] | null>(null)
  const [claiming, setClaiming] = React.useState<string | null>(null)
  const [token, setToken] = React.useState<string | null>(null)
  const API = process.env.NEXT_PUBLIC_API_URL ?? ""

  React.useEffect(() => {
    const t = localStorage.getItem("access_token")
    setToken(t)
    if (!t) return
    fetch(`${API}/quests/starter`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((q) => setQuests(Array.isArray(q) ? q : null))
      .catch(() => {})
  }, [API])

  async function claim(key: string) {
    if (!token) return
    setClaiming(key)
    try {
      const res = await fetch(`${API}/quests/starter/${key}/claim`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.ok) setQuests((qs) => qs?.map((q) => (q.key === key ? { ...q, claimed: true } : q)) ?? null)
    } finally {
      setClaiming(null)
    }
  }

  if (!quests || quests.every((q) => q.claimed)) return null

  const done = quests.filter((q) => q.claimed).length
  const total = quests.reduce((acc, q) => acc + q.reward, 0)

  return (
    <section className="mt-8 rounded-2xl border border-primary/30 bg-primary/5 p-4 sm:p-5">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="text-base font-semibold">🎯 Starter quest</h3>
          <p className="text-xs text-muted-foreground">Learn the ropes and earn up to {total.toLocaleString("en-US")} AniCoins</p>
        </div>
        <span className="text-xs font-medium text-primary">{done}/{quests.length} done</span>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-border/40">
        <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${(done / quests.length) * 100}%` }} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
        {quests.map((q) => (
          <div key={q.key} className="flex items-center justify-between gap-3 rounded-xl border border-border/50 bg-background/40 px-3 py-2.5">
            <span className={`text-sm ${q.claimed ? "text-muted-foreground line-through" : ""}`}>
              {q.claimed ? "✓ " : ""}{q.title}
            </span>
            {q.claimed ? (
              <span className="text-[11px] text-emerald-400">+{q.reward}</span>
            ) : q.completed ? (
              <button
                onClick={() => claim(q.key)}
                disabled={claiming === q.key}
                className="shrink-0 rounded-lg bg-primary px-2.5 py-1 text-[11px] font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
              >
                {claiming === q.key ? "…" : `Claim +${q.reward}`}
              </button>
            ) : (
              <Link href={q.href} className="shrink-0 text-[11px] font-medium text-primary hover:underline">
                Go · +{q.reward} →
              </Link>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
