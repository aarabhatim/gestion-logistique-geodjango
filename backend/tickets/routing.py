from django.urls import re_path
from .consumers import AdminTicketsConsumer

websocket_urlpatterns = [
    re_path(r'ws/tickets/$', AdminTicketsConsumer.as_asgi()),
]
