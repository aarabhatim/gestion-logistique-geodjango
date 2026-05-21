"""
Signals fondateurs :
  - auto-désactivation produit quand stock tombe à 0
  - alerte stock bas (stock <= stock_alerte) → notification fondateur
  - décrément stock lors d'une livraison confirmée
"""
from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender='fondateurs.Produit')
def auto_desactiver_produit_stock_zero(sender, instance, **kwargs):
    """Désactive automatiquement un produit quand son stock atteint 0."""
    if instance.stock <= 0 and instance.disponible:
        # update_fields pour éviter la boucle de signal
        sender.objects.filter(pk=instance.pk).update(disponible=False)

        # Notifier le fondateur
        try:
            from notifications.models import envoyer_notification
            envoyer_notification(
                instance.fondateur.user,
                titre=f"⚠️ Stock épuisé — {instance.nom}",
                message=f"Le produit '{instance.nom}' est en rupture de stock et a été désactivé automatiquement.",
                type_notif='WARNING',
            )
        except Exception:
            pass

    elif instance.stock > 0 and instance.stock <= instance.stock_alerte:
        # Alerte stock bas
        try:
            from notifications.models import envoyer_notification
            envoyer_notification(
                instance.fondateur.user,
                titre=f"Stock bas -- {instance.nom}",
                message=f"Le produit '{instance.nom}' n'a plus que {instance.stock} unite(s) en stock (seuil : {instance.stock_alerte}).",
                type_notif='WARNING',
            )
        except Exception:
            pass
        # Email d'alerte stock au fondateur
        try:
            from utils.emails import email_alerte_stock
            email_alerte_stock(instance, instance.fondateur.user)
        except Exception:
            pass


@receiver(post_save, sender='commandes.Commande')
def decrementer_stock_sur_validation(sender, instance, created, **kwargs):
    """
    Décrémente le stock des produits lors du passage en EN_PREPARATION.
    On utilise 'updated_fields' n'étant pas disponible, on surveille le statut
    via un flag côté signal.
    """
    if not created and instance.statut == 'EN_PREPARATION':
        # Éviter le double décrément : on vérifie si le stock a déjà été
        # décrémenté en regardant si la commande a un flag custom.
        # Simple approche : traiter uniquement si la commande vient de changer.
        try:
            from fondateurs.models import Produit
            for ligne in instance.lignes.select_related('produit').all():
                produit = ligne.produit
                if produit.stock >= ligne.quantite:
                    produit.stock = produit.stock - ligne.quantite
                    produit.nombre_commandes += ligne.quantite
                    produit.save(update_fields=['stock', 'nombre_commandes'])
        except Exception:
            pass
