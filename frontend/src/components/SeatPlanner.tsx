import { useState } from 'react';
import {
  planSeats,
  isAisle,
  type Priority,
  type SeatPlan,
} from '../seatPlanner';
import { cabinLabel, money, type Passenger, type Seat } from '../types';
interface Props {
  seats: Seat[];
  cabin: string;
  passengers: Passenger[];
  busy: boolean;
  onApply: (plan: SeatPlan) => void;
  onPreview: (number: string) => void;
  onHighlight: (numbers: string[]) => void;
}
export default function SeatPlanner({
  seats,
  cabin,
  passengers,
  busy,
  onApply,
  onPreview,
  onHighlight,
}: Props) {
  const [open, setOpen] = useState(false);
  const [priority, setPriority] = useState<Priority>('together');
  const [budget, setBudget] = useState('');
  const [compare, setCompare] = useState<string[]>([]);
  const plans = planSeats(
    seats,
    cabin,
    passengers,
    priority,
    budget ? Number(budget) : null,
  );
  const options = seats.filter((s) => s.cabin === cabin);
  const compared = compare
    .map((n) => options.find((s) => s.number === n))
    .filter((s): s is Seat => !!s);
  function toggle(n: string) {
    setCompare((old) =>
      old.includes(n) ? old.filter((x) => x !== n) : [...old.slice(-1), n],
    );
  }
  return (
    <section className="seat-assistant">
      <div className="assistant-header">
        <div>
          <p className="eyebrow">A LITTLE HELP FINDING YOUR VIEW</p>
          <h3>Plan your seats, together.</h3>
          <p>Tell us what matters. Explore suggestions before you reserve.</p>
        </div>
        <button
          className="button secondary"
          aria-expanded={open}
          onClick={() => {
            setOpen(!open);
            if (open) onHighlight([]);
          }}
        >
          {open ? 'Close planner −' : 'Help me choose ↗'}
        </button>
      </div>
      {open && (
        <div className="assistant-body">
          <div className="planner-controls">
            <label>
              Your priority
              <select
                value={priority}
                onChange={(e) => {
                  setPriority(e.target.value as Priority);
                  onHighlight([]);
                }}
              >
                <option value="together">Sit together</option>
                <option value="window">Window views</option>
                <option value="aisle">Easy aisle access</option>
                <option value="legroom">Extra legroom</option>
                <option value="facilities">Away from marked facilities</option>
                <option value="price">Lowest fare & seat cost</option>
              </select>
            </label>
            <label>
              Group fare + seat budget (INR)
              <input
                type="number"
                min="0"
                step="1"
                placeholder="No limit"
                value={budget}
                onChange={(e) => {
                  setBudget(e.target.value);
                  onHighlight([]);
                }}
              />
            </label>
          </div>
          <p className="planner-note">
            For {passengers.length} traveller{passengers.length > 1 ? 's' : ''}{' '}
            · {cabinLabel(cabin)} only · Includes fares and seats, excludes
            meals and baggage. Suggestions do not create holds.
          </p>
          <div className="plan-grid">
            {plans.map((plan, i) => (
              <article className="seat-plan" key={plan.key}>
                <div className="plan-top">
                  <span>OPTION 0{i + 1}</span>
                  <strong>{money(plan.total)}</strong>
                </div>
                <h4>{plan.seats.map((s) => s.number).join(' + ')}</h4>
                <ul>
                  {plan.reasons.map((reason) => (
                    <li key={reason}>{reason}</li>
                  ))}
                </ul>
                <div className="plan-passengers">
                  {plan.seats.map((s, index) => (
                    <div key={s.id}>
                      <span>
                        {passengers[index]?.name || `Traveller ${index + 1}`} →{' '}
                        <b>{s.number}</b>
                      </span>
                      <button
                        aria-pressed={compare.includes(s.number)}
                        onClick={() => toggle(s.number)}
                      >
                        Compare {s.number}
                      </button>
                    </div>
                  ))}
                </div>
                <div className="plan-actions">
                  <button
                    className="text-button"
                    onClick={() => {
                      onHighlight(plan.seats.map((s) => s.number));
                      onPreview(plan.seats[0].number);
                    }}
                  >
                    Preview plan ↗
                  </button>
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => onApply(plan)}
                  >
                    {busy ? 'Please wait…' : 'Reserve this plan'}
                  </button>
                </div>
              </article>
            ))}
          </div>
          {plans.length === 0 && (
            <p className="notice">
              No plan matches your budget and available seats. Increase the
              budget or choose seats manually. Exit rows are excluded if any
              traveller is under 16.
            </p>
          )}
          <div className="compare-header">
            <h4>Compare two seats</h4>
            <p>
              Use the dropdowns or the Compare buttons above. Previewing does
              not reserve a seat.
            </p>
          </div>
          <div className="compare-selects">
            {[0, 1].map((index) => (
              <label key={index}>
                Seat {index === 0 ? 'A' : 'B'}
                <select
                  aria-label={`Compare seat ${index === 0 ? 'A' : 'B'}`}
                  value={compare[index] ?? ''}
                  onChange={(e) => {
                    setCompare((old) => {
                      const next = [...old];
                      next[index] = e.target.value;
                      return next;
                    });
                  }}
                >
                  <option value="">Choose a seat</option>
                  {options.map((s) => (
                    <option
                      key={s.id}
                      value={s.number}
                      disabled={compare[1 - index] === s.number}
                    >
                      {s.number} · {s.status.toLowerCase()}
                    </option>
                  ))}
                </select>
              </label>
            ))}
          </div>
          <div className="compare-grid">
            {compared.map((s) => (
              <article key={s.number}>
                <div className="plan-top">
                  <h4>{s.number}</h4>
                  <strong>{money(s.price)}</strong>
                </div>
                <dl>
                  <div>
                    <dt>Position</dt>
                    <dd>
                      {s.features.includes('WINDOW')
                        ? 'Window'
                        : isAisle(s, seats)
                          ? 'Aisle'
                          : 'Middle'}
                    </dd>
                  </div>
                  <div>
                    <dt>Legroom</dt>
                    <dd>
                      {s.features.includes('EXTRA_LEGROOM')
                        ? 'Extra legroom'
                        : 'Standard'}
                    </dd>
                  </div>
                  <div>
                    <dt>Recline</dt>
                    <dd>
                      {s.features.includes('LIMITED_RECLINE')
                        ? 'Limited'
                        : 'Standard'}
                    </dd>
                  </div>
                  <div>
                    <dt>Power</dt>
                    <dd>
                      {s.features.includes('POWER')
                        ? 'Available'
                        : 'Not specified'}
                    </dd>
                  </div>
                  <div>
                    <dt>Availability</dt>
                    <dd>{s.status.toLowerCase()}</dd>
                  </div>
                </dl>
                {s.features
                  .filter((x) =>
                    ['EXIT_ROW', 'NEAR_LAVATORY', 'NEAR_GALLEY'].includes(x),
                  )
                  .map((x) => (
                    <p className="warning" key={x}>
                      {x.replaceAll('_', ' ').toLowerCase()}
                    </p>
                  ))}
                <button
                  className="button secondary"
                  onClick={() => {
                    onHighlight([s.number]);
                    onPreview(s.number);
                  }}
                >
                  See passenger view {s.number} ↗
                </button>
              </article>
            ))}
          </div>
          <p className="planner-note">
            Recommendations use this aircraft’s demo seat features and your
            preferences. They do not predict noise or guarantee comfort.
            Availability is rechecked when reserving.
          </p>
        </div>
      )}
    </section>
  );
}
