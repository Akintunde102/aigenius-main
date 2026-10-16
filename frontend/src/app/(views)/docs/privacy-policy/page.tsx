import { DocPage, DocSection, DocList, DocLink } from "../components/DocPage";

const PRIVACY_SECTIONS = [
  { id: "who-we-are", title: "1) Who we are" },
  { id: "scope", title: "2) Scope & platform architecture" },
  { id: "information-we-collect", title: "3) Information we collect" },
  { id: "ai-llm-processing", title: "4) AI processing, models & training policy" },
  { id: "google-integrations", title: "5) Google API data & integrations (Limited Use)" },
  { id: "how-we-use", title: "6) How we use information" },
  { id: "legal-bases", title: "7) Legal bases (NDPA, GDPR & international)" },
  { id: "cookies", title: "8) Cookies, local storage & session replay" },
  { id: "how-we-share", title: "9) How we share information & subprocessors" },
  { id: "international-transfers", title: "10) International transfers" },
  { id: "security", title: "11) Security & your responsibilities" },
  { id: "data-retention", title: "12) Data retention" },
  { id: "your-rights", title: "13) Your rights" },
  { id: "children", title: "14) Children" },
  { id: "customer-data-dpa", title: "15) Customer Data and DPA" },
  { id: "changes", title: "16) Changes to this policy" },
  { id: "contact", title: "17) Contact & Data Protection Officer" },
];

export default function PrivacyPolicyPage() {
  return (
    <DocPage
      effectiveDate="8 October 2026"
      effectiveDateIso="2026-10-08"
      sections={PRIVACY_SECTIONS}
    >
      <p>
        This Privacy Policy explains how Nobox Labs Limited (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) collects, uses, and shares
        information when you visit or use <strong>AIGenius</strong>, our pay-as-you-go AI chat platform available at{" "}
        <DocLink href="https://aigenius.noboxlabs.xyz" external>https://aigenius.noboxlabs.xyz</DocLink>,
        including the web application, web console, desktop application (Electron runtime for macOS, Windows, and Linux), local sidecar services, APIs, and related software (collectively, the &quot;Services&quot;).
      </p>

      <DocSection id="who-we-are" title="1) Who we are">
        <p>
          <strong>Data controller:</strong> Nobox Labs Limited (a company incorporated in the Federal Republic of Nigeria). When you register for an account, top up your wallet, or interact directly with our Services, we act as the data controller of your account, billing, and operational usage data.
        </p>
        <p>
          <strong>Data processor:</strong> If you use our enterprise or workspace features to store, route, or process data on behalf of your own end users (&quot;Customer Data&quot;), you act as the data controller and Nobox Labs Limited acts as your data processor. Our Data Processing Addendum (DPA) governs those processor activities and is available upon request.
        </p>
      </DocSection>

      <DocSection id="scope" title="2) Scope & platform architecture">
        <p>
          This policy applies to personal data collected across the AIGenius ecosystem:
        </p>
        <DocList
          items={[
            <><strong>Web & Cloud Services:</strong> The web interface, cloud APIs, billing gateway, and server-side chat orchestrators hosted at or under <code className="text-sm">noboxlabs.xyz</code>.</>,
            <><strong>Desktop Application & Local Sidecar:</strong> When you run the AIGenius desktop application, local project files, local Git repositories, or workspace paths processed by the embedded desktop sidecar remain on your local device. Local workspace files are only transmitted to our cloud or external AI providers when you explicitly attach them to a prompt or submit them to an AI model for analysis.</>,
            <><strong>Exclusions (Customer Data):</strong> This policy does not govern third-party customer datasets stored in your private databases or processed under your direction as a business customer. Those are governed by our DPA.</>,
          ]}
        />
      </DocSection>

      <DocSection id="information-we-collect" title="3) Information we collect">
        <p className="mb-4">We collect only information necessary to deliver, secure, and bill for the Services:</p>
        <DocList
          items={[
            <><strong>Account information:</strong> Full name, email address, profile avatar, gender (where provided), password hash (for email/password registration), and OAuth profile metadata provided by Google or GitHub.</>,
            <><strong>Wallet & billing records:</strong> Credit balances, currency denominations, top-up history, transaction references, and payment gateway callback responses (processed securely by Paystack, Payaza, or Flutterwave). We do not store or process raw credit card numbers or bank account PINs on our servers.</>,
            <><strong>Prompts & AI usage metadata:</strong> Conversation messages, attached files/code snippets, selected model identifiers, token consumption counts, cost calculations per completion, and custom persona configurations (name, description, system prompt, avatar).</>,
            <><strong>Uploads & attachments:</strong> File names, file sizes, MIME types, cloud storage URLs (via Amazon S3 or Cloudinary), and content hashes for documents and images you upload to the chat.</>,
            <><strong>Technical, device & network logs:</strong> IP addresses, browser user agent, operating system, client version, request timestamps, referring URLs, and unique request identifiers logged for security, rate-limiting, and fraud prevention.</>,
            <><strong>Crash & diagnostic telemetry:</strong> When client-side errors occur, our application transmits sanitized error reports (including call stacks, URL paths, and error codes) to our crash collector API. PII and secrets (such as bearer tokens and API keys) are clipped and redacted before transmission.</>,
            <><strong>Product analytics (consent-based):</strong> When you consent via our cookie banner, we use PostHog to record pseudonymous interaction metrics (e.g., page views, feature adoption, session duration). See Section 8 for our strict prompt-masking policy.</>,
          ]}
        />
      </DocSection>

      <DocSection id="ai-llm-processing" title="4) AI processing, models & training policy">
        <p className="mb-4">
          AIGenius provides an aggregated multi-model workspace by routing prompts and conversation context through high-reliability AI gateways (including OpenRouter) to third-party model providers (e.g., OpenAI, Anthropic, Google DeepMind, DeepSeek, Mistral, Meta, xAI, Cohere, and others).
        </p>
        <p className="mb-4">
          <strong>No foundation model training:</strong> Nobox Labs Limited does <strong>not</strong> sell, license, or use your chat messages, code files, or AI responses to train, re-train, or fine-tune public foundation artificial intelligence or machine learning models.
        </p>
        <p className="mb-4">
          <strong>Commercial API provider terms:</strong> We route requests through commercial and enterprise API endpoints. Under the standard enterprise terms of our primary gateway and upstream AI providers, prompts submitted via paid API endpoints are not used to train provider foundation models unless explicitly designated. Model providers may temporarily retain inputs in encrypted, access-controlled logs for up to 30 days strictly to detect abuse and comply with legal obligations, after which they are deleted.
        </p>
        <p>
          <strong>AI outputs & user discretion:</strong> AI responses are generated probabilistically and are provided &quot;as is&quot;. You are responsible for reviewing, verifying, and validating any output (including source code, legal text, or factual statements) before relying on it or deploying it.
        </p>
      </DocSection>

      <DocSection id="google-integrations" title="5) Google API data & integrations (Limited Use)">
        <p className="mb-4">
          AIGenius offers optional integrations with Google services, such as Google Sign-In and Gmail productivity tools. When you connect your Google account:
        </p>
        <DocList
          items={[
            <><strong>Scope of access:</strong> We access only the specific Google account data and scopes you explicitly authorize (e.g., viewing email metadata or sending messages you draft using AI assistance).</>,
            <><strong>Compliance with Google Limited Use Requirements:</strong> AIGenius&apos;s use and transfer to any other app of information received from Google APIs adheres to the <DocLink href="https://developers.google.com/terms/api-services-user-data-policy" external>Google API Services User Data Policy</DocLink>, including the Limited Use requirements.</>,
            <><strong>No AI model training on Google data:</strong> Data obtained via Google APIs is never used to develop, train, or fine-tune generalized artificial intelligence or machine learning models.</>,
            <><strong>No advertising or data sales:</strong> We never sell, transfer, or disclose Google user data to third parties for advertising, retargeting, or data broker purposes.</>,
            <><strong>Revocation:</strong> You can disconnect your Google account and revoke AIGenius permissions at any time through your Google Account Security settings or within the AIGenius application.</>,
          ]}
        />
      </DocSection>

      <DocSection id="how-we-use" title="6) How we use information">
        <DocList
          items={[
            "Deliver, operate, maintain, and troubleshoot the AIGenius web and desktop platform.",
            "Authenticate your identity, manage sessions, and protect accounts from unauthorized takeover.",
            "Process pay-as-you-go credit top-ups, deduct real-time token usage costs, and maintain immutable ledger balances.",
            "Dispatch your prompts and attachments to selected AI models and stream responses back to your client.",
            "Enforce rate limits, abuse thresholds, and system security to protect our infrastructure from DDoS attacks and exploits.",
            "Analyze aggregated and de-identified platform metrics to improve UI responsiveness and optimize model routing latency.",
            "Deliver transactional notifications, receipts, critical security notices, and customer support communications.",
            "Fulfill legal, tax, financial accounting, and regulatory compliance requirements.",
          ]}
        />
      </DocSection>

      <DocSection id="legal-bases" title="7) Legal bases (NDPA, GDPR & international)">
        <p className="mb-4">
          We process personal data lawfully under applicable privacy frameworks, including the <strong>Nigeria Data Protection Act (NDPA 2023)</strong>, the <strong>General Data Protection Regulation (GDPR / UK GDPR)</strong>, and relevant US privacy statutes:
        </p>
        <DocList
          items={[
            <><strong>Contractual performance:</strong> Processing required to fulfill our Terms of Service (authenticating you, executing AI completions, managing your credit balance, and providing customer support).</>,
            <><strong>Legitimate interests:</strong> Securing our systems, detecting fraudulent credit usage, diagnosing software defects, and improving platform performance, provided your rights do not override these interests.</>,
            <><strong>Consent:</strong> When you affirmatively accept optional analytics cookies/session replay or connect optional third-party integrations (e.g., Gmail). You may withdraw consent at any time.</>,
            <><strong>Legal obligation:</strong> Retaining financial transaction records for tax compliance and cooperating with lawful judicial or law enforcement directives.</>,
          ]}
        />
      </DocSection>

      <DocSection id="cookies" title="8) Cookies, local storage & session replay">
        <p className="mb-4">
          <strong>Essential storage:</strong> We use browser <code className="text-sm">localStorage</code>, <code className="text-sm">sessionStorage</code>, and secure HTTP cookies to store authentication tokens, theme preferences, and your cookie consent preference (<code className="text-sm">aigenius_analytics_consent_v1</code>). These are strictly necessary for the application to function.
        </p>
        <p className="mb-4">
          <strong>Product analytics (consent required):</strong> If you select <strong>Accept</strong> on our cookie banner, we load PostHog (US Cloud: posthog.com) to understand user flows, navigation events, and interface performance. If you click <strong>Decline</strong>, PostHog scripts are completely blocked.
        </p>
        <p className="mb-4">
          <strong>Session replay & input masking safeguards:</strong> When analytics consent is granted, PostHog may record diagnostic session replays of on-screen UI interactions. To protect your privacy:
        </p>
        <DocList
          items={[
            "All text areas, chat message inputs, API key fields, and prompt response streams are configured with client-side masking rules to suppress sensitive text capture.",
            "We do not deliberately transmit chat message bodies, code attachments, or prompt text as analytics event payloads.",
            "Users must exercise sound discretion and refrain from inputting unencrypted credentials, passwords, or government-issued personal identification into prompt fields.",
          ]}
        />
      </DocSection>

      <DocSection id="how-we-share" title="9) How we share information & subprocessors">
        <p className="mb-4">
          We do not sell, rent, or trade your personal data. We disclose data solely to trusted subprocessors and service providers who are contractually bound by data protection and confidentiality agreements:
        </p>
        <DocList
          items={[
            <><strong>AI Model Providers & Routing:</strong> OpenRouter, Inc., OpenAI, LLC, Anthropic, PBC, Google LLC, DeepSeek, and other underlying inference providers selected by you to fulfill model requests.</>,
            <><strong>Payment Processors:</strong> Paystack Payments Limited, Flutterwave Inc., and Payaza to process credit top-ups, fraud checks, and billing webhooks.</>,
            <><strong>Cloud Hosting & Object Storage:</strong> Amazon Web Services (AWS) and Cloudinary for infrastructure hosting, database storage, and secure media file uploads.</>,
            <><strong>OAuth & Identity Providers:</strong> Google LLC and GitHub, Inc. for federated user authentication.</>,
            <><strong>Product Analytics & Diagnostics:</strong> PostHog, Inc. (only upon affirmative user consent) for anonymized product telemetry.</>,
            <><strong>Legal, Regulatory & Business Transfers:</strong> When required by binding legal process, court orders, or in connection with a corporate merger, reorganization, or asset sale.</>,
          ]}
        />
      </DocSection>

      <DocSection id="international-transfers" title="10) International transfers">
        <p>
          Nobox Labs Limited operates globally. Because our cloud infrastructure, AI model gateways, and payment partners are located across Nigeria, the European Union, the United Kingdom, and the United States, your personal data may be transferred to and processed in jurisdictions other than your home country.
        </p>
        <p>
          Where cross-border transfers occur, we implement recognized transfer mechanisms, including the Standard Contractual Clauses (SCCs) approved by the European Commission, UK International Data Transfer Agreements (IDTAs), and NDPA-compliant cross-border transfer safeguards.
        </p>
      </DocSection>

      <DocSection id="security" title="11) Security & your responsibilities">
        <p className="mb-4">
          We maintain rigorous technical, physical, and administrative measures to protect your data, including TLS 1.3/1.2 encryption in transit, encrypted database storage at rest, strict least-privilege role-based access controls, and automated credential redaction in diagnostic logs.
        </p>
        <p className="mb-4">
          <strong>Your shared responsibility:</strong>
        </p>
        <DocList
          items={[
            "You are responsible for keeping your login credentials, personal passwords, and personal API keys confidential.",
            "When using the desktop application, you are responsible for maintaining the physical security of your local computer and controlling access to your local filesystem and sidecar ports.",
            "Immediately notify us at security@noboxlabs.xyz or privacy@noboxlabs.xyz if you suspect unauthorized access to your account.",
          ]}
        />
      </DocSection>

      <DocSection id="data-retention" title="12) Data retention">
        <p className="mb-4">
          We retain personal data only for as long as necessary to fulfill the purposes outlined in this policy:
        </p>
        <DocList
          items={[
            <><strong>Account & chat history:</strong> Retained for the duration of your active account. You may delete individual chat conversations or purge your account directly through the application settings.</>,
            <><strong>Financial transaction records:</strong> Retained for a minimum statutory period (typically 5 to 7 years) to satisfy tax, anti-money laundering (AML), and financial reporting laws.</>,
            <><strong>Diagnostic & server access logs:</strong> Retained for up to 90 days for network security and debugging, after which they are automatically rotated and purged.</>,
          ]}
        />
      </DocSection>

      <DocSection id="your-rights" title="13) Your rights">
        <p className="mb-4">
          Depending on your location and applicable law (including NDPA 2023, GDPR, UK Data Protection Act, and US state privacy regulations), you have the right to:
        </p>
        <DocList
          items={[
            "Access a copy of the personal data we hold about you.",
            "Rectify inaccurate, outdated, or incomplete personal data.",
            "Request the erasure (deletion) of your personal data (&quot;right to be forgotten&quot;).",
            "Restrict or object to the processing of your data under certain conditions.",
            "Receive your data in a portable, structured, machine-readable format.",
            "Withdraw consent at any time for consent-based processing (e.g., analytics or marketing).",
            "Lodge a complaint with your supervisory authority, including the Nigeria Data Protection Commission (NDPC) or your regional data protection commissioner.",
          ]}
        />
        <p className="mt-4">
          To exercise your rights, email us at <DocLink href="mailto:privacy@noboxlabs.xyz">privacy@noboxlabs.xyz</DocLink>. We will respond within the statutory timeframe (usually 30 days).
        </p>
      </DocSection>

      <DocSection id="children" title="14) Children">
        <p>
          The Services are not designed for or marketed to individuals under the age of 13 (or the applicable age of digital consent in your jurisdiction, such as 16 in certain EU member states). We do not knowingly collect personal data from minors. If you believe a child has provided us with personal information without parental consent, please contact us immediately, and we will take prompt steps to delete the data and terminate the account.
        </p>
      </DocSection>

      <DocSection id="customer-data-dpa" title="15) Customer Data and DPA">
        <p>
          For corporate, developer, or organizational users who ingest or process end-user personal data through our APIs or backend records, you remain the Data Controller and Nobox Labs Limited acts as your Data Processor. We process Customer Data solely in accordance with your written instructions and our Data Processing Addendum (DPA). To review and execute our standard DPA, contact <DocLink href="mailto:legal@noboxlabs.xyz">legal@noboxlabs.xyz</DocLink>.
        </p>
      </DocSection>

      <DocSection id="changes" title="16) Changes to this policy">
        <p>
          We may revise this Privacy Policy periodically to reflect enhancements to our platform, changes in our subprocessor ecosystem, or updates to global privacy legislation. When material changes occur, we will notify you through an in-app notice, email notification, or by updating the &quot;Effective date&quot; at the top of this page. Your continued use of the Services after the effective date constitutes acknowledgment of the revised policy.
        </p>
      </DocSection>

      <DocSection id="contact" title="17) Contact & Data Protection Officer">
        <div className="space-y-3">
          <p className="font-semibold text-lg">Nobox Labs Limited</p>
          <p>
            For privacy inquiries, rights requests, data processing agreements, or security reports, reach our legal and data protection team:
          </p>
          <p>
            <strong>Privacy & Data Protection:</strong>{" "}
            <DocLink href="mailto:privacy@noboxlabs.xyz">privacy@noboxlabs.xyz</DocLink>
          </p>
          <p>
            <strong>Legal & Contracts:</strong>{" "}
            <DocLink href="mailto:legal@noboxlabs.xyz">legal@noboxlabs.xyz</DocLink>
          </p>
          <p>
            <strong>Website:</strong>{" "}
            <DocLink href="https://aigenius.noboxlabs.xyz" external>https://aigenius.noboxlabs.xyz</DocLink>
          </p>
        </div>
      </DocSection>
    </DocPage>
  );
}
