from django.contrib.auth import authenticate, get_user_model
from rest_framework import serializers

from .models import UserProfile

User = get_user_model()


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=6)
    phone = serializers.CharField(write_only=True, required=False, allow_blank=True)

    class Meta:
        model = User
        fields = ["username", "email", "password", "phone"]

    def validate_email(self, value):
        if value and User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError("A user with this email already exists.")
        return value

    def create(self, validated_data):
        phone = validated_data.pop("phone", "")
        password = validated_data.pop("password")

        user = User(**validated_data)
        user.set_password(password)
        user.save()

        # Profile is created by your signal, but we update it safely here
        profile, _ = UserProfile.objects.get_or_create(user=user)
        profile.role = UserProfile.Role.CASHIER  # force cashier on signup
        profile.phone = phone
        profile.save()

        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        username = attrs.get("username")
        password = attrs.get("password")

        user = authenticate(username=username, password=password)
        if not user:
            raise serializers.ValidationError("Invalid username or password.")
        if not user.is_active:
            raise serializers.ValidationError("This account is inactive.")

        attrs["user"] = user
        return attrs


class ProfileSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)
    email = serializers.EmailField(source="user.email", read_only=True)

    is_superuser = serializers.BooleanField(source="user.is_superuser", read_only=True)
    is_staff = serializers.BooleanField(source="user.is_staff", read_only=True)

    class Meta:
        model = UserProfile
        fields = ["username", "email", "role", "phone", "is_superuser", "is_staff"]
        read_only_fields = ["role"]


class MeSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source="user.username", read_only=True)

    email = serializers.EmailField(source="user.email", required=False, allow_blank=True)
    phone = serializers.CharField(required=False, allow_blank=True)

    is_superuser = serializers.BooleanField(source="user.is_superuser", read_only=True)
    is_staff = serializers.BooleanField(source="user.is_staff", read_only=True)

    class Meta:
        model = UserProfile
        fields = ["username", "email", "role", "phone", "is_superuser", "is_staff"]
        read_only_fields = ["role", "is_superuser", "is_staff"]


    def validate(self, attrs):
        # validate email uniqueness if provided
        user_data = attrs.get("user", {})
        email = user_data.get("email")
        if email is not None:
            email = email.strip()
            if email and User.objects.filter(email__iexact=email).exclude(pk=self.instance.user.pk).exists():
                raise serializers.ValidationError({"email": "That email is already used by another account."})
        return attrs

    def update(self, instance, validated_data):
        user_data = validated_data.pop("user", {})
        email = user_data.get("email", None)

        if email is not None:
            instance.user.email = email.strip()
            instance.user.save(update_fields=["email"])

        phone = validated_data.get("phone", None)
        if phone is not None:
            instance.phone = phone
            instance.save(update_fields=["phone"])

        return instance

class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=6)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Old password is incorrect.")
        return value

    def save(self, **kwargs):
        user = self.context["request"].user
        new_password = self.validated_data["new_password"]
        user.set_password(new_password)
        user.save()
        return user