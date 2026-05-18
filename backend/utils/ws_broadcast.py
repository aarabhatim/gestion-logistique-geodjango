"""
Utilitaire WebSocket — broadcast d'événements vers des groupes channel_layer.

Utilisation :
    from utils.ws_broadcast import broadcast_group

    broadcast_group('admin_tickets', {
        'event': 'ticket_created',
        'ticket_id': 42,
        'titre': 'Mon ticket',
    })
"""
import logging

logger = logging.getLogger(__name__)


def broadcast_group(group_name: str, payload: dict) -> bool:
    """
    Envoie un message WebSocket à tous les consommateurs connectés au groupe.

    :param group_name: nom du groupe channel_layer (ex. 'admin_tickets')
    :param payload:    données à envoyer (sérialisables en JSON)
    :returns: True si l'envoi a réussi, False sinon.
    """
    try:
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync

        channel_layer = get_channel_layer()
        if not channel_layer:
            return False

        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                'type': 'ws_message',  # méthode du consommateur
                'data': payload,
            },
        )
        return True
    except Exception as exc:
        logger.debug('broadcast_group(%s) échoué : %s', group_name, exc)
        return False
