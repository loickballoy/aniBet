"use client"

import * as React from "react"
import Link from "next/link"

type Resolution = {
  evidence_url: string
  resolved_at: string
  resolved_by_username: string
  winning_outcome: string
  has_open_dispute: boolean
  dispute_window_ends_at: string
} | null

function formatLeft(ms: number) {
  const h = Math.floor(ms / 3_600_000)
  const m = Math.floor((ms % 3_600_000) / 60_000)
  return h > 0 ? `${h}h ${m}m` : `${m}m`
}

export default function ResolutionBox({ eventId, status }: { eventId: number; status: string }) {
  const API = process.env.NEXT_PUBLIC_API_URL ?? ""
  const [resolution, setResolution] = React.useState<Resolution>(null)
  const [loaded, setLoaded] = React.useState(false)
  const [now, setNow] = React.useState(() => Date.now())
  const [formOpen, setFormOpen] = React.useState(false)
  const [url, setUrl] = React.useState("")
  const [submitting, setSubmitting] = React.useState(false)
  const [msg, setMsg] = React.useState<{ text: string; ok: boolean } | null>(null)
  const [disputed, setDisputed] = React.useState(status === "disputed")

  React.useEffect(() => {
    fetch(`${API}/events/${eventId}/resolution`)
      .then((r) => (r.ok ? r.json() : null))
      .then(setResolution)
      .finally(() => setLoaded(true))
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [eventId])

  async function submitDispute(e: React.FormEvent) {
    e.preventDefault()
    const token = localStorage.getItem("access_token")
    if (!token) { setMsg({ text: "Log in to dispute a result.", ok: false }); return }
    if (!url.trim()) return
    setSubmitting(true)
    setMsg(null)
    try {
      const res = await fetch(`${API}/events/${eventId}/dispute`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ counter_evidence_url: url.trim() }),
      })
      if (!res.ok) throw new Error((await res.json())?.detail ?? "Could not submit the dispute")
      setDisputed(true)
      setFormOpen(false)
      setMsg({ text: "Dispute submitted — an admin will review both sources.", ok: true })
    } catch (err: unknown) {
      setMsg({ text: err instanceof Error ? err.message : "Could not submit the dispute", ok: false })
    } finally {
      setSubmitting(false)
    }
  }

  const windowLeft = resolution ? new Date(resolution.dispute_window_ends_at).getTime() - now : 0
  const windowOpen = status === "resolved_pending_dispute" && !disputed && windowLeft > 0

  let title = "Betting closed"
  let subtitle = "Waiting for the result."
  if (status === "cancelled") { title = "Event cancelled"; subtitle = "Stakes are refunded." }
  else if (status === "resolved") { title = "Final result"; subtitle = "Payouts are done." }
  else if (disputed) { title = "Result under review"; subtitle = "An admin is checking a dispute. Payouts are on hold." }
  else if (status === "resolved_pending_dispute") {
    title = "Result announced"
    subtitle = windowOpen ? `Payouts in ${formatLeft(windowLeft)}, unless someone disputes it.` : "Dispute window closed — payouts coming soon."
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-primary/20 bg-card/50 backdrop-blur-sm shadow-lg shadow-primary/5">
      <div className="border-b border-border/40 bg-primary/5 px-5 py-3.5">
        <span className="text-sm font-semibold">{title}</span>
        <p className="mt-0.5 text-[11px] text-muted-foreground">{subtitle}</p>
      </div>

      <div className="space-y-4 p-5">
        {!loaded ? (
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        ) : resolution ? (
          <>
            <div>
              <p className="text-[11px] text-muted-foreground">Winning outcome</p>
              <p className="mt-0.5 text-lg font-bold text-primary">{resolution.winning_outcome}</p>
            </div>
            <div className="rounded-xl border border-border/50 bg-background/30 p-3 text-[11px]">
              <p className="text-muted-foreground">
                Resolved by <span className="text-foreground">{resolution.resolved_by_username}</span> — source:
              </p>
              <a href={resolution.evidence_url} target="_blank" rel="noopener noreferrer" className="mt-1 block truncate text-primary hover:underline">
                {resolution.evidence_url}
              </a>
            </div>

            {windowOpen && !formOpen && (
              <button
                onClick={() => setFormOpen(true)}
                className="w-full rounded-xl border border-red-500/30 bg-red-500/5 px-4 py-2 text-sm text-red-400 transition hover:bg-red-500/10"
              >
                Think this is wrong? Dispute it
              </button>
            )}

            {formOpen && (
              <form onSubmit={submitDispute} className="space-y-2">
                <label className="block text-[11px] font-medium text-muted-foreground">
                  Link to a source showing a different result *
                </label>
                <input
                  className="h-10 w-full rounded-xl border border-border/70 bg-background/40 px-3 text-sm outline-none transition focus:border-primary/50"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://…"
                  disabled={submitting}
                  autoFocus
                />
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={submitting || !url.trim()}
                    className="flex-1 rounded-xl bg-red-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-red-600 disabled:opacity-50"
                  >
                    {submitting ? "Submitting…" : "Submit dispute"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormOpen(false)}
                    className="rounded-xl border border-border/60 px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground">No result yet.</p>
        )}

        {msg && <p className={`text-xs ${msg.ok ? "text-emerald-400" : "text-red-400"}`}>{msg.text}</p>}

        <Link href="/profile" className="block text-center text-[11px] text-muted-foreground hover:text-foreground">
          See your bets →
        </Link>
      </div>
    </div>
  )
}