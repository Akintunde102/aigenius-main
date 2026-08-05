'use client';

import { useEffect, useState } from 'react';
import { IntegrationCallbackStatus } from '../../components/IntegrationCallbackStatus';

const GMAIL_CONNECT_RESULT_KEY = 'gmail_connect_result';

/**
 * OAuth callback for Gmail. In popup: postMessage to opener and close.
 * When opened in same window (redirect flow): store result and redirect back to app.
 */
export default function GmailCallbackPage() {
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('Completing Gmail connection…');
  const [showCloseButton, setShowCloseButton] = useState(false);
  const [succeeded, setSucceeded] = useState<boolean | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const params = new URLSearchParams(window.location.search);
      const success = params.get('success') === 'true';
      const error = params.get('error') || undefined;

      if (window.opener && !window.opener.closed) {
        const msg = { type: 'gmail-integration-callback', success, error };
        window.opener.postMessage(msg, '*');

        setMessage(success ? 'Connection successful! Closing...' : 'Connection failed. Closing...');
        setDone(true);
        setSucceeded(success);

        // Try to close after a short delay
        setTimeout(() => {
          try {
            window.close();
            // If close didn't work, show manual close button
            setTimeout(() => setShowCloseButton(true), 500);
          } catch {
            setShowCloseButton(true);
          }
        }, 1000);
      } else {
        sessionStorage.setItem(
          GMAIL_CONNECT_RESULT_KEY,
          JSON.stringify({ success, error: error || undefined })
        );
        setMessage('Redirecting you back…');
        setDone(true);
        setSucceeded(success);
        setTimeout(() => {
          window.location.href = window.location.origin + '/';
        }, 1000);
      }
    } catch (e) {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          { type: 'gmail-integration-callback', success: false, error: 'Callback error' },
          '*'
        );
        setTimeout(() => {
          try {
            window.close();
          } catch {
            setShowCloseButton(true);
          }
        }, 1000);
      } else {
        sessionStorage.setItem(
          GMAIL_CONNECT_RESULT_KEY,
          JSON.stringify({ success: false, error: 'Callback error' })
        );
        window.location.href = window.location.origin + '/';
      }
    }
  }, []);

  return (
    <IntegrationCallbackStatus
      done={done}
      message={message}
      showCloseButton={showCloseButton}
      succeeded={succeeded}
    />
  );
}
