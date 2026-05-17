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
    })


urlpatterns = [
    path('', api_root),
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/fondateurs/', include('fondateurs.urls')),
    path('api/commandes/', include('commandes.urls')),
    path('api/livraisons/', include('livraisons.urls')),
    path('api/transporteurs/', include('transporteurs.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/analytics/', include('analytics.urls')),
    # Chatbot — route directe (sans include) pour eviter tout probleme d'import
    path('api/chatbot/', ChatbotView.as_view(), name='chatbot'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
