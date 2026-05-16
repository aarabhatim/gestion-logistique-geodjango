from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from logistique_backend.stats_views import StatsView

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/', include('accounts.urls')),
    path('api/clients/', include('clients.urls')),
    path('api/transporteurs/', include('transporteurs.urls')),
    path('api/commandes/', include('commandes.urls')),
    path('api/livraisons/', include('livraisons.urls')),
    path('api/fondateurs/', include('fondateurs.urls')),
    path('api/tracking/', include('tracking.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/incidents/', include('incidents.urls')),
    path('api/stats/', StatsView.as_view(), name='stats'),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
