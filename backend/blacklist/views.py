from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import AdresseBlacklist
from .serializers import AdresseBlacklistSerializer


class AdresseBlacklistViewSet(viewsets.ModelViewSet):
    queryset = AdresseBlacklist.objects.all()
    serializer_class = AdresseBlacklistSerializer
    permission_classes = [IsAuthenticated]

    def perform_create(self, serializer):
        serializer.save(ajoutee_par=self.request.user)

    @action(detail=False, methods=['post'])
    def verifier(self, request):
        """Verifie si une adresse est blacklistee."""
        adresse = request.data.get('adresse', '').lower()
        if not adresse:
            return Response({'blacklistee': False})
        hits = AdresseBlacklist.objects.filter(
            actif=True,
            adresse__icontains=adresse.split(',')[0][:20]
        )
        if hits.exists():
            hit = hits.first()
            return Response({
                'blacklistee': True,
                'raison': hit.raison,
                'description': hit.description,
            })
        return Response({'blacklistee': False})
