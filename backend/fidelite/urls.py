from django.urls import path
from . import views

urlpatterns = [
    path('mon-compte/', views.mon_compte_fidelite, name='compte-fidelite'),
    path('utiliser-points/', views.utiliser_points, name='utiliser-points'),
]
