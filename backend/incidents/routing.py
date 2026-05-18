from django.urls import re_path
from .consumers import AdminIncidentsConsumer

websocket_urlpatterns = [
    re_path(r'ws/incidents/$', AdminIncidentsConsumer.as_asgi()),
]
