import uuid
from django.conf import settings
from django.contrib.gis.db import models as gis_models
from django.db import models
from django.utils import timezone


def generate_reference():
    return f'DM-{uuid.uuid4().hex[:8].upper()}'


class Commande(models.Model):
    STATUT_CHOICES = [
        ('EN_ATTENTE', 'En attente de validation'),
        ('VALIDEE', 'Validée'),
        ('EN_PREPARATION', 'En préparation'),
        ('EN_ROUTE', 'En route'),
        ('LIVREE', 'Livrée'),
        ('ANNULEE', 'Annulée'),
    ]

    PAIEMENT_CHOICES = [
        ('CARTE', 'Carte bancaire (Stripe)'),
        ('CASH', 'Cash à la livraison'),
    ]

    reference = models.CharField(max_length=20, unique=True, default=generate_reference, editable=False)

    # Acteurs
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='commandes_client',
        limit_choices_to={'role': 'CLIENT'},
    )
    fondateur = models.ForeignKey(
        'fondateurs.Fondateur',
        on_delete=models.CASCADE,
        related_name='commandes',
    )
    transporteur = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='commandes_transport',
        limit_choices_to={'role': 'TRANSPORTEUR'},
    )

    # Livraison
    adresse_livraison = models.CharField(max_length=500)
    location_livraison = gis_models.PointField(srid=4326, null=True, blank=True)
    etage_porte = models.CharField(max_length=100, blank=True)
    instructions_livraison = models.TextField(blank=True)

    # Statut et paiement
    statut = models.CharField(max_length=20, choices=STATUT_CHOICES, default='EN_ATTENTE')
    mode_paiement = models.CharField(max_length=10, choices=PAIEMENT_CHOICES, default='CASH')
    stripe_payment_intent = models.CharField(max_length=200, blank=True)
    est_paye = models.BooleanField(default=False)

    # Prix
    sous_total = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    frais_livraison = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    reduction = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    total_price = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    code_promo_utilise = models.CharField(max_length=20, blank=True)

    # Créneau
    livraison_immediate = models.BooleanField(default=True)
    livraison_programmee = models.DateTimeField(null=True, blank=True)
    estimated_delivery = models.DateTimeField(null=True, blank=True)

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    livree_at = models.DateTimeField(null=True, blank=True)

    # Signalement
    est_signale = models.BooleanField(default=False)
    motif_signalement = models.TextField(blank=True)

    class Meta:
        verbose_name = 'Commande'
        verbose_name_plural = 'Commandes'
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.reference} - {self.client.username} → {self.fondateur.nom_boutique}'

    def calculer_total(self):
        self.total_price = self.sous_total + self.frais_livraison - self.reduction
        self.save(update_fields=['total_price'])

    def marquer_livree(self):
        self.statut = 'LIVREE'
        self.livree_at = timezone.now()
        self.save(update_fields=['statut', 'livree_at'])
        # Incrémenter les compteurs
        self.fondateur.nombre_commandes = models.F('nombre_commandes') + 1
        self.fondateur.save(update_fields=['nombre_commandes'])


class CommandeProduit(models.Model):
    """Table pivot Commande ↔ Produit avec quantité et prix snapshot."""
    commande = models.ForeignKey(Commande, on_delete=models.CASCADE, related_name='lignes')
    produit = models.ForeignKey('fondateurs.Produit', on_delete=models.PROTECT, related_name='lignes_commande')
    quantite = models.PositiveIntegerField(default=1)
    prix_unitaire = models.DecimalField(max_digits=10, decimal_places=2)
    sous_total = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        verbose_name = 'Ligne de commande'
        verbose_name_plural = 'Lignes de commande'

    def save(self, *args, **kwargs):
        self.sous_total = self.prix_unitaire * self.quantite
        super().save(*args, **kwargs)

    def __str__(self):
        return f'{self.produit.nom} x{self.quantite}'


class Avis(models.Model):
    CIBLE_CHOICES = [
        ('TRANSPORTEUR', 'Transporteur'),
        ('FONDATEUR', 'Fondateur'),
    ]

    commande = models.ForeignKey(Commande, on_delete=models.CASCADE, related_name='avis')
    auteur = models.ForeignKey(
        settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='avis_donnés'
    )
    cible_type = models.CharField(max_length=15, choices=CIBLE_CHOICES)
    note = models.PositiveSmallIntegerField(
        choices=[(i, str(i)) for i in range(1, 6)]
    )
    commentaire = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Avis'
        verbose_name_plural = 'Avis'
        unique_together = [('commande', 'auteur', 'cible_type')]

    def __str__(self):
        return f'Avis {self.note}/5 par {self.auteur.username} ({self.cible_type})'

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Recalcule la note du destinataire
        if self.cible_type == 'TRANSPORTEUR':
            try:
                self.commande.transporteur.transporteur_profile.update_note()
            except Exception:
                pass
        elif self.cible_type == 'FONDATEUR':
            self.commande.fondateur.update_note()
