"""
Gestion des disponibilités et planning du transporteur.
Endpoints :
  GET/POST   /api/transporteurs/planning/disponibilites/  → créneaux hebdo
  DELETE     /api/transporteurs/planning/disponibilites/<id>/
  GET/POST   /api/transporteurs/planning/absences/        → demander une absence
  PATCH      /api/transporteurs/planning/absences/<id>/valider/ → admin valide/refuse
  GET/POST   /api/transporteurs/planning/preferences-zones/
"""
from django.utils import timezone
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsAdminRole, IsTransporteurRole
from .models import (
    Transporteur, DisponibiliteHebdo, AbsenceTransporteur, PreferenceZone,
)


def _get_transporteur(user):
    try:
        return user.transporteur_profile
    except Transporteur.DoesNotExist:
        return None


# ── Sérialiseurs inline ────────────────────────────────────────────────────────

class DisponibiliteSerializer(serializers.ModelSerializer):
    jour_label = serializers.CharField(source='get_jour_semaine_display', read_only=True)

    class Meta:
        model = DisponibiliteHebdo
        fields = ['id', 'jour_semaine', 'jour_label', 'heure_debut', 'heure_fin', 'actif']


class AbsenceSerializer(serializers.ModelSerializer):
    transporteur_nom = serializers.SerializerMethodField()

    class Meta:
        model = AbsenceTransporteur
        fields = ['id', 'date_debut', 'date_fin', 'motif', 'statut', 'transporteur_nom', 'created_at']
        read_only_fields = ['statut', 'transporteur_nom']

    def get_transporteur_nom(self, obj):
        return obj.transporteur.user.get_full_name()


# ── Vues ───────────────────────────────────────────────────────────────────────

class DisponibilitesHebdoView(APIView):
    """Créneaux de disponibilité planifiés par le chauffeur."""
    permission_classes = [IsTransporteurRole]

    def get(self, request):
        t = _get_transporteur(request.user)
        if not t:
            return Response({'error': 'Profil transporteur introuvable.'}, status=404)
        dispos = DisponibiliteHebdo.objects.filter(transporteur=t)
        return Response(DisponibiliteSerializer(dispos, many=True).data)

    def post(self, request):
        t = _get_transporteur(request.user)
        if not t:
            return Response({'error': 'Profil transporteur introuvable.'}, status=404)
        serializer = DisponibiliteSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(transporteur=t)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)

    def delete(self, request):
        """Supprime tous les créneaux (pour réinitialiser)."""
        t = _get_transporteur(request.user)
        if not t:
            return Response({'error': 'Profil transporteur introuvable.'}, status=404)
        DisponibiliteHebdo.objects.filter(transporteur=t).delete()
        return Response({'message': 'Créneaux supprimés.'})


class DisponibiliteDetailView(APIView):
    permission_classes = [IsTransporteurRole]

    def patch(self, request, pk):
        t = _get_transporteur(request.user)
        try:
            dispo = DisponibiliteHebdo.objects.get(pk=pk, transporteur=t)
        except DisponibiliteHebdo.DoesNotExist:
            return Response({'error': 'Créneau introuvable.'}, status=404)
        serializer = DisponibiliteSerializer(dispo, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)

    def delete(self, request, pk):
        t = _get_transporteur(request.user)
        try:
            dispo = DisponibiliteHebdo.objects.get(pk=pk, transporteur=t)
        except DisponibiliteHebdo.DoesNotExist:
            return Response({'error': 'Créneau introuvable.'}, status=404)
        dispo.delete()
        return Response(status=204)


class AbsencesView(APIView):
    """Gestion des absences / congés."""
    permission_classes = [IsTransporteurRole]

    def get(self, request):
        t = _get_transporteur(request.user)
        if not t:
            return Response({'error': 'Profil transporteur introuvable.'}, status=404)
        absences = AbsenceTransporteur.objects.filter(transporteur=t)
        return Response(AbsenceSerializer(absences, many=True).data)

    def post(self, request):
        t = _get_transporteur(request.user)
        if not t:
            return Response({'error': 'Profil transporteur introuvable.'}, status=404)
        serializer = AbsenceSerializer(data=request.data)
        if serializer.is_valid():
            absence = serializer.save(transporteur=t, statut='EN_ATTENTE')
            # Notifier les admins
            try:
                from notifications.models import Notification
                from django.contrib.auth import get_user_model
                User = get_user_model()
                nom = t.user.get_full_name()
                for admin in User.objects.filter(role='ADMIN'):
                    Notification.objects.create(
                        destinataire=admin,
                        titre=f"Demande d'absence — {nom}",
                        message=f"{nom} demande une absence du {absence.date_debut} au {absence.date_fin} : {absence.motif}",
                        type_notif='INFO',
                    )
            except Exception:
                pass
            return Response(AbsenceSerializer(absence).data, status=201)
        return Response(serializer.errors, status=400)


class AbsenceValiderView(APIView):
    """Admin : approuver ou refuser une demande d'absence."""
    permission_classes = [IsAdminRole]

    def patch(self, request, pk):
        try:
            absence = AbsenceTransporteur.objects.get(pk=pk)
        except AbsenceTransporteur.DoesNotExist:
            return Response({'error': 'Absence introuvable.'}, status=404)

        action = request.data.get('action')  # 'approuver' ou 'refuser'
        if action == 'approuver':
            absence.statut = 'APPROUVEE'
            absence.valide_par = request.user
            absence.save(update_fields=['statut', 'valide_par'])
            statut_msg = 'approuvée'
        elif action == 'refuser':
            absence.statut = 'REFUSEE'
            absence.valide_par = request.user
            absence.save(update_fields=['statut', 'valide_par'])
            statut_msg = 'refusée'
        else:
            return Response({'error': 'Action invalide (approuver/refuser).'}, status=400)

        # Notifier le transporteur
        try:
            from notifications.models import Notification
            Notification.objects.create(
                destinataire=absence.transporteur.user,
                titre=f"Votre absence a été {statut_msg}",
                message=f"Votre demande d'absence du {absence.date_debut} au {absence.date_fin} a été {statut_msg}.",
                type_notif='SUCCESS' if statut_msg == 'approuvée' else 'WARNING',
            )
        except Exception:
            pass

        return Response(AbsenceSerializer(absence).data)


class AdminAbsencesListView(APIView):
    """Admin : liste de toutes les demandes d'absence."""
    permission_classes = [IsAdminRole]

    def get(self, request):
        statut = request.query_params.get('statut', 'EN_ATTENTE')
        qs = AbsenceTransporteur.objects.filter(statut=statut).select_related(
            'transporteur__user'
        ).order_by('-created_at')
        return Response(AbsenceSerializer(qs, many=True).data)


class PreferencesZonesView(APIView):
    """Zones géographiques préférées du transporteur."""
    permission_classes = [IsTransporteurRole]

    def get(self, request):
        t = _get_transporteur(request.user)
        if not t:
            return Response({'error': 'Profil transporteur introuvable.'}, status=404)
        prefs = PreferenceZone.objects.filter(transporteur=t).select_related('zone')
        data = [{
            'id': p.id,
            'zone_id': p.zone_id,
            'zone_nom': str(p.zone),
            'limite_commandes_jour': p.limite_commandes_jour,
        } for p in prefs]
        return Response(data)

    def post(self, request):
        t = _get_transporteur(request.user)
        if not t:
            return Response({'error': 'Profil transporteur introuvable.'}, status=404)
        from zones.models import ZoneLivraison
        zone_id = request.data.get('zone_id')
        limite = request.data.get('limite_commandes_jour', 0)
        try:
            zone = ZoneLivraison.objects.get(pk=zone_id)
        except ZoneLivraison.DoesNotExist:
            return Response({'error': 'Zone introuvable.'}, status=404)
        pref, created = PreferenceZone.objects.get_or_create(
            transporteur=t, zone=zone,
            defaults={'limite_commandes_jour': limite}
        )
        if not created:
            pref.limite_commandes_jour = limite
            pref.save(update_fields=['limite_commandes_jour'])
        return Response({'id': pref.id, 'zone_id': zone.id, 'zone_nom': str(zone), 'limite_commandes_jour': pref.limite_commandes_jour},
                        status=201 if created else 200)

    def delete(self, request):
        t = _get_transporteur(request.user)
        zone_id = request.data.get('zone_id')
        PreferenceZone.objects.filter(transporteur=t, zone_id=zone_id).delete()
        return Response(status=204)
