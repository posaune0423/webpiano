import { PianoInstrument } from "@/components/piano-instrument"
import { WEB_APPLICATION_JSON_LD } from "@/constants/metadata"
import { serializeJsonLd } from "@/utils/json-ld"

export default function Home() {
  return <PianoInstrument structuredData={serializeJsonLd(WEB_APPLICATION_JSON_LD)} />
}
