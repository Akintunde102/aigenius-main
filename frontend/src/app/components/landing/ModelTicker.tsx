import { PROVIDERS } from "./constants";

const ITEM = "text-2xl font-medium tracking-tight text-lp-muted";

/**
 * CSS-only marquee (needs `marquee` in tailwind.config). The second copy is aria-hidden and
 * hidden for reduced motion, which also swaps the scrolling row for a static wrapped one.
 */
export function ModelTicker() {
  return (
    <section aria-label="Supported model providers" className="pb-24">
      <p className="text-center text-sm text-lp-muted">One wallet for every major model provider</p>
      <div className="mt-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]">
        <ul className="flex w-max gap-14 pr-14 motion-safe:animate-marquee motion-reduce:w-auto motion-reduce:flex-wrap motion-reduce:justify-center motion-reduce:pr-0">
          {PROVIDERS.map((provider) => (
            <li key={provider} className={ITEM}>
              {provider}
            </li>
          ))}
          {PROVIDERS.map((provider) => (
            <li key={`${provider}-copy`} aria-hidden="true" className={`${ITEM} motion-reduce:hidden`}>
              {provider}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
