"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { SiteHeader } from "@/components/ui/layout/SiteHeader"
import { Toast } from "@/components/ui/form"

type Proposal = {
  id: number
  proposed_by: number
  title: string
  description: string | null
  series_id: number
  outcomes: string[]
  source_url: string | null
  status: string
  created_at: string
}

export default function ModProposalsPage() {
  const router = useRouter()
  const [proposals, setProposals] = React.useState<Proposal[]>([])
  const [loading, setLoading] = React.useState(true)
  const [actingOn, setActingOn] = React.useState<number | null>(null)
  const [token, setToken] = React.useState("")
  const [toast, setToast] = React.useState<{ msg: string; type: "success" | "error" } | null>(null)

  const API = process.env.NEXT_PUBLIC_API_URL ?? ""

  async function loadProposals(t: string) {
    const res = await fetch(`${API}/events/proposals/pending`, {
      headers: { Authorization: `Bearer ${t}` },
    })
    const data = await res.json().catch(() => [])
    setProposals(Array.isArray(data) ? data : [])
  }

  React.useEffect(() => {
    const t = localStorage.getItem("access_token")
    if (!t) { router.replace("/login"); return }
    setToken(t)
    loadProposals(t).finally(() => setLoading(false))
  }, [])

  async function approve(id: number) {
    setActingOn(id)
    try {
      const res = await fetch(`${API}/events/proposals/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ fee_bps: 200 }),
      })
      if (!res.ok) throw new Error((await res.json())?.detail ?? "Failed to approve")
      setToast({ msg: "Proposal approved — the event is now live", type: "success" })
      await loadProposals(token)
    } catch (err: unknown) {
      setToast({ msg: err instanceof Error ? err.message : "Failed to approve", type: "error" })
    } finally {
      setActingOn(null)
    }
  }

  async function reject(id: number) {
    setActingOn(id)
    try {
      const res = await fetch(`${API}/events/proposals/${id}/reject`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) throw new Error((await res.json())?.detail ?? "Failed to reject")
      setToast({ msg: "Proposal rejected", type: "success" })
      await loadProposals(token)
    } catch (err: unknown) {
      setToast({ msg: err instanceof Error ? err.message : "Failed to reject", type: "error" })
    } finally {
      setActingOn(null)
    }
  }

  if (loading) return (
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
            <h1 className="text-2xl font-bold tracking-tight">Pending proposals</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Scoped to the series you moderate.
            </p>
          </div>
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Back</Link>
        </div>

        {proposals.length === 0 ? (
          <div className="rounded-2xl border border-border/60 bg-card/40 p-8 text-center text-sm text-muted-foreground">
            No pending proposals right now.
          </div>
        ) : (
          <div className="space-y-3">
            {proposals.map((p) => (
              <div key={p.id} className="rounded-2xl border border-border/60 bg-card/60 p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-medium">{p.title}</h3>
                    {p.description && (
                      <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
                    )}
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {p.outcomes.map((o, i) => (
                        <span key={i} className="rounded-full border border-border/50 px-2 py-0.5 text-[11px] text-muted-foreground">
                          {o}
                        </span>
                      ))}
                    </div>
                    {p.source_url ? (
                      <a
                        href={p.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-2 inline-block text-[11px] text-primary hover:underline truncate max-w-full"
                      >
                        {p.source_url}
                      </a>
                    ) : (
                      <p className="mt-2 text-[11px] text-muted-foreground/50 italic">No source link provided</p>
                    )}
                  </div>
                </div>

                <div className="mt-4 flex gap-2">
                  <button
                    onClick={() => approve(p.id)}
                    disabled={actingOn === p.id}
                    className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 transition"
                  >
                    {actingOn === p.id ? "…" : "✓ Approve"}
                  </button>
                  <button
                    onClick={() => reject(p.id)}
                    disabled={actingOn === p.id}
                    className="rounded-xl border border-border/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-red-400 hover:border-red-500/40 transition disabled:opacity-50"
                  >
                    ✕ Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}