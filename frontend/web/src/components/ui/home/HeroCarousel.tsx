import Image from "next/image"
import Link from "next/link"
import type { Market } from "@/lib/markets"
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

export function HeroCarousel({ items }: { items: Market[] }) {
  return (
    <div className="relative">
      <Carousel opts={{ align: "start", loop: true }}>
        <CarouselContent>
          {items.map((m) => (
            <CarouselItem key={m.id} className="md:basis-1/1">
              <div className="relative overflow-hidden rounded-2xl border bg-muted">
                {/* Background image */}
                {m.imageUrl ? (
                  <div className="relative h-[220px] w-full sm:h-[260px] md:h-[300px]">
                    <Image
                      src={m.imageUrl}
                      alt=""
                      fill
                      className="object-cover"
                      priority
                    />
                    <div className="absolute inset-0 bg-gradient-to-r from-background/95 via-background/60 to-background/10" />
                  </div>
                ) : (
                  <div className="h-[220px] w-full bg-gradient-to-r from-muted to-background" />
                )}

                {/* Overlay content */}
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full p-6 sm:p-8 md:p-10">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{m.category ?? "Featured"}</Badge>
                      <Badge>Biggest bet</Badge>
                    </div>

                    <h2 className="mt-3 max-w-2xl text-balance text-xl font-semibold leading-tight sm:text-2xl md:text-3xl">
                      {m.question}
                    </h2>

                    <p className="mt-2 text-sm text-muted-foreground">
                      {m.yesPct}% Oui • {m.volumeText ?? ""}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      <Button asChild>
                        <Link href={`/markets/${m.id}`}>Voir le marché</Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href={`/markets/${m.id}?side=YES`}>Parier Oui</Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href={`/markets/${m.id}?side=NO`}>Parier Non</Link>
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            </CarouselItem>
          ))}
        </CarouselContent>

        <CarouselPrevious className="left-2" />
        <CarouselNext className="right-2" />
      </Carousel>
    </div>
  )
}