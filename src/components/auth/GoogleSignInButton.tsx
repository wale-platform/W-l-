"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Script from "next/script";
import { Alert } from "@/components/ui";
import { authApi, type AuthUser } from "@/lib/api/auth";

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (options: {
            client_id: string;
            callback: (response: { credential: string }) => void;
            auto_select?: boolean;
          }) => void;
          renderButton: (
            parent: HTMLElement,
            options: {
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "signup_with" | "continue_with" | "signin";
              shape?: "rectangular" | "pill" | "circle" | "square";
              width?: number;
              logo_alignment?: "left" | "center";
            },
          ) => void;
        };
      };
    };
  }
}

interface GoogleSignInButtonProps {
  onAuthenticated: (user: AuthUser) => void;
  buttonText: "signin_with" | "signup_with";
  accountRole?: "student" | "landlord" | "lawyer" | "tenant";
  disabled?: boolean;
}

const googleClientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;

export function GoogleSignInButton({
  onAuthenticated,
  buttonText,
  accountRole,
  disabled = false,
}: GoogleSignInButtonProps) {
  const buttonContainer = useRef<HTMLDivElement>(null);
  const authHandler = useRef(onAuthenticated);
  const [scriptReady, setScriptReady] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const isDisabled = disabled || isSubmitting;

  useEffect(() => {
    authHandler.current = onAuthenticated;
  }, [onAuthenticated]);

  const handleCredential = useCallback(async (credential: string) => {
    setIsSubmitting(true);
    setError("");
    try {
      const { user } = await authApi.loginWithGoogle(credential, accountRole);
      authHandler.current(user);
    } catch (authError) {
      setError(
        authError instanceof Error
          ? authError.message
          : "Google sign-in could not be completed. Please try again.",
      );
    } finally {
      setIsSubmitting(false);
    }
  }, [accountRole]);

  useEffect(() => {
    const container = buttonContainer.current;
    const googleIdentity = window.google?.accounts.id;
    if (!googleClientId || !scriptReady || !container || !googleIdentity) return;

    container.replaceChildren();
    googleIdentity.initialize({
      client_id: googleClientId,
      callback: (response) => {
        if (response.credential) void handleCredential(response.credential);
      },
      auto_select: false,
    });
    googleIdentity.renderButton(container, {
      theme: "outline",
      size: "large",
      text: buttonText,
      shape: "rectangular",
      width: Math.min(container.clientWidth || 400, 400),
      logo_alignment: "left",
    });
  }, [buttonText, handleCredential, scriptReady]);

  if (!googleClientId) {
    return (
      <Alert tone="info" title="Google sign-in unavailable">
        Set NEXT_PUBLIC_GOOGLE_CLIENT_ID in your environment and restart the app to enable Google sign-in.
      </Alert>
    );
  }

  return (
    <div className={isDisabled ? "pointer-events-none opacity-60" : undefined}>
      <Script
        src="https://accounts.google.com/gsi/client"
        strategy="afterInteractive"
        onReady={() => setScriptReady(true)}
        onError={() => setError("Google sign-in could not load. Check your connection and try again.")}
      />
      <div ref={buttonContainer} className="flex min-h-10 justify-center" />
      {isSubmitting && (
        <p className="mt-2 text-center text-xs text-ink-500" role="status">
          Verifying your Google account…
        </p>
      )}
      {error && (
        <p className="mt-2 text-center text-sm text-danger" role="alert">
          {error}
        </p>
      )}
      <p className="mt-2 text-center text-xs leading-5 text-ink-500">
        {accountRole
          ? `Google sign-up creates a ${accountRole === "student" ? "student / housing-seeker" : accountRole} account.`
          : "Continue with your Google account."}
      </p>
    </div>
  );
}
