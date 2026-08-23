import Image from "next/image";
import { cn } from "@/lib/utils";

const SCREENSHOT_LIGHT = "/images/home-hero-screenshot-light.png";
const SCREENSHOT_DARK = "/images/home-hero-screenshot-dark.png";

const HERO_WIDTH = 1024;
const HERO_HEIGHT = 634;

const IMAGE_CLASS =
  "h-auto w-auto max-w-full border-0 dark:hidden";

const ALT_TEXT =
  "AIGenius interface screenshot displaying multi-model AI conversation, code project workspace, token cost metrics, and integrated tools";

/**
 * App screenshot at native resolution — no zoom or crop, accessible alt text.
 */
export function HomeHeroScreenshot() {
  return (
    <figure className="m-0 p-0">
      <Image
        src={SCREENSHOT_LIGHT}
        alt={ALT_TEXT}
        width={HERO_WIDTH}
        height={HERO_HEIGHT}
        priority
        className={IMAGE_CLASS}
        quality={92}
      />
      <Image
        src={SCREENSHOT_DARK}
        alt={ALT_TEXT}
        width={HERO_WIDTH}
        height={HERO_HEIGHT}
        priority
        className={cn(IMAGE_CLASS, "hidden dark:block")}
        quality={92}
      />
      <figcaption className="sr-only">
        {ALT_TEXT}
      </figcaption>
    </figure>
  );
}
