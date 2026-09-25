"use client"

import * as React from "react"

export function Input({ label, ...props }: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">{label}</label>
      <input className="h-10 w-full rounded-xl border border-border/70 bg-background/40 px-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 disabled:opacity-50" {...props} />
    </div>
  )
}

export function Textarea({ label, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">{label}</label>
      <textarea className="w-full rounded-xl border border-border/70 bg-background/40 px-3 py-2 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20 disabled:opacity-50" rows={3} {...props} />
    </div>
  )
}

export function Select({ label, children, ...props }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  return (
    <div>
      <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">{label}</label>
      <select className="h-10 w-full rounded-xl border border-border/70 bg-background/40 px-3 text-sm outline-none transition focus:border-primary/50 focus:ring-2 focus:ring-primary/20" {...props}>
        {children}
      </select>
    </div>
  )
}

export function Toast({ msg, type, onClose }: { msg: string; type: "success" | "error"; onClose: () => void }) {
  React.useEffect(() => { const t = setTimeout(onClose, 4000); return () => clearTimeout(t) }, [])
  return (
    <div className={`fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm shadow-xl backdrop-blur ${
      type === "success" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-red-500/30 bg-red-500/10 text-red-400"
    }`}>
      <span>{type === "success" ? "✓" : "✕"}</span>
      {msg}
      <button onClick={onClose} className="ml-2 opacity-60 hover:opacity-100">×</button>
    </div>
  )
}