from django.contrib.gis.db import models
from clients.models import Client
from transporteurs.models import Transporteur, Vehicule, Chauffeur


class Commande(models.Model):
    STATUT_CHOICES = [
        ('en_attente', 'En attente'),
        ('validee', 'Validée'),
        ('affectee', 'Affectée'),
        ('en_cours', 'En cours de livraison'),
        ('livree', 'Livrée'),
        ('annulee', 'Annulée'),
    ]

    TYPE_MARCHANDISE_CHOICES = [
        ('electronique', 'Électronique'),
        ('alimentaire', 'Alimentaire'),
        ('textile', 'Textile'),
        ('chimique', 'Chimique'),
        ('construction', 'Matériaux de construction'),
        ('autre', 'Autre'),
    ]

    # Référence auto-générée
    reference = models.CharField(max_length=20, unique=True, blank=True)
    client = models.ForeignKey(Client, on_delete=models.CASCADE, related_name='commandes')

    # Lieu de départ et destination (géospatial)
    adresse_depart = models.TextField()
    point_depart = models.PointField(srid=4326, null=True, blank=True)
    adresse_destination = models.TextField()
    point_destination = models.PointField(srid=4326, null=True, blank=True)

    # Marchandise
    type_marchandise = models.CharField(max_length=30, choices=TYPE_MARCHANDISE_CHOICES, default='autre')
    poids_kg = models.FloatField()
    description = models.TextField(blank=True)
    notes_client = models.TextField(blank=True, default='', help_text="Notes ou instructions spéciales du client")

    # Logistique
    date_souhaitee = models.DateField()
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='en_attente')

    # Affectation
    transporteur = models.ForeignKey(
        Transporteur, on_delete=models.SET_NULL, null=True, blank=True, related_name='commandes'
    )
    vehicule = models.ForeignKey(
        Vehicule, on_delete=models.SET_NULL, null=True, blank=True, related_name='commandes'
    )
    chauffeur = models.ForeignKey(
        Chauffeur, on_delete=models.SET_NULL, null=True, blank=True, related_name='commandes'
    )

    # Dates
    date_creation = models.DateTimeField(auto_now_add=True)
    date_mise_a_jour = models.DateTimeField(auto_now=True)
    date_livraison_reelle = models.DateTimeField(null=True, blank=True)

    # Itinéraire GeoJSON (LineString)
    itineraire = models.LineStringField(srid=4326, null=True, blank=True)
    distance_km = models.FloatField(null=True, blank=True)
    duree_estimee_min = models.IntegerField(null=True, blank=True)
    prix_estime = models.FloatField(null=True, blank=True, help_text="Prix estimé en MAD")

    class Meta:
        verbose_name = "Commande"
        verbose_name_plural = "Commandes"
        ordering = ['-date_creation']

    def save(self, *args, **kwargs):
        if not self.reference:
            import uuid
            self.reference = f"CMD-{uuid.uuid4().hex[:8].upper()}"
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.reference} - {self.client}"
