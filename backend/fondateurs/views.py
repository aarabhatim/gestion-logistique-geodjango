from django.contrib.gis.geos import Point
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.measure import D
from rest_framework import generics, status, filters
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from accounts.permissions import IsAdminRole, IsFondateurRole, IsAdminOrReadOnly
from .models import Fondateur, Produit, CodePromo
from .serializers import (
    FondateurSerializer, FondateurCreateUpdateSerializer, FondateurProximiteSerializer,
    ProduitSerializer, ProduitCreateSerializer,
    CodePromoSerializer, VerifierCodePromoSerializer,
)


class FondateurProximiteView(APIView):
    """Fondateurs triés par distance depuis la position du client."""
    permission_classes = [AllowAny]

    def get(self, request):
        lat = request.query_params.get('lat')
        lon = request.query_params.get('lon')
        rayon = float(request.query_params.get('rayon', 10))
        categorie = request.query_params.get('categorie')

        qs = Fondateur.objects.filter(is_verified=True)

        if categorie:
            qs = qs.filter(categorie=categorie)

        if lat and lon:
            point = Point(float(lon), float(lat), srid=4326)
            qs = (
                qs.filter(location__distance_lte=(point, D(km=rayon)))
                  .annotate(distance=Distance('location', point))
                  .order_by('distance')
            )

        serializer = FondateurProximiteSerializer(qs[:50], many=True)
        return Response(serializer.data)


class FondateurListView(generics.ListAPIView):
    serializer_class = FondateurSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['categorie', 'ville', 'is_verified', 'is_open']
    search_fields = ['nom_boutique', 'description', 'adresse']

    def get_queryset(self):
        return Fondateur.objects.filter(is_verified=True)


class FondateurDetailView(generics.RetrieveAPIView):
    serializer_class = FondateurSerializer
    permission_classes = [AllowAny]
    queryset = Fondateur.objects.all()


class MaBoutiqueView(APIView):
    """Fondateur: voir et modifier sa propre boutique."""
    permission_classes = [IsFondateurRole]

    def get(self, request):
        try:
            fondateur = request.user.fondateur_profile
        except Fondateur.DoesNotExist:
            return Response({'error': 'Profil fondateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(FondateurSerializer(fondateur).data)

    def post(self, request):
        """Création du profil fondateur."""
        if hasattr(request.user, 'fondateur_profile'):
            return Response({'error': 'Profil fondateur déjà existant.'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = FondateurCreateUpdateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            fondateur = serializer.save()
            return Response(FondateurSerializer(fondateur).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        try:
            fondateur = request.user.fondateur_profile
        except Fondateur.DoesNotExist:
            return Response({'error': 'Profil fondateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = FondateurCreateUpdateSerializer(
            fondateur, data=request.data, partial=True, context={'request': request}
        )
        if serializer.is_valid():
            serializer.save()
            return Response(FondateurSerializer(fondateur).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


# ─── Admin: validation fondateurs ────────────────────────────────────────────

class AdminFondateurListView(generics.ListAPIView):
    serializer_class = FondateurSerializer
    permission_classes = [IsAdminRole]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['is_verified', 'categorie']

    def get_queryset(self):
        return Fondateur.objects.all().order_by('-date_creation')


class AdminFondateurValidateView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        try:
            fondateur = Fondateur.objects.get(pk=pk)
        except Fondateur.DoesNotExist:
            return Response({'error': 'Fondateur introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        action = request.data.get('action')
        if action == 'approuver':
            fondateur.is_verified = True
            fondateur.save()
            return Response({'message': f'{fondateur.nom_boutique} approuvé.'})
        elif action == 'rejeter':
            motif = request.data.get('motif', 'Non conforme.')
            fondateur.is_verified = False
            fondateur.save()
            return Response({'message': f'Rejeté: {motif}'})
        return Response({'error': 'Action invalide. Utilisez "approuver" ou "rejeter".'}, status=status.HTTP_400_BAD_REQUEST)


# ─── Produits ─────────────────────────────────────────────────────────────────

class ProduitListView(generics.ListAPIView):
    serializer_class = ProduitSerializer
    permission_classes = [AllowAny]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['categorie', 'disponible', 'fondateur']
    search_fields = ['nom', 'description']
    ordering_fields = ['prix', 'date_creation', 'nombre_commandes']

    def get_queryset(self):
        fondateur_id = self.kwargs.get('fondateur_pk') or self.request.query_params.get('fondateur')
        qs = Produit.objects.select_related('fondateur').prefetch_related('images')
        if fondateur_id:
            qs = qs.filter(fondateur_id=fondateur_id, disponible=True)
        return qs


class MesProduitsFondateurView(generics.ListCreateAPIView):
    permission_classes = [IsFondateurRole]

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return ProduitCreateSerializer
        return ProduitSerializer

    def get_queryset(self):
        return Produit.objects.filter(fondateur=self.request.user.fondateur_profile)

    def get_serializer_context(self):
        ctx = super().get_serializer_context()
        ctx['fondateur'] = self.request.user.fondateur_profile
        return ctx


class ProduitDetailView(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsFondateurRole]

    def get_serializer_class(self):
        if self.request.method in ('PUT', 'PATCH'):
            return ProduitCreateSerializer
        return ProduitSerializer

    def get_queryset(self):
        return Produit.objects.filter(fondateur=self.request.user.fondateur_profile)


# ─── Codes Promo ──────────────────────────────────────────────────────────────

class CodePromoListView(generics.ListCreateAPIView):
    serializer_class = CodePromoSerializer
    permission_classes = [IsFondateurRole]

    def get_queryset(self):
        return CodePromo.objects.filter(fondateur=self.request.user.fondateur_profile)

    def perform_create(self, serializer):
        serializer.save(fondateur=self.request.user.fondateur_profile)


class VerifierCodePromoView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = VerifierCodePromoSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        try:
            code_promo = CodePromo.objects.get(
                code=serializer.validated_data['code'],
                fondateur_id=serializer.validated_data['fondateur_id'],
            )
        except CodePromo.DoesNotExist:
            return Response({'error': 'Code promo invalide.'}, status=status.HTTP_404_NOT_FOUND)

        montant = serializer.validated_data['montant']
        if not code_promo.est_valide:
            return Response({'error': 'Code promo expiré ou désactivé.'}, status=status.HTTP_400_BAD_REQUEST)

        reduction = code_promo.calculer_reduction(montant)
        return Response({
            'code': code_promo.code,
            'type': code_promo.type_reduction,
            'valeur': str(code_promo.valeur),
            'reduction': reduction,
            'montant_final': float(montant) - reduction,
        })
