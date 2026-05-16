from django.urls import path
from .views import NotificationListView, NonLuesView, MarquerLueView, ToutMarquerLuView

urlpatterns = [
    path('', NotificationListView.as_view(), name='notifications-list'),
    path('non-lues/', NonLuesView.as_view(), name='notifications-non-lues'),
    path('<int:pk>/lire/', MarquerLueView.as_view(), name='notification-lire'),
    path('tout-lire/', ToutMarquerLuView.as_view(), name='notifications-tout-lire'),
]
