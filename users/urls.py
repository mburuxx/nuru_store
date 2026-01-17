from django.urls import path
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView

from .views import LogoutView, ProfileView, RegisterView, MeView, ChangePasswordView

urlpatterns = [
    path("api/auth/register/", RegisterView.as_view(), name="api-auth-register"),
    path("api/auth/login/", TokenObtainPairView.as_view(), name="api-auth-login"),
    path("api/auth/refresh/", TokenRefreshView.as_view(), name="api-auth-refresh"),
    path("api/auth/logout/", LogoutView.as_view(), name="api-auth-logout"),
    path("api/auth/profile/", ProfileView.as_view(), name="api-auth-profile"),
    path("api/auth/me/", MeView.as_view(), name="api-auth-me"),
    path("api/auth/change-password/", ChangePasswordView.as_view(), name="api-auth-change-password"),
]