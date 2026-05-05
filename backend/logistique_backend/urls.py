from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/clients/', include('clients.urls')),
    path('api/transporteurs/', include('transporteurs.urls')),
    path('api/commandes/', include('commandes.urls')),
    path('api/tracking/', include('tracking.urls')),
] + static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
