"use client";
import { useState, useEffect } from "react";
import Header from "./components/Header";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

const DAYS_ES: Record<string, string> = {
  Monday: "Lunes", Tuesday: "Martes", Wednesday: "Miércoles",
  Thursday: "Jueves", Friday: "Viernes", Saturday: "Sábado", Sunday: "Domingo",
};

const PROMOS = [
  {
    name: "La Peltrería",
    category: "Chilaquiles",
    promo: "Chilaquiles (rojos, verdes o campechanos) por $49.99",
    valid: "Todos los martes",
    address: "Niño Obrero 654 A, Zapopan",
    ig: "https://www.instagram.com/lapeltreria/?hl=en",
  },
  {
    name: "Casa Licia",
    category: "Desayunos",
    promo: "Hot cakes 2×1 (mar), chilaquiles 2×1 (mié), combo desayuno $160 (jue–vie)",
    valid: "Mar–Vie",
    address: "Av. Piotr Ilich Tchaikovski 578-1, Arcos de Guadalupe",
    ig: "https://www.instagram.com/casaliciamx/?hl=en",
  },
  {
    name: "Made in Heaven",
    category: "Postres",
    promo: "Helados chicos 2×1 (lun), malteadas 2×1 (mié). Opciones veganas disponibles",
    valid: "Lunes y Miércoles",
    address: "Av. Montevideo 3286-1A, Providencia",
    ig: "https://www.instagram.com/madeinheaven_mx/?hl=en",
  },
  {
    name: "Nona Lola",
    category: "Antojitos",
    promo: "Buffet alitas $169 (mar), litro cerveza $49 (mié), buffet pizza $99 (jue), cerveza $20 (vie)",
    valid: "Mar–Vie",
    address: "C. José María Morelos 1739-int. #7, Col. Americana",
    ig: "https://www.instagram.com/lanonalolagdl/?hl=en",
  },
  {
    name: "Hachiko Ramen",
    category: "Ramen",
    promo: "Todos los platos de ramen al 3×2",
    valid: "Sábados y Domingos",
    address: "Av. de las Américas 1319-Local A, Circunvalación Americas",
    ig: "https://www.instagram.com/hachiko_ramen_house/?hl=en",
  },
  {
    name: "Leche de Tigre",
    category: "Mariscos",
    promo: "Media orden de aguachile con bebida incluida por $120",
    valid: "Mié–Vie",
    address: "Ramos Millán 119",
    ig: "https://www.instagram.com/lechedetigregdl/",
  },
  {
    name: "Sushi Móvil",
    category: "Sushi",
    promo: "Rollos al 2×1 (mié), 4×3 en rollos y platillos (fin de semana)",
    valid: "Mié y Fin de semana",
    address: "Av. Pablo Neruda #3180",
    ig: "https://www.instagram.com/sushimovil/?hl=en",
  },
  {
    name: "Louie Burger",
    category: "Hamburguesas",
    promo: "Combo hamburguesa + papas + refresco por $199",
    valid: "Mar–Vie",
    address: "Varias sucursales",
    ig: "https://www.instagram.com/louieburgergdl/?hl=en",
  },
  {
    name: "Che Tacos",
    category: "Tacos",
    promo: "2×1 en chetacos de asada de 18:00 a 20:00h",
    valid: "Lun–Sáb",
    address: "Aries 4243, Zapopan",
    ig: "https://www.instagram.com/chetacos_gdl/?hl=en",
  },
  {
    name: "Giardino di Bacco",
    category: "Pastas",
    promo: "Pastas al 2×1 (lun), bebidas 3×1 de 17:00–20:00h (jue–sáb)",
    valid: "Lun y Jue–Sáb",
    address: "Av. José María Vigil 2997",
    ig: "https://www.instagram.com/giardinodibaccoprovi/",
  },
];

type Venue = {
  name: string; address: string; lat: number; lon: number;
  opening_hours?: string | null; is_open?: boolean | null;
  categories?: string[]; distance?: number;
};
type DayForecast = { day: string; peak_hour: number; peak_value: number; hourly: number[] };
type ForecastData = { venue_name: string; venue_address: string; analysis: DayForecast[] };

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export default function Home() {
  const [tab, setTab] = useState<"inicio" | "promociones">("inicio");
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapUrls, setMapUrls] = useState<Record<string, string>>({});
  const [modal, setModal] = useState<{ venue: Venue; data: ForecastData | null; loading: boolean } | null>(null);
  const [visibleCards, setVisibleCards] = useState<boolean[]>([]);
  const [userLocation, setUserLocation] = useState<{ lat: number; lon: number } | null>(null);
  const [locationStatus, setLocationStatus] = useState<"idle" | "granted" | "denied">("idle");
  const [promoFilter, setPromoFilter] = useState<string>("Todos");

  useEffect(() => { requestLocation(); }, []);

  function requestLocation() {
    if (!navigator.geolocation) { fetchFeatured(); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lon: pos.coords.longitude };
        setUserLocation(loc);
        setLocationStatus("granted");
        fetchFeatured(loc.lat, loc.lon);
      },
      () => { setLocationStatus("denied"); fetchFeatured(); },
      { timeout: 5000 }
    );
  }

  async function fetchFeatured(lat?: number, lon?: number) {
    try {
      const params = lat && lon ? `?lat=${lat}&lon=${lon}` : "";
      const res = await fetch(`${API_URL}/featured${params}`);
      const data = await res.json();
      let list: Venue[] = data.venues || [];
      if (lat && lon) {
        list = list.map(v => ({ ...v, distance: distanceKm(lat, lon, v.lat, v.lon) }))
          .sort((a, b) => (a.distance ?? 99) - (b.distance ?? 99));
      }
      setVenues(list);
      animateCards(list.length);
      fetchMapUrls(list);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  }

  function animateCards(count: number) {
    setVisibleCards(new Array(count).fill(false));
    for (let i = 0; i < count; i++) {
      setTimeout(() => {
        setVisibleCards(prev => { const n = [...prev]; n[i] = true; return n; });
      }, i * 100);
    }
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
    setTab("inicio");
    try {
      const locParam = userLocation ? `&lat=${userLocation.lat}&lon=${userLocation.lon}` : "";
      const res = await fetch(`${API_URL}/search?name=${encodeURIComponent(query)}&city=Guadalajara${locParam}`);
      const data = await res.json();
      let list: Venue[] = data.venues || [];
      if (userLocation) {
        list = list.map(v => ({ ...v, distance: distanceKm(userLocation.lat, userLocation.lon, v.lat, v.lon) }))
          .sort((a, b) => (a.distance ?? 99) - (b.distance ?? 99));
      }
      setVenues(list);
      animateCards(list.length);
      fetchMapUrls(list);
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
  const currentHour = new Date().getHours();
  const promoCategories = ["Todos", ...Array.from(new Set(PROMOS.map(p => p.category)))];
  const filteredPromos = promoFilter === "Todos" ? PROMOS : PROMOS.filter(p => p.category === promoFilter);

  return (
    <>
      <Header onSearch={handleSearch} />

      <main style={{ minHeight: '100vh', background: '#f5f3ee', padding: '3rem 1.5rem 4rem', position: 'relative', overflow: 'hidden' }}>

        <div style={{ position: 'absolute', top: '-80px', right: '-80px', width: '400px', height: '400px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(45,155,111,0.1) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: '100px', left: '-100px', width: '350px', height: '350px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(15,76,58,0.07) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <div className="hero-badge">
            <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#2d9b6f', display: 'inline-block', animation: 'pulse 1.5s infinite' }} />
            {locationStatus === "granted" ? "Cerca de ti · Guadalajara" : "En vivo · Guadalajara"}
          </div>
          <h1 style={{ fontFamily: 'Fraunces, serif', fontSize: 'clamp(2rem, 5vw, 3rem)', fontWeight: 700, color: '#0a1a12', lineHeight: 1.15, letterSpacing: '-0.03em', marginBottom: '0.75rem' }}>
            Menos fila,<br />
            <em style={{ color: '#2d9b6f', fontStyle: 'italic' }}>más sabor.</em>
          </h1>
          <p style={{ color: '#7a8c82', fontSize: '1rem', maxWidth: '400px', margin: '0 auto 1.5rem', lineHeight: 1.6 }}>
            Consulta horarios, afluencia y promociones de restaurantes en Guadalajara.
          </p>

          <div style={{ display: 'inline-flex', background: '#ebe9e3', borderRadius: '50px', padding: '4px', gap: '2px' }}>
            <button className={`tab-btn ${tab === "inicio" ? "active" : ""}`} onClick={() => setTab("inicio")}>Restaurantes</button>
            <button className={`tab-btn ${tab === "promociones" ? "active" : ""}`} onClick={() => setTab("promociones")}>Promociones</button>
          </div>
        </div>

        {/* TAB: RESTAURANTES */}
        {tab === "inicio" && (
          <>
            {loading && <div className="loading-pulse"><span /><span /><span /></div>}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem', maxWidth: '1100px', margin: '0 auto' }}>
              {!loading && venues.map((venue, i) => (
                <div key={i} className={`card ${visibleCards[i] ? 'visible' : ''}`} style={{ transitionDelay: `${i * 60}ms` }}>

                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '1.1rem 1.1rem 0.75rem' }}>
                    <div className="avatar">{venue.name[0]}</div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontWeight: 700, fontSize: '0.95rem', color: '#0a1a12', letterSpacing: '-0.01em', lineHeight: 1.3 }}>{venue.name}</p>
                      <p style={{ margin: '2px 0 6px', fontSize: '0.72rem', color: '#9aaa9f', lineHeight: 1.4 }}>{venue.address}</p>
                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                        <span className={venue.is_open === true ? 'open-badge' : venue.is_open === false ? 'closed-badge' : 'unknown-badge'}
                          style={{ fontSize: '0.68rem', fontWeight: 600, padding: '2px 8px', borderRadius: '50px' }}>
                          {venue.is_open === true ? 'Abierto' : venue.is_open === false ? 'Cerrado' : 'Sin información'}
                        </span>
                        {venue.distance != null && (
                          <span style={{ fontSize: '0.68rem', color: '#9aaa9f', fontWeight: 500 }}>
                            {venue.distance < 1 ? `${Math.round(venue.distance * 1000)}m` : `${venue.distance.toFixed(1)}km`}
                          </span>
                        )}
                      </div>
                      {venue.opening_hours && (
                        <p style={{ margin: '5px 0 0', fontSize: '0.68rem', color: '#7a8c82', lineHeight: 1.4 }}>{venue.opening_hours}</p>
                      )}
                    </div>
                  </div>

                  <div style={{ width: '100%', height: '140px', background: '#eee', overflow: 'hidden' }}>
                    {mapUrls[venue.address] ? (
                      <img
                        src={mapUrls[venue.address]}
                        alt="Mapa"
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ccc', fontSize: '0.8rem' }}>
                        Cargando mapa...
                      </div>
                    )}
                  </div>

                  <div style={{ padding: '0.875rem' }}>
                    <button className="btn-afluencia" onClick={() => handleForecast(venue)}>
                      Ver afluencia
                    </button>
                  </div>

                </div>
              ))}
            </div>
          </>
        )}

        {tab === "promociones" && (
          <div style={{ maxWidth: '1000px', margin: '0 auto' }}>

            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', justifyContent: 'center', marginBottom: '2rem' }}>
              {promoCategories.map(cat => (
                <button key={cat} onClick={() => setPromoFilter(cat)} style={{
                  padding: '6px 16px', borderRadius: '50px', border: 'none', cursor: 'pointer',
                  fontFamily: 'DM Sans, sans-serif', fontSize: '0.8rem', fontWeight: 600,
                  background: promoFilter === cat ? '#0f4c3a' : '#fff',
                  color: promoFilter === cat ? '#fff' : '#7a8c82',
                  boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                  transition: 'all 0.2s ease',
                }}>
                  {cat}
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1.25rem' }}>
              {filteredPromos.map((promo, i) => (
                <div key={i} className="promo-card visible" style={{ transitionDelay: `${i * 60}ms` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.75rem' }}>
                    <span style={{ fontSize: '0.68rem', background: '#f0fdf6', color: '#16a34a', padding: '3px 10px', borderRadius: '50px', fontWeight: 600 }}>
                      {promo.category}
                    </span>
                  </div>
                  <p style={{ fontFamily: 'Fraunces, serif', fontWeight: 700, fontSize: '1rem', color: '#0a1a12', marginBottom: '4px' }}>{promo.name}</p>
                  <p style={{ fontSize: '0.84rem', color: '#444', marginBottom: '12px', lineHeight: 1.5 }}>{promo.promo}</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <div style={{ fontSize: '0.72rem', color: '#7a8c82' }}>Vigencia: {promo.valid}</div>
                    <div style={{ fontSize: '0.72rem', color: '#9aaa9f' }}>{promo.address}</div>
                    <a href={promo.ig} target="_blank" rel="noopener noreferrer"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '5px', marginTop: '6px', fontSize: '0.75rem', color: '#0f4c3a', fontWeight: 600, textDecoration: 'none' }}>
                      Ver en Instagram →
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {modal && (
        <div className="modal-overlay" onClick={() => setModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>

            <div className="modal-header">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h2 style={{ fontFamily: 'Fraunces, serif', fontSize: '1.5rem', fontWeight: 700, color: '#0a1a12', letterSpacing: '-0.02em', marginBottom: '3px' }}>
                    {modal.venue.name}
                  </h2>
                  <p style={{ fontSize: '0.75rem', color: '#9aaa9f', margin: 0 }}>{modal.venue.address}</p>
                  {modal.venue.opening_hours && (
                    <p style={{ fontSize: '0.75rem', color: '#7a8c82', marginTop: '4px' }}>{modal.venue.opening_hours}</p>
                  )}
                </div>
                <button onClick={() => setModal(null)} style={{
                  background: '#ebe9e3', border: 'none', borderRadius: '10px',
                  width: '34px', height: '34px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0, marginLeft: '1rem', color: '#666',
                  transition: 'background 0.15s', fontSize: '0.9rem',
                }}
                  onMouseEnter={e => (e.currentTarget.style.background = '#ddd')}
                  onMouseLeave={e => (e.currentTarget.style.background = '#ebe9e3')}
                >✕</button>
              </div>

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
                const active = day.hourly.map((v, h) => ({ v, h })).filter(x => x.v > 0);
                const startH = active.length ? active[0].h : 6;
                const endH = active.length ? active[active.length - 1].h + 1 : 14;
                const visible = day.hourly.slice(startH, endH);

                return (
                  <div key={i} className={`day-card ${isToday ? 'today' : ''}`}>
                    <p style={{ fontSize: '0.82rem', fontWeight: 700, color: isToday ? '#0f4c3a' : '#555', marginBottom: '0.875rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isToday && <span style={{ width: '7px', height: '7px', borderRadius: '50%', background: '#2d9b6f', display: 'inline-block', flexShrink: 0 }} />}
                      {DAYS_ES[day.day] || day.day}
                      {isToday && <span style={{ color: '#2d9b6f', fontWeight: 500 }}>— Hoy</span>}
                      {isToday && <span style={{ marginLeft: 'auto', fontSize: '0.7rem', color: '#9aaa9f', fontWeight: 400 }}>Pico a las {day.peak_hour}:00h</span>}
                    </p>
                    <div className="bar-container">
                      {visible.map((val, idx) => {
                        const h = startH + idx;
                        const height = maxVal > 0 ? Math.max((val / maxVal) * 100, val > 0 ? 6 : 2) : 2;
                        const isNow = isToday && currentHour === h;
                        const color = isNow ? '#60a5fa' : val === 0 ? '#e8e6e0' : val < 35 ? '#4ade80' : val < 65 ? '#facc15' : '#f87171';
                        return (
                          <div key={idx} className="bar-wrap">
                            <div className="bar" style={{ height: `${height}%`, background: color }} />
                            <div className="bar-tooltip">{h}:00 — {val}%</div>
                          </div>
                        );
                      })}
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.68rem', color: '#bbb', marginTop: '6px', paddingTop: '4px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
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