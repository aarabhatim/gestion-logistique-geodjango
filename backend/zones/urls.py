from rest_framework.routers import DefaultRouter
from .views import ZoneLivraisonViewSet

router = DefaultRouter()
router.register(r'', ZoneLivraisonViewSet, basename='zone')
urlpatterns = router.urls
