export type Cabin = 'ECONOMY' | 'PREMIUM' | 'BUSINESS' | 'FIRST';
export interface User {
  id: number;
  name: string;
  email: string;
  role: 'USER' | 'ADMIN';
}
export interface Tokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}
export interface Airport {
  code: string;
  city: string;
  name: string;
}
export interface Aircraft {
  id: number;
  type: string;
  layout: string;
  rows: number;
  columnsCount: number;
}
export interface Flight {
  id: number;
  flightNumber: string;
  origin: string;
  destination: string;
  departure: string;
  arrival: string;
  basePrice: number;
  status: string;
  aircraft: Aircraft;
  airline: string;
}
export interface Seat {
  id: number;
  number: string;
  row: number;
  column: number;
  cabin: Cabin;
  features: string[];
  price: number;
  status: 'AVAILABLE' | 'HELD' | 'SELECTED' | 'OCCUPIED' | 'BLOCKED';
  holdId: string | null;
  expiresAt: string | null;
  x: number;
  y: number;
  z: number;
}
export interface SeatMap {
  flight: Flight;
  seats: Seat[];
}
export interface Hold {
  id: string;
  seatNumber: string;
  expiresAt: string;
}
export interface Passenger {
  name: string;
  dateOfBirth: string;
  seatNumber: string;
  holdId: string;
  baggage: string;
  meal: string;
}
export interface Booking {
  id: number;
  pnr: string;
  status: string;
  total: number;
  createdAt: string;
  flight: Flight;
  passengers: Passenger[];
}
export interface Page<T> {
  content: T[];
  totalPages: number;
  totalElements: number;
  number: number;
}
export interface Extra {
  code: string;
  name: string;
  kind: string;
  price: number;
}
export interface Fare {
  code: Cabin;
  multiplier: number;
  baggage: string;
}
export const money = (n: number) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(n);
export const time = (s: string) =>
  new Date(s).toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'UTC',
  });
export const day = (s: string) =>
  new Date(s).toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
export const tomorrow = () =>
  new Date(Date.now() + 86400000).toISOString().slice(0, 10);
export const cabinLabel = (s: string) =>
  s === 'PREMIUM' ? 'Premium economy' : s.charAt(0) + s.slice(1).toLowerCase();
