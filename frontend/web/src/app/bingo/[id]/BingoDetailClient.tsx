"use client"

import { useEffect, useMemo, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"

type BingoCard = {
  id: number
  title: string
  status: string
  closes_at?: string
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

export default function BingoClient({ id }: { id: string }) {
  const [card, setCard] = useState<BingoCard | null>(null)
  const [items, setItems] = useState<BingoItem[]>([])
  const [myEntry, setMyEntry] = useState<BingoEntry | null>(null)

  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const token = useMemo(() => getToken(), []) // stable au mount

  useEffect(() => {
    if (!id || id === "undefined") {
      setError("ID invalide")
      return
    }

    let cancelled = false

    async function loadAll() {
      try {
        setError(null)

        // 1) card
        const rCard = await fetch(`/api/bingo/${encodeURIComponent(id)}`, { cache: "no-store" })
        const tCard = await rCard.text()
        if (!rCard.ok) throw new Error(tCard || `HTTP ${rCard.status}`)
        const cardJson = JSON.parse(tCard) as BingoCard
        if (cancelled) return
        setCard(cardJson)

        // 2) items
        const rItems = await fetch(`/api/bingo/${encodeURIComponent(id)}/items`, { cache: "no-store" })
        const tItems = await rItems.text()
        if (!rItems.ok) throw new Error(tItems || `HTTP ${rItems.status}`)
        const itemsJson = JSON.parse(tItems) as BingoItem[]
        if (cancelled) return
        setItems(itemsJson)

        // 3) my entry (si connecté)
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
          } else {
            // si token invalide, on n’empêche pas l’affichage
            // mais on affiche l’erreur si tu veux debug
            // throw new Error(tMe || `HTTP ${rMe.status}`)
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Erreur inconnue")
      }
    }

    loadAll()
    return () => {
      cancelled = true
    }
  }, [id, token])

  function toggle(itemId: number) {
    if (!token) {
      setError("Connecte-toi pour sélectionner (login).")
      return
    }

    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) {
        next.delete(itemId)
        return next
      }
      if (next.size >= 3) return next // max 3
      next.add(itemId)
      return next
    })
  }

  async function submit() {
    if (!token) {
      setError("Connecte-toi pour soumettre.")
      return
    }

    const selectedIds = Array.from(selected)
    if (selectedIds.length === 0) {
      setError("Sélectionne au moins 1 item.")
      return
    }
    if (selectedIds.length > 3) {
      setError("Maximum 3 items.")
      return
    }

    setSaving(true)
    setError(null)

    try {
      const res = await fetch(`/api/bingo/${encodeURIComponent(id)}/entry`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
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

  if (error) return <div className="p-10 text-red-400 whitespace-pre-wrap">{error}</div>
  if (!card) return <div className="p-10">Loading...</div>

  const selectedCount = selected.size

  return (
    <div className="p-10 space-y-6">
      <div>
        <h1 className="text-xl font-bold">{card.title}</h1>
        <p className="text-sm opacity-70">Status: {card.status}</p>
        {myEntry ? (
          <p className="text-sm opacity-70">Ta sélection enregistrée: {myEntry.selected_item_ids.length}/3</p>
        ) : token ? (
          <p className="text-sm opacity-70">Aucune sélection enregistrée pour l’instant.</p>
        ) : (
          <p className="text-sm opacity-70">Connecte-toi pour sélectionner et soumettre.</p>
        )}
      </div>

      <div className="flex items-center justify-between gap-4">
        <div className="text-sm opacity-80">
          Sélection: <span className="font-semibold">{selectedCount}</span>/3
        </div>
        <Button disabled={!token || saving || card.status !== "open" || selectedCount === 0} onClick={submit}>
          {saving ? "Enregistrement..." : "Soumettre"}
        </Button>
      </div>

      {/* Grid des propositions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {items.map((it) => {
          const isSelected = selected.has(it.id)
          return (
            <Card
              key={it.id}
              className={[
                "p-4 cursor-pointer select-none transition",
                isSelected ? "border-primary/60 bg-primary/10" : "hover:bg-muted/40",
              ].join(" ")}
              onClick={() => toggle(it.id)}
              role="button"
              aria-pressed={isSelected}
            >
              <div className="text-sm font-medium leading-snug">{it.description}</div>
              
              {isSelected && (
                <div className="mt-3 text-xs font-semibold opacity-90">✓ Sélectionné</div>
              )}
            </Card>
          )
        })}
      </div>

      <div className="text-xs opacity-60">
        Règle: max 3 items (comme le back). Si la card est fermée, le submit est bloqué.
      </div>
    </div>
  )
}