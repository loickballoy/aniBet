import Image from "next/image"
import Link from "next/link"
import type { Market } from "@/lib/markets"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { cn } from "@/lib/utils"

export function MarketCard({ market }: { market: Market }) {
  return (
    <Card className="group overflow-hidden transition hover:border-foreground/20 hover:shadow-sm">
      <CardContent className="p-4">
        <div className="flex gap-3">
          {/* Thumb */}
          <div
            className={cn(
              "relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-muted",
              !market.imageUrl && "flex items-center justify-center"
            )}
          >
            {market.imageUrl ? (
              <Image src={market.imageUrl} alt="" fill className="object-cover" />
            ) : (
              <span className="text-xs text-muted-foreground">ANI</span>
            )}
          </div>

          {/* Content */}
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/markets/${market.id}`}
                className="line-clamp-2 text-sm font-medium leading-5 hover:underline"
              >
                {market.question}
              </Link>

              <div className="text-right text-xs text-muted-foreground">
                {market.volumeText ?? ""}
              </div>
            </div>

            <div className="mt-2 flex items-center gap-2">
              {market.category ? (
                <Badge variant="secondary" className="h-6">
                  {market.category}
                </Badge>
              ) : null}

              <span className="text-xs text-muted-foreground">
                {market.yesPct}% Oui
              </span>
            </div>

            {/* Progress + buttons */}
            <div className="mt-3">
              <Progress value={market.yesPct} />
              <div className="mt-2 flex gap-2">
                <Button asChild size="sm" className="h-8 flex-1 bg-emerald-500/90 text-white hover:bg-emerald-500">
                  <Link href={`/markets/${market.id}?side=YES`}>Oui</Link>
                </Button>
                <Button asChild size="sm" variant="destructive" className="h-8 flex-1">
                  <Link href={`/markets/${market.id}?side=NO`}>Non</Link>
                </Button>
              </div>

              <div className="mt-2">
                <Button asChild variant="outline" size="sm" className="h-8 w-full">
                  <Link href={`/markets/${market.id}`}>Voir le marché</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}