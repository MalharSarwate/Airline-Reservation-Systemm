import { Link } from 'react-router-dom';
import {
  cabinLabel,
  day,
  money,
  time,
  type Flight,
  type Cabin,
} from '../types';
export default function FlightCard({
  flight: f,
  passengers,
  cabin,
  multiplier,
}: {
  flight: Flight;
  passengers: number;
  cabin: Cabin;
  multiplier: number;
}) {
  const duration = Math.round(
    (Date.parse(f.arrival) - Date.parse(f.departure)) / 60000,
  );
  return (
    <article className="flight-card">
      <div className="carrier">
        <span className="airline-mark">✈</span>
        <div>
          <strong>{f.airline}</strong>
          <small>
            {f.flightNumber} · {f.aircraft.type}
          </small>
        </div>
      </div>
      <div className="flight-route">
        <div>
          <strong>{time(f.departure)}</strong>
          <span>{f.origin}</span>
        </div>
        <div className="route-line">
          <small>
            {Math.floor(duration / 60)}h {duration % 60}m · Nonstop
          </small>
          <span>──────── ✈</span>
          <small>{day(f.departure)} · UTC</small>
        </div>
        <div>
          <strong>{time(f.arrival)}</strong>
          <span>{f.destination}</span>
        </div>
      </div>
      <div className="flight-fare">
        <small>{cabinLabel(cabin)} · per traveller</small>
        <strong>{money(f.basePrice * multiplier)}</strong>
        <span>+ selected seat & extras</span>
      </div>
      <Link
        className="button"
        to={`/book/${f.id}?passengers=${passengers}&cabin=${cabin}`}
      >
        Choose flight <span>→</span>
      </Link>
      <div className="flight-card-details">
        <span>↗ Direct flight</span>
        <span>▦ {f.aircraft.layout} cabin layout</span>
        <span>◎ Explore seats in 3D</span>
        <span className="fare-label">DEMO FARE</span>
      </div>
    </article>
  );
}
