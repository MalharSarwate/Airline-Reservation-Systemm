import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { tomorrow } from '../types';
export default function Landing() {
  const navigate = useNavigate();
  const root = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('revealed');
            observer.unobserve(e.target);
          }
        }),
      { threshold: 0.12 },
    );
    root.current
      ?.querySelectorAll('.reveal')
      .forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={root} className={`landing ${paused ? 'motion-paused' : ''}`}>
      <section className="landing-hero">
        <div className="landing-copy">
          <p className="eyebrow">YOUR WORLD. A WHOLE NEW PERSPECTIVE.</p>
          <h1>
            Go beyond
            <br />
            <em>the ordinary.</em>
          </h1>
          <p>
            Find your flight. Explore the cabin.
            <br />
            Make your favourite seat part of the journey.
          </p>
          <div className="landing-actions">
            <Link className="button" to="/flights">
              Find your next flight <span>↗</span>
            </Link>
            <a
              href="#experience"
              className="landing-tour"
              onClick={(e) => {
                e.preventDefault();
                document
                  .getElementById('experience')
                  ?.scrollIntoView({
                    behavior: window.matchMedia(
                      '(prefers-reduced-motion: reduce)',
                    ).matches
                      ? 'auto'
                      : 'smooth',
                  });
              }}
            >
              Explore the experience ↓
            </a>
          </div>
          <div className="landing-note">
            <span /> CHOOSE YOUR FLIGHT. OWN YOUR VIEW.
          </div>
        </div>
        <div className="sky-scene" aria-hidden="true">
          <div className="hero-coordinates">19.0896° N · 72.8656° E</div>
          <div className="sky-grid" />
          <div className="altitude-label">
            CRUISING ALTITUDE<span>35,000 FT</span>
          </div>
          <div className="sky-orbit orbit-a" />
          <div className="sky-orbit orbit-b" />
          <div className="sky-sun" />
          <div className="cloud cloud-one" />
          <div className="cloud cloud-two" />
          <div className="cloud cloud-three" />
          <svg className="landing-aircraft" viewBox="0 0 500 500" fill="none">
            <defs>
              <linearGradient
                id="plane-body"
                x1="220"
                y1="20"
                x2="280"
                y2="450"
                gradientUnits="userSpaceOnUse"
              >
                <stop stopColor="#fff" />
                <stop offset="1" stopColor="#c1d4d0" />
              </linearGradient>
              <linearGradient id="plane-wing">
                <stop stopColor="#8faeaa" />
                <stop offset=".5" stopColor="#f6faf7" />
                <stop offset="1" stopColor="#aec6c1" />
              </linearGradient>
            </defs>
            <path
              d="M240 174L38 309Q25 322 52 322L235 266Z"
              fill="url(#plane-wing)"
            />
            <path
              d="M260 174L462 309Q475 322 448 322L265 266Z"
              fill="url(#plane-wing)"
            />
            <rect
              x="142"
              y="247"
              width="25"
              height="65"
              rx="12"
              fill="#486e68"
            />
            <rect
              x="333"
              y="247"
              width="25"
              height="65"
              rx="12"
              fill="#486e68"
            />
            <path d="M242 352L146 425L150 437L244 412Z" fill="#345e55" />
            <path d="M258 352L354 425L350 437L256 412Z" fill="#345e55" />
            <path
              d="M250 29C219 48 224 111 227 170L236 403Q250 456 264 403L273 170C276 111 281 48 250 29Z"
              fill="url(#plane-body)"
            />
            <path
              d="M235 84Q250 74 265 84L263 96Q250 89 237 96Z"
              fill="#426b70"
            />
            <path d="M250 338L244 419H256Z" fill="#3c6a5e" />
            {Array.from({ length: 13 }, (_, i) => (
              <g key={i}>
                <rect
                  x="232"
                  y={111 + i * 16}
                  width="4"
                  height="7"
                  rx="2"
                  fill="#658c8a"
                />
                <rect
                  x="264"
                  y={111 + i * 16}
                  width="4"
                  height="7"
                  rx="2"
                  fill="#658c8a"
                />
              </g>
            ))}
          </svg>
          <div className="sky-label top-label">A DIFFERENT POINT OF VIEW</div>
          <div className="flight-caption">
            <span>YOUR NEXT CHAPTER</span>
            <strong>Ready for takeoff.</strong>
            <div>Explore more. Choose better.</div>
          </div>
        </div>
        <button className="motion-control" onClick={() => setPaused(!paused)}>
          {paused ? 'Resume animation ▷' : 'Pause animation Ⅱ'}
        </button>
      </section>
      <form
        className="landing-quick-search"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          navigate(
            '/flights?' +
              new URLSearchParams({
                origin: String(data.get('origin')),
                destination: String(data.get('destination')),
                date: String(data.get('date')),
              }),
          );
        }}
      >
        <div className="quick-title">
          <span>01 / YOUR NEXT MOVE</span>
          <strong>Where to?</strong>
        </div>
        <label>
          DEPARTING FROM
          <select name="origin" defaultValue="BOM">
            <option value="BOM">Mumbai · BOM</option>
            <option value="DEL">Delhi · DEL</option>
            <option value="BLR">Bengaluru · BLR</option>
          </select>
        </label>
        <span className="quick-arrow" aria-hidden="true">
          ↗
        </span>
        <label>
          ARRIVING AT
          <select name="destination" defaultValue="DEL">
            <option value="DEL">Delhi · DEL</option>
            <option value="BOM">Mumbai · BOM</option>
            <option value="BLR">Bengaluru · BLR</option>
            <option value="DXB">Dubai · DXB</option>
            <option value="SIN">Singapore · SIN</option>
          </select>
        </label>
        <label>
          DEPARTURE
          <input
            type="date"
            name="date"
            required
            min={new Date().toISOString().slice(0, 10)}
            defaultValue={tomorrow()}
          />
        </label>
        <button className="button">Explore flights ↗</button>
      </form>
      <div className="landing-ribbon">
        <span>01 / FIND YOUR FLIGHT</span>
        <span>02 / STEP INSIDE THE CABIN</span>
        <span>03 / CHOOSE YOUR VIEW</span>
      </div>
      <section className="destination-section reveal">
        <div className="destination-heading">
          <div>
            <p className="eyebrow">THE WORLD IS CALLING</p>
            <h2>
              Different places.
              <br />
              <em>Same sense of wonder.</em>
            </h2>
          </div>
          <Link to="/flights" className="landing-tour">
            Explore all routes ↗
          </Link>
        </div>
        <div className="destination-grid">
          {[
            {
              city: 'Dubai',
              code: 'DXB',
              origin: 'BOM',
              word: 'A little extraordinary.',
              style: 'dubai',
              number: '01',
            },
            {
              city: 'Singapore',
              code: 'SIN',
              origin: 'DEL',
              word: 'Follow your curiosity.',
              style: 'singapore',
              number: '02',
            },
            {
              city: 'Bengaluru',
              code: 'BLR',
              origin: 'BOM',
              word: 'Find a fresh perspective.',
              style: 'bengaluru',
              number: '03',
            },
          ].map((d) => (
            <Link
              key={d.code}
              className={`destination-card ${d.style}`}
              to={`/flights?origin=${d.origin}&destination=${d.code}`}
            >
              <div className="destination-scenery" aria-hidden="true">
                <span className="destination-sun" />
                <span className="city-building b1" />
                <span className="city-building b2" />
                <span className="city-building b3" />
                <span className="city-building b4" />
                <span className="city-building b5" />
              </div>
              <div className="destination-top">
                <span>{d.number} / DISCOVER</span>
                <span>{d.code} ↗</span>
              </div>
              <div className="destination-bottom">
                <p>{d.word}</p>
                <h3>{d.city}</h3>
                <span>
                  Explore flights <b>↗</b>
                </span>
              </div>
            </Link>
          ))}
        </div>
        <p className="destination-disclaimer">
          Illustrated destinations · Explore available demo routes
        </p>
      </section>
      <section className="experience reveal" id="experience">
        <div>
          <p className="eyebrow">MORE THAN A SEAT NUMBER</p>
          <h2>
            Your seat. Your space.
            <br />
            <em>Your kind of journey.</em>
          </h2>
          <p>
            Take a look inside before you decide. Switch between the 2D map and
            an interactive 3D cabin, then see the view from your seat.
          </p>
          <Link className="button secondary" to="/flights">
            Explore flights & cabins ↗
          </Link>
        </div>
        <div className="seat-preview" aria-hidden="true">
          <div className="preview-heading">
            <span>CABIN PREVIEW</span>
            <span>3D VIEW ↗</span>
          </div>
          <div className="mini-cabin">
            {Array.from({ length: 24 }, (_, i) => (
              <div
                key={i}
                className={`mini-seat ${i === 8 ? 'highlight' : ''}`}
              >
                <span />
                {i === 8 && <b>Your favourite seat</b>}
              </div>
            ))}
          </div>
          <div className="preview-foot">
            <span className="preview-dot" /> A window into your next journey
          </div>
        </div>
      </section>
      <section className="landing-steps reveal">
        <p className="eyebrow">FROM HERE TO SOMEWHERE NEW</p>
        <h2>
          A little less planning.
          <br />A lot more looking forward.
        </h2>
        <div className="landing-step-grid">
          {[
            [
              '01',
              'Find a flight',
              'Choose your route, date and cabin. Compare options and find the journey that fits.',
            ],
            [
              '02',
              'Make it yours',
              'Pick seats for everyone, explore the passenger view and add your preferred extras.',
            ],
            [
              '03',
              'Keep it together',
              'View your booking, download a demo e-ticket and manage your trip in one place.',
            ],
          ].map(([n, title, description]) => (
            <article key={n}>
              <span>{n} —</span>
              <h3>{title}</h3>
              <p>{description}</p>
            </article>
          ))}
        </div>
      </section>
      <section className="landing-cta reveal">
        <p className="eyebrow">WHERE WILL YOU GO NEXT?</p>
        <h2>
          Ready for your
          <br />
          next great story?
        </h2>
        <Link className="button" to="/flights">
          Let’s find your flight ↗
        </Link>
        <p>Explore this demo with sample fares and simulated payments.</p>
      </section>
    </div>
  );
}
