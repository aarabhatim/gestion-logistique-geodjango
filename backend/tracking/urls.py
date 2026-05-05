from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PositionVehiculeViewSet

router = DefaultRouter()
router.register(r'positions', PositionVehiculeViewSet, basename='position')

urlpatterns = [
    path('', include(router.urls)),
]
