export function Logo({ className = '' }: { className?: string }) {
  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 64 64" className="h-7 w-7" aria-hidden>
        <rect width="64" height="64" rx="16" fill="#0EA5E9" />
        <path d="M18 24h28M32 24v22" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
        <circle cx="20" cy="44" r="4" fill="#fff" opacity=".7" />
        <circle cx="44" cy="44" r="4" fill="#fff" opacity=".7" />
      </svg>
      <span className="text-[17px] font-bold tracking-tight">TripSplit</span>
    </span>
  );
}
