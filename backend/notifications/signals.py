from django.db.models.signals import post_save
from django.dispatch import receiver


@receiver(post_save, sender='commandes.Commande')
def notification_changement_statut(sender, instance, created, **kwargs):
    """Notifie automatiquement le client et le fondateur lors des changements de statut."""
    from notifications.models import envoyer_notification

    ref = instance.reference

    messages_client = {
        'VALIDEE': ('Commande confirmée ✅', f'Votre commande {ref} a été confirmée par {instance.fondateur.nom_boutique}.'),
        'EN_PREPARATION': ('En préparation 👨‍🍳', f'Votre commande {ref} est en cours de préparation.'),
        'EN_ROUTE': ('En route 🛵', f'Votre commande {ref} est en chemin ! Suivez-la en temps réel.'),
        'LIVREE': ('Commande livrée 🎉', f'Votre commande {ref} a été livrée. Bonne dégustation !'),
        'ANNULEE': ('Commande annulée', f'Votre commande {ref} a été annulée.'),
    }

    if not created and instance.statut in messages_client:
        titre, message = messages_client[instance.statut]
        envoyer_notification(
            user=instance.client,
            titre=titre,
            message=message,
            type_notif='LIVRAISON' if instance.statut in ('EN_ROUTE', 'LIVREE') else 'COMMANDE',
            commande_id=instance.pk,
        )

    # Notifier le fondateur d'une nouvelle commande
    if created:
        envoyer_notification(
            user=instance.fondateur.user,
            titre=f'Nouvelle commande reçue 🛒',
            message=f'Commande {ref} de {instance.client.get_full_name() or instance.client.username}. Total: {instance.total_price} MAD',
            type_notif='COMMANDE',
            commande_id=instance.pk,
        )
