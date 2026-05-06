from django.db.models.signals import post_save
from django.dispatch import receiver


def create_notification(titre, message, type_notif='info', commande_ref=''):
    """Helper pour créer une notification."""
    from notifications.models import Notification
    Notification.objects.create(
        titre=titre,
        message=message,
        type_notif=type_notif,
        commande_ref=commande_ref,
    )


@receiver(post_save, sender='commandes.Commande')
def commande_signal(sender, instance, created, **kwargs):
    """Crée une notification automatique à chaque changement de statut de commande."""
    ref = instance.reference or ''

    if created:
        create_notification(
            titre=f"Nouvelle commande créée",
            message=f"La commande {ref} a été créée avec succès pour le client {instance.client}.",
            type_notif='info',
            commande_ref=ref,
        )
    else:
        statut_messages = {
            'validee': (f"Commande {ref} validée", f"La commande {ref} a été validée et est prête pour affectation.", 'success'),
            'affectee': (f"Commande {ref} affectée", f"La commande {ref} a été affectée à un transporteur.", 'info'),
            'en_cours': (f"Livraison en cours — {ref}", f"La commande {ref} est en cours de livraison.", 'info'),
            'livree': (f"Commande {ref} livrée ✓", f"La commande {ref} a été livrée avec succès.", 'success'),
            'annulee': (f"Commande {ref} annulée", f"La commande {ref} a été annulée.", 'danger'),
        }
        if instance.statut in statut_messages:
            titre, message, type_notif = statut_messages[instance.statut]
            create_notification(titre=titre, message=message, type_notif=type_notif, commande_ref=ref)
