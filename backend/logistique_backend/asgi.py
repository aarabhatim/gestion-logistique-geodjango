import os
import django
from django.core.asgi import get_asgi_application

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'logistique_backend.settings')
django.setup()

from channels.routing import ProtocolTypeRouter, URLRouter
from accounts.jwt_ws_middleware import JWTAuthMiddlewareStack
import notifications.routing
import livraisons.routing
import tickets.routing
import incidents.routing

application = ProtocolTypeRouter({
    'http': get_asgi_application(),
    'websocket': JWTAuthMiddlewareStack(
        URLRouter(
            notifications.routing.websocket_urlpatterns +
            livraisons.routing.websocket_urlpatterns +
            tickets.routing.websocket_urlpatterns +
            incidents.routing.websocket_urlpatterns
        )
    ),
})
