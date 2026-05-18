import json
from channels.generic.websocket import AsyncWebsocketConsumer


class AdminTicketsConsumer(AsyncWebsocketConsumer):
    """
    WebSocket pour les mises à jour temps-réel des tickets (admins).
    URL : ws/tickets/
    Groupe : admin_tickets

    Messages reçus du client :
        (aucun — canal en lecture seule)

    Messages envoyés au client :
        { "type": "tickets_update", "data": { "event": "ticket_created", ... } }
    """
    GROUP_NAME = 'admin_tickets'

    async def connect(self):
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            await self.close()
            return
        # Seuls les admins ont accès à ce flux
        if getattr(user, 'role', None) != 'ADMIN':
            await self.close()
            return
        await self.channel_layer.group_add(self.GROUP_NAME, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.GROUP_NAME, self.channel_name)

    async def receive(self, text_data):
        pass  # Lecture seule

    async def ws_message(self, event):
        """Handler appelé par broadcast_group()."""
        await self.send(text_data=json.dumps({
            'type': 'tickets_update',
            'data': event.get('data', {}),
        }))
