from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    LoginView, RegisterView, LogoutView, MeView,
    ChangePasswordView, UpdatePositionView,
    AdminUserListView, AdminUserDetailView, AdminBanUserView, AdminResetPasswordView,
)

urlpatterns = [
    # Auth
    path('login/', LoginView.as_view(), name='auth-login'),
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('token/refresh/', TokenRefreshView.as_view(), name='token-refresh'),
    # Profil
    path('me/', MeView.as_view(), name='auth-me'),
    path('me/password/', ChangePasswordView.as_view(), name='auth-change-password'),
    path('position/', UpdatePositionView.as_view(), name='update-position'),
    # Admin
    path('admin/users/', AdminUserListView.as_view(), name='admin-users'),
    path('admin/users/<int:pk>/', AdminUserDetailView.as_view(), name='admin-user-detail'),
    path('admin/users/<int:pk>/ban/', AdminBanUserView.as_view(), name='admin-ban-user'),
    path('admin/users/<int:pk>/reset-password/', AdminResetPasswordView.as_view(), name='admin-reset-password'),
]
