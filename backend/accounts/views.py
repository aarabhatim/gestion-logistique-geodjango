from django.contrib.gis.geos import Point
from rest_framework import status, generics, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny, IsAdminUser
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.views import TokenObtainPairView
from django_filters.rest_framework import DjangoFilterBackend

from .models import CustomUser
from .serializers import (
    DeliverMapTokenObtainSerializer,
    RegisterSerializer, UserMeSerializer,
    UpdateProfileSerializer, ChangePasswordSerializer,
    AdminUserSerializer,
)
from .permissions import IsAdminRole


class LoginView(TokenObtainPairView):
    serializer_class = DeliverMapTokenObtainSerializer
    permission_classes = [AllowAny]


class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            refresh = RefreshToken.for_user(user)
            return Response({
                'message': 'Compte créé avec succès.',
                'access': str(refresh.access_token),
                'refresh': str(refresh),
                'user': UserMeSerializer(user, context={'request': request}).data,
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LogoutView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        try:
            token = RefreshToken(request.data.get('refresh'))
            token.blacklist()
            return Response({'message': 'Déconnexion réussie.'})
        except Exception:
            return Response({'error': 'Token invalide.'}, status=status.HTTP_400_BAD_REQUEST)


class MeView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(UserMeSerializer(request.user, context={'request': request}).data)

    def patch(self, request):
        serializer = UpdateProfileSerializer(
            request.user, data=request.data, partial=True, context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(UserMeSerializer(request.user, context={'request': request}).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            request.user.set_password(serializer.validated_data['new_password'])
            request.user.save()
            return Response({'message': 'Mot de passe modifié avec succès.'})
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class UpdatePositionView(APIView):
    """Transporteur met à jour sa position GPS en temps réel."""
    permission_classes = [IsAuthenticated]

    def post(self, request):
        if request.user.role != 'TRANSPORTEUR':
            return Response(
                {'error': 'Seuls les transporteurs peuvent mettre à jour leur position.'},
                status=status.HTTP_403_FORBIDDEN
            )
        lat = request.data.get('latitude')
        lon = request.data.get('longitude')
        if lat is None or lon is None:
            return Response({'error': 'latitude et longitude requis.'}, status=status.HTTP_400_BAD_REQUEST)

        request.user.location = Point(float(lon), float(lat), srid=4326)
        request.user.save(update_fields=['location'])

        # Mettre à jour la position du profil transporteur
        try:
            from transporteurs.models import Transporteur
            transporteur = request.user.transporteur_profile
            transporteur.position_actuelle = Point(float(lon), float(lat), srid=4326)
            transporteur.save(update_fields=['position_actuelle'])
        except Exception:
            pass

        return Response({'status': 'ok', 'latitude': lat, 'longitude': lon})


# ─── Admin: gestion utilisateurs ─────────────────────────────────────────────

class AdminUserListView(generics.ListAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminRole]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['role', 'is_banned', 'is_active']
    search_fields = ['username', 'email', 'first_name', 'last_name', 'phone']
    ordering_fields = ['date_joined', 'last_login']
    ordering = ['-date_joined']

    def get_queryset(self):
        return CustomUser.objects.all()


class AdminUserDetailView(generics.RetrieveUpdateDestroyAPIView):
    serializer_class = AdminUserSerializer
    permission_classes = [IsAdminRole]
    queryset = CustomUser.objects.all()


class AdminBanUserView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        try:
            user = CustomUser.objects.get(pk=pk)
        except CustomUser.DoesNotExist:
            return Response({'error': 'Utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        user.is_banned = not user.is_banned
        user.is_active = not user.is_banned
        user.save()
        action = 'Banni' if user.is_banned else 'Débanni'
        return Response({'message': f'{action} avec succès.', 'is_banned': user.is_banned})


class AdminResetPasswordView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        try:
            user = CustomUser.objects.get(pk=pk)
        except CustomUser.DoesNotExist:
            return Response({'error': 'Utilisateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        new_password = request.data.get('new_password', 'DeliverMap2025!')
        user.set_password(new_password)
        user.save()
        return Response({'message': 'Mot de passe réinitialisé.'})
