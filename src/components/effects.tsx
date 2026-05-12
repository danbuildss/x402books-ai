"use client";

import { ReactNode, useEffect, useMemo, useState } from "react";

type TextTypeProps = {
  texts: string[];
  typingSpeed?: number;
  deletingSpeed?: number;
  pauseDuration?: number;
  showCursor?: boolean;
  cursorCharacter?: string;
};

export function TextType({
  texts,
  typingSpeed = 75,
  deletingSpeed = 40,
  pauseDuration = 1400,
  showCursor = true,
  cursorCharacter = "_",
}: TextTypeProps) {
  const safeTexts = useMemo(() => (texts.length ? texts : [""]), [texts]);
  const [textIndex, setTextIndex] = useState(0);
  const [visibleText, setVisibleText] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const current = safeTexts[textIndex % safeTexts.length];
    const isComplete = visibleText === current;
    const isEmpty = visibleText.length === 0;

    const timeout = window.setTimeout(
      () => {
        if (!isDeleting && isComplete) {
          setIsDeleting(true);
          return;
        }

        if (isDeleting && isEmpty) {
          setIsDeleting(false);
          setTextIndex((index) => (index + 1) % safeTexts.length);
          return;
        }

        setVisibleText((value) =>
          isDeleting ? value.slice(0, -1) : current.slice(0, value.length + 1),
        );
      },
      isComplete && !isDeleting ? pauseDuration : isDeleting ? deletingSpeed : typingSpeed,
    );

    return () => window.clearTimeout(timeout);
  }, [
    deletingSpeed,
    isDeleting,
    pauseDuration,
    safeTexts,
    textIndex,
    typingSpeed,
    visibleText,
  ]);

  return (
    <span className="text-type">
      {visibleText}
      {showCursor ? <span className="type-cursor">{cursorCharacter}</span> : null}
    </span>
  );
}

type ShinyTextProps = {
  text: string;
  speed?: number;
  delay?: number;
};

export function ShinyText({ text, speed = 2, delay = 0 }: ShinyTextProps) {
  return (
    <span
      className="shiny-text"
      style={{
        animationDuration: `${speed}s`,
        animationDelay: `${delay}s`,
      }}
    >
      {text}
    </span>
  );
}

type FadeContentProps = {
  children: ReactNode;
  blur?: boolean;
  duration?: number;
  delay?: number;
  initialOpacity?: number;
};

export function FadeContent({
  children,
  blur = true,
  duration = 800,
  delay = 0,
  initialOpacity = 0,
}: FadeContentProps) {
  return (
    <div
      className={blur ? "fade-content with-blur" : "fade-content"}
      style={{
        "--fade-duration": `${duration}ms`,
        "--fade-delay": `${delay}ms`,
        "--initial-opacity": initialOpacity,
      } as React.CSSProperties}
    >
      {children}
    </div>
  );
}

type GlassIconItem = {
  icon: ReactNode;
  color: string;
  label: string;
};

export function GlassIcons({ items }: { items: GlassIconItem[] }) {
  return (
    <div className="glass-icons">
      {items.map((item) => (
        <div className={`glass-icon ${item.color}`} key={item.label}>
          <span>{item.icon}</span>
          <strong>{item.label}</strong>
        </div>
      ))}
    </div>
  );
}

export function BorderGlow({ children }: { children: ReactNode }) {
  return <div className="border-glow">{children}</div>;
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const storedTheme = window.localStorage.getItem("x402books-theme");
    const preferredTheme = window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
    const nextTheme = storedTheme === "dark" || storedTheme === "light" ? storedTheme : preferredTheme;
    setTheme(nextTheme);
    document.documentElement.dataset.theme = nextTheme;
  }, []);

  function toggleTheme() {
    setTheme((current) => {
      const nextTheme = current === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = nextTheme;
      window.localStorage.setItem("x402books-theme", nextTheme);
      return nextTheme;
    });
  }

  return (
    <button
      className="theme-toggle"
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
        </svg>
      )}
    </button>
  );
}
