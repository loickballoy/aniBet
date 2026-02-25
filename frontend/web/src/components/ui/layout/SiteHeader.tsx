"use client"

import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"

export function SiteHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const [hasToken, setHasToken] = React.useState(false)

  React.useEffect(() => {
    setHasToken(!!localStorage.getItem("access_token"))
  }, [])

  const inBingo = (pathname || "").startsWith("/bingo")

  function logout() {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    setHasToken(false)
    router.push("/")
    router.refresh()
  }

  return (
    <>
      {/* Floating button à gauche */}
      <Link
        href="/leaderboard"
        className="fixed left-3 top-1/2 z-[60] -translate-y-1/2 rounded-xl border border-border/70 bg-background/80 px-3 py-2 text-sm hover:bg-muted backdrop-blur"
      >
        Leaderboard
      </Link>

      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
          {/* Left: logo + nav */}
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm font-semibold">
              aniBet
            </Link>

            {/* ✅ Toggle: Bingo / Bets */}
            {!inBingo ? (
              <Link
                href="/bingo"
                className="rounded-xl border border-border/70 bg-background/30 px-3 py-1.5 text-sm hover:bg-muted"
              >
                Bingo
              </Link>
            ) : (
              <Link
                href="/"
                className="rounded-xl border border-border/70 bg-background/30 px-3 py-1.5 text-sm hover:bg-muted"
              >
                Bets
              </Link>
            )}
          </div>

          {/* Right: auth */}
          <div className="flex items-center gap-2">
            {!hasToken ? (
              <Link
                href={`/login?next=${encodeURIComponent(pathname || "/")}`}
                className="rounded-xl border border-border/70 bg-background/30 px-3 py-2 text-sm hover:bg-muted"
              >
                Login
              </Link>
            ) : (
              <>
                <Link
                  href="/profile"
                  className="rounded-xl border border-border/70 bg-background/30 px-3 py-2 text-sm hover:bg-muted"
                >
                  Profil
                </Link>
                <button
                  onClick={logout}
                  className="rounded-xl border border-border/70 bg-background/30 px-3 py-2 text-sm hover:bg-muted"
                >
                  Logout
                </button>
              </>
            )}
          </div>
        </div>
      </header>
    </>
  )
}