"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

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

export default function BingoClient({ id }: { id: string }) {
  const [card, setCard] = useState<BingoCard | null>(null)
  const [items, setItems] = useState<BingoItem[]>([])
  const [myEntry, setMyEntry] = useState<BingoEntry | null>(null)
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

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

  if (error) return <div className="p-10 text-red-400">{error}</div>
  if (!card) return (
    <div className="flex h-[50vh] items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )

  const isClosed = card.status !== "open"
  const isResolved = card.status === "resolved"
  const selectedCount = selected.size

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-8 space-y-6">

      {/* ── Hero cover ── */}
      <div className={`relative overflow-hidden rounded-3xl border border-border/60 ${card.cover_url ? "" : "bg-card/60 p-6"}`}>
        {card.cover_url ? (
          <>
            <div className="relative h-48 sm:h-64 w-full overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={card.cover_url} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
            </div>
            <div className="absolute bottom-0 left-0 right-0 p-5">
              <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                  <h1 className="text-2xl font-bold text-white leading-tight">{card.title}</h1>
                  {card.closes_at && (
                    <p className="mt-1 text-sm text-white/60">Clôture : {formatDate(card.closes_at)}</p>
                  )}
                </div>
                <span className={`rounded-full border px-3 py-1 text-xs font-semibold backdrop-blur-sm ${
                  card.status === "open"  ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                  : card.status === "resolved" ? "border-blue-500/40 bg-blue-500/20 text-blue-300"
                  : "border-white/20 bg-white/10 text-white/70"
                }`}>{card.status}</span>
              </div>
            </div>
          </>
        ) : (
          /* Pas de cover : layout texte classique */
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">{card.title}</h1>
              {card.closes_at && (
                <p className="mt-1 text-sm text-muted-foreground">Clôture : {formatDate(card.closes_at)}</p>
              )}
            </div>
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${
              card.status === "open"  ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
              : card.status === "resolved" ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
              : "border-border/60 text-muted-foreground"
            }`}>{card.status}</span>
          </div>
        )}
      </div>

      {/* ── Statut participation ── */}
      {myEntry ? (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-400">
          ✓ Participation enregistrée · {myEntry.selected_item_ids.length} item{myEntry.selected_item_ids.length > 1 ? "s" : ""} sélectionné{myEntry.selected_item_ids.length > 1 ? "s" : ""}
          {isResolved && myEntry.score != null && (
            <span className="ml-2 font-semibold">· Score : {myEntry.score} · {myEntry.coins_earned ?? 0} AniCoins 🎯</span>
          )}
        </div>
      ) : !token ? (
        <div className="rounded-2xl border border-border/50 bg-card/40 px-4 py-3 text-sm text-muted-foreground">
          <a href="/login" className="text-primary hover:underline">Connecte-toi</a> pour participer.
        </div>
      ) : isClosed ? (
        <div className="rounded-2xl border border-border/50 bg-card/40 px-4 py-3 text-sm text-muted-foreground">
          Ce bingo est fermé — les participations ne sont plus acceptées.
        </div>
      ) : null}

      {/* ── Barre d'action ── */}
      {!isClosed && token && (
        <div className="flex items-center justify-between gap-4 rounded-2xl border border-border/60 bg-card/60 px-4 py-3">
          <span className="text-sm text-muted-foreground">
            Sélection : <span className="font-semibold text-foreground">{selectedCount}</span>/3
          </span>
          <Button
            disabled={saving || selectedCount === 0}
            onClick={submit}
            className="h-9"
          >
            {saving ? "Enregistrement…" : myEntry ? "Mettre à jour" : `Valider (${selectedCount}/3)`}
          </Button>
        </div>
      )}

      {/* ── Grille items ── */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {items.map((it) => {
          const isSelected = selected.has(it.id)
          const userPicked = myEntry?.selected_item_ids.includes(it.id)
          const happened = isResolved && it.did_happen === true
          const didntHappen = isResolved && it.did_happen === false

          return (
            <div
              key={it.id}
              onClick={() => !isClosed && toggle(it.id)}
              className={[
                "relative rounded-2xl border p-4 transition select-none",
                isClosed ? "cursor-default" : "cursor-pointer",
                happened && userPicked  ? "border-emerald-500/40 bg-emerald-500/10"
                : happened              ? "border-emerald-500/20 bg-emerald-500/5"
                : didntHappen && userPicked ? "border-red-500/30 bg-red-500/8"
                : didntHappen           ? "border-border/40 opacity-50"
                : isSelected            ? "border-primary/50 bg-primary/10"
                : "border-border/60 bg-card/60 hover:border-primary/30 hover:bg-primary/5",
              ].filter(Boolean).join(" ")}
            >
              <p className="text-sm font-medium leading-snug">{it.description}</p>

              <div className="mt-3 flex items-center justify-between gap-2">
                {isResolved ? (
                  <span className={`text-[11px] font-semibold ${happened ? "text-emerald-400" : "text-muted-foreground"}`}>
                    {happened ? "✓ C'est arrivé" : "✕ Pas arrivé"}
                  </span>
                ) : isSelected ? (
                  <span className="text-[11px] font-semibold text-primary">✓ Sélectionné</span>
                ) : (
                  <span className="text-[11px] opacity-0">—</span>
                )}

                {userPicked && isResolved && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                    happened ? "bg-emerald-500/15 text-emerald-400" : "bg-red-500/10 text-red-400"
                  }`}>
                    {happened ? "+500 pts 🎯" : "Raté"}
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>

      {error && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  )
}