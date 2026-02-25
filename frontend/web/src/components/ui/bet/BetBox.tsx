"use client"

import * as React from "react"

type OutcomeLite = { id: number; label: string }

export default function BetBox(props: { eventId: number; outcomes: OutcomeLite[] }) {
  const { eventId, outcomes } = props

  const [selectedId, setSelectedId] = React.useState<number | null>(outcomes?.[0]?.id ?? null)
  const [points, setPoints] = React.useState<string>("100")
  const [loading, setLoading] = React.useState(false)
  const [msg, setMsg] = React.useState<string | null>(null)

  const base = process.env.NEXT_PUBLIC_API_URL

  async function placeBet() {
    setMsg(null)
  
    if (!selectedId) return setMsg("Choisis Oui/Non.")
    const amount = Number(points)
    if (!Number.isFinite(amount) || amount <= 0) return setMsg("Montant invalide.")
  
    const token = localStorage.getItem("access_token")
    if (!token) return setMsg("Connecte-toi pour parier (token manquant).")
  
    setLoading(true)
    try {
      const res = await fetch("/api/bets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          event_id: eventId,
          outcome_id: selectedId,
          points_placed: amount,
        }),
      })
  
      const txt = await res.text().catch(() => "")
  
      if (!res.ok) {
        let msg = txt
        try {
          const j = JSON.parse(txt)
          msg = j?.detail ? String(j.detail) : txt
        } catch {}
        throw new Error(msg || `Erreur (${res.status})`)
      }
  
      setMsg("✅ Bet créé.")
    } catch (e: any) {
      setMsg(`❌ ${e?.message ?? "Failed to fetch"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="rounded-2xl border border-border/70 bg-background/30 p-4">
      <div className="text-sm font-semibold">Parier</div>

      <div className="mt-3 flex flex-wrap gap-2">
        {outcomes.map((o) => {
          const active = o.id === selectedId
          const isYes = o.label.toLowerCase() === "oui" || o.label.toLowerCase() === "yes"
          const isNo = o.label.toLowerCase() === "non" || o.label.toLowerCase() === "no"

          const baseCls =
            "h-9 rounded-xl px-4 text-sm font-medium border transition disabled:opacity-60"
          const activeCls = active ? "border-transparent" : "border-border/70 bg-transparent"
          const yesCls = active
            ? "bg-emerald-500 text-white"
            : "hover:bg-emerald-500/10"
          const noCls = active ? "bg-red-500 text-white" : "hover:bg-red-500/10"
          const neutralCls = active ? "bg-primary text-primary-foreground" : "hover:bg-muted"

          const cls =
            baseCls +
            " " +
            activeCls +
            " " +
            (isYes ? yesCls : isNo ? noCls : neutralCls)

          return (
            <button
              key={o.id}
              type="button"
              className={cls}
              onClick={() => setSelectedId(o.id)}
              disabled={loading}
            >
              {o.label}
            </button>
          )
        })}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <input
          className="h-9 w-40 rounded-xl border border-border/70 bg-background/40 px-3 text-sm outline-none"
          inputMode="numeric"
          value={points}
          onChange={(e) => setPoints(e.target.value)}
          placeholder="Points"
          disabled={loading}
        />

        {[50, 100, 250, 500].map((v) => (
          <button
            key={v}
            type="button"
            className="h-9 rounded-xl border border-border/70 bg-background/40 px-3 text-sm hover:bg-muted"
            onClick={() => setPoints(String(v))}
            disabled={loading}
          >
            {v}
          </button>
        ))}

        <button
          type="button"
          className="h-9 rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          onClick={placeBet}
          disabled={loading}
        >
          {loading ? "..." : "Parier"}
        </button>
      </div>

      {msg ? <div className="mt-3 text-sm text-muted-foreground">{msg}</div> : null}
    </div>
  )
}