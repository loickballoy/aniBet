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
type Tab = "create-event" | "manage-events" | "create-series" | "create-bingo" | "manage-series"

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
          {tab === "create-bingo" && (
            <>
              <h2 className="mb-4 text-base font-semibold">Create a bingo</h2>
              <CreateBingoForm series={series} token={token} API={API} onSuccess={() => { notify("Bingo créé ✓") }} />
            </>
          )}
        </div>
      </main>
      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}