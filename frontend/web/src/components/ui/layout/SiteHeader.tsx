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

  function logout() {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    setHasToken(false)
    router.push("/")
    router.refresh()
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="text-sm font-semibold">
          aniBet
        </Link>

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
  )
}