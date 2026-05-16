from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CommandeViewSet, AvisViewSet

router = DefaultRouter()
router.register(r'commandes', CommandeViewSet)
router.register(r'avis', AvisViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
