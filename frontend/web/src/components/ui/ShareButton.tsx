"use client"

import * as React from "react"

// Partage natif sur mobile (feuille de partage du téléphone), copie dans le
// presse-papiers ailleurs. Le texte vient de lib/share.ts.
export function ShareButton({
  text,
  label = "Share result",
  className = "",
}: {
  text: string
  label?: string
  className?: string
}) {
  const [copied, setCopied] = React.useState(false)

  async function share() {
    // Feuille de partage seulement sur appareils tactiles : sur desktop,
    // Chrome/Edge l'ouvrent aussi mais la copie est plus pratique.
    const touch = typeof window !== "undefined" && window.matchMedia("(pointer: coarse)").matches
    if (touch && navigator.share) {
      try {
        await navigator.share({ text })
        return
      } catch {
        // annulé par l'utilisateur ou refusé : on retombe sur la copie
      }
    }
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // presse-papiers indisponible (http, permissions) : rien de mieux à faire
    }
  }

  return (
    <button
      type="button"
      onClick={share}
      className={`inline-flex items-center justify-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary transition hover:bg-primary/20 ${className}`}
    >
      {copied ? "✓ Copied — paste it anywhere" : <>↗ {label}</>}
    </button>
  )
}
