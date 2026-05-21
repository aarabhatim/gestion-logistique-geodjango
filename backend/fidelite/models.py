from django.db import models
from django.conf import settings


class CompteFidelite(models.Model):
    client = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='compte_fidelite'
    )
    points = models.PositiveIntegerField(default=0)
    total_points_gagnes = models.PositiveIntegerField(default=0)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = 'Compte Fidélité'
        verbose_name_plural = 'Comptes Fidélité'

    def __str__(self):
        return f"{self.client} — {self.points} pts"

    def crediter(self, points, raison=''):
        """Ajoute des points et enregistre la transaction."""
        self.points += points
        self.total_points_gagnes += points
        self.save()
        TransactionFidelite.objects.create(
            compte=self,
            type='GAIN',
            points=points,
            raison=raison
        )

    def debiter(self, points, raison=''):
        """Déduit des points (conversion en réduction)."""
        if self.points < points:
            raise ValueError("Points insuffisants")
        self.points -= points
        self.save()
        TransactionFidelite.objects.create(
            compte=self,
            type='UTILISATION',
            points=points,
            raison=raison
        )

    @property
    def reduction_disponible(self):
        """Calcule la réduction en DZD : 100 pts = 50 DZD."""
        return (self.points // 100) * 50


class TransactionFidelite(models.Model):
    TYPE_CHOICES = [
        ('GAIN', 'Gain'),
        ('UTILISATION', 'Utilisation'),
        ('EXPIRATION', 'Expiration'),
    ]
    compte = models.ForeignKey(
        CompteFidelite,
        on_delete=models.CASCADE,
        related_name='transactions'
    )
    type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    points = models.PositiveIntegerField()
    raison = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Transaction Fidélité'
        verbose_name_plural = 'Transactions Fidélité'
