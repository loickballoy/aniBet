import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const base = process.env.NEXT_PUBLIC_API_URL
  if (!base) {
    return NextResponse.json({ error: "NEXT_PUBLIC_API_URL missing" }, { status: 500 })
  }

  const auth = req.headers.get("authorization")
  if (!auth) {
    return NextResponse.json({ error: "Missing Authorization header" }, { status: 401 })
  }

  const url = `${base.replace(/\/$/, "")}/auth/get-user`

  const res = await fetch(url, {
    method: "GET",
    headers: {
      Accept: "application/json",
      Authorization: auth,
    },
  })

  const text = await res.text().catch(() => "")

  return new NextResponse(text, {
    status: res.status,
    headers: { "Content-Type": res.headers.get("content-type") ?? "application/json" },
  })
}