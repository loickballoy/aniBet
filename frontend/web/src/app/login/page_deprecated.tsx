"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"

export default function LoginPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") || "/"

  const [username, setUsername] = React.useState("")
  const [password, setPassword] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)

    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      })

      const txt = await res.text().catch(() => "")

      if (!res.ok) {
        // essaye de sortir un message lisible
        let msg = txt
        try {
          const j = JSON.parse(txt)
          msg = j?.detail ? String(j.detail) : txt
        } catch {}
        throw new Error(msg || `Login failed (${res.status})`)
      }

      const data = JSON.parse(txt)

      if (data.access_token) localStorage.setItem("access_token", data.access_token)
      if (data.refresh_token) localStorage.setItem("refresh_token", data.refresh_token)

      router.push(next)
      router.refresh()
    } catch (err: any) {
      setError(err?.message ?? "Erreur login")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto w-full max-w-md px-4 py-10">
      <div className="mb-6">
        <Link href="/" className="text-sm text-muted-foreground hover:underline">
          ← Retour
        </Link>
      </div>

      <div className="rounded-2xl border border-border/70 bg-card p-6">
        <h1 className="text-xl font-semibold">Connexion</h1>
        <p className="mt-1 text-sm text-muted-foreground">Entre ton username et ton mot de passe.</p>

        <form onSubmit={onSubmit} className="mt-6 space-y-4">
          <div>
            <label className="text-xs text-muted-foreground">Username</label>
            <input
              className="mt-2 h-10 w-full rounded-xl border border-border/70 bg-background/40 px-3 text-sm outline-none"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="text-xs text-muted-foreground">Mot de passe</label>
            <input
              className="mt-2 h-10 w-full rounded-xl border border-border/70 bg-background/40 px-3 text-sm outline-none"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>

          {error ? (
            <div className="rounded-xl border border-border/70 bg-background/30 p-3 text-sm text-red-300">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="h-10 w-full rounded-xl bg-primary px-4 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-60"
          >
            {loading ? "..." : "Se connecter"}
          </button>
        </form>
      </div>
    </main>
  )
}