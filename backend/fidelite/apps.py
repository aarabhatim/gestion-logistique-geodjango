from django.apps import AppConfig

class FideliteConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'fidelite'
    verbose_name = 'Fidélité'

    def ready(self):
        # Décommentez pour activer le signal automatique
        # from commandes.models import Commande
        # from .signals import crediter_points_apres_livraison
        # from django.db.models.signals import post_save
        # post_save.connect(crediter_points_apres_livraison, sender=Commande)
        pass
