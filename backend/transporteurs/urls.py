from django.urls import path
from .views import (
    SOSView, ChatLivraisonView, ObjectifsView, MultiLivraisonsView,
    
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
    path('sos/', SOSView.as_view(), name='sos'),
    path('chat/<int:commande_id>/', ChatLivraisonView.as_view(), name='chat'),
    path('objectifs/', ObjectifsView.as_view(), name='objectifs'),
    path('multi-livraisons/', MultiLivraisonsView.as_view(), name='multi-livraisons'),
]