from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from notifications.models import envoyer_notification
from utils.ws_broadcast import broadcast_group
from .models import Incident, IncidentPhoto
from .serializers import IncidentSerializer, IncidentListSerializer, IncidentPhotoSerializer

User = get_user_model()


def _notifier_admins(titre, message, commande_id=None):
    """Envoie une notification a tous les utilisateurs admin."""
    admins = User.objects.filter(role='ADMIN', is_active=True)
    for admin in admins:
        envoyer_notification(admin, titre, message, type_notif='WARNING', commande_id=commande_id)


class IncidentViewSet(viewsets.ModelViewSet):
    queryset = Incident.objects.select_related('commande').prefetch_related('photos').all()
    permission_classes = [IsAuthenticated]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get_serializer_class(self):
        if self.action == 'list':
            return IncidentListSerializer
        return IncidentSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        statut = self.request.query_params.get('statut')
        type_incident = self.request.query_params.get('type')
        commande_id = self.request.query_params.get('commande')
        if statut:
            qs = qs.filter(statut=statut)
        if type_incident:
            qs = qs.filter(type_incident=type_incident)
        if commande_id:
            qs = qs.filter(commande_id=commande_id)
        return qs

    def perform_create(self, serializer):
        incident = serializer.save()
        # Notification interne aux admins
        _notifier_admins(
            titre=f"Incident signale -- {incident.get_type_incident_display()}",
            message=f"Commande #{incident.commande_id} : {incident.description[:120]}",
            commande_id=incident.commande_id,
        )
        # Push WebSocket vers le groupe admin_incidents
        broadcast_group('admin_incidents', {
            'event': 'incident_created',
            'incident_id': incident.pk,
            'type': incident.type_incident,
            'commande_id': incident.commande_id,
        })
        # Email aux admins
        try:
            from utils.emails import email_incident_signale
            admin_emails = list(
                User.objects.filter(role='ADMIN', is_active=True)
                .values_list('email', flat=True)
            )
            if admin_emails:
                email_incident_signale(incident, admin_emails)
        except Exception:
            pass

    @action(detail=True, methods=['post'], url_path='resoudre')
    def resoudre(self, request, pk=None):
        """Marquer un incident comme resolu."""
        incident = self.get_object()
        if request.user.role != 'ADMIN':
            return Response({'detail': 'Reserve aux admins.'}, status=status.HTTP_403_FORBIDDEN)
        notes = request.data.get('notes_resolution', '')
        incident.statut = 'resolu'
        incident.date_resolution = timezone.now()
        incident.notes_resolution = notes
        incident.save(update_fields=['statut', 'date_resolution', 'notes_resolution'])
        # Notifier le chauffeur qui a signe l'incident (via commande > transporteur)
        try:
            transporteur = incident.commande.transporteur
            if transporteur:
                envoyer_notification(
                    transporteur,
                    titre=f"Incident #{incident.pk} resolu",
                    message=f"L'incident sur la commande #{incident.commande_id} a ete resolu.",
                    type_notif='SUCCESS',
                )
        except Exception:
            pass
        broadcast_group('admin_incidents', {
            'event': 'incident_updated',
            'incident_id': incident.pk,
            'statut': 'resolu',
        })
        return Response(IncidentSerializer(incident, context={'request': request}).data)

    @action(detail=False, methods=['get'], url_path='mes-incidents')
    def mes_incidents(self, request):
        """Incidents signalés par le transporteur connecté."""
        qs = Incident.objects.filter(
            commande__transporteur=request.user
        ).select_related('commande').prefetch_related('photos').order_by('-date_signalement')
        serializer = IncidentListSerializer(qs, many=True, context={'request': request})
        return Response(serializer.data)

    @action(detail=True, methods=['post'], url_path='prendre-en-charge')
    def prendre_en_charge(self, request, pk=None):
        """Passer l'incident en traitement (alias de en-traitement)."""
        incident = self.get_object()
        incident.statut = 'en_traitement'
        incident.save(update_fields=['statut'])
        broadcast_group('admin_incidents', {
            'event': 'incident_updated',
            'incident_id': incident.pk,
            'statut': 'en_traitement',
        })
        return Response(IncidentSerializer(incident, context={'request': request}).data)

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """Statistiques globales des incidents."""
        from django.db.models import Count
        qs = Incident.objects.all()
        total = qs.count()
        par_statut = dict(qs.values_list('statut').annotate(n=Count('id')).values_list('statut', 'n'))
        par_type   = dict(qs.values_list('type_incident').annotate(n=Count('id')).values_list('type_incident', 'n'))
        return Response({
            'total': total,
            'ouverts': par_statut.get('ouvert', 0),
            'en_traitement': par_statut.get('en_traitement', 0),
            'resolus': par_statut.get('resolu', 0),
            'par_type': par_type,
        })

    @action(detail=True, methods=['post'], url_path='en-traitement')
    def en_traitement(self, request, pk=None):
        """Passer un incident en traitement."""
        incident = self.get_object()
        if request.user.role != 'ADMIN':
            return Response({'detail': 'Reserve aux admins.'}, status=status.HTTP_403_FORBIDDEN)
        incident.statut = 'en_traitement'
        incident.save(update_fields=['statut'])
        broadcast_group('admin_incidents', {
            'event': 'incident_updated',
            'incident_id': incident.pk,
            'statut': 'en_traitement',
        })
        return Response(IncidentSerializer(incident, context={'request': request}).data)
