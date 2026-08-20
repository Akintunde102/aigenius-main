import { useEffect, useState } from "react";
import { clearUserDetailsCache, getUserDetails } from "@/lib/calls/get-logged-user-details";
import {
  clearSignupWelcomeSessionPending,
  markSignupWelcomeSeenForUser,
  shouldShowSignupWelcomeModal,
} from "@/lib/signup-welcome";
import { SIGNUP_BONUS_CREDITS } from "@/lib/credits";
import { serverCall } from "@/servercall/init";
import { serverCalls } from "@/servercall/store";

export function useSignupWelcomeCredits() {
  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [welcomeCredits, setWelcomeCredits] = useState(SIGNUP_BONUS_CREDITS);

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      try {
        const user = await getUserDetails();
        if (cancelled || !user?.id) {
          return;
        }

        const pending = (user.config as { signupWelcomePending?: boolean } | undefined)
          ?.signupWelcomePending;

        if (!shouldShowSignupWelcomeModal({ userId: user.id, signupWelcomePending: pending })) {
          return;
        }

        setWelcomeCredits(SIGNUP_BONUS_CREDITS);
        setShowWelcomeModal(true);
      } catch {
        /* non-critical */
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const dismissWelcomeModal = () => {
    void (async () => {
      try {
        const user = await getUserDetails();
        if (user?.id) {
          markSignupWelcomeSeenForUser(user.id);
        }

        await serverCall({
          serverCallProps: {
            call: serverCalls.postGatewayDismissSignupWelcome,
          },
          authorized: true,
        });
        clearUserDetailsCache();
      } catch {
        /* ignore — local dismiss still applies */
      }
      clearSignupWelcomeSessionPending();
      setShowWelcomeModal(false);
    })();
  };

  return {
    showWelcomeModal,
    welcomeCredits,
    dismissWelcomeModal,
  };
}
