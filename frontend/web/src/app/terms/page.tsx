import Link from "next/link"
import { SiteHeader } from "@/components/ui/layout/SiteHeader"

export const metadata = { title: "Terms of Service — aniBet" }

const CONTACT_EMAIL = "anibet@gmail.com" // TODO: replace with your real contact address
const LAST_UPDATED = "September 25, 2026"

export default function TermsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto w-full max-w-2xl px-4 py-10">
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-extrabold tracking-tight">Terms of Service</h1>
        <p className="mt-1 text-xs text-muted-foreground">Last updated: {LAST_UPDATED}</p>

        <div className="mt-8 space-y-6 text-sm leading-relaxed text-muted-foreground [&_h2]:mb-2 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground">
          <section>
            <h2>AniCoins are not real money</h2>
            <p>
              AniCoins are a virtual, free-to-earn currency used only for fun on aniBet. They can&apos;t be
              bought, sold, transferred, or exchanged for money, prizes, or anything of real-world value.
              aniBet is not a gambling service.
            </p>
          </section>

          <section>
            <h2>Your account</h2>
            <p>
              One account per person. You must be at least 13 years old, or the minimum age required to consent
              to online services in your country if higher. You&apos;re responsible for keeping your login
              secure. Creating multiple accounts to farm AniCoins or manipulate the leaderboard isn&apos;t
              allowed.
            </p>
          </section>

          <section>
            <h2>Community content</h2>
            <p>
              When you propose events or series, upload a profile picture, or dispute a result, keep it
              respectful and relevant to anime and manga. No explicit, hateful, or illegal content, and no
              content you don&apos;t have the right to share. Moderators and admins can reject proposals and
              remove content.
            </p>
          </section>

          <section>
            <h2>Moderation and fair play</h2>
            <p>
              Results are decided by moderators based on published sources and can be disputed during the
              dispute window. We may reset balances, remove content, or suspend accounts involved in cheating,
              abuse, or exploiting bugs.
            </p>
          </section>

          <section>
            <h2>No guarantees</h2>
            <p>
              aniBet is a hobby project provided as-is. Features, balances, and seasons may change, and the
              service may be interrupted or shut down.
            </p>
          </section>

          <section>
            <h2>Contact</h2>
            <p>
              Questions? Email{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-primary hover:underline">{CONTACT_EMAIL}</a>.
              See also our <Link href="/privacy" className="text-primary hover:underline">Privacy Policy</Link>.
            </p>
          </section>
        </div>

        <Link href="/" className="mt-10 inline-block text-sm text-primary hover:underline">← Back home</Link>
      </main>
    </>
  )
}