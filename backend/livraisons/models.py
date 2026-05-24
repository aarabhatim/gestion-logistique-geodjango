from django.conf import settings
from django.contrib.gis.db import models as gis_models
from django.db import models
from django.utils import timezone


class Livraison(models.Model):
    STATUT_CHOICES = [
        ('EN_ATTENTE', 'En attente de prise en charge'),
        ('EN_ROUTE', 'En route'),
        ('LIVREE', 'Livrée'),
        ('ECHEC', 'Échec livraison'),
    ]

    commande = models.OneToOneField(
        'commandes.Commande',
        on_delete=models.CASCADE,
        related_name='livraison',
    )
    transporteur = models.ForeignKey(
        'transporteurs.Transporteur',
        on_delete=models.SET_NULL,
        null=True,
        related_name='livraisons',
    )

    # Géométrie
    depart = gis_models.PointField(srid=4326, null=True, blank=True)
    arrivee = gis_models.PointField(srid=4326, null=True, blank=True)
    trace_itineraire = gis_models.LineStringField(srid=4326, null=True, blank=True)

    # Métriques
    distance_km = models.FloatField(null=True, blank=True)
    duree_estimee_min = models.IntegerField(null=True, blank=True)
    eta = models.DateTimeField(null=True, blank=True)

    # Statut
    statut_livraison = models.CharField(max_length=15, choices=STATUT_CHOICES, default='EN_ATTENTE')
    date_debut = models.DateTimeField(null=True, blank=True)
    date_livraison = models.DateTimeField(null=True, blank=True)

    # Finances
    gain_transporteur = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    commission_plateforme = models.DecimalField(max_digits=8, decimal_places=2, default=0)

    # Confirmation
    code_confirmation = models.CharField(max_length=6, blank=True)
    signature_client = models.TextField(blank=True)

    # ── Gestion avancée des livraisons ──
    # Preuve de livraison enrichie
    photo_preuve = models.ImageField(
        upload_to='livraisons/preuves/', null=True, blank=True,
        help_text='Photo prise à la livraison (porte, boite aux lettres...)'
    )
    # Instructions spéciales (digicode, étage, chien…)
    instructions_speciales = models.TextField(
        blank=True,
        help_text='Instructions du client : code digicode, étage, animaux...'
    )
    # Report de livraison
    REPORT_MOTIF_CHOICES = [
        ('CLIENT_ABSENT', 'Client absent'),
        ('ACCES_BLOQUE', 'Accès bloqué'),
        ('ADRESSE_INTROUVABLE', 'Adresse introuvable'),
        ('METEO', 'Conditions météo'),
        ('AUTRE', 'Autre'),
    ]
    est_reportee = models.BooleanField(default=False)
    report_motif = models.CharField(
        max_length=20, choices=REPORT_MOTIF_CHOICES, blank=True
    )
    report_commentaire = models.TextField(blank=True)
    date_report = models.DateTimeField(null=True, blank=True)
    # Livraison partielle (commande multi-colis)
    nb_colis_total = models.PositiveSmallIntegerField(default=1)
    nb_colis_livres = models.PositiveSmallIntegerField(default=0)
    # Notification de départ (10 min avant)
    notif_depart_envoyee = models.BooleanField(default=False)

    class Meta:
        verbose_name = 'Livraison'
        verbose_name_plural = 'Livraisons'
        ordering = ['-date_debut']

    def __str__(self):
        return f'Livraison #{self.pk} - {self.commande.reference}'

    @property
    def est_partielle(self):
        return self.nb_colis_total > 1 and 0 < self.nb_colis_livres < self.nb_colis_total

    @property
    def taux_livraison_colis(self):
        if self.nb_colis_total == 0:
            return 0
        return round(self.nb_colis_livres / self.nb_colis_total * 100)

    def calculer_gains(self):
        from django.conf import settings
        commission = float(settings.PLATFORM_COMMISSION_RATE)
        frais = float(self.commande.frais_livraison)
        self.commission_plateforme = round(frais * commission, 2)
        self.gain_transporteur = round(frais * (1 - commission), 2)
        self.save(update_fields=['commission_plateforme', 'gain_transporteur'])

    def demarrer(self):
        self.statut_livraison = 'EN_ROUTE'
        self.date_debut = timezone.now()
        self.save(update_fields=['statut_livraison', 'date_debut'])

    def terminer(self):
        self.statut_livraison = 'LIVREE'
        self.date_livraison = timezone.now()
        self.nb_colis_livres = self.nb_colis_total
        self.save(update_fields=['statut_livraison', 'date_livraison', 'nb_colis_livres'])
        # Mettre à jour les revenus du transporteur
        if self.transporteur:
            from django.db.models import F
            self.transporteur.revenus_total = F('revenus_total') + self.gain_transporteur
            self.transporteur.save(update_fields=['revenus_total'])

    def reporter(self, motif, commentaire=''):
        """Reporter une livraison avec un motif sans créer d'incident."""
        self.est_reportee = True
        self.report_motif = motif
        self.report_commentaire = commentaire
        self.date_report = timezone.now()
        self.statut_livraison = 'ECHEC'
        self.save(update_fields=[
            'est_reportee', 'report_motif', 'report_commentaire',
            'date_report', 'statut_livraison'
        ])


class PositionTracking(models.Model):
    """Historique positions GPS du transporteur pendant une livraison."""
    livraison = models.ForeignKey(Livraison, on_delete=models.CASCADE, related_name='positions')
    point = gis_models.PointField(srid=4326)
    vitesse_kmh = models.FloatField(default=0)
    timestamp = models.DateTimeField(default=timezone.now)

    class Meta:
        ordering = ['timestamp']
        indexes = [
            models.Index(fields=['livraison', 'timestamp']),
        ]

    def __str__(self):
        return f'Position {self.livraison} at {self.timestamp}'
