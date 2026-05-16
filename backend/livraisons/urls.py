from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import LivraisonViewSet

router = DefaultRouter()
router.register(r'livraisons', LivraisonViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
