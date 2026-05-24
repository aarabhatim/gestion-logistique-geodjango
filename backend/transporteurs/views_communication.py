"""
Communication enrichie : templates messages rapides + partage GPS dans chat.
Endpoints :
  GET  /api/transporteurs/chat/templates/           → liste des templates rapides
  POST /api/transporteurs/chat/<commande_id>/position/  → partager sa position GPS
  GET  /api/transporteurs/chat/<commande_id>/historique/ → historique archivé
"""
from rest_framework.response import Response
from rest_framework.views import APIView

from accounts.permissions import IsTransporteurRole
from .models import ChatMessage, MessageTemplate


def _seed_templates():
    """Crée les templates par défaut si la table est vide."""
    if MessageTemplate.objects.exists():
        return
    templates = [
        ('Je suis à 5 minutes', 'CHAUFFEUR', 1),
        ('Je suis en route', 'CHAUFFEUR', 2),
        ('Pouvez-vous descendre ? Je vous attends devant', 'CHAUFFEUR', 3),
        ('Livraison déposée devant la porte', 'CHAUFFEUR', 4),
        ('Je vous appelle maintenant', 'CHAUFFEUR', 5),
        ('L\'accès est bloqué, pouvez-vous m\'indiquer une autre entrée ?', 'CHAUFFEUR', 6),
        ('Votre colis est arrivé en bon état', 'CHAUFFEUR', 7),
        ('Je reviendrai dans 30 minutes', 'CHAUFFEUR', 8),
    ]
    MessageTemplate.objects.bulk_create([
        MessageTemplate(contenu=c, cible=cible, ordre=ordre)
        for c, cible, ordre in templates
    ])


class MessageTemplatesView(APIView):
    """Templates de messages rapides pour le chauffeur."""
    permission_classes = [IsTransporteurRole]

    def get(self, request):
        _seed_templates()
        cible = request.query_params.get('cible', 'CHAUFFEUR')
        templates = MessageTemplate.objects.filter(actif=True, cible__in=[cible, 'TOUS'])
        data = [{
            'id': t.id,
            'contenu': t.contenu,
            'cible': t.cible,
        } for t in templates]
        return Response(data)


class PartagerPositionView(APIView):
    """Envoyer sa position GPS comme message dans le chat."""
    permission_classes = [IsTransporteurRole]

    def post(self, request, commande_id):
        lat = request.data.get('lat')
        lng = request.data.get('lng')
        if lat is None or lng is None:
            return Response({'error': 'lat et lng sont requis.'}, status=400)

        msg = ChatMessage.objects.create(
            commande_id=commande_id,
            auteur=request.user,
            contenu=f'📍 Position partagée ({round(float(lat), 5)}, {round(float(lng), 5)})',
            est_position_partagee=True,
            position_lat=float(lat),
            position_lng=float(lng),
        )
        return Response({
            'id': msg.id,
            'contenu': msg.contenu,
            'position_lat': msg.position_lat,
            'position_lng': msg.position_lng,
            'est_position_partagee': True,
            'created_at': msg.created_at.isoformat(),
        }, status=201)


class HistoriqueChatView(APIView):
    """Historique complet du chat pour une commande (même livrée/archivée)."""

    def get(self, request, commande_id):
        msgs = ChatMessage.objects.filter(
            commande_id=commande_id
        ).select_related('auteur').order_by('created_at')

        data = [{
            'id': m.id,
            'auteur_nom': m.auteur.get_full_name() or m.auteur.email,
            'auteur_role': getattr(m.auteur, 'role', ''),
            'contenu': m.contenu,
            'lu': m.lu,
            'est_position_partagee': m.est_position_partagee,
            'position_lat': m.position_lat,
            'position_lng': m.position_lng,
            'created_at': m.created_at.isoformat(),
        } for m in msgs]

        return Response({'messages': data, 'count': len(data)})
