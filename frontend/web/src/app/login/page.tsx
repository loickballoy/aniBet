"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"
import Link from "next/link"

type Tab = "login" | "signup"

// ── Discord icon ──────────────────────────────────────────────────────────────
function DiscordIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
      <path d="M20.317 4.37a19.79 19.79 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.3 12.3 0 0 1-1.873.892.076.076 0 0 0-.041.107c.36.698.772 1.363 1.225 1.993a.076.076 0 0 0 .084.028 19.84 19.84 0 0 0 6.002-3.03.077.077 0 0 0 .032-.055c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.028ZM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.211 0 2.176 1.096 2.157 2.42 0 1.333-.955 2.418-2.157 2.418Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.211 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418Z" fill="#5865F2"/>
    </svg>
  )
}

// ── Google icon ──────────────────────────────────────────────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853"/>
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335"/>
    </svg>
  )
}

// ── Animated background particles ────────────────────────────────────────────
function Particles() {
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {Array.from({ length: 20 }).map((_, i) => (
        <div
          key={i}
          className="particle absolute rounded-full bg-primary/10"
          style={{
            width: `${Math.random() * 4 + 2}px`,
            height: `${Math.random() * 4 + 2}px`,
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 8}s`,
            animationDuration: `${Math.random() * 10 + 8}s`,
          }}
        />
      ))}
      <style>{`
        .particle {
          animation: float linear infinite;
        }
        @keyframes float {
          0% { transform: translateY(0px) scale(1); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 0.5; }
          100% { transform: translateY(-100vh) scale(0.5); opacity: 0; }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .fade-in { animation: fadeIn 0.35s ease both; }
      `}</style>
    </div>
  )
}

function LoginContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const next = searchParams.get("next") || "/"

  const [tab, setTab] = React.useState<Tab>("login")
  const [loading, setLoading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState<string | null>(null)

  // ── Login state ─────────────────────────────────────────────────────────────
  const [loginUsername, setLoginUsername] = React.useState("")
  const [loginPassword, setLoginPassword] = React.useState("")

  // ── Signup state ─────────────────────────────────────────────────────────────
  const [signupEmail, setSignupEmail] = React.useState("")
  const [signupUsername, setSignupUsername] = React.useState("")
  const [signupPassword, setSignupPassword] = React.useState("")

  const BACKEND = process.env.NEXT_PUBLIC_API_URL

  // ── Handlers ─────────────────────────────────────────────────────────────────
  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      })
      const txt = await res.text().catch(() => "")
      if (!res.ok) {
        let msg = txt
        try { msg = JSON.parse(txt)?.detail ?? txt } catch {}
        throw new Error(msg || `Erreur (${res.status})`)
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

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`${BACKEND}/auth/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: signupUsername,
          email: signupEmail,
          password_hash: signupPassword,
          role: "user",
        }),
      })
      const txt = await res.text().catch(() => "")
      if (!res.ok) {
        let msg = txt
        try { msg = JSON.parse(txt)?.detail ?? txt } catch {}
        throw new Error(msg || `Erreur (${res.status})`)
      }
      setSuccess("Compte créé ! Tu peux te connecter dès maintenant.")
      setSignupEmail("")
      setSignupUsername("")
      setSignupPassword("")
    } catch (err: any) {
      setError(err?.message ?? "Erreur inscription")
    } finally {
      setLoading(false)
    }
  }

  function handleGoogleLogin() {
    window.location.href = `${BACKEND}/auth/google`
  }

  function handleDiscordLogin() {
    window.location.href = `${BACKEND}/auth/discord`
  }

  function switchTab(t: Tab) {
    setTab(t)
    setError(null)
    setSuccess(null)
  }

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <main className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-background px-4 py-10">
      <Particles />

      {/* Glow blob */}
      <div className="pointer-events-none absolute left-1/2 top-1/2 h-[500px] w-[500px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/5 blur-[120px]" />

      {/* Back link */}
      <div className="mb-6 w-full max-w-sm">
        <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">
          ← Retour
        </Link>
      </div>

      {/* Card */}
      <div className="relative w-full max-w-sm rounded-2xl border border-border/60 bg-card/80 backdrop-blur-sm shadow-2xl">

        {/* Header */}
        <div className="border-b border-border/50 px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <span className="text-lg font-bold tracking-tight">aniBet</span>
            <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-medium text-primary">BETA</span>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            {tab === "login" ? "Content de te revoir 👋" : "Rejoins la communauté 🎌"}
          </p>
        </div>

        <div className="p-6">
          {/* Google button */}
          <button
            type="button"
            onClick={handleGoogleLogin}
            disabled={loading}
            className="flex h-10 w-full items-center justify-center gap-2.5 rounded-xl border border-border/70 bg-background/50 text-sm font-medium transition hover:bg-muted disabled:opacity-60"
          >
            <GoogleIcon />
            Continuer avec Google
          </button>

          {/* Discord button */}
          <button
            type="button"
            onClick={handleDiscordLogin}
            disabled={loading}
            className="mt-2 flex h-10 w-full items-center justify-center gap-2.5 rounded-xl border border-border/70 bg-background/50 text-sm font-medium transition hover:bg-muted disabled:opacity-60"
          >
            <DiscordIcon />
            Continuer avec Discord
          </button>

          {/* Divider */}
          <div className="my-5 flex items-center gap-3">
            <div className="h-px flex-1 bg-border/50" />
            <span className="text-[11px] text-muted-foreground">ou</span>
            <div className="h-px flex-1 bg-border/50" />
          </div>

          {/* Tabs */}
          <div className="mb-5 flex rounded-xl bg-muted/60 p-0.5">
            {(["login", "signup"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => switchTab(t)}
                className={`flex-1 rounded-[10px] py-1.5 text-xs font-medium transition-all ${
                  tab === t
                    ? "bg-background text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t === "login" ? "Connexion" : "Inscription"}
              </button>
            ))}
          </div>

          {/* Login form */}
          {tab === "login" && (
            <form onSubmit={handleLogin} className="fade-in space-y-3">
              <div>
                <label className="mb-1.5 block text-[11px] text-muted-foreground">Username</label>
                <input
                  className="h-10 w-full rounded-xl border border-border/70 bg-background/40 px-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  autoComplete="username"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] text-muted-foreground">Mot de passe</label>
                <input
                  type="password"
                  className="h-10 w-full rounded-xl border border-border/70 bg-background/40 px-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  disabled={loading}
                />
              </div>
              {error && <ErrorBox msg={error} />}
              <button
                type="submit"
                disabled={loading}
                className="mt-1 h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "…" : "Se connecter"}
              </button>
            </form>
          )}

          {/* Signup form */}
          {tab === "signup" && (
            <form onSubmit={handleSignup} className="fade-in space-y-3">
              <div>
                <label className="mb-1.5 block text-[11px] text-muted-foreground">Email</label>
                <input
                  type="email"
                  className="h-10 w-full rounded-xl border border-border/70 bg-background/40 px-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  value={signupEmail}
                  onChange={(e) => setSignupEmail(e.target.value)}
                  autoComplete="email"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] text-muted-foreground">Username</label>
                <input
                  className="h-10 w-full rounded-xl border border-border/70 bg-background/40 px-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  value={signupUsername}
                  onChange={(e) => setSignupUsername(e.target.value)}
                  autoComplete="username"
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="mb-1.5 block text-[11px] text-muted-foreground">Mot de passe</label>
                <input
                  type="password"
                  className="h-10 w-full rounded-xl border border-border/70 bg-background/40 px-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                  value={signupPassword}
                  onChange={(e) => setSignupPassword(e.target.value)}
                  autoComplete="new-password"
                  required
                  disabled={loading}
                />
              </div>

              {/* Notice */}
              <div className="flex items-start gap-2 rounded-xl border border-primary/20 bg-primary/5 p-3">
                <span className="mt-0.5 text-xs">🎌</span>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  Ton compte est actif immédiatement après l'inscription — pas d'email à confirmer.
                </p>
              </div>

              {error && <ErrorBox msg={error} />}
              {success && (
                <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-[11px] text-emerald-400">
                  {success}
                </div>
              )}
              <button
                type="submit"
                disabled={loading}
                className="mt-1 h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "…" : "Créer mon compte"}
              </button>
            </form>
          )}
        </div>
      </div>

      <p className="mt-4 text-[11px] text-muted-foreground/60">
        En continuant, tu acceptes nos conditions d'utilisation.
      </p>
    </main>
  )
}

function ErrorBox({ msg }: { msg: string }) {
  return (
    <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-[11px] text-red-400">
      {msg}
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginContent />
    </Suspense>
  )
}