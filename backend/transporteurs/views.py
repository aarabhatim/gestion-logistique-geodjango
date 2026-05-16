from django.contrib.gis.geos import Point
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.measure import D
from django.utils import timezone
from rest_framework import generics, status, filters
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from accounts.permissions import IsAdminRole, IsTransporteurRole
from .models import Transporteur
from .serializers import (
    TransporteurSerializer, TransporteurOnboardingSerializer,
    TransporteurDashboardSerializer, TransporteurDisponibleSerializer,
)


class MonProfilTransporteurView(APIView):
    permission_classes = [IsTransporteurRole]

    def get(self, request):
        try:
            t = request.user.transporteur_profile
        except Transporteur.DoesNotExist:
            return Response({'error': 'Profil transporteur introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(TransporteurDashboardSerializer(t).data)

    def post(self, request):
        if hasattr(request.user, 'transporteur_profile'):
            return Response({'error': 'Profil transporteur déjà créé.'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = TransporteurOnboardingSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            t = serializer.save()
            return Response(TransporteurSerializer(t).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        try:
            t = request.user.transporteur_profile
        except Transporteur.DoesNotExist:
            return Response({'error': 'Profil transporteur introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = TransporteurOnboardingSerializer(t, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(TransporteurSerializer(t).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ToggleDisponibiliteView(APIView):
    permission_classes = [IsTransporteurRole]

    def post(self, request):
        try:
            t = request.user.transporteur_profile
        except Transporteur.DoesNotExist:
            return Response({'error': 'Profil transporteur introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        t.is_available = not t.is_available
        t.save(update_fields=['is_available'])
        return Response({
            'is_available': t.is_available,
            'message': 'Disponible' if t.is_available else 'Indisponible',
        })


class TransporteurDisponiblesView(APIView):
    """Transporteurs disponibles dans un rayon — utilisé par le matching."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        lat = request.query_params.get('lat')
        lon = request.query_params.get('lon')
        rayon = float(request.query_params.get('rayon', 5))
        vehicule_type = request.query_params.get('vehicule_type')
        poids = float(request.query_params.get('poids_kg', 0))

        qs = Transporteur.objects.filter(is_available=True, is_verified=True, is_on_delivery=False)

        if vehicule_type:
            qs = qs.filter(vehicule_type=vehicule_type)
        if poids:
            qs = qs.filter(capacite_kg__gte=poids)

        if lat and lon:
            point = Point(float(lon), float(lat), srid=4326)
            qs = (
                qs.filter(position_actuelle__distance_lte=(point, D(km=rayon)))
                  .annotate(distance=Distance('position_actuelle', point))
                  .order_by('distance')
            )

        serializer = TransporteurDisponibleSerializer(qs[:20], many=True)
        return Response(serializer.data)


# ─── Admin ────────────────────────────────────────────────────────────────────

class AdminTransporteurListView(generics.ListAPIView):
    serializer_class = TransporteurSerializer
    permission_classes = [IsAdminRole]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['is_verified', 'is_available', 'vehicule_type']
    search_fields = ['user__email', 'user__first_name', 'plaque']
    queryset = Transporteur.objects.select_related('user').all()


class AdminTransporteurValidateView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        try:
            t = Transporteur.objects.get(pk=pk)
        except Transporteur.DoesNotExist:
            return Response({'error': 'Transporteur introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        action = request.data.get('action')
        if action == 'approuver':
            t.is_verified = True
            t.save()
            return Response({'message': f'{t.user.get_full_name()} approuvé.'})
        elif action == 'rejeter':
            t.is_verified = False
            t.save()
            return Response({'message': 'Rejeté.'})
        return Response({'error': 'Action invalide.'}, status=status.HTTP_400_BAD_REQUEST)
