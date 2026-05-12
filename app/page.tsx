"use client";
import { useState, useEffect } from "react";
import Header from "./components/Header";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DAYS_ES: Record<string, string> = {
  Monday: "Lunes", Tuesday: "Martes", Wednesday: "Miércoles",
  Thursday: "Jueves", Friday: "Viernes", Saturday: "Sábado", Sunday: "Domingo",
};

type Venue = { name: string; address: string; lat: number; lon: number };
type DayForecast = { day: string; peak_hour: number; peak_value: number; hourly: number[] };
type ForecastData = { venue_name: string; venue_address: string; analysis: DayForecast[] };

export default function Home() {
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapUrls, setMapUrls] = useState<Record<string, string>>({});
  const [modal, setModal] = useState<{ venue: Venue; data: ForecastData | null; loading: boolean } | null>(null);
  const [visibleCards, setVisibleCards] = useState<boolean[]>([]);

  useEffect(() => { fetchFeatured(); }, []);

  async function fetchFeatured() {
    try {
      const res = await fetch(`${API_URL}/featured`);
      const data = await res.json();
      const list: Venue[] = data.venues || [];
      setVenues(list);
      setVisibleCards(new Array(list.length).fill(false));
      fetchMapUrls(list);
      list.forEach((_, i) => {
        setTimeout(() => {
          setVisibleCards(prev => { const next = [...prev]; next[i] = true; return next; });
        }, i * 120);
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function fetchMapUrls(list: Venue[]) {
    const urls: Record<string, string> = {};
    await Promise.all(list.map(async (v) => {
      try {
        const res = await fetch(`${API_URL}/map?lat=${v.lat}&lon=${v.lon}`);
        const data = await res.json();
        urls[v.address] = data.map_url;
      } catch {}
    }));
    setMapUrls(urls);
  }

  async function handleSearch(query: string) {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/search?name=${encodeURIComponent(query)}&city=Guadalajara`);
      const data = await res.json();
      const list: Venue[] = data.venues || [];
      setVenues(list);
      setVisibleCards(new Array(list.length).fill(false));
      fetchMapUrls(list);
      list.forEach((_, i) => {
        setTimeout(() => {
          setVisibleCards(prev => { const next = [...prev]; next[i] = true; return next; });
        }, i * 100);
      });
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  async function handleForecast(venue: Venue) {
    setModal({ venue, data: null, loading: true });
    try {
      const res = await fetch(`${API_URL}/forecast`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: venue.name, address: venue.address }),
      });
      const data: ForecastData = await res.json();
      setModal({ venue, data, loading: false });
    } catch {
      setModal({ venue, data: null, loading: false });
    }
  }

  const today = new Date().toLocaleDateString("en-US", { weekday: "long" });
  const hour = new Date().getHours();

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,wght@0,400;0,600;0,700;1,400&family=DM+Sans:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'DM Sans', sans-serif; background: #f5f3ee; }

        .card {
          background: #fff;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.06), 0 0 0 1px rgba(0,0,0,0.04);
          transition: transform 0.3s cubic-bezier(.34,1.56,.64,1), box-shadow 0.3s ease, opacity 0.5s ease;
          opacity: 0;
          transform: translateY(28px) scale(0.97);
          cursor: default;
        }
        .card.visible { opacity: 1; transform: translateY(0) scale(1); }
        .card:hover {
          transform: translateY(-6px) scale(1.01);
          box-shadow: 0 20px 40px rgba(0,0,0,0.13), 0 0 0 1px rgba(0,0,0,0.04);
        }

        .btn-afluencia {
          width: 100%;
          padding: 0.8rem;
          background: linear-gradient(135deg, #0f4c3a 0%, #2d9b6f 100%);
          color: white;
          border: none;
          border-radius: 12px;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          font-family: 'DM Sans', sans-serif;
          letter-spacing: 0.01em;
          transition: all 0.2s ease;
          position: relative;
          overflow: hidden;
        }
        .btn-afluencia::after {
          content: '';
          position: absolute;
          inset: 0;
          background: rgba(255,255,255,0);
          transition: background 0.2s;
        }
        .btn-afluencia:hover::after { background: rgba(255,255,255,0.1); }
        .btn-afluencia:active { transform: scale(0.98); }

        .bar-container {
          display: flex;
          align-items: flex-end;
          gap: 3px;
          height: 72px;
          padding: 0 2px;
        }
        .bar-wrap {
          flex: 1;
          height: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: flex-end;
          position: relative;
          cursor: crosshair;
        }
        .bar {
          width: 100%;
          border-radius: 4px 4px 0 0;
          transition: filter 0.15s ease, transform 0.15s ease;
          transform-origin: bottom;
          min-height: 3px;
        }
        .bar-wrap:hover .bar {
          filter: brightness(1.15) saturate(1.2);
          transform: scaleY(1.05);
        }
        .bar-tooltip {
          position: absolute;
          bottom: calc(100% + 6px);
          left: 50%;
          transform: translateX(-50%);
          background: #1a1a1a;
          color: #fff;
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 7px;
          white-space: nowrap;
          opacity: 0;
          pointer-events: none;
          transition: opacity 0.15s ease;
          z-index: 20;
          font-family: 'DM Sans', sans-serif;
          box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        }
        .bar-tooltip::after {
          content: '';
          position: absolute;
          top: 100%;
          left: 50%;
          transform: translateX(-50%);
          border: 4px solid transparent;
          border-top-color: #1a1a1a;
        }
        .bar-wrap:hover .bar-tooltip { opacity: 1; }

        .modal-overlay {
          position: fixed;
          inset: 0;
          background: rgba(8,18,12,0.65);
          backdrop-filter: blur(8px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 200;
          padding: 1rem;
          animation: fadeIn 0.2s ease;
        }
        .modal-box {
          background: #faf9f6;
          border-radius: 26px;
          width: 100%;
          max-width: 700px;
          max-height: 88vh;
          overflow-y: auto;
          animation: slideUp 0.28s cubic-bezier(.34,1.4,.64,1);
          box-shadow: 0 30px 80px rgba(0,0,0,0.25);
        }
        .modal-header {
          padding: 1.75rem 2rem 1.25rem;
          border-bottom: 1px solid rgba(0,0,0,0.06);
          position: sticky;
          top: 0;
          background: #faf9f6;
          z-index: 10;
          border-radius: 26px 26px 0 0;
        }
        .modal-body { padding: 1.5rem 2rem 2rem; }

        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(40px) scale(0.96); opacity: 0 } to { transform: translateY(0) scale(1); opacity: 1 } }

        .day-card {
          border-radius: 14px;
          padding: 1rem 1.25rem 0.875rem;
          margin-bottom: 0.625rem;
          background: #fff;
          border: 1.5px solid #ebe9e3;
          transition: border-color 0.2s;
        }
        .day-card.today {
          background: linear-gradient(135deg, #f0fdf6, #e6faf1);
          border-color: #86efbc;
        }

        .avatar {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 1rem;
          color: white;
          flex-shrink: 0;
          background: linear-gradient(135deg, #0f4c3a, #2d9b6f);
          box-shadow: 0 4px 12px rgba(45,155,111,0.35);
        }

        .hero-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(45,155,111,0.1);
          color: #0f4c3a;
          border-radius: 50px;
          padding: 5px 14px;
          font-size: 0.78rem;
          font-weight: 600;
          letter-spacing: 0.02em;
          margin-bottom: 1rem;
          border: 1px solid rgba(45,155,111,0.2);
        }

        .loading-pulse {
          display: flex;
          gap: 6px;
          justify-content: center;
          margin-top: 5rem;
        }
        .loading-pulse span {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #2d9b6f;
          animation: pulse 1.2s ease-in-out infinite;
        }
        .loading-pulse span:nth-child(2) { animation-delay: 0.15s; }
        .loading-pulse span:nth-child(3) { animation-delay: 0.3s; }
        @keyframes pulse {
          0%, 80%, 100% { transform: scale(0.6); opacity: 0.4; }
          40% { transform: scale(1); opacity: 1; }
        }

        .squiggle {
          position: absolute;
          opacity: 0.06;
          pointer-events: none;
        }
      `}</style>

      <Header onSearch={handleSearch} />

      <main style={{ minHeight: '100vh', background: '#f5f3ee', padding: '3rem 1.5rem 4rem', position: 'relative', overflow: 'hidden' }}>

        {/* Decorative blobs */}
        <div style={{
          position: 'absolute', top: '-80px', right: '-80px',
          width: '400px', height: '400px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(45,155,111,0.12) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '100px', left: '-100px',
          width: '350px', height: '350px', borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(15,76,58,0.08) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        {/* Hero */}
        <div style={{ textAlign: 'center', marginBottom: '3rem', position: 'relative' }}>
          <div className="hero-badge">
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#2d9b6f', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
            En vivo · Guadalajara
          </div>
          <h1 style={{
            fontFamily: 'Fraunces, serif',
            fontSize: 'clamp(2rem, 5vw, 3.2rem)',
            fontWeight: 700,
            color: '#0a1a12',
            lineHeight: 1.15,
            letterSpacing: '-0.03em',
            marginBottom: '0.75rem',
          }}>
            Menos fila,<br />
            <em style={{ color: '#2d9b6f', fontStyle: 'italic' }}>más sabor.</em>
          </h1>
          <p style={{ color: '#7a8c82', fontSize: '1rem', maxWidth: '420px', margin: '0 auto', lineHeight: 1.6 }}>
            Encuentra restaurantes con poca afluencia en este momento y llega sin esperar.
          </p>
        </div>

        {loading && (
          <div className="loading-pulse">
            <span /><span /><span />
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '1.5rem',
          maxWidth: '1100px',
          margin: '0 auto',
          position: 'relative',
        }}>
          {!loading && venues.map((venue, i) => (
            <div key={i} className={`card ${visibleCards[i] ? 'visible' : ''}`}
              style={{ transitionDelay: `${i * 60}ms` }}>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '1.1rem 1.1rem 0.875rem' }}>
                <div className="avatar">{venue.name[0]}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#0a1a12', letterSpacing: '-0.01em', lineHeight: 1.3 }}>
                    {venue.name}
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: '0.72rem', color: '#9aaa9f', lineHeight: 1.4 }}>
                    {venue.address}
                  </p>
                </div>
              </div>

              <div style={{ width: '100%', height: '148px', background: '#eee', overflow: 'hidden', position: 'relative' }}>
                {mapUrls[venue.address] ? (
                  <iframe
                    src={mapUrls[venue.address]}
                    style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                    loading="lazy"
                  />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: '0.8rem' }}>
                    Cargando mapa...
                  </div>
                )}
              </div>

              <div style={{ padding: '0.875rem' }}>
                <button className="btn-afluencia" onClick={() => handleForecast(venue)}>
                  Ver afluencia →
                </button>
              </div>
            </div>
          ))}
        </div>
      </main>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>

            <div className="modal-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{
                    fontFamily: 'Fraunces, serif',
                    fontSize: '1.5rem',
                    fontWeight: 700,
                    color: '#0a1a12',
                    letterSpacing: '-0.02em',
                    marginBottom: '3px',
                  }}>
                    {modal.venue.name}
                  </h2>
                  <p style={{ fontSize: '0.75rem', color: '#9aaa9f', margin: 0 }}>{modal.venue.address}</p>
                </div>
                <button onClick={() => setModal(null)} style={{
                  background: '#ebe9e3', border: 'none', borderRadius: '10px',
                  width: '34px', height: '34px', cursor: 'pointer', fontSize: '0.9rem',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginLeft: '1rem', color: '#666',
                  transition: 'background 0.15s',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#ddd')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#ebe9e3')}
                >✕</button>
              </div>

              {/* Leyenda */}
              <div style={{ display: 'flex', gap: '16px', marginTop: '1rem', flexWrap: 'wrap' }}>
                {[
                  { color: '#4ade80', label: 'Poca afluencia' },
                  { color: '#facc15', label: 'Media' },
                  { color: '#f87171', label: 'Alta' },
                  { color: '#60a5fa', label: 'Ahora mismo' },
                ].map(({ color, label }) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.72rem', color: '#7a8c82', fontWeight: 500 }}>
                    <div style={{ width: '10px', height: '10px', borderRadius: '3px', background: color }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-body">
              {modal.loading && (
                <div className="loading-pulse" style={{ marginTop: '2rem' }}>
                  <span /><span /><span />
                </div>
              )}

              {!modal.loading && !modal.data && (
                <p style={{ textAlign: 'center', color: '#9aaa9f', padding: '2rem 0' }}>
                  No se pudo obtener la afluencia.
                </p>
              )}

              {!modal.loading && modal.data && modal.data.analysis.map((day, i) => {
                const isToday = day.day === today;
                const maxVal = Math.max(...day.hourly);
                const activeHours = day.hourly.map((val, h) => ({ val, h })).filter(({ val }) => val > 0);
                const startH = activeHours.length > 0 ? activeHours[0].h : 6;
                const endH = activeHours.length > 0 ? activeHours[activeHours.length - 1].h + 1 : 14;
                const visibleHours = day.hourly.slice(startH, endH);

                return (
                  <div key={i} className={`day-card ${isToday ? 'today' : ''}`}>
                    <p style={{
                      fontSize: '0.82rem',
                      fontWeight: 700,
                      color: isToday ? '#0f4c3a' : '#555',
                      marginBottom: '0.875rem',
                      letterSpacing: '-0.01em',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}>
                      {isToday && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#2d9b6f', display: 'inline-block', flexShrink: 0 }} />}
                      {DAYS_ES[day.day] || day.day}
                      {isToday && <span style={{ color: '#2d9b6f', fontWeight: 500 }}>— Hoy</span>}
                      {isToday && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#9aaa9f', fontWeight: 400 }}>
                        Pico a las {day.peak_hour}:00h
                      </span>}
                    </p>

                    <div className="bar-container">
                      {visibleHours.map((val, idx) => {
                        const h = startH + idx;
                        const height = maxVal > 0 ? Math.max((val / maxVal) * 100, val > 0 ? 6 : 2) : 2;
                        const isNow = isToday && hour === h;
                        const barColor = isNow ? '#60a5fa'
                          : val === 0 ? '#e8e6e0'
                          : val < 35 ? '#4ade80'
                          : val < 65 ? '#facc15'
                          : '#f87171';

                        return (
                          <div key={idx} className="bar-wrap">
                            <div
                              className="bar"
                              style={{ height: `${height}%`, background: barColor }}
                            />
                            <div className="bar-tooltip">
                              {h}:00 — {val}%
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: '0.68rem',
                      color: '#bbb',
                      marginTop: '6px',
                      paddingTop: '4px',
                      borderTop: '1px solid rgba(0,0,0,0.05)',
                    }}>
                      <span>{startH}:00</span>
                      <span>{Math.floor((startH + endH) / 2)}:00</span>
                      <span>{endH}:00</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}