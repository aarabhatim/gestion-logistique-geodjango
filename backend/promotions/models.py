from django.db import models
from django.utils import timezone


class CampagnePromo(models.Model):
    TYPES = [
        ('pourcentage', 'Pourcentage'),
        ('montant_fixe', 'Montant fixe'),
        ('livraison_gratuite', 'Livraison gratuite'),
    ]
    nom = models.CharField(max_length=150)
    description = models.TextField(blank=True)
    type_reduction = models.CharField(max_length=20, choices=TYPES, default='pourcentage')
    valeur = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    code = models.CharField(max_length=30, unique=True)
    date_debut = models.DateTimeField(default=timezone.now)
    date_fin = models.DateTimeField(null=True, blank=True)
    usage_max = models.PositiveIntegerField(null=True, blank=True, help_text='Laisser vide = illimite')
    usage_count = models.PositiveIntegerField(default=0)
    montant_min_commande = models.DecimalField(max_digits=8, decimal_places=2, default=0)
    actif = models.BooleanField(default=True)
    # Ciblage multi-boutiques (null = toutes boutiques)
    fondateurs = models.ManyToManyField('fondateurs.Fondateur', blank=True, related_name='campagnes_promo')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Campagne promo'
        verbose_name_plural = 'Campagnes promo'

    def __str__(self):
        return f'{self.code} ({self.nom})'

    @property
    def est_valide(self):
        now = timezone.now()
        if not self.actif:
            return False
        if self.date_fin and now > self.date_fin:
            return False
        if self.usage_max and self.usage_count >= self.usage_max:
            return False
        return True

    @property
    def taux_conversion(self):
        return round(self.usage_count / max(1, self.usage_max or self.usage_count or 1) * 100, 1)
