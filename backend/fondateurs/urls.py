from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import FondateurViewSet, ProduitViewSet, CodePromoViewSet

router = DefaultRouter()
router.register(r'fondateurs', FondateurViewSet)
router.register(r'produits', ProduitViewSet)
router.register(r'codes-promo', CodePromoViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
