from django.contrib.auth import get_user_model
from rest_framework import generics, permissions, status
from rest_framework.authtoken.models import Token
from rest_framework.response import Response
from rest_framework.views import APIView
from django.contrib import messages
from django.contrib.auth import login, logout
from django.contrib.auth.decorators import login_required
from django.shortcuts import redirect, render
from django.views.decorators.http import require_http_methods

from .forms import LoginForm, RegisterForm
from .models import UserProfile
from .models import UserProfile
from .serializers import LoginSerializer, ProfileSerializer, RegisterSerializer

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        # Create token on signup (handy for Postman)
        token, _ = Token.objects.get_or_create(user=user)

        return Response(
            {
                "message": "User registered successfully.",
                "token": token.key,
            },
            status=status.HTTP_201_CREATED,
        )


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)

        user = serializer.validated_data["user"]
        token, _ = Token.objects.get_or_create(user=user)

        return Response(
            {
                "message": "Login successful.",
                "token": token.key,
            },
            status=status.HTTP_200_OK,
        )


class LogoutView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        # Delete the token to “log out”
        Token.objects.filter(user=request.user).delete()
        return Response({"message": "Logged out successfully."}, status=status.HTTP_200_OK)


class ProfileView(generics.RetrieveAPIView):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = ProfileSerializer

    def get_object(self):
        # Your signal creates it, but we still guard
        profile, _ = UserProfile.objects.get_or_create(user=self.request.user)
        return profile

# traditional django views
@require_http_methods(["GET", "POST"])
def web_register(request):
    if request.user.is_authenticated:
        return redirect("web-profile")

    form = RegisterForm(request.POST or None)
    if request.method == "POST":
        if form.is_valid():
            user = form.save()
            login(request, user)  # session login
            messages.success(request, "Account created. Welcome!")
            return redirect("web-profile")
        else:
            messages.error(request, "Please fix the errors below.")

    return render(request, "register.html", {"form": form})


@require_http_methods(["GET", "POST"])
def web_login(request):
    if request.user.is_authenticated:
        return redirect("web-profile")

    form = LoginForm(request, data=request.POST or None)
    if request.method == "POST":
        if form.is_valid():
            user = form.get_user()
            login(request, user)
            messages.success(request, "Logged in successfully.")
            return redirect("web-profile")
        else:
            messages.error(request, "Invalid username or password.")

    return render(request, "login.html", {"form": form})


@require_http_methods(["POST"])
def web_logout(request):
    logout(request)
    messages.info(request, "You’ve been logged out.")
    return redirect("web-login")


@login_required
def web_profile(request):
    profile, _ = UserProfile.objects.get_or_create(user=request.user)
    return render(request, "profile.html", {"profile": profile})