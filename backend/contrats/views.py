from django.http import FileResponse
from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import Contrat
from .serializers import ContratSerializer


class ContratViewSet(viewsets.ModelViewSet):
    serializer_class = ContratSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Contrat.objects.select_related('boutique', 'client', 'transporteur', 'cree_par').all()
        if user.role == 'ADMIN':
            pass
        elif user.role == 'CLIENT':
            qs = qs.filter(client=user)
        elif user.role == 'TRANSPORTEUR':
            qs = qs.filter(transporteur=user)
        elif user.role == 'FONDATEUR':
            qs = qs.filter(boutique__user=user)
        else:
            qs = qs.none()

        # Filtres
        statut = self.request.query_params.get('statut')
        if statut:
            qs = qs.filter(statut=statut)
        return qs

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)

    @action(detail=True, methods=['post'], url_path='generer-pdf')
    def generer_pdf(self, request, pk=None):
        """Génère ou régénère le PDF du contrat."""
        contrat = self.get_object()
        try:
            contrat.generer_pdf()
        except Exception as e:
            return Response({'detail': f'Erreur génération PDF : {e}'}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return Response({
            'status': 'PDF généré',
            'url': request.build_absolute_uri(contrat.fichier_pdf.url) if contrat.fichier_pdf else None,
        })

    @action(detail=True, methods=['get'], url_path='telecharger-pdf')
    def telecharger_pdf(self, request, pk=None):
        """Télécharge le PDF (génère si absent)."""
        contrat = self.get_object()
        if not contrat.fichier_pdf:
            try:
                contrat.generer_pdf()
            except Exception as e:
                return Response({'detail': str(e)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        return FileResponse(
            contrat.fichier_pdf.open('rb'),
            as_attachment=True,
            filename=f"contrat_{contrat.pk}.pdf",
        )

    @action(detail=True, methods=['post'], url_path='signer')
    def signer(self, request, pk=None):
        """Marque le contrat comme signé."""
        contrat = self.get_object()
        if contrat.statut not in ('brouillon', 'envoye'):
            return Response({'detail': 'Statut incompatible pour la signature.'}, status=status.HTTP_400_BAD_REQUEST)
        contrat.statut = 'signe'
        contrat.signe_at = timezone.now()
        contrat.save(update_fields=['statut', 'signe_at'])
        return Response({'status': 'contrat signé', 'signe_at': contrat.signe_at})

    @action(detail=True, methods=['post'], url_path='activer')
    def activer(self, request, pk=None):
        """Active un contrat signé."""
        contrat = self.get_object()
        if contrat.statut != 'signe':
            return Response({'detail': 'Le contrat doit être signé avant activation.'}, status=status.HTTP_400_BAD_REQUEST)
        contrat.statut = 'actif'
        contrat.save(update_fields=['statut'])
        return Response({'status': 'contrat activé'})

    @action(detail=True, methods=['post'], url_path='resilier')
    def resilier(self, request, pk=None):
        """Résilie un contrat actif."""
        contrat = self.get_object()
        if contrat.statut != 'actif':
            return Response({'detail': 'Seuls les contrats actifs peuvent être résiliés.'}, status=status.HTTP_400_BAD_REQUEST)
        contrat.statut = 'resilie'
        contrat.save(update_fields=['statut'])
        return Response({'status': 'contrat résilié'})

    @action(detail=False, methods=['post'], url_path='verifier-expirations')
    def verifier_expirations(self, request):
        """Lance la vérification d'expiration sur tous les contrats actifs (admin)."""
        if request.user.role != 'ADMIN':
            return Response({'detail': 'Réservé aux admins.'}, status=status.HTTP_403_FORBIDDEN)
        actifs = Contrat.objects.filter(statut='actif')
        checked = 0
        for contrat in actifs:
            contrat.verifier_expiration()
            checked += 1
        return Response({'verifies': checked})
