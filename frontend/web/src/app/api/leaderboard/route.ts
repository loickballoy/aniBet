import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const base = process.env.NEXT_PUBLIC_API_URL
  if (!base) {
    return NextResponse.json({ error: "NEXT_PUBLIC_API_URL missing" }, { status: 500 })
  }

  const { searchParams } = new URL(req.url)
  const limit = searchParams.get("limit") ?? "50"
  const offset = searchParams.get("offset") ?? "0"

  // ✅ Backend réel: prefix "/rank" + "/leaderboard"
  const url = `${base.replace(/\/$/, "")}/rank/leaderboard?limit=${encodeURIComponent(
    limit
  )}&offset=${encodeURIComponent(offset)}`

  const res = await fetch(url, {
    method: "GET",
    headers: { Accept: "application/json" },
  })

  const text = await res.text().catch(() => "")

  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  })
}