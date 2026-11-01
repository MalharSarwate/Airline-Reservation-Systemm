import type { Passenger, Seat } from './types';
export type Priority =
  'together' | 'window' | 'aisle' | 'legroom' | 'facilities' | 'price';
export interface SeatPlan {
  key: string;
  seats: Seat[];
  total: number;
  reasons: string[];
  score: number;
}
export function isAisle(s: Seat, seats: Seat[]) {
  return seats.some(
    (other) =>
      other.row === s.row &&
      Math.abs(other.column - s.column) === 1 &&
      Math.abs(other.x - s.x) > 1.1,
  );
}
export function canUseExit(passengers: Passenger[], today = new Date()) {
  const cutoff = new Date(
    Date.UTC(
      today.getUTCFullYear() - 16,
      today.getUTCMonth(),
      today.getUTCDate(),
    ),
  );
  return passengers.every(
    (p) => p.dateOfBirth && new Date(p.dateOfBirth + 'T00:00:00Z') <= cutoff,
  );
}
export function planSeats(
  seats: Seat[],
  cabin: string,
  passengers: Passenger[],
  priority: Priority,
  budget: number | null,
): SeatPlan[] {
  const count = passengers.length;
  if (!count) return [];
  const eligible = seats
    .filter(
      (s) =>
        s.cabin === cabin &&
        ['AVAILABLE', 'SELECTED'].includes(s.status) &&
        (!s.features.includes('EXIT_ROW') || canUseExit(passengers)),
    )
    .sort((a, b) => a.row - b.row || a.column - b.column);
  if (eligible.length < count) return [];
  const minPrice = Math.min(...eligible.map((s) => s.price));
  const maxRow = Math.max(...seats.map((s) => s.row));
  const seen = new Set<string>();
  const plans: SeatPlan[] = [];
  const penalty = (s: Seat) => {
    switch (priority) {
      case 'window':
        return s.features.includes('WINDOW') ? 0 : 20;
      case 'aisle':
        return isAisle(s, seats) ? 0 : 20;
      case 'legroom':
        return s.features.includes('EXTRA_LEGROOM') ? 0 : 20;
      case 'facilities':
        return s.features.includes('NEAR_LAVATORY') ||
          s.features.includes('NEAR_GALLEY')
          ? 30
          : Math.max(0, 3 - Math.min(s.row - 1, maxRow - s.row)) * 4;
      case 'price':
        return (s.price - minPrice) / 50;
      default:
        return 0;
    }
  };
  function add(group: Seat[]) {
    if (group.length !== count) return;
    group = [...group].sort((a, b) => a.row - b.row || a.column - b.column);
    const key = group.map((s) => s.number).join('-');
    if (seen.has(key)) return;
    seen.add(key);
    const total = group.reduce((sum, s) => sum + s.price, 0);
    if (budget !== null && total > budget) return;
    const rows = new Set(group.map((s) => s.row));
    const spread = group.at(-1)!.row - group[0].row;
    const across =
      rows.size === 1 &&
      group.some((s, i) => i > 0 && Math.abs(s.x - group[i - 1].x) > 1.1);
    const contiguous =
      rows.size === 1 &&
      group.every(
        (s, i) =>
          i === 0 ||
          (s.column === group[i - 1].column + 1 &&
            Math.abs(s.x - group[i - 1].x) <= 1.1),
      );
    const reasons = [
      count === 1
        ? 'One seat for your traveller'
        : contiguous
          ? 'Adjacent seats in one seating block'
          : rows.size === 1
            ? across
              ? 'Same row, with an aisle or gap between seats'
              : 'Same row; some seats are separated'
            : `Seats across ${rows.size} rows`,
    ];
    const windows = group.filter((s) => s.features.includes('WINDOW')).length;
    const aisles = group.filter((s) => isAisle(s, seats)).length;
    const legs = group.filter((s) =>
      s.features.includes('EXTRA_LEGROOM'),
    ).length;
    if (windows)
      reasons.push(`${windows} window seat${windows > 1 ? 's' : ''}`);
    if (aisles) reasons.push(`${aisles} aisle seat${aisles > 1 ? 's' : ''}`);
    if (legs)
      reasons.push(
        `${legs} extra-legroom seat${legs > 1 ? 's' : ''} · exit-row eligibility applies`,
      );
    if (group.some((s) => s.features.includes('NEAR_LAVATORY')))
      reasons.push('Trade-off: near the lavatory');
    if (group.some((s) => s.features.includes('NEAR_GALLEY')))
      reasons.push('Trade-off: near the galley');
    if (group.some((s) => s.features.includes('LIMITED_RECLINE')))
      reasons.push('Trade-off: limited recline');
    if (
      priority === 'facilities' &&
      !group.some(
        (s) =>
          s.features.includes('NEAR_LAVATORY') ||
          s.features.includes('NEAR_GALLEY'),
      )
    )
      reasons.push('Not marked as near a galley or lavatory');
    const score =
      group.reduce((sum, s) => sum + penalty(s), 0) +
      spread * (priority === 'together' ? 50 : 8) +
      (contiguous ? 0 : count > 1 ? 12 : 0) +
      (across ? 8 : 0);
    plans.push({ key, seats: group, total, reasons, score });
  }
  for (let i = 0; i <= eligible.length - count; i++)
    add(eligible.slice(i, i + count));
  for (const anchor of eligible) {
    const nearest = [...eligible].sort(
      (a, b) =>
        Math.abs(a.row - anchor.row) * 8 +
        Math.abs(a.x - anchor.x) +
        penalty(a) -
        (Math.abs(b.row - anchor.row) * 8 +
          Math.abs(b.x - anchor.x) +
          penalty(b)),
    );
    add(nearest.slice(0, count));
  }
  return plans
    .sort(
      (a, b) =>
        a.score - b.score || a.total - b.total || a.key.localeCompare(b.key),
    )
    .slice(0, 3);
}
