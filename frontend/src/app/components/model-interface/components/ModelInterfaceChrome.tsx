"use client";

import React from "react";
import { ChatErrorMessage } from "@/app/components/model-interface/features/chat/components/ChatErrorMessage";
import { WalletCreditsMigrationBanner } from "@/app/components/model-interface/components/WalletCreditsMigrationBanner";
import type { ChatUiError } from "@/app/components/model-interface/features/chat/hooks/chatUiError";
import styles from "../ModelInterface.module.scss";

type ModelInterfaceChromeProps = {
  error: ChatUiError | null;
  optimizationMessage: string;
  canRetryError?: boolean;
  onDismissError: () => void;
  onRetryError: () => void | Promise<void>;
};

/** Top-of-shell alerts: send errors and optimization notices. */
export function ModelInterfaceChrome({
  error,
  optimizationMessage,
  canRetryError = true,
  onDismissError,
  onRetryError,
}: ModelInterfaceChromeProps) {
  return (
    <>
      <WalletCreditsMigrationBanner />

      {error ? (
        <ChatErrorMessage
          error={error}
          canRetry={canRetryError && error.retryAction !== "none"}
          onRetry={onRetryError}
          onDismiss={onDismissError}
        />
      ) : null}

      {optimizationMessage ? (
        <div className={`${styles.optimizationMessage} ${styles.fadeIn}`}>
          <div className={styles.optimizationContent}>
            <span className={styles.optimizationIcon}>⚡</span>
            <span>{optimizationMessage}</span>
          </div>
        </div>
      ) : null}
    </>
  );
}
