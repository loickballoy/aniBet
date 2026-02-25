import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { Market } from "@/lib/markets"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"

export function MarketCard({ market }: { market: Market }) {
  return (
    <Link href={`/markets/${market.id}`} className="block">
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
                <Image
                  src={market.imageUrl}
                  alt=""
                  fill
                  className="object-cover"
                />
              ) : (
                <span className="text-xs text-muted-foreground">ANI</span>
              )}
            </div>

            {/* Content */}
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2">
                <p className="line-clamp-2 text-sm font-medium leading-5">
                  {market.question}
                </p>

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

              {/* Progress */}
              <div className="mt-3">
                <Progress value={market.yesPct} />
                <div className="mt-2 flex gap-2">
                  <Button
                    size="sm"
                    className="h-8 flex-1"
                    onClick={(e) => e.preventDefault()}
                  >
                    Oui
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    className="h-8 flex-1"
                    onClick={(e) => e.preventDefault()}
                  >
                    Non
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}