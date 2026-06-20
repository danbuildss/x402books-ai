"use client";

import { FormEvent, useState } from "react";

type State = "idle" | "loading" | "success" | "error";

type WaitlistResult = {
  position: number;
  referralUrl: string;
  alreadyJoined?: boolean;
};

export function WaitlistForm() {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<WaitlistResult | null>(null);
  const [copyLabel, setCopyLabel] = useState("Copy referral link");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setState("loading");
    setMessage("");
    setResult(null);

    const payload = {
      email: String(form.get("email") || "").trim().toLowerCase(),
      x_handle: String(form.get("x_handle") || "")
        .trim()
        .replace(/^@/, ""),
      use_case: String(form.get("use_case") || "").trim(),
      pain_point: String(form.get("pain_point") || "").trim(),
    };

    try {
      const response = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const body = await response.json();

      if (response.ok) {
        setState("success");
        setResult({
          position: body.position || 1,
          referralUrl: body.referralUrl || "",
          alreadyJoined: body.alreadyJoined,
        });
        setMessage(
          body.alreadyJoined
            ? "You are already on the list."
            : "You are on the list.",
        );
        event.currentTarget.reset();
        return;
      }

      setState("error");
      setMessage(body.error || "Could not submit right now. Please try again.");
    } catch {
      setState("error");
      setMessage("Network issue. Please try again in a moment.");
    }
  }

  async function copyReferralLink() {
    if (!result?.referralUrl) {
      return;
    }

    await navigator.clipboard.writeText(result.referralUrl);
    setCopyLabel("Copied");
    window.setTimeout(() => setCopyLabel("Copy referral link"), 1800);
  }

  const shareText = encodeURIComponent(
    "I joined the Zetta waitlist. Readable books for the x402 economy.",
  );
  const shareUrl = result?.referralUrl
    ? `https://x.com/intent/tweet?text=${shareText}&url=${encodeURIComponent(result.referralUrl)}`
    : "";

  return (
    <div className="waitlist-card">
      <form className="waitlist-form" onSubmit={onSubmit}>
        <div className="field-grid">
          <label>
            <span>Email</span>
            <input required type="email" name="email" placeholder="dan@example.com" />
          </label>
          <label>
            <span>X handle</span>
            <input name="x_handle" placeholder="@danbuildss" />
          </label>
        </div>
        <label>
          <span>What are you building?</span>
          <textarea
            name="use_case"
            placeholder="Agent app, API, payment flow, x402 service..."
          />
        </label>
        <label>
          <span>What is painful about tracking wallet activity?</span>
          <textarea
            name="pain_point"
            placeholder="Raw exports, missing categories, messy microtransactions..."
          />
        </label>
        <button className="form-submit" disabled={state === "loading"} type="submit">
          {state === "loading" ? "Joining..." : "Join Waitlist"}
        </button>
      </form>
      {message ? (
        <p className={state === "success" ? "form-message success" : "form-message error"}>
          {message}
        </p>
      ) : null}
      {result ? (
        <div className="referral-panel">
          <div>
            <span>Your spot</span>
            <strong>#{result.position}</strong>
          </div>
          <p>Move up by sharing your referral link.</p>
          <div className="referral-actions">
            <a href={shareUrl} target="_blank" rel="noreferrer">
              Share on X
            </a>
            <button type="button" onClick={copyReferralLink}>
              {copyLabel}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
