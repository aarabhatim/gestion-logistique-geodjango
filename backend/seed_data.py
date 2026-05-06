import os
import django
from datetime import timedelta
from django.utils import timezone

# Configurer l'environnement Django
os.environ.setdefault("DJANGO_SETTINGS_MODULE", "logistique_backend.settings")
django.setup()

from django.contrib.gis.geos import Point
from clients.models import Client
from transporteurs.models import Transporteur, Vehicule, Chauffeur, Entrepot
from commandes.models import Commande
from incidents.models import Incident
from notifications.models import Notification

def seed_db():
    print("Nettoyage de la base de données...")
    Incident.objects.all().delete()
    Notification.objects.all().delete()
    Commande.objects.all().delete()
    Client.objects.all().delete()
    Chauffeur.objects.all().delete()
    Vehicule.objects.all().delete()
    Entrepot.objects.all().delete()
    Transporteur.objects.all().delete()

    print("Création de clients...")
    client1 = Client.objects.create(
        nom="Dupont", prenom="Jean", email="jean@example.com", telephone="0600000001",
        adresse="Tanger Centre", localisation=Point(-5.812, 35.772),
        entreprise="Tech Corp", note_fidelite=4
    )
    client2 = Client.objects.create(
        nom="Martin", prenom="Sophie", email="sophie@example.com", telephone="0600000002",
        adresse="Tanger Free Zone", localisation=Point(-5.932, 35.719),
        entreprise="Textile Pro", note_fidelite=5
    )

    print("Création de transporteurs et entrepôts...")
    transp1 = Transporteur.objects.create(
        nom="Tanger Logistique", email="contact@tlogistique.ma", telephone="0539000000",
        adresse="Port Tanger Med", localisation=Point(-5.512, 35.882),
        region_couverture="Nord"
    )

    entrepot1 = Entrepot.objects.create(
        nom="Entrepôt Principal Tanger", adresse="Zone Industrielle",
        localisation=Point(-5.850, 35.750), capacite_m2=10000,
        responsable="Hassan", telephone="0612345678"
    )

    print("Création de véhicules et chauffeurs...")
    vehicule1 = Vehicule.objects.create(
        transporteur=transp1, immatriculation="12345-A-1", type_vehicule="camion", 
        capacite_kg=5000.0, couleur="blanc", annee_fabrication=2020, disponible=False
    )
    chauffeur1 = Chauffeur.objects.create(
        transporteur=transp1, vehicule=vehicule1, nom="Alami", prenom="Karim", telephone="0611111111",
        permis="C", date_naissance="1985-06-15", note_moyenne=4.8, disponible=False
    )

    print("Création de commandes...")
    cmd1 = Commande.objects.create(
        client=client1,
        adresse_depart="Port Tanger Med", point_depart=Point(-5.512, 35.882),
        adresse_destination="Tanger Centre", point_destination=Point(-5.812, 35.772),
        type_marchandise="electronique", poids_kg=1500.0, date_souhaitee=(timezone.now() + timedelta(days=2)).date(),
        statut="en_cours", transporteur=transp1, vehicule=vehicule1, chauffeur=chauffeur1,
        prix_estime=2500.00, notes_client="Fragile, manipuler avec soin"
    )
    
    cmd2 = Commande.objects.create(
        client=client2,
        adresse_depart="Tanger Centre", point_depart=Point(-5.812, 35.772),
        adresse_destination="Tanger Free Zone", point_destination=Point(-5.932, 35.719),
        type_marchandise="textile", poids_kg=800.0, date_souhaitee=(timezone.now() + timedelta(days=1)).date(),
        statut="en_attente", prix_estime=1200.00
    )

    cmd3 = Commande.objects.create(
        client=client2,
        adresse_depart="Entrepôt Principal Tanger", point_depart=Point(-5.850, 35.750),
        adresse_destination="Tanger Centre", point_destination=Point(-5.812, 35.772),
        type_marchandise="alimentaire", poids_kg=200.0, date_souhaitee=(timezone.now() - timedelta(days=1)).date(),
        statut="livree", prix_estime=500.00
    )

    print("Création d'incidents...")
    Incident.objects.create(
        commande=cmd1, type_incident="retard", description="Bouchon sur la route nationale",
        statut="ouvert", position=Point(-5.7, 35.8)
    )

    print("Simulation terminée avec succès !")

if __name__ == "__main__":
    seed_db()
