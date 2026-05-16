from django.conf import settings
from django.contrib.gis.db import models as gis_models
from django.db import models
from django.utils import timezone


class Transporteur(models.Model):
    VEHICULE_TYPE_CHOICES = [
        ('MOTO', 'Moto'),
        ('VOITURE', 'Voiture'),
        ('CAMIONNETTE', 'Camionnette'),
        ('CAMION', 'Camion'),
    ]

    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='transporteur_profile',
    )

    # Véhicule
    vehicule_type = models.CharField(max_length=15, choices=VEHICULE_TYPE_CHOICES, default='MOTO')
    plaque = models.CharField(max_length=20, unique=True)
    capacite_kg = models.FloatField(default=50.0)
    couleur_vehicule = models.CharField(max_length=50, blank=True)
    photo_vehicule = models.ImageField(upload_to='transporteurs/vehicules/', blank=True, null=True)

    # Documents
    permis_conduire = models.FileField(upload_to='transporteurs/permis/', blank=True, null=True)
    assurance = models.FileField(upload_to='transporteurs/assurance/', blank=True, null=True)

    # Statut
    is_verified = models.BooleanField(default=False)
    is_available = models.BooleanField(default=False)
    is_on_delivery = models.BooleanField(default=False)

    # Position GPS temps réel
    position_actuelle = gis_models.PointField(null=True, blank=True, srid=4326)
    derniere_maj_position = models.DateTimeField(null=True, blank=True)

    # Statistiques
    note_moyenne = models.FloatField(default=0.0)
    nombre_avis = models.IntegerField(default=0)
    nombre_livraisons = models.IntegerField(default=0)
    revenus_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    date_inscription = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Transporteur'
        verbose_name_plural = 'Transporteurs'
        ordering = ['-date_inscription']

    def __str__(self):
        return f'{self.user.get_full_name()} - {self.plaque} ({self.get_vehicule_type_display()})'

    def update_note(self):
        from commandes.models import Avis
        avis = Avis.objects.filter(commande__transporteur=self.user, cible_type='TRANSPORTEUR')
        if avis.exists():
            self.note_moyenne = round(avis.aggregate(models.Avg('note'))['note__avg'], 2)
            self.nombre_avis = avis.count()
            self.save(update_fields=['note_moyenne', 'nombre_avis'])

    @property
    def est_actif(self):
        if not self.derniere_maj_position:
            return False
        delta = timezone.now() - self.derniere_maj_position
        return delta.total_seconds() < 300  # actif si position < 5 min
