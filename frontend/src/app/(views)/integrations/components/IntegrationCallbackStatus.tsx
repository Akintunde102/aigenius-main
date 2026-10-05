'use client';

import { motion, useReducedMotion } from 'framer-motion';
import { CheckCircle2, Loader2, XCircle } from 'lucide-react';
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
 * Shared transient surface for integration OAuth callbacks (Gmail, LinkedIn).
 * A quiet centered message in the landing page's style: no glow, no card, no ambient background.
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
    <div className="flex min-h-[70vh] w-full flex-1 flex-col items-center justify-center px-5 py-16">
      <motion.div
        initial={reduce ? undefined : { opacity: 0, y: 12 }}
        animate={reduce ? undefined : { opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.23, 1, 0.32, 1] }}
        className="flex w-full max-w-sm flex-col items-center text-center"
      >
        <div
          className={cn(
            'mb-6 flex h-14 w-14 items-center justify-center rounded-2xl',
            failed
              ? 'bg-rose-500/10 text-rose-500'
              : done
                ? 'bg-emerald-500/10 text-emerald-500'
                : 'bg-black/[0.05] text-lp-muted dark:bg-white/[0.07]',
          )}
        >
          {!done ? (
            <Loader2 className="h-7 w-7 animate-spin motion-reduce:animate-none" aria-hidden />
          ) : failed ? (
            <XCircle className="h-7 w-7" aria-hidden />
          ) : (
            <CheckCircle2 className="h-7 w-7" aria-hidden />
          )}
        </div>

        <p role="status" className="text-lg font-medium">
          {message}
        </p>
        <p className="mt-2 text-sm text-lp-muted">
          {done
            ? "You can close this tab if it doesn't close automatically."
            : 'This window will close automatically.'}
        </p>

        {showCloseButton && (
          <button
            type="button"
            onClick={() => window.close()}
            className={cn(
              'mt-8 inline-flex h-11 items-center justify-center rounded-full bg-stone-900 px-6 text-sm font-medium text-white transition-[transform,opacity] duration-150 ease-out-strong hover:opacity-90 active:scale-[0.97] dark:bg-white dark:text-stone-900',
              FOCUS_RING,
            )}
          >
            Close window
          </button>
        )}
      </motion.div>
    </div>
  );
}