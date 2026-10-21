"use client"

import * as React from "react"

// Streak du joueur connecté, rechargé quand la partie se conclut (pour que
// le texte de partage affiche le streak à jour). null pour un invité.
export function useStreak(token: string, refreshKey: unknown): number | null {
  const [streak, setStreak] = React.useState<number | null>(null)
  const API = process.env.NEXT_PUBLIC_API_URL ?? ""

  React.useEffect(() => {
    if (!token) return
    fetch(`${API}/streaks/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((s) => setStreak(s?.current_streak ?? null))
      .catch(() => {})
  }, [API, token, refreshKey])

  return streak
}
