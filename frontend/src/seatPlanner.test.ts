import { expect, it } from 'vitest';
import { planSeats, canUseExit } from './seatPlanner';
import type { Passenger, Seat } from './types';
const adult: Passenger = {
  name: 'Alex',
  dateOfBirth: '1990-01-01',
  seatNumber: '',
  holdId: '',
  baggage: 'BAG_NONE',
  meal: 'MEAL_NONE',
};
const seats: Seat[] = Array.from({ length: 12 }, (_, i) => ({
  id: i + 1,
  number: `${6 + Math.floor(i / 6)}${String.fromCharCode(65 + (i % 6))}`,
  row: 6 + Math.floor(i / 6),
  column: i % 6,
  cabin: 'ECONOMY',
  features: i % 6 === 0 || i % 6 === 5 ? ['WINDOW'] : [],
  price: 5000 + (i % 6 === 0 || i % 6 === 5 ? 250 : 0),
  status: 'AVAILABLE',
  holdId: null,
  expiresAt: null,
  x: [-2.3, -1.5, -0.7, 0.7, 1.5, 2.3][i % 6],
  y: 0,
  z: Math.floor(i / 6) * 1.3,
}));
it('ranks adjacent seats together and never repeats a seat', () => {
  const plans = planSeats(seats, 'ECONOMY', [adult, adult], 'together', null);
  expect(plans).toHaveLength(3);
  expect(plans[0].reasons[0]).toContain('Adjacent');
  expect(new Set(plans[0].seats.map((s) => s.id)).size).toBe(2);
});
it('excludes unavailable inventory, other cabins, and unaffordable plans', () => {
  const data = seats.map((s) => ({ ...s, status: 'OCCUPIED' as const }));
  expect(planSeats(data, 'ECONOMY', [adult], 'price', null)).toEqual([]);
  expect(planSeats(seats, 'BUSINESS', [adult], 'price', null)).toEqual([]);
  expect(planSeats(seats, 'ECONOMY', [adult, adult], 'price', 9000)).toEqual(
    [],
  );
});
it('avoids exit rows for minors and respects the exact age boundary', () => {
  const child = { ...adult, dateOfBirth: '2020-01-01' };
  const exit = seats.map((s) => ({
    ...s,
    features: [...s.features, 'EXIT_ROW', 'EXTRA_LEGROOM'],
  }));
  expect(planSeats(exit, 'ECONOMY', [adult, child], 'legroom', null)).toEqual(
    [],
  );
  expect(
    canUseExit(
      [{ ...adult, dateOfBirth: '2010-11-02' }],
      new Date('2026-11-01T12:00:00Z'),
    ),
  ).toBe(false);
  expect(
    canUseExit(
      [{ ...adult, dateOfBirth: '2010-11-01' }],
      new Date('2026-11-01T12:00:00Z'),
    ),
  ).toBe(true);
});
it('window preference finds a window and reports its total accurately', () => {
  const plan = planSeats(seats, 'ECONOMY', [adult], 'window', null)[0];
  expect(plan.seats[0].features).toContain('WINDOW');
  expect(plan.total).toBe(5250);
});
