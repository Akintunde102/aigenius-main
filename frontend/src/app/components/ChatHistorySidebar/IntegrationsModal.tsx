'use client';

import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import {
  getGmailConnectUrl,
  getGmailStatus,
  disconnectGmail,
  getLinkedInConnectUrl,
  getLinkedInStatus,
  disconnectLinkedIn,
} from '@/lib/calls/integrations';
import { isIntegrationCallbackOriginTrusted } from '@/lib/oauth-callback-origin';
import { FiMail, FiX, FiInfo, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import { SiLinkedin } from 'react-icons/si';

interface IntegrationsModalProps {
  onClose: () => void;
}

const GMAIL_CONNECT_RESULT_KEY = 'gmail_connect_result';
const LINKEDIN_CONNECT_RESULT_KEY = 'linkedin_connect_result';

export const IntegrationsModal: React.FC<IntegrationsModalProps> = ({ onClose }) => {
  const [gmailConnected, setGmailConnected] = useState<boolean | null>(null);
  const [linkedinConnected, setLinkedinConnected] = useState<boolean | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [connectInWindowUrl, setConnectInWindowUrl] = useState<string | null>(null);
  const [showGmailInfo, setShowGmailInfo] = useState(false);
  const [showLinkedInInfo, setShowLinkedInInfo] = useState(false);
  /** Prefetched OAuth URL so we can open the popup synchronously on click (avoids about:blank + cross-origin navigate). */
  const gmailConnectUrlRef = useRef<string | null>(null);
  const linkedinConnectUrlRef = useRef<string | null>(null);

  const loadStatus = async () => {
    setLoading(true);
    setError(null);
    try {
      const [gmailStatus, linkedinStatus] = await Promise.all([getGmailStatus(), getLinkedInStatus()]);
      setGmailConnected(gmailStatus.connected);
      setLinkedinConnected(linkedinStatus.connected);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load status');
      setGmailConnected(false);
      setLinkedinConnected(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onClose]);

  // Prefetch OAuth URLs when modal opens so Connect can open popup synchronously
  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        const [gmailRes, linkedinRes] = await Promise.all([
          getGmailConnectUrl().catch(() => ({ url: '' })),
          getLinkedInConnectUrl().catch(() => ({ url: '' })),
        ]);
        if (!cancelled && gmailRes.url) {
          const urlObj = new URL(gmailRes.url);
          if (urlObj.hostname.includes('google.com') || urlObj.hostname.includes('accounts.google.com')) {
            gmailConnectUrlRef.current = gmailRes.url;
          }
        }
        if (!cancelled && linkedinRes.url) {
          const urlObj = new URL(linkedinRes.url);
          if (urlObj.hostname.includes('linkedin.com')) {
            linkedinConnectUrlRef.current = linkedinRes.url;
          }
        }
      } catch {
        /* optional */
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, []);

  // Handle return from "Connect in this window" redirect flow
  useEffect(() => {
    const processKey = (key: string, onSuccess: () => void, msg: string) => {
      try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return;
        sessionStorage.removeItem(key);
        const data = JSON.parse(raw) as { success?: boolean; error?: string };
        if (data.success) {
          onSuccess();
          setError(null);
          setSuccessMessage(msg);
          loadStatus();
          setTimeout(() => setSuccessMessage(null), 5000);
        } else {
          setError(data.error || 'Connection failed');
          setSuccessMessage(null);
        }
      } catch {
        // ignore
      }
    };
    processKey(GMAIL_CONNECT_RESULT_KEY, () => setGmailConnected(true), 'Successfully connected to Gmail!');
    processKey(
      LINKEDIN_CONNECT_RESULT_KEY,
      () => setLinkedinConnected(true),
      'Successfully connected to LinkedIn!',
    );
  }, []);

  useEffect(() => {
    const handler = (event: MessageEvent) => {
      if (!isIntegrationCallbackOriginTrusted(event.origin, window.location.origin)) {
        return;
      }
      
      // Validate message structure
      if (event.data?.type === 'gmail-integration-callback') {
        setActionLoading(false);
        if (event.data.success === true) {
          setError(null);
          setGmailConnected(true);
          setSuccessMessage('Successfully connected to Gmail!');
          loadStatus();
          setTimeout(() => setSuccessMessage(null), 5000);
        } else {
          setError(event.data.error || 'Connection failed');
          setSuccessMessage(null);
        }
      }
      if (event.data?.type === 'linkedin-integration-callback') {
        setActionLoading(false);
        if (event.data.success === true) {
          setError(null);
          setLinkedinConnected(true);
          setSuccessMessage('Successfully connected to LinkedIn!');
          loadStatus();
          setTimeout(() => setSuccessMessage(null), 5000);
        } else {
          setError(event.data.error || 'Connection failed');
          setSuccessMessage(null);
        }
      }
    };
    window.addEventListener('message', handler);
    return () => {
      window.removeEventListener('message', handler);
    };
  }, []);

  const handleConnectGmail = async () => {
    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);
    setConnectInWindowUrl(null);

    const url = gmailConnectUrlRef.current;
    if (url) {
      // Open popup directly with OAuth URL (same user gesture) so it loads Google, not about:blank
      // Note: We can't use noopener because the popup needs to postMessage back to the opener
      const w = window.open(url, 'gmail-connect', 'width=500,height=600');
      if (!w) {
        setConnectInWindowUrl(url);
        setError('Popup blocked. Use "Connect in this window" below, or allow popups and try again.');
        setActionLoading(false);
        return;
      }
    } else {
      // Prefetch not ready: get URL then open (popup may be blocked)
      try {
        const { url: fetchedUrl } = await getGmailConnectUrl();
        const urlObj = new URL(fetchedUrl);
        if (!urlObj.hostname.includes('google.com') && !urlObj.hostname.includes('accounts.google.com')) {
          setError('Invalid OAuth URL. Please try again.');
          setActionLoading(false);
          return;
        }
        const w = window.open(fetchedUrl, 'gmail-connect', 'width=500,height=600');
        if (!w) {
          setConnectInWindowUrl(fetchedUrl);
          setError('Popup blocked. Use "Connect in this window" below, or allow popups and try again.');
          setActionLoading(false);
          return;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to start connection');
        setActionLoading(false);
        return;
      }
    }

    const timeoutId = setTimeout(() => {
      setActionLoading(false);
      setError('Connection timed out. Please try again.');
    }, 120000);
    const clearTimeoutOnCallback = (e: MessageEvent) => {
      if (e.data?.type === 'gmail-integration-callback') clearTimeout(timeoutId);
    };
    window.addEventListener('message', clearTimeoutOnCallback);
    setTimeout(() => window.removeEventListener('message', clearTimeoutOnCallback), 121000);
  };

  const handleConnectInWindow = () => {
    if (connectInWindowUrl) window.location.href = connectInWindowUrl;
  };

  const handleConnectLinkedIn = async () => {
    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);
    setConnectInWindowUrl(null);

    const url = linkedinConnectUrlRef.current;
    if (url) {
      const w = window.open(url, 'linkedin-connect', 'width=500,height=600');
      if (!w) {
        setConnectInWindowUrl(url);
        setError('Popup blocked. Use "Connect in this window" below, or allow popups and try again.');
        setActionLoading(false);
        return;
      }
    } else {
      try {
        const { url: fetchedUrl } = await getLinkedInConnectUrl();
        const urlObj = new URL(fetchedUrl);
        if (!urlObj.hostname.includes('linkedin.com')) {
          setError('Invalid OAuth URL. Please try again.');
          setActionLoading(false);
          return;
        }
        const w = window.open(fetchedUrl, 'linkedin-connect', 'width=500,height=600');
        if (!w) {
          setConnectInWindowUrl(fetchedUrl);
          setError('Popup blocked. Use "Connect in this window" below, or allow popups and try again.');
          setActionLoading(false);
          return;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to start connection');
        setActionLoading(false);
        return;
      }
    }

    const timeoutId = setTimeout(() => {
      setActionLoading(false);
      setError('Connection timed out. Please try again.');
    }, 120000);
    const clearTimeoutOnCallback = (e: MessageEvent) => {
      if (e.data?.type === 'linkedin-integration-callback') clearTimeout(timeoutId);
    };
    window.addEventListener('message', clearTimeoutOnCallback);
    setTimeout(() => window.removeEventListener('message', clearTimeoutOnCallback), 121000);
  };

  const handleDisconnectLinkedIn = async () => {
    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await disconnectLinkedIn();
      setLinkedinConnected(false);
      setSuccessMessage('LinkedIn disconnected successfully');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to disconnect');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDisconnectGmail = async () => {
    setActionLoading(true);
    setError(null);
    setSuccessMessage(null);
    try {
      await disconnectGmail();
      setGmailConnected(false);
      setSuccessMessage('Gmail disconnected successfully');
      setTimeout(() => setSuccessMessage(null), 5000);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to disconnect');
    } finally {
      setActionLoading(false);
    }
  };

  const overlay = (
    <div
      role="presentation"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/45 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="integrations-modal-title"
        className="max-h-[min(90vh,640px)] max-w-md w-full mx-4 flex flex-col overflow-hidden rounded-xl border border-gray-200 bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="shrink-0 border-b border-gray-100 bg-gray-50/80 px-5 py-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-gray-200 bg-white text-gray-700 shadow-sm"
                aria-hidden
              >
                <FiMail size={20} />
              </div>
              <div className="min-w-0">
                <h2 id="integrations-modal-title" className="text-base font-semibold text-gray-900">
                  Integrations
                </h2>
                <p className="mt-0.5 text-xs text-gray-500">Connect external accounts for tools</p>
              </div>
            </div>
            <button
              type="button"
              aria-label="Close"
              className="shrink-0 rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-200/80 hover:text-gray-800 focus:outline-none"
              onClick={onClose}
            >
              <FiX size={18} />
            </button>
          </div>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <p className="text-sm text-gray-500 mb-4">
          Connect your accounts so AI models with tool support can use them (e.g. Gmail or your LinkedIn
          profile).
        </p>
        {loading ? (
          <div className="py-6 text-center text-gray-500">Loading…</div>
        ) : (
          <div className="space-y-4">
            {/* Gmail */}
            <div className="border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <FiMail className="text-red-500" size={24} />
                  <div>
                    <p className="font-medium text-gray-800">Gmail</p>
                    <p className="text-xs text-gray-500">
                      {gmailConnected ? 'Connected' : 'Not connected'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowGmailInfo(!showGmailInfo)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    aria-label="Info"
                  >
                    {showGmailInfo ? <FiChevronUp size={18} /> : <FiInfo size={18} />}
                  </button>
                  {gmailConnected ? (
                    <button
                      className="text-sm text-red-600 hover:underline disabled:opacity-50"
                      onClick={handleDisconnectGmail}
                      disabled={actionLoading}
                    >
                      Disconnect
                    </button>
                  ) : (
                    <button
                      className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                      onClick={handleConnectGmail}
                      disabled={actionLoading}
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
              
              {/* Info section */}
              {showGmailInfo && (
                <div className="px-3 pb-3 pt-1 border-t border-gray-100 bg-gray-50">
                  <p className="text-xs font-medium text-gray-700 mb-2">What Gmail integration enables:</p>
                  <ul className="space-y-1 text-xs text-gray-600">
                    <li className="flex items-start gap-1.5">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span><strong>List emails:</strong> AI can see your recent emails</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span><strong>Read emails:</strong> AI can read full email content</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span><strong>Send emails:</strong> AI can send emails on your behalf</span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span><strong>Search inbox:</strong> AI can search your emails with Gmail syntax</span>
                    </li>
                  </ul>
                  <p className="mt-2 text-xs text-gray-500 italic">
                    Only works with AI models that support tools (e.g. GPT-4, Claude Opus, Gemini Pro)
                  </p>
                </div>
              )}
            </div>

            {/* LinkedIn */}
            <div className="border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between p-3">
                <div className="flex items-center gap-3">
                  <SiLinkedin className="text-[#0A66C2]" size={24} aria-hidden />
                  <div>
                    <p className="font-medium text-gray-800">LinkedIn</p>
                    <p className="text-xs text-gray-500">
                      {linkedinConnected ? 'Connected' : 'Not connected'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setShowLinkedInInfo(!showLinkedInInfo)}
                    className="p-1 text-gray-400 hover:text-gray-600"
                    aria-label="LinkedIn info"
                  >
                    {showLinkedInInfo ? <FiChevronUp size={18} /> : <FiInfo size={18} />}
                  </button>
                  {linkedinConnected ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                        onClick={handleConnectLinkedIn}
                        disabled={actionLoading}
                        title="Opens LinkedIn again so you can grant any new permissions (e.g. posting)"
                      >
                        Update permissions
                      </button>
                      <button
                        type="button"
                        className="text-sm text-red-600 hover:underline disabled:opacity-50"
                        onClick={handleDisconnectLinkedIn}
                        disabled={actionLoading}
                      >
                        Disconnect
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      className="text-sm text-blue-600 hover:underline disabled:opacity-50"
                      onClick={handleConnectLinkedIn}
                      disabled={actionLoading}
                    >
                      Connect
                    </button>
                  )}
                </div>
              </div>
              {showLinkedInInfo && (
                <div className="px-3 pb-3 pt-1 border-t border-gray-100 bg-gray-50">
                  <p className="text-xs font-medium text-gray-700 mb-2">What LinkedIn integration enables:</p>
                  <ul className="space-y-1 text-xs text-gray-600">
                    <li className="flex items-start gap-1.5">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>
                        <strong>Profile (userinfo):</strong> AI can read your name, email (when allowed), and
                        picture from LinkedIn
                      </span>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <span className="text-green-600 mt-0.5">✓</span>
                      <span>
                        <strong>Post updates:</strong> AI can publish text or link posts when LinkedIn app
                        permissions include Share on LinkedIn (`w_member_social`)
                      </span>
                    </li>
                  </ul>
                  <p className="mt-2 text-xs text-gray-500 italic">
                    Only works with AI models that support tools. Requires LinkedIn app with Sign In with
                    LinkedIn (OpenID Connect).
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        {successMessage && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-700 font-medium" role="status">
              ✓ {successMessage}
            </p>
          </div>
        )}
        {error && (
          <div className="mt-4 space-y-2">
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
            {connectInWindowUrl && (
              <button
                type="button"
                onClick={handleConnectInWindow}
                className="text-sm font-medium text-primary hover:underline"
              >
                Connect in this window instead
              </button>
            )}
          </div>
        )}
        </div>
      </div>
    </div>
  );

  if (typeof document === 'undefined') {
    return null;
  }

  const portalTarget =
    document.getElementById('modal-root') ?? document.body;

  return createPortal(overlay as any, portalTarget);
};

export default IntegrationsModal;
