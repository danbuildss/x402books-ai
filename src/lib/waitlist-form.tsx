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
        setMessage("You are in. Early access updates will land in your inbox.");
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

  return (
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
      {message ? (
        <p className={state === "success" ? "form-message success" : "form-message error"}>
          {message}
        </p>
      ) : null}
    </form>
  );
}
