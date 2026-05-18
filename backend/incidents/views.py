from django.utils import timezone
from django.contrib.auth import get_user_model
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from notifications.models import envoyer_notification
from .models import Incident, IncidentPhoto
from .serializers import IncidentSerializer, IncidentListSerializer, IncidentPhotoSerializer

User = get_user_model()


def _notifier_admins(titre, message, commande_id=None):
    """Envoie une notification à tous les utilisateurs admin."""
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
        _notifier_admins(
            titre=f"⚠️ Incident signalé — {incident.commande.reference}",
            message=(
                f"Un incident de type '{incident.get_type_incident_display()}' a été signalé "
                f"pour la commande {incident.commande.reference}.\n"
                f"Description : {incident.description[:120]}"
            ),
            commande_id=incident.commande.pk,
        )

    @action(detail=True, methods=['post'])
    def resoudre(self, request, pk=None):
        """Marquer un incident comme résolu (admin)."""
        incident = self.get_object()
        if incident.statut == 'resolu':
            return Response({'detail': 'Incident déjà résolu.'}, status=status.HTTP_400_BAD_REQUEST)
        incident.statut = 'resolu'
        incident.date_resolution = timezone.now()
        incident.notes_resolution = request.data.get('notes_resolution', '')
        incident.save(update_fields=['statut', 'date_resolution', 'notes_resolution'])
        _notifier_admins(
            titre=f"✅ Incident résolu — {incident.commande.reference}",
            message=f"L'incident sur la commande {incident.commande.reference} a été résolu.",
            commande_id=incident.commande.pk,
        )
        return Response({'status': 'incident résolu avec succès'})

    @action(detail=True, methods=['post'], url_path='ajouter-photo',
            parser_classes=[MultiPartParser, FormParser])
    def ajouter_photo(self, request, pk=None):
        """Uploader une ou plusieurs photos pour un incident."""
        incident = self.get_object()
        images = request.FILES.getlist('images')
        if not images:
            return Response({'detail': 'Aucune image fournie.'}, status=status.HTTP_400_BAD_REQUEST)
        created = []
        for img in images:
            legende = request.data.get('legende', '')
            photo = IncidentPhoto.objects.create(incident=incident, image=img, legende=legende)
            created.append(IncidentPhotoSerializer(photo, context={'request': request}).data)
        return Response({'photos': created, 'count': len(created)}, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['get'], url_path='photos')
    def liste_photos(self, request, pk=None):
        """Lister les photos d'un incident."""
        incident = self.get_object()
        serializer = IncidentPhotoSerializer(
            incident.photos.all(), many=True, context={'request': request}
        )
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        return self.statistiques(request)

    @action(detail=False, methods=['get'], url_path='statistiques')
    def statistiques(self, request):
        """KPIs incidents pour le dashboard admin."""
        from django.db.models import Count
        stats = Incident.objects.values('statut').annotate(count=Count('id'))
        par_type = Incident.objects.values('type_incident').annotate(count=Count('id')).order_by('-count')
        return Response({
            'par_statut': {s['statut']: s['count'] for s in stats},
            'par_type': list(par_type),
            'total': Incident.objects.count(),
            'ouverts': Incident.objects.filter(statut='ouvert').count(),
        })
