from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from django.http import JsonResponse
from chatbot.views import ChatbotView


def api_root(request):
    return JsonResponse({
        'projet': 'DeliverMap',
        'version': '2.0',
        'endpoints': {
            'auth':          '/api/auth/',
            'fondateurs':    '/api/fondateurs/',
            'commandes':     '/api/commandes/',
            'livraisons':    '/api/livraisons/',
            'transporteurs': '/api/transporteurs/',
            'notifications': '/api/notifications/',
            'analytics':     '/api/analytics/',
            'chatbot':       '/api/chatbot/',
            'incidents':     '/api/incidents/',
            'scoring':       '/api/scoring/',
            'tickets':       '/api/tickets/',
            'contrats':      '/api/contrats/',
            'tracking':      '/api/tracking/',
            'clients':       '/api/clients/',
            'zones':         '/api/zones/',
            'promotions':    '/api/promotions/',
            'bannieres':     '/api/bannieres/',
            'blacklist':     '/api/blacklist/',
        },
    })


urlpatterns = [
    path('', api_root),
    path('admin/', admin.site.urls),
    path('api/auth/',          include('accounts.urls')),
    path('api/fondateurs/',    include('fondateurs.urls')),
    path('api/commandes/',     include('commandes.urls')),
    path('api/livraisons/',    include('livraisons.urls')),
    path('api/transporteurs/', include('transporteurs.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/analytics/',     include('analytics.urls')),
    path('api/incidents/',     include('incidents.urls')),
    path('api/scoring/',       include('scoring.urls')),
    path('api/tickets/',       include('tickets.urls')),
    path('api/contrats/',      include('contrats.urls')),
    path('api/clients/',       include('clients.urls')),
    path('api/tracking/',      include('tracking.urls')),
    path('api/zones/',         include('zones.urls')),
    path('api/promotions/',    include('promotions.urls')),
    path('api/bannieres/',     include('bannieres.urls')),
    path('api/blacklist/',     include('blacklist.urls')),
    path('api/chatbot/', ChatbotView.as_view(), name='chatbot'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
