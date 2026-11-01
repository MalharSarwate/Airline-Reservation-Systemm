import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { enterDemo } from '../demo/api';
import { useSession } from '../store';
export default function DemoAuth() {
  const [params] = useSearchParams();
  const nav = useNavigate();
  const cache = useQueryClient();
  const [name, setName] = useState('Demo Traveller');
  const [role, setRole] = useState('USER');
  function submit(e: FormEvent) {
    e.preventDefault();
    useSession.getState().set(enterDemo(name, role === 'ADMIN'));
    cache.clear();
    const next = params.get('next');
    nav(
      next?.startsWith('/book/')
        ? next
        : role === 'ADMIN'
          ? '/admin'
          : '/flights',
    );
  }
  return (
    <section className="auth-layout">
      <div>
        <div className="auth-orbit" aria-hidden="true">
          <span>✈</span>
          <i />
          <b>YOUR JOURNEY STARTS HERE</b>
        </div>
        <p className="eyebrow">WELCOME TO THE DEMO</p>
        <h1>
          Your journey,
          <br />
          <em>ready to explore.</em>
        </h1>
        <p>
          Try the complete interface without creating an account. Use example
          traveller details; everything stays in this browser.
        </p>
        <Link to="/flights">← Explore flights</Link>
      </div>
      <form className="panel auth-form" onSubmit={submit}>
        <h2>Enter the demo</h2>
        <p>No email, password or payment card needed.</p>
        <label>
          Demo display name
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={80}
            autoComplete="off"
          />
        </label>
        <label>
          Explore as
          <select value={role} onChange={(e) => setRole(e.target.value)}>
            <option value="USER">Traveller — seats & bookings</option>
            <option value="ADMIN">Admin — flight management preview</option>
          </select>
        </label>
        <button className="button">Start demo →</button>
        <small>
          This is a frontend demonstration. Accounts, payments, holds and
          bookings here are simulated, not airline reservations. Reloading signs
          you out; sample bookings remain in this browser until reset.
        </small>
      </form>
    </section>
  );
}
