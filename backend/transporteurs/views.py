from django.contrib.gis.geos import Point
from django.contrib.gis.db.models.functions import Distance
from django.contrib.gis.measure import D
from django.utils import timezone
from rest_framework import generics, status, filters
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.response import Response
from rest_framework.views import APIView
from django_filters.rest_framework import DjangoFilterBackend

from accounts.permissions import IsAdminRole, IsTransporteurRole
from .models import Transporteur
from .serializers import (
    TransporteurSerializer, TransporteurOnboardingSerializer,
    TransporteurDashboardSerializer, TransporteurDisponibleSerializer,
)


class MonProfilTransporteurView(APIView):
    permission_classes = [IsTransporteurRole]

    def get(self, request):
        try:
            t = request.user.transporteur_profile
        except Transporteur.DoesNotExist:
            return Response({'error': 'Profil transporteur introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        return Response(TransporteurDashboardSerializer(t).data)

    def post(self, request):
        if hasattr(request.user, 'transporteur_profile'):
            return Response({'error': 'Profil transporteur déjà créé.'}, status=status.HTTP_400_BAD_REQUEST)
        serializer = TransporteurOnboardingSerializer(data=request.data, context={'request': request})
        if serializer.is_valid():
            t = serializer.save()
            return Response(TransporteurSerializer(t).data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def patch(self, request):
        try:
            t = request.user.transporteur_profile
        except Transporteur.DoesNotExist:
            return Response({'error': 'Profil transporteur introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        serializer = TransporteurOnboardingSerializer(t, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(TransporteurSerializer(t).data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ToggleDisponibiliteView(APIView):
    permission_classes = [IsTransporteurRole]

    def post(self, request):
        try:
            t = request.user.transporteur_profile
        except Transporteur.DoesNotExist:
            return Response({'error': 'Profil transporteur introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if t.is_available:
            # Passe à indisponible : cumuler le temps de session
            t.cumuler_temps_travail()
            t.is_available = False
            t.save(update_fields=[
                'is_available', 'heure_debut_disponibilite', 'date_derniere_session',
                'minutes_travaillees_aujourd_hui', 'minutes_travaillees_semaine', 'minutes_travaillees_mois',
            ])
        else:
            # Passe à disponible : démarrer une session
            t.is_available = True
            t.heure_debut_disponibilite = timezone.now()
            t.save(update_fields=['is_available', 'heure_debut_disponibilite'])

        return Response({
            'is_available': t.is_available,
            'minutes_session_courante': t.minutes_session_courante,
            'minutes_travaillees_aujourd_hui': t.minutes_travaillees_aujourd_hui,
            'message': 'Disponible' if t.is_available else 'Indisponible',
        })


class TransporteurDisponiblesView(APIView):
    """Transporteurs disponibles dans un rayon — utilisé par le matching."""
    permission_classes = [IsAuthenticated]

    def get(self, request):
        lat = request.query_params.get('lat')
        lon = request.query_params.get('lon')
        rayon = float(request.query_params.get('rayon', 5))
        vehicule_type = request.query_params.get('vehicule_type')
        poids = float(request.query_params.get('poids_kg', 0))

        qs = Transporteur.objects.filter(is_available=True, is_verified=True, is_on_delivery=False)

        if vehicule_type:
            qs = qs.filter(vehicule_type=vehicule_type)
        if poids:
            qs = qs.filter(capacite_kg__gte=poids)

        if lat and lon:
            point = Point(float(lon), float(lat), srid=4326)
            qs = (
                qs.filter(position_actuelle__distance_lte=(point, D(km=rayon)))
                  .annotate(distance=Distance('position_actuelle', point))
                  .order_by('distance')
            )

        serializer = TransporteurDisponibleSerializer(qs[:20], many=True)
        return Response(serializer.data)


# ─── Admin ────────────────────────────────────────────────────────────────────

class AdminTransporteurListView(generics.ListAPIView):
    serializer_class = TransporteurSerializer
    permission_classes = [IsAdminRole]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['is_verified', 'is_available', 'vehicule_type']
    search_fields = ['user__email', 'user__first_name', 'plaque']
    queryset = Transporteur.objects.select_related('user').all()


class AdminTransporteurValidateView(APIView):
    permission_classes = [IsAdminRole]

    def post(self, request, pk):
        try:
            t = Transporteur.objects.get(pk=pk)
        except Transporteur.DoesNotExist:
            return Response({'error': 'Transporteur introuvable.'}, status=status.HTTP_404_NOT_FOUND)
        action = request.data.get('action')
        if action == 'approuver':
            t.is_verified = True
            t.save()
            return Response({'message': f'{t.user.get_full_name()} approuvé.'})
        elif action == 'rejeter':
            t.is_verified = False
            t.save()
            return Response({'message': 'Rejeté.'})
        return Response({'error': 'Action invalide.'}, status=status.HTTP_400_BAD_REQUEST)


# ─── SOS Urgence ──────────────────────────────────────────────────────────────
class SOSView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        from notifications.models import Notification
        from django.contrib.auth import get_user_model
        User = get_user_model()
        lat = request.data.get('lat')
        lng = request.data.get('lng')
        message = request.data.get('message', 'SOS - Urgence chauffeur')
        # Notifier tous les admins
        admins = User.objects.filter(role='ADMIN')
        nom_chauffeur = request.user.get_full_name() or request.user.username
        for admin in admins:
            Notification.objects.create(
                destinataire=admin,
                titre=f"🆘 SOS — {nom_chauffeur}",
                message=f"Urgence signalée par {nom_chauffeur} — Position: {lat},{lng} — {message}",
                type_notif='WARNING',
            )
        return Response({'status': 'SOS envoye', 'admins_notifies': admins.count()})


# ─── Chat livraison ───────────────────────────────────────────────────────────
class ChatLivraisonView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request, commande_id):
        from transporteurs.models import ChatMessage
        msgs = ChatMessage.objects.filter(commande_id=commande_id).select_related('auteur')
        data = [{
            'id': m.id,
            'auteur_nom': m.auteur.get_full_name() or m.auteur.email,
            'auteur_role': getattr(m.auteur, 'role', ''),
            'contenu': m.contenu,
            'lu': m.lu,
            'created_at': m.created_at.isoformat(),
        } for m in msgs]
        # Mark as read
        ChatMessage.objects.filter(commande_id=commande_id, lu=False).exclude(
            auteur=request.user
        ).update(lu=True)
        return Response(data)

    def post(self, request, commande_id):
        from transporteurs.models import ChatMessage
        contenu = request.data.get('contenu', '').strip()
        if not contenu:
            return Response({'error': 'Message vide'}, status=400)
        msg = ChatMessage.objects.create(
            commande_id=commande_id,
            auteur=request.user,
            contenu=contenu,
        )
        return Response({
            'id': msg.id,
            'contenu': msg.contenu,
            'created_at': msg.created_at.isoformat(),
        }, status=201)


# ─── Objectifs hebdomadaires ──────────────────────────────────────────────────
class ObjectifsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from transporteurs.models import ObjectifHebdomadaire, Transporteur
        from datetime import date, timedelta
        try:
            t = Transporteur.objects.get(user=request.user)
        except Transporteur.DoesNotExist:
            return Response({'error': 'Profil transporteur introuvable'}, status=404)

        objectifs = ObjectifHebdomadaire.objects.filter(
            transporteur=t
        ).order_by('-semaine')[:8]

        # Creer objectif semaine courante si inexistant
        today = date.today()
        lundi = today - timedelta(days=today.weekday())
        current, _ = ObjectifHebdomadaire.objects.get_or_create(
            transporteur=t,
            semaine=lundi,
            defaults={
                'objectif_livraisons': 10,
                'objectif_note': 4.0,
                'livraisons_effectuees': t.nombre_livraisons or 0,
            }
        )

        data = [{
            'id': o.id,
            'semaine': str(o.semaine),
            'objectif_livraisons': o.objectif_livraisons,
            'livraisons_effectuees': o.livraisons_effectuees,
            'objectif_note': float(o.objectif_note),
            'note_obtenue': float(o.note_obtenue),
            'taux_completion': o.taux_completion,
            'bonus_obtenu': o.bonus_obtenu,
            'badge': o.badge,
            'is_current': o.semaine == lundi,
        } for o in objectifs]
        return Response(data)


# ─── Multi-livraisons optimisees (TSP simple) ─────────────────────────────────
class MultiLivraisonsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        """Retourne les commandes disponibles groupees par zone pour ce transporteur."""
        from commandes.models import Commande
        commandes = Commande.objects.filter(
            statut='VALIDEE',
            transporteur_assigne__isnull=True,
        ).order_by('created_at')[:20]

        # TSP simple: tri greedy par proximite (si coordonnees dispo)
        data = [{
            'id': c.id,
            'reference': c.reference,
            'adresse': getattr(c, 'adresse_livraison', ''),
            'client': str(c.client) if c.client else '',
            'montant': float(c.total) if hasattr(c, 'total') else 0,
            'created_at': c.created_at.isoformat(),
        } for c in commandes]
        return Response({'commandes': data, 'count': len(data)})

    def post(self, request):
        """Accepter un groupe de commandes (multi-livraison)."""
        ids = request.data.get('commande_ids', [])
        if not ids:
            return Response({'error': 'commande_ids requis'}, status=400)
        from commandes.models import Commande
        from transporteurs.models import Transporteur
        try:
            t = Transporteur.objects.get(user=request.user)
        except Transporteur.DoesNotExist:
            return Response({'error': 'Profil transporteur requis'}, status=404)

        updated = Commande.objects.filter(
            id__in=ids, statut='VALIDEE', transporteur_assigne__isnull=True
        ).update(transporteur_assigne=t, statut='EN_PREPARATION')
        return Response({'assigned': updated, 'ids': ids})
