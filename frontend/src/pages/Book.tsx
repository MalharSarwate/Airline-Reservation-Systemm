import { lazy, Suspense, useEffect, useState } from 'react';
import {
  Link,
  useLocation,
  useParams,
  useSearchParams,
} from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DEMO_MODE } from '../config';
import { api, message } from '../api/client';
import { useSession } from '../store';
import {
  cabinLabel,
  day,
  money,
  time,
  type Booking,
  type Extra,
  type Fare,
  type Hold,
  type Passenger,
  type Seat,
  type SeatMap,
} from '../types';
import SeatPlanner from '../components/SeatPlanner';
import type { SeatPlan } from '../seatPlanner';
import SeatMap2D from '../components/SeatMap2D';
import CabinBoundary, { supportsWebGL } from '../components/CabinBoundary';
const Cabin3D = lazy(() => import('../components/Cabin3D'));
const blankPassenger = (): Passenger => ({
  name: '',
  dateOfBirth: '',
  seatNumber: '',
  holdId: '',
  baggage: 'BAG_NONE',
  meal: 'MEAL_NONE',
});
export default function Book() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const user = useSession((s) => s.user);
  const location = useLocation();
  const count = Math.max(1, Math.min(6, Number(params.get('passengers')) || 1));
  const cabin = params.get('cabin') || 'ECONOMY';
  const [passengers, setPassengers] = useState<Passenger[]>(() =>
    Array.from({ length: count }, blankPassenger),
  );
  const [previewSeat, setPreviewSeat] = useState('');
  const [highlighted, setHighlighted] = useState<string[]>([]);
  const [passengerView, setPassengerView] = useState(false);
  const [active, setActive] = useState(0);
  const [step, setStep] = useState(0);
  const [view, setView] = useState('3d');
  const [webgl] = useState(supportsWebGL);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [outcome, setOutcome] = useState('APPROVE');
  const [booking, setBooking] = useState<Booking | null>(null);
  const [requestId] = useState(() => crypto.randomUUID());
  const [now, setNow] = useState(Date.now);
  const seatmap = useQuery({
    queryKey: ['seatmap', id, user?.id],
    queryFn: () => api<SeatMap>(`/flights/${id}/seatmap`),
    refetchInterval: 15000,
  });
  const extras = useQuery({
    queryKey: ['extras'],
    queryFn: () => api<Extra[]>('/extras'),
  });
  const fares = useQuery({
    queryKey: ['fares'],
    queryFn: () => api<Fare[]>('/fares'),
  });
  const { refetch } = seatmap;
  useEffect(() => {
    const refresh = () => void refetch();
    const events = DEMO_MODE
      ? null
      : new EventSource(`/api/flights/${id}/events`);
    events?.addEventListener('seats', refresh);
    if (DEMO_MODE) {
      window.addEventListener('aeroline-demo-change', refresh);
      window.addEventListener('storage', refresh);
    }
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    return () => {
      events?.close();
      clearInterval(timer);
      window.removeEventListener('aeroline-demo-change', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, [id, refetch]);
  const map = seatmap.data;
  const f = map?.flight;
  const selected = passengers.map((p) => p.seatNumber).filter(Boolean);
  function update(index: number, values: Partial<Passenger>) {
    setPassengers((ps) =>
      ps.map((p, i) => (i === index ? { ...p, ...values } : p)),
    );
  }
  async function choose(s: Seat) {
    if (!user) {
      setError('Sign in before selecting seats.');
      return;
    }
    setPreviewSeat(s.number);
    setError('');
    const assigned = passengers.findIndex((p) => p.seatNumber === s.number);
    if (assigned >= 0 && live(passengers[assigned])) {
      setActive(assigned);
      return;
    }
    const target = assigned >= 0 ? assigned : active;
    setBusy(true);
    try {
      const old = passengers[target];
      if (old.holdId)
        await api(`/seats/hold/${old.holdId}`, undefined, 'DELETE');
      update(target, { seatNumber: '', holdId: '' });
      const hold = await api<Hold>('/seats/hold', {
        flightId: Number(id),
        seatNumber: s.number,
      });
      update(target, { seatNumber: s.number, holdId: hold.id });
      if (target < count - 1) setActive(target + 1);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
      void refetch();
    }
  }
  async function applyPlan(plan: SeatPlan) {
    if (!user) {
      setError('Sign in before reserving seats.');
      return;
    }
    setBusy(true);
    setError('');
    try {
      const holds = await api<Hold[]>('/seats/hold/group', {
        flightId: Number(id),
        seatNumbers: plan.seats.map((s) => s.number),
        releaseHoldIds: passengers.map((p) => p.holdId).filter(Boolean),
      });
      setPassengers((old) =>
        old.map((p, i) => ({
          ...p,
          seatNumber: holds[i].seatNumber,
          holdId: holds[i].id,
        })),
      );
      setHighlighted([]);
      setPreviewSeat(holds[0].seatNumber);
      setActive(0);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
      void refetch();
    }
  }
  function preview(number: string) {
    setPreviewSeat(number);
    setPassengerView(true);
    setView(webgl ? '3d' : '2d');
  }
  async function remove(index: number) {
    setBusy(true);
    setError('');
    try {
      if (passengers[index].holdId)
        await api(
          `/seats/hold/${passengers[index].holdId}`,
          undefined,
          'DELETE',
        );
      update(index, { seatNumber: '', holdId: '' });
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
      void refetch();
    }
  }
  function live(p: Passenger) {
    const seat = map?.seats.find((s) => s.number === p.seatNumber);
    return (
      seat?.holdId === p.holdId &&
      seat?.status === 'SELECTED' &&
      seat.expiresAt !== null &&
      Date.parse(seat.expiresAt) > now
    );
  }
  const allHeld = passengers.every((p) => p.seatNumber && live(p));
  const allDetails = passengers.every(
    (p) =>
      p.name.trim() &&
      p.dateOfBirth &&
      Date.parse(p.dateOfBirth) < now &&
      Date.parse(p.dateOfBirth) > now - 120 * 365.25 * 86400000,
  );
  const total = passengers.reduce(
    (sum, p) =>
      sum +
      (map?.seats.find((s) => s.number === p.seatNumber)?.price ?? 0) +
      (extras.data?.find((e) => e.code === p.baggage)?.price ?? 0) +
      (extras.data?.find((e) => e.code === p.meal)?.price ?? 0),
    0,
  );
  async function pay() {
    setBusy(true);
    setError('');
    try {
      setBooking(
        await api<Booking>('/bookings', {
          flightId: Number(id),
          requestId,
          paymentOutcome: outcome,
          passengers,
        }),
      );
      void refetch();
    } catch (e) {
      setError(message(e));
      void refetch();
    } finally {
      setBusy(false);
    }
  }
  if (seatmap.isPending)
    return <div className="skeleton">Loading your flight…</div>;
  if (seatmap.isError)
    return (
      <div className="error">
        {message(seatmap.error)}{' '}
        <button onClick={() => void refetch()}>Try again</button>
      </div>
    );
  if (!f || !map) return null;
  if (booking)
    return (
      <section className="confirmation panel">
        <span className="success-mark">✓</span>
        <p className="eyebrow">YOU’RE ALL SET</p>
        <h1>Your journey is booked.</h1>
        <p>
          {f.origin} → {f.destination} · {day(f.departure)}
        </p>
        <div className="pnr">
          <small>BOOKING REFERENCE</small>
          <strong>{booking.pnr}</strong>
        </div>
        <p>
          {booking.passengers
            .map((p) => `${p.name} · ${p.seatNumber}`)
            .join(' / ')}
        </p>
        <p>
          {money(booking.total)} · Mock payment approved. No money was charged.
        </p>
        <Link className="button" to="/bookings">
          View booking & download e-ticket →
        </Link>
        <p className="muted">Demo reservation. Not valid for travel.</p>
      </section>
    );
  return (
    <section className="booking-page">
      <Link className="back-link" to="/flights">
        ← Back to flights
      </Link>
      <div className="section-heading">
        <div>
          <p className="eyebrow">MAKE IT YOUR JOURNEY</p>
          <h1 className="small-title">
            {f.origin} <span className="muted">→</span> {f.destination}
          </h1>
          <p>
            {f.flightNumber} · {f.aircraft.type} · {day(f.departure)} ·{' '}
            {time(f.departure)}–{time(f.arrival)} UTC
          </p>
        </div>
        <span className="tag">{cabinLabel(cabin)}</span>
      </div>
      <nav className="steps" aria-label="Booking steps">
        {['Travellers', 'Choose seats', 'Extras & payment'].map((s, i) => (
          <button
            key={s}
            aria-current={step === i ? 'step' : undefined}
            disabled={
              (i === 1 && !allDetails) || (i === 2 && (!allHeld || !allDetails))
            }
            onClick={() => setStep(i)}
          >
            <span>{i + 1}</span>
            {s}
          </button>
        ))}
      </nav>
      {!user && (
        <div className="notice">
          {DEMO_MODE
            ? 'Enter the demo to try seat reservations.'
            : 'Sign in to reserve your seats.'}{' '}
          <Link
            to={
              '/auth?next=' +
              encodeURIComponent(location.pathname + location.search)
            }
          >
            {DEMO_MODE ? 'Enter demo →' : 'Sign in or create an account →'}
          </Link>
        </div>
      )}
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
      <div className="booking-grid">
        <div>
          {step === 0 && (
            <form
              className="panel"
              onSubmit={(e) => {
                e.preventDefault();
                setStep(1);
              }}
            >
              <h2>Who’s travelling?</h2>
              <p>
                Enter names as they appear on travel documents. Up to six
                travellers per booking.
              </p>
              {passengers.map((p, i) => (
                <fieldset className="passenger-fields" key={i}>
                  <legend>Traveller {i + 1}</legend>
                  <label>
                    Full name
                    <input
                      required
                      maxLength={80}
                      value={p.name}
                      onChange={(e) => update(i, { name: e.target.value })}
                      autoComplete="name"
                    />
                  </label>
                  <label>
                    Date of birth
                    <input
                      type="date"
                      required
                      min={new Date(now - 120 * 365.25 * 86400000)
                        .toISOString()
                        .slice(0, 10)}
                      max={new Date(now - 86400000).toISOString().slice(0, 10)}
                      value={p.dateOfBirth}
                      onChange={(e) =>
                        update(i, { dateOfBirth: e.target.value })
                      }
                    />
                  </label>
                </fieldset>
              ))}
              <button className="button" disabled={!user || !allDetails}>
                Choose your seats →
              </button>
            </form>
          )}
          {step === 1 && (
            <div className="panel seat-panel">
              <div className="section-heading">
                <div>
                  <h2>Find your favourite seat</h2>
                  <p>
                    Selecting for{' '}
                    <strong>
                      {passengers[active].name || `Traveller ${active + 1}`}
                    </strong>
                  </p>
                </div>
                <div className="segmented">
                  <button
                    aria-pressed={view === '2d'}
                    onClick={() => setView('2d')}
                  >
                    2D map
                  </button>
                  <button
                    disabled={!webgl}
                    aria-pressed={view === '3d'}
                    onClick={() => setView('3d')}
                  >
                    3D cabin
                  </button>
                </div>
              </div>
              <SeatPlanner
                seats={map.seats}
                cabin={cabin}
                passengers={passengers}
                busy={busy}
                onApply={(plan) => void applyPlan(plan)}
                onPreview={preview}
                onHighlight={setHighlighted}
              />
              {highlighted.length > 0 && (
                <p className="notice">
                  Previewing {highlighted.join(', ')} · suggestions are not
                  reserved yet.{' '}
                  <button
                    className="text-button"
                    onClick={() => setHighlighted([])}
                  >
                    Clear preview
                  </button>
                </p>
              )}
              {!webgl && (
                <p className="notice">
                  WebGL is unavailable. All seats can be selected in the 2D map.
                </p>
              )}
              <div className="legend">
                <span>
                  <i />
                  Available
                </span>
                <span>
                  <i className="gold" />
                  Selected
                </span>
                <span>
                  <i className="grey" />
                  Unavailable
                </span>
                <span>
                  <i className="blue" />
                  Extra legroom
                </span>
              </div>
              {view === '3d' && webgl ? (
                <CabinBoundary
                  fallback={
                    <>
                      <p className="notice">
                        The 3D view could not load. Use the seat map below.
                      </p>
                      <SeatMap2D
                        seats={map.seats}
                        columns={f.aircraft.columnsCount}
                        selected={selected}
                        highlighted={highlighted}
                        cabin={cabin}
                        busy={busy}
                        onSelect={(s) => void choose(s)}
                      />
                    </>
                  }
                >
                  <Suspense
                    fallback={
                      <div className="skeleton">Preparing your cabin…</div>
                    }
                  >
                    <Cabin3D
                      focusedSeat={previewSeat || passengers[active].seatNumber}
                      onPreview={setPreviewSeat}
                      passengerView={passengerView}
                      seats={map.seats}
                      columns={f.aircraft.columnsCount}
                      selected={selected}
                      highlighted={highlighted}
                      cabin={cabin}
                      busy={busy}
                      onSelect={(s) => void choose(s)}
                    />
                  </Suspense>
                </CabinBoundary>
              ) : (
                <SeatMap2D
                  seats={map.seats}
                  columns={f.aircraft.columnsCount}
                  selected={selected}
                  highlighted={highlighted}
                  cabin={cabin}
                  busy={busy}
                  onSelect={(s) => void choose(s)}
                />
              )}
              <p className="muted">
                Seat prices include the fare. Exit-row travellers must be 16+
                and able to assist in an emergency.
              </p>
              <button
                className="button"
                disabled={!allHeld || busy}
                onClick={() => setStep(2)}
              >
                Continue to extras →
              </button>
            </div>
          )}
          {step === 2 && (
            <div className="panel">
              <h2>The little extras</h2>
              <p>
                Included baggage:{' '}
                {fares.data?.find((x) => x.code === cabin)?.baggage ??
                  'See fare details'}
              </p>
              {passengers.map((p, i) => (
                <fieldset key={i} className="passenger-fields">
                  <legend>
                    {p.name} · {p.seatNumber}
                  </legend>
                  {['BAGGAGE', 'MEAL'].map((kind) => (
                    <label key={kind}>
                      {kind === 'BAGGAGE' ? 'Extra baggage' : 'Meal'}
                      <select
                        value={kind === 'BAGGAGE' ? p.baggage : p.meal}
                        onChange={(e) =>
                          update(
                            i,
                            kind === 'BAGGAGE'
                              ? { baggage: e.target.value }
                              : { meal: e.target.value },
                          )
                        }
                      >
                        {extras.data
                          ?.filter((e) => e.kind === kind)
                          .map((e) => (
                            <option key={e.code} value={e.code}>
                              {e.name} · {money(e.price)}
                            </option>
                          ))}
                      </select>
                    </label>
                  ))}
                </fieldset>
              ))}
              <div className="mock-payment">
                <h3>Mock payment</h3>
                <p>
                  No card details or real payment required. Choose an outcome to
                  test checkout.
                </p>
                <label>
                  Payment result
                  <select
                    value={outcome}
                    onChange={(e) => setOutcome(e.target.value)}
                  >
                    <option value="APPROVE">Approve payment</option>
                    <option value="DECLINE">Decline payment (test)</option>
                  </select>
                </label>
              </div>
              {!allHeld && (
                <p className="error">
                  A hold expired or changed. Return to seat selection.
                </p>
              )}
              <button
                className="button"
                disabled={busy || !allHeld || !allDetails || !extras.data}
                onClick={() => void pay()}
              >
                {busy ? 'Confirming…' : `Confirm & pay ${money(total)} (mock)`}
              </button>
            </div>
          )}
        </div>
        <aside className="panel booking-summary">
          <p className="eyebrow">YOUR JOURNEY</p>
          <h2>
            {f.origin} → {f.destination}
          </h2>
          <p>
            {day(f.departure)} · {count} traveller{count > 1 ? 's' : ''}
          </p>
          <div className="traveller-list">
            {passengers.map((p, i) => {
              const s = map.seats.find((s) => s.number === p.seatNumber);
              const seconds = s?.expiresAt
                ? Math.max(
                    0,
                    Math.floor((Date.parse(s.expiresAt) - now) / 1000),
                  )
                : 0;
              return (
                <div key={i} className={active === i ? 'active' : ''}>
                  <button
                    onClick={() => {
                      setActive(i);
                      if (allDetails) setStep(1);
                    }}
                  >
                    <span>{p.name || `Traveller ${i + 1}`}</span>
                    <b>{p.seatNumber || 'Choose seat'}</b>
                  </button>
                  {p.seatNumber && (
                    <>
                      <small>
                        {live(p)
                          ? `Held ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
                          : 'Hold expired — select again'}
                      </small>
                      <button
                        className="text-button"
                        disabled={busy}
                        onClick={() => void remove(i)}
                      >
                        Release seat
                      </button>
                      {s?.features
                        .filter((x) =>
                          [
                            'NEAR_LAVATORY',
                            'NEAR_GALLEY',
                            'LIMITED_RECLINE',
                            'EXIT_ROW',
                          ].includes(x),
                        )
                        .map((x) => (
                          <small className="warning" key={x}>
                            {x.replaceAll('_', ' ').toLowerCase()}
                          </small>
                        ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          <div className="total">
            <span>Current total</span>
            <strong>{money(total)}</strong>
          </div>
          <small>
            Includes selected fares, seat charges and extras. Unselected seats
            are not included.
          </small>
          <p className="notice">
            {DEMO_MODE
              ? 'Demo holds last 10 minutes. Changes apply only to this browser.'
              : 'Seats are held for 10 minutes. Live availability updates automatically.'}
          </p>
        </aside>
      </div>
    </section>
  );
}
