// Lightweight CSS/SVG mascot — no image asset needed.
export function Mascot({ className = "" }: { className?: string }) {
  return (
    <div className={`relative ${className}`}>
      <svg viewBox="0 0 220 220" className="h-full w-full drop-shadow-[0_20px_40px_oklch(0.40_0.18_270/0.25)]">
        <defs>
          <linearGradient id="body" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="oklch(0.85 0.10 270)" />
            <stop offset="100%" stopColor="oklch(0.75 0.14 230)" />
          </linearGradient>
          <radialGradient id="cheek" cx="50%" cy="50%">
            <stop offset="0%" stopColor="oklch(0.85 0.10 15 / 0.7)" />
            <stop offset="100%" stopColor="oklch(0.85 0.10 15 / 0)" />
          </radialGradient>
        </defs>
        <circle cx="110" cy="115" r="80" fill="url(#body)" />
        <circle cx="80" cy="105" r="10" fill="white" />
        <circle cx="140" cy="105" r="10" fill="white" />
        <circle cx="80" cy="107" r="5" fill="oklch(0.20 0.04 270)" />
        <circle cx="140" cy="107" r="5" fill="oklch(0.20 0.04 270)" />
        <circle cx="65" cy="135" r="12" fill="url(#cheek)" />
        <circle cx="155" cy="135" r="12" fill="url(#cheek)" />
        <path d="M90 140 Q110 158 130 140" stroke="oklch(0.20 0.04 270)" strokeWidth="4" strokeLinecap="round" fill="none" />
        {/* antenna */}
        <line x1="110" y1="40" x2="110" y2="20" stroke="oklch(0.55 0.15 270)" strokeWidth="3" />
        <circle cx="110" cy="16" r="6" fill="oklch(0.85 0.15 100)" />
      </svg>
    </div>
  );
}
