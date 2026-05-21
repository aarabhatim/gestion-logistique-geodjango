from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.utils import timezone
from .models import CampagnePromo
from .serializers import CampagnePromoSerializer


class CampagnePromoViewSet(viewsets.ModelViewSet):
    queryset = CampagnePromo.objects.all()
    serializer_class = CampagnePromoSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = CampagnePromo.objects.all()
        if self.request.query_params.get('actif') == 'true':
            qs = qs.filter(actif=True)
        return qs

    @action(detail=False, methods=['post'])
    def verifier(self, request):
        """Verifie si un code promo est valide."""
        code = request.data.get('code', '').upper()
        montant = float(request.data.get('montant', 0))
        try:
            promo = CampagnePromo.objects.get(code__iexact=code)
            if not promo.est_valide:
                return Response({'valide': False, 'message': 'Code expire ou invalide'})
            if montant < float(promo.montant_min_commande):
                return Response({
                    'valide': False,
                    'message': f'Commande minimum: {promo.montant_min_commande} DH'
                })
            reduction = 0
            if promo.type_reduction == 'pourcentage':
                reduction = montant * float(promo.valeur) / 100
            elif promo.type_reduction == 'montant_fixe':
                reduction = float(promo.valeur)
            else:
                reduction = 0  # livraison_gratuite handled frontend
            return Response({
                'valide': True,
                'reduction': round(reduction, 2),
                'type': promo.type_reduction,
                'valeur': float(promo.valeur),
                'nom': promo.nom,
                'id': promo.id,
            })
        except CampagnePromo.DoesNotExist:
            return Response({'valide': False, 'message': 'Code introuvable'})

    @action(detail=True, methods=['post'])
    def utiliser(self, request, pk=None):
        promo = self.get_object()
        promo.usage_count += 1
        promo.save()
        return Response({'usage_count': promo.usage_count})

    @action(detail=False, methods=['get'])
    def stats(self, request):
        qs = CampagnePromo.objects.all()
        return Response({
            'total': qs.count(),
            'actives': qs.filter(actif=True).count(),
            'total_utilisations': sum(p.usage_count for p in qs),
        })
