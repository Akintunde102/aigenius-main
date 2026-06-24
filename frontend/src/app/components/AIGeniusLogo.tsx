"use client";

import Link from "next/link";

const ChatIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
  </svg>
);

type AIGeniusLogoProps = {
  /** Size variant: "sm" for header/nav, "md" for default, "lg" for hero */
  size?: "sm" | "md" | "lg";
  /** Show "AIGenius" wordmark next to the icon */
  showWordmark?: boolean;
  /** Wrap in a link to "/" (default true when used in layout) */
  asLink?: boolean;
  className?: string;
};

const sizeClasses = {
  sm: { box: "w-8 h-8 rounded-lg", icon: "w-4 h-4", text: "text-lg" },
  md: { box: "w-10 h-10 rounded-xl", icon: "w-5 h-5", text: "text-xl" },
  lg: { box: "w-20 h-20 rounded-2xl", icon: "w-10 h-10", text: "text-2xl" },
};

export function AIGeniusLogo({
  size = "md",
  showWordmark = true,
  asLink = true,
  className = "",
}: AIGeniusLogoProps) {
  const { box, icon, text } = sizeClasses[size];
  const content = (
    <>
      <div className={`flex-shrink-0 ${box} bg-gradient-to-br from-[hsl(250,84%,54%)] to-[hsl(280,100%,70%)] flex items-center justify-center shadow-md`}>
        <ChatIcon className={`${icon} text-white`} />
      </div>
      {showWordmark && (
        <span className={`font-bold text-gray-900 ${text} tracking-tight`}>
          AIGenius
        </span>
      )}
    </>
  );

  const wrapperClassName = `inline-flex items-center gap-2 hover:opacity-90 transition-opacity ${className}`.trim();

  if (asLink) {
    return (
      <Link href="/" className={wrapperClassName} aria-label="AIGenius home">
        {content}
      </Link>
    );
  }
  return <div className={wrapperClassName}>{content}</div>;
}
