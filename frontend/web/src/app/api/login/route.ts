import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const base = process.env.NEXT_PUBLIC_API_URL
  if (!base) {
    return NextResponse.json({ error: "NEXT_PUBLIC_API_URL missing" }, { status: 500 })
  }

  const { username, password } = await req.json()

  const url = `${base.replace(/\/$/, "")}/auth/token`

  const form = new URLSearchParams()
  form.set("username", username)
  form.set("password", password)

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
    },
    body: form.toString(),
  })

  const text = await res.text().catch(() => "")

  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  })
}