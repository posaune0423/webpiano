import type { Metadata } from "next"

import { PedalRemote } from "@/components/pedal-remote"

export const metadata: Metadata = {
  alternates: { canonical: null },
  description: "Use this phone as a temporary sustain pedal for webpiano.",
  robots: { follow: true, index: false },
  title: "Phone Pedal — webpiano",
}

export default async function PedalPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  return <PedalRemote sessionId={sessionId} />
}
