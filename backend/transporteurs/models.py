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

    # Suivi du temps de travail (basé sur disponibilité)
    heure_debut_disponibilite = models.DateTimeField(null=True, blank=True)
    minutes_travaillees_aujourd_hui = models.IntegerField(default=0)
    minutes_travaillees_semaine = models.IntegerField(default=0)
    minutes_travaillees_mois = models.IntegerField(default=0)
    date_derniere_session = models.DateField(null=True, blank=True)

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

    @property
    def minutes_session_courante(self):
        """Minutes écoulées depuis le début de la session de disponibilité en cours."""
        if not self.heure_debut_disponibilite or not self.is_available:
            return 0
        delta = timezone.now() - self.heure_debut_disponibilite
        return int(delta.total_seconds() / 60)

    def cumuler_temps_travail(self):
        """Ajoute la durée de la session courante aux totaux et réinitialise."""
        import datetime
        if not self.heure_debut_disponibilite:
            return
        now = timezone.now()
        today = now.date()

        # Reset si nouveau jour
        if self.date_derniere_session and self.date_derniere_session != today:
            if self.date_derniere_session < today - datetime.timedelta(days=today.weekday()):
                self.minutes_travaillees_semaine = 0
            if self.date_derniere_session.month != today.month:
                self.minutes_travaillees_mois = 0
            self.minutes_travaillees_aujourd_hui = 0

        delta_min = int((now - self.heure_debut_disponibilite).total_seconds() / 60)
        self.minutes_travaillees_aujourd_hui += delta_min
        self.minutes_travaillees_semaine += delta_min
        self.minutes_travaillees_mois += delta_min
        self.date_derniere_session = today
        self.heure_debut_disponibilite = None


class ChatMessage(models.Model):
    """Messagerie entre transporteur et client pendant une livraison active."""
    commande = models.ForeignKey(
        'commandes.Commande', on_delete=models.CASCADE, related_name='chat_messages'
    )
    auteur = models.ForeignKey(
        'accounts.CustomUser', on_delete=models.CASCADE, related_name='chat_messages_sent'
    )
    contenu = models.TextField()
    lu = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Chat cmd#{self.commande_id} - {self.auteur}"


class ObjectifHebdomadaire(models.Model):
    """Gamification - objectifs et badges par semaine."""
    transporteur = models.ForeignKey(
        'Transporteur', on_delete=models.CASCADE, related_name='objectifs'
    )
    semaine = models.DateField(help_text='Lundi de la semaine cible')
    objectif_livraisons = models.PositiveIntegerField(default=10)
    livraisons_effectuees = models.PositiveIntegerField(default=0)
    objectif_note = models.DecimalField(max_digits=3, decimal_places=1, default=4.0)
    note_obtenue = models.DecimalField(max_digits=3, decimal_places=1, default=0)
    bonus_obtenu = models.BooleanField(default=False)
    badge = models.CharField(max_length=50, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-semaine']
        unique_together = ['transporteur', 'semaine']

    def __str__(self):
        return f"{self.transporteur} - semaine {self.semaine}"

    @property
    def taux_completion(self):
        if self.objectif_livraisons == 0:
            return 0
        return min(100, round(self.livraisons_effectuees / self.objectif_livraisons * 100))
