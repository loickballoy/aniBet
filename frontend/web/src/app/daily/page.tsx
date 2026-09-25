"use client"

import * as React from "react"
import { useRouter } from "next/navigation"

// Aiguillage : redirige vers le jeu du jour (trivia ou silhouette).
// Si aucun jeu n'est prévu, on tombe sur /daily/trivia qui affiche
// l'état "no puzzle today".
export default function DailyRouterPage() {
  const router = useRouter()
  const API = process.env.NEXT_PUBLIC_API_URL ?? ""

  React.useEffect(() => {
    const token = localStorage.getItem("access_token")
    if (!token) { router.replace("/login"); return }

    fetch(`${API}/daily-challenges/today`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => {
        if (!res.ok) { router.replace("/daily/trivia"); return }
        const data = await res.json()
        router.replace(data?.challenge?.type === "silhouette" ? "/daily/silhouette" : "/daily/trivia")
      })
      .catch(() => router.replace("/daily/trivia"))
  }, [])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
    </div>
  )
}