from django.contrib.gis.db import models
from commandes.models import Commande


class Incident(models.Model):
    TYPE_CHOICES = [
        ('accident', 'Accident'),
        ('retard', 'Retard'),
        ('colis_endommage', 'Colis endommagé'),
        ('panne', 'Panne véhicule'),
        ('vol', 'Vol / Perte'),
        ('autre', 'Autre'),
    ]
    STATUT_CHOICES = [
        ('ouvert', 'Ouvert'),
        ('en_traitement', 'En traitement'),
        ('resolu', 'Résolu'),
    ]

    commande = models.ForeignKey(
        Commande, on_delete=models.CASCADE, related_name='incidents'
    )
    type_incident = models.CharField(max_length=30, choices=TYPE_CHOICES, default='autre')
    description = models.TextField()
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='ouvert')
    position = models.PointField(srid=4326, null=True, blank=True,
                                 help_text="Lieu de l'incident (GPS)")
    date_signalement = models.DateTimeField(auto_now_add=True)
    date_resolution = models.DateTimeField(null=True, blank=True)
    notes_resolution = models.TextField(blank=True, default='')

    class Meta:
        verbose_name = "Incident"
        verbose_name_plural = "Incidents"
        ordering = ['-date_signalement']

    def __str__(self):
        return f"[{self.get_type_incident_display()}] {self.commande.reference} — {self.get_statut_display()}"
