"use client"

import * as React from "react"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

type Series = {
  id: number
  name: string
  slug: string
  cover_url: string | null
}

const PLACEHOLDER_GRADIENTS = [
  "from-violet-600/30 to-indigo-600/20",
  "from-rose-600/30 to-orange-500/20",
  "from-emerald-600/30 to-teal-500/20",
  "from-amber-500/30 to-yellow-400/20",
  "from-cyan-600/30 to-blue-500/20",
  "from-pink-600/30 to-fuchsia-500/20",
]

export function SeriesStrip({ series }: { series: Series[] }) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const activeSeries = searchParams.get("series_id") ? Number(searchParams.get("series_id")) : null

  if (!series.length) return null

  function handleClick(id: number) {
    if (activeSeries === id) {
      // deselect
      router.push("/")
    } else {
      router.push(`/?series_id=${id}`)
    }
  }

  return (
    <section className="mt-10">
      <div className="mb-4 flex items-end justify-between">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold">Séries</h3>
          {activeSeries && (
            <button
              onClick={() => router.push("/")}
              className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] text-primary transition hover:bg-primary/20"
            >
              {series.find((s) => s.id === activeSeries)?.name}
              <span className="opacity-60">×</span>
            </button>
          )}
        </div>
        <span className="text-xs text-muted-foreground">{series.length} série{series.length > 1 ? "s" : ""}</span>
      </div>

      <div className="relative">
        {/* Right fade */}
        <div className="pointer-events-none absolute right-0 top-0 z-10 h-full w-12 bg-gradient-to-l from-background to-transparent" />

        <div className="flex gap-3 overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          {series.map((s, i) => {
            const isActive = activeSeries === s.id
            const gradient = PLACEHOLDER_GRADIENTS[i % PLACEHOLDER_GRADIENTS.length]

            return (
              <button
                key={s.id}
                type="button"
                onClick={() => handleClick(s.id)}
                className="group relative flex-shrink-0 w-32 sm:w-36 text-left focus:outline-none"
              >
                {/* Cover */}
                <div className={`relative h-44 sm:h-52 w-full overflow-hidden rounded-2xl border-2 transition duration-200
                  ${isActive
                    ? "border-primary shadow-lg shadow-primary/20"
                    : "border-border/60 hover:border-primary/40 hover:shadow-md hover:shadow-primary/10"
                  }`}>
                  {s.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={s.cover_url}
                      alt={s.name}
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                  ) : (
                    <div className={`h-full w-full bg-gradient-to-br ${gradient} flex flex-col items-center justify-center gap-2`}>
                      <div className="text-3xl font-black text-white/20 select-none">
                        {s.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div className="space-y-1.5 w-14">
                        <div className="h-1.5 w-full rounded-full bg-white/10" />
                        <div className="h-1.5 w-3/4 rounded-full bg-white/10" />
                        <div className="h-1.5 w-1/2 rounded-full bg-white/10" />
                      </div>
                    </div>
                  )}

                  {/* Bottom gradient */}
                  <div className="absolute inset-x-0 bottom-0 h-14 bg-gradient-to-t from-black/70 to-transparent" />

                  {/* Active badge */}
                  {isActive && (
                    <div className="absolute top-2 right-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow">
                      actif
                    </div>
                  )}

                  {/* Hover overlay */}
                  <div className={`absolute inset-0 rounded-2xl transition duration-200 ${isActive ? "bg-primary/10" : "bg-black/0 group-hover:bg-black/10"}`} />
                </div>

                {/* Name */}
                <p className={`mt-2 truncate text-center text-xs font-medium transition ${isActive ? "text-primary" : "text-muted-foreground group-hover:text-foreground"}`}>
                  {s.name}
                </p>
              </button>
            )
          })}
        </div>
      </div>
    </section>
  )
}