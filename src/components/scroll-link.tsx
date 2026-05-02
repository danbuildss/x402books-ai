"use client";

import { AnchorHTMLAttributes, ReactNode } from "react";

type ScrollLinkProps = AnchorHTMLAttributes<HTMLAnchorElement> & {
  targetId: string;
  children: ReactNode;
};

export function ScrollLink({ targetId, children, onClick, ...props }: ScrollLinkProps) {
  return (
    <a
      {...props}
      href="/"
      onClick={(event) => {
        event.preventDefault();
        onClick?.(event);
        document.getElementById(targetId)?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      }}
    >
      {children}
    </a>
  );
}
