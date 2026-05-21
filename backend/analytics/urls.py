from django.urls import path
from .views import (
    PrevisionDemandeView,
    AdminDashboardView, FondateurAnalyticsView, StatsPubliquesView, HeatmapDataView,
    HeatmapCommandesView, HeatmapRetardsView, HeatmapIncidentsView,
    HeatmapProfitsView, HeatmapTraficView,
)

urlpatterns = [
    path('admin/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('fondateur/', FondateurAnalyticsView.as_view(), name='fondateur-analytics'),
    path('publiques/', StatsPubliquesView.as_view(), name='stats-publiques'),
    path('heatmap/', HeatmapDataView.as_view(), name='heatmap-data'),
    path('heatmap/commandes/', HeatmapCommandesView.as_view(), name='heatmap-commandes'),
    path('heatmap/retards/', HeatmapRetardsView.as_view(), name='heatmap-retards'),
    path('heatmap/incidents/', HeatmapIncidentsView.as_view(), name='heatmap-incidents'),
    path('heatmap/profits/', HeatmapProfitsView.as_view(), name='heatmap-profits'),
    path('heatmap/trafic/', HeatmapTraficView.as_view(), name='heatmap-trafic'),
    path('previsions/', PrevisionDemandeView.as_view(), name='previsions'),
]
