"use client"

import * as React from "react"
import Link from "next/link"

export default function ProfilePage() {
  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [user, setUser] = React.useState<any>(null)

  React.useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) {
      setError("Pas connecté.")
      setLoading(false)
      return
    }

    ;(async () => {
      try {
        const res = await fetch("/api/me", {
          headers: { Authorization: `Bearer ${token}` },
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

        setUser(JSON.parse(txt))
      } catch (e: any) {
        setError(e?.message ?? "Erreur")
      } finally {
        setLoading(false)
      }
    })()
  }, [])

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-6">
      <div className="mb-4">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Retour
        </Link>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-5">
        <h1 className="text-xl font-semibold">Profil</h1>

        {loading ? (
          <p className="mt-3 text-sm text-muted-foreground">Chargement…</p>
        ) : error ? (
          <p className="mt-3 text-sm text-red-300">{error}</p>
        ) : (
          <>
            <p className="mt-2 text-sm text-muted-foreground">
              Infos user renvoyées par le backend :
            </p>

            <pre className="mt-4 overflow-auto rounded-xl border border-border/70 bg-background/30 p-4 text-xs">
              {JSON.stringify(user, null, 2)}
            </pre>
          </>
        )}
      </div>
    </main>
  )
}