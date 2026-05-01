export function LogoMark() {
  return (
    <svg
      aria-hidden="true"
      className="logo-mark"
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect width="48" height="48" rx="15" fill="#0B8F74" />
      <path
        d="M14 15.5C14 13.57 15.57 12 17.5 12H34V33.5C34 34.88 32.88 36 31.5 36H17.5C15.57 36 14 34.43 14 32.5V15.5Z"
        fill="#F7FAF8"
      />
      <path
        d="M19 18.5H29.5M19 23.5H27M19 28.5H30"
        stroke="#0E1A17"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
      <path
        d="M34 12H18C15.79 12 14 13.79 14 16V16.5C14 18.43 15.57 20 17.5 20H34V12Z"
        fill="#DFF7EF"
      />
      <path
        d="M25.75 36V30.5C25.75 29.4 26.65 28.5 27.75 28.5H34"
        stroke="#0B8F74"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      <circle cx="35.5" cy="28.5" r="3.5" fill="#101918" />
    </svg>
  );
}

export function Logo() {
  return (
    <span className="brand" aria-label="x402Books AI">
      <LogoMark />
      <span>x402Books AI</span>
    </span>
  );
}
