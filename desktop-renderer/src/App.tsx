import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import DesktopLoginPage from '@/app/(views)/desktop-login/page';
import DesktopWelcomePage from '@/app/(views)/desktop-welcome/page';
import DesktopSearchIndexPage from '@/app/(views)/desktop-search-index/page';
import DesktopSuccessPage from '@/app/(views)/desktop-success/page';
import AuthenticatedChatPage from '@/app/components/AuthenticatedChatPage';
import ClientAnalytics from '@/app/components/ClientAnalytics';
import DesktopShellChrome from '@/app/components/DesktopShellChrome';
import DesktopShellDocumentFlag from '@/app/components/DesktopShellDocumentFlag';
import EarlyDesktopAuthCookieSync from '@/app/components/EarlyDesktopAuthCookieSync';
import ErrorBoundary from '@/app/components/ErrorBoundary';
import GlobalToaster from '@/app/components/GlobalToaster';
import ScheduleNotificationListener from '@/app/components/ScheduleNotificationListener';
import ViewportHeightSetter from '@/app/ViewportHeightSetter';
import { FilePreviewModal } from '@/app/components/modals/FilePreviewModal';
import { ColorModeBootstrapScript } from '@/app/components/ColorModeBootstrapScript';
import ReactQueryProvider from '@/lib/providers/ReactQueryProvider';
import { ThemeProvider } from '@/lib/providers/ThemeProvider';
import { ChatAuthGate } from './ChatAuthGate';

import './fonts/desktop-fonts.css';
import '@/app/styles/globals.scss';
import '@/app/styles/x-forms.scss';
import '@/app/styles/animations.scss';

export default function App() {
  return (
    <ThemeProvider>
      <BrowserRouter>
        <ColorModeBootstrapScript />
        <EarlyDesktopAuthCookieSync />
        <ViewportHeightSetter />
        <DesktopShellDocumentFlag />
        <DesktopShellChrome>
          <ErrorBoundary>
            <ReactQueryProvider>
              <Routes>
                <Route path="/desktop-login" element={<DesktopLoginPage />} />
                <Route path="/desktop-welcome" element={<DesktopWelcomePage />} />
                <Route path="/desktop-search-index" element={<DesktopSearchIndexPage />} />
                <Route path="/desktop-success" element={<DesktopSuccessPage />} />
                <Route
                  path="/"
                  element={
                    <ChatAuthGate>
                      <AuthenticatedChatPage />
                    </ChatAuthGate>
                  }
                />
                <Route
                  path="/chat/:conversationId"
                  element={
                    <ChatAuthGate>
                      <AuthenticatedChatPage />
                    </ChatAuthGate>
                  }
                />
                <Route path="*" element={<Navigate to="/" replace />} />
              </Routes>
            </ReactQueryProvider>
            <ScheduleNotificationListener />
            <GlobalToaster />
            <FilePreviewModal />
          </ErrorBoundary>
        </DesktopShellChrome>
        <ClientAnalytics />
      </BrowserRouter>
    </ThemeProvider>
  );
}
