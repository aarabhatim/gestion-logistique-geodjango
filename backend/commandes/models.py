from django.contrib.gis.db import models
from django.conf import settings
from fondateurs.models import Fondateur, Produit
from transporteurs.models import Transporteur
from django.utils.translation import gettext_lazy as _

class Commande(models.Model):
    class Statut(models.TextChoices):
        EN_ATTENTE = 'EN_ATTENTE', _('En attente')
        VALIDEE = 'VALIDEE', _('Validée')
        EN_PREPARATION = 'EN_PREPARATION', _('En préparation')
        EN_ROUTE = 'EN_ROUTE', _('En route')
        LIVREE = 'LIVREE', _('Livrée')
        ANNULEE = 'ANNULEE', _('Annulée')

    client = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='commandes_client')
    fondateur = models.ForeignKey(Fondateur, on_delete=models.CASCADE, related_name='commandes_fondateur')
    transporteur = models.ForeignKey(Transporteur, on_delete=models.SET_NULL, null=True, blank=True, related_name='commandes_transporteur')
    
    statut = models.CharField(max_length=20, choices=Statut.choices, default=Statut.EN_ATTENTE)
    adresse_livraison = models.TextField()
    location_livraison = models.PointField(srid=4326, null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    estimated_delivery = models.DateTimeField(null=True, blank=True)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0.0)

    class Meta:
        verbose_name = 'Commande'
        verbose_name_plural = 'Commandes'

    def __str__(self):
        return f"Commande {self.id} - {self.client.username}"

class CommandeProduit(models.Model):
    commande = models.ForeignKey(Commande, on_delete=models.CASCADE, related_name='produits_commande')
    produit = models.ForeignKey(Produit, on_delete=models.SET_NULL, null=True)
    quantite = models.PositiveIntegerField(default=1)
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2)

    def __str__(self):
        return f"{self.quantite}x {self.produit.nom if self.produit else 'Produit inconnu'}"

class Avis(models.Model):
    class CibleType(models.TextChoices):
        TRANSPORTEUR = 'TRANSPORTEUR', _('Transporteur')
        FONDATEUR = 'FONDATEUR', _('Fondateur')

    commande = models.ForeignKey(Commande, on_delete=models.CASCADE, related_name='avis')
    auteur = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='avis_laisses')
    cible_type = models.CharField(max_length=20, choices=CibleType.choices)
    note = models.IntegerField(choices=[(i, i) for i in range(1, 6)])
    commentaire = models.TextField(blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Avis {self.note}/5 par {self.auteur.username}"
