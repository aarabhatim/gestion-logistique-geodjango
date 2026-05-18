import json
from channels.generic.websocket import AsyncWebsocketConsumer


class AdminIncidentsConsumer(AsyncWebsocketConsumer):
    """
    WebSocket pour les mises à jour temps-réel des incidents (admins).
    URL : ws/incidents/
    Groupe : admin_incidents
    """
    GROUP_NAME = 'admin_incidents'

    async def connect(self):
        user = self.scope.get('user')
        if not user or not user.is_authenticated:
            await self.close()
            return
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
            'type': 'incidents_update',
            'data': event.get('data', {}),
        }))
