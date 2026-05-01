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
    <form className="grid gap-4" onSubmit={onSubmit}>
      <input required type="email" name="email" placeholder="Email" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" />
      <input name="x_handle" placeholder="X handle (optional)" className="rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" />
      <textarea name="use_case" placeholder="What will you use x402Books AI for first?" className="min-h-24 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" />
      <textarea name="pain_point" placeholder="What’s your biggest pain with wallet tracking today?" className="min-h-24 rounded-xl border border-slate-700 bg-slate-950 px-4 py-3" />
      <button disabled={state === "loading"} className="rounded-xl bg-teal-400 px-5 py-3 font-medium text-slate-950 disabled:opacity-60">{state === "loading" ? "Joining..." : "Join Waitlist"}</button>
      {message ? <p className={state === "success" ? "text-teal-300" : "text-rose-300"}>{message}</p> : null}
    </form>
  );
}
