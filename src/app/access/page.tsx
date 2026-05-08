"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/logo";

const SAVED_EMAIL_KEY = "x402books_email";

function AccessForm() {
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => searchParams.get("next") || "/dashboard", [searchParams]);
  const { ready, authenticated, user, login, logout } = usePrivy();

  const [step, setStep] = useState<"loading" | "privy" | "code">("loading");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Once Privy is ready and authenticated, try auto sign-in
  useEffect(() => {
    if (!ready) return;
    if (!authenticated || !user) {
      setStep("privy");
      return;
    }

    const email =
      user.email?.address ||
      user.linkedAccounts.find((a) => a.type === "email")?.address ||
      null;

    if (!email) {
      setStep("code");
      return;
    }

    // Try returning-user sign-in first
    setIsLoading(true);
    fetch("/api/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ signin: true, email }),
    })
      .then((res) => {
        if (res.ok) {
          localStorage.setItem(SAVED_EMAIL_KEY, email);
          window.location.assign(nextPath.startsWith("/") ? nextPath : "/dashboard");
        } else {
          setStep("code");
          setIsLoading(false);
        }
      })
      .catch(() => {
        setStep("code");
        setIsLoading(false);
      });
  }, [ready, authenticated, user, nextPath]);

  async function onCodeSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    const email =
      user?.email?.address ||
      user?.linkedAccounts.find((a) => a.type === "email")?.address ||
      "";

    try {
      const res = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signin: false, code, email }),
      });
      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Invalid code.");
        return;
      }

      if (email) localStorage.setItem(SAVED_EMAIL_KEY, email);
      window.location.assign(nextPath.startsWith("/") ? nextPath : "/dashboard");
    } catch {
      setError("Could not connect right now. Try again.");
    } finally {
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    await logout();
    setStep("privy");
    setError("");
  }

  const userEmail =
    user?.email?.address ||
    user?.linkedAccounts.find((a) => a.type === "email")?.address;

  return (
    <main className="access-page" data-theme="dark">
      <section className="access-card">
        <div className="access-brand">
          <Logo />
          <span>Private beta</span>
        </div>

        {/* Loading / authenticating */}
        {(step === "loading" || (authenticated && isLoading && step !== "code")) && (
          <>
            <div className="access-copy">
              <h1>Signing you in…</h1>
              <p>Just a moment while we verify your account.</p>
            </div>
            <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
              <span style={{ display: "inline-block", animation: "spin 0.7s linear infinite", fontSize: "28px", color: "#66e4a5" }}>
                ⟳
              </span>
            </div>
          </>
        )}

        {/* Step 1 — Privy login */}
        {step === "privy" && (
          <>
            <div className="access-copy">
              <h1>Access x402Books</h1>
              <p>Sign in with your email, Google account, or crypto wallet to continue.</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <button
                className="access-privy-btn"
                onClick={login}
                disabled={!ready}
              >
                <img src="/logo.svg" alt="" width={20} height={20} style={{ borderRadius: "4px" }} />
                Continue with Email or Wallet
              </button>
            </div>
            <div className="access-footer">
              <a href="/#waitlist" style={{ color: "#9ca69f", fontSize: "13px" }}>Join waitlist</a>
              <a href="/" style={{ color: "#9ca69f", fontSize: "13px" }}>Back to landing</a>
            </div>
          </>
        )}

        {/* Step 2 — Beta code entry */}
        {step === "code" && (
          <>
            <div className="access-copy">
              <h1>Enter your beta code</h1>
              <p>
                {userEmail
                  ? `Signed in as ${userEmail}. Enter your invite code to unlock the app.`
                  : "Enter your invite code to unlock the app."}
              </p>
            </div>
            <form className="access-form" onSubmit={onCodeSubmit}>
              <label>
                <span>Beta access code</span>
                <input
                  autoComplete="one-time-code"
                  autoFocus
                  placeholder="XBOOKS-..."
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </label>
              <button disabled={isLoading} type="submit">
                {isLoading ? "Checking…" : "Unlock App"}
              </button>
              {error && <p className="form-message error">{error}</p>}
            </form>
            <div className="access-footer">
              <button type="button" className="access-footer-link" onClick={handleLogout}>
                ← Use a different account
              </button>
            </div>
          </>
        )}
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
