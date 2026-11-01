import { lazy, Suspense } from 'react';
import {
  Link,
  NavLink,
  Route,
  Routes,
  useNavigate,
  useLocation,
} from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import Search from './pages/Search';
import { DEMO_MODE } from './config';
import DemoBanner from './components/DemoBanner';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import { useSession } from './store';
import { api } from './api/client';
const Book = lazy(() => import('./pages/Book'));
const Bookings = lazy(() => import('./pages/Bookings'));
const Admin = lazy(() => import('./pages/Admin'));
export default function App() {
  const location = useLocation();
  const user = useSession((s) => s.user);
  const nav = useNavigate();
  const cache = useQueryClient();
  async function logout() {
    const refreshToken = useSession.getState().refreshToken;
    try {
      if (refreshToken) await api('/auth/logout', { refreshToken });
    } catch {
      // Local sign-out still succeeds if the network is unavailable.
    } finally {
      useSession.getState().clear();
      cache.clear();
      nav('/');
    }
  }
  return (
    <div
      className={`shell ${location.pathname === '/' ? '' : 'app-workspace'}`}
    >
      <a
        className="skip"
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        Skip to content
      </a>
      <header>
        <Link className="brand" to="/">
          <span aria-hidden="true">✈</span>
          <b>
            AEROLINE<small>RESERVATIONS</small>
          </b>
        </Link>
        <nav aria-label="Main navigation">
          <NavLink to="/" end>
            Home
          </NavLink>
          <NavLink to="/flights">Find flights</NavLink>
          <NavLink to="/bookings">My bookings</NavLink>
          {user?.role === 'ADMIN' && <NavLink to="/admin">Admin</NavLink>}
        </nav>
        <div className="account">
          {user ? (
            <>
              <span>{user.name.split(' ')[0]}</span>
              <button className="text-button" onClick={() => void logout()}>
                Sign out
              </button>
            </>
          ) : (
            <Link className="button secondary" to="/auth">
              {DEMO_MODE ? 'Enter demo ↗' : 'Sign in ↗'}
            </Link>
          )}
        </div>
      </header>
      {DEMO_MODE && <DemoBanner />}
      <main id="main" tabIndex={-1}>
        <Suspense
          fallback={<div className="skeleton">Preparing your journey…</div>}
        >
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/flights" element={<Search />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/book/:id" element={<Book />} />
            <Route path="/bookings" element={<Bookings />} />
            <Route path="/admin" element={<Admin />} />
            <Route
              path="*"
              element={
                <section className="empty">
                  <h1>Page not found</h1>
                  <Link to="/flights">Return to flights</Link>
                </section>
              }
            />
          </Routes>
        </Suspense>
      </main>
      <footer>
        <span>AEROLINE · Airline Reservation System</span>
        <span>Demo only · Mock payments · Schedules in UTC</span>
      </footer>
    </div>
  );
}
