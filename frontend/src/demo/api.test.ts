import { beforeEach, expect, it } from 'vitest';
import { demoRequest, enterDemo, resetDemo } from './api';
import { useSession } from '../store';
import {
  tomorrow,
  type Flight,
  type Page,
  type Hold,
  type Booking,
} from '../types';
async function get<T>(
  path: string,
  body?: unknown,
  method = body === undefined ? 'GET' : 'POST',
): Promise<T> {
  const response = await demoRequest(path, {
    method,
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
  expect(response.ok).toBe(true);
  return response.json() as Promise<T>;
}
async function flight() {
  const page = await get<Page<Flight>>(
    '/flights/search?' +
      new URLSearchParams({
        origin: 'BOM',
        destination: 'DEL',
        date: tomorrow(),
        cabin: 'ECONOMY',
        passengers: '2',
      }),
  );
  expect(page.content.length).toBe(4);
  return page.content[0];
}
beforeEach(() => {
  resetDemo();
  useSession.getState().set(enterDemo('Test Traveller'));
});
it('serves dated flights and both cabin layouts without a server', async () => {
  expect((await flight()).aircraft.layout).toBe('3-3');
  const page = await get<Page<Flight>>(
    '/flights/search?' +
      new URLSearchParams({
        origin: 'BOM',
        destination: 'DXB',
        date: tomorrow(),
      }),
  );
  expect(page.content[0].aircraft.layout).toBe('2-4-2');
});
it('rolls back a whole group attempt and preserves previous holds on conflict', async () => {
  const f = await flight();
  const original = await get<Hold>('/seats/hold', {
    flightId: f.id,
    seatNumber: '6A',
  });
  const response = await demoRequest('/seats/hold/group', {
    method: 'POST',
    body: JSON.stringify({
      flightId: f.id,
      seatNumbers: ['6B', '8B'],
      releaseHoldIds: [original.id],
    }),
  });
  expect(response.status).toBe(409);
  const map = await get<{ seats: { number: string; holdId: string | null }[] }>(
    `/flights/${f.id}/seatmap`,
  );
  expect(map.seats.find((s) => s.number === '6A')?.holdId).toBe(original.id);
  expect(map.seats.find((s) => s.number === '6B')?.holdId).toBeNull();
});
it('confirms once, persists bookings, downloads PDF, and releases seats on cancellation', async () => {
  const f = await flight();
  const hold = await get<Hold>('/seats/hold', {
    flightId: f.id,
    seatNumber: '6A',
  });
  const body = {
    flightId: f.id,
    requestId: crypto.randomUUID(),
    paymentOutcome: 'APPROVE',
    passengers: [
      {
        name: 'Example Traveller',
        dateOfBirth: '1990-01-01',
        seatNumber: '6A',
        holdId: hold.id,
        baggage: 'BAG_10',
        meal: 'MEAL_VEG',
      },
    ],
  };
  const booking = await get<Booking>('/bookings', body);
  expect(booking.total).toBe(f.basePrice + 250 + 1500 + 450);
  expect((await get<Booking>('/bookings', body)).id).toBe(booking.id);
  expect((await get<Page<Booking>>('/bookings/me')).content).toHaveLength(1);
  const pdf = await demoRequest(`/bookings/${booking.id}/ticket`);
  expect(pdf.headers.get('content-type')).toBe('application/pdf');
  expect((await pdf.text()).startsWith('%PDF-1.4')).toBe(true);
  await get(`/bookings/${booking.id}/cancel`, {});
  expect(
    (await get<Hold>('/seats/hold', { flightId: f.id, seatNumber: '6A' }))
      .seatNumber,
  ).toBe('6A');
});
it('rejects payment decline and expired holds without creating a booking', async () => {
  const f = await flight();
  const hold = await get<Hold>('/seats/hold', {
    flightId: f.id,
    seatNumber: '6B',
  });
  const body = {
    flightId: f.id,
    requestId: crypto.randomUUID(),
    paymentOutcome: 'DECLINE',
    passengers: [
      {
        name: 'Example',
        dateOfBirth: '1990-01-01',
        seatNumber: '6B',
        holdId: hold.id,
        baggage: 'BAG_NONE',
        meal: 'MEAL_NONE',
      },
    ],
  };
  expect(
    (
      await demoRequest('/bookings', {
        method: 'POST',
        body: JSON.stringify(body),
      })
    ).status,
  ).toBe(402);
  const raw = JSON.parse(localStorage.getItem('aeroline-pages-demo-v1')!);
  raw.holds[0].expiresAt = '2000-01-01T00:00:00Z';
  localStorage.setItem('aeroline-pages-demo-v1', JSON.stringify(raw));
  expect(
    (
      await demoRequest('/bookings', {
        method: 'POST',
        body: JSON.stringify({ ...body, paymentOutcome: 'APPROVE' }),
      })
    ).status,
  ).toBe(409);
  expect((await get<Page<Booking>>('/bookings/me')).content).toHaveLength(0);
});
it('simulates admin changes only in browser storage and reset restores seed data', async () => {
  expect((await demoRequest('/admin/aircraft')).status).toBe(403);
  useSession.getState().set(enterDemo('Admin', true));
  const f = await flight();
  await get(`/admin/flights/${f.id}/price`, { basePrice: 6000 }, 'PATCH');
  expect((await get<Flight>(`/flights/${f.id}`)).basePrice).toBe(6000);
  resetDemo();
  useSession.getState().set(enterDemo());
  expect((await get<Flight>(`/flights/${f.id}`)).basePrice).toBe(f.basePrice);
});
