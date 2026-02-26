"use client"

import { useEffect, useRef, useState } from "react"

type Props = {
  children: React.ReactNode
  delay?: number        // ms
  className?: string
  from?: "bottom" | "top" | "left" | "none"
}

export function FadeIn({ children, delay = 0, className = "", from = "bottom" }: Props) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), delay)
    return () => clearTimeout(timer)
  }, [delay])

  const translate = {
    bottom: "translateY(18px)",
    top: "translateY(-18px)",
    left: "translateX(-18px)",
    none: "none",
  }[from]

  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? "none" : translate,
        transition: `opacity 0.45s ease, transform 0.45s ease`,
      }}
    >
      {children}
    </div>
  )
}