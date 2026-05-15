"use client";
import Image from 'next/image';
import { useState, useImperativeHandle, forwardRef } from 'react';

export type HeaderHandle = { clearQuery: () => void };

const Header = forwardRef<HeaderHandle, { onSearch?: (query: string) => void; onNavigate?: (tab: string) => void }>(
  function Header({ onSearch, onNavigate }, ref) {
  const [query, setQuery] = useState('');
  const [focused, setFocused] = useState(false);

  useImperativeHandle(ref, () => ({ clearQuery: () => setQuery('') }));

  return (
    <header style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '0.875rem 2rem',
      background: 'rgba(255,255,255,0.95)',
      backdropFilter: 'blur(12px)',
      borderBottom: '1px solid rgba(0,0,0,0.06)',
      position: 'sticky',
      top: 0,
      zIndex: 100,
      boxShadow: '0 1px 20px rgba(0,0,0,0.06)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Image src="/XFLogoNew.png" alt="XERO FILA Logo" width={44} height={44} style={{ borderRadius: '10px' }} />
      </div>

      <div style={{ flex: 1, margin: '0 2.5rem', position: 'relative' }}>
        <svg
          width="15" height="15" viewBox="0 0 24 24" fill="none"
          stroke="#888" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
          style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
        >
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar restaurantes en Guadalajara..."
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          onKeyDown={(e) => { if (e.key === 'Enter') onSearch?.(query); }}
          style={{
            width: '100%',
            padding: '0.6rem 1rem 0.6rem 2.4rem',
            borderRadius: '50px',
            border: focused ? '2px solid #2d9b6f' : '2px solid #e8e8e8',
            background: focused ? '#fff' : '#f7f7f7',
            fontSize: '0.875rem',
            outline: 'none',
            transition: 'all 0.2s ease',
            boxShadow: focused ? '0 0 0 4px rgba(45,155,111,0.1)' : 'none',
            fontFamily: 'inherit',
          }}
        />
      </div>

      <nav>
        <ul style={{ display: 'flex', listStyle: 'none', gap: '4px', margin: 0, padding: 0 }}>
          {[{ label: 'Inicio', tab: 'inicio' }, { label: 'Promociones', tab: 'promociones' }].map(({ label, tab }) => (
            <li key={tab}>
              <button
                onClick={() => { onNavigate?.(tab); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '8px',
                  fontSize: '0.875rem',
                  fontWeight: 600,
                  color: '#444',
                  background: 'transparent',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  fontFamily: 'inherit',
                  display: 'block',
                }}
                onMouseEnter={e => (e.currentTarget.style.background = '#f0f0f0')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >{label}</button>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
});

export default Header;