from django.urls import path

from .views import (
    LoginView, LogoutView, ProfileView, RegisterView,  # API views
    web_register, web_login, web_logout, web_profile,
    web_profile_edit, web_role_manage,  # WEB views
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
    path("profile/edit/", web_profile_edit, name="web-profile-edit"),
    path("admin/roles/", web_role_manage, name="web-role-manage"),
]