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