from django.contrib.gis.db import models
from commandes.models import Commande


class Incident(models.Model):
    TYPE_CHOICES = [
        ('sos', 'SOS chauffeur'),
        ('accident', 'Accident'),
        ('retard', 'Retard'),
        ('colis_endommage', 'Colis endommagé'),
        ('panne', 'Panne véhicule'),
        ('vol', 'Vol / Perte'),
        ('client_absent', 'Client absent'),
        ('adresse_introuvable', 'Adresse introuvable'),
        ('autre', 'Autre'),
    ]
    STATUT_CHOICES = [
        ('ouvert', 'Ouvert'),
        ('en_traitement', 'En traitement'),
        ('resolu', 'Résolu'),
    ]

    commande = models.ForeignKey(
        Commande, on_delete=models.CASCADE, related_name='incidents',
        null=True, blank=True,
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
        reference = f"Commande {self.commande_id}" if self.commande_id else "Sans commande"
        return f"[{self.get_type_incident_display()}] {reference} — {self.get_statut_display()}"


def incident_photo_path(instance, filename):
    return f'incidents/{instance.incident.id}/{filename}'


class IncidentPhoto(models.Model):
    """Photos jointes à un incident (plusieurs possibles)."""
    incident = models.ForeignKey(
        Incident, on_delete=models.CASCADE, related_name='photos'
    )
    image = models.ImageField(upload_to=incident_photo_path)
    legende = models.CharField(max_length=200, blank=True)
    uploaded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = "Photo incident"
        verbose_name_plural = "Photos incidents"
        ordering = ['uploaded_at']

    def __str__(self):
        return f"Photo #{self.pk} — Incident #{self.incident.pk}"
