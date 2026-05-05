import json
import urllib.request
from django.contrib.gis.geos import GEOSGeometry
from django.contrib.gis.db.models.functions import Distance
from transporteurs.models import Vehicule

class CommandeService:
    @staticmethod
    def affecter_transporteur_automatique(commande):
        """
        Algorithme d'affectation automatique.
        Retourne True et met à jour la commande si un transporteur est trouvé, False sinon.
        """
        # Vérifier si la commande nécessite un point de départ
        if not commande.point_depart:
            return False, "Point de départ non défini."

        # 1. Filtrer les véhicules disponibles et ayant une capacité suffisante
        vehicules_eligibles = Vehicule.objects.filter(
            disponible=True,
            capacite_kg__gte=commande.poids_kg,
            chauffeur__isnull=False,  # Doit avoir un chauffeur
            chauffeur__disponible=True # Le chauffeur doit être disponible
        )

        if not vehicules_eligibles.exists():
            return False, "Aucun véhicule disponible avec la capacité requise."

        # 2. Trier par proximité (distance entre le transporteur et le point de départ de la commande)
        # Note: on utilise la localisation du Transporteur comme proxy pour la position du véhicule libre
        vehicules_proches = vehicules_eligibles.annotate(
            distance=Distance('transporteur__localisation', commande.point_depart)
        ).order_by('distance')

        meilleur_vehicule = vehicules_proches.first()

        if meilleur_vehicule:
            # 3. Affectation
            commande.transporteur = meilleur_vehicule.transporteur
            commande.vehicule = meilleur_vehicule
            commande.chauffeur = meilleur_vehicule.chauffeur
            commande.statut = 'affectee'
            commande.save()

            # Rendre le véhicule et le chauffeur indisponibles
            meilleur_vehicule.disponible = False
            meilleur_vehicule.save()
            meilleur_vehicule.chauffeur.disponible = False
            meilleur_vehicule.chauffeur.save()

            return True, f"Véhicule {meilleur_vehicule.immatriculation} affecté avec succès."
        
        return False, "Erreur lors de l'affectation."

    @staticmethod
    def calculer_itineraire(commande):
        """
        Appelle l'API OSRM pour récupérer le tracé routier entre le point de départ et le point de destination.
        """
        if not commande.point_depart or not commande.point_destination:
            return False, "Points de départ et de destination requis pour le calcul de l'itinéraire."

        lon1, lat1 = commande.point_depart.coords
        lon2, lat2 = commande.point_destination.coords

        osrm_url = f"http://router.project-osrm.org/route/v1/driving/{lon1},{lat1};{lon2},{lat2}?overview=full&geometries=geojson"
        
        try:
            req = urllib.request.Request(osrm_url, headers={'User-Agent': 'LogistiqueApp/1.0'})
            with urllib.request.urlopen(req) as response:
                data = json.loads(response.read().decode())
                
                if data.get('code') == 'Ok' and len(data.get('routes', [])) > 0:
                    route = data['routes'][0]
                    # Extraction des infos
                    distance_km = route.get('distance', 0) / 1000.0
                    duree_min = route.get('duration', 0) / 60.0
                    
                    # Geometry GeoJSON
                    geojson_geom = route.get('geometry')
                    geom_str = json.dumps(geojson_geom)
                    
                    # Convertir en objet GEOS et assigner
                    line_string = GEOSGeometry(geom_str)
                    
                    commande.distance_km = round(distance_km, 2)
                    commande.duree_estimee_min = int(duree_min)
                    commande.itineraire = line_string
                    commande.save()
                    
                    return True, "Itinéraire calculé avec succès."
                else:
                    return False, "Impossible de trouver une route via OSRM."
        except Exception as e:
            return False, f"Erreur de connexion à OSRM: {str(e)}"

