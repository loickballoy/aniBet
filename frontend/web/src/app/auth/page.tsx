"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import { Suspense } from "react"

function CallbackHandler() {
  const router = useRouter()

  React.useEffect(() => {
    // Les tokens arrivent dans le fragment (#...) : il n'est jamais envoyé au
    // serveur, donc absent des logs. On l'efface de l'URL dès qu'il est lu,
    // pour qu'il ne reste pas dans l'historique du navigateur.
    const params = new URLSearchParams(window.location.hash.slice(1))
    const access_token  = params.get("access_token")
    const refresh_token = params.get("refresh_token")
    window.history.replaceState(null, "", window.location.pathname)

    if (!access_token) { router.replace("/"); return }

    localStorage.setItem("access_token",  access_token)
    if (refresh_token) localStorage.setItem("refresh_token", refresh_token)

    // If username === email → first Google login → setup username
    fetch("/api/me", { headers: { Authorization: `Bearer ${access_token}` } })
      .then((r) => r.json())
      .then((user) => {
        if (user?.username && user?.email && user.username === user.email) {
          router.replace("/setup-username")
        } else {
          router.replace("/")
        }
      })
      .catch(() => router.replace("/"))
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="h-7 w-7 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        <p className="text-sm text-muted-foreground">Signing you in…</p>
      </div>
    </main>
  )
}

export default function AuthPage() {
  return (
    <Suspense>
      <CallbackHandler />
    </Suspense>
  )
}