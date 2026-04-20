/**
 * PR26 — /privacy page.
 *
 * Honest stateless-free-tier copy:
 *   - No account, no server-side data, no tracking, no analytics today.
 *   - Birth data + AI chat live in your browser session only.
 *   - Language preference stored in localStorage (one key, no PII).
 *   - AI queries sent to Anthropic (Claude) for generation.
 *
 * Placeholders to update when legal entity + domain are finalized:
 *   [CONTACT_EMAIL]  — currently hello@devastroai.com
 *   [OPERATOR_NAME]  — currently "DevAstroAI (a personal project)"
 *   [JURISDICTION]   — currently "Ontario, Canada"
 *   [EFFECTIVE_DATE] — update whenever we change the policy materially
 */

import type { Metadata } from "next";
import { LegalShell, H, P, Ul, Li, B, A } from "@/components/legal/shell";

export const metadata: Metadata = {
  title: "Privacy Policy · DevAstroAI",
  description:
    "DevAstroAI is a free, stateless KP astrology app. We don't collect accounts, don't store birth data, and don't track users. Read the full privacy policy.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalShell title="Privacy Policy" updated="April 20, 2026">
      <P>
        DevAstroAI is built on a simple promise: we don't collect, store, or
        sell your personal data. This page explains in plain language what that
        means for you.
      </P>

      <H>Who we are</H>
      <P>
        DevAstroAI is a personal project operated from <B>Ontario, Canada</B>{" "}
        (placeholder jurisdiction — will be updated when the legal entity is
        finalized). Questions? Email us at{" "}
        <A href="mailto:hello@devastroai.com">hello@devastroai.com</A>.
      </P>

      <H>What we do NOT collect</H>
      <Ul>
        <Li>No account. You don't sign up. You don't log in.</Li>
        <Li>No name, email, or phone number is required to use the app.</Li>
        <Li>
          No birth data is stored on our servers. When you enter your date,
          time, or place of birth, that data lives only in your browser's
          memory and is sent to our backend <B>once</B> to compute your chart.
          We do not keep a copy.
        </Li>
        <Li>
          No analytics, no tracking pixels, no advertising cookies. We don't
          know how many people visit the site or which tabs they click.
        </Li>
        <Li>No session recording, heatmaps, or behaviour tracking.</Li>
        <Li>No data sold or shared with data brokers or ad networks.</Li>
      </Ul>

      <H>What is stored in your browser (local only)</H>
      <P>
        We use a small amount of <B>browser localStorage</B> — data that stays
        on your device and is never sent to us:
      </P>
      <Ul>
        <Li>
          <B>Language preference</B> (English / Telugu / bilingual). One key,
          no personal info.
        </Li>
        <Li>
          <B>Command Orb position</B> (mobile) — remembers where you dragged
          the floating menu button so it stays where you put it next visit.
        </Li>
        <Li>
          A flag to remember whether you've seen the one-time onboarding coach
          tooltip on mobile.
        </Li>
      </Ul>
      <P>
        You can clear all of this at any time by clearing your browser's site
        data for this domain.
      </P>

      <H>What happens when you generate a chart</H>
      <P>
        When you fill in the onboarding form (name, birth date/time/place)
        and press generate:
      </P>
      <Ul>
        <Li>
          Your input is sent via HTTPS to our backend running on Railway. The
          backend runs our KP astrology engines and returns your chart data.
        </Li>
        <Li>
          The backend is <B>stateless</B> — it does not write your input to a
          database. Nothing is persisted server-side.
        </Li>
        <Li>
          Standard server access logs (IP address, request timestamp, path)
          are retained by our hosting provider (Railway) for up to 30 days for
          security and abuse-prevention purposes. We do not correlate these
          with your birth data or any other identifier.
        </Li>
      </Ul>

      <H>AI analysis (Claude)</H>
      <P>
        When you use the Analysis or Marriage Match tabs, we send a structured
        summary of your chart plus your question to{" "}
        <A href="https://www.anthropic.com/">Anthropic's Claude API</A> to
        generate a response. Anthropic processes the request and returns the
        reply to us, which we display to you. See{" "}
        <A href="https://www.anthropic.com/legal/privacy">
          Anthropic's privacy policy
        </A>{" "}
        for how they handle API inputs. We do not retain the question or the
        response after you close the tab.
      </P>

      <H>Place autocomplete</H>
      <P>
        When you start typing a city in the birth-place field, we query{" "}
        <A href="https://nominatim.openstreetmap.org/">OpenStreetMap Nominatim</A>{" "}
        (a free public service) for autocomplete suggestions. Nominatim sees
        only the city string you're typing, not any other part of your input.
      </P>

      <H>Children</H>
      <P>
        DevAstroAI is intended for users <B>18 years of age or older</B>. We
        do not knowingly collect information from anyone under 18. If you are
        a parent or guardian and believe your child has used the service,
        please contact us and we will confirm no data was retained.
      </P>

      <H>Your rights</H>
      <P>
        Because we don't collect personal data, there's nothing to access,
        export, or delete on our end. If you want to clear the small
        localStorage keys listed above, do so through your browser's site
        settings. You can still contact us with any privacy question or
        concern.
      </P>

      <H>International users</H>
      <P>
        The app is accessible worldwide. Because we don't store personal data,
        no international data transfer takes place on our side. Third parties
        we route requests through (Anthropic for AI, OpenStreetMap for place
        suggestions, Railway for backend hosting, Vercel for frontend hosting)
        may process requests in multiple regions — consult their policies.
      </P>

      <H>Changes</H>
      <P>
        If our practices ever change (for example, when we add accounts or
        billing in a future version), we'll update this page and bump the
        "Last updated" date at the top. Material changes that affect your
        rights will be announced on the landing page.
      </P>

      <H>Contact</H>
      <P>
        Email us at{" "}
        <A href="mailto:hello@devastroai.com">hello@devastroai.com</A>. We
        read every message.
      </P>
    </LegalShell>
  );
}
