from django.contrib.auth import get_user_model
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend

from accounts.permissions import IsAdminRole
from .models import Client
from .serializers import ClientSerializer, ClientDetailSerializer, ClientGeoSerializer

User = get_user_model()


class ClientViewSet(viewsets.ModelViewSet):
    """
    CRUD complet pour les clients.

    Endpoints :
      GET    /api/clients/              → liste paginée (admin)
      POST   /api/clients/              → créer un client
      GET    /api/clients/{id}/         → détail simple
      PUT    /api/clients/{id}/         → mise à jour complète
      PATCH  /api/clients/{id}/         → mise à jour partielle
      DELETE /api/clients/{id}/         → suppression (soft : actif=False)
      GET    /api/clients/{id}/detail/  → détail + historique commandes
      GET    /api/clients/geojson/      → liste GeoJSON (pour carte)
      POST   /api/clients/{id}/activer/ → réactiver un client désactivé
    """
    queryset = Client.objects.all().order_by('-date_inscription')
    permission_classes = [IsAuthenticated, IsAdminRole]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['actif', 'note_fidelite', 'entreprise']
    search_fields = ['nom', 'prenom', 'email', 'telephone', 'adresse', 'entreprise']
    ordering_fields = ['nom', 'date_inscription', 'note_fidelite']

    def get_serializer_class(self):
        if self.action == 'detail_complet':
            return ClientDetailSerializer
        if self.action == 'geojson':
            return ClientGeoSerializer
        return ClientSerializer

    def get_queryset(self):
        qs = super().get_queryset()
        actif = self.request.query_params.get('actif')
        if actif is not None:
            qs = qs.filter(actif=actif.lower() in ('true', '1', 'yes'))
        return qs

    def destroy(self, request, *args, **kwargs):
        """Soft delete : marque le client comme inactif au lieu de le supprimer."""
        instance = self.get_object()
        instance.actif = False
        instance.save(update_fields=['actif'])
        return Response({'detail': 'Client désactivé.'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['get'], url_path='detail')
    def detail_complet(self, request, pk=None):
        """Détail complet avec historique des commandes."""
        client = self.get_object()
        serializer = ClientDetailSerializer(client, context={'request': request})
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='geojson')
    def geojson(self, request):
        """Retourne tous les clients actifs en GeoJSON (pour affichage carte)."""
        qs = Client.objects.filter(actif=True).exclude(localisation__isnull=True)
        serializer = ClientGeoSerializer(qs, many=True)
        return Response({
            'type': 'FeatureCollection',
            'features': serializer.data,
        })

    @action(detail=True, methods=['post'], url_path='activer')
    def activer(self, request, pk=None):
        """Réactiver un client précédemment désactivé."""
        client = self.get_object()
        client.actif = True
        client.save(update_fields=['actif'])
        return Response({'detail': 'Client réactivé.', 'id': client.pk})

    @action(detail=False, methods=['get'], url_path='stats')
    def stats(self, request):
        """KPIs clients pour le dashboard admin."""
        total = Client.objects.count()
        actifs = Client.objects.filter(actif=True).count()
        inactifs = total - actifs
        fideles = Client.objects.filter(actif=True, note_fidelite__gte=4).count()
        return Response({
            'total': total,
            'actifs': actifs,
            'inactifs': inactifs,
            'fideles': fideles,
        })
