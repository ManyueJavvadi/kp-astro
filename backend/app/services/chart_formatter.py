"""
Shared chart formatter — converts raw chart_engine output to frontend-ready format.
Used by both astrologer.py (workspace) and compatibility_engine.py (match charts).
"""
from app.services.telugu_terms import (
    get_planet_telugu, get_planet_short, get_sign_telugu,
    get_nakshatra_telugu, get_house_telugu,
)


def _get_planet_house(planet_lon: float, cusp_longitudes: list) -> int:
    """Determine which house a planet occupies given cusp longitudes."""
    for i in range(12):
        cusp_start = cusp_longitudes[i] % 360
        cusp_end = cusp_longitudes[(i + 1) % 12] % 360
        planet = planet_lon % 360
        if cusp_end > cusp_start:
            if cusp_start <= planet < cusp_end:
                return i + 1
        else:
            if planet >= cusp_start or planet < cusp_end:
                return i + 1
    return 1


def format_chart_for_frontend(chart: dict) -> dict:
    """
    Convert raw generate_chart() output to frontend-ready planets[] + cusps[] arrays.
    Matches the exact format expected by SouthIndianChart.tsx and HousePanel.tsx.
    """
    cusp_longitudes = [data.get("cusp_longitude", 0) for data in chart["cusps"].values()]

    planets_formatted = []
    for planet, data in chart["planets"].items():
        planet_lon = data.get("longitude", 0)
        house_num = _get_planet_house(planet_lon, cusp_longitudes)
        planets_formatted.append({
            "planet_en": planet,
            "planet_te": get_planet_telugu(planet),
            "planet_short": get_planet_short(planet),
            "sign_en": data.get("sign", ""),
            "sign_te": get_sign_telugu(data.get("sign", "")),
            "longitude": round(planet_lon, 4),
            "degree_in_sign": round(planet_lon % 30, 2),
            "nakshatra_en": data.get("nakshatra", ""),
            "nakshatra_te": get_nakshatra_telugu(data.get("nakshatra", "")),
            "star_lord_en": data.get("star_lord", ""),
            "star_lord_te": get_planet_telugu(data.get("star_lord", "")),
            "sub_lord_en": data.get("sub_lord", ""),
            "sub_lord_te": get_planet_telugu(data.get("sub_lord", "")),
            "house": str(house_num),
            "retrograde": data.get("retrograde", False),
        })

    cusps_formatted = []
    for i, (house, data) in enumerate(chart["cusps"].items(), 1):
        cusps_formatted.append({
            "house_num": i,
            "house_te": get_house_telugu(i),
            "sign_en": data.get("sign", ""),
            "sign_te": get_sign_telugu(data.get("sign", "")),
            "cusp_longitude": round(data.get("cusp_longitude", 0), 4),
            "degree_in_sign": round(data.get("cusp_longitude", 0) % 30, 2),
            "nakshatra_en": data.get("nakshatra", ""),
            "nakshatra_te": get_nakshatra_telugu(data.get("nakshatra", "")),
            "star_lord_en": data.get("star_lord", ""),
            "star_lord_te": get_planet_telugu(data.get("star_lord", "")),
            "sub_lord_en": data.get("sub_lord", ""),
            "sub_lord_te": get_planet_telugu(data.get("sub_lord", "")),
        })

    return {
        "planets": planets_formatted,
        "cusps": cusps_formatted,
    }
