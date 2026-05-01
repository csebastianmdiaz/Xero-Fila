from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
import requests
import json
import os

load_dotenv()

HERE_KEY = os.getenv("HERE_KEY")
BEST_TIME_URL = os.getenv("BEST_TIME_URL")
CACHE_FILE = "venues_cache.json"

app = FastAPI()

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
    response = requests.get(BEST_TIME_URL)
    if response.status_code != 200:
        return None, None
    res = response.json()
    return res["api_key_private"], res["api_key_public"]

#HERE API
def search_venues_here(name, city=None, limit=10):
    query = f"{name} {city}" if city else name
    params = {
        "q": query,
        "limit": limit,
        "apiKey": HERE_KEY,
        "lang": "es",
        "in": "circle:23.6345,-102.5528;r=2000000",
    }
    response = requests.get("https://discover.search.hereapi.com/v1/discover", params=params)
    if response.status_code != 200:
        return []
    venues = []
    for r in response.json().get("items", []):
        venues.append({
            "name": r.get("title"),
            "address": r.get("address", {}).get("label", ""),
            "lat": r.get("position", {}).get("lat"),
            "lon": r.get("position", {}).get("lng"),
        })
    return venues

#BestTime API
def clean_address(name, address):
    if address.lower().startswith(name.lower()):
        address = address[len(name):].lstrip(", ")
    parts = address.split(",")
    if parts[0].strip().lower() in name.lower() or name.lower() in parts[0].strip().lower():
        address = ",".join(parts[1:]).strip()
    return address

def get_forecast_new(private_key, venue_name, venue_address):
    response = requests.post(
        "https://besttime.app/api/v1/forecasts",
        params={
            "api_key_private": private_key,
            "venue_name": venue_name,
            "venue_address": venue_address,
        }
    )
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
def search(name: str, city: str = None):
    venues = search_venues_here(name, city)
    if not venues:
        raise HTTPException(status_code=404, detail="No se encontraron venues.")
    return {"venues": venues}


#POST /forecast
#Body: { "name": "Carl's Jr", "address": "Avenida Patria 5029..." }
class VenueRequest(BaseModel):
    name: str
    address: str

@app.post("/forecast")
def forecast(venue: VenueRequest):
    private_key, public_key = get_besttime_keys()
    if not private_key:
        raise HTTPException(status_code=500, detail="Error obteniendo keys de BestTime.")

    data = get_forecast(private_key, public_key, venue.name, venue.address)
    if not data:
        raise HTTPException(status_code=404, detail="No se pudo obtener el forecast para este venue.")

    # Parsear y regresar solo lo relevante
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
    }