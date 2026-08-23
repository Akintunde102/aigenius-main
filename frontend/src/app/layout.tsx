import localFont from "next/font/local";
import "./styles/globals.scss";
import ClientAnalytics from "./components/ClientAnalytics";
import "./styles/x-forms.scss";
import "./styles/animations.scss";
import React from 'react';
import ReactQueryProvider from "@/lib/providers/ReactQueryProvider";
import ViewportHeightSetter from './ViewportHeightSetter';
import DesktopShellChrome from './components/DesktopShellChrome';
import DesktopShellDocumentFlag from './components/DesktopShellDocumentFlag';
import EarlyDesktopAuthCookieSync from './components/EarlyDesktopAuthCookieSync';
import ErrorBoundary from './components/ErrorBoundary';
import GlobalToaster from "@/app/components/GlobalToaster";
import ScheduleNotificationListener from "@/app/components/ScheduleNotificationListener";
import { ColorModeBootstrapScript } from "@/app/components/ColorModeBootstrapScript";
import { FilePreviewModal } from "@/app/components/modals/FilePreviewModal";
import { ThemeProvider } from "@/lib/providers/ThemeProvider";
const Euclid = localFont({
  src: [
    {
      path: "./fonts/Euclid Circular A Light.ttf",
      weight: "300",
      style: "normal",
    },
    {
      path: "./fonts/Euclid Circular A Regular.ttf",
      weight: "400",
      style: "normal",
    },
    {
      path: "./fonts/Euclid Circular A Medium.ttf",
      weight: "500",
      style: "normal",
    },
    {
      path: "./fonts/Euclid Circular A SemiBold.ttf",
      weight: "700",
      style: "normal",
    },
  ],
});

export const metadata = {
  metadataBase: new URL("https://aigenius.chat"),
  title: {
    default: "AIGenius — Chat with every AI model, in one workspace",
    template: "%s | AIGenius",
  },
  description:
    "Switch between GPT-4o, Claude 3.5, Gemini 1.5, DeepSeek and more without juggling tabs or subscriptions. Bring files, voice, and code projects. Pay only for what you use.",
  keywords: [
    "AI chat",
    "GPT-4o",
    "Claude 3.5 Sonnet",
    "Gemini 1.5 Pro",
    "DeepSeek",
    "pay as you go AI",
    "multi-model AI",
    "AI desktop app",
    "Nobox",
  ],
  authors: [{ name: "Nobox Labs Limited", url: "https://aigenius.chat" }],
  creator: "Nobox Labs Limited",
  publisher: "Nobox Labs Limited",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://aigenius.chat",
    title: "AIGenius — Chat with every AI model, in one workspace",
    description:
      "Switch between GPT-4o, Claude 3.5, Gemini 1.5, DeepSeek and more without juggling tabs or subscriptions. Bring files, voice, and code projects. Pay only for what you use.",
    siteName: "AIGenius",
    images: [
      {
        url: "/images/home-hero-dark.png",
        width: 1200,
        height: 630,
        alt: "AIGenius — Every top AI model in one workspace",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "AIGenius — Chat with every AI model, in one workspace",
    description:
      "Switch between GPT-4o, Claude 3.5, Gemini 1.5, DeepSeek and more without juggling tabs or subscriptions. Bring files, voice, and code projects. Pay only for what you use.",
    images: ["/images/home-hero-dark.png"],
    creator: "@noboxhq",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": "https://aigenius.chat/#organization",
      name: "Nobox Labs Limited",
      url: "https://aigenius.chat",
      logo: "https://aigenius.chat/logo.png",
      sameAs: ["https://github.com/Akintunde102"],
    },
    {
      "@type": "WebSite",
      "@id": "https://aigenius.chat/#website",
      url: "https://aigenius.chat",
      name: "AIGenius",
      publisher: { "@id": "https://aigenius.chat/#organization" },
      description: "Every top AI model in one workspace.",
    },
    {
      "@type": "SoftwareApplication",
      "@id": "https://aigenius.chat/#software",
      name: "AIGenius",
      applicationCategory: "ProductivityApplication",
      operatingSystem: "Web, macOS, Windows, Linux",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
      description:
        "Pay-as-you-go multi-model AI chat platform supporting GPT-4o, Claude, Gemini, DeepSeek, and local desktop tools.",
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const appTree = (
    <ThemeProvider>
      <EarlyDesktopAuthCookieSync />
      <ViewportHeightSetter />
      <ErrorBoundary>
        <ReactQueryProvider>
          {children}
        </ReactQueryProvider>
        <ScheduleNotificationListener />
        <GlobalToaster />
        <FilePreviewModal />
      </ErrorBoundary>
      <div id="modal-root" />
      <ClientAnalytics />
    </ThemeProvider>
  );

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no, viewport-fit=cover, interactive-widget=resizes-content" />
        <ColorModeBootstrapScript />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body suppressHydrationWarning={true} className={Euclid.className}>
        <DesktopShellDocumentFlag />
        <DesktopShellChrome>{appTree}</DesktopShellChrome>
      </body>
    </html>
  );
}
