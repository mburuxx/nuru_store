from .models import UserProfile

def ensure_profile(user):
    profile, created = UserProfile.objects.get_or_create(user=user)

    if user.is_superuser and profile.role != UserProfile.Role.OWNER:
        profile.role = UserProfile.Role.OWNER
        profile.save(update_fields=["role"])

    return profile