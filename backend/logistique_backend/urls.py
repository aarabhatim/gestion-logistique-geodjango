from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse

# Import direct du chatbot pour court-circuiter tout problème de include()
from chatbot.views import ChatbotView


def api_root(request):
    return JsonResponse({
        'projet': 'DeliverMap',
        'version': '1.0',
        'endpoints': {
            'admin': '/admin/',
            'auth': '/api/auth/',
            'fondateurs': '/api/fondateurs/',
            'commandes': '/api/commandes/',
            'livraisons': '/api/livraisons/',
            'transporteurs': '/api/transporteurs/',
            'notifications': '/api/notifications/',
            'analytics': '/api/analytics/',
            'chatbot': '/api/chatbot/',
        },
        'websockets': {
            'tracking': 'ws://localhost:8000/ws/livraison/{commande_id}/',
            'notifications': 'ws://localhost:8000/ws/notifications/',
        }
    })


urlpatterns = [
    path('', api_root),
    path('admin/', admin.site.urls),
    # Auth & Utilisateurs
    path('api/auth/', include('accounts.urls')),
    # Fondateurs & Produits
    path('api/fondateurs/', include('fondateurs.urls')),
    # Commandes & Avis
    path('api/commandes/', include('commandes.urls')),
    # Livraisons & Tracking
    path('api/livraisons/', include('livraisons.urls')),
    # Transporteurs
    path('api/transporteurs/', include('transporteurs.urls')),
    # Notifications
    path('api/notifications/', include('notifications.urls')),
    # Analytics / KPIs
    path('api/analytics/', include('analytics.urls')),
    # Chatbot d'assistance (LLM) — route directe pour eviter tout probleme include()
    path('api/chatbot/', ChatbotView.as_view(), name='chatbot'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
