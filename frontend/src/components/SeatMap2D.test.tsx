import { fireEvent, render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import SeatMap2D from './SeatMap2D';
import type { Seat } from '../types';
const seat: Seat = {
  id: 1,
  number: '6A',
  row: 6,
  column: 0,
  cabin: 'ECONOMY',
  features: ['WINDOW', 'POWER'],
  price: 5000,
  status: 'AVAILABLE',
  holdId: null,
  expiresAt: null,
  x: -2,
  y: 0,
  z: 6,
};
it('selects available seats and prevents selection of occupied seats', () => {
  const select = vi.fn();
  render(
    <SeatMap2D
      seats={[
        seat,
        { ...seat, id: 2, number: '6B', column: 1, status: 'OCCUPIED' },
      ]}
      columns={6}
      selected={[]}
      cabin="ECONOMY"
      onSelect={select}
      busy={false}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: /Seat 6A/ }));
  expect(select).toHaveBeenCalledWith(seat);
  expect(screen.getByRole('button', { name: /Seat 6B/ })).toBeDisabled();
});
it('moves keyboard focus to the next available seat', () => {
  render(
    <SeatMap2D
      seats={[seat, { ...seat, id: 2, number: '6B', column: 1 }]}
      columns={6}
      selected={['6A']}
      cabin="ECONOMY"
      onSelect={vi.fn()}
      busy={false}
    />,
  );
  const first = screen.getByRole('button', { name: /Seat 6A/ });
  first.focus();
  fireEvent.keyDown(first, { key: 'ArrowRight' });
  expect(screen.getByRole('button', { name: /Seat 6B/ })).toHaveFocus();
  expect(first).toHaveAttribute('aria-pressed', 'true');
});
