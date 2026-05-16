from django.contrib.gis.db import models
from django.conf import settings
from django.utils.translation import gettext_lazy as _

class Transporteur(models.Model):
    class VehiculeType(models.TextChoices):
        MOTO = 'MOTO', _('Moto')
        VOITURE = 'VOITURE', _('Voiture')
        CAMIONNETTE = 'CAMIONNETTE', _('Camionnette')
        CAMION = 'CAMION', _('Camion')

    user = models.OneToOneField(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='transporteur_profile')
    vehicule_type = models.CharField(max_length=20, choices=VehiculeType.choices, default=VehiculeType.MOTO)
    capacite_kg = models.FloatField(default=0.0)
    plaque = models.CharField(max_length=20, blank=True, default='')
    is_available = models.BooleanField(default=False)
    position_actuelle = models.PointField(srid=4326, null=True, blank=True)
    is_verified = models.BooleanField(default=False)
    note_moyenne = models.FloatField(default=5.0)

    class Meta:
        verbose_name = 'Transporteur'
        verbose_name_plural = 'Transporteurs'

    def __str__(self):
        return f"Transporteur: {self.user.username}"
