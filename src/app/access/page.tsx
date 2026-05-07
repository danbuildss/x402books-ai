"use client";

import Link from "next/link";
import { FormEvent, Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/logo";

const SAVED_EMAIL_KEY = "x402books_email";

function AccessForm() {
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => searchParams.get("next") || "/dashboard", [searchParams]);

  const [tab, setTab] = useState<"signin" | "signup">("signin");
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [savedEmail, setSavedEmail] = useState("");

  useEffect(() => {
    const stored = localStorage.getItem(SAVED_EMAIL_KEY);
    if (stored) {
      setEmail(stored);
      setSavedEmail(stored);
    }
  }, []);

  function clearMessages() {
    setError("");
    setStatus("");
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    clearMessages();
    setIsLoading(true);

    try {
      const payload =
        tab === "signin"
          ? { signin: true, email }
          : { signin: false, code, email };

      const response = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not complete this action.");
        return;
      }

      if (email.trim()) {
        localStorage.setItem(SAVED_EMAIL_KEY, email.trim().toLowerCase());
      }

      setStatus(tab === "signin" ? "Signing you in…" : "Access unlocked. Opening the app…");
      window.location.assign(nextPath.startsWith("/") ? nextPath : "/dashboard");
    } catch {
      setError("Could not connect right now. Try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <main className="access-page" data-theme="dark">
      <section className="access-card">
        <div className="access-brand">
          <Logo />
          <span>Private beta</span>
        </div>

        <div className="access-copy">
          <h1>{tab === "signin" ? "Welcome back" : "Access x402Books"}</h1>
          <p>
            {tab === "signin"
              ? "Sign in with the email you used when you first joined."
              : "Enter your beta code to open the wallet scanner, reports, and agent ledger API."}
          </p>
        </div>

        {/* Tab switcher */}
        <div className="access-tabs">
          <button
            type="button"
            className={tab === "signin" ? "active" : ""}
            onClick={() => { setTab("signin"); clearMessages(); }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={tab === "signup" ? "active" : ""}
            onClick={() => { setTab("signup"); clearMessages(); }}
          >
            Sign Up
          </button>
        </div>

        <form className="access-form" onSubmit={onSubmit}>
          <label>
            <span>
              Email
              {savedEmail && tab === "signin" && (
                <span className="access-saved-indicator" style={{ display: "inline-flex", gap: "4px", marginLeft: "8px" }}>
                  ✓ remembered
                </span>
              )}
            </span>
            <input
              autoComplete="email"
              autoFocus
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          {tab === "signup" && (
            <label>
              <span>Beta access code</span>
              <input
                autoComplete="one-time-code"
                placeholder="XBOOKS-..."
                value={code}
                onChange={(e) => setCode(e.target.value)}
              />
            </label>
          )}

          <button disabled={isLoading} type="submit">
            {isLoading
              ? "Checking…"
              : tab === "signin"
              ? "Sign In"
              : "Unlock App"}
          </button>

          {error  ? <p className="form-message error">{error}</p>   : null}
          {status ? <p className="form-message success">{status}</p> : null}
        </form>

        <div className="access-footer">
          {tab === "signin" ? (
            <>
              <span style={{ color: "#9ca69f", fontSize: "13px" }}>New user?</span>
              <button type="button" className="access-footer-link" onClick={() => { setTab("signup"); clearMessages(); }}>
                Sign up with a beta code →
              </button>
            </>
          ) : (
            <>
              <Link href="/#waitlist">Join waitlist</Link>
              <Link href="/">Back to landing</Link>
            </>
          )}
        </div>
      </section>
    </main>
  );
}

export default function AccessPage() {
  return (
    <Suspense fallback={<main className="access-page" data-theme="dark" />}>
      <AccessForm />
    </Suspense>
  );
}
