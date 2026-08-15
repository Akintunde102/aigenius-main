import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import DesktopLoginPage from '@/app/(views)/desktop-login/page';
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
