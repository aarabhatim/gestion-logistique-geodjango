from rest_framework import serializers
from django.contrib.auth.models import User
from django.contrib.auth import authenticate
from .models import UserProfile, ClientProfile, ChauffeurProfile


class ClientProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClientProfile
        fields = ['entreprise', 'adresse', 'note_fidelite']


class ChauffeurProfileSerializer(serializers.ModelSerializer):
    vehicule_immatriculation = serializers.SerializerMethodField()
    vehicule_type = serializers.SerializerMethodField()

    class Meta:
        model = ChauffeurProfile
        fields = ['permis', 'date_naissance', 'note_moyenne', 'disponible',
                  'vehicule', 'vehicule_immatriculation', 'vehicule_type']

    def get_vehicule_immatriculation(self, obj):
        return obj.vehicule.immatriculation if obj.vehicule else None

    def get_vehicule_type(self, obj):
        return obj.vehicule.get_type_vehicule_display() if obj.vehicule else None


class UserMeSerializer(serializers.ModelSerializer):
    role = serializers.CharField(source='profile.role', read_only=True)
    telephone = serializers.CharField(source='profile.telephone', read_only=True)
    client_profile = ClientProfileSerializer(read_only=True)
    chauffeur_profile = ChauffeurProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name',
                  'role', 'telephone', 'client_profile', 'chauffeur_profile']


class RegisterSerializer(serializers.Serializer):
    # Champs communs
    username = serializers.CharField(max_length=150)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True, min_length=6)
    first_name = serializers.CharField(max_length=100)
    last_name = serializers.CharField(max_length=100)
    telephone = serializers.CharField(max_length=20, required=False, default='')
    role = serializers.ChoiceField(choices=['client', 'chauffeur'])

    # Champs client
    entreprise = serializers.CharField(required=False, allow_blank=True, default='')
    adresse = serializers.CharField(required=False, allow_blank=True, default='')

    # Champs chauffeur
    permis = serializers.CharField(required=False, allow_blank=True, default='')
    date_naissance = serializers.DateField(required=False, allow_null=True)

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError("Ce nom d'utilisateur est déjà pris.")
        return value

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("Cet email est déjà utilisé.")
        return value

    def create(self, validated_data):
        role = validated_data['role']

        # Créer l'utilisateur Django
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            password=validated_data['password'],
            first_name=validated_data['first_name'],
            last_name=validated_data['last_name'],
        )

        # Créer le profil de base
        UserProfile.objects.create(
            user=user,
            role=role,
            telephone=validated_data.get('telephone', ''),
        )

        # Créer le profil spécifique au rôle
        if role == 'client':
            ClientProfile.objects.create(
                user=user,
                entreprise=validated_data.get('entreprise', ''),
                adresse=validated_data.get('adresse', ''),
            )
        elif role == 'chauffeur':
            ChauffeurProfile.objects.create(
                user=user,
                permis=validated_data.get('permis', ''),
                date_naissance=validated_data.get('date_naissance', None),
            )

        return user


class LoginSerializer(serializers.Serializer):
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        user = authenticate(username=data['username'], password=data['password'])
        if not user:
            raise serializers.ValidationError("Identifiants incorrects.")
        if not user.is_active:
            raise serializers.ValidationError("Ce compte est désactivé.")
        data['user'] = user
        return data


class UpdatePositionSerializer(serializers.Serializer):
    latitude = serializers.FloatField()
    longitude = serializers.FloatField()
