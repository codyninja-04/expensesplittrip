function Block({ className }: { className: string }) {
  return (
    <div className={`relative overflow-hidden rounded-2xl bg-slate-100 ${className}`}>
      <div className="absolute inset-0 -translate-x-full animate-shimmer bg-gradient-to-r from-transparent via-white/60 to-transparent" />
    </div>
  );
}

export default function TripLoading() {
  return (
    <div className="space-y-5" aria-busy>
      <Block className="h-5 w-16" />
      <Block className="h-8 w-48" />
      <div className="grid grid-cols-2 gap-3">
        <Block className="h-24" />
        <Block className="h-24" />
      </div>
      <Block className="h-48" />
      <Block className="h-64" />
    </div>
  );
}
