import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, message } from '../api/client';
interface Result {
  source: string;
  environment: string;
  retrievedAt: string;
  adults: number;
  offers: {
    id: string;
    total: string;
    currency: string;
    segments: {
      flight: string;
      origin: string;
      destination: string;
      departure: string;
      arrival: string;
    }[];
  }[];
}
export default function ProviderSearch({
  criteria,
}: {
  criteria: {
    origin: string;
    destination: string;
    date: string;
    passengers: string;
    cabin: string;
  };
}) {
  const status = useQuery({
    queryKey: ['provider-status'],
    queryFn: () =>
      api<{ configured: boolean; environment: string }>(
        '/flights/provider/status',
      ),
    retry: false,
  });
  const [result, setResult] = useState<Result | null>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function search() {
    setBusy(true);
    setError('');
    setResult(null);
    try {
      setResult(
        await api<Result>(
          '/flights/provider/search?' + new URLSearchParams(criteria),
        ),
      );
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="panel">
      <p className="eyebrow">PROVIDER FLIGHT SEARCH</p>
      <h2>Compare Amadeus fares</h2>
      <p>
        Search {criteria.origin} → {criteria.destination} on {criteria.date} for{' '}
        {criteria.passengers} adult traveller(s). Prices are totals for all
        adults. Provider offers are for comparison; demo seat holds and checkout
        do not reserve these flights.
      </p>
      <span className="tag">
        {status.data?.configured
          ? status.data.environment === 'production'
            ? 'Production connection configured'
            : 'Test environment · limited/cached data'
          : 'Not connected'}
      </span>
      {!status.data?.configured && (
        <p className="notice">
          The owner needs to configure Amadeus API credentials on the server.
          Current booking results below use synthetic demo data.
        </p>
      )}
      <button
        className="button"
        disabled={!status.data?.configured || busy}
        onClick={() => void search()}
      >
        {busy ? 'Searching Amadeus…' : 'Search provider fares'}
      </button>
      {status.isError && (
        <p className="error">Unable to check provider connection.</p>
      )}
      {error && (
        <p className="error" role="alert">
          {error}
        </p>
      )}
      {result && (
        <>
          <p>
            Source: {result.source} · {result.environment} · Retrieved{' '}
            {new Date(result.retrievedAt).toLocaleString()}
          </p>
          {result.offers.length === 0 && (
            <p>
              No offers returned. Test coverage is limited; try another route or
              date.
            </p>
          )}
          {result.offers.map((o) => (
            <article className="panel" key={o.id}>
              <strong>
                {o.currency} {o.total} total for {result.adults} adults
              </strong>
              {o.segments.map((s, i) => (
                <p key={i}>
                  {s.flight} · {s.origin} → {s.destination}
                  <br />
                  {s.departure.replace('T', ' ')} →{' '}
                  {s.arrival.replace('T', ' ')} (airport-local times)
                </p>
              ))}
            </article>
          ))}
        </>
      )}
    </section>
  );
}
