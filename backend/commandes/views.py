from django.utils import timezone
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from .models import Commande
from .serializers import CommandeSerializer
from .services import CommandeService


class CommandeViewSet(viewsets.ModelViewSet):
    queryset = Commande.objects.select_related('client', 'transporteur', 'vehicule', 'chauffeur').all()
    serializer_class = CommandeSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        qs = super().get_queryset()
        # Filtres via query params
        statut = self.request.query_params.get('statut')
        type_marchandise = self.request.query_params.get('type_marchandise')
        search = self.request.query_params.get('search')

        if statut:
            qs = qs.filter(statut=statut)
        if type_marchandise:
            qs = qs.filter(type_marchandise=type_marchandise)
        if search:
            qs = qs.filter(reference__icontains=search)
        return qs

    @action(detail=True, methods=['post'])
    def valider(self, request, pk=None):
        commande = self.get_object()
        if commande.statut != 'en_attente':
            return Response(
                {'error': "La commande ne peut être validée car elle n'est pas en attente."},
                status=status.HTTP_400_BAD_REQUEST
            )
        commande.statut = 'validee'
        commande.save()
        return Response({'status': 'Commande validée avec succès.'})

    @action(detail=True, methods=['post'])
    def affecter(self, request, pk=None):
        commande = self.get_object()
        if commande.statut != 'validee':
            return Response(
                {'error': 'La commande doit être validée avant affectation.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        success, message = CommandeService.affecter_transporteur_automatique(commande)
        if success:
            CommandeService.calculer_itineraire(commande)
            return Response({'status': message})
        else:
            return Response({'error': message}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def annuler(self, request, pk=None):
        """Annuler une commande (sauf si déjà livrée)."""
        commande = self.get_object()
        if commande.statut == 'livree':
            return Response(
                {'error': 'Impossible d\'annuler une commande déjà livrée.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        commande.statut = 'annulee'
        commande.save()
        return Response({'status': 'Commande annulée.'})

    @action(detail=True, methods=['post'])
    def livrer(self, request, pk=None):
        """Marquer une commande en_cours comme livrée."""
        commande = self.get_object()
        if commande.statut not in ('en_cours', 'affectee'):
            return Response(
                {'error': 'La commande doit être en cours pour être marquée livrée.'},
                status=status.HTTP_400_BAD_REQUEST
            )
        commande.statut = 'livree'
        commande.date_livraison_reelle = timezone.now()
        # Libérer le véhicule et le chauffeur
        if commande.vehicule:
            commande.vehicule.disponible = True
            commande.vehicule.save()
        if commande.chauffeur:
            commande.chauffeur.disponible = True
            commande.chauffeur.save()
        commande.save()
        return Response({'status': 'Commande marquée comme livrée.'})
