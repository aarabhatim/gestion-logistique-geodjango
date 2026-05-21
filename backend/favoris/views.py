from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from .models import FavorisBoutique, FavorisProduit
from .serializers import FavorisBoutiqueSerializer, FavorisProduitSerializer


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mes_favoris_boutiques(request):
    """Liste toutes les boutiques favorites du client connecté."""
    favoris = FavorisBoutique.objects.filter(client=request.user)
    serializer = FavorisBoutiqueSerializer(favoris, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_favori_boutique(request, boutique_id):
    """Ajoute ou retire une boutique des favoris (toggle)."""
    favori, created = FavorisBoutique.objects.get_or_create(
        client=request.user,
        boutique_id=boutique_id
    )
    if not created:
        favori.delete()
        return Response({'status': 'removed', 'boutique_id': boutique_id})
    serializer = FavorisBoutiqueSerializer(favori)
    return Response({'status': 'added', 'data': serializer.data}, status=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def mes_favoris_produits(request):
    """Liste tous les produits favoris du client connecté."""
    favoris = FavorisProduit.objects.filter(client=request.user)
    serializer = FavorisProduitSerializer(favoris, many=True)
    return Response(serializer.data)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def toggle_favori_produit(request, produit_id):
    """Ajoute ou retire un produit des favoris (toggle)."""
    favori, created = FavorisProduit.objects.get_or_create(
        client=request.user,
        produit_id=produit_id
    )
    if not created:
        favori.delete()
        return Response({'status': 'removed', 'produit_id': produit_id})
    serializer = FavorisProduitSerializer(favori)
    return Response({'status': 'added', 'data': serializer.data}, status=status.HTTP_201_CREATED)
