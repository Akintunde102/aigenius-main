'use client';

import { useEffect, useState } from 'react';

const LINKEDIN_CONNECT_RESULT_KEY = 'linkedin_connect_result';

/**
 * OAuth callback for LinkedIn. In popup: postMessage to opener and close.
 * When opened in same window (redirect flow): store result and redirect back to app.
 */
export default function LinkedInCallbackPage() {
  const [done, setDone] = useState(false);
  const [message, setMessage] = useState('Completing LinkedIn connection…');
  const [showCloseButton, setShowCloseButton] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const params = new URLSearchParams(window.location.search);
      const success = params.get('success') === 'true';
      const error = params.get('error') || undefined;

      if (window.opener && !window.opener.closed) {
        const msg = { type: 'linkedin-integration-callback', success, error };
        window.opener.postMessage(msg, window.location.origin);

        setMessage(success ? 'Connection successful! Closing...' : 'Connection failed. Closing...');
        setDone(true);

        setTimeout(() => {
          try {
            window.close();
            setTimeout(() => setShowCloseButton(true), 500);
          } catch {
            setShowCloseButton(true);
          }
        }, 1000);
      } else {
        sessionStorage.setItem(
          LINKEDIN_CONNECT_RESULT_KEY,
          JSON.stringify({ success, error: error || undefined }),
        );
        setMessage('Redirecting you back…');
        setDone(true);
        setTimeout(() => {
          window.location.href = window.location.origin + '/';
        }, 1000);
      }
    } catch {
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          { type: 'linkedin-integration-callback', success: false, error: 'Callback error' },
          window.location.origin,
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
          LINKEDIN_CONNECT_RESULT_KEY,
          JSON.stringify({ success: false, error: 'Callback error' }),
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
          className="mt-6 rounded-lg bg-slate-700 px-5 py-2.5 text-sm font-medium text-white shadow-md hover:bg-slate-600"
        >
          Close window
        </button>
      )}
    </div>
  );
}
