from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import SessionGroupe, MembreGroupe, ArticleGroupe
from .serializers import SessionGroupeSerializer, ArticleGroupeSerializer


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def creer_session(request):
    """Crée une nouvelle session de commande groupe."""
    boutique_id = request.data.get('boutique_id')
    if not boutique_id:
        return Response({'error': 'boutique_id requis'}, status=status.HTTP_400_BAD_REQUEST)

    session = SessionGroupe.objects.create(createur=request.user, boutique_id=boutique_id)
    MembreGroupe.objects.create(session=session, utilisateur=request.user)
    serializer = SessionGroupeSerializer(session)
    return Response(serializer.data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def rejoindre_session(request, code):
    """Rejoint une session via son code UUID."""
    try:
        session = SessionGroupe.objects.get(code=code, statut='OUVERTE')
    except SessionGroupe.DoesNotExist:
        return Response({'error': 'Session introuvable ou fermée'}, status=status.HTTP_404_NOT_FOUND)

    membre, created = MembreGroupe.objects.get_or_create(session=session, utilisateur=request.user)
    if not created:
        return Response({'message': 'Déjà membre de cette session'})
    return Response({'message': 'Session rejointe', 'session_id': session.id})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def detail_session(request, code):
    """Retourne le détail complet de la session (membres + articles)."""
    try:
        session = SessionGroupe.objects.get(code=code)
    except SessionGroupe.DoesNotExist:
        return Response({'error': 'Session introuvable'}, status=status.HTTP_404_NOT_FOUND)
    serializer = SessionGroupeSerializer(session)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def ajouter_article(request, code):
    """Ajoute un article au panier du membre dans la session."""
    try:
        session = SessionGroupe.objects.get(code=code, statut='OUVERTE')
        membre = MembreGroupe.objects.get(session=session, utilisateur=request.user)
    except (SessionGroupe.DoesNotExist, MembreGroupe.DoesNotExist):
        return Response({'error': 'Session ou membre introuvable'}, status=status.HTTP_404_NOT_FOUND)

    article = ArticleGroupe.objects.create(
        session=session,
        membre=membre,
        produit_id=request.data.get('produit_id'),
        nom_produit=request.data.get('nom_produit', ''),
        quantite=request.data.get('quantite', 1),
        prix_unitaire=request.data.get('prix_unitaire', 0),
    )
    return Response(ArticleGroupeSerializer(article).data, status=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def marquer_pret(request, code):
    """Le membre signale qu'il a fini de choisir."""
    try:
        session = SessionGroupe.objects.get(code=code)
        membre = MembreGroupe.objects.get(session=session, utilisateur=request.user)
    except (SessionGroupe.DoesNotExist, MembreGroupe.DoesNotExist):
        return Response({'error': 'Introuvable'}, status=status.HTTP_404_NOT_FOUND)

    membre.est_pret = True
    membre.save()

    tous_prets = session.membres.filter(est_pret=False).count() == 0
    return Response({'tous_prets': tous_prets, 'message': 'Statut mis à jour'})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def valider_commande_groupe(request, code):
    """Le créateur valide et passe la commande collective."""
    try:
        session = SessionGroupe.objects.get(code=code, createur=request.user, statut='OUVERTE')
    except SessionGroupe.DoesNotExist:
        return Response({'error': 'Session introuvable ou non autorisée'}, status=status.HTTP_403_FORBIDDEN)

    session.statut = 'COMMANDEE'
    session.save()
    # Ici : créer la Commande Django avec tous les articles fusionnés
    return Response({'message': 'Commande groupe validée', 'session_id': session.id})
