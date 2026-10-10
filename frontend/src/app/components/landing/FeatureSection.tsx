import Link from "next/link";
import type { ReactNode } from "react";
import { DownloadCta } from "./DownloadCta";
import { Reveal } from "./Reveal";
import { DISPLAY } from "./typography";

export interface FeatureItem {
  readonly id: string;
  /** One short line. Everything else lives in the preview. */
  readonly title: string;
  /** One sentence, no lists. */
  readonly body: string;
  /** Tells the visitor what to do or what they are watching. Shown under the preview. */
  readonly hint: string;
  /** Only pass a link that goes somewhere real. */
  readonly cta?: { readonly label: string; readonly href: string };
  /** Shows the download button alongside the CTA if true. */
  readonly showDownload?: boolean;
  /** Decorative previews play on their own and are hidden from assistive tech. Interactive ones must not be. */
  readonly decorative: boolean;
  readonly visual: ReactNode;
}

interface FeatureSectionProps {
  readonly item: FeatureItem;
  /** Puts the preview on the left and the text on the right from `lg` up. On small screens text always comes first. */
  readonly flip: boolean;
}

/**
 * One idea per section. The preview takes two thirds of the row and the text one third, so the
 * product is the main thing on screen. No pinning and no scroll-linked state.
 */
export function FeatureSection({ item, flip }: FeatureSectionProps) {
  return (
    <section id={item.id} className="scroll-mt-16">
      <div className="mx-auto grid max-w-7xl items-center gap-10 px-5 py-16 lg:grid-cols-12 lg:gap-14 lg:py-24">
        <div className={`lg:col-span-4 ${flip ? "lg:order-2" : ""}`}>
          <Reveal>
            <h2
              className={`${DISPLAY} text-4xl leading-[1.05] tracking-[-0.025em] lg:text-5xl`}
            >
              {item.title}
            </h2>
            <p className="mt-5 max-w-sm text-lg leading-relaxed text-lp-muted">
              {item.body}
            </p>
            {(item.cta || item.showDownload) && (
              <div className="mt-6 flex flex-wrap items-center gap-5">
                {item.cta && (
                  <Link
                    href={item.cta.href}
                    className="inline-flex text-[15px] font-medium text-lp-accent transition-opacity duration-150 hover:opacity-80"
                  >
                    {item.cta.label} &rarr;
                  </Link>
                )}
                {item.showDownload && (
                  <DownloadCta size="sm" initialPlatform={null} onImage={false} />
                )}
              </div>
            )}
          </Reveal>
        </div>

        <div className={`lg:col-span-8 ${flip ? "lg:order-1" : ""}`}>
          <Reveal delay={0.08}>
            <div className="rounded-3xl bg-gradient-to-br from-lp-tint via-lp-tint to-lp-surface p-3 sm:p-8 lg:p-12">
              <div aria-hidden={item.decorative ? "true" : undefined}>
                {item.visual}
              </div>
            </div>
            <p className="mt-4 flex items-center gap-2 text-sm text-lp-muted">
              {!item.decorative && (
                <span
                  aria-hidden="true"
                  className="h-1.5 w-1.5 rounded-full bg-lp-accent motion-safe:animate-pulse"
                />
              )}
              {item.hint}
            </p>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
