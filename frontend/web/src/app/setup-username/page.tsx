"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

const FORBIDDEN = /[^a-zA-Z0-9_\-\.]/
function validate(val: string): string | null {
  if (val.length < 3)  return "Au moins 3 caractères"
  if (val.length > 24) return "Maximum 24 caractères"
  if (FORBIDDEN.test(val)) return "Lettres, chiffres, _ - . uniquement"
  return null
}

export default function SetupUsernamePage() {
  const router = useRouter()
  const [username, setUsername] = React.useState("")
  const [loading,  setLoading]  = React.useState(false)
  const [error,    setError]    = React.useState<string | null>(null)

  const API = process.env.NEXT_PUBLIC_API_URL ?? ""
  const validationError = username ? validate(username) : null
  const canSubmit = !loading && !validationError && username.length >= 3

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const err = validate(username)
    if (err) { setError(err); return }

    const token = localStorage.getItem("access_token")
    if (!token) { router.replace("/login"); return }

    setLoading(true); setError(null)
    try {
      const res = await fetch(`${API}/auth/change-username`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ new_username: username }),
      })
      if (!res.ok) throw new Error((await res.json())?.detail ?? "Erreur")
      router.replace("/")
    } catch (e: any) {
      setError(e?.message ?? "Erreur")
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background px-4">
      {/* Glow bg */}
      <div className="pointer-events-none absolute left-1/2 top-1/3 h-80 w-80 -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/8 blur-[100px]" />

      <div className="relative w-full max-w-sm">
        <div className="mb-8 text-center">
          <span className="text-2xl font-bold tracking-tight">aniBet</span>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Bienvenue ! Choisis ton pseudo pour commencer 🎉
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/80 p-6 shadow-xl backdrop-blur-sm">
          <h1 className="text-base font-semibold">Ton username</h1>
          <p className="mt-1 text-xs text-muted-foreground">
            Visible par tous. Tu pourras le modifier depuis ton profil.
          </p>

          <form onSubmit={submit} className="mt-5 space-y-4">
            <div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground select-none">
                  @
                </span>
                <input
                  autoFocus
                  className="h-11 w-full rounded-xl border border-border/70 bg-background/40 pl-7 pr-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
                  value={username}
                  onChange={(e) => { setUsername(e.target.value.trim()); setError(null) }}
                  placeholder="cool_username"
                  maxLength={24}
                  disabled={loading}
                />
              </div>

              {/* Live feedback */}
              <div className="mt-1.5 flex items-center justify-between px-0.5">
                <span className={`text-[11px] transition ${
                  error           ? "text-red-400"
                  : validationError ? "text-amber-400"
                  : username.length >= 3 ? "text-emerald-400"
                  : "text-muted-foreground"
                }`}>
                  {error ?? validationError ?? (username.length >= 3 ? "✓ Format valide" : "Lettres, chiffres, _ - .")}
                </span>
                <span className="text-[11px] text-muted-foreground">{username.length}/24</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className="h-11 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-primary-foreground border-t-transparent" />
                  Enregistrement…
                </span>
              ) : "Continuer →"}
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-[11px] text-muted-foreground/50">
          Tu peux aussi{" "}
          <button
            onClick={() => router.replace("/")}
            className="underline transition hover:text-muted-foreground"
          >
            passer pour l'instant
          </button>
          {" "}et le définir depuis ton profil.
        </p>
      </div>
    </main>
  )
}