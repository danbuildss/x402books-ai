import Link from "next/link";

// matrix(0.985,-0.174,-0.423,0.906,e,f):
//   x-axis (width dir) → (0.985, -0.174): 10° upward lean going right
//   y-axis (height dir) → (-0.423, 0.906): 25° leftward lean going down
// This reproduces the 3D-stack Z shape from the Zetta brand mark.
// Layer rects at y=0,37,74,111 produce 9px screen-space gaps between layers.
// ViewBox 0 0 120 126 tightly bounds all 4 layers.

export function LogoMark({ size = 32 }: { size?: number }) {
  const w = Math.round(size * 120 / 126);
  return (
    <svg
      viewBox="0 0 120 126"
      width={w}
      height={size}
      aria-hidden="true"
      className="logo-mark"
      style={{ display: "block", flexShrink: 0 }}
    >
      <g transform="matrix(0.985,-0.174,-0.423,0.906,53,12)">
        <rect x="0" y="0"   width="68" height="14" rx="6" fill="currentColor" />
        <rect x="0" y="37"  width="68" height="14" rx="6" fill="#6DB874" />
        <rect x="0" y="74"  width="68" height="14" rx="6" fill="currentColor" />
        <rect x="0" y="111" width="68" height="14" rx="6" fill="currentColor" />
      </g>
    </svg>
  );
}

export function Logo({ href }: { href?: string }) {
  const inner = (
    <span className="brand" aria-label="Zetta">
      <LogoMark />
      <span>zetta</span>
    </span>
  );
  if (href) {
    return <Link href={href} style={{ textDecoration: "none", color: "inherit" }}>{inner}</Link>;
  }
  return inner;
}
