import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { api, message } from '../api/client';
import { useSession } from '../store';
import type { Tokens } from '../types';
export default function Auth() {
  const [params] = useSearchParams();
  const [register, setRegister] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const nav = useNavigate();
  const cache = useQueryClient();
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setBusy(true);
    setError('');
    const data = new FormData(e.currentTarget);
    try {
      const tokens = await api<Tokens>(
        register ? '/auth/register' : '/auth/login',
        {
          name: data.get('name'),
          email: data.get('email'),
          password: data.get('password'),
        },
      );
      useSession.getState().set(tokens);
      cache.clear();
      const next = params.get('next');
      nav(next?.startsWith('/book/') ? next : '/');
    } catch (e) {
      setError(message(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="auth-layout">
      <div>
        <div className="auth-orbit" aria-hidden="true">
          <span>✈</span>
          <i />
          <b>YOUR JOURNEY STARTS HERE</b>
        </div>
        <p className="eyebrow">WELCOME ABOARD</p>
        <h1>
          Your journey,
          <br />
          <em>all together.</em>
        </h1>
        <p>
          Sign in to reserve your seat, manage your trips and keep your travel
          details in one place.
        </p>
        <Link to="/flights">← Explore flights</Link>
      </div>
      <form className="panel auth-form" onSubmit={submit}>
        <h2>{register ? 'Create an account' : 'Good to see you again'}</h2>
        <p>
          {register
            ? 'Start planning your next journey.'
            : 'Sign in to continue your booking.'}
        </p>
        {register && (
          <label>
            Full name
            <input name="name" autoComplete="name" required maxLength={80} />
          </label>
        )}
        <label>
          Email address
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            maxLength={254}
          />
        </label>
        <label>
          Password
          <input
            name="password"
            type="password"
            autoComplete={register ? 'new-password' : 'current-password'}
            required
            minLength={register ? 10 : 1}
            maxLength={72}
          />
        </label>
        {register && (
          <small>Use 10–72 characters. This is a demo application.</small>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <button className="button" disabled={busy}>
          {busy ? 'Please wait…' : register ? 'Create account →' : 'Sign in →'}
        </button>
        <button
          className="text-button"
          type="button"
          onClick={() => {
            setRegister(!register);
            setError('');
          }}
        >
          {register
            ? 'Already have an account? Sign in'
            : 'New here? Create an account'}
        </button>
        <small>
          Sessions stay in memory. Refreshing the page signs you out.
        </small>
      </form>
    </section>
  );
}
