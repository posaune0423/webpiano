import { PianoInstrument } from "@/components/piano-instrument"
import { createWebApplicationJsonLd, serializeJsonLd } from "@/lib/seo"

const webApplicationJsonLd = createWebApplicationJsonLd("https://webpiano.xyz")

export default function Home() {
  return <PianoInstrument structuredData={serializeJsonLd(webApplicationJsonLd)} />
}
