from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Commande
from .serializers import CommandeSerializer
from .services import CommandeService

class CommandeViewSet(viewsets.ModelViewSet):
    queryset = Commande.objects.all()
    serializer_class = CommandeSerializer

    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        commande = self.get_object()
        if commande.statut != 'en_attente':
            return Response({'error': 'La commande ne peut être validée car elle n\'est pas en attente.'}, status=status.HTTP_400_BAD_REQUEST)
        
        commande.statut = 'validee'
        commande.save()
        return Response({'status': 'Commande validée avec succès.'})

    @action(detail=True, methods=['post'])
    def affecter(self, request, pk=None):
        commande = self.get_object()
        if commande.statut != 'validee':
            return Response({'error': 'La commande doit être validée avant affectation.'}, status=status.HTTP_400_BAD_REQUEST)
        
        success, message = CommandeService.affecter_transporteur_automatique(commande)
        if success:
            # Calculer l'itinéraire juste après l'affectation réussie
            CommandeService.calculer_itineraire(commande)
            return Response({'status': message})
        else:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)

