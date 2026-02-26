import Link from "next/link"
import type { Market } from "@/lib/markets"

export function MarketCard({ market }: { market: Market }) {
  const outcomes = market.outcomes ?? []
  const total = outcomes.reduce((acc, o) => acc + o.poolPoints, 0)

  const isYesNo =
    outcomes.length === 2 &&
    outcomes.every((o) =>
      ["oui", "non", "yes", "no"].includes(o.label.toLowerCase())
    )

  // Sort by pool desc for segmented bar + leading stat
  const sorted = [...outcomes].sort((a, b) => b.poolPoints - a.poolPoints)
  const leading = sorted[0]
  const leadingPct = total > 0 ? Math.round((leading.poolPoints / total) * 100) : 50

  const firstPct = total > 0 ? Math.round((outcomes[0]?.poolPoints / total) * 100) : 50
  const secondPct = 100 - firstPct

  return (
    <Link
      href={`/markets/${market.id}`}
      className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-card transition hover:border-border hover:shadow-md"
    >
      {/* Cover */}
      {market.imageUrl && (
        <div className="relative h-32 w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={market.imageUrl}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />
          {market.category && (
            <div className="absolute bottom-2 left-3">
              <span className="rounded-full border border-border/40 bg-background/70 px-2 py-0.5 text-[10px] font-medium text-muted-foreground backdrop-blur-sm">
                {market.category}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-1 flex-col p-4">
        {/* Category (no cover) */}
        {!market.imageUrl && market.category && (
          <span className="mb-2 inline-block rounded-full border border-border/40 bg-muted/40 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">
            {market.category}
          </span>
        )}

        {/* Question */}
        <p className="line-clamp-2 flex-1 text-sm font-medium leading-snug">
          {market.question}
        </p>

        <div className="mt-3 space-y-2">

          {/* ── Pool bar ── */}
          {isYesNo ? (
            /* 2 outcomes Oui/Non — barre verte/rouge */
            <div>
              <div className="mb-1.5 flex justify-between text-[11px]">
                <span className="font-medium text-emerald-400">
                  {outcomes[0].label} · {firstPct}%
                </span>
                <span className="text-red-400">
                  {outcomes[1].label} · {secondPct}%
                </span>
              </div>
              <div className="flex h-1.5 w-full overflow-hidden rounded-full bg-red-500/40">
                <div
                  className="bg-emerald-500/80 transition-all"
                  style={{ width: `${firstPct}%` }}
                />
              </div>
            </div>
          ) : outcomes.length >= 2 ? (
            /* Multi-outcome — barre segmentée + stat favori */
            <div>
              <div className="mb-1.5 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>
                  Favori ·{" "}
                  <span className="font-semibold text-primary">{leadingPct}%</span>
                </span>
                <span className="rounded-full border border-border/50 px-1.5 py-0.5 text-[10px]">
                  {outcomes.length} choix
                </span>
              </div>
              {/* Segmented bar — each slice proportional to pool, opacity decreases */}
              <div className="flex h-1.5 w-full gap-px overflow-hidden rounded-full bg-border/30">
                {sorted.map((o, i) => {
                  const pct = total > 0 ? (o.poolPoints / total) * 100 : 100 / sorted.length
                  const opacity = Math.max(0.2, 1 - i * 0.15)
                  return (
                    <div
                      key={o.id}
                      className="bg-primary"
                      style={{ width: `${pct}%`, opacity }}
                    />
                  )
                })}
              </div>
            </div>
          ) : null}

          {/* Footer */}
          <div className="flex items-center justify-between pt-0.5">
            <span className="text-[11px] text-muted-foreground">
              {market.volumeText ?? ""}
            </span>
            <span className="text-[11px] font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
              Voir →
            </span>
          </div>

        </div>
      </div>
    </Link>
  )
}