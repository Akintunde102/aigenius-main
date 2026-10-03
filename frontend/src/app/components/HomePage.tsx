import { Faq, HowItWorks, UseCases } from "./landing/Closing";
import { FeatureRows } from "./landing/FeatureRows";
import { FinalCta } from "./landing/FinalCta";
import { Hero } from "./landing/Hero";
import { LandingShell } from "./landing/LandingShell";
import { ModelTicker } from "./landing/ModelTicker";
import { platformFromUserAgent } from "./landing/platforms";
import { ScrollStatement } from "./landing/ScrollStatement";
import { SiteFooter } from "./landing/SiteFooter";
import { SiteHeader } from "./landing/SiteHeader";
import { sans } from "./landing/typography";

interface HomePageProps {
  /** Request User-Agent, read in the layout, used only to pick the right download button on first paint. */
  userAgent?: string;
}

/**
 * Server component. All motion lives in client islands. LandingShell is the page's own scroll
 * container (fixed + overflow-y-auto) and tells every scroll-linked effect which element to watch,
 * so it works whatever the body overflow is. The `landing` class scopes the --lp-* palette.
 */
export default function HomePage({ userAgent = "" }: HomePageProps) {
  const initialPlatform = platformFromUserAgent(userAgent);

  return (
    <LandingShell
      className={`landing ${sans.className} fixed inset-0 overflow-y-auto overflow-x-hidden bg-lp-bg text-lp-fg antialiased motion-safe:scroll-smooth`}
    >
      <a
        href="#landing-main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-lp-fg focus:px-4 focus:py-2 focus:text-lp-bg"
      >
        Skip to content
      </a>
      <SiteHeader initialPlatform={initialPlatform} />
      <main id="landing-main">
        <Hero initialPlatform={initialPlatform} />
        <ModelTicker />
        <ScrollStatement />
        <FeatureRows />
        <UseCases />
        <HowItWorks />
        <Faq />
        <FinalCta initialPlatform={initialPlatform} />
      </main>
      <SiteFooter />
    </LandingShell>
  );
}
