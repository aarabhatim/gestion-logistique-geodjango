from django.urls import path
from .views import (
    FondateurProximiteView, FondateurListView, FondateurDetailView,
    MaBoutiqueView,
    AdminFondateurListView, AdminFondateurValidateView,
    ProduitListView, MesProduitsFondateurView, ProduitDetailView,
    CodePromoListView, VerifierCodePromoView,
)

urlpatterns = [
    # Recherche géolocalisée
    path('proches/', FondateurProximiteView.as_view(), name='fondateurs-proches'),
    path('', FondateurListView.as_view(), name='fondateurs-list'),
    path('<int:pk>/', FondateurDetailView.as_view(), name='fondateur-detail'),
    path('<int:fondateur_pk>/produits/', ProduitListView.as_view(), name='fondateur-produits'),

    # Espace fondateur
    path('ma-boutique/', MaBoutiqueView.as_view(), name='ma-boutique'),
    path('mes-produits/', MesProduitsFondateurView.as_view(), name='mes-produits'),
    path('mes-produits/<int:pk>/', ProduitDetailView.as_view(), name='produit-detail'),
    path('mes-codes-promo/', CodePromoListView.as_view(), name='codes-promo'),

    # Codes promo
    path('verifier-code-promo/', VerifierCodePromoView.as_view(), name='verifier-code-promo'),
    path('produits/', ProduitListView.as_view(), name='produits-list'),

    # Admin
    path('admin/liste/', AdminFondateurListView.as_view(), name='admin-fondateurs'),
    path('admin/<int:pk>/valider/', AdminFondateurValidateView.as_view(), name='admin-valider-fondateur'),
]
