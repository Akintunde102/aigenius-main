import { DocPage, DocSection, DocList, DocLink } from "../components/DocPage";

const PRIVACY_SECTIONS = [
  { id: "who-we-are", title: "1) Who we are" },
  { id: "scope", title: "2) Scope" },
  { id: "information-we-collect", title: "3) Information we collect" },
  { id: "ai-llm-processing", title: "4) AI and LLM processing" },
  { id: "how-we-use", title: "5) How we use information" },
  { id: "legal-bases", title: "6) Legal bases (EEA/UK)" },
  { id: "cookies", title: "7) Cookies and local storage" },
  { id: "how-we-share", title: "8) How we share information" },
  { id: "international-transfers", title: "9) International transfers" },
  { id: "security", title: "10) Security" },
  { id: "data-retention", title: "11) Data retention" },
  { id: "your-rights", title: "12) Your rights" },
  { id: "children", title: "13) Children" },
  { id: "customer-data-dpa", title: "14) Customer Data and DPA" },
  { id: "changes", title: "15) Changes to this policy" },
  { id: "contact", title: "16) Contact" },
];

export default function PrivacyPolicyPage() {
  return (
    <DocPage
      effectiveDate="15 February 2025"
      effectiveDateIso="2025-02-15"
      sections={PRIVACY_SECTIONS}
    >
      <p className="text-stone-700 leading-[1.7]">
        This Privacy Policy explains how Nobox Labs Limited (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;) collects, uses, and shares
        information when you visit or use <strong className="text-stone-900">AIGenius</strong>, our pay-as-you-go AI chat platform available at{" "}
        <DocLink href="https://aigenius.chat" external>https://aigenius.chat</DocLink>,
        including the website, web console, API, and related services (collectively, the &quot;Services&quot;).
      </p>

      <DocSection id="who-we-are" title="1) Who we are">
        <p>
          <strong className="text-stone-900">Data controller:</strong> Nobox Labs Limited. We operate AIGenius. When you use our Services, we act as the controller of your account and usage information. If you use our backend platform to store or process data on behalf of your end users, you are the controller of that data and we act as your processor. Our Data Processing Addendum (DPA) governs processor activities and is available on request.
        </p>
      </DocSection>

      <DocSection id="scope" title="2) Scope">
        <p>
          This policy applies to personal data we collect about visitors, account holders, and users of AIGenius. It does not apply to content, records, or datasets you store in our backend platform on behalf of your end users (&quot;Customer Data&quot;)—we process Customer Data solely per your instructions under the DPA.
        </p>
      </DocSection>

      <DocSection id="information-we-collect" title="3) Information we collect">
        <p className="mb-4">We collect the following categories of information (as implemented in our Services):</p>
        <DocList
          items={[
            <><strong className="text-stone-900">Account information:</strong> email, first name, last name, profile image, gender; password hash (if you use email authentication); OAuth profile data from Google or GitHub.</>,
            <><strong className="text-stone-900">Wallet and billing:</strong> credit balance (wallet), payment transaction records (reference, amount, currency, status, provider response) via Paystack.</>,
            <><strong className="text-stone-900">Conversations and AI usage:</strong> chat messages, model identifiers, token usage, cost per request, custom personalities (name, description, prompt, icon).</>,
            <><strong className="text-stone-900">Uploads:</strong> file names, sizes, MIME types, storage URLs, and metadata for files you upload.</>,
            <><strong className="text-stone-900">Usage and logs:</strong> request identifiers, user IDs, project and record-space references, client details, request details (e.g. timings, URLs), IP address, and user agent where logged.</>,
            <><strong className="text-stone-900">Local storage and similar tech:</strong> we use browser localStorage and sessionStorage for authentication tokens, user details, model preferences, and integration states. We may use cookies where required for session management. See &quot;Cookies and local storage&quot; below.</>,
            <><strong className="text-stone-900">Integrations:</strong> data we receive from third-party services you connect (e.g. Google OAuth, Gmail, Paystack), governed by their policies.</>,
          ]}
        />
      </DocSection>

      <DocSection id="ai-llm-processing" title="4) AI and LLM processing">
        <p>
          AIGenius routes your prompts and conversation content to third-party AI providers via OpenRouter. These providers (e.g. OpenAI, Anthropic, Google, DeepSeek, Qwen, Mistral, Meta, xAI, and others) process your messages to generate responses. Their privacy policies and terms apply to that processing. We retain conversation data in our systems for chat history and billing; we do not control how AI providers retain or use data. When you use optional integrations (e.g. Gmail), the AI may call external APIs on your behalf.
        </p>
      </DocSection>

      <DocSection id="how-we-use" title="5) How we use information">
        <DocList
          items={[
            "Provide, operate, secure, and maintain the Services.",
            "Authenticate users, prevent fraud and abuse, and enforce policies.",
            "Process payments, manage your credit wallet, and deduct usage costs.",
            "Monitor performance, fix issues, and improve features.",
            "Communicate important updates, security notices, and support responses.",
            "Comply with legal obligations and defend legal claims.",
            "Create aggregated or de-identified insights that cannot reasonably identify you.",
          ]}
        />
      </DocSection>

      <DocSection id="legal-bases" title="6) Legal bases (EEA/UK)">
        <p className="mb-4">Where applicable, we rely on:</p>
        <DocList
          items={[
            <><strong className="text-stone-900">Contract:</strong> to provide the Services you requested.</>,
            <><strong className="text-stone-900">Legitimate interests:</strong> to improve security, performance, and Services; prevent abuse.</>,
            <><strong className="text-stone-900">Consent:</strong> for optional cookies or marketing where required.</>,
            <><strong className="text-stone-900">Legal obligation:</strong> to comply with applicable laws.</>,
          ]}
        />
      </DocSection>

      <DocSection id="cookies" title="7) Cookies and local storage">
        <p>
          We use browser localStorage and sessionStorage for authentication tokens, user details, and preferences. We may use cookies for session management. You can control cookies through your browser settings and clear localStorage/sessionStorage; doing so may log you out. If required by law, we will request consent for non-essential cookies.
        </p>
      </DocSection>

      <DocSection id="how-we-share" title="8) How we share information">
        <DocList
          items={[
            <><strong className="text-stone-900">AI providers:</strong> prompts and conversation content are sent to OpenRouter and underlying providers (OpenAI, Anthropic, Google, etc.) to generate responses.</>,
            <><strong className="text-stone-900">Payment provider:</strong> Paystack processes payment data; their policies apply.</>,
            <><strong className="text-stone-900">OAuth providers:</strong> Google and GitHub handle sign-in; their policies apply.</>,
            <><strong className="text-stone-900">Storage:</strong> AWS S3 or Cloudinary may store uploaded files; their policies apply.</>,
            <><strong className="text-stone-900">Service providers/subprocessors:</strong> bound by confidentiality and security obligations.</>,
            <><strong className="text-stone-900">Legal and safety:</strong> to comply with law, protect rights, safety, and prevent fraud/abuse.</>,
            <><strong className="text-stone-900">Business transfers:</strong> in relation to a merger, acquisition, or asset sale.</>,
            "We do not sell personal information.",
          ]}
        />
      </DocSection>

      <DocSection id="international-transfers" title="9) International transfers">
        <p>
          We may transfer personal data to countries other than your own. Where required, we use appropriate safeguards such as Standard Contractual Clauses and technical or organizational measures.
        </p>
      </DocSection>

      <DocSection id="security" title="10) Security">
        <p>
          We implement administrative, technical, and physical measures to protect personal data. No system is 100% secure. You share responsibility for securing your account, API keys, and data (e.g. access controls, backups).
        </p>
      </DocSection>

      <DocSection id="data-retention" title="11) Data retention">
        <p>
          We retain personal data for as long as necessary to provide the Services and comply with legal obligations. Logs and backups are kept for limited periods. You can request deletion of your account data; Customer Data retention is controlled by you as the controller.
        </p>
      </DocSection>

      <DocSection id="your-rights" title="12) Your rights">
        <p className="mb-4">Subject to applicable law, you may have rights to:</p>
        <DocList
          items={[
            "Access, correct, or delete your personal data.",
            "Object to or restrict processing, or request portability.",
            "Withdraw consent where processing is based on consent.",
            "Lodge a complaint with your local data protection authority.",
          ]}
        />
        <p className="mt-4">Contact us to exercise these rights.</p>
      </DocSection>

      <DocSection id="children" title="13) Children">
        <p>
          The Services are not directed to children under 13 (or the age of digital consent in your jurisdiction). We do not knowingly collect personal data from such children.
        </p>
      </DocSection>

      <DocSection id="customer-data-dpa" title="14) Customer Data and DPA">
        <p>
          For Customer Data you store or process via our backend platform, you are the controller and we are your processor. We process Customer Data only per your instructions and our DPA. For a copy of our DPA, contact us.
        </p>
      </DocSection>

      <DocSection id="changes" title="15) Changes to this policy">
        <p>
          We may update this policy from time to time. We will post the updated version here and revise the &quot;Effective date&quot; above. Material changes will be communicated through the Service.
        </p>
      </DocSection>

      <DocSection id="contact" title="16) Contact">
        <div className="space-y-2 text-stone-700">
          <p className="font-semibold text-stone-900">Nobox Labs Limited</p>
          <p>Website: <DocLink href="https://aigenius.chat" external>https://aigenius.chat</DocLink></p>
          <p>Email: <DocLink href="mailto:nobox.hq@gmail.com">nobox.hq@gmail.com</DocLink></p>
        </div>
      </DocSection>
    </DocPage>
  );
}
