"use client"

import * as React from "react"
import { supabase } from "@/lib/supabase-client"

type Props = {
  username: string
  currentUrl?: string | null
  token: string
  API: string
  onSaved: (url: string) => void
}

type State = "idle" | "uploading" | "error"

export function AvatarUpload({ username, currentUrl, token, API, onSaved }: Props) {
  const [preview, setPreview] = React.useState<string | null>(currentUrl ?? null)
  const [state, setState] = React.useState<State>("idle")
  const [errMsg, setErrMsg] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const letter = username?.[0]?.toUpperCase() ?? "?"

  React.useEffect(() => { setPreview(currentUrl ?? null) }, [currentUrl])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Instant local preview
    setPreview(URL.createObjectURL(file))
    setState("uploading")
    setErrMsg(null)

    try {
      const ext  = file.name.split(".").pop() ?? "jpg"
      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from("avatars").getPublicUrl(path)
      const publicUrl = data.publicUrl

      // Persist to backend
      const res = await fetch(`${API}/auth/change-avatar`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ avatar_url: publicUrl }),
      })
      if (!res.ok) throw new Error((await res.json())?.detail ?? "Erreur backend")

      setPreview(publicUrl)
      setState("idle")
      onSaved(publicUrl)
    } catch (err: any) {
      setState("error")
      setErrMsg(err?.message ?? "Upload échoué")
      setPreview(currentUrl ?? null)
    }
  }

  return (
    <div className="group relative" style={{ width: 72, height: 72 }}>
      {/* Avatar circle */}
      <div className="h-full w-full overflow-hidden rounded-full ring-2 ring-primary/30">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center rounded-full bg-primary/20 text-2xl font-bold text-primary">
            {letter}
          </div>
        )}
      </div>

      {/* Hover overlay with camera icon */}
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={state === "uploading"}
        className="absolute inset-0 flex flex-col items-center justify-center gap-0.5 rounded-full bg-black/0 opacity-0 transition-all group-hover:bg-black/50 group-hover:opacity-100 disabled:cursor-wait"
      >
        {state === "uploading" ? (
          <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
        ) : (
          <>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white">
              <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
            </svg>
            <span className="text-[9px] font-semibold text-white">Modifier</span>
          </>
        )}
      </button>

      {/* Error tooltip */}
      {state === "error" && errMsg && (
        <div className="absolute -bottom-7 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-red-500/90 px-2 py-0.5 text-[10px] text-white shadow">
          {errMsg}
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={handleFile}
      />
    </div>
  )
}