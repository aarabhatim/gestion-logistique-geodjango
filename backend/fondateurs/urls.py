from django.urls import path
from .views import (
    FondateurProximiteView, FondateurListView, FondateurDetailView,
    MaBoutiqueView,
    AdminFondateurListView, AdminFondateurValidateView,
    ProduitListView, MesProduitsFondateurView, ProduitDetailView,
    CodePromoListView, VerifierCodePromoView,
    ToggleDisponibiliteProduitView, MettreAJourStockView, StockAlertesView,
)

urlpatterns = [
    path('proches/', FondateurProximiteView.as_view(), name='fondateurs-proches'),
    path('', FondateurListView.as_view(), name='fondateurs-list'),
    path('<int:pk>/', FondateurDetailView.as_view(), name='fondateur-detail'),
    path('<int:fondateur_pk>/produits/', ProduitListView.as_view(), name='fondateur-produits'),
    path('ma-boutique/', MaBoutiqueView.as_view(), name='ma-boutique'),
    path('mes-produits/', MesProduitsFondateurView.as_view(), name='mes-produits'),
    path('mes-produits/<int:pk>/', ProduitDetailView.as_view(), name='produit-detail'),
    path('mes-produits/<int:pk>/toggle-disponibilite/', ToggleDisponibiliteProduitView.as_view(), name='produit-toggle-dispo'),
    path('mes-produits/<int:pk>/stock/', MettreAJourStockView.as_view(), name='produit-maj-stock'),
    path('mon-stock/alertes/', StockAlertesView.as_view(), name='stock-alertes'),
    path('mes-codes-promo/', CodePromoListView.as_view(), name='codes-promo'),
    path('verifier-code-promo/', VerifierCodePromoView.as_view(), name='verifier-code-promo'),
    path('produits/', ProduitListView.as_view(), name='produits-list'),
    path('admin/liste/', AdminFondateurListView.as_view(), name='admin-fondateurs'),
    path('admin/<int:pk>/valider/', AdminFondateurValidateView.as_view(), name='admin-valider-fondateur'),
]
