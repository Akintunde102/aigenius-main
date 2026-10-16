"use client";

import { FAQS, FREE_CREDITS, STEPS } from "./constants";
import { Reveal } from "./Reveal";
import { DISPLAY, H2 } from "./typography";
import { UseCaseGrid } from "./UseCaseGrid";
import { useLanguage } from "@/lib/providers/LanguageProvider";

/** Each card opens a working preview of that task (see UseCaseGrid). */
export function UseCases() {
  const { t } = useLanguage();

  return (
    <section className="mx-auto max-w-6xl px-5 py-16 lg:py-24">
      <h2 className={`max-w-2xl ${H2}`}>
        {t("landing.useCasesTitle", "Hand it the work you would rather not do.")}
      </h2>
      <UseCaseGrid />
    </section>
  );
}

export function HowItWorks() {
  const { t } = useLanguage();

  const getStep = (id: string, defaultTitle: string, defaultBody: string) => {
    switch (id) {
      case "open":
        return {
          title: t("landing.step1Title", defaultTitle),
          body: t("landing.step1Body", defaultBody, { credits: FREE_CREDITS }),
        };
      case "pick":
        return {
          title: t("landing.step2Title", defaultTitle),
          body: t("landing.step2Body", defaultBody),
        };
      case "work":
        return {
          title: t("landing.step3Title", defaultTitle),
          body: t("landing.step3Body", defaultBody),
        };
      default:
        return { title: defaultTitle, body: defaultBody };
    }
  };

  return (
    <section className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
      <h2 className={`max-w-2xl ${H2}`}>{t("landing.howItWorksTitle", "Up and running in a minute.")}</h2>
      <ol className="mt-14 grid gap-12 md:grid-cols-3">
        {STEPS.map((step, index) => {
          const localized = getStep(step.id, step.title, step.body);
          return (
            <li key={step.id}>
              <Reveal delay={index * 0.08}>
                <p
                  aria-hidden="true"
                  className={`${DISPLAY} text-7xl leading-none text-lp-muted`}
                >
                  {index + 1}
                </p>
                <h3 className="mt-5 text-xl font-medium tracking-tight">
                  {localized.title}
                </h3>
                <p className="mt-2 leading-relaxed text-lp-muted">{localized.body}</p>
              </Reveal>
            </li>
          );
        })}
      </ol>
    </section>
  );
}

/** Native <details>: keyboard and screen-reader accessible, zero JavaScript. */
export function Faq() {
  const { t } = useLanguage();

  const getFaqItem = (id: string, defaultQ: string, defaultA: string) => {
    switch (id) {
      case "billing":
        return {
          question: t("landing.faqBillingQ", defaultQ),
          answer: t("landing.faqBillingA", defaultA),
        };
      case "models":
        return {
          question: t("landing.faqModelsQ", defaultQ),
          answer: t("landing.faqModelsA", defaultA),
        };
      case "desktop":
        return {
          question: t("landing.faqDesktopQ", defaultQ),
          answer: t("landing.faqDesktopA", defaultA),
        };
      case "web":
        return {
          question: t("landing.faqWebQ", defaultQ),
          answer: t("landing.faqWebA", defaultA),
        };
      case "free":
        return {
          question: t("landing.faqFreeQ", defaultQ),
          answer: t("landing.faqFreeA", defaultA, { credits: FREE_CREDITS }),
        };
      default:
        return { question: defaultQ, answer: defaultA };
    }
  };

  return (
    <section
      id="faq"
      className="mx-auto max-w-3xl scroll-mt-16 px-5 py-20 lg:py-28"
    >
      <h2 className={H2}>{t("landing.faqTitle", "Questions, answered.")}</h2>
      <div className="mt-12 space-y-3">
        {FAQS.map((item) => {
          const localized = getFaqItem(item.id, item.question, item.answer);
          return (
            <details
              key={item.id}
              className="group rounded-2xl bg-lp-surface px-6 py-5"
            >
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-medium [&::-webkit-details-marker]:hidden">
                {localized.question}
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  className="h-5 w-5 shrink-0 text-lp-muted transition-transform duration-200 ease-out-strong group-open:rotate-45"
                  aria-hidden="true"
                >
                  <line x1="12" y1="5" x2="12" y2="19" />
                  <line x1="5" y1="12" x2="19" y2="12" />
                </svg>
              </summary>
              <p className="mt-3 max-w-xl leading-relaxed text-lp-muted">
                {localized.answer}
              </p>
            </details>
          );
        })}
      </div>
    </section>
  );
}
