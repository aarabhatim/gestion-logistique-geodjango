from django.conf import settings
from django.db import models


class Notification(models.Model):
    TYPE_CHOICES = [
        ('INFO', 'Information'),
        ('SUCCESS', 'Succès'),
        ('WARNING', 'Avertissement'),
        ('DANGER', 'Alerte'),
        ('COMMANDE', 'Commande'),
        ('LIVRAISON', 'Livraison'),
        ('PAIEMENT', 'Paiement'),
    ]

    destinataire = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
    )
    titre = models.CharField(max_length=200)
    message = models.TextField()
    type_notif = models.CharField(max_length=15, choices=TYPE_CHOICES, default='INFO')
    lue = models.BooleanField(default=False)
    commande_id = models.IntegerField(null=True, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = 'Notification'
        verbose_name_plural = 'Notifications'
        ordering = ['-date_creation']
        indexes = [
            models.Index(fields=['destinataire', 'lue']),
        ]

    def __str__(self):
        return f'[{self.type_notif}] {self.titre} → {self.destinataire.username}'


def envoyer_notification(user, titre, message, type_notif='INFO', commande_id=None):
    """Helper pour créer et diffuser une notification via WebSocket."""
    notif = Notification.objects.create(
        destinataire=user,
        titre=titre,
        message=message,
        type_notif=type_notif,
        commande_id=commande_id,
    )
    # Diffusion WebSocket
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        channel_layer = get_channel_layer()
        if channel_layer:
            async_to_sync(channel_layer.group_send)(
                f'notifications_{user.pk}',
                {
                    'type': 'nouvelle_notification',
                    'notification': {
                        'id': notif.pk,
                        'titre': notif.titre,
                        'message': notif.message,
                        'type_notif': notif.type_notif,
                        'commande_id': notif.commande_id,
                        'date_creation': notif.date_creation.isoformat(),
                    }
                }
            )
    except Exception:
        pass
    return notif
