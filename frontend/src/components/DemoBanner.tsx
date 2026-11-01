import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { resetDemo } from '../demo/api';
export default function DemoBanner() {
  const [confirm, setConfirm] = useState(false);
  const cache = useQueryClient();
  const nav = useNavigate();
  function reset() {
    resetDemo();
    cache.clear();
    setConfirm(false);
    nav('/');
  }
  return (
    <aside className="pages-demo-banner" aria-label="Demo information">
      <div>
        <b>INTERACTIVE DEMO</b>
        <span>
          Sample flights · Simulated bookings · Saved only in this browser
        </span>
      </div>
      <div className="demo-banner-actions">
        <Link to="/auth">Enter demo ↗</Link>
        <button onClick={() => setConfirm(!confirm)}>Reset demo</button>
      </div>
      {confirm && (
        <div className="demo-reset-confirm">
          <span>
            Clear this browser’s demo bookings, holds and admin changes?
          </span>
          <button onClick={reset}>Yes, reset</button>
          <button onClick={() => setConfirm(false)}>Keep my demo</button>
        </div>
      )}
    </aside>
  );
}
