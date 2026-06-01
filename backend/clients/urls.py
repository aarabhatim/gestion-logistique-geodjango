from django.urls import path
from .views import (
    ClientListCreateView, ClientDetailView,
    ClientGeoListView, ClientStatsView, ClientToggleActifView,
    ExportClientsXLSXView,
)

urlpatterns = [
    path('', ClientListCreateView.as_view(), name='clients-list'),
    path('<int:pk>/', ClientDetailView.as_view(), name='client-detail'),
    path('geo/', ClientGeoListView.as_view(), name='clients-geo'),
    path('stats/', ClientStatsView.as_view(), name='clients-stats'),
    path('<int:pk>/toggle-actif/', ClientToggleActifView.as_view(), name='client-toggle-actif'),
    path('export/xlsx/', ExportClientsXLSXView.as_view(), name='export-clients-xlsx'),
]
