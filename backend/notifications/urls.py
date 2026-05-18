from django.urls import path
from .views import (
    NotificationListView, NonLuesView, MarquerLueView, ToutMarquerLuView,
    SupprimerNotificationView, SupprimerToutesView, AlertesRetardView,
)

urlpatterns = [
    path('', NotificationListView.as_view(), name='notifications-list'),
    path('non-lues/', NonLuesView.as_view(), name='notifications-non-lues'),
    path('<int:pk>/lire/', MarquerLueView.as_view(), name='notification-lire'),
    path('tout-lire/', ToutMarquerLuView.as_view(), name='notifications-tout-lire'),
    path('<int:pk>/supprimer/', SupprimerNotificationView.as_view(), name='notification-supprimer'),
    path('supprimer-lues/', SupprimerToutesView.as_view(), name='notifications-supprimer-lues'),
    path('alertes-retard/', AlertesRetardView.as_view(), name='notifications-alertes-retard'),
]
