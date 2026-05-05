from django.contrib.gis.db import models
from commandes.models import Commande


class PositionVehicule(models.Model):
    commande = models.ForeignKey(Commande, on_delete=models.CASCADE, related_name='positions')
    position = models.PointField(srid=4326)
    vitesse_kmh = models.FloatField(default=0)
    horodatage = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Position Véhicule"
        verbose_name_plural = "Positions Véhicules"
        ordering = ['-horodatage']

    def __str__(self):
        return f"Position [{self.commande.reference}] à {self.horodatage}"
