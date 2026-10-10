"use client";

import { Fragment, useEffect, useState } from "react";
import { detectDesktopOS } from "@/lib/utils/detect-desktop-os";
import {
  BUTTON_ON_IMAGE,
  BUTTON_SIZE,
  PRESS,
  type ButtonSize,
} from "./constants";
import { DownloadInstructionModal } from "./DownloadInstructionModal";
import { DownloadIcon } from "./icons";
import {
  findPlatform,
  PLATFORMS,
  type Platform,
  type PlatformEntry,
} from "./platforms";

const LINK_CLASS =
  "underline underline-offset-4 transition-colors duration-150 hover:text-lp-fg";
const LINK_CLASS_ON_BRAND =
  "underline underline-offset-4 transition-colors duration-150 hover:text-white";

/**
 * Solid inverted pill: dark on the light theme, white on the dark theme. Plain stone colours, because
 * the old BUTTON_PRIMARY background (bg-lp-fg) was not rendering, which left the button invisible.
 */
const PRIMARY_PILL =
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-full bg-stone-900 font-medium text-white hover:opacity-85 dark:bg-white dark:text-stone-900";

interface DownloadCtaProps {
  size?: ButtonSize;
  showOtherPlatforms?: boolean;
  /** Server-side guess from the User-Agent; avoids a label swap after hydration. */
  initialPlatform?: Platform | null;
  /** Style for placement on a photo: white primary button, translucent fallback. */
  onImage?: boolean;
}

/**
 * Platform detection, links, the coming-soon state and the instruction modal are unchanged.
 * The Magnetic wrappers are gone: the buttons no longer move toward the cursor.
 */
export function DownloadCta({
  size = "lg",
  showOtherPlatforms = false,
  initialPlatform = null,
  onImage = false,
}: DownloadCtaProps) {
  // null = no desktop build for this device (phones, tablets, ChromeOS, unknown).
  const [detected, setDetected] = useState<PlatformEntry | null>(
    initialPlatform ? (findPlatform(initialPlatform) ?? null) : null,
  );
  const [modalPlatform, setModalPlatform] = useState<Platform | null>(null);

  useEffect(() => {
    setDetected(findPlatform(detectDesktopOS()) ?? null);
  }, []);

  const others = detected
    ? PLATFORMS.filter((platform) => platform.id !== detected.id)
    : [];

  return (
    <div className="flex flex-col items-center gap-2.5">
      {detected ? (
        detected.comingSoon ? (
          <span
            className={`inline-flex cursor-not-allowed items-center gap-2 opacity-60 ${onImage ? BUTTON_ON_IMAGE : PRIMARY_PILL} ${BUTTON_SIZE[size]}`}
          >
            <DownloadIcon className="h-4 w-4" />
            {detected.label} (coming soon)
          </span>
        ) : (
          <a
            href={detected.href}
            download
            onClick={() => setModalPlatform(detected.id)}
            className={`inline-flex items-center gap-2 ${onImage ? BUTTON_ON_IMAGE : PRIMARY_PILL} ${BUTTON_SIZE[size]} ${PRESS}`}
          >
            <DownloadIcon className="h-4 w-4" />
            Download for {detected.label}
          </a>
        )
      ) : (
        // No menu: three links are one click instead of two and need no popover plumbing.
        <p
          className={`inline-flex items-center rounded-full ${
            onImage ? "bg-white/15 text-white/85" : "bg-lp-tint text-lp-muted"
          } ${BUTTON_SIZE[size]}`}
        >
          <span className="whitespace-nowrap">
            Desktop app for{" "}
            {PLATFORMS.map((platform, index) => (
              <Fragment key={platform.id}>
                {index > 0 && (index === PLATFORMS.length - 1 ? " or " : ", ")}
                {platform.comingSoon ? (
                  <span className="opacity-60">{platform.label} (soon)</span>
                ) : (
                  <a
                    href={platform.href}
                    download
                    onClick={() => setModalPlatform(platform.id)}
                    className={onImage ? LINK_CLASS_ON_BRAND : LINK_CLASS}
                  >
                    {platform.label}
                  </a>
                )}
              </Fragment>
            ))}
          </span>
        </p>
      )}

      {showOtherPlatforms && others.length > 0 && (
        <p className={`text-sm ${onImage ? "text-white/75" : "text-lp-muted"}`}>
          Also for{" "}
          {others.map((platform, index) => (
            <Fragment key={platform.id}>
              {index > 0 && " and "}
              {platform.comingSoon ? (
                <span className="opacity-60">{platform.label} (soon)</span>
              ) : (
                <a
                  href={platform.href}
                  download
                  onClick={() => setModalPlatform(platform.id)}
                  className={LINK_CLASS}
                >
                  {platform.label}
                </a>
              )}
            </Fragment>
          ))}
        </p>
      )}

      <DownloadInstructionModal
        platform={modalPlatform}
        onClose={() => setModalPlatform(null)}
      />
    </div>
  );
}
