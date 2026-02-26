"use client"

import * as React from "react"
import { supabase } from "@/lib/supabase-client"

type Props = {
  /** Supabase Storage bucket name */
  bucket: "series" | "events" | "bingo"
  /** Current URL (shows preview) */
  currentUrl?: string | null
  /** Called when upload finishes with the public URL */
  onUpload: (url: string) => void
  /** Optional label */
  label?: string
  disabled?: boolean
}

type State = "idle" | "uploading" | "done" | "error"

export function ImageUpload({ bucket, currentUrl, onUpload, label = "Cover image", disabled }: Props) {
  const [preview, setPreview] = React.useState<string | null>(currentUrl ?? null)
  const [state, setState] = React.useState<State>("idle")
  const [errMsg, setErrMsg] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Sync external changes
  React.useEffect(() => {
    setPreview(currentUrl ?? null)
  }, [currentUrl])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return

    // Quick local preview
    const objectUrl = URL.createObjectURL(file)
    setPreview(objectUrl)
    setState("uploading")
    setErrMsg(null)

    try {
      const ext = file.name.split(".").pop() ?? "jpg"
      const path = `${bucket}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { error } = await supabase.storage
        .from(bucket)
        .upload(path, file, { upsert: true, contentType: file.type })

      if (error) throw error

      const { data } = supabase.storage.from(bucket).getPublicUrl(path)
      const publicUrl = data.publicUrl

      setPreview(publicUrl)
      setState("done")
      onUpload(publicUrl)
    } catch (err: any) {
      setState("error")
      setErrMsg(err?.message ?? "Upload échoué")
      setPreview(currentUrl ?? null)
    }
  }

  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">{label}</label>

      {/* Preview area */}
      <div
        onClick={() => !disabled && inputRef.current?.click()}
        className={`group relative mb-2 flex h-36 w-full cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition
          ${state === "error" ? "border-red-500/40 bg-red-500/5" : "border-border/50 bg-background/30 hover:border-primary/40 hover:bg-primary/5"}
          ${disabled ? "cursor-not-allowed opacity-50" : ""}
        `}
      >
        {preview ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview} alt="" className="h-full w-full object-cover" />
            {/* Overlay on hover */}
            {!disabled && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/50 opacity-0 transition group-hover:opacity-100">
                <span className="text-sm font-medium text-white">Changer</span>
                <span className="text-[10px] text-white/70">JPG, PNG, WEBP · max 5 MB</span>
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
            {state === "uploading" ? (
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            ) : (
              <>
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="opacity-50">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-[11px]">Clique pour uploader</span>
                <span className="text-[10px] opacity-60">JPG, PNG, WEBP · max 5 MB</span>
              </>
            )}
          </div>
        )}

        {/* Loading overlay when uploading over a preview */}
        {state === "uploading" && preview && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
            <div className="h-7 w-7 animate-spin rounded-full border-2 border-white border-t-transparent" />
          </div>
        )}
      </div>

      {/* Status */}
      {state === "done" && (
        <p className="text-[11px] text-emerald-400">✓ Image uploadée</p>
      )}
      {state === "error" && errMsg && (
        <p className="text-[11px] text-red-400">✕ {errMsg}</p>
      )}

      {/* Manual URL fallback */}
      <div className="mt-2 flex items-center gap-2">
        <input
          className="h-8 flex-1 rounded-lg border border-border/60 bg-background/30 px-2.5 text-[11px] outline-none transition focus:border-primary/40 placeholder:text-muted-foreground/50"
          placeholder="Ou colle une URL directement…"
          defaultValue={currentUrl ?? ""}
          disabled={disabled}
          onBlur={(e) => {
            const val = e.target.value.trim()
            if (val && val !== currentUrl) {
              setPreview(val)
              onUpload(val)
            }
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              const val = (e.target as HTMLInputElement).value.trim()
              if (val) { setPreview(val); onUpload(val) }
            }
          }}
        />
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="hidden"
        disabled={disabled}
        onChange={handleFile}
      />
    </div>
  )
}