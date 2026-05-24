from django.urls import path
from .views import (
    LivraisonDetailView, MesLivraisonsView,
    DemarrerLivraisonView, ConfirmerLivraisonView,
    MettreAJourPositionView,
    ReporterLivraisonView, MettreAJourColisView,
    AjouterPhotoPreuveView, NotifDepartView,
)

urlpatterns = [
    path('<int:pk>/', LivraisonDetailView.as_view(), name='livraison-detail'),
    path('mes-livraisons/', MesLivraisonsView.as_view(), name='mes-livraisons'),
    path('<int:pk>/demarrer/', DemarrerLivraisonView.as_view(), name='demarrer-livraison'),
    path('<int:pk>/confirmer/', ConfirmerLivraisonView.as_view(), name='confirmer-livraison'),
    path('position/', MettreAJourPositionView.as_view(), name='update-position-livraison'),
    # ── Gestion avancée ──────────────────────────────────────────────────────
    path('<int:pk>/reporter/', ReporterLivraisonView.as_view(), name='reporter-livraison'),
    path('<int:pk>/colis/', MettreAJourColisView.as_view(), name='maj-colis-livraison'),
    path('<int:pk>/photo-preuve/', AjouterPhotoPreuveView.as_view(), name='photo-preuve-livraison'),
    path('<int:pk>/notif-depart/', NotifDepartView.as_view(), name='notif-depart-livraison'),
]
