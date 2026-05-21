from django.urls import path
from .views import (
    AvisReplyView, CalendrierLivraisonsView,
    CommandeListCreateView, CommandeDetailView, CommandeStatutView,
    FondateurAccepterCommandeView, TransporteurAccepterCommandeView,
    CommandesProposeesTrransporteurView,
    SignalerCommandeView,
    AdminAssignerTransporteurView, AdminAnnulerCommandeView, AdminTransporteursDisponiblesView,
    AvisListView, AvisCreateView,
)

urlpatterns = [
    path('', CommandeListCreateView.as_view(), name='commandes-list'),
    path('<int:pk>/', CommandeDetailView.as_view(), name='commande-detail'),
    path('<int:pk>/statut/<str:action>/', CommandeStatutView.as_view(), name='commande-statut'),
    path('<int:pk>/fondateur-action/', FondateurAccepterCommandeView.as_view(), name='fondateur-action'),
    path('<int:pk>/transporteur-action/', TransporteurAccepterCommandeView.as_view(), name='transporteur-action'),
    path('<int:pk>/signaler/', SignalerCommandeView.as_view(), name='signaler-commande'),
    path('<int:pk>/admin/assigner/', AdminAssignerTransporteurView.as_view(), name='admin-assigner'),
    path('<int:pk>/admin/annuler/', AdminAnnulerCommandeView.as_view(), name='admin-annuler'),
    path('<int:pk>/admin/transporteurs/', AdminTransporteursDisponiblesView.as_view(), name='admin-transporteurs-dispo'),
    path('<int:commande_pk>/avis/', AvisCreateView.as_view(), name='avis-create'),
    path('proposees/', CommandesProposeesTrransporteurView.as_view(), name='commandes-proposees'),
    path('avis/', AvisListView.as_view(), name='avis-list'),
    path('calendrier/', CalendrierLivraisonsView.as_view(), name='calendrier'),
    path('avis/<int:avis_id>/reply/', AvisReplyView.as_view(), name='avis-reply'),
]
