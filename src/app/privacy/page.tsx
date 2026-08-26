import type { Metadata } from "next"

import { LegalPage, LegalSection } from "@/components/legal-page"

const title = "Privacy Policy — webpiano"
const description = "How webpiano handles data and Google Analytics."

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
      <LegalSection title="Accounts and piano input">
        <p>
          webpiano does not require an account and does not include advertising. Your played notes
          and synthesized audio are not collected by the application.
        </p>
      </LegalSection>

      <LegalSection title="Playing the piano">
        <p>
          Computer-key and pointer input used to play notes, together with the resulting audio
          synthesis, stay in your browser. This information is not sent to the webpiano server.
        </p>
      </LegalSection>

      <LegalSection title="Google Analytics">
        <p>
          webpiano uses Google Analytics 4 with measurement ID <code>G-FPXJJ64H74</code> to
          understand visits and improve the site. Google Analytics may process page URLs, referrers,
          browser and device information, session identifiers, and approximate geolocation. It may
          also use first-party cookies such as <code>_ga</code>. Played notes, synthesized audio,
          and phone-pedal presses are not sent as analytics events.
        </p>
        <p>
          See{" "}
          <a
            href="https://support.google.com/analytics/answer/11593727"
            rel="noreferrer"
            target="_blank"
          >
            Google Analytics privacy information
          </a>
          .
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
