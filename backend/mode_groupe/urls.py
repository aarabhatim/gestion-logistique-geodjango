from django.urls import path
from . import views

urlpatterns = [
    path('creer/', views.creer_session, name='groupe-creer'),
    path('<uuid:code>/rejoindre/', views.rejoindre_session, name='groupe-rejoindre'),
    path('<uuid:code>/', views.detail_session, name='groupe-detail'),
    path('<uuid:code>/ajouter-article/', views.ajouter_article, name='groupe-ajouter-article'),
    path('<uuid:code>/pret/', views.marquer_pret, name='groupe-pret'),
    path('<uuid:code>/valider/', views.valider_commande_groupe, name='groupe-valider'),
]
