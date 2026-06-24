'use client';

import { useEffect, useState } from 'react';

const GMAIL_CONNECT_RESULT_KEY = 'gmail_connect_result';

/**
 * OAuth callback for Gmail. In popup: postMessage to opener and close.
 * When opened in same window (redirect flow): store result and redirect back to app.
 */
export default function GmailCallbackPage() {
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('Completing Gmail connection…');
  const [showCloseButton, setShowCloseButton] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const params = new URLSearchParams(window.location.search);
      const success = params.get('success') === 'true';
      const error = params.get('error') || undefined;

      if (window.opener && !window.opener.closed) {
        const msg = { type: 'gmail-integration-callback', success, error };
        window.opener.postMessage(msg, window.location.origin);

        setMessage(success ? 'Connection successful! Closing...' : 'Connection failed. Closing...');
        setDone(true);

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
        setTimeout(() => {
          window.location.href = window.location.origin + '/';
        }, 1000);
      }
    } catch (e) {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          { type: 'gmail-integration-callback', success: false, error: 'Callback error' },
          window.location.origin
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
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-6 py-16 text-center">
      <p className="text-lg text-zinc-200">{message}</p>
      <p className="mt-3 text-sm text-zinc-500">
        {done ? "You can close this tab if it doesn't close automatically." : 'This window will close automatically.'}
      </p>
      {showCloseButton && (
        <button
          type="button"
          onClick={() => window.close()}
          className="mt-6 rounded-lg bg-gradient-to-r from-cyan-600 to-emerald-600 px-5 py-2.5 text-sm font-medium text-white shadow-md hover:from-cyan-500 hover:to-emerald-500"
        >
          Close window
        </button>
      )}
    </div>
  );
}
