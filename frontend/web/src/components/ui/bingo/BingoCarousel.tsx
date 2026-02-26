"use client"

import * as React from "react"
import Link from "next/link"

export type BingoHeroItem = {
  id: string
  title: string
  series?: string
  imageUrl?: string
  href: string
  metaText?: string
}

export function BingoCarousel({ items }: { items: BingoHeroItem[] }) {
  const [index, setIndex] = React.useState(0)
  const [prevIdx, setPrevIdx] = React.useState<number | null>(null)
  const DURATION = 5000

  React.useEffect(() => {
    if (!items?.length) return
    const t = setInterval(() => navigate(1), DURATION)
    return () => clearInterval(t)
  }, [items, index])

  function navigate(dir: 1 | -1) {
    const next = (index + dir + items.length) % items.length
    setPrevIdx(index)
    setIndex(next)
    setTimeout(() => setPrevIdx(null), 500)
  }

  function goTo(i: number) {
    if (i === index) return
    setPrevIdx(index)
    setIndex(i)
    setTimeout(() => setPrevIdx(null), 500)
  }

  if (!items?.length) return null

  const current = items[index]
  const prevItem = prevIdx !== null ? items[prevIdx] : null

  return (
    <div className="overflow-hidden rounded-2xl border border-border/60">

      {/* ── Image + content ── */}
      <div className="relative h-[260px] w-full overflow-hidden sm:h-[320px]">

        {/* Outgoing */}
        {prevItem && (
          <div className="absolute inset-0" style={{ animation: "cfOut 0.5s ease forwards" }}>
            {prevItem.imageUrl
              ? <img src={prevItem.imageUrl} alt="" className="h-full w-full object-cover" />
              : <div className="h-full w-full bg-gradient-to-br from-primary/10 to-background/80" />}
          </div>
        )}

        {/* Current */}
        <div key={current.id} className="absolute inset-0" style={{ animation: prevItem ? "cfIn 0.5s ease forwards" : "none" }}>
          {current.imageUrl
            ? <img src={current.imageUrl} alt="" className="h-full w-full object-cover" style={{ animation: "kenBurns 6s ease forwards" }} />
            : <div className="h-full w-full bg-gradient-to-br from-primary/8 to-background/80" />}
        </div>

        {/* Gradient overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/15 to-transparent" />

        {/* Text */}
        <div className="absolute bottom-0 left-0 right-0 p-5 sm:p-6">
          <div key={current.id + "-text"} style={{ animation: "slideUp 0.4s ease 0.06s both" }}>
            {current.series && (
              <span className="mb-1.5 inline-block rounded-full border border-primary/30 bg-primary/15 px-2.5 py-0.5 text-[10px] font-semibold text-primary backdrop-blur-sm">
                {current.series}
              </span>
            )}
            <h2 className="text-lg font-bold leading-tight text-white sm:text-xl">
              {current.title}
            </h2>
            {current.metaText && (
              <p className="mt-0.5 text-xs text-white/50">{current.metaText}</p>
            )}
            <Link
              href={current.href}
              className="mt-3 inline-flex h-8 items-center gap-1.5 rounded-xl border border-white/20 bg-white/10 px-4 text-xs font-medium text-white backdrop-blur-sm transition hover:bg-white/20"
            >
              Jouer →
            </Link>
          </div>
        </div>

        {/* Arrows */}
        {items.length > 1 && (
          <>
            <button
              onClick={() => navigate(-1)}
              className="absolute left-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/30 text-sm text-white/70 backdrop-blur-sm transition hover:bg-black/50 hover:text-white"
            >
              ‹
            </button>
            <button
              onClick={() => navigate(1)}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-black/30 text-sm text-white/70 backdrop-blur-sm transition hover:bg-black/50 hover:text-white"
            >
              ›
            </button>
          </>
        )}
      </div>

      {/* Dots */}
      {items.length > 1 && (
        <div className="flex items-center justify-center gap-1.5 border-t border-border/40 bg-card/40 py-2.5 backdrop-blur-sm">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => goTo(i)}
              className={`rounded-full transition-all duration-300 ${
                i === index
                  ? "h-2 w-5 bg-primary"
                  : "h-2 w-2 bg-border/60 hover:bg-border"
              }`}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes cfIn     { from { opacity: 0 } to { opacity: 1 } }
        @keyframes cfOut    { from { opacity: 1 } to { opacity: 0 } }
        @keyframes kenBurns { from { transform: scale(1.03) } to { transform: scale(1.07) } }
        @keyframes slideUp  { from { opacity: 0; transform: translateY(8px) } to { opacity: 1; transform: translateY(0) } }
      `}</style>
    </div>
  )
}