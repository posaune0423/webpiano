import type { Metadata } from "next"

import { LegalPage, LegalSection } from "@/components/legal-page"

const title = "Privacy Policy — webpiano"
const description = "How webpiano handles data."

export const metadata: Metadata = {
  alternates: { canonical: "/privacy" },
  description,
  openGraph: {
    description,
    siteName: "webpiano",
    title,
    type: "website",
    url: "/privacy",
  },
  title,
  twitter: {
    card: "summary_large_image",
    description,
    title,
  },
}

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy">
      <LegalSection title="What webpiano does not collect">
        <p>
          webpiano does not require an account and does not include advertising or product
          analytics. Your played notes and synthesized audio are not collected by the application.
        </p>
      </LegalSection>

      <LegalSection title="Playing the piano">
        <p>
          Computer-key and pointer input used to play notes, together with the resulting audio
          synthesis, stay in your browser. This information is not sent to the webpiano server.
        </p>
      </LegalSection>

      <LegalSection title="Using a phone as a pedal">
        <p>
          When you create a phone-pedal connection, webpiano handles a temporary session ID, hashed
          connection tokens, connection state, WebRTC signaling data, and the IP address used for
          rate limiting. A guest connection token is kept in that phone tab&apos;s session storage
          so the connection can be restored during the same browser session.
        </p>
        <p>
          Pedal presses travel through an encrypted peer-to-peer WebRTC DataChannel. WebRTC
          signaling is relayed only to establish the connection; network traffic may use a TURN
          relay when a direct connection is unavailable.
        </p>
      </LegalSection>

      <LegalSection title="Retention">
        <p>
          Phone-pedal sessions expire no later than two hours after they are created. If the host
          selects Disconnect, access ends immediately and the record is marked as ended; scheduled
          cleanup means the stored record is scheduled for deletion around the two-hour mark.
          Pairing a new phone is limited to the first ten minutes. Stored session records contain
          hashed tokens and connection state, not played notes or pedal presses.
        </p>
      </LegalSection>

      <LegalSection title="Infrastructure">
        <p>
          Cloudflare provides site delivery, temporary pedal-session storage, WebRTC connectivity,
          rate limiting, and operational logging. Cloudflare may process network identifiers and
          technical request data under its own service and privacy terms.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          This policy may be updated when webpiano&apos;s features or data handling change. The date
          above identifies the latest published version.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
