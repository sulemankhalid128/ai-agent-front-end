"use client";

import { useState, type FormEvent } from "react";
import type { AuthUser } from "@/lib/auth";
import { login, signup } from "@/lib/auth";

type AuthMode = "landing" | "login" | "signup";

type LandingPageProps = {
  onAuthenticated: (user: AuthUser) => void;
};

export function LandingPage({ onAuthenticated }: LandingPageProps) {
  const [mode, setMode] = useState<AuthMode>("landing");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function openForm(next: "login" | "signup") {
    setMode(next);
    setError(null);
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (mode === "signup") {
        const result = await signup({ email, password, name });
        onAuthenticated(result.user);
      } else {
        const result = await login({ email, password });
        onAuthenticated(result.user);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  if (mode === "landing") {
    return (
      <main className="relative flex min-h-dvh flex-col overflow-hidden">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 70% 50% at 20% 20%, rgba(31,111,91,0.22), transparent 55%), radial-gradient(ellipse 60% 45% at 90% 80%, rgba(26,33,28,0.1), transparent 50%)",
          }}
        />

        <div className="relative z-10 mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-6 py-16 sm:px-10">
          <p className="land-enter font-display text-5xl font-semibold tracking-tight text-foreground sm:text-7xl">
            MSK
          </p>
          <h1 className="land-enter-delay mt-5 max-w-xl font-display text-2xl font-medium leading-snug text-foreground sm:text-3xl">
            Your personal agent, ready when you are.
          </h1>
          <p className="land-enter-delay mt-4 max-w-md text-base leading-relaxed text-muted sm:text-lg">
            Sign in to chat, feed knowledge, and keep sessions across devices.
          </p>

          <div className="land-cta mt-10 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => openForm("login")}
              className="rounded-xl bg-accent px-6 py-3 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover"
            >
              Log in
            </button>
            <button
              type="button"
              onClick={() => openForm("signup")}
              className="rounded-xl bg-surface px-6 py-3 text-sm font-semibold text-foreground ring-1 ring-border transition-colors hover:bg-accent-soft"
            >
              Sign up
            </button>
          </div>
        </div>
      </main>
    );
  }

  const isSignup = mode === "signup";

  return (
    <main className="relative flex min-h-dvh flex-col items-center justify-center px-4 py-12">
      <div className="brand-enter w-full max-w-md">
        <button
          type="button"
          onClick={() => {
            setMode("landing");
            setError(null);
          }}
          className="mb-8 text-left font-display text-3xl font-semibold tracking-tight text-foreground transition-opacity hover:opacity-80"
        >
          MSK
        </button>

        <form
          onSubmit={(e) => void handleSubmit(e)}
          className="rounded-[1.5rem] bg-panel p-6 shadow-[var(--panel-shadow)] ring-1 ring-border sm:p-8"
        >
          <h2 className="font-display text-2xl font-semibold text-foreground">
            {isSignup ? "Create account" : "Welcome back"}
          </h2>
          <p className="mt-1 text-sm text-muted">
            {isSignup
              ? "Join MSK to start chatting with your agent."
              : "Log in to continue your conversations."}
          </p>

          <div className="mt-6 flex flex-col gap-4">
            {isSignup ? (
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-medium text-foreground">Name</span>
                <input
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl bg-surface px-3.5 py-2.5 text-foreground outline-none ring-1 ring-border transition focus:ring-2 focus:ring-accent"
                  placeholder="Optional"
                />
              </label>
            ) : null}

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">Email</span>
              <input
                type="email"
                required
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="rounded-xl bg-surface px-3.5 py-2.5 text-foreground outline-none ring-1 ring-border transition focus:ring-2 focus:ring-accent"
                placeholder="you@example.com"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-medium text-foreground">Password</span>
              <input
                type="password"
                required
                minLength={6}
                autoComplete={isSignup ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="rounded-xl bg-surface px-3.5 py-2.5 text-foreground outline-none ring-1 ring-border transition focus:ring-2 focus:ring-accent"
                placeholder="At least 6 characters"
              />
            </label>
          </div>

          {error ? (
            <p className="mt-4 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-xl bg-accent px-4 py-3 text-sm font-semibold text-accent-fg transition-colors hover:bg-accent-hover disabled:opacity-60"
          >
            {loading
              ? isSignup
                ? "Creating…"
                : "Signing in…"
              : isSignup
                ? "Sign up"
                : "Log in"}
          </button>

          <p className="mt-4 text-center text-sm text-muted">
            {isSignup ? "Already have an account?" : "New here?"}{" "}
            <button
              type="button"
              onClick={() => openForm(isSignup ? "login" : "signup")}
              className="font-semibold text-accent underline-offset-2 hover:underline"
            >
              {isSignup ? "Log in" : "Sign up"}
            </button>
          </p>
        </form>
      </div>
    </main>
  );
}
