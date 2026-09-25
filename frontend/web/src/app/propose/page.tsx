"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { SiteHeader } from "@/components/ui/layout/SiteHeader"
import { Input, Textarea, Select, Toast } from "@/components/ui/form"

type Series = { id: number; name: string; slug: string }

export default function ProposeEventPage() {
  const router = useRouter()
  const [series, setSeries] = React.useState<Series[]>([])
  const [authLoading, setAuthLoading] = React.useState(true)
  const [token, setToken] = React.useState("")

  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [seriesId, setSeriesId] = React.useState("")
  const [sourceUrl, setSourceUrl] = React.useState("")
  const [outcomes, setOutcomes] = React.useState(["", ""])
  const [mode, setMode] = React.useState<"event" | "series">("event")
  const [seriesName, setSeriesName] = React.useState("")
  const [loading, setLoading] = React.useState(false)
  const [toast, setToast] = React.useState<{ msg: string; type: "success" | "error" } | null>(null)

  const API = process.env.NEXT_PUBLIC_API_URL ?? ""

  React.useEffect(() => {
    const t = localStorage.getItem("access_token")
    if (!t) { router.replace("/login"); return }
    setToken(t)
    fetch(`${API}/series/`)
      .then((r) => r.json())
      .then((s) => setSeries(Array.isArray(s) ? s : []))
      .finally(() => setAuthLoading(false))
  }, [])

  function addOutcome() { setOutcomes([...outcomes, ""]) }
  function removeOutcome(i: number) { setOutcomes(outcomes.filter((_, idx) => idx !== i)) }
  function setOutcome(i: number, val: string) { setOutcomes(outcomes.map((o, idx) => idx === i ? val : o)) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const validOutcomes = outcomes.map((o) => o.trim()).filter(Boolean)
    if (validOutcomes.length < 2) {
      setToast({ msg: "At least 2 outcomes are required", type: "error" })
      return
    }
    if (!seriesId) {
      setToast({ msg: "Please select a series", type: "error" })
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API}/events/propose`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          description: description || null,
          series_id: Number(seriesId),
          outcomes: validOutcomes,
          source_url: sourceUrl.trim() || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json())?.detail ?? "Something went wrong")

      setTitle(""); setDescription(""); setSeriesId(""); setSourceUrl(""); setOutcomes(["", ""])
      setToast({ msg: "Proposal submitted — a mod will review it soon", type: "success" })
    } catch (err: unknown) {
      setToast({ msg: err instanceof Error ? err.message : "Something went wrong", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  async function submitSeries(e: React.FormEvent) {
    e.preventDefault()
    if (!seriesName.trim()) {
      setToast({ msg: "Please enter a series name", type: "error" })
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`${API}/proposals/series`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          name: seriesName.trim(),
          description: description || null,
          source_url: sourceUrl.trim() || null,
        }),
      })
      if (!res.ok) throw new Error((await res.json())?.detail ?? "Something went wrong")

      setSeriesName(""); setDescription(""); setSourceUrl("")
      setToast({ msg: "Series proposal submitted — an admin will review it", type: "success" })
    } catch (err: unknown) {
      setToast({ msg: err instanceof Error ? err.message : "Something went wrong", type: "error" })
    } finally {
      setLoading(false)
    }
  }

  if (authLoading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-4 py-8">
               <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Propose</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              {mode === "event"
                ? "Suggest a market for an existing series — a mod for that series reviews it before it goes live."
                : "Suggest a new series for the platform — an admin reviews every new series."}
            </p>
          </div>
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Back</Link>
        </div>

        <div className="mb-4 inline-flex rounded-2xl border border-border/50 bg-muted/30 p-1">
          {(["event", "series"] as const).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              disabled={loading}
              className={`rounded-xl px-4 py-1.5 text-[13px] font-medium transition ${
                mode === m
                  ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {m === "event" ? "An event" : "A new series"}
            </button>
          ))}
        </div>

        <form onSubmit={mode === "event" ? submit : submitSeries} className="space-y-4 rounded-2xl border border-border/60 bg-card/60 p-6">
          {mode === "event" ? (
            <>
              <Input
                label="Title *"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                disabled={loading}
                placeholder="e.g. Will Luffy beat Kizaru?"
              />
              <Textarea
                label="Description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                placeholder="Extra context for the mod reviewing this…"
              />
              <Select label="Series *" value={seriesId} onChange={(e) => setSeriesId(e.target.value)} disabled={loading} required>
                <option value="">— Choose a series —</option>
                {series.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
              <p className="-mt-2 text-[11px] text-muted-foreground/70">
                Series not listed?{" "}
                <button type="button" onClick={() => setMode("series")} className="text-primary hover:underline">
                  Propose it first
                </button>
              </p>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-[11px] font-medium text-muted-foreground">Outcomes *</label>
                  <button type="button" onClick={addOutcome} className="text-[11px] text-primary hover:underline">+ Add</button>
                </div>
                <div className="space-y-2">
                  {outcomes.map((o, i) => (
                    <div key={i} className="flex gap-2">
                      <input
                        className="h-10 flex-1 rounded-xl border border-border/70 bg-background/40 px-3 text-sm outline-none transition focus:border-primary/50"
                        value={o}
                        onChange={(e) => setOutcome(i, e.target.value)}
                        placeholder={`Outcome ${i + 1}`}
                        disabled={loading}
                      />
                      {outcomes.length > 2 && (
                        <button type="button" onClick={() => removeOutcome(i)} disabled={loading}
                          className="rounded-xl border border-border/60 px-3 text-sm text-muted-foreground hover:text-red-400 hover:border-red-500/40 transition">
                          ✕
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <>
              <Input
                label="Series name *"
                value={seriesName}
                onChange={(e) => setSeriesName(e.target.value)}
                required
                disabled={loading}
                placeholder="e.g. Chainsaw Man"
              />
              <Textarea
                label="Why should it be added?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={loading}
                placeholder="Currently airing? Ongoing manga? Big community?"
              />
            </>
          )}

          <div>
            <Input
              label="Source link (optional)"
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              disabled={loading}
              placeholder={mode === "event"
                ? "https:// — a chapter, an official tweet, anything checkable"
                : "https:// — MyAnimeList, AniList, official site…"}
            />
            <p className="mt-1 text-[11px] text-muted-foreground/70">
              Not required, but a link makes the review much faster.
            </p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
          >
            {loading ? "Submitting…" : mode === "event" ? "Submit event proposal" : "Submit series proposal"}
          </button>
        </form> 
      </main>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}