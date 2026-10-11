import { BedDouble, Bus, Receipt, ShoppingBag, Ticket, UtensilsCrossed, type LucideIcon } from 'lucide-react';
import type { Category } from './types';

export const CATEGORY_META: Record<Category, { label: string; icon: LucideIcon; tone: string }> = {
  food: { label: 'Food', icon: UtensilsCrossed, tone: 'bg-amber-50 text-amber-600' },
  transport: { label: 'Transport', icon: Bus, tone: 'bg-sky-50 text-sky-600' },
  accommodation: { label: 'Stay', icon: BedDouble, tone: 'bg-violet-50 text-violet-600' },
  activities: { label: 'Activities', icon: Ticket, tone: 'bg-emerald-50 text-emerald-600' },
  shopping: { label: 'Shopping', icon: ShoppingBag, tone: 'bg-rose-50 text-rose-600' },
  other: { label: 'Other', icon: Receipt, tone: 'bg-slate-100 text-slate-600' },
};

export function categoryMeta(category: string) {
  return CATEGORY_META[category as Category] ?? CATEGORY_META.other;
}
