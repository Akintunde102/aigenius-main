import { ArrowUpRightIcon } from "./icons";
import { FAQS, STEPS, USE_CASES } from "./constants";
import { Reveal } from "./Reveal";
import { SpotlightCard } from "./SpotlightCard";
import { DISPLAY, H2 } from "./typography";

/** Cards light up under the cursor and lift on hover. */
export function UseCases() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
      <h2 className={`max-w-2xl ${H2}`}>Hand it the work you would rather not do.</h2>
      <ul className="mt-12 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {USE_CASES.map((useCase) => (
          <li key={useCase}>
            <SpotlightCard className="h-full min-h-40">
              <div className="flex h-full flex-col justify-between gap-8 p-6">
                <p className={`${DISPLAY} text-[1.35rem] leading-[1.15] tracking-[-0.015em]`}>{useCase}</p>
                <ArrowUpRightIcon className="h-5 w-5 text-lp-muted transition-transform duration-300 ease-out-strong group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-lp-accent" />
              </div>
            </SpotlightCard>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HowItWorks() {
  return (
    <section className="mx-auto max-w-6xl px-5 py-20 lg:py-28">
      <h2 className={`max-w-2xl ${H2}`}>Up and running in a minute.</h2>
      <ol className="mt-14 grid gap-12 md:grid-cols-3">
        {STEPS.map((step, index) => (
          <li key={step.id}>
            <Reveal delay={index * 0.08}>
              <p aria-hidden="true" className={`${DISPLAY} text-7xl leading-none text-lp-accent`}>
                {index + 1}
              </p>
              <h3 className="mt-5 text-xl font-medium tracking-tight">{step.title}</h3>
              <p className="mt-2 leading-relaxed text-lp-muted">{step.body}</p>
            </Reveal>
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Native <details>: keyboard and screen-reader accessible, zero JavaScript. */
export function Faq() {
  return (
    <section id="faq" className="mx-auto max-w-3xl scroll-mt-16 px-5 py-20 lg:py-28">
      <h2 className={H2}>Questions, answered.</h2>
      <div className="mt-12 space-y-3">
        {FAQS.map((item) => (
          <details key={item.id} className="group rounded-2xl bg-lp-surface px-6 py-5">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[17px] font-medium [&::-webkit-details-marker]:hidden">
              {item.question}
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
            <p className="mt-3 max-w-xl leading-relaxed text-lp-muted">{item.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
