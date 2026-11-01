import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, request, message } from '../api/client';
import { useSession } from '../store';
import { money, day, time, type Booking, type Page } from '../types';
export default function Bookings() {
  const user = useSession((s) => s.user);
  const [page, setPage] = useState(0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<number | null>(null);
  const [confirm, setConfirm] = useState<number | null>(null);
  const data = useQuery({
    queryKey: ['bookings', user?.id, page],
    queryFn: () => api<Page<Booking>>('/bookings/me?page=' + page),
    enabled: !!user,
  });
  async function cancel(id: number) {
    setBusy(id);
    setError('');
    try {
      await api(`/bookings/${id}/cancel`, {});
      setConfirm(null);
      await data.refetch();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(null);
    }
  }
  async function ticket(b: Booking) {
    setBusy(b.id);
    setError('');
    try {
      const response = await request(`/bookings/${b.id}/ticket`);
      const url = URL.createObjectURL(await response.blob());
      const a = document.createElement('a');
      a.href = url;
      a.download = `ticket-${b.pnr}.pdf`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(null);
    }
  }
  if (!user)
    return (
      <section className="empty">
        <h1>Your trips, together.</h1>
        <p>Sign in to see your bookings.</p>
        <Link className="button" to="/auth">
          Sign in →
        </Link>
      </section>
    );
  return (
    <section className="results trips-page">
      <p className="eyebrow">YOUR TRAVEL NOTEBOOK</p>
      <div className="trips-heading">
        <h1 className="small-title">My bookings</h1>
        <Link className="button secondary" to="/flights">
          Plan another journey ↗
        </Link>
      </div>
      <p>Your next adventure, all in one place.</p>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {data.isPending && <div className="skeleton">Loading bookings…</div>}
      {data.isError && (
        <p className="error">
          {message(data.error)}{' '}
          <button onClick={() => void data.refetch()}>Try again</button>
        </p>
      )}
      {data.data?.content.length === 0 && (
        <div className="empty">
          <h2>Your next journey is waiting.</h2>
          <Link className="button" to="/flights">
            Find a flight →
          </Link>
        </div>
      )}
      {data.data?.content.map((b) => (
        <article className="panel trip" key={b.id}>
          <div className="section-heading">
            <div>
              <p className="eyebrow">PNR {b.pnr}</p>
              <h2>
                {b.flight.origin} → {b.flight.destination}
              </h2>
              <p>
                {b.flight.flightNumber} · {day(b.flight.departure)} ·{' '}
                {time(b.flight.departure)} UTC
              </p>
            </div>
            <span
              className={`tag ${b.status === 'CANCELLED' ? 'cancelled' : ''}`}
            >
              {b.status}
            </span>
          </div>
          <div className="trip-passengers">
            {b.passengers.map((p, i) => (
              <div key={i}>
                <strong>{p.name}</strong>
                <span>Seat {p.seatNumber}</span>
                <small>
                  {p.baggage.replaceAll('_', ' ')} ·{' '}
                  {p.meal.replaceAll('_', ' ')}
                </small>
              </div>
            ))}
          </div>
          <div className="trip-actions">
            <strong>{money(b.total)}</strong>
            <button
              className="button secondary"
              disabled={busy === b.id}
              onClick={() => void ticket(b)}
            >
              Download e-ticket ↓
            </button>
            {b.status === 'CONFIRMED' && (
              <button
                className="text-button danger"
                onClick={() => setConfirm(b.id)}
              >
                Cancel booking
              </button>
            )}
          </div>
          {confirm === b.id && (
            <div className="notice">
              <p>
                Cancel booking {b.pnr}? All seats will be released and the mock
                payment marked refunded.
              </p>
              <button
                disabled={busy === b.id}
                className="button danger-button"
                onClick={() => void cancel(b.id)}
              >
                Yes, cancel booking
              </button>{' '}
              <button className="text-button" onClick={() => setConfirm(null)}>
                Keep booking
              </button>
            </div>
          )}
        </article>
      ))}
      {(data.data?.totalPages ?? 0) > 1 && (
        <div className="pagination">
          <button disabled={page === 0} onClick={() => setPage(page - 1)}>
            ← Previous
          </button>
          <span>Page {page + 1}</span>
          <button
            disabled={page + 1 >= (data.data?.totalPages ?? 0)}
            onClick={() => setPage(page + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </section>
  );
}
