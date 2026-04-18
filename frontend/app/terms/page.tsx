"use client";

import { LegalShell, H, P, Ul, Li, B, A } from "@/components/legal/shell";

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="17 April 2026">
      <P>
        These terms govern your use of DevAstroAI. By creating an account or
        using the service you agree to them. If you do not agree, please stop
        using the service.
      </P>

      <H>1. The service</H>
      <P>
        DevAstroAI is a cloud-based KP (Krishnamurti Paddhati) astrology
        practice-management tool. It provides chart computation, AI-assisted
        interpretation, client management, follow-ups, and reporting. We offer
        a consumer tier and an astrologer pro tier.
      </P>

      <H>2. Accounts</H>
      <Ul>
        <Li>You must be at least 13 years old (16 in the EU).</Li>
        <Li>You are responsible for keeping your password safe.</Li>
        <Li>One person per account. Sharing logins is not permitted.</Li>
        <Li>We may suspend accounts used abusively or to circumvent limits.</Li>
      </Ul>

      <H>3. AI-generated content</H>
      <P>
        Chart interpretations are produced by large language models and are
        provided for reference and reflection only. They are <B>not</B> a
        substitute for professional medical, legal, financial, or psychological
        advice. You are responsible for any decision you make after reading
        them.
      </P>

      <H>4. Your content</H>
      <P>
        You retain all rights to birth data, notes, predictions, and any
        content you upload. You grant us a limited licence to store, display,
        and process this content solely to operate the service for you.
      </P>
      <P>
        You must have permission to upload any client data you add. By
        uploading client data you confirm you have that permission and that
        you comply with applicable data-protection laws.
      </P>

      <H>5. Acceptable use</H>
      <P>You agree not to:</P>
      <Ul>
        <Li>Reverse engineer or scrape the service</Li>
        <Li>Use it to generate harmful, deceptive, or unlawful content</Li>
        <Li>Impersonate another person or falsify birth data maliciously</Li>
        <Li>Resell the service or bulk-export other users&apos; data</Li>
      </Ul>

      <H>6. Paid plans</H>
      <P>
        Pro plans are billed monthly via Stripe (availability post-launch).
        Prices shown in INR include applicable taxes where required. You may
        cancel any time; billing stops at the end of the current period. We
        do not prorate refunds for partial months.
      </P>

      <H>7. Beta disclaimer</H>
      <P>
        During beta, features may change, break, or be removed. We aim to
        preserve your data but make no SLA guarantees. Export your work
        regularly.
      </P>

      <H>8. Intellectual property</H>
      <P>
        DevAstroAI, the logo, and all software are owned by DevAstro Labs.
        These terms grant you a personal, non-exclusive licence to use the
        service; they do not grant you any rights in our brand or code.
      </P>

      <H>9. Termination</H>
      <P>
        You may delete your account at any time via Settings. We may suspend
        or terminate accounts that violate these terms. On termination, we
        wipe your workspace within 30 days per our{" "}
        <A href="/privacy">Privacy Policy</A>.
      </P>

      <H>10. Limitation of liability</H>
      <P>
        To the maximum extent permitted by law, DevAstroAI is provided
        &quot;as is&quot; without warranties of any kind. Our aggregate
        liability for any claim arising from the service is limited to the
        fees you paid us in the 12 months preceding the claim.
      </P>

      <H>11. Governing law</H>
      <P>
        These terms are governed by the laws of India. Disputes will be
        subject to the exclusive jurisdiction of the courts in Hyderabad.
      </P>

      <H>12. Changes</H>
      <P>
        We may update these terms. Material changes will be emailed to
        registered users at least 14 days before they take effect.
      </P>

      <H>13. Contact</H>
      <P>
        DevAstro Labs, Hyderabad 500032, India.{" "}
        <A href="mailto:legal@devastro.ai">legal@devastro.ai</A>
      </P>
    </LegalShell>
  );
}
