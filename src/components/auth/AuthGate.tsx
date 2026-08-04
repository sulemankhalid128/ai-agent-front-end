"use client";

import { useEffect, useState } from "react";
import { ChatApp } from "@/components/chat/ChatApp";
import { LandingPage } from "@/components/auth/LandingPage";
import {
  clearAuth,
  fetchCurrentUser,
  getStoredToken,
  getStoredUser,
  type AuthUser,
} from "@/lib/auth";
import { clearStoredSessionId } from "@/lib/agentApi";

export function AuthGate() {
  const [ready, setReady] = useState(false);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      const token = getStoredToken();
      if (!token) {
        if (!cancelled) {
          setUser(null);
          setReady(true);
        }
        return;
      }

      const cached = getStoredUser();
      if (cached && !cancelled) setUser(cached);

      try {
        const me = await fetchCurrentUser();
        if (!cancelled) setUser(me);
      } catch {
        clearAuth();
        if (!cancelled) setUser(null);
      } finally {
        if (!cancelled) setReady(true);
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, []);

  function handleAuthenticated(next: AuthUser) {
    setUser(next);
  }

  function handleLogout() {
    clearAuth();
    clearStoredSessionId();
    setUser(null);
  }

  if (!ready) {
    return (
      <div className="flex min-h-dvh items-center justify-center">
        <p className="text-sm text-muted">Loading MSK…</p>
      </div>
    );
  }

  if (!user) {
    return <LandingPage onAuthenticated={handleAuthenticated} />;
  }

  return <ChatApp user={user} onLogout={handleLogout} />;
}
