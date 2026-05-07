"use client";

import Link from "next/link";
import { FormEvent, Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Logo } from "@/components/logo";

function AccessForm() {
  const searchParams = useSearchParams();
  const nextPath = useMemo(() => searchParams.get("next") || "/dashboard", [searchParams]);
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setStatus("");
    setIsLoading(true);

    try {
      const response = await fetch("/api/access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, email }),
      });
      const data = await response.json();

      if (!response.ok) {
        setError(data.error || "Could not unlock access.");
        return;
      }

      setStatus("Access unlocked. Opening the app...");
      window.location.assign(nextPath.startsWith("/") ? nextPath : "/dashboard");
    } catch {
      setError("Could not verify this code right now.");
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
          <h1>Access x402Books</h1>
          <p>
            Enter your beta code to open the wallet scanner, reports, and agent ledger API.
          </p>
        </div>

        <form className="access-form" onSubmit={onSubmit}>
          <label>
            <span>Access code</span>
            <input
              autoComplete="one-time-code"
              autoFocus
              placeholder="XBOOKS-..."
              value={code}
              onChange={(event) => setCode(event.target.value)}
            />
          </label>
          <label>
            <span>Email optional</span>
            <input
              autoComplete="email"
              inputMode="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </label>
          <button disabled={isLoading} type="submit">
            {isLoading ? "Checking..." : "Unlock App"}
          </button>
          {error ? <p className="form-message error">{error}</p> : null}
          {status ? <p className="form-message success">{status}</p> : null}
        </form>

        <div className="access-footer">
          <Link href="/#waitlist">Join waitlist</Link>
          <Link href="/">Back to landing</Link>
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
