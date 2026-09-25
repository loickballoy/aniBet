"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { SiteHeader } from "@/components/ui/layout/SiteHeader"
import { EditableImage } from "@/components/ui/EditableImage"

// ── Types ─────────────────────────────────────────────────────────────────────
type User = { username: string; role: string }
type Series = { id: number; name: string; slug: string; cover_url: string | null }
type Event = {
  id: number
  title: string
  status: string
  pool_total: number
  series_id: number | null
  outcomes: { id: number; outcome: string; pool_points: number; is_winner: boolean }[]
}
type Tab = "create-event" | "manage-events" | "create-series" | "create-bingo" | "manage-series" | "manage-mods" | "daily-puzzles" | "handle-daily-weekly" | "manage-bingo"

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, string> = {
  open:                     "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  locked:                   "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  resolved_pending_dispute: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  disputed:                 "bg-red-500/15 text-red-400 border-red-500/30",
  resolved:                 "bg-blue-500/15 text-blue-400 border-blue-500/30",
  cancelled:                "bg-red-500/15 text-red-400 border-red-500/30",
}

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  locked: "Locked",
  resolved_pending_dispute: "Resolved (Dispute Window)",
  disputed: "Contested",
  resolved: "Paid",
  cancelled: "Cancelled",
}

function Badge({ status }: { status: string }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[status] ?? "bg-muted text-muted-foreground"}`}>
      {STATUS_LABEL[status] ?? status}
    </span>
  )
}

function Input({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">{label}</label>
      <input className="h-10 w-full rounded-xl border border-border/70 bg-background/40 px-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 disabled:opacity-50" {...props} />
    </div>
  )
}

function Textarea({ label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">{label}</label>
      <textarea className="w-full rounded-xl border border-border/70 bg-background/40 px-3 py-2 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 disabled:opacity-50" rows={3} {...props} />
    </div>
  )
}

function Select({ label, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">{label}</label>
      <select className="h-10 w-full rounded-xl border border-border/70 bg-background/40 px-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20" {...props}>
        {children}
      </select>
    </div>
  )
}

function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  React.useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [])
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-xl backdrop-blur ${
      type === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-red-500/30 bg-red-500/10 text-red-400"
    }`}>
      <span>{type === "success" ? "✓" : "✕"}</span>
      {msg}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">×</button>
    </div>
  )
}

// ── Create Event Form ─────────────────────────────────────────────────────────
function CreateEventForm({ series, token, API, onSuccess }: { series: Series[]; token: string; API: string; onSuccess: () => void }) {
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [seriesId, setSeriesId] = React.useState("")
  const [locksAt, setLocksAt] = React.useState("")
  const [feeBps, setFeeBps] = React.useState("200")
  const [coverUrl, setCoverUrl] = React.useState("")
  const [outcomes, setOutcomes] = React.useState(["", ""])
  const [loading, setLoading] = React.useState(false)

  function addOutcome() { setOutcomes([...outcomes, ""]) }
  function removeOutcome(i: number) { setOutcomes(outcomes.filter((_, idx) => idx !== i)) }
  function setOutcome(i: number, val: string) { setOutcomes(outcomes.map((o, idx) => idx === i ? val : o)) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const validOutcomes = outcomes.map((o) => o.trim()).filter(Boolean)
    if (validOutcomes.length < 2) return alert("At least 2 outcomes needed")
    setLoading(true)
    try {
      const res = await fetch(`${API}/events/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title, description: description || null,
          series_id: seriesId ? Number(seriesId) : null,
          locks_at: locksAt || null,
          fee_bps: Number(feeBps),
          cover_url: coverUrl || null,
          outcomes: validOutcomes,
          tag_ids: [],
        }),
      })
      if (!res.ok) throw new Error((await res.json())?.detail ?? "Erreur")
      setTitle(""); setDescription(""); setSeriesId(""); setLocksAt(""); setFeeBps("200"); setCoverUrl(""); setOutcomes(["", ""])
      onSuccess()
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input label="Title *" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={loading} placeholder="Ex: Will luffy beat Kizaru ?" />
        </div>
        <div className="sm:col-span-2">
          <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={loading} placeholder="event context, rules, etc…" />
        </div>
        <Select label="Serie" value={seriesId} onChange={(e) => setSeriesId(e.target.value)} disabled={loading}>
          <option value="">— None —</option>
          {series.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Input label="Lock at (optionnal)" type="datetime-local" value={locksAt} onChange={(e) => setLocksAt(e.target.value)} disabled={loading} />
        <Input label="Fees (basis points)" type="number" value={feeBps} onChange={(e) => setFeeBps(e.target.value)} min={0} max={1000} disabled={loading} />
      </div>
        <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
          Event cover (optional)
        </label>
        <EditableImage
          kind="event"
          shape="cover"
          currentUrl={coverUrl}
          editable={!loading}
          token={token}
          API={API}
          onUploaded={setCoverUrl}
          className="h-36 w-full border-2 border-dashed border-border/50 bg-background/30"
        />
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-[11px] font-medium text-muted-foreground">Outcomes *</label>
          <button type="button" onClick={addOutcome} className="text-[11px] text-primary hover:underline">+ Add</button>
        </div>
        <div className="space-y-2">
          {outcomes.map((o, i) => (
            <div key={i} className="flex gap-2">
              <input className="h-10 flex-1 rounded-xl border border-border/70 bg-background/40 px-3 text-sm outline-none transition focus:border-primary/50" value={o} onChange={(e) => setOutcome(i, e.target.value)} placeholder={`Outcome ${i + 1}`} disabled={loading} />
              {outcomes.length > 2 && <button type="button" onClick={() => removeOutcome(i)} className="rounded-xl border border-border/70 px-3 text-xs text-muted-foreground hover:text-red-400">✕</button>}
            </div>
          ))}
        </div>
      </div>
      <button type="submit" disabled={loading || !title} className="h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
        {loading ? "Creation…" : "Create Event"}
      </button>
    </form>
  )
}

// ── Create Series Form ────────────────────────────────────────────────────────
function CreateSeriesForm({ token, API, onSuccess }: { token: string; API: string; onSuccess: () => void }) {
  const [name, setName] = React.useState("")
  const [slug, setSlug] = React.useState("")
  const [coverUrl, setCoverUrl] = React.useState("")
  const [loading, setLoading] = React.useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch(`${API}/series/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name, slug, cover_url: coverUrl || null }),
      })
      if (!res.ok) throw new Error((await res.json())?.detail ?? "Erreur")
      setName(""); setSlug(""); setCoverUrl("")
      onSuccess()
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input label="Name *" value={name} onChange={(e) => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")) }} required disabled={loading} placeholder="One Piece" />
      <Input label="Slug *" value={slug} onChange={(e) => setSlug(e.target.value)} required disabled={loading} placeholder="one-piece" />
      <div>
        <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
          Series cover
        </label>
        <EditableImage
          kind="series"
          shape="cover"
          currentUrl={coverUrl}
          editable={!loading}
          token={token}
          API={API}
          onUploaded={setCoverUrl}
          className="h-36 w-full border-2 border-dashed border-border/50 bg-background/30"
        />
      </div>
      <button type="submit" disabled={loading || !name || !slug} className="h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
        {loading ? "Creation…" : "Create Series"}
      </button>
    </form>
  )
}

// ── Manage Series ─────────────────────────────────────────────────────────────
function ManageSeries({ series, token, API, onRefresh, notify }: { series: Series[]; token: string; API: string; onRefresh: () => void; notify: (msg: string, type?: "success" | "error") => void }) {
  const [editing, setEditing] = React.useState<number | null>(null)
  const [coverUrls, setCoverUrls] = React.useState<Record<number, string>>({})
  const [saving, setSaving] = React.useState<number | null>(null)

  async function saveCover(id: number) {
    const url = coverUrls[id]
    if (!url) return
    setSaving(id)
    try {
      const res = await fetch(`${API}/series/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cover_url: url }),
      })
      if (!res.ok) throw new Error((await res.json())?.detail ?? "Erreur")
      setEditing(null)
      onRefresh()
      notify("Cover mise à jour ✓")
    } catch (e: any) {
      notify(e.message ?? "Erreur", "error")
    } finally { setSaving(null) }
  }

  async function deleteSeries(id: number, name: string) {
    if (!confirm(`Supprimer la série "${name}" ?`)) return
    const res = await fetch(`${API}/series/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) { onRefresh(); notify("Série supprimée") }
    else notify("Erreur suppression", "error")
  }

  return (
    <div className="space-y-3">
      {series.length === 0 && <p className="text-sm text-muted-foreground">No Series</p>}
      {series.map((s) => (
        <div key={s.id} className="rounded-2xl border border-border/60 bg-background/30 p-4">
          <div className="flex items-start gap-4">
            {/* Cover thumbnail */}
            <div className="relative h-20 w-14 shrink-0 overflow-hidden rounded-lg border border-border/50 bg-muted/30">
              {s.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.cover_url} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full items-center justify-center text-[10px] font-bold text-muted-foreground/40">
                  {s.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{s.name}</span>
                <span className="text-[11px] text-muted-foreground">/{s.slug}</span>
              </div>
              {editing === s.id ? (
                <div className="mt-3 space-y-3">
                  <EditableImage
                    kind="series"
                    shape="cover"
                    currentUrl={coverUrls[s.id] ?? s.cover_url}
                    editable={saving !== s.id}
                    token={token}
                    API={API}
                    onUploaded={(url) => setCoverUrls({ ...coverUrls, [s.id]: url })}
                    className="h-36 w-full border-2 border-dashed border-border/50 bg-background/30"
                  />
                  <div className="flex gap-2">
                    <button onClick={() => saveCover(s.id)} disabled={saving === s.id || !coverUrls[s.id]}
                      className="rounded-xl bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50">
                      {saving === s.id ? "…" : "Save"}
                    </button>
                    <button onClick={() => setEditing(null)} className="rounded-xl border border-border/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-2 flex gap-2">
                  <button onClick={() => setEditing(s.id)}
                    className="rounded-xl border border-border/60 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground transition">
                    🖼 {s.cover_url ? "Change Cover" : "Add Cover"}
                  </button>
                  <button onClick={() => deleteSeries(s.id, s.name)}
                    className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400 hover:bg-red-500/20 transition">
                    Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

// ── Create Bingo Form ─────────────────────────────────────────────────────────
function CreateBingoForm({ series, token, API, onSuccess }: { series: Series[]; token: string; API: string; onSuccess: () => void }) {
  const [title, setTitle] = React.useState("")
  const [seriesId, setSeriesId] = React.useState("")
  const [chapterNumber, setChapterNumber] = React.useState("")
  const [opensAt, setOpensAt] = React.useState("")
  const [closesAt, setClosesAt] = React.useState("")
  const [coverUrl, setCoverUrl] = React.useState("")
  const [items, setItems] = React.useState(["", "", ""])
  const [loading, setLoading] = React.useState(false)

  function addItem() { setItems([...items, ""]) }
  function removeItem(i: number) { if (items.length > 2) setItems(items.filter((_, idx) => idx !== i)) }
  function setItem(i: number, val: string) { setItems(items.map((it, idx) => idx === i ? val : it)) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const validItems = items.map((it) => it.trim()).filter(Boolean)
    if (validItems.length < 2) return alert("Au moins 2 items requis")
    if (!closesAt) return alert("Date de fermeture requise")
    setLoading(true)
    try {
      const res = await fetch(`${API}/bingo/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          series_id: seriesId ? Number(seriesId) : null,
          chapter_number: chapterNumber ? Number(chapterNumber) : null,
          opens_at: opensAt || new Date().toISOString(),
          closes_at: new Date(closesAt).toISOString(),
          cover_url: coverUrl || null,
          items: validItems,
        }),
      })
      if (!res.ok) throw new Error((await res.json())?.detail ?? "Erreur")
      setTitle(""); setSeriesId(""); setChapterNumber(""); setOpensAt(""); setClosesAt(""); setCoverUrl(""); setItems(["", "", ""])
      onSuccess()
    } finally { setLoading(false) }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input label="Title *" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={loading} placeholder="Ex: One Piece ch.1120 Bingo" />
        </div>
        <Select label="Series" value={seriesId} onChange={(e) => setSeriesId(e.target.value)} disabled={loading}>
          <option value="">— None —</option>
          {series.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Input label="Chapter Number" type="number" value={chapterNumber} onChange={(e) => setChapterNumber(e.target.value)} disabled={loading} placeholder="Ex: 1120" />
        <Input label="Opens_at (optionnal)" type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} disabled={loading} />
        <Input label="Closes_at *" type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} required disabled={loading} />
      </div>
        <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
          Bingo cover (optional)
        </label>
        <EditableImage
          kind="bingo"
          shape="cover"
          currentUrl={coverUrl}
          editable={!loading}
          token={token}
          API={API}
          onUploaded={setCoverUrl}
          className="h-36 w-full border-2 border-dashed border-border/50 bg-background/30"
        />
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-[11px] font-medium text-muted-foreground">Items *</label>
          <button type="button" onClick={addItem} className="text-[11px] text-primary hover:underline">+ Add</button>
        </div>
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="flex gap-2">
              <input className="h-10 flex-1 rounded-xl border border-border/70 bg-background/40 px-3 text-sm outline-none transition focus:border-primary/50" value={it} onChange={(e) => setItem(i, e.target.value)} placeholder={`Item ${i + 1} — ex: A Character dies`} disabled={loading} />
              {items.length > 2 && <button type="button" onClick={() => removeItem(i)} className="rounded-xl border border-border/70 px-3 text-xs text-muted-foreground hover:text-red-400">✕</button>}
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">Users will be allowed to choose up to 3 items in this list</p>
      </div>
      <button type="submit" disabled={loading || !title || !closesAt} className="h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
        {loading ? "Creation…" : "Create bingo"}
      </button>
    </form>
  )
}

// ── Manage Events ─────────────────────────────────────────────────────────────
function ManageEvents({ events, token, API, onRefresh }: { events: Event[]; token: string; API: string; onRefresh: () => void }) {
  const [resolving, setResolving] = React.useState<number | null>(null)
  const [winnerIds, setWinnerIds] = React.useState<Record<number, string>>({})
  const [evidenceUrls, setEvidenceUrls] = React.useState<Record<number, string>>({})
  const [carouselLoading, setCarouselLoading] = React.useState<number | null>(null)
  const [finalizing, setFinalizing] = React.useState<number | null>(null)
  const [filter, setFilter] = React.useState("all")

  const filtered = filter === "all" ? events : events.filter((e) => e.status === filter)

  async function lockEvent(id: number) {
    await fetch(`${API}/events/${id}/lock`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } })
    onRefresh()
  }

  async function resolveEvent(event: Event) {
    const winnerId = winnerIds[event.id]
    const evidenceUrl = (evidenceUrls[event.id] ?? "").trim()
    if (!winnerId) return alert("Choose Winning Outcome")
    if (!evidenceUrl) return alert("A link to proof is required")

    const res = await fetch(`${API}/events/${event.id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ winning_outcome_id: Number(winnerId), evidence_url: evidenceUrl }),
    })
    if (!res.ok) {
      const msg = await res.json().catch(() => null)
      alert(msg?.detail ?? `Erreur (${res.status})`)
      return
    }
    setResolving(null)
    onRefresh()
  }

  async function finalizePayout(event: Event) {
    if (!confirm(`Finalize payout for "${event.title}" ? This action spreads gains and cannot be cancelled`)) return
    setFinalizing(event.id)
    try {
      const res = await fetch(`${API}/events/${event.id}/finalize-payout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      })
      if (!res.ok) {
        const msg = await res.json().catch(() => null)
        alert(msg?.detail ?? `Erreur (${res.status})`)
        return
      }
      onRefresh()
    } finally {
      setFinalizing(null)
    }
  }

  async function toggleCarousel(event: Event) {
    setCarouselLoading(event.id)
    const res = await fetch(`${API}/events/${event.id}/admin-carousel`, { method: "POST", headers: { Authorization: `Bearer ${token}` } })
    if (res.status === 409) await fetch(`${API}/events/${event.id}/admin-carousel`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
    setCarouselLoading(null)
    onRefresh()
  }

  return (
    <div>
      <div className="mb-4 flex flex-wrap gap-2">
        {["all", "open", "locked", "resolved_pending_dispute", "disputed", "resolved"].map((s) => (
          <button key={s} onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${filter === s ? "border-primary bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:text-foreground"}`}>
            {s === "all" ? "All" : (STATUS_LABEL[s] ?? s)}
          </button>
        ))}
      </div>
      {filtered.length === 0 && <p className="text-sm text-muted-foreground">No Event</p>}
      <div className="space-y-3">
        {filtered.map((event) => (
          <div key={event.id} className="rounded-2xl border border-border/60 bg-background/30 p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-medium text-sm">{event.title}</span>
                  <Badge status={event.status} />
                </div>
                <div className="mt-1 flex flex-wrap gap-2">
                  {event.outcomes.map((o) => (
                    <span key={o.id} className={`text-[11px] rounded-full px-2 py-0.5 border ${o.is_winner ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-400" : "border-border/50 text-muted-foreground"}`}>
                      {o.outcome} · {o.pool_points} pts
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-2 shrink-0">
                {event.status === "open" && (
                  <button onClick={() => lockEvent(event.id)} className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-xs text-yellow-400 hover:bg-yellow-500/20 transition">🔒 Lock</button>
                )}
                {(event.status === "open" || event.status === "locked") && (
                  <button onClick={() => setResolving(resolving === event.id ? null : event.id)} className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400 hover:bg-blue-500/20 transition">✓ Resolve</button>
                )}
                {event.status === "resolved_pending_dispute" && (
                  <button onClick={() => finalizePayout(event)} disabled={finalizing === event.id}
                    className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-400 hover:bg-emerald-500/20 transition disabled:opacity-50">
                    {finalizing === event.id ? "…" : "💰 Confirm payment"}
                  </button>
                )}
                {event.status === "disputed" && (
                  <span className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs text-red-400">
                    ⚠ Ongoing Litigation — payment blocked
                  </span>
                )}
                <button onClick={() => toggleCarousel(event)} disabled={carouselLoading === event.id}
                  className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-primary hover:bg-primary/20 transition disabled:opacity-50">
                  {carouselLoading === event.id ? "…" : "⭐ Carousel"}
                </button>
              </div>
            </div>
            {resolving === event.id && (
              <div className="mt-3 rounded-xl border border-border/50 bg-background/40 p-3">
                <p className="mb-2 text-xs text-muted-foreground font-medium">Winning Outcome :</p>
                <div className="flex flex-wrap gap-2">
                  {event.outcomes.map((o) => (
                    <button key={o.id} type="button" onClick={() => setWinnerIds({ ...winnerIds, [event.id]: String(o.id) })}
                      className={`rounded-xl border px-3 py-1.5 text-xs transition ${winnerIds[event.id] === String(o.id) ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400" : "border-border/60 text-muted-foreground hover:text-foreground"}`}>
                      {o.outcome}
                    </button>
                  ))}
                </div>
                <div className="mt-3">
                  <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">
                    Proof Link * — a chapter, an official tweet, a screenshot or anything that can be verified.
                  </label>
                  <input
                    className="h-9 w-full rounded-xl border border-border/70 bg-background/40 px-3 text-xs outline-none transition focus:border-primary/50"
                    value={evidenceUrls[event.id] ?? ""}
                    onChange={(e) => setEvidenceUrls({ ...evidenceUrls, [event.id]: e.target.value })}
                    placeholder="https://…"
                  />
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground/70">
                  Resolution opens a Dispute Window. Payment will happen after clicking « Confirm payment », once no litigation is ongoing
                </p>
                <button onClick={() => resolveEvent(event)} disabled={!winnerIds[event.id] || !(evidenceUrls[event.id] ?? "").trim()}
                  className="mt-3 rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 transition">
                  Confirm Resolution
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main page ─────────────────────────────────────────────────────────────────
// ── Manage Mods ──────────────────────────────────────────────────────────────
function ManageMods({ series, token, API, notify }: { series: Series[]; token: string; API: string; notify: (msg: string, type?: "success" | "error") => void }) {
  const [query, setQuery] = React.useState("")
  const [results, setResults] = React.useState<{ id: number; username: string; role: string }[]>([])
  const [searching, setSearching] = React.useState(false)
  const [selectedUser, setSelectedUser] = React.useState<{ id: number; username: string } | null>(null)
  const [seriesId, setSeriesId] = React.useState("")
  const [granting, setGranting] = React.useState(false)

  React.useEffect(() => {
    if (query.trim().length < 2) { setResults([]); return }
    setSearching(true)
    const t = setTimeout(() => {
      fetch(`${API}/admin/users/search?q=${encodeURIComponent(query.trim())}`, {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((r) => r.json())
        .then((data) => setResults(Array.isArray(data) ? data : []))
        .finally(() => setSearching(false))
    }, 300) // debounce
    return () => clearTimeout(t)
  }, [query])

  async function grant() {
    if (!selectedUser || !seriesId) return
    setGranting(true)
    try {
      const res = await fetch(`${API}/admin/mod-scopes`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ user_id: selectedUser.id, series_id: Number(seriesId) }),
      })
      if (!res.ok) throw new Error((await res.json())?.detail ?? "Failed to grant scope")
      notify(`${selectedUser.username} is now a mod for this series`)
      setSelectedUser(null); setQuery(""); setSeriesId("")
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Failed to grant scope", "error")
    } finally {
      setGranting(false)
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">Search a user by username</label>
        <input
          className="h-10 w-full rounded-xl border border-border/70 bg-background/40 px-3 text-sm outline-none transition focus:border-primary/50"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelectedUser(null) }}
          placeholder="Type at least 2 characters…"
        />
        {searching && <p className="mt-1 text-[11px] text-muted-foreground">Searching…</p>}
        {results.length > 0 && !selectedUser && (
          <div className="mt-2 space-y-1">
            {results.map((u) => (
              <button
                key={u.id}
                onClick={() => { setSelectedUser({ id: u.id, username: u.username }); setQuery(u.username); setResults([]) }}
                className="flex w-full items-center justify-between rounded-xl border border-border/50 bg-background/30 px-3 py-2 text-sm hover:border-primary/40 transition"
              >
                <span>{u.username}</span>
                <span className="text-[11px] text-muted-foreground">{u.role}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedUser && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-3">
          <p className="text-sm">
            Selected: <span className="font-semibold text-primary">{selectedUser.username}</span>
          </p>
        </div>
      )}

      <div>
        <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">Series to moderate</label>
        <select
          className="h-10 w-full rounded-xl border border-border/70 bg-background/40 px-3 text-sm outline-none transition focus:border-primary/50"
          value={seriesId}
          onChange={(e) => setSeriesId(e.target.value)}
        >
          <option value="">— Choose a series —</option>
          {series.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>
      </div>

      <button
        onClick={grant}
        disabled={!selectedUser || !seriesId || granting}
        className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {granting ? "Granting…" : "Grant mod scope"}
      </button>

      <p className="text-[11px] text-muted-foreground/70">
        A mod can only approve/reject proposals and resolve events for the series they're scoped to — they can't touch other series, and they can't bet on events within their own scope.
      </p>
    </div>
  )
}

// ── Create Daily/Weekly Puzzles ─────────────────────────────────────────────
function CreateDailyPuzzles({ token, API, notify }: { token: string; API: string; notify: (msg: string, type?: "success" | "error") => void }) {
  const [subTab, setSubTab] = React.useState<"trivia" | "silhouette" | "weekly">("trivia")

  // ── Trivia state ──
  const [triviaDate, setTriviaDate] = React.useState(new Date().toISOString().slice(0, 10))
  const [questions, setQuestions] = React.useState(
    Array.from({ length: 5 }, () => ({ question: "", options: ["", ""], correctIndex: 0, difficulty: 1, series: "" }))
  )
  const [triviaSaving, setTriviaSaving] = React.useState(false)

  // ── Silhouette state ──
  const [silDate, setSilDate] = React.useState(new Date().toISOString().slice(0, 10))
  const [silImageUrl, setSilImageUrl] = React.useState("")
  const [silCharacterName, setSilCharacterName] = React.useState("")
  const [silSeries, setSilSeries] = React.useState("")
  const [silSaving, setSilSaving] = React.useState(false)

  // ── Weekly Connections state ── flux en 2 étapes : d'abord un roster de
  // 16 personnages (image + nom), puis 4 catégories où on assigne 4
  // personnages chacune, piochés dans ce roster (un personnage ne peut
  // être assigné qu'à une seule catégorie).
  const [weekOf, setWeekOf] = React.useState("")
  const [roster, setRoster] = React.useState(
    Array.from({ length: 16 }, () => ({ name: "", imageUrl: "" }))
  )
  const [categoryLabels, setCategoryLabels] = React.useState(["", "", "", ""])
  const [categoryAssignments, setCategoryAssignments] = React.useState<number[][]>([[], [], [], []])
  const [weeklySaving, setWeeklySaving] = React.useState(false)

  function updateQuestion(i: number, field: string, val: any) {
    setQuestions(questions.map((q, idx) => idx === i ? { ...q, [field]: val } : q))
  }
  function updateOption(qi: number, oi: number, val: string) {
    setQuestions(questions.map((q, idx) => idx === qi ? { ...q, options: q.options.map((o, oidx) => oidx === oi ? val : o) } : q))
  }

  function updateRosterName(i: number, name: string) {
    setRoster(roster.map((r, idx) => idx === i ? { ...r, name } : r))
  }
  function updateRosterImage(i: number, imageUrl: string) {
    setRoster(roster.map((r, idx) => idx === i ? { ...r, imageUrl } : r))
  }
  function toggleAssignment(ci: number, rosterIndex: number) {
    setCategoryAssignments((prev) => {
      const current = prev[ci]
      if (current.includes(rosterIndex)) {
        return prev.map((arr, idx) => idx === ci ? arr.filter((x) => x !== rosterIndex) : arr)
      }
      const usedElsewhere = prev.some((arr, idx) => idx !== ci && arr.includes(rosterIndex))
      if (usedElsewhere || current.length >= 4) return prev
      return prev.map((arr, idx) => idx === ci ? [...arr, rosterIndex] : arr)
    })
  }

  async function submitTrivia() {
    const valid = questions.every((q) => q.question.trim() && q.options.every((o) => o.trim()))
    if (!valid) return notify("Fill every question and every option", "error")

    setTriviaSaving(true)
    try {
      const res = await fetch(`${API}/admin/daily-challenges`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          challenge_date: triviaDate,
          type: "trivia",
          content: { questions: questions.map((q) => ({ question: q.question, options: q.options, difficulty_weight: q.difficulty, series: q.series })) },
          answer: { correct_indices: questions.map((q) => q.correctIndex) },
        }),
      })
      if (!res.ok) throw new Error((await res.json())?.detail ?? "Failed to create trivia")
      notify("Trivia created")
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Failed to create trivia", "error")
    } finally {
      setTriviaSaving(false)
    }
  }

  async function submitSilhouette() {
    if (!silImageUrl.trim() || !silCharacterName.trim()) return notify("Upload an image and enter the character name", "error")

    setSilSaving(true)
    try {
      const res = await fetch(`${API}/admin/daily-challenges`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          challenge_date: silDate,
          type: "silhouette",
          content: { image_url: silImageUrl.trim(), hints: [] },
          answer: { character_name: silCharacterName.trim(), series: silSeries.trim() },
        }),
      })
      if (!res.ok) throw new Error((await res.json())?.detail ?? "Failed to create silhouette")
      notify("Silhouette created")
      setSilImageUrl(""); setSilCharacterName(""); setSilSeries("")
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Failed to create silhouette", "error")
    } finally {
      setSilSaving(false)
    }
  }

  async function submitWeekly() {
    if (!weekOf) return notify("Pick a week (Sunday)", "error")
    if (roster.some((r) => !r.name.trim() || !r.imageUrl.trim())) {
      return notify("Every one of the 16 characters needs a name and an uploaded image", "error")
    }
    if (categoryLabels.some((l) => !l.trim())) {
      return notify("Every category needs a label", "error")
    }
    if (categoryAssignments.some((arr) => arr.length !== 4)) {
      return notify("Every category needs exactly 4 characters assigned", "error")
    }

    const grid = roster.map((r, i) => ({ id: i, name: r.name.trim(), image_url: r.imageUrl.trim() }))
    const finalCategories = categoryLabels.map((label, ci) => ({
      label: label.trim(),
      character_ids: categoryAssignments[ci],
    }))

    setWeeklySaving(true)
    try {
      const res = await fetch(`${API}/admin/weekly-connections`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ week_of: weekOf, grid, categories: finalCategories }),
      })
      if (!res.ok) throw new Error((await res.json())?.detail ?? "Failed to create puzzle")
      notify("AniConnections puzzle created")
      setWeekOf("")
      setRoster(Array.from({ length: 16 }, () => ({ name: "", imageUrl: "" })))
      setCategoryLabels(["", "", "", ""])
      setCategoryAssignments([[], [], [], []])
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Failed to create puzzle", "error")
    } finally {
      setWeeklySaving(false)
    }
  }

  return (
    <div>
      <div className="mb-4 flex gap-2">
        {(["trivia", "silhouette", "weekly"] as const).map((t) => (
          <button key={t} onClick={() => setSubTab(t)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${subTab === t ? "border-primary bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:text-foreground"}`}>
            {t === "trivia" ? "Trivia" : t === "silhouette" ? "Silhouette" : "AniConnections"}
          </button>
        ))}
      </div>

      {subTab === "trivia" && (
        <div className="space-y-4">
          <Input label="Date" type="date" value={triviaDate} onChange={(e) => setTriviaDate(e.target.value)} />
          {questions.map((q, i) => (
            <div key={i} className="rounded-xl border border-border/60 bg-background/30 p-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">Question {i + 1}</p>
              <Input label="Question" value={q.question} onChange={(e) => updateQuestion(i, "question", e.target.value)} />
              {q.options.map((o, oi) => (
                <div key={oi} className="flex items-center gap-2">
                  <input type="radio" checked={q.correctIndex === oi} onChange={() => updateQuestion(i, "correctIndex", oi)} />
                  <input
                    className="h-9 flex-1 rounded-lg border border-border/60 bg-background/30 px-2.5 text-xs outline-none focus:border-primary/40"
                    value={o}
                    onChange={(e) => updateOption(i, oi, e.target.value)}
                    placeholder={`Option ${oi + 1}`}
                  />
                </div>
              ))}
              <button type="button" onClick={() => updateQuestion(i, "options", [...q.options, ""])}
                className="text-[11px] text-primary hover:underline">+ Add option</button>
              <div className="flex gap-2">
                <Input label="Difficulty weight" type="number" value={q.difficulty} onChange={(e) => updateQuestion(i, "difficulty", Number(e.target.value))} />
                <Input label="Series" value={q.series} onChange={(e) => updateQuestion(i, "series", e.target.value)} />
              </div>
            </div>
          ))}
          <button onClick={submitTrivia} disabled={triviaSaving}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
            {triviaSaving ? "Creating…" : "Create trivia"}
          </button>
        </div>
      )}

      {subTab === "silhouette" && (
        <div className="space-y-4">
          <Input label="Date" type="date" value={silDate} onChange={(e) => setSilDate(e.target.value)} />
          <div>
            <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">Character image</label>
            <EditableImage
              kind="daily"
              shape="cover"
              currentUrl={silImageUrl}
              editable={!silSaving}
              token={token}
              API={API}
              onUploaded={setSilImageUrl}
              className="h-48 w-full border-2 border-dashed border-border/50 bg-background/30"
            />
          </div>
          <Input label="Character name (the answer)" value={silCharacterName} onChange={(e) => setSilCharacterName(e.target.value)} />
          <Input label="Series" value={silSeries} onChange={(e) => setSilSeries(e.target.value)} />
          <button onClick={submitSilhouette} disabled={silSaving}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
            {silSaving ? "Creating…" : "Create silhouette"}
          </button>
        </div>
      )}

      {subTab === "weekly" && (
        <div className="space-y-6">
          <Input label="Week of (Sunday)" type="date" value={weekOf} onChange={(e) => setWeekOf(e.target.value)} />

          {/* ── Étape 1 : le roster des 16 personnages ── */}
          <div>
            <h3 className="mb-2 text-sm font-semibold">1. Characters (16 total)</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {roster.map((r, i) => (
                <div key={i}>
                  <EditableImage
                    kind="weekly"
                    shape="cover"
                    currentUrl={r.imageUrl}
                    editable={!weeklySaving}
                    token={token}
                    API={API}
                    onUploaded={(url) => updateRosterImage(i, url)}
                    className="h-24 w-full border-2 border-dashed border-border/50 bg-background/30"
                  />
                  <input
                    className="mt-1.5 h-8 w-full rounded-lg border border-border/60 bg-background/30 px-2 text-[11px] outline-none focus:border-primary/40"
                    value={r.name}
                    onChange={(e) => updateRosterName(i, e.target.value)}
                    placeholder="Name"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* ── Étape 2 : 4 catégories, on pioche dans le roster ── */}
          <div>
            <h3 className="mb-2 text-sm font-semibold">2. Categories</h3>
            <div className="space-y-3">
              {categoryLabels.map((label, ci) => (
                <div key={ci} className="rounded-xl border border-border/60 bg-background/30 p-3 space-y-2">
                  <div className="flex items-center justify-between">
                    <input
                      className="h-9 flex-1 rounded-lg border border-border/60 bg-background/30 px-2.5 text-xs outline-none focus:border-primary/40"
                      value={label}
                      onChange={(e) => setCategoryLabels(categoryLabels.map((l, idx) => idx === ci ? e.target.value : l))}
                      placeholder={`Category ${ci + 1} label, e.g. Captains`}
                    />
                    <span className="ml-2 shrink-0 text-[11px] text-muted-foreground">{categoryAssignments[ci].length}/4</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {roster.map((r, ri) => {
                      const inThis = categoryAssignments[ci].includes(ri)
                      const inOther = categoryAssignments.some((arr, idx) => idx !== ci && arr.includes(ri))
                      return (
                        <button
                          key={ri}
                          type="button"
                          disabled={inOther || (!inThis && categoryAssignments[ci].length >= 4)}
                          onClick={() => toggleAssignment(ci, ri)}
                          className={`rounded-full border px-2.5 py-1 text-[11px] transition ${
                            inThis ? "border-primary bg-primary/15 text-primary"
                            : inOther ? "border-border/30 text-muted-foreground/40 cursor-not-allowed"
                            : "border-border/60 text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {r.name.trim() || `#${ri + 1}`}
                        </button>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <button onClick={submitWeekly} disabled={weeklySaving}
            className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
            {weeklySaving ? "Creating…" : "Create AniConnections puzzle"}
          </button>
        </div>
      )}
    </div>
  )
}

// ── Handle Daily & Weekly ────────────────────────────────────────────────────
function HandleDailyWeekly({ token, API, notify }: { token: string; API: string; notify: (msg: string, type?: "success" | "error") => void }) {
  const [challenges, setChallenges] = React.useState<any[]>([])
  const [puzzles, setPuzzles] = React.useState<any[]>([])
  const [loading, setLoading] = React.useState(true)
  const [deleting, setDeleting] = React.useState<string | null>(null)

  async function loadAll() {
    const [ch, pz] = await Promise.all([
      fetch(`${API}/admin/daily-challenges`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
      fetch(`${API}/admin/weekly-connections`, { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    ])
    setChallenges(Array.isArray(ch) ? ch : [])
    setPuzzles(Array.isArray(pz) ? pz : [])
  }

  React.useEffect(() => { loadAll().finally(() => setLoading(false)) }, [])

  async function deleteChallenge(id: number) {
    if (!confirm("Delete this challenge? This can't be undone.")) return
    setDeleting(`c${id}`)
    try {
      const res = await fetch(`${API}/admin/daily-challenges/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error((await res.json())?.detail ?? "Failed to delete")
      notify("Challenge deleted")
      await loadAll()
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Failed to delete", "error")
    } finally {
      setDeleting(null)
    }
  }

  async function deletePuzzle(id: number) {
    if (!confirm("Delete this AniConnections puzzle? This can't be undone.")) return
    setDeleting(`p${id}`)
    try {
      const res = await fetch(`${API}/admin/weekly-connections/${id}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } })
      if (!res.ok) throw new Error((await res.json())?.detail ?? "Failed to delete")
      notify("Puzzle deleted")
      await loadAll()
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Failed to delete", "error")
    } finally {
      setDeleting(null)
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-semibold">Daily challenges (Trivia / Silhouette)</h3>
        {challenges.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing scheduled yet.</p>
        ) : (
          <div className="space-y-2">
            {challenges.map((c) => (
              <div key={c.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-background/30 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">{c.challenge_date} — {c.type}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {c.type === "trivia"
                      ? `${c.content?.questions?.length ?? 0} questions`
                      : `Answer: ${c.answer?.character_name ?? "?"}`}
                  </p>
                </div>
                <button
                  onClick={() => deleteChallenge(c.id)}
                  disabled={deleting === `c${c.id}`}
                  className="shrink-0 rounded-lg border border-red-500/30 px-2.5 py-1 text-[11px] text-red-400 hover:bg-red-500/10 transition disabled:opacity-50"
                >
                  {deleting === `c${c.id}` ? "…" : "Delete"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <h3 className="mb-2 text-sm font-semibold">AniConnections puzzles</h3>
        {puzzles.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing scheduled yet.</p>
        ) : (
          <div className="space-y-2">
            {puzzles.map((p) => (
              <div key={p.id} className="flex items-center justify-between rounded-xl border border-border/60 bg-background/30 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium">Week of {p.week_of}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {(p.categories ?? []).map((c: any) => c.label).join(" · ")}
                  </p>
                </div>
                <button
                  onClick={() => deletePuzzle(p.id)}
                  disabled={deleting === `p${p.id}`}
                  className="shrink-0 rounded-lg border border-red-500/30 px-2.5 py-1 text-[11px] text-red-400 hover:bg-red-500/10 transition disabled:opacity-50"
                >
                  {deleting === `p${p.id}` ? "…" : "Delete"}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <p className="text-[11px] text-muted-foreground/70">
        No edit form yet — to fix a mistake, delete and recreate via the "Daily & Weekly" tab. Deletion is blocked once a player has already attempted it.
      </p>
    </div>
  )
}

// ── Handle Bingo ──────────────────────────────────────────────────────────────
type BingoCardRow = {
  id: number
  title: string
  status: string
  series_id: number | null
  opens_at: string
  closes_at: string
}
type BingoItemRow = { id: number; description: string }

function HandleBingo({ token, API, notify }: { token: string; API: string; notify: (msg: string, type?: "success" | "error") => void }) {
  const [cards, setCards] = React.useState<BingoCardRow[]>([])
  const [loading, setLoading] = React.useState(true)
  const [resolvingCardId, setResolvingCardId] = React.useState<number | null>(null)
  const [items, setItems] = React.useState<BingoItemRow[]>([])
  const [happenedIds, setHappenedIds] = React.useState<number[]>([])
  const [submitting, setSubmitting] = React.useState(false)

  async function loadCards() {
    const res = await fetch(`${API}/bingo/`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    setCards(Array.isArray(data) ? data : [])
  }

  React.useEffect(() => { loadCards().finally(() => setLoading(false)) }, [])

  async function openResolve(cardId: number) {
    setResolvingCardId(cardId)
    setHappenedIds([])
    const res = await fetch(`${API}/bingo/${cardId}/items`, { headers: { Authorization: `Bearer ${token}` } })
    const data = await res.json()
    setItems(Array.isArray(data) ? data : [])
  }

  function toggleItem(id: number) {
    setHappenedIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id])
  }

  async function confirmResolve() {
    if (resolvingCardId == null) return
    setSubmitting(true)
    try {
      const res = await fetch(`${API}/bingo/${resolvingCardId}/resolve`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ happened_item_ids: happenedIds }),
      })
      if (!res.ok) throw new Error((await res.json())?.detail ?? "Failed to resolve")
      notify("Bingo resolved, rewards distributed")
      setResolvingCardId(null)
      await loadCards()
    } catch (err: unknown) {
      notify(err instanceof Error ? err.message : "Failed to resolve", "error")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) return <p className="text-sm text-muted-foreground">Loading…</p>

  return (
    <div className="space-y-3">
      {cards.length === 0 ? (
        <p className="text-xs text-muted-foreground">No open bingo cards.</p>
      ) : (
        cards.map((card) => (
          <div key={card.id} className="rounded-xl border border-border/60 bg-background/30 p-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{card.title}</p>
                <p className="text-[11px] text-muted-foreground">
                  Closes {new Date(card.closes_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}
                </p>
              </div>
              {resolvingCardId !== card.id && (
                <button
                  onClick={() => openResolve(card.id)}
                  className="rounded-lg border border-emerald-500/30 px-2.5 py-1 text-[11px] text-emerald-400 hover:bg-emerald-500/10 transition"
                >
                  Resolve
                </button>
              )}
            </div>

            {resolvingCardId === card.id && (
              <div className="mt-3 rounded-lg border border-border/50 bg-background/40 p-3">
                <p className="mb-2 text-[11px] text-muted-foreground">Select the items that happened:</p>
                <div className="space-y-1.5">
                  {items.map((item) => (
                    <label key={item.id} className="flex items-center gap-2 text-xs">
                      <input
                        type="checkbox"
                        checked={happenedIds.includes(item.id)}
                        onChange={() => toggleItem(item.id)}
                      />
                      {item.description}
                    </label>
                  ))}
                </div>
                <p className="mt-2 text-[11px] text-muted-foreground/70">
                  Rewards are paid out immediately — double-check before confirming.
                </p>
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={confirmResolve}
                    disabled={submitting}
                    className="rounded-lg bg-primary px-3 py-1.5 text-[11px] font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
                  >
                    {submitting ? "…" : "Confirm resolution"}
                  </button>
                  <button
                    onClick={() => setResolvingCardId(null)}
                    className="rounded-lg border border-border/60 px-3 py-1.5 text-[11px] text-muted-foreground hover:text-foreground transition"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  )
}

export default function AdminPage() {
  const router = useRouter()
  const [user, setUser] = React.useState<User | null>(null)
  const [series, setSeries] = React.useState<Series[]>([])
  const [events, setEvents] = React.useState<Event[]>([])
  const [tab, setTab] = React.useState<Tab>("create-event")
  const [toast, setToast] = React.useState<{ msg: string; type: "success" | "error" } | null>(null)
  const [authLoading, setAuthLoading] = React.useState(true)

  const API = process.env.NEXT_PUBLIC_API_URL ?? ""
  const token = typeof window !== "undefined" ? localStorage.getItem("access_token") ?? "" : ""

  async function loadData() {
    const h = { Authorization: `Bearer ${token}`, Accept: "application/json" }
    const [s, e] = await Promise.all([
      fetch(`${API}/series/`, { headers: h }).then((r) => r.json()),
      fetch(`${API}/events/?limit=100`, { headers: h }).then((r) => r.json()),
    ])
    setSeries(Array.isArray(s) ? s : [])
    setEvents(Array.isArray(e) ? e : [])
  }

  React.useEffect(() => {
    if (!token) { router.replace("/login"); return }
    fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => r.json())
      .then((u) => {
        if (u?.role !== "admin") { router.replace("/"); return }
        setUser(u)
        loadData()
      })
      .catch(() => router.replace("/"))
      .finally(() => setAuthLoading(false))
  }, [])

  function notify(msg: string, type: "success" | "error" = "success") { setToast({ msg, type }) }

  if (authLoading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
  if (!user) return null

  const TABS: { id: Tab; label: string }[] = [
    { id: "create-event",  label: "➕ Create an event" },
    { id: "manage-events", label: "⚙️ Handle events" },
    { id: "create-series", label: "📚 New series" },
    { id: "manage-series", label: "🖼 Handle series" },
    { id: "create-bingo",  label: "🎯 Create a bingo" },
    { id: "manage-bingo", label: "🎱 Handle Bingo"},
    { id: "manage-mods",   label: "🛡️ Manage mods" },
    { id: "daily-puzzles", label: "🎮 Daily & Weekly" },
    { id: "handle-daily-weekly", label: "📋 Handle Daily & Weekly" },
  ]

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Admin Panel</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Logged in as <span className="text-primary font-medium">{user.username}</span></p>
          </div>
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Retour</Link>
        </div>

        <div className="mb-6 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button key={t.id} onClick={() => setTab(t.id)}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${tab === t.id ? "border-primary/40 bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"}`}>
              {t.label}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm">
          {tab === "create-event" && (
            <>
              <h2 className="mb-4 text-base font-semibold">Create an event</h2>
              <CreateEventForm series={series} token={token} API={API} onSuccess={() => { notify("Event created ✓"); loadData() }} />
            </>
          )}
          {tab === "manage-events" && (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold">Handle events</h2>
                <button onClick={loadData} className="text-xs text-muted-foreground hover:text-foreground transition-colors">↺ Reload</button>
              </div>
              <ManageEvents events={events} token={token} API={API} onRefresh={() => { loadData(); notify("Updated ✓") }} />
            </>
          )}
          {tab === "create-series" && (
            <>
              <h2 className="mb-4 text-base font-semibold">Add a Series</h2>
              <CreateSeriesForm token={token} API={API} onSuccess={() => { notify("Serie created ✓"); loadData() }} />
            </>
          )}
          {tab === "manage-series" && (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold">Handle Series</h2>
                <button onClick={loadData} className="text-xs text-muted-foreground hover:text-foreground transition-colors">↺ Reload</button>
              </div>
              <ManageSeries series={series} token={token} API={API} onRefresh={loadData} notify={notify} />
            </>
          )}
          {tab === "manage-mods" && (
            <>
              <div className="mb-4">
                <h2 className="text-base font-semibold">Manage Mods</h2>
              </div>
              <ManageMods series={series} token={token} API={API} notify={notify} />
            </>
          )}
          {tab === "daily-puzzles" && (
            <>
              <div className="mb-4">
                <h2 className="text-base font-semibold">Daily & Weekly Puzzles</h2>
              </div>
              <CreateDailyPuzzles token={token} API={API} notify={notify} />
            </>
          )}
          {tab === "handle-daily-weekly" && (
            <>
              <div className="mb-4">
                <h2 className="text-base font-semibold">Handle Daily & Weekly</h2>
              </div>
              <HandleDailyWeekly token={token} API={API} notify={notify} />
            </>
          )}
          {tab === "create-bingo" && (
            <>
              <h2 className="mb-4 text-base font-semibold">Create a bingo</h2>
              <CreateBingoForm series={series} token={token} API={API} onSuccess={() => { notify("Bingo créé ✓") }} />
            </>
          )}
          {tab == "manage-bingo" && (
            <>
              <div className="mb-4">
                <h2 className="text-base font-semibold">Handle Bingo</h2>
              </div>
              <HandleBingo token={token} API={API} notify={notify}/>
            </>
          )

          }
        </div>
      </main>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}