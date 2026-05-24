"""
Gestion du véhicule : journal d'entretien + documents.
Endpoints :
  GET/POST   /api/transporteurs/vehicule/entretiens/          → journal entretien
  PATCH/DEL  /api/transporteurs/vehicule/entretiens/<id>/
  GET        /api/transporteurs/vehicule/alertes/             → alertes kilométrage
  GET/POST   /api/transporteurs/vehicule/documents/           → documents véhicule
  DELETE     /api/transporteurs/vehicule/documents/<id>/
"""
import datetime
from rest_framework import serializers
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsTransporteurRole
from .models import Transporteur, EntretienVehicule, DocumentVehicule


def _get_transporteur(user):
    try:
        return user.transporteur_profile
    except Transporteur.DoesNotExist:
        return None


class EntretienSerializer(serializers.ModelSerializer):
    type_label = serializers.CharField(source='get_type_entretien_display', read_only=True)
    cout_par_km = serializers.SerializerMethodField()

    class Meta:
        model = EntretienVehicule
        fields = [
            'id', 'type_entretien', 'type_label', 'date_entretien',
            'kilometrage', 'cout', 'description', 'prochain_entretien_km',
            'cout_par_km', 'created_at',
        ]

    def get_cout_par_km(self, obj):
        """Coût estimé par km depuis le dernier entretien."""
        if not obj.prochain_entretien_km or not obj.kilometrage:
            return None
        km_intervalle = obj.prochain_entretien_km - obj.kilometrage
        if km_intervalle <= 0:
            return None
        return round(float(obj.cout) / km_intervalle, 4)


class DocumentSerializer(serializers.ModelSerializer):
    type_label = serializers.CharField(source='get_type_document_display', read_only=True)
    est_expire = serializers.ReadOnlyField()
    expire_bientot = serializers.ReadOnlyField()

    class Meta:
        model = DocumentVehicule
        fields = [
            'id', 'type_document', 'type_label', 'fichier',
            'date_expiration', 'est_expire', 'expire_bientot', 'created_at',
        ]


class EntretiensView(APIView):
    permission_classes = [IsTransporteurRole]

    def get(self, request):
        t = _get_transporteur(request.user)
        if not t:
            return Response({'error': 'Profil transporteur introuvable.'}, status=404)
        entretiens = EntretienVehicule.objects.filter(transporteur=t)
        return Response(EntretienSerializer(entretiens, many=True).data)

    def post(self, request):
        t = _get_transporteur(request.user)
        if not t:
            return Response({'error': 'Profil transporteur introuvable.'}, status=404)
        s = EntretienSerializer(data=request.data)
        if s.is_valid():
            s.save(transporteur=t)
            return Response(s.data, status=201)
        return Response(s.errors, status=400)


class EntretienDetailView(APIView):
    permission_classes = [IsTransporteurRole]

    def _get(self, user, pk):
        t = _get_transporteur(user)
        try:
            return EntretienVehicule.objects.get(pk=pk, transporteur=t)
        except EntretienVehicule.DoesNotExist:
            return None

    def patch(self, request, pk):
        obj = self._get(request.user, pk)
        if not obj:
            return Response({'error': 'Entretien introuvable.'}, status=404)
        s = EntretienSerializer(obj, data=request.data, partial=True)
        if s.is_valid():
            s.save()
            return Response(s.data)
        return Response(s.errors, status=400)

    def delete(self, request, pk):
        obj = self._get(request.user, pk)
        if not obj:
            return Response({'error': 'Entretien introuvable.'}, status=404)
        obj.delete()
        return Response(status=204)


class AlertesVehiculeView(APIView):
    """Alertes kilométrage et documents expirant bientôt."""
    permission_classes = [IsTransporteurRole]

    def get(self, request):
        t = _get_transporteur(request.user)
        if not t:
            return Response({'error': 'Profil transporteur introuvable.'}, status=404)

        alertes = []

        # Alertes entretien (prochain_entretien_km proche)
        # On utilise les 5 derniers entretiens avec prochain km renseigné
        entretiens_recents = EntretienVehicule.objects.filter(
            transporteur=t, prochain_entretien_km__isnull=False
        ).order_by('-date_entretien')[:5]

        for e in entretiens_recents:
            if e.prochain_entretien_km:
                alertes.append({
                    'type': 'entretien',
                    'message': f"Prochain {e.get_type_entretien_display()} prévu à {e.prochain_entretien_km:,} km",
                    'urgence': 'info',
                    'date': str(e.date_entretien),
                })

        # Alertes documents expirant
        docs = DocumentVehicule.objects.filter(transporteur=t)
        for doc in docs:
            if doc.est_expire:
                alertes.append({
                    'type': 'document',
                    'message': f"{doc.get_type_document_display()} expiré le {doc.date_expiration}",
                    'urgence': 'danger',
                    'date': str(doc.date_expiration),
                })
            elif doc.expire_bientot:
                alertes.append({
                    'type': 'document',
                    'message': f"{doc.get_type_document_display()} expire le {doc.date_expiration} (dans 30j ou moins)",
                    'urgence': 'warning',
                    'date': str(doc.date_expiration),
                })

        return Response({
            'alertes': alertes,
            'nb_alertes': len(alertes),
        })


class DocumentsVehiculeView(APIView):
    permission_classes = [IsTransporteurRole]

    def get(self, request):
        t = _get_transporteur(request.user)
        if not t:
            return Response({'error': 'Profil transporteur introuvable.'}, status=404)
        docs = DocumentVehicule.objects.filter(transporteur=t)
        return Response(DocumentSerializer(docs, many=True).data)

    def post(self, request):
        t = _get_transporteur(request.user)
        if not t:
            return Response({'error': 'Profil transporteur introuvable.'}, status=404)
        s = DocumentSerializer(data=request.data)
        if s.is_valid():
            s.save(transporteur=t)
            return Response(s.data, status=201)
        return Response(s.errors, status=400)


class DocumentVehiculeDetailView(APIView):
    permission_classes = [IsTransporteurRole]

    def delete(self, request, pk):
        t = _get_transporteur(request.user)
        try:
            doc = DocumentVehicule.objects.get(pk=pk, transporteur=t)
        except DocumentVehicule.DoesNotExist:
            return Response({'error': 'Document introuvable.'}, status=404)
        doc.delete()
        return Response(status=204)
