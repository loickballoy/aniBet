"use client"

import * as React from "react"
import { useRouter, useSearchParams } from "next/navigation"

export default function AuthCallbackPage() {
  const router = useRouter()
  const searchParams = useSearchParams()

  React.useEffect(() => {
    const access_token = searchParams.get("access_token")
    const refresh_token = searchParams.get("refresh_token")

    if (access_token) localStorage.setItem("access_token", access_token)
    if (refresh_token) localStorage.setItem("refresh_token", refresh_token)

    router.replace("/")
  }, [])

  return (
    <main className="flex min-h-screen items-center justify-center">
      <p className="text-sm text-muted-foreground">Connexion en cours…</p>
    </main>
  )
}