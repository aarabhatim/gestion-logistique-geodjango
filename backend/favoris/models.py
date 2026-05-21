from django.db import models
from django.conf import settings


class FavorisBoutique(models.Model):
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='favoris_boutiques'
    )
    # Adapter 'fondateurs.Boutique' selon votre app
    boutique_id = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('client', 'boutique_id')
        ordering = ['-created_at']
        verbose_name = 'Favori Boutique'
        verbose_name_plural = 'Favoris Boutiques'

    def __str__(self):
        return f"{self.client} ❤ boutique#{self.boutique_id}"


class FavorisProduit(models.Model):
    client = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='favoris_produits'
    )
    produit_id = models.PositiveIntegerField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        unique_together = ('client', 'produit_id')
        ordering = ['-created_at']
        verbose_name = 'Favori Produit'
        verbose_name_plural = 'Favoris Produits'

    def __str__(self):
        return f"{self.client} ❤ produit#{self.produit_id}"
