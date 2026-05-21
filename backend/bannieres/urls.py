from rest_framework.routers import DefaultRouter
from .views import BanniereViewSet

router = DefaultRouter()
router.register(r'', BanniereViewSet, basename='banniere')
urlpatterns = router.urls
