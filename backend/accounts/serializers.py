from rest_framework import serializers
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from django.contrib.auth import authenticate
from django.contrib.gis.geos import Point
from .models import CustomUser


class DeliverMapTokenObtainSerializer(TokenObtainPairSerializer):
    """JWT tokens enrichis avec le rôle utilisateur."""

    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['username'] = user.username
        token['email'] = user.email
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        user = self.user
        if user.is_banned:
            raise serializers.ValidationError("Compte suspendu. Contactez le support.")
        data['user'] = UserMeSerializer(user).data
        return data


class UserMeSerializer(serializers.ModelSerializer):
    avatar_url = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    latitude = serializers.SerializerMethodField()

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone', 'avatar_url', 'bio',
            'latitude', 'longitude', 'adresses_sauvegardees',
            'is_banned', 'is_staff', 'is_superuser', 'date_joined',
        ]
        read_only_fields = ['id', 'date_joined', 'is_banned', 'is_staff', 'is_superuser']

    def get_avatar_url(self, obj):
        request = self.context.get('request')
        if obj.avatar and request:
            return request.build_absolute_uri(obj.avatar.url)
        return None

    def get_latitude(self, obj):
        return obj.location.y if obj.location else None

    def get_longitude(self, obj):
        return obj.location.x if obj.location else None


class UserPublicSerializer(serializers.ModelSerializer):
    """Infos publiques minimales + position GPS pour transporteurs."""
    avatar_url = serializers.SerializerMethodField()
    latitude = serializers.SerializerMethodField()
    longitude = serializers.SerializerMethodField()
    phone = serializers.CharField(read_only=True)

    class Meta:
        model = CustomUser
        fields = ['id', 'username', 'first_name', 'last_name', 'role', 'avatar_url',
                  'phone', 'latitude', 'longitude']

    def get_avatar_url(self, obj):
        request = self.context.get('request')
        if obj.avatar and request:
            return request.build_absolute_uri(obj.avatar.url)
        return None

    def get_latitude(self, obj):
        return obj.location.y if obj.location else None

    def get_longitude(self, obj):
        return obj.location.x if obj.location else None


class RegisterSerializer(serializers.Serializer):
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    phone = serializers.CharField(max_length=20, required=False, default='')
    role = serializers.ChoiceField(choices=['CLIENT', 'TRANSPORTEUR', 'FONDATEUR'], default='CLIENT')
    # Champs transporteur (optionnels)
    vehicule_type = serializers.ChoiceField(
        choices=['MOTO', 'VOITURE', 'CAMIONNETTE', 'CAMION'], required=False, allow_null=True
    )
    plaque = serializers.CharField(max_length=20, required=False, default='')
    permis = serializers.CharField(max_length=50, required=False, default='')

    def validate_username(self, value):
        if CustomUser.objects.filter(username=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà pris.")
        return value

    def validate_email(self, value):
        if CustomUser.objects.filter(email=value).exists():
            raise serializers.ValidationError("Cet email est déjà utilisé.")
        return value

    def create(self, validated_data):
        vehicule_type = validated_data.pop('vehicule_type', None)
        plaque = validated_data.pop('plaque', '')
        validated_data.pop('permis', '')  # permis is a FileField, skip for now

        user = CustomUser.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
            phone=validated_data.get('phone', ''),
            role=validated_data.get('role', 'CLIENT'),
        )
        # Créer profil transporteur automatiquement
        if user.role == 'TRANSPORTEUR':
            try:
                from transporteurs.models import Transporteur
                import uuid
                # Plaque unique si non fournie
                final_plaque = plaque.strip() or f'TMP-{uuid.uuid4().hex[:8].upper()}'
                Transporteur.objects.create(
                    user=user,
                    vehicule_type=vehicule_type or 'VOITURE',
                    plaque=final_plaque,
                    is_available=False,
                    is_verified=False,
                )
            except Exception:
                pass
        return user


class UpdateProfileSerializer(serializers.ModelSerializer):
    latitude = serializers.FloatField(write_only=True, required=False, allow_null=True)
    longitude = serializers.FloatField(write_only=True, required=False, allow_null=True)

    class Meta:
        model = CustomUser
        fields = ['first_name', 'last_name', 'phone', 'bio', 'avatar', 'adresses_sauvegardees',
                  'latitude', 'longitude']

    def update(self, instance, validated_data):
        lat = validated_data.pop('latitude', None)
        lon = validated_data.pop('longitude', None)
        if lat is not None and lon is not None:
            instance.location = Point(lon, lat, srid=4326)
        return super().update(instance, validated_data)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=6)

    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError("Ancien mot de passe incorrect.")
        return value


class AdminUserSerializer(serializers.ModelSerializer):
    """Serializer complet pour l'admin."""

    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name',
            'role', 'phone', 'is_banned', 'is_active',
            'date_joined', 'last_login',
        ]
        read_only_fields = ['id', 'date_joined', 'last_login']
