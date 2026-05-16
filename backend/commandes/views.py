from rest_framework import viewsets, permissions, status
from rest_framework.response import Response
from .models import Commande, Avis, CommandeProduit
from .serializers import CommandeSerializer, AvisSerializer

class CommandeViewSet(viewsets.ModelViewSet):
    queryset = Commande.objects.all()
    serializer_class = CommandeSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return Commande.objects.all()
        elif user.role == 'CLIENT':
            return Commande.objects.filter(client=user)
        elif user.role == 'FONDATEUR':
            return Commande.objects.filter(fondateur__user=user)
        elif user.role == 'TRANSPORTEUR':
            return Commande.objects.filter(transporteur__user=user)
        return Commande.objects.none()

    def perform_create(self, serializer):
        serializer.save(client=self.request.user)

    from rest_framework.decorators import action
    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        commande = self.get_object()
        new_status = request.data.get('statut')
        if new_status in dict(Commande.Statut.choices):
            commande.statut = new_status
            commande.save()
            return Response({'status': 'Statut mis à jour', 'nouveau_statut': new_status})
        return Response({'error': 'Statut invalide'}, status=status.HTTP_400_BAD_REQUEST)


class AvisViewSet(viewsets.ModelViewSet):
    queryset = Avis.objects.all()
    serializer_class = AvisSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.role == 'ADMIN':
            return Avis.objects.all()
        # Users can see reviews they wrote or reviews targeted at them
        return Avis.objects.filter(auteur=user)

    def perform_create(self, serializer):
        serializer.save(auteur=self.request.user)
