import Link from "next/link"

// Affiché aux invités, avant la partie (discret) ou après (appel à l'action).
// `missed` : ce que l'invité aurait gagné avec un compte (ex. "+200 AniCoins"),
// affiché seulement quand il a réussi — c'est là que l'envie est la plus forte.
export function GuestCta({ variant, missed }: { variant: "banner" | "after"; missed?: string | null }) {
  if (variant === "banner") {
    return (
      <p className="mb-4 rounded-xl border border-border/50 bg-background/30 px-3 py-2 text-center text-[11px] text-muted-foreground">
        Playing as a guest ·{" "}
        <Link href="/login" className="text-primary hover:underline">Log in</Link> to keep your streak and earn AniCoins
      </p>
    )
  }
  return (
    <div className="mt-5 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-center">
      {missed ? (
        <p className="text-sm font-semibold">
          With an account you&apos;d have just won <span className="text-primary">{missed}</span> 🪙
        </p>
      ) : (
        <p className="text-sm font-semibold">Enjoyed it? Keep your progress.</p>
      )}
      <p className="mt-1 text-xs text-muted-foreground">
        Create a free account to build a daily streak, earn AniCoins and climb the leaderboard.
      </p>
      <Link
        href="/login"
        className="mt-3 inline-block rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
      >
        Create a free account
      </Link>
    </div>
  )
}
