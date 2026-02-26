import Link from "next/link"
import type { Market } from "@/lib/markets"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

export function MarketCard({ market }: { market: Market }) {
  return (
    <div className="group overflow-hidden rounded-2xl border border-border/60 bg-card transition hover:border-border hover:shadow-md">
      {/* Cover image — full width, taller, only if available */}
      {market.imageUrl && (
        <div className="relative h-32 w-full overflow-hidden">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={market.imageUrl}
            alt=""
            className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
          />
          {/* Gradient overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-card via-card/30 to-transparent" />

          {/* Category badge on top of image */}
          {market.category && (
            <div className="absolute bottom-2 left-3">
              <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm text-xs">
                {market.category}
              </Badge>
            </div>
          )}
        </div>
      )}

      <div className="p-4">
        {/* Category badge when no image */}
        {!market.imageUrl && market.category && (
          <Badge variant="secondary" className="mb-2 text-xs">
            {market.category}
          </Badge>
        )}

        {/* Question */}
        <Link href={`/markets/${market.id}`} className="block">
          <p className="line-clamp-2 text-sm font-medium leading-5 hover:text-primary transition-colors">
            {market.question}
          </p>
        </Link>

        {/* Volume */}
        <p className="mt-1 text-[11px] text-muted-foreground">{market.volumeText ?? ""}</p>

        {/* Progress */}
        <div className="mt-3">
          <div className="mb-1.5 flex justify-between text-[11px] text-muted-foreground">
            <span className="text-emerald-400">{market.yesPct}%</span>
            <span className="text-red-400">{100 - market.yesPct}%</span>
          </div>
          <Progress value={market.yesPct} />
        </div>

        {/* Buttons */}
        <div className="mt-3 flex gap-2">
          <Button asChild size="sm" className="h-8 flex-1 bg-emerald-500/90 text-white hover:bg-emerald-500">
            <Link href={`/markets/${market.id}?side=YES`}>Oui</Link>
          </Button>
          <Button asChild size="sm" variant="destructive" className="h-8 flex-1">
            <Link href={`/markets/${market.id}?side=NO`}>Non</Link>
          </Button>
        </div>
      </div>
    </div>
  )
}