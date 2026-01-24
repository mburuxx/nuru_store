from rest_framework.permissions import BasePermission, SAFE_METHODS

from .models import UserProfile

def _role(user):
    if not user or not user.is_authenticated:
        return None
    profile = getattr(user, "profile", None)
    return getattr(profile, "role", None)


class IsOwner(BasePermission):
    """Only OWNER (or superuser) can access."""
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        return _role(user) == UserProfile.Role.OWNER


class IsCashier(BasePermission):
    """Cashier actions (and OWNER/superuser) allowed."""
    def has_permission(self, request, view):
        user = request.user
        if not user or not user.is_authenticated:
            return False
        if user.is_superuser:
            return True
        r = _role(user)
        return r in (UserProfile.Role.CASHIER, UserProfile.Role.OWNER)


class IsOwnerOrReadOnly(BasePermission):
    """Everyone authenticated can read; only OWNER/superuser can write."""
    def has_permission(self, request, view):
        if request.method in SAFE_METHODS:
            return request.user.is_authenticated
        return IsOwner().has_permission(request, view)
