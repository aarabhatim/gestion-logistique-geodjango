from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import CompteFidelite
from .serializers import CompteFideliteSerializer


def get_or_create_compte(user):
    compte, _ = CompteFidelite.objects.get_or_create(client=user)
    return compte


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mon_compte_fidelite(request):
    """Retourne le solde de points + historique des transactions."""
    compte = get_or_create_compte(request.user)
    serializer = CompteFideliteSerializer(compte)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def utiliser_points(request):
    """
    Convertit des points en réduction sur la prochaine commande.
    Body: { "points": 200 }
    """
    points = request.data.get('points', 0)
    try:
        points = int(points)
    except (TypeError, ValueError):
        return Response({'error': 'Valeur invalide'}, status=status.HTTP_400_BAD_REQUEST)

    if points <= 0 or points % 100 != 0:
        return Response({'error': 'Les points doivent être un multiple de 100'}, status=status.HTTP_400_BAD_REQUEST)

    compte = get_or_create_compte(request.user)
    try:
        compte.debiter(points, raison='Conversion en réduction commande')
    except ValueError as e:
        return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    reduction = (points // 100) * 50
    return Response({
        'message': f'{points} points convertis en {reduction} DZD de réduction',
        'reduction_appliquee': reduction,
        'points_restants': compte.points
    })
