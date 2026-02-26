import { NextResponse } from "next/server"

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ id: string }> }
) {
  const { id } = await ctx.params

  const base = process.env.NEXT_PUBLIC_API_URL
  if (!base) {
    return NextResponse.json(
      { error: "NEXT_PUBLIC_API_URL missing" },
      { status: 500 }
    )
  }

  if (!id) {
    return NextResponse.json(
      { error: "Missing bingo id" },
      { status: 400 }
    )
  }

  const url = `${base.replace(/\/$/, "")}/bingo/${encodeURIComponent(id)}`
  const res = await fetch(url, {
    headers: { Accept: "application/json" },
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