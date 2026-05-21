from rest_framework import generics, status, filters, permissions
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend
from .models import Client
from .serializers import ClientSerializer, ClientGeoSerializer


class IsAdminRole(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated and request.user.role == 'ADMIN'


class ClientListCreateView(generics.ListCreateAPIView):
    """Liste tous les clients ou cree un nouveau."""
    serializer_class = ClientSerializer
    permission_classes = [IsAdminRole]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['actif', 'note_fidelite']
    search_fields = ['nom', 'prenom', 'email', 'telephone', 'entreprise', 'adresse']
    ordering_fields = ['date_inscription', 'note_fidelite', 'nom']
    ordering = ['-date_inscription']

    def get_queryset(self):
        qs = Client.objects.all()
        min_note = self.request.query_params.get('min_note')
        if min_note:
            qs = qs.filter(note_fidelite__gte=int(min_note))
        return qs


class ClientDetailView(generics.RetrieveUpdateDestroyAPIView):
    """Detail, mise a jour et suppression d un client."""
    serializer_class = ClientSerializer
    permission_classes = [IsAdminRole]
    queryset = Client.objects.all()

    def destroy(self, request, *args, **kwargs):
        client = self.get_object()
        client.actif = False
        client.save()
        return Response({'detail': 'Client desactive.'}, status=status.HTTP_200_OK)


class ClientGeoListView(generics.ListAPIView):
    """Liste des clients avec position GPS (GeoJSON)."""
    serializer_class = ClientGeoSerializer
    permission_classes = [IsAdminRole]

    def get_queryset(self):
        return Client.objects.filter(localisation__isnull=False, actif=True)


class ClientStatsView(APIView):
    """Statistiques sur les clients."""
    permission_classes = [IsAdminRole]

    def get(self, request):
        total = Client.objects.count()
        actifs = Client.objects.filter(actif=True).count()
        notes = Client.objects.values_list('note_fidelite', flat=True)
        avg_note = round(sum(notes) / len(notes), 2) if notes else 0
        par_note = {}
        for n in range(1, 6):
            par_note[str(n)] = Client.objects.filter(note_fidelite=n).count()
        return Response({
            'total': total,
            'actifs': actifs,
            'inactifs': total - actifs,
            'note_moyenne_fidelite': avg_note,
            'repartition_notes': par_note,
        })


class ClientToggleActifView(APIView):
    """Active ou desactive un client."""
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        try:
            client = Client.objects.get(pk=pk)
        except Client.DoesNotExist:
            return Response({'detail': 'Client introuvable.'}, status=404)
        client.actif = not client.actif
        client.save()
        return Response({
            'id': client.pk,
            'actif': client.actif,
            'detail': 'Client active.' if client.actif else 'Client desactive.',
        })
