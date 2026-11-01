import type { KeyboardEvent } from 'react';
import { money, type Seat } from '../types';
interface Props {
  seats: Seat[];
  columns: number;
  selected: string[];
  cabin: string;
  onSelect: (s: Seat) => void;
  busy: boolean;
  highlighted?: string[];
}
export default function SeatMap2D({
  seats,
  columns,
  selected,
  cabin,
  onSelect,
  busy,
  highlighted = [],
}: Props) {
  const rows = [...new Set(seats.map((s) => s.row))];
  function keyboard(e: KeyboardEvent<HTMLButtonElement>, seat: Seat) {
    const offset: Record<string, number> = {
      ArrowRight: 1,
      ArrowLeft: -1,
      ArrowDown: columns,
      ArrowUp: -columns,
    };
    if (!(e.key in offset)) return;
    e.preventDefault();
    const index = seats.findIndex((s) => s.id === seat.id);
    const direction = offset[e.key];
    for (
      let i = index + direction;
      i >= 0 && i < seats.length;
      i += direction
    ) {
      const el = document.getElementById('seat-' + seats[i].number);
      if (el instanceof HTMLButtonElement && !el.disabled) {
        el.focus();
        break;
      }
    }
  }
  return (
    <div className="seat-map-scroll">
      <div className={`seat-map cols-${columns}`}>
        <div className="cockpit">
          FLIGHT DECK <span>↑</span>
        </div>
        <p className="map-caption">Galley · Front of cabin</p>
        {rows.map((row) => (
          <div key={row} className="seat-row">
            <span className="row-number">{row}</span>
            {seats
              .filter((s) => s.row === row)
              .map((s) => (
                <button
                  key={s.id}
                  id={'seat-' + s.number}
                  type="button"
                  disabled={
                    busy ||
                    s.cabin !== cabin ||
                    ['OCCUPIED', 'BLOCKED', 'HELD'].includes(s.status)
                  }
                  onKeyDown={(e) => keyboard(e, s)}
                  onClick={() => onSelect(s)}
                  aria-pressed={selected.includes(s.number)}
                  aria-label={`Seat ${s.number}, ${s.cabin}, ${s.status}, ${money(s.price)}, ${s.features.join(', ')}`}
                  title={`${s.number} · ${money(s.price)} · ${s.features.join(', ')}`}
                  className={`seat ${highlighted.includes(s.number) ? 'recommended' : ''} ${selected.includes(s.number) ? 'chosen' : s.status.toLowerCase()} ${s.cabin !== cabin ? 'other-cabin' : ''} ${s.features.includes('EXTRA_LEGROOM') ? 'legroom' : ''}`}
                  style={{
                    gridColumn:
                      columns === 6
                        ? s.column < 3
                          ? s.column + 2
                          : s.column + 3
                        : s.column < 2
                          ? s.column + 2
                          : s.column < 6
                            ? s.column + 3
                            : s.column + 4,
                  }}
                >
                  {s.number}
                </button>
              ))}
          </div>
        ))}
        <p className="map-caption">Lavatories · Rear galley</p>
      </div>
    </div>
  );
}
