"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"

type BingoCard = {
  id: number
  title: string
  status: string
  closes_at?: string
  cover_url?: string | null
}

type BingoItem = {
  id: number
  card_id: number
  description: string
  did_happen?: boolean | null
}

type BingoEntry = {
  id: number
  user_id: number
  card_id: number
  selected_item_ids: number[]
  score?: number | null
  coins_earned?: number | null
}

function getToken() {
  if (typeof window === "undefined") return null
  return localStorage.getItem("access_token")
}

function formatDate(iso?: string) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })
}

// ── Stat pill ─────────────────────────────────────────────────────────────────
function StatPill({ label, value, color = "text-foreground" }: { label: string; value: string; color?: string }) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-border/50 bg-card/40 px-5 py-3 backdrop-blur-sm">
      <span className={`text-lg font-bold tabular-nums ${color}`}>{value}</span>
      <span className="mt-0.5 text-[10px] text-muted-foreground">{label}</span>
    </div>
  )
}

export default function BingoClient({ id }: { id: string }) {
  const [card, setCard] = useState<BingoCard | null>(null)
  const [items, setItems] = useState<BingoItem[]>([])
  const [myEntry, setMyEntry] = useState<BingoEntry | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [loaded, setLoaded] = useState(false)

  const token = useMemo(() => getToken(), [])

  useEffect(() => {
    if (!id || id === "undefined") { setError("ID invalide"); return }
    let cancelled = false

    async function loadAll() {
      try {
        setError(null)

        const rCard = await fetch(`/api/bingo/${encodeURIComponent(id)}`, { cache: "no-store" })
        const tCard = await rCard.text()
        if (!rCard.ok) throw new Error(tCard || `HTTP ${rCard.status}`)
        const cardJson = JSON.parse(tCard) as BingoCard
        if (cancelled) return
        setCard(cardJson)

        const rItems = await fetch(`/api/bingo/${encodeURIComponent(id)}/items`, { cache: "no-store" })
        const tItems = await rItems.text()
        if (!rItems.ok) throw new Error(tItems || `HTTP ${rItems.status}`)
        const itemsJson = JSON.parse(tItems) as BingoItem[]
        if (cancelled) return
        setItems(itemsJson)

        if (token) {
          const rMe = await fetch(`/api/bingo/${encodeURIComponent(id)}/entry/me`, {
            cache: "no-store",
            headers: { Authorization: `Bearer ${token}` },
          })
          const tMe = await rMe.text()
          if (rMe.ok) {
            const entryJson = JSON.parse(tMe) as BingoEntry | null
            if (cancelled) return
            setMyEntry(entryJson)
            if (entryJson?.selected_item_ids?.length) {
              setSelected(new Set(entryJson.selected_item_ids))
            }
          }
        }

        if (!cancelled) setLoaded(true)
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Erreur inconnue")
      }
    }

    loadAll()
    return () => { cancelled = true }
  }, [id, token])

  function toggle(itemId: number) {
    if (!token) { setError("Connecte-toi pour sélectionner."); return }
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) { next.delete(itemId); return next }
      if (next.size >= 3) return next
      next.add(itemId)
      return next
    })
  }

  async function submit() {
    if (!token) { setError("Connecte-toi pour soumettre."); return }
    const selectedIds = Array.from(selected)
    if (selectedIds.length === 0) { setError("Sélectionne au moins 1 item."); return }
    setSaving(true); setError(null)
    try {
      const res = await fetch(`/api/bingo/${encodeURIComponent(id)}/entry`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ selected_item_ids: selectedIds }),
      })
      const txt = await res.text().catch(() => "")
      if (!res.ok) throw new Error(txt || `HTTP ${res.status}`)
      const entry = JSON.parse(txt) as BingoEntry
      setMyEntry(entry)
      setSelected(new Set(entry.selected_item_ids))
    } catch (e: any) {
      setError(e?.message ?? "Erreur submit")
    } finally {
      setSaving(false)
    }
  }

  // ── Loading ──────────────────────────────────────────────────────────────────
  if (error && !card) return (
    <div className="mx-auto max-w-3xl px-4 py-16 text-center">
      <div className="rounded-2xl border border-red-500/20 bg-red-500/8 p-8 text-sm text-red-400">
        {error}
      </div>
    </div>
  )

  if (!card) return (
    <div className="flex h-[60vh] items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-xs text-muted-foreground">Chargement…</p>
      </div>
    </div>
  )

  const isClosed = card.status !== "open"
  const isResolved = card.status === "resolved"
  const selectedCount = selected.size

  // Resolved stats
  const happenedCount = items.filter((it) => it.did_happen === true).length
  const userHits = isResolved && myEntry
    ? items.filter((it) => it.did_happen && myEntry.selected_item_ids.includes(it.id)).length
    : null

  return (
    <>
      {/* ── Ambient glow ── */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
        <div className="absolute left-1/2 top-0 h-[400px] w-[600px] -translate-x-1/2 rounded-full bg-primary/4 blur-[120px]" />
      </div>

      <div
        className="mx-auto w-full max-w-3xl px-4 py-8 space-y-5"
        style={{ animation: "pageIn 0.4s ease both" }}
      >

        {/* ── Hero ── */}
        <div className="overflow-hidden rounded-3xl border border-border/60 bg-card/40 backdrop-blur-sm">
          {card.cover_url ? (
            <div className="relative h-52 w-full overflow-hidden sm:h-64">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={card.cover_url}
                alt=""
                className="h-full w-full object-cover"
                style={{ animation: "heroZoom 8s ease forwards" }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/5" />
              <div className="absolute inset-0 bg-gradient-to-r from-black/30 to-transparent" />

              <div className="absolute bottom-0 left-0 right-0 p-6">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div style={{ animation: "slideUp 0.5s ease 0.15s both" }}>
                    <h1 className="text-xl font-bold leading-tight text-white sm:text-2xl">
                      {card.title}
                    </h1>
                    {card.closes_at && (
                      <p className="mt-1 text-xs text-white/50">
                        Clôture · {formatDate(card.closes_at)}
                      </p>
                    )}
                  </div>
                  <StatusBadge status={card.status} />
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h1 className="text-xl font-bold sm:text-2xl">{card.title}</h1>
                  {card.closes_at && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Clôture · {formatDate(card.closes_at)}
                    </p>
                  )}
                </div>
                <StatusBadge status={card.status} />
              </div>
            </div>
          )}
        </div>

        {/* ── Resolved stats ── */}
        {isResolved && (
          <div
            className="grid grid-cols-3 gap-3"
            style={{ animation: "slideUp 0.4s ease 0.1s both" }}
          >
            <StatPill
              label="Items arrivés"
              value={`${happenedCount}/${items.length}`}
              color="text-emerald-400"
            />
            {myEntry && userHits !== null ? (
              <>
                <StatPill
                  label="Tes hits"
                  value={`${userHits}/3`}
                  color={userHits > 0 ? "text-primary" : "text-muted-foreground"}
                />
                <StatPill
                  label="AniCoins gagnés"
                  value={myEntry.coins_earned ? `+${myEntry.coins_earned}` : "0"}
                  color={myEntry.coins_earned ? "text-yellow-400" : "text-muted-foreground"}
                />
              </>
            ) : (
              <div className="col-span-2 flex items-center justify-center rounded-2xl border border-border/40 bg-card/30 px-4 py-3 text-xs text-muted-foreground">
                Tu n'as pas participé à ce bingo
              </div>
            )}
          </div>
        )}

        {/* ── Participation banner ── */}
        {myEntry && !isResolved && (
          <div className="flex items-center gap-3 rounded-2xl border border-emerald-500/20 bg-emerald-500/8 px-4 py-3 backdrop-blur-sm">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/20 text-xs text-emerald-400">
              ✓
            </span>
            <p className="text-sm text-emerald-400">
              Participation enregistrée ·{" "}
              <span className="font-semibold">
                {myEntry.selected_item_ids.length} item{myEntry.selected_item_ids.length > 1 ? "s" : ""}
              </span>{" "}
              sélectionné{myEntry.selected_item_ids.length > 1 ? "s" : ""}
            </p>
          </div>
        )}

        {!token && (
          <div className="rounded-2xl border border-border/50 bg-card/30 px-4 py-3 text-sm text-muted-foreground backdrop-blur-sm">
            <a href="/login" className="text-primary hover:underline font-medium">Connecte-toi</a>{" "}
            pour participer au bingo.
          </div>
        )}

        {isClosed && !myEntry && token && (
          <div className="rounded-2xl border border-border/40 bg-card/20 px-4 py-3 text-sm text-muted-foreground">
            Ce bingo est terminé — les participations ne sont plus acceptées.
          </div>
        )}

        {/* ── Action bar ── */}
        {!isClosed && token && (
          <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/50 bg-card/50 px-5 py-3.5 backdrop-blur-sm">
            <div className="flex items-center gap-3">
              <span className="text-sm text-muted-foreground">Sélection</span>
              <div className="flex gap-1.5">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className={`h-2.5 w-2.5 rounded-full transition-all duration-200 ${
                      i < selectedCount
                        ? "bg-primary shadow-sm shadow-primary/40"
                        : "bg-border/60"
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground tabular-nums">
                {selectedCount}/3
              </span>
            </div>
            <Button
              disabled={saving || selectedCount === 0}
              onClick={submit}
              className="h-9 px-5"
            >
              {saving
                ? "Enregistrement…"
                : myEntry
                ? "Mettre à jour"
                : `Valider`}
            </Button>
          </div>
        )}

        {/* ── Items grid ── */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {items.map((it, idx) => {
            const isSelected = selected.has(it.id)
            const userPicked = myEntry?.selected_item_ids.includes(it.id)
            const happened = isResolved && it.did_happen === true
            const didntHappen = isResolved && it.did_happen === false

            // Style logic
            let cardClass = "border-border/50 bg-card/40 hover:border-primary/30 hover:bg-primary/5"
            if (happened && userPicked) cardClass = "border-emerald-500/40 bg-emerald-500/10 shadow-sm shadow-emerald-500/10"
            else if (happened) cardClass = "border-emerald-500/20 bg-emerald-500/5"
            else if (didntHappen && userPicked) cardClass = "border-red-500/25 bg-red-500/6"
            else if (didntHappen) cardClass = "border-border/30 bg-card/20 opacity-50"
            else if (isSelected) cardClass = "border-primary/50 bg-primary/10 shadow-sm shadow-primary/10"

            return (
              <div
                key={it.id}
                onClick={() => !isClosed && toggle(it.id)}
                className={[
                  "relative rounded-2xl border p-4 backdrop-blur-sm transition-all duration-200 select-none",
                  isClosed ? "cursor-default" : "cursor-pointer",
                  cardClass,
                ].join(" ")}
                style={{
                  animation: `itemFadeIn 0.35s ease both`,
                  animationDelay: `${idx * 40}ms`,
                }}
              >
                {/* Number badge */}
                <div className="mb-2.5 flex items-start justify-between gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-border/40 text-[10px] font-semibold text-muted-foreground">
                    {idx + 1}
                  </span>

                  {/* State indicator */}
                  {isResolved ? (
                    <span className={`text-[11px] font-semibold ${happened ? "text-emerald-400" : "text-muted-foreground/50"}`}>
                      {happened ? "✓ Arrivé" : "✕ Raté"}
                    </span>
                  ) : isSelected ? (
                    <span className="text-[11px] font-semibold text-primary">✓</span>
                  ) : null}
                </div>

                <p className="text-sm font-medium leading-snug">{it.description}</p>

                {/* Bottom reward */}
                {userPicked && isResolved && (
                  <div className="mt-3 flex items-center justify-between">
                    <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-semibold ${
                      happened
                        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                        : "border-red-500/20 bg-red-500/8 text-red-400"
                    }`}>
                      {happened ? "+500 AniCoins 🎯" : "Pas de gain"}
                    </span>
                  </div>
                )}

                {/* Selected glow ring */}
                {isSelected && !isClosed && (
                  <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-primary/30" />
                )}
              </div>
            )
          })}
        </div>

        {/* ── Error ── */}
        {error && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/8 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}
      </div>

      <style>{`
        @keyframes pageIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes heroZoom {
          from { transform: scale(1.03); }
          to   { transform: scale(1.07); }
        }
        @keyframes itemFadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  )
}

// ── Status badge ──────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    open:     "border-emerald-500/30 bg-emerald-500/15 text-emerald-400",
    resolved: "border-blue-500/30 bg-blue-500/15 text-blue-400",
    closed:   "border-border/50 bg-background/60 text-muted-foreground",
  }
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-sm ${styles[status] ?? styles.closed}`}>
      {status}
    </span>
  )
}