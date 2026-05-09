"use client";

import { usePrivy } from "@privy-io/react-auth";
import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/logo";

function AccessForm() {
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => searchParams.get("next") || "/dashboard", [searchParams]);
  const { ready, authenticated, user, login, logout } = usePrivy();

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!ready) return;
    if (!authenticated || !user) return;

    const email =
      user.email?.address ||
      (user.linkedAccounts.find((a) => a.type === "email") as { address?: string } | undefined)?.address ||
      null;

    const xHandle =
      (user.linkedAccounts.find((a) => a.type === "twitter_oauth") as { username?: string } | undefined)?.username ||
      null;

    setIsLoading(true);
    setError("");

    fetch("/api/access", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ privy: true, userId: user.id, email, xHandle }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          window.location.assign(nextPath.startsWith("/") ? nextPath : "/dashboard");
        } else {
          setError(data.error || "Could not sign in right now.");
          setIsLoading(false);
        }
      })
      .catch(() => {
        setError("Could not connect right now. Try again.");
        setIsLoading(false);
      });
  }, [ready, authenticated, user, nextPath]);

  const showSpinner = !ready || (authenticated && isLoading);

  return (
    <main className="access-page" data-theme="dark">
      <section className="access-card">
        <div className="access-brand">
          <Logo />
          <span>x402Books AI</span>
        </div>

        {showSpinner && (
          <>
            <div className="access-copy">
              <h1>Signing you in…</h1>
              <p>Just a moment while we set up your account.</p>
            </div>
            <div style={{ display: "flex", justifyContent: "center", padding: "24px 0" }}>
              <span style={{ display: "inline-block", animation: "spin 0.7s linear infinite", fontSize: "28px", color: "#6DB874" }}>
                ⟳
              </span>
            </div>
          </>
        )}

        {!showSpinner && !authenticated && (
          <>
            <div className="access-copy">
              <h1>Sign in to x402Books</h1>
              <p>Track your Base USDC activity, categorize transactions, and generate financial reports.</p>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <button className="access-privy-btn" onClick={login} disabled={!ready}>
                <img src="/logo.svg" alt="" width={20} height={20} style={{ borderRadius: "4px" }} />
                Continue with Email or X
              </button>
            </div>
            {error && <p className="form-message error">{error}</p>}
            <div className="access-footer">
              <a href="/" style={{ color: "#6B6960", fontSize: "13px" }}>← Back to home</a>
            </div>
          </>
        )}

        {!showSpinner && authenticated && !isLoading && error && (
          <>
            <div className="access-copy">
              <h1>Something went wrong</h1>
              <p>{error}</p>
            </div>
            <button className="access-privy-btn" onClick={() => { logout(); setError(""); }}>
              Try a different account
            </button>
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
