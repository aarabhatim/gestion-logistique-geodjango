from django.urls import path
from .views import HistoriquePositionsView, DernierePositionView

urlpatterns = [
    path('commandes/<int:commande_id>/positions/', HistoriquePositionsView.as_view(), name='historique-positions'),
    path('commandes/<int:commande_id>/position/', DernierePositionView.as_view(), name='derniere-position'),
]
