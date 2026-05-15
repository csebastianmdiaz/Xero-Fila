from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pathlib import Path
import requests
import json
import math
import random
import os

_BASE_DIR = Path(__file__).parent
load_dotenv(_BASE_DIR / ".env")

HERE_KEY = os.getenv("HERE_KEY")
BEST_TIME_URL = os.getenv("BEST_TIME_URL")
CACHE_FILE = str(_BASE_DIR / "venues_cache.json")

# Limpiar caché al iniciar para forzar coordenadas frescas de HERE
if os.path.exists(CACHE_FILE):
    os.remove(CACHE_FILE)
    print(f"DEBUG: Caché borrada → {CACHE_FILE}")

print(f"DEBUG: HERE_KEY={'<no configurada>' if not HERE_KEY else HERE_KEY[:5] + '...'}")
print(f"DEBUG: BEST_TIME_URL={'<no configurada>' if not BEST_TIME_URL else BEST_TIME_URL[:40] + '...'}")

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

#GET /health – quick liveness check
@app.get("/health")
def health():
    return {
        "status": "ok",
        "here_key_set": bool(HERE_KEY),
        "besttime_url_set": bool(BEST_TIME_URL),
    }

#Cache
def load_cache():
    if os.path.exists(CACHE_FILE):
        with open(CACHE_FILE, "r") as f:
            return json.load(f)
    return {}

def save_cache(cache):
    with open(CACHE_FILE, "w") as f:
        json.dump(cache, f, indent=2, ensure_ascii=False)

#BestTime Keys
def get_besttime_keys():
    if not BEST_TIME_URL:
        return None, None
    try:
        response = requests.get(BEST_TIME_URL, timeout=10)
        if response.status_code != 200:
            return None, None
        res = response.json()
        return res["api_key_private"], res["api_key_public"]
    except Exception:
        return None, None

#HERE API
def parse_opening_hours(raw):
    if not raw:
        return None
    try:
        text = raw[0].get("text", [])
        return text[0] if text else None
    except:
        return None

def search_venues_here(name, city=None, limit=10, lat=None, lon=None):
    if not HERE_KEY:
        raise HTTPException(
            status_code=503,
            detail="HERE_KEY no configurada. Agrega HERE_KEY en backend/.env"
        )
    query = f"{name} {city}" if city else name
    params = {
        "q": query,
        "limit": min(limit * 3, 100),  # pedir más para compensar duplicados
        "apiKey": HERE_KEY,
        "lang": "es",
    }
    if lat and lon:
        params["at"] = f"{lat},{lon}"
    else:
        params["in"] = "circle:20.6597,-103.3496;r=50000"

    response = requests.get("https://discover.search.hereapi.com/v1/discover", params=params)
    if response.status_code != 200:
        return []
    venues = []
    seen_coords: set[tuple] = set()
    for r in response.json().get("items", []):
        v_lat = r.get("position", {}).get("lat")
        v_lon = r.get("position", {}).get("lng")
        # Redondear a 4 decimales (≈11m de precisión) para detectar duplicados
        coord_key = (round(v_lat, 4), round(v_lon, 4)) if v_lat and v_lon else None
        if coord_key and coord_key in seen_coords:
            continue
        if coord_key:
            seen_coords.add(coord_key)
        opening_hours = parse_opening_hours(r.get("openingHours"))
        is_open = None
        oh_raw = r.get("openingHours")
        if oh_raw:
            is_open = oh_raw[0].get("isOpen", None)
        venues.append({
            "name": r.get("title"),
            "address": r.get("address", {}).get("label", ""),
            "lat": v_lat,
            "lon": v_lon,
            "opening_hours": opening_hours,
            "is_open": is_open,
            "categories": [c.get("name","") for c in r.get("categories", [])],
        })
        if len(venues) >= limit:
            break
    return venues

#BestTime API
import re

_NOISE = re.compile(
    r'\b(\d{4,6}|jal\.?|jalisco|m[eé]xico|mexico|ags\.?|aguascalientes|gdl\.?)\b',
    re.IGNORECASE,
)

def clean_address(name, address):
    # Quitar el nombre del local si aparece al inicio
    if address.lower().startswith(name.lower()):
        address = address[len(name):].lstrip(", ")
    parts = [p.strip() for p in address.split(",")]
    # Quitar partes que sean solo el nombre del local
    parts = [p for p in parts if name.lower() not in p.lower()]
    # Quitar partes que sean solo ruido: CP, estado, país
    cleaned = []
    for p in parts:
        stripped = _NOISE.sub('', p).strip(" .-")
        if stripped:  # si queda algo con sentido, conservar
            cleaned.append(stripped)
    # Quedarnos con calle + ciudad (max 2 partes)
    result = ", ".join(cleaned[:2])
    return result or address

def get_forecast_new(private_key, venue_name, venue_address):
    print(f"DEBUG BestTime POST /forecasts → venue='{venue_name}', address='{venue_address}'")
    response = requests.post(
        "https://besttime.app/api/v1/forecasts",
        params={
            "api_key_private": private_key,
            "venue_name": venue_name,
            "venue_address": venue_address,
        }
    )
    print(f"DEBUG BestTime response: {response.status_code} — {response.text[:300]}")
    if response.status_code != 200:
        return None
    return response.json()

def get_forecast_cached(public_key, venue_id):
    response = requests.get(
        "https://besttime.app/api/v1/forecasts/week",
        params={
            "api_key_public": public_key,
            "venue_id": venue_id,
        }
    )
    if response.status_code != 200:
        return None
    return response.json()

def get_forecast(private_key, public_key, venue_name, venue_address):
    cache = load_cache()
    cache_key = venue_address.lower().strip()
    if cache_key in cache:
        venue_id = cache[cache_key]["venue_id"]
        return get_forecast_cached(public_key, venue_id)
    clean_addr = clean_address(venue_name, venue_address)
    data = get_forecast_new(private_key, venue_name, clean_addr)
    if data:
        venue_id = data.get("venue_info", {}).get("venue_id")
        if venue_id:
            cache[cache_key] = {
                "venue_id": venue_id,
                "venue_name": venue_name,
                "venue_address": venue_address,
            }
            save_cache(cache)
    return data

#Endpoints

#GET /search?name=Carl's Jr&city=Zapopan
@app.get("/search")
def search(name: str, city: str = None, lat: float = None, lon: float = None):
    venues = search_venues_here(name, city, lat=lat, lon=lon)
    if not venues:
        raise HTTPException(status_code=404, detail="No se encontraron venues.")
    return {"venues": venues}

#GET /featured - Regresa restaurantes recomendados en Guadalajara
@app.get("/featured")
def featured(lat: float = None, lon: float = None):
    venues = search_venues_here("restaurantes", "Guadalajara", limit=6, lat=lat, lon=lon)
    if not venues:
        raise HTTPException(status_code=404, detail="No se encontraron venues.")
    return {"venues": venues}

#GET /featured-fallback - Devuelve lista estática si HERE_KEY no está lista
@app.get("/featured-fallback")
def featured_fallback():
    return {"venues": []}

#GET /map?lat=20.67&lon=-103.34
@app.get("/map")
def get_map(lat: float, lon: float):
    zoom = 15
    n = 2 ** zoom
    x = int((lon + 180) / 360 * n)
    y = int((1 - math.asinh(math.tan(math.radians(lat))) / math.pi) / 2 * n)
    url = f"https://maps.hereapi.com/v3/base/mc/{zoom}/{x}/{y}/png?apiKey={HERE_KEY}"
    return {"map_url": url}

DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]

def generate_mock_forecast(venue_name: str, venue_address: str):
    analysis = []
    for day in DAYS_OF_WEEK:
        hourly = []
        for h in range(24):
            if h < 7:
                base = random.randint(0, 10)
            elif h < 11:
                base = random.randint(20, 50)
            elif h < 15:
                base = random.randint(55, 90)
            elif h < 18:
                base = random.randint(30, 60)
            elif h < 22:
                base = random.randint(60, 95)
            else:
                base = random.randint(10, 35)
            hourly.append(base)
        peak_val = max(hourly)
        analysis.append({
            "day": day,
            "peak_hour": hourly.index(peak_val),
            "peak_value": peak_val,
            "hourly": hourly,
        })
    return {
        "venue_name": venue_name,
        "venue_address": venue_address,
        "analysis": analysis,
        "is_mock": True,
    }

#POST /forecast
#Body: { "name": "Carl's Jr", "address": "Avenida Patria 5029..." }
class VenueRequest(BaseModel):
    name: str
    address: str

@app.post("/forecast")
def forecast(venue: VenueRequest):
    private_key, public_key = get_besttime_keys()
    if not private_key:
        print("DEBUG: Sin keys de BestTime → usando mock data")
        return generate_mock_forecast(venue.name, venue.address)
    data = get_forecast(private_key, public_key, venue.name, venue.address)
    if not data:
        print("DEBUG: BestTime no retornó datos → usando mock data")
        return generate_mock_forecast(venue.name, venue.address)
    venue_info = data.get("venue_info", {})
    analysis = []
    for day in data.get("analysis", []):
        hours = day["day_raw"]
        analysis.append({
            "day": day["day_info"]["day_text"],
            "peak_hour": hours.index(max(hours)),
            "peak_value": max(hours),
            "hourly": hours,
        })
    return {
        "venue_name": venue_info.get("venue_name"),
        "venue_address": venue_info.get("venue_address"),
        "analysis": analysis,
        "is_mock": False,
    }