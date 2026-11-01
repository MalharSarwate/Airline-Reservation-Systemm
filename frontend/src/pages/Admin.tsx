import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, message } from '../api/client';
import { useSession } from '../store';
import {
  money,
  tomorrow,
  type Aircraft,
  type Booking,
  type Page,
} from '../types';
export default function Admin() {
  const user = useSession((s) => s.user);
  const enabled = user?.role === 'ADMIN';
  const [notice, setNotice] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [page, setPage] = useState(0);
  const aircraft = useQuery({
    queryKey: ['admin-aircraft'],
    queryFn: () => api<Aircraft[]>('/admin/aircraft'),
    enabled,
  });
  const bookings = useQuery({
    queryKey: ['admin-bookings', page],
    queryFn: () => api<Page<Booking>>('/admin/bookings?page=' + page),
    enabled,
  });
  async function run(action: () => Promise<unknown>) {
    setBusy(true);
    setError('');
    setNotice('');
    try {
      await action();
      setNotice('Changes saved.');
      void aircraft.refetch();
      void bookings.refetch();
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  function createFlight(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const d = new FormData(e.currentTarget);
    void run(() =>
      api('/admin/flights', {
        flightNumber: d.get('flightNumber'),
        aircraftId: Number(d.get('aircraftId')),
        origin: d.get('origin'),
        destination: d.get('destination'),
        departure: new Date(String(d.get('departure')) + 'Z').toISOString(),
        arrival: new Date(String(d.get('arrival')) + 'Z').toISOString(),
        basePrice: Number(d.get('basePrice')),
      }),
    );
  }
  if (!enabled)
    return (
      <section className="empty">
        <h1>Admin access required</h1>
        <p>This area is restricted to administrator accounts.</p>
      </section>
    );
  return (
    <section className="results">
      <p className="eyebrow">OPERATIONS</p>
      <h1 className="small-title">Flight control</h1>
      <p>
        Manage aircraft, publish flights and maintain seat availability. Times
        below are UTC.
      </p>
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {notice && (
        <p className="notice" role="status">
          {notice}
        </p>
      )}
      <div className="admin-grid">
        <form className="panel" onSubmit={createFlight}>
          <h2>Create a flight</h2>
          <label>
            Flight number
            <input
              name="flightNumber"
              required
              defaultValue="AR901"
              maxLength={12}
            />
          </label>
          <label>
            Aircraft
            <select name="aircraftId" required>
              {aircraft.data?.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.type} · {a.layout} · {a.rows} rows
                </option>
              ))}
            </select>
          </label>
          <div className="two-cols">
            <label>
              Origin code
              <input name="origin" required maxLength={3} defaultValue="BOM" />
            </label>
            <label>
              Destination code
              <input
                name="destination"
                required
                maxLength={3}
                defaultValue="DEL"
              />
            </label>
            <label>
              Departure UTC
              <input
                type="datetime-local"
                name="departure"
                required
                defaultValue={tomorrow() + 'T10:00'}
              />
            </label>
            <label>
              Arrival UTC
              <input
                type="datetime-local"
                name="arrival"
                required
                defaultValue={tomorrow() + 'T12:00'}
              />
            </label>
          </div>
          <label>
            Base fare (INR)
            <input
              type="number"
              min="1"
              step="0.01"
              name="basePrice"
              required
              defaultValue="5000"
            />
          </label>
          <button className="button" disabled={busy || !aircraft.data}>
            Publish flight
          </button>
        </form>
        <div>
          <form
            className="panel"
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              void run(() =>
                api('/admin/aircraft', {
                  type: d.get('type'),
                  layout: d.get('layout'),
                  rows: Number(d.get('rows')),
                }),
              );
            }}
          >
            <h2>Add aircraft layout</h2>
            <label>
              Aircraft type
              <input name="type" required maxLength={80} />
            </label>
            <div className="two-cols">
              <label>
                Layout
                <select name="layout">
                  <option>3-3</option>
                  <option>2-4-2</option>
                </select>
              </label>
              <label>
                Rows
                <input
                  type="number"
                  name="rows"
                  defaultValue="20"
                  min="6"
                  max="40"
                  required
                />
              </label>
            </div>
            <button className="button secondary" disabled={busy}>
              Add aircraft
            </button>
          </form>
          <form
            className="panel"
            onSubmit={(e) => {
              e.preventDefault();
              const d = new FormData(e.currentTarget);
              void run(() =>
                api(
                  `/admin/flights/${d.get('flightId')}/price`,
                  { basePrice: Number(d.get('price')) },
                  'PATCH',
                ),
              );
            }}
          >
            <h2>Update fare</h2>
            <p>Flights with active holds or bookings cannot be repriced.</p>
            <div className="two-cols">
              <label>
                Flight ID
                <input type="number" name="flightId" min="1" required />
              </label>
              <label>
                Base fare (INR)
                <input
                  type="number"
                  name="price"
                  min="1"
                  step="0.01"
                  required
                />
              </label>
            </div>
            <button className="button secondary" disabled={busy}>
              Save fare
            </button>
          </form>
        </div>
      </div>
      <div className="admin-grid">
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            const d = new FormData(e.currentTarget);
            void run(() =>
              api(
                `/admin/flights/${d.get('flightId')}/seats/${d.get('seat')}`,
                {
                  blocked: d.get('blocked') === 'yes',
                  surcharge: Number(d.get('surcharge')),
                },
                'PATCH',
              ),
            );
          }}
        >
          <h2>Manage a seat</h2>
          <div className="two-cols">
            <label>
              Flight ID
              <input type="number" name="flightId" min="1" required />
            </label>
            <label>
              Seat number
              <input name="seat" placeholder="12A" required />
            </label>
            <label>
              Availability
              <select name="blocked">
                <option value="no">Available</option>
                <option value="yes">Blocked</option>
              </select>
            </label>
            <label>
              Surcharge (INR)
              <input
                type="number"
                name="surcharge"
                min="0"
                defaultValue="0"
                required
              />
            </label>
          </div>
          <button className="button secondary" disabled={busy}>
            Update seat
          </button>
        </form>
        <form
          className="panel"
          onSubmit={(e) => {
            e.preventDefault();
            const d = new FormData(e.currentTarget);
            void run(() =>
              api(`/admin/flights/${d.get('flightId')}/cancel`, {}),
            );
          }}
        >
          <h2>Withdraw a flight</h2>
          <p>Only flights without bookings or active holds can be withdrawn.</p>
          <label>
            Flight ID
            <input type="number" name="flightId" min="1" required />
          </label>
          <button className="button danger-button" disabled={busy}>
            Withdraw flight
          </button>
        </form>
      </div>
      <section className="panel">
        <h2>All bookings</h2>
        {bookings.isError && <p className="error">{message(bookings.error)}</p>}
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>PNR</th>
                <th>Flight / ID</th>
                <th>Travellers</th>
                <th>Total</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {bookings.data?.content.map((b) => (
                <tr key={b.id}>
                  <td>{b.pnr}</td>
                  <td>
                    {b.flight.flightNumber} / {b.flight.id}
                  </td>
                  <td>{b.passengers.map((p) => p.name).join(', ')}</td>
                  <td>{money(b.total)}</td>
                  <td>{b.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="pagination">
          <button disabled={page === 0} onClick={() => setPage(page - 1)}>
            ← Previous
          </button>
          <span>Page {page + 1}</span>
          <button
            disabled={page + 1 >= (bookings.data?.totalPages ?? 0)}
            onClick={() => setPage(page + 1)}
          >
            Next →
          </button>
        </div>
      </section>
    </section>
  );
}
