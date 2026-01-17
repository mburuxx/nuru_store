from django.urls import path

from .views import (
    LoginView, LogoutView, ProfileView, RegisterView,  # API views
    web_login, web_logout, web_profile, web_register,  # WEB views
)
urlpatterns = [
    path("auth/register/", RegisterView.as_view(), name="auth-register"),
    path("auth/login/", LoginView.as_view(), name="auth-login"),
    path("auth/logout/", LogoutView.as_view(), name="auth-logout"),
    path("auth/profile/", ProfileView.as_view(), name="auth-profile"),

# ---------- WEB (Templates / Session auth) ----------
    path("register/", web_register, name="web-register"),
    path("login/", web_login, name="web-login"),
    path("logout/", web_logout, name="web-logout"),
    path("profile/", web_profile, name="web-profile"),
]