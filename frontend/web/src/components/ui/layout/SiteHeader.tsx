"use client"
import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { UserWidget } from "@/components/ui/layout/UserWidget"

const NAV = [
  { href: "/", label: "Markets", exact: true },
  { href: "/daily", label: "Daily" },
  { href: "/weekly", label: "Weekly" },
  { href: "/bingo", label: "Bingo" },
  { href: "/leaderboard", label: "Leaderboard" },
]

export function SiteHeader() {
  const router = useRouter()
  const pathname = usePathname() || "/"
  const [hasToken, setHasToken] = React.useState(false)
  const [isAdmin, setIsAdmin] = React.useState(false)
  const [menuOpen, setMenuOpen] = React.useState(false)

  React.useEffect(() => {
    setMenuOpen(false)
    const token = localStorage.getItem("access_token")
    setHasToken(!!token)
    if (token) {
      fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((u) => setIsAdmin(u?.role === "admin" || u?.role === "owner"))
        .catch(() => {})
    }
  }, [pathname])

  function logout() {
    localStorage.removeItem("access_token")
    localStorage.removeItem("refresh_token")
    setHasToken(false)
    setIsAdmin(false)
    router.push("/")
    router.refresh()
  }

  function isActive(href: string, exact?: boolean) {
    return exact ? pathname === href : pathname.startsWith(href)
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur-md">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center justify-between gap-4 px-4">

        {/* Temporary text-only logo — the old logo (chibi Hakari, Jujutsu
            Kaisen) was removed: using a licensed character as a brand logo
            is a real infringement risk. To replace with an original logo. */}
        <Link href="/" className="shrink-0">
          <span className="font-[family-name:var(--font-display)] text-xl font-extrabold tracking-tight">
            ani<span className="text-primary">Bet</span>
          </span>
        </Link>

        {/* ── Desktop nav ── */}
        <nav className="hidden items-center gap-0.5 rounded-2xl border border-border/50 bg-muted/30 p-1 md:flex">
          {NAV.map((item) => {
            const active = isActive(item.href, item.exact)
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`rounded-xl px-3.5 py-1.5 text-[13px] font-medium transition ${
                  active
                    ? "bg-background text-foreground shadow-sm ring-1 ring-border/60"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* ── Right side ── */}
        <div className="flex items-center gap-2">
          {!hasToken ? (
            <Link
              href={`/login?next=${encodeURIComponent(pathname)}`}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground transition hover:opacity-90"
            >
              Log in
            </Link>
          ) : (
            <>
              <Link
                href="/propose"
                className="hidden items-center gap-1.5 rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-[13px] font-medium text-primary transition hover:bg-primary/20 md:flex"
              >
                <span className="text-base leading-none">+</span> Propose
              </Link>
              <UserWidget />
              {isAdmin && (
                <Link
                  href="/admin"
                  className="rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-[13px] font-medium text-primary transition hover:bg-primary/20"
                >
                  Admin
                </Link>
              )}
              <button
                onClick={logout}
                title="Log out"
                className="hidden h-9 w-9 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition hover:bg-muted/50 hover:text-foreground md:flex"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none">
                  <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </>
          )}

          {/* ── Mobile menu toggle ── */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-label="Menu"
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 text-muted-foreground transition hover:bg-muted/50 hover:text-foreground md:hidden"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              {menuOpen ? (
                <path d="M18 6 6 18M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* ── Mobile menu panel ── */}
      {menuOpen && (
        <div className="border-t border-border/60 bg-background/95 backdrop-blur-md md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-3">
            {NAV.map((item) => {
              const active = isActive(item.href, item.exact)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  }`}
                >
                  {item.label}
                </Link>
              )
            })}
            {hasToken && (
              <>
                <div className="my-1 h-px bg-border/60" />
                <Link href="/propose" className="rounded-xl px-3 py-2.5 text-sm font-medium text-primary transition hover:bg-primary/10">
                  + Propose an event
                </Link>
                <button onClick={logout} className="rounded-xl px-3 py-2.5 text-left text-sm font-medium text-muted-foreground transition hover:bg-muted/50 hover:text-foreground">
                  Log out
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  )
}