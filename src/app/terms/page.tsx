import { LegalPage, LegalSection } from "@/components/legal-page"
import { TERMS_METADATA } from "@/constants/metadata"

export const metadata = TERMS_METADATA

export default function TermsPage() {
  return (
    <LegalPage title="Terms">
      <LegalSection title="Using webpiano">
        <p>
          webpiano provides a browser-based musical instrument and an optional phone pedal. You may
          use the service for lawful personal or creative purposes under these terms.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>
          Do not interfere with the service, bypass access or rate limits, misuse temporary pedal
          links, attempt unauthorized access, or use webpiano in a way that violates applicable law
          or the rights of others.
        </p>
      </LegalSection>

      <LegalSection title="Availability">
        <p>
          Browser audio, network access, WebRTC, and third-party infrastructure can affect how the
          service works. Features may change, be interrupted, or be discontinued without a guarantee
          of continuous availability.
        </p>
      </LegalSection>

      <LegalSection title="Disclaimer">
        <p>
          webpiano is provided as available, without warranties that it will be uninterrupted,
          error-free, or suitable for a particular purpose. To the extent permitted by law, the
          operator is not responsible for indirect or consequential loss arising from use of the
          service.
        </p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          These terms may be updated as the service changes. The date above identifies the latest
          published version. Continuing to use webpiano after an update means accepting the revised
          terms.
        </p>
      </LegalSection>
    </LegalPage>
  )
}
