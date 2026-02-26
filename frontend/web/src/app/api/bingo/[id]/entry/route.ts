import { NextResponse } from "next/server"

export async function POST(
  req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params

  const base = process.env.NEXT_PUBLIC_API_URL
  if (!base) {
    return NextResponse.json({ error: "NEXT_PUBLIC_API_URL missing" }, { status: 500 })
  }

  const auth = req.headers.get("authorization")
  if (!auth) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 })
  }

  const body = await req.text().catch(() => "")
  const url = `${base.replace(/\/$/, "")}/bingo/${encodeURIComponent(id)}/entry`

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      Authorization: auth,
    },
    body,
  })

  const text = await res.text().catch(() => "")
  return new NextResponse(text, {
    status: res.status,
    headers: {
      "Content-Type": res.headers.get("content-type") ?? "application/json",
    },
  })
}