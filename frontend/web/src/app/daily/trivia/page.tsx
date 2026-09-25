"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { SiteHeader } from "@/components/ui/layout/SiteHeader"

type Question = {
  question: string
  options: string[]
  difficulty_weight: number
  series: string
}

type Challenge = {
  id: number
  challenge_date: string
  type: string
  content: { questions: Question[] }
}

type Attempt = {
  guesses: number[]
  score: number | null
  result: "solved" | "failed" | null
} | null

export default function TriviaPage() {
  const router = useRouter()
  const [token, setToken] = React.useState("")
  const [loading, setLoading] = React.useState(true)
  const [challenge, setChallenge] = React.useState<Challenge | null>(null)
  const [attempt, setAttempt] = React.useState<Attempt>(null)
  const [revealedAnswer, setRevealedAnswer] = React.useState<{ correct_indices: number[] } | null>(null)
  const [answers, setAnswers] = React.useState<(number | null)[]>([])
  const [submitting, setSubmitting] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)

  const API = process.env.NEXT_PUBLIC_API_URL ?? ""

  async function load(t: string) {
    const res = await fetch(`${API}/daily-challenges/today`, { headers: { Authorization: `Bearer ${t}` } })
    if (res.status === 404) { setChallenge(null); return }
    const data = await res.json()
    setChallenge(data.challenge)
    setAttempt(data.attempt)
    setRevealedAnswer(data.revealed_answer)
    if (data.challenge?.type === "trivia") {
      setAnswers(Array(data.challenge.content.questions.length).fill(null))
    }
  }

  React.useEffect(() => {
    const t = localStorage.getItem("access_token")
    if (!t) { router.replace("/login"); return }
    setToken(t)
    load(t).finally(() => setLoading(false))
  }, [])

  async function submit() {
    if (answers.some((a) => a === null) || submitting) return

    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch(`${API}/daily-challenges/today/trivia`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ answers }),
      })
      if (!res.ok) throw new Error((await res.json())?.detail ?? "Something went wrong")
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

  if (!challenge || challenge.type !== "trivia") {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center px-4 text-center">
          <p className="text-sm text-muted-foreground">No trivia challenge today.</p>
          <Link href="/" className="mt-3 text-sm text-primary hover:underline">← Back home</Link>
        </main>
      </>
    )
  }

  const concluded = attempt != null
  const questions = challenge.content.questions

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">Daily Trivia</h1>
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Back</Link>
        </div>

        {concluded && (
          <div className={`mb-5 rounded-2xl border p-4 text-center ${
            attempt!.result === "solved" ? "border-emerald-500/30 bg-emerald-500/10" : "border-red-500/30 bg-red-500/10"
          }`}>
            <p className={`text-lg font-semibold ${attempt!.result === "solved" ? "text-emerald-400" : "text-red-400"}`}>
              {attempt!.result === "solved" ? "✓ Solved!" : "✕ Not quite"}
            </p>
            <p className="mt-0.5 text-sm text-muted-foreground">Score: {attempt!.score}</p>
          </div>
        )}

        <div className="space-y-4">
          {questions.map((q, qi) => {
            const correctIndex = revealedAnswer?.correct_indices[qi]
            const userAnswer = concluded ? attempt!.guesses[qi] : answers[qi]

            return (
              <div key={qi} className="rounded-2xl border border-border/60 bg-card/60 p-4">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-sm font-medium">{q.question}</p>
                  <span className="rounded-full border border-border/50 px-2 py-0.5 text-[10px] text-muted-foreground shrink-0 ml-2">
                    {q.series} · +{q.difficulty_weight}
                  </span>
                </div>
                <div className="space-y-1.5">
                  {q.options.map((o, oi) => {
                    let style = "border-border/60 hover:border-primary/40"
                    if (concluded) {
                      if (oi === correctIndex) style = "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                      else if (oi === userAnswer) style = "border-red-500/50 bg-red-500/10 text-red-400"
                      else style = "border-border/40 opacity-50"
                    } else if (userAnswer === oi) {
                      style = "border-primary bg-primary/10 text-primary"
                    }
                    return (
                      <button
                        key={oi}
                        type="button"
                        disabled={concluded}
                        onClick={() => setAnswers(answers.map((a, idx) => idx === qi ? oi : a))}
                        className={`block w-full rounded-xl border px-3 py-2 text-left text-sm transition ${style}`}
                      >
                        {o}
                      </button>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>

        {!concluded && (
          <button
            onClick={submit}
            disabled={submitting || answers.some((a) => a === null)}
            className="mt-5 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {submitting ? "Submitting…" : "Submit answers"}
          </button>
        )}
        {error && <p className="mt-2 text-xs text-red-400">{error}</p>}

        {concluded && (
          <Link href="/" className="mt-5 block text-center text-sm text-primary hover:underline">
            Back home
          </Link>
        )}
      </main>
    </>
  )
}