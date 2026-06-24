import Link from "next/link";
import { DocPage, DocSection, DocList, DocLink } from "../components/DocPage";

const TERMS_SECTIONS = [
  { id: "account-responsibilities", title: "1) Your account and responsibilities" },
  { id: "use-of-services", title: "2) Use of the Services" },
  { id: "ai-outputs", title: "3) AI outputs and third-party models" },
  { id: "customer-data-privacy", title: "4) Customer Data and privacy" },
  { id: "intellectual-property", title: "5) Intellectual property" },
  { id: "billing-payments", title: "6) Billing and payments" },
  { id: "availability-support", title: "7) Service availability and support" },
  { id: "termination", title: "8) Termination" },
  { id: "limitation-of-liability", title: "9) Limitation of liability" },
  { id: "indemnification", title: "10) Indemnification" },
  { id: "governing-law", title: "11) Governing law and disputes" },
  { id: "changes-to-terms", title: "12) Changes to terms" },
  { id: "contact", title: "13) Contact" },
];

export default function TermsAndConditionsPage() {
  return (
    <DocPage
      effectiveDate="15 February 2025"
      effectiveDateIso="2025-02-15"
      sections={TERMS_SECTIONS}
    >
      <p className="text-stone-700 leading-[1.7]">
        These Terms of Service (&quot;Terms&quot;) govern your access to and use of <strong className="text-stone-900">AIGenius</strong>, a pay-as-you-go AI chat platform offered by Nobox Labs Limited (&quot;we&quot;, &quot;us&quot;, &quot;our&quot;). By using the Services, you agree to these Terms.
      </p>

      <DocSection id="account-responsibilities" title="1) Your account and responsibilities">
        <DocList
          items={[
            "You must be at least 13 years old (or the age of digital consent in your jurisdiction) to use the Services.",
            "Provide accurate information and keep your account secure. You are responsible for activities under your account.",
            "Protect your credentials, API keys, and data. Promptly notify us of unauthorized use.",
          ]}
        />
      </DocSection>

      <DocSection id="use-of-services" title="2) Use of the Services">
        <DocList
          items={[
            "Comply with applicable laws, these Terms, and policies referenced here.",
            "No misuse: do not attempt to breach security, reverse engineer, disrupt, or overload our systems.",
            "You are responsible for data you process with AIGenius and for obtaining necessary rights and consents.",
            "Rate limits, quotas, and fair use policies may apply.",
          ]}
        />
      </DocSection>

      <DocSection id="ai-outputs" title="3) AI outputs and third-party models">
        <p className="mb-4">
          AIGenius routes your prompts to third-party AI providers (e.g. OpenAI, Anthropic, Google, DeepSeek, Qwen, Mistral, Meta, xAI, and others) via OpenRouter. AI-generated responses are provided &quot;as is&quot; without warranty. We do not guarantee accuracy, completeness, or suitability of AI outputs.
        </p>
        <DocList
          items={[
            "You are solely responsible for your use of AI outputs, including verification and any decisions based on them.",
            "AI provider terms and policies apply to their processing of your prompts and responses.",
            "Do not input sensitive personal data, confidential information, or data you are not authorized to share.",
          ]}
        />
      </DocSection>

      <DocSection id="customer-data-privacy" title="4) Customer Data and privacy">
        <p className="mb-4">
          You retain ownership of your content and data. We process it solely to provide the Services and as directed by you. Our <Link href="/docs/privacy-policy" className="font-medium text-cyan-600 hover:text-cyan-700 hover:underline">Privacy Policy</Link> explains how we handle your personal information.
        </p>
        <DocList
          items={[
            "You control access, modification, and deletion of your data.",
            "We implement security measures to protect data in transit and at rest.",
            "Data processing is governed by our Data Processing Addendum (DPA) where applicable.",
          ]}
        />
      </DocSection>

      <DocSection id="intellectual-property" title="5) Intellectual property">
        <p className="mb-4">
          You retain rights to your content and applications. We retain rights to AIGenius and our technology.
        </p>
        <DocList
          items={[
            "You grant us limited rights to use your content to provide and improve the Services.",
            "Feedback you provide may be incorporated into our Services.",
            "Open source components may have separate licenses.",
          ]}
        />
      </DocSection>

      <DocSection id="billing-payments" title="6) Billing and payments">
        <p className="mb-4">
          AIGenius uses a pay-as-you-go credit (wallet) model. You purchase credits and use them to access AI models. There are no recurring subscription fees unless we introduce them separately.
        </p>
        <DocList
          items={[
            <><strong className="text-stone-900">Credits:</strong> Credits are purchased in Naira (₦) via Paystack. A minimum amount per transaction may apply.</>,
            <><strong className="text-stone-900">Usage:</strong> Each AI request consumes credits based on model pricing and token usage. You must maintain a sufficient balance to use models.</>,
            <><strong className="text-stone-900">Insufficient funds:</strong> If your balance is below the required minimum, you may be unable to use certain models until you add credits.</>,
            <><strong className="text-stone-900">Refunds:</strong> Refunds are handled according to our refund policy. Contact us for refund requests.</>,
            <><strong className="text-stone-900">Payment provider:</strong> Paystack processes payments; their terms and policies apply.</>,
          ]}
        />
      </DocSection>

      <DocSection id="availability-support" title="7) Service availability and support">
        <p className="mb-4">
          We strive for high availability but cannot guarantee 100% uptime. AI model availability depends on third-party providers (e.g. OpenRouter, OpenAI, Anthropic).
        </p>
        <DocList
          items={[
            "Scheduled maintenance will be communicated in advance when possible.",
            "We provide status updates during major incidents.",
            "Support is available via the contact information below.",
          ]}
        />
      </DocSection>

      <DocSection id="termination" title="8) Termination">
        <DocList
          items={[
            "You may cancel your account at any time through the console.",
            "We may terminate accounts that violate these Terms or for other lawful reasons.",
            "Upon termination, you lose access to the Services and your data.",
            "Unused credits are non-refundable unless required by law.",
          ]}
        />
      </DocSection>

      <DocSection id="limitation-of-liability" title="9) Limitation of liability">
        <p className="mb-4">
          To the maximum extent permitted by law, we are not liable for indirect, incidental, consequential, special, or punitive damages. Our liability for claims arising from or related to these Terms or the Services is limited to the amounts you paid us for the Services in the 12 months preceding the claim.
        </p>
        <DocList
          items={[
            "We are not liable for AI outputs, third-party provider failures, or your reliance on AI-generated content.",
            "Exclusions or limitations may not apply where prohibited by law (e.g. gross negligence, willful misconduct, statutory rights).",
            "You are responsible for backing up your data.",
          ]}
        />
      </DocSection>

      <DocSection id="indemnification" title="10) Indemnification">
        <p className="mb-4">
          You agree to defend, indemnify, and hold us harmless from claims arising from your use of the Services, your content, your violation of these Terms, or your violation of any third-party rights.
        </p>
        <DocList
          items={[
            "This includes claims related to data, third-party integrations (e.g. Gmail), AI outputs, and intellectual property.",
            "We will provide reasonable cooperation in your defense.",
            "You may not settle claims that admit fault or impose obligations on us without our consent.",
          ]}
        />
      </DocSection>

      <DocSection id="governing-law" title="11) Governing law and disputes">
        <DocList
          items={[
            "These Terms are governed by the laws of Nigeria, excluding conflict of law principles.",
            "Disputes will be resolved through good faith negotiations.",
            "If negotiations fail, disputes may be resolved through binding arbitration, where permitted.",
            "Small claims court actions may not be subject to arbitration.",
          ]}
        />
      </DocSection>

      <DocSection id="changes-to-terms" title="12) Changes to terms">
        <p className="mb-4">
          We may update these Terms from time to time. Material changes will be communicated through the Service or email.
        </p>
        <DocList
          items={[
            "Continued use after changes constitutes acceptance of the new Terms.",
            "If you disagree with changes, you may terminate your account.",
            "Previous versions are available upon request.",
          ]}
        />
      </DocSection>

      <DocSection id="contact" title="13) Contact">
        <div className="space-y-2 text-stone-700">
          <p className="font-semibold text-stone-900">Nobox Labs Limited</p>
          <p>Website: <DocLink href="https://aigenius.chat" external>https://aigenius.chat</DocLink></p>
          <p>Email: <DocLink href="mailto:nobox.hq@gmail.com">nobox.hq@gmail.com</DocLink></p>
          <p className="mt-4 text-sm text-stone-600">
            For questions about these Terms or to request a copy of our DPA, contact us using the information above.
          </p>
        </div>
      </DocSection>
    </DocPage>
  );
}
