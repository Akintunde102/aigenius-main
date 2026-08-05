"use client";
import { AuthPage } from "@/app/components/auth/AuthPage";
import { useRedirectDesktopFromWebAuthPage } from "@/lib/hooks/use-redirect-desktop-from-web-auth";

const SignUp = () => {
  useRedirectDesktopFromWebAuthPage();
  return <AuthPage variant="signup" />;
};

export default SignUp;
