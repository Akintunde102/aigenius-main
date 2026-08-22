import Image from "next/image";
import { cn } from "@/lib/utils";

const SCREENSHOT_LIGHT = "/images/home-hero-screenshot-light.png";
const SCREENSHOT_DARK = "/images/home-hero-screenshot-dark.png";

const HERO_WIDTH = 1024;
const HERO_HEIGHT = 634;

const IMAGE_CLASS =
  "h-auto w-auto max-w-full border-0 dark:hidden";

/**
 * App screenshot at native resolution — no zoom or crop.
 */
export function HomeHeroScreenshot() {
  return (
    <>
      <Image
        src={SCREENSHOT_LIGHT}
        alt=""
        width={HERO_WIDTH}
        height={HERO_HEIGHT}
        priority
        className={IMAGE_CLASS}
        quality={92}
      />
      <Image
        src={SCREENSHOT_DARK}
        alt=""
        width={HERO_WIDTH}
        height={HERO_HEIGHT}
        priority
        className={cn(IMAGE_CLASS, "hidden dark:block")}
        quality={92}
      />
    </>
  );
}
