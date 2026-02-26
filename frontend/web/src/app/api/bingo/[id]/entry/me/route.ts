import { NextResponse } from "next/server"

export async function GET(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params

  const base = process.env.NEXT_PUBLIC_API_URL
  if (!base) {
    return NextResponse.json({ error: "NEXT_PUBLIC_API_URL missing" }, { status: 500 })
  }

  const auth = req.headers.get("authorization") // "Bearer ..."
  if (!auth) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 })
  }

  const url = `${base.replace(/\/$/, "")}/bingo/${encodeURIComponent(id)}/entry/me`
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      Authorization: auth,
    },
    cache: "no-store",
  })

  const text = await res.text().catch(() => "")
  return new NextResponse(text, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/json",
    },
  })
}