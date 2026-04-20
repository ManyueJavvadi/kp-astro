/**
 * PR26 — /terms page.
 *
 * Honest stateless-free-tier copy:
 *   - 18+ age minimum
 *   - Strong "informational / entertainment only" disclaimer
 *   - No subscription, no payments, no refund logic (not applicable today)
 *   - Governing law: Ontario, Canada (placeholder — update when entity set)
 *
 * Placeholders same as privacy/page.tsx.
 */

import type { Metadata } from "next";
import { LegalShell, H, P, Ul, Li, B, A } from "@/components/legal/shell";

export const metadata: Metadata = {
  title: "Terms of Service · DevAstroAI",
  description:
    "DevAstroAI terms of service. The app is free to use and is for informational and entertainment purposes only — not a substitute for professional advice.",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <LegalShell title="Terms of Service" updated="April 20, 2026">
      <P>
        Welcome. By using DevAstroAI you agree to these terms. The short
        version: <B>the app is free, it's for insight and entertainment, and
        nothing it produces is professional advice.</B>
      </P>

      <H>Who we are</H>
      <P>
        DevAstroAI ("we", "our", "the service") is a personal software
        project operated from <B>Ontario, Canada</B> (placeholder — will be
        updated when the legal entity is finalized). Contact us at{" "}
        <A href="mailto:hello@devastroai.com">hello@devastroai.com</A>.
      </P>

      <H>Who can use it</H>
      <P>
        You must be <B>at least 18 years old</B> to use DevAstroAI. By using
        the service you confirm that you meet this age requirement and that
        you are using it for yourself (or on behalf of a consenting adult if
        you are an astrologer).
      </P>

      <H>The service is free today</H>
      <P>
        DevAstroAI is currently offered free of charge with no account
        required. We may introduce paid features in the future — if so, they
        will be clearly labeled and we will update these terms before they
        apply to you. You will never be charged for anything you used for
        free before the change.
      </P>

      <H>Important — nothing here is professional advice</H>
      <P>
        DevAstroAI generates astrological interpretations using computed
        charts and a large language model. Output from the app is intended
        for <B>informational and entertainment purposes only</B>. It is{" "}
        <B>not</B> and should never be treated as:
      </P>
      <Ul>
        <Li>Medical, mental-health, or psychological advice</Li>
        <Li>Legal or financial advice</Li>
        <Li>Relationship, marital, or family counselling</Li>
        <Li>Career or educational counselling</Li>
        <Li>Any form of fortune-telling or guaranteed prediction</Li>
      </Ul>
      <P>
        Do not make significant life decisions based solely on output from
        this app. If you are facing a serious problem — health, legal,
        financial, or personal — please consult a qualified, licensed
        professional.
      </P>

      <H>Acceptable use</H>
      <P>Please do not:</P>
      <Ul>
        <Li>
          Use the service for anything illegal, harassing, discriminatory, or
          harmful to others.
        </Li>
        <Li>
          Attempt to break, overload, scrape, or reverse-engineer the backend
          APIs.
        </Li>
        <Li>
          Use automated scripts or bots to submit large numbers of chart
          requests (this wastes the AI budget for everyone).
        </Li>
        <Li>
          Enter another person's birth details without their consent. If you
          are an astrologer using the app for a client, it is your
          responsibility to obtain their consent.
        </Li>
      </Ul>

      <H>Your content</H>
      <P>
        The chart inputs and questions you type stay on your device and are
        transmitted to the backend only to compute a response. We do not
        claim ownership of anything you enter. Because we don't persist your
        data (see the <A href="/privacy">Privacy Policy</A>), there is
        nothing to "submit" or license to us.
      </P>

      <H>Our content</H>
      <P>
        The DevAstroAI name, logo, website design, and underlying code are
        ours. You're welcome to use the service freely, link to it, and tell
        friends. Please do not re-host, clone, or rebrand the site without
        written permission.
      </P>
      <P>
        AI-generated interpretations you see in the app are yours to do with
        as you please — save them, share them, paste them into a journal.
        They are not copyrighted by us.
      </P>

      <H>No warranty</H>
      <P>
        The service is provided "as is" and "as available", without any
        warranty of accuracy, reliability, availability, or fitness for any
        particular purpose. Astronomical computations are done to the best of
        our engines' ability, but we make no guarantee that any specific
        chart, prediction, or interpretation is correct. AI output can
        hallucinate — verify anything that matters.
      </P>

      <H>Limitation of liability</H>
      <P>
        To the maximum extent permitted by applicable law, DevAstroAI, its
        operators, and its contributors are not liable for any direct,
        indirect, incidental, consequential, or punitive damages arising
        from your use of the service, including decisions you make based on
        its output. Because the service is free, you acknowledge that your
        sole remedy for any dissatisfaction is to stop using it.
      </P>

      <H>Third-party services</H>
      <P>
        The app relies on third parties that have their own terms:{" "}
        <A href="https://www.anthropic.com/legal/consumer-terms">Anthropic</A>{" "}
        (for AI interpretation),{" "}
        <A href="https://operations.osmfoundation.org/policies/nominatim/">
          OpenStreetMap Nominatim
        </A>{" "}
        (for place autocomplete), Vercel (frontend hosting), and Railway
        (backend hosting). We are not responsible for third-party outages or
        policy changes.
      </P>

      <H>Changes to these terms</H>
      <P>
        We may update these terms from time to time. Material changes will
        be announced on the landing page and the "Last updated" date at the
        top of this page will change. Continued use of the service after a
        change means you accept the revised terms.
      </P>

      <H>Governing law</H>
      <P>
        These terms are governed by the laws of the Province of Ontario,
        Canada (placeholder jurisdiction — will be updated when the legal
        entity is finalized), without regard to conflict-of-law principles.
        Any dispute arising out of your use of the service shall be heard in
        the courts of that jurisdiction.
      </P>

      <H>Contact</H>
      <P>
        Email us at{" "}
        <A href="mailto:hello@devastroai.com">hello@devastroai.com</A> with
        any question or concern about these terms.
      </P>
    </LegalShell>
  );
}
