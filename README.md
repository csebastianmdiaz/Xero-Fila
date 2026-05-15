# Xero-Fila

Plataforma web para consultar horarios, afluencia de personas y promociones de restaurantes en Guadalajara, Jalisco. Permite a los usuarios encontrar el mejor momento para visitar un local y evitar tiempos de espera innecesarios.

---

## Stack Tecnologico

| Capa | Tecnologia | Version |
|---|---|---|
| Frontend | Next.js + TypeScript | 16.x |
| Estilos | Tailwind CSS | 4.x |
| Mapas (cliente) | React-Leaflet | 5.x |
| Backend | FastAPI (Python) | - |
| Geocodificacion y busqueda | HERE Geocoding & Search API | v1 |
| Afluencia | BestTime API | v1 |

---

## Funcionalidades Principales

**Busqueda de locales**
Consulta restaurantes y negocios en el area metropolitana de Guadalajara usando la HERE Geocoding & Search API. Los resultados se desduplicam por coordenadas para evitar entradas repetidas.

**Visualizacion en mapa**
Los locales encontrados se renderizan sobre un mapa interactivo con marcadores. Al seleccionar un marcador se despliega un panel lateral con informacion del lugar.

**Graficas de afluencia**
Mediante la BestTime API se genera un pronostico de afluencia horaria para cada dia de la semana, permitiendo identificar los momentos de mayor y menor concurrencia antes de visitar el lugar.

**Seccion de promociones**
Listado curado de promociones activas en restaurantes populares de la ciudad, con dia de validez, descripcion y enlace a Instagram.

**Verificacion de estado**
Endpoint `/health` en el backend que confirma la disponibilidad del servidor y la correcta configuracion de las variables de entorno.

---

## Arquitectura

El proyecto esta dividido en dos procesos independientes que se comunican a traves de HTTP.

```
Cliente (Next.js)          Servidor (FastAPI)
  Puerto 3000        <-->    Puerto 8000
  app/               HTTP    backend/
  page.tsx                   APIs.py
  components/
    Header.tsx
    VenueMap.tsx
```

El frontend consume la API del backend mediante la variable de entorno `NEXT_PUBLIC_API_URL`. El backend aplica CORS abierto en desarrollo para permitir solicitudes desde cualquier origen. En produccion se debe restringir `allow_origins` al dominio del cliente.

---

## Instalacion

### Requisitos previos

- Node.js 20 o superior
- Python 3.11 o superior
- Un entorno virtual de Python (`.venv`)

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd Xero-Fila
```

### 2. Configurar el backend

```bash
# Crear el entorno virtual (solo la primera vez)
python -m venv .venv

# Activar el entorno virtual
# Windows (PowerShell)
.\.venv\Scripts\Activate.ps1

# macOS / Linux
source .venv/bin/activate

# Instalar dependencias de Python
pip install -r backend/requirements.txt
```

Crear el archivo de variables de entorno del backend:

```bash
# Dentro de backend/
cp backend/.env.example backend/.env
# Editar backend/.env con tus claves reales
```

Iniciar el servidor FastAPI:

```bash
uvicorn backend.APIs:app --reload --port 8000
```

### 3. Configurar el frontend

```bash
# Instalar dependencias de Node
npm install

# Crear el archivo de variables de entorno del frontend
cp .env.local.example .env.local
# Editar .env.local con tus valores

# Iniciar el servidor de desarrollo
npm run dev
```

La aplicacion estara disponible en [http://localhost:3000](http://localhost:3000).

---

## Variables de Entorno

### Backend — `backend/.env`

| Variable | Descripcion |
|---|---|
| `HERE_KEY` | API key de HERE para geocodificacion y busqueda de lugares |
| `BEST_TIME_URL` | URL del endpoint que devuelve las claves privada y publica de BestTime |

### Frontend — `.env.local`

| Variable | Descripcion |
|---|---|
| `NEXT_PUBLIC_API_URL` | URL base del servidor FastAPI (por defecto `http://localhost:8000`) |

> **Nota:** Nunca subas archivos `.env` ni `.env.local` al repositorio. Asegurate de que esten listados en `.gitignore`.

---

## Scripts disponibles

| Comando | Descripcion |
|---|---|
| `npm run dev` | Inicia el servidor de desarrollo de Next.js |
| `npm run build` | Genera el build de produccion |
| `npm run start` | Inicia el servidor de produccion |
| `npm run lint` | Ejecuta ESLint sobre el proyecto |

---

## Estructura del Proyecto

```
Xero-Fila/
├── app/
│   ├── globals.css
│   ├── layout.tsx
│   ├── page.tsx
│   └── components/
│       ├── Header.tsx
│       └── VenueMap.tsx
├── backend/
│   ├── APIs.py
│   └── venues_cache.json
├── public/
├── next.config.ts
├── tsconfig.json
└── package.json
```
