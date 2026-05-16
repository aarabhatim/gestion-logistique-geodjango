from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Fondateur, Produit, CodePromo
from .serializers import FondateurSerializer, ProduitSerializer, CodePromoSerializer
from django.db.models import Sum

class FondateurViewSet(viewsets.ModelViewSet):
    queryset = Fondateur.objects.all()
    serializer_class = FondateurSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['get'])
    def analytics(self, request, pk=None):
        fondateur = self.get_object()
        # Basic analytics logic for Phase 2
        # Commandes pour ce fondateur
        from commandes.models import Commande
        commandes = Commande.objects.filter(fondateur=fondateur)
        total_ca = commandes.filter(statut__in=['VALIDEE', 'LIVREE']).aggregate(total=Sum('total_price'))['total'] or 0
        total_commandes = commandes.count()
        return Response({
            'total_ca': total_ca,
            'total_commandes': total_commandes
        })

class ProduitViewSet(viewsets.ModelViewSet):
    queryset = Produit.objects.all()
    serializer_class = ProduitSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]

    def perform_create(self, serializer):
        fondateur = self.request.user.fondateur_profile
        serializer.save(fondateur=fondateur)

class CodePromoViewSet(viewsets.ModelViewSet):
    queryset = CodePromo.objects.all()
    serializer_class = CodePromoSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'FONDATEUR':
            return CodePromo.objects.filter(fondateur__user=user)
        return CodePromo.objects.all()

    def perform_create(self, serializer):
        fondateur = self.request.user.fondateur_profile
        serializer.save(fondateur=fondateur)
