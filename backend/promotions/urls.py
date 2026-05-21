from rest_framework.routers import DefaultRouter
from .views import CampagnePromoViewSet

router = DefaultRouter()
router.register(r'', CampagnePromoViewSet, basename='promo')
urlpatterns = router.urls
