from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ScoreTransporteurViewSet

router = DefaultRouter()
router.register(r'', ScoreTransporteurViewSet, basename='scoring')

urlpatterns = [
    path('', include(router.urls)),
]
