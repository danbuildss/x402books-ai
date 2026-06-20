export function LogoMark({ size = 32 }: { size?: number }) {
  const h = Math.round(size * 70 / 80);
  return (
    <svg
      viewBox="0 0 80 70"
      width={size}
      height={h}
      aria-hidden="true"
      className="logo-mark"
      style={{ display: "block", flexShrink: 0 }}
    >
      <g transform="translate(37,2) skewX(-28)">
        {/* Top dark layer */}
        <rect x="0" y="0"  width="42" height="14" rx="4" fill="currentColor" />
        {/* Green accent layer */}
        <rect x="0" y="21" width="42" height="14" rx="4" fill="#6DB874" />
        {/* Third dark layer */}
        <rect x="0" y="42" width="42" height="11" rx="4" fill="currentColor" />
        {/* Bottom dark layer */}
        <rect x="0" y="56" width="42" height="10" rx="4" fill="currentColor" />
      </g>
    </svg>
  );
}

export function Logo() {
  return (
    <span className="brand" aria-label="Zetta">
      <LogoMark />
      <span>zetta</span>
    </span>
  );
}
