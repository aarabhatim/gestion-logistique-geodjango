from django.urls import path
from .views import (
    LivraisonDetailView, MesLivraisonsView,
    DemarrerLivraisonView, ConfirmerLivraisonView,
    MettreAJourPositionView,
)

urlpatterns = [
    path('<int:pk>/', LivraisonDetailView.as_view(), name='livraison-detail'),
    path('mes-livraisons/', MesLivraisonsView.as_view(), name='mes-livraisons'),
    path('<int:pk>/demarrer/', DemarrerLivraisonView.as_view(), name='demarrer-livraison'),
    path('<int:pk>/confirmer/', ConfirmerLivraisonView.as_view(), name='confirmer-livraison'),
    path('position/', MettreAJourPositionView.as_view(), name='update-position-livraison'),
]
