import Image from 'next/image';

export default function Header() {
  return (
    <header style={{ 
      display: 'flex', 
      justifyContent: 'space-between', 
      alignItems: 'center', 
      padding: '1rem 2rem',
      borderBottom: '1px solid #eaeaea'
    }}>
      {/* Logo del proyecto */}
      <div style={{ display: 'flex', alignItems: 'center' }}>
        <Image 
          src="/XFLogo.png" 
          alt="XERO FILA Logo" 
          width={50} 
          height={50} 
        />
        <span style={{ fontWeight: 'bold', marginLeft: '10px', fontSize: '1.2rem' }}>
          XERO FILA
        </span>
      </div>

      {/* RF05: Barra de búsqueda de restaurantes */}
      <div style={{ flex: 1, margin: '0 2rem' }}>
        <input 
          type="text" 
          placeholder="Buscar restaurantes en Guadalajara..." 
          style={{ 
            width: '100%', 
            padding: '0.5rem 1rem', 
            borderRadius: '20px', 
            border: '1px solid #ccc' 
          }}
        />
      </div>

      {/* Navegación básica */}
      <nav>
        <ul style={{ display: 'flex', listStyle: 'none', gap: '15px' }}>
          <li><a href="#">Inicio</a></li>
          <li><a href="#">Promociones</a></li>
        </ul>
      </nav>
    </header>
  );
}