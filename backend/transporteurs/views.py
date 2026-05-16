from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Transporteur
from .serializers import TransporteurSerializer

class TransporteurViewSet(viewsets.ModelViewSet):
    queryset = Transporteur.objects.all()
    serializer_class = TransporteurSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        # Admin sees all, driver sees only their profile
        user = self.request.user
        if user.role == 'ADMIN':
            return Transporteur.objects.all()
        return Transporteur.objects.filter(user=user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=['patch'])
    def update_location(self, request, pk=None):
        transporteur = self.get_object()
        position = request.data.get('position_actuelle')
        if position:
            transporteur.position_actuelle = position
            transporteur.save()
            return Response({'status': 'Location updated'})
        return Response({'error': 'No position provided'}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['patch'])
    def toggle_availability(self, request, pk=None):
        transporteur = self.get_object()
        is_available = request.data.get('is_available')
        if is_available is not None:
            transporteur.is_available = is_available
            transporteur.save()
            return Response({'status': 'Availability updated', 'is_available': is_available})
        return Response({'error': 'is_available flag not provided'}, status=status.HTTP_400_BAD_REQUEST)
