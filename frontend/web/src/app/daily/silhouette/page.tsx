"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { SiteHeader } from "@/components/ui/layout/SiteHeader"

type Challenge = {
  id: number
  challenge_date: string
  type: string
  content: { image_url: string; hints: string[] }
}

type Attempt = {
  guesses: string[]
  result: "solved" | "failed" | null
} | null

const MAX_GUESSES = 3
// Flou en pixels selon le nombre d'essais déjà faits : fort au départ,
// quasi nul juste avant la conclusion.
const BLUR_STEPS = [24, 14, 6]

export default function SilhouettePage() {
  const router = useRouter()
  const [token, setToken] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [challenge, setChallenge] = React.useState<Challenge | null>(null)
  const [attempt, setAttempt] = React.useState<Attempt>(null)
  const [revealedAnswer, setRevealedAnswer] = React.useState<{ character_name: string; series: string } | null>(null)
  const [guess, setGuess] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const [lastGuessWrong, setLastGuessWrong] = React.useState(false)

  const API = process.env.NEXT_PUBLIC_API_URL ?? ""

  async function load(t: string) {
    const res = await fetch(`${API}/daily-challenges/today`, { headers: { Authorization: `Bearer ${t}` } })
    if (res.status === 404) { setChallenge(null); return }
    const data = await res.json()
    setChallenge(data.challenge)
    setAttempt(data.attempt)
    setRevealedAnswer(data.revealed_answer)
  }

  React.useEffect(() => {
    const t = localStorage.getItem("access_token")
    if (!t) { router.replace("/login"); return }
    setToken(t)
    load(t).finally(() => setLoading(false))
  }, [])

  const guessesUsed = attempt?.guesses.length ?? 0
  const concluded = attempt?.result != null
  const blurPx = concluded ? 0 : (BLUR_STEPS[guessesUsed] ?? 0)

  async function submitGuess(e: React.FormEvent) {
    e.preventDefault()
    if (!guess.trim() || submitting) return

    setSubmitting(true)
    setError(null)
    setLastGuessWrong(false)
    try {
      const res = await fetch(`${API}/daily-challenges/today/silhouette/guess`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ guess: guess.trim() }),
      })
      if (!res.ok) throw new Error((await res.json())?.detail ?? "Something went wrong")
      const data = await res.json()

      if (!data.guess_correct) setLastGuessWrong(true)
      setGuess("")
      await load(token)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Something went wrong")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )

  if (!challenge || challenge.type !== "silhouette") {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center px-4 text-center">
          <p className="text-sm text-muted-foreground">No silhouette challenge today.</p>
          <Link href="/" className="mt-3 text-sm text-primary hover:underline">← Back home</Link>
        </main>
      </>
    )
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-md px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Guess the character</h1>
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Back</Link>
        </div>

        <div className="overflow-hidden rounded-2xl border border-border/60 bg-card/60">
          <div className="relative aspect-square w-full overflow-hidden bg-background/40">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={challenge.content.image_url}
              alt=""
              className="h-full w-full object-cover transition-[filter] duration-500"
              style={{ filter: `blur(${blurPx}px)`, transform: "scale(1.1)" }}
            />
          </div>

          <div className="p-5">
            {!concluded ? (
              <>
                <div className="mb-3 flex items-center justify-between text-xs text-muted-foreground">
                  <span>Guess {guessesUsed + 1} of {MAX_GUESSES}</span>
                  <div className="flex gap-1">
                    {Array.from({ length: MAX_GUESSES }).map((_, i) => (
                      <span key={i} className={`h-1.5 w-5 rounded-full ${i < guessesUsed ? "bg-red-500/60" : "bg-border"}`} />
                    ))}
                  </div>
                </div>

                {lastGuessWrong && (
                  <p className="mb-2 text-xs text-red-400">Not quite</p>
                )}

                <form onSubmit={submitGuess} className="flex gap-2">
                  <input
                    className="h-10 flex-1 rounded-xl border border-border/70 bg-background/40 px-3 text-sm outline-none transition focus:border-primary/50"
                    value={guess}
                    onChange={(e) => setGuess(e.target.value)}
                    placeholder="Character name…"
                    disabled={submitting}
                    autoFocus
                  />
                  <button
                    type="submit"
                    disabled={submitting || !guess.trim()}
                    className="rounded-xl bg-primary px-4 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting ? "…" : "Guess"}
                  </button>
                </form>
                {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
              </>
            ) : (
              <div className="text-center">
                {attempt?.result === "solved" ? (
                  <p className="text-lg font-semibold text-emerald-400">✓ Solved!</p>
                ) : (
                  <p className="text-lg font-semibold text-red-400">✕ Out of guesses</p>
                )}
                {revealedAnswer && (
                  <p className="mt-1 text-sm text-muted-foreground">
                    It was <span className="font-semibold text-foreground">{revealedAnswer.character_name}</span>
                    {revealedAnswer.series && <> — {revealedAnswer.series}</>}
                  </p>
                )}
                <Link href="/" className="mt-4 inline-block text-sm text-primary hover:underline">
                  Back home
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  )
}