import json
import urllib.request
from django.contrib.gis.geos import Point, GEOSGeometry, LineString
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.measure import D


def fondateurs_proches(client_lat, client_lng, rayon_km=10, categorie=None):
    """
    Retourne les fondateurs vérifiés dans un rayon donné, triés par distance.
    
    Usage:
        qs = fondateurs_proches(33.99, -6.85, rayon_km=5, categorie='pharmacie')
    """
    from fondateurs.models import Fondateur

    client_point = Point(client_lng, client_lat, srid=4326)
    qs = Fondateur.objects.filter(
        is_verified=True,
        location__distance_lte=(client_point, D(km=rayon_km))
    ).annotate(
        distance=Distance('location', client_point)
    ).order_by('distance')

    if categorie:
        qs = qs.filter(categorie=categorie)

    return qs


def transporteurs_disponibles_proches(boutique_point, rayon_km=5, capacite_min=0):
    """
    Retourne les transporteurs disponibles et vérifiés proches d'une boutique.
    
    Args:
        boutique_point: Point GeoDjango (localisation de la boutique)
        rayon_km: rayon de recherche
        capacite_min: capacité minimale requise en kg
    """
    from accounts.models import ChauffeurProfile

    qs = ChauffeurProfile.objects.filter(
        disponible=True,
        is_verified=True,
        capacite_kg__gte=capacite_min,
        position_actuelle__isnull=False,
        position_actuelle__distance_lte=(boutique_point, D(km=rayon_km))
    ).annotate(
        distance=Distance('position_actuelle', boutique_point)
    ).order_by('distance')

    return qs


def verifier_zone_livraison(client_point, fondateur):
    """
    Vérifie que le point client est dans la zone de livraison du fondateur.
    
    Returns:
        bool: True si la livraison est possible
    """
    if not fondateur.zone_livraison:
        return True  # Pas de zone définie = livraison partout
    return fondateur.zone_livraison.contains(client_point)


def calculer_itineraire_osrm(depart_point, arrivee_point):
    """
    Appelle l'API OSRM pour calculer l'itinéraire entre deux points.
    
    Args:
        depart_point: Point GeoDjango (lon, lat)
        arrivee_point: Point GeoDjango (lon, lat)
    
    Returns:
        dict avec keys: distance_km, duree_min, geometry (LineString GeoDjango)
        ou None en cas d'échec.
    """
    try:
        lon1, lat1 = depart_point.coords
        lon2, lat2 = arrivee_point.coords

        url = (
            f"http://router.project-osrm.org/route/v1/driving/"
            f"{lon1},{lat1};{lon2},{lat2}"
            f"?overview=full&geometries=geojson"
        )
        req = urllib.request.Request(url, headers={'User-Agent': 'DeliverMap/1.0'})
        with urllib.request.urlopen(req, timeout=10) as response:
            data = json.loads(response.read().decode())

        if data.get('code') == 'Ok' and data.get('routes'):
            route = data['routes'][0]
            distance_km = round(route['distance'] / 1000, 2)
            duree_min = int(route['duration'] / 60)
            geom_str = json.dumps(route['geometry'])
            trace = GEOSGeometry(geom_str)

            return {
                'distance_km': distance_km,
                'duree_min': duree_min,
                'trace': trace,
                'geojson': route['geometry'],
                'legs': route.get('legs', []),
            }
    except Exception as e:
        print(f"[OSRM] Erreur calcul itinéraire: {e}")
    return None


def optimiser_tournee_osrm(liste_points):
    """
    Utilise l'endpoint OSRM /trip pour optimiser une tournée multi-stops.
    
    Args:
        liste_points: liste de Point GeoDjango
    
    Returns:
        dict avec l'ordre optimal et le tracé, ou None.
    """
    if len(liste_points) < 2:
        return None

    try:
        coords = ';'.join(f'{p.x},{p.y}' for p in liste_points)
        url = (
            f"http://router.project-osrm.org/trip/v1/driving/{coords}"
            f"?roundtrip=false&source=first&destination=last"
            f"&overview=full&geometries=geojson"
        )
        req = urllib.request.Request(url, headers={'User-Agent': 'DeliverMap/1.0'})
        with urllib.request.urlopen(req, timeout=15) as response:
            data = json.loads(response.read().decode())

        if data.get('code') == 'Ok' and data.get('trips'):
            trip = data['trips'][0]
            waypoints = data.get('waypoints', [])
            ordre = sorted(waypoints, key=lambda w: w['waypoint_index'])
            geom_str = json.dumps(trip['geometry'])
            trace = GEOSGeometry(geom_str)

            return {
                'distance_totale_km': round(trip['distance'] / 1000, 2),
                'duree_totale_min': int(trip['duration'] / 60),
                'ordre_waypoints': [w['waypoint_index'] for w in ordre],
                'trace': trace,
            }
    except Exception as e:
        print(f"[OSRM Trip] Erreur optimisation: {e}")
    return None


def distance_entre_points(point1, point2):
    """
    Calcule la distance en km entre deux Point GeoDjango.
    Utilise la formule Haversine (approx. sphérique).
    """
    from math import radians, sin, cos, sqrt, atan2
    lat1, lon1 = point1.y, point1.x
    lat2, lon2 = point2.y, point2.x
    R = 6371  # km

    dlat = radians(lat2 - lat1)
    dlon = radians(lon2 - lon1)
    a = sin(dlat / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(dlon / 2) ** 2
    c = 2 * atan2(sqrt(a), sqrt(1 - a))
    return round(R * c, 3)


def calculer_frais_livraison(distance_km, vehicule_type='voiture', poids_kg=0):
    """
    Calcule les frais de livraison selon la distance et le type de véhicule.
    Tarifs de base (MAD):
        moto:        5 MAD/km + 10 MAD fixe
        voiture:     8 MAD/km + 15 MAD fixe
        camionnette: 12 MAD/km + 20 MAD fixe
        camion:      18 MAD/km + 30 MAD fixe
    """
    TARIFS = {
        'moto':        {'par_km': 5,  'fixe': 10},
        'voiture':     {'par_km': 8,  'fixe': 15},
        'camionnette': {'par_km': 12, 'fixe': 20},
        'camion':      {'par_km': 18, 'fixe': 30},
        'fourgon':     {'par_km': 12, 'fixe': 20},
    }
    tarif = TARIFS.get(vehicule_type, TARIFS['voiture'])
    frais = tarif['fixe'] + tarif['par_km'] * distance_km
    # Supplément poids > 20kg
    if poids_kg > 20:
        frais += (poids_kg - 20) * 0.5
    return round(frais, 2)
