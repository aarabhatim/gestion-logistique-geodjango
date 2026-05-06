from rest_framework import viewsets
from .models import Transporteur, Vehicule, Chauffeur, Entrepot
from .serializers import TransporteurSerializer, VehiculeSerializer, ChauffeurSerializer, EntrepotSerializer


class TransporteurViewSet(viewsets.ModelViewSet):
    queryset = Transporteur.objects.all()
    serializer_class = TransporteurSerializer


class EntrepotViewSet(viewsets.ModelViewSet):
    queryset = Entrepot.objects.all()
    serializer_class = EntrepotSerializer


class VehiculeViewSet(viewsets.ModelViewSet):
    queryset = Vehicule.objects.select_related('transporteur').all()
    serializer_class = VehiculeSerializer


class ChauffeurViewSet(viewsets.ModelViewSet):
    queryset = Chauffeur.objects.select_related('transporteur', 'vehicule').all()
    serializer_class = ChauffeurSerializer
