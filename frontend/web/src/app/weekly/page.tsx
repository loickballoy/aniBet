"use client"

import * as React from "react"
import Link from "next/link"
import { SiteHeader } from "@/components/ui/layout/SiteHeader"
import { GuestCta } from "@/components/ui/GuestCta"
import { loadGuestProgress, saveGuestProgress } from "@/lib/guestPlay"

type Character = { id: number; name: string; image_url: string }
type Puzzle = { id: number; week_of: string; grid: Character[] }
type Attempt = {
  mistakes: number
  found_categories: string[]
  solved: boolean | null
} | null
type RevealedCategory = { label: string; character_ids: number[] }
type GuestWeekly = { mistakes: number; found: RevealedCategory[]; solved: boolean | null; revealed: RevealedCategory[] | null }

const MAX_MISTAKES = 5 // doit rester synchro avec weekly_utils.py côté backend

const CATEGORY_COLORS = [
  "border-emerald-500/50 bg-emerald-500/10 text-emerald-400",
  "border-cyan-500/50 bg-cyan-500/10 text-cyan-400",
  "border-yellow-500/50 bg-yellow-500/10 text-yellow-400",
  "border-purple-500/50 bg-purple-500/10 text-purple-400",
]

export default function AniConnectionsPage() {
  const [token, setToken] = React.useState("")
  const [isGuest, setIsGuest] = React.useState(false)
  // Groupes déjà trouvés, avec leurs personnages : indispensable pour les
  // retirer de la grille et afficher leurs noms PENDANT la partie.
  const [foundGroups, setFoundGroups] = React.useState<RevealedCategory[]>([])
  const [loading, setLoading] = React.useState(true)
  const [puzzle, setPuzzle] = React.useState<Puzzle | null>(null)
  const [attempt, setAttempt] = React.useState<Attempt>(null)
  const [revealedCategories, setRevealedCategories] = React.useState<RevealedCategory[] | null>(null)
  const [selected, setSelected] = React.useState<number[]>([])
  const [submitting, setSubmitting] = React.useState(false)
  const [wrongFlash, setWrongFlash] = React.useState<number[]>([])
  const [error, setError] = React.useState<string | null>(null)

  const API = process.env.NEXT_PUBLIC_API_URL ?? ""

  async function load(t: string | null) {
    const res = await fetch(`${API}/weekly-connections/current`, { headers: t ? { Authorization: `Bearer ${t}` } : {} })
    if (res.status === 404) { setPuzzle(null); return }
    const data = await res.json()
    setPuzzle(data.puzzle)
    if (t) {
      setAttempt(data.attempt)
      setRevealedCategories(data.revealed_categories)
      setFoundGroups(data.found_groups ?? [])
      return
    }
    const saved = loadGuestProgress<GuestWeekly>("weekly", data.puzzle.id)
    setAttempt(saved ? { mistakes: saved.mistakes, found_categories: saved.found.map((f) => f.label), solved: saved.solved } : null)
    setFoundGroups(saved?.found ?? [])
    setRevealedCategories(saved?.revealed ?? null)
  }

  React.useEffect(() => {
    const t = localStorage.getItem("access_token")
    // Sans token : on joue en invité au lieu de renvoyer vers la connexion.
    setToken(t ?? "")
    setIsGuest(!t)
    load(t).finally(() => setLoading(false))
  }, [])

  const concluded = attempt?.solved != null
  const foundLabels = attempt?.found_categories ?? []

  // Personnages restant à trouver : tout le grid moins ceux déjà dans une
  // catégorie trouvée. Une fois conclu, on n'affiche plus la grille libre.
  const foundCharacterIds = React.useMemo(
    () => new Set(foundGroups.flatMap((g) => g.character_ids)),
    [foundGroups],
  )

  const remainingGrid = puzzle
    ? puzzle.grid.filter((ch) => !foundCharacterIds.has(ch.id))
    : []

  function toggleSelect(id: number) {
    if (submitting || concluded) return
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id)
      if (prev.length >= 4) return prev
      return [...prev, id]
    })
  }

  async function submitGuess() {
    if (selected.length !== 4 || submitting) return
    setSubmitting(true)
    setError(null)
    const guessedIds = [...selected]
    try {
      if (isGuest && puzzle) {
        const res = await fetch(`${API}/weekly-connections/current/guest-guess`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ character_ids: guessedIds }),
        })
        if (!res.ok) throw new Error((await res.json())?.detail ?? "Something went wrong")
        const data = await res.json()

        if (!data.guess_correct) {
          setWrongFlash(guessedIds)
          await new Promise((r) => setTimeout(r, 700))
          setWrongFlash([])
        }
        const found = data.guess_correct
          ? [...foundGroups, { label: data.matched_category, character_ids: guessedIds }]
          : foundGroups
        const mistakes = (attempt?.mistakes ?? 0) + (data.guess_correct ? 0 : 1)
        const solved = found.length === 4 ? true : mistakes >= MAX_MISTAKES ? false : null
        const revealed: RevealedCategory[] | null = solved === null ? null
          : await fetch(`${API}/weekly-connections/current/guest-reveal`).then((r) => r.json()).catch(() => null)

        setFoundGroups(found)
        setAttempt({ mistakes, found_categories: found.map((f) => f.label), solved })
        setRevealedCategories(revealed)
        setSelected([])
        saveGuestProgress("weekly", puzzle.id, { mistakes, found, solved, revealed })
        return
      }
      const res = await fetch(`${API}/weekly-connections/current/guess`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ character_ids: guessedIds }),
      })
      if (!res.ok) throw new Error((await res.json())?.detail ?? "Something went wrong")
      const data = await res.json()

      if (data.guess_correct) {
        setSelected([])
        await load(token)
      } else {
        // Les 4 tuiles restent visibles en rouge le temps du flash, puis
        // on rafraîchit (met à jour la jauge de fautes) et on désélectionne.
        setWrongFlash(guessedIds)
        await new Promise((r) => setTimeout(r, 700))
        setWrongFlash([])
        setSelected([])
        await load(token)
      }
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

  if (!puzzle) {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto flex min-h-[60vh] w-full max-w-lg flex-col items-center justify-center px-4 text-center">
          <p className="text-sm text-muted-foreground">No AniConnections puzzle this week.</p>
          <Link href="/" className="mt-3 text-sm text-primary hover:underline">← Back home</Link>
        </main>
      </>
    )
  }

  // Catégories trouvées, dans l'ordre où elles ont été trouvées, avec leurs
  // couleurs et les vrais personnages (noms) pour l'affichage.
  const foundCategoryDetails = foundLabels.map((label, i) => {
    const cat = foundGroups.find((c) => c.label === label)
    const characters = cat ? puzzle.grid.filter((ch) => cat.character_ids.includes(ch.id)) : []
    return { label, characters, colorClass: CATEGORY_COLORS[i % CATEGORY_COLORS.length] }
  })

  const tileColorById = (() => {
    const map = new Map<number, string>()
    foundCategoryDetails.forEach((fc) => {
        fc.characters.forEach((ch) => map.set(ch.id, fc.colorClass))
    })
    return map
  }) ()

const assignedIds = (
  () => new Set(Array.from(tileColorById.keys()))
)

  // Une fois raté, on révèle aussi les catégories jamais trouvées.
  const missedCategories = concluded && attempt?.solved === false
    ? (revealedCategories ?? []).filter((c) => !foundLabels.includes(c.label))
    : []

  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-lg px-4 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-bold tracking-tight">AniConnections</h1>
          <Link href="/" className="text-xs text-muted-foreground hover:text-foreground transition-colors">← Back</Link>
        </div>

        {isGuest && !concluded && <GuestCta variant="banner" />}
        {!concluded && (
          <div className="mb-4 flex items-center justify-between text-xs text-muted-foreground">
            <span>Find the 4 groups of 4</span>
            <div className="flex gap-1">
              {Array.from({ length: MAX_MISTAKES }).map((_, i) => (
                <span key={i} className={`h-2 w-2 rounded-full ${i < (attempt?.mistakes ?? 0) ? "bg-red-500/70" : "bg-border"}`} />
              ))}
            </div>
          </div>
        )}

        {/* Catégories déjà trouvées */}
        {foundCategoryDetails.length > 0 && (
          <div className="mb-3 space-y-2">
            {foundCategoryDetails.map((fc) => (
              <div key={fc.label} className={`rounded-xl border p-3 text-center ${fc.colorClass}`}>
                <p className="text-xs font-semibold uppercase tracking-wide">{fc.label}</p>
                <p className="mt-0.5 text-[11px] opacity-80">{fc.characters.map((c) => c.name).join(", ")}</p>
              </div>
            ))}
          </div>
        )}

        {/* Catégories manquées (révélées après un échec) */}
        {missedCategories.length > 0 && (
          <div className="mb-3 space-y-2">
            {missedCategories.map((mc, i) => (
              <div key={mc.label} className="rounded-xl border border-border/50 bg-background/30 p-3 text-center opacity-70">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{mc.label}</p>
                <p className="mt-0.5 text-[11px] text-muted-foreground">
                  {puzzle.grid.filter((ch) => mc.character_ids.includes(ch.id)).map((c) => c.name).join(", ")}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* Grille des personnages restants */}
        {!concluded && remainingGrid.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            {remainingGrid.map((ch) => {
              const isSelected = selected.includes(ch.id)
              const isWrongFlash = wrongFlash.includes(ch.id)
              const assignedClass = tileColorById.get(ch.id)
              const isAssigned = Boolean(assignedClass)

              return (
                <button
                  key={ch.id}
                  onClick={() => toggleSelect(ch.id)}
                  disabled={submitting || wrongFlash.length > 0}
                  className={`group relative aspect-square overflow-hidden rounded-xl border-2 transition ${
                    isAssigned ? assignedClass : isWrongFlash ? "border-red-500" : isSelected ? "border-primary" : "border-border/60 hover:border-border"
                  }`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={ch.image_url} alt="" className="h-full w-full object-cover" />
                  <div className={`absolute inset-0 flex items-end bg-gradient-to-t from-black/80 via-black/10 to-transparent p-1.5 transition ${
                    isWrongFlash ? "bg-red-500/40" : isSelected ? "bg-primary/30" : ""
                  }`}>
                    <span className="text-[10px] font-medium text-white leading-tight">{ch.name}</span>
                  </div>
                </button>
              )
            })}
          </div>
        )}

        {!concluded && (
          <>
            <button
              onClick={submitGuess}
              disabled={selected.length !== 4 || submitting}
              className="mt-4 w-full rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-50"
            >
              {submitting ? "…" : selected.length === 4 ? "Submit guess" : `Select ${4 - selected.length} more`}
            </button>
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          </>
        )}

        {concluded && (
          <div className="mt-2 text-center">
            {attempt?.solved ? (
              <p className="text-lg font-semibold text-emerald-400">✓ Solved!</p>
            ) : (
              <p className="text-lg font-semibold text-red-400">✕ Out of guesses</p>
            )}
            {isGuest && <GuestCta variant="after" />}
            <Link href="/" className="mt-3 inline-block text-sm text-primary hover:underline">Back home</Link>
          </div>
        )}
      </main>
    </>
  )
}