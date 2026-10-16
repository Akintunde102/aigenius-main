import { DocPage, DocSection, DocList, DocLink } from "../components/DocPage";

const TERMS_SECTIONS = [
  { id: "agreement-and-eligibility", title: "1) Agreement to terms & eligibility" },
  { id: "services-and-architecture", title: "2) Services & platform scope" },
  { id: "account-security", title: "3) Account registration & security" },
  { id: "acceptable-use", title: "4) Acceptable use & prohibited conduct" },
  { id: "ai-outputs-tools", title: "5) AI outputs, model inference & agent actions" },
  { id: "desktop-app-local", title: "6) Desktop app & local sidecar execution" },
  { id: "content-and-ip", title: "7) Content ownership, inputs, outputs & IP" },
  { id: "billing-and-wallet", title: "8) Pay-as-you-go wallet, billing & chargebacks" },
  { id: "third-party-integrations", title: "9) Third-party integrations & external APIs" },
  { id: "service-availability", title: "10) Availability & upstream dependencies" },
  { id: "termination", title: "11) Suspension & termination" },
  { id: "disclaimer-of-warranties", title: "12) Disclaimer of warranties" },
  { id: "limitation-of-liability", title: "13) Limitation of liability" },
  { id: "indemnification", title: "14) Indemnification" },
  { id: "disputes-arbitration", title: "15) Governing law, arbitration & class action waiver" },
  { id: "general-provisions", title: "16) General terms & modifications" },
  { id: "contact", title: "17) Contact & legal notices" },
];

export default function TermsAndConditionsPage() {
  return (
    <DocPage
      effectiveDate="8 October 2026"
      effectiveDateIso="2026-10-08"
      sections={TERMS_SECTIONS}
    >
      <p>
        These Terms of Service (&quot;Terms&quot;) constitute a legally binding agreement between you (&quot;you&quot;, &quot;your&quot;, or &quot;User&quot;)
        and <strong>Nobox Labs Limited</strong> (&quot;we&quot;, &quot;us&quot;, or &quot;our&quot;), governing your access to and use of <strong>AIGenius</strong>,
        including our web platform at <DocLink href="https://aigenius.noboxlabs.xyz" external>https://aigenius.noboxlabs.xyz</DocLink>, desktop application (Electron runtime for macOS, Windows, and Linux), local sidecar server, APIs, documentation, and related services (collectively, the &quot;Services&quot;).
      </p>

      <DocSection id="agreement-and-eligibility" title="1) Agreement to terms & eligibility">
        <p className="mb-4">
          By accessing or using any part of the Services, you acknowledge that you have read, understood, and agree to be bound by these Terms and our <DocLink href="/docs/privacy-policy">Privacy Policy</DocLink>. If you do not agree to these Terms, you must immediately cease accessing and using the Services.
        </p>
        <DocList
          items={[
            <><strong>Age requirement:</strong> You must be at least 13 years old (or the legal age of digital consent in your jurisdiction, such as 16 in certain EU member states) to use the Services. If you are under the age of majority in your jurisdiction, you represent that your parent or legal guardian has reviewed and agreed to these Terms on your behalf.</>,
            <><strong>Authority to bind entity:</strong> If you use the Services on behalf of a company, organization, or other entity, you represent and warrant that you have full legal authority to bind that entity to these Terms. In that event, &quot;you&quot; and &quot;your&quot; refer collectively to both you individually and that entity.</>,
            <><strong>Export control & sanctions:</strong> You represent that you are not located in, under the control of, or a national or resident of any country subject to applicable economic sanctions or export control restrictions.</>,
          ]}
        />
      </DocSection>

      <DocSection id="services-and-architecture" title="2) Services & platform scope">
        <p className="mb-4">
          AIGenius provides a pay-as-you-go unified workspace that enables users to query multiple artificial intelligence foundation models, upload files for multimodal inspection, run coding agents, and connect developer tool integrations.
        </p>
        <DocList
          items={[
            <><strong>Ecosystem components:</strong> The Services include the cloud-hosted web console, user credit wallet, backend routing APIs, the native desktop application shell, and embedded local sidecars (<code className="text-sm">desktop-server</code>).</>,
            <><strong>Service modifications:</strong> We continually improve the Services. We reserve the right to add, modify, deprecate, or suspend specific models, tools, or interface features at any time without prior notice.</>,
          ]}
        />
      </DocSection>

      <DocSection id="account-security" title="3) Account registration & security">
        <DocList
          items={[
            "Account accuracy: You agree to provide accurate, current, and complete registration information and keep your account profile updated.",
            "Credential protection: You are solely responsible for maintaining the confidentiality of your login credentials, OAuth tokens, and API keys.",
            "Account responsibility: You are solely responsible for all activities and charges incurred under your account, whether authorized by you or not.",
            "Breach notification: You must immediately notify us at security@noboxlabs.xyz of any suspected compromise, unauthorized access, or credential exposure.",
          ]}
        />
      </DocSection>

      <DocSection id="acceptable-use" title="4) Acceptable use & prohibited conduct">
        <p className="mb-4">
          You agree not to misuse the Services or facilitate any of the following prohibited activities:
        </p>
        <DocList
          items={[
            <><strong>Illegal acts & harm:</strong> Violating any local, state, national, or international law, regulation, or court order, or promoting violence, child sexual abuse material (CSAM/CSAE), terrorism, or exploitation.</>,
            <><strong>System attacks & reverse engineering:</strong> Probing, scanning, or testing the vulnerability of our systems; launching denial-of-service (DDoS) attacks; or reverse engineering, decompiling, or disassembling the platform source code, except where strictly permitted by applicable law.</>,
            <><strong>Malware & exploit generation:</strong> Using model endpoints to generate, test, or distribute malicious software, trojans, ransomware, or exploits designed to compromise computer systems or networks.</>,
            <><strong>Misleading identity & deepfakes:</strong> Generating deceptive synthetic media, non-consensual sexual content, or fraudulent impersonations of real persons or entities.</>,
            <><strong>Automated abuse & scrapers:</strong> Scraping, harvesting, or crawling the Services without express written permission, or manipulating credit balances, billing calculations, or voucher systems.</>,
            <><strong>Downstream provider violations:</strong> Engaging in activities that breach the acceptable use policies or terms of our upstream model providers (including OpenAI, Anthropic, Google, and OpenRouter).</>,
          ]}
        />
      </DocSection>

      <DocSection id="ai-outputs-tools" title="5) AI outputs, model inference & agent actions">
        <p className="mb-4">
          AIGenius routes user queries to third-party artificial intelligence foundation models (via OpenRouter and provider APIs). You acknowledge and agree to the following AI-specific provisions:
        </p>
        <DocList
          items={[
            <><strong>Probabilistic nature & &quot;as is&quot; outputs:</strong> Artificial intelligence outputs are generated probabilistically. Outputs may contain errors, inaccuracies, incomplete logic, or hallucinations. All AI outputs are provided &quot;as is&quot; without any warranty of accuracy, fitness for purpose, or correctness.</>,
            <><strong>No professional advice:</strong> AI outputs generated through AIGenius do not constitute professional legal, financial, medical, accounting, tax, architectural, or security engineering advice. You must never rely on AI outputs as a substitute for certified human expertise.</>,
            <><strong>Human verification required:</strong> You are solely responsible for reviewing, testing, verifying, and evaluating the safety and accuracy of any output (especially software code, system configurations, and legal text) before executing, publishing, or relying upon it.</>,
            <><strong>Automated agent actions:</strong> Where our platform provides agentic tools (such as web search, document retrieval, or automated function calling), you acknowledge that actions taken by the agent are initiated under your direction and authority. You assume full risk for any consequences resulting from automated agent commands.</>,
          ]}
        />
      </DocSection>

      <DocSection id="desktop-app-local" title="6) Desktop app & local sidecar execution">
        <p className="mb-4">
          The AIGenius desktop application features embedded local sidecars (<code className="text-sm">desktop-server</code>) capable of reading local workspaces, executing terminal commands, and interacting with local development tools:
        </p>
        <DocList
          items={[
            <><strong>Host environment security:</strong> The desktop application executes on your host operating system under your operating system permissions. You maintain sole responsibility for configuring firewalls, local directory permissions, and system safeguards.</>,
            <><strong>Local filesystem modifications:</strong> When using coding agents or local tools that write, edit, delete, or refactor local files, you are responsible for maintaining version control backups (e.g., Git commits). Nobox Labs Limited is not liable for data loss, corrupted files, overwritten repositories, or unintended filesystem changes caused by local sidecar tool execution.</>,
            <><strong>Terminal & command authorization:</strong> You are strictly responsible for inspecting and approving commands executed through the desktop sidecar. Never authorize commands that format drives, delete system directories, or execute untrusted shell scripts.</>,
          ]}
        />
      </DocSection>

      <DocSection id="content-and-ip" title="7) Content ownership, inputs, outputs & IP">
        <DocList
          items={[
            <><strong>Your Input:</strong> You retain all right, title, and interest in the content, files, prompts, and code you submit to the Services (&quot;Input&quot;). You represent and warrant that you own or have obtained all necessary rights, licenses, and permissions to submit your Input without infringing third-party intellectual property or privacy rights.</>,
            <><strong>AI Outputs:</strong> As between you and Nobox Labs Limited, and to the extent permitted by applicable law, Nobox Labs Limited assigns to you any proprietary rights it may hold in the completions generated in direct response to your Input (&quot;Output&quot;).</>,
            <><strong>Non-exclusivity of Output:</strong> Due to the probabilistic nature of generative models, similar or identical outputs may be generated for other users submitting similar prompts. You acknowledge that Output generated for you is not exclusive.</>,
            <><strong>License to provide the Services:</strong> You grant Nobox Labs Limited a worldwide, non-exclusive, royalty-free, limited license to host, process, transmit, cache, and display your Input solely as necessary to provide, secure, and maintain the Services and enforce our policies. We do <strong>not</strong> use your Input to train foundation AI models (as set forth in our <DocLink href="/docs/privacy-policy">Privacy Policy</DocLink>).</>,
            <><strong>Nobox IP:</strong> Nobox Labs Limited and its licensors retain all right, title, and interest (including all copyright, trademark, and patent rights) in and to the AIGenius brand, user interfaces, documentation, desktop compiler tooling, APIs, and underlying platform software.</>,
          ]}
        />
      </DocSection>

      <DocSection id="billing-and-wallet" title="8) Pay-as-you-go wallet, billing & chargebacks">
        <p className="mb-4">
          AIGenius operates on a pay-as-you-go credit wallet model. There are no recurring monthly subscription fees unless explicitly introduced under separate enterprise agreements.
        </p>
        <DocList
          items={[
            <><strong>Credits & conversion:</strong> Platform credits are purchased in advance (e.g., 1,000 credits = $1.00 USD). Credit top-ups are processed securely through payment gateways (Paystack, Payaza, or Flutterwave).</>,
            <><strong>Real-time usage metering:</strong> Every AI completion deducts credits from your wallet based on the specific model&apos;s published token rates (input tokens, cache reads, and output tokens). Telemetry and token ledgers recorded by our backend serve as the definitive record of consumption.</>,
            <><strong>Insufficient funds:</strong> Requests will fail or be refused if your available credit balance is insufficient to cover the estimated completion cost.</>,
            <><strong>Non-refundable credits:</strong> All credit purchases are final and non-refundable, except where required by mandatory consumer protection laws in your jurisdiction.</>,
            <><strong>Chargebacks & payment disputes:</strong> If you initiate a payment chargeback, reversal, or fraudulent billing dispute for credits consumed in your account, we reserve the right to immediately suspend your account, revoke access to remaining credits, and recover associated chargeback penalty fees.</>,
          ]}
        />
      </DocSection>

      <DocSection id="third-party-integrations" title="9) Third-party integrations & external APIs">
        <p className="mb-4">
          The Services may offer integrations with third-party software and APIs (including Google Workspace, Gmail, GitHub, and custom MCP tools):
        </p>
        <DocList
          items={[
            "Third-party terms: Your use of third-party services is governed by their respective terms of service and privacy policies. Nobox Labs Limited is not responsible for the availability, uptime, or data handling of external providers.",
            "User-delegated authority: When you instruct an AI assistant or tool to interact with an external integration (e.g., searching or drafting emails in Gmail), you authorize the AI assistant to act on your behalf. Nobox Labs Limited bears no liability for actions taken via connected third-party accounts.",
            "Google Limited Use: Our use of Google API data strictly adheres to Google's Limited Use requirements, as detailed in our Privacy Policy.",
          ]}
        />
      </DocSection>

      <DocSection id="service-availability" title="10) Availability & upstream dependencies">
        <DocList
          items={[
            "Uptime & maintenance: We endeavor to maintain high platform availability, but we do not guarantee uninterrupted, error-free, or 100% continuous uptime. Scheduled maintenance, emergency security patches, and cloud outages may occur.",
            "Upstream AI model outages: Model availability depends directly upon external foundation model providers (such as OpenAI, Anthropic, Google, and OpenRouter). We are not responsible for latency, downtime, deprecations, rate limits, or outages originating from upstream model providers.",
          ]}
        />
      </DocSection>

      <DocSection id="termination" title="11) Suspension & termination">
        <DocList
          items={[
            "Termination by you: You may terminate your account at any time through the console settings. Account deletion purges your credentials and chat history in accordance with our retention policy.",
            "Suspension or termination by us: We may suspend or terminate your account immediately without prior notice if you breach these Terms, engage in fraudulent billing activity, attempt to compromise platform security, or if required to do so by law.",
            "Effect of termination: Upon account termination, your right to use the Services terminates immediately. Unused credits in terminated accounts are forfeited and non-refundable, except where mandated by law.",
          ]}
        />
      </DocSection>

      <DocSection id="disclaimer-of-warranties" title="12) Disclaimer of warranties">
        <p className="mb-4">
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, THE SERVICES, INCLUDING ALL CONTENT, MODELS, OUTPUTS, TOOLS, AND DESKTOP APPLICATIONS, ARE PROVIDED ON AN &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; BASIS WITHOUT WARRANTIES OF ANY KIND, EITHER EXPRESS, IMPLIED, STATUTORY, OR OTHERWISE.
        </p>
        <p>
          NOBOX LABS LIMITED SPECIFICALLY DISCLAIMS ALL IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, ACCURACY, NON-INFRINGEMENT, AND QUIET ENJOYMENT, AS WELL AS ANY WARRANTIES ARISING OUT OF COURSE OF DEALING, USAGE, OR TRADE. WE DO NOT WARRANT THAT THE SERVICES WILL MEET YOUR REQUIREMENTS, BE UNINTERRUPTED, SECURE, OR ERROR-FREE, OR THAT AI OUTPUTS WILL BE ACCURATE, COMPLETE, OR RELIABLE.
        </p>
      </DocSection>

      <DocSection id="limitation-of-liability" title="13) Limitation of liability">
        <p className="mb-4">
          TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW:
        </p>
        <DocList
          items={[
            <><strong>Consequential damages waiver:</strong> IN NO EVENT SHALL NOBOX LABS LIMITED, ITS DIRECTORS, EMPLOYEES, AFFILIATES, AGENTS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, PUNITIVE, OR CONSEQUENTIAL DAMAGES (INCLUDING LOSS OF PROFITS, REVENUE, DATA, GOODWILL, REPUTATION, BUSINESS INTERRUPTION, REPOSITORY CORRUPTION, OR COMPUTER FAILURE), REGARDLESS OF THE THEORY OF LIABILITY (WHETHER CONTRACT, TORT, STRICT LIABILITY, OR OTHERWISE), EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.</>,
            <><strong>Monetary liability cap:</strong> THE TOTAL AGGREGATE LIABILITY OF NOBOX LABS LIMITED ARISING OUT OF OR RELATING TO THESE TERMS OR THE SERVICES SHALL NOT EXCEED THE GREATER OF: (A) THE TOTAL AMOUNT ACTUALLY PAID BY YOU TO NOBOX LABS LIMITED FOR USE OF THE SERVICES IN THE TWELVE (12) MONTHS IMMEDIATELY PRECEDING THE EVENT GIVING RISE TO LIABILITY, OR (B) FIFTY UNITED STATES DOLLARS ($50.00 USD).</>,
            <><strong>Essential purpose:</strong> THE PARTIES ACKNOWLEDGE AND AGREE THAT THE LIMITATIONS OF LIABILITY REFLECT A FAIR AND REASONABLE ALLOCATION OF RISK AND FORM AN ESSENTIAL BASIS OF THE BARGAIN BETWEEN THE PARTIES.</>,
          ]}
        />
      </DocSection>

      <DocSection id="indemnification" title="14) Indemnification">
        <p className="mb-4">
          You agree to defend, indemnify, and hold harmless Nobox Labs Limited, its affiliates, directors, officers, employees, agents, and licensors from and against any third-party claims, demands, liabilities, damages, losses, costs, and expenses (including reasonable attorneys&apos; fees and legal costs) arising out of or related to:
        </p>
        <DocList
          items={[
            "Your access to or use of the Services or AI outputs.",
            "Your Input, files, code, or data uploaded to the platform.",
            "Your violation of these Terms, acceptable use guidelines, or applicable law.",
            "Your infringement or misappropriation of any intellectual property, privacy, or other rights of any third party.",
            "Any actions taken through your connected third-party integrations (e.g., Gmail, GitHub, or API integrations).",
          ]}
        />
      </DocSection>

      <DocSection id="disputes-arbitration" title="15) Governing law, arbitration & class action waiver">
        <DocList
          items={[
            <><strong>Governing law:</strong> These Terms and any dispute arising out of or related to them shall be governed by and construed in accordance with the laws of the Federal Republic of Nigeria, without giving effect to conflict of law principles.</>,
            <><strong>Informal dispute resolution:</strong> Before initiating formal proceedings, you and Nobox Labs Limited agree to attempt in good faith to resolve any dispute, claim, or controversy informally for at least thirty (30) days by emailing a written notice of dispute to <DocLink href="mailto:legal@noboxlabs.xyz">legal@noboxlabs.xyz</DocLink>.</>,
            <><strong>Binding arbitration:</strong> If the dispute is not resolved within thirty (30) days, it shall be finally settled under the Arbitration and Mediation Act, 2023 of Nigeria by a single arbitrator appointed in accordance with said rules. The seat and venue of arbitration shall be Lagos, Nigeria, and proceedings shall be conducted in English.</>,
            <><strong>Class action waiver:</strong> TO THE FULLEST EXTENT PERMITTED BY LAW, ALL CLAIMS MUST BE BROUGHT IN THE PARTIES&apos; INDIVIDUAL CAPACITY, AND NOT AS A PLAINTIFF OR CLASS MEMBER IN ANY PURPORTED CLASS, COLLECTIVE, CONSOLIDATED, OR REPRESENTATIVE PROCEEDING. NEITHER YOU NOR NOBOX LABS LIMITED MAY SERVE AS A CLASS REPRESENTATIVE OR PRIVATE ATTORNEY GENERAL.</>,
            <><strong>Injunctive relief exception:</strong> Notwithstanding the arbitration clause, either party may seek emergency injunctive or other equitable relief in any court of competent jurisdiction to prevent the actual or threatened infringement or misappropriation of intellectual property rights or trade secrets.</>,
          ]}
        />
      </DocSection>

      <DocSection id="general-provisions" title="16) General terms & modifications">
        <DocList
          items={[
            <><strong>Entire agreement:</strong> These Terms, together with our Privacy Policy and any applicable Data Processing Addendum (DPA), constitute the entire agreement between you and Nobox Labs Limited regarding the Services.</>,
            <><strong>Severability:</strong> If any provision of these Terms is held to be invalid or unenforceable, that provision will be enforced to the maximum extent permissible, and the remaining provisions will remain in full force and effect.</>,
            <><strong>No waiver:</strong> Our failure to enforce any right or provision of these Terms will not constitute a waiver of future enforcement of that right or provision.</>,
            <><strong>Assignment:</strong> You may not assign or transfer these Terms without our prior written consent. We may freely assign or transfer these Terms in connection with a corporate reorganization, merger, acquisition, or sale of assets.</>,
            <><strong>Modifications:</strong> We reserve the right to revise these Terms at any time. When material changes are made, we will notify you through the platform, by email, or by updating the &quot;Effective date&quot; above. Continued use of the Services after changes become effective constitutes your acceptance of the revised Terms.</>,
          ]}
        />
      </DocSection>

      <DocSection id="contact" title="17) Contact & legal notices">
        <div className="space-y-3">
          <p className="font-semibold text-lg">Nobox Labs Limited</p>
          <p>
            For legal notices, contract inquiries, copyright/DMCA reports, or dispute notices, contact:
          </p>
          <p>
            <strong>Legal Team:</strong>{" "}
            <DocLink href="mailto:legal@noboxlabs.xyz">legal@noboxlabs.xyz</DocLink>
          </p>
          <p>
            <strong>Security Reports:</strong>{" "}
            <DocLink href="mailto:security@noboxlabs.xyz">security@noboxlabs.xyz</DocLink>
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
