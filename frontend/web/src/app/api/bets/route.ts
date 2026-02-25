import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const base = process.env.NEXT_PUBLIC_API_URL
  if (!base) {
    return NextResponse.json({ error: "NEXT_PUBLIC_API_URL missing" }, { status: 500 })
  }

  const auth = req.headers.get("authorization")
  if (!auth) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 })
  }

  const payload = await req.json()

  const url = `${base.replace(/\/$/, "")}/bets/`

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: auth,
    },
    body: JSON.stringify(payload),
  })

  const text = await res.text().catch(() => "")

  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  })
}