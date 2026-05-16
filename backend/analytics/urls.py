from django.urls import path
from .views import AdminDashboardView, FondateurAnalyticsView, StatsPubliquesView

urlpatterns = [
    path('admin/', AdminDashboardView.as_view(), name='admin-dashboard'),
    path('fondateur/', FondateurAnalyticsView.as_view(), name='fondateur-analytics'),
    path('publiques/', StatsPubliquesView.as_view(), name='stats-publiques'),
]
