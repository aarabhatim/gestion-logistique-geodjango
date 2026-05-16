from django.urls import re_path
from .consumers import LivraisonConsumer

websocket_urlpatterns = [
    re_path(r'ws/livraison/(?P<commande_id>\d+)/$', LivraisonConsumer.as_asgi()),
]
