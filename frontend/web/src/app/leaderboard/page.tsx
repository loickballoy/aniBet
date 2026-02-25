"use client"

import * as React from "react"
import Link from "next/link"

type Row = {
  user_id?: string | number
  username?: string
  points?: number
  rank?: number
}

export default function LeaderboardPage() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [rows, setRows] = React.useState<Row[]>([])

  React.useEffect(() => {
    ;(async () => {
      try {
        const res = await fetch("/api/leaderboard?limit=50&offset=0")
        const txt = await res.text().catch(() => "")

        if (!res.ok) {
          let msg = txt
          try {
            const j = JSON.parse(txt)
            msg = j?.detail ? String(j.detail) : j?.error ? String(j.error) : txt
          } catch {}
          throw new Error(msg || `Erreur (${res.status})`)
        }

        const data = JSON.parse(txt)
        setRows(Array.isArray(data) ? data : data?.items ?? [])
      } catch (e: any) {
        setError(e?.message ?? "Erreur")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-4 flex items-center justify-between">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Retour
        </Link>
        <div className="text-sm font-semibold">Leaderboard</div>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-5">
        <h1 className="text-xl font-semibold">Top 50</h1>

        {loading ? (
          <p className="mt-4 text-sm text-muted-foreground">Chargement…</p>
        ) : error ? (
          <p className="mt-4 text-sm text-red-300">{error}</p>
        ) : (
          <div className="mt-4 overflow-hidden rounded-xl border border-border/70">
            <div className="grid grid-cols-12 bg-background/30 px-3 py-2 text-xs text-muted-foreground">
              <div className="col-span-2">#</div>
              <div className="col-span-7">User</div>
              <div className="col-span-3 text-right">Points</div>
            </div>

            <div className="divide-y divide-border/70">
              {rows.slice(0, 50).map((r, idx) => {
                const rank = r.rank ?? idx + 1
                const name = r.username ?? String(r.user_id ?? "unknown")
                const pts = typeof r.points === "number" ? r.points : Number(r.points ?? 0)

                return (
                  <div key={`${rank}-${name}`} className="grid grid-cols-12 px-3 py-2 text-sm">
                    <div className="col-span-2 text-muted-foreground">{rank}</div>
                    <div className="col-span-7 truncate">{name}</div>
                    <div className="col-span-3 text-right text-muted-foreground">
                      {Math.round(pts)}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </main>
  )
}