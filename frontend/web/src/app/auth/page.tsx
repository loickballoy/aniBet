"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Suspense } from "react"

function CallbackHandler() {
  const router = useRouter()
  const searchParams = useSearchParams()

  React.useEffect(() => {
    const access_token  = searchParams.get("access_token")
    const refresh_token = searchParams.get("refresh_token")

    if (!access_token) { router.replace("/"); return }

    localStorage.setItem("access_token",  access_token)
    if (refresh_token) localStorage.setItem("refresh_token", refresh_token)

    // Si username === email → premier login Google → setup username
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
        <p className="text-sm text-muted-foreground">Connexion en cours…</p>
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