from django.utils import timezone
from django.contrib.gis.geos import Point
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.tokens import RefreshToken

from .models import ChauffeurProfile
from .serializers import (
    RegisterSerializer, LoginSerializer,
    UserMeSerializer, UpdatePositionSerializer
)


def get_tokens_for_user(user):
    """Génère une paire de tokens JWT pour un utilisateur."""
    refresh = RefreshToken.for_user(user)
    return {
        'refresh': str(refresh),
        'access': str(refresh.access_token),
    }


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            tokens = get_tokens_for_user(user)
            return Response({
                'message': 'Compte créé avec succès !',
                'tokens': tokens,
                'user': UserMeSerializer(user).data,
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            tokens = get_tokens_for_user(user)
            return Response({
                'tokens': tokens,
                'user': UserMeSerializer(user).data,
            })
        return Response(serializer.errors, status=status.HTTP_401_UNAUTHORIZED)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            refresh_token = request.data.get("refresh")
            token = RefreshToken(refresh_token)
            token.blacklist()
            return Response({"message": "Déconnexion réussie."})
        except Exception:
            return Response({"error": "Token invalide."}, status=status.HTTP_400_BAD_REQUEST)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserMeSerializer(request.user).data)


class UpdatePositionView(APIView):
    """Permet à un chauffeur de mettre à jour sa position GPS."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        # Vérifier que l'utilisateur est bien un chauffeur
        try:
            profile = request.user.profile
            if profile.role != 'chauffeur':
                return Response(
                    {'error': "Seuls les chauffeurs peuvent mettre à jour leur position."},
                    status=status.HTTP_403_FORBIDDEN
                )
        except Exception:
            return Response({'error': "Profil introuvable."}, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdatePositionSerializer(data=request.data)
        if serializer.is_valid():
            lat = serializer.validated_data['latitude']
            lon = serializer.validated_data['longitude']

            chauffeur_profile, created = ChauffeurProfile.objects.get_or_create(user=request.user)
            chauffeur_profile.position_actuelle = Point(lon, lat, srid=4326)
            chauffeur_profile.derniere_position_maj = timezone.now()
            chauffeur_profile.save()

            return Response({'status': 'Position mise à jour.', 'latitude': lat, 'longitude': lon})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
