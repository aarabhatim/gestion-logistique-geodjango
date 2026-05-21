from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.contrib.gis.geos import Point
from .models import ZoneLivraison
from .serializers import ZoneLivraisonSerializer, ZoneLivraisonGeoSerializer


class ZoneLivraisonViewSet(viewsets.ModelViewSet):
    queryset = ZoneLivraison.objects.all()
    serializer_class = ZoneLivraisonSerializer
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.request.query_params.get('geo') == 'true':
            return ZoneLivraisonGeoSerializer
        return ZoneLivraisonSerializer

    def get_queryset(self):
        qs = ZoneLivraison.objects.all()
        if self.request.query_params.get('actif'):
            qs = qs.filter(actif=True)
        return qs

    @action(detail=True, methods=['post'])
    def assigner_transporteur(self, request, pk=None):
        zone = self.get_object()
        tid = request.data.get('transporteur_id')
        if not tid:
            return Response({'error': 'transporteur_id requis'}, status=400)
        from transporteurs.models import Transporteur
        try:
            t = Transporteur.objects.get(pk=tid)
            zone.transporteurs.add(t)
            return Response({'status': 'ok', 'message': f'{t} assigne a {zone.nom}'})
        except Transporteur.DoesNotExist:
            return Response({'error': 'Transporteur introuvable'}, status=404)

    @action(detail=True, methods=['post'])
    def retirer_transporteur(self, request, pk=None):
        zone = self.get_object()
        tid = request.data.get('transporteur_id')
        from transporteurs.models import Transporteur
        try:
            t = Transporteur.objects.get(pk=tid)
            zone.transporteurs.remove(t)
            return Response({'status': 'ok'})
        except Transporteur.DoesNotExist:
            return Response({'error': 'Transporteur introuvable'}, status=404)

    @action(detail=False, methods=['get'])
    def pour_position(self, request):
        """Retourne la zone correspondant a une position GPS."""
        lat = request.query_params.get('lat')
        lng = request.query_params.get('lng')
        if not lat or not lng:
            return Response({'error': 'lat/lng requis'}, status=400)
        try:
            point = Point(float(lng), float(lat), srid=4326)
            zone = ZoneLivraison.objects.filter(polygone__contains=point, actif=True).first()
            if zone:
                return Response(ZoneLivraisonSerializer(zone).data)
            return Response({'detail': 'Aucune zone'}, status=404)
        except (ValueError, Exception) as e:
            return Response({'error': str(e)}, status=400)
