"use client"

import * as React from "react"

const FORBIDDEN = /[^a-zA-Z0-9_\-\.]/
function validate(val: string): string | null {
  if (val.length < 3)  return "Au moins 3 caractères"
  if (val.length > 24) return "Maximum 24 caractères"
  if (FORBIDDEN.test(val)) return "Lettres, chiffres, _ - . uniquement"
  return null
}

type Props = {
  current: string
  token: string
  API: string
  onSaved: (newUsername: string) => void
}

export function UsernameEditor({ current, token, API, onSaved }: Props) {
  const [editing, setEditing] = React.useState(false)
  const [value,   setValue]   = React.useState(current)
  const [loading, setLoading] = React.useState(false)
  const [error,   setError]   = React.useState<string | null>(null)
  const [success, setSuccess] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    if (editing) { setValue(current); setTimeout(() => inputRef.current?.focus(), 50) }
  }, [editing])

  const validationError = value !== current ? validate(value) : null
  const canSave = !loading && !validationError && value !== current && value.length >= 3

  async function save() {
    const err = validate(value)
    if (err) { setError(err); return }
    if (value === current) { setEditing(false); return }

    setLoading(true); setError(null)
    try {
      const res = await fetch(`${API}/auth/change-username`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ new_username: value }),
      })
      if (!res.ok) throw new Error((await res.json())?.detail ?? "Erreur")
      setEditing(false)
      setSuccess(true)
      onSaved(value)
      setTimeout(() => setSuccess(false), 3000)
    } catch (e: any) {
      setError(e?.message ?? "Erreur")
    } finally {
      setLoading(false)
    }
  }

  function cancel() { setEditing(false); setError(null); setValue(current) }

  if (!editing) {
    return (
      <div className="flex items-center gap-2.5">
        <h1 className="text-2xl font-bold tracking-tight">{current}</h1>
        {success && (
          <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] text-emerald-400">
            ✓ Mis à jour
          </span>
        )}
        <button
          onClick={() => setEditing(true)}
          className="rounded-lg border border-border/60 px-2 py-1 text-[11px] text-muted-foreground transition hover:border-primary/40 hover:text-primary"
        >
          ✏️ Modifier
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground select-none">@</span>
          <input
            ref={inputRef}
            className="h-9 w-48 rounded-xl border border-border/70 bg-background/40 pl-6 pr-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 disabled:opacity-50"
            value={value}
            onChange={(e) => { setValue(e.target.value.trim()); setError(null) }}
            onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") cancel() }}
            maxLength={24}
            disabled={loading}
          />
        </div>
        <button
          onClick={save}
          disabled={!canSave}
          className="h-9 rounded-xl bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:opacity-90 disabled:opacity-40"
        >
          {loading ? "…" : "Sauver"}
        </button>
        <button
          onClick={cancel}
          disabled={loading}
          className="h-9 rounded-xl border border-border/60 px-3 text-xs text-muted-foreground transition hover:text-foreground"
        >
          Annuler
        </button>
      </div>

      {(error || validationError) && (
        <p className="text-[11px] text-red-400">{error ?? validationError}</p>
      )}
      <p className="text-[10px] text-muted-foreground opacity-60">Entrée pour sauver · Échap pour annuler</p>
    </div>
  )
}