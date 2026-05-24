from django.conf import settings
from django.contrib.gis.db import models as gis_models
from django.db import models
from django.utils import timezone
import datetime


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
    # Partage de position GPS dans le chat
    position_lat = models.FloatField(null=True, blank=True)
    position_lng = models.FloatField(null=True, blank=True)
    est_position_partagee = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['created_at']

    def __str__(self):
        return f"Chat cmd#{self.commande_id} - {self.auteur}"


class MessageTemplate(models.Model):
    """Templates de messages rapides pour le chat chauffeur→client."""
    CIBLE_CHOICES = [
        ('CHAUFFEUR', 'Chauffeur'),
        ('CLIENT', 'Client'),
        ('TOUS', 'Tous'),
    ]
    contenu = models.CharField(max_length=200)
    cible = models.CharField(max_length=10, choices=CIBLE_CHOICES, default='CHAUFFEUR')
    ordre = models.PositiveSmallIntegerField(default=0)
    actif = models.BooleanField(default=True)

    class Meta:
        ordering = ['ordre', 'contenu']
        verbose_name = 'Template message rapide'

    def __str__(self):
        return self.contenu


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


# ─── Gamification ──────────────────────────────────────────────────────────────

class Badge(models.Model):
    """Définition d'un badge débloquable."""
    CATEGORIE_CHOICES = [
        ('LIVRAISONS', 'Volume de livraisons'),
        ('PONCTUALITE', 'Ponctualité'),
        ('SATISFACTION', 'Satisfaction client'),
        ('SECURITE', 'Sécurité (zéro incident)'),
        ('FIDELITE', 'Fidélité plateforme'),
        ('SPECIAL', 'Badge spécial'),
    ]
    code = models.CharField(max_length=50, unique=True)
    nom = models.CharField(max_length=100)
    description = models.TextField()
    icone = models.CharField(max_length=10, default='🏅', help_text='Emoji représentant le badge')
    categorie = models.CharField(max_length=15, choices=CATEGORIE_CHOICES, default='LIVRAISONS')
    seuil = models.PositiveIntegerField(default=0, help_text='Valeur numérique pour débloquer')
    actif = models.BooleanField(default=True)

    class Meta:
        ordering = ['categorie', 'seuil']
        verbose_name = 'Badge'

    def __str__(self):
        return f"{self.icone} {self.nom}"


class BadgeTransporteur(models.Model):
    """Badge obtenu par un transporteur."""
    transporteur = models.ForeignKey(Transporteur, on_delete=models.CASCADE, related_name='badges')
    badge = models.ForeignKey(Badge, on_delete=models.CASCADE, related_name='detenteurs')
    obtenu_le = models.DateTimeField(auto_now_add=True)
    notifie = models.BooleanField(default=False)

    class Meta:
        unique_together = ['transporteur', 'badge']
        ordering = ['-obtenu_le']

    def __str__(self):
        return f"{self.transporteur} — {self.badge}"


class NiveauTransporteur(models.Model):
    """Niveau global du transporteur : Bronze → Argent → Or → Platine."""
    NIVEAU_CHOICES = [
        ('BRONZE', 'Bronze'),
        ('ARGENT', 'Argent'),
        ('OR', 'Or'),
        ('PLATINE', 'Platine'),
    ]
    transporteur = models.OneToOneField(
        Transporteur, on_delete=models.CASCADE, related_name='niveau'
    )
    niveau = models.CharField(max_length=10, choices=NIVEAU_CHOICES, default='BRONZE')
    points = models.PositiveIntegerField(default=0)
    mise_a_jour = models.DateTimeField(auto_now=True)

    SEUILS = {'BRONZE': 0, 'ARGENT': 500, 'OR': 1500, 'PLATINE': 3000}

    def recalculer(self):
        """Recalcule le niveau en fonction des points."""
        if self.points >= self.SEUILS['PLATINE']:
            self.niveau = 'PLATINE'
        elif self.points >= self.SEUILS['OR']:
            self.niveau = 'OR'
        elif self.points >= self.SEUILS['ARGENT']:
            self.niveau = 'ARGENT'
        else:
            self.niveau = 'BRONZE'
        self.save(update_fields=['niveau', 'mise_a_jour'])

    @property
    def points_vers_prochain(self):
        seuils = [self.SEUILS['ARGENT'], self.SEUILS['OR'], self.SEUILS['PLATINE']]
        for s in seuils:
            if self.points < s:
                return s - self.points
        return 0

    @property
    def prochain_niveau(self):
        ordre = ['BRONZE', 'ARGENT', 'OR', 'PLATINE']
        idx = ordre.index(self.niveau)
        return ordre[idx + 1] if idx < 3 else None

    def __str__(self):
        return f"{self.transporteur} — {self.niveau} ({self.points} pts)"


# ─── Planning & Disponibilités ─────────────────────────────────────────────────

class DisponibiliteHebdo(models.Model):
    """Créneaux de disponibilité planifiés par le chauffeur pour une semaine."""
    JOUR_CHOICES = [
        (0, 'Lundi'), (1, 'Mardi'), (2, 'Mercredi'),
        (3, 'Jeudi'), (4, 'Vendredi'), (5, 'Samedi'), (6, 'Dimanche'),
    ]
    transporteur = models.ForeignKey(
        Transporteur, on_delete=models.CASCADE, related_name='disponibilites_hebdo'
    )
    jour_semaine = models.PositiveSmallIntegerField(choices=JOUR_CHOICES)
    heure_debut = models.TimeField()
    heure_fin = models.TimeField()
    actif = models.BooleanField(default=True)

    class Meta:
        ordering = ['jour_semaine', 'heure_debut']
        unique_together = ['transporteur', 'jour_semaine', 'heure_debut']
        verbose_name = 'Créneau disponibilité'

    def __str__(self):
        return f"{self.transporteur} — {self.get_jour_semaine_display()} {self.heure_debut}–{self.heure_fin}"


class AbsenceTransporteur(models.Model):
    """Congés et absences planifiés, avec validation admin."""
    STATUT_CHOICES = [
        ('EN_ATTENTE', 'En attente'),
        ('APPROUVEE', 'Approuvée'),
        ('REFUSEE', 'Refusée'),
    ]
    transporteur = models.ForeignKey(
        Transporteur, on_delete=models.CASCADE, related_name='absences'
    )
    date_debut = models.DateField()
    date_fin = models.DateField()
    motif = models.CharField(max_length=200)
    statut = models.CharField(max_length=12, choices=STATUT_CHOICES, default='EN_ATTENTE')
    valide_par = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True,
        on_delete=models.SET_NULL, related_name='absences_validees'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_debut']
        verbose_name = 'Absence transporteur'

    def __str__(self):
        return f"{self.transporteur} — {self.date_debut} → {self.date_fin} ({self.statut})"


class PreferenceZone(models.Model):
    """Zone géographique préférée d'un transporteur."""
    transporteur = models.ForeignKey(
        Transporteur, on_delete=models.CASCADE, related_name='zones_preferees'
    )
    zone = models.ForeignKey(
        'zones.ZoneLivraison', on_delete=models.CASCADE, related_name='transporteurs_preferents'
    )
    limite_commandes_jour = models.PositiveSmallIntegerField(
        default=0, help_text='0 = pas de limite'
    )

    class Meta:
        unique_together = ['transporteur', 'zone']
        verbose_name = 'Préférence de zone'

    def __str__(self):
        return f"{self.transporteur} préfère {self.zone}"


# ─── Gestion du véhicule ───────────────────────────────────────────────────────

class EntretienVehicule(models.Model):
    """Journal d'entretien et de maintenance du véhicule."""
    TYPE_CHOICES = [
        ('VIDANGE', 'Vidange'),
        ('PNEUS', 'Changement pneus'),
        ('FREINS', 'Freins'),
        ('REVISION', 'Révision générale'),
        ('CONTROLE_TECHNIQUE', 'Contrôle technique'),
        ('REPARATION', 'Réparation'),
        ('AUTRE', 'Autre'),
    ]
    transporteur = models.ForeignKey(
        Transporteur, on_delete=models.CASCADE, related_name='entretiens'
    )
    type_entretien = models.CharField(max_length=20, choices=TYPE_CHOICES)
    date_entretien = models.DateField()
    kilometrage = models.PositiveIntegerField(help_text='Kilométrage au moment de l\'entretien')
    cout = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    description = models.TextField(blank=True)
    prochain_entretien_km = models.PositiveIntegerField(
        null=True, blank=True,
        help_text='Kilométrage prévu pour le prochain entretien'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date_entretien']
        verbose_name = 'Entretien véhicule'

    def __str__(self):
        return f"{self.transporteur.plaque} — {self.get_type_entretien_display()} le {self.date_entretien}"


class DocumentVehicule(models.Model):
    """Documents administratifs du véhicule (assurance, vignette, carte grise…)."""
    TYPE_CHOICES = [
        ('ASSURANCE', 'Assurance'),
        ('CARTE_GRISE', 'Carte grise'),
        ('VIGNETTE', 'Vignette'),
        ('VISITE_TECHNIQUE', 'Visite technique'),
        ('AUTRE', 'Autre'),
    ]
    transporteur = models.ForeignKey(
        Transporteur, on_delete=models.CASCADE, related_name='documents_vehicule'
    )
    type_document = models.CharField(max_length=20, choices=TYPE_CHOICES)
    fichier = models.FileField(upload_to='transporteurs/documents/')
    date_expiration = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Document véhicule'

    @property
    def est_expire(self):
        if not self.date_expiration:
            return False
        return self.date_expiration < datetime.date.today()

    @property
    def expire_bientot(self):
        """Expire dans moins de 30 jours."""
        if not self.date_expiration:
            return False
        return self.date_expiration <= datetime.date.today() + datetime.timedelta(days=30)

    def __str__(self):
        return f"{self.transporteur.plaque} — {self.get_type_document_display()}"
