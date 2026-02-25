"use client"

import * as React from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"

type OutcomeLite = { id: number; label: string }

export function BetPanel({
  eventId,
  outcomes,
  locked,
}: {
  eventId: number
  outcomes: OutcomeLite[]
  locked: boolean
}) {
  const [selectedOutcomeId, setSelectedOutcomeId] = React.useState<number | null>(
    outcomes[0]?.id ?? null
  )
  const [points, setPoints] = React.useState<string>("100")
  const [loading, setLoading] = React.useState(false)
  const [message, setMessage] = React.useState<string | null>(null)

  const base = process.env.NEXT_PUBLIC_API_URL

  async function placeBet() {
    setMessage(null)

    if (!base) {
      setMessage("NEXT_PUBLIC_API_URL manquant.")
      return
    }
    if (locked) {
      setMessage("Ce marché est verrouillé.")
      return
    }
    if (!selectedOutcomeId) {
      setMessage("Choisis un outcome.")
      return
    }

    const amount = Number(points)
    if (!Number.isFinite(amount) || amount <= 0) {
      setMessage("Montant invalide.")
      return
    }

    const token = typeof window !== "undefined" ? localStorage.getItem("access_token") : null
    if (!token) {
      setMessage("Connecte-toi pour parier (token manquant).")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${base}/bets/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          event_id: eventId,
          outcome_id: selectedOutcomeId,
          points_placed: amount,
        }),
      })

      if (!res.ok) {
        const text = await res.text().catch(() => "")
        throw new Error(text || "Erreur lors du bet")
      }

      setMessage("✅ Bet placé ! (reload recommandé pour voir les pools)")
    } catch (e: any) {
      setMessage(`❌ ${e?.message ?? "Erreur"}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="border-border/70 bg-background/30 p-4">
      <div className="mb-3 flex items-center justify-between">
        <div className="text-sm font-semibold">Parier</div>
        {locked ? <Badge variant="destructive">Locked</Badge> : <Badge>Open</Badge>}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label className="text-xs text-muted-foreground">Outcome</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {outcomes.map((o) => {
              const active = o.id === selectedOutcomeId
              return (
                <Button
                  key={o.id}
                  type="button"
                  variant={active ? "default" : "secondary"}
                  className="h-8"
                  onClick={() => setSelectedOutcomeId(o.id)}
                  disabled={locked}
                >
                  {o.label}
                </Button>
              )
            })}
          </div>
        </div>

        <div>
          <Label htmlFor="points" className="text-xs text-muted-foreground">
            Montant (points)
          </Label>
          <Input
            id="points"
            className="mt-2"
            inputMode="numeric"
            value={points}
            onChange={(e) => setPoints(e.target.value)}
            disabled={locked}
          />
          <div className="mt-2 flex gap-2">
            {[50, 100, 250, 500].map((v) => (
              <Button
                key={v}
                type="button"
                variant="outline"
                className="h-8"
                onClick={() => setPoints(String(v))}
                disabled={locked}
              >
                {v}
              </Button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <Button onClick={placeBet} disabled={loading || locked} className="min-w-32">
          {loading ? "Envoi..." : "Confirmer"}
        </Button>
        {message ? <div className="text-sm text-muted-foreground">{message}</div> : null}
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        (MVP) Le token est lu depuis <code>localStorage.access_token</code>.
      </div>
    </Card>
  )
}