import type { Aircraft, Airport, Extra, Fare, Flight, Seat } from '../types';
export const airports: Airport[] = [
  ['BOM', 'Mumbai', 'Chhatrapati Shivaji Maharaj International'],
  ['DEL', 'Delhi', 'Indira Gandhi International'],
  ['BLR', 'Bengaluru', 'Kempegowda International'],
  ['HYD', 'Hyderabad', 'Rajiv Gandhi International'],
  ['MAA', 'Chennai', 'Chennai International'],
  ['CCU', 'Kolkata', 'Netaji Subhas Chandra Bose International'],
  ['GOI', 'Goa', 'Dabolim'],
  ['PNQ', 'Pune', 'Pune International'],
  ['DXB', 'Dubai', 'Dubai International'],
  ['SIN', 'Singapore', 'Changi'],
].map(([code, city, name]) => ({ code, city, name }));
export const aircraft: Aircraft[] = [
  { id: 1, type: 'Airbus A320', layout: '3-3', rows: 20, columnsCount: 6 },
  { id: 2, type: 'Airbus A330', layout: '2-4-2', rows: 24, columnsCount: 8 },
];
export const fares: Fare[] = [
  { code: 'ECONOMY', multiplier: 1, baggage: '7 kg cabin + 15 kg checked' },
  { code: 'PREMIUM', multiplier: 1.6, baggage: '10 kg cabin + 20 kg checked' },
  { code: 'BUSINESS', multiplier: 2.8, baggage: '12 kg cabin + 30 kg checked' },
  { code: 'FIRST', multiplier: 4, baggage: '15 kg cabin + 40 kg checked' },
];
export const extras: Extra[] = [
  { code: 'BAG_NONE', name: 'Included baggage', kind: 'BAGGAGE', price: 0 },
  { code: 'BAG_10', name: 'Extra 10 kg', kind: 'BAGGAGE', price: 1500 },
  { code: 'BAG_20', name: 'Extra 20 kg', kind: 'BAGGAGE', price: 2800 },
  { code: 'MEAL_NONE', name: 'No meal', kind: 'MEAL', price: 0 },
  { code: 'MEAL_VEG', name: 'Vegetarian meal', kind: 'MEAL', price: 450 },
  { code: 'MEAL_NONVEG', name: 'Chicken meal', kind: 'MEAL', price: 550 },
];
export function seedFlights(today = new Date()): Flight[] {
  const start = Date.UTC(
    today.getUTCFullYear(),
    today.getUTCMonth(),
    today.getUTCDate(),
  );
  const routes = [
    ['BOM', 'DEL', 125, 4800],
    ['DEL', 'BOM', 130, 4600],
    ['BOM', 'BLR', 100, 3900],
    ['BLR', 'DEL', 165, 5200],
    ['BOM', 'DXB', 190, 14500],
    ['DEL', 'SIN', 350, 22500],
  ] as const;
  const flights: Flight[] = [];
  for (let day = 0; day < 31; day++)
    for (let route = 0; route < routes.length; route++)
      for (let slot = 0; slot < 4; slot++) {
        const [origin, destination, minutes, price] = routes[route];
        const departure = start + day * 86400000 + (6 + slot * 4) * 3600000;
        flights.push({
          id:
            Math.floor((start + day * 86400000) / 86400000) * 100 +
            route * 4 +
            slot +
            1,
          flightNumber: `AR${110 + route * 10 + slot}`,
          origin,
          destination,
          departure: new Date(departure).toISOString(),
          arrival: new Date(departure + minutes * 60000).toISOString(),
          basePrice: price + slot * 450,
          status: 'SCHEDULED',
          aircraft: aircraft[route >= 4 ? 1 : 0],
          airline: 'Aeroline',
        });
      }
  return flights;
}
export function seedSeats(f: Flight): Seat[] {
  const result: Seat[] = [];
  const xs =
    f.aircraft.columnsCount === 6
      ? [-2.3, -1.5, -0.7, 0.7, 1.5, 2.3]
      : [-3.3, -2.5, -1.1, -0.35, 0.35, 1.1, 2.5, 3.3];
  for (let row = 1; row <= f.aircraft.rows; row++)
    for (let col = 0; col < xs.length; col++) {
      const cabin =
        row === 1
          ? 'FIRST'
          : row <= 3
            ? 'BUSINESS'
            : row <= 5
              ? 'PREMIUM'
              : 'ECONOMY';
      const window = col === 0 || col === xs.length - 1;
      const blocked = row === f.aircraft.rows && col === 1;
      const occupied = (row === 8 && col === 1) || (row === 14 && col === 4);
      result.push({
        id: row * 10 + col,
        number: `${row}${String.fromCharCode(65 + col)}`,
        row,
        column: col,
        cabin,
        features: [
          window ? 'WINDOW' : 'AISLE_OR_MIDDLE',
          'POWER',
          ...(row === 10
            ? ['EXIT_ROW', 'EXTRA_LEGROOM']
            : row === f.aircraft.rows
              ? ['NEAR_LAVATORY', 'LIMITED_RECLINE']
              : row === 1
                ? ['NEAR_GALLEY']
                : ['STANDARD_RECLINE']),
        ],
        price:
          Math.round(
            (f.basePrice * fares.find((x) => x.code === cabin)!.multiplier +
              (row === 10 ? 900 : window ? 250 : 0)) *
              100,
          ) / 100,
        status: blocked ? 'BLOCKED' : occupied ? 'OCCUPIED' : 'AVAILABLE',
        holdId: null,
        expiresAt: null,
        x: xs[col],
        y: 0,
        z: (row - 1) * 1.3,
      });
    }
  return result;
}
