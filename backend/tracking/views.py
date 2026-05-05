from rest_framework import viewsets
from .models import PositionVehicule
from .serializers import PositionVehiculeSerializer

class PositionVehiculeViewSet(viewsets.ModelViewSet):
    queryset = PositionVehicule.objects.all()
    serializer_class = PositionVehiculeSerializer
