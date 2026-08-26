import { PedalRemote } from "@/components/pedal-remote"
import { PEDAL_METADATA } from "@/constants/metadata"

export const metadata = PEDAL_METADATA

export default async function PedalPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  return <PedalRemote sessionId={sessionId} />
}
