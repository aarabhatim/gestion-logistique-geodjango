from django.contrib.auth import get_user_model
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from accounts.permissions import IsAdminRole
from .models import ScoreTransporteur
from .serializers import ScoreTransporteurSerializer

User = get_user_model()


class ScoreTransporteurViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Lecture seule — les scores sont calculés automatiquement via signaux.
    Actions spéciales :
      POST /scoring/{id}/recalculer/   → force le recalcul (admin)
      POST /scoring/recalculer-tous/  → recalcule tous les scores (admin)
      GET  /scoring/mon-score/        → score du transporteur connecté
    """
    queryset = ScoreTransporteur.objects.select_related(
        'transporteur', 'transporteur__transporteur_profile'
    ).all()
    serializer_class = ScoreTransporteurSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        qs = super().get_queryset()
        tri = self.request.query_params.get('tri', 'global')
        champ_map = {
            'global': '-score_global',
            'ponctualite': '-score_ponctualite',
            'fiabilite': '-score_fiabilite',
            'satisfaction': '-score_satisfaction',
            'rapidite': '-score_rapidite',
        }
        return qs.order_by(champ_map.get(tri, '-score_global'))

    @action(detail=False, methods=['get'], url_path='mon-score')
    def mon_score(self, request):
        """Score du transporteur connecté."""
        try:
            score = ScoreTransporteur.objects.get(transporteur=request.user)
        except ScoreTransporteur.DoesNotExist:
            # Créer et calculer à la volée
            score = ScoreTransporteur.objects.create(transporteur=request.user)
            score.recalculer()
        return Response(ScoreTransporteurSerializer(score, context={'request': request}).data)

    @action(detail=True, methods=['post'], url_path='recalculer',
            permission_classes=[IsAdminRole])
    def recalculer(self, request, pk=None):
        """Force le recalcul du score d'un transporteur (admin uniquement)."""
        score = self.get_object()
        score.recalculer()
        return Response(
            ScoreTransporteurSerializer(score, context={'request': request}).data
        )

    @action(detail=False, methods=['post'], url_path='recalculer-tous',
            permission_classes=[IsAdminRole])
    def recalculer_tous(self, request):
        """Recalcule tous les scores (admin — opération lourde)."""
        transporteurs = User.objects.filter(role='TRANSPORTEUR', is_active=True)
        updated = 0
        for user in transporteurs:
            score, _ = ScoreTransporteur.objects.get_or_create(transporteur=user)
            try:
                score.recalculer()
                updated += 1
            except Exception:
                pass
        return Response({'recalcules': updated, 'total': transporteurs.count()})

    @action(detail=False, methods=['get'], url_path='classement')
    def classement(self, request):
        """Top 10 transporteurs par score global."""
        top = self.get_queryset()[:10]
        return Response(ScoreTransporteurSerializer(top, many=True, context={'request': request}).data)
