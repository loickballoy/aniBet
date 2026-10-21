"use client"

import * as React from "react"
import Link from "next/link"

type Notification = {
  id: number
  type: string
  payload: { title?: string; outcome?: string; payout?: number; reward?: number; event_id?: number }
  created_at: string
}

// Texte + lien de chaque type de notification envoyé par le backend.
function describe(n: Notification): { text: string; href: string } {
  const p = n.payload ?? {}
  const title = p.title ? `"${p.title}"` : "a market"
  switch (n.type) {
    case "bet_won":
      return { text: `🎯 You called it! ${title} → ${p.outcome} · +${(p.payout ?? 0).toLocaleString("en-US")} pts`, href: "/profile" }
    case "bet_lost":
      return { text: `Not this time — ${title} has been resolved`, href: p.event_id ? `/markets/${p.event_id}` : "/" }
    case "proposal_approved":
      return { text: `✅ Your bet ${title} is live${p.reward ? ` · +${p.reward} pts` : ""}`, href: p.event_id ? `/markets/${p.event_id}` : "/" }
    case "proposal_rejected":
      return { text: `Your proposal ${title} wasn't approved`, href: "/propose" }
    case "proposal_pending":
      return { text: `New proposal to review: ${title}`, href: "/mod/proposals" }
    case "dispute_opened":
      return { text: `⚠️ Dispute opened on ${title}`, href: "/admin" }
    default:
      return { text: n.type.replace(/_/g, " "), href: "/" }
  }
}

export function NotificationBell() {
  const [items, setItems] = React.useState<Notification[]>([])
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)
  const API = process.env.NEXT_PUBLIC_API_URL ?? ""

  const token = () => localStorage.getItem("access_token")

  React.useEffect(() => {
    const t = token()
    if (!t) return
    fetch(`${API}/notifications/me?unread_only=true`, { headers: { Authorization: `Bearer ${t}` } })
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => setItems(Array.isArray(data) ? data : []))
      .catch(() => {})
  }, [API])

  // Fermer en cliquant ailleurs.
  React.useEffect(() => {
    if (!open) return
    const onClick = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false) }
    document.addEventListener("mousedown", onClick)
    return () => document.removeEventListener("mousedown", onClick)
  }, [open])

  function markRead(ids: number[]) {
    const t = token()
    if (!t) return
    setItems((list) => list.filter((n) => !ids.includes(n.id)))
    for (const id of ids) {
      fetch(`${API}/notifications/${id}/read`, { method: "PATCH", headers: { Authorization: `Bearer ${t}` } }).catch(() => {})
    }
  }

  const count = items.length

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Notifications${count ? ` (${count} unread)` : ""}`}
        className="relative flex h-9 w-9 items-center justify-center rounded-xl border border-border/50 bg-card/40 text-base transition hover:border-border"
      >
        🔔
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
            {count > 9 ? "9+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl border border-border/60 bg-card shadow-xl">
          <div className="flex items-center justify-between border-b border-border/40 px-3 py-2">
            <span className="text-xs font-semibold">Notifications</span>
            {count > 0 && (
              <button onClick={() => markRead(items.map((n) => n.id))} className="text-[11px] text-primary hover:underline">
                Mark all read
              </button>
            )}
          </div>
          {count === 0 ? (
            <p className="px-3 py-6 text-center text-xs text-muted-foreground">You&apos;re all caught up</p>
          ) : (
            <ul className="max-h-96 overflow-y-auto">
              {items.map((n) => {
                const { text, href } = describe(n)
                return (
                  <li key={n.id}>
                    <Link
                      href={href}
                      onClick={() => { markRead([n.id]); setOpen(false) }}
                      className="block border-b border-border/30 px-3 py-2.5 text-xs leading-snug transition hover:bg-muted/40"
                    >
                      {text}
                      <span className="mt-0.5 block text-[10px] text-muted-foreground">
                        {new Date(n.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </span>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  )
}
