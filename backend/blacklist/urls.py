from rest_framework.routers import DefaultRouter
from .views import AdresseBlacklistViewSet

router = DefaultRouter()
router.register(r'', AdresseBlacklistViewSet, basename='blacklist')
urlpatterns = router.urls
