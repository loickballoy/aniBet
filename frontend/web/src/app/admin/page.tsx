"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { SiteHeader } from "@/components/ui/layout/SiteHeader"

// ── Types ─────────────────────────────────────────────────────────────────────
type User = { username: string; role: string }
type Series = { id: number; name: string; slug: string }
type Event = {
  id: number
  title: string
  status: string
  pool_total: number
  series_id: number | null
  outcomes: { id: number; outcome: string; pool_points: number; is_winner: boolean }[]
}

type Tab = "create-event" | "manage-events" | "create-series" | "create-bingo"

// ── Helpers ───────────────────────────────────────────────────────────────────
const STATUS_STYLE: Record<string, string> = {
  open:     "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  locked:   "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  resolved: "bg-blue-500/15   text-blue-400   border-blue-500/30",
  cancelled:"bg-red-500/15    text-red-400    border-red-500/30",
}

function Badge({ status }: { status: string }) {
  return (
    <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${STATUS_STYLE[status] ?? "bg-muted text-muted-foreground"}`}>
      {status}
    </span>
  )
}

function Input({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">{label}</label>
      <input
        className="h-10 w-full rounded-xl border border-border/70 bg-background/40 px-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
        {...props}
      />
    </div>
  )
}

function Textarea({ label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">{label}</label>
      <textarea
        className="w-full rounded-xl border border-border/70 bg-background/40 px-3 py-2 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
        rows={3}
        {...props}
      />
    </div>
  )
}

function Select({ label, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">{label}</label>
      <select
        className="h-10 w-full rounded-xl border border-border/70 bg-background/40 px-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
        {...props}
      >
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
function CreateEventForm({ series, token, API, onSuccess }: {
  series: Series[]
  token: string
  API: string
  onSuccess: () => void
}) {
  const [title, setTitle] = React.useState("")
  const [description, setDescription] = React.useState("")
  const [seriesId, setSeriesId] = React.useState<string>("")
  const [locksAt, setLocksAt] = React.useState("")
  const [feeBps, setFeeBps] = React.useState("200")
  const [outcomes, setOutcomes] = React.useState(["", ""])
  const [loading, setLoading] = React.useState(false)

  function addOutcome() { setOutcomes([...outcomes, ""]) }
  function removeOutcome(i: number) { setOutcomes(outcomes.filter((_, idx) => idx !== i)) }
  function setOutcome(i: number, val: string) { setOutcomes(outcomes.map((o, idx) => idx === i ? val : o)) }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    const validOutcomes = outcomes.map((o) => o.trim()).filter(Boolean)
    if (validOutcomes.length < 2) return alert("Au moins 2 outcomes requis")

    setLoading(true)
    try {
      const res = await fetch(`${API}/events/`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          title,
          description: description || null,
          series_id: seriesId ? Number(seriesId) : null,
          locks_at: locksAt || null,
          fee_bps: Number(feeBps),
          outcomes: validOutcomes,
          tag_ids: [],
        }),
      })
      if (!res.ok) throw new Error((await res.json())?.detail ?? "Erreur")
      setTitle(""); setDescription(""); setSeriesId(""); setLocksAt(""); setFeeBps("200"); setOutcomes(["", ""])
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input label="Titre *" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={loading} placeholder="Ex: Luffy va vaincre Kizaru ?" />
        </div>
        <div className="sm:col-span-2">
          <Textarea label="Description" value={description} onChange={(e) => setDescription(e.target.value)} disabled={loading} placeholder="Contexte de l'événement…" />
        </div>
        <Select label="Série" value={seriesId} onChange={(e) => setSeriesId(e.target.value)} disabled={loading}>
          <option value="">— Aucune —</option>
          {series.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Input label="Lock at (optionnel)" type="datetime-local" value={locksAt} onChange={(e) => setLocksAt(e.target.value)} disabled={loading} />
        <Input label="Frais (basis points)" type="number" value={feeBps} onChange={(e) => setFeeBps(e.target.value)} min={0} max={1000} disabled={loading} />
      </div>

      {/* Outcomes */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-[11px] font-medium text-muted-foreground">Outcomes *</label>
          <button type="button" onClick={addOutcome} className="text-[11px] text-primary hover:underline">+ Ajouter</button>
        </div>
        <div className="space-y-2">
          {outcomes.map((o, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="h-10 flex-1 rounded-xl border border-border/70 bg-background/40 px-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                value={o}
                onChange={(e) => setOutcome(i, e.target.value)}
                placeholder={`Outcome ${i + 1}`}
                disabled={loading}
              />
              {outcomes.length > 2 && (
                <button type="button" onClick={() => removeOutcome(i)} className="rounded-xl border border-border/70 px-3 text-xs text-muted-foreground hover:text-red-400">
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      </div>

      <button
        type="submit"
        disabled={loading || !title}
        className="h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Création…" : "Créer l'event"}
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
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <Input label="Nom *" value={name} onChange={(e) => { setName(e.target.value); setSlug(e.target.value.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "")) }} required disabled={loading} placeholder="One Piece" />
      <Input label="Slug *" value={slug} onChange={(e) => setSlug(e.target.value)} required disabled={loading} placeholder="one-piece" />
      <Input label="Cover URL (optionnel)" value={coverUrl} onChange={(e) => setCoverUrl(e.target.value)} disabled={loading} placeholder="https://…" />
      <button
        type="submit"
        disabled={loading || !name || !slug}
        className="h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "Création…" : "Créer la série"}
      </button>
    </form>
  )
}

// ── Create Bingo Form ─────────────────────────────────────────────────────────
function CreateBingoForm({ series, token, API, onSuccess }: {
  series: Series[]
  token: string
  API: string
  onSuccess: () => void
}) {
  const [title, setTitle] = React.useState("")
  const [seriesId, setSeriesId] = React.useState("")
  const [chapterNumber, setChapterNumber] = React.useState("")
  const [opensAt, setOpensAt] = React.useState("")
  const [closesAt, setClosesAt] = React.useState("")
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
          items: validItems,
        }),
      })
      if (!res.ok) throw new Error((await res.json())?.detail ?? "Erreur")
      setTitle(""); setSeriesId(""); setChapterNumber(""); setOpensAt(""); setClosesAt(""); setItems(["", "", ""])
      onSuccess()
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <Input label="Titre *" value={title} onChange={(e) => setTitle(e.target.value)} required disabled={loading} placeholder="Ex: One Piece ch.1120 Bingo" />
        </div>
        <Select label="Série" value={seriesId} onChange={(e) => setSeriesId(e.target.value)} disabled={loading}>
          <option value="">— Aucune —</option>
          {series.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
        <Input label="Numéro de chapitre" type="number" value={chapterNumber} onChange={(e) => setChapterNumber(e.target.value)} disabled={loading} placeholder="Ex: 1120" />
        <Input label="Ouverture (optionnel)" type="datetime-local" value={opensAt} onChange={(e) => setOpensAt(e.target.value)} disabled={loading} />
        <Input label="Fermeture *" type="datetime-local" value={closesAt} onChange={(e) => setClosesAt(e.target.value)} required disabled={loading} />
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <label className="text-[11px] font-medium text-muted-foreground">Items *</label>
          <button type="button" onClick={addItem} className="text-[11px] text-primary hover:underline">+ Ajouter</button>
        </div>
        <div className="space-y-2">
          {items.map((it, i) => (
            <div key={i} className="flex gap-2">
              <input
                className="h-10 flex-1 rounded-xl border border-border/70 bg-background/40 px-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20"
                value={it}
                onChange={(e) => setItem(i, e.target.value)}
                placeholder={`Item ${i + 1} — ex: Un personnage meurt`}
                disabled={loading}
              />
              {items.length > 2 && (
                <button type="button" onClick={() => removeItem(i)} className="rounded-xl border border-border/70 px-3 text-xs text-muted-foreground hover:text-red-400">✕</button>
              )}
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[11px] text-muted-foreground">Les utilisateurs pourront choisir jusqu'à 3 items parmi cette liste.</p>
      </div>
      <button type="submit" disabled={loading || !title || !closesAt}
        className="h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50">
        {loading ? "Création…" : "Créer le bingo"}
      </button>
    </form>
  )
}

// ── Manage Events ─────────────────────────────────────────────────────────────
function ManageEvents({ events, token, API, onRefresh }: {
  events: Event[]
  token: string
  API: string
  onRefresh: () => void
}) {
  const [resolving, setResolving] = React.useState<number | null>(null)
  const [winnerIds, setWinnerIds] = React.useState<Record<number, string>>({})
  const [carouselLoading, setCarouselLoading] = React.useState<number | null>(null)
  const [filter, setFilter] = React.useState("all")

  const filtered = filter === "all" ? events : events.filter((e) => e.status === filter)

  async function lockEvent(id: number) {
    await fetch(`${API}/events/${id}/lock`, { method: "PATCH", headers: { Authorization: `Bearer ${token}` } })
    onRefresh()
  }

  async function resolveEvent(event: Event) {
    const winnerId = winnerIds[event.id]
    if (!winnerId) return alert("Choisis l'outcome gagnant")
    await fetch(`${API}/events/${event.id}/resolve`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify({ winning_outcome_id: Number(winnerId), note: null }),
    })
    setResolving(null)
    onRefresh()
  }

  async function toggleCarousel(event: Event) {
    const hasCarousel = false // we don't track it here, just call toggle
    setCarouselLoading(event.id)
    const method = "POST" // always try to add; backend returns 409 if already present
    const res = await fetch(`${API}/events/${event.id}/admin-carousel`, {
      method,
      headers: { Authorization: `Bearer ${token}` },
    })
    if (res.status === 409) {
      // Already there → remove it
      await fetch(`${API}/events/${event.id}/admin-carousel`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      })
    }
    setCarouselLoading(null)
    onRefresh()
  }

  return (
    <div>
      {/* Filter */}
      <div className="mb-4 flex flex-wrap gap-2">
        {["all", "open", "locked", "resolved"].map((s) => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            className={`rounded-full border px-3 py-1 text-xs font-medium transition ${filter === s ? "border-primary bg-primary/15 text-primary" : "border-border/60 text-muted-foreground hover:text-foreground"}`}
          >
            {s === "all" ? "Tous" : s}
          </button>
        ))}
      </div>

      {filtered.length === 0 && <p className="text-sm text-muted-foreground">Aucun event.</p>}

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

              {/* Actions */}
              <div className="flex flex-wrap gap-2 shrink-0">
                {event.status === "open" && (
                  <button onClick={() => lockEvent(event.id)}
                    className="rounded-xl border border-yellow-500/30 bg-yellow-500/10 px-3 py-1.5 text-xs text-yellow-400 hover:bg-yellow-500/20 transition">
                    🔒 Lock
                  </button>
                )}
                {(event.status === "open" || event.status === "locked") && (
                  <button onClick={() => setResolving(resolving === event.id ? null : event.id)}
                    className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-1.5 text-xs text-blue-400 hover:bg-blue-500/20 transition">
                    ✓ Résoudre
                  </button>
                )}
                <button
                  onClick={() => toggleCarousel(event)}
                  disabled={carouselLoading === event.id}
                  className="rounded-xl border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-primary hover:bg-primary/20 transition disabled:opacity-50">
                  {carouselLoading === event.id ? "…" : "⭐ Carousel"}
                </button>
              </div>
            </div>

            {/* Resolve panel */}
            {resolving === event.id && (
              <div className="mt-3 rounded-xl border border-border/50 bg-background/40 p-3">
                <p className="mb-2 text-xs text-muted-foreground font-medium">Outcome gagnant :</p>
                <div className="flex flex-wrap gap-2">
                  {event.outcomes.map((o) => (
                    <button key={o.id} type="button"
                      onClick={() => setWinnerIds({ ...winnerIds, [event.id]: String(o.id) })}
                      className={`rounded-xl border px-3 py-1.5 text-xs transition ${winnerIds[event.id] === String(o.id) ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-400" : "border-border/60 text-muted-foreground hover:text-foreground"}`}>
                      {o.outcome}
                    </button>
                  ))}
                  <button onClick={() => resolveEvent(event)}
                    disabled={!winnerIds[event.id]}
                    className="rounded-xl bg-emerald-500 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-600 disabled:opacity-50 transition">
                    Confirmer
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Main admin page ───────────────────────────────────────────────────────────
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

  function notify(msg: string, type: "success" | "error" = "success") {
    setToast({ msg, type })
  }

  if (authLoading) return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )

  if (!user) return null

  const TABS: { id: Tab; label: string }[] = [
    { id: "create-event",  label: "➕ Créer un event" },
    { id: "manage-events", label: "⚙️ Gérer les events" },
    { id: "create-series", label: "📚 Nouvelle série" },
    { id: "create-bingo",  label: "🎯 Créer un bingo" },
  ]

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-4xl px-4 py-8">

        {/* Header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Panel Admin</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">Connecté en tant que <span className="text-primary font-medium">{user.username}</span></p>
          </div>
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Retour</Link>
        </div>

        {/* Tabs */}
        <div className="mb-6 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`rounded-xl border px-4 py-2 text-sm font-medium transition ${
                tab === t.id
                  ? "border-primary/40 bg-primary/15 text-primary"
                  : "border-border/60 text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="rounded-2xl border border-border/60 bg-card/60 p-6 backdrop-blur-sm">
          {tab === "create-event" && (
            <>
              <h2 className="mb-4 text-base font-semibold">Créer un event</h2>
              <CreateEventForm
                series={series}
                token={token}
                API={API}
                onSuccess={() => { notify("Event créé ✓"); loadData() }}
              />
            </>
          )}

          {tab === "manage-events" && (
            <>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold">Gérer les events</h2>
                <button onClick={loadData} className="text-xs text-muted-foreground hover:text-foreground transition-colors">↺ Rafraîchir</button>
              </div>
              <ManageEvents events={events} token={token} API={API} onRefresh={() => { loadData(); notify("Mis à jour ✓") }} />
            </>
          )}

          {tab === "create-series" && (
            <>
              <h2 className="mb-4 text-base font-semibold">Créer une série</h2>
              <CreateSeriesForm
                token={token}
                API={API}
                onSuccess={() => { notify("Série créée ✓"); loadData() }}
              />
            </>
          )}

          {tab === "create-bingo" && (
            <>
              <h2 className="mb-4 text-base font-semibold">Créer un bingo</h2>
              <CreateBingoForm
                series={series}
                token={token}
                API={API}
                onSuccess={() => { notify("Bingo créé ✓") }}
              />
            </>
          )}
        </div>
      </main>

      {toast && <Toast msg={toast.msg} type={toast.type} onClose={() => setToast(null)} />}
    </>
  )
}