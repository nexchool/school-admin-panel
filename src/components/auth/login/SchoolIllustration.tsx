/** Flat, self-contained school illustration shown atop the login card. Decorative. */
export function SchoolIllustration({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 120 120" fill="none" role="img" aria-hidden="true" className={className}>
      <circle cx="60" cy="52" r="40" fill="#DBEAFE" />
      <ellipse cx="42" cy="34" rx="9" ry="5" fill="#FFFFFF" opacity="0.85" />
      <ellipse cx="82" cy="30" rx="7" ry="4" fill="#FFFFFF" opacity="0.85" />
      <rect x="38" y="52" width="44" height="30" rx="2" fill="#93C5FD" />
      <rect x="52" y="40" width="16" height="42" rx="1" fill="#BFDBFE" />
      <path d="M52 40a8 8 0 0 1 16 0z" fill="#3B82F6" />
      <rect x="59.2" y="26" width="1.6" height="11" fill="#1E3A8A" />
      <path d="M60.8 27h8l-2 2.5 2 2.5h-8z" fill="#3B82F6" />
      <rect x="55.5" y="66" width="9" height="16" rx="4.5" fill="#3B82F6" />
      <rect x="42" y="58" width="6" height="6" rx="1" fill="#3B82F6" />
      <rect x="72" y="58" width="6" height="6" rx="1" fill="#3B82F6" />
      <rect x="30" y="82" width="60" height="4" rx="2" fill="#93C5FD" />
    </svg>
  );
}
