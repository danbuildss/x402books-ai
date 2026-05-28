import { notFound, redirect } from "next/navigation";

// /registry/card redirects to /registry — this is a catch-all fallback
export default function CardIndexPage() {
  redirect("/registry");
}
