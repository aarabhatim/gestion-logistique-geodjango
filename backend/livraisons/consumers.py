import json
from channels.generic.websocket import AsyncWebsocketConsumer


class LivraisonConsumer(AsyncWebsocketConsumer):
    """WebSocket: client suit sa livraison en temps réel."""

    async def connect(self):
        self.commande_id = self.scope['url_route']['kwargs']['commande_id']
        self.group_name = f'livraison_{self.commande_id}'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()
        await self.send(text_data=json.dumps({'type': 'connected', 'commande_id': self.commande_id}))

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        pass

    async def position_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'position_update',
            'latitude': event['latitude'],
            'longitude': event['longitude'],
            'vitesse': event.get('vitesse', 0),
            'eta': event.get('eta'),
        }))

    async def statut_update(self, event):
        await self.send(text_data=json.dumps({
            'type': 'statut_update',
            'statut': event['statut'],
        }))
