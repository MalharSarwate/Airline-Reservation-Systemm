import type {
  Aircraft,
  Booking,
  Flight,
  Hold,
  Passenger,
  Seat,
  Tokens,
} from '../types';
import { useSession } from '../store';
import {
  airports,
  aircraft,
  extras,
  fares,
  seedFlights,
  seedSeats,
} from './data';
import { demoTicket } from './ticket';
const STORAGE = 'aeroline-pages-demo-v1';
interface DemoHold extends Hold {
  flightId: number;
}
interface State {
  version: 1;
  bookings: Booking[];
  holds: DemoHold[];
  aircraft: Aircraft[];
  flights: Flight[];
  overrides: Record<string, { blocked: boolean; surcharge: number }>;
  requests: Record<string, number>;
}
const empty = (): State => ({
  version: 1,
  bookings: [],
  holds: [],
  aircraft: [],
  flights: [],
  overrides: {},
  requests: {},
});
let memory = empty();
function read(): State {
  try {
    const raw = localStorage.getItem(STORAGE);
    if (raw) {
      const value = JSON.parse(raw) as State;
      if (
        value.version === 1 &&
        Array.isArray(value.bookings) &&
        Array.isArray(value.holds) &&
        Array.isArray(value.flights) &&
        Array.isArray(value.aircraft) &&
        value.overrides &&
        value.requests
      )
        memory = value;
    }
  } catch {
    /* Private browsing can disable storage; in-memory demo still works. */
  }
  return structuredClone(memory);
}
function save(state: State) {
  memory = state;
  try {
    localStorage.setItem(STORAGE, JSON.stringify(state));
  } catch {
    /* Session-only fallback. */
  }
  window.dispatchEvent(new Event('aeroline-demo-change'));
}
export function resetDemo() {
  try {
    localStorage.removeItem(STORAGE);
  } catch {
    /* Session-only fallback. */
  }
  memory = empty();
  useSession.getState().clear();
  window.dispatchEvent(new Event('aeroline-demo-change'));
}
export function enterDemo(name = 'Demo Traveller', admin = false): Tokens {
  return {
    accessToken: 'browser-demo-not-a-jwt',
    refreshToken: 'browser-demo-not-a-refresh-token',
    user: {
      id: 1,
      name: name.trim().slice(0, 80) || 'Demo Traveller',
      email: 'traveller@example.test',
      role: admin ? 'ADMIN' : 'USER',
    },
  };
}
class Failure extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}
function fail(status: number, message: string): never {
  throw new Failure(status, message);
}
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
function allFlights(state: State) {
  const overrides = new Map(state.flights.map((f) => [f.id, f]));
  return [
    ...seedFlights().filter((f) => !overrides.has(f.id)),
    ...state.flights,
  ];
}
function flight(state: State, id: number) {
  return (
    allFlights(state).find((f) => f.id === id) ??
    fail(404, 'Demo flight not found. Return to flight search.')
  );
}
function seatmap(state: State, f: Flight): Seat[] {
  const now = Date.now();
  return seedSeats(f).map((s) => {
    const override = state.overrides[`${f.id}:${s.number}`];
    if (override) {
      const base =
        f.basePrice * fares.find((x) => x.code === s.cabin)!.multiplier;
      s = {
        ...s,
        price: Math.round((base + override.surcharge) * 100) / 100,
        status: override.blocked
          ? 'BLOCKED'
          : s.status === 'BLOCKED'
            ? 'AVAILABLE'
            : s.status,
      };
    }
    const booked = state.bookings.some(
      (b) =>
        b.flight.id === f.id &&
        b.status === 'CONFIRMED' &&
        b.passengers.some((p) => p.seatNumber === s.number),
    );
    const hold = state.holds.find(
      (h) =>
        h.flightId === f.id &&
        h.seatNumber === s.number &&
        Date.parse(h.expiresAt) > now,
    );
    return {
      ...s,
      status: booked ? 'OCCUPIED' : hold ? 'SELECTED' : s.status,
      holdId: hold?.id ?? null,
      expiresAt: hold?.expiresAt ?? null,
    };
  });
}
function hold(state: State, flightId: number, number: string): Hold {
  const f = flight(state, flightId);
  if (f.status !== 'SCHEDULED' || Date.parse(f.departure) <= Date.now())
    fail(409, 'This flight is no longer open for booking.');
  const s =
    seatmap(state, f).find((x) => x.number === number) ??
    fail(404, 'Seat not found.');
  if (!['AVAILABLE', 'SELECTED'].includes(s.status))
    fail(409, 'This seat is unavailable. Please choose another.');
  const current = state.holds.find((h) => h.id === s.holdId);
  if (current) return current;
  if (state.holds.filter((h) => h.flightId === flightId).length >= 6)
    fail(400, 'At most six seats can be held per flight.');
  const h = {
    id: crypto.randomUUID(),
    flightId,
    seatNumber: number,
    expiresAt: new Date(Date.now() + 600000).toISOString(),
  };
  state.holds.push(h);
  return h;
}
function number(value: unknown) {
  const n = Number(value);
  if (!Number.isFinite(n)) fail(400, 'Check the supplied numeric values.');
  return n;
}
function page<T>(content: T[], index: number, size: number) {
  if (!Number.isInteger(index) || index < 0) fail(400, 'Invalid page.');
  return {
    content: content.slice(index * size, (index + 1) * size),
    number: index,
    totalPages: Math.ceil(content.length / size),
    totalElements: content.length,
  };
}
function requireUser() {
  return (
    useSession.getState().user ?? fail(401, 'Enter the demo to reserve seats.')
  );
}
export async function demoRequest(
  path: string,
  init: RequestInit = {},
): Promise<Response> {
  try {
    const url = new URL(path, 'https://demo.invalid');
    const route = url.pathname;
    const q = url.searchParams;
    const method = init.method ?? 'GET';
    const body = (
      typeof init.body === 'string' ? JSON.parse(init.body) : {}
    ) as Record<string, unknown>;
    const state = read();
    state.holds = state.holds.filter(
      (h) => Date.parse(h.expiresAt) > Date.now(),
    );
    if (route === '/airports') return json(airports);
    if (route === '/fares') return json(fares);
    if (route === '/extras') return json(extras);
    if (route === '/auth/logout') return json({});
    if (route === '/users/me') return json(requireUser());
    if (route.startsWith('/auth/'))
      return json(enterDemo(String(body.name ?? 'Demo Traveller')));
    if (route.startsWith('/admin/')) {
      if (requireUser().role !== 'ADMIN')
        fail(403, 'Enter the admin demo to explore this screen.');
      if (route === '/admin/aircraft' && method === 'GET')
        return json([...aircraft, ...state.aircraft]);
      if (route === '/admin/aircraft' && method === 'POST') {
        const rows = number(body.rows);
        if (
          !Number.isInteger(rows) ||
          rows < 6 ||
          rows > 40 ||
          !['3-3', '2-4-2'].includes(String(body.layout)) ||
          !String(body.type ?? '').trim()
        )
          fail(400, 'Check aircraft type, layout and rows.');
        const a: Aircraft = {
          id: Date.now(),
          type: String(body.type).slice(0, 80),
          layout: String(body.layout),
          rows,
          columnsCount: body.layout === '3-3' ? 6 : 8,
        };
        state.aircraft.push(a);
        save(state);
        return json(a);
      }
      if (route === '/admin/bookings')
        return json(
          page([...state.bookings].reverse(), number(q.get('page') ?? 0), 20),
        );
      if (route === '/admin/flights' && method === 'POST') {
        const a =
          [...aircraft, ...state.aircraft].find(
            (x) => x.id === number(body.aircraftId),
          ) ?? fail(400, 'Choose an aircraft.');
        const origin = String(body.origin),
          destination = String(body.destination);
        if (
          origin === destination ||
          !airports.some((a) => a.code === origin) ||
          !airports.some((a) => a.code === destination) ||
          !(Date.parse(String(body.departure)) > Date.now()) ||
          !(
            Date.parse(String(body.arrival)) >
            Date.parse(String(body.departure))
          ) ||
          number(body.basePrice) < 1
        )
          fail(400, 'Check the route, future schedule and fare.');
        const f: Flight = {
          id: Date.now(),
          flightNumber: String(body.flightNumber ?? 'DEMO').slice(0, 12),
          origin,
          destination,
          departure: String(body.departure),
          arrival: String(body.arrival),
          basePrice: number(body.basePrice),
          status: 'SCHEDULED',
          aircraft: a,
          airline: 'Aeroline',
        };
        state.flights.push(f);
        save(state);
        return json(f);
      }
      const match = route.match(
        /^\/admin\/flights\/(\d+)\/(price|cancel|seats\/([0-9]+[A-H]))$/,
      );
      if (match) {
        const f = flight(state, Number(match[1]));
        const kind = match[2];
        const seats = seatmap(state, f);
        if (kind === 'price' || kind === 'cancel') {
          if (
            seats.some((s) => s.status === 'SELECTED') ||
            state.bookings.some(
              (b) => b.flight.id === f.id && b.status === 'CONFIRMED',
            )
          )
            fail(409, 'Flight has bookings or active holds.');
          if (kind === 'price') {
            const price = number(body.basePrice);
            if (price < 1) fail(400, 'Price must be positive.');
            f.basePrice = price;
          } else f.status = 'CANCELLED';
          state.flights = state.flights.filter((x) => x.id !== f.id);
          state.flights.push(f);
          save(state);
          return json(f);
        }
        const s =
          seats.find((x) => x.number === match[3]) ??
          fail(404, 'Seat not found.');
        if (['SELECTED', 'OCCUPIED'].includes(s.status))
          fail(409, 'Seat has an active reservation.');
        const surcharge = number(body.surcharge);
        if (surcharge < 0) fail(400, 'Surcharge must be positive or zero.');
        state.overrides[`${f.id}:${s.number}`] = {
          blocked: body.blocked === true,
          surcharge,
        };
        save(state);
        return json({});
      }
    }
    if (route === '/flights/search') {
      const count = number(q.get('passengers') ?? 1);
      const cabin = q.get('cabin') ?? 'ECONOMY';
      if (count < 1 || count > 6 || !fares.some((f) => f.code === cabin))
        fail(400, 'Check travellers and cabin.');
      const date = q.get('date');
      if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date))
        fail(400, 'Choose a valid departure date.');
      let flights = allFlights(state).filter(
        (f) =>
          f.status === 'SCHEDULED' &&
          Date.parse(f.departure) > Date.now() &&
          f.departure.startsWith(date) &&
          (!q.get('origin') || f.origin === q.get('origin')) &&
          (!q.get('destination') || f.destination === q.get('destination')),
      );
      flights = flights.filter(
        (f) =>
          seatmap(state, f).filter(
            (s) => s.cabin === cabin && s.status === 'AVAILABLE',
          ).length >= count,
      );
      const sort = q.get('sort') ?? 'price';
      flights.sort((a, b) =>
        sort === 'duration'
          ? Date.parse(a.arrival) -
            Date.parse(a.departure) -
            (Date.parse(b.arrival) - Date.parse(b.departure))
          : sort === 'departure'
            ? Date.parse(a.departure) - Date.parse(b.departure)
            : a.basePrice - b.basePrice,
      );
      return json(page(flights, number(q.get('page') ?? 0), 12));
    }
    const fm = route.match(/^\/flights\/(\d+)(\/seatmap)?$/);
    if (fm) {
      const f = flight(state, Number(fm[1]));
      return json(fm[2] ? { flight: f, seats: seatmap(state, f) } : f);
    }
    if (route.startsWith('/seats/hold')) {
      requireUser();
      if (method === 'DELETE') {
        const id = route.split('/').at(-1);
        state.holds = state.holds.filter((h) => h.id !== id);
        save(state);
        return json({});
      }
      if (route === '/seats/hold/group') {
        const flightId = number(body.flightId);
        const numbers = body.seatNumbers;
        if (
          !Array.isArray(numbers) ||
          numbers.length < 1 ||
          numbers.length > 6 ||
          numbers.some((n) => typeof n !== 'string') ||
          new Set(numbers).size !== numbers.length ||
          !Array.isArray(body.releaseHoldIds)
        )
          fail(400, 'Choose a distinct seat for each traveller.');
        const released = body.releaseHoldIds as string[];
        state.holds = state.holds.filter(
          (h) => !released.includes(h.id) || h.flightId !== flightId,
        );
        const holds = (numbers as string[]).map((n) =>
          hold(state, flightId, n),
        );
        save(state);
        return json(holds);
      }
      const h = hold(state, number(body.flightId), String(body.seatNumber));
      save(state);
      return json(h);
    }
    if (route.startsWith('/bookings')) {
      requireUser();
      if (route === '/bookings/me')
        return json(
          page([...state.bookings].reverse(), number(q.get('page') ?? 0), 10),
        );
      const bm = route.match(/^\/bookings\/(\d+)\/(cancel|ticket)$/);
      if (bm) {
        const booking =
          state.bookings.find((b) => b.id === Number(bm[1])) ??
          fail(404, 'Booking not found in this browser.');
        if (bm[2] === 'ticket') return demoTicket(booking);
        if (Date.parse(booking.flight.departure) <= Date.now())
          fail(400, 'Departed flights cannot be cancelled.');
        booking.status = 'CANCELLED';
        save(state);
        return json(booking);
      }
      if (route === '/bookings' && method === 'POST') {
        const key = String(body.requestId ?? '');
        if (key.length < 20) fail(400, 'Invalid request.');
        const prior = state.requests[key];
        if (prior) {
          const b = state.bookings.find((b) => b.id === prior);
          if (b) return json(b);
        }
        const f = flight(state, number(body.flightId));
        if (f.status !== 'SCHEDULED' || Date.parse(f.departure) <= Date.now())
          fail(409, 'Flight is no longer bookable.');
        const ps = body.passengers;
        if (!Array.isArray(ps) || ps.length < 1 || ps.length > 6)
          fail(400, 'Enter one to six travellers.');
        const passengers = ps as Passenger[];
        if (
          new Set(passengers.map((p) => p.seatNumber)).size !==
          passengers.length
        )
          fail(400, 'Each traveller needs a distinct seat.');
        let total = 0;
        const cutoff = new Date();
        cutoff.setUTCFullYear(cutoff.getUTCFullYear() - 16);
        for (const p of passengers) {
          const s = seatmap(state, f).find((s) => s.number === p.seatNumber);
          if (
            !s ||
            s.status !== 'SELECTED' ||
            s.holdId !== p.holdId ||
            !state.holds.some((h) => h.id === p.holdId && h.flightId === f.id)
          )
            fail(409, 'A hold expired or changed. Select seats again.');
          if (
            !p.name?.trim() ||
            p.name.length > 80 ||
            !Number.isFinite(Date.parse(p.dateOfBirth)) ||
            Date.parse(p.dateOfBirth) >= Date.now() ||
            Date.parse(p.dateOfBirth) < Date.now() - 120 * 365.25 * 86400000
          )
            fail(400, 'Check traveller names and dates of birth.');
          if (
            s.features.includes('EXIT_ROW') &&
            Date.parse(p.dateOfBirth) > cutoff.getTime()
          )
            fail(400, 'Exit-row travellers must be at least 16.');
          const baggage = extras.find(
              (x) => x.code === p.baggage && x.kind === 'BAGGAGE',
            ),
            meal = extras.find((x) => x.code === p.meal && x.kind === 'MEAL');
          if (!baggage || !meal) fail(400, 'Choose valid extras.');
          total += s.price + baggage.price + meal.price;
        }
        if (body.paymentOutcome === 'DECLINE')
          fail(
            402,
            'Mock payment declined. Your holds remain available until expiry.',
          );
        if (body.paymentOutcome !== 'APPROVE')
          fail(400, 'Choose a mock payment outcome.');
        const b: Booking = {
          id: Date.now(),
          pnr:
            'DM' +
            crypto.randomUUID().replaceAll('-', '').slice(0, 6).toUpperCase(),
          status: 'CONFIRMED',
          total,
          createdAt: new Date().toISOString(),
          flight: f,
          passengers,
        };
        state.bookings.push(b);
        state.requests[key] = b.id;
        state.holds = state.holds.filter(
          (h) => !passengers.some((p) => p.holdId === h.id),
        );
        save(state);
        return json(b);
      }
    }
    return json({ message: 'This demo action is unavailable.' }, 404);
  } catch (error) {
    if (error instanceof Failure)
      return json({ message: error.message }, error.status);
    return json(
      {
        message:
          'Unable to complete this demo action. Please reset the demo and try again.',
      },
      400,
    );
  }
}
