"""
Utilitaires géospatiaux — OSRM routing + helpers.
"""
import requests
from django.conf import settings
from django.contrib.gis.geos import LineString


OSRM_BASE = getattr(settings, 'OSRM_BASE_URL', 'http://router.project-osrm.org')


def calculer_itineraire_osrm(point_depart, point_arrivee):
    """
    Calcule l'itinéraire entre deux PointFields via l'API OSRM.
    Retourne: {'distance_km': float, 'duree_min': int, 'geometry': LineString}
    """
    lon1, lat1 = point_depart.x, point_depart.y
    lon2, lat2 = point_arrivee.x, point_arrivee.y

    url = f'{OSRM_BASE}/route/v1/driving/{lon1},{lat1};{lon2},{lat2}'
    params = {
        'overview': 'full',
        'geometries': 'geojson',
        'steps': 'false',
    }

    try:
        resp = requests.get(url, params=params, timeout=5)
        resp.raise_for_status()
        data = resp.json()

        if data.get('code') != 'Ok' or not data.get('routes'):
            return None

        route = data['routes'][0]
        geometry_coords = route['geometry']['coordinates']
        linestring = LineString(geometry_coords, srid=4326)

        return {
            'distance_km': round(route['distance'] / 1000, 2),
            'duree_min': round(route['duration'] / 60),
            'geometry': linestring,
        }
    except Exception:
        return None


def optimiser_tournee_osrm(points):
    """
    Optimise l'ordre des stops pour une tournée multi-livraisons (OSRM /trip).
    points: liste de PointField
    Retourne: liste d'indices dans l'ordre optimal
    """
    if len(points) < 2:
        return list(range(len(points)))

    coords = ';'.join(f'{p.x},{p.y}' for p in points)
    url = f'{OSRM_BASE}/trip/v1/driving/{coords}'
    params = {'roundtrip': 'false', 'source': 'first', 'destination': 'last', 'geometries': 'geojson'}

    try:
        resp = requests.get(url, params=params, timeout=5)
        data = resp.json()
        if data.get('code') != 'Ok':
            return list(range(len(points)))
        waypoints = data.get('waypoints', [])
        order = sorted(range(len(waypoints)), key=lambda i: waypoints[i]['waypoint_index'])
        return [waypoints[i]['trips_index'] for i in order]
    except Exception:
        return list(range(len(points)))


def calculer_distance_km(point1, point2):
    """Distance à vol d'oiseau entre deux PointFields (degrés → km)."""
    from django.contrib.gis.measure import Distance
    from django.contrib.gis.db.models.functions import Distance as DistanceFunc
    import math

    lat1, lon1 = math.radians(point1.y), math.radians(point1.x)
    lat2, lon2 = math.radians(point2.y), math.radians(point2.x)
    dlat = lat2 - lat1
    dlon = lon2 - lon1
    a = math.sin(dlat / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin(dlon / 2) ** 2
    c = 2 * math.asin(math.sqrt(a))
    return round(c * 6371, 2)


def point_dans_zone(point, polygon):
    """Vérifie si un PointField est dans un PolygonField."""
    if polygon is None:
        return True
    return polygon.contains(point)
