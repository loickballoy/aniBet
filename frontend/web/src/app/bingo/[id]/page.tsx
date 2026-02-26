import { SiteHeader } from "@/components/ui/layout/SiteHeader"
import { notFound } from "next/navigation"
import BingoClient from "./BingoDetailClient"

export default async function Page({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params

  if (!id) notFound()

  return (
    <>
      <SiteHeader />
      <BingoClient id={id} />
    </>
  )
}