from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TransporteurViewSet, VehiculeViewSet, ChauffeurViewSet

router = DefaultRouter()
router.register(r'entreprises', TransporteurViewSet, basename='transporteur')
router.register(r'vehicules', VehiculeViewSet, basename='vehicule')
router.register(r'chauffeurs', ChauffeurViewSet, basename='chauffeur')

urlpatterns = [
    path('', include(router.urls)),
]
