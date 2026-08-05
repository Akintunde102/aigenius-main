'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
import { LandingAmbientBackground } from '@/app/components/ui';
import { FOCUS_RING } from '@/app/components/public-page-shell.constants';
import { cn } from '@/lib/utils';

interface IntegrationCallbackStatusProps {
  /** True once the callback handshake finished (window is about to close / redirect). */
  done: boolean;
  message: string;
  showCloseButton: boolean;
  /** null while still processing; true/false once the OAuth result is known. */
  succeeded: boolean | null;
}

/**
 * Shared transient surface for integration OAuth callbacks (Gmail, LinkedIn):
 * matches the public dark design system while the popup/redirect resolves.
 */
export function IntegrationCallbackStatus({
  done,
  message,
  showCloseButton,
  succeeded,
}: IntegrationCallbackStatusProps) {
  const reduce = useReducedMotion();
  const failed = done && succeeded === false;

  return (
    <div className="relative flex min-h-[70vh] w-full flex-1 flex-col items-center justify-center px-5 py-16">
      <LandingAmbientBackground />

      <motion.div
        initial={reduce ? undefined : { opacity: 0, y: 16 }}
        animate={reduce ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-sm"
      >
        <div
          aria-hidden
          className={cn(
            'absolute -inset-6 rounded-[2rem] bg-gradient-to-r via-transparent blur-2xl',
            failed
              ? 'from-red-500/[0.14] to-cyan-500/[0.10]'
              : 'from-cyan-500/[0.14] to-emerald-500/[0.10]',
          )}
        />

        <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-zinc-950 px-8 py-10 text-center shadow-2xl shadow-black/50">
          <div
            aria-hidden
            className={cn(
              'absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent to-transparent',
              failed ? 'via-red-400/60' : 'via-cyan-400/60',
            )}
          />
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.04] to-transparent"
          />

          <div className="relative">
            <div
              className={cn(
                'mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full',
                failed
                  ? 'bg-red-500/10 text-red-400 shadow-[0_0_40px_-8px_rgba(248,113,113,0.3)]'
                  : done
                    ? 'bg-emerald-500/10 text-emerald-400 shadow-[0_0_40px_-8px_rgba(16,185,129,0.35)]'
                    : 'bg-cyan-500/10 text-cyan-400',
              )}
            >
              {!done ? (
                <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
              ) : failed ? (
                <XCircle className="h-7 w-7" aria-hidden />
              ) : (
                <CheckCircle2 className="h-7 w-7" aria-hidden />
              )}
            </div>

            <p className="text-base font-medium text-zinc-100">{message}</p>
            <p className="mt-2 text-sm text-zinc-500">
              {done
                ? "You can close this tab if it doesn't close automatically."
                : 'This window will close automatically.'}
            </p>

            {showCloseButton && (
              <button
                type="button"
                onClick={() => window.close()}
                className={cn(
                  'mt-8 inline-flex items-center justify-center rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-zinc-900 transition hover:bg-zinc-100 active:scale-[0.99]',
                  FOCUS_RING,
                )}
              >
                Close window
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
