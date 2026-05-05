from rest_framework import viewsets
from .models import Transporteur, Vehicule, Chauffeur
from .serializers import TransporteurSerializer, VehiculeSerializer, ChauffeurSerializer

class TransporteurViewSet(viewsets.ModelViewSet):
    queryset = Transporteur.objects.all()
    serializer_class = TransporteurSerializer

class VehiculeViewSet(viewsets.ModelViewSet):
    queryset = Vehicule.objects.all()
    serializer_class = VehiculeSerializer

class ChauffeurViewSet(viewsets.ModelViewSet):
    queryset = Chauffeur.objects.all()
    serializer_class = ChauffeurSerializer
