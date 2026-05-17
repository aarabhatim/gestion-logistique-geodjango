from django.urls import path
from .views import AdminDashboardView, FondateurAnalyticsView, StatsPubliquesView, HeatmapDataView

urlpatterns = [
    path('admin/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('fondateur/', FondateurAnalyticsView.as_view(), name='fondateur-analytics'),
    path('publiques/', StatsPubliquesView.as_view(), name='stats-publiques'),
    path('heatmap/', HeatmapDataView.as_view(), name='heatmap-data'),
]
