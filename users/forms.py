from django import forms
from django.contrib.auth import get_user_model
from django.contrib.auth.forms import AuthenticationForm

from .models import UserProfile

User = get_user_model()


class RegisterForm(forms.ModelForm):
    password1 = forms.CharField(widget=forms.PasswordInput, min_length=6, label="Password")
    password2 = forms.CharField(widget=forms.PasswordInput, min_length=6, label="Confirm Password")
    phone = forms.CharField(required=False, max_length=30, label="Phone")

    class Meta:
        model = User
        fields = ["username", "email"]

    def clean_email(self):
        email = (self.cleaned_data.get("email") or "").strip()
        if email and User.objects.filter(email__iexact=email).exists():
            raise forms.ValidationError("A user with this email already exists.")
        return email

    def clean(self):
        cleaned = super().clean()
        p1 = cleaned.get("password1")
        p2 = cleaned.get("password2")
        if p1 and p2 and p1 != p2:
            self.add_error("password2", "Passwords do not match.")
        return cleaned

    def save(self, commit=True):
        user = super().save(commit=False)
        user.set_password(self.cleaned_data["password1"])
        if commit:
            user.save()

            # Signal creates profile, but we enforce values here
            profile, _ = UserProfile.objects.get_or_create(user=user)
            profile.role = UserProfile.Role.CASHIER
            profile.phone = self.cleaned_data.get("phone", "")
            profile.save()

        return user


class LoginForm(AuthenticationForm):
    # Django's AuthenticationForm already handles auth
    pass

class ProfileEditForm(forms.ModelForm):
    email = forms.EmailField(required=False, label="Email")

    class Meta:
        model = UserProfile
        fields = ["phone"]  # role not editable by user

    def __init__(self, *args, **kwargs):
        self.user = kwargs.pop("user")
        super().__init__(*args, **kwargs)
        self.fields["email"].initial = self.user.email

    def clean_email(self):
        email = (self.cleaned_data.get("email") or "").strip()
        if email and User.objects.filter(email__iexact=email).exclude(pk=self.user.pk).exists():
            raise forms.ValidationError("That email is already used by another account.")
        return email

    def save(self, commit=True):
        profile = super().save(commit=False)
        self.user.email = self.cleaned_data.get("email", "")
        if commit:
            self.user.save()
            profile.save()
        return profile


class PromoteRoleForm(forms.Form):
    username = forms.CharField(label="Username")
    role = forms.ChoiceField(choices=UserProfile.Role.choices, label="Role")

    def clean_username(self):
        username = (self.cleaned_data.get("username") or "").strip()
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise forms.ValidationError("User not found.")
        self.user_obj = user
        return username

    def clean(self):
        cleaned = super().clean()
        user = getattr(self, "user_obj", None)
        if user and user.is_superuser:
            self.add_error("username", "You can't change role for a superuser here.")
        return cleaned