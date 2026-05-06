from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Incident
from .serializers import IncidentSerializer
from notifications.signals import create_notification


class IncidentViewSet(viewsets.ModelViewSet):
    queryset = Incident.objects.select_related('commande').all()
    serializer_class = IncidentSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        statut = self.request.query_params.get('statut')
        if statut:
            qs = qs.filter(statut=statut)
        return qs

    def perform_create(self, serializer):
        incident = serializer.save()
        # Auto-notification lors du signalement
        create_notification(
            titre=f"Incident signalé — {incident.commande.reference}",
            message=f"Un incident de type '{incident.get_type_incident_display()}' a été signalé pour la commande {incident.commande.reference}.",
            type_notif='warning',
            commande_ref=incident.commande.reference,
        )

    @action(detail=True, methods=['post'])
    def resoudre(self, request, pk=None):
        """Marquer un incident comme résolu."""
        incident = self.get_object()
        incident.statut = 'resolu'
        incident.date_resolution = timezone.now()
        incident.notes_resolution = request.data.get('notes_resolution', '')
        incident.save()
        create_notification(
            titre=f"Incident résolu — {incident.commande.reference}",
            message=f"L'incident sur la commande {incident.commande.reference} a été résolu.",
            type_notif='success',
            commande_ref=incident.commande.reference,
        )
        return Response({'status': 'incident résolu avec succès'})
