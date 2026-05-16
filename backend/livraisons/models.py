from django.contrib.gis.db import models
from commandes.models import Commande
from transporteurs.models import Transporteur
from django.utils.translation import gettext_lazy as _

class Livraison(models.Model):
    class Statut(models.TextChoices):
        EN_ATTENTE = 'EN_ATTENTE', _('En attente')
        EN_ROUTE = 'EN_ROUTE', _('En route')
        LIVREE = 'LIVREE', _('Livrée')
        ANNULEE = 'ANNULEE', _('Annulée')

    commande = models.OneToOneField(Commande, on_delete=models.CASCADE, related_name='livraison')
    transporteur = models.ForeignKey(Transporteur, on_delete=models.SET_NULL, null=True, blank=True, related_name='livraisons')
    
    trace_itineraire = models.LineStringField(srid=4326, null=True, blank=True)
    depart = models.PointField(srid=4326, null=True, blank=True)
    arrivee = models.PointField(srid=4326, null=True, blank=True)
    
    distance_km = models.FloatField(null=True, blank=True)
    duree_estimee_min = models.IntegerField(null=True, blank=True)
    statut_livraison = models.CharField(max_length=20, choices=Statut.choices, default=Statut.EN_ATTENTE)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Livraison'
        verbose_name_plural = 'Livraisons'

    def __str__(self):
        return f"Livraison pour Commande {self.commande.id}"
