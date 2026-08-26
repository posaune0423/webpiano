import { PedalRemote } from "@/components/pedal-remote"

export default async function PedalPage({ params }: { params: Promise<{ sessionId: string }> }) {
  const { sessionId } = await params
  return <PedalRemote sessionId={sessionId} />
}
