"use client"

import * as React from "react"

type Props = {
  bucket: "series" | "events" | "bingo"
  /** Current URL (shows preview) */
  currentUrl?: string | null
  /** Called when the URL is set */
  onUpload: (url: string) => void
  /** Optional label */
  label?: string
  disabled?: boolean
}

export function ImageUpload({ currentUrl, onUpload, label = "Cover image", disabled }: Props) {
  const [preview, setPreview] = React.useState<string | null>(currentUrl ?? null)

  // Sync external changes
  React.useEffect(() => {
    setPreview(currentUrl ?? null)
  }, [currentUrl])

  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">{label}</label>

      {/* Preview area — not clickable: direct file upload depended on
          Supabase Storage (account lost), removed. Only URL input works
          for now, until a real storage solution is set up for deployment. */}
      <div className="mb-2 flex h-36 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-border/50 bg-background/30">
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex flex-col items-center gap-1.5 text-muted-foreground">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" className="opacity-50">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[11px]">Paste an image URL below</span>
          </div>
        )}
      </div>

      {/* URL input */}
      <div className="flex items-center gap-2">
        <input
          className="h-8 flex-1 rounded-lg border border-border/60 bg-background/30 px-2.5 text-[11px] outline-none transition focus:border-primary/40 placeholder:text-muted-foreground/50"
          placeholder="https://…"
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
    </div>
  )
}