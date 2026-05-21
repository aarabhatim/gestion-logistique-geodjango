from django.db import models
from django.contrib.gis.db import models as gis_models


class ZoneLivraison(models.Model):
    nom = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    polygone = gis_models.PolygonField(geography=True, null=True, blank=True)
    tarif_base = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    tarif_km_supplementaire = models.DecimalField(max_digits=6, decimal_places=2, default=0)
    transporteurs = models.ManyToManyField(
        'transporteurs.Transporteur', blank=True, related_name='zones'
    )
    actif = models.BooleanField(default=True)
    couleur = models.CharField(max_length=7, default='#3b82f6', help_text='Couleur hex pour la carte')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['nom']
        verbose_name = 'Zone de livraison'
        verbose_name_plural = 'Zones de livraison'

    def __str__(self):
        return self.nom
