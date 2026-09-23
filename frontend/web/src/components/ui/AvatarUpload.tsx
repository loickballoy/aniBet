"use client"

import * as React from "react"

type Props = {
  username: string
  currentUrl?: string | null
  token: string
  API: string
  onSaved: (url: string) => void
}

export function AvatarUpload({ username, currentUrl, token, API, onSaved }: Props) {
  const [preview, setPreview] = React.useState<string | null>(currentUrl ?? null)
  const [urlInput, setUrlInput] = React.useState("")
  const [saving, setSaving] = React.useState(false)
  const [errMsg, setErrMsg] = React.useState<string | null>(null)
  const letter = username?.[0]?.toUpperCase() ?? "?"

  React.useEffect(() => { setPreview(currentUrl ?? null) }, [currentUrl])

  async function saveUrl(url: string) {
    if (!url.trim()) return
    setSaving(true)
    setErrMsg(null)
    try {
      const res = await fetch(`${API}/auth/change-avatar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ pfp_url: url.trim() }),
      })
      if (!res.ok) throw new Error((await res.json())?.detail ?? "Erreur backend")

      setPreview(url.trim())
      setUrlInput("")
      onSaved(url.trim())
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Échec de la mise à jour"
      setErrMsg(message)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="flex items-center gap-3">
      {/* Avatar circle */}
      <div className="h-[72px] w-[72px] shrink-0 overflow-hidden rounded-full ring-2 ring-primary/30">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/20 text-2xl font-bold text-primary">
            {letter}
          </div>
        )}
      </div>

      {/* URL input — l'upload de fichier direct dépendait de Supabase Storage,
          retiré (compte perdu). Solution provisoire en attendant une vraie
          solution de stockage de fichiers pour le déploiement. */}
      <div className="flex-1">
        <label className="mb-1 block text-[11px] font-medium text-muted-foreground">
          Colle une URL d&apos;image
        </label>
        <div className="flex gap-1.5">
          <input
            className="h-8 flex-1 rounded-lg border border-border/60 bg-background/30 px-2.5 text-[11px] outline-none transition focus:border-primary/40"
            placeholder="https://…"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            disabled={saving}
            onKeyDown={(e) => { if (e.key === "Enter") saveUrl(urlInput) }}
          />
          <button
            type="button"
            onClick={() => saveUrl(urlInput)}
            disabled={saving || !urlInput.trim()}
            className="rounded-lg bg-primary px-2.5 text-[11px] font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
          >
            {saving ? "…" : "OK"}
          </button>
        </div>
        {errMsg && <p className="mt-1 text-[10px] text-red-400">{errMsg}</p>}
      </div>
    </div>
  )
}