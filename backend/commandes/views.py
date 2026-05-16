from django.db.models import Q
from django.utils import timezone
from rest_framework import generics, status, filters
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from accounts.permissions import IsClientRole, IsAdminRole, IsFondateurRole, IsTransporteurRole
from utils.matching import proposer_commandes_transporteur
from .models import Commande, Avis
from .serializers import (
    CommandeSerializer, CommandeCreateSerializer,
    AvisSerializer, AvisCreateSerializer,
)


class CommandeListCreateView(generics.ListCreateAPIView):
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['statut', 'fondateur']
    ordering_fields = ['created_at', 'total_price']
    ordering = ['-created_at']

    def get_serializer_class(self):
        if self.request.method == 'POST':
            return CommandeCreateSerializer
        return CommandeSerializer

    def get_queryset(self):
        user = self.request.user
        qs = Commande.objects.select_related('client', 'fondateur', 'transporteur').prefetch_related('lignes__produit')
        if user.role == 'CLIENT':
            return qs.filter(client=user)
        elif user.role == 'FONDATEUR':
            return qs.filter(fondateur=user.fondateur_profile)
        elif user.role == 'TRANSPORTEUR':
            return qs.filter(transporteur=user)
        return qs  # ADMIN voit tout

    def create(self, request, *args, **kwargs):
        serializer = CommandeCreateSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            commande = serializer.save()
            return Response(
                CommandeSerializer(commande, context={'request': request}).data,
                status=status.HTTP_201_CREATED,
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class CommandeDetailView(generics.RetrieveAPIView):
    serializer_class = CommandeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Commande.objects.select_related('client', 'fondateur', 'transporteur').prefetch_related('lignes__produit', 'avis')
        if user.role == 'ADMIN':
            return qs
        return qs.filter(
            Q(client=user) | Q(fondateur__user=user) | Q(transporteur=user)
        )


class CommandeStatutView(APIView):
    """Changer le statut d'une commande selon le rôle."""
    permission_classes = [IsAuthenticated]

    TRANSITIONS = {
        'FONDATEUR': {
            'EN_ATTENTE': 'VALIDEE',
            'VALIDEE': 'EN_PREPARATION',
        },
        'TRANSPORTEUR': {
            'VALIDEE': 'EN_ROUTE',
            'EN_PREPARATION': 'EN_ROUTE',
            'EN_ROUTE': 'LIVREE',
        },
        'CLIENT': {
            'EN_ATTENTE': 'ANNULEE',
        },
        'ADMIN': {
            'EN_ATTENTE': 'VALIDEE',
            'VALIDEE': 'EN_PREPARATION',
            'EN_PREPARATION': 'EN_ROUTE',
            'EN_ROUTE': 'LIVREE',
        },
    }

    def post(self, request, pk, action):
        try:
            commande = Commande.objects.get(pk=pk)
        except Commande.DoesNotExist:
            return Response({'error': 'Commande introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        role = request.user.role
        transitions = self.TRANSITIONS.get(role, {})
        nouveau_statut = transitions.get(commande.statut)

        if action == 'annuler' and commande.statut not in ('LIVREE', 'ANNULEE'):
            # Le CLIENT peut annuler tant que ce n'est pas livré
            # L'ADMIN peut toujours annuler
            # Le FONDATEUR peut annuler ses propres commandes
            if role in ('CLIENT', 'ADMIN') or (role == 'FONDATEUR' and commande.fondateur.user == request.user):
                # Si EN_ROUTE et CLIENT veut annuler : autorisé mais on libère le transporteur
                if commande.transporteur:
                    try:
                        t = commande.transporteur.transporteur_profile
                        t.is_on_delivery = False
                        t.save(update_fields=['is_on_delivery'])
                    except Exception:
                        pass
                commande.statut = 'ANNULEE'
                commande.save()
                # Remettre le stock
                for ligne in commande.lignes.all():
                    ligne.produit.stock += ligne.quantite
                    ligne.produit.save(update_fields=['stock'])
                return Response(CommandeSerializer(commande).data)

        if action == 'avancer':
            if not nouveau_statut:
                return Response({'error': 'Transition non autorisée.'}, status=status.HTTP_403_FORBIDDEN)
            commande.statut = nouveau_statut
            if nouveau_statut == 'LIVREE':
                commande.livree_at = timezone.now()
                commande.est_paye = True
                # Libérer le transporteur + ajouter revenus
                try:
                    t = commande.transporteur.transporteur_profile
                    t.is_on_delivery = False
                    t.nombre_livraisons += 1
                    # Le chauffeur perçoit la totalité des frais de livraison
                    # + 5% du sous-total comme commission de service
                    gain = float(commande.frais_livraison) + float(commande.sous_total) * 0.05
                    t.revenus_total = float(t.revenus_total or 0) + gain
                    t.save(update_fields=['is_on_delivery', 'nombre_livraisons', 'revenus_total'])
                    # Créer une Livraison pour tracker le gain par période
                    try:
                        from livraisons.models import Livraison
                        Livraison.objects.update_or_create(
                            commande=commande,
                            defaults={
                                'transporteur': t,
                                'statut_livraison': 'LIVREE',
                                'date_livraison': commande.livree_at,
                                'gain_transporteur': gain,
                            },
                        )
                    except Exception:
                        pass
                except Exception:
                    pass
            commande.save()
            return Response(CommandeSerializer(commande).data)

        return Response({'error': 'Action invalide.'}, status=status.HTTP_400_BAD_REQUEST)


class FondateurAccepterCommandeView(APIView):
    """Fondateur accepte ou refuse une commande."""
    permission_classes = [IsFondateurRole]

    def post(self, request, pk):
        try:
            fondateur = request.user.fondateur_profile
            commande = Commande.objects.get(pk=pk, fondateur=fondateur, statut='EN_ATTENTE')
        except (Commande.DoesNotExist, Exception):
            return Response({'error': 'Commande introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        if action == 'accepter':
            commande.statut = 'VALIDEE'
            commande.save()
            # Déclencher matching transporteur auto
            proposer_commandes_transporteur(commande)
            return Response({'message': 'Commande acceptée.', 'commande': CommandeSerializer(commande).data})
        elif action == 'refuser':
            commande.statut = 'ANNULEE'
            commande.save()
            return Response({'message': 'Commande refusée.'})
        return Response({'error': 'Action invalide.'}, status=status.HTTP_400_BAD_REQUEST)


class TransporteurAccepterCommandeView(APIView):
    """Transporteur accepte ou refuse une livraison proposée."""
    permission_classes = [IsTransporteurRole]

    def post(self, request, pk):
        try:
            commande = Commande.objects.get(pk=pk, statut='VALIDEE')
        except Commande.DoesNotExist:
            return Response({'error': 'Commande introuvable ou déjà prise.'}, status=status.HTTP_404_NOT_FOUND)

        action = request.data.get('action')
        if action == 'accepter':
            commande.transporteur = request.user
            commande.statut = 'EN_PREPARATION'
            commande.save()
            try:
                t = request.user.transporteur_profile
                t.is_on_delivery = True
                t.save(update_fields=['is_on_delivery'])
            except Exception:
                pass
            return Response(CommandeSerializer(commande).data)
        elif action == 'refuser':
            return Response({'message': 'Commande refusée. Prochaine proposition...'})
        return Response({'error': 'Action invalide.'}, status=status.HTTP_400_BAD_REQUEST)


class CommandesProposeesTrransporteurView(APIView):
    """Commandes disponibles pour un transporteur selon sa position."""
    permission_classes = [IsTransporteurRole]

    def get(self, request):
        try:
            transporteur = request.user.transporteur_profile
        except Exception:
            return Response({'error': 'Profil transporteur requis.'}, status=status.HTTP_403_FORBIDDEN)

        if not transporteur.is_available or not transporteur.position_actuelle:
            return Response([])

        commandes = Commande.objects.filter(statut='VALIDEE').select_related('fondateur', 'client')
        # Filtrer par proximité du fondateur (5km)
        from django.contrib.gis.measure import D
        from django.contrib.gis.db.models.functions import Distance
        commandes = (
            commandes
            .filter(fondateur__location__distance_lte=(transporteur.position_actuelle, D(km=5)))
            .annotate(dist=Distance('fondateur__location', transporteur.position_actuelle))
            .order_by('dist')[:10]
        )
        return Response(CommandeSerializer(commandes, many=True).data)


class SignalerCommandeView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            commande = Commande.objects.get(pk=pk)
        except Commande.DoesNotExist:
            return Response({'error': 'Commande introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        motif = request.data.get('motif', '')
        commande.est_signale = True
        commande.motif_signalement = motif
        commande.save(update_fields=['est_signale', 'motif_signalement'])
        return Response({'message': 'Commande signalée.'})


# ─── Avis ────────────────────────────────────────────────────────────────────

class AdminAnnulerCommandeView(APIView):
    """Admin annule une commande."""
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        try:
            commande = Commande.objects.get(pk=pk)
        except Commande.DoesNotExist:
            return Response({'error': 'Commande introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        if commande.statut in ('LIVREE', 'ANNULEE'):
            return Response({'error': 'Impossible d\'annuler cette commande.'}, status=status.HTTP_400_BAD_REQUEST)
        commande.statut = 'ANNULEE'
        commande.save()
        for ligne in commande.lignes.all():
            ligne.produit.stock += ligne.quantite
            ligne.produit.save(update_fields=['stock'])
        return Response(CommandeSerializer(commande).data)


class AdminAssignerTransporteurView(APIView):
    """Admin assigne manuellement un transporteur à une commande."""
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        from transporteurs.models import Transporteur
        try:
            commande = Commande.objects.get(pk=pk)
        except Commande.DoesNotExist:
            return Response({'error': 'Commande introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if commande.statut not in ('EN_ATTENTE', 'VALIDEE', 'EN_PREPARATION'):
            return Response({'error': 'Impossible d\'assigner un transporteur à ce stade.'}, status=status.HTTP_400_BAD_REQUEST)

        transporteur_id = request.data.get('transporteur_id')
        if not transporteur_id:
            return Response({'error': 'transporteur_id requis.'}, status=status.HTTP_400_BAD_REQUEST)

        try:
            transporteur = Transporteur.objects.get(pk=transporteur_id)
        except Transporteur.DoesNotExist:
            return Response({'error': 'Transporteur introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        commande.transporteur = transporteur.user
        if commande.statut == 'EN_ATTENTE':
            commande.statut = 'VALIDEE'
        commande.save()
        transporteur.is_on_delivery = True
        transporteur.save(update_fields=['is_on_delivery'])
        return Response(CommandeSerializer(commande).data)


class AdminTransporteursDisponiblesView(APIView):
    """Admin consulte les transporteurs disponibles pour une commande."""
    permission_classes = [IsAdminRole]

    def get(self, request, pk):
        from transporteurs.models import Transporteur
        from transporteurs.serializers import TransporteurSerializer
        from django.contrib.gis.db.models.functions import Distance
        from django.contrib.gis.measure import D

        try:
            commande = Commande.objects.get(pk=pk)
        except Commande.DoesNotExist:
            return Response({'error': 'Commande introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        qs = Transporteur.objects.filter(is_verified=True).select_related('user')
        boutique = commande.fondateur
        if boutique and boutique.location:
            qs = (
                qs.filter(position_actuelle__distance_lte=(boutique.location, D(km=30)))
                  .annotate(distance=Distance('position_actuelle', boutique.location))
                  .order_by('is_on_delivery', 'distance')
            )
        return Response(TransporteurSerializer(qs[:15], many=True).data)


class AvisListView(generics.ListAPIView):
    serializer_class = AvisSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        fondateur_id = self.request.query_params.get('fondateur')
        transporteur_id = self.request.query_params.get('transporteur')
        qs = Avis.objects.select_related('auteur', 'commande')
        if fondateur_id:
            qs = qs.filter(commande__fondateur_id=fondateur_id, cible_type='FONDATEUR')
        if transporteur_id:
            qs = qs.filter(commande__transporteur_id=transporteur_id, cible_type='TRANSPORTEUR')
        return qs


class AvisCreateView(APIView):
    permission_classes = [IsClientRole]

    def post(self, request, commande_pk):
        try:
            commande = Commande.objects.get(pk=commande_pk, client=request.user)
        except Commande.DoesNotExist:
            return Response({'error': 'Commande introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = AvisCreateSerializer(
            data=request.data,
            context={'request': request, 'commande': commande},
        )
        if serializer.is_valid():
            avis = serializer.save()
            return Response(AvisSerializer(avis).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
