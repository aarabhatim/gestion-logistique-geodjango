from django.urls import path
from .views import (
    MonProfilTransporteurView, ToggleDisponibiliteView,
    TransporteurDisponiblesView,
    AdminTransporteurListView, AdminTransporteurValidateView,
)

urlpatterns = [
    path('mon-profil/', MonProfilTransporteurView.as_view(), name='mon-profil-transporteur'),
    path('disponibilite/', ToggleDisponibiliteView.as_view(), name='toggle-disponibilite'),
    path('disponibles/', TransporteurDisponiblesView.as_view(), name='transporteurs-disponibles'),
    # Admin
    path('admin/', AdminTransporteurListView.as_view(), name='admin-transporteurs'),
    path('admin/<int:pk>/valider/', AdminTransporteurValidateView.as_view(), name='admin-valider-transporteur'),
]
