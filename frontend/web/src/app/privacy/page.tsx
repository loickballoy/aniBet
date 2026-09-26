import Link from "next/link"
import { SiteHeader } from "@/components/ui/layout/SiteHeader"

export const metadata = { title: "Privacy Policy — aniBet" }

const CONTACT_EMAIL = "anibet@gmail.com" // TODO: replace with your real contact address
const LAST_UPDATED = "September 25, 2026"

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-4 py-10">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Privacy Policy</h1>
        <p className="mt-1 text-xs text-muted-foreground">Last updated: {LAST_UPDATED}</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground">
          <section>
            <h2>What we collect</h2>
            <p>
              When you create an account we store your username, your email address, and — if you sign in with
              Google or Discord — the account identifier those services provide. We also store what you do on
              aniBet: your AniCoins balance, bets, bingo entries, puzzle attempts, proposals, and any profile
              picture you upload.
            </p>
          </section>

          <section>
            <h2>Why we collect it</h2>
            <p>
              Only to run the service: signing you in, keeping your balance and history, showing leaderboards,
              and moderating community content. We don&apos;t sell your data, we don&apos;t show ads, and we
              don&apos;t share it with anyone except the hosting providers needed to run the site (database,
              server, and image storage).
            </p>
          </section>

          <section>
            <h2>What&apos;s public</h2>
            <p>
              Your username, profile picture, AniCoins balance, rank, and tier are visible to other players on the
              leaderboard. Your email address is never shown publicly.
            </p>
          </section>

          <section>
            <h2>Cookies and local storage</h2>
            <p>
              We use your browser&apos;s local storage to keep you signed in. We don&apos;t use tracking or
              advertising cookies.
            </p>
          </section>

          <section>
            <h2>Your rights</h2>
            <p>
              You can ask us at any time to see, correct, or delete your data, including deleting your account
              entirely. Just email{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>.
            </p>
          </section>
        </div>

        <Link href="/" className="mt-10 inline-block text-sm text-primary hover:underline">← Back home</Link>
      </main>
    </>
  )
}