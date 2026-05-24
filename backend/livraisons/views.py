import random
import string
from django.contrib.gis.geos import Point
from django.utils import timezone
from rest_framework import generics, status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsTransporteurRole, IsAdminRole
from utils.geo_utils import calculer_itineraire_osrm
from .models import Livraison, PositionTracking
from .serializers import LivraisonSerializer, PositionUpdateSerializer


def generer_code_pin():
    return ''.join(random.choices(string.digits, k=4))


class LivraisonDetailView(generics.RetrieveAPIView):
    serializer_class = LivraisonSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        qs = Livraison.objects.select_related('commande', 'transporteur__user').prefetch_related('positions')
        if user.role == 'ADMIN':
            return qs
        if user.role == 'TRANSPORTEUR':
            return qs.filter(transporteur=user.transporteur_profile)
        # Client voit sa livraison
        return qs.filter(commande__client=user)


class MesLivraisonsView(generics.ListAPIView):
    serializer_class = LivraisonSerializer
    permission_classes = [IsTransporteurRole]

    def get_queryset(self):
        try:
            t = self.request.user.transporteur_profile
        except Exception:
            return Livraison.objects.none()
        return Livraison.objects.filter(transporteur=t).select_related('commande').order_by('-date_debut')


class DemarrerLivraisonView(APIView):
    """Transporteur démarre une livraison — calcule l'itinéraire OSRM."""
    permission_classes = [IsTransporteurRole]

    def post(self, request, pk):
        try:
            livraison = Livraison.objects.get(pk=pk, transporteur=request.user.transporteur_profile)
        except Livraison.DoesNotExist:
            return Response({'error': 'Livraison introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if livraison.statut_livraison != 'EN_ATTENTE':
            return Response({'error': 'Livraison déjà démarrée.'}, status=status.HTTP_400_BAD_REQUEST)

        # Récupérer les points
        fondateur = livraison.commande.fondateur
        depart = fondateur.location
        arrivee = livraison.commande.location_livraison

        if depart and arrivee:
            livraison.depart = depart
            livraison.arrivee = arrivee
            # Calcul OSRM
            result = calculer_itineraire_osrm(depart, arrivee)
            if result:
                livraison.distance_km = result.get('distance_km')
                livraison.duree_estimee_min = result.get('duree_min')
                livraison.trace_itineraire = result.get('geometry')
                if result.get('duree_min'):
                    from datetime import timedelta
                    livraison.eta = timezone.now() + timedelta(minutes=result['duree_min'])

        livraison.code_confirmation = generer_code_pin()
        livraison.calculer_gains()
        livraison.demarrer()

        # Mettre à jour le statut de la commande
        livraison.commande.statut = 'EN_ROUTE'
        livraison.commande.save(update_fields=['statut'])

        return Response(LivraisonSerializer(livraison).data)


class ConfirmerLivraisonView(APIView):
    """Transporteur confirme la livraison avec le code PIN."""
    permission_classes = [IsTransporteurRole]

    def post(self, request, pk):
        try:
            livraison = Livraison.objects.get(pk=pk, transporteur=request.user.transporteur_profile)
        except Livraison.DoesNotExist:
            return Response({'error': 'Livraison introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        code = request.data.get('code_confirmation', '')
        if livraison.code_confirmation and code != livraison.code_confirmation:
            return Response({'error': 'Code de confirmation incorrect.'}, status=status.HTTP_400_BAD_REQUEST)

        livraison.terminer()
        livraison.commande.marquer_livree()

        return Response({'message': 'Livraison confirmée !', 'livraison': LivraisonSerializer(livraison).data})


class MettreAJourPositionView(APIView):
    """Transporteur envoie sa position GPS — stockée + diffusée via WebSocket."""
    permission_classes = [IsTransporteurRole]

    def post(self, request):
        serializer = PositionUpdateSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        lat = serializer.validated_data['latitude']
        lon = serializer.validated_data['longitude']
        vitesse = serializer.validated_data.get('vitesse_kmh', 0)
        livraison_id = serializer.validated_data.get('livraison_id')

        point = Point(lon, lat, srid=4326)

        # Mise à jour position transporteur
        try:
            t = request.user.transporteur_profile
            t.position_actuelle = point
            t.derniere_maj_position = timezone.now()
            t.save(update_fields=['position_actuelle', 'derniere_maj_position'])
        except Exception:
            pass

        # Historique tracking
        if livraison_id:
            try:
                livraison = Livraison.objects.get(
                    pk=livraison_id,
                    transporteur=request.user.transporteur_profile,
                    statut_livraison='EN_ROUTE',
                )
                PositionTracking.objects.create(livraison=livraison, point=point, vitesse_kmh=vitesse)

                # Diffusion WebSocket aux clients concernés
                from channels.layers import get_channel_layer
                from asgiref.sync import async_to_sync
                channel_layer = get_channel_layer()
                if channel_layer:
                    async_to_sync(channel_layer.group_send)(
                        f'livraison_{livraison.commande_id}',
                        {
                            'type': 'position_update',
                            'latitude': lat,
                            'longitude': lon,
                            'vitesse': vitesse,
                            'eta': livraison.eta.isoformat() if livraison.eta else None,
                        }
                    )
            except Livraison.DoesNotExist:
                pass

        return Response({'status': 'ok'})


class ReporterLivraisonView(APIView):
    """Transporteur reporte une livraison avec motif (sans créer d'incident)."""
    permission_classes = [IsTransporteurRole]

    def post(self, request, pk):
        try:
            livraison = Livraison.objects.get(pk=pk, transporteur=request.user.transporteur_profile)
        except Livraison.DoesNotExist:
            return Response({'error': 'Livraison introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if livraison.statut_livraison not in ('EN_ATTENTE', 'EN_ROUTE'):
            return Response({'error': 'Impossible de reporter cette livraison.'}, status=400)

        motif = request.data.get('motif', 'AUTRE')
        commentaire = request.data.get('commentaire', '')
        livraison.reporter(motif, commentaire)

        # Notifier le fondateur et le client
        try:
            from notifications.models import Notification
            nom = request.user.get_full_name()
            if livraison.commande.fondateur:
                Notification.objects.create(
                    destinataire=livraison.commande.fondateur.user,
                    titre='Livraison reportée',
                    message=f'La livraison #{livraison.commande.reference} a été reportée par {nom}. Motif : {dict(livraison.REPORT_MOTIF_CHOICES).get(motif, motif)}',
                    type_notif='WARNING',
                )
            if livraison.commande.client:
                Notification.objects.create(
                    destinataire=livraison.commande.client,
                    titre='Votre livraison a été reportée',
                    message=f'Votre commande #{livraison.commande.reference} n\'a pas pu être livrée. Motif : {dict(livraison.REPORT_MOTIF_CHOICES).get(motif, motif)}. Un nouveau créneau sera planifié.',
                    type_notif='WARNING',
                )
        except Exception:
            pass

        return Response({
            'message': 'Livraison reportée.',
            'motif': motif,
            'commentaire': commentaire,
        })


class MettreAJourColisView(APIView):
    """Mettre à jour le nombre de colis livrés (livraison partielle)."""
    permission_classes = [IsTransporteurRole]

    def patch(self, request, pk):
        try:
            livraison = Livraison.objects.get(pk=pk, transporteur=request.user.transporteur_profile)
        except Livraison.DoesNotExist:
            return Response({'error': 'Livraison introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        nb = int(request.data.get('nb_colis_livres', 0))
        if nb < 0 or nb > livraison.nb_colis_total:
            return Response({'error': f'Valeur invalide (max {livraison.nb_colis_total}).'}, status=400)

        livraison.nb_colis_livres = nb
        livraison.save(update_fields=['nb_colis_livres'])

        return Response({
            'nb_colis_total': livraison.nb_colis_total,
            'nb_colis_livres': livraison.nb_colis_livres,
            'taux_livraison_colis': livraison.taux_livraison_colis,
            'est_partielle': livraison.est_partielle,
        })


class AjouterPhotoPreuveView(APIView):
    """Ajouter une photo de preuve de livraison."""
    permission_classes = [IsTransporteurRole]

    def post(self, request, pk):
        try:
            livraison = Livraison.objects.get(pk=pk, transporteur=request.user.transporteur_profile)
        except Livraison.DoesNotExist:
            return Response({'error': 'Livraison introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        photo = request.FILES.get('photo_preuve')
        if not photo:
            return Response({'error': 'Fichier photo requis.'}, status=400)

        livraison.photo_preuve = photo
        livraison.save(update_fields=['photo_preuve'])

        return Response({
            'message': 'Photo de preuve enregistrée.',
            'photo_url': request.build_absolute_uri(livraison.photo_preuve.url) if livraison.photo_preuve else None,
        })


class NotifDepartView(APIView):
    """Envoyer la notification de départ au client (10 min avant arrivée)."""
    permission_classes = [IsTransporteurRole]

    def post(self, request, pk):
        try:
            livraison = Livraison.objects.get(pk=pk, transporteur=request.user.transporteur_profile)
        except Livraison.DoesNotExist:
            return Response({'error': 'Livraison introuvable.'}, status=status.HTTP_404_NOT_FOUND)

        if livraison.notif_depart_envoyee:
            return Response({'message': 'Notification déjà envoyée.'})

        try:
            from notifications.models import Notification
            nom = request.user.get_full_name()
            if livraison.commande.client:
                Notification.objects.create(
                    destinataire=livraison.commande.client,
                    titre='Votre chauffeur arrive dans ~10 minutes',
                    message=f'{nom} est en route et sera à votre adresse dans environ 10 minutes. Préparez-vous à recevoir votre commande #{livraison.commande.reference}.',
                    type_notif='INFO',
                )
            livraison.notif_depart_envoyee = True
            livraison.save(update_fields=['notif_depart_envoyee'])
        except Exception as e:
            return Response({'error': str(e)}, status=500)

        return Response({'message': 'Notification envoyée au client.'})
