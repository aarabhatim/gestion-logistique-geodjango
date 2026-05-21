from django.urls import path
from . import views

urlpatterns = [
    path('boutiques/', views.mes_favoris_boutiques, name='favoris-boutiques'),
    path('boutiques/<int:boutique_id>/toggle/', views.toggle_favori_boutique, name='toggle-favori-boutique'),
    path('produits/', views.mes_favoris_produits, name='favoris-produits'),
    path('produits/<int:produit_id>/toggle/', views.toggle_favori_produit, name='toggle-favori-produit'),
]
