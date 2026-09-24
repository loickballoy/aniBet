"use client"

import * as React from "react"

type Kind = "avatar" | "series" | "event" | "bingo"

type Props = {
  kind: Kind
  currentUrl?: string | null
  /** Whether the current viewer is allowed to change this image.
   *  e.g. false when looking at someone else's avatar on the leaderboard. */
  editable: boolean
  token: string
  API: string
  onUploaded: (url: string) => void
  /** "circle" for avatars, "cover" for series/event/bingo covers */
  shape?: "circle" | "cover"
  /** Fallback shown when there's no image (e.g. first letter of a username) */
  placeholder?: React.ReactNode
  className?: string
}

const MAX_FILE_SIZE_MB = 5

export function EditableImage({
  kind,
  currentUrl,
  editable,
  token,
  API,
  onUploaded,
  shape = "cover",
  placeholder,
  className = "",
}: Props) {
  const [preview, setPreview] = React.useState<string | null>(currentUrl ?? null)
  const [uploading, setUploading] = React.useState(false)
  const [error, setError] = React.useState<string | null>(null)
  const inputRef = React.useRef<HTMLInputElement>(null)

  React.useEffect(() => {
    setPreview(currentUrl ?? null)
  }, [currentUrl])

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-selecting the same file later
    if (!file) return

    if (!["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type)) {
      setError("Unsupported file type (JPEG, PNG, WEBP, GIF only)")
      return
    }
    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      setError(`File too large (max ${MAX_FILE_SIZE_MB} MB)`)
      return
    }

    const localPreview = URL.createObjectURL(file)
    setPreview(localPreview)
    setUploading(true)
    setError(null)

    try {
      // 1. Ask the backend for a presigned upload URL
      const presignRes = await fetch(`${API}/uploads/presign`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ kind, content_type: file.type }),
      })
      if (!presignRes.ok) {
        const body = await presignRes.json().catch(() => null)
        throw new Error(body?.detail ?? "Could not get an upload URL")
      }
      const { upload_url, public_url } = await presignRes.json()

      // 2. Upload the file DIRECTLY to R2 — the backend is never in the
      //    path of the actual bytes, just handed the presigned URL.
      const uploadRes = await fetch(upload_url, {
        method: "PUT",
        headers: { "Content-Type": file.type },
        body: file,
      })
      if (!uploadRes.ok) throw new Error("Upload to storage failed")

      setPreview(public_url)
      onUploaded(public_url)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Upload failed")
      setPreview(currentUrl ?? null)
    } finally {
      setUploading(false)
      URL.revokeObjectURL(localPreview)
    }
  }

  const isCircle = shape === "circle"
  const wrapperShape = isCircle ? "rounded-full" : "rounded-xl"

  return (
    <div>
      <div
        className={`group relative overflow-hidden ${wrapperShape} ${
          editable ? "cursor-pointer" : ""
        } ${className}`}
        onClick={() => editable && !uploading && inputRef.current?.click()}
      >
        {preview ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={preview} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-primary/15 text-primary">
            {placeholder}
          </div>
        )}

        {/* Hover overlay — only rendered at all when editable, so there's
            zero risk of it ever showing on someone else's image (e.g. a
            leaderboard entry) no matter what CSS does. */}
        {editable && (
          <div
            className={`absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/0 opacity-0 transition-all
              ${!uploading ? "group-hover:bg-black/55 group-hover:opacity-100" : "bg-black/55 opacity-100"}`}
          >
            {uploading ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white border-t-transparent" />
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-white">
                  <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  <circle cx="12" cy="13" r="4" stroke="currentColor" strokeWidth="2"/>
                </svg>
                {!isCircle && <span className="text-[10px] font-semibold text-white">Change</span>}
              </>
            )}
          </div>
        )}
      </div>

      {editable && (
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="hidden"
          onChange={handleFile}
        />
      )}

      {error && <p className="mt-1 text-[10px] text-red-400">{error}</p>}
    </div>
  )
}