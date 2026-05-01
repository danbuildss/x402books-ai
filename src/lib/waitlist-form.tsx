"use client";

import { FormEvent, useState } from "react";

type State = "idle" | "loading" | "success" | "error";

export function WaitlistForm() {
  const [state, setState] = useState<State>("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);

    setState("loading");
    setMessage("");

    const payload = {
      email: String(form.get("email") || "").trim().toLowerCase(),
      x_handle: String(form.get("x_handle") || "").trim().replace(/^@/, ""),
      use_case: String(form.get("use_case") || "").trim(),
      pain_point: String(form.get("pain_point") || "").trim(),
    };

    const res = await fetch("/api/waitlist", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const body = await res.json();
    if (res.ok) {
      setState("success");
      setMessage("You’re in. We’ll email you early access.");
      event.currentTarget.reset();
      return;
    }

    setState("error");
    setMessage(body.error || "Couldn’t submit right now. Please try again.");
  }

  return (
    <form className="waitlist-form" onSubmit={onSubmit}>
      <label>
        Email
        <input required type="email" name="email" placeholder="you@company.com" />
      </label>
      <label>
        X handle (optional)
        <input name="x_handle" placeholder="danbuilds" />
      </label>
      <label>
        What will you use x402Books AI for first?
        <textarea name="use_case" placeholder="Track agent spend, monitor API costs..." />
      </label>
      <label>
        Biggest pain with wallet tracking today?
        <textarea name="pain_point" placeholder="Raw exports, no categorization, hard monthly reporting..." />
      </label>
      <button disabled={state === "loading"} className="btn btn-primary" type="submit">
        {state === "loading" ? "Joining..." : "Join Waitlist"}
      </button>
      {message ? <p className={state === "success" ? "ok" : "err"}>{message}</p> : null}
      <style jsx>{`
        .waitlist-form{display:grid;gap:12px}
        label{display:grid;gap:6px;color:#9aa8bc;font-size:14px}
        input,textarea{border:1px solid #223046;background:#0d1420;color:#ecf2fb;padding:11px 12px;border-radius:12px;font:inherit}
        textarea{min-height:94px;resize:vertical}
        .ok{color:#8de6dd}.err{color:#fda4af}
      `}</style>
    </form>
  );
}
