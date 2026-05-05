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
