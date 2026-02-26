"use client"

import * as React from "react"
import Link from "next/link"
import type { GridCard } from "./page"

type SeriesRow = {
  id: number
  name: string
  slug: string
  cover_url: string | null
}

type Props = {
  cards: GridCard[]
  series: SeriesRow[]
}

function formatDate(iso?: string | null) {
  if (!iso) return "—"
  return new Date(iso).toLocaleString("fr-FR", { dateStyle: "medium", timeStyle: "short" })
}

const PLACEHOLDER_GRADIENTS = [
  "from-violet-600/30 to-indigo-600/20",
  "from-rose-600/30 to-orange-500/20",
  "from-emerald-600/30 to-teal-500/20",
  "from-amber-500/30 to-yellow-400/20",
  "from-cyan-600/30 to-blue-500/20",
  "from-pink-600/30 to-fuchsia-500/20",
]

export default function BingoGrid({ cards, series }: Props) {
  const [activeSeries, setActiveSeries] = React.useState<number | null>(null)

  function toggleSeries(id: number) {
    setActiveSeries((prev) => (prev === id ? null : id))
  }

  const filtered = activeSeries
    ? cards.filter((c) => c.series_id === activeSeries)
    : cards

  return (
    <div>
      {/* ── Series strip (only if multiple series) ── */}
      {series.length > 0 && (
        <section className="mb-8">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold">Séries</h3>
              {activeSeries && (
                <button
                  onClick={() => setActiveSeries(null)}
                  className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-0.5 text-[11px] text-primary transition hover:bg-primary/20"
                >
                  {series.find((s) => s.id === activeSeries)?.name}
                  <span className="opacity-60">×</span>
                </button>
              )}
            </div>
            <span className="text-xs text-muted-foreground">
              {series.length} série{series.length > 1 ? "s" : ""}
            </span>
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
                    onClick={() => toggleSeries(s.id)}
                    className="group relative w-28 shrink-0 text-left focus:outline-none sm:w-32"
                  >
                    <div
                      className={`relative h-40 w-full overflow-hidden rounded-2xl border-2 transition duration-200 sm:h-48 ${
                        isActive
                          ? "border-primary shadow-lg shadow-primary/20"
                          : "border-border/60 hover:border-primary/40 hover:shadow-md hover:shadow-primary/10"
                      }`}
                    >
                      {s.cover_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={s.cover_url}
                          alt={s.name}
                          className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                        />
                      ) : (
                        <div
                          className={`flex h-full w-full flex-col items-center justify-center gap-2 bg-gradient-to-br ${gradient}`}
                        >
                          <div className="select-none text-3xl font-black text-white/20">
                            {s.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div className="w-14 space-y-1.5">
                            <div className="h-1.5 w-full rounded-full bg-white/10" />
                            <div className="h-1.5 w-3/4 rounded-full bg-white/10" />
                            <div className="h-1.5 w-1/2 rounded-full bg-white/10" />
                          </div>
                        </div>
                      )}

                      {/* Bottom gradient */}
                      <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-black/70 to-transparent" />

                      {/* Active badge */}
                      {isActive && (
                        <div className="absolute right-2 top-2 rounded-full bg-primary px-2 py-0.5 text-[10px] font-semibold text-primary-foreground shadow">
                          actif
                        </div>
                      )}

                      <div
                        className={`absolute inset-0 rounded-2xl transition duration-200 ${
                          isActive
                            ? "bg-primary/10"
                            : "bg-black/0 group-hover:bg-black/10"
                        }`}
                      />
                    </div>

                    <p
                      className={`mt-2 truncate text-center text-xs font-medium transition ${
                        isActive
                          ? "text-primary"
                          : "text-muted-foreground group-hover:text-foreground"
                      }`}
                    >
                      {s.name}
                    </p>
                  </button>
                )
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Bingo grid ── */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">
              {activeSeries
                ? series.find((s) => s.id === activeSeries)?.name ?? "Bingos"
                : "Tous les bingos"}
            </h3>
            <span className="text-xs text-muted-foreground">
              {filtered.length} bingo{filtered.length > 1 ? "s" : ""}
            </span>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2 rounded-2xl border border-border/50 bg-card/40">
            <p className="text-sm text-muted-foreground">
              Aucun bingo pour cette série pour l'instant.
            </p>
            <button
              onClick={() => setActiveSeries(null)}
              className="text-xs text-primary hover:underline"
            >
              Voir tous les bingos
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <Link
                key={c.id}
                href={`/bingo/${c.id}`}
                className="group overflow-hidden rounded-2xl border border-border/70 bg-card transition hover:border-border hover:shadow-md"
              >
                {c.coverUrl && (
                  <div className="relative h-28 w-full overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={c.coverUrl}
                      alt=""
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-card via-card/20 to-transparent" />
                    <span
                      className={`absolute right-2 top-2 rounded-full border px-2 py-0.5 text-[10px] font-semibold backdrop-blur-sm ${
                        c.status === "open"
                          ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-400"
                          : c.status === "resolved"
                          ? "border-blue-500/40 bg-blue-500/20 text-blue-400"
                          : "border-border/60 bg-background/60 text-muted-foreground"
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                )}

                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{c.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {c.seriesName ?? "Bingo"}
                        {c.chapter_number ? ` · Ch. ${c.chapter_number}` : ""}
                      </div>
                    </div>
                    {!c.coverUrl && (
                      <span
                        className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${
                          c.status === "open"
                            ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                            : c.status === "resolved"
                            ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                            : "border-border/50 text-muted-foreground"
                        }`}
                      >
                        {c.status}
                      </span>
                    )}
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Clôture : {formatDate(c.closes_at)}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}