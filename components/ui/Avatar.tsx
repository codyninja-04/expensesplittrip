import { avatarColour, cn, initials } from '@/lib/format';

const SIZES = {
  xs: 'h-5 w-5 text-[9px]',
  sm: 'h-7 w-7 text-[11px]',
  md: 'h-9 w-9 text-xs',
  lg: 'h-11 w-11 text-sm',
};

export function Avatar({
  name,
  seed,
  size = 'md',
  className,
}: {
  name: string;
  seed?: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      title={name}
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full font-semibold',
        SIZES[size],
        avatarColour(seed ?? name),
        className
      )}
    >
      {initials(name)}
    </span>
  );
}

export function AvatarStack({
  people,
  max = 4,
}: {
  people: Array<{ id: string; display_name: string }>;
  max?: number;
}) {
  const shown = people.slice(0, max);
  const extra = people.length - shown.length;
  return (
    <span className="flex -space-x-1.5">
      {shown.map((p) => (
        <Avatar key={p.id} name={p.display_name} seed={p.id} size="xs" className="ring-2 ring-surface" />
      ))}
      {extra > 0 && (
        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-slate-100 text-[9px] font-semibold text-ink-muted ring-2 ring-surface">
          +{extra}
        </span>
      )}
    </span>
  );
}
