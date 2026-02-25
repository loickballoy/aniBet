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

  React.useEffect(() => {
    if (!items?.length) return
    const t = setInterval(() => setIndex((i) => (i + 1) % items.length), 4500)
    return () => clearInterval(t)
  }, [items])

  if (!items?.length) return null
  const m = items[index]

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      <div className="grid gap-4 md:grid-cols-[1.4fr_1fr]">
        <div className="relative overflow-hidden rounded-2xl border border-border/70 bg-background/30">
          {m.imageUrl ? (
            <div className="relative h-[220px] w-full sm:h-[260px] md:h-[300px]">
              {/* ✅ <img> pour éviter next/image remotePatterns */}
              <img src={m.imageUrl} alt="" className="h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/45 via-black/0 to-black/0" />
            </div>
          ) : (
            <div className="flex h-[220px] w-full items-center justify-center sm:h-[260px] md:h-[300px]">
              <div className="text-sm text-muted-foreground">No cover</div>
            </div>
          )}
        </div>

        <div className="flex flex-col justify-between gap-3">
          <div>
            {m.series ? <div className="text-xs text-muted-foreground">{m.series}</div> : null}
            <div className="mt-1 text-lg font-semibold leading-snug">{m.title}</div>
            {m.metaText ? (
              <div className="mt-2 text-sm text-muted-foreground">{m.metaText}</div>
            ) : null}
          </div>

          {/* ✅ 1 bouton simple "Ouvrir" */}
          <Link
            href={m.href}
            className="h-10 rounded-xl border border-border/70 bg-background/30 px-4 text-center text-sm font-medium leading-10 hover:bg-muted"
          >
            Ouvrir
          </Link>

          {/* Dots */}
          <div className="flex gap-2">
            {items.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setIndex(i)}
                className={`h-2 w-2 rounded-full ${i === index ? "bg-primary" : "bg-muted"}`}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}