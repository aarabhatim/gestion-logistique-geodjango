from rest_framework import generics, permissions
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from .models import PositionVehicule
from .serializers import PositionVehiculeSerializer
from commandes.models import Commande


class IsAdminOrTransporteur(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and (
            request.user.role in ('ADMIN', 'TRANSPORTEUR')
        )


class HistoriquePositionsView(generics.ListAPIView):
    """Historique des positions GPS pour une commande."""
    serializer_class = PositionVehiculeSerializer
    permission_classes = [IsAdminOrTransporteur]

    def get_queryset(self):
        commande_id = self.kwargs['commande_id']
        commande = get_object_or_404(Commande, pk=commande_id)
        user = self.request.user
        if user.role == 'TRANSPORTEUR':
            if not commande.transporteur or commande.transporteur.pk != user.pk:
                return PositionVehicule.objects.none()
        return PositionVehicule.objects.filter(commande=commande).order_by('horodatage')


class DernierePositionView(generics.RetrieveAPIView):
    """Derniere position connue pour une commande (tracking client)."""
    serializer_class = PositionVehiculeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, commande_id):
        commande = get_object_or_404(Commande, pk=commande_id)
        user = request.user
        if user.role == 'CLIENT' and commande.client.pk != user.pk:
            return Response({'detail': 'Non autorise.'}, status=403)
        pos = PositionVehicule.objects.filter(commande=commande).order_by('-horodatage').first()
        if not pos:
            return Response({'detail': 'Aucune position disponible.'}, status=404)
        serializer = self.serializer_class(pos)
        return Response(serializer.data)
