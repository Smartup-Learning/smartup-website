export type Centre = { name: string; phone: string; mapUrl: string; hours: string; address?: string };

/** Centres that share a phone number, so each number is shown once; groups keep the order of their first centre. */
export function groupByPhone<T extends { phone: string }>(centres: T[]): { phone: string; centres: T[] }[] {
  const groups = new Map<string, T[]>();
  for (const centre of centres) groups.set(centre.phone, [...(groups.get(centre.phone) ?? []), centre]);
  return [...groups].map(([phone, list]) => ({ phone, centres: list }));
}
