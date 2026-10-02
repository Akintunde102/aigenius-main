import Link from "next/link";
import { BRAND_GRADIENT } from "./constants";

/** The only place the violet brand gradient appears on the page. Colour follows the parent text colour. */
export function Logo() {
  return (
    <Link href="/" className="flex items-center gap-2.5 text-[17px] font-medium tracking-tight">
      <span className={`flex h-7 w-7 items-center justify-center rounded-lg text-white ${BRAND_GRADIENT}`}>
        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
          />
        </svg>
      </span>
      AIGenius
    </Link>
  );
}
