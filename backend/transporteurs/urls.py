from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import TransporteurViewSet

router = DefaultRouter()
router.register(r'transporteurs', TransporteurViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
