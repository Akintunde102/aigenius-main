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
  title: "AIGenius",
  description: "AIGenius: Talk to Many AI Models",
  icons: {
    icon: "/logo.png",
    apple: "/logo.png",
  },
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
      </head>
      <body suppressHydrationWarning={true} className={Euclid.className}>
        <DesktopShellDocumentFlag />
        <DesktopShellChrome>{appTree}</DesktopShellChrome>
      </body>
    </html>
  );
}
