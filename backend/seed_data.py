import os
import django

# Configurer l'environnement Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "logistique_backend.settings")
django.setup()

from django.contrib.gis.geos import Point
from clients.models import Client
from transporteurs.models import Transporteur, Vehicule, Chauffeur
from commandes.models import Commande

def seed_db():
    print("Nettoyage de la base de données...")
    Commande.objects.all().delete()
    Client.objects.all().delete()
    Chauffeur.objects.all().delete()
    Vehicule.objects.all().delete()
    Transporteur.objects.all().delete()

    print("Création de clients...")
    client1 = Client.objects.create(
        nom="Dupont", prenom="Jean", email="jean@example.com", telephone="0600000001",
        adresse="Tanger Centre", localisation=Point(-5.812, 35.772)
    )
    client2 = Client.objects.create(
        nom="Martin", prenom="Sophie", email="sophie@example.com", telephone="0600000002",
        adresse="Tanger Free Zone", localisation=Point(-5.932, 35.719)
    )

    print("Création de transporteurs...")
    transp1 = Transporteur.objects.create(
        nom="Tanger Logistique", email="contact@tlogistique.ma", telephone="0539000000",
        adresse="Port Tanger Med", localisation=Point(-5.512, 35.882)
    )

    print("Création de véhicules et chauffeurs...")
    vehicule1 = Vehicule.objects.create(
        transporteur=transp1, immatriculation="12345-A-1", type_vehicule="camion", capacite_kg=5000.0, disponible=True
    )
    chauffeur1 = Chauffeur.objects.create(
        transporteur=transp1, vehicule=vehicule1, nom="Alami", prenom="Karim", telephone="0611111111",
        permis="C", disponible=True
    )

    print("Création de commandes...")
    cmd1 = Commande.objects.create(
        client=client1,
        adresse_depart="Port Tanger Med", point_depart=Point(-5.512, 35.882),
        adresse_destination="Tanger Centre", point_destination=Point(-5.812, 35.772),
        type_marchandise="electronique", poids_kg=1500.0, date_souhaitee="2026-05-10",
        statut="en_attente"
    )
    
    cmd2 = Commande.objects.create(
        client=client2,
        adresse_depart="Tanger Centre", point_depart=Point(-5.812, 35.772),
        adresse_destination="Tanger Free Zone", point_destination=Point(-5.932, 35.719),
        type_marchandise="textile", poids_kg=800.0, date_souhaitee="2026-05-11",
        statut="en_attente"
    )

    print("Simulation terminée avec succès !")

if __name__ == "__main__":
    seed_db()
