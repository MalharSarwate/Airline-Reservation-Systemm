import { useState, type FormEvent } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, message } from '../api/client';
import {
  type Airport,
  type Cabin,
  type Fare,
  type Flight,
  type Page,
  tomorrow,
} from '../types';
import FlightCard from '../components/FlightCard';
export default function Search() {
  const [params] = useSearchParams();
  const [form, setForm] = useState({
    origin: params.get('origin') || 'BOM',
    destination: params.get('destination') || 'DEL',
    date: params.get('date') || tomorrow(),
    passengers: '1',
    cabin: 'ECONOMY' as Cabin,
  });
  const [search, setSearch] = useState(form);
  const [sort, setSort] = useState('price');
  const [page, setPage] = useState(0);
  const airports = useQuery({
    queryKey: ['airports'],
    queryFn: () => api<Airport[]>('/airports'),
  });
  const fares = useQuery({
    queryKey: ['fares'],
    queryFn: () => api<Fare[]>('/fares'),
  });
  const results = useQuery({
    queryKey: ['flights', search, sort, page],
    queryFn: () =>
      api<Page<Flight>>(
        '/flights/search?' +
          new URLSearchParams({ ...search, sort, page: String(page) }),
      ),
  });
  function submit(e: FormEvent) {
    e.preventDefault();
    setPage(0);
    setSearch({ ...form });
  }
  return (
    <>
      <section className="search-hero">
        <div>
          <p className="eyebrow">01 / EXPLORE YOUR NEXT CHAPTER</p>
          <h1>
            The world is waiting.
            <br />
            <em>Find your way there.</em>
          </h1>
          <p>
            Find your flight. Step inside the cabin.
            <br />
            Choose the view before you take off.
          </p>
        </div>
        <div className="search-flight-art" aria-hidden="true">
          <div className="radar-orbit" />
          <div className="radar-orbit second" />
          <span className="radar-plane">✈</span>
          <div className="art-route">
            <span>
              {search.origin}
              <small>DEPARTURE</small>
            </span>
            <i>········· ✈ ·········</i>
            <span>
              {search.destination}
              <small>DESTINATION</small>
            </span>
          </div>
          <span className="radar-caption">A BETTER VIEW STARTS HERE</span>
        </div>
      </section>
      <form className="search-form" onSubmit={submit}>
        <label>
          From
          <select
            value={form.origin}
            onChange={(e) => setForm({ ...form, origin: e.target.value })}
          >
            {(airports.data ?? [{ code: 'BOM', city: 'Mumbai' }]).map((a) => (
              <option key={a.code} value={a.code}>
                {a.city} ({a.code})
              </option>
            ))}
          </select>
        </label>
        <button
          type="button"
          className="swap"
          aria-label="Swap origin and destination"
          onClick={() =>
            setForm({
              ...form,
              origin: form.destination,
              destination: form.origin,
            })
          }
        >
          ⇄
        </button>
        <label>
          To
          <select
            value={form.destination}
            onChange={(e) => setForm({ ...form, destination: e.target.value })}
          >
            {(airports.data ?? [{ code: 'DEL', city: 'Delhi' }]).map((a) => (
              <option key={a.code} value={a.code}>
                {a.city} ({a.code})
              </option>
            ))}
          </select>
        </label>
        <label>
          Departure
          <input
            type="date"
            required
            min={new Date().toISOString().slice(0, 10)}
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
          />
        </label>
        <label>
          Travellers
          <select
            value={form.passengers}
            onChange={(e) => setForm({ ...form, passengers: e.target.value })}
          >
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <option key={n} value={n}>
                {n} traveller{n > 1 ? 's' : ''}
              </option>
            ))}
          </select>
        </label>
        <label>
          Cabin
          <select
            value={form.cabin}
            onChange={(e) =>
              setForm({ ...form, cabin: e.target.value as Cabin })
            }
          >
            <option value="ECONOMY">Economy</option>
            <option value="PREMIUM">Premium economy</option>
            <option value="BUSINESS">Business</option>
            <option value="FIRST">First</option>
          </select>
        </label>
        <button className="button" disabled={form.origin === form.destination}>
          Search flights ↗
        </button>
      </form>
      <section className="results">
        <p className="notice">
          Demo booking inventory — synthetic schedules, fares and seat layouts.
        </p>
        <div className="section-heading">
          <div>
            <p className="eyebrow">FIND YOUR WAY</p>
            <h2>
              {search.origin} <span className="muted">to</span>{' '}
              {search.destination}
            </h2>
            <p>
              {results.data?.totalElements ?? '…'} flights · Times shown in UTC
            </p>
          </div>
          <label className="sort-label">
            Sort by
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(0);
              }}
            >
              <option value="price">Lowest price</option>
              <option value="duration">Shortest duration</option>
              <option value="departure">Departure time</option>
            </select>
          </label>
        </div>
        {results.isPending && (
          <div className="skeleton" role="status">
            Finding your flights…
          </div>
        )}
        {results.isError && (
          <div className="error" role="alert">
            {message(results.error)}{' '}
            <button onClick={() => void results.refetch()}>Try again</button>
          </div>
        )}
        {results.data?.content.map((f) => (
          <FlightCard
            key={f.id}
            flight={f}
            passengers={Number(search.passengers)}
            cabin={search.cabin}
            multiplier={
              fares.data?.find((x) => x.code === search.cabin)?.multiplier ?? 1
            }
          />
        ))}
        {results.data?.content.length === 0 && (
          <div className="empty">
            <h3>No flights match this search</h3>
            <p>
              Try another date, cabin, or route. Demo routes include
              Mumbai–Delhi, Mumbai–Bengaluru, Bengaluru–Delhi, Mumbai–Dubai and
              Delhi–Singapore.
            </p>
          </div>
        )}
        {(results.data?.totalPages ?? 0) > 1 && (
          <div className="pagination">
            <button disabled={page === 0} onClick={() => setPage(page - 1)}>
              ← Previous
            </button>
            <span>
              Page {page + 1} of {results.data?.totalPages}
            </span>
            <button
              disabled={page + 1 === (results.data?.totalPages ?? 0)}
              onClick={() => setPage(page + 1)}
            >
              Next →
            </button>
          </div>
        )}
      </section>
      <section className="feature-strip">
        <div>
          <b>01</b>
          <h3>See your seat</h3>
          <p>Explore the cabin in 3D or use the accessible 2D map.</p>
        </div>
        <div>
          <b>02</b>
          <h3>A little time to decide</h3>
          <p>Your selected seats are held for ten minutes.</p>
        </div>
        <div>
          <b>03</b>
          <h3>Everything in one place</h3>
          <p>Manage your booking and download a demo e-ticket.</p>
        </div>
      </section>
    </>
  );
}
