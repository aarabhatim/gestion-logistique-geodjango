"""
Connecter ce signal dans fidelite/apps.py > ready()
pour créditer automatiquement les points après chaque livraison.
"""
from django.db.models.signals import post_save
from django.dispatch import receiver


def crediter_points_apres_livraison(sender, instance, **kwargs):
    """Crédite 10 points par commande livrée."""
    if instance.statut == 'LIVREE':
        from .models import CompteFidelite
        compte, _ = CompteFidelite.objects.get_or_create(client=instance.client)
        compte.crediter(10, raison=f'Commande #{instance.pk} livrée')


# Connexion dans apps.py :
# from commandes.models import Commande
# post_save.connect(crediter_points_apres_livraison, sender=Commande)
