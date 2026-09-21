"use client"
import * as React from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { UserWidget } from "@/components/ui/layout/UserWidget"

export function SiteHeader() {
  const router = useRouter()
  const pathname = usePathname()
  const [hasToken, setHasToken] = React.useState(false)
  const [isAdmin, setIsAdmin] = React.useState(false)

  React.useEffect(() => {
    const token = localStorage.getItem("access_token")
    setHasToken(!!token)
    if (token) {
      fetch("/api/me", { headers: { Authorization: `Bearer ${token}` } })
        .then((r) => r.json())
        .then((u) => setIsAdmin(u?.role === "admin"))
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

  function navLink(href: string) {
    const active = (pathname || "").startsWith(href)
    return `rounded-xl px-3 py-2 text-sm transition ${
      active
        ? "bg-primary/10 text-primary font-medium"
        : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
    }`
  }

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/80 backdrop-blur overflow-visible">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3">

        <div className="flex items-center gap-1">

          {/* Logo temporaire en texte seul — l'ancien logo (chibi Hakari, Jujutsu
              Kaisen) a été retiré : utiliser un personnage sous licence comme
              logo de marque est un risque de contrefaçon, pas juste une
              question de style. À remplacer par un logo original/SVG maison
              avant le lancement public. */}
          <Link
            href="/"
            className="flex items-center gap-2 self-end"
          >
            <span className="text-lg font-black tracking-tight">
              ani<span className="text-primary">Bet</span>
            </span>
          </Link>

          <nav className="hidden items-center gap-0.5 sm:flex">
            <Link href="/bingo" className={navLink("/bingo")}>Bingo</Link>
            <Link href="/leaderboard" className={navLink("/leaderboard")}>Leaderboard</Link>
          </nav>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 sm:hidden">
            <Link href="/bingo" className={navLink("/bingo")}>Bingo</Link>
            <Link href="/leaderboard" className={navLink("/leaderboard")}>🏆</Link>
          </div>

          {!hasToken ? (
            <Link
              href={`/login?next=${encodeURIComponent(pathname || "/")}`}
              className="rounded-xl border border-border/70 bg-background/30 px-3 py-2 text-sm hover:bg-muted transition"
            >
              Login
            </Link>
          ) : (
            <>
              <UserWidget />
              {isAdmin && (
                <Link
                  href="/admin"
                  className="rounded-xl border border-primary/40 bg-primary/10 px-3 py-2 text-sm text-primary hover:bg-primary/20 transition"
                >
                  Admin
                </Link>
              )}
              {/*<Link
                href="/profile"
                className="rounded-xl border border-border/70 bg-background/30 px-3 py-2 text-sm hover:bg-muted transition"
              >
                Profil
              </Link>*/}
              <button
                onClick={logout}
                className="rounded-xl border border-border/70 bg-background/30 px-3 py-2 text-sm hover:bg-muted transition"
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